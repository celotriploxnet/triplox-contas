'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { getBytes, ref } from 'firebase/storage'
import * as XLSX from 'xlsx'

import { auth, storage } from '@/lib/firebase'

const CSV_PATH = 'base-lojas/banco-junho-2026.csv'

/* =========================
   TYPES
   ========================= */
type ExpressoContabil = {
  chave: string
  nome: string
  municipio: string
  agencia: string
  pacb: string
  trx: number
  status: string
}

/* =========================
   HELPERS
   ========================= */
function toStr(v: any) {
  return v === null || v === undefined ? '' : String(v).trim()
}

function toNumber(v: any) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0

  let s = String(v ?? '')
    .trim()
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/[^\d,.-]/g, '')
  if (!s) return 0

  const hasComma = s.includes(',')
  const hasDot = s.includes('.')
  if (hasComma && hasDot) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
  } else if (hasComma) {
    s = s.replace(',', '.')
  } else if (hasDot) {
    const parts = s.split('.')
    const looksLikeThousands = parts.length > 1 && parts.slice(1).every((part) => part.length === 3)
    if (looksLikeThousands) s = s.replace(/\./g, '')
  }

  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

function normalizeKey(k: string) {
  return k
    .replaceAll('Ã³', 'ó')
    .replaceAll('Ã£', 'ã')
    .replaceAll('Ã§', 'ç')
    .replaceAll('Ãº', 'ú')
    .replaceAll('Ã¡', 'á')
    .replaceAll('Ã©', 'é')
    .replaceAll('Ã­', 'í')
    .replaceAll('Ãª', 'ê')
    .replaceAll('Ã´', 'ô')
    .replaceAll('Â', '')
    .trim()
    .toLowerCase()
}

function toUint8(bytes: any): Uint8Array {
  if (bytes instanceof Uint8Array) return bytes
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes)
  return new Uint8Array(bytes)
}

function statusBucket(statusRaw: string): 'transacional' | 'treinado' | 'outro' {
  const s = (statusRaw || '').toLowerCase()
  if (!s) return 'outro'
  if (s.includes('transacion')) return 'transacional'
  if (s.includes('treinad')) return 'treinado'
  return 'outro'
}

function ordenarPorTrxDesc(a: ExpressoContabil, b: ExpressoContabil) {
  const diferenca = Number(b.trx || 0) - Number(a.trx || 0)
  return diferenca || a.nome.localeCompare(b.nome, 'pt-BR')
}

function LightButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        borderRadius: 999,
        padding: '.52rem .75rem',
        fontSize: '.85rem',
        fontWeight: 900,
        border: '1px solid rgba(15,15,25,.18)',
        background: 'rgba(255,255,255,.88)',
        color: 'rgba(16,16,24,.92)',
        boxShadow: '0 10px 18px rgba(10,10,20,.06)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.65 : 1,
      }}
    >
      {children}
    </button>
  )
}

function buildWhatsAppMessage(e: ExpressoContabil) {
  return [
    '📊 *Expresso Somente Transacionando*',
    '',
    `🏪 *Nome:* ${e.nome || '—'}`,
    `🔑 *Chave:* ${e.chave || '—'}`,
    `📍 *Município:* ${e.municipio || '—'}`,
    `🏦 *Agência/PACB:* ${e.agencia || '—'} / ${e.pacb || '—'}`,
    '',
    `💳 *TRX Contábil:* ${String(e.trx ?? 0)}`,
    `✅ *Status:* ${e.status || '—'}`,
  ].join('\n')
}

/* =========================
   PAGE
   ========================= */
export default function TransacionandoPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState('')

  const [expressos, setExpressos] = useState<ExpressoContabil[]>([])

  // filtros
  const [fAgencia, setFAgencia] = useState('')
  const [fStatus, setFStatus] = useState<'todos' | 'transacional' | 'treinado'>('todos')
  const [q, setQ] = useState('')

  /* =========================
     AÇÕES
     ========================= */
  function irParaReportar(e: ExpressoContabil) {
    const params = new URLSearchParams({
      chaveLoja: e.chave || '',
      nomeExpresso: e.nome || '',
      agencia: e.agencia || '',
      pacb: e.pacb || '',
      status: e.status || '',
    })

    router.push(`/dashboard/reportar?${params.toString()}`)
  }

  function irParaArvoreCronologica(e: ExpressoContabil) {
    router.push(`/dashboard/arvorecronologica/${encodeURIComponent(e.chave)}`)
  }

  async function copyWhatsApp(e: ExpressoContabil) {
    try {
      const msg = buildWhatsAppMessage(e)
      await navigator.clipboard.writeText(msg)
      setInfo('Mensagem copiada ✅ (cole no WhatsApp)')
      setError(null)
    } catch (err) {
      console.error(err)
      setError('Não consegui copiar a mensagem.')
    }
  }

  /* =========================
     LOAD CSV
     ========================= */
  async function loadBase() {
    try {
      setLoading(true)
      setError(null)
      setInfo('')

      const bytes = await getBytes(ref(storage, CSV_PATH))
      const text = new TextDecoder('utf-8').decode(toUint8(bytes))
      const wb = XLSX.read(text, { type: 'string' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
      const rows = rawRows.map((row) => {
        const normalized: Record<string, any> = {}
        for (const [key, value] of Object.entries(row)) normalized[normalizeKey(key)] = value
        return normalized
      })

      /**
       * REGRA:
       * - qtd_TrxContabil > 0
       * - TODOS os outros indicadores listados = 0
       */
      const list: ExpressoContabil[] = rows
        .filter((r) => {
          const trx = toNumber(r.qtd_trxcontabil || r.qtd_trx_contabil || r.qtd_trx)
          if (trx <= 0 || !toStr(r.chave_loja || r.chave)) return false

          // Usa os indicadores que a página Geral Junho/2026 lê desta mesma base.
          const outrosCampos = [
            r.qtd_contas,
            r.qtd_contas_com_deposito,
            r.qtd_cesta_serv,
            r.qtd_mobilidade,
            r.qtd_mtoken,
            r.qtd_cartao_emitido,
            r.vlr_ches,
            r.qtd_chesp_contratado,
            r.qtd_lime_ab_conta,
            r.qtd_lime,
            r.vlr_lime,
            r.qtd_consignado,
            r.vlr_consignado,
            r.vlr_consignado_total,
            r.vlr_consignado_inss,
            r.vlr_consignado_pub,
            r.vlr_consignado_priv,
            r.vlr_credito_parcel,
            r.qtd_credito_parcel,
            r.qtd_credito_parcel_dtlh,
            r.qtd_credito_parcel_dtlhes,
            r.qtd_credito_parcelado_dtlhes,
            r.qtd_consorcio,
            r.qtd_contas_pj,
            r.qtd_contas_folha,
            r.qtd_microsseguro,
            r.qtd_super_protegido,
            r.qtd_micro_vivavida,
            r.qtd_plano_odonto,
            r.qtd_seg_residencial,
            r.qtd_seg_cartao_deb,
            r.qtd_exp_sorte,
            r.vlr_exp_sorte,
          ]

          return outrosCampos.every((v) => toNumber(v) === 0)
        })
        .map((r) => {
          const agPacb = toStr(r.ag_pacb || r['agencia/pacb'] || '')
          const [agencia, pacb] = agPacb.split('/').map((x) => (x ? x.trim() : ''))

          return {
            chave: toStr(r.chave_loja || r.chave),
            nome: toStr(r.nome_loja || r.nome),
            municipio: toStr(r.municipio),
            agencia: agencia || '',
            pacb: pacb || '',
            trx: toNumber(r.qtd_trxcontabil || r.qtd_trx_contabil || r.qtd_trx),
            status: toStr(r.status_analise || r.status) || '—',
          }
        })

      setExpressos(list.sort(ordenarPorTrxDesc))
    } catch (e: any) {
      console.error(e)
      setError(`Erro ao carregar base. (${e?.code || 'sem-code'})`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) loadBase()
    })
    return () => unsub()
  }, [])

  const agencias = useMemo(() => {
    const set = new Set<string>()
    for (const e of expressos) if (e.agencia) set.add(e.agencia)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [expressos])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()

    const resultado = expressos.filter((e) => {
      if (fAgencia && e.agencia !== fAgencia) return false

      if (fStatus !== 'todos') {
        const b = statusBucket(e.status)
        if (b !== fStatus) return false
      }

      if (term) {
        const hay = `${e.nome} ${e.chave}`.toLowerCase()
        if (!hay.includes(term)) return false
      }

      return true
    })

    return resultado.sort(ordenarPorTrxDesc)
  }, [expressos, fAgencia, fStatus, q])

  const totalFiltrado = filtered.length

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <span className="pill">Expressos</span>
        <h1 className="h1" style={{ marginTop: '.75rem' }}>
          Expressos Somente Transacionando
        </h1>
        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          Expressos Transacionando e que não fazem nenhum produto.
        </p>
      </div>

      {/* ✅ RESUMO */}
      <div className="card">
        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="pill">Resumo</span>
          <div className="h2">Total encontrado</div>
          <span className="pill">Ordem: TRX maior para menor</span>

          <button
            type="button"
            className="btn-primary"
            onClick={loadBase}
            disabled={loading}
            style={{ marginLeft: 'auto' }}
          >
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        <div style={{ marginTop: '1rem' }} className="card-soft">
          <div className="p-muted" style={{ fontSize: 12 }}>
            Total de expressos (com filtros aplicados)
          </div>
          <div style={{ fontWeight: 900, fontSize: '1.4rem' }}>{totalFiltrado}</div>
        </div>

        {info && (
          <div style={{ marginTop: '.85rem' }}>
            <span className="pill">{info}</span>
          </div>
        )}

        {error && (
          <div className="card-soft" style={{ marginTop: '.85rem', borderColor: 'rgba(214,31,44,.25)' }}>
            <p className="p-muted" style={{ color: 'rgba(214,31,44,.95)', fontWeight: 800 }}>
              {error}
            </p>
          </div>
        )}
      </div>

      {/* ✅ FILTROS */}
      <div className="card">
        <div style={{ display: 'grid', gap: '.75rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '.75rem',
            }}
          >
            <div>
              <div className="label">Buscar (Nome do Expresso ou Chave Loja)</div>
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
              <div className="label">Status</div>
              <select className="input" value={fStatus} onChange={(e) => setFStatus(e.target.value as any)}>
                <option value="todos">Todos</option>
                <option value="transacional">Transacional</option>
                <option value="treinado">Treinado</option>
              </select>
              <div className="p-muted" style={{ marginTop: '.35rem', fontSize: 12 }}>
                Baseado no campo <b>STATUS_ANALISE</b>.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LISTA */}
      {loading && <p className="p-muted">Carregando…</p>}

      {!loading && filtered.length === 0 && <p className="p-muted">Nenhum resultado com os filtros atuais.</p>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem',
        }}
      >
        {filtered.map((e) => (
          <div key={e.chave} className="card-soft">
            <strong style={{ fontSize: '1.05rem' }}>{e.nome || '—'}</strong>

            <div className="p-muted" style={{ marginTop: '.25rem' }}>
              Chave: <b>{e.chave || '—'}</b>
            </div>

            <div className="p-muted">Município: {e.municipio || '—'}</div>

            <div className="p-muted">
              Agência / PACB: {e.agencia || '—'} / {e.pacb || '—'}
            </div>

            <div style={{ marginTop: '.5rem', display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
              <span className="pill">TRX Contábil: {e.trx}</span>
              <span className="pill">Status: {e.status || '—'}</span>
            </div>

            <div style={{ marginTop: '.85rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
              <LightButton onClick={() => irParaArvoreCronologica(e)} title="Árvore Cronológica">
                🌳 Árvore
              </LightButton>

              <LightButton onClick={() => irParaReportar(e)} title="Reportar">
                📕 Reportar
              </LightButton>

              <LightButton onClick={() => copyWhatsApp(e)} title="Copiar para WhatsApp">
                📤 WhatsApp
              </LightButton>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
