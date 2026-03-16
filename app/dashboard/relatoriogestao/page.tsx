'use client'

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore'
import { getBytes, ref } from 'firebase/storage'

import { auth, db, storage } from '@/lib/firebase'

const CSV_PATH = 'base-lojas/banco.csv'

type AgruparPor = 'regional' | 'agencia' | 'supervisor'

type AgenciaRow = {
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
  createdAt?: any
  createdBy?: string
  updatedAt?: any
  updatedBy?: string
}

type ExpressoRow = {
  chave: string
  nome: string
  municipio: string
  agencia: string
  pacb: string
  agenciaLabel: string
  regional: string
  supervisor: string
  statusAnalise: string
  tipoAgencia: string

  qtdContas: number
  qtdContasComDeposito: number
  qtdLime: number
  qtdConsignado: number
  qtdMicrosseguro: number
  qtdVivaVida: number
  qtdPlanoOdonto: number
  qtdSegResidencial: number
  qtdCartaoEmitido: number
  qtdCreditoParcelado: number
  qtdCestaServ: number
  qtdSuperProtegido: number
  qtdMobilidade: number
  qtdSegCartaoDeb: number
  qtdExpSorte: number
  vlrExpSorte: number
  trx: number
}

type GrupoResumo = {
  nomeGrupo: string
  regional: string
  agencia: string
  supervisor: string

  totalExpressos: number
  transacionamEProduzem: number
  trxZeradaEProduzem: number
  somenteTransacionando: number
  semMovimentoTotal: number

  totalContas: number
  totalLime: number
  totalConsignado: number
  totalVivaVidaMicro: number
  totalPlanoOdonto: number
  totalResidencial: number
  totalPontosExpSorte: number

  rows: ExpressoRow[]
}

function toStr(v: any) {
  return v === null || v === undefined ? '' : String(v).trim()
}

function parseNumber(v: any) {
  const s = toStr(v).replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
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

function normalizeAgencyCode(v: any) {
  const raw = toStr(v)
  if (!raw) return ''

  const digits = raw.replace(/\D/g, '')
  if (!digits) return raw

  if (digits.length <= 4) return digits.padStart(4, '0')
  return digits
}

function splitAgPacb(v: any) {
  const raw = toStr(v)
  if (!raw) return { agencia: '', pacb: '' }

  const parts = raw.split('/')

  return {
    agencia: normalizeAgencyCode(parts[0]),
    pacb: toStr(parts[1]),
  }
}

function formatNum(n: number) {
  return new Intl.NumberFormat('pt-BR').format(Number(n || 0))
}

function formatPontos(n: number) {
  const rounded = Math.round((Number(n || 0) + Number.EPSILON) * 10) / 10
  const isInt = Math.abs(rounded - Math.round(rounded)) < 1e-9
  return isInt ? String(Math.round(rounded)) : rounded.toFixed(1).replace('.', ',')
}

function formatPhone(v: any) {
  const raw = toStr(v)
  if (!raw) return '—'

  const digits = raw.replace(/\D/g, '')

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)})${digits.slice(2, 7)}-${digits.slice(7)}`
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)})${digits.slice(2, 6)}-${digits.slice(6)}`
  }

  return raw
}

function getContaSemDeposito(qtdContas: number, qtdContasComDeposito: number) {
  return Math.max(0, Number(qtdContas || 0) - Number(qtdContasComDeposito || 0))
}

function getPontosExpSorte(vlrExpSorte: number, qtdExpSorte: number) {
  const valor = Number(vlrExpSorte || 0)
  const qtd = Number(qtdExpSorte || 0)
  return valor > 0 ? Math.floor(valor / 50) : qtd
}

function calcPontos(r: ExpressoRow) {
  const contaSemDeposito = getContaSemDeposito(r.qtdContas, r.qtdContasComDeposito)

  return (
    contaSemDeposito * 3 +
    (r.qtdContasComDeposito || 0) * 7 +
    (r.qtdLime || 0) * 6.5 +
    (r.qtdConsignado || 0) * 5.5 +
    (r.qtdCreditoParcelado || 0) * 6.5 +
    (r.qtdMicrosseguro || 0) * 1 +
    (r.qtdVivaVida || 0) * 1 +
    (r.qtdPlanoOdonto || 0) * 1 +
    (r.qtdSegResidencial || 0) * 1 +
    (r.qtdCartaoEmitido || 0) * 1 +
    (r.qtdCestaServ || 0) * 3 +
    (r.qtdSuperProtegido || 0) * 1 +
    (r.qtdMobilidade || 0) * 0.5 +
    (r.qtdSegCartaoDeb || 0) * 1 +
    getPontosExpSorte(r.vlrExpSorte, r.qtdExpSorte)
  )
}

function getTotalProduzido(r: ExpressoRow) {
  return (
    (r.qtdContas || 0) +
    (r.qtdLime || 0) +
    (r.qtdConsignado || 0) +
    (r.qtdMicrosseguro || 0) +
    (r.qtdVivaVida || 0) +
    (r.qtdPlanoOdonto || 0) +
    (r.qtdSegResidencial || 0) +
    (r.qtdCartaoEmitido || 0) +
    (r.qtdCreditoParcelado || 0) +
    (r.qtdCestaServ || 0) +
    (r.qtdSuperProtegido || 0) +
    (r.qtdMobilidade || 0) +
    (r.qtdSegCartaoDeb || 0) +
    getPontosExpSorte(r.vlrExpSorte, r.qtdExpSorte)
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
}: {
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 999,
        padding: '.42rem .72rem',
        fontWeight: 900,
        fontSize: '.8rem',
        border: '1px solid rgba(15,15,25,.15)',
        background: 'rgba(255,255,255,.92)',
        color: 'rgba(16,16,24,.92)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function SummaryCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="card-soft" style={{ padding: '.68rem .75rem', minHeight: 80 }}>
      <div className="p-muted" style={{ fontSize: 11, lineHeight: 1.15 }}>
        {label}
      </div>
      <div
        style={{
          marginTop: '.22rem',
          fontSize: '1.22rem',
          fontWeight: 900,
          lineHeight: 1.05,
        }}
      >
        {value}
      </div>
    </div>
  )
}

async function resolveIsAdmin(u: User) {
  try {
    const snap = await getDoc(doc(db, 'users', u.uid))
    if (!snap.exists()) return false

    const data = snap.data() as any
    return data?.ativo === true && data?.role === 'admin'
  } catch (e) {
    console.error('resolveIsAdmin error:', e)
    return false
  }
}

export default function RelatorioGestaoPage() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const [rows, setRows] = useState<ExpressoRow[]>([])
  const [agenciasBase, setAgenciasBase] = useState<AgenciaRow[]>([])

  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [agruparPor, setAgruparPor] = useState<AgruparPor>('supervisor')
  const [busca, setBusca] = useState('')
  const [fRegional, setFRegional] = useState('Todos')
  const [fAgencia, setFAgencia] = useState('Todos')
  const [fSupervisor, setFSupervisor] = useState('Todos')

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

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
        getDocs(query(collection(db, 'gestao_agencias'), orderBy('nomeAg'))),
      ])

      const agenciasList: AgenciaRow[] = gestaoSnap.docs.map((d) => {
        const data = d.data() as any
        return {
          codAg: normalizeAgencyCode(data.codAg || d.id),
          nomeAg: toStr(data.nomeAg),
          tipo: toStr(data.tipo),
          supervisor: toStr(data.supervisor),
          contatoSupervisor: toStr(data.contatoSupervisor),
          gerenteAg: toStr(data.gerenteAg),
          telGerente1: toStr(data.telGerente1),
          emailGerente: toStr(data.emailGerente),
          regional: toStr(data.regional),
          nomeDiretorRegional: toStr(data.nomeDiretorRegional),
          telefoneRegional: toStr(data.telefoneRegional),
          createdAt: data.createdAt,
          createdBy: data.createdBy,
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy,
        }
      })

      const agenciaMap = new Map<string, AgenciaRow>()
      agenciasList.forEach((ag) => {
        if (ag.codAg) agenciaMap.set(ag.codAg, ag)
      })

      const text = parseCSVText(toUint8(bytesAny))
      const raw = parseCsvRows(text)

      const normalized = raw.map((obj) => {
        const out: Record<string, any> = {}
        for (const [k, v] of Object.entries(obj)) out[normalizeKey(k)] = v
        return out
      })

      const mappedRows: ExpressoRow[] = normalized.map((r) => {
        const chave = toStr(r['chave_loja'] || r['chave loja'] || r['chave'])
        const nome = toStr(r['nome_loja'] || r['nome da loja'] || r['nome'])
        const municipio = toStr(r['municipio'] || r['município'])

        const agpacb = r['ag_pacb'] || r['agencia/pacb'] || r['agência/pacb']
        const { agencia, pacb } = splitAgPacb(agpacb)

        const agInfo = agenciaMap.get(agencia)

        const nomeAg = toStr(agInfo?.nomeAg)
        const regional = toStr(
          agInfo?.regional ||
            r['regional'] ||
            r['nome_regional'] ||
            r['regiao'] ||
            r['região']
        )
        const supervisor = toStr(
          agInfo?.supervisor ||
            r['supervisor'] ||
            r['nome_supervisor'] ||
            r['supervisao'] ||
            r['supervisão']
        )
        const tipoAgencia = toStr(agInfo?.tipo)

        return {
          chave,
          nome,
          municipio,
          agencia,
          pacb,
          agenciaLabel: agencia ? `${agencia}${nomeAg ? ' - ' + nomeAg : ''}` : '',
          regional,
          supervisor,
          statusAnalise: toStr(
            r['status_analise'] || r['status analise'] || r['status']
          ),
          tipoAgencia,

          qtdContas: parseNumber(r['qtd_contas'] || r['qtd contas']),
          qtdContasComDeposito: parseNumber(
            r['qtd_contas_com_deposito'] || r['qtd contas com deposito']
          ),
          qtdLime: parseNumber(r['qtd_lime'] || r['qtd lime']),
          qtdConsignado: parseNumber(r['qtd_consignado'] || r['qtd consignado']),
          qtdMicrosseguro: parseNumber(r['qtd_microsseguro'] || r['qtd microsseguro']),
          qtdVivaVida: parseNumber(
            r['qtd_micro_vivavida'] || r['qtd viva vida'] || r['qtd_viva_vida']
          ),
          qtdPlanoOdonto: parseNumber(
            r['qtd_plano_odonto'] || r['qtd plano odonto'] || r['odonto']
          ),
          qtdSegResidencial: parseNumber(
            r['qtd_seg_residencial'] || r['qtd seg residencial']
          ),
          qtdCartaoEmitido: parseNumber(
            r['qtd_cartao_emitido'] || r['qtd cartao emitido'] || r['cartao']
          ),
          qtdCreditoParcelado: parseNumber(
            r['qtd_credito_parcel_dtlhes'] ||
              r['qtd_credito_parcelado_dtlhes'] ||
              r['qtd_credito_parcel'] ||
              r['credito parcelado']
          ),
          qtdCestaServ: parseNumber(r['qtd_cesta_serv'] || r['qtd cesta serv']),
          qtdSuperProtegido: parseNumber(
            r['qtd_super_protegido'] ||
              r['qtd super protegido'] ||
              r['qtd_superprotegido']
          ),
          qtdMobilidade: parseNumber(r['qtd_mobilidade'] || r['qtd mobilidade']),
          qtdSegCartaoDeb: parseNumber(
            r['qtd_seg_cartao_deb'] ||
              r['qtd seg cartao deb'] ||
              r['qtd_seg_cartao_debito']
          ),
          qtdExpSorte: parseNumber(r['qtd_exp_sorte'] || r['qtd exp sorte']),
          vlrExpSorte: parseNumber(
            r['vlr_exp_sorte'] || r['vlr exp sorte'] || r['valor exp sorte']
          ),
          trx: parseNumber(
            r['qtd_trxcontabil'] ||
              r['qtd_trx_contabil'] ||
              r['qtd trxcontabil'] ||
              r['qtd_trx']
          ),
        }
      })

      setAgenciasBase(agenciasList)
      setRows(mappedRows)
      setInfo('Relatório carregado ✅')
    } catch (e: any) {
      console.error('loadAll error:', e)
      setError(`Não foi possível carregar o relatório. (${e?.code || 'sem-code'})`)
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

      const admin = await resolveIsAdmin(u)
      setIsAdmin(admin)

      await loadAll()
    })

    return () => unsub()
  }, [router])

  const regionais = useMemo(() => {
    const set = new Set<string>()

    agenciasBase.forEach((r) => {
      if (r.regional) set.add(r.regional)
    })

    rows.forEach((r) => {
      if (r.regional) set.add(r.regional)
    })

    return ['Todos', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [agenciasBase, rows])

  const agencias = useMemo(() => {
    const map = new Map<string, string>()

    agenciasBase
      .filter((a) => toStr(a.tipo).toUpperCase() === 'AG')
      .forEach((a) => {
        const label = a.codAg ? `${a.codAg}${a.nomeAg ? ' - ' + a.nomeAg : ''}` : ''
        if (label) map.set(label, label)
      })

    return ['Todos', ...Array.from(map.values()).sort((a, b) => a.localeCompare(b))]
  }, [agenciasBase])

  const supervisores = useMemo(() => {
    const set = new Set<string>()

    agenciasBase.forEach((a) => {
      if (a.supervisor) set.add(a.supervisor)
    })

    rows.forEach((r) => {
      if (r.supervisor) set.add(r.supervisor)
    })

    return ['Todos', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [agenciasBase, rows])

  const agenciaSelecionadaInfo = useMemo(() => {
    if (fAgencia === 'Todos') return null

    return (
      agenciasBase.find((a) => {
        if (toStr(a.tipo).toUpperCase() !== 'AG') return false
        const label = a.codAg ? `${a.codAg}${a.nomeAg ? ' - ' + a.nomeAg : ''}` : ''
        return label === fAgencia
      }) || null
    )
  }, [agenciasBase, fAgencia])

  const filteredRows = useMemo(() => {
    const term = busca.trim().toLowerCase()

    return rows.filter((r) => {
      if (fRegional !== 'Todos' && r.regional !== fRegional) return false

      if (fAgencia !== 'Todos') {
        if (toStr(r.tipoAgencia).toUpperCase() !== 'AG') return false
        if (r.agenciaLabel !== fAgencia) return false
      }

      if (fSupervisor !== 'Todos' && r.supervisor !== fSupervisor) return false

      if (!term) return true

      const texto = [
        r.chave,
        r.nome,
        r.municipio,
        r.agencia,
        r.pacb,
        r.agenciaLabel,
        r.regional,
        r.supervisor,
        r.statusAnalise,
      ]
        .join(' ')
        .toLowerCase()

      return texto.includes(term)
    })
  }, [rows, busca, fRegional, fAgencia, fSupervisor])

  const grupos = useMemo(() => {
    const map = new Map<string, ExpressoRow[]>()

    for (const row of filteredRows) {
      const key =
        agruparPor === 'regional'
          ? row.regional || 'SEM REGIONAL'
          : agruparPor === 'agencia'
            ? row.agenciaLabel || 'SEM AGÊNCIA'
            : row.supervisor || 'SEM SUPERVISOR'

      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(row)
    }

    const result: GrupoResumo[] = Array.from(map.entries()).map(([nomeGrupo, list]) => {
      const ordered = [...list].sort((a, b) => {
        const pontosB = calcPontos(b)
        const pontosA = calcPontos(a)

        if (pontosB !== pontosA) return pontosB - pontosA
        if ((b.trx || 0) !== (a.trx || 0)) return (b.trx || 0) - (a.trx || 0)

        return a.nome.localeCompare(b.nome)
      })

      return {
        nomeGrupo,
        regional: ordered[0]?.regional || '',
        agencia: ordered[0]?.agenciaLabel || '',
        supervisor: ordered[0]?.supervisor || '',

        totalExpressos: ordered.length,
        transacionamEProduzem: ordered.filter(
          (r) => (r.trx || 0) > 0 && getTotalProduzido(r) > 0
        ).length,
        trxZeradaEProduzem: ordered.filter(
          (r) => (r.trx || 0) <= 0 && getTotalProduzido(r) > 0
        ).length,
        somenteTransacionando: ordered.filter(
          (r) => (r.trx || 0) > 0 && getTotalProduzido(r) <= 0
        ).length,
        semMovimentoTotal: ordered.filter(
          (r) => (r.trx || 0) <= 0 && getTotalProduzido(r) <= 0
        ).length,

        totalContas: ordered.reduce((acc, r) => acc + (r.qtdContas || 0), 0),
        totalLime: ordered.reduce((acc, r) => acc + (r.qtdLime || 0), 0),
        totalConsignado: ordered.reduce((acc, r) => acc + (r.qtdConsignado || 0), 0),
        totalVivaVidaMicro: ordered.reduce(
          (acc, r) => acc + (r.qtdVivaVida || 0) + (r.qtdMicrosseguro || 0),
          0
        ),
        totalPlanoOdonto: ordered.reduce(
          (acc, r) => acc + (r.qtdPlanoOdonto || 0),
          0
        ),
        totalResidencial: ordered.reduce(
          (acc, r) => acc + (r.qtdSegResidencial || 0),
          0
        ),
        totalPontosExpSorte: ordered.reduce(
          (acc, r) => acc + getPontosExpSorte(r.vlrExpSorte, r.qtdExpSorte),
          0
        ),

        rows: ordered,
      }
    })

    return result.sort((a, b) => a.nomeGrupo.localeCompare(b.nomeGrupo))
  }, [filteredRows, agruparPor])

  const grupoAgenciaInfoMap = useMemo(() => {
    const map = new Map<string, AgenciaRow>()

    agenciasBase.forEach((ag) => {
      if (toStr(ag.tipo).toUpperCase() !== 'AG') return
      const label = ag.codAg ? `${ag.codAg}${ag.nomeAg ? ' - ' + ag.nomeAg : ''}` : ''
      if (label) map.set(label, ag)
    })

    return map
  }, [agenciasBase])

  function toggleGroup(nomeGrupo: string) {
    setExpandedGroups((prev) => ({
      ...prev,
      [nomeGrupo]: !prev[nomeGrupo],
    }))
  }

  return (
    <section
      style={{
        display: 'grid',
        gap: '.9rem',
        width: '100%',
        maxWidth: '100%',
        fontSize: '0.88rem',
      }}
    >
      <div>
        <span className="pill">Gestão</span>
        <h1 className="h1">Agência, Supervisor ou Regional</h1>
      </div>

      <div className="card" style={{ display: 'grid', gap: '.75rem', padding: '.9rem' }}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label>
            <div className="label">Agrupar por</div>
            <select
              className="input"
              value={agruparPor}
              onChange={(e) => setAgruparPor(e.target.value as AgruparPor)}
            >
              <option value="regional">Regional</option>
              <option value="agencia">Agência</option>
              <option value="supervisor">Supervisor</option>
            </select>
          </label>

          <label>
            <div className="label">Regional</div>
            <select
              className="input"
              value={fRegional}
              onChange={(e) => setFRegional(e.target.value)}
            >
              {regionais.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <div className="label">Agência</div>
            <select
              className="input"
              value={fAgencia}
              onChange={(e) => setFAgencia(e.target.value)}
            >
              {agencias.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <div className="label">Supervisor</div>
            <select
              className="input"
              value={fSupervisor}
              onChange={(e) => setFSupervisor(e.target.value)}
            >
              {supervisores.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          style={{
            display: 'grid',
            gap: '.65rem',
            gridTemplateColumns: 'minmax(220px, 1fr) auto',
            alignItems: 'end',
          }}
        >
          <label>
            <div className="label">Buscar no relatório</div>
            <input
              className="input"
              placeholder="Buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </label>

          <div style={{ display: 'flex', gap: '.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {info && <Pill>{info}</Pill>}

            <button
              className="btn-primary"
              onClick={loadAll}
              disabled={loading || checkingAuth}
            >
              {checkingAuth ? 'Verificando login...' : loading ? 'Carregando...' : 'Atualizar relatório'}
            </button>
          </div>
        </div>

        {agenciaSelecionadaInfo && (
          <div
            className="card-soft"
            style={{
              display: 'grid',
              gap: '.55rem',
              padding: '.85rem',
              border: '1px solid rgba(214,31,44,.14)',
            }}
          >
            <div style={{ fontWeight: 900, fontSize: '.96rem' }}>
              Dados da agência selecionada
            </div>

            <div
              style={{
                display: 'grid',
                gap: '.55rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              }}
            >
              <div>
                <div className="p-muted" style={{ fontSize: 11 }}>
                  Agência
                </div>
                <div style={{ fontWeight: 800 }}>
                  {agenciaSelecionadaInfo.codAg}
                  {agenciaSelecionadaInfo.nomeAg
                    ? ` - ${agenciaSelecionadaInfo.nomeAg}`
                    : ''}
                </div>
              </div>

              <div>
                <div className="p-muted" style={{ fontSize: 11 }}>
                  Gerente
                </div>
                <div style={{ fontWeight: 800 }}>
                  {agenciaSelecionadaInfo.gerenteAg || '—'}
                </div>
              </div>

              <div>
                <div className="p-muted" style={{ fontSize: 11 }}>
                  Telefone Gerente
                </div>
                <div style={{ fontWeight: 800 }}>
                  {formatPhone(agenciaSelecionadaInfo.telGerente1)}
                </div>
              </div>

              <div>
                <div className="p-muted" style={{ fontSize: 11 }}>
                  Supervisor
                </div>
                <div style={{ fontWeight: 800 }}>
                  {agenciaSelecionadaInfo.supervisor || '—'}
                </div>
              </div>

              <div>
                <div className="p-muted" style={{ fontSize: 11 }}>
                  Telefone Supervisor
                </div>
                <div style={{ fontWeight: 800 }}>
                  {formatPhone(agenciaSelecionadaInfo.contatoSupervisor)}
                </div>
              </div>
            </div>
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

      {grupos.length > 0 ? (
        <div style={{ display: 'grid', gap: '.75rem' }}>
          {grupos.map((grupo) => {
            const expanded = !!expandedGroups[grupo.nomeGrupo]
            const grupoAgenciaInfo =
              agruparPor === 'agencia'
                ? grupoAgenciaInfoMap.get(grupo.nomeGrupo) || null
                : null

            return (
              <div
                key={grupo.nomeGrupo}
                className="card"
                style={{ display: 'grid', gap: '.65rem', padding: '.8rem' }}
              >
                <div
                  className="card-soft"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '.7rem',
                    flexWrap: 'wrap',
                    padding: '.72rem .82rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '1.18rem', fontWeight: 900, lineHeight: 1.05 }}>
                      {grupo.nomeGrupo}
                    </div>

                    <div className="p-muted" style={{ marginTop: '.15rem', fontSize: '.78rem' }}>
                      {agruparPor === 'regional'
                        ? 'Regional'
                        : agruparPor === 'agencia'
                          ? 'Agência'
                          : 'Supervisor'}
                      : —
                    </div>
                  </div>

                  <LightButton onClick={() => toggleGroup(grupo.nomeGrupo)}>
                    {expanded ? '▢ Ocultar' : '▣ Detalhar'}
                  </LightButton>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
                    gap: '.45rem',
                  }}
                >
                  <SummaryCard label="1 - Total de Expressos" value={formatNum(grupo.totalExpressos)} />
                  <SummaryCard label="2 - Transacionam e Produzem" value={formatNum(grupo.transacionamEProduzem)} />
                  <SummaryCard label="3 - TRX Zerada + Produzem" value={formatNum(grupo.trxZeradaEProduzem)} />
                  <SummaryCard label="4 - Somente Transacionando" value={formatNum(grupo.somenteTransacionando)} />
                  <SummaryCard label="5 - Sem Movimento Total" value={formatNum(grupo.semMovimentoTotal)} />
                  <SummaryCard label="Total Contas (com + sem depósito)" value={formatNum(grupo.totalContas)} />
                  <SummaryCard label="Total Lime" value={formatNum(grupo.totalLime)} />
                  <SummaryCard label="Total Consignado" value={formatNum(grupo.totalConsignado)} />
                  <SummaryCard label="Total Viva Vida + Microsseguro" value={formatNum(grupo.totalVivaVidaMicro)} />
                  <SummaryCard label="Total Plano Odontológico" value={formatNum(grupo.totalPlanoOdonto)} />
                  <SummaryCard label="Total Residencial" value={formatNum(grupo.totalResidencial)} />
                  <SummaryCard label="Total VLR Exp. Sorte (pontos a cada 50)" value={formatNum(grupo.totalPontosExpSorte)} />
                </div>

                {expanded && (
                  <div className="card-soft" style={{ padding: '.7rem .75rem' }}>
                    {agruparPor === 'agencia' && grupoAgenciaInfo && (
                      <div
                        style={{
                          display: 'grid',
                          gap: '.55rem',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                          marginBottom: '.7rem',
                          paddingBottom: '.65rem',
                          borderBottom: '1px solid rgba(15,15,25,.08)',
                        }}
                      >
                        <div>
                          <div className="p-muted" style={{ fontSize: 11 }}>
                            Gerente
                          </div>
                          <div style={{ fontWeight: 800 }}>
                            {grupoAgenciaInfo.gerenteAg || '—'}
                          </div>
                        </div>

                        <div>
                          <div className="p-muted" style={{ fontSize: 11 }}>
                            Telefone Gerente
                          </div>
                          <div style={{ fontWeight: 800 }}>
                            {formatPhone(grupoAgenciaInfo.telGerente1)}
                          </div>
                        </div>

                        <div>
                          <div className="p-muted" style={{ fontSize: 11 }}>
                            Supervisor
                          </div>
                          <div style={{ fontWeight: 800 }}>
                            {grupoAgenciaInfo.supervisor || '—'}
                          </div>
                        </div>

                        <div>
                          <div className="p-muted" style={{ fontSize: 11 }}>
                            Telefone Supervisor
                          </div>
                          <div style={{ fontWeight: 800 }}>
                            {formatPhone(grupoAgenciaInfo.contatoSupervisor)}
                          </div>
                        </div>
                      </div>
                    )}

                    <div style={{ fontWeight: 900, fontSize: '.98rem', marginBottom: '.65rem' }}>
                      Expressos detalhados (maior produtor → menor)
                    </div>

                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        tableLayout: 'fixed',
                      }}
                    >
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(15,15,25,.08)' }}>
                          <th style={{ ...thStyle, width: '7%' }}>chave_loja</th>
                          <th style={{ ...thStyle, width: '29%' }}>nome_loja</th>
                          <th style={{ ...thStyle, width: '8%' }}>transacao</th>
                          <th style={{ ...thStyle, width: '8%' }}>qtd contas</th>
                          <th style={{ ...thStyle, width: '8%' }}>consignado</th>
                          <th style={{ ...thStyle, width: '12%' }}>viva vida + micro</th>
                          <th style={{ ...thStyle, width: '6%' }}>dental</th>
                          <th style={{ ...thStyle, width: '6%' }}>lime</th>
                          <th style={{ ...thStyle, width: '7%' }}>residencial</th>
                          <th style={{ ...thStyle, width: '5%' }}>valor sorte</th>
                          <th style={{ ...thStyle, width: '4%' }}>pontos</th>
                        </tr>
                      </thead>

                      <tbody>
                        {grupo.rows.map((r) => (
                          <tr
                            key={`${grupo.nomeGrupo}-${r.chave}`}
                            style={{ borderBottom: '1px solid rgba(15,15,25,.06)' }}
                          >
                            <td style={tdKeyStyle}>
                              <Link
                                href={`/dashboard/arvorecronologica/${encodeURIComponent(r.chave)}`}
                                style={{
                                  color: '#a30f1b',
                                  textDecoration: 'none',
                                  fontWeight: 900,
                                }}
                              >
                                {r.chave || '—'}
                              </Link>
                            </td>
                            <td style={tdNomeStyle}>{r.nome || '—'}</td>
                            <td style={tdStyle}>{formatNum(r.trx || 0)}</td>
                            <td style={tdStyle}>{formatNum(r.qtdContas || 0)}</td>
                            <td style={tdStyle}>{formatNum(r.qtdConsignado || 0)}</td>
                            <td style={tdStyle}>
                              {formatNum((r.qtdVivaVida || 0) + (r.qtdMicrosseguro || 0))}
                            </td>
                            <td style={tdStyle}>{formatNum(r.qtdPlanoOdonto || 0)}</td>
                            <td style={tdStyle}>{formatNum(r.qtdLime || 0)}</td>
                            <td style={tdStyle}>{formatNum(r.qtdSegResidencial || 0)}</td>
                            <td style={tdStyle}>{formatNum(r.vlrExpSorte || 0)}</td>
                            <td style={tdStyle}>{formatPontos(calcPontos(r))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card-soft">
          <p className="p-muted">Nenhum grupo encontrado com os filtros atuais.</p>
        </div>
      )}

      {!checkingAuth && user && (
        <p className="p-muted" style={{ marginTop: '.2rem', fontSize: '.82rem' }}>
          Logado como: <b>{user.email}</b>
          {isAdmin ? ' (Admin)' : ''}
        </p>
      )}
    </section>
  )
}

const thStyle: CSSProperties = {
  padding: '.5rem .35rem',
  fontSize: 11,
  fontWeight: 900,
  lineHeight: 1.1,
  whiteSpace: 'normal',
  wordBreak: 'break-word',
}

const tdStyle: CSSProperties = {
  padding: '.46rem .35rem',
  fontSize: 11,
  lineHeight: 1.15,
  textAlign: 'center',
  whiteSpace: 'normal',
  wordBreak: 'break-word',
}

const tdNomeStyle: CSSProperties = {
  ...tdStyle,
  textAlign: 'left',
}

const tdKeyStyle: CSSProperties = {
  ...tdStyle,
  fontWeight: 900,
  color: '#a30f1b',
}