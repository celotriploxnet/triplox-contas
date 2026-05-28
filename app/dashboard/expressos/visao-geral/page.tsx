'use client'

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { collection, getDocs } from 'firebase/firestore'

import { auth, db } from '@/lib/firebase'
import { calcPontosExpressoGeral } from '@/lib/pontuacao-junho-2026'

const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'
const EXPRESSOS_COLLECTION = 'expressos_registro_junho_2026'

type ExpressoJunho = {
  id: string
  chave: string
  nome: string
  municipio: string
  agencia: string
  pacb: string
  regional: string
  statusAnalise: string
  trx: number
  pontos: number
  qtdContas: number
  qtdContasComDeposito: number
  qtdContasSemDeposito: number
  qtdCestaServ: number
  qtdSuperProtegido: number
  vlrLime: number
  vlrConsignadoTotal: number
  vlrCreditoParcelado: number
  qtdMicrosseguro: number
  qtdVivaVida: number
  qtdPlanoOdonto: number
  qtdSegCartaoDeb: number
  vlrExpSorte: number
  presenteNaUltimaBase?: boolean
}

type KPI = {
  titulo: string
  valor: ReactNode
  subtitulo: string
  destaque?: boolean
}

function toStr(v: any) {
  return v === null || v === undefined ? '' : String(v).trim()
}

function toNumber(v: any) {
  if (v === null || v === undefined || v === '') return 0
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0

  const s = String(v)
    .trim()
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

function normalizeText(v: any) {
  return toStr(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
}

function isTreinado(status: string) {
  return normalizeText(status).includes('TREINADO')
}

function isTransacional(status: string) {
  return normalizeText(status).includes('TRANSACIONAL')
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('pt-BR').format(n || 0)
}

function formatPercent(n: number) {
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n || 0)}%`
}

function calcPontosFallback(d: any) {
  const pontosSalvos = toNumber(d.pontos)
  if (pontosSalvos > 0) return pontosSalvos

  return calcPontosExpressoGeral({
    qtdContasComDeposito: toNumber(d.qtdContasComDeposito),
    qtdContasSemDeposito: toNumber(d.qtdContasSemDeposito),
    qtdCestaServ: toNumber(d.qtdCestaServ),
    qtdSuperProtegido: toNumber(d.qtdSuperProtegido),
    vlrLime: toNumber(d.vlrLime),
    vlrConsignadoTotal: toNumber(d.vlrConsignadoTotal),
    vlrCreditoParcelado: toNumber(d.vlrCreditoParcelado),
    qtdMicrosseguro: toNumber(d.qtdMicrosseguro),
    qtdVivaVida: toNumber(d.qtdVivaVida),
    qtdPlanoOdonto: toNumber(d.qtdPlanoOdonto),
    qtdSegCartaoDeb: toNumber(d.qtdSegCartaoDeb),
    vlrExpSorte: toNumber(d.vlrExpSorte),
  })
}

function mapDoc(id: string, d: any): ExpressoJunho {
  return {
    id,
    chave: toStr(d.chave),
    nome: toStr(d.nome),
    municipio: toStr(d.municipio),
    agencia: toStr(d.agencia),
    pacb: toStr(d.pacb),
    regional: toStr(d.regional),
    statusAnalise: toStr(d.statusAnalise),
    trx: toNumber(d.trx),
    pontos: calcPontosFallback(d),
    qtdContas: toNumber(d.qtdContas),
    qtdContasComDeposito: toNumber(d.qtdContasComDeposito),
    qtdContasSemDeposito: toNumber(d.qtdContasSemDeposito),
    qtdCestaServ: toNumber(d.qtdCestaServ),
    qtdSuperProtegido: toNumber(d.qtdSuperProtegido),
    vlrLime: toNumber(d.vlrLime),
    vlrConsignadoTotal: toNumber(d.vlrConsignadoTotal),
    vlrCreditoParcelado: toNumber(d.vlrCreditoParcelado),
    qtdMicrosseguro: toNumber(d.qtdMicrosseguro),
    qtdVivaVida: toNumber(d.qtdVivaVida),
    qtdPlanoOdonto: toNumber(d.qtdPlanoOdonto),
    qtdSegCartaoDeb: toNumber(d.qtdSegCartaoDeb),
    vlrExpSorte: toNumber(d.vlrExpSorte),
    presenteNaUltimaBase: d.presenteNaUltimaBase !== false,
  }
}

function Card({ titulo, valor, subtitulo, destaque }: KPI) {
  return (
    <div style={{ ...styles.card, ...(destaque ? styles.cardDestaque : {}) }}>
      <div style={styles.cardTitle}>{titulo}</div>
      <div style={styles.cardValue}>{valor}</div>
      <div style={styles.cardSub}>{subtitulo}</div>
    </div>
  )
}

export default function VisaoGeralExpressosPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [registros, setRegistros] = useState<ExpressoJunho[]>([])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setCheckingAuth(false)

      if (!u) router.replace('/login')
      if (u && u.email !== ADMIN_EMAIL) router.replace('/dashboard')
    })

    return () => unsub()
  }, [router])

  useEffect(() => {
    async function carregar() {
      if (!user || user.email !== ADMIN_EMAIL) return

      try {
        setLoading(true)
        setErro('')

        const snap = await getDocs(collection(db, EXPRESSOS_COLLECTION))
        const rows = snap.docs.map((docSnap) => mapDoc(docSnap.id, docSnap.data()))

        setRegistros(rows.filter((r) => r.presenteNaUltimaBase !== false))
      } catch (e: any) {
        setErro(`Falha ao carregar visão geral: ${e?.message || String(e)}`)
      } finally {
        setLoading(false)
      }
    }

    carregar()
  }, [user])

  const resumo = useMemo(() => {
    const treinados = registros.filter((r) => isTreinado(r.statusAnalise))
    const transacionais = registros.filter((r) => isTransacional(r.statusAnalise))

    const treinadosMais10 = treinados.filter((r) => r.pontos > 10)
    const treinadosMenos10 = treinados.filter((r) => r.pontos < 10)
    const treinadosExatamente10 = treinados.filter((r) => r.pontos === 10)
    const transacionaisMais10 = transacionais.filter((r) => r.pontos > 10)

    const percentualTreinadosProdutivos = treinados.length
      ? (treinadosMais10.length / treinados.length) * 100
      : 0

    const topTreinados = [...treinados]
      .sort((a, b) => b.pontos - a.pontos)
      .slice(0, 10)

    const topTransacionais = [...transacionaisMais10]
      .sort((a, b) => b.pontos - a.pontos)
      .slice(0, 10)

    const treinadosFaltandoAte4Pontos = treinados
      .map((r) => ({
        ...r,
        pontosFaltantes: Math.max(10 - r.pontos, 0),
      }))
      .filter((r) => r.pontosFaltantes >= 1 && r.pontosFaltantes <= 4)
      .sort((a, b) => {
        if (a.pontosFaltantes !== b.pontosFaltantes) {
          return a.pontosFaltantes - b.pontosFaltantes
        }

        return b.pontos - a.pontos
      })
      .slice(0, 20)

    return {
      totalBase: registros.length,
      treinados,
      transacionais,
      treinadosMais10,
      treinadosMenos10,
      treinadosExatamente10,
      transacionaisMais10,
      percentualTreinadosProdutivos,
      topTreinados,
      topTransacionais,
      treinadosFaltandoAte4Pontos,
    }
  }, [registros])

  if (checkingAuth || loading) {
    return (
      <main style={styles.page}>
        <section style={styles.loadingBox}>Carregando visão geral...</section>
      </main>
    )
  }

  if (!user || user.email !== ADMIN_EMAIL) return null

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div>
          <div style={styles.eyebrow}>Expressos • Junho 2026</div>
          <h1 style={styles.title}>Visão Geral</h1>
          <p style={styles.subtitle}>
            Resumo executivo usando a nova regra de pontuação e a base de expressos de junho.
          </p>
        </div>

        <div style={styles.badge}>Área administrativa</div>
      </section>

      {erro ? <div style={styles.error}>{erro}</div> : null}

      <section style={styles.grid}>
        <Card
          titulo="Total na base"
          valor={formatNumber(resumo.totalBase)}
          subtitulo="Expressos carregados da base Junho"
        />
        <Card
          titulo="Total TREINADO"
          valor={formatNumber(resumo.treinados.length)}
          subtitulo="Expressos com status treinado"
          destaque
        />
        <Card
          titulo="Total TRANSACIONAL"
          valor={formatNumber(resumo.transacionais.length)}
          subtitulo="Expressos com status transacional"
        />
        <Card
          titulo="Treinados +10 pts"
          valor={formatNumber(resumo.treinadosMais10.length)}
          subtitulo="Treinados com mais de 10 pontos"
          destaque
        />
        <Card
          titulo="Treinados -10 pts"
          valor={formatNumber(resumo.treinadosMenos10.length)}
          subtitulo="Treinados com menos de 10 pontos"
        />
        <Card
          titulo="Transacionais +10 pts"
          valor={formatNumber(resumo.transacionaisMais10.length)}
          subtitulo="Transacionais com mais de 10 pontos"
        />
      </section>

      <section style={styles.percentBox}>
        <div>
          <div style={styles.percentLabel}>Eficiência dos treinados</div>
          <div style={styles.percentValue}>
            {formatPercent(resumo.percentualTreinadosProdutivos)}
          </div>
          <p style={styles.percentText}>
            Percentual de expressos treinados que estão com mais de 10 pontos em relação ao total de treinados.
          </p>
        </div>

        <div style={styles.formulaBox}>
          <strong>Fórmula</strong>
          <span>
            {formatNumber(resumo.treinadosMais10.length)} ÷ {formatNumber(resumo.treinados.length)} × 100
          </span>
        </div>
      </section>

      <section style={styles.noteBox}>
        <strong>Observação:</strong> treinados com exatamente 10 pontos ficaram separados da regra de “mais de 10” e “menos de 10”.
        Hoje são <strong>{formatNumber(resumo.treinadosExatamente10.length)}</strong> expressos exatamente com 10 pontos.
      </section>

      <section style={styles.tablesWrap}>
        <div style={styles.tableCard}>
          <h2 style={styles.sectionTitle}>Top 10 treinados por pontuação</h2>
          <SimpleTable rows={resumo.topTreinados} />
        </div>

        <div style={styles.tableCard}>
          <h2 style={styles.sectionTitle}>Top 10 transacionais acima de 10 pontos</h2>
          <SimpleTable rows={resumo.topTransacionais} />
        </div>
      </section>

      <section style={styles.fullTableWrap}>
        <div style={styles.tableCard}>
          <h2 style={styles.sectionTitle}>Top 20 treinados faltando de 1 a 4 pontos para chegar em 10</h2>
          <p style={styles.sectionText}>
            Lista dos expressos treinados mais próximos de atingir 10 pontos pela regra de Junho 2026.
          </p>
          <SimpleTable rows={resumo.treinadosFaltandoAte4Pontos} showFaltam />
        </div>
      </section>
    </main>
  )
}

function SimpleTable({
  rows,
  showFaltam = false,
}: {
  rows: Array<ExpressoJunho & { pontosFaltantes?: number }>
  showFaltam?: boolean
}) {
  if (!rows.length) {
    return <div style={styles.empty}>Nenhum registro encontrado.</div>
  }

  return (
    <div style={styles.tableScroll}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Chave</th>
            <th style={styles.th}>Expresso</th>
            <th style={styles.th}>Município</th>
            <th style={styles.th}>Ag/PACB</th>
            <th style={styles.th}>Status</th>
            <th style={styles.thRight}>Pontos</th>
            {showFaltam ? <th style={styles.thRight}>Faltam</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={styles.td}>{r.chave}</td>
              <td style={styles.tdStrong}>{r.nome || '—'}</td>
              <td style={styles.td}>{r.municipio || '—'}</td>
              <td style={styles.td}>{r.agencia || '—'} / {r.pacb || '—'}</td>
              <td style={styles.td}>{r.statusAnalise || '—'}</td>
              <td style={styles.tdRight}>{formatNumber(r.pontos)}</td>
              {showFaltam ? (
                <td style={styles.tdRight}>{formatNumber(r.pontosFaltantes || 0)}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    padding: 24,
    background:
      'linear-gradient(135deg, #fff5f6 0%, #ffffff 38%, #f8eefc 100%)',
    color: '#1f1720',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  loadingBox: {
    maxWidth: 960,
    margin: '80px auto',
    background: '#fff',
    borderRadius: 22,
    padding: 28,
    boxShadow: '0 18px 50px rgba(80, 0, 20, 0.10)',
    fontWeight: 800,
  },
  hero: {
    maxWidth: 1180,
    margin: '0 auto 22px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: 18,
    alignItems: 'flex-start',
    background: 'linear-gradient(135deg, #b5121b 0%, #d61f2c 52%, #7a1ea1 100%)',
    color: '#fff',
    borderRadius: 28,
    padding: 28,
    boxShadow: '0 22px 60px rgba(130, 0, 30, 0.22)',
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontSize: 12,
    fontWeight: 900,
    opacity: 0.9,
  },
  title: {
    margin: '6px 0 8px',
    fontSize: 38,
    lineHeight: 1,
    fontWeight: 950,
  },
  subtitle: {
    margin: 0,
    maxWidth: 720,
    fontSize: 15,
    lineHeight: 1.5,
    opacity: 0.92,
  },
  badge: {
    background: 'rgba(255,255,255,0.18)',
    border: '1px solid rgba(255,255,255,0.28)',
    borderRadius: 999,
    padding: '10px 14px',
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: 'nowrap',
  },
  error: {
    maxWidth: 1180,
    margin: '0 auto 16px',
    padding: 14,
    borderRadius: 16,
    background: '#fff1f2',
    color: '#9f1239',
    border: '1px solid #fecdd3',
    fontWeight: 800,
  },
  grid: {
    maxWidth: 1180,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: 16,
  },
  card: {
    background: 'rgba(255,255,255,0.92)',
    border: '1px solid rgba(140, 0, 35, 0.08)',
    borderRadius: 24,
    padding: 20,
    boxShadow: '0 18px 45px rgba(80, 0, 20, 0.08)',
  },
  cardDestaque: {
    border: '1px solid rgba(214, 31, 44, 0.28)',
    boxShadow: '0 20px 55px rgba(214, 31, 44, 0.14)',
  },
  cardTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    fontWeight: 950,
    color: '#7a1a24',
  },
  cardValue: {
    marginTop: 10,
    fontSize: 38,
    lineHeight: 1,
    fontWeight: 950,
    color: '#b5121b',
  },
  cardSub: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 1.35,
    color: '#6b5d64',
    fontWeight: 700,
  },
  percentBox: {
    maxWidth: 1180,
    margin: '18px auto 0',
    display: 'flex',
    justifyContent: 'space-between',
    gap: 20,
    alignItems: 'center',
    background: '#111827',
    color: '#fff',
    borderRadius: 28,
    padding: 24,
    boxShadow: '0 22px 60px rgba(17, 24, 39, 0.18)',
  },
  percentLabel: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: 950,
    opacity: 0.86,
  },
  percentValue: {
    marginTop: 8,
    fontSize: 54,
    lineHeight: 1,
    fontWeight: 950,
  },
  percentText: {
    margin: '10px 0 0',
    maxWidth: 680,
    color: 'rgba(255,255,255,0.78)',
    fontWeight: 700,
    lineHeight: 1.45,
  },
  formulaBox: {
    minWidth: 220,
    background: 'rgba(255,255,255,0.10)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 20,
    padding: 16,
    display: 'grid',
    gap: 8,
    fontWeight: 850,
  },
  noteBox: {
    maxWidth: 1180,
    margin: '18px auto 0',
    background: '#fff7ed',
    border: '1px solid #fed7aa',
    color: '#7c2d12',
    borderRadius: 18,
    padding: 14,
    fontSize: 14,
    lineHeight: 1.45,
  },
  tablesWrap: {
    maxWidth: 1180,
    margin: '18px auto 0',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
    gap: 16,
  },
  fullTableWrap: {
    maxWidth: 1180,
    margin: '18px auto 0',
  },
  tableCard: {
    background: '#fff',
    borderRadius: 24,
    padding: 18,
    boxShadow: '0 18px 45px rgba(80, 0, 20, 0.08)',
    border: '1px solid rgba(140, 0, 35, 0.08)',
  },
  sectionTitle: {
    margin: '0 0 8px',
    fontSize: 17,
    color: '#2b1720',
  },
  sectionText: {
    margin: '0 0 14px',
    color: '#6b5d64',
    fontSize: 13,
    lineHeight: 1.45,
    fontWeight: 700,
  },
  tableScroll: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  th: {
    textAlign: 'left',
    padding: '10px 8px',
    borderBottom: '1px solid #eee',
    color: '#6b5d64',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  thRight: {
    textAlign: 'right',
    padding: '10px 8px',
    borderBottom: '1px solid #eee',
    color: '#6b5d64',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  td: {
    padding: '10px 8px',
    borderBottom: '1px solid #f2f2f2',
    color: '#3f3439',
    whiteSpace: 'nowrap',
  },
  tdStrong: {
    padding: '10px 8px',
    borderBottom: '1px solid #f2f2f2',
    color: '#24151b',
    fontWeight: 850,
    minWidth: 180,
  },
  tdRight: {
    padding: '10px 8px',
    borderBottom: '1px solid #f2f2f2',
    color: '#b5121b',
    fontWeight: 950,
    textAlign: 'right',
    whiteSpace: 'nowrap',
  },
  empty: {
    padding: 18,
    borderRadius: 16,
    background: '#f9fafb',
    color: '#6b7280',
    fontWeight: 800,
  },
}
