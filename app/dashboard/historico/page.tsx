'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, type User } from 'firebase/auth'
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'

import { auth, db } from '@/lib/firebase'

const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'
const PAGE_SIZE = 50

type Prestacao = {
  id: string
  userId?: string
  userEmail?: string
  userName?: string

  nomeExpresso?: string
  chaveLoja?: string
  agencia?: string
  pacb?: string

  total?: number
  status?: string

  createdAt?: any // Timestamp
  updatedAt?: any // Timestamp
}

function toStr(v: any) {
  return v === null || v === undefined ? '' : String(v)
}

function formatMoneyBRL(v: any) {
  const n = Number(v ?? 0)
  if (!Number.isFinite(n)) return 'R$ 0,00'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDateTimePtBR(ts: any) {
  try {
    const d: Date =
      ts?.toDate?.() instanceof Date ? ts.toDate() : ts instanceof Date ? ts : new Date(ts)
    if (Number.isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Bahia',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return '—'
  }
}

export default function HistoricoPage() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState('')

  const [items, setItems] = useState<Prestacao[]>([])
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const [q, setQ] = useState('')

  function mapDoc(d: QueryDocumentSnapshot<DocumentData>): Prestacao {
    const data = d.data() || {}
    return {
      id: d.id,
      userId: data.userId,
      userEmail: data.userEmail,
      userName: data.userName,

      nomeExpresso: data.nomeExpresso || data.nome_loja || data.nome,
      chaveLoja: data.chaveLoja || data.chave_loja || data.chave,
      agencia: data.agencia,
      pacb: data.pacb,

      total: data.total ?? data.valorTotal ?? data.valor ?? 0,
      status: data.status ?? data.situacao ?? '',

      createdAt: data.createdAt ?? data.created_at ?? data.dataHora ?? null,
      updatedAt: data.updatedAt ?? data.updated_at ?? null,
    }
  }

  async function loadFirstPage(u: User) {
    try {
      setLoading(true)
      setError(null)
      setInfo('')

      const admin = (u.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase()
      setIsAdmin(admin)

      const base = collection(db, 'prestacoes')

      const qy = admin
        ? query(base, orderBy('createdAt', 'desc'), limit(PAGE_SIZE))
        : query(base, where('userId', '==', u.uid), orderBy('createdAt', 'desc'), limit(PAGE_SIZE))

      const snap = await getDocs(qy)
      const docs = snap.docs

      setItems(docs.map(mapDoc))
      setLastDoc(docs.length ? docs[docs.length - 1] : null)
      setHasMore(docs.length === PAGE_SIZE)

      setInfo(admin ? 'Histórico (Admin) carregado ✅' : 'Seu histórico carregado ✅')
    } catch (e: any) {
      console.error('loadFirstPage error:', e)
      setError(e?.message || 'Erro ao carregar histórico.')
    } finally {
      setLoading(false)
    }
  }

  async function loadMore() {
    if (!user) return
    if (!lastDoc) return
    if (!hasMore) return

    try {
      setLoadingMore(true)
      setError(null)
      setInfo('')

      const admin = isAdmin
      const base = collection(db, 'prestacoes')

      const qy = admin
        ? query(base, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE))
        : query(
            base,
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            startAfter(lastDoc),
            limit(PAGE_SIZE)
          )

      const snap = await getDocs(qy)
      const docs = snap.docs

      setItems((prev) => [...prev, ...docs.map(mapDoc)])
      setLastDoc(docs.length ? docs[docs.length - 1] : lastDoc)
      setHasMore(docs.length === PAGE_SIZE)
    } catch (e: any) {
      console.error('loadMore error:', e)
      setError(e?.message || 'Erro ao carregar mais.')
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setCheckingAuth(false)

      if (!u) {
        setIsAdmin(false)
        router.push('/login')
        return
      }

      loadFirstPage(u)
    })

    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return items

    return items.filter((p) => {
      const hay = [
        p.nomeExpresso,
        p.chaveLoja,
        p.agencia,
        p.pacb,
        p.userEmail,
        p.userName,
        p.status,
        p.id,
      ]
        .join(' ')
        .toLowerCase()

      return hay.includes(term)
    })
  }, [items, q])

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <span className="pill">Prestação</span>
        <h1 className="h1" style={{ marginTop: '.75rem' }}>
          📑 Histórico
        </h1>
        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          {isAdmin
            ? 'Você está como Admin: vendo todas as prestações.'
            : 'Aqui aparecem apenas as suas prestações.'}
        </p>
      </div>

      <div className="card" style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="btn-primary"
            onClick={() => user && loadFirstPage(user)}
            disabled={loading || checkingAuth}
          >
            {checkingAuth ? 'Verificando login...' : loading ? 'Carregando...' : 'Recarregar'}
          </button>

          <span className="pill">Total carregado: {items.length}</span>
          <span className="pill">Mostrando: {filtered.length}</span>

          {isAdmin && <span className="pill">Admin</span>}
          {info && <span className="pill">{info}</span>}
        </div>

        <label>
          <div className="label">Buscar (nome, chave, e-mail, id...)</div>
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ex.: 12345 | Mercado | marcelo@ | Treinado..."
          />
        </label>

        {error && (
          <div className="card-soft" style={{ borderColor: 'rgba(214,31,44,.25)' }}>
            <p className="p-muted" style={{ color: 'rgba(214,31,44,.95)', fontWeight: 800 }}>
              {error}
            </p>
          </div>
        )}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="card-soft">
          <p className="p-muted">Nenhuma prestação encontrada.</p>
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
          {filtered.map((p) => (
            <div key={p.id} className="card" style={{ display: 'grid', gap: '.65rem' }}>
              <div className="card-soft" style={{ padding: '.8rem .95rem' }}>
                <div style={{ fontWeight: 900, fontSize: '1.02rem' }}>
                  {p.nomeExpresso || '—'}
                </div>
                <div className="p-muted" style={{ marginTop: '.2rem', fontSize: 13 }}>
                  Chave: <b>{p.chaveLoja || '—'}</b> • Agência/PACB:{' '}
                  <b>
                    {p.agencia || '—'} / {p.pacb || '—'}
                  </b>
                </div>

                {isAdmin && (
                  <div className="p-muted" style={{ marginTop: '.2rem', fontSize: 13 }}>
                    Usuário: <b>{p.userEmail || '—'}</b>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                <span className="pill">Total: {formatMoneyBRL(p.total)}</span>
                {p.status ? <span className="pill">Status: {p.status}</span> : null}
                <span className="pill">Criado: {formatDateTimePtBR(p.createdAt)}</span>
              </div>

              <div className="p-muted" style={{ fontSize: 12 }}>
                ID: {p.id}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <button className="btn-primary" onClick={loadMore} disabled={loadingMore || loading || checkingAuth}>
          {loadingMore ? 'Carregando mais...' : 'Carregar mais'}
        </button>
      )}

      {!checkingAuth && user && (
        <p className="p-muted" style={{ marginTop: '.25rem' }}>
          Logado como: <b>{user.email}</b> {isAdmin ? '(Admin)' : ''}
        </p>
      )}
    </section>
  )
}
