"use client";

import { useMemo, useState } from "react";
import styles from "./Dental.module.css";

type Status = "coberto" | "nao-coberto";

type Procedimento = {
  nome: string;
  status: Status;
  categoria: string;
  resumo: string;
  detalhes?: string;
  termos?: string[];
};

type Pergunta = {
  pergunta: string;
  resposta: string;
};

const procedimentos: Procedimento[] = [
  {
    nome: "Urgência e emergência",
    status: "coberto",
    categoria: "Especialidades",
    resumo:
      "Atendimento para alívio da dor ou restabelecimento provisório da estética.",
    detalhes:
      "Pode envolver restaurações temporárias ou cimentação provisória de peças protéticas, conforme avaliação profissional.",
    termos: ["dor", "emergência", "urgência", "restauração temporária"],
  },
  {
    nome: "Diagnóstico",
    status: "coberto",
    categoria: "Especialidades",
    resumo:
      "Identificação de problemas odontológicos para auxiliar no planejamento do tratamento.",
    termos: ["consulta", "avaliação", "diagnóstico"],
  },
  {
    nome: "Dentística e restaurações",
    status: "coberto",
    categoria: "Especialidades",
    resumo:
      "Tratamentos de restauração dental com foco funcional e reparador.",
    detalhes:
      "Inclui procedimentos restauradores indicados pelo dentista. Procedimentos exclusivamente estéticos não fazem parte da cobertura.",
    termos: ["restauração", "resina", "cárie", "dentística"],
  },
  {
    nome: "Tratamento de canal",
    status: "coberto",
    categoria: "Especialidades",
    resumo:
      "Tratamento de canais e lesões provocadas por infecções no nervo do dente.",
    termos: ["canal", "endodontia", "nervo", "infecção"],
  },
  {
    nome: "Periodontia",
    status: "coberto",
    categoria: "Especialidades",
    resumo:
      "Tratamento de doenças da gengiva e do suporte ósseo dos dentes.",
    detalhes:
      "Abrange cuidados relacionados a gengivite, periodontite e controle de inflamações, conforme indicação profissional.",
    termos: ["gengiva", "gengivite", "periodontite", "tártaro"],
  },
  {
    nome: "Cirurgias e extrações",
    status: "coberto",
    categoria: "Especialidades",
    resumo:
      "Procedimentos cirúrgicos na cavidade oral, como extrações dentárias.",
    detalhes:
      "A cobertura depende da indicação do dentista e das regras do produto contratado.",
    termos: ["extração", "siso", "cirurgia", "arrancar dente"],
  },
  {
    nome: "Odontopediatria",
    status: "coberto",
    categoria: "Especialidades",
    resumo:
      "Atendimento odontológico para crianças e adolescentes de 0 a 15 anos.",
    termos: ["criança", "adolescente", "odontopediatria"],
  },
  {
    nome: "Radiologia",
    status: "coberto",
    categoria: "Especialidades",
    resumo:
      "Exames radiológicos usados no diagnóstico e na orientação dos tratamentos.",
    termos: ["raio x", "radiografia", "radiologia", "panorâmica"],
  },
  {
    nome: "Coroa provisória sem pino",
    status: "coberto",
    categoria: "Próteses cobertas",
    resumo:
      "Coroa temporária usada até a confecção da peça definitiva, quando há estrutura dental suficiente.",
    termos: ["coroa", "provisória", "sem pino"],
  },
  {
    nome: "Coroa total metálica",
    status: "coberto",
    categoria: "Próteses cobertas",
    resumo:
      "Coroa metálica indicada para reconstrução de dentes posteriores.",
    termos: ["coroa metálica", "dente posterior"],
  },
  {
    nome: "Restauração metálica fundida",
    status: "coberto",
    categoria: "Próteses cobertas",
    resumo:
      "Peça metálica confeccionada para substituir parte da estrutura perdida do dente.",
    termos: ["rmf", "restauração metálica", "fundida"],
  },
  {
    nome: "Coroa provisória com pino",
    status: "coberto",
    categoria: "Próteses cobertas",
    resumo:
      "Coroa temporária com pino para casos em que a estrutura restante não oferece suporte suficiente.",
    termos: ["coroa", "pino", "provisória"],
  },
  {
    nome: "Coroa total acrílica prensada",
    status: "coberto",
    categoria: "Próteses cobertas",
    resumo:
      "Coroa em resina acrílica usada para reconstrução e recuperação da função mastigatória.",
    termos: ["coroa acrílica", "resina acrílica"],
  },
  {
    nome: "Coroa em cerômero",
    status: "coberto",
    categoria: "Próteses cobertas",
    resumo:
      "Coroa em material estético e resistente, coberta somente para dentes anteriores.",
    termos: ["cerômero", "dente anterior", "coroa estética"],
  },
  {
    nome: "Núcleo de preenchimento",
    status: "coberto",
    categoria: "Próteses cobertas",
    resumo:
      "Reforço da base do dente para dar suporte a uma restauração ou coroa.",
    termos: ["núcleo", "preenchimento", "base do dente"],
  },
  {
    nome: "Núcleo metálico fundido",
    status: "coberto",
    categoria: "Próteses cobertas",
    resumo:
      "Estrutura metálica usada para dar estabilidade ao dente e suporte à coroa.",
    termos: ["núcleo metálico", "pino metálico"],
  },
  {
    nome: "Pino pré-fabricado",
    status: "coberto",
    categoria: "Próteses cobertas",
    resumo:
      "Pino pronto, selecionado pelo dentista de acordo com a necessidade de cada caso.",
    termos: ["pino", "pré-fabricado"],
  },
  {
    nome: "Provisório para restauração metálica fundida",
    status: "coberto",
    categoria: "Próteses cobertas",
    resumo:
      "Peça provisória utilizada enquanto a restauração metálica definitiva é confeccionada.",
    termos: ["provisório", "rmf"],
  },
  {
    nome: "Ortodontia e aparelhos",
    status: "nao-coberto",
    categoria: "Não cobertos",
    resumo:
      "Aparelhos ortodônticos e tratamentos para correção da posição dos dentes não estão cobertos.",
    termos: ["aparelho", "ortodontia", "alinhador"],
  },
  {
    nome: "Documentação ortodôntica",
    status: "nao-coberto",
    categoria: "Não cobertos",
    resumo:
      "Conjunto de exames e registros usados no planejamento ortodôntico.",
    termos: ["documentação", "cefalometria", "modelo de gesso"],
  },
  {
    nome: "Implante dentário",
    status: "nao-coberto",
    categoria: "Não cobertos",
    resumo:
      "Implantes, cirurgias relacionadas e próteses sobre implantes não estão cobertos.",
    termos: ["implante", "parafuso", "prótese sobre implante"],
  },
  {
    nome: "Clareamento dental",
    status: "nao-coberto",
    categoria: "Não cobertos",
    resumo:
      "Clareamento dental é considerado procedimento exclusivamente estético.",
    termos: ["clareamento", "branquear dentes"],
  },
  {
    nome: "Procedimentos exclusivamente estéticos",
    status: "nao-coberto",
    categoria: "Não cobertos",
    resumo:
      "Procedimentos realizados apenas com finalidade estética não estão cobertos.",
    termos: ["estética", "faceta estética", "cosmético"],
  },
  {
    nome: "Próteses fora do rol mínimo da ANS",
    status: "nao-coberto",
    categoria: "Não cobertos",
    resumo:
      "Próteses que não fazem parte do rol mínimo obrigatório da ANS não estão cobertas.",
    termos: ["dentadura", "prótese fixa", "prótese removível", "ppr"],
  },
];

const categorias = ["Todos", "Especialidades", "Próteses cobertas", "Não cobertos"];

const perguntasFrequentes: Pergunta[] = [
  {
    pergunta: "Qual é o valor do plano?",
    resposta:
      "O Plano Odontológico Expresso custa R$ 39,49 por mês, por pessoa. A primeira mensalidade é paga no momento da contratação no Bradesco Expresso.",
  },
  {
    pergunta: "O pagamento é mensal?",
    resposta:
      "Sim. O plano possui cobrança mensal. Após o pagamento da primeira mensalidade no atendimento, as demais são cobradas conforme a forma de pagamento cadastrada na contratação.",
  },
  {
    pergunta: "Quem pode contratar?",
    resposta:
      "O plano é destinado a pessoa física. Para contratação, o cliente precisa ter relacionamento com o Bradesco, por meio de conta-corrente ou cartão de crédito, além de CPF válido.",
  },
  {
    pergunta: "É possível incluir dependentes?",
    resposta:
      "Sim. Podem ser incluídos dependentes familiares, como pai, mãe, filhos, esposa, marido ou companheiro(a), conforme as regras da contratação. O material comercial informa a possibilidade de incluir até 2 dependentes.",
  },
  {
    pergunta: "Existe carência?",
    resposta:
      "Sim. A carência é de 24 horas para urgência e emergência, 90 dias para as demais especialidades e 180 dias para próteses.",
  },
  {
    pergunta: "Existe limite de consultas?",
    resposta:
      "Não. O beneficiário pode utilizar os serviços sempre que necessário, respeitando as coberturas, carências e regras do plano.",
  },
  {
    pergunta: "Há cobrança adicional ou franquia?",
    resposta:
      "Não há cobrança adicional pelos procedimentos cobertos e não existe franquia.",
  },
  {
    pergunta: "O plano oferece reembolso em dentista particular?",
    resposta:
      "Não. O atendimento deve ser realizado na rede credenciada do Bradesco Dental.",
  },
  {
    pergunta: "O plano possui fidelidade?",
    resposta:
      "A vigência inicial é de 12 meses, com renovação automática. Depois da primeira vigência, o contrato passa a prazo indeterminado, salvo manifestação do contratante conforme as regras contratuais.",
  },
  {
    pergunta: "Onde posso acessar a carteirinha e acompanhar o plano?",
    resposta:
      "A carteirinha digital do titular e dos dependentes, a busca de dentistas, a consulta de cobertura e o acompanhamento do plano podem ser acessados pelo aplicativo Bradesco Seguros, disponível para celulares Android e iPhone.",
  },
  {
    pergunta: "Como localizar um dentista credenciado?",
    resposta:
      "A busca pode ser feita pelo Portal Bradesco Dental ou pelo aplicativo Bradesco Seguros, disponível para Android e iPhone.",
  },
  {
    pergunta: "O plano cobre aparelho, clareamento ou implante?",
    resposta:
      "Não. Ortodontia e aparelhos, clareamento, implantes, próteses sobre implantes e procedimentos exclusivamente estéticos não fazem parte da cobertura.",
  },
  {
    pergunta: "Existe atendimento odontológico on-line?",
    resposta:
      "Sim. O Dentista Online oferece teleorientação odontológica para beneficiários, de segunda a sexta-feira, das 8h30 às 17h, por meio da área do beneficiário.",
  },
];

const comparativos = [
  {
    procedimento: "Consulta de emergência",
    particular: "R$ 150 a R$ 400",
    plano: "Possui cobertura",
  },
  {
    procedimento: "Prevenção e limpeza",
    particular: "R$ 150 a R$ 400",
    plano: "Possui cobertura",
  },
  {
    procedimento: "Obturação",
    particular: "R$ 200 a R$ 900",
    plano: "Possui cobertura",
  },
];

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function DentalPage() {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todos");
  const [aberto, setAberto] = useState<string | null>(null);
  const [faqAberta, setFaqAberta] = useState<number | null>(0);

  const resultados = useMemo(() => {
    const termo = normalizar(busca);

    return procedimentos.filter((item) => {
      const correspondeCategoria =
        categoria === "Todos" || item.categoria === categoria;

      const conteudo = normalizar(
        [
          item.nome,
          item.categoria,
          item.resumo,
          item.detalhes ?? "",
          ...(item.termos ?? []),
        ].join(" ")
      );

      return correspondeCategoria && (!termo || conteudo.includes(termo));
    });
  }, [busca, categoria]);

  const totalCobertos = procedimentos.filter(
    (item) => item.status === "coberto"
  ).length;

  const totalNaoCobertos = procedimentos.filter(
    (item) => item.status === "nao-coberto"
  ).length;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>Cursos • TreinExpresso</span>
          <h1>Plano Dental Expresso</h1>
          <p>
            Consulte rapidamente as condições do produto, carências,
            dependentes, perguntas frequentes e procedimentos cobertos.
          </p>

          <div className={styles.searchBox}>
            <span aria-hidden="true">⌕</span>
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Digite: canal, aparelho, implante, coroa..."
              aria-label="Pesquisar procedimento dental"
            />
            {busca && (
              <button
                type="button"
                className={styles.clearButton}
                onClick={() => setBusca("")}
                aria-label="Limpar pesquisa"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className={styles.priceHero}>
          <span>Plano mensal</span>
          <strong>R$ 39,49</strong>
          <small>por pessoa / mês</small>
          <em>1ª mensalidade paga no Bradesco Expresso</em>
        </div>
      </section>

      <section className={styles.summaryGrid} aria-label="Resumo do produto">
        <article className={styles.summaryCard}>
          <span className={styles.summaryIcon}>R$</span>
          <div>
            <strong>R$ 39,49/mês</strong>
            <span>valor mensal por pessoa</span>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <span className={styles.summaryIcon}>24h</span>
          <div>
            <strong>Urgência e emergência</strong>
            <span>carência inicial de 24 horas</span>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <span className={styles.summaryIcon}>+2</span>
          <div>
            <strong>Até 2 dependentes</strong>
            <span>familiares conforme regras do produto</span>
          </div>
        </article>
      </section>

      <section className={styles.content}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionLabel}>Resumo do produto</span>
            <h2>Informações essenciais</h2>
          </div>

          <a
            className={styles.pdfButton}
            href="/materiais/dentalexpressoprocedimentos.pdf"
            target="_blank"
            rel="noreferrer"
          >
            Abrir material completo
          </a>
        </div>

        <div className={styles.infoGrid}>
          <article className={styles.infoCard}>
            <span>01</span>
            <h3>Quem pode contratar?</h3>
            <p>
              Pessoa física com CPF e relacionamento com o Bradesco por meio
              de conta-corrente ou cartão de crédito.
            </p>
          </article>

          <article className={styles.infoCard}>
            <span>02</span>
            <h3>Como é o pagamento?</h3>
            <p>
              A primeira mensalidade é paga durante o atendimento no Bradesco
              Expresso. As demais seguem a forma cadastrada na contratação.
            </p>
          </article>

          <article className={styles.infoCard}>
            <span>03</span>
            <h3>Quem pode ser dependente?</h3>
            <p>
              Pai, mãe, filhos, esposa, marido ou companheiro(a), conforme as
              regras de contratação. É possível incluir até 2 dependentes.
            </p>
          </article>

          <article className={styles.infoCard}>
            <span>04</span>
            <h3>Carências</h3>
            <p>
              24h para urgência e emergência, 90 dias para as demais
              especialidades e 180 dias para próteses.
            </p>
          </article>

          <article className={styles.infoCard}>
            <span>05</span>
            <h3>Uso do plano</h3>
            <p>
              Não há limite de consultas, cobrança adicional ou franquia para
              os procedimentos cobertos.
            </p>
          </article>

          <article className={styles.infoCard}>
            <span>06</span>
            <h3>Rede credenciada</h3>
            <p>
              O plano não oferece reembolso. Os atendimentos devem ocorrer na
              rede credenciada Bradesco Dental.
            </p>
          </article>
        </div>

        <section className={styles.valueSection}>
          <div className={styles.valueIntro}>
            <span className={styles.sectionLabel}>Comparativo de valor</span>
            <h2>Um único tratamento pode custar várias mensalidades</h2>
            <p>
              Exemplos de valores particulares apresentados no material de
              treinamento. Os preços podem variar por região, profissional e
              procedimento.
            </p>

            <div className={styles.monthlyPrice}>
              <span>Plano Dental Expresso</span>
              <strong>R$ 39,49</strong>
              <small>mensais por pessoa</small>
            </div>
          </div>

          <div className={styles.comparisonTable}>
            <div className={styles.tableHeader}>
              <span>Procedimento</span>
              <span>Particular</span>
              <span>Plano</span>
            </div>
            {comparativos.map((item) => (
              <div className={styles.tableRow} key={item.procedimento}>
                <strong>{item.procedimento}</strong>
                <span>{item.particular}</span>
                <span className={styles.coverageText}>✓ {item.plano}</span>
              </div>
            ))}
          </div>
        </section>

        <div className={styles.sectionHeaderSecondary}>
          <div>
            <span className={styles.sectionLabel}>Central de consulta</span>
            <h2>O plano cobre?</h2>
          </div>
          <div className={styles.counterPills}>
            <span>{totalCobertos} cobertos</span>
            <span>{totalNaoCobertos} não cobertos</span>
          </div>
        </div>

        <div className={styles.filters} role="group" aria-label="Filtros">
          {categorias.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategoria(item)}
              className={categoria === item ? styles.activeFilter : ""}
            >
              {item}
            </button>
          ))}
        </div>

        {resultados.length > 0 ? (
          <div className={styles.resultsGrid}>
            {resultados.map((item) => {
              const estaAberto = aberto === item.nome;
              const coberto = item.status === "coberto";

              return (
                <article
                  key={item.nome}
                  className={`${styles.procedureCard} ${
                    coberto ? styles.coveredCard : styles.notCoveredCard
                  }`}
                >
                  <div className={styles.cardTop}>
                    <span
                      className={`${styles.statusBadge} ${
                        coberto ? styles.coveredBadge : styles.notCoveredBadge
                      }`}
                    >
                      {coberto ? "✓ Coberto" : "× Não coberto"}
                    </span>
                    <span className={styles.categoryTag}>{item.categoria}</span>
                  </div>

                  <h3>{item.nome}</h3>
                  <p>{item.resumo}</p>

                  {item.detalhes && estaAberto && (
                    <div className={styles.details}>{item.detalhes}</div>
                  )}

                  {item.detalhes && (
                    <button
                      type="button"
                      className={styles.moreButton}
                      onClick={() => setAberto(estaAberto ? null : item.nome)}
                    >
                      {estaAberto ? "Mostrar menos" : "Ver detalhes"}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <span>🦷</span>
            <h3>Nenhum procedimento encontrado</h3>
            <p>
              Tente pesquisar por outra palavra, como “canal”, “coroa”,
              “aparelho” ou “implante”.
            </p>
            <button type="button" onClick={() => setBusca("")}>
              Limpar pesquisa
            </button>
          </div>
        )}

        <section className={styles.faqSection}>
          <div className={styles.faqHeading}>
            <span className={styles.sectionLabel}>Perguntas e respostas</span>
            <h2>Dúvidas frequentes</h2>
            <p>
              Respostas rápidas para apoiar o atendimento e a venda do Plano
              Dental Expresso.
            </p>
          </div>

          <div className={styles.faqList}>
            {perguntasFrequentes.map((item, index) => {
              const aberta = faqAberta === index;

              return (
                <article className={styles.faqItem} key={item.pergunta}>
                  <button
                    type="button"
                    onClick={() => setFaqAberta(aberta ? null : index)}
                    aria-expanded={aberta}
                  >
                    <span>{item.pergunta}</span>
                    <strong>{aberta ? "−" : "+"}</strong>
                  </button>
                  {aberta && <p>{item.resposta}</p>}
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.supportSection}>
          <article>
            <span>App Bradesco Seguros</span>
            <h3>Carteirinha e acompanhamento do plano</h3>
            <p>
              Pelo aplicativo Bradesco Seguros, disponível para Android e
              iPhone, o titular e os dependentes podem acessar a carteirinha
              digital, acompanhar o plano, consultar coberturas e localizar
              dentistas credenciados.
            </p>
          </article>

          <article>
            <span>Central de atendimento</span>
            <h3>0800 602 3332</h3>
            <p>
              Canal de suporte ao cliente para informações sobre o plano e
              solicitações relacionadas ao contrato.
            </p>
          </article>

          <article>
            <span>Dentista Online</span>
            <h3>Orientação sem sair de casa</h3>
            <p>
              Teleorientação odontológica de segunda a sexta-feira, das 8h30 às
              17h, pela área do beneficiário.
            </p>
          </article>
        </section>

        <aside className={styles.notice}>
          <strong>Importante</strong>
          <p>
            As informações são destinadas a treinamento e consulta. O valor
            exibido é o informado no material comercial utilizado nesta página.
            Antes da contratação, confirme as condições vigentes no sistema e
            no contrato do produto.
          </p>
        </aside>
      </section>
    </main>
  );
}
