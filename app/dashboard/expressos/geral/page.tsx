'use client'

import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { getBytes, ref } from 'firebase/storage'
import { collection, getDocs } from 'firebase/firestore'
import * as XLSX from 'xlsx'

import { auth, storage, db } from '@/lib/firebase'

/* =========================
   TYPES
   ========================= */
type Expresso = {
  chave: string
  nome: string
  municipio: string
  agencia: string
  pacb: string
  bloqueado: boolean
  bloqueadoRaw: string
  status: string
  trx: number
  dtCert?: Date | null
}

type Agendamento = {
  chaveLoja: string
  scheduledAt?: any
  trainerEmail?: string
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

function isBloqueado(raw: string) {
  const s = (raw || '').trim().toLowerCase()
  if (!s) return false
  if (['sim', 's', '1', 'true', 'bloqueado', 'yes'].includes(s)) return true
  if (['nao', 'não', 'n', '0', 'false', 'desbloqueado', 'no'].includes(s)) return false
  return s.includes('bloq') || s.includes('sim')
}

function toUint8(bytes: any): Uint8Array {
  if (bytes instanceof Uint8Array) return bytes
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes)
  return new Uint8Array(bytes)
}

function parseCertDate(v: any): Date | null {
  if (!v) return null

  if (typeof v === 'number') {
    const dc = XLSX.SSF.parse_date_code(v)
    if (dc?.y && dc?.m && dc?.d) {
      return new Date(dc.y, dc.m - 1, dc.d)
    }
  }

  const s = String(v).trim()
  if (!s) return null

  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) return new Date(+br[3], +br[2] - 1, +br[1])

  const dt = new Date(s)
  return Number.isNaN(dt.getTime()) ? null : dt
}

function yearsAgo(date: Date) {
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
}

function certStatus(dt: Date | null | undefined): 'nao' | 'ok' | 'vencida' {
  if (!dt) return 'nao'
  return yearsAgo(dt) > 5 ? 'vencida' : 'ok'
}

function Pill({
  children,
  tone = 'default',
}: {
  children: React.ReactNode
  tone?: 'default' | 'danger' | 'success'
}) {
  const style =
    tone === 'danger'
      ? { background: 'rgba(214,31,44,.10)', border: '1px solid rgba(214,31,44,.25)', color: '#b91c1c' }
      : tone === 'success'
      ? { background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.25)', color: '#065f46' }
      : {}

  return (
    <span className="pill" style={style}>
      {children}
    </span>
  )
}

/* =========================
   PAGE
   ========================= */
export default function ExpressoGeralPage() {
  const CSV_PATH = 'base-lojas/banco.csv'

  const [expressos, setExpressos] = useState<Expresso[]>([])
  const [agenda, setAgenda] = useState<Record<string, Agendamento>>({})
  const [loading, setLoading] = useState(false)

  // filtros
  const [fAgencia, setFAgencia] = useState('')
  const [fCert, setFCert] = useState<'todos' | 'nao' | 'ok' | 'vencida'>('todos')
  const [fTrx, setFTrx] = useState<'todos' | '0' | '1-199' | '200+'>('todos')
  const [fChave, setFChave] = useState('')

  /* =========================
     LOAD CSV
     ========================= */
  async function loadBase() {
    setLoading(true)

    const bytes = await getBytes(ref(storage, CSV_PATH))
    const wb = XLSX.read(toUint8(bytes), { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

    const list: Expresso[] = rows.map((r) => {
      const [agencia, pacb] = toStr(r.ag_pacb).split('/').map((x) => x?.trim())

      return {
        chave: toStr(r.chave_loja),
        nome: toStr(r.nome_loja),
        municipio: toStr(r.municipio),
        agencia: agencia || '',
        pacb: pacb || '',
        bloqueado: isBloqueado(r.BLOQUEADO),
        bloqueadoRaw: toStr(r.BLOQUEADO),
        status: toStr(r.STATUS_ANALISE),
        trx: toNumber(r.qtd_TrxContabil),
        dtCert: parseCertDate(r.dt_certificacao),
      }
    })

    setExpressos(list)
    setLoading(false)
  }

  async function loadAgenda() {
    const snap = await getDocs(collection(db, 'treinamentos_agendamentos'))
    const map: Record<string, Agendamento> = {}
    snap.forEach((d) => (map[d.id] = d.data() as Agendamento))
    setAgenda(map)
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        loadBase()
        loadAgenda()
      }
    })
    return () => unsub()
  }, [])

  /* =========================
     FILTERED LIST
     ========================= */
  const lista = useMemo(() => {
    return expressos.filter((e) => {
      if (fAgencia && e.agencia !== fAgencia) return false

      if (fChave && !e.chave.toLowerCase().includes(fChave.toLowerCase())) return false

      const cs = certStatus(e.dtCert)
      if (fCert !== 'todos' && cs !== fCert) return false

      if (fTrx !== 'todos') {
        if (fTrx === '0' && e.trx !== 0) return false
        if (fTrx === '1-199' && !(e.trx >= 1 && e.trx <= 199)) return false
        if (fTrx === '200+' && !(e.trx >= 200)) return false
      }

      return true
    })
  }, [expressos, fAgencia, fCert, fTrx, fChave])

  const agencias = useMemo(
    () => Array.from(new Set(expressos.map((e) => e.agencia))).sort(),
    [expressos]
  )

  /* =========================
     SUMMARY
     ========================= */
  const summary = useMemo(() => {
    const total = lista.length
    const transacionando = lista.filter((e) => e.status.toLowerCase().includes('transacion')).length
    const treinados = lista.filter((e) => e.status.toLowerCase().includes('treinad')).length
    const semCert = lista.filter((e) => certStatus(e.dtCert) === 'nao').length
    const certVencida = lista.filter((e) => certStatus(e.dtCert) === 'vencida').length
    return { total, transacionando, treinados, semCert, certVencida }
  }, [lista])

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <span className="pill">Expressos</span>
        <h1 className="h1">Expresso Geral</h1>
      </div>

      {/* RESUMO */}
      <div className="card">
        <div className="grid gap-3 sm:grid-cols-5">
          <div className="card-soft">
            <div className="p-muted">Total</div>
            <strong>{summary.total}</strong>
          </div>
          <div className="card-soft">
            <div className="p-muted">Transacionando</div>
            <strong>{summary.transacionando}</strong>
          </div>
          <div className="card-soft">
            <div className="p-muted">Treinados</div>
            <strong>{summary.treinados}</strong>
          </div>
          <div className="card-soft">
            <div className="p-muted">Sem certificação</div>
            <strong>{summary.semCert}</strong>
          </div>
          <div className="card-soft">
            <div className="p-muted">Certificação vencida</div>
            <strong>{summary.certVencida}</strong>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="card">
        <div className="grid gap-3 sm:grid-cols-4">
          <input
            className="input"
            placeholder="Buscar por Chave Loja"
            value={fChave}
            onChange={(e) => setFChave(e.target.value)}
          />

          <select className="input" value={fAgencia} onChange={(e) => setFAgencia(e.target.value)}>
            <option value="">Todas as agências</option>
            {agencias.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <select className="input" value={fCert} onChange={(e) => setFCert(e.target.value as any)}>
            <option value="todos">Todas certificações</option>
            <option value="nao">Não certificado</option>
            <option value="ok">Certificado</option>
            <option value="vencida">Certificação vencida</option>
          </select>

          <select className="input" value={fTrx} onChange={(e) => setFTrx(e.target.value as any)}>
            <option value="todos">Todas TRX</option>
            <option value="0">0</option>
            <option value="1-199">1–199</option>
            <option value="200+">200+</option>
          </select>
        </div>
      </div>

      {/* LISTA */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((e) => (
          <div key={e.chave} className="card-soft">
            <strong>{e.nome}</strong>
            <div className="p-muted">Chave: {e.chave}</div>
            <div className="p-muted">
              Agência / PACB: {e.agencia} / {e.pacb}
            </div>
            <div className="p-muted">Município: {e.municipio}</div>

            <div style={{ marginTop: '.4rem', display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
              <Pill tone={e.bloqueado ? 'danger' : 'success'}>
                {e.bloqueado ? 'Bloqueado' : 'Ativo'}
              </Pill>
              <Pill>TRX: {e.trx}</Pill>
              <Pill>Status: {e.status || '—'}</Pill>
              {certStatus(e.dtCert) === 'nao' && <Pill tone="danger">Sem certificação</Pill>}
              {certStatus(e.dtCert) === 'ok' && <Pill tone="success">Certificado</Pill>}
              {certStatus(e.dtCert) === 'vencida' && <Pill tone="danger">Certificação vencida</Pill>}
            </div>
          </div>
        ))}
      </div>

      {loading && <p className="p-muted">Carregando…</p>}
    </section>
  )
}