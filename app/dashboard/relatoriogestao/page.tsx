'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { collection, getDocs } from 'firebase/firestore'
import { getBytes, ref } from 'firebase/storage'

import { auth, db, storage } from '@/lib/firebase'

/* =========================
   CONFIG
   ========================= */
const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'
const CSV_PATH = 'base-lojas/banco.csv'
const PAGE_SIZE = 20

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
  qtdSuperProtegido: number
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
  vlrExpSorte: number
  qtdExpSorte?: number
  referencia: string

  pontos: number
}

type GestaoAgencia = {
  codAg: string
  nomeAg: string
  tipo: string
  supervisor: string
  contatoSupervisor: string
  gerenteAg: string
  telGerente1: string
  emailGerente: string
  regional: string
  nomeDiretorRegional: string
  telefoneRegional: string
}

type GroupMode = 'agencia' | 'supervisor' | 'regional'

type GroupSummary = {
  key: string
  titulo: string
  subtitulo: string

  codAg?: string
  nomeAg?: string
  supervisor?: string
  gerenteAg?: string
  regional?: string
  nomeDiretorRegional?: string

  totalExpressos: number
  totalTransacionamEProduzem: number
  totalTrxZeradaEProduzem: number
  totalSomenteTransacionando: number
  totalSemMovimentoTotal: number

  totalContas: number
  totalLime: number
  totalConsignado: number
  totalVivaVidaMicrosseguro: number
  totalDental: number
  totalResidencial: number
  totalVlrExpSorte: number

  expressos: RowBase[]
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

function getField(obj: Record<string, any>, aliases: string[]) {
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(obj, alias)) {
      return obj[alias]
    }
  }
  return ''
}

function splitAgPacb(v: any) {
  const raw = toStr(v)
  if (!raw) return { agencia: '', pacb: '' }
  const parts = raw.split('/')
  const ag = toStr(parts[0])
  const pacb = toStr(parts[1])
  return { agencia: ag, pacb }
}

function formatNum(n: number) {
  if (!Number.isFinite(n)) return '0'
  return new Intl.NumberFormat('pt-BR').format(n)
}

function formatPontos(n: number) {
  if (!Number.isFinite(n)) return '0'
  const rounded = Math.round(n * 10) / 10
  const isInt = Math.abs(rounded - Math.round(rounded)) < 1e-9
  return isInt ? String(Math.round(rounded)) : rounded.toFixed(1).replace('.', ',')
}

function calcPontos(r: {
  qtdContasComDeposito: number
  qtdContas: number
  qtdLime: number
  qtdConsignado: number
  qtdMicrosseguro: number
  qtdVivaVida: number
  qtdPlanoOdonto: number
  qtdSegResidencial: number
  vlrExpSorte: number
}) {
  const expSortePts = Math.floor((r.vlrExpSorte || 0) / 50)

  return (
    (r.qtdContasComDeposito || 0) * 7 +
    (r.qtdContas || 0) * 3 +
    (r.qtdLime || 0) * 6.5 +
    (r.qtdConsignado || 0) * 5.5 +
    (r.qtdMicrosseguro || 0) * 1 +
    (r.qtdVivaVida || 0) * 1 +
    (r.qtdPlanoOdonto || 0) * 1 +
    (r.qtdSegResidencial || 0) * 1 +
    expSortePts
  )
}

function calcProducao(row: RowBase) {
  return (
    (row.qtdContas || 0) +
    (row.qtdContasComDeposito || 0) +
    (row.qtdLime || 0) +
    (row.qtdConsignado || 0) +
    (row.qtdMicrosseguro || 0) +
    (row.qtdVivaVida || 0) +
    (row.qtdPlanoOdonto || 0) +
    (row.qtdSegResidencial || 0)
  )
}

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
        padding: '.58rem .8rem',
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

function InfoBox({
  label,
  value,
  compact = false,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div
      className="card-soft"
      style={{
        padding: compact ? '.55rem .7rem' : '.75rem .9rem',
      }}
    >
      <div className="p-muted" style={{ fontSize: compact ? 11 : 12 }}>
        {label}
      </div>
      <div
        style={{
          fontWeight: 900,
          marginTop: '.15rem',
          wordBreak: 'break-word',
          fontSize: compact ? '.88rem' : '1rem',
        }}
      >
        {value}
      </div>
    </div>
  )
}

/* =========================
   PAGE
   ========================= */
export default function RelatorioGestaoPage() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState('')

  const [rows, setRows] = useState<RowBase[]>([])
  const [gestaoMap, setGestaoMap] = useState<Record<string, GestaoAgencia>>({})

  const [groupMode, setGroupMode] = useState<GroupMode>('agencia')
  const [groupFilter, setGroupFilter] = useState('Todos')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [q, setQ] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  function toggleExpanded(key: string) {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  async function loadAll() {
    if (!auth.currentUser) {
      setError('Você precisa estar logado.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setInfo('')

      const [bytesAny, gestaoSnap] = await Promise.all([
        getBytes(ref(storage, CSV_PATH)),
        getDocs(collection(db, 'gestao_agencias')),
      ])

      const text = parseCSVText(toUint8(bytesAny))
      const raw = parseCsvRows(text)

      const normalized = raw.map((obj) => {
        const out: Record<string, any> = {}
        for (const [k, v] of Object.entries(obj)) out[normalizeKey(k)] = v
        return out
      })

      const mappedRows: RowBase[] = normalized.map((r) => {
        const chave = toStr(getField(r, ['chave_loja', 'chave loja', 'chave']))
        const nome = toStr(getField(r, ['nome_loja', 'nome da loja', 'nome']))
        const municipio = toStr(getField(r, ['municipio', 'município']))

        const agpacb = getField(r, ['ag_pacb', 'agencia/pacb', 'agência/pacb'])
        const { agencia, pacb } = splitAgPacb(agpacb)

        const statusAnalise = toStr(getField(r, ['status_analise', 'status analise', 'status']))

        const trx = parseNumber(
          getField(r, ['qtd_trxcontabil', 'qtd_trx_contabil', 'qtd trxcontabil', 'qtd_trx'])
        )

        const qtdContas = parseNumber(getField(r, ['qtd_contas', 'qtd contas']))
        const qtdContasComDeposito = parseNumber(
          getField(r, ['qtd_contas_com_deposito', 'qtd contas com deposito'])
        )
        const qtdLime = parseNumber(getField(r, ['qtd_lime', 'qtd lime']))
        const qtdConsignado = parseNumber(getField(r, ['qtd_consignado', 'qtd consignado']))
        const qtdMicrosseguro = parseNumber(getField(r, ['qtd_microsseguro', 'qtd microsseguro']))
        const qtdVivaVida = parseNumber(
          getField(r, ['qtd_micro_vivavida', 'qtd micro vivavida', 'viva vida'])
        )
        const qtdPlanoOdonto = parseNumber(
          getField(r, ['qtd_plano_odonto', 'qtd plano odonto', 'odonto', 'dental'])
        )
        const qtdSegResidencial = parseNumber(
          getField(r, ['qtd_seg_residencial', 'qtd seg residencial'])
        )
        const vlrExpSorte = parseNumber(
          getField(r, ['vlr_exp_sorte', 'vlr exp sorte', 'valor exp sorte', 'vlr_expsorte'])
        )

        const pontos = calcPontos({
          qtdContasComDeposito,
          qtdContas,
          qtdLime,
          qtdConsignado,
          qtdMicrosseguro,
          qtdVivaVida,
          qtdPlanoOdonto,
          qtdSegResidencial,
          vlrExpSorte,
        })

        return {
          chave,
          nome,
          municipio,
          agencia,
          pacb,
          statusAnalise,
          dtCertificacao: '',
          trx,
          qtdContas,
          qtdContasComDeposito,
          qtdCestaServ: 0,
          qtdSuperProtegido: 0,
          qtdMobilidade: 0,
          qtdCartaoEmitido: 0,
          qtdChesContratado: 0,
          qtdLimeAbConta: 0,
          qtdLime,
          qtdConsignado,
          qtdCreditoParcelado: 0,
          qtdMicrosseguro,
          qtdVivaVida,
          qtdPlanoOdonto,
          qtdSegResidencial,
          qtdSegCartaoDeb: 0,
          vlrExpSorte,
          qtdExpSorte: 0,
          referencia: '',
          pontos,
        }
      })

      const gestao: Record<string, GestaoAgencia> = {}
      gestaoSnap.forEach((d) => {
        const data = d.data() as any
        gestao[d.id] = {
          codAg: d.id,
          nomeAg: toStr(data.nomeAg || data.NOME_AG),
          tipo: toStr(data.tipo || data.TIPO),
          supervisor: toStr(data.supervisor || data.SUPERVISOR),
          contatoSupervisor: toStr(data.contatoSupervisor || data.CONTATO_SUPERVISOR),
          gerenteAg: toStr(data.gerenteAg || data.GERENTE_AG),
          telGerente1: toStr(data.telGerente1 || data.TEL_GERENTE1),
          emailGerente: toStr(data.emailGerente || data.EMAIL_GERENTE),
          regional: toStr(data.regional || data.REGIONAL),
          nomeDiretorRegional: toStr(data.nomeDiretorRegional || data.NOME_DIRETORREGIONAL),
          telefoneRegional: toStr(data.telefoneRegional || data.TELEFONE_REGIONAL),
        }
      })

      setRows(mappedRows)
      setGestaoMap(gestao)
      setInfo('Relatório carregado ✅')
    } catch (e: any) {
      console.error('loadAll error:', e)
      setError(`Falha ao carregar relatório (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      setCheckingAuth(false)

      if (!u) {
        setIsAdmin(false)
        router.push('/login')
        return
      }

      setIsAdmin((u.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase())
      await loadAll()
    })

    return () => unsub()
  }, [router])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
    setExpanded({})
    setGroupFilter('Todos')
  }, [groupMode])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
    setExpanded({})
  }, [q, groupFilter])

  const filterOptions = useMemo(() => {
    if (groupMode === 'agencia') {
      const list = Object.values(gestaoMap)
        .map((g) => ({
          value: g.codAg || '',
          label: `${g.codAg || '—'} - ${g.nomeAg || 'Agência sem nome'}`,
        }))
        .filter((x) => x.value)

      const unique = new Map<string, string>()
      list.forEach((item) => {
        if (!unique.has(item.value)) unique.set(item.value, item.label)
      })

      return [{ value: 'Todos', label: 'Todas as agências' }].concat(
        Array.from(unique.entries())
          .map(([value, label]) => ({ value, label }))
          .sort((a, b) => a.label.localeCompare(b.label))
      )
    }

    if (groupMode === 'supervisor') {
      const unique = new Set<string>()

      Object.values(gestaoMap).forEach((g) => {
        const nome = toStr(g.supervisor)
        if (nome) unique.add(nome)
      })

      return [{ value: 'Todos', label: 'Todos os supervisores' }].concat(
        Array.from(unique)
          .sort((a, b) => a.localeCompare(b))
          .map((value) => ({ value, label: value }))
      )
    }

    const unique = new Set<string>()
    Object.values(gestaoMap).forEach((g) => {
      const nome = toStr(g.regional)
      if (nome) unique.add(nome)
    })

    return [{ value: 'Todos', label: 'Todas as regionais' }].concat(
      Array.from(unique)
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ value, label: value }))
    )
  }, [gestaoMap, groupMode])

  const grouped = useMemo(() => {
    const map = new Map<string, GroupSummary>()

    for (const row of rows) {
      const gestao = gestaoMap[row.agencia]

      let groupKey = ''
      let titulo = ''
      let subtitulo = ''

      if (groupMode === 'agencia') {
        const codAg = row.agencia || 'SEM-AG'
        const nomeAg = gestao?.nomeAg || 'Agência não vinculada'
        groupKey = `agencia:${codAg}`
        titulo = `${codAg} • ${nomeAg}`
        subtitulo = `Supervisor: ${gestao?.supervisor || '—'} • Regional: ${gestao?.regional || '—'}`
      }

      if (groupMode === 'supervisor') {
        const supervisor = gestao?.supervisor || 'Sem supervisor'
        groupKey = `supervisor:${supervisor}`
        titulo = supervisor
        subtitulo = `Regional: ${gestao?.regional || '—'}`
      }

      if (groupMode === 'regional') {
        const regional = gestao?.regional || 'Sem regional'
        groupKey = `regional:${regional}`
        titulo = regional
        subtitulo = `Diretor Regional: ${gestao?.nomeDiretorRegional || '—'}`
      }

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          key: groupKey,
          titulo,
          subtitulo,
          codAg: gestao?.codAg || row.agencia || '',
          nomeAg: gestao?.nomeAg || '',
          supervisor: gestao?.supervisor || '',
          gerenteAg: gestao?.gerenteAg || '',
          regional: gestao?.regional || '',
          nomeDiretorRegional: gestao?.nomeDiretorRegional || '',
          totalExpressos: 0,
          totalTransacionamEProduzem: 0,
          totalTrxZeradaEProduzem: 0,
          totalSomenteTransacionando: 0,
          totalSemMovimentoTotal: 0,
          totalContas: 0,
          totalLime: 0,
          totalConsignado: 0,
          totalVivaVidaMicrosseguro: 0,
          totalDental: 0,
          totalResidencial: 0,
          totalVlrExpSorte: 0,
          expressos: [],
        })
      }

      const current = map.get(groupKey)!
      const trx = row.trx || 0
      const producao = calcProducao(row)

      current.totalExpressos += 1

      if (trx > 0 && producao > 0) {
        current.totalTransacionamEProduzem += 1
      }

      if (trx === 0 && producao > 0) {
        current.totalTrxZeradaEProduzem += 1
      }

      if (trx > 0 && producao === 0) {
        current.totalSomenteTransacionando += 1
      }

      if (trx === 0 && producao === 0) {
        current.totalSemMovimentoTotal += 1
      }

      current.totalContas += (row.qtdContas || 0) + (row.qtdContasComDeposito || 0)
      current.totalLime += row.qtdLime || 0
      current.totalConsignado += row.qtdConsignado || 0
      current.totalVivaVidaMicrosseguro += (row.qtdVivaVida || 0) + (row.qtdMicrosseguro || 0)
      current.totalDental += row.qtdPlanoOdonto || 0
      current.totalResidencial += row.qtdSegResidencial || 0
      current.totalVlrExpSorte += row.vlrExpSorte || 0
      current.expressos.push(row)
    }

    let list = Array.from(map.values()).map((g) => ({
      ...g,
      expressos: [...g.expressos].sort((a, b) => {
        if (b.pontos !== a.pontos) return b.pontos - a.pontos
        if (b.trx !== a.trx) return b.trx - a.trx
        return a.nome.localeCompare(b.nome)
      }),
    }))

    if (groupFilter !== 'Todos') {
      list = list.filter((g) => {
        if (groupMode === 'agencia') return (g.codAg || '') === groupFilter
        if (groupMode === 'supervisor') return (g.supervisor || '') === groupFilter
        return (g.regional || '') === groupFilter
      })
    }

    const term = q.trim().toLowerCase()
    const filtered = !term
      ? list
      : list.filter((g) =>
          [
            g.titulo,
            g.subtitulo,
            g.codAg,
            g.nomeAg,
            g.supervisor,
            g.gerenteAg,
            g.regional,
            g.nomeDiretorRegional,
          ]
            .join(' ')
            .toLowerCase()
            .includes(term)
        )

    return filtered.sort((a, b) => {
      if (b.totalExpressos !== a.totalExpressos) return b.totalExpressos - a.totalExpressos
      return a.titulo.localeCompare(b.titulo)
    })
  }, [rows, gestaoMap, groupMode, q, groupFilter])

  const visibleGroups = useMemo(() => grouped.slice(0, visibleCount), [grouped, visibleCount])
  const hasMore = visibleCount < grouped.length

  const groupFilterLabel =
    groupMode === 'agencia'
      ? 'Agência'
      : groupMode === 'supervisor'
        ? 'Supervisor'
        : 'Regional'

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <span className="pill">Relatório Gestão</span>
        <h1 className="h1" style={{ marginTop: '.75rem' }}>
          📊 Relatório Top por Agência / Supervisor / Regional
        </h1>
        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          Resumo agrupado com botão para detalhar os expressos do maior produtor para o menor.
        </p>
      </div>

      <div
        className="card"
        style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}
      >
        <Pill>Grupos: {grouped.length}</Pill>
        <Pill>Exibindo: {visibleGroups.length}</Pill>
        <Pill>Expressos na base: {rows.length}</Pill>

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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '.8rem',
          }}
        >
          <label>
            <div className="label">Agrupar por</div>
            <select
              className="input"
              value={groupMode}
              onChange={(e) => setGroupMode(e.target.value as GroupMode)}
            >
              <option value="agencia">Agência</option>
              <option value="supervisor">Supervisor</option>
              <option value="regional">Regional</option>
            </select>
          </label>

          <label>
            <div className="label">{groupFilterLabel}</div>
            <select
              className="input"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
            >
              {filterOptions.map((opt) => (
                <option key={`${groupMode}-${opt.value}`} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <div className="label">Buscar no relatório</div>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Agência, supervisor, gerente, regional..."
            />
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

      {visibleGroups.length > 0 ? (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {visibleGroups.map((g) => {
            const aberto = !!expanded[g.key]

            return (
              <div key={g.key} className="card" style={{ display: 'grid', gap: '.9rem' }}>
                <div
                  className="card-soft"
                  style={{
                    display: 'flex',
                    gap: '.75rem',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '.85rem .95rem',
                  }}
                >
                  <div style={{ display: 'grid', gap: '.2rem' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.05rem' }}>{g.titulo}</div>
                    <div className="p-muted" style={{ fontSize: 13 }}>
                      {g.subtitulo || '—'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                    <LightButton onClick={() => toggleExpanded(g.key)}>
                      {aberto ? '📉 Ocultar detalhamento' : '📋 Detalhar'}
                    </LightButton>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                    gap: '.7rem',
                  }}
                >
                  <InfoBox label="1 - Total de Expressos" value={formatNum(g.totalExpressos)} />
                  <InfoBox
                    label="2 - Transacionam e Produzem"
                    value={formatNum(g.totalTransacionamEProduzem)}
                  />
                  <InfoBox
                    label="3 - TRX Zerada + Produzem"
                    value={formatNum(g.totalTrxZeradaEProduzem)}
                  />
                  <InfoBox
                    label="4 - Somente Transacionando"
                    value={formatNum(g.totalSomenteTransacionando)}
                  />
                  <InfoBox
                    label="5 - Sem Movimento Total"
                    value={formatNum(g.totalSemMovimentoTotal)}
                  />
                  <InfoBox label="Total Contas (com + sem depósito)" value={formatNum(g.totalContas)} />
                  <InfoBox label="Total Lime" value={formatNum(g.totalLime)} />
                  <InfoBox label="Total Consignado" value={formatNum(g.totalConsignado)} />
                  <InfoBox
                    label="Total Viva Vida + Microsseguro"
                    value={formatNum(g.totalVivaVidaMicrosseguro)}
                  />
                  <InfoBox label="Total Dental" value={formatNum(g.totalDental)} />
                  <InfoBox label="Total Residencial" value={formatNum(g.totalResidencial)} />
                  <InfoBox
                    label="Total VLR Exp. Sorte (pontos a cada 50)"
                    value={formatNum(g.totalVlrExpSorte)}
                  />
                </div>

                {aberto && (
                  <div
                    className="card-soft"
                    style={{
                      display: 'grid',
                      gap: '.75rem',
                      padding: '.9rem .95rem',
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>Expressos detalhados (maior produtor → menor)</div>

                    <div
                      style={{
                        overflowX: 'auto',
                        borderRadius: 14,
                        border: '1px solid rgba(15,15,25,.08)',
                        background: 'rgba(255,255,255,.72)',
                      }}
                    >
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          minWidth: 1080,
                          fontSize: 12,
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              background: 'rgba(15,15,25,.04)',
                              textAlign: 'left',
                            }}
                          >
                            <th style={thStyle}>chave_loja</th>
                            <th style={thStyle}>nome_loja</th>
                            <th style={thStyle}>transacao</th>
                            <th style={thStyle}>qtd contas</th>
                            <th style={thStyle}>consignado</th>
                            <th style={thStyle}>viva vida + micro</th>
                            <th style={thStyle}>dental</th>
                            <th style={thStyle}>lime</th>
                            <th style={thStyle}>residencial</th>
                            <th style={thStyle}>valor sorte</th>
                            <th style={thStyle}>pontos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.expressos.map((r, idx) => (
                            <tr
                              key={`${g.key}-${r.chave}-${idx}`}
                              style={{
                                borderTop: '1px solid rgba(15,15,25,.06)',
                              }}
                            >
                              <td style={tdStyle}>
                                {r.chave ? (
                                  <Link
                                    href={`/dashboard/arvorecronologica/${encodeURIComponent(r.chave)}`}
                                    style={{
                                      color: 'rgba(214,31,44,.95)',
                                      fontWeight: 900,
                                      textDecoration: 'none',
                                    }}
                                    title="Abrir árvore cronológica"
                                  >
                                    {r.chave}
                                  </Link>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td style={tdStyle}>{r.nome || '—'}</td>
                              <td style={tdStyle}>{formatNum(r.trx || 0)}</td>
                              <td style={tdStyle}>
                                {formatNum((r.qtdContas || 0) + (r.qtdContasComDeposito || 0))}
                              </td>
                              <td style={tdStyle}>{formatNum(r.qtdConsignado || 0)}</td>
                              <td style={tdStyle}>
                                {formatNum((r.qtdVivaVida || 0) + (r.qtdMicrosseguro || 0))}
                              </td>
                              <td style={tdStyle}>{formatNum(r.qtdPlanoOdonto || 0)}</td>
                              <td style={tdStyle}>{formatNum(r.qtdLime || 0)}</td>
                              <td style={tdStyle}>{formatNum(r.qtdSegResidencial || 0)}</td>
                              <td style={tdStyle}>{formatNum(r.vlrExpSorte || 0)}</td>
                              <td style={tdStyle}>{formatPontos(r.pontos || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {hasMore && (
            <div className="card-soft" style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              >
                Carregar mais 20
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="card-soft">
          <p className="p-muted">
            {loading ? 'Carregando relatório...' : 'Nenhum agrupamento encontrado.'}
          </p>
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

const thStyle: CSSProperties = {
  padding: '10px 12px',
  fontWeight: 900,
  fontSize: 11,
  whiteSpace: 'nowrap',
}

const tdStyle: CSSProperties = {
  padding: '8px 12px',
  whiteSpace: 'nowrap',
  fontSize: 12,
}