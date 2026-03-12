export type PontuacaoExpressoGeralInput = {
  qtdContasComDeposito?: number
  qtdContasSemDeposito?: number
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
}

export type PontuacaoContasInput = {
  qtdContasComDeposito?: number
  qtdContasSemDeposito?: number
}

export const PONTOS_EXPRESSO_GERAL = {
  CONTA_COM_DEPOSITO: 7,
  CONTA_SEM_DEPOSITO: 3,
  CESTA_SERVICO: 4,
  SUPER_PROTEGIDO: 1,
  MOBILIDADE: 0.5,
  LIME: 7,
  CONSIGNADO: 5.5,
  CREDITO_PARCELADO: 7,
  MICROSEGURO: 1,
  VIVA_VIDA: 1,
  PLANO_ODONTO: 1,
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
    qtdContasComDeposito * PONTOS_EXPRESSO_GERAL.CONTA_COM_DEPOSITO +
    qtdContasSemDeposito * PONTOS_EXPRESSO_GERAL.CONTA_SEM_DEPOSITO
  )
}

export function calcPontosExpressoGeral(input: PontuacaoExpressoGeralInput) {
  const qtdCestaServ = Math.max(safeNumber(input.qtdCestaServ), 0)
  const qtdSuperProtegido = Math.max(safeNumber(input.qtdSuperProtegido), 0)
  const qtdMobilidade = Math.max(safeNumber(input.qtdMobilidade), 0)
  const qtdLime = Math.max(safeNumber(input.qtdLime), 0)
  const qtdConsignado = Math.max(safeNumber(input.qtdConsignado), 0)
  const qtdCreditoParcelado = Math.max(safeNumber(input.qtdCreditoParcelado), 0)
  const qtdMicrosseguro = Math.max(safeNumber(input.qtdMicrosseguro), 0)
  const qtdVivaVida = Math.max(safeNumber(input.qtdVivaVida), 0)
  const qtdPlanoOdonto = Math.max(safeNumber(input.qtdPlanoOdonto), 0)
  const qtdSegCartaoDeb = Math.max(safeNumber(input.qtdSegCartaoDeb), 0)
  const vlrExpSorte = Math.max(safeNumber(input.vlrExpSorte), 0)

  const expSortePts = Math.floor(vlrExpSorte / 50)

  return (
    calcPontosContasExpressoGeral({
      qtdContasComDeposito: input.qtdContasComDeposito,
      qtdContasSemDeposito: input.qtdContasSemDeposito,
    }) +
    qtdCestaServ * PONTOS_EXPRESSO_GERAL.CESTA_SERVICO +
    qtdSuperProtegido * PONTOS_EXPRESSO_GERAL.SUPER_PROTEGIDO +
    qtdMobilidade * PONTOS_EXPRESSO_GERAL.MOBILIDADE +
    qtdLime * PONTOS_EXPRESSO_GERAL.LIME +
    qtdConsignado * PONTOS_EXPRESSO_GERAL.CONSIGNADO +
    qtdCreditoParcelado * PONTOS_EXPRESSO_GERAL.CREDITO_PARCELADO +
    qtdMicrosseguro * PONTOS_EXPRESSO_GERAL.MICROSEGURO +
    qtdVivaVida * PONTOS_EXPRESSO_GERAL.VIVA_VIDA +
    qtdPlanoOdonto * PONTOS_EXPRESSO_GERAL.PLANO_ODONTO +
    qtdSegCartaoDeb * PONTOS_EXPRESSO_GERAL.SEGURO_CARTAO_DEBITO +
    expSortePts * PONTOS_EXPRESSO_GERAL.EXPRESSO_DA_SORTE_CADA_50_REAIS
  )
}
