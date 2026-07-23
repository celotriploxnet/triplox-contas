"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./ContaSalario.module.css";

const etapas = [
  {
    numero: "01",
    titulo: "Instalar ou atualizar o App Bradesco",
    descricao:
      "Leia o QR Code gerado no tablet. Quando possível, desinstale o aplicativo já existente e faça uma nova instalação pelo QR Code para garantir a versão mais recente.",
    imagem: "/materiais/conta-salario/imagens/02-conta-salario.png",
  },
  {
    numero: "02",
    titulo: "Iniciar a abertura da conta",
    descricao:
      'No aplicativo, selecione “Não tem conta? Abra uma agora!” e informe nome, como o cliente prefere ser chamado e CPF.',
    imagem: "/materiais/conta-salario/imagens/03-conta-salario.png",
  },
  {
    numero: "03",
    titulo: "Escolher a conta para receber salário",
    descricao:
      'Selecione “Conta-corrente para receber salário, a pedido da instituição” e informe data de nascimento, celular e e-mail.',
    imagem: "/materiais/conta-salario/imagens/04-conta-salario.png",
  },
  {
    numero: "04",
    titulo: "Cadastrar senha, CNPJ e convênio",
    descricao:
      "O cliente cria a senha de 4 dígitos e informa obrigatoriamente o CNPJ e o número do convênio da empresa.",
    imagem: "/materiais/conta-salario/imagens/05-conta-salario.png",
  },
  {
    numero: "05",
    titulo: "Realizar biometria facial e enviar documentos",
    descricao:
      "Faça a biometria em local iluminado, sem boné, óculos ou acessórios que cubram o rosto. Depois, fotografe os documentos e preencha os dados solicitados.",
    imagem: "/materiais/conta-salario/imagens/06-conta-salario.png",
  },
  {
    numero: "06",
    titulo: "Confirmar endereço e agência",
    descricao:
      "Informe o endereço atual, pois é para ele que o cartão será enviado. Em seguida, escolha a agência de relacionamento.",
    imagem: "/materiais/conta-salario/imagens/07-conta-salario.png",
  },
  {
    numero: "07",
    titulo: "Cadastrar a senha do cartão",
    descricao:
      "O cliente cria uma senha de 6 dígitos para utilizar o cartão de débito em saques, pagamentos e outras transações.",
    imagem: "/materiais/conta-salario/imagens/08-conta-salario.png",
  },
  {
    numero: "08",
    titulo: "Apresentar os benefícios",
    descricao:
      "Oriente o cliente sobre os produtos, serviços e vantagens disponíveis para quem recebe salário pelo Bradesco.",
    imagem: "/materiais/conta-salario/imagens/09-conta-salario.png",
  },
  {
    numero: "09",
    titulo: "Ler os termos e concluir",
    descricao:
      "O cliente deve ler os termos de adesão, concluir a abertura e ativar a chave de segurança.",
    imagem: "/materiais/conta-salario/imagens/10-conta-salario.png",
  },
  {
    numero: "10",
    titulo: "Repassar agência e conta ao RH",
    descricao:
      "Após a abertura, oriente o cliente a informar agência e conta ao RH e aguardar o primeiro crédito salarial.",
    imagem: "/materiais/conta-salario/imagens/11-conta-salario.png",
  },
];

const perguntas = [
  {
    pergunta: "Por que o QR Code gerado no tablet deve ser lido?",
    opcoes: [
      "Apenas para abrir a loja de aplicativos",
      "Para identificar que a abertura foi originada pelo Expresso",
      "Para consultar o saldo do cliente",
      "Para cadastrar o cartão",
    ],
    correta: 1,
  },
  {
    pergunta: "O que pode acontecer se o cliente não usar o QR Code?",
    opcoes: [
      "A conta não terá senha",
      "A abertura poderá não ser identificada como produção daquele Expresso",
      "O cliente não poderá receber cartão",
      "O aplicativo será bloqueado",
    ],
    correta: 1,
  },
  {
    pergunta: "Quais dados da empresa devem estar disponíveis?",
    opcoes: [
      "Somente o nome da empresa",
      "CNPJ e número do convênio",
      "Telefone e endereço",
      "Nome do RH e matrícula",
    ],
    correta: 1,
  },
  {
    pergunta: "Por que recomendamos reinstalar o App Bradesco?",
    opcoes: [
      "Para garantir a versão mais recente",
      "Para trocar o CPF",
      "Para remover a biometria",
      "Para alterar o CNPJ",
    ],
    correta: 0,
  },
  {
    pergunta: "O que deve ser feito após a conta ser aberta?",
    opcoes: [
      "Solicitar empréstimo",
      "Repassar agência e conta ao RH",
      "Excluir o aplicativo",
      "Esperar o cartão sem comunicar a empresa",
    ],
    correta: 1,
  },
];

export default function ContaSalarioPage() {
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
          <span>Curso • Serviços</span>
          <h1>Conta para Recebimento de Salário</h1>
          <p>
            Aprenda a iniciar corretamente a abertura pelo tablet e a orientar
            o cliente durante todo o processo no App Bradesco.
          </p>

          <div className={styles.heroActions}>
            <a href="#conteudo" className={styles.primaryButton}>
              Iniciar treinamento
            </a>
            <a
              href="/materiais/conta-salario/conta_salario.pdf"
              target="_blank"
              rel="noreferrer"
              className={styles.secondaryButton}
            >
              Abrir material
            </a>
            <a
              href="/materiais/conta-salario/controle-contas-salario.xlsx"
              download
              className={styles.secondaryButton}
            >
              Baixar controle mensal
            </a>
          </div>
        </div>

        <div className={styles.heroImage}>
          <Image
            src="/materiais/conta-salario/imagens/01-conta-salario.png"
            alt="Abertura de conta para recebimento de salário"
            width={900}
            height={900}
            priority
          />
        </div>
      </section>

      <section className={styles.criticalAlert}>
        <div className={styles.alertMark}>!</div>
        <div>
          <span>Regra essencial para contar na produção</span>
          <h2>Sempre leia o QR Code gerado no tablet</h2>
          <p>
            A leitura do QR Code vincula a abertura ao Bradesco Expresso que
            iniciou o atendimento. Sem essa leitura para baixar ou acessar o
            App Bradesco, não é possível identificar que a conta veio daquele
            Expresso, e a abertura poderá não contar na produção.
          </p>
        </div>
      </section>

      <section className={styles.infoGrid}>
        <article>
          <strong>QR Code</strong>
          <span>Obrigatório em toda abertura</span>
        </article>
        <article>
          <strong>App atualizado</strong>
          <span>Reinstale quando possível</span>
        </article>
        <article>
          <strong>CNPJ</strong>
          <span>Cliente deve portar o dado</span>
        </article>
        <article>
          <strong>Convênio</strong>
          <span>Número obrigatório da empresa</span>
        </article>
      </section>

      <section className={styles.content} id="conteudo">
        <header className={styles.sectionHeader}>
          <span>Antes de iniciar</span>
          <h2>Checklist obrigatório</h2>
        </header>

        <div className={styles.checklistGrid}>
          <article>
            <b>01</b>
            <h3>Gerar o QR Code no tablet</h3>
            <p>
              Inicie pela opção <strong>Abertura de contas</strong>, informe o
              CPF e selecione <strong>Conta folha de pagamento</strong>.
            </p>
          </article>

          <article>
            <b>02</b>
            <h3>Ler o QR Code com o celular</h3>
            <p>
              Use a câmera do celular do cliente e abra o link apresentado.
              Essa etapa identifica a origem da abertura.
            </p>
          </article>

          <article>
            <b>03</b>
            <h3>Atualizar o aplicativo</h3>
            <p>
              Caso o App Bradesco já esteja instalado, recomendamos excluí-lo e
              fazer uma nova instalação pelo QR Code.
            </p>
          </article>

          <article>
            <b>04</b>
            <h3>Confirmar os dados da empresa</h3>
            <p>
              Antes de começar, confirme se o cliente possui o
              <strong> CNPJ</strong> e o <strong>número do convênio</strong>.
            </p>
          </article>
        </div>

        <section className={styles.tabletGuide}>
          <header className={styles.sectionHeader}>
            <span>Início pelo tablet</span>
            <h2>Como gerar e ler o QR Code</h2>
          </header>

          <div className={styles.guideImage}>
            <Image
              src="/materiais/conta-salario/imagens/passo-a-passo-tablet.png"
              alt="Passo a passo para gerar e ler o QR Code da Conta Salário"
              width={1024}
              height={1536}
            />
          </div>
        </section>

        <section className={styles.stepsSection}>
          <header className={styles.sectionHeader}>
            <span>Jornada no App Bradesco</span>
            <h2>Passo a passo completo</h2>
          </header>

          <div className={styles.stepsGrid}>
            {etapas.map((etapa) => (
              <article className={styles.stepCard} key={etapa.numero}>
                <div className={styles.stepImage}>
                  <Image
                    src={etapa.imagem}
                    alt={etapa.titulo}
                    width={900}
                    height={900}
                  />
                </div>
                <div className={styles.stepContent}>
                  <span>{etapa.numero}</span>
                  <h3>{etapa.titulo}</h3>
                  <p>{etapa.descricao}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.attention}>
          <div>
            <span>!</span>
            <h2>Pontos de atenção</h2>
          </div>
          <ul>
            <li>
              Nunca pule a leitura do QR Code gerado no tablet, pois ela
              identifica o Expresso responsável pela abertura.
            </li>
            <li>
              Quando possível, reinstale o App Bradesco pelo QR Code para
              utilizar a versão mais recente.
            </li>
            <li>
              Confirme antes do atendimento se o cliente possui CNPJ e número
              do convênio da empresa.
            </li>
            <li>
              Oriente o cliente a preencher todas as informações corretamente
              para evitar pendências.
            </li>
            <li>
              Após a abertura, registre a conta na planilha de controle mensal.
            </li>
          </ul>
        </section>

        <section className={styles.controlSection}>
          <div>
            <span>Controle de produção</span>
            <h2>Registre as contas abertas no mês</h2>
            <p>
              A planilha permite acompanhar cliente, empresa, CNPJ, convênio,
              leitura do QR Code, reinstalação do aplicativo e conclusão da
              abertura.
            </p>
          </div>
          <a
            href="/materiais/conta-salario/controle-contas-salario.xlsx"
            download
          >
            Baixar planilha de controle
          </a>
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
