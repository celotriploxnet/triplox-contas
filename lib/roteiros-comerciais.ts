export type RoteiroProduto = {
  id: string
  nome: string
  curso: string
  comissaoId?: string
  comissaoIds?: string[]
  abertura: string
  perguntas: string[]
  pontos: string[]
  fechamento: string
  cuidado: string
}

export const ROTEIROS_COMERCIAIS: RoteiroProduto[] = [
  {
    id: 'conta', nome: 'Abertura de conta', curso: 'Conta Corrente', comissaoIds: ['conta_pf_com_deposito', 'conta_pf_sem_deposito'],
    abertura: 'Quero entender como vocês estão trabalhando a abertura de contas e identificar onde podemos facilitar a jornada do cliente.',
    perguntas: ['Quais perfis de clientes mais procuram vocês para abrir conta?', 'Em que etapa os atendimentos costumam travar?', 'A equipe está apresentando os serviços e o cartão junto com a abertura?'],
    pontos: ['Mapeie o perfil e a necessidade antes de iniciar a proposta.', 'Explique os serviços e condições da conta com clareza.', 'Use o curso de Conta Corrente para revisar a jornada, documentos e ofertas complementares.'],
    fechamento: 'Qual ação simples a equipe consegue colocar em prática nesta semana para aumentar as propostas completas?',
    cuidado: 'Confirme tarifas, documentos, elegibilidade e condições vigentes no sistema antes de orientar.'
  },
  {
    id: 'cartao', nome: 'Cartão de crédito', curso: 'Cartão / Conta Corrente', comissaoId: 'cartao_credito_venda',
    abertura: 'Queria conversar sobre como identificar clientes que podem aproveitar melhor o cartão de crédito e como apresentar a oferta com segurança.',
    perguntas: ['Os clientes conhecem a oferta disponível para eles?', 'A equipe explica vencimento, limite e forma de pagamento?', 'Em que momento do atendimento o cartão é oferecido?'],
    pontos: ['Consulte a disponibilidade individual antes de falar de limite ou aprovação.', 'Apresente benefícios e custos que aparecem na oferta do cliente.', 'Combine a apresentação do cartão com atendimentos de abertura ou atualização cadastral.'],
    fechamento: 'Vamos combinar uma pergunta de sondagem para a equipe usar nos próximos atendimentos?',
    cuidado: 'Limite, aprovação, anuidade e condições variam conforme a oferta individual; consulte a tela antes de afirmar.'
  },
  {
    id: 'pessoal', nome: 'Empréstimo pessoal', curso: 'Empréstimo Pessoal', comissaoId: 'credito_parcelado_lime',
    abertura: 'Quero apoiar vocês a identificar quando o crédito pessoal pode fazer sentido para o cliente e apresentar a proposta com transparência.',
    perguntas: ['O cliente explicou para que precisa do crédito?', 'Qual valor de parcela caberia no orçamento sem comprometer despesas essenciais?', 'A equipe costuma mostrar o CET e o total a pagar?'],
    pontos: ['Entenda a necessidade e a capacidade de pagamento antes de simular.', 'Apresente taxa, IOF, despesas, CET, prazo e valor total antes da confirmação.', 'A oferta pode prever até 90 dias para a primeira parcela e até 72 parcelas, sempre conforme simulação e análise.'],
    fechamento: 'Podemos revisar juntos uma simulação e treinar como explicar o custo total ao cliente?',
    cuidado: 'Crédito sujeito à análise e disponibilidade. Seguro de proteção financeira é opcional; não prometa aprovação.'
  },
  {
    id: 'inss', nome: 'Consignado INSS', curso: 'Crédito Consignado INSS', comissaoId: 'consignado',
    abertura: 'Vamos revisar como orientar o beneficiário do INSS desde a consulta até a confirmação da proposta?',
    perguntas: ['A equipe confirma se o benefício está ativo há mais de 90 dias?', 'Os clientes chegam com o benefício desbloqueado para contratar?', 'Quem acompanha a confirmação no Meu INSS depois da proposta?'],
    pontos: ['Confirme benefício ativo há mais de 90 dias e desbloqueio no Meu INSS.', 'Solicite autorização para consulta Dataprev e confira se os dados cadastrais coincidem.', 'Oriente o cliente a confirmar a proposta no Meu INSS em até 5 dias corridos.'],
    fechamento: 'Quem ficará responsável por acompanhar o cliente até a confirmação no Meu INSS?',
    cuidado: 'Elegibilidade, margem e condições devem ser consultadas. Não solicite senhas nem faça etapas em nome do cliente.'
  },
  {
    id: 'publico', nome: 'Consignado público', curso: 'Consignado público', comissaoId: 'consignado',
    abertura: 'Quero entender como a equipe identifica servidores elegíveis e apresenta o consignado de forma consultiva.',
    perguntas: ['Quais convênios e órgãos aparecem com mais frequência na região?', 'A equipe verifica margem e vínculo antes de iniciar?', 'Como vocês comparam prazo, parcela e custo total com o cliente?'],
    pontos: ['Confirme convênio, vínculo, margem e condições disponíveis antes da simulação.', 'Apresente valor líquido, parcelas, prazo, taxas e custo total.', 'Retome o contato após a simulação para tirar dúvidas, sem pressionar o cliente.'],
    fechamento: 'Qual convênio vocês querem priorizar e quando fazemos um retorno para revisar os resultados?',
    cuidado: 'As regras mudam por convênio e perfil. Valide elegibilidade, margem e condições na plataforma vigente.'
  },
  {
    id: 'vivavida', nome: 'Seguro de Vida Viva Vida', curso: 'Vida Viva', comissaoId: 'vida_viva',
    abertura: 'Posso fazer algumas perguntas sobre como o cliente pensa na proteção financeira da família?',
    perguntas: ['Quem depende financeiramente do cliente?', 'Ele já conhece as coberturas e serviços disponíveis?', 'Qual valor de proteção cabe no planejamento mensal?'],
    pontos: ['O curso apresenta dois planos anuais: R$ 40 com capital de R$ 5 mil e R$ 70 com capital de R$ 15 mil para morte acidental e invalidez.', 'Os planos incluem assistência funeral, cesta básica e sorteio mensal de R$ 75 mil, conforme regulamento.', 'O material indica carência de 24 horas; confira elegibilidade, condições e aceite presencial no tablet.'],
    fechamento: 'Quer que eu mostre as opções e as condições completas para você avaliar com calma?',
    cuidado: 'Explique carências, elegibilidade, exclusões e regulamento; confirme sempre as condições vigentes do plano.'
  },
  {
    id: 'micro', nome: 'Microsseguro Proteção Premiável', curso: 'Microsseguro', comissaoId: 'microsseguro',
    abertura: 'Queria apresentar uma opção de proteção mais simples e entender se ela combina com o que o cliente procura.',
    perguntas: ['O cliente busca uma proteção de menor custo?', 'Ele gostaria de conhecer assistências e participação em sorteios?', 'Quem ele gostaria de indicar como beneficiário?'],
    pontos: ['O material do curso apresenta prêmio anual de R$ 30, sujeito às condições vigentes.', 'Explique cobertura para morte acidental, assistência funeral, cesta básica e sorteios conforme regulamento.', 'Mostre o valor e o funcionamento antes de iniciar a contratação.'],
    fechamento: 'Posso apresentar as condições e o regulamento para você avaliar se faz sentido?',
    cuidado: 'Confirme coberturas, elegibilidade, vigência, carências e regras do regulamento antes da oferta.'
  },
  {
    id: 'dental', nome: 'Plano Dental Bradesco Expresso', curso: 'Plano Odontológico', comissaoId: 'plano_odontologico',
    abertura: 'Queria saber como o cliente cuida da saúde bucal e se gostaria de conhecer o plano odontológico.',
    perguntas: ['Ele tem plano odontológico hoje?', 'Há outras pessoas da família que gostaria de incluir?', 'Ele gostaria de consultar rede credenciada e coberturas antes de decidir?'],
    pontos: ['O curso apresenta mensalidade de R$ 39,49 por pessoa; confirme o valor vigente.', 'Apresente rede, coberturas e carências: 24 horas para urgência, 90 dias para demais especialidades e 180 dias para próteses.', 'A carteirinha e consulta da rede ficam disponíveis no aplicativo Bradesco Seguros.'],
    fechamento: 'Vamos consultar a rede e as condições para a região antes de avançar?',
    cuidado: 'Explique carências e procedimentos não cobertos; preço e condições devem ser confirmados no momento da contratação.'
  },
  {
    id: 'residencial', nome: 'Seguro Residencial Bradesco Expresso', curso: 'Seguro Residencial', comissaoId: 'residencial',
    abertura: 'Posso perguntar como o cliente protege a casa e os bens que são importantes para ele?',
    perguntas: ['O imóvel é próprio ou alugado?', 'Quais imprevistos domésticos mais preocupam o cliente?', 'Ele prefere conhecer opções de cobertura e preço antes de escolher?'],
    pontos: ['Apresente os cinco planos predefinidos e compare coberturas, limites e preços.', 'Explique a forma de pagamento mensal e revise endereço e dados antes da contratação.', 'Use exemplos apenas das coberturas previstas no plano escolhido.'],
    fechamento: 'Quer comparar os planos para identificar qual se encaixa melhor no imóvel e no orçamento?',
    cuidado: 'O curso informa que não há cobertura para alagamento ou danos elétricos; confirme todas as exclusões e limites.'
  },
  {
    id: 'superprotegido', nome: 'Seguro Super Protegido Cartão', curso: 'Super Protegido', comissaoId: 'superprotegido',
    abertura: 'Queria entender como o cliente usa o cartão e se já conhece as opções de proteção associadas a ele.',
    perguntas: ['O cliente costuma usar cartão de débito, crédito ou ambos?', 'Já passou por alguma situação em que gostaria de ter uma proteção adicional?', 'Ele quer conhecer coberturas, limites e custo antes de decidir?'],
    pontos: ['Apresente a proteção vinculada ao cartão e explique as situações cobertas conforme o material do curso.', 'Confirme preço, franquias, limites e exclusões da oferta vigente.', 'Não confunda proteção do cartão com seguro de vida ou proteção financeira de empréstimo.'],
    fechamento: 'Posso abrir as condições disponíveis e explicar o que está incluído para você comparar?',
    cuidado: 'Não prometa cobertura sem conferir o regulamento e as condições da versão vigente.'
  },
  {
    id: 'desbloqueio', nome: 'Desbloqueio de cartão de crédito e débito', curso: 'Cartão / atendimento',
    abertura: 'Vou ajudar você a entender o motivo do bloqueio e encontrar o canal seguro para regularizar o cartão.',
    perguntas: ['Qual cartão está bloqueado: débito, crédito ou ambos?', 'O cliente tem acesso ao aplicativo ou outro canal oficial?', 'Aparece alguma mensagem ou pedido de atualização cadastral?'],
    pontos: ['Identifique o tipo de cartão e a mensagem apresentada.', 'Oriente o desbloqueio somente pelo canal oficial disponibilizado ao cliente.', 'Depois de resolver, confirme se o cartão voltou a funcionar e se há outra necessidade relacionada.'],
    fechamento: 'Vamos conferir juntos o canal oficial e confirmar o desbloqueio com você?',
    cuidado: 'Nunca peça senha, token ou código de segurança. Não existe comissão associada a desbloqueio no simulador.'
  },
]
