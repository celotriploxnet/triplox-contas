'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db, storage } from '@/lib/firebase'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { getBytes, ref } from 'firebase/storage'
import { calcPontosExpressoGeral } from '@/lib/pontuacao-junho-2026'
import styles from './arvoreCronologica.module.css'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type MesRow = {
  mesReferencia: string
  mesOrdem: number

  chave: string
  nome: string
  municipio: string
  agencia: string
  pacb: string

  trx: number
  pontos?: number

  qtdContas?: number
  qtdContasComDeposito?: number
  qtdContasSemDeposito?: number
  qtdCestaServ?: number
  qtdSuperProtegido?: number
  qtdMobilidade?: number
  qtdLime?: number
  qtdConsignado?: number
  qtdCreditoParcelado?: number
  vlrLime?: number
  vlrConsignadoTotal?: number
  vlrCreditoParcelado?: number
  qtdMicrosseguro?: number
  qtdVivaVida?: number
  qtdPlanoOdonto?: number
  qtdSegResidencial?: number
  qtdSegCartaoDeb?: number
  vlrExpSorte?: number
  qtdExpSorte?: number
  referencia?: string

  statusAnalise?: string
  dtCertificacao?: string
}

type AtualRow = {
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
  qtdContasSemDeposito: number
  vlrLime: number
  vlrConsignadoTotal: number
  vlrCreditoParcelado: number
  vlrExpSorte: number
  qtdExpSorte: number
  referencia: string

  pontos: number
}

const CSV_PATH = 'base-lojas/banco.csv'

function toStr(v: any) {
  return v === null || v === undefined ? '' : String(v).trim()
}

function toUint8(bytes: any): Uint8Array {
  if (bytes instanceof Uint8Array) return bytes
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes)
  return new Uint8Array(bytes)
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

function formatNum(n: number | undefined) {
  if (!Number.isFinite(Number(n))) return '0'
  return String(Number(n))
}

function formatPontos(n: number | undefined) {
  const value = Number(n || 0)
  const rounded = Math.round(value * 10) / 10
  const isInt = Math.abs(rounded - Math.round(rounded)) < 1e-9
  return isInt ? String(Math.round(rounded)) : rounded.toFixed(1).replace('.', ',')
}

function formatCurrency(n: number | undefined) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(Number(n || 0))
}

function formatMetric(value: number, tipo: 'money' | 'count') {
  return tipo === 'money' ? formatCurrency(value) : formatNum(value)
}

function percentual(atual: number, anterior: number) {
  if (!anterior) return atual === 0 ? '0%' : '—'
  const valor = ((atual - anterior) / anterior) * 100
  const sinal = valor > 0 ? '+' : ''
  return `${sinal}${valor.toFixed(1).replace('.', ',')}%`
}

function nomeMes(mesRef: string) {
  if (!mesRef) return ''

  const [mes, ano] = mesRef.split('/')
  const m = Number(mes)

  const nomes = [
    '',
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]

  if (!m || m > 12) return mesRef
  return `${nomes[m]} - ${ano}`
}

function mesAtualRef() {
  const now = new Date()
  const mes = String(now.getMonth() + 1).padStart(2, '0')
  const ano = String(now.getFullYear())
  return `${mes}/${ano}`
}

function gerarMesOrdem(mesRef: string) {
  const [mes, ano] = mesRef.split('/')
  return Number(`${ano}${mes}`)
}

function formatCertificacaoValue(v: any) {
  const raw = toStr(v)
  if (!raw) return '—'

  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slash) {
    const dd = String(Number(slash[1])).padStart(2, '0')
    const mm = String(Number(slash[2])).padStart(2, '0')
    const yyyy = slash[3]
    return `${dd}/${mm}/${yyyy}`
  }

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    return `${iso[3]}/${iso[2]}/${iso[1]}`
  }

  return raw
}

function normalizeComparable(value: string) {
  return toStr(value).replace(/\s+/g, '').replace(/^0+/, '').toLowerCase()
}

function sameChave(a: string, b: string) {
  const na = normalizeComparable(a)
  const nb = normalizeComparable(b)
  return na === nb
}

function calcPontos(r: {
  qtdContasComDeposito?: number
  qtdContas?: number
  qtdCestaServ?: number
  qtdSuperProtegido?: number
  qtdMobilidade?: number
  qtdLime?: number
  qtdConsignado?: number
  qtdCreditoParcelado?: number
  qtdMicrosseguro?: number
  qtdVivaVida?: number
  qtdPlanoOdonto?: number
  qtdSegCartaoDeb?: number
  vlrExpSorte?: number
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

function deltaNumber(atual: number | undefined, anterior: number | undefined) {
  const a = Number(atual || 0)
  const b = Number(anterior || 0)
  return a - b
}

function deltaLabel(atual: number | undefined, anterior: number | undefined) {
  const delta = deltaNumber(atual, anterior)

  if (delta > 0) return `↑ +${delta}`
  if (delta < 0) return `↓ ${delta}`
  return '→ 0'
}

function deltaStyle(atual: number | undefined, anterior: number | undefined): CSSProperties {
  const delta = deltaNumber(atual, anterior)

  if (delta > 0) {
    return {
      background: 'rgba(34,197,94,.10)',
      border: '1px solid rgba(34,197,94,.20)',
      color: 'rgba(21,128,61,.95)',
    }
  }

  if (delta < 0) {
    return {
      background: 'rgba(214,31,44,.10)',
      border: '1px solid rgba(214,31,44,.20)',
      color: 'rgba(214,31,44,.95)',
    }
  }

  return {
    background: 'rgba(15,15,25,.06)',
    border: '1px solid rgba(15,15,25,.10)',
    color: 'rgba(16,16,24,.70)',
  }
}

function detectDelimiter(headerLine: string) {
  const candidates = [',', ';', '\t']
  let best = ','
  let bestCount = -1

  for (const delimiter of candidates) {
    const count = (headerLine.match(new RegExp(`\\${delimiter}`, 'g')) || []).length
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
  const headers = parseDelimitedLine(lines[0], delimiter).map((h) => h.trim().toLowerCase())

  return lines.slice(1).map((line) => {
    const values = parseDelimitedLine(line, delimiter)
    const row: Record<string, string> = {}

    headers.forEach((header, idx) => {
      row[header] = (values[idx] ?? '').trim()
    })

    return row
  })
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(15,15,25,.10)',
        borderRadius: 16,
        boxShadow: '0 10px 20px rgba(10,10,20,.08)',
        padding: '.75rem .9rem',
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: '.35rem' }}>{label}</div>
      {payload.map((item: any, idx: number) => (
        <div key={idx} style={{ fontSize: 14 }}>
          {item.name}: <b>{item.value}</b>
        </div>
      ))}
    </div>
  )
}

export default function ArvoreCronologicaPage() {
  const router = useRouter()
  const params = useParams()

  const chave = String(params?.chave || '')

  const [userReady, setUserReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [rows, setRows] = useState<MesRow[]>([])

  const [currentLoading, setCurrentLoading] = useState(true)
  const [currentError, setCurrentError] = useState('')
  const [currentRow, setCurrentRow] = useState<AtualRow | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push('/login')
        return
      }
      setUserReady(true)
    })

    return () => unsub()
  }, [router])

  useEffect(() => {
    if (!userReady || !chave) return

    async function carregarHistorico() {
      try {
        setLoading(true)
        setErro('')

        const refMeses = collection(db, 'arvorecronologica', chave, 'meses')
        const q = query(refMeses, orderBy('mesOrdem', 'asc'))
        const snap = await getDocs(q)

        const lista = snap.docs.map((d) => d.data() as MesRow)
        // Mantém somente os quatro fechamentos mais recentes; a base do mês atual
        // continua sendo carregada separadamente e aparece na comparação existente.
        setRows(lista.slice(-4))
      } catch (e: any) {
        console.error(e)
        setErro(e?.message || 'Erro ao carregar árvore cronológica.')
      } finally {
        setLoading(false)
      }
    }

    async function carregarAtual() {
      try {
        setCurrentLoading(true)
        setCurrentError('')

        const bytesAny = await getBytes(ref(storage, CSV_PATH))
        const text = new TextDecoder('utf-8').decode(toUint8(bytesAny))
        const raw = parseCsvRows(text)

        const mapped: AtualRow[] = raw.map((r) => {
          const chaveMap = toStr(r['chave_loja'] || r['chave loja'] || r['chave'])
          const nome = toStr(r['nome_loja'] || r['nome da loja'] || r['nome'])
          const municipio = toStr(r['municipio'] || r['município'])

          const agpacb = r['ag_pacb'] || r['agencia/pacb'] || r['agência/pacb']
          const { agencia, pacb } = splitAgPacb(agpacb)

          const statusAnalise = toStr(r['status_analise'] || r['status analise'] || r['status'])
          const dtCertificacao = toStr(
            r['dt_certificacao'] || r['dt certificacao'] || r['certificacao'] || r['certificação']
          )

          const trx = parseNumber(
            r['qtd_trxcontabil'] || r['qtd_trx_contabil'] || r['qtd trxcontabil'] || r['qtd_trx']
          )

          const qtdContas = parseNumber(r['qtd_contas'] || r['qtd contas'])
          const qtdContasComDeposito = Math.min(
            Math.max(parseNumber(r['qtd_contas_com_deposito'] || r['qtd contas com deposito']), 0),
            Math.max(qtdContas, 0)
          )
          const qtdContasSemDeposito = Math.max(qtdContas - qtdContasComDeposito, 0)
          const qtdCestaServ = parseNumber(r['qtd_cesta_serv'] || r['qtd cesta serv'])
          const vlrLime = parseNumber(r['vlr_lime'] || r['valor do lime'] || r['valor lime'])
          const vlrConsignadoTotal = parseNumber(
            r['vlr_consignado_total'] || r['valor consignado total'] || r['consignado total']
          )
          const vlrCreditoParcelado = parseNumber(
            r['vlr_credito_parcel'] || r['valor credito parcelado'] || r['valor crédito parcelado']
          )

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
            vlrLime,
            vlrConsignadoTotal,
            vlrCreditoParcelado,
            qtdMicrosseguro,
            qtdVivaVida,
            qtdPlanoOdonto,
            qtdSegCartaoDeb,
            vlrExpSorte,
          })

          return {
            chave: chaveMap,
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
            vlrLime,
            vlrConsignadoTotal,
            vlrCreditoParcelado,
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

        const found = mapped.find((item) => sameChave(item.chave, chave)) || null
        setCurrentRow(found)
      } catch (e: any) {
        console.error(e)
        setCurrentError(e?.message || 'Não foi possível carregar a produção atual.')
        setCurrentRow(null)
      } finally {
        setCurrentLoading(false)
      }
    }

    carregarHistorico()
    carregarAtual()
  }, [userReady, chave])

  const rowsComPontos = useMemo(() => {
    return rows.map((r) => ({
      ...r,
      pontosCalculados: Number(r.pontos ?? calcPontos({
        qtdContasComDeposito: r.qtdContasComDeposito,
        qtdContas: r.qtdContas,
        qtdCestaServ: r.qtdCestaServ,
        qtdSuperProtegido: r.qtdSuperProtegido,
        qtdMobilidade: r.qtdMobilidade,
        qtdLime: r.qtdLime,
        qtdConsignado: r.qtdConsignado,
        qtdCreditoParcelado: r.qtdCreditoParcelado,
        qtdMicrosseguro: r.qtdMicrosseguro,
        qtdVivaVida: r.qtdVivaVida,
        qtdPlanoOdonto: r.qtdPlanoOdonto,
        qtdSegCartaoDeb: r.qtdSegCartaoDeb,
        vlrExpSorte: r.vlrExpSorte,
      })),
      dtCertificacaoFormatada: formatCertificacaoValue(r.dtCertificacao),
    }))
  }, [rows])

  const infoExpresso = useMemo(() => {
    if (currentRow) {
      return {
        ...currentRow,
        dtCertificacaoFormatada: formatCertificacaoValue(currentRow.dtCertificacao),
      }
    }

    if (!rowsComPontos.length) return null
    return rowsComPontos[rowsComPontos.length - 1]
  }, [rowsComPontos, currentRow])

  const chartData = useMemo(() => {
    const historico = rowsComPontos.map((r) => ({
      mes: r.mesReferencia,
      pontos: Number((r as any).pontosCalculados || 0),
    }))

    if (currentRow) {
      const refAtual = mesAtualRef()
      const idx = historico.findIndex((item) => item.mes === refAtual)

      const atualGrafico = {
        mes: refAtual,
        pontos: Number(currentRow.pontos || 0),
      }

      if (idx >= 0) {
        historico[idx] = atualGrafico
      } else {
        historico.push(atualGrafico)
      }
    }

    return historico.sort((a, b) => {
      const [ma, aa] = a.mes.split('/')
      const [mb, ab] = b.mes.split('/')
      return Number(`${aa}${ma}`) - Number(`${ab}${mb}`)
    })
  }, [rowsComPontos, currentRow])

  const comparacaoProdutos = useMemo(() => {
    const fechamentos = [...rowsComPontos]
      .filter((r) => r.mesReferencia !== mesAtualRef())
      .sort((a, b) => a.mesOrdem - b.mesOrdem)
    const atual = fechamentos[fechamentos.length - 1]
    const anterior = fechamentos[fechamentos.length - 2]
    if (!atual || !anterior) return null

    const medidas: { nome: string; tipo: 'money' | 'count'; valor: (r: any) => number }[] = [
      { nome: 'Contas sem depósito', tipo: 'count', valor: (r) => Number(r.qtdContasSemDeposito ?? Math.max(Number(r.qtdContas || 0) - Number(r.qtdContasComDeposito || 0), 0)) },
      { nome: 'Contas com depósito', tipo: 'count', valor: (r) => Number(r.qtdContasComDeposito || 0) },
      { nome: 'Cesta de serviços', tipo: 'count', valor: (r) => Number(r.qtdCestaServ || 0) },
      { nome: 'Super Protegido', tipo: 'count', valor: (r) => Number(r.qtdSuperProtegido || 0) },
      { nome: 'Empréstimo pessoal', tipo: 'money', valor: (r) => Number(r.vlrLime || 0) },
      { nome: 'Consignado', tipo: 'money', valor: (r) => Number(r.vlrConsignadoTotal || 0) },
      { nome: 'Crédito parcelado', tipo: 'money', valor: (r) => Number(r.vlrCreditoParcelado || 0) },
      { nome: 'Microsseguro', tipo: 'count', valor: (r) => Number(r.qtdMicrosseguro || 0) },
      { nome: 'Viva Vida', tipo: 'count', valor: (r) => Number(r.qtdVivaVida || 0) },
      { nome: 'Plano odontológico', tipo: 'count', valor: (r) => Number(r.qtdPlanoOdonto || 0) },
      { nome: 'Seguro residencial', tipo: 'count', valor: (r) => Number(r.qtdSegResidencial || 0) },
      { nome: 'Seguro do cartão', tipo: 'count', valor: (r) => Number(r.qtdSegCartaoDeb || 0) },
      { nome: 'Expresso da Sorte', tipo: 'money', valor: (r) => Number(r.vlrExpSorte || 0) },
    ]

    const produtos = medidas.map((medida) => {
      const valorAtual = medida.valor(atual)
      const valorAnterior = medida.valor(anterior)
      const diferenca = valorAtual - valorAnterior
      const estado = valorAtual === 0 && valorAnterior === 0
        ? 'none'
        : diferenca > 0
          ? 'up'
          : diferenca < 0
            ? 'down'
            : 'flat'
      return {
        ...medida,
        valorAtual,
        valorAnterior,
        diferenca,
        percentual: percentual(valorAtual, valorAnterior),
        estado,
      }
    })

    return {
      mesAtual: atual.mesReferencia,
      mesAnterior: anterior.mesReferencia,
      produtos,
      cresceu: produtos.filter((p) => p.estado === 'up').length,
      manteve: produtos.filter((p) => p.estado === 'flat').length,
      caiu: produtos.filter((p) => p.estado === 'down').length,
      semProducao: produtos.filter((p) => p.estado === 'none').length,
    }
  }, [rowsComPontos])

  const mesAtualNome = useMemo(() => nomeMes(mesAtualRef()), [])

  const timelineItems = useMemo(() => {
    const historico = [...rowsComPontos]
      .filter((r) => r.mesReferencia !== mesAtualRef())
      .sort((a, b) => b.mesOrdem - a.mesOrdem)

    const fechamentos = historico.map((r, index) => {
      const anterior = historico[index + 1]
      return {
        ...r,
        atual: false,
        pontosValor: Number((r as any).pontosCalculados || 0),
        anteriorPontos: anterior ? Number((anterior as any).pontosCalculados || 0) : null,
        anteriorTrx: anterior ? Number(anterior.trx || 0) : null,
        contasSemDeposito: Number(
          r.qtdContasSemDeposito ?? Math.max(Number(r.qtdContas || 0) - Number(r.qtdContasComDeposito || 0), 0)
        ),
        vlrLime: Number(r.vlrLime || 0),
        vlrConsignadoTotal: Number(r.vlrConsignadoTotal || 0),
        vlrCreditoParcelado: Number(r.vlrCreditoParcelado || 0),
      }
    })

    if (!currentRow) return fechamentos
    return [
      {
        ...currentRow,
        mesReferencia: mesAtualRef(),
        mesOrdem: gerarMesOrdem(mesAtualRef()),
        atual: true,
        pontosValor: Number(currentRow.pontos || 0),
        anteriorPontos: null,
        anteriorTrx: null,
        contasSemDeposito: Number(currentRow.qtdContasSemDeposito || 0),
        vlrLime: Number(currentRow.vlrLime || 0),
        vlrConsignadoTotal: Number(currentRow.vlrConsignadoTotal || 0),
        vlrCreditoParcelado: Number(currentRow.vlrCreditoParcelado || 0),
      },
      ...fechamentos,
    ]
  }, [rowsComPontos, currentRow])

  if (!userReady) {
    return (
      <section style={{ display: 'grid', gap: '1.25rem' }}>
        <p>Verificando acesso...</p>
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className="pill">Árvore Cronológica</span>
          <h1 className={styles.title}>Produção do Expresso</h1>
          <p className={styles.subtitle}>Acompanhe os fechamentos mensais e identifique rapidamente mudanças na produção.</p>
        </div>
        <button className={styles.backButton} onClick={() => router.back()}>← Voltar</button>
      </header>

      <section className={styles.identity} aria-label="Identificação do expresso">
        <div className={styles.identityName}>
          <span className={styles.eyebrow}>Expresso</span>
          <strong>{infoExpresso?.nome || `Chave ${chave}`}</strong>
          <span>{infoExpresso?.municipio || 'Município não informado'} · Chave {chave || '—'}</span>
        </div>
        <div className={styles.identityMeta}>
          <span><small>Agência / PACB</small><b>{infoExpresso?.agencia || '—'} / {infoExpresso?.pacb || '—'}</b></span>
          <span><small>Status</small><b>{infoExpresso?.statusAnalise || '—'}</b></span>
          <span><small>Certificação</small><b>{(infoExpresso as any)?.dtCertificacaoFormatada || '—'}</b></span>
        </div>
      </section>

      {currentLoading && <div className={styles.notice}>Carregando a produção de {mesAtualNome}...</div>}
      {currentError && <div className={`${styles.notice} ${styles.noticeError}`}>{currentError}</div>}
      {erro && <div className={`${styles.notice} ${styles.noticeError}`}>{erro}</div>}

      {comparacaoProdutos ? (
        <section className={styles.summary} aria-label="Resumo de desempenho">
          <div className={styles.summaryLead}>
            <span className={styles.eyebrow}>Comparativo comercial</span>
            <strong>Evolução dos produtos</strong>
            <span>{nomeMes(comparacaoProdutos.mesAtual)} × {nomeMes(comparacaoProdutos.mesAnterior)}</span>
            <small>Vendas e produtos, sem usar TRX para classificar o resultado.</small>
          </div>
          <div className={styles.summaryCounts}>
            <div className={styles.summaryMetric}>
              <span>Produtos que cresceram</span>
              <strong className={styles.positive}>{comparacaoProdutos.cresceu}</strong>
              <small>Valor ou quantidade maior</small>
            </div>
            <div className={styles.summaryMetric}>
              <span>Produtos que se mantiveram</span>
              <strong>{comparacaoProdutos.manteve}</strong>
              <small>Mesmo valor ou quantidade</small>
            </div>
            <div className={styles.summaryMetric}>
              <span>Produtos que caíram</span>
              <strong className={comparacaoProdutos.caiu ? styles.negative : ''}>{comparacaoProdutos.caiu}</strong>
              <small>Valor ou quantidade menor</small>
            </div>
          </div>
          <p className={styles.summaryNote}>
            Comparação dos dois fechamentos completos mais recentes. A base de {mesAtualNome} é parcial e não entra na classificação. {comparacaoProdutos.semProducao} produto(s) ficaram sem produção nos dois meses.
          </p>
          <div className={styles.comparisonGrid}>
            {comparacaoProdutos.produtos.map((produto) => (
              <article className={styles.comparisonCard} key={produto.nome}>
                <div className={styles.comparisonCardHead}>
                  <strong>{produto.nome}</strong>
                  <span className={`${styles.comparisonStatus} ${styles[`product_${produto.estado}`]}`}>
                    {produto.estado === 'up' ? 'Cresceu' : produto.estado === 'down' ? 'Caiu' : produto.estado === 'flat' ? 'Manteve' : 'Sem produção'}
                  </span>
                </div>
                <div className={styles.comparisonValues}>
                  <div><small>{nomeMes(comparacaoProdutos.mesAtual)}</small><b>{formatMetric(produto.valorAtual, produto.tipo)}</b></div>
                  <span aria-hidden="true">←</span>
                  <div><small>{nomeMes(comparacaoProdutos.mesAnterior)}</small><b>{formatMetric(produto.valorAnterior, produto.tipo)}</b></div>
                </div>
                <div className={`${styles.comparisonDelta} ${produto.estado === 'up' ? styles.positive : produto.estado === 'down' ? styles.negative : styles.muted}`}>
                  {produto.estado === 'none' ? 'Sem produção nos dois meses' : `${produto.diferenca > 0 ? '+' : ''}${formatMetric(produto.diferenca, produto.tipo)} · ${produto.percentual}`}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className={styles.summaryEmpty}>
          <strong>Ainda não há dois fechamentos para comparar os produtos.</strong>
          <span>Quando houver pelo menos dois meses históricos, cada produto será marcado como cresceu, manteve, caiu ou sem produção.</span>
        </section>
      )}

      {loading ? (
        <div className={styles.notice}>Carregando histórico mensal...</div>
      ) : !erro && rowsComPontos.length === 0 ? (
        <div className={styles.notice}>Nenhum histórico encontrado para este expresso.</div>
      ) : rowsComPontos.length > 0 ? (
        <>
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <div><span className={styles.eyebrow}>Tendência</span><h2>Visão mês a mês</h2></div>
              <span className={styles.sectionHint}>Pontuação comercial calculada a partir dos produtos</span>
            </div>
            <div className={styles.charts}>
              <div className={`${styles.chartCard} ${styles.chartCardWide}`}>
                <h3>Pontos de produção</h3>
                <div className={styles.chart}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 12, right: 12, left: -12, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="pontos" name="Pontos" fill="#b5122b" radius={[7, 7, 0, 0]} maxBarSize={54} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <div><span className={styles.eyebrow}>Histórico</span><h2>Fechamentos e produção</h2></div>
              <span className={styles.sectionHint}>TRX aparece nos detalhes de cada mês</span>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Período</th><th>Pontos comerciais</th><th>Variação</th><th>Detalhamento</th></tr></thead>
                <tbody>
                  {timelineItems.map((item: any) => (
                    <tr key={`${item.chave}-${item.mesReferencia}`}>
                      <th scope="row"><strong>{nomeMes(item.mesReferencia)}</strong><span className={item.atual ? styles.currentBadge : styles.closedBadge}>{item.atual ? 'Em andamento' : 'Fechado'}</span></th>
                      <td className={styles.numberCell}>{formatPontos(item.pontosValor)}</td>
                      <td>{item.atual || item.anteriorPontos === null ? <span className={styles.muted}>—</span> : <span className={item.pontosValor < item.anteriorPontos ? styles.negative : item.pontosValor > item.anteriorPontos ? styles.positive : styles.neutral}>{deltaLabel(item.pontosValor, item.anteriorPontos)} · {percentual(item.pontosValor, item.anteriorPontos)}</span>}</td>
                      <td><details className={styles.details}><summary>Produtos</summary><div className={styles.productGrid}>
                        <div><span>TRX (informativo)</span><b>{formatNum(item.trx)}</b></div>
                        <div><span>Contas sem depósito</span><b>{formatNum(item.contasSemDeposito)}</b></div>
                        <div><span>Contas com depósito</span><b>{formatNum(item.qtdContasComDeposito)}</b></div>
                        <div><span>Empréstimo pessoal</span><b>{formatCurrency(item.vlrLime)}</b></div>
                        <div><span>Consignado</span><b>{formatCurrency(item.vlrConsignadoTotal)}</b></div>
                        <div><span>Crédito parcelado</span><b>{formatCurrency(item.vlrCreditoParcelado)}</b></div>
                        <div><span>Microsseguro</span><b>{formatNum(item.qtdMicrosseguro)}</b></div>
                        <div><span>Viva Vida</span><b>{formatNum(item.qtdVivaVida)}</b></div>
                        <div><span>Plano odontológico</span><b>{formatNum(item.qtdPlanoOdonto)}</b></div>
                        <div><span>Super Protegido</span><b>{formatNum(item.qtdSuperProtegido)}</b></div>
                        <div><span>Seguro residencial</span><b>{formatNum(item.qtdSegResidencial)}</b></div>
                        <div><span>Seguro do cartão</span><b>{formatNum(item.qtdSegCartaoDeb)}</b></div>
                        <div><span>Expresso da Sorte (valor)</span><b>{formatCurrency(item.vlrExpSorte)}</b></div>
                        <div><span>Expresso da Sorte (qtd.)</span><b>{formatNum(item.qtdExpSorte)}</b></div>
                      </div></details></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.mobileTimeline}>
              {timelineItems.map((item: any) => (
                <article className={styles.monthCard} key={`mobile-${item.chave}-${item.mesReferencia}`}>
                  <div className={styles.monthCardHead}><div><strong>{nomeMes(item.mesReferencia)}</strong><span>{item.atual ? 'Produção parcial' : 'Fechamento'}</span></div><span className={item.atual ? styles.currentBadge : styles.closedBadge}>{item.atual ? 'Em andamento' : 'Fechado'}</span></div>
                  <div className={styles.mobileStats}><div><span>Pontos comerciais</span><b>{formatPontos(item.pontosValor)}</b></div><div><span>Contas com depósito</span><b>{formatNum(item.qtdContasComDeposito)}</b></div></div>
                  {!item.atual && item.anteriorPontos !== null && <p className={item.pontosValor < item.anteriorPontos ? styles.negative : item.pontosValor > item.anteriorPontos ? styles.positive : styles.neutral}>Pontos: {deltaLabel(item.pontosValor, item.anteriorPontos)} · {percentual(item.pontosValor, item.anteriorPontos)}</p>}
                  <details className={styles.details}><summary>Ver produtos e contas</summary><div className={styles.productGrid}>
                    <div><span>TRX (informativo)</span><b>{formatNum(item.trx)}</b></div><div><span>Contas sem depósito</span><b>{formatNum(item.contasSemDeposito)}</b></div><div><span>Contas com depósito</span><b>{formatNum(item.qtdContasComDeposito)}</b></div><div><span>Empréstimo pessoal</span><b>{formatCurrency(item.vlrLime)}</b></div><div><span>Consignado</span><b>{formatCurrency(item.vlrConsignadoTotal)}</b></div><div><span>Crédito parcelado</span><b>{formatCurrency(item.vlrCreditoParcelado)}</b></div><div><span>Microsseguro</span><b>{formatNum(item.qtdMicrosseguro)}</b></div><div><span>Viva Vida</span><b>{formatNum(item.qtdVivaVida)}</b></div><div><span>Plano odontológico</span><b>{formatNum(item.qtdPlanoOdonto)}</b></div><div><span>Super Protegido</span><b>{formatNum(item.qtdSuperProtegido)}</b></div><div><span>Seguro residencial</span><b>{formatNum(item.qtdSegResidencial)}</b></div><div><span>Seguro do cartão</span><b>{formatNum(item.qtdSegCartaoDeb)}</b></div><div><span>Expresso da Sorte (valor)</span><b>{formatCurrency(item.vlrExpSorte)}</b></div><div><span>Expresso da Sorte (qtd.)</span><b>{formatNum(item.qtdExpSorte)}</b></div>
                  </div></details>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </section>
  )
}
