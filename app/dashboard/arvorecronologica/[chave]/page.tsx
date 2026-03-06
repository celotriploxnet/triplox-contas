'use client'

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type MesRow = {
  mesReferencia: string
  mesOrdem: number

  chave: string
  nome: string
  municipio: string
  agencia: string
  pacb: string

  trx: number
  pontos: number

  qtdContas?: number
  qtdConsignado?: number
  qtdPlanoOdonto?: number
  qtdMicrosseguro?: number
  qtdVivaVida?: number

  statusAnalise?: string
  dtCertificacao?: string
}

function formatNum(n: number | undefined) {
  if (!Number.isFinite(Number(n))) return '0'
  return String(Number(n))
}

function formatPontos(n: number | undefined) {
  const value = Number(n || 0)
  const rounded = Math.round(value * 10) / 10
  const isInt = Math.abs(rounded - Math.round(rounded)) < 1e-9
  return isInt ? String(Math.round(rounded)) : rounded.toFixed(1).replace('.', ',')
}

function deltaNumber(atual: number | undefined, anterior: number | undefined) {
  const a = Number(atual || 0)
  const b = Number(anterior || 0)
  return a - b
}

function deltaLabel(atual: number | undefined, anterior: number | undefined) {
  const delta = deltaNumber(atual, anterior)

  if (delta > 0) return `↑ +${delta}`
  if (delta < 0) return `↓ ${delta}`
  return '→ 0'
}

function deltaStyle(atual: number | undefined, anterior: number | undefined): CSSProperties {
  const delta = deltaNumber(atual, anterior)

  if (delta > 0) {
    return {
      background: 'rgba(34,197,94,.10)',
      border: '1px solid rgba(34,197,94,.20)',
      color: 'rgba(21,128,61,.95)',
    }
  }

  if (delta < 0) {
    return {
      background: 'rgba(214,31,44,.10)',
      border: '1px solid rgba(214,31,44,.20)',
      color: 'rgba(214,31,44,.95)',
    }
  }

  return {
    background: 'rgba(15,15,25,.06)',
    border: '1px solid rgba(15,15,25,.10)',
    color: 'rgba(16,16,24,.70)',
  }
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(15,15,25,.10)',
        borderRadius: 16,
        boxShadow: '0 10px 20px rgba(10,10,20,.08)',
        padding: '.75rem .9rem',
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: '.35rem' }}>{label}</div>
      {payload.map((item: any, idx: number) => (
        <div key={idx} style={{ fontSize: 14 }}>
          {item.name}: <b>{item.value}</b>
        </div>
      ))}
    </div>
  )
}

export default function ArvoreCronologicaPage() {
  const router = useRouter()
  const params = useParams()

  const chave = String(params?.chave || '')

  const [userReady, setUserReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [rows, setRows] = useState<MesRow[]>([])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push('/login')
        return
      }
      setUserReady(true)
    })

    return () => unsub()
  }, [router])

  useEffect(() => {
    if (!userReady || !chave) return

    async function carregar() {
      try {
        setLoading(true)
        setErro('')

        const refMeses = collection(db, 'arvorecronologica', chave, 'meses')
        const q = query(refMeses, orderBy('mesOrdem', 'asc'))
        const snap = await getDocs(q)

        const lista = snap.docs.map((d) => d.data() as MesRow)
        setRows(lista)
      } catch (e: any) {
        console.error(e)
        setErro(e?.message || 'Erro ao carregar árvore cronológica.')
      } finally {
        setLoading(false)
      }
    }

    carregar()
  }, [userReady, chave])

  const infoExpresso = useMemo(() => {
    if (!rows.length) return null
    return rows[rows.length - 1]
  }, [rows])

  const chartData = useMemo(() => {
    return rows.map((r) => ({
      mes: r.mesReferencia,
      contas: Number(r.qtdContas || 0),
      consignado: Number(r.qtdConsignado || 0),
      planoOdonto: Number(r.qtdPlanoOdonto || 0),
      microsseguro: Number(r.qtdMicrosseguro || 0),
      vivaVida: Number(r.qtdVivaVida || 0),
    }))
  }, [rows])

  if (!userReady) {
    return (
      <section style={{ display: 'grid', gap: '1.25rem' }}>
        <p>Verificando acesso...</p>
      </section>
    )
  }

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <span className="pill">Árvore Cronológica</span>
          <h1 className="h1" style={{ marginTop: '.75rem' }}>
            🌳 Evolução do Expresso
          </h1>
          <p className="p-muted" style={{ marginTop: '.35rem' }}>
            Acompanhe a evolução mensal de produção, pontos e indicadores do expresso.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.back()}
          style={{
            borderRadius: 999,
            padding: '.55rem .9rem',
            fontSize: '.9rem',
            fontWeight: 900,
            border: '1px solid rgba(15,15,25,.18)',
            background: 'rgba(255,255,255,.92)',
            color: 'rgba(16,16,24,.92)',
            boxShadow: '0 10px 18px rgba(10,10,20,.06)',
            cursor: 'pointer',
          }}
        >
          ← Voltar
        </button>
      </div>

      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <div>
            <div className="p-muted" style={{ fontSize: 12 }}>
              Chave do Expresso
            </div>
            <div style={{ fontWeight: 900, fontSize: '1.08rem' }}>
              {chave || '—'}
            </div>
          </div>

          <div>
            <span className="pill">Histórico mensal</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card-soft">
          <p className="p-muted">Carregando árvore cronológica...</p>
        </div>
      ) : erro ? (
        <div className="card-soft" style={{ borderColor: 'rgba(214,31,44,.25)' }}>
          <p className="p-muted" style={{ color: 'rgba(214,31,44,.95)', fontWeight: 800 }}>
            {erro}
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="card-soft">
          <p className="p-muted">Nenhum histórico encontrado para este expresso.</p>
        </div>
      ) : (
        <>
          <div className="card" style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <span className="pill">Resumo atual</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '.75rem',
              }}
            >
              <InfoBox label="Nome do Expresso" value={infoExpresso?.nome || '—'} />
              <InfoBox label="Município" value={infoExpresso?.municipio || '—'} />
              <InfoBox
                label="Agência / PACB"
                value={`${infoExpresso?.agencia || '—'} / ${infoExpresso?.pacb || '—'}`}
              />
              <InfoBox label="Status Análise" value={infoExpresso?.statusAnalise || '—'} />
              <InfoBox label="Certificação" value={infoExpresso?.dtCertificacao || '—'} />
              <InfoBox label="Último mês" value={infoExpresso?.mesReferencia || '—'} />
            </div>
          </div>

          <div className="card" style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <span className="pill">Gráfico</span>
              <h2 className="h2" style={{ marginTop: '.6rem' }}>
                Evolução mensal dos produtos
              </h2>
            </div>

            <div
              className="card-soft"
              style={{
                width: '100%',
                height: 420,
                padding: '1rem',
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={8} barCategoryGap="18%">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="contas" name="Contas" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="consignado" name="Consignado" fill="#16a34a" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="planoOdonto" name="Plano Odonto" fill="#7a1ea1" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="microsseguro" name="Microsseguro" fill="#d61f2c" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="vivaVida" name="Viva Vida" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <span className="pill">Linha do tempo</span>
              <h2 className="h2" style={{ marginTop: '.6rem' }}>
                Histórico mensal
              </h2>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {[...rows]
                .sort((a, b) => b.mesOrdem - a.mesOrdem)
                .map((r, index, arrDesc) => {
                  const anterior = arrDesc[index + 1]

                  return (
                    <div
                      key={`${r.chave}-${r.mesReferencia}`}
                      className="card-soft"
                      style={{ display: 'grid', gap: '.85rem' }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '.75rem',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div className="p-muted" style={{ fontSize: 12 }}>
                            Mês de referência
                          </div>
                          <div style={{ fontWeight: 900, fontSize: '1.05rem' }}>
                            {r.mesReferencia}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                          <span className="pill">TRX: {formatNum(r.trx)}</span>
                          <span className="pill">Pontos: {formatPontos(r.pontos)}</span>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: '.7rem',
                        }}
                      >
                        <InfoBox
                          label="TRX"
                          value={formatNum(r.trx)}
                          extra={
                            anterior ? (
                              <span className="pill" style={deltaStyle(r.trx, anterior.trx)}>
                                {deltaLabel(r.trx, anterior.trx)}
                              </span>
                            ) : null
                          }
                        />

                        <InfoBox
                          label="Pontos"
                          value={formatPontos(r.pontos)}
                          extra={
                            anterior ? (
                              <span className="pill" style={deltaStyle(r.pontos, anterior.pontos)}>
                                {deltaLabel(r.pontos, anterior.pontos)}
                              </span>
                            ) : null
                          }
                        />

                        <InfoBox
                          label="Contas"
                          value={formatNum(r.qtdContas)}
                          extra={
                            anterior ? (
                              <span className="pill" style={deltaStyle(r.qtdContas, anterior.qtdContas)}>
                                {deltaLabel(r.qtdContas, anterior.qtdContas)}
                              </span>
                            ) : null
                          }
                        />

                        <InfoBox
                          label="Consignado"
                          value={formatNum(r.qtdConsignado)}
                          extra={
                            anterior ? (
                              <span
                                className="pill"
                                style={deltaStyle(r.qtdConsignado, anterior.qtdConsignado)}
                              >
                                {deltaLabel(r.qtdConsignado, anterior.qtdConsignado)}
                              </span>
                            ) : null
                          }
                        />

                        <InfoBox label="Plano Odonto" value={formatNum(r.qtdPlanoOdonto)} />
                        <InfoBox label="Microsseguro" value={formatNum(r.qtdMicrosseguro)} />
                        <InfoBox label="Viva Vida" value={formatNum(r.qtdVivaVida)} />
                        <InfoBox label="Status Análise" value={r.statusAnalise || '—'} />
                        <InfoBox label="Certificação" value={r.dtCertificacao || '—'} />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

function InfoBox({
  label,
  value,
  extra,
}: {
  label: string
  value: string
  extra?: ReactNode
}) {
  return (
    <div className="card-soft" style={{ padding: '.85rem .95rem' }}>
      <div className="p-muted" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div style={{ fontWeight: 900, marginTop: '.2rem' }}>{value}</div>
      {extra && <div style={{ marginTop: '.45rem' }}>{extra}</div>}
    </div>
  )
}