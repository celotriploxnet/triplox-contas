'use client'

import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { getBytes, ref } from 'firebase/storage'
import * as XLSX from 'xlsx'

import { auth, storage } from '@/lib/firebase'

/* =========================
   TYPES
   ========================= */
type Expresso = {
  chave: string
  nome: string
  municipio: string
  agencia: string
  pacb: string
  trx: number
  status: string
  dtCertificacao?: Date | null
}

/* =========================
   HELPERS
   ========================= */
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

function parseDateBR(v: any): Date | null {
  if (!v) return null

  // número do Excel
  if (typeof v === 'number') {
    const dc = XLSX.SSF.parse_date_code(v)
    if (dc?.y && dc?.m && dc?.d) return new Date(dc.y, dc.m - 1, dc.d)
  }

  const s = toStr(v)
  if (!s) return null

  // dd/mm/aaaa
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]))

  // fallback
  const dt = new Date(s)
  return Number.isNaN(dt.getTime()) ? null : dt
}

function addYears(date: Date, years: number) {
  const d = new Date(date.getTime())
  d.setFullYear(d.getFullYear() + years)
  return d
}

function addMonths(date: Date, months: number) {
  const d = new Date(date.getTime())
  d.setMonth(d.getMonth() + months)
  return d
}

function formatDateBR(d?: Date | null) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/**
 * Regras:
 * - Vencida: dt_certificacao + 5 anos < hoje
 * - Próxima (3 meses): hoje <= dt+5anos <= hoje+3meses
 */
function classifyCert(dt: Date | null) {
  if (!dt) return 'sem-data' as const
  const vencAt = addYears(dt, 5)
  const now = new Date()
  const in3m = addMonths(now, 3)

  if (vencAt.getTime() < now.getTime()) return 'vencida' as const
  if (vencAt.getTime() >= now.getTime() && vencAt.getTime() <= in3m.getTime()) return 'proxima' as const
  return 'ok' as const
}

/* =========================
   UI (botão pequeno)
   ========================= */
function MiniButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode
  onClick?: () => void
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        borderRadius: 999,
        padding: '.42rem .65rem',
        fontSize: '.82rem',
        fontWeight: 900,
        border: '1px solid rgba(15,15,25,.16)',
        background: 'rgba(255,255,255,.75)',
        color: 'rgba(16,16,24,.92)',
        boxShadow: '0 10px 18px rgba(10,10,20,.06)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

/* =========================
   WHATSAPP MESSAGE
   ========================= */
function buildWhatsAppMessage(e: Expresso, tipo: 'vencida' | 'proxima') {
  const vencEm = e.dtCertificacao ? addYears(e.dtCertificacao, 5) : null

  const base = [
    tipo === 'vencida' ? '🚨 *CERTIFICAÇÃO VENCIDA*' : '⏰ *CERTIFICAÇÃO PRÓXIMA DE VENCER*',
    '',
    `🏪 *Expresso:* ${e.nome || '—'}`,
    `🔑 *Chave:* ${e.chave || '—'}`,
    `🏦 *Agência/PACB:* ${e.agencia || '—'} / ${e.pacb || '—'}`,
    `📍 *Município:* ${e.municipio || '—'}`,
    '',
    `💳 *TRX:* ${e.trx}`,
    `📌 *Status:* ${e.status || '—'}`,
    '',
    `📅 *Certificado em:* ${formatDateBR(e.dtCertificacao)}`,
    tipo === 'vencida'
      ? `⛔ *Vencido em:* ${formatDateBR(vencEm)}`
      : `⌛ *Vence em:* ${formatDateBR(vencEm)}`,
    '',
    tipo === 'vencida'
      ? '⚠️ Precisamos agendar a recertificação com urgência.'
      : '📣 Atenção: favor programar a renovação da certificação.',
  ]

  return base.join('\n')
}

async function copyWhatsApp(msg: string) {
  await navigator.clipboard.writeText(msg)
}

/* =========================
   PAGE
   ========================= */
export default function CertificacaoVencidaPage() {
  const CSV_PATH = 'base-lojas/banco.csv'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [all, setAll] = useState<Expresso[]>([])
  const [info, setInfo] = useState<string>('')

  async function loadData() {
    try {
      setLoading(true)
      setError(null)
      setInfo('')

      const bytes = await getBytes(ref(storage, CSV_PATH))
      const wb = XLSX.read(toUint8(bytes), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

      const list: Expresso[] = rows
        .map((r) => {
          const trx = toNumber(r.qtd_TrxContabil)
          const status = toStr(r.STATUS_ANALISE)
          const dtCert = parseDateBR(r.dt_certificacao)

          const agPacb = toStr(r.ag_pacb || r['AGENCIA/PACB'] || '')
          const [agencia, pacb] = agPacb.split('/').map((x) => x?.trim() || '')

          return {
            chave: toStr(r.chave_loja),
            nome: toStr(r.nome_loja),
            municipio: toStr(r.municipio),
            agencia,
            pacb,
            trx,
            status,
            dtCertificacao: dtCert,
          }
        })
        .filter((e) => {
          if (e.trx === 0) return false
          if (!e.dtCertificacao) return false
          if (e.status.toLowerCase() !== 'treinado') return false

          const c = classifyCert(e.dtCertificacao)
          return c === 'vencida' || c === 'proxima'
        })

      setAll(list)
      setInfo('Lista carregada ✅')
    } catch (e: any) {
      console.error(e)
      setError(`Erro ao carregar dados (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) loadData()
    })
    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { vencidos, proximos } = useMemo(() => {
    const v: Expresso[] = []
    const p: Expresso[] = []

    for (const e of all) {
      const c = classifyCert(e.dtCertificacao || null)
      if (c === 'vencida') v.push(e)
      if (c === 'proxima') p.push(e)
    }

    v.sort((a, b) => (a.dtCertificacao?.getTime() || 0) - (b.dtCertificacao?.getTime() || 0))
    p.sort((a, b) => {
      const va = a.dtCertificacao ? addYears(a.dtCertificacao, 5).getTime() : 0
      const vb = b.dtCertificacao ? addYears(b.dtCertificacao, 5).getTime() : 0
      return va - vb
    })

    return { vencidos: v, proximos: p }
  }, [all])

  async function handleCopy(e: Expresso, tipo: 'vencida' | 'proxima') {
    try {
      const msg = buildWhatsAppMessage(e, tipo)
      await copyWhatsApp(msg)
      setInfo('Mensagem copiada ✅ (cole no WhatsApp)')
      setError(null)
    } catch (err) {
      console.error(err)
      setError('Não consegui copiar a mensagem.')
    }
  }

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <span className="pill">Expressos</span>
        <h1 className="h1" style={{ marginTop: '.75rem' }}>
          Certificação — Vencida e Próxima de Vencer
        </h1>
        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          Apenas <b>Treinados</b> com <b>TRX ≠ 0</b> e certificação vencida (5+ anos) ou vencendo em até 3 meses.
        </p>
      </div>

      {/* RESUMO */}
      <div className="card">
        <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="pill">Resumo</span>

          <button className="btn-primary" onClick={loadData} disabled={loading} style={{ marginLeft: 'auto' }}>
            {loading ? 'Atualizando...' : 'Atualizar'}
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
              Expressos vencidos
            </div>
            <div style={{ fontWeight: 900, fontSize: '1.45rem' }}>{vencidos.length}</div>
          </div>

          <div className="card-soft">
            <div className="p-muted" style={{ fontSize: 12 }}>
              Próximos de vencer (até 3 meses)
            </div>
            <div style={{ fontWeight: 900, fontSize: '1.45rem' }}>{proximos.length}</div>
          </div>

          <div className="card-soft">
            <div className="p-muted" style={{ fontSize: 12 }}>
              Total (vencidos + próximos)
            </div>
            <div style={{ fontWeight: 900, fontSize: '1.45rem' }}>{vencidos.length + proximos.length}</div>
          </div>
        </div>

        {info && (
          <div style={{ marginTop: '.9rem' }}>
            <span className="pill">{info}</span>
          </div>
        )}

        {error && (
          <div className="card-soft" style={{ marginTop: '.9rem', borderColor: 'rgba(214,31,44,.25)' }}>
            <p className="p-muted" style={{ color: 'rgba(214,31,44,.95)', fontWeight: 800 }}>
              {error}
            </p>
          </div>
        )}
      </div>

      {/* VENCIDOS */}
      <div className="card" style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span
            className="pill"
            style={{
              background: 'rgba(214,31,44,.10)',
              border: '1px solid rgba(214,31,44,.25)',
              color: '#b91c1c',
            }}
          >
            Vencidos
          </span>
          <div className="h2">Certificação vencida (5+ anos)</div>
        </div>

        {loading && <p className="p-muted">Carregando…</p>}
        {!loading && vencidos.length === 0 && <p className="p-muted">Nenhum expresso vencido encontrado.</p>}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem',
          }}
        >
          {vencidos.map((e) => {
            const vencEm = e.dtCertificacao ? addYears(e.dtCertificacao, 5) : null
            return (
              <div key={e.chave} className="card-soft" style={{ display: 'grid', gap: '.35rem' }}>
                <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '1.05rem' }}>{e.nome || '—'}</strong>

                  {/* ✅ botão pequeno whatsapp */}
                  <MiniButton
                    onClick={() => handleCopy(e, 'vencida')}
                    title="Copiar mensagem para WhatsApp"
                  >
                    📲 WhatsApp
                  </MiniButton>
                </div>

                <div className="p-muted">
                  Chave: <b>{e.chave || '—'}</b>
                </div>
                <div className="p-muted">Município: {e.municipio || '—'}</div>
                <div className="p-muted">
                  Agência / PACB: {e.agencia || '—'} / {e.pacb || '—'}
                </div>

                <div style={{ marginTop: '.45rem', display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
                  <span className="pill">TRX: {e.trx}</span>
                  <span className="pill">Status: {e.status || '—'}</span>
                  <span
                    className="pill"
                    style={{
                      background: 'rgba(214,31,44,.10)',
                      border: '1px solid rgba(214,31,44,.25)',
                      color: '#b91c1c',
                    }}
                  >
                    Certificação vencida
                  </span>
                  <span className="pill">Certificado em: {formatDateBR(e.dtCertificacao)}</span>
                  <span className="pill">Venceu em: {formatDateBR(vencEm)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* PRÓXIMOS */}
      <div className="card" style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span
            className="pill"
            style={{
              background: 'rgba(122,30,161,.10)',
              border: '1px solid rgba(122,30,161,.25)',
              color: '#6b21a8',
            }}
          >
            Próximos
          </span>
          <div className="h2">Vencendo em até 3 meses</div>
        </div>

        {loading && <p className="p-muted">Carregando…</p>}
        {!loading && proximos.length === 0 && <p className="p-muted">Nenhum expresso próximo de vencer encontrado.</p>}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem',
          }}
        >
          {proximos.map((e) => {
            const vencEm = e.dtCertificacao ? addYears(e.dtCertificacao, 5) : null
            return (
              <div key={e.chave} className="card-soft" style={{ display: 'grid', gap: '.35rem' }}>
                <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '1.05rem' }}>{e.nome || '—'}</strong>

                  {/* ✅ botão pequeno whatsapp */}
                  <MiniButton
                    onClick={() => handleCopy(e, 'proxima')}
                    title="Copiar mensagem para WhatsApp"
                  >
                    📲 WhatsApp
                  </MiniButton>
                </div>

                <div className="p-muted">
                  Chave: <b>{e.chave || '—'}</b>
                </div>
                <div className="p-muted">Município: {e.municipio || '—'}</div>
                <div className="p-muted">
                  Agência / PACB: {e.agencia || '—'} / {e.pacb || '—'}
                </div>

                <div style={{ marginTop: '.45rem', display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
                  <span className="pill">TRX: {e.trx}</span>
                  <span className="pill">Status: {e.status || '—'}</span>
                  <span
                    className="pill"
                    style={{
                      background: 'rgba(122,30,161,.10)',
                      border: '1px solid rgba(122,30,161,.25)',
                      color: '#6b21a8',
                    }}
                  >
                    Próximo de vencer
                  </span>
                  <span className="pill">Certificado em: {formatDateBR(e.dtCertificacao)}</span>
                  <span className="pill">Vence em: {formatDateBR(vencEm)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}