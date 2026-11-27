'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { getBytes, ref } from 'firebase/storage'
import { auth, db, storage } from '@/lib/firebase'
import styles from './AnaliseProducao.module.css'

type Registro = Record<string, unknown>
type Unidade = 'count' | 'money'
type Produto = { nome: string; unidade: Unidade; anterior: number; atual: number; extraAnterior?: number; extraAtual?: number }

const BASE_ATUAL = 'base-lojas/banco.csv'
const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'

function normalizar(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function numero(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const raw = String(value ?? '').trim()
  if (!raw) return 0
  const parsed = Number(raw.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function obter(registro: Registro, ...chaves: string[]) {
  const campos = new Map(Object.entries(registro).map(([key, value]) => [normalizar(key), value]))
  for (const chave of chaves) {
    const value = campos.get(normalizar(chave))
    if (value !== undefined && value !== null && value !== '') return numero(value)
  }
  return 0
}

function totalConsignado(registro: Registro) {
  const total = obter(registro, 'vlrConsignadoTotal', 'vlr_consignado_total', 'valor consignado total', 'consignado total')
  if (total) return total
  return obter(registro, 'vlrConsignadoInss', 'vlr_consignado_inss', 'valor consignado inss') +
    obter(registro, 'vlrConsignadoPub', 'vlr_consignado_pub', 'valor consignado publico', 'valor consignado público') +
    obter(registro, 'vlrConsignadoPriv', 'vlr_consignado_priv', 'valor consignado privado')
}

function obterTexto(registro: Registro, ...chaves: string[]) {
  const campos = new Map(Object.entries(registro).map(([key, value]) => [normalizar(key), value]))
  for (const chave of chaves) {
    const value = campos.get(normalizar(chave))
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim()
  }
  return ''
}

function separarLinha(line: string, delimiter: string) {
  const values: string[] = []
  let value = ''
  let quoted = false
  for (let index = 0; index < line.length; index++) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index++ }
      else quoted = !quoted
    } else if (char === delimiter && !quoted) {
      values.push(value); value = ''
    } else value += char
  }
  values.push(value)
  return values
}

function lerCsv(text: string): Registro[] {
  const lines = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((line) => line.trim())
  if (!lines.length) return []
  const delimiter = [';', ',', '\t'].reduce((best, candidate) =>
    lines[0].split(candidate).length > lines[0].split(best).length ? candidate : best, ',')
  const headers = separarLinha(lines[0], delimiter)
  return lines.slice(1).map((line) => {
    const values = separarLinha(line, delimiter)
    return Object.fromEntries(headers.map((header, index) => [header.trim(), (values[index] ?? '').trim()]))
  })
}

function referenciaMesAtual(date = new Date()) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}

function referenciaMesAnterior(date = new Date()) {
  const anterior = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  return `${String(anterior.getMonth() + 1).padStart(2, '0')}/${anterior.getFullYear()}`
}

function nomeMes(reference: string) {
  const [month, year] = reference.split('/')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
}

function formatar(value: number, unit: Unidade) {
  return new Intl.NumberFormat('pt-BR', unit === 'money'
    ? { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }
    : { maximumFractionDigits: 0 }).format(value)
}

function percentual(atual: number, anterior: number) {
  if (!anterior) return atual ? 'novo' : '0%'
  const value = ((atual - anterior) / anterior) * 100
  return `${value > 0 ? '+' : ''}${value.toFixed(1).replace('.', ',')}%`
}

function agregar(registros: Registro[]): Produto[] {
  const medidas: { nome: string; unidade: Unidade; chaves: string[]; extra?: string[] }[] = [
    { nome: 'Contas abertas', unidade: 'count', chaves: ['qtdContas', 'qtd_contas'] },
    { nome: 'Contas com depósito', unidade: 'count', chaves: ['qtdContasComDeposito', 'qtd_contas_com_deposito'] },
    { nome: 'Contas sem depósito', unidade: 'count', chaves: ['qtdContasSemDeposito', 'qtd_contas_sem_deposito'] },
    { nome: 'Cesta de serviços', unidade: 'count', chaves: ['qtdCestaServ', 'qtd_cesta_serv'] },
    { nome: 'Super Protegido', unidade: 'count', chaves: ['qtdSuperProtegido', 'qtd_super_protegido'] },
    { nome: 'Mobilidade', unidade: 'count', chaves: ['qtdMobilidade', 'qtd_mobilidade'] },
    { nome: 'Cartão emitido', unidade: 'count', chaves: ['qtdCartaoEmitido', 'qtd_cartao_emitido'] },
    { nome: 'Cheque especial contratado', unidade: 'count', chaves: ['qtdChesContratado', 'qtd_chesp_contratado'] },
    { nome: 'LIME na abertura de conta', unidade: 'count', chaves: ['qtdLimeAbConta', 'qtd_lime_ab_conta'] },
    { nome: 'Empréstimo pessoal', unidade: 'money', chaves: ['vlrLime', 'vlr_lime'], extra: ['qtdLime', 'qtd_lime'] },
    { nome: 'Consignado', unidade: 'money', chaves: ['vlrConsignadoTotal', 'vlr_consignado_total'], extra: ['qtdConsignado', 'qtd_consignado'] },
    { nome: 'Consignado INSS', unidade: 'money', chaves: ['vlrConsignadoInss', 'vlr_consignado_inss'] },
    { nome: 'Consignado público', unidade: 'money', chaves: ['vlrConsignadoPub', 'vlr_consignado_pub'] },
    { nome: 'Consignado privado', unidade: 'money', chaves: ['vlrConsignadoPriv', 'vlr_consignado_priv'] },
    { nome: 'Crédito parcelado', unidade: 'money', chaves: ['vlrCreditoParcelado', 'vlr_credito_parcel'], extra: ['qtdCreditoParcelado', 'qtd_credito_parcel'] },
    { nome: 'Microsseguro', unidade: 'count', chaves: ['qtdMicrosseguro', 'qtd_microsseguro'] },
    { nome: 'Viva Vida', unidade: 'count', chaves: ['qtdVivaVida', 'qtd_micro_vivavida'] },
    { nome: 'Plano odontológico', unidade: 'count', chaves: ['qtdPlanoOdonto', 'qtd_plano_odonto'] },
    { nome: 'Seguro residencial', unidade: 'count', chaves: ['qtdSegResidencial', 'qtd_seg_residencial'] },
    { nome: 'Seguro do cartão', unidade: 'count', chaves: ['qtdSegCartaoDeb', 'qtd_seg_cartao_deb'] },
    { nome: 'Expresso da Sorte', unidade: 'money', chaves: ['vlrExpSorte', 'vlr_exp_sorte'], extra: ['qtdExpSorte', 'qtd_exp_sorte'] },
  ]

  return medidas.map((medida) => ({
    nome: medida.nome,
    unidade: medida.unidade,
    anterior: registros.reduce((total, row) => total + (medida.nome === 'Consignado' ? totalConsignado(row) : obter(row, ...medida.chaves)), 0),
    atual: 0,
    ...(medida.extra ? { extraAnterior: registros.reduce((total, row) => total + obter(row, ...medida.extra!), 0), extraAtual: 0 } : {}),
  }))
}

function agregarAtual(produtosFechamento: Produto[], registrosAtuais: Registro[]) {
  const catalogo = new Map([
    ['Contas abertas', ['qtd_contas', 'qtd contas']],
    ['Contas com depósito', ['qtd_contas_com_deposito', 'qtd contas com deposito']],
    ['Contas sem depósito', ['qtd_contas_sem_deposito', 'qtd contas sem deposito']],
    ['Cesta de serviços', ['qtd_cesta_serv', 'qtd cesta serv']],
    ['Super Protegido', ['qtd_super_protegido', 'qtd super protegido', 'qtd_superprotegido']],
    ['Mobilidade', ['qtd_mobilidade', 'qtd mobilidade']],
    ['Cartão emitido', ['qtd_cartao_emitido', 'qtd cartao emitido']],
    ['Cheque especial contratado', ['qtd_chesp_contratado', 'qtd chesp contratado']],
    ['LIME na abertura de conta', ['qtd_lime_ab_conta', 'qtd lime ab conta']],
    ['Empréstimo pessoal', ['vlr_lime', 'valor do lime', 'valor lime']],
    ['Consignado', ['vlr_consignado_total', 'valor consignado total', 'consignado total']],
    ['Consignado INSS', ['vlr_consignado_inss', 'valor consignado inss']],
    ['Consignado público', ['vlr_consignado_pub', 'valor consignado publico', 'valor consignado público']],
    ['Consignado privado', ['vlr_consignado_priv', 'valor consignado privado']],
    ['Crédito parcelado', ['vlr_credito_parcel', 'valor credito parcelado', 'valor crédito parcelado']],
    ['Microsseguro', ['qtd_microsseguro', 'qtd microsseguro']],
    ['Viva Vida', ['qtd_micro_vivavida', 'qtd micro vivavida', 'viva vida']],
    ['Plano odontológico', ['qtd_plano_odonto', 'qtd plano odonto', 'odonto']],
    ['Seguro residencial', ['qtd_seg_residencial', 'qtd seg residencial']],
    ['Seguro do cartão', ['qtd_seg_cartao_deb', 'qtd seg cartao deb', 'qtd_seg_cartao']],
    ['Expresso da Sorte', ['vlr_exp_sorte', 'vlr exp sorte', 'valor exp sorte', 'vlr_expsorte']],
  ])
  const extraCatalogo = new Map([
    ['Empréstimo pessoal', ['qtd_lime', 'qtd lime']],
    ['Consignado', ['qtd_consignado', 'qtd consignado']],
    ['Crédito parcelado', ['qtd_credito_parcel_dtlhes', 'qtd_credito_parcelado_dtlhes', 'qtd_credito_parcel', 'credito parcelado']],
    ['Expresso da Sorte', ['qtd_exp_sorte', 'qtd exp sorte']],
  ])
  return produtosFechamento.map((produto) => ({
    ...produto,
    atual: registrosAtuais.reduce((total, row) => {
      if (produto.nome === 'Contas sem depósito' && obter(row, 'qtd_contas_sem_deposito', 'qtd contas sem deposito') === 0) {
        return total + Math.max(0, obter(row, 'qtd_contas', 'qtd contas') - obter(row, 'qtd_contas_com_deposito', 'qtd contas com deposito'))
      }
      if (produto.nome === 'Consignado') return total + totalConsignado(row)
      return total + obter(row, ...(catalogo.get(produto.nome) || []))
    }, 0),
    ...(extraCatalogo.has(produto.nome) ? { extraAtual: registrosAtuais.reduce((total, row) => total + obter(row, ...(extraCatalogo.get(produto.nome) || [])), 0) } : {}),
  }))
}

export default function AnaliseProducaoPage() {
  const router = useRouter()
  const [autenticado, setAutenticado] = useState(false)
  const [verificacaoAcessoConcluida, setVerificacaoAcessoConcluida] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [quantidadeFechamento, setQuantidadeFechamento] = useState(0)
  const [quantidadeAtual, setQuantidadeAtual] = useState(0)
  const mesAtual = useMemo(() => referenciaMesAtual(), [])
  const mesAnterior = useMemo(() => referenciaMesAnterior(), [])

  useEffect(() => onAuthStateChanged(auth, (user) => {
    if (!user) router.push('/login')
    else setAutenticado(user.email?.trim().toLowerCase() === ADMIN_EMAIL)
    setVerificacaoAcessoConcluida(true)
  }), [router])

  useEffect(() => {
    if (!autenticado) return
    let ativa = true
    async function carregar() {
      setCarregando(true)
      setErro('')
      try {
        const bytes = await getBytes(ref(storage, BASE_ATUAL))
        const atual = lerCsv(new TextDecoder('utf-8').decode(bytes))
        const chaves = [...new Set(atual
          .map((registro) => obterTexto(registro, 'chave_loja', 'chave loja', 'chave'))
          .filter(Boolean))]
        const fechamento: Registro[] = []
        const mesDocumento = mesAnterior.replace('/', '-')
        for (let inicio = 0; inicio < chaves.length; inicio += 40) {
          const lote = chaves.slice(inicio, inicio + 40)
          const documentos = await Promise.all(lote.map((chave) =>
            getDoc(doc(db, 'arvorecronologica', chave, 'meses', mesDocumento))))
          fechamento.push(...documentos
            .filter((documento) => documento.exists())
            .map((documento) => documento.data() as Registro))
        }
        if (!fechamento.length) throw new Error(`Não encontrei fechamentos de ${nomeMes(mesAnterior)} na Árvore Cronológica.`)
        const baseFechada = agregar(fechamento)
        const comparativo = agregarAtual(baseFechada, atual)
        if (ativa) {
          setProdutos(comparativo)
          setQuantidadeFechamento(fechamento.length)
          setQuantidadeAtual(atual.length)
        }
      } catch (cause) {
        console.error(cause)
        if (ativa) setErro(cause instanceof Error ? cause.message : 'Não consegui carregar as bases de produção.')
      } finally {
        if (ativa) setCarregando(false)
      }
    }
    void carregar()
    return () => { ativa = false }
  }, [autenticado, mesAnterior])

  const totais = useMemo(() => ({
    cresceu: produtos.filter((produto) => produto.atual > produto.anterior).length,
    caiu: produtos.filter((produto) => produto.atual < produto.anterior).length,
    manteve: produtos.filter((produto) => produto.atual === produto.anterior).length,
  }), [produtos])

  if (!verificacaoAcessoConcluida) return <section><p>Verificando acesso...</p></section>
  if (!autenticado) return <section className={styles.accessDenied}><span className="pill">Acesso restrito</span><h1>Esta análise é exclusiva do administrador</h1><p>Acesse com o e-mail administrador autorizado para consultar a produção consolidada.</p><button type="button" onClick={() => router.push('/dashboard/expressos')} className={styles.back}>← Voltar aos relatórios</button></section>

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><span className="pill">Análise geral de produção</span><h1>Produção da rede de Expressos</h1><p>Compare o mês atual, atualizado pela base diária, com o último fechamento mensal.</p></div>
        <button type="button" onClick={() => router.push('/dashboard/expressos')} className={styles.back}>← Relatórios de Expressos</button>
      </header>

      <section className={styles.period}>
        <div><small>Produção parcial</small><strong>{nomeMes(mesAtual)}</strong><span>Base diária · {quantidadeAtual.toLocaleString('pt-BR')} registros</span></div>
        <b className={styles.periodArrow}>×</b>
        <div><small>Último fechamento</small><strong>{nomeMes(mesAnterior)}</strong><span>Fechamento mensal · {quantidadeFechamento.toLocaleString('pt-BR')} Expressos</span></div>
      </section>

      {carregando && <div className={styles.message}>Carregando e somando os dados de toda a rede…</div>}
      {erro && <div className={`${styles.message} ${styles.error}`}>{erro}<small>Se aparecer permission-denied, verifique a permissão de leitura autenticada dos documentos em arvorecronologica/{'{chave}'}/meses/{'{mesId}'} nas regras do Firestore.</small></div>}

      {!carregando && !erro && (
        <>
          <section className={styles.summary}>
            <article><span>Produtos acima do fechamento</span><strong className={styles.up}>{totais.cresceu}</strong></article>
            <article><span>Produtos abaixo do fechamento</span><strong className={styles.down}>{totais.caiu}</strong></article>
            <article><span>Produtos no mesmo nível</span><strong>{totais.manteve}</strong></article>
          </section>

          <section className={styles.products}>
            <div className={styles.sectionTitle}><div><span>Consolidado de todos os Expressos</span><h2>Variação por produto</h2></div><p>↑ Cresceu · ↓ Caiu · → Manteve</p></div>
            <div className={styles.tableWrap}>
              <table>
                <thead><tr><th>Produto</th><th>{nomeMes(mesAtual)} · parcial</th><th>{nomeMes(mesAnterior)} · fechamento</th><th>Diferença</th><th>Variação</th><th>Leitura</th></tr></thead>
                <tbody>{produtos.map((produto) => {
                  const delta = produto.atual - produto.anterior
                  const estado = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
                  const deltaText = `${delta > 0 ? '+' : ''}${formatar(delta, produto.unidade)}`
                  return <tr key={produto.nome}>
                    <th scope="row">{produto.nome}</th>
                    <td><strong>{formatar(produto.atual, produto.unidade)}</strong>{produto.extraAtual !== undefined && <small>{formatar(produto.extraAtual, 'count')} operações</small>}</td>
                    <td>{formatar(produto.anterior, produto.unidade)}{produto.extraAnterior !== undefined && <small>{formatar(produto.extraAnterior, 'count')} operações</small>}</td>
                    <td className={styles[estado]}>{deltaText}</td>
                    <td>{percentual(produto.atual, produto.anterior)}</td>
                    <td><span className={`${styles.status} ${styles[`status_${estado}`]}`}>{estado === 'up' ? '↑ Acima' : estado === 'down' ? '↓ Abaixo' : '→ Igual'}</span></td>
                  </tr>
                })}</tbody>
              </table>
            </div>
            <p className={styles.note}>A produção do mês atual é parcial e o fechamento anterior representa o mês completo; use a comparação como acompanhamento de ritmo. Os valores atuais refletem a última versão diária da base banco.csv.</p>
          </section>
        </>
      )}
    </main>
  )
}
