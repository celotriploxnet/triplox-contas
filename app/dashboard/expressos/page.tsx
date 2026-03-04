'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

export default function ExpressosMenuPage() {
  const cards = [
    {
      title: '📊 Expresso Geral (visão completa)',
      desc: 'Resumo geral, filtros e contadores (transacional, treinado, certificação).',
      href: '/dashboard/expressos/geral',
      enabled: true,
      pill: 'Geral',
    },
    {
      title: '💳 Expressos Somente Transacionando',
      desc: 'Expressos que transacionam, mas não realizam produtos.',
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
      desc: 'Expresso treinado, transacionando e com certificação vencida ou a vencer.',
      href: '/dashboard/expressos/certificacao-vencida',
      enabled: true,
      pill: 'Certificação',
    },
    {
      title: '📘 Expressos Treinados e Zerados',
      desc: 'Expresso com Status de treinado e com produção zerada.',
      href: '/dashboard/expressos/treinados-zerados',
      enabled: true,
      pill: 'Produção',
    },
    {
      title: '🧾 Liberados para Microsseguro',
      desc: 'Expressos ativos para vendas do Microsseguro',
      href: '/dashboard/expressos/liberados-microsseguro',
      enabled: true,
      pill: 'Produção',
    },
    // ✅ NOVO BLOCO (o que você pediu)
    {
      title: '🧮 Simulador de Comissão',
      desc: 'Previsão de ganho por venda de cada produto.',
      href: '/dashboard/simulador',
      enabled: true,
      pill: 'Simulador',
    },
  ]

  // opcional: filtro visual por categoria (não muda nada se você não quiser usar)
  const pills = useMemo(() => ['Todos', ...Array.from(new Set(cards.map((c) => c.pill)))], [cards])
  const [pillFilter, setPillFilter] = useState('Todos')

  const visibleCards = useMemo(() => {
    if (pillFilter === 'Todos') return cards
    return cards.filter((c) => c.pill === pillFilter)
  }, [cards, pillFilter])

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div style={{ display: 'grid', gap: '.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <span className="pill">Expressos</span>
            <h1 className="h1" style={{ marginTop: '.75rem' }}>
              Menu de Expressos
            </h1>
            <p className="p-muted" style={{ marginTop: '.35rem' }}>
              Selecione um painel para análise e acompanhamento.
            </p>
          </div>

          {/* filtro opcional (pode remover se quiser 100% igual ao original) */}
          <div className="card-soft" style={{ padding: '.65rem .75rem', display: 'flex', gap: '.6rem', alignItems: 'center' }}>
            <span className="p-muted" style={{ fontSize: 12, fontWeight: 900 }}>
              Categoria
            </span>
            <select className="input" value={pillFilter} onChange={(e) => setPillFilter(e.target.value)} style={{ height: 38 }}>
              {pills.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1rem',
        }}
      >
        {visibleCards.map((c) => (
          <div
            key={c.title}
            className="card"
            style={{
              display: 'grid',
              gap: '.65rem',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease',
              border: '1px solid rgba(15,15,25,.08)',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 18px 28px rgba(10,10,20,.10)'
              ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(214,31,44,.22)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0px)'
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 18px rgba(10,10,20,.06)'
              ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(15,15,25,.08)'
            }}
          >
            {/* brilho suave no topo (só visual) */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(900px 220px at 20% 0%, rgba(214,31,44,.10), transparent 60%), radial-gradient(800px 220px at 80% 0%, rgba(15,15,25,.06), transparent 55%)',
                pointerEvents: 'none',
              }}
            />

            <div style={{ position: 'relative', display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span
                className="pill"
                style={{
                  border: '1px solid rgba(214,31,44,.15)',
                  background: 'rgba(214,31,44,.06)',
                  color: 'rgba(214,31,44,.92)',
                  fontWeight: 900,
                }}
              >
                {c.pill}
              </span>

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

            <div style={{ position: 'relative', fontWeight: 950, fontSize: '1.06rem', letterSpacing: '-0.01em' }}>
              {c.title}
            </div>

            <p className="p-muted" style={{ position: 'relative', marginTop: '-.1rem', lineHeight: 1.35 }}>
              {c.desc}
            </p>

            <div style={{ position: 'relative', marginTop: '.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.75rem' }}>
              {c.enabled ? (
                <Link href={c.href} className="btn-primary" style={{ textDecoration: 'none' }}>
                  Acessar <span>➜</span>
                </Link>
              ) : (
                <button className="btn-primary" disabled style={{ opacity: 0.65, cursor: 'not-allowed' }}>
                  Em breve
                </button>
              )}

              {/* micro detalhe (setinha) */}
              <span className="p-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                Abrir painel →
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}