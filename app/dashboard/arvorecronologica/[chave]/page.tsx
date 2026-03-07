'use client'

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db, storage } from '@/lib/firebase'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { getBytes, ref } from 'firebase/storage'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
  qtdCestaServ?: number
  qtdSuperProtegido?: number
  qtdMobilidade?: number
  qtdLime?: number
  qtdConsignado?: number
  qtdCreditoParcelado?: number
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
        setRows(lista)
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
      pontosCalculados: calcPontos({
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
      }),
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
      contaSemDeposito: Number(r.qtdContas || 0),
      contaComDeposito: Number(r.qtdContasComDeposito || 0),
      consignado: Number(r.qtdConsignado || 0),
      emprestimoPessoal: Number(r.qtdLime || 0),
      planoOdonto: Number(r.qtdPlanoOdonto || 0),
      microsseguro: Number(r.qtdMicrosseguro || 0),
      vivaVida: Number(r.qtdVivaVida || 0),
      sorteExpressa: Number(r.qtdExpSorte || 0),
    }))

    if (currentRow) {
      const refAtual = mesAtualRef()
      const idx = historico.findIndex((item) => item.mes === refAtual)

      const atualGrafico = {
        mes: refAtual,
        contaSemDeposito: Number(currentRow.qtdContas || 0),
        contaComDeposito: Number(currentRow.qtdContasComDeposito || 0),
        consignado: Number(currentRow.qtdConsignado || 0),
        emprestimoPessoal: Number(currentRow.qtdLime || 0),
        planoOdonto: Number(currentRow.qtdPlanoOdonto || 0),
        microsseguro: Number(currentRow.qtdMicrosseguro || 0),
        vivaVida: Number(currentRow.qtdVivaVida || 0),
        sorteExpressa: Number(currentRow.qtdExpSorte || 0),
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

  const mesAtualNome = useMemo(() => nomeMes(mesAtualRef()), [])

  if (!userReady) {
    return (
      <section style={{ display: 'grid', gap: '1.25rem' }}>
        <p>Verificando acesso...</p>
      </section>
    )
  }

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <span className="pill">Árvore Cronológica</span>
          <h1 className="h1" style={{ marginTop: '.75rem' }}>
            🌳 Evolução do Expresso
          </h1>
          <p className="p-muted" style={{ marginTop: '.35rem' }}>
            Acompanhe a evolução mensal de produção, pontos e indicadores do expresso.
          </p>
        </div>

        <button
          onClick={() => router.back()}
          style={{
            borderRadius: 999,
            padding: '.55rem .9rem',
            fontSize: '.9rem',
            fontWeight: 900,
            border: '1px solid rgba(15,15,25,.18)',
            background: 'rgba(255,255,255,.92)',
            color: 'rgba(16,16,24,.92)',
            boxShadow: '0 10px 18px rgba(10,10,20,.06)',
            cursor: 'pointer',
          }}
        >
          ← Voltar
        </button>
      </div>

      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <div>
            <div className="p-muted" style={{ fontSize: 12 }}>
              Chave do Expresso
            </div>
            <div style={{ fontWeight: 900, fontSize: '1.08rem' }}>
              {chave || '—'}
            </div>
          </div>

          <div>
            <span className="pill">Histórico mensal</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <span className="pill">Resumo atual</span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '.75rem',
          }}
        >
          <InfoBox label="Nome do Expresso" value={infoExpresso?.nome || '—'} />
          <InfoBox label="Município" value={infoExpresso?.municipio || '—'} />
          <InfoBox
            label="Agência / PACB"
            value={`${infoExpresso?.agencia || '—'} / ${infoExpresso?.pacb || '—'}`}
          />
          <InfoBox label="Status Análise" value={infoExpresso?.statusAnalise || '—'} />
          <InfoBox label="Certificação" value={(infoExpresso as any)?.dtCertificacaoFormatada || '—'} />
          <InfoBox
            label="Pontos (regra da Geral)"
            value={formatPontos(currentRow ? currentRow.pontos : (infoExpresso as any)?.pontosCalculados)}
          />
        </div>
      </div>

      {currentLoading ? (
        <div className="card-soft">
          <p className="p-muted">Carregando produção atual do mês corrente...</p>
        </div>
      ) : currentError ? (
        <div className="card-soft" style={{ borderColor: 'rgba(214,31,44,.25)' }}>
          <p className="p-muted" style={{ color: 'rgba(214,31,44,.95)', fontWeight: 800 }}>
            {currentError}
          </p>
        </div>
      ) : currentRow ? null : (
        <div className="card-soft">
          <p className="p-muted">Não encontrei este expresso na base atual do mês corrente.</p>
        </div>
      )}

      {loading ? (
        <div className="card-soft">
          <p className="p-muted">Carregando árvore cronológica...</p>
        </div>
      ) : erro ? (
        <div className="card-soft" style={{ borderColor: 'rgba(214,31,44,.25)' }}>
          <p className="p-muted" style={{ color: 'rgba(214,31,44,.95)', fontWeight: 800 }}>
            {erro}
          </p>
        </div>
      ) : rowsComPontos.length === 0 ? (
        <div className="card-soft">
          <p className="p-muted">Nenhum histórico encontrado para este expresso.</p>
        </div>
      ) : (
        <>
          <div className="card" style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <span className="pill">Gráfico</span>
              <h2 className="h2" style={{ marginTop: '.6rem' }}>
                Evolução mensal dos produtos
              </h2>
            </div>

            <div
              className="card-soft"
              style={{
                width: '100%',
                height: 460,
                padding: '1rem',
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={8} barCategoryGap="18%">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="contaSemDeposito" name="Conta sem Depósito" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="contaComDeposito" name="Conta com Depósito" fill="#60a5fa" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="consignado" name="Consignado" fill="#16a34a" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="emprestimoPessoal" name="Empréstimo Pessoal" fill="#0f766e" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="planoOdonto" name="Plano Odonto" fill="#7a1ea1" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="microsseguro" name="Microsseguro" fill="#d61f2c" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="vivaVida" name="Viva Vida" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="sorteExpressa" name="Sorte Expressa" fill="#1d4ed8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <span className="pill">Linha do tempo</span>

            <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
              {currentRow && (
                <div className="card-soft" style={{ display: 'grid', gap: '.85rem' }}>
                  <div>
                    <div className="p-muted" style={{ fontSize: 12 }}>
                      Mês de referência
                    </div>

                    <div style={{ fontWeight: 900, fontSize: '1.05rem' }}>
                      {mesAtualRef()}
                    </div>

                    <div className="p-muted" style={{ fontSize: 13 }}>
                      {mesAtualNome} • produção atual
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                    <span className="pill">TRX: {formatNum(currentRow.trx)}</span>
                    <span className="pill">Pontos: {formatPontos(currentRow.pontos)}</span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '.7rem',
                    }}
                  >
                    <InfoBox label="TRX" value={formatNum(currentRow.trx)} />
                    <InfoBox label="Pontos" value={formatPontos(currentRow.pontos)} />
                    <InfoBox label="Conta sem Depósito" value={formatNum(currentRow.qtdContas)} />
                    <InfoBox label="Conta com Depósito" value={formatNum(currentRow.qtdContasComDeposito)} />
                    <InfoBox label="Consignado" value={formatNum(currentRow.qtdConsignado)} />
                    <InfoBox label="Empréstimo Pessoal" value={formatNum(currentRow.qtdLime)} />
                    <InfoBox label="Plano Odonto" value={formatNum(currentRow.qtdPlanoOdonto)} />
                    <InfoBox label="Microsseguro" value={formatNum(currentRow.qtdMicrosseguro)} />
                    <InfoBox label="Viva Vida" value={formatNum(currentRow.qtdVivaVida)} />
                    <InfoBox label="Sorte Expressa" value={formatNum(currentRow.qtdExpSorte)} />
                    <InfoBox label="Status Análise" value={currentRow.statusAnalise || '—'} />
                  </div>
                </div>
              )}

              {[...rowsComPontos]
                .sort((a, b) => b.mesOrdem - a.mesOrdem)
                .map((r, index, arrDesc) => {
                  const anterior = arrDesc[index + 1]

                  return (
                    <div
                      key={`${r.chave}-${r.mesReferencia}`}
                      className="card-soft"
                      style={{ display: 'grid', gap: '.85rem' }}
                    >
                      <div>
                        <div className="p-muted" style={{ fontSize: 12 }}>
                          Mês de referência
                        </div>

                        <div style={{ fontWeight: 900, fontSize: '1.05rem' }}>
                          {r.mesReferencia}
                        </div>

                        <div className="p-muted" style={{ fontSize: 13 }}>
                          {nomeMes(r.mesReferencia)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                        <span className="pill">TRX: {formatNum(r.trx)}</span>
                        <span className="pill">Pontos: {formatPontos((r as any).pontosCalculados)}</span>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: '.7rem',
                        }}
                      >
                        <InfoBox
                          label="TRX"
                          value={formatNum(r.trx)}
                          extra={
                            anterior ? (
                              <span className="pill" style={deltaStyle(r.trx, anterior.trx)}>
                                {deltaLabel(r.trx, anterior.trx)}
                              </span>
                            ) : null
                          }
                        />

                        <InfoBox
                          label="Pontos"
                          value={formatPontos((r as any).pontosCalculados)}
                          extra={
                            anterior ? (
                              <span
                                className="pill"
                                style={deltaStyle((r as any).pontosCalculados, (anterior as any).pontosCalculados)}
                              >
                                {deltaLabel((r as any).pontosCalculados, (anterior as any).pontosCalculados)}
                              </span>
                            ) : null
                          }
                        />

                        <InfoBox
                          label="Conta sem Depósito"
                          value={formatNum(r.qtdContas)}
                          extra={
                            anterior ? (
                              <span className="pill" style={deltaStyle(r.qtdContas, anterior.qtdContas)}>
                                {deltaLabel(r.qtdContas, anterior.qtdContas)}
                              </span>
                            ) : null
                          }
                        />

                        <InfoBox
                          label="Conta com Depósito"
                          value={formatNum(r.qtdContasComDeposito)}
                          extra={
                            anterior ? (
                              <span className="pill" style={deltaStyle(r.qtdContasComDeposito, anterior.qtdContasComDeposito)}>
                                {deltaLabel(r.qtdContasComDeposito, anterior.qtdContasComDeposito)}
                              </span>
                            ) : null
                          }
                        />

                        <InfoBox
                          label="Consignado"
                          value={formatNum(r.qtdConsignado)}
                          extra={
                            anterior ? (
                              <span className="pill" style={deltaStyle(r.qtdConsignado, anterior.qtdConsignado)}>
                                {deltaLabel(r.qtdConsignado, anterior.qtdConsignado)}
                              </span>
                            ) : null
                          }
                        />

                        <InfoBox label="Empréstimo Pessoal" value={formatNum(r.qtdLime)} />
                        <InfoBox label="Plano Odonto" value={formatNum(r.qtdPlanoOdonto)} />
                        <InfoBox label="Microsseguro" value={formatNum(r.qtdMicrosseguro)} />
                        <InfoBox label="Viva Vida" value={formatNum(r.qtdVivaVida)} />
                        <InfoBox label="Sorte Expressa" value={formatNum(r.qtdExpSorte)} />
                        <InfoBox label="Status Análise" value={r.statusAnalise || '—'} />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

function InfoBox({
  label,
  value,
  extra,
}: {
  label: string
  value: string
  extra?: ReactNode
}) {
  return (
    <div className="card-soft" style={{ padding: '.85rem .95rem' }}>
      <div className="p-muted" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div style={{ fontWeight: 900, marginTop: '.2rem' }}>{value}</div>
      {extra && <div style={{ marginTop: '.45rem' }}>{extra}</div>}
    </div>
  )
}