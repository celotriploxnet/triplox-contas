'use client'

import Link from 'next/link'

export default function ExpressosMenuPage() {
  const cards = [
    {
      title: '📊 Expresso Geral (visão completa)',
      desc: 'Resumo geral, filtros e contadores (transacional, treinado, certificação).',
      href: '/dashboard/expressos/geral',
      enabled: true,
      pill: 'Geral',
    },

    // ✅ NOVO: rota nova (substitui o antigo /contabil)
    {
      title: '💳 Expressos Somente Transacionando',
      desc: 'Transacionam (TRX > 0) e não realizam produtos (demais indicadores 0).',
      href: '/dashboard/expressos/transacionando',
      enabled: true,
      pill: 'Transações',
    },

    {
      title: '👤 Consultar Pessoa Certificada',
      desc: 'Consulta por colaborador que realizou a certificação dos expressos.',
      href: '/dashboard/expressos/pessoa-certificada',
      enabled: true,
      pill: 'Certificação',
    },

    {
      title: '🚨 Expressos com Certificação Vencida',
      desc: 'TRX ≠ 0 + Treinado + certificação vencida (5+ anos) ou próxima do vencimento.',
      href: '/dashboard/expressos/certificacao-vencida',
      enabled: true,
      pill: 'Certificação',
    },

    {
      title: '📘 Expressos Treinados e Zerados',
      desc: 'Painel em criação. Vamos liberar em breve.',
      href: '/dashboard/expressos/treinados-zerados',
      enabled: true,
      pill: 'Em breve',
    },
  ]

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <span className="pill">Expressos</span>
        <h1 className="h1" style={{ marginTop: '.75rem' }}>
          Menu de Expressos
        </h1>
        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          Selecione um painel para análise e acompanhamento.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1rem',
        }}
      >
        {cards.map((c) => (
          <div key={c.title} className="card" style={{ display: 'grid', gap: '.6rem' }}>
            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="pill">{c.pill}</span>

              {!c.enabled && (
                <span
                  className="pill"
                  style={{
                    background: 'rgba(15,15,25,.06)',
                    border: '1px solid rgba(15,15,25,.10)',
                    color: 'rgba(16,16,24,.70)',
                  }}
                >
                  Em breve
                </span>
              )}
            </div>

            <div style={{ fontWeight: 900, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
              {c.title}
            </div>

            <p className="p-muted" style={{ marginTop: '-.1rem' }}>
              {c.desc}
            </p>

            <div style={{ marginTop: '.35rem' }}>
              {c.enabled ? (
                <Link href={c.href} className="btn-primary" style={{ textDecoration: 'none' }}>
                  Acessar <span>➜</span>
                </Link>
              ) : (
                <button
                  className="btn-primary"
                  disabled
                  style={{ opacity: 0.65, cursor: 'not-allowed' }}
                >
                  Em breve
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}