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

const LIMIT_NO_SEARCH = 250

type StatusFilter = 'Todos' | 'Treinado' | 'Transacional'
type FaltamAteFilter = 'Todos' | '3' | '5' | '10' | '20'

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
  trx: number
  qtdContas: number // sem depósito (mas conta como Conta PF)
  qtdContasComDeposito: number // com depósito (Conta PF)
}

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

function Pill({ children, style, title }: { children: ReactNode; style?: CSSProperties; title?: string }) {
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

/* =========================
   ACELERADOR
   ========================= */
type Faixa = {
  min: number
  max: number | null // null = sem teto (100+)
  pct: number
  label: string
  nextStart?: number // início da próxima faixa
}

const FAIXAS: Faixa[] = [
  { min: 5, max: 9, pct: 10, label: '05 a 09 Contas PF', nextStart: 10 },
  { min: 10, max: 19, pct: 15, label: '10 a 19 Contas PF', nextStart: 20 },
  { min: 20, max: 29, pct: 20, label: '20 a 29 Contas PF', nextStart: 30 },
  { min: 30, max: 39, pct: 25, label: '30 a 39 Contas PF', nextStart: 40 },
  { min: 40, max: 49, pct: 30, label: '40 a 49 Contas PF', nextStart: 50 },
  { min: 50, max: 59, pct: 35, label: '50 a 59 Contas PF', nextStart: 60 },
  { min: 60, max: 69, pct: 40, label: '60 a 69 Contas PF', nextStart: 70 },
  { min: 70, max: 79, pct: 45, label: '70 a 79 Contas PF', nextStart: 80 },
  { min: 80, max: 89, pct: 50, label: '80 a 89 Contas PF', nextStart: 90 },
  { min: 90, max: 99, pct: 55, label: '90 a 99 Contas PF', nextStart: 100 },
  { min: 100, max: null, pct: 60, label: 'Acima de 100 Contas PF' },
]

function getFaixa(contasPf: number) {
  if (!Number.isFinite(contasPf) || contasPf < 0) contasPf = 0

  if (contasPf < 5) {
    return {
      faixa: null as Faixa | null,
      pct: 0,
      faixaLabel: 'Abaixo de 05 Contas PF',
      proximoDegrau: 5,
      faltam: Math.max(0, 5 - contasPf),
    }
  }

  for (const f of FAIXAS) {
    const inRange =
      contasPf >= f.min && (f.max === null ? true : contasPf <= f.max)

    if (inRange) {
      const proximo = f.nextStart ?? (f.max === null ? null : f.max + 1)
      const faltam = proximo ? Math.max(0, proximo - contasPf) : 0

      return {
        faixa: f,
        pct: f.pct,
        faixaLabel: f.label,
        proximoDegrau: proximo,
        faltam,
      }
    }
  }

  // fallback
  return {
    faixa: null as Faixa | null,
    pct: 0,
    faixaLabel: '—',
    proximoDegrau: null as number | null,
    faltam: 0,
  }
}

function buildWhatsAppMessage(args: {
  nome: string
  chave: string
  municipio: string
  agencia: string
  pacb: string
  status: string
  trx: number
  contasPf: number
  faixaLabel: string
  pct: number
  proximoDegrau: number | null
  faltam: number
}) {
  const a = args
  const proximoTxt = a.proximoDegrau ? `${a.proximoDegrau} Contas PF` : 'Topo (60%)'
  return [
    '🚀 *Acelerador — Próximos da Faixa*',
    '',
    `🏪 *Expresso:* ${a.nome || '—'}`,
    `🔑 *Chave:* ${a.chave || '—'}`,
    `📍 *Município:* ${a.municipio || '—'}`,
    `🏦 *Agência/PACB:* ${a.agencia || '—'} / ${a.pacb || '—'}`,
    '',
    `✅ *Status:* ${a.status || '—'}`,
    `💳 *TRX Contábil:* ${String(a.trx ?? 0)}`,
    '',
    `📌 *Contas PF (total):* ${String(a.contasPf ?? 0)}`,
    `⚡ *Faixa atual:* ${a.faixaLabel} → *${String(a.pct)}%*`,
    `🎯 *Próximo degrau:* ${proximoTxt}`,
    `⏳ *Faltam:* ${String(a.faltam ?? 0)} abertura(s)`,
  ].join('\n')
}

/* =========================
   PAGE
   ========================= */
export default function AceleradorPage() {
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
  const [fStatus, setFStatus] = useState<StatusFilter>('Todos')
  const [fFaltamAte, setFFaltamAte] = useState<FaltamAteFilter>('5')

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
        const trx = parseNumber(r['qtd_trxcontabil'] || r['qtd_trx_contabil'] || r['qtd trxcontabil'] || r['qtd_trx'])

        // ✅ Contas PF (acelerador): soma dessas duas
        const qtdContas = parseNumber(r['qtd_contas'] || r['qtd contas'])
        const qtdContasComDeposito = parseNumber(r['qtd_contas_com_deposito'] || r['qtd contas com deposito'])

        return {
          chave,
          nome,
          municipio,
          agencia,
          pacb,
          statusAnalise,
          trx,
          qtdContas,
          qtdContasComDeposito,
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
      const contasPf = (r.qtdContas || 0) + (r.qtdContasComDeposito || 0)
      const fx = getFaixa(contasPf)
      return { r, contasPf, ...fx }
    })

    const total = list.length
    const transacional = list.filter((x) => isTransacional(x.r.statusAnalise)).length
    const treinado = list.filter((x) => isTreinado(x.r.statusAnalise)).length

    return { list, total, transacional, treinado }
  }, [rows])

  const agencias = useMemo(() => {
    const set = new Set<string>()
    computed.list.forEach(({ r }) => r.agencia && set.add(r.agencia))
    return ['Todos', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [computed.list])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()

    let list = computed.list.filter(({ r, faltam }) => {
      if (fAgencia !== 'Todos' && r.agencia !== fAgencia) return false

      if (fStatus !== 'Todos') {
        if (fStatus === 'Treinado' && !isTreinado(r.statusAnalise)) return false
        if (fStatus === 'Transacional' && !isTransacional(r.statusAnalise)) return false
      }

      if (fFaltamAte !== 'Todos') {
        const lim = Number(fFaltamAte)
        if (Number.isFinite(lim) && faltam > lim) return false
      }

      return true
    })

    // ranking: mais perto primeiro
    list.sort((a, b) => {
      if (a.faltam !== b.faltam) return a.faltam - b.faltam
      if (a.contasPf !== b.contasPf) return b.contasPf - a.contasPf
      return (a.r.nome || '').localeCompare(b.r.nome || '')
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
  }, [computed.list, q, fAgencia, fStatus, fFaltamAte])

  async function copyWhatsApp(it: (typeof filtered)[number]) {
    try {
      const msg = buildWhatsAppMessage({
        nome: it.r.nome,
        chave: it.r.chave,
        municipio: it.r.municipio,
        agencia: it.r.agencia,
        pacb: it.r.pacb,
        status: it.r.statusAnalise,
        trx: it.r.trx || 0,
        contasPf: it.contasPf || 0,
        faixaLabel: it.faixaLabel,
        pct: it.pct,
        proximoDegrau: it.proximoDegrau,
        faltam: it.faltam,
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
        <span className="pill">Expressos</span>
        <h1 className="h1" style={{ marginTop: '.75rem' }}>
          🚀 Acelerador (próximos da faixa)
        </h1>
        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          Ranking dos expressos mais próximos de subir o percentual do Acelerador (com base em Contas PF).
        </p>
      </div>

      {/* RESUMO */}
      <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Pill>Total na base: {computed.total}</Pill>
        <Pill>Transacional: {computed.transacional}</Pill>
        <Pill>Treinado: {computed.treinado}</Pill>

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
            <div className="label">Status</div>
            <select className="input" value={fStatus} onChange={(e) => setFStatus(e.target.value as StatusFilter)}>
              <option value="Todos">Todos</option>
              <option value="Treinado">Treinado</option>
              <option value="Transacional">Transacional</option>
            </select>
          </label>

          <label>
            <div className="label">Faltam até</div>
            <select className="input" value={fFaltamAte} onChange={(e) => setFFaltamAte(e.target.value as FaltamAteFilter)}>
              <option value="Todos">Todos</option>
              <option value="3">3</option>
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
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
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filtered.map((it, idx) => {
            const r = it.r
            const key = `${r.chave || 'semchave'}-${r.agencia || 'semag'}-${r.pacb || 'sempacb'}-${idx}`

            const faltamColor =
              it.faltam <= 3 ? 'rgba(214,31,44,.95)' : it.faltam <= 5 ? 'rgba(161,98,7,.95)' : 'rgba(16,16,24,.85)'

            return (
              <div key={key} className="card" style={{ display: 'grid', gap: '.75rem', padding: '1.1rem' }}>
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
                    <Pill>Contas PF: {String(it.contasPf || 0)}</Pill>

                    <Pill
                      style={{
                        background: 'rgba(34,197,94,.10)',
                        border: '1px solid rgba(34,197,94,.20)',
                        color: 'rgba(21,128,61,.95)',
                      }}
                    >
                      Faixa: {it.pct}%
                    </Pill>

                    <Pill style={{ color: faltamColor }} title="Faltam aberturas para o próximo degrau">
                      Faltam: {String(it.faltam || 0)}
                    </Pill>

                    <Pill>TRX: {String(r.trx || 0)}</Pill>
                  </div>

                  <LightButton onClick={() => copyWhatsApp(it)} title="Copiar mensagem para WhatsApp">
                    📤 WhatsApp
                  </LightButton>
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
                      Faixa / Próximo degrau
                    </div>
                    <div style={{ fontWeight: 900 }}>
                      {it.faixaLabel} {it.proximoDegrau ? `→ Próximo: ${it.proximoDegrau}` : '→ Topo'}
                    </div>
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