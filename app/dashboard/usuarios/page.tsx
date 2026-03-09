'use client'

import { useEffect, useMemo, useState, type ReactNode, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, type User } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'

import { auth, db } from '@/lib/firebase'

type UserRole = 'admin' | 'operacional' | 'consulta'

type UserRow = {
  uid: string
  nome: string
  email: string
  telefone: string
  nascimento: string
  cidadeBase: string
  estadoBase: string
  role: UserRole
  ativo: boolean
  createdAt?: any
  createdBy?: string
  updatedAt?: any
  updatedBy?: string
}

type FormState = {
  uid: string
  nome: string
  email: string
  telefone: string
  nascimento: string
  cidadeBase: string
  estadoBase: string
  role: UserRole
  ativo: boolean
}

const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'

function toStr(v: any) {
  return v === null || v === undefined ? '' : String(v).trim()
}

function Pill({
  children,
  style,
  title,
}: {
  children: ReactNode
  style?: CSSProperties
  title?: string
}) {
  return (
    <span className="pill" style={style} title={title}>
      {children}
    </span>
  )
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
        padding: '.58rem .8rem',
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

function emptyForm(): FormState {
  return {
    uid: '',
    nome: '',
    email: '',
    telefone: '',
    nascimento: '',
    cidadeBase: '',
    estadoBase: '',
    role: 'operacional',
    ativo: true,
  }
}

export default function UsuariosPage() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [rows, setRows] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState('')

  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingUid, setEditingUid] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function resetForm() {
    setEditingUid(null)
    setForm(emptyForm())
    setShowForm(false)
  }

  async function resolveIsAdmin(u: User) {
    const legacyAdmin = (u.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase()

    if (legacyAdmin) return true

    try {
      const snap = await getDoc(doc(db, 'users', u.uid))
      if (!snap.exists()) return false

      const data = snap.data() as any
      return data?.ativo === true && data?.role === 'admin'
    } catch (e) {
      console.error('resolveIsAdmin error:', e)
      return false
    }
  }

  async function loadUsers() {
    if (!auth.currentUser) return

    try {
      setLoading(true)
      setError(null)
      setInfo('')

      const qy = query(collection(db, 'users'), orderBy('nome'))
      const snap = await getDocs(qy)

      const list: UserRow[] = snap.docs.map((d) => {
        const data = d.data() as any
        return {
          uid: d.id,
          nome: toStr(data.nome),
          email: toStr(data.email),
          telefone: toStr(data.telefone),
          nascimento: toStr(data.nascimento),
          cidadeBase: toStr(data.cidadeBase),
          estadoBase: toStr(data.estadoBase).toUpperCase(),
          role: (toStr(data.role) || 'operacional') as UserRole,
          ativo: data.ativo === true,
          createdAt: data.createdAt,
          createdBy: data.createdBy,
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy,
        }
      })

      setRows(list)
    } catch (e: any) {
      console.error('loadUsers error:', e)
      setError(`Não foi possível carregar os usuários. (${e?.code || 'sem-code'})`)
    } finally {
      setLoading(false)
    }
  }

  function startNew() {
    setEditingUid(null)
    setForm(emptyForm())
    setShowForm(true)
    setError(null)
    setInfo('')
  }

  function startEdit(row: UserRow) {
    setEditingUid(row.uid)
    setForm({
      uid: row.uid,
      nome: row.nome || '',
      email: row.email || '',
      telefone: row.telefone || '',
      nascimento: row.nascimento || '',
      cidadeBase: row.cidadeBase || '',
      estadoBase: row.estadoBase || '',
      role: row.role || 'operacional',
      ativo: row.ativo === true,
    })
    setShowForm(true)
    setError(null)
    setInfo('')
  }

  async function handleSave() {
    if (!user) {
      setError('Você precisa estar logado.')
      return
    }

    if (!isAdmin) {
      setError('Apenas administrador pode gerenciar usuários.')
      return
    }

    const uid = toStr(form.uid)
    const nome = toStr(form.nome)
    const email = toStr(form.email).toLowerCase()
    const cidadeBase = toStr(form.cidadeBase)
    const estadoBase = toStr(form.estadoBase).toUpperCase()

    if (!uid) {
      setError('Informe o UID do usuário.')
      return
    }

    if (!nome) {
      setError('Informe o nome do usuário.')
      return
    }

    if (!email) {
      setError('Informe o email do usuário.')
      return
    }

    try {
      setSaving(true)
      setError(null)
      setInfo('')

      const ref = doc(db, 'users', uid)
      const existing = await getDoc(ref)

      if (!existing.exists()) {
        await setDoc(ref, {
          nome,
          email,
          telefone: toStr(form.telefone),
          nascimento: toStr(form.nascimento),
          cidadeBase,
          estadoBase,
          role: form.role,
          ativo: form.ativo === true,
          createdAt: serverTimestamp(),
          createdBy: user.email || '',
          updatedAt: serverTimestamp(),
          updatedBy: user.email || '',
        })
      } else {
        await updateDoc(ref, {
          nome,
          email,
          telefone: toStr(form.telefone),
          nascimento: toStr(form.nascimento),
          cidadeBase,
          estadoBase,
          role: form.role,
          ativo: form.ativo === true,
          updatedAt: serverTimestamp(),
          updatedBy: user.email || '',
        })
      }

      setInfo(existing.exists() ? 'Usuário atualizado ✅' : 'Usuário salvo ✅')
      resetForm()
      await loadUsers()
    } catch (e: any) {
      console.error('handleSave error:', e)
      setError(`Falha ao salvar usuário. (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
    } finally {
      setSaving(false)
    }
  }

  async function toggleAtivo(row: UserRow) {
    if (!user || !isAdmin) return

    try {
      setError(null)
      setInfo('')

      await updateDoc(doc(db, 'users', row.uid), {
        ativo: !(row.ativo === true),
        updatedAt: serverTimestamp(),
        updatedBy: user.email || '',
      })

      setInfo(`Usuário ${row.ativo ? 'desativado' : 'ativado'} ✅`)
      await loadUsers()
    } catch (e: any) {
      console.error('toggleAtivo error:', e)
      setError(`Não foi possível alterar o status. (${e?.code || 'sem-code'})`)
    }
  }

  async function makeAdmin(row: UserRow) {
    if (!user || !isAdmin) return

    try {
      setError(null)
      setInfo('')

      await updateDoc(doc(db, 'users', row.uid), {
        role: 'admin',
        updatedAt: serverTimestamp(),
        updatedBy: user.email || '',
      })

      setInfo('Usuário promovido para admin ✅')
      await loadUsers()
    } catch (e: any) {
      console.error('makeAdmin error:', e)
      setError(`Não foi possível alterar o perfil. (${e?.code || 'sem-code'})`)
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

      const admin = await resolveIsAdmin(u)
      setIsAdmin(admin)

      if (!admin) {
        router.push('/dashboard')
        return
      }

      await loadUsers()
    })

    return () => unsub()
  }, [router])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()

    let list = [...rows].sort((a, b) => a.nome.localeCompare(b.nome))

    if (!term) return list

    return list.filter((r) =>
      [
        r.uid,
        r.nome,
        r.email,
        r.telefone,
        r.nascimento,
        r.cidadeBase,
        r.estadoBase,
        r.role,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)
    )
  }, [rows, q])

  const totals = useMemo(() => {
    const total = rows.length
    const ativos = rows.filter((x) => x.ativo === true).length
    const inativos = rows.filter((x) => x.ativo !== true).length
    const admins = rows.filter((x) => x.role === 'admin').length
    return { total, ativos, inativos, admins }
  }, [rows])

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <span className="pill">Usuários</span>
        <h1 className="h1" style={{ marginTop: '.75rem' }}>
          👤 Gestão de Usuários
        </h1>
        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          Esta tela gerencia o perfil interno do sistema. O login no Firebase Auth deve existir antes.
        </p>
      </div>

      <div
        className="card"
        style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}
      >
        <Pill>Total: {totals.total}</Pill>
        <Pill>Ativos: {totals.ativos}</Pill>
        <Pill>Inativos: {totals.inativos}</Pill>
        <Pill>Admins: {totals.admins}</Pill>

        <button
          className="btn-primary"
          onClick={loadUsers}
          disabled={loading || checkingAuth}
          style={{ marginLeft: 'auto' }}
        >
          {checkingAuth ? 'Verificando acesso...' : loading ? 'Carregando...' : 'Atualizar lista'}
        </button>
      </div>

      <div className="card" style={{ display: 'grid', gap: '1rem' }}>
        <div
          style={{
            display: 'flex',
            gap: '.75rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <div style={{ flex: 1, minWidth: 260 }}>
            <div className="label">Buscar usuário</div>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome, email, UID, telefone, cidade base..."
            />
          </div>

          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'end' }}>
            <button type="button" className="btn-primary" onClick={startNew}>
              + Novo usuário
            </button>

            {showForm && <LightButton onClick={resetForm}>Cancelar</LightButton>}
          </div>
        </div>

        {info && (
          <div>
            <span className="pill">{info}</span>
          </div>
        )}

        {error && (
          <div className="card-soft" style={{ borderColor: 'rgba(214,31,44,.25)' }}>
            <p className="p-muted" style={{ color: 'rgba(214,31,44,.95)', fontWeight: 800 }}>
              {error}
            </p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <span className="pill">{editingUid ? 'Editar' : 'Novo'}</span>
            <h2 className="h2" style={{ marginTop: '.6rem' }}>
              {editingUid ? 'Editar usuário' : 'Cadastrar perfil interno'}
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '.8rem',
            }}
          >
            <label>
              <div className="label">UID</div>
              <input
                className="input"
                value={form.uid}
                onChange={(e) => updateForm('uid', e.target.value)}
                placeholder="UID do Firebase Auth"
                disabled={!!editingUid}
              />
            </label>

            <label>
              <div className="label">Nome</div>
              <input
                className="input"
                value={form.nome}
                onChange={(e) => updateForm('nome', e.target.value)}
                placeholder="Nome completo"
              />
            </label>

            <label>
              <div className="label">Email</div>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => updateForm('email', e.target.value)}
                placeholder="email@empresa.com"
              />
            </label>

            <label>
              <div className="label">Telefone</div>
              <input
                className="input"
                value={form.telefone}
                onChange={(e) => updateForm('telefone', e.target.value)}
                placeholder="71999999999"
              />
            </label>

            <label>
              <div className="label">Nascimento</div>
              <input
                className="input"
                value={form.nascimento}
                onChange={(e) => updateForm('nascimento', e.target.value)}
                placeholder="dd/mm/aaaa"
              />
            </label>

            <label>
              <div className="label">Cidade Base</div>
              <input
                className="input"
                value={form.cidadeBase}
                onChange={(e) => updateForm('cidadeBase', e.target.value)}
                placeholder="Ex.: Salvador"
              />
            </label>

            <label>
              <div className="label">Estado Base</div>
              <input
                className="input"
                value={form.estadoBase}
                onChange={(e) => updateForm('estadoBase', e.target.value.toUpperCase())}
                placeholder="Ex.: BA"
                maxLength={2}
              />
            </label>

            <label>
              <div className="label">Tipo de acesso</div>
              <select
                className="input"
                value={form.role}
                onChange={(e) => updateForm('role', e.target.value as UserRole)}
              >
                <option value="admin">admin</option>
                <option value="operacional">operacional</option>
                <option value="consulta">consulta</option>
              </select>
            </label>

            <label>
              <div className="label">Status</div>
              <select
                className="input"
                value={form.ativo ? 'true' : 'false'}
                onChange={(e) => updateForm('ativo', e.target.value === 'true')}
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </label>
          </div>

          <div className="card-soft" style={{ padding: '.9rem .95rem' }}>
            <p className="p-muted" style={{ fontSize: 13 }}>
              Esta tela salva o perfil interno em <b>users/UID</b>. O usuário precisa já existir no
              Firebase Authentication para conseguir fazer login.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editingUid ? 'Salvar alterações' : 'Salvar usuário'}
            </button>

            <LightButton onClick={resetForm} disabled={saving}>
              Cancelar
            </LightButton>
          </div>
        </div>
      )}

      {filtered.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1rem',
          }}
        >
          {filtered.map((r) => {
            const roleStyle: CSSProperties =
              r.role === 'admin'
                ? {
                    background: 'rgba(34,197,94,.10)',
                    border: '1px solid rgba(34,197,94,.20)',
                    color: 'rgba(21,128,61,.95)',
                  }
                : r.role === 'operacional'
                ? {
                    background: 'rgba(37,99,235,.12)',
                    border: '1px solid rgba(37,99,235,.25)',
                    color: 'rgba(37,99,235,.98)',
                  }
                : {
                    background: 'rgba(15,15,25,.06)',
                    border: '1px solid rgba(15,15,25,.10)',
                    color: 'rgba(16,16,24,.70)',
                  }

            const ativoStyle: CSSProperties = r.ativo
              ? {
                  background: 'rgba(34,197,94,.10)',
                  border: '1px solid rgba(34,197,94,.20)',
                  color: 'rgba(21,128,61,.95)',
                }
              : {
                  background: 'rgba(214,31,44,.10)',
                  border: '1px solid rgba(214,31,44,.20)',
                  color: 'rgba(214,31,44,.95)',
                }

            return (
              <div key={r.uid} className="card" style={{ display: 'grid', gap: '.75rem' }}>
                <div
                  className="card-soft"
                  style={{
                    display: 'flex',
                    gap: '.6rem',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '.8rem .95rem',
                  }}
                >
                  <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Pill style={ativoStyle}>{r.ativo ? 'Ativo' : 'Inativo'}</Pill>
                    <Pill style={roleStyle}>{r.role}</Pill>
                  </div>

                  <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                    <LightButton onClick={() => startEdit(r)} title="Editar usuário">
                      ✏️ Editar
                    </LightButton>

                    <LightButton
                      onClick={() => toggleAtivo(r)}
                      title={r.ativo ? 'Desativar usuário' : 'Ativar usuário'}
                    >
                      {r.ativo ? '⛔ Desativar' : '✅ Ativar'}
                    </LightButton>

                    {r.role !== 'admin' && (
                      <LightButton onClick={() => makeAdmin(r)} title="Tornar admin">
                        👑 Tornar admin
                      </LightButton>
                    )}
                  </div>
                </div>

                <div>
                  <div className="p-muted" style={{ fontSize: 12 }}>
                    Nome
                  </div>
                  <div style={{ fontWeight: 900, fontSize: '1.08rem', marginTop: '.15rem' }}>
                    {r.nome || '—'}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '.6rem',
                  }}
                >
                  <InfoBox label="UID" value={r.uid || '—'} />
                  <InfoBox label="Email" value={r.email || '—'} />
                  <InfoBox label="Telefone" value={r.telefone || '—'} />
                  <InfoBox label="Nascimento" value={r.nascimento || '—'} />
                  <InfoBox label="Cidade Base" value={r.cidadeBase || '—'} />
                  <InfoBox label="Estado Base" value={r.estadoBase || '—'} />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card-soft">
          <p className="p-muted">{loading ? 'Carregando usuários...' : 'Nenhum usuário encontrado.'}</p>
        </div>
      )}

      {!checkingAuth && user && (
        <p className="p-muted" style={{ marginTop: '.25rem' }}>
          Logado como: <b>{user.email}</b>
          {isAdmin ? ' (Admin)' : ''}
        </p>
      )}
    </section>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
      <div className="p-muted" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div style={{ fontWeight: 900, marginTop: '.2rem', wordBreak: 'break-word' }}>{value}</div>
    </div>
  )
}