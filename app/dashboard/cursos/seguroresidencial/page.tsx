"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import styles from "./SeguroResidencial.module.css";

type Cobertura = {
  nome: string;
  valores: string[];
};

type Pergunta = {
  pergunta: string;
  resposta: string;
};

const planos = ["Plano 1", "Plano 2", "Plano 3", "Plano 4", "Plano 5"];

const coberturas: Cobertura[] = [
  { nome: "Roubo", valores: ["R$ 1 mil", "R$ 2 mil", "R$ 3 mil", "R$ 4 mil", "R$ 5 mil"] },
  {
    nome: "Incêndio, queda de raio, explosão e impacto de veículos",
    valores: ["R$ 20 mil", "R$ 40 mil", "R$ 60 mil", "R$ 80 mil", "R$ 100 mil"],
  },
  {
    nome: "Danos causados a terceiros",
    valores: ["R$ 5 mil", "R$ 10 mil", "R$ 15 mil", "R$ 20 mil", "R$ 25 mil"],
  },
  {
    nome: "Vendaval, granizo, furacão, ciclone, tornado, neve e geada",
    valores: ["R$ 2 mil", "R$ 4 mil", "R$ 6 mil", "R$ 8 mil", "R$ 10 mil"],
  },
];

const passos = [
  { titulo: "Acesse Seguro Residencial", texto: "No menu de produtos, clique em Seguro Residencial.", imagem: 2 },
  { titulo: "Digite o CPF", texto: "Informe o CPF do cliente no campo destacado para iniciar a simulação.", imagem: 3 },
  { titulo: "Realize a biometria", texto: "Quando o cliente for elegível, siga as instruções da biometria facial.", imagem: 4 },
  { titulo: "Informe o endereço", texto: "Preencha os dados do imóvel que será protegido e clique em Continuar.", imagem: 5 },
  { titulo: "Escolha o plano", texto: "Apresente as opções ao cliente e use Saiba mais para explicar cada cobertura.", imagem: 6 },
  { titulo: "Preencha os dados pessoais", texto: "Complete os dados de quem contratará o seguro.", imagem: 7 },
  { titulo: "Selecione a conta", texto: "Escolha a conta-corrente que será usada para o pagamento mensal.", imagem: 8 },
  { titulo: "Reforce as condições para CPV", texto: "Se o cliente for potencialmente vulnerável, confirme com atenção as condições escolhidas.", imagem: 9 },
  { titulo: "Revise a contratação", texto: "Confira dados pessoais, endereço, plano, pagamento e coberturas antes de seguir.", imagem: 10 },
  { titulo: "Aceite as condições gerais", texto: "Marque Li e concordo com as condições gerais do seguro e clique em Continuar.", imagem: 11 },
  { titulo: "Faça a autenticação final", texto: "Realize a nova biometria para confirmar a contratação.", imagem: 12 },
  { titulo: "Conclua e entregue o comprovante", texto: "Após a confirmação, envie o comprovante por e-mail ou faça a impressão.", imagem: 14 },
];

const perguntas: Pergunta[] = [
  { pergunta: "É possível ofertar logo após abrir a conta?", resposta: "A contratação pode ser realizada após 48 horas da abertura da conta. O sistema precisa reconhecer a conta para permitir a contratação." },
  { pergunta: "O contrato aparece no aplicativo Bradesco Seguros?", resposta: "Não. O cliente pode solicitar as informações pela Central de Seguros. Na contratação, também recebe um comprovante por e-mail ou impresso." },
  { pergunta: "Há cobertura para alagamento?", resposta: "Não. O Seguro Residencial Expresso não possui cobertura para alagamento." },
  { pergunta: "As coberturas podem ser personalizadas?", resposta: "Não. O produto possui cinco planos predefinidos, com coberturas, limites e preços próprios, para uma contratação mais simples e rápida." },
  { pergunta: "Casa de madeira pode ser segurada?", resposta: "Não." },
  { pergunta: "Casa de veraneio pode ser segurada?", resposta: "Sim." },
  { pergunta: "Imóvel em área rural pode ser segurado?", resposta: "Sim. O produto pode atender imóveis em área rural ou urbana." },
  { pergunta: "É possível transferir o seguro para outro endereço?", resposta: "Não há transferência. Para proteger um novo endereço, é necessário fazer um novo contrato." },
  { pergunta: "Imóvel fora do Brasil pode ser segurado?", resposta: "Não. A contratação é válida apenas para imóveis em território nacional." },
  { pergunta: "Danos elétricos estão cobertos?", resposta: "Não. O produto não cobre danos elétricos, curto-circuito ou queda de energia. Há cobertura para incêndio e vendaval conforme o plano contratado." },
  { pergunta: "Imóvel sem escritura pode ser segurado?", resposta: "É necessário possuir, ao menos, o registro de compra e venda em cartório." },
];

const quiz = [
  {
    pergunta: "O seguro cobre alagamento?",
    opcoes: ["Sim, em todos os planos", "Não", "Somente no Plano 5"],
    correta: 1,
  },
  {
    pergunta: "Casas de madeira podem ser seguradas?",
    opcoes: ["Sim", "Somente em área urbana", "Não"],
    correta: 2,
  },
  {
    pergunta: "Ao mudar de endereço, o que deve ser feito?",
    opcoes: ["Transferir o contrato", "Realizar um novo contrato", "Alterar apenas o CEP"],
    correta: 1,
  },
];

export default function SeguroResidencialPage() {
  const [busca, setBusca] = useState("");
  const [faqAberta, setFaqAberta] = useState<number | null>(0);
  const [passoAberto, setPassoAberto] = useState<number | null>(0);
  const [respostas, setRespostas] = useState<Record<number, number>>({});

  const faqFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return perguntas;
    return perguntas.filter((item) => `${item.pergunta} ${item.resposta}`.toLowerCase().includes(termo));
  }, [busca]);

  const acertos = quiz.reduce((total, item, index) => total + (respostas[index] === item.correta ? 1 : 0), 0);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>Cursos • TreinExpresso</span>
          <h1>Seguro Residencial Expresso</h1>
          <p>
            Aprenda a apresentar o produto, explicar as coberturas e concluir a contratação com segurança.
          </p>

          <div className={styles.heroActions}>
            <a href="#conteudo" className={styles.primaryButton}>Iniciar treinamento</a>
            <a href="/materiais/seguro-residencial/passo-a-passo-seguro-residencial.pdf" target="_blank" rel="noreferrer" className={styles.secondaryButton}>Abrir passo a passo</a>
          </div>
        </div>

        <div className={styles.heroMedia}>
          <Image
            src="/materiais/seguro-residencial/residencial.jpg"
            alt="Material promocional do Seguro Residencial Expresso"
            width={607}
            height={866}
            priority
          />
        </div>
      </section>

      <section className={styles.summaryGrid} aria-label="Resumo do produto">
        <article><strong>R$ 13,99</strong><span>planos a partir de</span></article>
        <article><strong>24h</strong><span>assistência dia e noite</span></article>
        <article><strong>R$ 5 mil</strong><span>sorteios mensais</span></article>
        <article><strong>5 planos</strong><span>coberturas predefinidas</span></article>
      </section>

      <section className={styles.content} id="conteudo">
        <header className={styles.sectionHeader}>
          <div>
            <span>Resumo do produto</span>
            <h2>Proteção e assistência para o lar</h2>
          </div>
        </header>

        <div className={styles.featureGrid}>
          {[
            ["🪟", "Vidraceiro", "Assistência para imprevistos com vidros no imóvel."],
            ["⚡", "Eletricista", "Atendimento para ocorrências elétricas emergenciais."],
            ["🚰", "Encanador", "Suporte para vazamentos e problemas hidráulicos."],
            ["🔑", "Chaveiro", "Auxílio em situações relacionadas a fechaduras e chaves."],
          ].map(([icone, titulo, texto]) => (
            <article className={styles.featureCard} key={titulo}>
              <span>{icone}</span><h3>{titulo}</h3><p>{texto}</p>
            </article>
          ))}
        </div>

        <section className={styles.coverageSection}>
          <div className={styles.sectionHeader}>
            <div><span>Coberturas</span><h2>Compare os cinco planos</h2></div>
          </div>

          <div className={styles.tableWrap}>
            <div className={styles.coverageTable}>
              <div className={styles.tableHead}><strong>Cobertura</strong>{planos.map((plano) => <strong key={plano}>{plano}</strong>)}</div>
              {coberturas.map((item) => (
                <div className={styles.tableRow} key={item.nome}>
                  <span>{item.nome}</span>
                  {item.valores.map((valor) => <span key={`${item.nome}-${valor}`}>{valor}</span>)}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.stepsSection}>
          <div className={styles.sectionHeader}>
            <div><span>Jornada de contratação</span><h2>Passo a passo da comercialização</h2></div>
            <a href="/materiais/seguro-residencial/passo-a-passo-seguro-residencial.pdf" target="_blank" rel="noreferrer">Abrir PDF completo</a>
          </div>

          <div className={styles.stepsList}>
            {passos.map((passo, index) => {
              const aberto = passoAberto === index;
              return (
                <article className={styles.stepCard} key={passo.titulo}>
                  <button type="button" onClick={() => setPassoAberto(aberto ? null : index)}>
                    <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
                    <span><strong>{passo.titulo}</strong><small>{passo.texto}</small></span>
                    <b>{aberto ? "−" : "+"}</b>
                  </button>
                  {aberto && (
                    <div className={styles.stepImage}>
                      <Image
                        src={`/materiais/seguro-residencial/passos/page-${String(passo.imagem).padStart(2, "0")}.png`}
                        alt={`Tela do passo ${index + 1}: ${passo.titulo}`}
                        width={720}
                        height={720}
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.alertSection}>
          <div><span>⚠️</span><h2>Pontos importantes na oferta</h2></div>
          <ul>
            <li>Não prometa cobertura para alagamento ou danos elétricos.</li>
            <li>Casas de madeira não são aceitas.</li>
            <li>O produto não é personalizável: apresente os cinco planos disponíveis.</li>
            <li>Em mudança de endereço, é necessário fazer um novo contrato.</li>
            <li>Para imóveis sem escritura, é necessário ao menos o registro de compra e venda em cartório.</li>
          </ul>
        </section>

        <section className={styles.faqSection}>
          <div className={styles.sectionHeader}>
            <div><span>Perguntas frequentes</span><h2>Tire dúvidas rapidamente</h2></div>
            <a href="/materiais/seguro-residencial/faq-seguro-residencial.pdf" target="_blank" rel="noreferrer">Abrir FAQ</a>
          </div>

          <div className={styles.searchBox}>
            <span>⌕</span>
            <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Pesquisar: alagamento, madeira, área rural..." />
            {busca && <button type="button" onClick={() => setBusca("")}>×</button>}
          </div>

          <div className={styles.faqList}>
            {faqFiltrada.map((item, index) => {
              const aberto = faqAberta === index;
              return (
                <article key={item.pergunta}>
                  <button type="button" onClick={() => setFaqAberta(aberto ? null : index)}>
                    <strong>{item.pergunta}</strong><span>{aberto ? "−" : "+"}</span>
                  </button>
                  {aberto && <p>{item.resposta}</p>}
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.quizSection}>
          <div className={styles.sectionHeader}>
            <div><span>Fixação do conteúdo</span><h2>Quiz rápido</h2></div>
            <strong className={styles.score}>{acertos}/{quiz.length} acertos</strong>
          </div>

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
      </section>
    </main>
  );
}
