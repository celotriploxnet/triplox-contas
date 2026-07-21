"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./ConsignadoINSS.module.css";

type Etapa = {
  titulo: string;
  resumo: string;
  detalhes: string[];
  pagina: number;
};

const checklist = [
  "Confirme se o cliente possui benefício ativo há mais de 90 dias.",
  "Oriente o desbloqueio do benefício antes de toda nova contratação.",
  "Obtenha o aceite para consulta dos dados da Dataprev.",
  "Mantenha os dados do Banco iguais aos dados cadastrados no INSS.",
  "Se o cliente estiver inelegível, consulte o Melhor Oferta.",
  "Oriente a confirmação do empréstimo no Meu INSS em até 5 dias corridos.",
];

const etapas: Etapa[] = [
  {
    titulo: "Benefício ativo",
    resumo: "Antes de iniciar, confirme se o benefício está ativo há mais de 90 dias.",
    detalhes: [
      "Esse critério é obrigatório para a contratação do Consignado INSS.",
      "Não avance na jornada sem validar essa condição com o cliente.",
    ],
    pagina: 4,
  },
  {
    titulo: "Desbloqueio do benefício",
    resumo: "O desbloqueio no aplicativo Meu INSS é obrigatório em toda nova contratação.",
    detalhes: [
      "No Meu INSS, acesse Novo pedido.",
      "Selecione Bloquear/Desbloquear Benefício.",
      "Escolha o benefício.",
      "Realize o reconhecimento facial e anexe os documentos solicitados.",
    ],
    pagina: 5,
  },
  {
    titulo: "Consulta Dataprev",
    resumo: "O cliente deve autorizar a consulta para que a margem pré-aprovada esteja atualizada.",
    detalhes: [
      "Solicite o aceite do cliente durante a jornada.",
      "A consulta utiliza as informações disponíveis na Dataprev.",
    ],
    pagina: 6,
  },
  {
    titulo: "Atualização cadastral",
    resumo: "Os dados no Banco precisam estar atualizados e iguais aos dados do INSS.",
    detalhes: [
      "No Meu INSS: Mais serviços → Cadastro e Contribuições → Meu cadastro → Atualizar cadastro.",
      "No Bradesco, a atualização pode ser feita pelo aplicativo, Internet Banking ou agência.",
    ],
    pagina: 7,
  },
  {
    titulo: "Cliente inelegível",
    resumo: "A mensagem de impossibilidade indica que o cliente não está elegível naquele momento.",
    detalhes: [
      "Volte à tela inicial da Plataforma Expresso.",
      "Consulte o Melhor Oferta para identificar outras oportunidades.",
      "Quando necessário, procure o Gerente Comercial ou o Multiplicador.",
    ],
    pagina: 8,
  },
  {
    titulo: "Confirmação do empréstimo",
    resumo: "Após concluir a proposta, o cliente precisa confirmar a oferta no Meu INSS.",
    detalhes: [
      "Acesse Confirmar Empréstimo.",
      "Escolha o benefício.",
      "Realize o reconhecimento facial.",
      "A confirmação deve ocorrer em até 5 dias corridos para evitar o cancelamento.",
    ],
    pagina: 9,
  },
  {
    titulo: "Liberação do crédito",
    resumo: "Com a confirmação concluída com sucesso, aguarde a liberação do crédito.",
    detalhes: [
      "Acompanhe o andamento da operação.",
      "Reforce ao cliente a importância de observar as notificações do Meu INSS.",
    ],
    pagina: 9,
  },
];

const quiz = [
  {
    pergunta: "Há quanto tempo o benefício deve estar ativo?",
    opcoes: ["Mais de 30 dias", "Mais de 60 dias", "Mais de 90 dias"],
    correta: 2,
  },
  {
    pergunta: "Onde o cliente realiza o desbloqueio do benefício?",
    opcoes: ["No aplicativo Meu INSS", "Somente na agência", "Na Central de Seguros"],
    correta: 0,
  },
  {
    pergunta: "Qual é o prazo para confirmar o empréstimo no Meu INSS?",
    opcoes: ["Até 24 horas", "Até 5 dias corridos", "Até 10 dias úteis"],
    correta: 1,
  },
  {
    pergunta: "O que fazer quando o cliente estiver inelegível?",
    opcoes: ["Refazer a proposta várias vezes", "Consultar o Melhor Oferta", "Aguardar obrigatoriamente 30 dias"],
    correta: 1,
  },
];

export default function ConsignadoINSSPage() {
  const [etapaAberta, setEtapaAberta] = useState<number | null>(0);
  const [respostas, setRespostas] = useState<Record<number, number>>({});

  const acertos = quiz.reduce(
    (total, item, index) => total + (respostas[index] === item.correta ? 1 : 0),
    0,
  );

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>Cursos • TreinExpresso</span>
          <h1>Crédito Consignado INSS</h1>
          <p>
            Aprenda os cuidados essenciais da jornada, do desbloqueio do benefício à confirmação do empréstimo.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href="#conteudo">Iniciar treinamento</a>
            <a
              className={styles.secondaryButton}
              href="/materiais/consignado-inss/consignado-inss.pdf"
              target="_blank"
              rel="noreferrer"
            >
              Abrir material completo
            </a>
          </div>
        </div>

        <div className={styles.heroImage}>
          <Image
            src="/materiais/consignado-inss/fluxo-contratacao-inss.jpg"
            alt="Fluxo de contratação do Crédito Consignado INSS"
            width={716}
            height={1280}
            priority
          />
        </div>
      </section>

      <section className={styles.summaryGrid} aria-label="Resumo do treinamento">
        <article><strong>90 dias</strong><span>benefício ativo</span></article>
        <article><strong>Meu INSS</strong><span>desbloqueio e confirmação</span></article>
        <article><strong>Dataprev</strong><span>consulta autorizada</span></article>
        <article><strong>5 dias</strong><span>prazo para confirmar</span></article>
      </section>

      <div className={styles.content} id="conteudo">
        <section>
          <header className={styles.sectionHeader}>
            <div>
              <span>Antes da contratação</span>
              <h2>Checklist obrigatório</h2>
            </div>
          </header>

          <div className={styles.checklistGrid}>
            {checklist.map((item, index) => (
              <article key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{item}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.flowSection}>
          <header className={styles.sectionHeader}>
            <div>
              <span>Visão rápida</span>
              <h2>Fluxo da contratação</h2>
            </div>
          </header>

          <div className={styles.flowGrid}>
            {[
              ["1", "Desbloquear o benefício", "Sempre que houver uma nova contratação."],
              ["2", "Seguir a jornada", "Realize a operação pela Plataforma Expresso."],
              ["3", "Confirmar no Meu INSS", "Evite reprovação, pendência ou atraso na averbação."],
              ["4", "Aguardar o crédito", "Após a confirmação realizada com sucesso."],
            ].map(([numero, titulo, texto]) => (
              <article key={numero}>
                <strong>{numero}</strong>
                <div><h3>{titulo}</h3><p>{texto}</p></div>
              </article>
            ))}
          </div>

          <aside className={styles.deadlineAlert}>
            <strong>Importante:</strong> caso o cliente não consiga realizar a confirmação da contratação, aguarde até 5 dias, conforme o prazo padrão do INSS.
          </aside>
        </section>

        <section className={styles.stepsSection}>
          <header className={styles.sectionHeader}>
            <div>
              <span>Jornada detalhada</span>
              <h2>Etapas do Consignado INSS</h2>
            </div>
            <a href="/materiais/consignado-inss/consignado-inss.pdf" target="_blank" rel="noreferrer">
              Abrir PDF
            </a>
          </header>

          <div className={styles.stepsList}>
            {etapas.map((etapa, index) => {
              const aberta = etapaAberta === index;
              return (
                <article className={styles.stepCard} key={etapa.titulo}>
                  <button type="button" onClick={() => setEtapaAberta(aberta ? null : index)}>
                    <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
                    <span className={styles.stepTitle}>
                      <strong>{etapa.titulo}</strong>
                      <small>{etapa.resumo}</small>
                    </span>
                    <b>{aberta ? "−" : "+"}</b>
                  </button>

                  {aberta && (
                    <div className={styles.stepBody}>
                      <ul>{etapa.detalhes.map((detalhe) => <li key={detalhe}>{detalhe}</li>)}</ul>
                      <Image
                        src={`/materiais/consignado-inss/paginas/page-${String(etapa.pagina).padStart(2, "0")}.png`}
                        alt={`Material da etapa ${etapa.titulo}`}
                        width={1040}
                        height={1471}
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.attentionSection}>
          <div>
            <span>⚠️</span>
            <h2>Pontos que evitam reprovação</h2>
          </div>
          <ul>
            <li>Não prossiga sem confirmar que o benefício está ativo há mais de 90 dias.</li>
            <li>O desbloqueio precisa ser feito antes de cada nova contratação.</li>
            <li>Os dados cadastrais do Banco e do INSS devem estar iguais.</li>
            <li>O cliente deve autorizar a consulta dos dados da Dataprev.</li>
            <li>A confirmação no Meu INSS deve ocorrer em até 5 dias corridos.</li>
            <li>Se a opção Confirmar Empréstimo não aparecer, atualize o aplicativo Meu INSS.</li>
          </ul>
        </section>

        <section className={styles.quizSection}>
          <header className={styles.sectionHeader}>
            <div>
              <span>Fixação do conteúdo</span>
              <h2>Quiz rápido</h2>
            </div>
            <strong className={styles.score}>{acertos}/{quiz.length} acertos</strong>
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
                        className={selecionada ? (correta ? styles.correct : styles.wrong) : ""}
                        onClick={() => setRespostas((atual) => ({ ...atual, [index]: opcaoIndex }))}
                      >
                        {opcao}
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
