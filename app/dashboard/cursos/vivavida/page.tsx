"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./VidaViva.module.css";

const planos = [
  {
    nome: "Plano 1",
    valor: "R$ 40,00 por ano",
    morte: "R$ 5.000",
    invalidez: "R$ 5.000",
  },
  {
    nome: "Plano 2",
    valor: "R$ 70,00 por ano",
    morte: "R$ 15.000",
    invalidez: "R$ 15.000",
  },
];

const perguntas = [
  {
    pergunta: "Quem pode contratar o Vida Viva Bradesco?",
    opcoes: [
      "Somente correntistas Bradesco",
      "Correntistas e não correntistas, entre 18 e 80 anos",
      "Somente clientes com cartão de crédito",
      "Apenas aposentados",
    ],
    correta: 1,
  },
  {
    pergunta: "Onde a contratação é realizada?",
    opcoes: [
      "Somente na agência",
      "No aplicativo do cliente",
      "No tablet, pela Plataforma Expresso",
      "Pelo telefone da seguradora",
    ],
    correta: 2,
  },
  {
    pergunta: "Qual é a carência informada no material?",
    opcoes: ["Não há carência", "12 horas", "24 horas", "30 dias"],
    correta: 2,
  },
  {
    pergunta: "Qual valor do sorteio mensal?",
    opcoes: ["R$ 20 mil", "R$ 50 mil", "R$ 75 mil", "R$ 100 mil"],
    correta: 2,
  },
  {
    pergunta: "Qual telefone deve ser acionado para assistência funeral e cesta básica?",
    opcoes: [
      "0800 701 2730",
      "0800 770 0978",
      "4004 2704",
      "0800 701 2714",
    ],
    correta: 2,
  },
];

export default function VidaVivaPage() {
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
          <span>Curso • Seguro de Vida</span>
          <h1>Vida Viva Bradesco</h1>
          <p>
            Aprenda a ofertar e contratar o Vida Viva pela Plataforma Expresso
            no tablet, para clientes correntistas ou não correntistas do
            Bradesco.
          </p>

          <div className={styles.heroActions}>
            <a href="#conteudo" className={styles.primaryButton}>
              Iniciar treinamento
            </a>
            <a
              href="/materiais/vida-viva/manual-vida-viva.pdf"
              target="_blank"
              rel="noreferrer"
              className={styles.secondaryButton}
            >
              Abrir manual
            </a>
          </div>
        </div>

        <div className={styles.heroImage}>
          <Image
            src="/materiais/vida-viva/imagens/01-capa.png"
            alt="Seguro de Vida Vida Viva Bradesco"
            width={900}
            height={900}
            priority
          />
        </div>
      </section>

      <section className={styles.summary}>
        <article>
          <strong>No tablet</strong>
          <span>Contratação pela Plataforma Expresso</span>
        </article>
        <article>
          <strong>Correntista ou não</strong>
          <span>O produto pode ser ofertado para ambos</span>
        </article>
        <article>
          <strong>18 a 80 anos</strong>
          <span>Faixa etária permitida</span>
        </article>
        <article>
          <strong>24 horas</strong>
          <span>Prazo de carência informado</span>
        </article>
      </section>

      <section className={styles.content} id="conteudo">
        <header className={styles.sectionHeader}>
          <span>Capital segurado</span>
          <h2>Planos disponíveis</h2>
        </header>

        <div className={styles.plansGrid}>
          {planos.map((plano) => (
            <article key={plano.nome}>
              <span>{plano.nome}</span>
              <h3>{plano.valor}</h3>
              <div>
                <p>
                  Morte acidental
                  <strong>{plano.morte}</strong>
                </p>
                <p>
                  Invalidez
                  <strong>{plano.invalidez}</strong>
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.sharedBenefits}>
          <strong>Todos os planos também incluem:</strong>
          <span>Cesta Básica: 3 × R$ 150</span>
          <span>Sorteio mensal: R$ 75 mil</span>
          <span>Assistência Funeral</span>
        </div>

        <section className={styles.tabletSection}>
          <header className={styles.sectionHeader}>
            <span>Contratação</span>
            <h2>Realizada no tablet</h2>
          </header>

          <div className={styles.tabletGrid}>
            <article className={styles.tabletCard}>
              <div className={styles.tabletMockup}>
                <div className={styles.tabletScreen}>
                  <span>Vida Viva</span>
                  <strong>Seguro de Vida</strong>
                  <small>Contratação pela Plataforma Expresso</small>
                </div>
              </div>
            </article>

            <div className={styles.tabletInfo}>
              <article>
                <b>01</b>
                <h3>Atendimento presencial</h3>
                <p>
                  A contratação é feita com o cliente presente, diretamente no
                  tablet do Bradesco Expresso.
                </p>
              </article>

              <article>
                <b>02</b>
                <h3>Correntista ou não correntista</h3>
                <p>
                  O Vida Viva pode ser ofertado tanto para quem possui
                  conta-corrente Bradesco quanto para quem não possui.
                </p>
              </article>

              <article>
                <b>03</b>
                <h3>Aceite do cliente</h3>
                <p>
                  Nos pagamentos em dinheiro, o aceite ocorre por biometria
                  facial.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.dataSection}>
          <header className={styles.sectionHeader}>
            <span>Dados necessários</span>
            <h2>Informações para contratação</h2>
          </header>

          <div className={styles.dataGrid}>
            {[
              "CPF",
              "Nome completo",
              "Data de nascimento",
              "Estado civil",
              "Sexo",
              "Telefone",
              "E-mail",
              "Endereço completo",
            ].map((item, index) => (
              <article key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item}</strong>
              </article>
            ))}
          </div>

          <div className={styles.note}>
            <strong>Atenção ao e-mail</strong>
            <p>
              Caso o cliente não informe um e-mail, ele receberá apenas a
              filipeta impressa. O contrato digital e outras comunicações são
              enviados por e-mail.
            </p>
          </div>
        </section>

        <section className={styles.coverageSection}>
          <header className={styles.sectionHeader}>
            <span>Coberturas</span>
            <h2>Proteção para diferentes situações</h2>
          </header>

          <div className={styles.coverageGrid}>
            <article>
              <h3>Morte acidental</h3>
              <p>
                Garante indenização aos beneficiários em caso de morte do
                segurado decorrente de acidente pessoal coberto.
              </p>
            </article>

            <article>
              <h3>Invalidez</h3>
              <p>
                Prevê indenização em caso de perda ou redução definitiva,
                total ou parcial, de membro, órgão, sentido ou função corporal
                causada por acidente pessoal coberto.
              </p>
            </article>

            <article>
              <h3>Assistência Funeral</h3>
              <p>
                Disponibiliza serviços para realização do funeral em território
                nacional, conforme as condições do produto.
              </p>
            </article>

            <article>
              <h3>Cesta Básica</h3>
              <p>
                Fornece Vale Cartão Cesta Básica durante três meses, conforme o
                limite contratado, em caso de falecimento do titular.
              </p>
            </article>
          </div>
        </section>

        <section className={styles.funeralSection}>
          <header className={styles.sectionHeader}>
            <span>Assistência Funeral e Cesta Básica</span>
            <h2>Acionamento obrigatório</h2>
          </header>

          <div className={styles.funeralGrid}>
            <article>
              <strong>0800 770 0978</strong>
              <span>Atendimento 24 horas por dia</span>
              <p>
                A central deve ser acionada antes que a família tome qualquer
                medida por conta própria relacionada ao funeral.
              </p>
            </article>

            <article className={styles.alertCard}>
              <h3>Não há reembolso sem acionamento</h3>
              <p>
                Despesas contratadas diretamente pela família não serão
                reembolsadas, salvo quando o prestador não conseguir realizar o
                atendimento pelos próprios meios.
              </p>
            </article>
          </div>
        </section>

        <section className={styles.sortSection}>
          <header className={styles.sectionHeader}>
            <span>Sorteios</span>
            <h2>R$ 75 mil todos os meses</h2>
          </header>

          <div className={styles.sortGrid}>
            <article>
              <strong>Valor líquido</strong>
              <p>
                O segurado concorre a sorteios mensais pela Loteria Federal no
                valor de R$ 75 mil.
              </p>
            </article>

            <article>
              <strong>A partir de 60 dias</strong>
              <p>
                A participação começa 60 dias após a emissão do seguro pela
                seguradora.
              </p>
            </article>

            <article>
              <strong>Contato por telefone</strong>
              <p>
                A divulgação dos contemplados é realizada pela Bradesco Vida e
                Previdência.
              </p>
            </article>
          </div>
        </section>

        <section className={styles.rulesSection}>
          <header className={styles.sectionHeader}>
            <span>Regras gerais</span>
            <h2>O que o atendente precisa saber</h2>
          </header>

          <div className={styles.rulesGrid}>
            <article>
              <h3>Renovação</h3>
              <p>
                Pode ser renovado automaticamente uma única vez por igual
                período, salvo manifestação contrária com antecedência.
              </p>
            </article>

            <article>
              <h3>Abrangência</h3>
              <p>
                As coberturas principais consideram sinistros ocorridos em
                qualquer parte do globo, observadas as condições do seguro.
              </p>
            </article>

            <article>
              <h3>Beneficiários</h3>
              <p>
                Não são indicados no ato da contratação, mas o segurado poderá
                indicá-los posteriormente pelos canais da seguradora.
              </p>
            </article>
          </div>
        </section>

        <section className={styles.centralSection}>
          <header className={styles.sectionHeader}>
            <span>Canais de atendimento</span>
            <h2>Central de Relacionamento</h2>
          </header>

          <div className={styles.centralGrid}>
            <article>
              <span>Capitais e regiões metropolitanas</span>
              <strong>4004 2704</strong>
            </article>
            <article>
              <span>Demais regiões</span>
              <strong>0800 701 2714</strong>
            </article>
            <article>
              <span>Deficiência auditiva ou de fala</span>
              <strong>0800 701 2778</strong>
            </article>
          </div>
        </section>

        <section className={styles.attention}>
          <div>
            <span>!</span>
            <h2>Pontos de atenção</h2>
          </div>
          <ul>
            <li>
              O produto pode ser ofertado para correntistas e não correntistas
              Bradesco.
            </li>
            <li>A contratação é presencial e realizada no tablet.</li>
            <li>
              O cliente precisa ter entre 18 e 80 anos no momento da
              contratação.
            </li>
            <li>
              Oriente o cliente a cadastrar um e-mail válido para receber o
              contrato e as comunicações digitais.
            </li>
            <li>
              As assistências devem ser acionadas pela central antes da
              contratação de serviços por conta própria.
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
