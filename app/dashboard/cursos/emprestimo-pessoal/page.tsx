"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type QuizOption = { label: string; correct: boolean };
type QuizQuestion = {
  id: number;
  question: string;
  options: QuizOption[];
  explanation: string;
};

const STORAGE_KEY = "treinexpresso-emprestimo-pessoal-lime-concluido";

const faqs = [
  {
    question: "Onde e como contratar o Crédito Pessoal?",
    answer:
      "A contratação pode ser realizada pelos canais disponibilizados pelo Bradesco, como App Bradesco, autoatendimento e agência. Confirme sempre os canais disponíveis para o cliente.",
  },
  {
    question: "Qual é a carência para pagar a primeira parcela?",
    answer:
      "O cliente pode ter até 90 dias para pagar a primeira parcela, conforme as condições apresentadas na simulação e sujeitas à análise de crédito.",
  },
  {
    question: "Em quantas vezes o Crédito Pessoal pode ser parcelado?",
    answer:
      "O pagamento pode ser realizado em até 72 parcelas, conforme a oferta disponível, a análise de crédito e as condições apresentadas ao cliente.",
  },
  {
    question: "Qual é o valor máximo de contratação?",
    answer:
      "O valor máximo é definido após a análise de crédito e de acordo com o limite disponível para cada cliente.",
  },
  {
    question: "O dinheiro precisa ser usado para uma finalidade específica?",
    answer:
      "Não. O valor é creditado diretamente na conta-corrente e pode ser utilizado sem necessidade de comprovação da finalidade.",
  },
  {
    question: "O Seguro Proteção Financeira é obrigatório?",
    answer:
      "Não. A contratação do seguro é opcional. O cliente deve conhecer as condições, coberturas, valores e regras antes de decidir.",
  },
  {
    question: "A contratação pode ser cancelada depois de confirmada?",
    answer:
      "Após a confirmação e a efetiva liberação do crédito, a operação não pode ser simplesmente cancelada. Oriente o cliente a conferir todas as condições antes de confirmar.",
  },
  {
    question: "Quem tem apenas conta-poupança pode contratar?",
    answer:
      "Para contratar o Crédito Pessoal, o cliente precisa ter conta-corrente ativa. A conta-poupança pode contribuir na análise, mas não substitui a conta-corrente necessária para a operação.",
  },
];

const quiz: QuizQuestion[] = [
  {
    id: 1,
    question: "Qual é a carência máxima informada para a primeira parcela?",
    options: [
      { label: "Até 30 dias", correct: false },
      { label: "Até 60 dias", correct: false },
      { label: "Até 90 dias", correct: true },
      { label: "Até 120 dias", correct: false },
    ],
    explanation:
      "A carência pode chegar a até 90 dias, conforme a condição disponível na simulação.",
  },
  {
    id: 2,
    question: "Em até quantas parcelas o Crédito Pessoal pode ser contratado?",
    options: [
      { label: "24 parcelas", correct: false },
      { label: "36 parcelas", correct: false },
      { label: "60 parcelas", correct: false },
      { label: "72 parcelas", correct: true },
    ],
    explanation:
      "O prazo pode chegar a até 72 parcelas, dependendo da oferta disponível.",
  },
  {
    id: 3,
    question: "O Seguro Proteção Financeira é:",
    options: [
      { label: "Obrigatório", correct: false },
      { label: "Opcional", correct: true },
      { label: "Gratuito e automático", correct: false },
      { label: "Exclusivo para conta-poupança", correct: false },
    ],
    explanation:
      "O seguro é opcional e o cliente deve decidir livremente após conhecer as condições.",
  },
  {
    id: 4,
    question: "Antes da confirmação, o cliente deve conhecer:",
    options: [
      { label: "Somente o valor liberado", correct: false },
      { label: "Apenas a quantidade de parcelas", correct: false },
      {
        label: "Parcelas, taxas, despesas, IOF e CET",
        correct: true,
      },
      { label: "Somente a data da primeira parcela", correct: false },
    ],
    explanation:
      "As condições financeiras e o Custo Efetivo Total devem ser apresentados antes do aceite.",
  },
  {
    id: 5,
    question: "Para contratar o Crédito Pessoal, o cliente precisa:",
    options: [
      { label: "Ter somente conta-poupança", correct: false },
      { label: "Ter conta-corrente ativa e passar pela análise", correct: true },
      { label: "Comprovar como usará o dinheiro", correct: false },
      { label: "Contratar obrigatoriamente o seguro", correct: false },
    ],
    explanation:
      "A contratação exige conta-corrente e está sujeita à análise e à disponibilidade de crédito.",
  },
];

function Check() {
  return <span className="check">✓</span>;
}

export default function EmprestimoPessoalLimePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    try {
      setCompleted(localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      setCompleted(false);
    }
  }, []);

  const score = useMemo(
    () =>
      quiz.reduce((total, question) => {
        const selected = answers[question.id];
        return total +
          (selected !== undefined && question.options[selected]?.correct ? 1 : 0);
      }, 0),
    [answers],
  );

  const allAnswered = Object.keys(answers).length === quiz.length;
  const passed = submitted && score >= 4;

  function concludeCourse() {
    if (!passed) return;
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
    setCompleted(true);
  }

  return (
    <main className="page">
      <header className="topbar">
        <div className="container topbarInner">
          <Link href="/dashboard/cursos" className="back">
            ← Voltar para cursos
          </Link>
          <span className="courseType">Curso de Produtos</span>
        </div>
      </header>

      <section className="hero">
        <div className="heroDecor heroDecorOne" />
        <div className="heroDecor heroDecorTwo" />

        <div className="container heroGrid">
          <div className="heroContent">
            <span className="heroCourseBadge">▣ Curso</span>
            <h1>Crédito Pessoal - Lime</h1>
            <p>
              Tudo o que você precisa saber para oferecer o Crédito Pessoal
              Lime com segurança, confiança e as melhores condições para seus
              clientes.
            </p>

            <div className="heroInfo">
              <span>◷ <strong>Duração:</strong> 20 min</span>
              <span>▥ <strong>Nível:</strong> Médio</span>
            </div>

            <div className="heroProgressBlock">
              <div className="heroProgressLabel">
                <span>Progresso do curso</span>
                <strong>{completed ? "100%" : "0%"}</strong>
              </div>
              <div className="heroProgressTrack">
                <span style={{ width: completed ? "100%" : "0%" }} />
              </div>
            </div>

            <div className="heroActions">
              <a href="#conteudo" className="primaryButton">Iniciar curso</a>
              <a
                href="/materiais/emprestimo-pessoal/regulamento-emprestimo-pessoal-lime.pdf"
                target="_blank"
                rel="noreferrer"
                className="secondaryButton"
              >
                Abrir regulamento
              </a>
            </div>
          </div>

          <aside className="heroImageCard">
            <img
              src="/materiais/emprestimo-pessoal/credito-pessoal-destaque.png"
              alt="Crédito Pessoal para garantir tranquilidade quando precisar"
            />
          </aside>
        </div>
      </section>

      <section className="features">
        <div className="container featuresGrid">
          <article>
            <span className="featureIcon">🤝</span>
            <div>
              <strong>Canais Bradesco</strong>
              <p>App, autoatendimento ou agência</p>
            </div>
          </article>
          <article>
            <span className="featureIcon">📅</span>
            <div>
              <strong>Até 90 dias</strong>
              <p>para pagar a primeira parcela</p>
            </div>
          </article>
          <article>
            <span className="featureIcon">⌛</span>
            <div>
              <strong>Até 72 parcelas</strong>
              <p>conforme a oferta disponível</p>
            </div>
          </article>
        </div>
      </section>

      <section id="conteudo" className="section">
        <div className="container">
          <header className="sectionHeader">
            <span>01</span>
            <div>
              <small>CONHEÇA O PRODUTO</small>
              <h2>O que é o Empréstimo Pessoal Lime?</h2>
            </div>
          </header>

          <div className="twoColumns">
            <article className="card">
              <p className="lead">
                O Crédito Pessoal é uma solução para clientes pessoa física que
                precisam de dinheiro para organizar projetos, realizar planos
                ou lidar com despesas do dia a dia.
              </p>
              <p>
                Após a contratação, o valor é liberado diretamente na
                conta-corrente. Não é necessário comprovar onde o dinheiro será
                utilizado.
              </p>
              <div className="alert">
                <strong>Importante</strong>
                <p>
                  Disponibilidade, limite, taxas, prazo e carência dependem da
                  análise e da oferta apresentada para cada cliente.
                </p>
              </div>
            </article>

            <article className="card">
              <small className="tag">PRINCIPAIS BENEFÍCIOS</small>
              <ul className="benefits">
                <li><Check /> Crédito direto em conta-corrente.</li>
                <li><Check /> Sem comprovação da finalidade de uso.</li>
                <li><Check /> Escolha da melhor data disponível.</li>
                <li><Check /> Até 90 dias para a primeira parcela.</li>
                <li><Check /> Prazo de até 72 parcelas.</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="section whiteSection">
        <div className="container">
          <header className="sectionHeader">
            <span>02</span>
            <div>
              <small>ATENDIMENTO CONSULTIVO</small>
              <h2>Como apresentar o produto ao cliente</h2>
            </div>
          </header>

          <div className="steps">
            {[
              ["1", "Entenda a necessidade", "Pergunte o objetivo e quanto o cliente consegue reservar por mês."],
              ["2", "Consulte a oferta", "Verifique limite, prazo, carência, vencimento e valor das parcelas."],
              ["3", "Explique as condições", "Apresente taxas, IOF, despesas, seguro opcional e CET."],
              ["4", "Confirme com segurança", "Oriente o cliente a revisar os dados antes de confirmar."],
            ].map(([number, title, text]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>

          <div className="salesTalk">
            <span>“</span>
            <div>
              <small>SUGESTÃO DE ABORDAGEM</small>
              <p>
                “Você possui uma opção de crédito disponível diretamente na
                conta. Podemos simular diferentes prazos para encontrar uma
                parcela adequada ao seu orçamento.”
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <header className="sectionHeader">
            <span>03</span>
            <div>
              <small>CRÉDITO RESPONSÁVEL</small>
              <h2>Cuidados antes de concluir a contratação</h2>
            </div>
          </header>

          <div className="responsibleGrid">
            {[
              ["Capacidade de pagamento", "A parcela deve caber no orçamento sem comprometer as necessidades essenciais."],
              ["Custo Efetivo Total", "O CET reúne os custos da operação e deve ser apresentado antes da confirmação."],
              ["Pagamento em dia", "Atrasos podem gerar juros, multa e despesas de cobrança."],
              ["Confirmação consciente", "Após a confirmação e liberação, a operação não pode ser simplesmente cancelada."],
            ].map(([title, text], index) => (
              <article key={title}>
                <span>0{index + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="insurance">
        <div className="container insuranceGrid">
          <div>
            <small>PROTEÇÃO FINANCEIRA</small>
            <h2>Mais tranquilidade durante o contrato</h2>
            <p>
              O cliente pode optar pelo Seguro Proteção Financeira. Coberturas,
              carências, franquias, valores e regras devem ser apresentadas
              antes do aceite.
            </p>
            <strong className="optional">Contratação opcional</strong>
          </div>
          <article>
            <h3>Atenção na oferta</h3>
            <ul>
              <li>Não condicione o empréstimo à contratação do seguro.</li>
              <li>Explique o valor do prêmio e como será pago.</li>
              <li>Apresente coberturas, carências e exclusões.</li>
              <li>Informe as regras de cancelamento.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section whiteSection">
        <div className="container">
          <header className="sectionHeader">
            <span>04</span>
            <div>
              <small>PERGUNTAS FREQUENTES</small>
              <h2>Tire as principais dúvidas</h2>
            </div>
          </header>

          <div className="faqList">
            {faqs.map((faq, index) => {
              const open = openFaq === index;
              return (
                <article key={faq.question} className={open ? "faqOpen" : ""}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : index)}
                    aria-expanded={open}
                  >
                    <span><small>{String(index + 1).padStart(2, "0")}</small>{faq.question}</span>
                    <b>{open ? "−" : "+"}</b>
                  </button>
                  {open && <p>{faq.answer}</p>}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section quizSection">
        <div className="container">
          <div className="quizHeader">
            <div>
              <small>HORA DE PRATICAR</small>
              <h2>Teste seus conhecimentos</h2>
              <p>Obtenha pelo menos 80% de acertos para concluir.</p>
            </div>
            <strong>{Object.keys(answers).length}/{quiz.length}<small>respondidas</small></strong>
          </div>

          <div className="questions">
            {quiz.map((question, questionIndex) => (
              <article className="question" key={question.id}>
                <h3><span>{questionIndex + 1}</span>{question.question}</h3>
                <div className="options">
                  {question.options.map((option, optionIndex) => {
                    const selected = answers[question.id] === optionIndex;
                    const correct = submitted && option.correct;
                    const wrong = submitted && selected && !option.correct;
                    return (
                      <button
                        type="button"
                        disabled={submitted}
                        key={option.label}
                        className={`${selected ? "selected" : ""} ${correct ? "correct" : ""} ${wrong ? "wrong" : ""}`}
                        onClick={() =>
                          setAnswers((current) => ({ ...current, [question.id]: optionIndex }))
                        }
                      >
                        <span>{String.fromCharCode(65 + optionIndex)}</span>
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                {submitted && <p className="explanation"><strong>Explicação:</strong> {question.explanation}</p>}
              </article>
            ))}
          </div>

          {!submitted ? (
            <button
              type="button"
              className="submit"
              disabled={!allAnswered}
              onClick={() => setSubmitted(true)}
            >
              {allAnswered ? "Corrigir avaliação" : `Responda todas as perguntas (${Object.keys(answers).length}/${quiz.length})`}
            </button>
          ) : (
            <div className={`result ${passed ? "passed" : "failed"}`}>
              <span>{passed ? "✓" : "!"}</span>
              <div>
                <small>SEU RESULTADO</small>
                <h3>{score} de {quiz.length} respostas corretas</h3>
                <p>{passed ? "Parabéns! Você atingiu a nota necessária." : "Revise o conteúdo e tente novamente."}</p>
              </div>
              {!passed && (
                <button type="button" onClick={() => { setAnswers({}); setSubmitted(false); }}>
                  Refazer avaliação
                </button>
              )}
            </div>
          )}

          <div className="completion">
            <div>
              <small>CONCLUSÃO</small>
              <h2>{completed ? "Curso concluído com sucesso!" : "Finalize seu treinamento"}</h2>
              <p>{completed ? "Seu progresso foi registrado neste navegador." : "O botão será liberado após atingir a nota mínima."}</p>
            </div>
            <button
              type="button"
              disabled={!passed || completed}
              onClick={concludeCourse}
              className={completed ? "done" : ""}
            >
              {completed ? "✓ Curso concluído" : "Concluir curso"}
            </button>
          </div>
        </div>
      </section>

      <footer>
        <div className="container footerInner">
          <div><strong>TreinExpresso</strong><span>Treinamento e Capacitação</span></div>
          <p>Material interno. Confirme as condições comerciais nos canais oficiais no momento da contratação.</p>
        </div>
      </footer>

      <style jsx>{`
        :global(*){box-sizing:border-box} :global(html){scroll-behavior:smooth}
        :global(body){margin:0;background:#f6f6f7;color:#28262a;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
        .page{min-height:100vh;overflow:hidden}.container{width:min(1160px,calc(100% - 40px));margin:auto}
        .topbar{background:#fff;border-bottom:1px solid #ecebed}.topbarInner{height:68px;display:flex;align-items:center;justify-content:space-between}
        .back{color:#3d3940;text-decoration:none;font-size:14px;font-weight:800}.courseType{color:#77727a;font-size:13px;font-weight:700}
        .hero{position:relative;overflow:hidden;padding:64px 0 56px;background:linear-gradient(118deg,#a9002d 0%,#d2093d 53%,#efb3aa 100%);color:white}
        .heroDecor{position:absolute;border-radius:999px;pointer-events:none}.heroDecorOne{width:420px;height:420px;right:-180px;top:-260px;border:60px solid #a8002c55}.heroDecorTwo{width:240px;height:240px;left:47%;bottom:-185px;border:2px solid #ffffff1f}
        .heroGrid{position:relative;z-index:2;display:grid;grid-template-columns:minmax(0,1fr) minmax(380px,48%);gap:42px;align-items:center}.heroContent{max-width:560px}.eyebrow,.sectionHeader small,.insurance small,.quizHeader>div>small,.completion small{font-size:12px;font-weight:900;letter-spacing:.15em}
        .heroCourseBadge{display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border:1px solid #ffffff52;border-radius:8px;background:#ffffff10;font-size:12px;font-weight:850}.hero h1{margin:24px 0 0;font-size:clamp(38px,4.2vw,58px);line-height:1.03;letter-spacing:-.045em;font-weight:850}
        .heroContent>p{max-width:520px;margin:19px 0 0;color:#ffffffe5;font-size:17px;line-height:1.55}.heroInfo{display:flex;gap:24px;flex-wrap:wrap;margin-top:22px;color:#ffffffe0;font-size:13px}.heroInfo span{display:inline-flex;align-items:center;gap:5px}
        .heroProgressBlock{max-width:460px;margin-top:24px}.heroProgressLabel{display:flex;justify-content:space-between;gap:18px;margin-bottom:9px;font-size:12px;font-weight:750}.heroProgressTrack{height:5px;overflow:hidden;border-radius:999px;background:#ffffff45}.heroProgressTrack span{display:block;height:100%;border-radius:inherit;background:white;transition:width .3s ease}
        .heroActions{display:flex;gap:12px;margin-top:25px;flex-wrap:wrap}.primaryButton,.secondaryButton{min-height:46px;padding:0 20px;border-radius:11px;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;font-size:13px;font-weight:850}.primaryButton{background:white;color:#ba0b32}.secondaryButton{color:white;border:1px solid #ffffff55;background:#ffffff12}
        .heroImageCard{width:100%;overflow:hidden;border:1px solid #ffffff45;border-radius:24px;background:#65001c;box-shadow:0 26px 56px #57001842}.heroImageCard img{width:100%;height:auto;display:block;object-fit:contain;object-position:center}
        .features{margin-top:-30px;position:relative;z-index:3}.featuresGrid{padding:22px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;background:#fff;border:1px solid #ecebed;border-radius:23px;box-shadow:0 20px 50px #2b222812}
        .features article{min-height:110px;padding:20px;display:flex;align-items:center;gap:17px;background:#fafafa;border-radius:17px}.featureIcon{font-size:34px}.features strong{font-size:15px}.features p{margin:5px 0 0;color:#77727a;font-size:13px}
        .section{padding:92px 0}.whiteSection{background:white}.sectionHeader{margin-bottom:38px;display:flex;gap:20px;align-items:flex-start}.sectionHeader>span{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:#fae9ee;color:#bf0c33;font-size:13px;font-weight:900}
        .sectionHeader small,.quizHeader>div>small,.completion small{color:#bf0c33}.sectionHeader h2,.quizHeader h2,.completion h2,.insurance h2{margin:8px 0 0;font-size:clamp(30px,4vw,45px);line-height:1.1;letter-spacing:-.04em}
        .twoColumns{display:grid;grid-template-columns:1.15fr .85fr;gap:22px}.card{padding:32px;border:1px solid #e8e7ea;border-radius:23px;background:#fff;box-shadow:0 16px 40px #2c252908}.card p{color:#68636b;line-height:1.75}.card .lead{margin-top:0;color:#302d32;font-size:20px;font-weight:650;line-height:1.55}.alert{margin-top:25px;padding:20px;border-left:4px solid #c81037;background:#fff2f5;border-radius:0 14px 14px 0}.alert strong{color:#b20a30}.alert p{margin:6px 0 0;font-size:14px}.tag{padding:7px 10px;border-radius:999px;background:#fbeaf0;color:#b80b31;font-weight:900;letter-spacing:.08em}
        .benefits{margin:25px 0 0;padding:0;display:grid;gap:17px;list-style:none}.benefits li{display:flex;gap:12px;align-items:flex-start;line-height:1.5}.check{width:24px;height:24px;flex:0 0 auto;display:grid;place-items:center;border-radius:50%;background:#ca1037;color:white;font-size:13px;font-weight:900}
        .steps{display:grid;grid-template-columns:repeat(4,1fr);gap:15px}.steps article{min-height:235px;padding:27px;border:1px solid #e8e7ea;border-radius:21px;background:#fafafa}.steps article>span{width:41px;height:41px;display:grid;place-items:center;border-radius:13px;background:#fae9ee;color:#c20d34;font-size:13px;font-weight:900}.steps h3{margin:28px 0 10px;font-size:19px}.steps p,.responsibleGrid p{margin:0;color:#706b73;font-size:14px;line-height:1.65}
        .salesTalk{margin-top:22px;padding:32px;display:flex;gap:24px;color:white;background:linear-gradient(120deg,#a0042b,#d71842);border-radius:22px}.salesTalk>span{font:72px Georgia;line-height:.8;opacity:.45}.salesTalk small{font-size:11px;font-weight:900;letter-spacing:.15em;color:#ffffffb8}.salesTalk p{margin:8px 0 0;font-size:19px;line-height:1.6;font-weight:600}
        .responsibleGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:17px}.responsibleGrid article{padding:28px;border:1px solid #e8e7ea;border-radius:21px;background:white}.responsibleGrid article>span{color:#c00c33;font-size:12px;font-weight:900}.responsibleGrid h3{margin:15px 0 9px;font-size:19px}
        .insurance{padding:92px 0;color:white;background:linear-gradient(120deg,#65031e,#b20b35)}.insuranceGrid{display:grid;grid-template-columns:1fr .85fr;gap:60px;align-items:center}.insurance small{color:#ffffffaa}.insurance h2{color:white}.insurance p{color:#ffffffce;font-size:17px;line-height:1.7}.optional{display:inline-block;margin-top:15px;padding:9px 13px;border:1px solid #ffffff55;border-radius:999px;font-size:12px;text-transform:uppercase;letter-spacing:.08em}.insurance article{padding:32px;border:1px solid #ffffff35;border-radius:24px;background:#ffffff15}.insurance article h3{margin-top:0}.insurance li{margin:12px 0;color:#ffffffd0;line-height:1.55}
        .faqList{border:1px solid #e6e5e8;border-radius:22px;overflow:hidden;background:white}.faqList article+article{border-top:1px solid #ecebed}.faqList button{width:100%;min-height:82px;padding:20px 26px;border:0;display:flex;align-items:center;justify-content:space-between;gap:20px;background:transparent;color:#37343a;text-align:left;font:inherit;font-size:16px;font-weight:800;cursor:pointer}.faqList button>span{display:flex;gap:16px;align-items:center}.faqList button small,.faqList button b{color:#c10d34}.faqList article>p{margin:-4px 65px 0;padding:0 0 25px;color:#656068;line-height:1.7}.faqOpen{background:#fff8fa}
        .quizSection{background:#f1f1f3}.quizHeader{margin-bottom:32px;display:flex;align-items:flex-end;justify-content:space-between;gap:25px}.quizHeader p,.completion p{color:#716c74}.quizHeader>strong{min-width:125px;padding:16px;border-radius:16px;background:white;color:#bc0c32;text-align:center;font-size:22px}.quizHeader>strong small{display:block;margin-top:3px;color:#77727a;font-size:10px;text-transform:uppercase;letter-spacing:.08em}.questions{display:grid;gap:16px}.question{padding:28px;border:1px solid #e2e1e4;border-radius:21px;background:white}.question h3{margin:0;display:flex;gap:14px;align-items:flex-start;font-size:18px;line-height:1.45}.question h3>span{width:30px;height:30px;flex:0 0 auto;display:grid;place-items:center;border-radius:9px;background:#c70f37;color:white;font-size:12px}.options{margin-top:20px;display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.options button{min-height:60px;padding:11px 14px;border:1px solid #e2e0e4;border-radius:13px;display:flex;align-items:center;gap:11px;background:#fafafa;color:#504c52;text-align:left;font:inherit;font-size:14px;cursor:pointer}.options button>span{width:28px;height:28px;display:grid;place-items:center;border:1px solid #d9d6db;border-radius:8px;background:white;font-size:11px;font-weight:900}.options .selected{border-color:#c70f37;background:#fff2f5}.options .selected>span{border-color:#c70f37;background:#c70f37;color:white}.options .correct{border-color:#258b53;background:#effaf4}.options .correct>span{border-color:#258b53;background:#258b53;color:white}.options .wrong{border-color:#d23945;background:#fff1f2}.options .wrong>span{border-color:#d23945;background:#d23945;color:white}.explanation{margin:17px 0 0;padding:13px 15px;border-radius:11px;background:#f2f2f4;color:#625d64;font-size:13px;line-height:1.55}.submit{width:100%;min-height:57px;margin-top:20px;border:0;border-radius:14px;background:#c70f37;color:white;font:inherit;font-weight:900;cursor:pointer}.submit:disabled{background:#dcdcdf;color:#939096;cursor:not-allowed}
        .result{margin-top:21px;padding:24px;display:flex;align-items:center;gap:18px;border:1px solid;border-radius:19px}.result>span{width:48px;height:48px;display:grid;place-items:center;border-radius:50%;background:#278a54;color:white;font-size:22px;font-weight:900}.result small{font-size:11px;letter-spacing:.08em;font-weight:900}.result h3{margin:4px 0}.result p{margin:0;color:#625e65}.result>button{margin-left:auto;min-height:42px;padding:0 16px;border:0;border-radius:11px;background:#c70f37;color:white;font:inherit;font-weight:800;cursor:pointer}.passed{border-color:#a6dabd;background:#effaf4}.failed{border-color:#efbdc2;background:#fff2f3}.failed>span{background:#cf3441}
        .completion{margin-top:40px;padding:32px;display:flex;align-items:center;justify-content:space-between;gap:30px;border:1px solid #e0dfe2;border-radius:24px;background:white}.completion h2{font-size:29px}.completion>button{min-width:205px;min-height:55px;padding:0 22px;border:0;border-radius:14px;background:#c70f37;color:white;font:inherit;font-weight:900;cursor:pointer}.completion>button:disabled{background:#dedee1;color:#949197;cursor:not-allowed}.completion>button.done{background:#e7f7ed;color:#176b3e}
        footer{padding:34px 0;background:#261f22;color:#ffffffb0}.footerInner{display:flex;align-items:center;justify-content:space-between;gap:30px}.footerInner strong,.footerInner span{display:block}.footerInner strong{color:white}.footerInner span,.footerInner p{font-size:12px}.footerInner p{max-width:650px;text-align:right;line-height:1.6}
        @media(max-width:950px){.heroGrid,.twoColumns,.insuranceGrid{grid-template-columns:1fr}.heroContent{max-width:none}.heroImageCard{width:min(100%,700px);margin:0 auto}.featuresGrid{grid-template-columns:1fr}.steps{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:680px){.container{width:min(100% - 24px,1160px)}.courseType{display:none}.hero{padding:48px 0}.hero h1{font-size:38px}.heroGrid{gap:28px}.heroInfo{gap:14px}.heroImageCard{border-radius:18px}.heroActions{flex-direction:column}.primaryButton,.secondaryButton{width:100%}.heroImageCard{min-height:240px}.heroImageCard img{min-height:240px}.features{margin-top:12px}.featuresGrid{padding:10px}.section,.insurance{padding:66px 0}.sectionHeader{gap:13px}.sectionHeader>span{width:39px;height:39px}.card,.question{padding:22px}.steps,.responsibleGrid,.options{grid-template-columns:1fr}.steps article{min-height:auto}.salesTalk>span{display:none}.faqList button{padding:18px;font-size:15px}.faqList article>p{margin:-3px 45px 0}.quizHeader,.completion,.footerInner,.result{align-items:stretch;flex-direction:column}.result>button{margin-left:0}.completion>button{width:100%}.footerInner p{text-align:left}}
      `}</style>
    </main>
  );
}
