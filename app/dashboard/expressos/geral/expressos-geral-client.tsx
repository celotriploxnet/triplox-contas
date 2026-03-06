'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { getBytes, ref } from 'firebase/storage'
import * as XLSX from 'xlsx'

import { auth, storage } from '@/lib/firebase'

type ExpressoRow = {
  chave: string
  nome: string
  municipio: string
  uf: string
  agencia: string
  pacb: string
  statusAnalise: string
  dtCertificacaoRaw: string
  dtCertificacao: Date | null
  trx: number
  bloqueioTexto: string // BLOQUEADO / DESBLOQUEADO / —
  isBloqueado: boolean
}

function toStr(v: any) {
  return v === null || v === undefined ? '' : String(v).trim()
}

function toNumber(v: any) {
  const s = String(v ?? '').trim()
  if (!s) return 0
  const n = Number(s.replace(/\./g, '').replace(/,/g, '.'))
  return Number.isFinite(n) ? n : 0
}

function toUint8(bytes: any): Uint8Array {
  if (bytes instanceof Uint8Array) return bytes
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes)
  return new Uint8Array(bytes)
}

// dd/mm/aaaa -> Date
function parsePtBrDate(raw: string): Date | null {
  const s = toStr(raw)
  if (!s) return null
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const dd = Number(m[1])
  const mm = Number(m[2])
  const yyyy = Number(m[3])
  if (!dd || !mm || !yyyy) return null
  const d = new Date(yyyy, mm - 1, dd)
  return Number.isNaN(d.getTime()) ? null : d
}

function statusBucket(statusRaw: string): 'transacional' | 'treinado' | 'outro' {
  const s = (statusRaw || '').toLowerCase()
  if (s.includes('transacion')) return 'transacional'
  if (s.includes('treinad')) return 'treinado'
  return 'outro'
}

// ✅ REGRA CERTA (não use includes!)
function parseBloqueadoTexto(v: any) {
  const raw = toStr(v)
  const norm = raw.trim().toLowerCase()

  const isBloqueado = norm === 'bloqueado'
  const isDesbloqueado = norm === 'desbloqueado'

  const texto =
    isBloqueado ? 'BLOQUEADO' : isDesbloqueado ? 'DESBLOQUEADO' : raw ? raw.toUpperCase() : '—'

  return { texto, isBloqueado }
}

function Pill({
  children,
  tone = 'gray',
}: {
  children: React.ReactNode
  tone?: 'gray' | 'green' | 'red' | 'yellow'
}) {
  const styleMap: Record<string, React.CSSProperties> = {
    green: {
      background: 'rgba(34,197,94,.12)',
      border: '1px solid rgba(34,197,94,.25)',
      color: 'rgba(21,128,61,.95)',
    },
    red: {
      background: 'rgba(214,31,44,.12)',
      border: '1px solid rgba(214,31,44,.25)',
      color: 'rgba(214,31,44,.95)',
    },
    yellow: {
      background: 'rgba(234,179,8,.12)',
      border: '1px solid rgba(234,179,8,.25)',
      color: 'rgba(161,98,7,.95)',
    },
    gray: {
      background: 'rgba(15,15,25,.06)',
      border: '1px solid rgba(15,15,25,.10)',
      color: 'rgba(16,16,24,.70)',
    },
  }

  return (
    <span className="pill" style={styleMap[tone]}>
      {children}
    </span>
  )
}

export default function ExpressosGeralPage() {
  const router = useRouter()
  const CSV_PATH = 'base-lojas/banco.csv'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [rows, setRows] = useState<ExpressoRow[]>([])

  // filtros
  const [q, setQ] = useState('')
  const [fAgencia, setFAgencia] = useState('')
  const [fCert, setFCert] = useState<'todas' | 'nao-certificado' | 'certificado' | 'vencido'>('todas')
  const [fTrx, setFTrx] = useState<'todos' | '0' | '1-199' | '200+'>('todos')

  async function loadBase() {
    try {
      setLoading(true)
      setError(null)

      const bytesAny = await getBytes(ref(storage, CSV_PATH))
      const u8 = toUint8(bytesAny)

      // ✅ seu CSV é latin1 (iso-8859-1)
      const text = new TextDecoder('iso-8859-1').decode(u8)

      const wb = XLSX.read(text, { type: 'string' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

      const mapped: ExpressoRow[] = raw.map((r) => {
        const agPacb = toStr(r.ag_pacb || r.AG_PACB || r['AGENCIA/PACB'] || '')
        const [agencia, pacb] = agPacb.split('/').map((x) => (x ? x.trim() : ''))

        const dtCertRaw = toStr(r.dt_certificacao || r.DT_CERTIFICACAO || r['dt_certificacao'] || '')
        const dtCert = parsePtBrDate(dtCertRaw)

        const { texto: bloqueioTexto, isBloqueado } = parseBloqueadoTexto(
          r.BLOQUEADO ?? r.bloqueado ?? r.FL_BLOQUEADO ?? r.fl_bloqueado ?? ''
        )

        return {
          chave: toStr(r.chave_loja || r.CHAVE_LOJA || ''),
          nome: toStr(r.nome_loja || r.NOME_LOJA || ''),
          municipio: toStr(r.municipio || r.MUNICIPIO || r.Municipio || ''),
          uf: toStr(r.uf || r.UF || ''),
          agencia: agencia || '',
          pacb: pacb || '',
          statusAnalise: toStr(r.STATUS_ANALISE || r.status_analise || '') || '—',
          dtCertificacaoRaw: dtCertRaw,
          dtCertificacao: dtCert,
          trx: toNumber(r.qtd_TrxContabil),
          bloqueioTexto,
          isBloqueado,
        }
      })

      setRows(mapped)
    } catch (e: any) {
      console.error(e)
      setError(`Falha ao carregar base. (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.push('/login')
      else loadBase()
    })
    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const agencias = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) if (r.agencia) set.add(r.agencia)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [rows])

  // datas para vencimento (5 anos)
  const now = new Date()
  const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate())

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()

    return rows.filter((r) => {
      // agência
      if (fAgencia && r.agencia !== fAgencia) return false

      // certificação
      if (fCert !== 'todas') {
        const hasCert = !!r.dtCertificacao
        const vencida = r.dtCertificacao ? r.dtCertificacao < fiveYearsAgo : false

        if (fCert === 'nao-certificado' && hasCert) return false
        if (fCert === 'certificado' && !hasCert) return false
        if (fCert === 'vencido' && !vencida) return false
      }

      // trx bucket
      if (fTrx !== 'todos') {
        if (fTrx === '0' && r.trx !== 0) return false
        if (fTrx === '1-199' && !(r.trx >= 1 && r.trx <= 199)) return false
        if (fTrx === '200+' && !(r.trx >= 200)) return false
      }

      // busca (nome/chave)
      if (term) {
        const hay = `${r.nome} ${r.chave}`.toLowerCase()
        if (!hay.includes(term)) return false
      }

      return true
    })
  }, [rows, q, fAgencia, fCert, fTrx, fiveYearsAgo])

  // ✅ contadores gerais (sobre TODA base carregada, não apenas filtrado)
  const totals = useMemo(() => {
    const total = rows.length
    let transacional = 0
    let treinado = 0
    let semCert = 0
    let vencida = 0

    for (const r of rows) {
      const b = statusBucket(r.statusAnalise)
      if (b === 'transacional') transacional++
      if (b === 'treinado') treinado++

      if (!r.dtCertificacao) semCert++
      else if (r.dtCertificacao < fiveYearsAgo) vencida++
    }

    return { total, transacional, treinado, semCert, vencida }
  }, [rows, fiveYearsAgo])

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <span className="pill">Expressos</span>
        <h1 className="h1" style={{ marginTop: '.75rem' }}>
          📊 Expresso Geral (visão completa)
        </h1>
        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          Base completa de expressos com filtros e contadores (status, certificação e transações).
        </p>
      </div>

      {/* ✅ BARRA DE TOTAIS */}
      <div className="card">
        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="pill">Resumo</span>
          <div className="h2">Totais da base</div>

          <button
            type="button"
            className="btn-primary"
            onClick={loadBase}
            disabled={loading}
            style={{ marginLeft: 'auto' }}
          >
            {loading ? 'Atualizando...' : 'Atualizar base'}
          </button>
        </div>

        <div
          style={{
            marginTop: '1rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          <div className="card-soft">
            <div className="p-muted" style={{ fontSize: 12 }}>
              Total de Expressos
            </div>
            <div style={{ fontWeight: 900, fontSize: '1.4rem' }}>{totals.total}</div>
          </div>

          <div className="card-soft">
            <div className="p-muted" style={{ fontSize: 12 }}>
              Status: Transacional
            </div>
            <div style={{ fontWeight: 900, fontSize: '1.4rem' }}>{totals.transacional}</div>
          </div>

          <div className="card-soft">
            <div className="p-muted" style={{ fontSize: 12 }}>
              Status: Treinado
            </div>
            <div style={{ fontWeight: 900, fontSize: '1.4rem' }}>{totals.treinado}</div>
          </div>

          <div className="card-soft">
            <div className="p-muted" style={{ fontSize: 12 }}>
              Sem certificação
            </div>
            <div style={{ fontWeight: 900, fontSize: '1.4rem' }}>{totals.semCert}</div>
          </div>

          <div className="card-soft">
            <div className="p-muted" style={{ fontSize: 12 }}>
              Certificação vencida (5+ anos)
            </div>
            <div style={{ fontWeight: 900, fontSize: '1.4rem' }}>{totals.vencida}</div>
          </div>
        </div>

        {error && (
          <div className="card-soft" style={{ marginTop: '.85rem', borderColor: 'rgba(214,31,44,.25)' }}>
            <p className="p-muted" style={{ color: 'rgba(214,31,44,.95)', fontWeight: 800 }}>
              {error}
            </p>
          </div>
        )}
      </div>

      {/* ✅ FILTROS */}
      <div className="card" style={{ display: 'grid', gap: '.85rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '.75rem' }}>
          <div>
            <div className="label">Buscar (Nome ou Chave Loja)</div>
            <input
              className="input"
              placeholder="Ex.: 12345 ou Mercado Divino..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div>
            <div className="label">Filtrar por Agência</div>
            <select className="input" value={fAgencia} onChange={(e) => setFAgencia(e.target.value)}>
              <option value="">Todas</option>
              {agencias.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="label">Certificação (dt_certificacao)</div>
            <select className="input" value={fCert} onChange={(e) => setFCert(e.target.value as any)}>
              <option value="todas">Todas</option>
              <option value="nao-certificado">Não certificado (vazio)</option>
              <option value="certificado">Certificado (com data)</option>
              <option value="vencido">Certificação vencida (5+ anos)</option>
            </select>
          </div>

          <div>
            <div className="label">Transações (qtd_TrxContabil)</div>
            <select className="input" value={fTrx} onChange={(e) => setFTrx(e.target.value as any)}>
              <option value="todos">Todos</option>
              <option value="0">0</option>
              <option value="1-199">1–199</option>
              <option value="200+">200+</option>
            </select>
          </div>
        </div>

        <div className="card-soft" style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Pill tone="gray">Filtrados: {filtered.length}</Pill>
          <span className="p-muted" style={{ fontSize: 13 }}>
            Dica: “BLOQUEADO” agora respeita exatamente o valor do CSV (BLOQUEADO / DESBLOQUEADO).
          </span>
        </div>
      </div>

      {/* LISTA */}
      {loading && <p className="p-muted">Carregando…</p>}

      {!loading && filtered.length === 0 && <p className="p-muted">Nenhum resultado com os filtros atuais.</p>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1rem',
        }}
      >
        {filtered.map((r) => (
          <div key={r.chave || `${r.nome}-${r.agencia}-${r.pacb}`} className="card-soft">
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <strong style={{ fontSize: '1.05rem' }}>{r.nome || '—'}</strong>

              {/* ✅ BLOQUEIO */}
              <Pill tone={r.isBloqueado ? 'red' : 'green'}>{r.bloqueioTexto}</Pill>

              <Pill tone="gray">{r.statusAnalise || '—'}</Pill>
            </div>

            <div className="p-muted" style={{ marginTop: '.25rem' }}>
              Chave: <b>{r.chave || '—'}</b>
            </div>

            <div className="p-muted">
              Município: {r.municipio || '—'} {r.uf ? `- ${r.uf}` : ''}
            </div>

            <div className="p-muted">
              Agência / PACB: {r.agencia || '—'} / {r.pacb || '—'}
            </div>

            <div className="p-muted">
              Certificação: <b>{r.dtCertificacaoRaw || '—'}</b>
            </div>

            <div style={{ marginTop: '.5rem', display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
              <span className="pill">TRX: {r.trx}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}