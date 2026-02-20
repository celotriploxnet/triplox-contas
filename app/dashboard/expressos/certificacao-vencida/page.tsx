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
  bloqueadoRaw: string
  dtCertificacao: string // string como vem do CSV
  trx: number
}

type CertGroup = 'vencida' | 'proxima' | 'ok' | 'nao_certificado'

/* =========================
   HELPERS (CSV)
   ========================= */
function toStr(v: any) {
  return v === null || v === undefined ? '' : String(v).trim()
}

function digitsOnly(v: any) {
  return toStr(v).replace(/\D/g, '')
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
  // tenta utf-8, se vier com caracteres estranhos, ainda assim XLSX normalmente resolve
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

/* =========================
   CERT HELPERS
   ========================= */
function parseDateFlexible(v: any): Date | null {
  const raw = toStr(v)
  if (!raw) return null

  // dd/mm/aaaa
  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (m) {
    const dd = Number(m[1])
    const mm = Number(m[2])
    const yy = Number(m[3])
    const dt = new Date(yy, mm - 1, dd)
    return Number.isNaN(dt.getTime()) ? null : dt
  }

  // excel serial
  const n = Number(raw)
  if (Number.isFinite(n) && n > 20000 && n < 90000) {
    const d = XLSX.SSF.parse_date_code(n)
    if (d?.y && d?.m && d?.d) return new Date(d.y, d.m - 1, d.d)
  }

  // ISO / Date parse
  const dt = new Date(raw)
  return Number.isNaN(dt.getTime()) ? null : dt
}

function formatPtBRDate(dt: Date | null) {
  if (!dt) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dt)
}

function classifyCert(dt: Date | null): CertGroup {
  if (!dt) return 'nao_certificado'

  const now = new Date()

  // vencida: mais de 5 anos
  const fiveYearsAgo = new Date(now)
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)
  if (dt < fiveYearsAgo) return 'vencida'

  // próxima: vence em até 3 meses (assumindo validade 5 anos)
  const expiry = new Date(dt)
  expiry.setFullYear(expiry.getFullYear() + 5)

  const threeMonthsFromNow = new Date(now)
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)

  if (expiry <= threeMonthsFromNow) return 'proxima'

  return 'ok'
}

function isTreinado(status: string) {
  return toStr(status).toLowerCase().includes('trein')
}

function isBloqueadoValue(raw: string) {
  const s = toStr(raw).toLowerCase()
  if (!s) return false
  if (s === '1' || s === 'true' || s === 'sim' || s === 'bloqueado') return true
  if (s.includes('bloq')) return true
  return false
}

/* =========================
   UI HELPERS
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

function SmallBtn({
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
        padding: '.5rem .75rem',
        fontSize: '.85rem',
        fontWeight: 900,
        border: '1px solid rgba(15,15,25,.18)',
        background: 'rgba(255,255,255,.85)',
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

function bloqueadoPillStyle(bloq: boolean): CSSProperties {
  return bloq
    ? {
        background: 'rgba(214,31,44,.10)',
        border: '1px solid rgba(214,31,44,.20)',
        color: 'rgba(214,31,44,.95)',
      }
    : {
        background: 'rgba(34,197,94,.10)',
        border: '1px solid rgba(34,197,94,.20)',
        color: 'rgba(21,128,61,.95)',
      }
}

function groupPillStyle(g: CertGroup): CSSProperties {
  if (g === 'vencida') {
    return {
      background: 'rgba(214,31,44,.10)',
      border: '1px solid rgba(214,31,44,.20)',
      color: 'rgba(214,31,44,.95)',
    }
  }
  if (g === 'proxima') {
    return {
      background: 'rgba(234,179,8,.12)',
      border: '1px solid rgba(234,179,8,.25)',
      color: 'rgba(161,98,7,.95)',
    }
  }
  return {
    background: 'rgba(15,15,25,.06)',
    border: '1px solid rgba(15,15,25,.10)',
    color: 'rgba(16,16,24,.70)',
  }
}

/* =========================
   WHATSAPP MSG
   ========================= */
function buildWhatsApp(r: RowBase, group: CertGroup, certDate: Date | null) {
  const groupLabel =
    group === 'vencida'
      ? '🚨 Certificação Vencida'
      : group === 'proxima'
      ? '⏳ Certificação Próxima do Vencimento'
      : '🪪 Certificação'

  return [
    `🪪 *${groupLabel}*`,
    '',
    `🏪 *Expresso:* ${r.nome || '—'}`,
    `🔑 *Chave Loja:* ${r.chave || '—'}`,
    `🏦 *Agência:* ${r.agencia || '—'}`,
    `🧾 *PACB:* ${r.pacb || '—'}`,
    `📍 *Município:* ${r.municipio || '—'}`,
    '',
    `📅 *Certificação:* ${formatPtBRDate(certDate)}`,
    `🔁 *TRX Contábil:* ${String(r.trx || 0)}`,
    `📌 *Status:* ${r.statusAnalise || '—'}`,
    `⛔ *Bloqueado:* ${isBloqueadoValue(r.bloqueadoRaw) ? 'SIM' : 'NÃO'}`,
  ].join('\n')
}

/* =========================
   PAGE
   ========================= */
export default function CertificacaoVencidaPage() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState('')

  const [rows, setRows] = useState<RowBase[]>([])

  // filtros e busca
  const [q, setQ] = useState('')
  const [fAgencia, setFAgencia] = useState('Todos')
  const [fStatus, setFStatus] = useState('Treinado') // nessa page é Treinado por regra, mas deixei filtro
  const [fBloqueado, setFBloqueado] = useState('Todos')
  const [fMunicipio, setFMunicipio] = useState('Todos')

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
        const bloqueadoRaw = toStr(r['bloqueado'] || r['bloq'])

        const dtCert = toStr(r['dt_certificacao'] || r['dt certificacao'] || r['certificacao'] || r['certificação'])
        const trx = parseNumber(r['qtd_trxcontabil'] || r['qtd_trx_contabil'] || r['qtd trxcontabil'] || r['qtd_trx'])

        return {
          chave,
          nome,
          municipio,
          agencia,
          pacb,
          statusAnalise,
          bloqueadoRaw,
          dtCertificacao: dtCert,
          trx,
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

  const parsed = useMemo(() => {
    return rows
      .map((r) => {
        const certDate = parseDateFlexible(r.dtCertificacao)
        const group = classifyCert(certDate)
        const bloq = isBloqueadoValue(r.bloqueadoRaw)
        return { r, certDate, group, bloq }
      })
      .filter(({ r, group }) => {
        // regras da página:
        // - TRX != 0
        // - Treinado
        // - certificação vencida OU próxima do vencimento
        if ((r.trx || 0) <= 0) return false
        if (!isTreinado(r.statusAnalise)) return false
        if (group !== 'vencida' && group !== 'proxima') return false
        return true
      })
  }, [rows])

  // opções de filtros (a partir do conjunto filtrado)
  const agencias = useMemo(() => {
    const set = new Set<string>()
    parsed.forEach(({ r }) => r.agencia && set.add(r.agencia))
    return ['Todos', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [parsed])

  const municipios = useMemo(() => {
    const set = new Set<string>()
    parsed.forEach(({ r }) => r.municipio && set.add(r.municipio))
    return ['Todos', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [parsed])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()

    return parsed.filter(({ r, group, bloq }) => {
      if (fAgencia !== 'Todos' && r.agencia !== fAgencia) return false
      if (fMunicipio !== 'Todos' && r.municipio !== fMunicipio) return false

      if (fBloqueado !== 'Todos') {
        const want = fBloqueado === 'Sim'
        if (bloq !== want) return false
      }

      if (fStatus !== 'Todos') {
        const s = toStr(r.statusAnalise).toLowerCase()
        if (fStatus === 'Treinado' && !s.includes('trein')) return false
        if (fStatus === 'Transacional' && !s.includes('trans')) return false
      }

      if (term) {
        const hay = [r.nome, r.chave, r.agencia, r.pacb, r.municipio, r.statusAnalise].join(' ').toLowerCase()
        if (!hay.includes(term)) return false
      }

      return true
    })
  }, [parsed, q, fAgencia, fMunicipio, fBloqueado, fStatus])

  const totals = useMemo(() => {
    let vencidos = 0
    let proximos = 0
    for (const it of filtered) {
      if (it.group === 'vencida') vencidos++
      if (it.group === 'proxima') proximos++
    }
    return { vencidos, proximos, total: filtered.length }
  }, [filtered])

  async function copyWhatsApp(it: (typeof filtered)[number]) {
    try {
      const msg = buildWhatsApp(it.r, it.group, it.certDate)
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
        <span className="pill">Certificação</span>
        <h1 className="h1" style={{ marginTop: '.75rem' }}>
          🚨 Expressos com Certificação Vencida
        </h1>
        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          Lista de expressos <b>Treinados</b> com <b>TRX &gt; 0</b> e certificação <b>vencida (5+ anos)</b> ou
          <b> próxima do vencimento (até 3 meses)</b>.
        </p>
      </div>

      {/* RESUMO */}
      <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Pill style={groupPillStyle('vencida')}>Vencidos: {totals.vencidos}</Pill>
        <Pill style={groupPillStyle('proxima')}>Próximo de vencer: {totals.proximos}</Pill>
        <Pill>Total exibido: {totals.total}</Pill>

        <button className="btn-primary" onClick={loadCsv} disabled={loading || checkingAuth} style={{ marginLeft: 'auto' }}>
          {checkingAuth ? 'Verificando login...' : loading ? 'Carregando...' : 'Recarregar base'}
        </button>
      </div>

      {/* FILTROS */}
      <div className="card" style={{ display: 'grid', gap: '1rem' }}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label>
            <div className="label">Buscar (nome ou chave)</div>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ex.: Mercado Azul | 12345"
            />
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
            <div className="label">Município</div>
            <select className="input" value={fMunicipio} onChange={(e) => setFMunicipio(e.target.value)}>
              {municipios.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <label>
            <div className="label">Bloqueado</div>
            <select className="input" value={fBloqueado} onChange={(e) => setFBloqueado(e.target.value)}>
              <option value="Todos">Todos</option>
              <option value="Sim">Sim</option>
              <option value="Nao">Não</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label>
            <div className="label">Status</div>
            <select className="input" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="Todos">Todos</option>
              <option value="Treinado">Treinado</option>
              <option value="Transacional">Transacional</option>
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

      {/* LISTA */}
      {filtered.length > 0 ? (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filtered.map((it) => {
            const r = it.r
            const bloq = it.bloq
            const groupLabel = it.group === 'vencida' ? 'Certificação vencida' : 'Próximo de vencer'

            return (
              <div key={`${r.chave}-${r.agencia}-${r.pacb}`} className="card" style={{ display: 'grid', gap: '.75rem', padding: '1.1rem' }}>
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
                    <Pill style={groupPillStyle(it.group)} title={groupLabel}>
                      {it.group === 'vencida' ? '🚨 Vencida' : '⏳ Próxima'}
                    </Pill>

                    <Pill style={bloqueadoPillStyle(bloq)}>{bloq ? 'Bloqueado' : 'Não bloqueado'}</Pill>

                    <Pill>{`TRX: ${String(r.trx || 0)}`}</Pill>
                  </div>

                  <SmallBtn onClick={() => copyWhatsApp(it)} title="Copiar para WhatsApp">
                    📤 WhatsApp
                  </SmallBtn>
                </div>

                <div>
                  <div className="p-muted" style={{ fontSize: 12 }}>
                    Nome do Expresso
                  </div>
                  <div style={{ fontWeight: 900, fontSize: '1.08rem', marginTop: '.15rem' }}>{r.nome || '—'}</div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '.6rem',
                  }}
                >
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
                      Status
                    </div>
                    <div style={{ fontWeight: 900 }}>{r.statusAnalise || '—'}</div>
                  </div>

                  <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                    <div className="p-muted" style={{ fontSize: 12 }}>
                      Certificação
                    </div>
                    <div style={{ fontWeight: 900 }}>{formatPtBRDate(it.certDate)}</div>
                  </div>
                </div>
              </div>
            )
          })}
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