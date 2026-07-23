"use client";

import { useState } from "react";
import styles from "./ProvaDeVida.module.css";

type QuizItem = {
  pergunta: string;
  opcoes: string[];
  correta: number;
};

const caminhoPos = [
  ["4", "Outras Funções"],
  ["7", "INSS"],
  ["1", "Revalidação INSS"],
  ["1", "Titular"],
];

const quiz: QuizItem[] = [
  {
    pergunta: "Qual é o objetivo da Prova de Vida?",
    opcoes: [
      "Solicitar um empréstimo",
      "Comprovar a vida do beneficiário",
      "Alterar a senha do cartão",
      "Abrir uma conta",
    ],
    correta: 1,
  },
  {
    pergunta: "Quem pode realizar a Prova de Vida pelo POS?",
    opcoes: [
      "Todos os Expressos",
      "Somente agências bancárias",
      "Expressos com status de Órgão Pagador",
      "Somente o próprio INSS",
    ],
    correta: 2,
  },
  {
    pergunta: "O que o cliente precisa ter para realizar pelo POS?",
    opcoes: [
      "Somente o CPF",
      "Cartão da conta-corrente Bradesco e senha",
      "Carteira de trabalho",
      "Comprovante de residência",
    ],
    correta: 1,
  },
  {
    pergunta: "Quem deve digitar a senha no PIN Pad?",
    opcoes: [
      "O atendente",
      "O gerente",
      "O próprio cliente",
      "Qualquer acompanhante",
    ],
    correta: 2,
  },
  {
    pergunta: "Em quanto tempo a realização pelo tablet é enviada ao INSS?",
    opcoes: [
      "Imediatamente em todos os casos",
      "Em até 1 dia útil",
      "Em até 10 dias úteis",
      "Somente no mês seguinte",
    ],
    correta: 1,
  },
];

export default function ProvaDeVidaPage() {
  const [respostas, setRespostas] = useState<Record<number, number>>({});

  const acertos = quiz.reduce(
    (total, item, index) =>
      total + (respostas[index] === item.correta ? 1 : 0),
    0
  );

  const respondidas = Object.keys(respostas).length;
  const concluido = respondidas === quiz.length;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>Cursos • TreinExpresso</span>
          <h1>Prova de Vida</h1>
          <p>
            Aprenda como realizar a Prova de Vida pelo tablet e, nos Expressos
            com status de Órgão Pagador, também pelo POS.
          </p>

          <div className={styles.heroActions}>
            <a href="#conteudo" className={styles.primaryButton}>
              Iniciar treinamento
            </a>
            <a
              href="/materiais/prova-de-vida/PROVA_DE_VIDA.pdf"
              target="_blank"
              rel="noreferrer"
              className={styles.secondaryButton}
            >
              Abrir material
            </a>
          </div>
        </div>

        <div className={styles.heroVisual} aria-hidden="true">
          <div className={styles.tablet}>
            <div className={styles.tabletTop} />
            <div className={styles.tabletScreen}>
              <span>✓</span>
              <strong>Prova de Vida</strong>
              <small>Validação segura do beneficiário</small>
            </div>
            <div className={styles.tabletButton} />
          </div>
        </div>
      </section>

      <section className={styles.summaryGrid} aria-label="Resumo do curso">
        <article>
          <strong>Biometria facial</strong>
          <span>Validação pelo tablet</span>
        </article>
        <article>
          <strong>Órgão Pagador</strong>
          <span>Também pode realizar pelo POS</span>
        </article>
        <article>
          <strong>Até 1 dia útil</strong>
          <span>Envio do procedimento ao INSS</span>
        </article>
        <article>
          <strong>Meu INSS</strong>
          <span>Consulta da confirmação pelo cliente</span>
        </article>
      </section>

      <section className={styles.content} id="conteudo">
        <header className={styles.sectionHeader}>
          <div>
            <span>Informações gerais</span>
            <h2>O que é a Prova de Vida?</h2>
          </div>
        </header>

        <div className={styles.introGrid}>
          <article className={styles.definitionCard}>
            <span>Objetivo do serviço</span>
            <h3>Comprovar a vida do beneficiário</h3>
            <p>
              A Prova de Vida é o procedimento utilizado para confirmar que o
              beneficiário continua apto a receber seu benefício do INSS.
            </p>
            <strong>
              O atendimento deve ser realizado com o cliente presente e sempre
              seguindo as orientações de segurança.
            </strong>
          </article>

          <div className={styles.infoCards}>
            <article>
              <span>01</span>
              <div>
                <h3>Clientes INSS Bradesco</h3>
                <p>
                  No tablet, a validação é realizada por meio de biometria
                  facial.
                </p>
              </div>
            </article>

            <article>
              <span>02</span>
              <div>
                <h3>Disponibilidade</h3>
                <p>
                  O serviço pelo tablet será liberado em breve para todos os
                  Bradesco Expressos.
                </p>
              </div>
            </article>

            <article>
              <span>03</span>
              <div>
                <h3>Confirmação</h3>
                <p>
                  O beneficiário poderá consultar a confirmação no aplicativo
                  Meu INSS.
                </p>
              </div>
            </article>
          </div>
        </div>

        <section className={styles.methodsSection}>
          <header className={styles.sectionHeader}>
            <div>
              <span>Formas de atendimento</span>
              <h2>Tablet ou POS</h2>
            </div>
          </header>

          <div className={styles.methodsGrid}>
            <article className={styles.methodCard}>
              <div className={styles.methodIcon}>▣</div>
              <span className={styles.methodTag}>Em breve para todos</span>
              <h3>Prova de Vida pelo tablet</h3>
              <p>
                Realizada na Plataforma Expresso com identificação do cliente e
                validação por biometria facial.
              </p>
              <ul>
                <li>Cliente presente no atendimento;</li>
                <li>CPF do beneficiário;</li>
                <li>Biometria facial;</li>
                <li>Envio ao INSS em até 1 dia útil.</li>
              </ul>
            </article>

            <article className={`${styles.methodCard} ${styles.methodFeatured}`}>
              <div className={styles.methodIcon}>▤</div>
              <span className={styles.methodTag}>Órgão Pagador</span>
              <h3>Prova de Vida pelo POS</h3>
              <p>
                Disponível para Expressos que possuem o status de Órgão Pagador.
              </p>
              <ul>
                <li>Cliente obrigatoriamente presente;</li>
                <li>Cartão da conta-corrente Bradesco;</li>
                <li>Senha digitada pelo próprio cliente;</li>
                <li>Comprovante impresso ao final.</li>
              </ul>
            </article>
          </div>
        </section>

        <section className={styles.posSection}>
          <header className={styles.sectionHeader}>
            <div>
              <span>Passo a passo no POS</span>
              <h2>Caminho para a Revalidação INSS</h2>
            </div>
          </header>

          <div className={styles.posPath}>
            {caminhoPos.map(([numero, nome], index) => (
              <div className={styles.posStepWrap} key={nome}>
                <article className={styles.posStep}>
                  <strong>{numero}</strong>
                  <span>{nome}</span>
                </article>
                {index < caminhoPos.length - 1 && (
                  <span className={styles.arrow}>→</span>
                )}
              </div>
            ))}
          </div>

          <div className={styles.posFinish}>
            <div className={styles.pinPad} aria-hidden="true">
              <div className={styles.pinScreen}>CARTÃO + SENHA</div>
              <div className={styles.pinKeys}>
                {Array.from({ length: 9 }).map((_, index) => (
                  <i key={index}>{index + 1}</i>
                ))}
              </div>
            </div>

            <div>
              <span>Conclusão do atendimento</span>
              <h3>Insira o cartão do cliente no PIN Pad</h3>
              <ol>
                <li>Peça ao cliente para inserir o cartão da conta-corrente.</li>
                <li>Oriente-o a digitar pessoalmente sua senha.</li>
                <li>Aguarde o processamento da transação.</li>
                <li>
                  Entregue o comprovante impresso. A Prova de Vida estará
                  realizada.
                </li>
              </ol>
            </div>
          </div>
        </section>

        <section className={styles.tabletSection}>
          <header className={styles.sectionHeader}>
            <div>
              <span>Jornada pelo tablet</span>
              <h2>Veja cada etapa na tela</h2>
            </div>
          </header>

          <p className={styles.journeyIntro}>
            Acompanhe abaixo as telas da Plataforma Expresso para realizar a
            Prova de Vida com biometria facial.
          </p>

          <div className={styles.screenJourney}>
            <article className={styles.screenCard}>
              <div className={styles.screenImageWrap}>
                <img
                  src="/materiais/prova-de-vida/imagens/01-tela-inicial.png"
                  alt="Tela inicial da Plataforma Expresso com a opção Prova de Vida"
                />
              </div>
              <div className={styles.screenCaption}>
                <span>Passo 1</span>
                <h3>Acesse Prova de Vida</h3>
                <p>
                  Na tela inicial, localize a área de serviços e selecione a
                  opção <strong>Prova de Vida</strong>.
                </p>
              </div>
            </article>

            <article className={styles.screenCard}>
              <div className={styles.screenImageWrap}>
                <img
                  src="/materiais/prova-de-vida/imagens/02-informe-cpf.png"
                  alt="Tela para informar o CPF do beneficiário"
                />
              </div>
              <div className={styles.screenCaption}>
                <span>Passo 2</span>
                <h3>Informe o CPF</h3>
                <p>
                  Digite o CPF do beneficiário e avance para iniciar a
                  validação do cliente.
                </p>
              </div>
            </article>

            <article className={styles.screenCard}>
              <div className={styles.screenImageWrap}>
                <img
                  src="/materiais/prova-de-vida/imagens/03-biometria-facial.png"
                  alt="Tela de orientação para realizar a biometria facial"
                />
              </div>
              <div className={styles.screenCaption}>
                <span>Passo 3</span>
                <h3>Faça a biometria facial</h3>
                <p>
                  Posicione o cliente em local iluminado, sem acessórios que
                  cubram o rosto, e siga as instruções da câmera.
                </p>
              </div>
            </article>

            <article className={styles.screenCard}>
              <div className={styles.screenImageWrap}>
                <img
                  src="/materiais/prova-de-vida/imagens/04-prova-enviada.png"
                  alt="Tela de confirmação da Prova de Vida enviada"
                />
              </div>
              <div className={styles.screenCaption}>
                <span>Passo 4</span>
                <h3>Finalize e entregue o comprovante</h3>
                <p>
                  Confira os dados do beneficiário e envie o comprovante por
                  e-mail ou selecione a opção de impressão.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className={styles.attentionSection}>
          <div>
            <span>⚠️</span>
            <h2>Pontos importantes</h2>
          </div>

          <ul>
            <li>O beneficiário deve estar presente durante todo o atendimento.</li>
            <li>
              No POS, utilize o cartão da conta-corrente Bradesco do próprio
              beneficiário.
            </li>
            <li>A senha nunca deve ser informada ou digitada pelo atendente.</li>
            <li>
              Entregue o comprovante impresso após a conclusão pelo POS.
            </li>
            <li>
              Pelo tablet, a informação é enviada ao INSS em até 1 dia útil.
            </li>
            <li>
              O cliente poderá consultar a confirmação pelo aplicativo Meu INSS.
            </li>
          </ul>
        </section>

        <section className={styles.quizSection}>
          <header className={styles.sectionHeader}>
            <div>
              <span>Fixação do conteúdo</span>
              <h2>Quiz rápido</h2>
            </div>
            <strong className={styles.score}>
              {acertos}/{quiz.length} acertos
            </strong>
          </header>

          <div className={styles.quizGrid}>
            {quiz.map((item, index) => (
              <article className={styles.quizCard} key={item.pergunta}>
                <span>Questão {index + 1}</span>
                <h3>{item.pergunta}</h3>

                <div>
                  {item.opcoes.map((opcao, opcaoIndex) => {
                    const selecionada = respostas[index] === opcaoIndex;
                    const correta = opcaoIndex === item.correta;

                    return (
                      <button
                        type="button"
                        key={opcao}
                        className={
                          selecionada
                            ? correta
                              ? styles.correct
                              : styles.wrong
                            : ""
                        }
                        onClick={() =>
                          setRespostas((atual) => ({
                            ...atual,
                            [index]: opcaoIndex,
                          }))
                        }
                      >
                        {opcao}
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>

          {concluido && (
            <div className={styles.quizResult}>
              <strong>
                {acertos === quiz.length
                  ? "Excelente! Você acertou todas as questões."
                  : acertos >= 4
                  ? "Muito bem! Conteúdo aprendido."
                  : "Revise os pontos principais e tente novamente."}
              </strong>
              <p>
                Resultado: {acertos} acerto{acertos === 1 ? "" : "s"} em{" "}
                {quiz.length} questões.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
