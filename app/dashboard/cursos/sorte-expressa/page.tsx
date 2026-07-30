"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeDollarSign,
  Banknote,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Coins,
  Gift,
  HandHeart,
  HeartHandshake,
  HelpCircle,
  Lightbulb,
  Medal,
  MessageCircle,
  PartyPopper,
  Phone,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  UserRoundCheck,
  WalletCards,
  X,
} from "lucide-react";

type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
};

const quizQuestions: QuizQuestion[] = [
  {
    question: "O que é a Sorte Expressa?",
    options: [
      "Um empréstimo pessoal",
      "Um título de capitalização com sorteios",
      "Uma conta-poupança",
      "Um seguro residencial",
    ],
    correctAnswer: 1,
    explanation:
      "A Sorte Expressa é um título de capitalização que oferece sorteios instantâneos, mensais e semestrais.",
  },
  {
    question: "Qual é o valor atualizado para contratação?",
    options: [
      "De R$ 1,00 a R$ 20,00",
      "De R$ 2,00 a R$ 50,00",
      "De R$ 5,00 a R$ 50,00",
      "De R$ 10,00 a R$ 100,00",
    ],
    correctAnswer: 2,
    explanation:
      "No treinamento atualizado, o cliente pode contratar valores entre R$ 5,00 e R$ 50,00.",
  },
  {
    question: "Qual é a vigência do título?",
    options: ["30 dias", "3 meses", "6 meses", "12 meses"],
    correctAnswer: 2,
    explanation: "A vigência informada para a Sorte Expressa é de 6 meses.",
  },
  {
    question: "Quem pode contratar a Sorte Expressa?",
    options: [
      "Somente empresas",
      "Somente aposentados",
      "Pessoa física com mais de 16 anos",
      "Apenas correntistas com cartão de crédito",
    ],
    correctAnswer: 2,
    explanation:
      "O produto é destinado a pessoa física interessada em apoiar uma causa social e concorrer a prêmios, com idade acima de 16 anos.",
  },
  {
    question: "Qual instituição é beneficiada pela Sorte Expressa?",
    options: ["AACD", "GRAACC", "APAE", "Cruz Vermelha"],
    correctAnswer: 1,
    explanation:
      "A contribuição apoia o GRAACC, que atua no combate ao câncer infantojuvenil.",
  },
  {
    question: "Quando o sorteio instantâneo é conferido?",
    options: [
      "Somente após seis meses",
      "No momento em que o cliente raspa no aplicativo",
      "No último sábado do ano",
      "Somente por telefone",
    ],
    correctAnswer: 1,
    explanation:
      "No sorteio instantâneo, o cliente raspa e confere o resultado pelo aplicativo.",
  },
  {
    question: "Quando ocorre o sorteio mensal?",
    options: [
      "Toda segunda-feira",
      "No primeiro dia de cada mês",
      "No último sábado de cada mês",
      "A cada 15 dias",
    ],
    correctAnswer: 2,
    explanation:
      "O sorteio mensal ocorre no último sábado de cada mês, conforme o material do produto.",
  },
  {
    question: "Como o prêmio é pago ao cliente contemplado?",
    options: [
      "Somente em dinheiro no ponto de atendimento",
      "Por transferência PIX",
      "Em vale-compras",
      "Como desconto em boleto",
    ],
    correctAnswer: 1,
    explanation: "O prêmio é pago por transferência PIX.",
  },
  {
    question: "Em quanto tempo o cliente contemplado pode ser contatado?",
    options: ["Até 24 horas", "Até 5 dias", "Até 15 dias", "Até 60 dias"],
    correctAnswer: 2,
    explanation:
      "O material informa que será feito contato com o cliente em até 15 dias.",
  },
  {
    question: "Qual é uma boa forma de apresentar o produto?",
    options: [
      "Pressionar o cliente até que aceite",
      "Falar apenas sobre o valor da comissão",
      "Explicar os sorteios e o apoio ao GRAACC de forma clara",
      "Prometer que o cliente certamente ganhará",
    ],
    correctAnswer: 2,
    explanation:
      "A oferta deve ser consultiva, transparente e destacar tanto as chances de premiação quanto o apoio ao GRAACC.",
  },
  {
    question: "O vendedor pode garantir que o cliente será premiado?",
    options: [
      "Sim, quando contratar R$ 50,00",
      "Sim, no primeiro título",
      "Não, pois a contemplação depende dos sorteios",
      "Sim, se pagar em dinheiro",
    ],
    correctAnswer: 2,
    explanation:
      "Nunca se deve garantir premiação. O cliente participa de sorteios e a contemplação não é certa.",
  },
  {
    question: "Qual é a postura correta durante a venda?",
    options: [
      "Omitir informações para agilizar",
      "Fazer uma oferta clara, voluntária e sem pressão",
      "Dizer que o produto é obrigatório",
      "Informar que o valor sempre será devolvido",
    ],
    correctAnswer: 1,
    explanation:
      "A contratação deve ser voluntária e o cliente precisa compreender as condições do produto.",
  },
];

const faqs = [
  {
    question: "A Sorte Expressa é uma loteria?",
    answer:
      "Não. É um título de capitalização da modalidade filantropia premiável, que permite ao cliente concorrer a sorteios e contribuir com uma instituição beneficiada.",
  },
  {
    question: "Qual é o valor mínimo atualizado?",
    answer:
      "O valor mínimo atualizado para contratação é R$ 5,00. O valor máximo é R$ 50,00.",
  },
  {
    question: "O cliente recebe o valor de volta no final?",
    answer:
      "Não. Ao final da vigência, o valor da contribuição é destinado à instituição beneficiada, conforme as condições do produto.",
  },
  {
    question: "Como o cliente verifica o sorteio instantâneo?",
    answer:
      "O cliente acessa o aplicativo Bradesco Seguros para raspar e conferir o resultado do título.",
  },
  {
    question: "O que acontece se o cliente for contemplado?",
    answer:
      "O cliente recebe uma comunicação pelo aplicativo Bradesco Seguros e pode ser contatado em até 15 dias. O pagamento do prêmio é realizado via PIX.",
  },
  {
    question: "Posso garantir que o cliente vai ganhar?",
    answer:
      "Não. A contemplação depende dos sorteios. A oferta deve ser transparente e nunca pode conter promessa de ganho garantido.",
  },
];

const salesScripts = [
  {
    title: "Abordagem rápida",
    text: "Por apenas R$ 5,00, você já pode participar da Sorte Expressa, concorrer a prêmios e ainda contribuir com o trabalho do GRAACC.",
  },
  {
    title: "Destaque para a premiação",
    text: "Você pode raspar e descobrir na hora se ganhou, além de continuar participando dos sorteios mensais e semestrais.",
  },
  {
    title: "Destaque para a causa social",
    text: "Além de concorrer a prêmios, sua participação ajuda o GRAACC no combate ao câncer infantojuvenil.",
  },
];

export default function SorteExpressaPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>(
    Array(quizQuestions.length).fill(-1)
  );
  const [showResult, setShowResult] = useState(false);

  const score = useMemo(
    () =>
      selectedAnswers.reduce(
        (total, answer, index) =>
          total + (answer === quizQuestions[index].correctAnswer ? 1 : 0),
        0
      ),
    [selectedAnswers]
  );

  const percentage = Math.round((score / quizQuestions.length) * 100);
  const currentAnswer = selectedAnswers[currentQuestion];
  const question = quizQuestions[currentQuestion];

  function selectAnswer(optionIndex: number) {
    if (currentAnswer !== -1) return;

    setSelectedAnswers((previous) => {
      const updated = [...previous];
      updated[currentQuestion] = optionIndex;
      return updated;
    });
  }

  function nextQuestion() {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion((previous) => previous + 1);
      return;
    }

    setShowResult(true);
  }

  function resetQuiz() {
    setQuizStarted(false);
    setCurrentQuestion(0);
    setSelectedAnswers(Array(quizQuestions.length).fill(-1));
    setShowResult(false);
  }

  function scrollToCourse() {
    document
      .getElementById("conteudo")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-red-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/cursos"
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar aos cursos
          </Link>

          <div className="hidden items-center gap-2 text-sm font-bold text-red-700 sm:flex">
            <Sparkles className="h-4 w-4" />
            TreinExpresso
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-red-700 via-red-600 to-fuchsia-800 text-white">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-blue-700/30 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:px-8">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">
              <PartyPopper className="h-4 w-4" />
              Curso de capacitação
            </div>

            <p className="mb-2 text-sm font-bold uppercase tracking-[0.22em] text-red-100">
              Bradesco Expresso
            </p>

            <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Sorte Expressa
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-red-50 sm:text-xl">
              Aprenda a apresentar um título de capitalização com sorteios
              instantâneos, mensais e semestrais, além de apoio ao GRAACC.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-100">
                  Contratação
                </p>
                <p className="mt-1 text-xl font-black">R$ 5 a R$ 50</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-100">
                  Vigência
                </p>
                <p className="mt-1 text-xl font-black">6 meses</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-100">
                  Grande prêmio
                </p>
                <p className="mt-1 text-xl font-black">Até R$ 50 mil</p>
              </div>
            </div>

            <button
              type="button"
              onClick={scrollToCourse}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-bold text-red-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-red-50"
            >
              <PlayCircle className="h-5 w-5" />
              Iniciar treinamento
            </button>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-4 rounded-[2rem] bg-white/10 blur-xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-white p-2 shadow-2xl">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.55rem] bg-slate-100">
                <Image
                  src="/materiais/sorte-expressa/sorte-expressa.jpg"
                  alt="Material promocional da Sorte Expressa"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 48vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="conteudo" className="scroll-mt-24">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-2 text-sm font-bold text-red-700">
              <Gift className="h-4 w-4" />
              Conheça o produto
            </span>
            <h2 className="mt-5 text-3xl font-black sm:text-4xl">
              O que é a Sorte Expressa?
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              É um título de capitalização da modalidade filantropia premiável.
              O cliente concorre a prêmios e, ao mesmo tempo, contribui com o
              GRAACC, instituição que atua no combate ao câncer infantojuvenil.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                icon: Sparkles,
                title: "Sorteio instantâneo",
                text: "O cliente pode conferir na hora se foi contemplado.",
              },
              {
                icon: Trophy,
                title: "Até R$ 50 mil",
                text: "Participação em sorteios mensais e semestrais.",
              },
              {
                icon: HeartHandshake,
                title: "Apoio ao GRAACC",
                text: "A contribuição ajuda uma importante causa social.",
              },
              {
                icon: Banknote,
                title: "Pagamento via PIX",
                text: "O prêmio é pago por transferência PIX.",
              },
              {
                icon: Coins,
                title: "A partir de R$ 5",
                text: "Contratação atualizada entre R$ 5 e R$ 50.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid items-start gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-2 text-sm font-bold text-red-700">
                <Target className="h-4 w-4" />
                Passo a passo
              </span>
              <h2 className="mt-5 text-3xl font-black sm:text-4xl">
                Como funciona?
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Faça uma oferta clara e simples, explicando o valor, os sorteios
                e a contribuição social antes da confirmação.
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  number: "1",
                  title: "Identifique a oportunidade",
                  text: "A oferta pode ser feita durante o atendimento, inclusive após o pagamento de um boleto, desde que seja voluntária.",
                },
                {
                  number: "2",
                  title: "Apresente o produto",
                  text: "Explique que o cliente participará de sorteios e também contribuirá com o GRAACC.",
                },
                {
                  number: "3",
                  title: "Defina o valor",
                  text: "O cliente escolhe um valor entre R$ 5,00 e R$ 50,00.",
                },
                {
                  number: "4",
                  title: "Confirme a contratação",
                  text: "Reforce as condições, a vigência de 6 meses e a destinação da contribuição.",
                },
                {
                  number: "5",
                  title: "Oriente sobre os sorteios",
                  text: "Explique como acessar o aplicativo Bradesco Seguros, raspar e acompanhar os resultados.",
                },
              ].map((step) => (
                <article
                  key={step.number}
                  className="flex gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-700 text-lg font-black text-white">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="font-black">{step.title}</h3>
                    <p className="mt-1 leading-7 text-slate-600">{step.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-2 text-sm font-bold text-red-700">
            <ShieldCheck className="h-4 w-4" />
            Regras gerais
          </span>
          <h2 className="mt-5 text-3xl font-black sm:text-4xl">
            Informações essenciais
          </h2>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: BadgeDollarSign,
              label: "Valor de contratação",
              value: "R$ 5,00 a R$ 50,00",
              note: "Faixa atualizada para este treinamento.",
            },
            {
              icon: Clock3,
              label: "Vigência",
              value: "6 meses",
              note: "Período de participação do título.",
            },
            {
              icon: UserRoundCheck,
              label: "Elegibilidade",
              value: "Pessoa física acima de 16 anos",
              note: "Interessada em concorrer e apoiar uma causa social.",
            },
            {
              icon: CircleDollarSign,
              label: "Forma de pagamento",
              value: "Dinheiro",
              note: "Conforme as condições operacionais do produto.",
            },
            {
              icon: HandHeart,
              label: "Instituição beneficiada",
              value: "GRAACC",
              note: "Atuação no combate ao câncer infantojuvenil.",
            },
            {
              icon: WalletCards,
              label: "Premiação",
              value: "Transferência PIX",
              note: "Após os procedimentos de validação e contato.",
            },
          ].map(({ icon: Icon, label, value, note }) => (
            <article
              key={label}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                    {label}
                  </p>
                  <h3 className="mt-1 text-xl font-black">{value}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{note}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex gap-4">
            <Lightbulb className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" />
            <div>
              <h3 className="font-black text-amber-950">Atenção à atualização</h3>
              <p className="mt-1 leading-7 text-amber-900">
                Embora materiais antigos possam indicar valor mínimo de R$ 2,00,
                neste treinamento deve ser considerada a faixa atualizada de
                <strong> R$ 5,00 a R$ 50,00</strong>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-red-200">
              <Trophy className="h-4 w-4" />
              Premiações
            </span>
            <h2 className="mt-5 text-3xl font-black sm:text-4xl">
              Três oportunidades de concorrer
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-300">
              O cliente pode verificar o resultado instantâneo e continua
              participando dos sorteios previstos durante a vigência.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <article className="rounded-3xl border border-white/10 bg-white/5 p-7">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
                <Sparkles className="h-7 w-7" />
              </div>
              <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-emerald-300">
                Instantâneo
              </p>
              <h3 className="mt-2 text-2xl font-black">Raspou, achou, ganhou</h3>
              <p className="mt-3 leading-7 text-slate-300">
                O cliente acessa o aplicativo e confere na hora se encontrou a
                combinação premiada.
              </p>
            </article>

            <article className="rounded-3xl border border-white/10 bg-white/5 p-7">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-400/15 text-blue-300">
                <Gift className="h-7 w-7" />
              </div>
              <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-blue-300">
                Mensal
              </p>
              <h3 className="mt-2 text-2xl font-black">Todo último sábado</h3>
              <p className="mt-3 leading-7 text-slate-300">
                O sorteio mensal ocorre no último sábado de cada mês, conforme
                as regras do título.
              </p>
            </article>

            <article className="rounded-3xl border border-white/10 bg-gradient-to-br from-red-700 to-fuchsia-800 p-7 shadow-xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white">
                <Medal className="h-7 w-7" />
              </div>
              <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-red-100">
                Semestral
              </p>
              <h3 className="mt-2 text-2xl font-black">Até R$ 50.000</h3>
              <p className="mt-3 leading-7 text-red-50">
                O grande sorteio acontece no último sábado do último mês de
                vigência do título.
              </p>
            </article>
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                <Banknote className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-black">Em caso de contemplação</h3>
                <p className="mt-1 leading-7 text-slate-300">
                  O cliente recebe uma comunicação pelo aplicativo Bradesco
                  Seguros, pode ser contatado em até 15 dias e recebe o prêmio
                  por transferência PIX, após as validações necessárias.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-2 text-sm font-bold text-red-700">
              <MessageCircle className="h-4 w-4" />
              Argumentos que vendem
            </span>
            <h2 className="mt-5 text-3xl font-black sm:text-4xl">
              Fale de forma simples e consultiva
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Use frases curtas, explique as condições e adapte a abordagem ao
              perfil do cliente.
            </p>

            <div className="mt-8 space-y-4">
              {salesScripts.map((script, index) => (
                <article
                  key={script.title}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-700 font-black text-white">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-black">{script.title}</h3>
                      <p className="mt-2 leading-7 text-slate-600">
                        “{script.text}”
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-gradient-to-br from-red-700 to-fuchsia-800 p-7 text-white shadow-xl sm:p-9">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <Medal className="h-7 w-7" />
            </div>
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-red-100">
              Dicas do campeão de vendas
            </p>
            <h2 className="mt-2 text-3xl font-black">Venda com transparência</h2>

            <div className="mt-7 space-y-5">
              {[
                "Apresente primeiro o benefício e depois informe o valor.",
                "Explique que a contratação é voluntária e nunca obrigatória.",
                "Destaque o sorteio instantâneo, mas também fale dos sorteios mensais e semestrais.",
                "Informe que a contribuição apoia o GRAACC.",
                "Nunca prometa contemplação ou ganho garantido.",
                "Confirme que o cliente compreendeu as condições antes de concluir.",
              ].map((tip) => (
                <div key={tip} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-red-100" />
                  <p className="leading-7 text-red-50">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-2 text-sm font-bold text-red-700">
              <HelpCircle className="h-4 w-4" />
              Quebra de objeções
            </span>
            <h2 className="mt-5 text-3xl font-black sm:text-4xl">
              Respostas para dúvidas comuns
            </h2>
          </div>

          <div className="mx-auto mt-10 max-w-4xl space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;

              return (
                <article
                  key={faq.question}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="font-black">{faq.question}</span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 transition ${
                        isOpen ? "rotate-180 text-red-700" : "text-slate-500"
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-200 px-5 py-5">
                      <p className="leading-7 text-slate-600">{faq.answer}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-red-100 bg-red-50">
          <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
            <div className="bg-red-700 p-8 text-white sm:p-10">
              <Target className="h-10 w-10" />
              <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-red-100">
                Hora de praticar
              </p>
              <h2 className="mt-2 text-3xl font-black">
                Transforme informação em abordagem
              </h2>
              <p className="mt-4 leading-7 text-red-50">
                Pense em como você apresentaria o produto sem pressionar o
                cliente e sem prometer premiação.
              </p>
            </div>

            <div className="p-8 sm:p-10">
              <p className="text-sm font-bold uppercase tracking-wide text-red-700">
                Situação prática
              </p>
              <h3 className="mt-3 text-2xl font-black">
                Um cliente terminou de pagar um boleto e demonstrou interesse em
                apoiar uma causa social.
              </h3>
              <p className="mt-4 leading-8 text-slate-600">
                Como você apresentaria a Sorte Expressa, incluindo o valor
                mínimo atualizado, os tipos de sorteio e o apoio ao GRAACC?
              </p>

              <div className="mt-7 rounded-2xl border border-red-200 bg-white p-5">
                <p className="font-black text-red-800">Exemplo de resposta</p>
                <p className="mt-2 leading-7 text-slate-600">
                  “Temos a Sorte Expressa, que pode ser contratada a partir de
                  R$ 5,00. Você pode conferir um sorteio instantâneo, continua
                  participando dos sorteios mensais e semestrais e ainda
                  contribui com o trabalho do GRAACC. Gostaria de conhecer as
                  condições?”
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-100">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-2 text-sm font-bold text-red-700">
              <CheckCircle2 className="h-4 w-4" />
              Teste seus conhecimentos
            </span>
            <h2 className="mt-5 text-3xl font-black sm:text-4xl">
              Quiz Sorte Expressa
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Responda às 12 questões e confira seu resultado ao final.
            </p>
          </div>

          <div className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
            {!quizStarted ? (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                  <Trophy className="h-8 w-8" />
                </div>
                <h3 className="mt-5 text-2xl font-black">
                  Preparado para começar?
                </h3>
                <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">
                  Para avançar, escolha uma alternativa. Depois da resposta,
                  você verá a explicação.
                </p>
                <button
                  type="button"
                  onClick={() => setQuizStarted(true)}
                  className="mt-7 inline-flex items-center gap-2 rounded-full bg-red-700 px-6 py-3.5 font-bold text-white transition hover:bg-red-800"
                >
                  Iniciar quiz
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            ) : showResult ? (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-700">
                  {percentage >= 70 ? (
                    <Trophy className="h-10 w-10" />
                  ) : (
                    <RotateCcw className="h-9 w-9" />
                  )}
                </div>

                <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-red-700">
                  Resultado final
                </p>
                <h3 className="mt-2 text-4xl font-black">
                  {score} de {quizQuestions.length}
                </h3>
                <p className="mt-3 text-xl font-bold text-slate-700">
                  {percentage}% de aproveitamento
                </p>

                <p className="mx-auto mt-4 max-w-xl leading-7 text-slate-600">
                  {percentage >= 70
                    ? "Parabéns! Você demonstrou um bom conhecimento sobre a Sorte Expressa."
                    : "Revise os pontos principais do treinamento e tente novamente para alcançar pelo menos 70%."}
                </p>

                <button
                  type="button"
                  onClick={resetQuiz}
                  className="mt-7 inline-flex items-center gap-2 rounded-full bg-red-700 px-6 py-3.5 font-bold text-white transition hover:bg-red-800"
                >
                  <RotateCcw className="h-5 w-5" />
                  Refazer quiz
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-bold text-red-700">
                    Questão {currentQuestion + 1} de {quizQuestions.length}
                  </p>
                  <p className="text-sm font-semibold text-slate-500">
                    {Math.round(
                      ((currentQuestion + 1) / quizQuestions.length) * 100
                    )}
                    % concluído
                  </p>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-red-700 transition-all"
                    style={{
                      width: `${
                        ((currentQuestion + 1) / quizQuestions.length) * 100
                      }%`,
                    }}
                  />
                </div>

                <h3 className="mt-8 text-2xl font-black leading-tight">
                  {question.question}
                </h3>

                <div className="mt-6 grid gap-3">
                  {question.options.map((option, optionIndex) => {
                    const answered = currentAnswer !== -1;
                    const isSelected = currentAnswer === optionIndex;
                    const isCorrect =
                      optionIndex === question.correctAnswer;

                    let optionClass =
                      "border-slate-200 bg-white hover:border-red-300 hover:bg-red-50";

                    if (answered && isCorrect) {
                      optionClass =
                        "border-emerald-400 bg-emerald-50 text-emerald-950";
                    } else if (answered && isSelected && !isCorrect) {
                      optionClass = "border-red-400 bg-red-50 text-red-950";
                    } else if (answered) {
                      optionClass =
                        "border-slate-200 bg-slate-50 text-slate-400";
                    }

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => selectAnswer(optionIndex)}
                        disabled={answered}
                        className={`flex items-center justify-between gap-4 rounded-2xl border p-4 text-left font-semibold transition ${optionClass}`}
                      >
                        <span>{option}</span>
                        {answered && isCorrect && (
                          <Check className="h-5 w-5 shrink-0 text-emerald-700" />
                        )}
                        {answered && isSelected && !isCorrect && (
                          <X className="h-5 w-5 shrink-0 text-red-700" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {currentAnswer !== -1 && (
                  <div
                    className={`mt-6 rounded-2xl border p-5 ${
                      currentAnswer === question.correctAnswer
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <p className="font-black">
                      {currentAnswer === question.correctAnswer
                        ? "Resposta correta!"
                        : "Vamos revisar este ponto."}
                    </p>
                    <p className="mt-2 leading-7 text-slate-700">
                      {question.explanation}
                    </p>
                  </div>
                )}

                <div className="mt-7 flex justify-end">
                  <button
                    type="button"
                    onClick={nextQuestion}
                    disabled={currentAnswer === -1}
                    className="inline-flex items-center gap-2 rounded-full bg-red-700 px-6 py-3 font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {currentQuestion === quizQuestions.length - 1
                      ? "Ver resultado"
                      : "Próxima questão"}
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-red-700 to-fuchsia-800 text-white">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <HeartHandshake className="mx-auto h-12 w-12" />
          <h2 className="mt-6 text-3xl font-black sm:text-4xl">
            Uma oferta que une oportunidade e propósito
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-red-50">
            Cada apresentação bem-feita permite ao cliente conhecer uma forma
            de concorrer a prêmios e, ao mesmo tempo, apoiar o trabalho do
            GRAACC. Ofereça sempre com clareza, respeito e transparência.
          </p>
          <Link
            href="/dashboard/cursos"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-bold text-red-700 transition hover:bg-red-50"
          >
            Concluir treinamento
            <CheckCircle2 className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-red-700" />
                  <h2 className="text-xl font-black">Canais de atendimento</h2>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Consulte sempre os canais oficiais para informações e suporte.
                </p>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="font-black">Fone Fácil</p>
                  <p className="mt-1 text-slate-600">4002 0022</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="font-black">Demais regiões</p>
                  <p className="mt-1 text-slate-600">0800 570 0022</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="font-black">BIA no WhatsApp</p>
                  <p className="mt-1 text-slate-600">11 3335 0237</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
