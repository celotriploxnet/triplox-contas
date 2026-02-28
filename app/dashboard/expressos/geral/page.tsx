'use client'

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { getBytes, ref } from 'firebase/storage'
import * as XLSX from 'xlsx'

import { auth, storage } from '@/lib/firebase'

/* =========================
   CONFIG
   ========================= */
const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'
const CSV_PATH = 'base-lojas/banco.csv'

// ✅ para não explodir a tela quando não tem busca (ajuste como quiser)
const LIMIT_NO_SEARCH = 200

/* =========================
   TYPES
   ========================= */
type RowBase = {
  chave: string
  nome: string
  municipio: string
  agencia: string
  pacb: string
  statusAnalise: string
  dtCertificacao: string
  trx: number

  qtdContas: number
  qtdContasComDeposito: number
  qtdCestaServ: number
  qtdMobilidade: number
  qtdCartaoEmitido: number
  qtdChesContratado: number
  qtdLimeAbConta: number
  qtdLime: number
  qtdConsignado: number
  qtdCreditoParcelado: number
  qtdMicrosseguro: number
  qtdVivaVida: number
  qtdPlanoOdonto: number
  qtdSegResidencial: number
  qtdExpSorte: number
  referencia: string
}

type CertFilter = 'Todos' | 'NaoCertificado' | 'Certificado' | 'Vencida'
type TrxFilter = 'Todos' | '0' | '1-199' | '200+'

/* =========================
   HELPERS
   ========================= */
function toStr(v: any) {
  return v === null || v === undefined ? '' : String(v).trim()
}

function normalizeKey(k: string) {
  return toStr(k)
    .replaceAll('\ufeff', '') // BOM
    .replaceAll('Ã³', 'ó')
    .replaceAll('Ã£', 'ã')
    .replaceAll('Ã§', 'ç')
    .replaceAll('Ãº', 'ú')
    .replaceAll('Ã¡', 'á')
    .replaceAll('Ã©', 'é')
    .replaceAll('Ã­', 'í')
    .replaceAll('Ãª', 'ê')
    .replaceAll('Ã´', 'ô')
    .replaceAll('Â', '')
    .trim()
    .toLowerCase()
}

function toUint8(bytes: any): Uint8Array {
  if (bytes instanceof Uint8Array) return bytes
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes)
  return new Uint8Array(bytes)
}

/**
 * ✅ Decodifica CSV de forma mais robusta
 * - tenta utf-8
 * - se ficar “estranho”, cai pra latin1
 */
function decodeBytes(u8: Uint8Array) {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(u8)
  // heurística simples: se tiver muito "�", tenta latin1
  const bad = (utf8.match(/�/g) || []).length
  if (bad > 3) {
    return new TextDecoder('iso-8859-1', { fatal: false }).decode(u8)
  }
  return utf8
}

/**
 * ✅ Parser CSV (separador ;)
 * - mantém tudo como string (sem o XLSX “converter” data)
 * - suporta campo com aspas
 */
function parseCSVSemicolon(text: string): Record<string, string>[] {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length)

  if (!lines.length) return []

  function parseLine(line: string): string[] {
    const out: string[] = []
    let cur = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]

      if (ch === '"') {
        // "" dentro de aspas vira "
        if (inQuotes && line[i + 1] === '"') {
          cur += '"'
          i++
          continue
        }
        inQuotes = !inQuotes
        continue
      }

      if (ch === ';' && !inQuotes) {
        out.push(cur)
        cur = ''
        continue
      }

      cur += ch
    }
    out.push(cur)
    return out.map((s) => s.trim())
  }

  const headersRaw = parseLine(lines[0])
  const headers = headersRaw.map((h) => normalizeKey(h))

  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i])
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => {
      obj[h] = toStr(cols[idx] ?? '')
    })
    rows.push(obj)
  }

  return rows
}

function parseNumber(v: any) {
  const s = toStr(v).replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

function splitAgPacb(v: any) {
  const raw = toStr(v)
  if (!raw) return { agencia: '', pacb: '' }
  const parts = raw.split('/')
  const ag = toStr(parts[0])
  const pacb = toStr(parts[1])
  return { agencia: ag, pacb }
}

function isTreinado(status: string) {
  return toStr(status).toLowerCase().includes('trein')
}

function isTransacional(status: string) {
  return toStr(status).toLowerCase().includes('trans')
}

/**
 * ✅ Parser de data “seguro”
 * - dd/mm/aaaa (do seu CSV)
 * - yyyy-mm-dd
 * - serial do Excel
 */
function parseDateFlexible(v: any): Date | null {
  const raw = toStr(v)
  if (!raw) return null

  const mBR = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (mBR) {
    const dd = Number(mBR[1])
    const mm = Number(mBR[2])
    const yy = Number(mBR[3])
    const dt = new Date(yy, mm - 1, dd)
    return Number.isNaN(dt.getTime()) ? null : dt
  }

  const mISO = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (mISO) {
    const yy = Number(mISO[1])
    const mm = Number(mISO[2])
    const dd = Number(mISO[3])
    const dt = new Date(yy, mm - 1, dd)
    return Number.isNaN(dt.getTime()) ? null : dt
  }

  const n = Number(raw)
  if (Number.isFinite(n) && n > 20000 && n < 90000) {
    const d = XLSX.SSF.parse_date_code(n)
    if (d?.y && d?.m && d?.d) {
      const dt = new Date(d.y, d.m - 1, d.d)
      return Number.isNaN(dt.getTime()) ? null : dt
    }
  }

  return null
}

function isCertVencida(certDate: Date | null) {
  if (!certDate) return false
  const now = new Date()
  const fiveYearsAgo = new Date(now)
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)
  return certDate < fiveYearsAgo
}

function formatPtBRDate(dt: Date | null) {
  if (!dt) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dt)
}

function formatNum(n: number) {
  if (!Number.isFinite(n)) return '0'
  return String(n)
}

/* =========================
   UI
   ========================= */
function Pill({
  children,
  style,
  title,
}: {
  children: ReactNode
  style?: CSSProperties
  title?: string
}) {
  return (
    <span className="pill" style={style} title={title}>
      {children}
    </span>
  )
}

function LightButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        borderRadius: 999,
        padding: '.52rem .75rem',
        fontSize: '.85rem',
        fontWeight: 900,
        border: '1px solid rgba(15,15,25,.18)',
        background: 'rgba(255,255,255,.88)',
        color: 'rgba(16,16,24,.92)',
        boxShadow: '0 10px 18px rgba(10,10,20,.06)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.65 : 1,
      }}
    >
      {children}
    </button>
  )
}

function buildWhatsAppMessage(args: {
  nome: string
  chave: string
  municipio: string
  agencia: string
  pacb: string
  status: string
  trx: number
  certLabel: string
  certDatePt: string

  qtdContas: number
  qtdContasComDeposito: number
  qtdCestaServ: number
  qtdMobilidade: number
  qtdCartaoEmitido: number
  qtdChesContratado: number
  qtdLimeAbConta: number
  qtdLime: number
  qtdConsignado: number
  qtdCreditoParcelado: number
  qtdMicrosseguro: number
  qtdVivaVida: number
  qtdPlanoOdonto: number
  qtdSegResidencial: number
  qtdExpSorte: number
  referencia: string
}) {
  const a = args
  return [
    '📊 *Expresso — Visão Geral*',
    '',
    `🏪 *Nome:* ${a.nome || '—'}`,
    `🔑 *Chave:* ${a.chave || '—'}`,
    `📍 *Município:* ${a.municipio || '—'}`,
    `🏦 *Agência/PACB:* ${a.agencia || '—'} / ${a.pacb || '—'}`,
    '',
    `✅ *Status:* ${a.status || '—'}`,
    `💳 *TRX Contábil:* ${String(a.trx ?? 0)}`,
    `🪪 *Certificação:* ${a.certLabel}`,
    `📅 *dt_certificacao:* ${a.certDatePt || '—'}`,
    '',
    '📌 *Indicadores (base)*',
    `• Contas sem Depósito: ${formatNum(a.qtdContas)}`,
    `• Contas com Depósito: ${formatNum(a.qtdContasComDeposito)}`,
    `• Cestas de Serviços: ${formatNum(a.qtdCestaServ)}`,
    `• Mobilidade: ${formatNum(a.qtdMobilidade)}`,
    `• Cartão Emitido: ${formatNum(a.qtdCartaoEmitido)}`,
    `• Ches Contratado: ${formatNum(a.qtdChesContratado)}`,
    `• Lime na conta: ${formatNum(a.qtdLimeAbConta)}`,
    `• Lime Contratado: ${formatNum(a.qtdLime)}`,
    `• Consignado: ${formatNum(a.qtdConsignado)}`,
    `• Crédito Parcelado: ${formatNum(a.qtdCreditoParcelado)}`,
    `• Microsseguros: ${formatNum(a.qtdMicrosseguro)}`,
    `• Viva Vida: ${formatNum(a.qtdVivaVida)}`,
    `• Dental: ${formatNum(a.qtdPlanoOdonto)}`,
    `• Residencial: ${formatNum(a.qtdSegResidencial)}`,
    `• SORTE EXPRESSA: ${formatNum(a.qtdExpSorte)}`,
    `• EXPRESSO REFERÊNCIA?: ${a.referencia || '—'}`,
  ].join('\n')
}

/* =========================
   PAGE
   ========================= */
export default function ExpressoGeralPage() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState('')

  const [rows, setRows] = useState<RowBase[]>([])

  // ✅ busca agora é opcional
  const [q, setQ] = useState('')

  // filtros independentes
  const [fAgencia, setFAgencia] = useState('Todos')
  const [fCert, setFCert] = useState<CertFilter>('Todos')
  const [fTrx, setFTrx] = useState<TrxFilter>('Todos')

  async function loadCsv() {
    if (!auth.currentUser) {
      setError('Você precisa estar logado.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setInfo('')

      const bytesAny = await getBytes(ref(storage, CSV_PATH))
      const text = decodeBytes(toUint8(bytesAny))

      // ✅ parse “real” do CSV, mantendo datas como string
      const raw = parseCSVSemicolon(text)

      const mapped: RowBase[] = raw.map((r) => {
        // ✅ CHAVE LOJA (voltou forte aqui)
        const chave = toStr(
          r['chave_loja'] ||
            r['chave loja'] ||
            r['chave'] ||
            r['chave_loja ']
        )

        const nome = toStr(r['nome_loja'] || r['nome da loja'] || r['nome'])
        const municipio = toStr(r['municipio'] || r['município'])

        const agpacb = r['ag_pacb'] || r['agencia/pacb'] || r['agência/pacb'] || r['ag_pacb ']
        const { agencia, pacb } = splitAgPacb(agpacb)

        const statusAnalise = toStr(r['status_analise'] || r['status analise'] || r['status'])
        // ✅ dt_certificacao do CSV (string intacta)
        const dtCertificacao = toStr(r['dt_certificacao'] || r['dt certificacao'] || r['certificacao'] || r['certificação'])

        const trx = parseNumber(r['qtd_trxcontabil'] || r['qtd_trx_contabil'] || r['qtd trxcontabil'] || r['qtd_trx'])

        const qtdContas = parseNumber(r['qtd_contas'] || r['qtd contas'])
        const qtdContasComDeposito = parseNumber(r['qtd_contas_com_deposito'] || r['qtd contas com deposito'])
        const qtdCestaServ = parseNumber(r['qtd_cesta_serv'] || r['qtd cesta serv'])
        const qtdMobilidade = parseNumber(r['qtd_mobilidade'] || r['qtd mobilidade'])
        const qtdCartaoEmitido = parseNumber(r['qtd_cartao_emitido'] || r['qtd cartao emitido'])
        const qtdChesContratado = parseNumber(r['qtd_chesp_contratado'] || r['qtd chesp contratado'])
        const qtdLimeAbConta = parseNumber(r['qtd_lime_ab_conta'] || r['qtd lime ab conta'])
        const qtdLime = parseNumber(r['qtd_lime'] || r['qtd lime'])
        const qtdConsignado = parseNumber(r['qtd_consignado'] || r['qtd consignado'])
        const qtdCreditoParcelado = parseNumber(
          r['qtd_credito_parcel_dtlhes'] ||
            r['qtd_credito_parcelado_dtlhes'] ||
            r['qtd_credito_parcel'] ||
            r['credito parcelado']
        )
        const qtdMicrosseguro = parseNumber(r['qtd_microsseguro'] || r['qtd microsseguro'])
        const qtdVivaVida = parseNumber(r['qtd_micro_vivavida'] || r['qtd micro vivavida'] || r['viva vida'])
        const qtdPlanoOdonto = parseNumber(r['qtd_plano_odonto'] || r['qtd plano odonto'] || r['odonto'])
        const qtdSegResidencial = parseNumber(r['qtd_seg_residencial'] || r['qtd seg residencial'])
        const qtdExpSorte = parseNumber(r['qtd_exp_sorte'] || r['qtd exp sorte'])
        const referencia = toStr(r['referencia'] || r['referência'] || r['expresso referência?'] || r['expresso referencia?'])

        return {
          chave,
          nome,
          municipio,
          agencia,
          pacb,
          statusAnalise,
          dtCertificacao,
          trx,
          qtdContas,
          qtdContasComDeposito,
          qtdCestaServ,
          qtdMobilidade,
          qtdCartaoEmitido,
          qtdChesContratado,
          qtdLimeAbConta,
          qtdLime,
          qtdConsignado,
          qtdCreditoParcelado,
          qtdMicrosseguro,
          qtdVivaVida,
          qtdPlanoOdonto,
          qtdSegResidencial,
          qtdExpSorte,
          referencia,
        }
      })

      setRows(mapped)
      setInfo('Base carregada ✅')
    } catch (e: any) {
      console.error('loadCsv error:', e)
      setError(`Falha ao carregar CSV (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setCheckingAuth(false)

      if (!u) {
        setIsAdmin(false)
        router.push('/login')
        return
      }

      setIsAdmin((u.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase())
      loadCsv()
    })

    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const computed = useMemo(() => {
    const list = rows.map((r) => {
      // ✅ agora dtCertificacao vem string 100% do CSV
      const certDate = parseDateFlexible(r.dtCertificacao)
      const semCert = !certDate
      const vencida = isCertVencida(certDate)
      return { r, certDate, semCert, vencida }
    })

    const total = list.length
    const transacional = list.filter((x) => isTransacional(x.r.statusAnalise)).length
    const treinado = list.filter((x) => isTreinado(x.r.statusAnalise)).length
    const semCert = list.filter((x) => x.semCert).length
    const vencida = list.filter((x) => x.vencida).length

    return { list, total, transacional, treinado, semCert, vencida }
  }, [rows])

  const agencias = useMemo(() => {
    const set = new Set<string>()
    computed.list.forEach(({ r }) => r.agencia && set.add(r.agencia))
    return ['Todos', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [computed.list])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()

    let list = computed.list.filter(({ r, semCert, vencida }) => {
      if (fAgencia !== 'Todos' && r.agencia !== fAgencia) return false

      if (fCert !== 'Todos') {
        if (fCert === 'NaoCertificado' && !semCert) return false
        if (fCert === 'Certificado' && semCert) return false
        if (fCert === 'Vencida' && !vencida) return false
      }

      if (fTrx !== 'Todos') {
        const trx = r.trx || 0
        if (fTrx === '0' && trx !== 0) return false
        if (fTrx === '1-199' && !(trx >= 1 && trx <= 199)) return false
        if (fTrx === '200+' && trx < 200) return false
      }

      return true
    })

    if (term) {
      list = list.filter(({ r }) => {
        const hay = [r.nome, r.chave, r.municipio, r.agencia, r.pacb, r.statusAnalise].join(' ').toLowerCase()
        return hay.includes(term)
      })
    } else {
      list = list.slice(0, LIMIT_NO_SEARCH)
    }

    return list
  }, [computed.list, q, fAgencia, fCert, fTrx])

  async function copyWhatsApp(r: RowBase, certDate: Date | null, semCert: boolean, vencida: boolean) {
    try {
      const certLabel = semCert ? 'Sem certificação' : vencida ? 'Certificação vencida' : 'Certificado'
      const certDatePt = formatPtBRDate(certDate)

      const msg = buildWhatsAppMessage({
        nome: r.nome,
        chave: r.chave,
        municipio: r.municipio,
        agencia: r.agencia,
        pacb: r.pacb,
        status: r.statusAnalise,
        trx: r.trx || 0,
        certLabel,
        certDatePt,

        qtdContas: r.qtdContas,
        qtdContasComDeposito: r.qtdContasComDeposito,
        qtdCestaServ: r.qtdCestaServ,
        qtdMobilidade: r.qtdMobilidade,
        qtdCartaoEmitido: r.qtdCartaoEmitido,
        qtdChesContratado: r.qtdChesContratado,
        qtdLimeAbConta: r.qtdLimeAbConta,
        qtdLime: r.qtdLime,
        qtdConsignado: r.qtdConsignado,
        qtdCreditoParcelado: r.qtdCreditoParcelado,
        qtdMicrosseguro: r.qtdMicrosseguro,
        qtdVivaVida: r.qtdVivaVida,
        qtdPlanoOdonto: r.qtdPlanoOdonto,
        qtdSegResidencial: r.qtdSegResidencial,
        qtdExpSorte: r.qtdExpSorte,
        referencia: r.referencia,
      })

      await navigator.clipboard.writeText(msg)
      setInfo('Mensagem copiada ✅ (cole no WhatsApp)')
      setError(null)
    } catch (e) {
      console.error(e)
      setError('Não consegui copiar a mensagem.')
    }
  }

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <span className="pill">Geral</span>
        <h1 className="h1" style={{ marginTop: '.75rem' }}>
          📊 Expresso Geral (visão completa)
        </h1>
        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          Agora os filtros funcionam sem depender da busca.
        </p>
      </div>

      <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Pill>Total: {computed.total}</Pill>
        <Pill>Transacional: {computed.transacional}</Pill>
        <Pill>Treinado: {computed.treinado}</Pill>
        <Pill>Sem certificação: {computed.semCert}</Pill>
        <Pill
          style={{
            background: 'rgba(214,31,44,.10)',
            border: '1px solid rgba(214,31,44,.20)',
            color: 'rgba(214,31,44,.95)',
          }}
        >
          Certificação vencida: {computed.vencida}
        </Pill>

        <button className="btn-primary" onClick={loadCsv} disabled={loading || checkingAuth} style={{ marginLeft: 'auto' }}>
          {checkingAuth ? 'Verificando login...' : loading ? 'Carregando...' : 'Recarregar base'}
        </button>
      </div>

      {/* FILTROS */}
      <div className="card" style={{ display: 'grid', gap: '1rem' }}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label>
            <div className="label">Buscar (opcional)</div>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome ou chave..." />
            <div className="p-muted" style={{ marginTop: '.35rem', fontSize: 12 }}>
              Sem busca, mostra até <b>{LIMIT_NO_SEARCH}</b> resultados.
            </div>
          </label>

          <label>
            <div className="label">Agência</div>
            <select className="input" value={fAgencia} onChange={(e) => setFAgencia(e.target.value)}>
              {agencias.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>

          <label>
            <div className="label">Certificação</div>
            <select className="input" value={fCert} onChange={(e) => setFCert(e.target.value as CertFilter)}>
              <option value="Todos">Todos</option>
              <option value="NaoCertificado">Não certificado</option>
              <option value="Certificado">Certificado</option>
              <option value="Vencida">Certificação vencida (5+ anos)</option>
            </select>
          </label>

          <label>
            <div className="label">Transações (qtd_TrxContabil)</div>
            <select className="input" value={fTrx} onChange={(e) => setFTrx(e.target.value as TrxFilter)}>
              <option value="Todos">Todos</option>
              <option value="0">0</option>
              <option value="1-199">1–199</option>
              <option value="200+">200+</option>
            </select>
          </label>
        </div>

        {info && (
          <div>
            <span className="pill">{info}</span>
          </div>
        )}

        {error && (
          <div className="card-soft" style={{ borderColor: 'rgba(214,31,44,.25)' }}>
            <p className="p-muted" style={{ color: 'rgba(214,31,44,.95)', fontWeight: 800 }}>
              {error}
            </p>
          </div>
        )}
      </div>

      {/* RESULTADOS */}
      <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Pill>Mostrando: {filtered.length}</Pill>
        {q.trim() && (
          <span className="p-muted">
            Busca: <b>{q}</b>
          </span>
        )}
      </div>

      {filtered.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {filtered.map(({ r, certDate, vencida, semCert }) => (
            <div key={`${r.chave}-${r.agencia}-${r.pacb}`} className="card" style={{ display: 'grid', gap: '.75rem' }}>
              <div
                className="card-soft"
                style={{
                  display: 'flex',
                  gap: '.6rem',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '.8rem .95rem',
                }}
              >
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {semCert ? (
                    <Pill style={{ background: 'rgba(15,15,25,.06)', border: '1px solid rgba(15,15,25,.10)', color: 'rgba(16,16,24,.70)' }}>
                      Sem certificação
                    </Pill>
                  ) : vencida ? (
                    <Pill style={{ background: 'rgba(214,31,44,.10)', border: '1px solid rgba(214,31,44,.20)', color: 'rgba(214,31,44,.95)' }}>
                      Certificação vencida
                    </Pill>
                  ) : (
                    <Pill style={{ background: 'rgba(34,197,94,.10)', border: '1px solid rgba(34,197,94,.20)', color: 'rgba(21,128,61,.95)' }}>
                      Certificado
                    </Pill>
                  )}

                  <Pill>TRX: {String(r.trx || 0)}</Pill>
                </div>

                <LightButton onClick={() => copyWhatsApp(r, certDate, semCert, vencida)} title="Copiar para WhatsApp">
                  📤 WhatsApp
                </LightButton>
              </div>

              <div>
                <div className="p-muted" style={{ fontSize: 12 }}>
                  Nome do Expresso
                </div>
                <div style={{ fontWeight: 900, fontSize: '1.08rem', marginTop: '.15rem' }}>{r.nome || '—'}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '.6rem' }}>
                <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                  <div className="p-muted" style={{ fontSize: 12 }}>
                    Chave Loja
                  </div>
                  <div style={{ fontWeight: 900 }}>{r.chave || '—'}</div>
                </div>

                <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                  <div className="p-muted" style={{ fontSize: 12 }}>
                    Agência / PACB
                  </div>
                  <div style={{ fontWeight: 900 }}>
                    {r.agencia || '—'} / {r.pacb || '—'}
                  </div>
                </div>

                <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                  <div className="p-muted" style={{ fontSize: 12 }}>
                    Município
                  </div>
                  <div style={{ fontWeight: 900 }}>{r.municipio || '—'}</div>
                </div>

                <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                  <div className="p-muted" style={{ fontSize: 12 }}>
                    STATUS_ANALISE
                  </div>
                  <div style={{ fontWeight: 900 }}>{r.statusAnalise || '—'}</div>
                </div>

                <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                  <div className="p-muted" style={{ fontSize: 12 }}>
                    dt_certificacao
                  </div>
                  <div style={{ fontWeight: 900 }}>{formatPtBRDate(certDate)}</div>
                </div>
              </div>

              {/* INDICADORES */}
              <div className="card-soft" style={{ padding: '.9rem .95rem', display: 'grid', gap: '.55rem' }}>
                <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="pill">Indicadores</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '.6rem' }}>
                  <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                    <div className="p-muted" style={{ fontSize: 12 }}>
                      Contas sem Depósito
                    </div>
                    <div style={{ fontWeight: 900 }}>{formatNum(r.qtdContas)}</div>
                  </div>

                  <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                    <div className="p-muted" style={{ fontSize: 12 }}>
                      Contas com Depósito
                    </div>
                    <div style={{ fontWeight: 900 }}>{formatNum(r.qtdContasComDeposito)}</div>
                  </div>

                  <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                    <div className="p-muted" style={{ fontSize: 12 }}>
                      Cestas de Serviços
                    </div>
                    <div style={{ fontWeight: 900 }}>{formatNum(r.qtdCestaServ)}</div>
                  </div>

                  <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                    <div className="p-muted" style={{ fontSize: 12 }}>
                      Mobilidade
                    </div>
                    <div style={{ fontWeight: 900 }}>{formatNum(r.qtdMobilidade)}</div>
                  </div>

                  <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                    <div className="p-muted" style={{ fontSize: 12 }}>
                      Cartão Emitido
                    </div>
                    <div style={{ fontWeight: 900 }}>{formatNum(r.qtdCartaoEmitido)}</div>
                  </div>

                  <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                    <div className="p-muted" style={{ fontSize: 12 }}>
                      Ches Contratado
                    </div>
                    <div style={{ fontWeight: 900 }}>{formatNum(r.qtdChesContratado)}</div>
                  </div>

                  <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                    <div className="p-muted" style={{ fontSize: 12 }}>
                      Lime na conta
                    </div>
                    <div style={{ fontWeight: 900 }}>{formatNum(r.qtdLimeAbConta)}</div>
                  </div>

                  <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                    <div className="p-muted" style={{ fontSize: 12 }}>
                      Lime Contratado
                    </div>
                    <div style={{ fontWeight: 900 }}>{formatNum(r.qtdLime)}</div>
                  </div>

                  <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                    <div className="p-muted" style={{ fontSize: 12 }}>
                      Consignado
                    </div>
                    <div style={{ fontWeight: 900 }}>{formatNum(r.qtdConsignado)}</div>
                  </div>

                  <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                    <div className="p-muted" style={{ fontSize: 12 }}>
                      Crédito Parcelado
                    </div>
                    <div style={{ fontWeight: 900 }}>{formatNum(r.qtdCreditoParcelado)}</div>
                  </div>

                  <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                    <div className="p-muted" style={{ fontSize: 12 }}>
                      Microsseguros
                    </div>
                    <div style={{ fontWeight: 900 }}>{formatNum(r.qtdMicrosseguro)}</div>
                  </div>

                  <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                    <div className="p-muted" style={{ fontSize: 12 }}>
                      Viva Vida
                    </div>
                    <div style={{ fontWeight: 900 }}>{formatNum(r.qtdVivaVida)}</div>
                  </div>

                  <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                    <div className="p-muted" style={{ fontSize: 12 }}>
                      Dental
                    </div>
                    <div style={{ fontWeight: 900 }}>{formatNum(r.qtdPlanoOdonto)}</div>
                  </div>

                  <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                    <div className="p-muted" style={{ fontSize: 12 }}>
                      Residencial
                    </div>
                    <div style={{ fontWeight: 900 }}>{formatNum(r.qtdSegResidencial)}</div>
                  </div>

                  <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                    <div className="p-muted" style={{ fontSize: 12 }}>
                      SORTE EXPRESSA
                    </div>
                    <div style={{ fontWeight: 900 }}>{formatNum(r.qtdExpSorte)}</div>
                  </div>

                  <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                    <div className="p-muted" style={{ fontSize: 12 }}>
                      EXPRESSO REFERÊNCIA?
                    </div>
                    <div style={{ fontWeight: 900 }}>{r.referencia || '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-soft">
          <p className="p-muted">Nenhum expresso encontrado com os filtros atuais.</p>
        </div>
      )}

      {!checkingAuth && user && (
        <p className="p-muted" style={{ marginTop: '.25rem' }}>
          Logado como: <b>{user.email}</b>
          {isAdmin ? ' (Admin)' : ''}
        </p>
      )}
    </section>
  )
}