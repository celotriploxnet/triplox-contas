"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import styles from "./ConsignadoPrivado.module.css";

type Jornada = {
  titulo: string;
  resumo: string;
  detalhes: string[];
  pagina: number;
};

type FAQ = {
  pergunta: string;
  resposta: string;
};

const requisitos = [
  { titulo: "Trabalhador CLT", texto: "O cliente precisa possuir vínculo empregatício formal ativo." },
  { titulo: "Conta corrente Bradesco", texto: "É necessário ser correntista, mas o salário não precisa ser recebido no Bradesco." },
  { titulo: "Vínculo mínimo", texto: "São exigidos pelo menos 3 meses completos de vínculo empregatício." },
  { titulo: "Faixa etária", texto: "O cliente deve ter entre 18 e 80 anos." },
];

const condicoes = [
  ["35%", "margem máxima sobre a renda líquida"],
  ["R$ 100", "valor mínimo do empréstimo"],
  ["R$ 5", "parcela mínima"],
  ["R$ 5.000", "parcela máxima"],
  ["15 a 60 dias", "carência para a primeira parcela"],
  ["Até 9", "contratos, havendo margem e aprovação"],
];

const jornada: Jornada[] = [
  {
    titulo: "Acessar Consignado Privado",
    resumo: "Na tela inicial da Plataforma Expresso, selecione a opção Consignado Privado.",
    detalhes: [
      "Confirme que o cliente é correntista Bradesco.",
      "Informe o CPF do cliente para iniciar a consulta personalizada.",
    ],
    pagina: 6,
  },
  {
    titulo: "Autorizar a consulta",
    resumo: "O cliente deve autorizar o compartilhamento de dados com Dataprev e eSocial.",
    detalhes: [
      "Leia e explique o termo de autorização ao cliente.",
      "Abra o termo para apresentar os dados que serão compartilhados.",
      "Após a ciência do cliente, confirme a autorização para prosseguir.",
    ],
    pagina: 7,
  },
  {
    titulo: "Realizar a biometria",
    resumo: "A biometria facial valida a autorização concedida pelo cliente.",
    detalhes: [
      "Posicione o cliente corretamente diante da câmera.",
      "Siga as orientações exibidas na tela.",
      "Evite reflexos, contraluz e ambientes muito escuros.",
    ],
    pagina: 8,
  },
  {
    titulo: "Escolher a conta",
    resumo: "Caso exista mais de uma conta, o cliente escolhe onde deseja receber o crédito.",
    detalhes: [
      "Apresente as contas disponíveis.",
      "Confirme a escolha diretamente com o cliente.",
      "A conta selecionada também poderá ser usada para débitos em situações previstas no contrato.",
    ],
    pagina: 8,
  },
  {
    titulo: "Apresentar a oferta",
    resumo: "O sistema mostra uma oferta recomendada e permite uma simulação personalizada.",
    detalhes: [
      "Explique o valor liberado, a parcela, o prazo e o custo total.",
      "Para outra configuração, selecione Fazer simulação personalizada.",
      "Informe valor e quantidade de parcelas e clique em Simular.",
    ],
    pagina: 9,
  },
  {
    titulo: "Comparar e contratar",
    resumo: "Apresente a simulação e a oferta recomendada antes de confirmar a escolha.",
    detalhes: [
      "Garanta que o cliente entendeu as condições.",
      "Clique em Contratar somente após o aceite expresso.",
      "Caso necessário, faça uma nova simulação.",
    ],
    pagina: 10,
  },
  {
    titulo: "Orientar sobre autorizações",
    resumo: "Explique cada autorização exibida antes de seguir para a confirmação.",
    detalhes: [
      "Não marque opções sem o conhecimento do cliente.",
      "Use linguagem clara e confirme se há dúvidas.",
      "Depois da explicação, clique em Continuar.",
    ],
    pagina: 10,
  },
  {
    titulo: "Atendimento ao cliente CPV",
    resumo: "Clientes potencialmente vulneráveis exigem orientação com atenção redobrada.",
    detalhes: [
      "Leia as informações com calma.",
      "Pergunte se o cliente compreendeu e se possui dúvidas.",
      "Somente prossiga após a manifestação clara do cliente.",
    ],
    pagina: 11,
  },
  {
    titulo: "Confirmar contrato",
    resumo: "Revise todos os dados e condições antes do aceite contratual.",
    detalhes: [
      "Confirme valor, quantidade de parcelas, conta e demais dados.",
      "Marque Li e concordo com o contrato somente após a concordância do cliente.",
      "Clique em Confirmar.",
    ],
    pagina: 11,
  },
  {
    titulo: "Validar com nova biometria",
    resumo: "Uma nova biometria facial valida a contratação do empréstimo.",
    detalhes: [
      "Repita os cuidados de iluminação e posicionamento.",
      "Siga as orientações da tela até concluir a validação.",
    ],
    pagina: 11,
  },
  {
    titulo: "Finalizar e emitir comprovante",
    resumo: "Com a aprovação, o cliente escolhe receber o comprovante por e-mail ou impressão.",
    detalhes: [
      "Confirme a mensagem de contratação concluída.",
      "Pergunte como o cliente deseja receber o comprovante.",
      "Oriente o cliente a guardar o documento.",
    ],
    pagina: 12,
  },
  {
    titulo: "Acompanhar proposta em análise",
    resumo: "Algumas propostas podem ficar aguardando averbação pela Dataprev.",
    detalhes: [
      "O comprovante será emitido com a observação de averbação pendente.",
      "A análise pode levar até 5 dias úteis.",
      "Se averbado, o cliente recebe confirmação por SMS e o crédito é liberado.",
      "Se a margem não for averbada em até 5 dias, a proposta perde a validade.",
    ],
    pagina: 12,
  },
  {
    titulo: "Tratar telas de exceção",
    resumo: "A jornada pode ser interrompida por indisponibilidade, falta de conta ou vínculo insuficiente.",
    detalhes: [
      "Dataprev indisponível: aguarde o término da janela de atualização.",
      "Cliente não correntista: realize a abertura da conta antes da contratação.",
      "Vínculo insuficiente: explique o requisito mínimo apresentado pelo sistema.",
    ],
    pagina: 13,
  },
];

const faq: FAQ[] = [
  { pergunta: "O que é o Consignado Privado?", resposta: "É uma linha de crédito para trabalhadores CLT, com parcelas descontadas diretamente na folha de pagamento, contratação simplificada e condições personalizadas." },
  { pergunta: "Quem pode contratar?", resposta: "Trabalhadores CLT, correntistas Bradesco, com idade entre 18 e 80 anos, pelo menos 3 meses completos de vínculo e aprovação na política de crédito." },
  { pergunta: "O salário precisa ser recebido no Bradesco?", resposta: "Não. É necessário possuir conta corrente no Bradesco, mas o salário pode ser recebido em outro banco." },
  { pergunta: "É necessário desbloqueio no GOV ou na Dataprev?", resposta: "Normalmente, não. O ajuste no aplicativo será necessário somente quando o próprio cliente tiver bloqueado a consulta de margem na Carteira de Trabalho Digital." },
  { pergunta: "Como a margem consignável é calculada?", resposta: "O sistema calcula automaticamente até 35% da renda líquida, com base nas informações registradas no eSocial e na Dataprev." },
  { pergunta: "O correspondente precisa calcular a margem manualmente?", resposta: "Não. A jornada apresenta automaticamente a margem, os limites de crédito e os valores mínimo e máximo de parcela para cada CPF." },
  { pergunta: "Qual é o valor mínimo do empréstimo?", resposta: "O valor mínimo é de R$ 100,00. O limite máximo depende da margem disponível e da política de crédito." },
  { pergunta: "Qual é a quantidade permitida de parcelas?", resposta: "O mínimo é de 2 parcelas. A quantidade máxima é apresentada na oferta personalizada para o cliente." },
  { pergunta: "Qual é a carência para a primeira parcela?", resposta: "A carência pode variar de 15 a 60 dias, conforme a oferta apresentada na jornada." },
  { pergunta: "Três meses e um dia de vínculo tornam o cliente elegível?", resposta: "O requisito é ter pelo menos 3 meses completos de vínculo, desde que todos os demais critérios também sejam atendidos." },
  { pergunta: "Restrição no CPF impede a contratação?", resposta: "Depende da análise de crédito. São avaliados o grau e a natureza da restrição, além do nível de endividamento. Algumas naturezas impeditivas causam reprovação automática." },
  { pergunta: "O sistema informa o motivo detalhado da negativa?", resposta: "Não. A jornada apresenta mensagens gerais, como cliente não elegível, sem margem, sem vínculo CLT ou vínculo inferior ao mínimo." },
  { pergunta: "Uma tentativa reprovada fica registrada no EMPF?", resposta: "Não. O EMPF registra apenas operações efetivadas e contratos concluídos." },
  { pergunta: "O cliente precisa autorizar a consulta de dados?", resposta: "Sim. Durante a jornada, o cliente autoriza o compartilhamento de dados com Dataprev e eSocial e realiza biometria para validar essa autorização." },
  { pergunta: "O cliente precisa acessar a Carteira de Trabalho Digital?", resposta: "Não é necessário consultar a Carteira de Trabalho Digital durante a contratação, salvo quando houver bloqueio da consulta de margem feito pelo próprio cliente." },
  { pergunta: "Quanto tempo leva a contratação?", resposta: "Em condições normais, a jornada pode ser concluída em menos de 3 minutos, quando o cliente é elegível e não há instabilidade na Dataprev." },
  { pergunta: "Quando a Dataprev fica indisponível?", resposta: "A indisponibilidade mensal ocorre, em regra, das 22h do dia 20 até as 6h do dia 23, no horário de Brasília." },
  { pergunta: "O que acontece quando a proposta fica em análise?", resposta: "A proposta pode aguardar averbação por até 5 dias úteis. O crédito é liberado após a averbação. Sem averbação dentro do prazo, a proposta perde a validade." },
  { pergunta: "O que acontece em caso de demissão?", resposta: "Até 35% das verbas rescisórias pode ser utilizado para quitar ou reduzir o saldo. Se ainda restar valor, o débito passa a ocorrer na conta escolhida na contratação." },
  { pergunta: "O cliente pode ter mais de um contrato?", resposta: "Sim. São permitidos até 9 contratos, desde que exista margem disponível e cada nova operação seja aprovada." },
  { pergunta: "Existe refinanciamento no canal Expresso?", resposta: "Não. Conforme o material atual, o refinanciamento está disponível somente nas agências." },
  { pergunta: "A renda variável entra no cálculo?", resposta: "O sistema considera as informações declaradas no eSocial e refletidas no salário líquido registrado. Não há cálculo manual pelo correspondente." },
];

const quiz = [
  { pergunta: "Qual é o vínculo mínimo exigido?", opcoes: ["30 dias", "3 meses completos", "12 meses"], correta: 1 },
  { pergunta: "O cliente precisa receber salário no Bradesco?", opcoes: ["Sim, obrigatoriamente", "Não, mas precisa ser correntista", "Não precisa ter conta"], correta: 1 },
  { pergunta: "Qual é a margem máxima informada no material?", opcoes: ["20%", "30%", "35%"], correta: 2 },
  { pergunta: "Qual é o valor mínimo do empréstimo?", opcoes: ["R$ 50", "R$ 100", "R$ 500"], correta: 1 },
  { pergunta: "Quanto tempo uma proposta pode ficar em análise?", opcoes: ["Até 24 horas", "Até 5 dias úteis", "Até 15 dias úteis"], correta: 1 },
  { pergunta: "Quantos contratos podem ser permitidos?", opcoes: ["Até 3", "Até 5", "Até 9"], correta: 2 },
];

export default function ConsignadoPrivadoPage() {
  const [etapaAberta, setEtapaAberta] = useState<number | null>(0);
  const [buscaFAQ, setBuscaFAQ] = useState("");
  const [faqAberta, setFaqAberta] = useState<number | null>(0);
  const [respostas, setRespostas] = useState<Record<number, number>>({});

  const faqFiltrada = useMemo(() => {
    const termo = buscaFAQ.trim().toLowerCase();
    if (!termo) return faq.map((item, index) => ({ ...item, originalIndex: index }));
    return faq
      .map((item, index) => ({ ...item, originalIndex: index }))
      .filter((item) =>
        item.pergunta.toLowerCase().includes(termo) ||
        item.resposta.toLowerCase().includes(termo),
      );
  }, [buscaFAQ]);

  const acertos = quiz.reduce(
    (total, item, index) => total + (respostas[index] === item.correta ? 1 : 0),
    0,
  );
  const respondidas = Object.keys(respostas).length;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>Cursos • TreinExpresso</span>
          <h1>Crédito Consignado Privado</h1>
          <p>Domine a oferta para trabalhadores CLT, conheça as condições e conduza uma contratação simples, consultiva e segura.</p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href="#conteudo">Iniciar treinamento</a>
            <a className={styles.secondaryButton} href="/materiais/consignado-privado/jornada-consignado-privado.pdf" target="_blank" rel="noreferrer">Abrir passo a passo</a>
          </div>
        </div>
        <div className={styles.heroImage}>
          <Image src="/materiais/consignado-privado/consignado-privado.jpeg" alt="Crédito Consignado Privado para trabalhador com carteira assinada" width={1024} height={1536} priority />
        </div>
      </section>

      <section className={styles.summaryGrid} aria-label="Resumo do produto">
        <article><strong>CLT</strong><span>público principal</span></article>
        <article><strong>3 meses</strong><span>vínculo mínimo</span></article>
        <article><strong>Até 35%</strong><span>da renda líquida</span></article>
        <article><strong>&lt; 3 min</strong><span>jornada em condições normais</span></article>
      </section>

      <div className={styles.content} id="conteudo">
        <section>
          <header className={styles.sectionHeader}><div><span>Conheça o produto</span><h2>Para quem é o Consignado Privado?</h2></div></header>
          <div className={styles.introGrid}>
            <article className={styles.definitionCard}>
              <span>Linha de crédito</span>
              <h3>Parcelas descontadas diretamente na folha</h3>
              <p>Uma solução para trabalhadores com carteira assinada, com oferta personalizada e contratação digital pela Plataforma Expresso.</p>
              <strong>O cliente precisa ter conta corrente Bradesco, mas não precisa receber o salário no Banco.</strong>
            </article>
            <div className={styles.requirementsGrid}>
              {requisitos.map((item, index) => (
                <article key={item.titulo}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{item.titulo}</h3><p>{item.texto}</p></div></article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.conditionsSection}>
          <header className={styles.sectionHeader}><div><span>Limites e condições</span><h2>Informações essenciais da oferta</h2></div></header>
          <div className={styles.conditionsGrid}>
            {condicoes.map(([valor, texto]) => <article key={`${valor}-${texto}`}><strong>{valor}</strong><span>{texto}</span></article>)}
          </div>
          <div className={styles.alertGrid}>
            <aside><strong>Dataprev indisponível</strong><p>Entre 22h do dia 20 e 6h do dia 23 de cada mês, no horário de Brasília, novas contratações podem ficar indisponíveis.</p></aside>
            <aside><strong>Cancelamento</strong><p>O material informa possibilidade de cancelamento em até 7 dias, conforme as condições aplicáveis ao contrato.</p></aside>
            <aside><strong>Oferta personalizada</strong><p>Margem, valor liberado, parcelas e prazo são calculados automaticamente para cada CPF.</p></aside>
          </div>
        </section>

        <section className={styles.salesSection}>
          <header className={styles.sectionHeader}><div><span>Oportunidade comercial</span><h2>Argumentos para uma oferta consultiva</h2></div></header>
          <div className={styles.salesGrid}>
            {[
              ["Maior alcance", "Pode ser oferecido a correntistas CLT sem depender de convênio específico com a empresa."],
              ["Consulta na hora", "O sistema consulta automaticamente a elegibilidade e apresenta as condições disponíveis."],
              ["Parcelas adequadas", "A oferta considera a renda líquida e a margem disponível do trabalhador."],
              ["Jornada simples", "Em condições normais, a contratação pode ser concluída em poucos minutos."],
              ["Mais negócios", "Amplia o público atendido e cria novas oportunidades para a carteira da loja."],
              ["Oferta responsável", "Explique prazo, parcela, custo total e consequências antes da confirmação."],
            ].map(([titulo, texto], index) => (
              <article key={titulo}><span>{String(index + 1).padStart(2, "0")}</span><h3>{titulo}</h3><p>{texto}</p></article>
            ))}
          </div>
        </section>

        <section className={styles.stepsSection}>
          <header className={styles.sectionHeader}>
            <div><span>Passo a passo</span><h2>Jornada de comercialização</h2></div>
            <a href="/materiais/consignado-privado/jornada-consignado-privado.pdf" target="_blank" rel="noreferrer">Abrir PDF</a>
          </header>
          <div className={styles.stepsList}>
            {jornada.map((etapa, index) => {
              const aberta = etapaAberta === index;
              return (
                <article className={styles.stepCard} key={etapa.titulo}>
                  <button type="button" onClick={() => setEtapaAberta(aberta ? null : index)} aria-expanded={aberta}>
                    <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
                    <span className={styles.stepTitle}><strong>{etapa.titulo}</strong><small>{etapa.resumo}</small></span>
                    <b aria-hidden="true">{aberta ? "−" : "+"}</b>
                  </button>
                  {aberta && (
                    <div className={styles.stepBody}>
                      <div><h3>Como orientar</h3><ul>{etapa.detalhes.map((detalhe) => <li key={detalhe}>{detalhe}</li>)}</ul></div>
                      <Image src={`/materiais/consignado-privado/paginas/pagina-${String(etapa.pagina).padStart(2, "0")}.png`} alt={`Material visual da etapa ${etapa.titulo}`} width={1000} height={1000} />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.specialSection}>
          <header className={styles.sectionHeader}><div><span>Fique atento</span><h2>Situações especiais</h2></div></header>
          <div className={styles.specialGrid}>
            <article><span>Demissão</span><h3>Uso das verbas rescisórias</h3><p>Até 35% da rescisão pode ser direcionada à quitação ou ao abatimento do saldo. Havendo valor restante, o débito pode seguir pela conta escolhida.</p></article>
            <article><span>Em análise</span><h3>Averbação pendente</h3><p>A proposta pode aguardar até 5 dias úteis. O crédito somente é liberado após a averbação.</p></article>
            <article><span>Refinanciamento</span><h3>Fora do canal Expresso</h3><p>Segundo o material atual, o refinanciamento está disponível somente nas agências.</p></article>
            <article><span>Renda variável</span><h3>Informações do eSocial</h3><p>Comissões e gratificações são consideradas conforme os registros que compõem a renda líquida informada ao sistema.</p></article>
          </div>
        </section>

        <section className={styles.faqSection}>
          <header className={styles.sectionHeader}>
            <div><span>Tire suas dúvidas</span><h2>FAQ do Consignado Privado</h2></div>
            <a href="/materiais/consignado-privado/faq-consignado-privado.pdf" target="_blank" rel="noreferrer">Abrir FAQ completo</a>
          </header>
          <label className={styles.searchBox}><span>Pesquisar no FAQ</span><input type="search" value={buscaFAQ} onChange={(event) => setBuscaFAQ(event.target.value)} placeholder="Ex.: margem, Dataprev, demissão..." /></label>
          <div className={styles.faqList}>
            {faqFiltrada.map((item) => {
              const aberta = faqAberta === item.originalIndex;
              return (
                <article key={item.pergunta}>
                  <button type="button" onClick={() => setFaqAberta(aberta ? null : item.originalIndex)} aria-expanded={aberta}><strong>{item.pergunta}</strong><span>{aberta ? "−" : "+"}</span></button>
                  {aberta && <p>{item.resposta}</p>}
                </article>
              );
            })}
            {faqFiltrada.length === 0 && <p className={styles.emptyState}>Nenhuma pergunta encontrada para essa pesquisa.</p>}
          </div>
        </section>

        <section className={styles.quizSection}>
          <header className={styles.sectionHeader}><div><span>Teste seu conhecimento</span><h2>Quiz rápido</h2></div><strong className={styles.score}>{acertos}/{quiz.length} acertos</strong></header>
          <div className={styles.quizGrid}>
            {quiz.map((item, index) => (
              <article className={styles.quizCard} key={item.pergunta}>
                <span>Questão {index + 1}</span><h3>{item.pergunta}</h3>
                <div>
                  {item.opcoes.map((opcao, opcaoIndex) => {
                    const selecionada = respostas[index] === opcaoIndex;
                    const respondida = respostas[index] !== undefined;
                    const correta = opcaoIndex === item.correta;
                    let className = "";
                    if (respondida && correta) className = styles.correct;
                    if (selecionada && !correta) className = styles.wrong;
                    return <button type="button" className={className} key={opcao} onClick={() => setRespostas((atual) => ({ ...atual, [index]: opcaoIndex }))}>{opcao}</button>;
                  })}
                </div>
              </article>
            ))}
          </div>
          <div className={styles.quizResult}>
            <strong>{respondidas < quiz.length ? `Você respondeu ${respondidas} de ${quiz.length} questões.` : acertos >= 5 ? "Excelente! Você está pronto para orientar uma oferta consultiva." : "Revise os pontos principais e tente novamente."}</strong>
            <p>O objetivo do treinamento é garantir uma oferta clara, responsável e alinhada às condições apresentadas pelo sistema.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
