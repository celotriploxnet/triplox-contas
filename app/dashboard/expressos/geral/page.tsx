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
  qtdSegCartaoDeb: number

  qtdExpSorte: number
  vlrExpSorte: number

  referencia: string

  // ✅ NOVO: pontos calculados
  pontos: number
}

type CertFilter = 'Todos' | 'NaoCertificado' | 'Certificado' | 'Vencida'
type TrxFilter = 'Todos' | '0' | '1-199' | '200+'
type PontosFilter = 'Todos' | '0' | '1-5' | '6-9' | '10+'

/* =========================
   HELPERS
   ========================= */
function toStr(v: any) {
  return v === null || v === undefined ? '' : String(v).trim()
}

function normalizeKey(k: string) {
  return k
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

function parseCSVText(u8: Uint8Array) {
  return new TextDecoder('utf-8').decode(u8)
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
 * - dd/mm/aaaa
 * - yyyy-mm-dd
 * - serial do Excel
 * - strings com hora tipo "09/05/2022 00:00:00"
 */
function parseDateFlexible(v: any): Date | null {
  const raw = toStr(v)
  if (!raw) return null

  // dd/mm/aaaa (aceita com hora depois)
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

/**
 * ✅ vencida de verdade (5 anos EXATOS, considerando dia/mês)
 * Regra: dt + 5 anos <= hoje  => vencida
 */
function isCertVencida(certDate: Date | null) {
  if (!certDate) return false
  const now = new Date()

  const expiry = new Date(certDate)
  expiry.setFullYear(expiry.getFullYear() + 5)

  // zera horas pra comparação “data a data”
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const expDay = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate())

  return expDay <= today
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
   PONTOS
   ========================= */
function calcPontos(r: Omit<RowBase, 'pontos'>): number {
  const pts =
    (r.qtdContasComDeposito || 0) * 7 +
    (r.qtdContas || 0) * 3 +
    (r.qtdCestaServ || 0) * 3 +
    // QTD_SUPER_PROTEGIDO (1 ponto) -> vem do CSV, mas aqui no Geral não exibimos separado
    // A gente lê no map e injeta no cálculo via campo temporário? Preferi somar diretamente no map por segurança.
    0 +
    (r.qtdMobilidade || 0) * 0.5 +
    (r.qtdLime || 0) * 6.5 +
    (r.qtdConsignado || 0) * 5.5 +
    (r.qtdCreditoParcelado || 0) * 6.5 +
    (r.qtdMicrosseguro || 0) * 1 +
    (r.qtdVivaVida || 0) * 1 +
    (r.qtdPlanoOdonto || 0) * 1 +
    (r.qtdSegCartaoDeb || 0) * 1 +
    // VLR_EXP_SORTE: a cada 50 reais = 1 ponto
    Math.floor((r.vlrExpSorte || 0) / 50)

  // arredonda 1 casa (porque tem 0,5 e 6,5)
  return Math.round(pts * 10) / 10
}

function pontosLabel(p: number) {
  // remove .0 quando inteiro
  return Number.isInteger(p) ? String(p) : p.toFixed(1)
}

function pontosPillStyle(p: number): CSSProperties {
  return p >= 10
    ? {
        background: 'rgba(59,130,246,.12)',
        border: '1px solid rgba(59,130,246,.25)',
        color: 'rgba(37,99,235,.95)',
      }
    : {
        background: 'rgba(214,31,44,.10)',
        border: '1px solid rgba(214,31,44,.20)',
        color: 'rgba(214,31,44,.95)',
      }
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
  pontos: number

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
  qtdSegCartaoDeb: number

  qtdExpSorte: number
  vlrExpSorte: number

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
    `⭐ *Pontos:* ${pontosLabel(a.pontos ?? 0)}`,
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
    `• Seg Cartão Débito: ${formatNum(a.qtdSegCartaoDeb)}`,
    `• QTD SORTE EXPRESSA: ${formatNum(a.qtdExpSorte)}`,
    `• VLR SORTE EXPRESSA: ${String(a.vlrExpSorte ?? 0)}`,
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
  const [fPontos, setFPontos] = useState<PontosFilter>('Todos')

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
      const text = parseCSVText(toUint8(bytesAny))

      const wb = XLSX.read(text, { type: 'string' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

      const normalized = raw.map((obj) => {
        const out: Record<string, any> = {}
        for (const [k, v] of Object.entries(obj)) out[normalizeKey(k)] = v
        return out
      })

      const mapped: RowBase[] = normalized.map((r) => {
        const chave = toStr(r['chave_loja'] || r['chave loja'] || r['chave'])
        const nome = toStr(r['nome_loja'] || r['nome da loja'] || r['nome'])
        const municipio = toStr(r['municipio'] || r['município'])

        const agpacb = r['ag_pacb'] || r['agencia/pacb'] || r['agência/pacb']
        const { agencia, pacb } = splitAgPacb(agpacb)

        const statusAnalise = toStr(r['status_analise'] || r['status analise'] || r['status'])
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
          r['qtd_credito_parcel_dtlhles'] ||
            r['qtd_credito_parcel_dtlhes'] ||
            r['qtd_credito_parcelado_dtlhes'] ||
            r['qtd_credito_parcel'] ||
            r['credito parcelado'] ||
            r['qtd_credito_parcel_dtlhes']
        )
        const qtdMicrosseguro = parseNumber(r['qtd_microsseguro'] || r['qtd microsseguro'])
        const qtdVivaVida = parseNumber(r['qtd_micro_vivavida'] || r['qtd micro vivavida'] || r['viva vida'])
        const qtdPlanoOdonto = parseNumber(r['qtd_plano_odonto'] || r['qtd plano odonto'] || r['odonto'])
        const qtdSegResidencial = parseNumber(r['qtd_seg_residencial'] || r['qtd seg residencial'] || r['qtd_seg_residencial'])
        const qtdSegCartaoDeb = parseNumber(r['qtd_seg_cartao_deb'] || r['qtd seg cartao deb'] || r['seg cartao deb'])

        // ✅ SORTE EXPRESSA (quantidade e valor)
        const qtdExpSorte = parseNumber(r['qtd_exp_sorte'] || r['qtd exp sorte'] || r['qtd_sorte_expressa'])
        const vlrExpSorte = parseNumber(r['vlr_exp_sorte'] || r['vlr exp sorte'] || r['valor_exp_sorte'] || r['vlr sorte'])

        const referencia = toStr(r['referencia'] || r['referência'] || r['expresso referência?'] || r['expresso referencia?'])

        // ✅ SOMA de super protegido (1 ponto) entra no cálculo
        const qtdSuperProtegido = parseNumber(r['qtd_super_protegido'] || r['qtd super protegido'])

        const baseNoPontos: Omit<RowBase, 'pontos'> = {
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
          qtdSegCartaoDeb,
          qtdExpSorte,
          vlrExpSorte,
          referencia,
        }

        // injeta super protegido no cálculo sem poluir a RowBase (somando diretamente)
        const pontos = (() => {
          const p = calcPontos(baseNoPontos) + (qtdSuperProtegido || 0) * 1
          return Math.round(p * 10) / 10
        })()

        return { ...baseNoPontos, pontos }
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

    // ✅ ativos (entre encarteirados/treinados): pontos >= 10
    const treinados = list.filter((x) => isTreinado(x.r.statusAnalise))
    const ativosTreinados = treinados.filter((x) => (x.r.pontos || 0) >= 10).length
    const percAtivosTreinados = treinados.length ? (ativosTreinados / treinados.length) * 100 : 0

    // ✅ distribuição de pontos (geral)
    const bucket0 = list.filter((x) => (x.r.pontos || 0) === 0).length
    const bucket1a5 = list.filter((x) => (x.r.pontos || 0) >= 1 && (x.r.pontos || 0) <= 5).length
    const bucket6a9 = list.filter((x) => (x.r.pontos || 0) >= 6 && (x.r.pontos || 0) <= 9).length
    const bucket10 = list.filter((x) => (x.r.pontos || 0) >= 10).length

    const pct = (n: number) => (total ? (n / total) * 100 : 0)

    return {
      list,
      total,
      transacional,
      treinado,
      semCert,
      vencida,

      ativosTreinados,
      percAtivosTreinados,

      bucket0,
      bucket1a5,
      bucket6a9,
      bucket10,
      pct0: pct(bucket0),
      pct1a5: pct(bucket1a5),
      pct6a9: pct(bucket6a9),
      pct10: pct(bucket10),
    }
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

      if (fPontos !== 'Todos') {
        const p = r.pontos || 0
        if (fPontos === '0' && p !== 0) return false
        if (fPontos === '1-5' && !(p >= 1 && p <= 5)) return false
        if (fPontos === '6-9' && !(p >= 6 && p <= 9)) return false
        if (fPontos === '10+' && p < 10) return false
      }

      return true
    })

    // ✅ busca é só refinamento
    if (term) {
      list = list.filter(({ r }) => {
        const hay = [r.nome, r.chave, r.municipio, r.agencia, r.pacb, r.statusAnalise].join(' ').toLowerCase()
        return hay.includes(term)
      })
    } else {
      // ✅ sem busca: limita para não travar / poluir
      list = list.slice(0, LIMIT_NO_SEARCH)
    }

    return list
  }, [computed.list, q, fAgencia, fCert, fTrx, fPontos])

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
        pontos: r.pontos || 0,

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
        qtdSegCartaoDeb: r.qtdSegCartaoDeb,

        qtdExpSorte: r.qtdExpSorte,
        vlrExpSorte: r.vlrExpSorte,

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
          Agora com pontuação e análises de ativos.
        </p>
      </div>

      {/* ✅ RESUMO GERAL (TOPO) */}
      <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Pill>Total Expressos: {computed.total}</Pill>
        <Pill>Transacional: {computed.transacional}</Pill>
        <Pill>Encarteirados (Treinado): {computed.treinado}</Pill>

        <Pill style={pontosPillStyle(10)}>
          Ativos (Treinados com ≥ 10): {computed.ativosTreinados} • {computed.percAtivosTreinados.toFixed(1)}%
        </Pill>

        <button className="btn-primary" onClick={loadCsv} disabled={loading || checkingAuth} style={{ marginLeft: 'auto' }}>
          {checkingAuth ? 'Verificando login...' : loading ? 'Carregando...' : 'Recarregar base'}
        </button>
      </div>

      {/* ✅ DISTRIBUIÇÃO DE PONTOS */}
      <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Pill>Pontuação 0: {computed.bucket0} • {computed.pct0.toFixed(1)}%</Pill>
        <Pill>1–5 pts: {computed.bucket1a5} • {computed.pct1a5.toFixed(1)}%</Pill>
        <Pill>6–9 pts: {computed.bucket6a9} • {computed.pct6a9.toFixed(1)}%</Pill>
        <Pill style={pontosPillStyle(10)}>10+ pts: {computed.bucket10} • {computed.pct10.toFixed(1)}%</Pill>
      </div>

      {/* FILTROS */}
      <div className="card" style={{ display: 'grid', gap: '1rem' }}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
              <option value="Vencida">Certificação vencida (5 anos)</option>
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

          <label>
            <div className="label">Pontos</div>
            <select className="input" value={fPontos} onChange={(e) => setFPontos(e.target.value as PontosFilter)}>
              <option value="Todos">Todos</option>
              <option value="0">0</option>
              <option value="1-5">1–5</option>
              <option value="6-9">6–9</option>
              <option value="10+">10+</option>
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
                  <Pill style={pontosPillStyle(r.pontos || 0)} title="Pontuação calculada">
                    ⭐ Pontos: {pontosLabel(r.pontos || 0)}
                  </Pill>
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
                      Seg Cartão Débito
                    </div>
                    <div style={{ fontWeight: 900 }}>{formatNum(r.qtdSegCartaoDeb)}</div>
                  </div>

                  <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                    <div className="p-muted" style={{ fontSize: 12 }}>
                      QTD SORTE EXPRESSA (QTD_EXP_SORTE)
                    </div>
                    <div style={{ fontWeight: 900 }}>{formatNum(r.qtdExpSorte)}</div>
                  </div>

                  <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                    <div className="p-muted" style={{ fontSize: 12 }}>
                      VLR SORTE EXPRESSA (VLR_EXP_SORTE)
                    </div>
                    <div style={{ fontWeight: 900 }}>{String(r.vlrExpSorte || 0)}</div>
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