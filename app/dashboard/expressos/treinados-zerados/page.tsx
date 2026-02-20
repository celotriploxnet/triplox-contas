'use client'

import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { getBytes, ref } from 'firebase/storage'
import * as XLSX from 'xlsx'

import { auth, storage } from '@/lib/firebase'

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

function isZero(v: any) {
  return toNumber(v) === 0
}

export default function TreinadosZeradosPage() {
  const CSV_PATH = 'base-lojas/banco.csv'

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
      const wb = XLSX.read(toUint8(bytes), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

      const wantedZeroFields = [
        'qtd_contas',
        'qtd_contas_com_deposito',
        'qtd_cesta_serv',
        'QTD_MOBILIDADE',
        'QTD_MTOKEN',
        'QTD_CARTAO_EMITIDO',
        'vlr_ches',
        'qtd_chesp_contratado',
        'qtd_lime_ab_conta',
        'qtd_lime',
        'vlr_lime',
        'qtd_consignado',
        'vlr_consignado',
        'QTD_CREDITO_PARCEL_DTLHES',
        'qtd_consorcio',
        'QTD_CONTAS_PJ',
        'QTD_CONTAS_FOLHA',
        'qtd_microsseguro',
        'QTD_SUPER_PROTEGIDO',
        'QTD_MICRO_VIVAVIDA',
        'QTD_PLANO_ODONTO',
        'QTD_SEG_RESIDENCIAL',
        'QTD_SEG_CARTAO_DEB',
        'QTD_EXP_SORTE',
        'VLR_EXP_SORTE',
      ] as const

      const list: Row[] = data
        .map((r) => {
          const agPacb = toStr(r.ag_pacb || r['AGENCIA/PACB'] || '')
          const [agencia, pacb] = agPacb.split('/').map((x: string) => x?.trim() || '')

          return {
            chave: toStr(r.chave_loja),
            nome: toStr(r.nome_loja),
            municipio: toStr(r.municipio),
            agencia,
            pacb,
            status: toStr(r.STATUS_ANALISE),
            trx: toNumber(r.qtd_TrxContabil),
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