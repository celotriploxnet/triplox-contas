'use client'

import Link from 'next/link'

export default function ExpressosMenuPage() {
  const cards = [
    // GERAL
    {
      title: '📊 Expresso Geral (visão completa)',
      desc: 'Resumo geral, filtros e contadores (transacional, treinado, certificação).',
      href: '/dashboard/expressos/geral',
      enabled: true,
      pill: 'Geral',
    },

    // PRODUÇÃO
    {
      title: '📘 Expressos Treinados e Zerados',
      desc: 'Expresso com Status de treinado e com produção zerada.',
      href: '/dashboard/expressos/treinados-zerados',
      enabled: true,
      pill: 'Produção',
    },
    {
      title: '🧾 Liberados para Microsseguro',
      desc: 'Expressos ativos para vendas do Microsseguro.',
      href: '/dashboard/expressos/liberados-microsseguro',
      enabled: true,
      pill: 'Produção',
    },
    {
      title: '🚀 Acelerador (próximos da faixa)',
      desc: 'Ranking dos expressos mais próximos de subir o percentual.',
      href: '/dashboard/expressos/acelerador',
      enabled: true,
      pill: 'Produção',
    },

    // TRANSAÇÃO
    {
      title: '💳 Expressos Somente Transacionando',
      desc: 'Expressos que transacionam, mas não realizam produtos.',
      href: '/dashboard/expressos/transacionando',
      enabled: true,
      pill: 'Transação',
    },

    // GESTÃO
    {
      title: '📊 Regional, Agência e Supervisão',
      desc: 'Relatório agrupado por regional, agência e supervisão, com detalhamento dos expressos.',
      href: '/dashboard/relatoriogestao',
      enabled: true,
      pill: 'Gestão',
    },

    // 🔴 NOVO BLOCO
    {
      title: '📈 Mudança de Status Transacional para Treinados',
      desc: 'Expressos transacionais que atingiram pontuação para mudança de status para treinado.',
      href: '/dashboard/expressos/transacional-para-treinado',
      enabled: true,
      pill: 'Gestão',
    },

    // CERTIFICAÇÃO
    {
      title: '👤 Consultar Pessoa Certificada',
      desc: 'Consulta por colaborador que realizou a certificação dos expressos.',
      href: '/dashboard/expressos/pessoa-certificada',
      enabled: true,
      pill: 'Certificação',
    },
    {
      title: '🚨 Expressos com Certificação Vencida',
      desc: 'Expresso treinado, transacionando e com certificação vencida ou a vencer.',
      href: '/dashboard/expressos/certificacao-vencida',
      enabled: true,
      pill: 'Certificação',
    },
  ]

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <span className="pill">Expressos</span>
        <h1 className="h1">Relatórios de Expressos</h1>
        <p className="p-muted" style={{ marginTop: '.25rem' }}>
          Acesse os relatórios operacionais e de gestão dos expressos.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
        }}
      >
        {cards.map((card, i) => (
          <Link key={i} href={card.href} className="card">
            <div className="card-soft" style={{ padding: '1rem' }}>
              <span className="pill">{card.pill}</span>

              <div
                style={{
                  fontWeight: 900,
                  fontSize: '1.05rem',
                  marginTop: '.35rem',
                }}
              >
                {card.title}
              </div>

              <p
                className="p-muted"
                style={{
                  marginTop: '.35rem',
                  fontSize: '.9rem',
                }}
              >
                {card.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}