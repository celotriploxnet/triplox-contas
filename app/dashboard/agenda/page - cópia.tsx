'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

import { onAuthStateChanged, User } from 'firebase/auth'
import {
  collection,
  getDocs,
  Timestamp,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { getBytes, ref as sref } from 'firebase/storage'

import { auth, db, storage } from '@/lib/firebase'

type Agendamento = {
  chaveLoja: string
  trainerUid: string
  trainerEmail: string
  scheduledAt: Timestamp
  status: 'agendado' | 'concluido'
  updatedAt?: any
  nomeLoja?: string
  razaoSocial?: string
  municipio?: string
  cnpj?: string
  listUploadedAt?: Timestamp // ✅ novo
}

function formatPtBR(ts?: Timestamp) {
  if (!ts) return '—'
  const d = ts.toDate()
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function formatDateOnlyPtBR(ts?: Timestamp) {
  if (!ts) return '—'
  const d = ts.toDate()
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

function toDateKey(ts?: Timestamp) {
  if (!ts) return ''
  const d = ts.toDate()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function toMonthKey(ts?: Timestamp) {
  if (!ts) return ''
  const d = ts.toDate()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}`
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="pill">{children}</span>
}

function LightButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        borderRadius: 999,
        padding: '.65rem .9rem',
        fontSize: '.9rem',
        fontWeight: 800,
        border: '1px solid rgba(15,15,25,.18)',
        background: 'rgba(255,255,255,.85)',
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

function toUint8(bytes: any): Uint8Array {
  if (bytes instanceof Uint8Array) return bytes
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes)
  // @ts-ignore
  if (typeof Buffer !== 'undefined' && bytes instanceof Buffer) return new Uint8Array(bytes)
  return new Uint8Array(bytes)
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
}

export default function AgendaTreinamentosPage() {
  const router = useRouter()
  const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'
  const FIXED_PATH = 'trainings/lista-atual.xls'

  const [user, setUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [items, setItems] = useState<Agendamento[]>([])
  const [currentKeys, setCurrentKeys] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const [fMonth, setFMonth] = useState('')
  const [fDate, setFDate] = useState('')
  const [fEmployee, setFEmployee] = useState('')
  const [q, setQ] = useState('')

  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string>('')

  async function loadCurrentKeysFromXls() {
    const bytesAny = await getBytes(sref(storage, FIXED_PATH))
    const u8 = toUint8(bytesAny)
    const wb = XLSX.read(u8, { type: 'array' })

    const sheetName = wb.SheetNames[0]
    const ws = wb.Sheets[sheetName]
    const raw: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

    const keys = new Set<string>()
    for (const row of raw) {
      const normalized: Record<string, any> = {}
      for (const [k, v] of Object.entries(row)) normalized[normalizeKey(k)] = v
      const chave = String(normalized['Chave Loja'] ?? '').trim()
      if (chave) keys.add(chave)
    }
    setCurrentKeys(keys)
  }

  async function loadAll() {
    if (!auth.currentUser) return
    setLoading(true)
    setErr(null)
    setInfo('')

    try {
      // carrega agendamentos
      const snap = await getDocs(collection(db, 'treinamentos_agendamentos'))
      const list: Agendamento[] = []
      snap.forEach((d) => list.push(d.data() as Agendamento))

      list.sort((a, b) => (a.scheduledAt?.toMillis?.() ?? 0) - (b.scheduledAt?.toMillis?.() ?? 0))
      setItems(list)

      // carrega chaves atuais do XLS
      await loadCurrentKeysFromXls()

      setInfo('Agenda carregada ✅')
    } catch (e: any) {
      console.error('loadAll error:', e)
      setErr(e?.message || 'Falha ao carregar agendamentos.')
    } finally {
      setLoading(false)
    }
  }

  async function markDone(chaveLoja: string) {
    try {
      setErr(null)
      await setDoc(
        doc(db, 'treinamentos_agendamentos', chaveLoja),
        { status: 'concluido', updatedAt: serverTimestamp() },
        { merge: true }
      )
      setInfo('Marcado como concluído ✅')
      await loadAll()
    } catch (e) {
      console.error(e)
      setErr('Não consegui marcar como concluído.')
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      setCheckingAuth(false)

      if (!u) {
        setIsAdmin(false)
        router.push('/login')
        return
      }

      setIsAdmin((u.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase())
      await loadAll()
    })

    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const visible = useMemo(() => {
    const meUid = user?.uid

    let base = items
    if (!isAdmin && meUid) base = base.filter((x) => x.trainerUid === meUid)

    if (fMonth) base = base.filter((x) => toMonthKey(x.scheduledAt) === fMonth)
    if (fDate) base = base.filter((x) => toDateKey(x.scheduledAt) === fDate)

    if (isAdmin && fEmployee.trim()) {
      const target = fEmployee.trim().toLowerCase()
      base = base.filter((x) => (x.trainerEmail || '').toLowerCase().includes(target))
    }

    if (q.trim()) {
      const term = q.trim().toLowerCase()
      base = base.filter((x) =>
        [
          x.chaveLoja,
          x.nomeLoja,
          x.razaoSocial,
          x.municipio,
          x.cnpj,
          x.trainerEmail,
          x.status,
          formatPtBR(x.scheduledAt),
        ]
          .join(' ')
          .toLowerCase()
          .includes(term)
      )
    }

    return [...base].sort((a, b) => (a.scheduledAt?.toMillis?.() ?? 0) - (b.scheduledAt?.toMillis?.() ?? 0))
  }, [items, isAdmin, user, fMonth, fDate, fEmployee, q])

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <Pill>Agenda</Pill>
        <h1 className="h1" style={{ marginTop: '.75rem' }}>
          Treinamentos agendados
        </h1>
        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          {isAdmin
            ? 'Você (admin) vê todos os agendamentos e pode filtrar por mês, data e funcionário.'
            : 'Você vê somente os treinamentos que você agendou.'}
        </p>
      </div>

      <div className="card" style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn-primary" onClick={loadAll} disabled={loading || checkingAuth}>
            {checkingAuth ? 'Verificando login...' : loading ? 'Carregando...' : 'Recarregar'}
          </button>

          <Pill>Exibindo: {visible.length}</Pill>
          {isAdmin && <Pill>Admin</Pill>}
          {info && <Pill>{info}</Pill>}
        </div>

        {err && (
          <div className="card-soft" style={{ borderColor: 'rgba(214,31,44,.25)' }}>
            <p className="p-muted" style={{ color: 'rgba(214,31,44,.95)' }}>
              {err}
            </p>
          </div>
        )}
      </div>

      <div className="card" style={{ display: 'grid', gap: '1rem' }}>
        <div className="h2">Filtros</div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
          }}
        >
          <label>
            <div className="label">Filtrar por mês</div>
            <input
              className="input"
              type="month"
              value={fMonth}
              onChange={(e) => {
                setFMonth(e.target.value)
                if (e.target.value) setFDate('')
              }}
            />
          </label>

          <label>
            <div className="label">Filtrar por data</div>
            <input
              className="input"
              type="date"
              value={fDate}
              onChange={(e) => {
                setFDate(e.target.value)
                if (e.target.value) setFMonth('')
              }}
            />
          </label>

          {isAdmin && (
            <label>
              <div className="label">Filtrar por funcionário (e-mail)</div>
              <input
                className="input"
                placeholder="ex: joao@empresa.com"
                value={fEmployee}
                onChange={(e) => setFEmployee(e.target.value)}
              />
            </label>
          )}

          <label>
            <div className="label">Busca geral</div>
            <input
              className="input"
              placeholder="loja, chave, CNPJ, município, responsável..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
        </div>

        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <LightButton
            onClick={() => {
              setFMonth('')
              setFDate('')
              setFEmployee('')
              setQ('')
            }}
          >
            Limpar filtros
          </LightButton>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {visible.map((x) => {
          const isMine = !!user && x.trainerUid === user.uid
          const canEdit = isAdmin || isMine

          const existsInCurrentList = currentKeys.has(x.chaveLoja)
          const showHistoricText = !existsInCurrentList && !!x.listUploadedAt

          return (
            <div key={x.chaveLoja} className="card" style={{ display: 'grid', gap: '.75rem' }}>
              <div
                className="card-soft"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <Pill>{x.status === 'concluido' ? 'Concluído' : 'Agendado'}</Pill>
                  <span className="p-muted" style={{ fontSize: 13 }}>
                    <b>Data/Hora:</b> {formatPtBR(x.scheduledAt)} • <b>Responsável:</b> {x.trainerEmail || '—'}
                  </span>
                </div>

                {canEdit && x.status !== 'concluido' && (
                  <LightButton onClick={() => markDone(x.chaveLoja)}>Marcar concluído</LightButton>
                )}
              </div>

              {/* ✅ TEXTO QUE VOCÊ QUIS */}
              {showHistoricText && (
                <div className="card-soft">
                  <p className="p-muted" style={{ margin: 0 }}>
                    <b>Este treinamento foi agendado com base na lista enviada em {formatDateOnlyPtBR(x.listUploadedAt)}</b>
                  </p>
                </div>
              )}

              <div style={{ display: 'grid', gap: '.25rem' }}>
                <div style={{ fontWeight: 900, fontSize: '1.05rem' }}>{x.nomeLoja || '—'}</div>
                <div className="p-muted">{x.razaoSocial || '—'}</div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'grid', gap: '.15rem' }}>
                  <div className="p-muted" style={{ fontSize: 12 }}>Chave Loja</div>
                  <div style={{ fontWeight: 800 }}>{x.chaveLoja || '—'}</div>
                </div>

                <div style={{ display: 'grid', gap: '.15rem' }}>
                  <div className="p-muted" style={{ fontSize: 12 }}>CNPJ</div>
                  <div style={{ fontWeight: 800 }}>{x.cnpj || '—'}</div>
                </div>

                <div style={{ display: 'grid', gap: '.15rem' }}>
                  <div className="p-muted" style={{ fontSize: 12 }}>Município</div>
                  <div style={{ fontWeight: 800 }}>{x.municipio || '—'}</div>
                </div>
              </div>
            </div>
          )
        })}

        {!loading && visible.length === 0 && (
          <div className="card">
            <p className="p-muted">Nenhum agendamento encontrado com os filtros atuais.</p>
          </div>
        )}
      </div>

      {!checkingAuth && user && (
        <p className="p-muted" style={{ marginTop: '0.25rem' }}>
          Logado como: <b>{user.email}</b>
        </p>
      )}
    </section>
  )
}