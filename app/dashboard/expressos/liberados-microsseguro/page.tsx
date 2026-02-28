'use client'

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { getBytes, ref as storageRef, uploadBytes } from 'firebase/storage'
import * as XLSX from 'xlsx'

import { auth, storage } from '@/lib/firebase'

/* =========================
   CONFIG
   ========================= */
const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'

// caminho no Storage (precisa estar liberado nas regras)
const STORAGE_PATH = 'microsseguro/liberados-microsseguro.xlsx'

// para não travar a tela quando não tem busca (ajuste se quiser)
const LIMIT_NO_SEARCH = 300

/* =========================
   TYPES
   ========================= */
type RowItem = {
  chaveLoja: string
  expresso: string
  agencia: string
  supervisao: string
  vendas2026: number
  liberadoEmRaw: any
  liberadoEmDate: Date | null
}

type ParsedRow = {
  r: RowItem
  key: string // key única para React
}

/* =========================
   HELPERS
   ========================= */
function toStr(v: any) {
  return v === null || v === undefined ? '' : String(v).trim()
}

function normalizeKey(k: string) {
  return toStr(k)
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

function parseNumber(v: any) {
  const s = toStr(v).replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

function toUint8(bytes: any): Uint8Array {
  if (bytes instanceof Uint8Array) return bytes
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes)
  return new Uint8Array(bytes)
}

/**
 * Parser de data “flexível”
 * - "09/05/2022 00:00:00" (pega só dd/mm/aaaa)
 * - "09/05/2022"
 * - "2022-05-09"
 * - serial Excel
 */
function parseDateFlexible(v: any): Date | null {
  const raw = toStr(v)
  if (!raw) return null

  // dd/mm/aaaa (ignora horário se existir)
  const mBR = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (mBR) {
    const dd = Number(mBR[1])
    const mm = Number(mBR[2])
    const yy = Number(mBR[3])
    const dt = new Date(yy, mm - 1, dd)
    return Number.isNaN(dt.getTime()) ? null : dt
  }

  // yyyy-mm-dd
  const mISO = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (mISO) {
    const yy = Number(mISO[1])
    const mm = Number(mISO[2])
    const dd = Number(mISO[3])
    const dt = new Date(yy, mm - 1, dd)
    return Number.isNaN(dt.getTime()) ? null : dt
  }

  // serial Excel
  const n = Number(raw)
  if (Number.isFinite(n) && n > 20000 && n < 90000) {
    const d = XLSX.SSF.parse_date_code(n)
    if (d?.y && d?.m && d?.d) {
      const dt = new Date(d.y, d.m - 1, d.d)
      return Number.isNaN(dt.getTime()) ? null : dt
    }
  }

  // fallback parse
  const dt = new Date(raw)
  return Number.isNaN(dt.getTime()) ? null : dt
}

function formatPtBRDateOnly(dt: Date | null) {
  if (!dt) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dt)
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
   PAGE
   ========================= */
export default function LiberadosMicrosseguroPage() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState('')

  const [rows, setRows] = useState<RowItem[]>([])

  // filtros
  const [q, setQ] = useState('') // chave loja (ou texto geral)
  const [fAgencia, setFAgencia] = useState('Todos')
  const [fSupervisao, setFSupervisao] = useState('Todos')

  async function loadBaseFromStorage() {
    if (!auth.currentUser) {
      setError('Você precisa estar logado.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setInfo('')

      const bytesAny = await getBytes(storageRef(storage, STORAGE_PATH))
      const u8 = toUint8(bytesAny)

      // tenta como "array" primeiro (xlsx/xls)
      let wb: XLSX.WorkBook | null = null
      try {
        wb = XLSX.read(u8, { type: 'array' })
      } catch {
        // fallback: tenta como texto (csv)
        const text = new TextDecoder('utf-8').decode(u8)
        wb = XLSX.read(text, { type: 'string' })
      }

      const sheetName = wb.SheetNames[0]
      const ws = wb.Sheets[sheetName]
      const raw: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

      // normaliza keys
      const normalized = raw.map((obj) => {
        const out: Record<string, any> = {}
        for (const [k, v] of Object.entries(obj)) out[normalizeKey(k)] = v
        return out
      })

      const mapped: RowItem[] = normalized.map((r) => {
        const chaveLoja =
          toStr(r['chave_loja']) ||
          toStr(r['chave loja']) ||
          toStr(r['chaveloja']) ||
          toStr(r['chave']) ||
          toStr(r['chave_loja ']) // prevenção
        const expresso =
          toStr(r['correspondente']) ||
          toStr(r['expresso']) ||
          toStr(r['nome']) ||
          toStr(r['nome_loja']) ||
          toStr(r['nome da loja'])
        const agencia = toStr(r['cod_ag']) || toStr(r['cod ag']) || toStr(r['ag']) || toStr(r['agencia']) || toStr(r['agência'])
        const supervisao = toStr(r['supervisao']) || toStr(r['supervisão']) || toStr(r['sup']) || toStr(r['supervisor'])

        // "Vendas 2026" pode vir com espaço / maiúsculo / etc.
        const vendas2026 =
          parseNumber(r['vendas 2026']) ||
          parseNumber(r['vendas2026']) ||
          parseNumber(r['vendas']) ||
          parseNumber(r['venda 2026']) ||
          parseNumber(r['vendas_2026'])

        // "Válido des" (pode vir com hora)
        const liberadoEmRaw =
          r['válido des'] ??
          r['valido des'] ??
          r['valido_des'] ??
          r['válido_des'] ??
          r['liberado em'] ??
          r['liberado_em'] ??
          r['validade']

        const liberadoEmDate = parseDateFlexible(liberadoEmRaw)

        return {
          chaveLoja,
          expresso,
          agencia,
          supervisao,
          vendas2026,
          liberadoEmRaw,
          liberadoEmDate,
        }
      })

      setRows(mapped)
      setInfo('Base carregada ✅')
    } catch (e: any) {
      console.error('loadBaseFromStorage error:', e)
      setError(`Falha ao carregar base (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
    } finally {
      setLoading(false)
    }
  }

  async function uploadNewFile(file: File) {
    if (!user) return
    if (!isAdmin) {
      setError('Somente o admin pode atualizar essa base.')
      return
    }

    try {
      setUploading(true)
      setError(null)
      setInfo('Enviando arquivo...')

      // mantém o caminho fixo (sobrescreve o arquivo)
      await uploadBytes(storageRef(storage, STORAGE_PATH), file, {
        contentType: file.type || 'application/octet-stream',
      })

      setInfo('Arquivo enviado ✅ Recarregando base...')
      await loadBaseFromStorage()
    } catch (e: any) {
      console.error('uploadNewFile error:', e)
      setError(`Não consegui enviar (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
      setInfo('')
    } finally {
      setUploading(false)
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
      loadBaseFromStorage()
    })

    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // listas de filtro
  const agencias = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => r.agencia && set.add(r.agencia))
    return ['Todos', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [rows])

  const supervisoes = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => r.supervisao && set.add(r.supervisao))
    return ['Todos', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [rows])

  const filtered = useMemo((): ParsedRow[] => {
    const term = q.trim().toLowerCase()

    let list = rows.filter((r) => {
      if (fAgencia !== 'Todos' && r.agencia !== fAgencia) return false
      if (fSupervisao !== 'Todos' && r.supervisao !== fSupervisao) return false

      if (term) {
        const hay = [r.chaveLoja, r.expresso, r.agencia, r.supervisao].join(' ').toLowerCase()
        if (!hay.includes(term)) return false
      }

      return true
    })

    if (!term) list = list.slice(0, LIMIT_NO_SEARCH)

    // ✅ key única (mesma CHAVE_LOJA pode repetir)
    return list.map((r, idx) => ({
      r,
      key: `${r.chaveLoja || 'sem-chave'}|${r.agencia || 'sem-ag'}|${r.supervisao || 'sem-sup'}|${idx}`,
    }))
  }, [rows, q, fAgencia, fSupervisao])

  const totals = useMemo(() => {
    const total = rows.length
    const exibidos = filtered.length
    const somaVendas = filtered.reduce((acc, it) => acc + (it.r.vendas2026 || 0), 0)
    return { total, exibidos, somaVendas }
  }, [rows.length, filtered])

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <span className="pill">Produção</span>
        <h1 className="h1" style={{ marginTop: '.75rem' }}>
          ✅ Liberados para Microsseguro
        </h1>
        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          Base para consulta de expressos liberados (filtros por agência, supervisão e busca por chave).
        </p>
      </div>

      {/* RESUMO */}
      <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Pill>Total base: {totals.total}</Pill>
        <Pill>Exibindo: {totals.exibidos}</Pill>
        <Pill>Vendas (exibido): {String(totals.somaVendas)}</Pill>

        <button
          className="btn-primary"
          onClick={loadBaseFromStorage}
          disabled={loading || checkingAuth || uploading}
          style={{ marginLeft: 'auto' }}
        >
          {checkingAuth ? 'Verificando login...' : loading ? 'Carregando...' : 'Recarregar base'}
        </button>
      </div>

      {/* ADMIN UPLOAD */}
      {isAdmin && (
        <div className="card" style={{ display: 'grid', gap: '.75rem' }}>
          <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Pill
              style={{
                background: 'rgba(34,197,94,.10)',
                border: '1px solid rgba(34,197,94,.20)',
                color: 'rgba(21,128,61,.95)',
              }}
            >
              Admin
            </Pill>

            <label className="p-muted" style={{ fontWeight: 900 }}>
              Atualizar base (XLS / XLSX / CSV):
              <input
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                style={{ display: 'block', marginTop: '.45rem' }}
                disabled={uploading || loading}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  uploadNewFile(f)
                  e.currentTarget.value = ''
                }}
              />
            </label>

            {uploading && <span className="pill">Enviando...</span>}
          </div>

          <p className="p-muted" style={{ marginTop: '-.1rem' }}>
            Arquivo salvo no Storage em: <b>{STORAGE_PATH}</b>
          </p>
        </div>
      )}

      {/* FILTROS */}
      <div className="card" style={{ display: 'grid', gap: '1rem' }}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label>
            <div className="label">Buscar (chave / expresso)</div>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: 419824" />
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
            <div className="label">Supervisão</div>
            <select className="input" value={fSupervisao} onChange={(e) => setFSupervisao(e.target.value)}>
              {supervisoes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: 'flex', gap: '.6rem', alignItems: 'end', flexWrap: 'wrap' }}>
            <LightButton
              onClick={() => {
                setQ('')
                setFAgencia('Todos')
                setFSupervisao('Todos')
              }}
              disabled={loading || uploading}
              title="Limpar filtros"
            >
              Limpar
            </LightButton>
          </div>
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
          {filtered.map(({ r, key }) => (
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
                  <Pill>Ag: {r.agencia || '—'}</Pill>
                  <Pill>Sup: {r.supervisao || '—'}</Pill>
                  <Pill>Vendas 2026: {String(r.vendas2026 || 0)}</Pill>
                </div>

                <Pill
                  style={{
                    background: 'rgba(15,15,25,.06)',
                    border: '1px solid rgba(15,15,25,.10)',
                    color: 'rgba(16,16,24,.70)',
                  }}
                  title="Liberado em"
                >
                  Liberado em: {formatPtBRDateOnly(r.liberadoEmDate)}
                </Pill>
              </div>

              <div>
                <div className="p-muted" style={{ fontSize: 12 }}>
                  Expresso
                </div>
                <div style={{ fontWeight: 900, fontSize: '1.08rem', marginTop: '.15rem' }}>{r.expresso || '—'}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '.6rem' }}>
                <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                  <div className="p-muted" style={{ fontSize: 12 }}>
                    Chave Loja
                  </div>
                  <div style={{ fontWeight: 900 }}>{r.chaveLoja || '—'}</div>
                </div>

                <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                  <div className="p-muted" style={{ fontSize: 12 }}>
                    Agência
                  </div>
                  <div style={{ fontWeight: 900 }}>{r.agencia || '—'}</div>
                </div>

                <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                  <div className="p-muted" style={{ fontSize: 12 }}>
                    Supervisão
                  </div>
                  <div style={{ fontWeight: 900 }}>{r.supervisao || '—'}</div>
                </div>

                <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                  <div className="p-muted" style={{ fontSize: 12 }}>
                    Vendas Acumuladas (2026)
                  </div>
                  <div style={{ fontWeight: 900 }}>{String(r.vendas2026 || 0)}</div>
                </div>

                <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                  <div className="p-muted" style={{ fontSize: 12 }}>
                    Liberado em
                  </div>
                  <div style={{ fontWeight: 900 }}>{formatPtBRDateOnly(r.liberadoEmDate)}</div>
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