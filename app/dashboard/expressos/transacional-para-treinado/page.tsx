'use client'

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { collection, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'
import { getBytes, ref } from 'firebase/storage'

import { auth, db, storage } from '@/lib/firebase'

/* =========================
   CONFIG
   ========================= */
const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'
const CSV_PATH = 'base-lojas/banco.csv'
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

  qtdContas: number
  qtdContasComDeposito: number
  qtdLime: number
  qtdConsignado: number
  qtdCartaoEmitido: number

  trx: number
}

type SolicitacaoStatus = {
  solicitado: boolean
  updatedAt?: any
  updatedBy?: string
}

type FiltroSolicitado = 'Todos' | 'Solicitado' | 'NaoSolicitado'

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

function detectDelimiter(headerLine: string) {
  const candidates = [',', ';', '\t']
  let best = ','
  let bestCount = -1

  for (const delimiter of candidates) {
    const escaped = delimiter === '\t' ? '\\t' : `\\${delimiter}`
    const count = (headerLine.match(new RegExp(escaped, 'g')) || []).length
    if (count > bestCount) {
      best = delimiter
      bestCount = count
    }
  }

  return best
}

function parseDelimitedLine(line: string, delimiter: string) {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    const next = line[i + 1]

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (ch === delimiter && !inQuotes) {
      result.push(current)
      current = ''
      continue
    }

    current += ch
  }

  result.push(current)
  return result
}

function parseCsvRows(text: string): Record<string, string>[] {
  const cleaned = text.replace(/^\uFEFF/, '')
  const lines = cleaned
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim().length > 0)

  if (!lines.length) return []

  const delimiter = detectDelimiter(lines[0])
  const headers = parseDelimitedLine(lines[0], delimiter).map((h) => h.trim())

  return lines.slice(1).map((line) => {
    const values = parseDelimitedLine(line, delimiter)
    const row: Record<string, string> = {}

    headers.forEach((header, idx) => {
      row[header] = (values[idx] ?? '').trim()
    })

    return row
  })
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
  return {
    agencia: toStr(parts[0]),
    pacb: toStr(parts[1]),
  }
}

function formatNum(n: number) {
  return new Intl.NumberFormat('pt-BR').format(n || 0)
}

function isTransacional(status: string) {
  return toStr(status).toLowerCase().includes('trans')
}

function totalProdutos(r: RowBase) {
  return (
    (r.qtdContas || 0) +
    (r.qtdContasComDeposito || 0) +
    (r.qtdLime || 0) +
    (r.qtdConsignado || 0) +
    (r.qtdCartaoEmitido || 0)
  )
}

/* =========================
   TEXTO WHATSAPP
   ========================= */

function buildMensagemWhatsapp(r: RowBase) {
  return [
    '📌 *Solicitação de Alteração de Status do Expresso*',
    '',
    'Prezados,',
    '',
    'Solicito a alteração do *STATUS/ANÁLISE* de *Transacional* para *Treinado* do expresso abaixo:',
    '',
    `🏪 Nome: ${r.nome || '—'}`,
    `🔑 Chave: ${r.chave || '—'}`,
    `🏦 Agência/PACB: ${r.agencia || '—'} / ${r.pacb || '—'}`,
    '',
    'Antecipadamente agradeço.',
  ].join('\n')
}

/* =========================
   UI
   ========================= */

function Pill({
  children,
  style,
}: {
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <span className="pill" style={style}>
      {children}
    </span>
  )
}

function LightButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        borderRadius: 999,
        padding: '.55rem .8rem',
        fontWeight: 900,
        border: '1px solid rgba(0,0,0,.15)',
        background: 'white',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  )
}

/* =========================
   PAGE
   ========================= */

export default function TransacionalParaTreinadoPage() {
  const router = useRouter()

  const [rows, setRows] = useState<RowBase[]>([])
  const [solicitacoes, setSolicitacoes] = useState<Record<string, SolicitacaoStatus>>({})

  const [q, setQ] = useState('')
  const [fAgencia, setFAgencia] = useState('Todos')
  const [fSolicitado, setFSolicitado] = useState<FiltroSolicitado>('Todos')

  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [loading, setLoading] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [info, setInfo] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function loadAll() {
    if (!auth.currentUser) {
      setError('Você precisa estar logado.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setInfo('')

      const [bytesAny, solicitacoesSnap] = await Promise.all([
        getBytes(ref(storage, CSV_PATH)),
        getDocs(collection(db, 'solicitacoes_status_analise')),
      ])

      const text = parseCSVText(toUint8(bytesAny))
      const raw = parseCsvRows(text)

      const normalized = raw.map((obj) => {
        const out: Record<string, any> = {}
        for (const [k, v] of Object.entries(obj)) out[normalizeKey(k)] = v
        return out
      })

      const mappedRows: RowBase[] = normalized.map((r) => {
        const chave = toStr(r['chave_loja'] || r['chave loja'] || r['chave'])
        const nome = toStr(r['nome_loja'] || r['nome da loja'] || r['nome'])
        const municipio = toStr(r['municipio'] || r['município'])

        const agpacb = r['ag_pacb'] || r['agencia/pacb'] || r['agência/pacb']
        const { agencia, pacb } = splitAgPacb(agpacb)

        const statusAnalise = toStr(r['status_analise'] || r['status analise'] || r['status'])

        const trx = parseNumber(
          r['qtd_trxcontabil'] || r['qtd_trx_contabil'] || r['qtd trxcontabil'] || r['qtd_trx']
        )

        const qtdContas = parseNumber(r['qtd_contas'] || r['qtd contas'])
        const qtdContasComDeposito = parseNumber(
          r['qtd_contas_com_deposito'] || r['qtd contas com deposito']
        )
        const qtdLime = parseNumber(r['qtd_lime'] || r['qtd lime'])
        const qtdConsignado = parseNumber(r['qtd_consignado'] || r['qtd consignado'])
        const qtdCartaoEmitido = parseNumber(
          r['qtd_cartao_emitido'] || r['qtd cartao emitido'] || r['cartao']
        )

        return {
          chave,
          nome,
          municipio,
          agencia,
          pacb,
          statusAnalise,
          qtdContas,
          qtdContasComDeposito,
          qtdLime,
          qtdConsignado,
          qtdCartaoEmitido,
          trx,
        }
      })

      const solicitacoesMap: Record<string, SolicitacaoStatus> = {}
      solicitacoesSnap.forEach((d) => {
        solicitacoesMap[d.id] = d.data() as SolicitacaoStatus
      })

      setRows(mappedRows)
      setSolicitacoes(solicitacoesMap)
      setInfo('Relatório carregado ✅')
    } catch (e: any) {
      console.error('loadAll error:', e)
      setError(`Falha ao carregar relatório (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
    } finally {
      setLoading(false)
    }
  }

  async function copiarMensagem(r: RowBase) {
    try {
      const texto = buildMensagemWhatsapp(r)
      await navigator.clipboard.writeText(texto)
      setInfo('Texto copiado para WhatsApp ✔')
      setError(null)
    } catch (e) {
      console.error(e)
      setError('Não consegui copiar o texto.')
    }
  }

  async function toggleSolicitado(r: RowBase) {
    if (!auth.currentUser) {
      setError('Você precisa estar logado.')
      return
    }

    try {
      setSavingKey(r.chave)
      setError(null)

      const atual = !!solicitacoes[r.chave]?.solicitado
      const novo = !atual

      await setDoc(
        doc(db, 'solicitacoes_status_analise', r.chave),
        {
          solicitado: novo,
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser.email || '',
        },
        { merge: true }
      )

      setSolicitacoes((prev) => ({
        ...prev,
        [r.chave]: {
          ...prev[r.chave],
          solicitado: novo,
        },
      }))

      setInfo(novo ? 'Marcado como SOLICITADO ✅' : 'Marcado como NÃO SOLICITADO ✅')
    } catch (e: any) {
      console.error('toggleSolicitado error:', e)
      setError(`Falha ao salvar (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
    } finally {
      setSavingKey(null)
    }
  }

  function irParaArvore(r: RowBase) {
    router.push(`/dashboard/arvorecronologica/${encodeURIComponent(r.chave)}`)
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        setUser(null)
        setIsAdmin(false)
        setCheckingAuth(false)
        router.push('/login')
        return
      }

      setUser(u)
      setIsAdmin((u.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase())
      setCheckingAuth(false)
      loadAll()
    })

    return () => unsub()
  }, [router])

  const baseFiltrada = useMemo(() => {
    return rows.filter(
      (r) => isTransacional(r.statusAnalise) && totalProdutos(r) > 5
    )
  }, [rows])

  const agencias = useMemo(() => {
    const set = new Set<string>()
    baseFiltrada.forEach((r) => {
      if (r.agencia) set.add(r.agencia)
    })
    return ['Todos', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [baseFiltrada])

  const filtrados = useMemo(() => {
    let list = baseFiltrada.filter((r) => {
      if (fAgencia !== 'Todos' && r.agencia !== fAgencia) return false

      if (q) {
        const termo = q.toLowerCase()
        const texto = [r.nome, r.chave, r.agencia, r.pacb, r.municipio]
          .join(' ')
          .toLowerCase()

        if (!texto.includes(termo)) return false
      }

      const solicitado = !!solicitacoes[r.chave]?.solicitado

      if (fSolicitado === 'Solicitado' && !solicitado) return false
      if (fSolicitado === 'NaoSolicitado' && solicitado) return false

      return true
    })

    list.sort((a, b) => {
      const totalA = totalProdutos(a)
      const totalB = totalProdutos(b)

      if (totalB !== totalA) return totalB - totalA
      if ((b.trx || 0) !== (a.trx || 0)) return (b.trx || 0) - (a.trx || 0)
      return a.nome.localeCompare(b.nome)
    })

    if (!q.trim()) {
      list = list.slice(0, LIMIT_NO_SEARCH)
    }

    return list
  }, [baseFiltrada, q, fAgencia, fSolicitado, solicitacoes])

  const totalSolicitado = useMemo(() => {
    return baseFiltrada.filter((r) => !!solicitacoes[r.chave]?.solicitado).length
  }, [baseFiltrada, solicitacoes])

  const totalNaoSolicitado = Math.max(0, baseFiltrada.length - totalSolicitado)

  return (
    <section style={{ display: 'grid', gap: '1.5rem' }}>
      <div>
        <span className="pill">Expressos</span>
        <h1 className="h1">Transacional → Treinado</h1>
        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          Relatório dos expressos com STATUS/ANÁLISE como <b>Transacional</b> e com mais de <b>5 produtos</b>.
        </p>
      </div>

      <div
        className="card"
        style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}
      >
        <Pill>Total elegíveis: {baseFiltrada.length}</Pill>
        <Pill>Solicitado: {totalSolicitado}</Pill>
        <Pill>Não solicitado: {totalNaoSolicitado}</Pill>

        <button
          className="btn-primary"
          onClick={loadAll}
          disabled={loading || checkingAuth}
          style={{ marginLeft: 'auto' }}
        >
          {checkingAuth ? 'Verificando login...' : loading ? 'Carregando...' : 'Atualizar relatório'}
        </button>
      </div>

      <div className="card" style={{ display: 'grid', gap: '1rem' }}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label>
            <div className="label">Buscar</div>
            <input
              className="input"
              placeholder="Buscar expresso..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
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
            <div className="label">Solicitação</div>
            <select
              className="input"
              value={fSolicitado}
              onChange={(e) => setFSolicitado(e.target.value as FiltroSolicitado)}
            >
              <option value="Todos">Todos</option>
              <option value="NaoSolicitado">Não solicitado</option>
              <option value="Solicitado">Solicitado</option>
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

      <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Pill>Mostrando: {filtrados.length}</Pill>
        {q.trim() && (
          <span className="p-muted">
            Busca: <b>{q}</b>
          </span>
        )}
      </div>

      {filtrados.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1rem',
          }}
        >
          {filtrados.map((r) => {
            const total = totalProdutos(r)

            // ✅ CORREÇÃO AQUI
            const qtdContasSemDeposito = Math.max(
              (r.qtdContas || 0) - (r.qtdContasComDeposito || 0),
              0
            )

            const pontos =
              (r.qtdContasComDeposito || 0) * 7 +
              qtdContasSemDeposito * 3 +
              (r.qtdLime || 0) * 7 +
              (r.qtdConsignado || 0) * 5.5

            const solicitado = !!solicitacoes[r.chave]?.solicitado
            const salvando = savingKey === r.chave

            return (
              <div
                key={`${r.chave}-${r.agencia}-${r.pacb}`}
                className="card"
                style={{ display: 'grid', gap: '.75rem' }}
              >
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
                    <Pill
                      style={{
                        background: 'rgba(37,99,235,.12)',
                        border: '1px solid rgba(37,99,235,.25)',
                        color: 'rgba(37,99,235,.98)',
                      }}
                    >
                      Produtos: {formatNum(total)}
                    </Pill>

                    <Pill>Pontos: {formatNum(pontos)}</Pill>

                    <Pill>TRX: {formatNum(r.trx || 0)}</Pill>

                    <Pill
                      style={
                        solicitado
                          ? {
                              background: 'rgba(34,197,94,.10)',
                              border: '1px solid rgba(34,197,94,.20)',
                              color: 'rgba(21,128,61,.95)',
                            }
                          : {
                              background: 'rgba(245,158,11,.10)',
                              border: '1px solid rgba(245,158,11,.22)',
                              color: 'rgba(180,83,9,.98)',
                            }
                      }
                    >
                      {solicitado ? 'SOLICITADO' : 'NÃO SOLICITADO'}
                    </Pill>
                  </div>

                  <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                    <LightButton onClick={() => irParaArvore(r)}>
                      🌳 Ver Árvore
                    </LightButton>

                    <LightButton onClick={() => copiarMensagem(r)}>
                      📋 Copiar texto
                    </LightButton>

                    <LightButton onClick={() => toggleSolicitado(r)} disabled={salvando}>
                      {salvando
                        ? 'Salvando...'
                        : solicitado
                          ? '✔ SOLICITADO'
                          : '❌ NÃO SOLICITADO'}
                    </LightButton>
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
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '.6rem',
                  }}
                >
                  <Indicador label="Chave Loja" value={r.chave || '—'} />
                  <Indicador label="Agência" value={r.agencia || '—'} />
                  <Indicador label="PACB" value={r.pacb || '—'} />
                  <Indicador label="Município" value={r.municipio || '—'} />
                  <Indicador label="Status Análise" value={r.statusAnalise || '—'} />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '.6rem',
                  }}
                >
                  <Indicador label="Conta" value={formatNum(r.qtdContas || 0)} />
                  <Indicador
                    label="Conta com Depósito"
                    value={formatNum(r.qtdContasComDeposito || 0)}
                  />
                  <Indicador label="Lime" value={formatNum(r.qtdLime || 0)} />
                  <Indicador label="Consignado" value={formatNum(r.qtdConsignado || 0)} />
                  <Indicador label="Cartão" value={formatNum(r.qtdCartaoEmitido || 0)} />
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

function Indicador({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
      <div className="p-muted" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div style={{ fontWeight: 900 }}>{value}</div>
    </div>
  )
}