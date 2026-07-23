'use client'

import { useState } from 'react'

type PerguntaCurso = {
  pergunta: string
  opcoes: string[]
  correta: number
  explicacao: string
}

const perguntasCurso: PerguntaCurso[] = [
  {
    pergunta:
      'É possível abrir Conta Corrente para menor de idade no Bradesco Expresso?',
    opcoes: [
      'Sim, desde que esteja acompanhado do responsável',
      'Sim, apenas para maiores de 14 anos',
      'Não. O responsável pode abrir uma conta para si e depois abrir uma Next Joy para o filho pelo aplicativo',
      'Sim, mas somente conta conjunta',
    ],
    correta: 2,
    explicacao:
      'A abertura de Conta Corrente para menores de idade não é mais realizada no Bradesco Expresso. O responsável pode abrir a própria conta e, no aplicativo, solicitar uma Next Joy para o filho.',
  },
  {
    pergunta: 'Qual é a finalidade da senha de 4 números?',
    opcoes: [
      'Compras com o cartão',
      'Acesso ao App Bradesco, Internet Banking e Fone Fácil',
      'Saque no caixa eletrônico',
      'Somente autorizar Pix',
    ],
    correta: 1,
    explicacao:
      'A senha de 4 números é usada nos canais digitais e de atendimento: App Bradesco, Internet Banking e Fone Fácil.',
  },
  {
    pergunta: 'Qual é a finalidade da senha de 6 dígitos?',
    opcoes: [
      'Acesso ao aplicativo',
      'Acesso ao Internet Banking',
      'Senha do cartão da conta',
      'Acesso ao Fone Fácil',
    ],
    correta: 2,
    explicacao:
      'A senha de 6 dígitos será a senha do cartão vinculado à conta.',
  },
  {
    pergunta: 'Qual documento deve ser apresentado na abertura da conta?',
    opcoes: [
      'Cópia simples de qualquer documento',
      'Documento original com foto e em bom estado de conservação',
      'Somente o CPF impresso',
      'Foto antiga do documento, mesmo que ilegível',
    ],
    correta: 1,
    explicacao:
      'O documento deve permitir a identificação do cliente e estar em perfeito estado de conservação.',
  },
  {
    pergunta: 'Qual situação impede o uso do documento?',
    opcoes: [
      'Documento com foto nítida',
      'Documento original e legível',
      'Documento rasgado, manchado ou rasurado',
      'Documento expedido por órgão oficial',
    ],
    correta: 2,
    explicacao:
      'Documentos rasgados, manchados, rasurados ou ilegíveis não devem ser aceitos.',
  },
  {
    pergunta: 'Antes de avançar, qual informação merece conferência especial?',
    opcoes: [
      'Somente o primeiro nome',
      'Telefone, e-mail e demais dados informados pelo cliente',
      'A cor da roupa do cliente',
      'A marca do celular',
    ],
    correta: 1,
    explicacao:
      'Telefone, e-mail e dados cadastrais precisam estar corretos para evitar falhas de contato e problemas posteriores.',
  },
  {
    pergunta: 'O que deve ser feito na etapa de biometria facial?',
    opcoes: [
      'Fotografar o documento no lugar do rosto',
      'Orientar o cliente a posicionar o rosto corretamente e seguir os comandos da tela',
      'Usar uma foto salva no celular',
      'Pular a etapa sempre que possível',
    ],
    correta: 1,
    explicacao:
      'A biometria facial deve ser feita com o cliente presente, com enquadramento adequado e seguindo as instruções exibidas.',
  },
  {
    pergunta: 'Como devem ser capturadas as imagens do documento?',
    opcoes: [
      'Com reflexo e pouca iluminação',
      'Somente a frente',
      'Frente e verso, com boa iluminação, sem cortes e com todos os dados legíveis',
      'Qualquer foto encontrada na galeria',
    ],
    correta: 2,
    explicacao:
      'As imagens precisam mostrar frente e verso de forma completa, nítida e sem reflexos.',
  },
  {
    pergunta: 'Qual é uma boa prática ao criar as duas senhas?',
    opcoes: [
      'O atendente escolher e anotar as senhas',
      'Usar a mesma senha para todos os clientes',
      'Explicar a finalidade de cada senha e garantir privacidade durante a digitação',
      'Informar a senha em voz alta',
    ],
    correta: 2,
    explicacao:
      'O cliente deve criar as próprias senhas com privacidade e entender para que cada uma será utilizada.',
  },
  {
    pergunta: 'O que fazer antes da confirmação final da abertura?',
    opcoes: [
      'Enviar sem conferir',
      'Revisar o resumo do contrato e os dados apresentados',
      'Fechar o simulador',
      'Alterar os dados sem autorização',
    ],
    correta: 1,
    explicacao:
      'A revisão final reduz erros e garante que o cliente conheça as condições e os dados enviados.',
  },
  {
    pergunta: 'Qual orientação deve ser dada sobre a Next Joy?',
    opcoes: [
      'É aberta diretamente no Expresso para qualquer menor',
      'Pode ser solicitada pelo responsável dentro do aplicativo após abrir a própria conta',
      'É uma conta exclusiva para empresas',
      'Não possui relação com menores de idade',
    ],
    correta: 1,
    explicacao:
      'A alternativa disponível para o filho é a Next Joy, aberta pelo responsável no aplicativo.',
  },
  {
    pergunta: 'Quando a conta for concluída, o que o atendente deve fazer?',
    opcoes: [
      'Encerrar sem orientar o cliente',
      'Explicar os próximos passos, o acesso ao aplicativo e reforçar o uso correto das senhas',
      'Guardar as senhas do cliente',
      'Solicitar que o cliente volte outro dia para receber orientações',
    ],
    correta: 1,
    explicacao:
      'A orientação final ajuda o cliente a utilizar a conta com segurança desde o primeiro acesso.',
  },
  {
    pergunta:
      'O que um aposentado ou pensionista do INSS deve ter em mãos para a abertura?',
    opcoes: [
      'Somente o cartão do benefício',
      'O Número do Benefício (NB)',
      'Apenas o extrato bancário',
      'Somente a senha do Meu INSS',
    ],
    correta: 1,
    explicacao:
      'O Número do Benefício pode ser encontrado na carta de concessão, no aplicativo Meu INSS ou solicitado em uma agência do INSS.',
  },
  {
    pergunta:
      'O que é necessário para abrir conta para uma pessoa não alfabetizada?',
    opcoes: [
      'Apenas uma autorização verbal',
      'Os dados de duas testemunhas: nome completo e CPF',
      'Somente a assinatura de um familiar',
      'Nenhuma informação adicional',
    ],
    correta: 1,
    explicacao:
      'É necessário informar o nome completo e o CPF de duas testemunhas.',
  },
  {
    pergunta: 'É possível abrir conta conjunta no Bradesco Expresso?',
    opcoes: [
      'Não, nunca',
      'Sim, desde que todos os interessados estejam presentes e com seus documentos originais',
      'Sim, sem a presença dos titulares',
      'Somente pela agência',
    ],
    correta: 1,
    explicacao:
      'Todos os interessados devem estar presentes no atendimento e portar seus documentos originais.',
  },
  {
    pergunta:
      'O que significa a mensagem “AGRADECEMOS O INTERESSE” durante a abertura?',
    opcoes: [
      'A conta foi aprovada',
      'A abertura deve ser reiniciada no tablet',
      'A conta não poderá ser aberta pelo Expresso e o cliente deverá procurar uma agência',
      'O cliente deve aguardar somente cinco minutos',
    ],
    correta: 2,
    explicacao:
      'A solicitação foi avaliada pelo Banco e deverá ser tratada em uma agência.',
  },
  {
    pergunta:
      'Cartão de crédito, crédito pessoal e cheque especial aparecem sempre na jornada?',
    opcoes: [
      'Sim, para todos os clientes',
      'Não. Dependem da avaliação de cada cliente',
      'Sim, desde que o cliente solicite',
      'Somente para aposentados',
    ],
    correta: 1,
    explicacao:
      'Esses produtos podem ou não ser ofertados, conforme a avaliação realizada pelo Banco.',
  },
  {
    pergunta:
      'Como deve ser tratado o seguro do cartão de débito durante a abertura?',
    opcoes: [
      'Não deve ser apresentado',
      'Deve ser sempre ofertado, com explicação clara e contratação somente com consentimento',
      'Deve ser incluído automaticamente',
      'Só deve ser oferecido quando houver cartão de crédito',
    ],
    correta: 1,
    explicacao:
      'O seguro deve ser apresentado ao cliente, respeitando sua decisão e sem contratação automática.',
  },
]

function CursoIcone({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-2xl">
      {children}
    </div>
  )
}

function BlocoCurso({
  titulo,
  texto,
  icone,
}: {
  titulo: string
  texto: string
  icone: string
}) {
  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <CursoIcone>{icone}</CursoIcone>
        <div>
          <h3 className="text-xl font-bold text-zinc-900">{titulo}</h3>
          <p className="mt-2 leading-7 text-zinc-600">{texto}</p>
        </div>
      </div>
    </article>
  )
}

function QuizContaCorrente() {
  const [respostas, setRespostas] = useState<Record<number, number>>({})
  const [finalizado, setFinalizado] = useState(false)

  const acertos = perguntasCurso.reduce((total, pergunta, indice) => {
    return total + (respostas[indice] === pergunta.correta ? 1 : 0)
  }, 0)

  const percentual = Math.round((acertos / perguntasCurso.length) * 100)
  const aprovado = percentual >= 70

  function reiniciar() {
    setRespostas({})
    setFinalizado(false)
  }

  return (
    <section id="quiz" className="scroll-mt-24 bg-gradient-to-b from-[#fff5f7] to-[#fdecef] px-5 py-20 text-zinc-900 md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10">
          <span className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold uppercase tracking-wider">
            Avaliação
          </span>
          <h2 className="mt-5 text-3xl font-black md:text-5xl">
            Quiz — Abertura de Conta
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-600">
            Responda às questões e obtenha pelo menos 70% de aproveitamento.
          </p>
        </div>

        <div className="space-y-6">
          {perguntasCurso.map((pergunta, indice) => (
            <article
              key={pergunta.pergunta}
              className="rounded-3xl border border-red-100 bg-white shadow-sm p-6 md:p-8"
            >
              <p className="text-sm font-bold uppercase tracking-wider text-red-400">
                Questão {indice + 1}
              </p>
              <h3 className="mt-3 text-xl font-bold leading-8">
                {pergunta.pergunta}
              </h3>

              <div className="mt-6 grid gap-3">
                {pergunta.opcoes.map((opcao, opcaoIndice) => {
                  const selecionada = respostas[indice] === opcaoIndice
                  const correta = pergunta.correta === opcaoIndice

                  let classe =
                    'border-red-100 bg-white hover:border-red-400 hover:bg-red-50'

                  if (selecionada) {
                    classe = 'border-red-500 bg-red-50'
                  }

                  if (finalizado && correta) {
                    classe = 'border-emerald-500 bg-emerald-50'
                  }

                  if (finalizado && selecionada && !correta) {
                    classe = 'border-red-500 bg-red-100'
                  }

                  return (
                    <button
                      key={opcao}
                      type="button"
                      disabled={finalizado}
                      onClick={() =>
                        setRespostas((atual) => ({
                          ...atual,
                          [indice]: opcaoIndice,
                        }))
                      }
                      className={`rounded-2xl border p-4 text-left font-semibold transition ${classe}`}
                    >
                      {opcao}
                    </button>
                  )
                })}
              </div>

              {finalizado && (
                <p className="mt-5 rounded-2xl bg-red-50 p-4 leading-7 text-zinc-700 border border-red-100">
                  <strong className="text-white">Explicação:</strong>{' '}
                  {pergunta.explicacao}
                </p>
              )}
            </article>
          ))}
        </div>

        {!finalizado ? (
          <button
            type="button"
            disabled={Object.keys(respostas).length !== perguntasCurso.length}
            onClick={() => setFinalizado(true)}
            className="mt-10 w-full rounded-2xl bg-[#cc092f] px-6 py-5 text-lg font-black text-white shadow-lg transition hover:bg-[#b0003a] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Finalizar avaliação
          </button>
        ) : (
          <div className="mt-10 rounded-3xl border border-red-100 bg-white p-8 text-center text-zinc-900 shadow-lg">
            <p className="text-lg font-bold">Resultado final</p>
            <p className="mt-3 text-5xl font-black">{percentual}%</p>
            <p className="mt-3 text-lg">
              Você acertou {acertos} de {perguntasCurso.length} questões.
            </p>
            <p
              className={`mt-5 text-xl font-black ${
                aprovado ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {aprovado
                ? 'Aprovado! Você concluiu o curso.'
                : 'Revise o conteúdo e tente novamente.'}
            </p>
            <button
              type="button"
              onClick={reiniciar}
              className="mt-7 rounded-full bg-[#cc092f] px-8 py-4 font-bold text-white shadow-lg hover:bg-[#b0003a]"
            >
              Refazer avaliação
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

export default function CursoContaCorrente() {
  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#cc092f] via-[#b0003a] to-[#6e003d] px-5 py-20 text-white md:px-10 md:py-28">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-black/20 blur-3xl" />

        <div className="relative mx-auto max-w-6xl">
          <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.18em]">
            Curso TreinExpresso
          </span>

          <div className="mt-8 grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h1 className="text-4xl font-black leading-tight md:text-6xl">
                Abertura de Conta Corrente
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/85 md:text-xl">
                Aprenda o processo completo de abertura de conta no Bradesco
                Expresso, pratique no simulador e conheça os cuidados que evitam
                retrabalho e reprovação.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <a
                  href="#conteudo"
                  className="inline-flex items-center justify-center rounded-full border-2 border-white bg-white px-7 py-4 font-black shadow-lg transition hover:-translate-y-0.5 hover:bg-red-50"
                  style={{ color: "#a00038" }}
                >
                  Começar o curso
                </a>
                <a
                  href="/dashboard/simulador/abertura-conta/"
                  className="rounded-full border border-white/40 bg-white/10 px-7 py-4 font-black text-white transition hover:bg-white/20"
                >
                  Abrir simulador
                </a>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/20 bg-white/10 p-7 backdrop-blur">
              <p className="text-sm font-bold uppercase tracking-wider text-white/70">
                Você vai aprender
              </p>
              <ul className="mt-5 space-y-4 text-lg font-semibold">
                <li>✓ Regras para abertura da conta</li>
                <li>✓ Documentos aceitos e conservação</li>
                <li>✓ Diferença entre as duas senhas</li>
                <li>✓ Fluxo completo no tablet</li>
                <li>✓ Biometria, contrato e conclusão</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="conteudo" className="scroll-mt-24 px-5 py-20 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <span className="font-black uppercase tracking-wider text-[#cc092f]">
              Antes de iniciar
            </span>
            <h2 className="mt-3 text-3xl font-black md:text-5xl">
              Regras essenciais
            </h2>
            <p className="mt-5 text-lg leading-8 text-zinc-600">
              Uma abertura bem-feita começa pela orientação correta ao cliente
              e pela conferência cuidadosa de documentos, dados e senhas.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <BlocoCurso
              icone="👤"
              titulo="Conta para menor de idade"
              texto="Não é mais realizada abertura de Conta Corrente para menor de idade no Bradesco Expresso. O responsável pode abrir uma conta para si e, pelo aplicativo, solicitar uma conta Next Joy para o filho."
            />
            <BlocoCurso
              icone="🪪"
              titulo="Documento original e conservado"
              texto="O cliente deve apresentar documento de identificação original com foto, legível e em perfeito estado. Não aceite documentos rasgados, manchados, rasurados ou com informações comprometidas."
            />
            <BlocoCurso
              icone="🔐"
              titulo="Senha de 4 números"
              texto="É utilizada para acessar o App Bradesco, o Internet Banking e o Fone Fácil. O cliente deve criá-la com privacidade."
            />
            <BlocoCurso
              icone="💳"
              titulo="Senha de 6 dígitos"
              texto="Será a senha do cartão da conta. Explique claramente a diferença entre as duas senhas antes de concluir o cadastro."
            />
          </div>
        </div>
      </section>

      <section className="bg-zinc-50 px-5 py-20 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <span className="font-black uppercase tracking-wider text-[#cc092f]">
                Documentação
              </span>
              <h2 className="mt-3 text-3xl font-black md:text-5xl">
                Documentos aceitos
              </h2>
              <p className="mt-5 text-lg leading-8 text-zinc-600">
                O documento deve ser expedido por órgão oficial ou conselho
                regulador, conter dados que identifiquem o cliente e estar em
                boas condições de leitura e conservação.
              </p>

              <div className="mt-7 rounded-3xl border-l-8 border-[#cc092f] bg-white p-6 shadow-sm">
                <p className="font-black text-[#cc092f]">Fique atento</p>
                <p className="mt-2 leading-7 text-zinc-600">
                  Documentos fora da relação podem ser submetidos à análise.
                  Nunca force a continuidade quando a identificação estiver
                  danificada ou ilegível.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                'RG e RG Digital',
                'CNH física e CNH Digital',
                'DNI e DNI Digital',
                'Passaporte Nacional',
                'RNE / Registro Nacional Migratório',
                'Documento Provisório de Registro Nacional Migratório',
                'CTPS, inclusive para estrangeiro',
                'Carteiras de órgãos de classe',
                'Carteira de Identidade Funcional',
                'Identidades militares',
                'Protocolo de Solicitação de Refúgio',
                'Documentos expedidos por órgão oficial',
              ].map((documento) => (
                <div
                  key={documento}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 font-bold text-zinc-700 shadow-sm"
                >
                  ✓ {documento}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <span className="font-black uppercase tracking-wider text-[#cc092f]">
              Informações essenciais
            </span>
            <h2 className="mt-3 text-3xl font-black md:text-5xl">
              Situações que exigem atenção especial
            </h2>
            <p className="mt-5 text-lg leading-8 text-zinc-600">
              Antes de iniciar a abertura, identifique corretamente o perfil do
              cliente e confirme se ele possui todas as informações necessárias
              para concluir a jornada.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <article className="rounded-3xl border border-red-100 bg-[#fff7f8] p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <CursoIcone>👵</CursoIcone>
                <div>
                  <h3 className="text-xl font-black text-zinc-900">
                    Aposentado ou pensionista do INSS
                  </h3>
                  <p className="mt-3 leading-7 text-zinc-600">
                    É necessário informar o Número do Benefício (NB). Esse número
                    pode ser localizado na carta de concessão do INSS ou no
                    aplicativo Meu INSS. Caso o cliente não o encontre, também
                    poderá solicitá-lo em uma agência do INSS.
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-red-100 bg-[#fff7f8] p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <CursoIcone>✍️</CursoIcone>
                <div>
                  <h3 className="text-xl font-black text-zinc-900">
                    Cliente não alfabetizado
                  </h3>
                  <p className="mt-3 leading-7 text-zinc-600">
                    Para abrir a conta de uma pessoa não alfabetizada, será
                    necessário informar os dados de duas testemunhas: nome
                    completo e CPF de cada uma.
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-red-100 bg-[#fff7f8] p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <CursoIcone>👥</CursoIcone>
                <div>
                  <h3 className="text-xl font-black text-zinc-900">
                    Conta conjunta
                  </h3>
                  <p className="mt-3 leading-7 text-zinc-600">
                    É possível abrir conta conjunta no Bradesco Expresso, desde
                    que todos os interessados estejam presentes no atendimento
                    e portando seus documentos originais.
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-red-100 bg-[#fff7f8] p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <CursoIcone>🏦</CursoIcone>
                <div>
                  <h3 className="text-xl font-black text-zinc-900">
                    Abertura sujeita à avaliação do Banco
                  </h3>
                  <p className="mt-3 leading-7 text-zinc-600">
                    Toda solicitação passa pela avaliação do Banco. Caso apareça
                    a mensagem “AGRADECEMOS O INTERESSE”, a conta não poderá ser
                    aberta pelo Expresso e o cliente deverá procurar uma agência.
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-red-100 bg-[#fff7f8] p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <CursoIcone>💳</CursoIcone>
                <div>
                  <h3 className="text-xl font-black text-zinc-900">
                    Produtos sujeitos à análise
                  </h3>
                  <p className="mt-3 leading-7 text-zinc-600">
                    Cartão de crédito, limite de crédito pessoal e limite de
                    cheque especial são disponibilizados conforme a avaliação
                    de cada cliente. Por isso, podem ou não aparecer durante a
                    jornada de abertura.
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-red-200 bg-gradient-to-br from-[#fff3f5] to-[#fde7ec] p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <CursoIcone>🛡️</CursoIcone>
                <div>
                  <h3 className="text-xl font-black text-[#b0003a]">
                    Seguro do cartão de débito
                  </h3>
                  <p className="mt-3 leading-7 text-zinc-700">
                    O seguro do cartão de débito deve ser sempre apresentado ao
                    cliente durante a abertura da conta, explicando seus
                    benefícios e condições de forma clara, sem realizar a
                    contratação sem o consentimento do cliente.
                  </p>
                </div>
              </div>
            </article>
          </div>

          <div className="mt-8 rounded-3xl border-l-8 border-[#cc092f] bg-[#fff7f8] p-6 shadow-sm">
            <p className="text-lg font-black text-[#b0003a]">
              Importante
            </p>
            <p className="mt-2 leading-7 text-zinc-700">
              A oferta de produtos deve respeitar a análise apresentada pelo
              sistema e a decisão do cliente. Nunca prometa aprovação de cartão,
              limites ou cheque especial antes da conclusão da avaliação.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-10">
        <div className="mx-auto max-w-6xl">
          <span className="font-black uppercase tracking-wider text-[#cc092f]">
            Jornada no tablet
          </span>
          <h2 className="mt-3 text-3xl font-black md:text-5xl">
            Etapas da abertura
          </h2>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              ['01', 'CPF e tipo de conta', 'Informe o CPF, escolha o tipo de conta e confirme a renda mensal.'],
              ['02', 'Biometria e contatos', 'Realize a biometria e confira celular, e-mail e autorização de contato.'],
              ['03', 'Dados pessoais', 'Preencha nascimento, endereço, profissão e residência fiscal.'],
              ['04', 'Documento', 'Escolha o documento, fotografe frente e verso e confira os dados.'],
              ['05', 'Criação das senhas', 'Cadastre a senha de 4 números e, depois, a senha de 6 dígitos do cartão.'],
              ['06', 'Produtos e serviços', 'Apresente seguro do cartão, cesta de serviços, cartão e limites sem induzir o cliente.'],
              ['07', 'Contrato', 'Revise o resumo, permita a leitura dos termos e registre os aceites.'],
              ['08', 'Biometria final', 'Faça a validação final conforme as orientações da tela.'],
              ['09', 'Conta aberta', 'Oriente o cliente sobre aplicativo, segurança e próximos passos.'],
            ].map(([numero, titulo, texto]) => (
              <article
                key={numero}
                className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <p className="text-4xl font-black text-red-100">{numero}</p>
                <h3 className="mt-3 text-xl font-black">{titulo}</h3>
                <p className="mt-3 leading-7 text-zinc-600">{texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f7edf0] px-5 py-20 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <span className="font-black uppercase tracking-wider text-[#cc092f]">
                Dicas do instrutor
              </span>
              <h2 className="mt-3 text-3xl font-black md:text-5xl">
                Evite os erros mais comuns
              </h2>
            </div>

            <div className="space-y-4">
              {[
                'Confira CPF, nome, telefone e e-mail antes de avançar.',
                'Evite reflexos, cortes e sombras nas fotos do documento.',
                'Garanta privacidade total durante a criação das senhas.',
                'Não escolha produtos ou serviços pelo cliente.',
                'Explique o contrato e confirme os aceites antes do envio.',
                'Ao finalizar, oriente o primeiro acesso ao aplicativo.',
              ].map((dica) => (
                <div
                  key={dica}
                  className="flex gap-4 rounded-2xl bg-white p-5 shadow-sm"
                >
                  <span className="font-black text-[#cc092f]">✓</span>
                  <p className="font-semibold leading-7 text-zinc-700">{dica}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="simulador" className="scroll-mt-24 px-5 py-20 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[2rem] bg-gradient-to-br from-[#cc092f] via-[#b0003a] to-[#8b0037] p-7 text-white shadow-xl md:p-10">
            <span className="font-black uppercase tracking-wider text-red-400">
              Hora de praticar
            </span>
            <h2 className="mt-3 text-3xl font-black md:text-5xl">
              Simulador de abertura de conta
            </h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/90">
              Percorra todas as telas como se estivesse realizando um atendimento.
              Os dados são apenas para treinamento.
            </p>

            <a
              href="/dashboard/simulador/abertura-conta/"
              className="mt-8 inline-flex items-center rounded-full bg-[#cc092f] px-8 py-4 font-black text-white shadow-lg transition hover:bg-[#b0003a]"
            >
              Vamos praticar
            </a>
          </div>
        </div>
      </section>

      <QuizContaCorrente />
    </main>
  )
}
