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
import {
  collection,
  doc,
  endAt,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAt,
  writeBatch,
} from 'firebase/firestore'
import * as XLSX from 'xlsx'

import { auth, db, storage } from '@/lib/firebase'
import {
  calcPontosContasExpressoGeral,
  calcPontosExpressoGeral,
} from '@/lib/pontuacao-junho-2026'

const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'
const CSV_PATH = 'base-lojas/banco-junho-2026.csv'
const EXPRESSOS_COLLECTION = 'expressos_registro_junho_2026'
const EXPRESSOS_COLLECTION_ANTIGA = 'expressos_registro'
const RESUMO_EXPRESSOS_DOC = 'resumo_expressos_junho_2026'
const LIMIT_NO_SEARCH = 10

// MÓDULO TEMPORÁRIO — CAMPANHA GOLEADA DE PRÊMIOS
// Quando a campanha acabar, basta remover este bloco e os pontos marcados com "GOLEADA DE PRÊMIOS".
const CAMPANHA_GOLEADA_ATIVA = true
const CAMPANHA_GOLEADA_NOME = 'Goleada de Prêmios'
const CAMPANHA_GOLEADA_GRUPO_PADRAO = 'GRUPO 1 - ZERADO'
const CAMPANHA_GOLEADA_DADOS = [
  {"chave": "403760", "nome": "LUME", "grupo": "GRUPO ELITE"},
  {"chave": "237558", "nome": "SABOR E VIDA", "grupo": "GRUPO ELITE"},
  {"chave": "84503", "nome": "FARMACIA SANTO ANTONIO", "grupo": "GRUPO ELITE"},
  {"chave": "87253", "nome": "FANATICOS", "grupo": "GRUPO COM VENDAS"},
  {"chave": "88538", "nome": "LR MULTIMARCAS", "grupo": "GRUPO COM VENDAS"},
  {"chave": "85102", "nome": "TACY PAPELARIA E VARIEDADES", "grupo": "GRUPO COM VENDAS"},
  {"chave": "224490", "nome": "HL DIGITAL", "grupo": "GRUPO COM VENDAS"},
  {"chave": "171740", "nome": "DI CHERRY", "grupo": "GRUPO COM VENDAS"},
  {"chave": "237606", "nome": "NS BEAUTY", "grupo": "GRUPO COM VENDAS"},
  {"chave": "160402", "nome": "LOJA Z", "grupo": "GRUPO COM VENDAS"},
  {"chave": "174090", "nome": "JAM MODAS E ACESSORIOS", "grupo": "GRUPO COM VENDAS"},
  {"chave": "92045", "nome": "IMPERIAL CALCADOS", "grupo": "GRUPO COM VENDAS"},
  {"chave": "420353", "nome": "EMPORIO SABOR   VIDA", "grupo": "GRUPO COM VENDAS"},
  {"chave": "223255", "nome": "COMERCIAL MATOS", "grupo": "GRUPO COM VENDAS"},
  {"chave": "85510", "nome": "MERCEARIA BOM PRECO", "grupo": "GRUPO COM VENDAS"},
  {"chave": "116245", "nome": "LOJA Z", "grupo": "GRUPO COM VENDAS"},
  {"chave": "158091", "nome": "BELLA CASA MOVEIS E ELETRODOMESTICOS", "grupo": "GRUPO COM VENDAS"},
  {"chave": "46275", "nome": "FARMACIA PARA TODOS", "grupo": "GRUPO COM VENDAS"},
  {"chave": "118172", "nome": "UNIVERSO DAS CORES", "grupo": "GRUPO COM VENDAS"},
  {"chave": "160105", "nome": "MLM MATERIAL DE CONSTRUCAO", "grupo": "GRUPO COM VENDAS"},
  {"chave": "79777", "nome": "SANTIAGO CICLOS", "grupo": "GRUPO COM VENDAS"},
  {"chave": "200832", "nome": "DALETE VARIEDADES", "grupo": "GRUPO COM VENDAS"},
  {"chave": "416908", "nome": "Otica Flor De Lis", "grupo": "GRUPO COM VENDAS"},
  {"chave": "117003", "nome": "COMERCIAL ESPORA DE OURO", "grupo": "GRUPO COM VENDAS"},
  {"chave": "38133", "nome": "FARMACIA RODRIGUES", "grupo": "GRUPO COM VENDAS"},
  {"chave": "416775", "nome": "Cl. Materiais De Construcao", "grupo": "GRUPO COM VENDAS"},
  {"chave": "207202", "nome": "SUPERMERCADO DURANS", "grupo": "GRUPO COM VENDAS"},
  {"chave": "130578", "nome": "DEDEL LASER", "grupo": "GRUPO COM VENDAS"},
  {"chave": "222748", "nome": "ESPORTE BRASIL", "grupo": "GRUPO COM VENDAS"},
  {"chave": "26613", "nome": "LOJA MURITIBANA", "grupo": "GRUPO COM VENDAS"},
  {"chave": "248435", "nome": "ATACADAO DA LIMPEZA", "grupo": "GRUPO COM VENDAS"},
  {"chave": "116855", "nome": "PHILISOM", "grupo": "GRUPO COM VENDAS"},
  {"chave": "51238", "nome": "SAO JORGE MATERIAIS DE CONSTRUCAO", "grupo": "GRUPO COM VENDAS"},
  {"chave": "163036", "nome": "KANARIO MOVEIS", "grupo": "GRUPO COM VENDAS"},
  {"chave": "118513", "nome": "CASA UTIL PAPELARIA E VARIEDADES", "grupo": "GRUPO COM VENDAS"},
  {"chave": "417871", "nome": "Lu Cosmeticos", "grupo": "GRUPO COM VENDAS"},
  {"chave": "405881", "nome": "Construhome Materiais De Construcao", "grupo": "GRUPO COM VENDAS"},
  {"chave": "160140", "nome": "CASA DO FRANGO E CIA", "grupo": "GRUPO COM VENDAS"},
  {"chave": "415068", "nome": "CONSTRUAGRO", "grupo": "GRUPO COM VENDAS"},
  {"chave": "417848", "nome": "Constrular Sjv Materiais Para Construcao", "grupo": "GRUPO COM VENDAS"},
  {"chave": "178263", "nome": "MERCADAO DA MODA", "grupo": "GRUPO COM VENDAS"},
  {"chave": "414403", "nome": "Farmacia Tropical Trancoso", "grupo": "GRUPO COM VENDAS"},
  {"chave": "239666", "nome": "RAIZ DE DAVI", "grupo": "GRUPO COM VENDAS"},
  {"chave": "63321", "nome": "ESPACO CULTURAL", "grupo": "GRUPO COM VENDAS"},
  {"chave": "76368", "nome": "L E MODA FASHION", "grupo": "GRUPO COM VENDAS"},
  {"chave": "166211", "nome": "ARMAZEM MACEDO", "grupo": "GRUPO COM VENDAS"},
  {"chave": "59527", "nome": "GUIMARAES ESPORTES", "grupo": "GRUPO COM VENDAS"},
  {"chave": "81183", "nome": "PISOLAR", "grupo": "GRUPO COM VENDAS"},
  {"chave": "422545", "nome": "SILVA ELETRICIDADE", "grupo": "GRUPO COM VENDAS"},
  {"chave": "79070", "nome": "PADARIA TRIGO E PAO", "grupo": "GRUPO COM VENDAS"},
  {"chave": "420237", "nome": "Jl Fashion", "grupo": "GRUPO COM VENDAS"},
  {"chave": "135397", "nome": "COMERCIAL LACERDA", "grupo": "GRUPO COM VENDAS"},
  {"chave": "415740", "nome": "Nutri Vida Saj", "grupo": "GRUPO COM VENDAS"},
  {"chave": "415467", "nome": "PADILHA MATERIAIS DE CONSTRUCAO", "grupo": "GRUPO COM VENDAS"},
  {"chave": "419653", "nome": "Viva Calcados", "grupo": "GRUPO COM VENDAS"},
  {"chave": "403367", "nome": "Otica Do Povo 0003", "grupo": "GRUPO COM VENDAS"},
  {"chave": "26498", "nome": "ELSHADAY MERCEARIA", "grupo": "GRUPO COM VENDAS"},
  {"chave": "120683", "nome": "MERCADINHO BENÇÃO", "grupo": "GRUPO COM VENDAS"},
  {"chave": "415539", "nome": "CASA DO CHURRASCO", "grupo": "GRUPO COM VENDAS"},
  {"chave": "134705", "nome": "COMERCIAL OLIVEIRA E SOUZA", "grupo": "GRUPO COM VENDAS"},
  {"chave": "422467", "nome": "Comercio Distribuicao De Alimentos", "grupo": "GRUPO COM VENDAS"},
  {"chave": "245953", "nome": "MERCADINHO FAMILIAR", "grupo": "GRUPO COM VENDAS"},
  {"chave": "207882", "nome": "NOVA PHARMA", "grupo": "GRUPO COM VENDAS"},
  {"chave": "411151", "nome": "Cantinho Da Terra", "grupo": "GRUPO COM VENDAS"},
  {"chave": "139930", "nome": "CONCEITO AGROPECUARIO", "grupo": "GRUPO COM VENDAS"},
  {"chave": "155228", "nome": "ALEXANDRE CONVENIENCIA E PERFUMARIA", "grupo": "GRUPO COM VENDAS"},
  {"chave": "247124", "nome": "G T MOTOCICLOS", "grupo": "GRUPO COM VENDAS"},
  {"chave": "244976", "nome": "ESPACO BELEZA E MODA", "grupo": "GRUPO COM VENDAS"},
  {"chave": "414692", "nome": "Mercadinho Do Pedrinho", "grupo": "GRUPO COM VENDAS"},
  {"chave": "57739", "nome": "LIPY CONFECCOES", "grupo": "GRUPO COM VENDAS"},
  {"chave": "147629", "nome": "SUPERMERCADO CARAIBAS", "grupo": "GRUPO COM VENDAS"},
  {"chave": "115228", "nome": "MERCADINHO NUNES", "grupo": "GRUPO COM VENDAS"},
  {"chave": "407631", "nome": "Mercadinho Lindo Horizonte", "grupo": "GRUPO COM VENDAS"},
  {"chave": "130857", "nome": "CONSTRULIDER", "grupo": "GRUPO COM VENDAS"},
  {"chave": "410093", "nome": "Farma Dias", "grupo": "GRUPO COM VENDAS"},
  {"chave": "406232", "nome": "SANTOS RAMOS MATERIAIS DE CONSTRUÇÃO", "grupo": "GRUPO COM VENDAS"},
  {"chave": "178286", "nome": "LOJAS LUANA 0001", "grupo": "GRUPO COM VENDAS"},
  {"chave": "227200", "nome": "MERCADO M SILVA", "grupo": "GRUPO COM VENDAS"},
  {"chave": "58441", "nome": "JOAO E MARIA LOJA DE VARIEDADES", "grupo": "GRUPO COM VENDAS"},
  {"chave": "221418", "nome": "EMPORIO GRAN BAHIA", "grupo": "GRUPO COM VENDAS"},
  {"chave": "141827", "nome": "PRADO PAPELARIA", "grupo": "GRUPO COM VENDAS"},
  {"chave": "404242", "nome": "Ramos Confeccoes", "grupo": "GRUPO COM VENDAS"},
  {"chave": "419004", "nome": "Frigorifico Ofertao Da Carne", "grupo": "GRUPO COM VENDAS"},
  {"chave": "249915", "nome": "TIM ELETRO", "grupo": "GRUPO COM VENDAS"},
  {"chave": "68979", "nome": "ESPACO BETTE", "grupo": "GRUPO COM VENDAS"},
  {"chave": "181510", "nome": "FARMA DIAS", "grupo": "GRUPO COM VENDAS"},
  {"chave": "405010", "nome": "Megalar Moveis", "grupo": "GRUPO COM VENDAS"},
  {"chave": "422496", "nome": "MERCADO MEIRA", "grupo": "GRUPO COM VENDAS"},
  {"chave": "233249", "nome": "O AVISTAO  SUPERMERCADO", "grupo": "GRUPO COM VENDAS"},
  {"chave": "403536", "nome": "RODRIGO CELULAR", "grupo": "GRUPO COM VENDAS"},
  {"chave": "245656", "nome": "OTICA ATUAL", "grupo": "GRUPO COM VENDAS"},
  {"chave": "401974", "nome": "5 Irmaos Supermercado", "grupo": "GRUPO COM VENDAS"},
  {"chave": "184178", "nome": "MERCADO E PANIFICACAO NUNES", "grupo": "GRUPO COM VENDAS"},
  {"chave": "228502", "nome": "MERCADO CHAMA NO ZAP", "grupo": "GRUPO COM VENDAS"},
  {"chave": "418145", "nome": "Casa Nunes Loucas E Variedades", "grupo": "GRUPO COM VENDAS"},
  {"chave": "411743", "nome": "Mercado Sao Roque", "grupo": "GRUPO COM VENDAS"},
  {"chave": "422735", "nome": "Mix Oliveira", "grupo": "GRUPO COM VENDAS"},
  {"chave": "251339", "nome": "SUPERMERCADO BAIAO", "grupo": "GRUPO COM VENDAS"},
  {"chave": "208372", "nome": "MERCEARIA AVENIDA", "grupo": "GRUPO COM VENDAS"},
  {"chave": "244975", "nome": "MERCADO MILLENIUM", "grupo": "GRUPO COM VENDAS"},
  {"chave": "409023", "nome": "Leoes Construcao", "grupo": "GRUPO COM VENDAS"},
  {"chave": "410631", "nome": "RODAK PECAS", "grupo": "GRUPO COM VENDAS"},
  {"chave": "22203", "nome": "DROGARIA PARANA", "grupo": "GRUPO COM VENDAS"},
  {"chave": "65963", "nome": "KATIK MODAS", "grupo": "GRUPO COM VENDAS"},
  {"chave": "39276", "nome": "SUPERMERCADO CRUZ", "grupo": "GRUPO COM VENDAS"},
  {"chave": "165869", "nome": "COMERCIAL ELDORADO", "grupo": "GRUPO COM VENDAS"},
  {"chave": "400170", "nome": "LOJAS LUANA 0002", "grupo": "GRUPO COM VENDAS"},
  {"chave": "246078", "nome": "MERCADINHO CLOVIS FILHO", "grupo": "GRUPO COM VENDAS"},
  {"chave": "186208", "nome": "VERA MODAS", "grupo": "GRUPO COM VENDAS"},
  {"chave": "403366", "nome": "Otica Do Povo 0002", "grupo": "GRUPO COM VENDAS"},
  {"chave": "407065", "nome": "Farmacia Bom Preco", "grupo": "GRUPO COM VENDAS"},
  {"chave": "81987", "nome": "NOVA POTIMAC", "grupo": "GRUPO COM VENDAS"},
  {"chave": "243135", "nome": "PORTAL MOVEIS", "grupo": "GRUPO COM VENDAS"},
  {"chave": "242328", "nome": "FARMACIA TEOLANDIA", "grupo": "GRUPO COM VENDAS"},
  {"chave": "412096", "nome": "FARMACIA FORT POPULAR", "grupo": "GRUPO COM VENDAS"},
  {"chave": "216502", "nome": "POSTO DE MEDICAMENTOS MAIS SAUDE", "grupo": "GRUPO COM VENDAS"},
  {"chave": "130308", "nome": "CASA CENTER COMERCIO DE MATERIAL PARA CONSTRUCAO L", "grupo": "GRUPO COM VENDAS"},
  {"chave": "248605", "nome": "MERCADINHO SUPER BOM PRECO", "grupo": "GRUPO COM VENDAS"},
  {"chave": "413520", "nome": "Mercearia Da Cris", "grupo": "GRUPO COM VENDAS"},
  {"chave": "419202", "nome": "Lopes Materiais Para Construcao", "grupo": "GRUPO COM VENDAS"},
  {"chave": "418804", "nome": "Ramos Moveis", "grupo": "GRUPO COM VENDAS"},
  {"chave": "81488", "nome": "MATERIAIS DE CONSTRUCAO ROCHA", "grupo": "GRUPO COM VENDAS"},
  {"chave": "422517", "nome": "Ws Magazine", "grupo": "GRUPO COM VENDAS"},
  {"chave": "253270", "nome": "OTICA ATUAL 002", "grupo": "GRUPO COM VENDAS"},
  {"chave": "418218", "nome": "Rede Bem Drogarias Floresta Azul", "grupo": "GRUPO COM VENDAS"},
  {"chave": "410658", "nome": "Cantinho Dos Presentes E Papelaria 0002", "grupo": "GRUPO COM VENDAS"},
  {"chave": "101336", "nome": "FARMACIA SAO RAFAEL", "grupo": "GRUPO COM VENDAS"},
  {"chave": "224632", "nome": "COMERCIAL BULCAO BRUM", "grupo": "GRUPO COM VENDAS"},
  {"chave": "421891", "nome": "Ramon Assitencia Tecnica", "grupo": "GRUPO COM VENDAS"},
  {"chave": "219553", "nome": "FAVORITA FARMA", "grupo": "GRUPO COM VENDAS"},
  {"chave": "233367", "nome": "AVATIM LCL", "grupo": "GRUPO COM VENDAS"},
  {"chave": "117419", "nome": "LAY MORENA FASHION", "grupo": "GRUPO COM VENDAS"},
  {"chave": "418836", "nome": "Vet Center", "grupo": "GRUPO COM VENDAS"},
  {"chave": "164280", "nome": "SHOPPING DOS ELETROS", "grupo": "GRUPO COM VENDAS"},
  {"chave": "407280", "nome": "Confar Tudo Para O Seu Lar", "grupo": "GRUPO COM VENDAS"},
  {"chave": "208112", "nome": "TOM MATERIAIS DE CONSTRUCAO", "grupo": "GRUPO COM VENDAS"},
  {"chave": "404433", "nome": "YES COSMETICOS", "grupo": "GRUPO COM VENDAS"},
  {"chave": "415247", "nome": "Casa Da Racao", "grupo": "GRUPO COM VENDAS"},
  {"chave": "48528", "nome": "IRAJUBA MODAS", "grupo": "GRUPO COM VENDAS"},
  {"chave": "174763", "nome": "OTICA VICOSA", "grupo": "GRUPO COM VENDAS"},
  {"chave": "220260", "nome": "FARMACIA VIDA 0002", "grupo": "GRUPO COM VENDAS"},
  {"chave": "60068", "nome": "GIROTTO DELICANTEN", "grupo": "GRUPO COM VENDAS"},
  {"chave": "400074", "nome": "LANCHONETE BEATRIZ", "grupo": "GRUPO COM VENDAS"},
  {"chave": "422312", "nome": "Mercado Sacolao Do Povo", "grupo": "GRUPO COM VENDAS"},
  {"chave": "85193", "nome": "COMERCIAL BRAGA", "grupo": "GRUPO COM VENDAS"},
  {"chave": "163574", "nome": "CAROL FESTAS ETC E TAL", "grupo": "GRUPO COM VENDAS"},
  {"chave": "418516", "nome": "Tabelionato De Protesto De Titulos", "grupo": "GRUPO COM VENDAS"},
  {"chave": "156609", "nome": "MERCADO FERNANDA", "grupo": "GRUPO COM VENDAS"},
  {"chave": "406716", "nome": "SUPERMERCADO PAGUE MENOS", "grupo": "GRUPO COM VENDAS"},
  {"chave": "414914", "nome": "Farmacia Economia Do Povo", "grupo": "GRUPO COM VENDAS"},
  {"chave": "171982", "nome": "PRECO BOM", "grupo": "GRUPO COM VENDAS"},
  {"chave": "413142", "nome": "Azevedo Motos", "grupo": "GRUPO COM VENDAS"},
  {"chave": "418402", "nome": "Supermercado Pedrinhas", "grupo": "GRUPO COM VENDAS"},
  {"chave": "161558", "nome": "CASA DA KA", "grupo": "GRUPO COM VENDAS"},
  {"chave": "422738", "nome": "Dino Supermercado", "grupo": "GRUPO COM VENDAS"},
  {"chave": "168556", "nome": "FARMACIA BOA SAUDE", "grupo": "GRUPO COM VENDAS"}
] as const

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

  uf: string
  dtInstTablet: string
  dtClube: string
  dataUltTransacao: string
  regional: string
  vlrLime: number
  vlrConsignadoTotal: number
  vlrConsignadoInss: number
  vlrConsignadoPub: number
  vlrConsignadoPriv: number
  vlrCreditoParcelado: number
  qtdContasPj: number
  bloqueado: string
  dtBloqueado: string

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

type CampanhaGoleadaMap = {
  porChave: Map<string, string>
  porChaveDigitos: Map<string, string>
  porNome: Map<string, string>
}

function criarCampanhaGoleadaVazia(): CampanhaGoleadaMap {
  return {
    porChave: new Map(),
    porChaveDigitos: new Map(),
    porNome: new Map(),
  }
}

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

function normalizeText(v: any) {
  return toStr(v)
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
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .trim()
}

function onlyDigits(v: any) {
  return toStr(v).replace(/\D/g, '')
}

function getFirstKeyContaining(obj: Record<string, any>, ...parts: string[]) {
  const wanted = parts.map((part) => normalizeText(part))

  for (const key of Object.keys(obj)) {
    const normalizedKey = normalizeText(key)
    if (wanted.every((part) => normalizedKey.includes(part))) {
      return obj[key]
    }
  }

  return ''
}

function normalizeGrupoGoleada(v: any) {
  const grupo = toStr(v).toUpperCase()

  if (!grupo) return CAMPANHA_GOLEADA_GRUPO_PADRAO
  if (grupo.includes('GRUPO')) return grupo

  return `GRUPO ${grupo}`
}

function grupoGoleadaPeloExpresso(
  r: Pick<RowBase, 'chave' | 'nome'>,
  campanha: CampanhaGoleadaMap
) {
  if (!CAMPANHA_GOLEADA_ATIVA) return ''

  const chaveId = safeDocId(r.chave)
  const chaveDigitos = onlyDigits(r.chave)
  const nomeId = normalizeText(r.nome)

  return (
    campanha.porChave.get(chaveId) ||
    campanha.porChaveDigitos.get(chaveDigitos) ||
    campanha.porNome.get(nomeId) ||
    CAMPANHA_GOLEADA_GRUPO_PADRAO
  )
}

function montarMapaCampanhaGoleada(raw: Record<string, any>[]): CampanhaGoleadaMap {
  const campanha = criarCampanhaGoleadaVazia()

  raw.forEach((obj) => {
    const r: Record<string, any> = {}
    for (const [k, v] of Object.entries(obj)) r[normalizeKey(k)] = v

    const chave = firstValue(
      r['chave_loja'],
      r['chave loja'],
      r['chave'],
      r['codigo'],
      r['código'],
      r['cod loja'],
      getFirstKeyContaining(r, 'chave')
    )

    const nome = firstValue(
      r['nome_loja'],
      r['nome da loja'],
      r['nome expresso'],
      r['expresso'],
      r['nome'],
      getFirstKeyContaining(r, 'nome')
    )

    const grupo = normalizeGrupoGoleada(
      firstValue(
        r['grupo'],
        r['nome do grupo'],
        r['grupo campanha'],
        r['grupo goleada'],
        r['campanha'],
        getFirstKeyContaining(r, 'grupo')
      )
    )

    const chaveId = safeDocId(chave)
    const chaveDigitos = onlyDigits(chave)
    const nomeId = normalizeText(nome)

    if (chaveId && chaveId !== 'sem-chave') campanha.porChave.set(chaveId, grupo)
    if (chaveDigitos) campanha.porChaveDigitos.set(chaveDigitos, grupo)
    if (nomeId) campanha.porNome.set(nomeId, grupo)
  })

  return campanha
}

function firstValue(...values: any[]) {
  for (const value of values) {
    const str = toStr(value)
    if (str) return str
  }

  return ''
}

function formatarTelefoneBR(valor: string) {
  const numeros = valor.replace(/\D/g, '').slice(0, 11)

  if (numeros.length <= 2) return numeros

  if (numeros.length <= 7) {
    return numeros.replace(/(\d{2})(\d+)/, '($1) $2')
  }

  return numeros.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
}

function safeDocId(value: string) {
  return (
    toStr(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w.-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 120) || 'sem-chave'
  )
}

function getExpressoDocId(r: Pick<RowBase, 'chave'>) {
  return safeDocId(r.chave)
}

function getContatoRegistro(data: any) {
  return {
    responsavel: toStr(
      data?.responsavel ||
        data?.responsavelLoja ||
        data?.responsavel_loja ||
        data?.nomeResponsavel ||
        data?.nome_responsavel
    ).toUpperCase(),
    telefoneResponsavel: formatarTelefoneBR(
      toStr(
        data?.telefoneResponsavel ||
          data?.telefone_responsavel ||
          data?.telefone ||
          data?.celular ||
          data?.whatsapp ||
          data?.contato
      )
    ),
  }
}

function parseNumber(v: any) {
  if (typeof v === 'number') {
    return Number.isFinite(v) ? v : 0
  }

  let s = toStr(v)
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/[^\d,.-]/g, '')

  if (!s) return 0

  const hasComma = s.includes(',')
  const hasDot = s.includes('.')

  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(',')
    const lastDot = s.lastIndexOf('.')

    // Formato BR: 1.234,56
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.')
    } else {
      // Formato EUA: 1,234.56
      s = s.replace(/,/g, '')
    }
  } else if (hasComma) {
    // Formato BR sem milhar: 1234,56
    s = s.replace(',', '.')
  } else if (hasDot) {
    const parts = s.split('.')

    // Formato BR com ponto apenas como milhar: 1.234 ou 1.234.567
    const looksLikeThousands =
      parts.length > 1 &&
      parts.slice(1).every((part) => part.length === 3)

    if (looksLikeThousands) {
      s = s.replace(/\./g, '')
    }
    // Senão mantém como decimal: 1234.56
  }

  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

function buildEmptyRowFromRegistro(data: any): RowBase {
  const agPacb = splitAgPacb(
    firstValue(data.agPacb, data.ag_pacb, data['agencia / pacb'])
  )

  const row: RowBase = {
    chave: firstValue(data.chave, data.chaveLoja, data.chave_loja),
    nome: firstValue(data.nome, data.nomeLoja, data.nome_loja, data.expresso),
    municipio: firstValue(data.municipio, data.cidade),
    agencia: firstValue(data.agencia, agPacb.agencia),
    pacb: firstValue(data.pacb, agPacb.pacb),
    statusAnalise: firstValue(data.statusAnalise, data.status_analise, data.status),
    dtCertificacao: firstValue(data.dtCertificacao, data.dt_certificacao),
    trx: parseNumber(firstValue(data.trx, data.qtd_TrxContabil, data.qtd_trxcontabil)),

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

    uf: toStr(data.uf),
    dtInstTablet: toStr(data.dtInstTablet),
    dtClube: toStr(data.dtClube),
    dataUltTransacao: toStr(data.dataUltTransacao),
    regional: toStr(data.regional),
    vlrLime: parseNumber(data.vlrLime),
    vlrConsignadoTotal: parseNumber(data.vlrConsignadoTotal),
    vlrConsignadoInss: parseNumber(data.vlrConsignadoInss),
    vlrConsignadoPub: parseNumber(data.vlrConsignadoPub),
    vlrConsignadoPriv: parseNumber(data.vlrConsignadoPriv),
    vlrCreditoParcelado: parseNumber(data.vlrCreditoParcelado),
    qtdContasPj: parseNumber(data.qtdContasPj),
    bloqueado: toStr(data.bloqueado),
    dtBloqueado: toStr(data.dtBloqueado),

    responsavel: toStr(data.responsavel).toUpperCase(),
    telefoneResponsavel: formatarTelefoneBR(toStr(data.telefoneResponsavel)),

    presenteNaUltimaBase: data.presenteNaUltimaBase === false ? false : true,

    // IMPORTANTE: nunca confiar em pontos antigos salvos no Firestore.
    // A pontuação de Junho/2026 deve ser recalculada sempre pela regra nova.
    pontos: 0,
  }

  row.pontos = calcPontosExpressoGeral({
    qtdContasComDeposito: row.qtdContasComDeposito,
    qtdContasSemDeposito: row.qtdContasSemDeposito,
    qtdCestaServ: row.qtdCestaServ,
    qtdSuperProtegido: row.qtdSuperProtegido,
    vlrLime: row.vlrLime,
    vlrConsignadoTotal: row.vlrConsignadoTotal,
    vlrCreditoParcelado: row.vlrCreditoParcelado,
    qtdMicrosseguro: row.qtdMicrosseguro,
    qtdVivaVida: row.qtdVivaVida,
    qtdPlanoOdonto: row.qtdPlanoOdonto,
    qtdSegCartaoDeb: row.qtdSegCartaoDeb,
    vlrExpSorte: row.vlrExpSorte,
  })

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
  const qtdContasComDepositoAjustada = Math.min(
    qtdContasComDeposito,
    qtdContas
  )
  const qtdContasSemDeposito = Math.max(
    qtdContas - qtdContasComDepositoAjustada,
    0
  )

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
    possivelBloqueado: list.filter((x) => x.r.presenteNaUltimaBase === false)
      .length,
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

function formatMoeda(n: number) {
  if (!Number.isFinite(n)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(n)
}

function formatPontos(n: number) {
  if (!Number.isFinite(n)) return '0'
  const rounded = Math.round(n * 10) / 10
  const isInt = Math.abs(rounded - Math.round(rounded)) < 1e-9
  return isInt
    ? String(Math.round(rounded))
    : rounded.toFixed(1).replace('.', ',')
}

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
  ].join('\n')
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
  const [allRowsLoaded, setAllRowsLoaded] = useState(false)
  const [campanhaGoleada, setCampanhaGoleada] =
    useState<CampanhaGoleadaMap>(() => montarMapaCampanhaGoleada([...CAMPANHA_GOLEADA_DADOS]))
  const [campanhaGoleadaInfo, setCampanhaGoleadaInfo] = useState('')
  const [resumoExpressos, setResumoExpressos] =
    useState<ResumoExpressos | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [contatosAbertos, setContatosAbertos] = useState<
    Record<string, boolean>
  >({})

  const [q, setQ] = useState('')
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

  async function carregarCampanhaGoleada() {
    if (!CAMPANHA_GOLEADA_ATIVA) return

    const mapa = montarMapaCampanhaGoleada([...CAMPANHA_GOLEADA_DADOS])
    const total =
      mapa.porChave.size || mapa.porChaveDigitos.size || mapa.porNome.size

    setCampanhaGoleada(mapa)
    setCampanhaGoleadaInfo(
      total
        ? `${CAMPANHA_GOLEADA_NOME}: ${total} expresso(s) da campanha carregado(s) ✅`
        : `${CAMPANHA_GOLEADA_NOME}: sem registros identificados.`
    )
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
      const primeiros = snap.docs.map((docSnap) =>
        buildEmptyRowFromRegistro(docSnap.data())
      )

      setRows(primeiros)
      setAllRowsLoaded(false)
      setInfo(`Carregando somente ${LIMIT_NO_SEARCH} registros iniciais ✅`)
    } catch (e: any) {
      console.error('Erro ao carregar registros iniciais:', e)
      setError(
        `Falha ao carregar registros (${e?.code || 'sem-code'}): ${
          e?.message || 'erro'
        }`
      )
    } finally {
      setLoading(false)
    }
  }

  async function carregarTodosParaFiltro() {
    if (!auth.currentUser) {
      setError('Você precisa estar logado.')
      return
    }

    if (allRowsLoaded) return

    try {
      setLoading(true)
      setError(null)

      const snap = await getDocs(collection(db, EXPRESSOS_COLLECTION))
      const todos = snap.docs.map((docSnap) =>
        buildEmptyRowFromRegistro(docSnap.data())
      )

      setRows(todos)
      setAllRowsLoaded(true)
      setInfo(`Filtro carregado com ${todos.length} registros ✅`)
    } catch (e: any) {
      console.error('Erro ao carregar todos registros:', e)
      setError(
        `Falha ao carregar filtro (${e?.code || 'sem-code'}): ${
          e?.message || 'erro'
        }`
      )
    } finally {
      setLoading(false)
    }
  }

  async function consultarRegistrosPorTermo(term: string) {
    if (!auth.currentUser) {
      setError('Você precisa estar logado.')
      return
    }

    const termoOriginal = term.trim()

    if (!termoOriginal) {
      await carregarPrimeirosRegistros()
      return
    }

    try {
      setLoading(true)
      setError(null)

      const termoTexto = normalizeText(termoOriginal)
      const termoNumerico = onlyDigits(termoOriginal)

      // Busca geral na coleção de Junho e filtra localmente.
      // Isso permite encontrar QUALQUER PARTE do nome do expresso,
      // município, agência, PACB, agência/PACB e chave loja,
      // sem depender de startAt/endAt do Firestore.
      const snap = await getDocs(collection(db, EXPRESSOS_COLLECTION))

      const resultado = snap.docs
        .map((docSnap) => {
          const row = buildEmptyRowFromRegistro(docSnap.data())
          return {
            row,
            docId: docSnap.id,
          }
        })
        .filter(({ row, docId }) => {
          const textoBusca = normalizeText(
            [
              docId,
              row.nome,
              row.chave,
              row.municipio,
              row.agencia,
              row.pacb,
              `${row.agencia}/${row.pacb}`,
              `${row.agencia} / ${row.pacb}`,
              `${row.agencia} ${row.pacb}`,
              row.statusAnalise,
              row.regional,
              row.uf,
              row.responsavel,
              row.telefoneResponsavel,
            ].join(' ')
          )

          const numerosBusca = onlyDigits(
            [
              docId,
              row.chave,
              row.agencia,
              row.pacb,
              `${row.agencia}${row.pacb}`,
              row.telefoneResponsavel,
            ].join(' ')
          )

          return (
            Boolean(termoTexto && textoBusca.includes(termoTexto)) ||
            Boolean(termoNumerico && numerosBusca.includes(termoNumerico))
          )
        })
        .map(({ row }) => row)

      resultado.sort((a, b) => {
        const nomeA = normalizeText(a.nome)
        const nomeB = normalizeText(b.nome)

        const aComecaNome = nomeA.startsWith(termoTexto) ? 1 : 0
        const bComecaNome = nomeB.startsWith(termoTexto) ? 1 : 0

        if (aComecaNome !== bComecaNome) {
          return bComecaNome - aComecaNome
        }

        return (b.pontos || 0) - (a.pontos || 0)
      })

      setRows(resultado)
      setAllRowsLoaded(true)
      setInfo(
        resultado.length
          ? `Consulta concluída: ${resultado.length} registro(s) encontrado(s) ✅`
          : 'Nenhum expresso encontrado nessa consulta.'
      )
    } catch (e: any) {
      console.error('Erro ao consultar registros:', e)
      setError(
        `Falha ao consultar (${e?.code || 'sem-code'}): ${
          e?.message || 'erro'
        }`
      )
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
      const raw: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, {
        defval: '',
      })

      const normalized = raw.map((obj) => {
        const out: Record<string, any> = {}
        for (const [k, v] of Object.entries(obj)) out[normalizeKey(k)] = v
        return out
      })

      const mapped: RowBase[] = normalized.map((r) => {
        const chave = toStr(r['chave_loja'] || r['chave loja'] || r['chave'])
        const nome = toStr(r['nome_loja'] || r['nome da loja'] || r['nome'])
        const municipio = toStr(r['municipio'] || r['município'])
        const uf = toStr(r['uf'])
        const dtInstTablet = formatCertificacaoValue(r['dt_inst_tablet'] || r['dt inst tablet'])
        const dtClube = formatCertificacaoValue(r['dt_clube'] || r['dt clube'])
        const dataUltTransacao = formatCertificacaoValue(r['data_ult_transacao'] || r['data ult transacao'])
        const regional = toStr(r['ger_regional'] || r['regional'])

        const agpacb = r['ag_pacb'] || r['agencia/pacb'] || r['agência/pacb']
        const { agencia, pacb } = splitAgPacb(agpacb)

        const statusAnalise = toStr(
          r['status_analise'] || r['status analise'] || r['status']
        )
        const bloqueado = toStr(r['bloqueado'] || r['bloqueado?'])
        const dtBloqueado = formatCertificacaoValue(r['dt_bloqueado'] || r['data bloqueio'] || r['dt bloqueado'])

        const rawCertificacao =
          r['dt_certificacao'] ??
          r['dt certificacao'] ??
          r['certificacao'] ??
          r['certificação'] ??
          ''

        const dtCertificacao = formatCertificacaoValue(rawCertificacao)

        const trx = parseNumber(
          r['qtd_trxcontabil'] ||
            r['qtd_trx_contabil'] ||
            r['qtd trxcontabil'] ||
            r['qtd_trx']
        )

        const {
          qtdContas,
          qtdContasComDeposito,
          qtdContasSemDeposito,
        } = normalizeContas(
          r['qtd_contas'] || r['qtd contas'],
          r['qtd_contas_com_deposito'] || r['qtd contas com deposito']
        )

        const qtdCestaServ = parseNumber(
          r['qtd_cesta_serv'] || r['qtd cesta serv']
        )

        const qtdSuperProtegido = parseNumber(
          r['qtd_super_protegido'] ||
            r['qtd super protegido'] ||
            r['qtd_superprotegido'] ||
            r['super protegido'] ||
            r['qtdsuperprotegido']
        )

        const qtdMobilidade = 0
        const qtdCartaoEmitido = parseNumber(
          r['qtd_cartao_emitido'] || r['qtd cartao emitido']
        )
        const qtdChesContratado = parseNumber(
          r['qtd_chesp_contratado'] || r['qtd chesp contratado']
        )
        const qtdLimeAbConta = parseNumber(
          r['qtd_lime_ab_conta'] || r['qtd lime ab conta']
        )
        const vlrLime = parseNumber(r['vlr_lime'] || r['valor do lime'] || r['valor lime'])
        const vlrConsignadoTotal = parseNumber(
          r['vlr_consignado_total'] || r['valor consignado total'] || r['consignado total']
        )
        const vlrConsignadoInss = parseNumber(
          r['vlr_consignado_inss'] || r['valor consignado inss']
        )
        const vlrConsignadoPub = parseNumber(
          r['vlr_consignado_pub'] || r['valor consignado publico'] || r['valor consignado público']
        )
        const vlrConsignadoPriv = parseNumber(
          r['vlr_consignado_priv'] || r['valor consignado privado']
        )
        const vlrCreditoParcelado = parseNumber(
          r['vlr_credito_parcel'] || r['valor credito parcelado'] || r['valor crédito parcelado']
        )
        const qtdContasPj = parseNumber(r['qtd_contas_pj'] || r['qtd contas pj'])

        // Mantidos zerados apenas para compatibilidade visual/histórica da página antiga.
        const qtdLime = 0
        const qtdConsignado = 0
        const qtdCreditoParcelado = 0

        const qtdMicrosseguro = parseNumber(
          r['qtd_microsseguro'] || r['qtd microsseguro']
        )
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

        const qtdExpSorte = parseNumber(
          r['qtd_exp_sorte'] || r['qtd exp sorte']
        )

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
          uf,
          dtInstTablet,
          dtClube,
          dataUltTransacao,
          regional,
          vlrLime,
          vlrConsignadoTotal,
          vlrConsignadoInss,
          vlrConsignadoPub,
          vlrConsignadoPriv,
          vlrCreditoParcelado,
          qtdContasPj,
          bloqueado,
          dtBloqueado,
          pontos,
        }
      })

      let finalRows: RowBase[] = mapped.map((r): RowBase => ({
        ...r,
        responsavel: '',
        telefoneResponsavel: '',
        presenteNaUltimaBase: true,
      }))

      try {
        const registrosRef = collection(db, EXPRESSOS_COLLECTION)
        const registrosAntigosRef = collection(db, EXPRESSOS_COLLECTION_ANTIGA)

        const [snap, snapAntigo] = await Promise.all([
          getDocs(registrosRef),
          getDocs(registrosAntigosRef),
        ])

        const salvos = new Map<string, any>()
        const salvosAntigos = new Map<string, any>()

        snap.forEach((docSnap) => {
          const data = docSnap.data()
          salvos.set(docSnap.id, data)
          const chaveData = safeDocId(toStr(data.chave))
          if (chaveData && chaveData !== 'sem-chave') salvos.set(chaveData, data)
        })

        snapAntigo.forEach((docSnap) => {
          const data = docSnap.data()
          salvosAntigos.set(docSnap.id, data)
          const chaveData = safeDocId(toStr(data.chave))
          if (chaveData && chaveData !== 'sem-chave') salvosAntigos.set(chaveData, data)
        })

        const idsDaBaseAtual = new Set<string>()
        const batch = writeBatch(db)

        finalRows = mapped.map((r): RowBase => {
          const id = getExpressoDocId(r)
          idsDaBaseAtual.add(id)

          const salvoNovo = salvos.get(id) || {}
          const salvoAntigo = salvosAntigos.get(id) || {}
          const contatoNovo = getContatoRegistro(salvoNovo)
          const contatoAntigo = getContatoRegistro(salvoAntigo)

          const rowComRegistro: RowBase = {
            ...r,
            responsavel: contatoNovo.responsavel || contatoAntigo.responsavel || '',
            telefoneResponsavel:
              contatoNovo.telefoneResponsavel || contatoAntigo.telefoneResponsavel || '',
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
        setAllRowsLoaded(false)
        setInfo(
          `Base carregada ✅ ${mapped.length} expressos na última base. ${
            finalRows.length - mapped.length
          } preservados do histórico.`
        )
      } catch (firestoreError) {
        console.error('Erro ao sincronizar registro de expressos:', firestoreError)
        setRows(finalRows)
        setAllRowsLoaded(true)
        setInfo('Base carregada ✅ mas o registro permanente não sincronizou agora.')
      }
    } catch (e: any) {
      console.error('loadCsv error:', e)
      setError(
        `Falha ao carregar CSV (${e?.code || 'sem-code'}): ${
          e?.message || 'erro'
        }`
      )
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
      carregarCampanhaGoleada()
      carregarResumoExpressos()
      carregarPrimeirosRegistros()
    })

    return () => unsub()
  }, [router])

  useEffect(() => {
    if (!user) return

    const temFiltro = fCert !== 'Todos' || fTrx !== 'Todos'

    if (temFiltro) {
      carregarTodosParaFiltro()
      return
    }

    const timer = window.setTimeout(() => {
      consultarRegistrosPorTermo(q)
    }, 450)

    return () => window.clearTimeout(timer)
  }, [q, user, fCert, fTrx])

  const computed = useMemo(() => {
    const list = rows.map((r) => {
      const certDate = parseDateFlexible(r.dtCertificacao)
      const semCert = !certDate
      const vencida = isCertVencida(certDate)
      return { r, certDate, semCert, vencida }
    })

    const total = list.length
    const transacional = list.filter((x) =>
      isTransacional(x.r.statusAnalise)
    ).length
    const treinado = list.filter((x) => isTreinado(x.r.statusAnalise)).length
    const semCert = list.filter((x) => x.semCert).length
    const vencida = list.filter((x) => x.vencida).length
    const possivelBloqueado = list.filter(
      (x) => x.r.presenteNaUltimaBase === false
    ).length

    return {
      list,
      total,
      transacional,
      treinado,
      semCert,
      vencida,
      possivelBloqueado,
    }
  }, [rows])

  const stats = resumoExpressos || computed


  const filtered = useMemo(() => {
    const term = normalizeText(q)
    const termDigits = onlyDigits(q)

    let list = computed.list.filter(({ r, semCert, vencida }) => {
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

    if (term || termDigits) {
      list = list.filter(({ r }) => {
        const hay = normalizeText(
          [
            r.nome,
            r.chave,
            r.municipio,
            r.agencia,
            r.pacb,
            `${r.agencia}/${r.pacb}`,
            `${r.agencia} / ${r.pacb}`,
            r.statusAnalise,
            r.regional,
            r.uf,
            r.responsavel,
            r.telefoneResponsavel,
          ].join(' ')
        )

        const hayDigits = onlyDigits(
          [
            r.chave,
            r.agencia,
            r.pacb,
            `${r.agencia}${r.pacb}`,
            r.telefoneResponsavel,
          ].join(' ')
        )

        return (
          Boolean(term && hay.includes(term)) ||
          Boolean(termDigits && hayDigits.includes(termDigits))
        )
      })
    } else if (!allRowsLoaded) {
      list = list.slice(0, LIMIT_NO_SEARCH)
    }

    return list
  }, [computed.list, q, fCert, fTrx, allRowsLoaded])

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

    const valorFormatado =
      field === 'telefoneResponsavel'
        ? formatarTelefoneBR(value)
        : value.toUpperCase()

    setRows((prev) =>
      prev.map((item) =>
        getExpressoDocId(item) === id
          ? {
              ...item,
              [field]: valorFormatado,
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
          responsavel: (r.responsavel || '').toUpperCase(),
          telefoneResponsavel: formatarTelefoneBR(r.telefoneResponsavel || ''),
          contatoAtualizadoEm: serverTimestamp(),
        },
        { merge: true }
      )

      setInfo('Contato salvo com sucesso ✅')
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
        <span className="pill">Geral 2026</span>
        <h1 className="h1" style={{ marginTop: '.75rem' }}>
          📊 Expresso Geral 2026 (Nova Pontuação)
        </h1>
      </div>

      <div
        className="card"
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
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

        {CAMPANHA_GOLEADA_ATIVA && (
          <Pill
            style={{
              background: 'rgba(37,99,235,.10)',
              border: '1px solid rgba(37,99,235,.22)',
              color: 'rgba(29,78,216,.98)',
            }}
            title={campanhaGoleadaInfo || CAMPANHA_GOLEADA_NOME}
          >
            ⚽ {CAMPANHA_GOLEADA_NOME}
          </Pill>
        )}

        <button
          className="btn-primary"
          onClick={isAdmin ? loadCsv : recarregarTela}
          disabled={loading || checkingAuth}
          style={{ marginLeft: 'auto' }}
        >
          {checkingAuth
            ? 'Verificando login...'
            : loading
              ? 'Carregando...'
              : isAdmin
                ? 'Sincronizar CSV'
                : 'Atualizar lista'}
        </button>
      </div>

      <div className="card" style={{ display: 'grid', gap: '1rem' }}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label>
            <div className="label">Buscar (opcional)</div>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome, chave ou agência..."
            />
            <div className="p-muted" style={{ marginTop: '.35rem', fontSize: 12 }}>
              A página carrega inicialmente só <b>{LIMIT_NO_SEARCH}</b> registros.
            </div>
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
            <select
              className="input"
              value={fTrx}
              onChange={(e) => setFTrx(e.target.value as TrxFilter)}
            >
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

        {CAMPANHA_GOLEADA_ATIVA && campanhaGoleadaInfo && (
          <div>
            <span className="pill">⚽ {campanhaGoleadaInfo}</span>
          </div>
        )}

        {error && (
          <div className="card-soft" style={{ borderColor: 'rgba(214,31,44,.25)' }}>
            <p
              className="p-muted"
              style={{ color: 'rgba(214,31,44,.95)', fontWeight: 800 }}
            >
              {error}
            </p>
          </div>
        )}
      </div>

      <div
        className="card"
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
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
            const grupoGoleada = grupoGoleadaPeloExpresso(r, campanhaGoleada)

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
                  <div
                    style={{
                      display: 'flex',
                      gap: '.5rem',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                    }}
                  >
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

                    {CAMPANHA_GOLEADA_ATIVA && (
                      <Pill
                        style={{
                          background: 'linear-gradient(135deg, rgba(214,31,44,.12), rgba(37,99,235,.12))',
                          border: '1px solid rgba(214,31,44,.20)',
                          color: 'rgba(115,20,55,.98)',
                        }}
                        title="Campanha temporária Goleada de Prêmios"
                      >
                        ⚽ {CAMPANHA_GOLEADA_NOME}: {grupoGoleada}
                      </Pill>
                    )}

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
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: '1.08rem',
                      marginTop: '.15rem',
                    }}
                  >
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

                  {CAMPANHA_GOLEADA_ATIVA && (
                    <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                      <div className="p-muted" style={{ fontSize: 12 }}>
                        CAMPANHA GOLEADA DE PRÊMIOS
                      </div>
                      <div style={{ fontWeight: 900 }}>{grupoGoleada}</div>
                    </div>
                  )}

                  <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                    <div className="p-muted" style={{ fontSize: 12 }}>
                      dt_certificacao
                    </div>
                    <div style={{ fontWeight: 900 }}>{r.dtCertificacao || '—'}</div>
                  </div>
                </div>

                {contatoAberto && (
                  <div
                    className="card-soft"
                    style={{
                      padding: '.9rem .95rem',
                      display: 'grid',
                      gap: '.75rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '.75rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 900 }}>Contato do Expresso</div>
                        <div
                          className="p-muted"
                          style={{ fontSize: 12, marginTop: '.2rem' }}
                        >
                          Consulte ou atualize o responsável e telefone deste ponto.
                        </div>
                      </div>

                      <LightButton
                        onClick={() => salvarContatoExpresso(r)}
                        title="Salvar contato"
                      >
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
                          onChange={(e) =>
                            updateContatoLocal(r, 'responsavel', e.target.value)
                          }
                          placeholder="Digite o responsável"
                        />
                      </label>

                      <label>
                        <div className="label">Telefone</div>
                        <input
                          className="input"
                          value={r.telefoneResponsavel || ''}
                          onChange={(e) =>
                            updateContatoLocal(
                              r,
                              'telefoneResponsavel',
                              e.target.value
                            )
                          }
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                          inputMode="numeric"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {sinais.length > 0 && (
                  <div className="card-soft" style={{ padding: '.9rem .95rem' }}>
                    <div
                      className="p-muted"
                      style={{ fontSize: 12, marginBottom: '.45rem' }}
                    >
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
                  <div
                    className="card-soft"
                    style={{
                      padding: '.9rem .95rem',
                      display: 'grid',
                      gap: '.55rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        gap: '.5rem',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
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
                      <Indicador label="Cartão Emitido" value={formatNum(r.qtdCartaoEmitido)} />
                      <Indicador label="Ches Contratado" value={formatNum(r.qtdChesContratado)} />
                      <Indicador label="Valor do Lime (1 ponto a cada R$ 100)" value={formatMoeda(r.vlrLime)} />
                      <Indicador label="Consignado Total (1 ponto a cada R$ 1.000)" value={formatMoeda(r.vlrConsignadoTotal)} />
                      <Indicador label="Consignado INSS" value={formatMoeda(r.vlrConsignadoInss)} />
                      <Indicador label="Consignado Público" value={formatMoeda(r.vlrConsignadoPub)} />
                      <Indicador label="Consignado Privado" value={formatMoeda(r.vlrConsignadoPriv)} />
                      <Indicador label="Crédito Parcelado (1 ponto a cada R$ 500)" value={formatMoeda(r.vlrCreditoParcelado)} />
                      <Indicador label="Contas PJ" value={formatNum(r.qtdContasPj)} />
                      <Indicador label="Microsseguros" value={formatNum(r.qtdMicrosseguro)} />
                      <Indicador label="Viva Vida" value={formatNum(r.qtdVivaVida)} />
                      <Indicador label="Dental" value={formatNum(r.qtdPlanoOdonto)} />
                      <Indicador label="Residencial" value={formatNum(r.qtdSegResidencial)} />
                      <Indicador label="Seguro Cartão Débito" value={formatNum(r.qtdSegCartaoDeb)} />
                      <Indicador label="Valor Sorte Expressa (1 ponto a cada R$ 50)" value={formatMoeda(r.vlrExpSorte)} />
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