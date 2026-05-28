export type PontuacaoExpressoGeralJunho2026Input = {
  qtdContasComDeposito?: number
  qtdContasSemDeposito?: number
  qtdCestaServ?: number
  qtdSuperProtegido?: number

  /** Valor total vendido de Lime. Regra: a cada R$ 100 = 1 ponto. */
  vlrLime?: number

  /** Valor total vendido de Consignado. Regra: a cada R$ 1.000 = 1 ponto. */
  vlrConsignadoTotal?: number

  /** Valor total vendido de Crédito Parcelado. Regra: a cada R$ 500 = 1 ponto. */
  vlrCreditoParcelado?: number

  qtdMicrosseguro?: number
  qtdVivaVida?: number
  qtdPlanoOdonto?: number
  qtdSegCartaoDeb?: number
  vlrExpSorte?: number
}

export type PontuacaoContasInput = {
  qtdContasComDeposito?: number
  qtdContasSemDeposito?: number
}

export const PONTOS_EXPRESSO_GERAL_JUNHO_2026 = {
  CONTA_COM_DEPOSITO: 7,
  CONTA_SEM_DEPOSITO: 3,
  CESTA_SERVICO: 3,
  SUPER_PROTEGIDO: 1,
  LIME_CADA_100_REAIS: 1,
  CONSIGNADO_CADA_1000_REAIS: 1,
  CREDITO_PARCELADO_CADA_500_REAIS: 1,
  MICROSEGURO: 1,
  VIVA_VIDA: 2,
  PLANO_ODONTO: 2,
  SEGURO_CARTAO_DEBITO: 1,
  EXPRESSO_DA_SORTE_CADA_50_REAIS: 1,
} as const

function safeNumber(value: unknown) {
  const n = Number(value || 0)
  return Number.isFinite(n) ? n : 0
}

export function calcPontosContasExpressoGeral(input: PontuacaoContasInput) {
  const qtdContasComDeposito = Math.max(safeNumber(input.qtdContasComDeposito), 0)
  const qtdContasSemDeposito = Math.max(safeNumber(input.qtdContasSemDeposito), 0)

  return (
    qtdContasComDeposito * PONTOS_EXPRESSO_GERAL_JUNHO_2026.CONTA_COM_DEPOSITO +
    qtdContasSemDeposito * PONTOS_EXPRESSO_GERAL_JUNHO_2026.CONTA_SEM_DEPOSITO
  )
}

export function calcPontosExpressoGeral(input: PontuacaoExpressoGeralJunho2026Input) {
  const qtdCestaServ = Math.max(safeNumber(input.qtdCestaServ), 0)
  const qtdSuperProtegido = Math.max(safeNumber(input.qtdSuperProtegido), 0)
  const vlrLime = Math.max(safeNumber(input.vlrLime), 0)
  const vlrConsignadoTotal = Math.max(safeNumber(input.vlrConsignadoTotal), 0)
  const vlrCreditoParcelado = Math.max(safeNumber(input.vlrCreditoParcelado), 0)
  const qtdMicrosseguro = Math.max(safeNumber(input.qtdMicrosseguro), 0)
  const qtdVivaVida = Math.max(safeNumber(input.qtdVivaVida), 0)
  const qtdPlanoOdonto = Math.max(safeNumber(input.qtdPlanoOdonto), 0)
  const qtdSegCartaoDeb = Math.max(safeNumber(input.qtdSegCartaoDeb), 0)
  const vlrExpSorte = Math.max(safeNumber(input.vlrExpSorte), 0)

  const limePts = Math.floor(vlrLime / 100)
  const consignadoPts = Math.floor(vlrConsignadoTotal / 1000)
  const creditoParceladoPts = Math.floor(vlrCreditoParcelado / 500)
  const expSortePts = Math.floor(vlrExpSorte / 50)

  return (
    calcPontosContasExpressoGeral({
      qtdContasComDeposito: input.qtdContasComDeposito,
      qtdContasSemDeposito: input.qtdContasSemDeposito,
    }) +
    qtdCestaServ * PONTOS_EXPRESSO_GERAL_JUNHO_2026.CESTA_SERVICO +
    qtdSuperProtegido * PONTOS_EXPRESSO_GERAL_JUNHO_2026.SUPER_PROTEGIDO +
    limePts * PONTOS_EXPRESSO_GERAL_JUNHO_2026.LIME_CADA_100_REAIS +
    consignadoPts * PONTOS_EXPRESSO_GERAL_JUNHO_2026.CONSIGNADO_CADA_1000_REAIS +
    creditoParceladoPts * PONTOS_EXPRESSO_GERAL_JUNHO_2026.CREDITO_PARCELADO_CADA_500_REAIS +
    qtdMicrosseguro * PONTOS_EXPRESSO_GERAL_JUNHO_2026.MICROSEGURO +
    qtdVivaVida * PONTOS_EXPRESSO_GERAL_JUNHO_2026.VIVA_VIDA +
    qtdPlanoOdonto * PONTOS_EXPRESSO_GERAL_JUNHO_2026.PLANO_ODONTO +
    qtdSegCartaoDeb * PONTOS_EXPRESSO_GERAL_JUNHO_2026.SEGURO_CARTAO_DEBITO +
    expSortePts * PONTOS_EXPRESSO_GERAL_JUNHO_2026.EXPRESSO_DA_SORTE_CADA_50_REAIS
  )
}
