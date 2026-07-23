"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type QuizQuestion = {
  pergunta: string;
  opcoes: string[];
  correta: number;
  explicacao: string;
};

type FaqItem = {
  pergunta: string;
  resposta: string;
};

const portfolio = [
  ["🚗", "Automóveis", "Veículos leves conforme as regras de ano e modelo."],
  ["🏍️", "Motocicletas", "Critérios variam conforme grupo, cilindrada e tempo de uso."],
  ["🚛", "Pesados", "Caminhões e veículos pesados conforme elegibilidade."],
  ["🚜", "Tratores", "Linha Verde e máquinas agrícolas, em regra, novas."],
  ["🏗️", "Linha Amarela", "Máquinas de construção conforme as regras do grupo."],
  ["🌾", "Implementos agrícolas", "Implementos novos e marcas permitidas."],
  ["🏠", "Imóveis residenciais", "Aquisição de casa, apartamento e demais imóveis residenciais."],
  ["🏢", "Imóveis comerciais", "Aquisição de imóveis destinados à atividade comercial."],
  ["🌳", "Imóveis rurais", "Imóveis rurais conforme critérios da modalidade."],
  ["🧱", "Construção e reforma", "Projetos de construção, conclusão de obra e reformas."],
  ["📍", "Terrenos", "Aquisição de terrenos conforme regras aplicáveis."],
  ["🚁", "Drones", "Possibilidades que vão além de carros e imóveis."],
];

const quizQuestions: QuizQuestion[] = [
  {
    pergunta: "O que é consórcio?",
    opcoes: [
      "Um financiamento com juros reduzidos",
      "Um sistema de autofinanciamento formado por grupos de pessoas físicas e/ou jurídicas",
      "Um empréstimo com garantia",
      "Um investimento de renda fixa",
    ],
    correta: 1,
    explicacao:
      "O consórcio é um sistema de autofinanciamento em grupo voltado à aquisição de bens.",
  },
  {
    pergunta: "O consórcio possui juros?",
    opcoes: [
      "Sim, em todas as parcelas",
      "Somente depois da contemplação",
      "Não. Existem os componentes previstos no grupo, como taxa de administração, fundo comum e fundo de reserva",
      "Somente para imóveis",
    ],
    correta: 2,
    explicacao:
      "Não há juros como em um financiamento. A parcela é composta pelos valores previstos no grupo.",
  },
  {
    pergunta: "Quais são as formas de contemplação?",
    opcoes: ["Sorteio e lance", "Somente sorteio", "Somente lance", "Análise de renda"],
    correta: 0,
    explicacao:
      "A contemplação pode ocorrer por sorteio ou lance, conforme as regras do grupo.",
  },
  {
    pergunta: "O que é fundo comum?",
    opcoes: [
      "Tarifa de manutenção",
      "Valor que forma o capital do grupo para aquisição dos bens",
      "Seguro obrigatório",
      "Multa por atraso",
    ],
    correta: 1,
    explicacao:
      "O fundo comum reúne os recursos utilizados nas aquisições dos contemplados.",
  },
  {
    pergunta: "Para que serve o fundo de reserva?",
    opcoes: [
      "Pagar a comissão do vendedor",
      "Aumentar o valor da carta",
      "Proteger o grupo em situações previstas, como inadimplência",
      "Substituir o seguro prestamista",
    ],
    correta: 2,
    explicacao:
      "O fundo de reserva ajuda a proteger o grupo em situações previstas contratualmente.",
  },
  {
    pergunta: "Qual é a idade mínima para contratar?",
    opcoes: [
      "16 anos em qualquer situação",
      "18 anos, ou maior de 16 anos quando emancipado",
      "21 anos",
      "25 anos",
    ],
    correta: 1,
    explicacao:
      "A regra básica é 18 anos, sendo permitido maior de 16 anos quando emancipado.",
  },
  {
    pergunta: "Qual é a idade máxima na data de adesão?",
    opcoes: ["65 anos", "70 anos", "74 anos, 11 meses e 29 dias", "80 anos"],
    correta: 2,
    explicacao:
      "O manual estabelece idade máxima de 74 anos, 11 meses e 29 dias na adesão.",
  },
  {
    pergunta: "O seguro prestamista é obrigatório?",
    opcoes: ["Sim", "Somente para imóveis", "Somente após contemplar", "Não, é opcional"],
    correta: 3,
    explicacao:
      "O seguro prestamista é opcional na contratação e na contemplação.",
  },
  {
    pergunta: "Idade somada ao prazo do seguro pode ultrapassar 80 anos?",
    opcoes: ["Sim", "Não", "Somente para imóvel", "Somente com autorização"],
    correta: 1,
    explicacao:
      "No seguro prestamista, idade e prazo somados não podem ultrapassar 80 anos.",
  },
  {
    pergunta: "Veículos leves e pesados podem ter até quantos anos de uso?",
    opcoes: ["5 anos", "8 anos", "10 anos", "15 anos"],
    correta: 2,
    explicacao:
      "O material informa, em regra, até 10 anos de uso para veículos leves e pesados.",
  },
  {
    pergunta: "Linha Amarela e implementos agrícolas podem ser usados?",
    opcoes: [
      "Sim, sem limite",
      "Somente bens novos",
      "Somente até 10 anos",
      "Somente após contemplação",
    ],
    correta: 1,
    explicacao:
      "O manual indica apenas bens novos para essas categorias.",
  },
  {
    pergunta: "Quanto da carta de Auto pode ser usado para documentação, acessórios e seguro?",
    opcoes: ["Nada", "Até 5%", "Até 10%", "Até 20%"],
    correta: 2,
    explicacao:
      "Pode ser utilizado até 10% do valor total da carta, conforme as regras.",
  },
  {
    pergunta: "O FGTS pode ser usado para construção e aquisição de terreno?",
    opcoes: ["Sim", "Não", "Somente terreno", "Somente construção"],
    correta: 1,
    explicacao:
      "O manual informa que não é permitido usar FGTS para construção e aquisição de terreno.",
  },
  {
    pergunta: "Como ocorre o reajuste de imóveis?",
    opcoes: ["Pela Selic", "Pelo IPCA mensal", "Anualmente pelo INCC", "Não há reajuste"],
    correta: 2,
    explicacao:
      "Imóveis são reajustados anualmente de acordo com o INCC.",
  },
  {
    pergunta: "Como ocorre o reajuste de veículos?",
    opcoes: ["Tabela do fabricante", "INCC", "Salário mínimo", "Dólar"],
    correta: 0,
    explicacao:
      "Veículos seguem a tabela do fabricante conforme a referência do grupo.",
  },
  {
    pergunta: "Existe avaliação de crédito?",
    opcoes: [
      "Não",
      "Somente no encerramento",
      "Sim, na venda e na utilização da carta contemplada",
      "Somente para pessoa jurídica",
    ],
    correta: 2,
    explicacao:
      "A administradora realiza avaliação tanto na venda quanto na utilização da carta.",
  },
  {
    pergunta: "O que deve ser apresentado antes de prosseguir no portal?",
    opcoes: [
      "Somente a parcela",
      "QR Code ou link do aviso de privacidade",
      "Resultado da assembleia",
      "Telefone da central",
    ],
    correta: 1,
    explicacao:
      "É obrigatório apresentar o aviso de privacidade ao cliente antes de continuar.",
  },
  {
    pergunta: "O que acontece após a biometria facial?",
    opcoes: [
      "A venda é cancelada",
      "O cliente recebe contrato para assinatura e cobrança da primeira parcela",
      "O vendedor assina",
      "A carta é liberada imediatamente",
    ],
    correta: 1,
    explicacao:
      "Após a biometria, o contrato e a cobrança da primeira parcela são enviados ao cliente.",
  },
  {
    pergunta: "Se não houver cotas na pesquisa, o que fazer?",
    opcoes: [
      "Prometer uma cota",
      "Encerrar a venda",
      "Ajustar os critérios e pesquisar novamente",
      "Escolher qualquer produto",
    ],
    correta: 2,
    explicacao:
      "Ajuste valor, prazo ou ordenação e refaça a busca.",
  },
  {
    pergunta: "Qual é a postura comercial correta?",
    opcoes: [
      "Prometer contemplação rápida",
      "Identificar a necessidade, explicar claramente e não garantir contemplação",
      "Focar apenas na menor parcela",
      "Dizer que é igual a financiamento",
    ],
    correta: 1,
    explicacao:
      "A venda deve ser consultiva, transparente e sem promessa de contemplação.",
  },
];

const faqItems: FaqItem[] = [
  {
    pergunta: "Consórcio tem juros?",
    resposta:
      "Não há juros como em um financiamento. O cliente paga os componentes previstos no grupo, como fundo comum, taxa de administração e fundo de reserva.",
  },
  {
    pergunta: "Existe garantia de contemplação em determinado mês?",
    resposta:
      "Não. A contemplação ocorre por sorteio ou lance conforme as regras do grupo. Nunca prometa uma data.",
  },
  {
    pergunta: "O cliente pode ofertar lance?",
    resposta:
      "Sim. As modalidades, condições e critérios devem ser consultados nas regras do grupo.",
  },
  {
    pergunta: "É possível quitar financiamento?",
    resposta:
      "Sim, nas modalidades e condições previstas, inclusive no crédito imobiliário.",
  },
  {
    pergunta: "Pode comprar imóvel residencial, comercial ou rural?",
    resposta:
      "Sim. O portfólio contempla essas modalidades, além de terrenos, construção e reforma.",
  },
  {
    pergunta: "Pode usar até 10% da carta para despesas?",
    resposta:
      "Sim, conforme a modalidade. Em Auto, para documentação, acessórios e seguro. Em Imóvel, para móveis planejados e despesas documentais.",
  },
  {
    pergunta: "O FGTS pode ser usado?",
    resposta:
      "Pode ser utilizado nas hipóteses permitidas, como lance, complemento, amortização, quitação e parte das parcelas. Não é permitido para construção e aquisição de terreno, segundo o manual.",
  },
  {
    pergunta: "O seguro prestamista é obrigatório?",
    resposta:
      "Não. Ele é totalmente opcional.",
  },
  {
    pergunta: "O contemplado recebe o dinheiro em conta?",
    resposta:
      "Em regra, após análise e documentação, o pagamento é destinado ao vendedor do bem. Cada modalidade possui regras próprias.",
  },
  {
    pergunta: "Pessoa jurídica pode contratar?",
    resposta:
      "Sim. O portal possui cadastro específico para pessoa jurídica.",
  },
  {
    pergunta: "É possível comprar bem entre sócio e empresa?",
    resposta:
      "Há situações permitidas e exceções. É vedada a aquisição entre cônjuges e existem restrições para EI e MEI. Consulte a norma vigente.",
  },
  {
    pergunta: "Como funciona a reforma simplificada?",
    resposta:
      "Prevê formulário com custo da obra, operação limitada a R$ 500 mil, uso de até 40% do valor do imóvel e liberação após alienação.",
  },
];

function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-2xl shadow-sm ring-1 ring-red-100">
      {children}
    </span>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-3xl">
      <span className="font-black uppercase tracking-[0.18em] text-[#cc092f]">
        {eyebrow}
      </span>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-zinc-900 md:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="mt-5 text-lg leading-8 text-zinc-600">{description}</p>
      )}
    </div>
  );
}

export default function CursoConsorcioPage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const answeredCount = Object.keys(answers).length;
  const score = useMemo(
    () =>
      quizQuestions.reduce(
        (total, question, index) =>
          total + (answers[index] === question.correta ? 1 : 0),
        0,
      ),
    [answers],
  );
  const percentage = Math.round((score / quizQuestions.length) * 100);

  function selectAnswer(questionIndex: number, optionIndex: number) {
    if (submitted) return;
    setAnswers((current) => ({ ...current, [questionIndex]: optionIndex }));
  }

  function resetQuiz() {
    setAnswers({});
    setSubmitted(false);
    document.getElementById("quiz")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#fffafb] text-zinc-900">
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#cc092f] via-[#b0003a] to-[#76002f] px-5 py-20 text-white md:px-10 md:py-28">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-red-300/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-bold backdrop-blur">
              🎓 TreinExpresso • Formação Comercial
            </div>
            <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight md:text-6xl">
              Curso de
              <span className="block text-red-100">Consórcio Bradesco</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/90 md:text-xl">
              Aprenda a identificar o objetivo do cliente, explicar o produto
              com transparência e conduzir a simulação e contratação com
              segurança.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold">
              {["Conceito", "Portfólio", "Contemplação", "Vendas", "Portal", "Quiz"].map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/20 bg-white/10 px-4 py-2"
                  >
                    {item}
                  </span>
                ),
              )}
            </div>
            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#conteudo"
                className="inline-flex items-center justify-center rounded-full px-7 py-4 font-black shadow-xl transition hover:-translate-y-0.5"
                style={{ backgroundColor: "#cc092f", color: "#ffffff", border: "2px solid rgba(255,255,255,0.85)" }}
              >
                Começar o curso
              </a>
              <a
                href="https://bradesco.parceiroconsorcio.com.br/login"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-white/35 bg-white/10 px-7 py-4 font-black text-white transition hover:bg-white/20"
              >
                Portal de vendas
              </a>
              <a
                href="#quiz"
                className="inline-flex items-center justify-center rounded-full border border-white/35 bg-white/10 px-7 py-4 font-black text-white transition hover:bg-white/20"
              >
                Ir para o quiz
              </a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="overflow-hidden rounded-[2.2rem] border border-white/20 bg-white/10 shadow-2xl backdrop-blur">
              <img
                src="/images/cursos/consorcio/banner-consorcio.jpg"
                alt="Consórcio Bradesco — realize a conquista do seu sonho"
                className="h-auto w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="conteudo" className="scroll-mt-24 px-5 py-20 md:px-10">
        <div className="mx-auto max-w-6xl">
          <SectionTitle
            eyebrow="Fundamentos"
            title="O que é consórcio?"
            description="É um sistema de autofinanciamento formado por grupos de pessoas físicas e/ou jurídicas com o objetivo de adquirir um bem."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              ["👥", "Formação do grupo", "Os integrantes realizam contribuições mensais para formar os recursos do grupo."],
              ["🎯", "Contemplação", "A contemplação ocorre por sorteio ou lance, seguindo as regras do grupo."],
              ["🤝", "Aquisição do bem", "Após análise e documentação, a administradora realiza o pagamento ao vendedor."],
            ].map((item) => (
              <article key={item[1]} className="rounded-3xl border border-red-100 bg-white p-7 shadow-sm">
                <IconBadge>{item[0]}</IconBadge>
                <h3 className="mt-5 text-xl font-black">{item[1]}</h3>
                <p className="mt-3 leading-7 text-zinc-600">{item[2]}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 rounded-[2rem] border border-red-100 bg-gradient-to-r from-red-50 to-white p-7 md:p-9">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <IconBadge>💡</IconBadge>
              <div>
                <h3 className="text-xl font-black text-[#b0003a]">
                  Consórcio não é financiamento
                </h3>
                <p className="mt-2 leading-7 text-zinc-700">
                  Não há juros como no crédito convencional. Existem os
                  componentes previstos no grupo e a contemplação não possui
                  data garantida.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 md:px-10">
        <div className="mx-auto max-w-6xl">
          <SectionTitle
            eyebrow="Jornada"
            title="Como funciona"
            description="Explique o ciclo de forma simples para o cliente entender o compromisso assumido."
          />
          <div className="mt-12 grid gap-5 lg:grid-cols-6">
            {[
              ["1", "Adesão", "Escolha do segmento, crédito, grupo e prazo."],
              ["2", "Parcelas", "Contribuições mensais para o grupo."],
              ["3", "Contemplação", "Por sorteio ou lance."],
              ["4", "Análise", "Avaliação de crédito e documentos."],
              ["5", "Aquisição", "Pagamento ao vendedor do bem."],
              ["6", "Encerramento", "Pagamento das parcelas restantes."],
            ].map((step) => (
              <article key={step[0]} className="rounded-3xl border border-red-100 bg-[#fffafb] p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#cc092f] text-lg font-black text-white">
                  {step[0]}
                </div>
                <h3 className="mt-4 font-black">{step[1]}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{step[2]}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <article className="rounded-3xl border border-red-100 bg-red-50 p-7">
              <div className="flex items-center gap-4">
                <IconBadge>🍀</IconBadge>
                <h3 className="text-2xl font-black">Sorteio</h3>
              </div>
              <p className="mt-5 leading-7 text-zinc-700">
                O sorteio segue as regras do grupo e utiliza a referência da
                Loteria Federal.
              </p>
            </article>
            <article className="rounded-3xl border border-red-100 bg-red-50 p-7">
              <div className="flex items-center gap-4">
                <IconBadge>💰</IconBadge>
                <h3 className="text-2xl font-black">Lance</h3>
              </div>
              <p className="mt-5 leading-7 text-zinc-700">
                O participante pode antecipar valor. A contemplação depende das
                regras e do resultado da assembleia.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-10">
        <div className="mx-auto max-w-6xl">
          <SectionTitle
            eyebrow="Parcela"
            title="Entenda a composição"
            description="É essencial explicar com transparência todos os componentes."
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_.8fr]">
            <div className="grid gap-5">
              {[
                ["🏦", "Fundo comum", "Capital formado pelos pagamentos e utilizado nas aquisições dos contemplados."],
                ["📋", "Taxa de administração", "Remuneração da administradora pela organização e gestão do grupo."],
                ["🛡️", "Fundo de reserva", "Proteção do grupo para situações previstas, como inadimplência."],
              ].map((item) => (
                <article key={item[1]} className="flex gap-5 rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
                  <IconBadge>{item[0]}</IconBadge>
                  <div>
                    <h3 className="text-xl font-black">{item[1]}</h3>
                    <p className="mt-2 leading-7 text-zinc-600">{item[2]}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="rounded-[2rem] bg-gradient-to-br from-[#cc092f] to-[#870035] p-7 text-white shadow-xl md:p-9">
              <p className="font-black uppercase tracking-wider text-white/75">
                Exemplo didático
              </p>
              <h3 className="mt-3 text-3xl font-black">Carta de R$ 100 mil</h3>
              <div className="mt-7 space-y-3">
                <div className="flex justify-between border-b border-white/20 pb-3">
                  <span>Crédito</span><strong>R$ 100.000</strong>
                </div>
                <div className="flex justify-between border-b border-white/20 pb-3">
                  <span>Taxa de administração (17%)</span><strong>R$ 17.000</strong>
                </div>
                <div className="flex justify-between border-b border-white/20 pb-3">
                  <span>Fundo de reserva (3%)</span><strong>R$ 3.000</strong>
                </div>
              </div>
              <div className="mt-5 rounded-3xl bg-white p-5 text-center text-[#b0003a]">
                <p className="text-sm font-bold">60 meses</p>
                <p className="mt-1 text-3xl font-black">R$ 2.000/mês</p>
              </div>
              <p className="mt-5 text-sm leading-6 text-white/80">
                Exemplo didático. Consulte sempre as condições reais no portal.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 md:px-10">
        <div className="mx-auto max-w-6xl">
          <SectionTitle
            eyebrow="Portfólio"
            title="Muito além de carro e casa"
            description="O consórcio atende diferentes projetos pessoais e empresariais."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {portfolio.map((item) => (
              <article key={item[1]} className="rounded-3xl border border-red-100 bg-[#fffafb] p-6 transition hover:-translate-y-1 hover:shadow-lg">
                <div className="text-4xl">{item[0]}</div>
                <h3 className="mt-4 text-lg font-black">{item[1]}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{item[2]}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-10">
        <div className="mx-auto max-w-6xl">
          <SectionTitle
            eyebrow="Elegibilidade"
            title="Regras que precisam ser verificadas"
            description="Cada bem possui critérios próprios. Consulte sempre o portal e a norma vigente."
          />
          <div className="mt-12 overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-sm">
            {[
              ["🚗", "Veículos leves e pesados", "Em regra, até 10 anos de uso."],
              ["🏍️", "Motocicletas", "300 cc: 0 km; 400 cc: até 3 anos; 600 cc: até 5 anos nas cartas de Auto."],
              ["🚜", "Tratores e máquinas", "Linha Verde e Linha Amarela: bens novos."],
              ["🌾", "Implementos agrícolas", "Somente novos e dentro das marcas permitidas."],
              ["🏠", "Imóveis", "Residencial, comercial, rural, construção, reforma e terrenos."],
            ].map((row, index) => (
              <div
                key={row[1]}
                className={`grid gap-3 p-6 md:grid-cols-[70px_250px_1fr] md:items-center ${
                  index < 4 ? "border-b border-red-100" : ""
                }`}
              >
                <div className="text-3xl">{row[0]}</div>
                <h3 className="font-black">{row[1]}</h3>
                <p className="leading-7 text-zinc-600">{row[2]}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <article className="rounded-3xl border border-red-100 bg-red-50 p-7">
              <h3 className="text-xl font-black text-[#b0003a]">🚘 Até 10% da carta de Auto</h3>
              <p className="mt-3 leading-7 text-zinc-700">
                Para documentação, acessórios e seguro do veículo, conforme as condições.
              </p>
            </article>
            <article className="rounded-3xl border border-red-100 bg-red-50 p-7">
              <h3 className="text-xl font-black text-[#b0003a]">🏡 Até 10% da carta de Imóvel</h3>
              <p className="mt-3 leading-7 text-zinc-700">
                Para móveis planejados e documentação, como ITBI e cartório.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 md:px-10">
        <div className="mx-auto max-w-6xl">
          <SectionTitle
            eyebrow="Reajustes"
            title="Preservação do poder de compra"
            description="O crédito e as parcelas podem ser atualizados conforme o tipo de bem."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <article className="rounded-[2rem] border border-red-100 bg-[#fffafb] p-8">
              <div className="text-5xl">🚗</div>
              <h3 className="mt-5 text-2xl font-black">Bens móveis</h3>
              <p className="mt-3 leading-7 text-zinc-600">
                Corrigidos de acordo com a tabela do fabricante e referência do grupo.
              </p>
            </article>
            <article className="rounded-[2rem] border border-red-100 bg-[#fffafb] p-8">
              <div className="text-5xl">🏠</div>
              <h3 className="mt-5 text-2xl font-black">Imóveis</h3>
              <p className="mt-3 leading-7 text-zinc-600">
                Reajustados anualmente conforme o INCC.
              </p>
            </article>
          </div>
          <div className="mt-8 rounded-3xl border-l-8 border-[#cc092f] bg-red-50 p-6">
            <p className="font-black text-[#b0003a]">Explique antes da venda</p>
            <p className="mt-2 leading-7 text-zinc-700">
              O reajuste busca preservar o poder de compra da carta e não representa cobrança de juros.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-10">
        <div className="mx-auto max-w-6xl">
          <SectionTitle eyebrow="Quem pode contratar" title="Regras básicas e seguro prestamista" />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <article className="rounded-[2rem] border border-red-100 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-4">
                <IconBadge>👤</IconBadge><h3 className="text-2xl font-black">Contratação</h3>
              </div>
              <ul className="mt-6 space-y-4 leading-7 text-zinc-700">
                <li>✓ Idade mínima de 18 anos.</li>
                <li>✓ Maior de 16 anos quando emancipado.</li>
                <li>✓ Idade máxima de 74 anos, 11 meses e 29 dias.</li>
                <li>✓ Pessoa física ou pessoa jurídica, conforme análise.</li>
              </ul>
            </article>
            <article className="rounded-[2rem] border border-red-100 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-4">
                <IconBadge>🛡️</IconBadge><h3 className="text-2xl font-black">Seguro prestamista</h3>
              </div>
              <ul className="mt-6 space-y-4 leading-7 text-zinc-700">
                <li>✓ Totalmente opcional.</li>
                <li>✓ Não é obrigatório na contratação ou contemplação.</li>
                <li>✓ Idade somada ao prazo não pode ultrapassar 80 anos.</li>
                <li>✓ A decisão do cliente deve ser respeitada.</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 md:px-10">
        <div className="mx-auto max-w-6xl">
          <SectionTitle
            eyebrow="Imóveis"
            title="FGTS no consórcio imobiliário"
            description="A utilização depende das regras do FGTS e da operação."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              ["🔨", "Lance ou complemento", "Uso para lance ou complemento do crédito, conforme enquadramento."],
              ["📉", "Amortização ou quitação", "Possibilidade de reduzir ou quitar o saldo devedor."],
              ["📆", "Parte das parcelas", "Uso para pagamento de parte das parcelas conforme regras."],
              ["⛔", "Atenção", "Não é permitido para construção e aquisição de terreno."],
            ].map((item) => (
              <article key={item[1]} className="rounded-3xl border border-red-100 bg-[#fffafb] p-6">
                <div className="text-4xl">{item[0]}</div>
                <h3 className="mt-4 text-lg font-black">{item[1]}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{item[2]}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-10">
        <div className="mx-auto max-w-6xl">
          <SectionTitle
            eyebrow="Construção e reforma"
            title="Modalidades e cuidados"
            description="A liberação pode depender da garantia, cronograma, evolução e averbação da obra."
          />
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {[
              ["Construção ou reforma com garantia", "Pode haver liberação integral após alienação quando a garantia atende ao percentual exigido."],
              ["Garantia inferior", "A liberação pode ocorrer em parcelas conforme a evolução da obra."],
              ["Aquisição com construção", "O valor do terreno e o saldo devedor influenciam a estrutura da operação."],
              ["Garantia evolutiva", "Indicada para projetos de maior valor, com liberações conforme evolução física e documental."],
            ].map((item, index) => (
              <article key={item[0]} className="rounded-3xl border border-red-100 bg-white p-7 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#cc092f] font-black text-white">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-black">{item[0]}</h3>
                </div>
                <p className="mt-5 leading-7 text-zinc-600">{item[1]}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 rounded-[2rem] bg-gradient-to-r from-[#cc092f] to-[#8b0037] p-8 text-white shadow-xl">
            <p className="text-sm font-black uppercase tracking-wider text-white/75">Reforma simplificada</p>
            <h3 className="mt-2 text-2xl font-black">Até R$ 500 mil, sem vistoria da obra</h3>
            <p className="mt-4 max-w-4xl leading-7 text-white/90">
              Formulário com custo da obra, uso de até 40% do valor do imóvel e pagamento após alienação.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 md:px-10">
        <div className="mx-auto max-w-6xl">
          <SectionTitle
            eyebrow="Venda consultiva"
            title="Como abordar o cliente"
            description="O melhor argumento começa pela compreensão do sonho ou projeto do cliente."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {[
              ["🎯", "Identifique a necessidade", "Pergunte o que deseja conquistar, quando pretende realizar e quanto pode investir."],
              ["🗣️", "Explique com clareza", "Apresente grupo, prazo, parcela, reajustes, taxa de administração e contemplação."],
              ["📉", "Destaque o planejamento", "Mostre o consórcio como alternativa de organização financeira sem juros de financiamento."],
              ["⭐", "Use exemplos responsáveis", "Compartilhe casos sem prometer contemplação ou lance vencedor."],
            ].map((item) => (
              <article key={item[1]} className="flex gap-5 rounded-3xl border border-red-100 bg-[#fffafb] p-7">
                <IconBadge>{item[0]}</IconBadge>
                <div>
                  <h3 className="text-xl font-black">{item[1]}</h3>
                  <p className="mt-2 leading-7 text-zinc-600">{item[2]}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-7">
            <h3 className="text-xl font-black text-amber-900">⚠️ Nunca prometa contemplação</h3>
            <p className="mt-3 leading-7 text-amber-900/80">
              Não existe garantia de contemplação em mês específico ou com determinado lance.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-10">
        <div className="mx-auto max-w-6xl">
          <SectionTitle
            eyebrow="Portal de vendas"
            title="Fluxo de simulação e contratação"
            description="Siga os passos e reduza pendências."
          />
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {[
              {
                numero: "01",
                titulo: "Acesse o Portal de Vendas",
                descricao: "Entre com o usuário e a senha encaminhados para o seu e-mail.",
                imagem: "/images/cursos/consorcio/portal/01-acesso-portal.png",
              },
              {
                numero: "02",
                titulo: "Informe os dados do cliente",
                descricao: "Preencha CPF ou CNPJ, telefone, e-mail e demais informações solicitadas.",
                imagem: "/images/cursos/consorcio/portal/02-dados-cliente.png",
              },
              {
                numero: "03",
                titulo: "Apresente o aviso de privacidade",
                descricao: "Mostre o QR Code ou envie o link ao cliente antes de prosseguir.",
                imagem: "/images/cursos/consorcio/portal/03-aviso-privacidade.png",
              },
              {
                numero: "04",
                titulo: "Pesquise a melhor cota",
                descricao: "Informe o bem, o valor de crédito, o prazo e os critérios da simulação.",
                imagem: "/images/cursos/consorcio/portal/04-busca-cotas.png",
              },
              {
                numero: "05",
                titulo: "Selecione a cota",
                descricao: "Confira as opções apresentadas e escolha a alternativa adequada ao cliente.",
                imagem: "/images/cursos/consorcio/portal/05-selecao-cota.png",
              },
              {
                numero: "06",
                titulo: "Complete o cadastro",
                descricao: "Preencha os dados cadastrais e revise as informações antes de avançar.",
                imagem: "/images/cursos/consorcio/portal/06-dados-cadastrais.png",
              },
              {
                numero: "07",
                titulo: "Confirme os dados",
                descricao: "Valide as informações de contato, endereço e demais campos da proposta.",
                imagem: "/images/cursos/consorcio/portal/07-confirmacao-dados.png",
              },
              {
                numero: "08",
                titulo: "Realize a biometria facial",
                descricao: "O cliente recebe o link e realiza a validação facial no próprio celular.",
                imagem: "/images/cursos/consorcio/portal/08-biometria-facial.png",
              },
              {
                numero: "09",
                titulo: "Faça a revisão final",
                descricao: "Confira todas as condições antes de concluir a contratação.",
                imagem: "/images/cursos/consorcio/portal/09-revisao-final.png",
              },
              {
                numero: "10",
                titulo: "Contratação concluída",
                descricao: "Após a finalização, o cliente recebe as orientações de assinatura e pagamento.",
                imagem: "/images/cursos/consorcio/portal/10-contratacao-concluida.png",
              },
            ].map((step) => (
              <article
                key={step.numero}
                className="overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-sm"
              >
                <div className="relative overflow-hidden border-b border-red-100 bg-zinc-50">
                  <img
                    src={step.imagem}
                    alt={`Tela ${step.numero}: ${step.titulo}`}
                    className="h-auto w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#cc092f] text-sm font-black text-white">
                      {step.numero}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-zinc-900">
                        {step.titulo}
                      </h3>
                      <p className="mt-2 leading-7 text-zinc-600">
                        {step.descricao}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 md:px-10">
        <div className="mx-auto max-w-6xl">
          <SectionTitle eyebrow="Pós-venda" title="Canais e serviços" />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <article className="rounded-[2rem] border border-red-100 bg-[#fffafb] p-8">
              <p className="text-sm font-black uppercase tracking-wider text-[#cc092f]">Central do Consorciado</p>
              <p className="mt-3 text-3xl font-black">4004-4436</p>
              <p className="mt-3 leading-7 text-zinc-600">
                Segunda via, extrato, assembleia, antecipação, alteração cadastral e lance.
              </p>
            </article>
            <article className="rounded-[2rem] border border-red-100 bg-[#fffafb] p-8">
              <p className="text-sm font-black uppercase tracking-wider text-[#cc092f]">Contemplação</p>
              <div className="mt-4 space-y-3 text-zinc-700">
                <p><strong>Auto:</strong> (11) 3508-4790</p>
                <p><strong>Imóvel:</strong> (11) 3508-3083</p>
                <p><strong>WhatsApp Imóvel:</strong> (11) 97337-3780</p>
              </div>
            </article>
          </div>
          <div className="mt-8 rounded-3xl border border-red-100 bg-red-50 p-6">
            <p className="font-black text-[#b0003a]">Atenção</p>
            <p className="mt-2 leading-7 text-zinc-700">
              Telefones e procedimentos podem ser atualizados. Confira sempre nos canais oficiais.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-10">
        <div className="mx-auto max-w-6xl">
          <SectionTitle eyebrow="Dúvidas frequentes" title="FAQ do Consórcio" />
          <div className="mt-10 space-y-4">
            {faqItems.map((item, index) => {
              const open = faqOpen === index;
              return (
                <article key={item.pergunta} className="overflow-hidden rounded-3xl border border-red-100 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => setFaqOpen(open ? null : index)}
                    className="flex w-full items-center justify-between gap-5 p-6 text-left"
                  >
                    <span className="font-black">{item.pergunta}</span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-xl font-black text-[#cc092f]">
                      {open ? "−" : "+"}
                    </span>
                  </button>
                  {open && (
                    <div className="border-t border-red-100 bg-[#fffafb] px-6 py-5 leading-7 text-zinc-600">
                      {item.resposta}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="quiz" className="scroll-mt-24 bg-gradient-to-b from-[#fff5f7] to-[#fdecef] px-5 py-20 md:px-10">
        <div className="mx-auto max-w-4xl">
          <SectionTitle
            eyebrow="Avaliação"
            title="Quiz do Consórcio"
            description={`Responda às ${quizQuestions.length} perguntas antes de finalizar.`}
          />
          <div className="mt-8 rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="font-bold text-zinc-700">
                Progresso: {answeredCount}/{quizQuestions.length}
              </span>
              <span className="font-black text-[#cc092f]">
                {Math.round((answeredCount / quizQuestions.length) * 100)}%
              </span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-red-100">
              <div
                className="h-full rounded-full bg-[#cc092f] transition-all"
                style={{ width: `${(answeredCount / quizQuestions.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="mt-8 space-y-6">
            {quizQuestions.map((question, questionIndex) => (
              <article key={question.pergunta} className="rounded-3xl border border-red-100 bg-white p-6 shadow-sm md:p-8">
                <div className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#cc092f] font-black text-white">
                    {questionIndex + 1}
                  </span>
                  <h3 className="pt-1 text-lg font-black leading-7">{question.pergunta}</h3>
                </div>
                <div className="mt-6 grid gap-3">
                  {question.opcoes.map((option, optionIndex) => {
                    const selected = answers[questionIndex] === optionIndex;
                    const correct = question.correta === optionIndex;
                    let cls = "border-red-100 bg-white hover:border-red-400 hover:bg-red-50";
                    if (!submitted && selected) cls = "border-[#cc092f] bg-red-50 ring-2 ring-red-100";
                    if (submitted && correct) cls = "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100";
                    else if (submitted && selected && !correct) cls = "border-red-500 bg-red-100 ring-2 ring-red-100";

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => selectAnswer(questionIndex, optionIndex)}
                        disabled={submitted}
                        className={`rounded-2xl border p-4 text-left font-medium transition ${cls}`}
                      >
                        <span className="mr-3 font-black text-[#cc092f]">
                          {String.fromCharCode(65 + optionIndex)}.
                        </span>
                        {option}
                      </button>
                    );
                  })}
                </div>
                {submitted && (
                  <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 leading-7 text-zinc-700">
                    <strong className="text-[#b0003a]">Explicação:</strong>{" "}
                    {question.explicacao}
                  </div>
                )}
              </article>
            ))}
          </div>

          {!submitted ? (
            <button
              type="button"
              disabled={answeredCount !== quizQuestions.length}
              onClick={() => setSubmitted(true)}
              className="mt-10 w-full rounded-2xl bg-[#cc092f] px-6 py-5 text-lg font-black text-white shadow-lg transition hover:bg-[#b0003a] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Finalizar avaliação
            </button>
          ) : (
            <div className="mt-10 rounded-3xl border border-red-100 bg-white p-8 text-center shadow-lg">
              <div className="text-6xl">{percentage >= 80 ? "🏆" : percentage >= 60 ? "👏" : "📚"}</div>
              <p className="mt-4 text-sm font-black uppercase tracking-wider text-[#cc092f]">Resultado</p>
              <h3 className="mt-2 text-4xl font-black">
                {score} de {quizQuestions.length}
              </h3>
              <p className="mt-3 text-lg text-zinc-600">
                Aproveitamento de <strong>{percentage}%</strong>.
              </p>
              <p className="mx-auto mt-4 max-w-2xl leading-7 text-zinc-600">
                {percentage >= 80
                  ? "Excelente! Você demonstrou domínio dos principais conceitos."
                  : percentage >= 60
                    ? "Bom resultado. Revise as explicações das questões que errou."
                    : "Revise o conteúdo, principalmente contemplação, elegibilidade e reajustes."}
              </p>
              <button
                type="button"
                onClick={resetQuiz}
                className="mt-7 rounded-full bg-[#cc092f] px-8 py-4 font-bold text-white shadow-lg transition hover:bg-[#b0003a]"
              >
                Refazer o quiz
              </button>
            </div>
          )}
        </div>
      </section>

      <footer className="bg-[#870035] px-5 py-10 text-white md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-center md:flex-row md:items-center md:justify-between md:text-left">
          <div>
            <p className="text-xl font-black">TreinExpresso</p>
            <p className="mt-1 text-sm text-white/70">Treinamento e Capacitação</p>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-white/70">
            Material educacional interno. Consulte sempre o portal, as normas e
            as condições vigentes antes de realizar a oferta.
          </p>
        </div>
      </footer>
    </main>
  );
}
