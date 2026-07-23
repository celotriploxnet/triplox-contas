"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./Microsseguro.module.css";

const beneficios = [
  {
    titulo: "Morte acidental",
    destaque: "R$ 3 mil",
    texto:
      "Indenização aos beneficiários em caso de morte causada exclusivamente por acidente.",
  },
  {
    titulo: "Sorteio mensal",
    destaque: "R$ 20 mil*",
    texto:
      "O cliente participa de 12 sorteios pela Loteria Federal durante a vigência.",
  },
  {
    titulo: "Assistência funeral",
    destaque: "Individual",
    texto:
      "Atendimento em caso de morte natural ou acidental, com acionamento pela central.",
  },
  {
    titulo: "Cesta básica",
    destaque: "2 × R$ 100",
    texto:
      "Cartão de benefício no valor de R$ 100 por mês, durante dois meses.",
  },
];

const perguntas = [
  {
    pergunta: "Qual é o valor anual do Microsseguro Proteção Premiável?",
    opcoes: ["R$ 20,00", "R$ 30,00", "R$ 50,00", "R$ 100,00"],
    correta: 1,
  },
  {
    pergunta: "Qual é a faixa etária permitida para contratação?",
    opcoes: ["16 a 65 anos", "18 a 70 anos", "21 a 75 anos", "18 a 80 anos"],
    correta: 1,
  },
  {
    pergunta: "Quantos sorteios o cliente terá durante a vigência?",
    opcoes: ["6 sorteios", "10 sorteios", "12 sorteios", "24 sorteios"],
    correta: 2,
  },
  {
    pergunta: "Qual é o valor da cobertura por morte acidental?",
    opcoes: ["R$ 1.000", "R$ 3.000", "R$ 10.000", "R$ 20.000"],
    correta: 1,
  },
  {
    pergunta: "Qual é o caminho correto no POS?",
    opcoes: [
      "4 - Outras Funções > 8 - Microsseguro > 1 - Proteção Premiável > 1 - Plano 1",
      "2 - Seguros > 1 - Microsseguro > 4 - Plano Anual",
      "8 - Microsseguro > 4 - Outras Funções > 1 - Titular",
      "1 - Produtos > 8 - Microsseguro > 2 - Plano 2",
    ],
    correta: 0,
  },
];

export default function MicrosseguroPage() {
  const [respostas, setRespostas] = useState<Record<number, number>>({});

  const acertos = perguntas.reduce(
    (total, item, index) =>
      total + (respostas[index] === item.correta ? 1 : 0),
    0
  );

  const finalizado = Object.keys(respostas).length === perguntas.length;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <span>Curso • Seguros</span>
          <h1>Microsseguro Proteção Premiável</h1>
          <p>
            Aprenda como ofertar e contratar o Microsseguro pelo POS, conhecendo
            coberturas, assistências, sorteios e principais argumentos de venda.
          </p>

          <div className={styles.heroActions}>
            <a href="#conteudo" className={styles.primaryButton}>
              Iniciar treinamento
            </a>
            <a
              href="/materiais/microsseguro/manual-microsseguro.pdf"
              target="_blank"
              rel="noreferrer"
              className={styles.secondaryButton}
            >
              Abrir manual
            </a>
            <a
              href="/materiais/microsseguro/regulamento-microsseguro.pdf"
              target="_blank"
              rel="noreferrer"
              className={styles.secondaryButton}
            >
              Ver regulamento
            </a>
          </div>
        </div>

        <div className={styles.heroCard}>
          <strong>R$ 30,00</strong>
          <span>por ano</span>
          <small>Proteção, assistência e sorteios em um único produto.</small>
        </div>
      </section>

      <section className={styles.summary}>
        <article>
          <strong>12 meses</strong>
          <span>de vigência</span>
        </article>
        <article>
          <strong>18 a 70 anos</strong>
          <span>faixa etária permitida</span>
        </article>
        <article>
          <strong>12 sorteios</strong>
          <span>durante a vigência</span>
        </article>
        <article>
          <strong>Qualquer pessoa</strong>
          <span>correntista ou não</span>
        </article>
      </section>

      <section className={styles.content} id="conteudo">
        <header className={styles.sectionHeader}>
          <span>Visão geral</span>
          <h2>O que o cliente recebe</h2>
        </header>

        <div className={styles.benefitsGrid}>
          {beneficios.map((item) => (
            <article key={item.titulo}>
              <span>{item.titulo}</span>
              <strong>{item.destaque}</strong>
              <p>{item.texto}</p>
            </article>
          ))}
        </div>

        <section className={styles.hiringSection}>
          <header className={styles.sectionHeader}>
            <span>Contratação pelo POS</span>
            <h2>Passo a passo</h2>
          </header>

          <div className={styles.hiringGrid}>
            <div className={styles.infographic}>
              <Image
                src="/materiais/microsseguro/imagens/como-contratar-microsseguro.png"
                alt="Como contratar o Microsseguro pelo POS"
                width={1024}
                height={1536}
              />
            </div>

            <div className={styles.hiringSteps}>
              <article>
                <b>01</b>
                <h3>Acesse no POS</h3>
                <p>
                  Siga o caminho:
                  <strong>
                    {" "}4 - Outras Funções → 8 - Microsseguro → 1 - Proteção
                    Premiável → 1 - Plano 1 - R$ 30,00.
                  </strong>
                </p>
              </article>

              <article>
                <b>02</b>
                <h3>Preencha os dados</h3>
                <p>
                  Informe CPF, data de nascimento, CEP, telefone, sexo, estado
                  civil e profissão.
                </p>
              </article>

              <article>
                <b>03</b>
                <h3>Confirme a contratação</h3>
                <p>
                  Confira os dados com o cliente, conclua a contratação e
                  entregue o bilhete impresso.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.sortSection}>
          <header className={styles.sectionHeader}>
            <span>Sorteio</span>
            <h2>Como funciona</h2>
          </header>

          <div className={styles.sortGrid}>
            <article>
              <strong>12 chances</strong>
              <p>
                O cliente participa de um sorteio no último sábado de cada mês,
                durante a vigência do seguro.
              </p>
            </article>
            <article>
              <strong>Número da Sorte</strong>
              <p>
                O bilhete apresenta uma combinação de seis algarismos válida
                durante um ano.
              </p>
            </article>
            <article>
              <strong>R$ 20 mil*</strong>
              <p>
                O valor do prêmio é bruto. Em caso de contemplação, o seguro
                continua vigente e o cliente segue concorrendo.
              </p>
            </article>
          </div>

          <div className={styles.note}>
            <strong>Importante:</strong>
            <p>
              Contratações realizadas até 10 dias antes do último sábado do mês
              participam do sorteio daquele mês. Com menos de 10 dias, a
              participação começa no mês seguinte.
            </p>
          </div>
        </section>

        <section className={styles.coverageSection}>
          <header className={styles.sectionHeader}>
            <span>Coberturas e assistências</span>
            <h2>Proteção para o cliente e sua família</h2>
          </header>

          <div className={styles.coverageGrid}>
            <article>
              <h3>Morte acidental</h3>
              <p>
                Indenização de R$ 3.000 aos beneficiários, com prazo de
                pagamento de até 10 dias após o recebimento da documentação
                completa pela seguradora.
              </p>
            </article>

            <article>
              <h3>Assistência funeral</h3>
              <p>
                Disponível em caso de morte natural ou acidental. Inclui
                serviços como registro em cartório, sepultamento, sala para
                velório, ornamentação, carro funerário, urna, traslado e outros
                itens previstos no regulamento.
              </p>
            </article>

            <article>
              <h3>Assistência cesta básica</h3>
              <p>
                Em caso de morte natural ou acidental, os beneficiários recebem
                um cartão de R$ 100 por mês, durante dois meses.
              </p>
            </article>
          </div>

          <div className={styles.central}>
            <div>
              <span>Central de Atendimento</span>
              <strong>0800 701 2730</strong>
            </div>
            <p>
              Sinistro: segunda a sexta, das 8h às 18h. Assistências funeral e
              cesta básica: atendimento 24 horas, 7 dias por semana.
            </p>
          </div>
        </section>

        <section className={styles.salesSection}>
          <header className={styles.sectionHeader}>
            <span>Argumentos de venda</span>
            <h2>Como apresentar ao cliente</h2>
          </header>

          <div className={styles.salesGrid}>
            <article>
              <b>01</b>
              <h3>Baixo investimento</h3>
              <p>
                R$ 30 por ano equivalem a R$ 2,50 por mês. Essa comparação é
                apenas demonstrativa, pois o produto não é parcelado.
              </p>
            </article>

            <article>
              <b>02</b>
              <h3>Proteção completa</h3>
              <p>
                O cliente conta com morte acidental, assistência funeral,
                cesta básica e participação em sorteios.
              </p>
            </article>

            <article>
              <b>03</b>
              <h3>Venda para não correntistas</h3>
              <p>
                O produto pode ser oferecido para qualquer pessoa dentro da
                faixa etária permitida, correntista ou não do Bradesco.
              </p>
            </article>
          </div>

          <div className={styles.moments}>
            <h3>Melhores momentos para ofertar</h3>
            <div>
              <span>Abertura de conta</span>
              <span>Liberação do LIME</span>
              <span>Pagamentos, saques e autenticações</span>
            </div>
          </div>
        </section>

        <section className={styles.attention}>
          <div>
            <span>!</span>
            <h2>Pontos de atenção</h2>
          </div>
          <ul>
            <li>A contratação é permitida para pessoas entre 18 e 70 anos.</li>
            <li>A vigência é de 12 meses e começa às 24h da data de pagamento.</li>
            <li>
              A assistência funeral deve ser acionada no momento do falecimento.
              Não há reembolso quando a central não é acionada.
            </li>
            <li>
              O cliente pode desistir no prazo de 7 dias após o pagamento do
              prêmio, conforme as condições do produto.
            </li>
            <li>
              Sempre entregue o bilhete e oriente o cliente a guardar o Número
              da Sorte e os canais de atendimento.
            </li>
          </ul>
        </section>

        <section className={styles.quizSection}>
          <header className={styles.sectionHeader}>
            <span>Fixação do conteúdo</span>
            <h2>Quiz rápido</h2>
          </header>

          <div className={styles.quizGrid}>
            {perguntas.map((item, index) => (
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

          {finalizado && (
            <div className={styles.result}>
              <strong>
                {acertos === perguntas.length
                  ? "Excelente! Você acertou todas as questões."
                  : acertos >= 4
                  ? "Muito bem! Conteúdo aprendido."
                  : "Revise os pontos principais e tente novamente."}
              </strong>
              <p>
                Resultado: {acertos} de {perguntas.length} questões corretas.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
