'use client'

import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { getBytes, ref } from 'firebase/storage'
import * as XLSX from 'xlsx'

import { auth, storage } from '@/lib/firebase'

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

function statusBucket(statusRaw: string): 'transacional' | 'treinado' | 'outro' {
  const s = (statusRaw || '').toLowerCase()
  if (!s) return 'outro'
  if (s.includes('transacion')) return 'transacional'
  if (s.includes('treinad')) return 'treinado'
  return 'outro'
}

/* =========================
   PAGE
   ========================= */
export default function TransacionandoPage() {
  const CSV_PATH = 'base-lojas/banco.csv'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [expressos, setExpressos] = useState<ExpressoContabil[]>([])

  // filtros
  const [fAgencia, setFAgencia] = useState('')
  const [fStatus, setFStatus] = useState<'todos' | 'transacional' | 'treinado'>('todos')
  const [q, setQ] = useState('')

  /* =========================
     LOAD CSV
     ========================= */
  async function loadBase() {
    try {
      setLoading(true)
      setError(null)

      const bytes = await getBytes(ref(storage, CSV_PATH))
      const wb = XLSX.read(toUint8(bytes), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

      /**
       * REGRA:
       * - qtd_TrxContabil > 0
       * - TODOS os outros indicadores listados = 0
       */
      const list: ExpressoContabil[] = rows
        .filter((r) => {
          const trx = toNumber(r.qtd_TrxContabil)
          if (trx <= 0) return false

          const outrosCampos = [
            r.qtd_contas,
            r.qtd_contas_com_deposito,
            r.qtd_cesta_serv,
            r.QTD_MOBILIDADE,
            r.QTD_MTOKEN,
            r.QTD_CARTAO_EMITIDO,
            r.vlr_ches,
            r.qtd_chesp_contratado,
            r.qtd_lime_ab_conta,
            r.qtd_lime,
            r.vlr_lime,
            r.qtd_consignado,
            r.vlr_consignado,
            r.QTD_CREDITO_PARCEL_DTLHES,
            r.qtd_consorcio,
            r.QTD_CONTAS_PJ,
            r.QTD_CONTAS_FOLHA,
            r.qtd_microsseguro,
            r.QTD_SUPER_PROTEGIDO,
            r.QTD_MICRO_VIVAVIDA,
            r.QTD_PLANO_ODONTO,
            r.QTD_SEG_RESIDENCIAL,
            r.QTD_SEG_CARTAO_DEB,
            r.QTD_EXP_SORTE,
            r.VLR_EXP_SORTE,
          ]

          return outrosCampos.every((v) => toNumber(v) === 0)
        })
        .map((r) => {
          const agPacb = toStr(r.ag_pacb || r.AG_PACB || r['AGENCIA/PACB'] || '')
          const [agencia, pacb] = agPacb.split('/').map((x) => (x ? x.trim() : ''))

          return {
            chave: toStr(r.chave_loja || r.CHAVE_LOJA || ''),
            nome: toStr(r.nome_loja || r.NOME_LOJA || ''),
            municipio: toStr(r.municipio || r.MUNICIPIO || r.Municipio || ''),
            agencia: agencia || '',
            pacb: pacb || '',
            trx: toNumber(r.qtd_TrxContabil),
            status: toStr(r.STATUS_ANALISE || r.status_analise || '') || '—',
          }
        })

      setExpressos(list)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const agencias = useMemo(() => {
    const set = new Set<string>()
    for (const e of expressos) if (e.agencia) set.add(e.agencia)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [expressos])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()

    return expressos.filter((e) => {
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
          </div>
        ))}
      </div>
    </section>
  )
}