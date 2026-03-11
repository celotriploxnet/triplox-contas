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
import { getBytes, ref } from 'firebase/storage'
import * as XLSX from 'xlsx'

import { auth, storage } from '@/lib/firebase'

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

type StatusExpressoFilter = 'Todos' | 'Treinado' | 'Transacional'
type CertViewFilter = 'Todas' | 'Vencidas' | 'Proximas'
type CertGroup = 'vencida' | 'proxima' | 'ok' | 'nao_certificado'

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

function formatCertificacaoValue(v: any) {
  if (v === null || v === undefined || v === '') return ''

  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const dd = String(v.getDate()).padStart(2, '0')
    const mm = String(v.getMonth() + 1).padStart(2, '0')
    const yyyy = String(v.getFullYear())
    return `${dd}/${mm}/${yyyy}`
  }

  if (typeof v === 'number' && Number.isFinite(v) && v > 20000 && v < 90000) {
    const d = XLSX.SSF.parse_date_code(v)
    if (d?.y && d?.m && d?.d) {
      const dd = String(d.d).padStart(2, '0')
      const mm = String(d.m).padStart(2, '0')
      const yyyy = String(d.y)
      return `${dd}/${mm}/${yyyy}`
    }
  }

  const raw = toStr(v)
  if (!raw) return ''

  const onlyDate = raw.split(' ')[0]

  const slash = onlyDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slash) {
    const dd = String(Number(slash[1])).padStart(2, '0')
    const mm = String(Number(slash[2])).padStart(2, '0')
    const yyyy = slash[3]
    return `${dd}/${mm}/${yyyy}`
  }

  const iso = onlyDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) {
    return `${iso[3]}/${iso[2]}/${iso[1]}`
  }

  return raw
}

function parseDateFlexible(v: any): Date | null {
  if (v === null || v === undefined || v === '') return null

  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return new Date(v.getFullYear(), v.getMonth(), v.getDate())
  }

  if (typeof v === 'number' && Number.isFinite(v) && v > 20000 && v < 90000) {
    const d = XLSX.SSF.parse_date_code(v)
    if (d?.y && d?.m && d?.d) {
      const dt = new Date(d.y, d.m - 1, d.d)
      return Number.isNaN(dt.getTime()) ? null : dt
    }
  }

  const raw = toStr(v)
  if (!raw) return null

  const onlyDate = raw.split(' ')[0]

  const mBR = onlyDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mBR) {
    const dd = Number(mBR[1])
    const mm = Number(mBR[2])
    const yy = Number(mBR[3])

    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null

    const dt = new Date(yy, mm - 1, dd)
    return Number.isNaN(dt.getTime()) ? null : dt
  }

  const mISO = onlyDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (mISO) {
    const yy = Number(mISO[1])
    const mm = Number(mISO[2])
    const dd = Number(mISO[3])

    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null

    const dt = new Date(yy, mm - 1, dd)
    return Number.isNaN(dt.getTime()) ? null : dt
  }

  return null
}

function startOfDay(dt: Date) {
  const d = new Date(dt)
  d.setHours(0, 0, 0, 0)
  return d
}

function addYearsSafe(date: Date, years: number) {
  const base = new Date(date)
  const month = base.getMonth()
  const day = base.getDate()

  base.setFullYear(base.getFullYear() + years)

  if (base.getMonth() !== month) {
    base.setDate(0)
  } else {
    base.setDate(day)
  }

  return base
}

function addMonthsSafe(date: Date, months: number) {
  const base = new Date(date)
  const day = base.getDate()

  base.setMonth(base.getMonth() + months)

  if (base.getDate() !== day) {
    base.setDate(0)
  }

  return base
}

function diffDays(a: Date, b: Date) {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime()
  return Math.floor(ms / 86400000)
}

function formatPtBRDate(dt: Date | null) {
  if (!dt) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dt)
}

function classifyCert(dt: Date | null): { group: CertGroup; expiry: Date | null } {
  if (!dt) return { group: 'nao_certificado', expiry: null }

  const cert = startOfDay(dt)
  const hoje = startOfDay(new Date())
  const expiry = startOfDay(addYearsSafe(cert, 5))

  if (hoje.getTime() >= expiry.getTime()) return { group: 'vencida', expiry }

  const threeMonthsFromNow = startOfDay(addMonthsSafe(hoje, 3))
  if (expiry.getTime() <= threeMonthsFromNow.getTime()) return { group: 'proxima', expiry }

  return { group: 'ok', expiry }
}

function formatNum(n: number) {
  if (!Number.isFinite(n)) return '0'
  return String(n)
}

function formatPontos(n: number) {
  if (!Number.isFinite(n)) return '0'
  const rounded = Math.round(n * 10) / 10
  const isInt = Math.abs(rounded - Math.round(rounded)) < 1e-9
  return isInt ? String(Math.round(rounded)) : rounded.toFixed(1).replace('.', ',')
}

/* =========================
   PONTUAÇÃO
   ========================= */
function calcPontos(r: {
  qtdContasComDeposito: number
  qtdContas: number
  qtdCestaServ: number
  qtdSuperProtegido: number
  qtdMobilidade: number
  qtdLime: number
  qtdConsignado: number
  qtdCreditoParcelado: number
  qtdMicrosseguro: number
  qtdVivaVida: number
  qtdPlanoOdonto: number
  qtdSegCartaoDeb: number
  vlrExpSorte: number
}) {
  const expSortePts = Math.floor((r.vlrExpSorte || 0) / 50)

  return (
    (r.qtdContasComDeposito || 0) * 7 +
    (r.qtdContas || 0) * 3 +
    (r.qtdCestaServ || 0) * 3 +
    (r.qtdSuperProtegido || 0) * 1 +
    (r.qtdMobilidade || 0) * 0.5 +
    (r.qtdLime || 0) * 6.5 +
    (r.qtdConsignado || 0) * 5.5 +
    (r.qtdCreditoParcelado || 0) * 6.5 +
    (r.qtdMicrosseguro || 0) * 1 +
    (r.qtdVivaVida || 0) * 1 +
    (r.qtdPlanoOdonto || 0) * 1 +
    (r.qtdSegCartaoDeb || 0) * 1 +
    expSortePts
  )
}

function calcAtividade(r: RowBase) {
  return (r.trx || 0) + (r.pontos || 0)
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
  certDatePt: string
  expiryPt: string
  certGroup: CertGroup
  pontos: number
}) {
  const label =
    args.certGroup === 'vencida'
      ? 'Certificação vencida'
      : args.certGroup === 'proxima'
        ? 'Próxima do vencimento'
        : args.certGroup === 'ok'
          ? 'Certificação ok'
          : 'Sem certificação'

  return [
    '📌 *Expresso — Certificação*',
    '',
    `🏪 *Nome:* ${args.nome || '—'}`,
    `🔑 *Chave:* ${args.chave || '—'}`,
    `📍 *Município:* ${args.municipio || '—'}`,
    `🏦 *Agência/PACB:* ${args.agencia || '—'} / ${args.pacb || '—'}`,
    '',
    `✅ *Status:* ${args.status || '—'}`,
    `🪪 *Situação:* ${label}`,
    `📅 *Certificação:* ${args.certDatePt || '—'}`,
    `⏳ *Vencimento:* ${args.expiryPt || '—'}`,
    `💳 *TRX:* ${String(args.trx || 0)}`,
    `⭐ *Pontos:* ${formatPontos(args.pontos || 0)}`,
  ].join('\n')
}

export default function CertificacaoVencidaPage() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState('')

  const [rows, setRows] = useState<RowBase[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const [q, setQ] = useState('')
  const [fAgencia, setFAgencia] = useState('Todos')
  const [fStatusExpresso, setFStatusExpresso] = useState<StatusExpressoFilter>('Todos')
  const [fCertView, setFCertView] = useState<CertViewFilter>('Todas')

  function toggleExpand(key: string) {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

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
      const raw = parseCsvRows(text)

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

        const rawCertificacao =
          r['dt_certificacao'] ??
          r['dt certificacao'] ??
          r['certificacao'] ??
          r['certificação'] ??
          ''

        const dtCertificacao = formatCertificacaoValue(rawCertificacao)

        const trx = parseNumber(
          r['qtd_trxcontabil'] || r['qtd_trx_contabil'] || r['qtd trxcontabil'] || r['qtd_trx']
        )

        const qtdContas = parseNumber(r['qtd_contas'] || r['qtd contas'])
        const qtdContasComDeposito = parseNumber(
          r['qtd_contas_com_deposito'] || r['qtd contas com deposito']
        )
        const qtdCestaServ = parseNumber(r['qtd_cesta_serv'] || r['qtd cesta serv'])

        const qtdSuperProtegido = parseNumber(
          r['qtd_super_protegido'] ||
            r['qtd super protegido'] ||
            r['qtd_superprotegido'] ||
            r['super protegido'] ||
            r['qtdsuperprotegido']
        )

        const qtdMobilidade = parseNumber(r['qtd_mobilidade'] || r['qtd mobilidade'])
        const qtdCartaoEmitido = parseNumber(r['qtd_cartao_emitido'] || r['qtd cartao emitido'])
        const qtdChesContratado = parseNumber(
          r['qtd_chesp_contratado'] || r['qtd chesp contratado']
        )
        const qtdLimeAbConta = parseNumber(r['qtd_lime_ab_conta'] || r['qtd lime ab conta'])
        const qtdLime = parseNumber(r['qtd_lime'] || r['qtd lime'])
        const qtdConsignado = parseNumber(r['qtd_consignado'] || r['qtd consignado'])

        const qtdCreditoParcelado = parseNumber(
          r['qtd_credito_parcel_dtlhes'] ||
            r['qtd_credito_parcelado_dtlhes'] ||
            r['qtd_credito_parcel'] ||
            r['credito parcelado'] ||
            r['qtd_credito_parcel_dtlh'] ||
            r['qtd_credito_parcel_detalhes']
        )

        const qtdMicrosseguro = parseNumber(r['qtd_microsseguro'] || r['qtd microsseguro'])
        const qtdVivaVida = parseNumber(
          r['qtd_micro_vivavida'] || r['qtd micro vivavida'] || r['viva vida']
        )
        const qtdPlanoOdonto = parseNumber(
          r['qtd_plano_odonto'] || r['qtd plano odonto'] || r['odonto']
        )
        const qtdSegResidencial = parseNumber(
          r['qtd_seg_residencial'] || r['qtd seg residencial']
        )

        const qtdSegCartaoDeb = parseNumber(
          r['qtd_seg_cartao_deb'] ||
            r['qtd seg cartao deb'] ||
            r['qtd_seg_cartao'] ||
            r['seg cartao deb'] ||
            r['qtd_seg_cartao_debito']
        )

        const vlrExpSorte = parseNumber(
          r['vlr_exp_sorte'] ||
            r['vlr exp sorte'] ||
            r['valor exp sorte'] ||
            r['vlr_expsorte'] ||
            0
        )

        const qtdExpSorte = parseNumber(r['qtd_exp_sorte'] || r['qtd exp sorte'])

        const referencia = toStr(
          r['referencia'] ||
            r['referência'] ||
            r['expresso referência?'] ||
            r['expresso referencia?']
        )

        const pontos = calcPontos({
          qtdContasComDeposito,
          qtdContas,
          qtdCestaServ,
          qtdSuperProtegido,
          qtdMobilidade,
          qtdLime,
          qtdConsignado,
          qtdCreditoParcelado,
          qtdMicrosseguro,
          qtdVivaVida,
          qtdPlanoOdonto,
          qtdSegCartaoDeb,
          vlrExpSorte,
        })

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
          qtdSuperProtegido,
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
          vlrExpSorte,
          qtdExpSorte,
          referencia,
          pontos,
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
  }, [router])

  const computed = useMemo(() => {
    const hoje = startOfDay(new Date())

    const list = rows.map((r) => {
      const certDate = parseDateFlexible(r.dtCertificacao)
      const cert = classifyCert(certDate)
      const atividade = calcAtividade(r)
      const hasMovimento = atividade > 0

      const diasPassados =
        cert.expiry && cert.group === 'vencida'
          ? diffDays(hoje, cert.expiry)
          : -1

      const diasParaVencer =
        cert.expiry && cert.group === 'proxima'
          ? diffDays(cert.expiry, hoje)
          : Number.MAX_SAFE_INTEGER

      return {
        r,
        certDate,
        certGroup: cert.group,
        expiry: cert.expiry,
        atividade,
        hasMovimento,
        diasPassados,
        diasParaVencer,
      }
    })

    const alvo = list.filter(
      (x) => x.certGroup === 'vencida' || x.certGroup === 'proxima'
    )

    return {
      list,
      alvo,
      vencidas: alvo.filter((x) => x.certGroup === 'vencida').length,
      proximas: alvo.filter((x) => x.certGroup === 'proxima').length,
    }
  }, [rows])

  const agencias = useMemo(() => {
    const set = new Set<string>()
    computed.alvo.forEach(({ r }) => r.agencia && set.add(r.agencia))
    return ['Todos', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [computed.alvo])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()

    let list = computed.alvo.filter((x) => {
      const { r, certGroup } = x

      if (fAgencia !== 'Todos' && r.agencia !== fAgencia) return false

      if (fStatusExpresso === 'Treinado' && !isTreinado(r.statusAnalise)) return false
      if (fStatusExpresso === 'Transacional' && !isTransacional(r.statusAnalise)) return false

      if (fCertView === 'Vencidas' && certGroup !== 'vencida') return false
      if (fCertView === 'Proximas' && certGroup !== 'proxima') return false

      return true
    })

    if (term) {
      list = list.filter(({ r }) => {
        const hay = [r.nome, r.chave, r.municipio, r.agencia, r.pacb, r.statusAnalise]
          .join(' ')
          .toLowerCase()
        return hay.includes(term)
      })
    }

    list.sort((a, b) => {
      if (a.certGroup !== b.certGroup) {
        if (a.certGroup === 'vencida') return -1
        if (b.certGroup === 'vencida') return 1
      }

      if (
        a.certGroup === 'vencida' &&
        b.certGroup === 'vencida' &&
        a.diasPassados !== b.diasPassados
      ) {
        return b.diasPassados - a.diasPassados
      }

      if (
        a.certGroup === 'proxima' &&
        b.certGroup === 'proxima' &&
        a.diasParaVencer !== b.diasParaVencer
      ) {
        return a.diasParaVencer - b.diasParaVencer
      }

      if (a.hasMovimento !== b.hasMovimento) {
        return a.hasMovimento ? -1 : 1
      }

      if ((b.r.trx || 0) !== (a.r.trx || 0)) {
        return (b.r.trx || 0) - (a.r.trx || 0)
      }

      if ((b.r.pontos || 0) !== (a.r.pontos || 0)) {
        return (b.r.pontos || 0) - (a.r.pontos || 0)
      }

      return a.r.nome.localeCompare(b.r.nome)
    })

    if (!term) {
      list = list.slice(0, LIMIT_NO_SEARCH)
    }

    return list
  }, [computed.alvo, q, fAgencia, fStatusExpresso, fCertView])

  async function copyWhatsApp(item: (typeof filtered)[number]) {
    try {
      const msg = buildWhatsAppMessage({
        nome: item.r.nome,
        chave: item.r.chave,
        municipio: item.r.municipio,
        agencia: item.r.agencia,
        pacb: item.r.pacb,
        status: item.r.statusAnalise,
        trx: item.r.trx || 0,
        certDatePt: item.r.dtCertificacao || '—',
        expiryPt: formatPtBRDate(item.expiry),
        certGroup: item.certGroup,
        pontos: item.r.pontos || 0,
      })

      await navigator.clipboard.writeText(msg)
      setInfo('Mensagem copiada ✅ (cole no WhatsApp)')
      setError(null)
    } catch (e) {
      console.error(e)
      setError('Não consegui copiar a mensagem.')
    }
  }

  function irParaArvoreCronologica(r: RowBase) {
    router.push(`/dashboard/arvorecronologica/${encodeURIComponent(r.chave)}`)
  }

  function irParaReportar(r: RowBase) {
    const params = new URLSearchParams({
      chaveLoja: r.chave || '',
      nomeExpresso: r.nome || '',
      agencia: r.agencia || '',
      pacb: r.pacb || '',
      status: r.statusAnalise || '',
    })

    router.push(`/dashboard/reportar?${params.toString()}`)
  }

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <span className="pill">Certificação</span>
        <h1 className="h1" style={{ marginTop: '.75rem' }}>
          🚨 Expressos com Certificação Vencida / a Vencer
        </h1>
        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          Agora a página considera todos os expressos da base e você escolhe o status no filtro.
        </p>
      </div>

      <div
        className="card"
        style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}
      >
        <Pill>Vencidas: {computed.vencidas}</Pill>
        <Pill>Próximas: {computed.proximas}</Pill>
        <Pill>Total alvo: {computed.alvo.length}</Pill>

        <button
          className="btn-primary"
          onClick={loadCsv}
          disabled={loading || checkingAuth}
          style={{ marginLeft: 'auto' }}
        >
          {checkingAuth ? 'Verificando login...' : loading ? 'Carregando...' : 'Recarregar base'}
        </button>
      </div>

      <div className="card" style={{ display: 'grid', gap: '1rem' }}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label>
            <div className="label">Buscar</div>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome, chave, município..."
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
            <div className="label">Status do Expresso</div>
            <select
              className="input"
              value={fStatusExpresso}
              onChange={(e) => setFStatusExpresso(e.target.value as StatusExpressoFilter)}
            >
              <option value="Todos">Todos</option>
              <option value="Treinado">Treinado</option>
              <option value="Transacional">Transacional</option>
            </select>
          </label>

          <label>
            <div className="label">Situação da Certificação</div>
            <select
              className="input"
              value={fCertView}
              onChange={(e) => setFCertView(e.target.value as CertViewFilter)}
            >
              <option value="Todas">Vencidas + Próximas</option>
              <option value="Vencidas">Somente vencidas</option>
              <option value="Proximas">Somente próximas</option>
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

      <div
        className="card"
        style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}
      >
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
          {filtered.map((item) => {
            const { r, certGroup, expiry, diasPassados, diasParaVencer, hasMovimento } = item
            const expandKey = `${r.chave}-${r.agencia}-${r.pacb}`
            const aberto = !!expanded[expandKey]

            const certPillStyle: CSSProperties =
              certGroup === 'vencida'
                ? {
                    background: 'rgba(214,31,44,.10)',
                    border: '1px solid rgba(214,31,44,.20)',
                    color: 'rgba(214,31,44,.95)',
                  }
                : {
                    background: 'rgba(245,158,11,.10)',
                    border: '1px solid rgba(245,158,11,.22)',
                    color: 'rgba(180,83,9,.98)',
                  }

            const statusLabel =
              certGroup === 'vencida'
                ? `Vencida há ${Math.max(0, diasPassados)} dia(s)`
                : `Vence em ${Math.max(0, diasParaVencer)} dia(s)`

            return (
              <div
                key={`${r.chave}-${r.agencia}-${r.pacb}-${r.nome}`}
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
                    <Pill style={certPillStyle}>{statusLabel}</Pill>
                    <Pill>TRX: {formatNum(r.trx || 0)}</Pill>
                    <Pill>Pontos: {formatPontos(r.pontos || 0)}</Pill>
                    {hasMovimento ? <Pill>Com movimento</Pill> : <Pill>Sem movimento</Pill>}
                  </div>

                  <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                    <LightButton onClick={() => irParaArvoreCronologica(r)} title="Árvore Cronológica">
                      🌳 Árvore
                    </LightButton>
                    <LightButton onClick={() => irParaReportar(r)} title="Reportar">
                      📕 Reportar
                    </LightButton>
                    <LightButton onClick={() => copyWhatsApp(item)} title="Copiar para WhatsApp">
                      📤 WhatsApp
                    </LightButton>
                    <LightButton
                      onClick={() => toggleExpand(expandKey)}
                      title={aberto ? 'Ocultar detalhes' : 'Ver detalhes'}
                    >
                      {aberto ? '📊 Ocultar' : '📊 Detalhar'}
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
                      Certificação
                    </div>
                    <div style={{ fontWeight: 900 }}>{r.dtCertificacao || '—'}</div>
                  </div>

                  <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                    <div className="p-muted" style={{ fontSize: 12 }}>
                      Vencimento
                    </div>
                    <div style={{ fontWeight: 900 }}>{formatPtBRDate(expiry)}</div>
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