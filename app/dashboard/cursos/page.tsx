"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./Cursos.module.css";

type Curso = {
  titulo: string;
  pasta: string;
  categoria: string;
  descricao: string;
  icone: string;
  destaque?: boolean;
};

const cursos: Curso[] = [
  {
    titulo: "Abertura de Conta Corrente",
    pasta: "contacorrente",
    categoria: "Contas",
    descricao: "Orientações sobre abertura, requisitos, documentos e jornada de contratação.",
    icone: "🏦",
  },
  {
    titulo: "Conta Salário",
    pasta: "contasalario",
    categoria: "Contas",
    descricao: "Consulta rápida sobre abertura, funcionamento e principais regras da conta salário.",
    icone: "💼",
  },
  {
    titulo: "Cartão de Crédito",
    pasta: "cartaodecredito",
    categoria: "Cartões",
    descricao: "Informações sobre contratação, benefícios, limites e utilização do cartão.",
    icone: "💳",
  },
  {
    titulo: "Empréstimo Pessoal (Lime)",
    pasta: "emprestimopessoal",
    categoria: "Crédito",
    descricao: "Conteúdo para consulta sobre contratação, condições e jornada do empréstimo pessoal.",
    icone: "💰",
  },
  {
    titulo: "Empréstimo Consignado INSS",
    pasta: "consignadoinss",
    categoria: "Crédito",
    descricao: "Regras, público, contratação e informações para beneficiários do INSS.",
    icone: "👵",
  },
  {
    titulo: "Empréstimo Consignado Privado",
    pasta: "consignadoprivado",
    categoria: "Crédito",
    descricao: "Consulta sobre consignado para trabalhadores de empresas privadas elegíveis.",
    icone: "🏢",
  },
  {
    titulo: "Empréstimo Consignado Público",
    pasta: "consignadopublico",
    categoria: "Crédito",
    descricao: "Orientações para servidores públicos e convênios disponíveis.",
    icone: "🏛️",
  },
  {
    titulo: "Plano Odontológico",
    pasta: "dental",
    categoria: "Seguros e Proteção",
    descricao: "Coberturas, valores, carências, dependentes e perguntas frequentes do plano dental.",
    icone: "🦷",
    destaque: true,
  },
  {
    titulo: "Seguro Residencial",
    pasta: "seguroresidencial",
    categoria: "Seguros e Proteção",
    descricao: "Coberturas, assistências e informações essenciais do seguro residencial.",
    icone: "🏠",
  },
  {
    titulo: "Microsseguro",
    pasta: "microsseguro",
    categoria: "Seguros e Proteção",
    descricao: "Benefícios, coberturas e orientações comerciais sobre o microsseguro.",
    icone: "🛡️",
  },
  {
    titulo: "Viva Vida",
    pasta: "vivavida",
    categoria: "Seguros e Proteção",
    descricao: "Informações do produto, coberturas e pontos importantes para contratação.",
    icone: "❤️",
  },
  {
    titulo: "Sorte Expressa",
    pasta: "sorte-expressa",
    categoria: "Soluções Financeiras",
    descricao: "Consulta sobre funcionamento, benefícios e processo de comercialização.",
    icone: "🍀",
  },
  {
    titulo: "Consórcio",
    pasta: "consorcio",
    categoria: "Soluções Financeiras",
    descricao: "Conteúdo sobre grupos, contemplação, modalidades e jornada comercial.",
    icone: "🚗",
  },
  {
    titulo: "Desbloqueio de Cartão",
    pasta: "desbloqueiodecartao",
    categoria: "Cartões",
    descricao: "Passo a passo para desbloqueio de cartões de débito e de crédito.",
    icone: "🔓",
  },
  {
    titulo: "Prova de Vida INSS",
    pasta: "provadevida",
    categoria: "Serviços",
    descricao: "Orientações para realização da prova de vida e atendimento ao beneficiário.",
    icone: "✅",
  },
  {
    titulo: "Aumento de Limite",
    pasta: "aumentodelimite",
    categoria: "Cartões",
    descricao: "Consulta sobre análise, solicitação e orientações para aumento de limite.",
    icone: "📈",
  },
];

const categorias = [
  "Todos",
  "Contas",
  "Cartões",
  "Crédito",
  "Seguros e Proteção",
  "Soluções Financeiras",
  "Serviços",
];

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function CursosPage() {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todos");

  const cursosFiltrados = useMemo(() => {
    const termo = normalizar(busca);

    return cursos.filter((curso) => {
      const correspondeCategoria =
        categoria === "Todos" || curso.categoria === categoria;

      const correspondeBusca =
        !termo ||
        normalizar(
          `${curso.titulo} ${curso.pasta} ${curso.categoria} ${curso.descricao}`
        ).includes(termo);

      return correspondeCategoria && correspondeBusca;
    });
  }, [busca, categoria]);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>TreinExpresso</span>
          <h1>Central de Cursos</h1>
          <p>
            Encontre rapidamente conteúdos, orientações e materiais de apoio
            para os principais produtos e serviços do Bradesco Expresso.
          </p>

          <div className={styles.searchBox}>
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Pesquisar curso, produto ou serviço..."
              aria-label="Pesquisar curso"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                aria-label="Limpar pesquisa"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className={styles.heroStats}>
          <strong>{cursos.length}</strong>
          <span>cursos disponíveis</span>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.toolbar}>
          <div>
            <span className={styles.sectionLabel}>Conteúdos disponíveis</span>
            <h2>Escolha um curso</h2>
          </div>

          <span className={styles.resultCount}>
            {cursosFiltrados.length}{" "}
            {cursosFiltrados.length === 1 ? "resultado" : "resultados"}
          </span>
        </div>

        <div className={styles.filters} aria-label="Filtrar cursos por categoria">
          {categorias.map((item) => (
            <button
              key={item}
              type="button"
              className={categoria === item ? styles.activeFilter : ""}
              onClick={() => setCategoria(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {cursosFiltrados.length > 0 ? (
          <div className={styles.grid}>
            {cursosFiltrados.map((curso) => (
              <Link
                key={curso.pasta}
                href={`/dashboard/cursos/${curso.pasta}`}
                className={`${styles.card} ${
                  curso.destaque ? styles.featuredCard : ""
                }`}
              >
                <div className={styles.cardHeader}>
                  <span className={styles.icon} aria-hidden="true">
                    {curso.icone}
                  </span>
                  <span className={styles.category}>{curso.categoria}</span>
                </div>

                <div className={styles.cardBody}>
                  <h3>{curso.titulo}</h3>
                  <p>{curso.descricao}</p>
                </div>

                <div className={styles.cardFooter}>
                  <span>Acessar curso</span>
                  <strong aria-hidden="true">→</strong>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <span aria-hidden="true">📚</span>
            <h3>Nenhum curso encontrado</h3>
            <p>
              Tente pesquisar por outro termo ou escolha uma categoria
              diferente.
            </p>
            <button
              type="button"
              onClick={() => {
                setBusca("");
                setCategoria("Todos");
              }}
            >
              Limpar filtros
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
