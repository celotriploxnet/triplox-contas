export type TipoChamado =
  | 'SOLICITACAO'
  | 'PROBLEMA'
  | 'RECLAMACAO'
  | 'ELOGIO_SUGESTAO'

export type StatusChamado = 'ABERTO' | 'SOLUCIONADO'

export type Chamado = {
  id: string
  protocolo: string

  userId: string
  userEmail: string
  userName: string

  expressoKey: string
  nomeExpresso: string
  agencia: string
  pacb: string
  statusExpresso: string

  tipo: TipoChamado
  contatoNome: string
  contatoTelefone: string
  descricao: string

  statusChamado: StatusChamado

  solucaoTexto?: string

  createdAt?: any
  updatedAt?: any
  resolvedAt?: any
  resolvedBy?: string
  statusChangedAt?: any
}

export function gerarProtocolo() {
  const agora = new Date()
  const yyyy = agora.getFullYear()
  const mm = String(agora.getMonth() + 1).padStart(2, '0')
  const dd = String(agora.getDate()).padStart(2, '0')
  const hh = String(agora.getHours()).padStart(2, '0')
  const mi = String(agora.getMinutes()).padStart(2, '0')
  const ss = String(agora.getSeconds()).padStart(2, '0')
  const aleatorio = Math.floor(1000 + Math.random() * 9000)

  return `REP-${yyyy}${mm}${dd}-${hh}${mi}${ss}-${aleatorio}`
}

export function normalizarChaveLoja(value: string) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]/g, '')
    .toUpperCase()
}

export function labelTipoChamado(tipo: TipoChamado) {
  switch (tipo) {
    case 'SOLICITACAO':
      return 'Solicitação'
    case 'PROBLEMA':
      return 'Problema'
    case 'RECLAMACAO':
      return 'Reclamação'
    case 'ELOGIO_SUGESTAO':
      return 'Elogios e Sugestões'
    default:
      return tipo
  }
}