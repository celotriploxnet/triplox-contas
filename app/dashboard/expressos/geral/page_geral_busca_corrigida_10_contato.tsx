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
import { collection, doc, endAt, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, startAt, writeBatch } from 'firebase/firestore'
import * as XLSX from 'xlsx'

import { auth, db, storage } from '@/lib/firebase'
import { calcPontosContasExpressoGeral, calcPontosExpressoGeral } from '@/lib/pontuacao'

/* =========================
   CONFIG
   ========================= */
const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'
const CSV_PATH = 'base-lojas/banco.csv'
const EXPRESSOS_COLLECTION = 'expressos_registro'
const RESUMO_EXPRESSOS_DOC = 'resumo_expressos'
const LIMIT_NO_SEARCH = 10

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
  qtdContasSemDeposito: number
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

  responsavel?: string
  telefoneResponsavel?: string
  presenteNaUltimaBase?: boolean

  pontos: number
}

type ResumoExpressos = {
  total: number
  transacional: number
  treinado: number
  semCert: number
  vencida: number
  possivelBloqueado: number
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


function safeDocId(value: string) {
  return toStr(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120) || 'sem-chave'
}

function getExpressoDocId(r: Pick<RowBase, 'chave' | 'agencia' | 'pacb' | 'nome'>) {
  const base = r.chave || `${r.agencia}-${r.pacb}-${r.nome}`
  return safeDocId(base)
}

function buildEmptyRowFromRegistro(data: any): RowBase {
  const row: RowBase = {
    chave: toStr(data.chave),
    nome: toStr(data.nome),
    municipio: toStr(data.municipio),
    agencia: toStr(data.agencia),
    pacb: toStr(data.pacb),
    statusAnalise: toStr(data.statusAnalise),
    dtCertificacao: toStr(data.dtCertificacao),
    trx: parseNumber(data.trx),

    qtdContas: parseNumber(data.qtdContas),
    qtdContasComDeposito: parseNumber(data.qtdContasComDeposito),
    qtdContasSemDeposito: parseNumber(data.qtdContasSemDeposito),
    qtdCestaServ: parseNumber(data.qtdCestaServ),
    qtdSuperProtegido: parseNumber(data.qtdSuperProtegido),
    qtdMobilidade: parseNumber(data.qtdMobilidade),
    qtdCartaoEmitido: parseNumber(data.qtdCartaoEmitido),
    qtdChesContratado: parseNumber(data.qtdChesContratado),
    qtdLimeAbConta: parseNumber(data.qtdLimeAbConta),
    qtdLime: parseNumber(data.qtdLime),
    qtdConsignado: parseNumber(data.qtdConsignado),
    qtdCreditoParcelado: parseNumber(data.qtdCreditoParcelado),
    qtdMicrosseguro: parseNumber(data.qtdMicrosseguro),
    qtdVivaVida: parseNumber(data.qtdVivaVida),
    qtdPlanoOdonto: parseNumber(data.qtdPlanoOdonto),
    qtdSegResidencial: parseNumber(data.qtdSegResidencial),
    qtdSegCartaoDeb: parseNumber(data.qtdSegCartaoDeb),
    vlrExpSorte: parseNumber(data.vlrExpSorte),
    qtdExpSorte: parseNumber(data.qtdExpSorte),
    referencia: toStr(data.referencia),

    responsavel: toStr(data.responsavel),
    telefoneResponsavel: toStr(data.telefoneResponsavel),
    presenteNaUltimaBase: false,

    pontos: parseNumber(data.pontos),
  }

  if (!row.pontos) {
    row.pontos = calcPontosExpressoGeral({
      qtdContasComDeposito: row.qtdContasComDeposito,
      qtdContasSemDeposito: row.qtdContasSemDeposito,
      qtdCestaServ: row.qtdCestaServ,
      qtdSuperProtegido: row.qtdSuperProtegido,
      qtdMobilidade: row.qtdMobilidade,
      qtdLime: row.qtdLime,
      qtdConsignado: row.qtdConsignado,
      qtdCreditoParcelado: row.qtdCreditoParcelado,
      qtdMicrosseguro: row.qtdMicrosseguro,
      qtdVivaVida: row.qtdVivaVida,
      qtdPlanoOdonto: row.qtdPlanoOdonto,
      qtdSegCartaoDeb: row.qtdSegCartaoDeb,
      vlrExpSorte: row.vlrExpSorte,
    })
  }

  return row
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

function normalizeContas(qtdContasRaw: any, qtdContasComDepositoRaw: any) {
  const qtdContas = Math.max(parseNumber(qtdContasRaw), 0)
  const qtdContasComDeposito = Math.max(parseNumber(qtdContasComDepositoRaw), 0)
  const qtdContasComDepositoAjustada = Math.min(qtdContasComDeposito, qtdContas)
  const qtdContasSemDeposito = Math.max(qtdContas - qtdContasComDepositoAjustada, 0)

  return {
    qtdContas,
    qtdContasComDeposito: qtdContasComDepositoAjustada,
    qtdContasSemDeposito,
  }
}

function isTreinado(status: string) {
  return toStr(status).toLowerCase().includes('trein')
}

function isTransacional(status: string) {
  return toStr(status).toLowerCase().includes('trans')
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

function isCertVencida(certDate: Date | null) {
  if (!certDate) return false
  const now = new Date()
  const expiry = new Date(certDate)
  expiry.setFullYear(expiry.getFullYear() + 5)
  return expiry < now
}


function calcularResumoExpressos(rows: RowBase[]): ResumoExpressos {
  const list = rows.map((r) => {
    const certDate = parseDateFlexible(r.dtCertificacao)
    const semCert = !certDate
    const vencida = isCertVencida(certDate)
    return { r, semCert, vencida }
  })

  return {
    total: list.length,
    transacional: list.filter((x) => isTransacional(x.r.statusAnalise)).length,
    treinado: list.filter((x) => isTreinado(x.r.statusAnalise)).length,
    semCert: list.filter((x) => x.semCert).length,
    vencida: list.filter((x) => x.vencida).length,
    possivelBloqueado: list.filter((x) => x.r.presenteNaUltimaBase === false).length,
  }
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

function formatPontos(n: number) {
  if (!Number.isFinite(n)) return '0'
  const rounded = Math.round(n * 10) / 10
  const isInt = Math.abs(rounded - Math.round(rounded)) < 1e-9
  return isInt ? String(Math.round(rounded)) : rounded.toFixed(1).replace('.', ',')
}

/* =========================
   SEMÁFORO / AÇÃO
   ========================= */
function gerarSinalizacoes(r: RowBase, semCert: boolean, vencida: boolean) {
  const sinais: { texto: string; estilo?: CSSProperties }[] = []

  if (semCert) {
    sinais.push({
      texto: '🔴 Sem certificação',
      estilo: {
        background: 'rgba(214,31,44,.10)',
        border: '1px solid rgba(214,31,44,.20)',
        color: 'rgba(214,31,44,.95)',
      },
    })
  }

  if (vencida) {
    sinais.push({
      texto: '🔴 Certificação vencida',
      estilo: {
        background: 'rgba(214,31,44,.10)',
        border: '1px solid rgba(214,31,44,.20)',
        color: 'rgba(214,31,44,.95)',
      },
    })
  }

  if ((r.trx || 0) === 0) {
    sinais.push({
      texto: '🟠 TRX zerada',
      estilo: {
        background: 'rgba(245,158,11,.10)',
        border: '1px solid rgba(245,158,11,.22)',
        color: 'rgba(180,83,9,.98)',
      },
    })
  }

  if ((r.pontos || 0) < 10) {
    sinais.push({
      texto: '🟠 Baixa pontuação',
      estilo: {
        background: 'rgba(245,158,11,.10)',
        border: '1px solid rgba(245,158,11,.22)',
        color: 'rgba(180,83,9,.98)',
      },
    })
  }

  if (!semCert && !vencida && (r.trx || 0) >= 200 && (r.pontos || 0) >= 10) {
    sinais.push({
      texto: '🟢 Expresso saudável',
      estilo: {
        background: 'rgba(34,197,94,.10)',
        border: '1px solid rgba(34,197,94,.20)',
        color: 'rgba(21,128,61,.95)',
      },
    })
  }

  return sinais
}

function acaoRecomendada(r: RowBase, semCert: boolean, vencida: boolean) {
  if (semCert) return 'Regularizar certificação'
  if (vencida) return 'Atualizar certificação'
  if ((r.trx || 0) === 0) return 'Incentivar movimentação'
  if ((r.pontos || 0) < 10) return 'Incentivar produção'
  return 'Acompanhar expresso'
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
  qtdContasSemDeposito: number
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
    `• Contas abertas (total): ${formatNum(a.qtdContas)}`,
    `• Contas com Depósito: ${formatNum(a.qtdContasComDeposito)}`,
    `• Contas sem Depósito: ${formatNum(a.qtdContasSemDeposito)}`,
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

function formatarTelefoneBR(valor: string) {
  const numeros = valor.replace(/\D/g, '').slice(0, 11)

  if (numeros.length <= 2) {
    return numeros
  }

  if (numeros.length <= 7) {
    return numeros.replace(/(\d{2})(\d+)/, '($1) $2')
  }

  return numeros
    .replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
    .replace(/-$/, '')
}

export default function ExpressoGeralPage() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState('')

  const [rows, setRows] = useState<RowBase[]>([])
  const [resumoExpressos, setResumoExpressos] = useState<ResumoExpressos | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [contatosAbertos, setContatosAbertos] = useState<Record<string, boolean>>({})

  const [q, setQ] = useState('')
  const [fAgencia, setFAgencia] = useState('Todos')
  const [fCert, setFCert] = useState<CertFilter>('Todos')
  const [fTrx, setFTrx] = useState<TrxFilter>('Todos')

  function toggleExpand(key: string) {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  function toggleContato(key: string) {
    setContatosAbertos((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }


  async function carregarResumoExpressos() {
    try {
      const snap = await getDoc(doc(db, 'config', RESUMO_EXPRESSOS_DOC))

      if (!snap.exists()) {
        setResumoExpressos(null)
        return
      }

      const data = snap.data() as Partial<ResumoExpressos>
      setResumoExpressos({
        total: Number(data.total || 0),
        transacional: Number(data.transacional || 0),
        treinado: Number(data.treinado || 0),
        semCert: Number(data.semCert || 0),
        vencida: Number(data.vencida || 0),
        possivelBloqueado: Number(data.possivelBloqueado || 0),
      })
    } catch (e) {
      console.error('Erro ao carregar resumo dos expressos:', e)
      setResumoExpressos(null)
    }
  }

  async function carregarPrimeirosRegistros() {
    if (!auth.currentUser) {
      setError('Você precisa estar logado.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const qRegistros = query(
        collection(db, EXPRESSOS_COLLECTION),
        orderBy('nome'),
        limit(LIMIT_NO_SEARCH)
      )

      const snap = await getDocs(qRegistros)
      const primeiros = snap.docs.map((docSnap) => buildEmptyRowFromRegistro(docSnap.data()))

      setRows(primeiros)
      setInfo(`Carregando somente ${LIMIT_NO_SEARCH} registros iniciais ✅`)
    } catch (e: any) {
      console.error('Erro ao carregar registros iniciais:', e)
      setError(`Falha ao carregar registros (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
    } finally {
      setLoading(false)
    }
  }


  async function consultarRegistrosPorTermo(term: string) {
    if (!auth.currentUser) {
      setError('Você precisa estar logado.')
      return
    }

    const termo = term.trim()

    if (!termo) {
      await carregarPrimeirosRegistros()
      return
    }

    try {
      setLoading(true)
      setError(null)

      const encontrados = new Map<string, RowBase>()

      // 1) Busca direta pelo ID do documento, ideal para Chave Loja.
      const direto = await getDoc(doc(db, EXPRESSOS_COLLECTION, safeDocId(termo)))

      if (direto.exists()) {
        const row = buildEmptyRowFromRegistro(direto.data())
        encontrados.set(getExpressoDocId(row), row)
      }

      // 2) Busca por começo da Chave Loja.
      const porChave = query(
        collection(db, EXPRESSOS_COLLECTION),
        orderBy('chave'),
        startAt(termo),
        endAt(`${termo}\uf8ff`),
        limit(20)
      )

      const snapChave = await getDocs(porChave)
      snapChave.docs.forEach((docSnap) => {
        const row = buildEmptyRowFromRegistro(docSnap.data())
        encontrados.set(getExpressoDocId(row), row)
      })

      // 3) Busca por começo do nome, tentando maiúsculo, pois a base geralmente vem em caixa alta.
      const termoNome = termo.toUpperCase()
      const porNome = query(
        collection(db, EXPRESSOS_COLLECTION),
        orderBy('nome'),
        startAt(termoNome),
        endAt(`${termoNome}\uf8ff`),
        limit(20)
      )

      const snapNome = await getDocs(porNome)
      snapNome.docs.forEach((docSnap) => {
        const row = buildEmptyRowFromRegistro(docSnap.data())
        encontrados.set(getExpressoDocId(row), row)
      })

      const resultado = Array.from(encontrados.values())

      setRows(resultado)
      setInfo(
        resultado.length
          ? `Consulta concluída: ${resultado.length} registro(s) encontrado(s) ✅`
          : 'Nenhum expresso encontrado nessa consulta.'
      )
    } catch (e: any) {
      console.error('Erro ao consultar registros:', e)
      setError(`Falha ao consultar (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
    } finally {
      setLoading(false)
    }
  }

  async function recarregarTela() {
    await carregarResumoExpressos()
    await carregarPrimeirosRegistros()
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

        const {
          qtdContas,
          qtdContasComDeposito,
          qtdContasSemDeposito,
        } = normalizeContas(
          r['qtd_contas'] || r['qtd contas'],
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

        const pontos = calcPontosExpressoGeral({
          qtdContasComDeposito,
          qtdContasSemDeposito,
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
          qtdContasSemDeposito,
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

      let finalRows = mapped.map((r) => ({
        ...r,
        responsavel: '',
        telefoneResponsavel: '',
        presenteNaUltimaBase: true,
      }))

      try {
        const registrosRef = collection(db, EXPRESSOS_COLLECTION)
        const snap = await getDocs(registrosRef)
        const salvos = new Map<string, any>()

        snap.forEach((docSnap) => {
          salvos.set(docSnap.id, docSnap.data())
        })

        const idsDaBaseAtual = new Set<string>()
        const batch = writeBatch(db)

        finalRows = mapped.map((r) => {
          const id = getExpressoDocId(r)
          idsDaBaseAtual.add(id)

          const salvo = salvos.get(id) || {}

          const rowComRegistro: RowBase = {
            ...r,
            responsavel: toStr(salvo.responsavel),
            telefoneResponsavel: toStr(salvo.telefoneResponsavel),
            presenteNaUltimaBase: true,
          }

          batch.set(
            doc(db, EXPRESSOS_COLLECTION, id),
            {
              ...r,
              responsavel: rowComRegistro.responsavel || '',
              telefoneResponsavel: rowComRegistro.telefoneResponsavel || '',
              presenteNaUltimaBase: true,
              atualizadoNaUltimaCargaEm: serverTimestamp(),
            },
            { merge: true }
          )

          return rowComRegistro
        })

        salvos.forEach((data, id) => {
          if (idsDaBaseAtual.has(id)) return

          const rowAntigo = buildEmptyRowFromRegistro(data)
          rowAntigo.presenteNaUltimaBase = false
          finalRows.push(rowAntigo)

          batch.set(
            doc(db, EXPRESSOS_COLLECTION, id),
            {
              presenteNaUltimaBase: false,
              ausenteNaUltimaCargaEm: serverTimestamp(),
            },
            { merge: true }
          )
        })

        const resumoAtualizado = calcularResumoExpressos(finalRows)

        batch.set(
          doc(db, 'config', RESUMO_EXPRESSOS_DOC),
          {
            ...resumoAtualizado,
            atualizadoEm: serverTimestamp(),
          },
          { merge: true }
        )

        await batch.commit()

        setResumoExpressos(resumoAtualizado)
        setRows(finalRows.slice(0, LIMIT_NO_SEARCH))
        setInfo(
          `Base carregada ✅ ${mapped.length} expressos na última base. ${finalRows.length - mapped.length} preservados do histórico.`
        )
      } catch (firestoreError) {
        console.error('Erro ao sincronizar registro de expressos:', firestoreError)
        setRows(finalRows)
        setInfo('Base carregada ✅ mas o registro permanente não sincronizou agora.')
      }
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
      carregarResumoExpressos()
      carregarPrimeirosRegistros()
    })

    return () => unsub()
  }, [router])


  useEffect(() => {
    if (!user) return

    const timer = window.setTimeout(() => {
      consultarRegistrosPorTermo(q)
    }, 450)

    return () => window.clearTimeout(timer)
  }, [q, user])

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
    const possivelBloqueado = list.filter((x) => x.r.presenteNaUltimaBase === false).length

    return { list, total, transacional, treinado, semCert, vencida, possivelBloqueado }
  }, [rows])

  const stats = resumoExpressos || computed

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
        const hay = [r.nome, r.chave, r.municipio, r.agencia, r.pacb, r.statusAnalise]
          .join(' ')
          .toLowerCase()
        return hay.includes(term)
      })
    } else {
      list = list.slice(0, LIMIT_NO_SEARCH)
    }

    return list
  }, [computed.list, q, fAgencia, fCert, fTrx])

  async function copyWhatsApp(
    r: RowBase,
    certDate: Date | null,
    semCert: boolean,
    vencida: boolean
  ) {
    try {
      const certLabel = semCert
        ? 'Sem certificação'
        : vencida
          ? 'Certificação vencida'
          : 'Certificado'

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
        qtdContasSemDeposito: r.qtdContasSemDeposito,
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
        qtdExpSorte: r.qtdExpSorte || 0,
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

  
  function updateContatoLocal(
    r: RowBase,
    field: 'responsavel' | 'telefoneResponsavel',
    value: string
  ) {
    const id = getExpressoDocId(r)

    setRows((prev) =>
      prev.map((item) =>
        getExpressoDocId(item) === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    )
  }

  async function salvarContatoExpresso(r: RowBase) {
    try {
      if (!auth.currentUser) {
        setError('Você precisa estar logado para salvar o contato.')
        return
      }

      const id = getExpressoDocId(r)

      await setDoc(
        doc(db, EXPRESSOS_COLLECTION, id),
        {
          responsavel: r.responsavel || '',
          telefoneResponsavel: r.telefoneResponsavel || '',
          contatoAtualizadoEm: serverTimestamp(),
        },
        { merge: true }
      )

      setInfo('Contato do expresso salvo ✅')
      alert('Contato salvo com sucesso!')
      setError(null)
    } catch (e) {
      console.error(e)
      setError('Não consegui salvar o contato agora.')
    }
  }

function irParaArvoreCronologica(r: RowBase) {
    router.push(`/dashboard/arvorecronologica/${encodeURIComponent(r.chave)}`)
  }

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <span className="pill">Geral</span>
        <h1 className="h1" style={{ marginTop: '.75rem' }}>
          📊 Expresso Geral (visão completa)
        </h1>
      </div>

      <div
        className="card"
        style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}
      >
        <Pill>Total: {stats.total}</Pill>
        <Pill>Transacional: {stats.transacional}</Pill>
        <Pill>Treinado: {stats.treinado}</Pill>
        <Pill>Sem certificação: {stats.semCert}</Pill>
        <Pill
          style={{
            background: 'rgba(214,31,44,.10)',
            border: '1px solid rgba(214,31,44,.20)',
            color: 'rgba(214,31,44,.95)',
          }}
        >
          Certificação vencida: {stats.vencida}
        </Pill>

        <Pill
          style={{
            background: 'rgba(245,158,11,.14)',
            border: '1px solid rgba(245,158,11,.28)',
            color: 'rgba(146,64,14,.98)',
          }}
        >
          Possível bloqueado: {stats.possivelBloqueado}
        </Pill>

        <button
          className="btn-primary"
          onClick={isAdmin ? loadCsv : recarregarTela}
          disabled={loading || checkingAuth}
          style={{ marginLeft: 'auto' }}
        >
          {checkingAuth ? 'Verificando login...' : loading ? 'Carregando...' : isAdmin ? 'Sincronizar CSV' : 'Atualizar lista'}
        </button>
      </div>

      <div className="card" style={{ display: 'grid', gap: '1rem' }}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label>
            <div className="label">Buscar (opcional)</div>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome ou chave..."
            />
            <div className="p-muted" style={{ marginTop: '.35rem', fontSize: 12 }}>
              A página carrega inicialmente só <b>{LIMIT_NO_SEARCH}</b> registros para economizar tráfego.
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
            <select
              className="input"
              value={fCert}
              onChange={(e) => setFCert(e.target.value as CertFilter)}
            >
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
          {filtered.map(({ r, certDate, vencida, semCert }) => {
            const pontos = r.pontos || 0
            const pontosOk = pontos >= 10
            const expandKey = `${r.chave}-${r.agencia}-${r.pacb}`
            const aberto = !!expanded[expandKey]
            const contatoAberto = !!contatosAbertos[expandKey]

            const pontosPillStyle: CSSProperties = pontosOk
              ? {
                  background: 'rgba(37,99,235,.12)',
                  border: '1px solid rgba(37,99,235,.25)',
                  color: 'rgba(37,99,235,.98)',
                }
              : {
                  background: 'rgba(214,31,44,.10)',
                  border: '1px solid rgba(214,31,44,.20)',
                  color: 'rgba(214,31,44,.95)',
                }

            const certLabel = semCert
              ? 'Sem certificação'
              : vencida
                ? 'Certificação vencida'
                : 'Certificado'

            const sinais = gerarSinalizacoes(r, semCert, vencida)
            const recomendacao = acaoRecomendada(r, semCert, vencida)

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
                    <Pill
                      style={
                        certLabel === 'Certificação vencida'
                          ? {
                              background: 'rgba(214,31,44,.10)',
                              border: '1px solid rgba(214,31,44,.20)',
                              color: 'rgba(214,31,44,.95)',
                            }
                          : certLabel === 'Certificado'
                            ? {
                                background: 'rgba(34,197,94,.10)',
                                border: '1px solid rgba(34,197,94,.20)',
                                color: 'rgba(21,128,61,.95)',
                              }
                            : {
                                background: 'rgba(15,15,25,.06)',
                                border: '1px solid rgba(15,15,25,.10)',
                                color: 'rgba(16,16,24,.70)',
                              }
                      }
                    >
                      {certLabel}
                    </Pill>

                    <Pill>TRX: {String(r.trx || 0)}</Pill>

                    <Pill style={pontosPillStyle} title="Ativo se Pontos >= 10">
                      Pontos: {formatPontos(pontos)}
                    </Pill>

                    {r.presenteNaUltimaBase === false && (
                      <Pill
                        style={{
                          background: 'rgba(245,158,11,.14)',
                          border: '1px solid rgba(245,158,11,.28)',
                          color: 'rgba(146,64,14,.98)',
                        }}
                        title="Esse expresso estava salvo, mas não veio na última base carregada."
                      >
                        EXPRESSO PODE TER SIDO BLOQUEADO
                      </Pill>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                    <LightButton
                      onClick={() => irParaArvoreCronologica(r)}
                      title="Árvore Cronológica"
                    >
                      🌳 Árvore
                    </LightButton>
                    <LightButton onClick={() => irParaReportar(r)} title="Reportar">
                      📕 Reportar
                    </LightButton>

                    <LightButton
                      onClick={() => toggleContato(expandKey)}
                      title={contatoAberto ? 'Ocultar contato' : 'Ver ou editar contato'}
                    >
                      {contatoAberto ? '☎️ Ocultar contato' : '☎️ Contato'}
                    </LightButton>

                    <LightButton
                      onClick={() => copyWhatsApp(r, certDate, semCert, vencida)}
                      title="Copiar para WhatsApp"
                    >
                      📤 WhatsApp
                    </LightButton>

                    <LightButton
                      onClick={() => toggleExpand(expandKey)}
                      title={aberto ? 'Ocultar produção' : 'Ver produção'}
                    >
                      {aberto ? '📊 Ocultar produção' : '📊 Ver produção'}
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
                      dt_certificacao
                    </div>
                    <div style={{ fontWeight: 900 }}>{r.dtCertificacao || '—'}</div>
                  </div>
                </div>

                {contatoAberto && (
                  <div className="card-soft" style={{ padding: '.9rem .95rem', display: 'grid', gap: '.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.75rem', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 900 }}>Contato do Expresso</div>
                        <div className="p-muted" style={{ fontSize: 12, marginTop: '.2rem' }}>
                          Consulte ou atualize o responsável e telefone deste ponto.
                        </div>
                      </div>

                      <LightButton onClick={() => salvarContatoExpresso(r)} title="Salvar contato">
                        💾 Salvar contato
                      </LightButton>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '.75rem',
                      }}
                    >
                      <label>
                        <div className="label">Pessoa de contato</div>
                        <input
                          className="input"
                          value={r.responsavel || ''}
                          onChange={(e) => updateContatoLocal(r, 'responsavel', e.target.value)}
                          placeholder="Digite o responsável"
                        />
                      </label>

                      <label>
                        <div className="label">Telefone</div>
                        <input
                          className="input"
                          value={r.telefoneResponsavel || ''}
                          onChange={(e) => updateContatoLocal(r, 'telefoneResponsavel', e.target.value)}
                          placeholder="(00) 00000-0000"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {sinais.length > 0 && (
                  <div className="card-soft" style={{ padding: '.9rem .95rem' }}>
                    <div className="p-muted" style={{ fontSize: 12, marginBottom: '.45rem' }}>
                      Sinalizações
                    </div>

                    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                      {sinais.map((sinal, idx) => (
                        <Pill key={`${expandKey}-sinal-${idx}`} style={sinal.estilo}>
                          {sinal.texto}
                        </Pill>
                      ))}
                    </div>

                    <div style={{ marginTop: '.7rem', fontSize: 14 }}>
                      <b>Ação recomendada:</b> {recomendacao}
                    </div>
                  </div>
                )}

                {aberto && (
                  <div className="card-soft" style={{ padding: '.9rem .95rem', display: 'grid', gap: '.55rem' }}>
                    <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="pill">Indicadores</span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '.6rem',
                      }}
                    >
                      <Indicador label="Contas abertas (total)" value={formatNum(r.qtdContas)} />
                      <Indicador label="Contas com Depósito" value={formatNum(r.qtdContasComDeposito)} />
                      <Indicador label="Contas sem Depósito" value={formatNum(r.qtdContasSemDeposito)} />
                      <Indicador
                        label="Pontos de Contas (7x com depósito + 3x sem depósito)"
                        value={formatPontos(
                          calcPontosContasExpressoGeral({
                            qtdContasComDeposito: r.qtdContasComDeposito,
                            qtdContasSemDeposito: r.qtdContasSemDeposito,
                          })
                        )}
                      />
                      <Indicador label="Cestas de Serviços" value={formatNum(r.qtdCestaServ)} />
                      <Indicador label="Super Protegido" value={formatNum(r.qtdSuperProtegido)} />
                      <Indicador label="Mobilidade" value={formatNum(r.qtdMobilidade)} />
                      <Indicador label="Cartão Emitido" value={formatNum(r.qtdCartaoEmitido)} />
                      <Indicador label="Ches Contratado" value={formatNum(r.qtdChesContratado)} />
                      <Indicador label="Lime na conta" value={formatNum(r.qtdLimeAbConta)} />
                      <Indicador label="Lime Contratado" value={formatNum(r.qtdLime)} />
                      <Indicador label="Consignado" value={formatNum(r.qtdConsignado)} />
                      <Indicador label="Crédito Parcelado" value={formatNum(r.qtdCreditoParcelado)} />
                      <Indicador label="Microsseguros" value={formatNum(r.qtdMicrosseguro)} />
                      <Indicador label="Viva Vida" value={formatNum(r.qtdVivaVida)} />
                      <Indicador label="Dental" value={formatNum(r.qtdPlanoOdonto)} />
                      <Indicador label="Residencial" value={formatNum(r.qtdSegResidencial)} />
                      <Indicador label="Seguro Cartão Débito" value={formatNum(r.qtdSegCartaoDeb)} />
                      <Indicador label="VLR Exp. Sorte (pontos a cada 50)" value={formatNum(r.vlrExpSorte)} />
                      <Indicador label="EXPRESSO REFERÊNCIA?" value={r.referencia || '—'} />
                    </div>
                  </div>
                )}
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