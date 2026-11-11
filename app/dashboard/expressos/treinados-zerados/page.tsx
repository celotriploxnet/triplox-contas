'use client'

import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { getBytes, ref } from 'firebase/storage'
import * as XLSX from 'xlsx'

import { auth, storage } from '@/lib/firebase'

const CSV_PATH = 'base-lojas/banco-junho-2026.csv'

type Row = {
  chave: string
  nome: string
  municipio: string
  agencia: string
  pacb: string
  status: string
  trx: number
}

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

function isZero(v: any) {
  return toNumber(v) === 0
}

export default function TreinadosZeradosPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState('')

  const [rows, setRows] = useState<Row[]>([])

  // filtros
  const [q, setQ] = useState('')
  const [fAgencia, setFAgencia] = useState('Todos')
  const [fMunicipio, setFMunicipio] = useState('Todos')

  async function load() {
    try {
      setLoading(true)
      setError(null)
      setInfo('')

      const bytes = await getBytes(ref(storage, CSV_PATH))
      const text = new TextDecoder('utf-8').decode(toUint8(bytes))
      const wb = XLSX.read(text, { type: 'string' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
      const data = rawRows.map((row) => {
        const normalized: Record<string, any> = {}
        for (const [key, value] of Object.entries(row)) normalized[normalizeKey(key)] = value
        return normalized
      })

      const wantedZeroFields = [
        'qtd_contas',
        'qtd_contas_com_deposito',
        'qtd_cesta_serv',
        'qtd_mobilidade',
        'qtd_mtoken',
        'qtd_cartao_emitido',
        'vlr_ches',
        'qtd_chesp_contratado',
        'qtd_lime_ab_conta',
        'qtd_lime',
        'vlr_lime',
        'qtd_consignado',
        'vlr_consignado',
        'vlr_consignado_total',
        'vlr_consignado_inss',
        'vlr_consignado_pub',
        'vlr_consignado_priv',
        'vlr_credito_parcel',
        'qtd_credito_parcel',
        'qtd_credito_parcel_dtlh',
        'qtd_credito_parcel_dtlhes',
        'qtd_credito_parcelado_dtlhes',
        'qtd_consorcio',
        'qtd_contas_pj',
        'qtd_contas_folha',
        'qtd_microsseguro',
        'qtd_super_protegido',
        'qtd_micro_vivavida',
        'qtd_plano_odonto',
        'qtd_seg_residencial',
        'qtd_seg_cartao_deb',
        'qtd_exp_sorte',
        'vlr_exp_sorte',
      ] as const

      const list: Row[] = data
        .map((r) => {
          const agPacb = toStr(r.ag_pacb || r['agencia/pacb'] || '')
          const [agencia, pacb] = agPacb.split('/').map((x: string) => x?.trim() || '')

          return {
            chave: toStr(r.chave_loja || r.chave),
            nome: toStr(r.nome_loja || r.nome),
            municipio: toStr(r.municipio),
            agencia,
            pacb,
            status: toStr(r.status_analise || r.status),
            trx: toNumber(r.qtd_trxcontabil || r.qtd_trx_contabil || r.qtd_trx),
            __raw: r,
          } as any
        })
        .filter((e: any) => {
          // treinado
          if (toStr(e.status).toLowerCase() !== 'treinado') return false

          // trx 0
          if (toNumber(e.trx) !== 0) return false

          // todos os campos zerados
          for (const f of wantedZeroFields) {
            if (!isZero(e.__raw[f])) return false
          }

          return true
        })
        .map((e: any) => {
          const { __raw, ...clean } = e
          return clean as Row
        })

      setRows(list)
      setInfo('Lista carregada ✅')
    } catch (e: any) {
      console.error(e)
      setError(`Erro ao carregar (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) load()
    })
    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const agencias = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => r.agencia && set.add(r.agencia))
    return ['Todos', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [rows])

  const municipios = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => r.municipio && set.add(r.municipio))
    return ['Todos', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [rows])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()

    return rows.filter((r) => {
      if (fAgencia !== 'Todos' && r.agencia !== fAgencia) return false
      if (fMunicipio !== 'Todos' && r.municipio !== fMunicipio) return false

      if (!term) return true
      return [r.chave, r.nome, r.municipio, r.agencia, r.pacb].join(' ').toLowerCase().includes(term)
    })
  }, [rows, q, fAgencia, fMunicipio])

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <span className="pill">Expressos</span>
        <h1 className="h1" style={{ marginTop: '.75rem' }}>
          📘 Expressos Treinados e Zerados
        </h1>
        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          Treinados com <b>TRX = 0</b> e <b>todos os indicadores zerados</b>.
        </p>
      </div>

      {/* Topo: resumo + filtros */}
      <div className="card" style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="pill">Total: {filtered.length}</span>

          <button className="btn-primary" onClick={load} disabled={loading} style={{ marginLeft: 'auto' }}>
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>

          {info && <span className="pill">{info}</span>}
        </div>

        {error && (
          <div className="card-soft" style={{ borderColor: 'rgba(214,31,44,.25)' }}>
            <p className="p-muted" style={{ color: 'rgba(214,31,44,.95)', fontWeight: 800 }}>
              {error}
            </p>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          <label>
            <div className="label">Buscar (nome ou chave)</div>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: 12345 ou Nome do Expresso" />
          </label>

          <label>
            <div className="label">Agência</div>
            <select className="input" value={fAgencia} onChange={(e) => setFAgencia(e.target.value)}>
              {agencias.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>

          <label>
            <div className="label">Município</div>
            <select className="input" value={fMunicipio} onChange={(e) => setFMunicipio(e.target.value)}>
              {municipios.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Lista */}
      {loading && <p className="p-muted">Carregando…</p>}

      {!loading && filtered.length === 0 && (
        <div className="card-soft">
          <p className="p-muted">Nenhum expresso encontrado com esses critérios.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1rem',
          }}
        >
          {filtered.map((e) => (
            <div key={e.chave} className="card-soft" style={{ display: 'grid', gap: '.45rem' }}>
              <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '1.05rem' }}>{e.nome || '—'}</strong>
                <span className="pill">Treinado</span>
              </div>

              <div className="p-muted">
                Chave: <b>{e.chave || '—'}</b>
              </div>
              <div className="p-muted">Município: {e.municipio || '—'}</div>
              <div className="p-muted">
                Agência / PACB: {e.agencia || '—'} / {e.pacb || '—'}
              </div>

              <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginTop: '.25rem' }}>
                <span className="pill">TRX: {e.trx}</span>
                <span className="pill">Status: {e.status || '—'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
