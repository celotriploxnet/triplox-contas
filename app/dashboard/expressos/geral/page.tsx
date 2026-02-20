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
  dtCertificacao: string
  trx: number
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

function isBloqueadoValue(raw: string) {
  const s = toStr(raw).toLowerCase()
  if (!s) return false
  if (s === '1' || s === 'true' || s === 'sim' || s === 'bloqueado') return true
  if (s.includes('bloq')) return true
  return false
}

function isTreinado(status: string) {
  return toStr(status).toLowerCase().includes('trein')
}

function isTransacional(status: string) {
  return toStr(status).toLowerCase().includes('trans')
}

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

  // filtros
  const [q, setQ] = useState('')
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
        const dtCertificacao = toStr(
          r['dt_certificacao'] || r['dt certificacao'] || r['certificacao'] || r['certificação']
        )

        const trx = parseNumber(
          r['qtd_trxcontabil'] || r['qtd_trx_contabil'] || r['qtd trxcontabil'] || r['qtd_trx']
        )

        return { chave, nome, municipio, agencia, pacb, statusAnalise, bloqueadoRaw, dtCertificacao, trx }
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
      const bloq = isBloqueadoValue(r.bloqueadoRaw)
      return { r, certDate, semCert, vencida, bloq }
    })

    // contadores do topo (base total)
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

    return computed.list.filter(({ r, certDate, semCert, vencida }) => {
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

      if (term) {
        const hay = [r.nome, r.chave, r.municipio, r.agencia, r.pacb, r.statusAnalise].join(' ').toLowerCase()
        if (!hay.includes(term)) return false
      }

      // evita TS warn
      void certDate

      return true
    })
  }, [computed.list, q, fAgencia, fCert, fTrx])

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <span className="pill">Geral</span>
        <h1 className="h1" style={{ marginTop: '.75rem' }}>
          📊 Expresso Geral (visão completa)
        </h1>
        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          Resumo geral da base, filtros e consulta por expresso.
        </p>
      </div>

      {/* BLOCO SUPERIOR (SOMAS) */}
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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1rem',
          }}
        >
          {filtered.map(({ r, certDate, vencida, semCert, bloq }) => (
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
                  <Pill style={bloqueadoPillStyle(bloq)}>{bloq ? 'Bloqueado' : 'Não bloqueado'}</Pill>

                  {semCert ? (
                    <Pill
                      style={{
                        background: 'rgba(15,15,25,.06)',
                        border: '1px solid rgba(15,15,25,.10)',
                        color: 'rgba(16,16,24,.70)',
                      }}
                    >
                      Sem certificação
                    </Pill>
                  ) : vencida ? (
                    <Pill
                      style={{
                        background: 'rgba(214,31,44,.10)',
                        border: '1px solid rgba(214,31,44,.20)',
                        color: 'rgba(214,31,44,.95)',
                      }}
                    >
                      Certificação vencida
                    </Pill>
                  ) : (
                    <Pill
                      style={{
                        background: 'rgba(34,197,94,.10)',
                        border: '1px solid rgba(34,197,94,.20)',
                        color: 'rgba(21,128,61,.95)',
                      }}
                    >
                      Certificado
                    </Pill>
                  )}

                  <Pill>TRX: {String(r.trx || 0)}</Pill>
                </div>
              </div>

              <div>
                <div className="p-muted" style={{ fontSize: 12 }}>
                  Nome do Expresso
                </div>
                <div style={{ fontWeight: 900, fontSize: '1.08rem', marginTop: '.15rem' }}>
                  {r.nome || '—'}
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
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