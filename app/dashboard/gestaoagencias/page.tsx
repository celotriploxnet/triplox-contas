'use client'

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
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

type AgenciaRow = {
  codAg: string
  nomeAg: string
  tipo: string
  supervisor: string
  contatoSupervisor: string
  gerenteAg: string
  telGerente1: string
  emailGerente: string
  regional: string
  nomeDiretorRegional: string
  telefoneRegional: string
  createdAt?: any
  createdBy?: string
  updatedAt?: any
  updatedBy?: string
}

type FormState = {
  codAg: string
  nomeAg: string
  tipo: string
  supervisor: string
  contatoSupervisor: string
  gerenteAg: string
  telGerente1: string
  emailGerente: string
  regional: string
  nomeDiretorRegional: string
  telefoneRegional: string
}

const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'

function toStr(v: any) {
  return v === null || v === undefined ? '' : String(v).trim()
}

function normalizeHeader(v: string) {
  return toStr(v)
    .replaceAll('Ã“', 'Ó')
    .replaceAll('Ã•', 'Õ')
    .replaceAll('Ã‡', 'Ç')
    .replaceAll('Ã‰', 'É')
    .replaceAll('ÃŠ', 'Ê')
    .replaceAll('Â', '')
    .replace(/\s+/g, '_')
    .toUpperCase()
}

function emptyForm(): FormState {
  return {
    codAg: '',
    nomeAg: '',
    tipo: '',
    supervisor: '',
    contatoSupervisor: '',
    gerenteAg: '',
    telGerente1: '',
    emailGerente: '',
    regional: '',
    nomeDiretorRegional: '',
    telefoneRegional: '',
  }
}

function normalizeAgencyCode(v: any) {
  const raw = toStr(v)
  if (!raw) return ''

  const digits = raw.replace(/\D/g, '')
  if (!digits) return raw

  if (digits.length <= 4) return digits.padStart(4, '0')
  return digits
}

function isAgenciaTipoAG(tipo: string) {
  return toStr(tipo).toUpperCase() === 'AG'
}

function buildAgencyOptionLabel(row: AgenciaRow) {
  const code = normalizeAgencyCode(row.codAg)
  const nome = toStr(row.nomeAg)
  return `${code}${nome ? ` - ${nome}` : ''}`
}

function extractAgencyCodeFromSearch(value: string) {
  const raw = toStr(value)
  if (!raw) return ''

  const digitsOnly = raw.replace(/\D/g, '')
  if (/^\d+$/.test(raw) && digitsOnly) {
    return normalizeAgencyCode(digitsOnly)
  }

  const match = raw.match(/^(\d{1,})\s*-/)
  if (match?.[1]) {
    return normalizeAgencyCode(match[1])
  }

  return ''
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

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
      <div className="p-muted" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div style={{ fontWeight: 900, marginTop: '.2rem', wordBreak: 'break-word' }}>
        {value || '—'}
      </div>
    </div>
  )
}

function parseCsvLine(line: string) {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    const next = line[i + 1]

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (ch === ';' && !inQuotes) {
      result.push(current)
      current = ''
      continue
    }

    current += ch
  }

  result.push(current)
  return result.map((x) => x.trim())
}

function parseGestaoCsv(text: string): AgenciaRow[] {
  const cleaned = text.replace(/^\uFEFF/, '')
  const lines = cleaned
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim().length > 0)

  if (!lines.length) return []

  const headersRaw = parseCsvLine(lines[0])
  const headers = headersRaw.map((h) => normalizeHeader(h)).filter((h) => h !== '')

  const rows: AgenciaRow[] = []

  for (const line of lines.slice(1)) {
    const valuesRaw = parseCsvLine(line)
    const values = valuesRaw.length > headers.length ? valuesRaw.slice(0, headers.length) : valuesRaw

    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = toStr(values[idx] ?? '')
    })

    const codAg = toStr(row['COD_AG'])
    if (!codAg) continue

    rows.push({
      codAg,
      nomeAg: toStr(row['NOME_AG']),
      tipo: toStr(row['TIPO']),
      supervisor: toStr(row['SUPERVISOR']),
      contatoSupervisor: toStr(row['CONTATO_SUPERVISOR']),
      gerenteAg: toStr(row['GERENTE_AG']),
      telGerente1: toStr(row['TEL_GERENTE1']),
      emailGerente: toStr(row['EMAIL_GERENTE']),
      regional: toStr(row['REGIONAL']),
      nomeDiretorRegional: toStr(row['NOME_DIRETORREGIONAL']),
      telefoneRegional: toStr(row['TELEFONE_REGIONAL']),
    })
  }

  return rows
}

export default function GestaoAgenciasPage() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [rows, setRows] = useState<AgenciaRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState('')

  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingCodAg, setEditingCodAg] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [csvFile, setCsvFile] = useState<File | null>(null)

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function resetForm() {
    setEditingCodAg(null)
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

  async function loadAgencias() {
    if (!auth.currentUser) return

    try {
      setLoading(true)
      setError(null)
      setInfo('')

      const qy = query(collection(db, 'gestao_agencias'), orderBy('nomeAg'))
      const snap = await getDocs(qy)

      const list: AgenciaRow[] = snap.docs.map((d) => {
        const data = d.data() as any
        return {
          codAg: d.id,
          nomeAg: toStr(data.nomeAg),
          tipo: toStr(data.tipo),
          supervisor: toStr(data.supervisor),
          contatoSupervisor: toStr(data.contatoSupervisor),
          gerenteAg: toStr(data.gerenteAg),
          telGerente1: toStr(data.telGerente1),
          emailGerente: toStr(data.emailGerente),
          regional: toStr(data.regional),
          nomeDiretorRegional: toStr(data.nomeDiretorRegional),
          telefoneRegional: toStr(data.telefoneRegional),
          createdAt: data.createdAt,
          createdBy: data.createdBy,
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy,
        }
      })

      setRows(list)
    } catch (e: any) {
      console.error('loadAgencias error:', e)
      setError(`Não foi possível carregar as agências. (${e?.code || 'sem-code'})`)
    } finally {
      setLoading(false)
    }
  }

  function startNew() {
    setEditingCodAg(null)
    setForm(emptyForm())
    setShowForm(true)
    setError(null)
    setInfo('')
  }

  function startEdit(row: AgenciaRow) {
    setEditingCodAg(row.codAg)
    setForm({
      codAg: row.codAg || '',
      nomeAg: row.nomeAg || '',
      tipo: row.tipo || '',
      supervisor: row.supervisor || '',
      contatoSupervisor: row.contatoSupervisor || '',
      gerenteAg: row.gerenteAg || '',
      telGerente1: row.telGerente1 || '',
      emailGerente: row.emailGerente || '',
      regional: row.regional || '',
      nomeDiretorRegional: row.nomeDiretorRegional || '',
      telefoneRegional: row.telefoneRegional || '',
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
      setError('Apenas administrador pode alterar a gestão de agências.')
      return
    }

    const codAg = toStr(form.codAg)
    if (!codAg) {
      setError('Informe o código da agência.')
      return
    }

    if (!toStr(form.nomeAg)) {
      setError('Informe o nome da agência.')
      return
    }

    try {
      setSaving(true)
      setError(null)
      setInfo('')

      const refDoc = doc(db, 'gestao_agencias', codAg)
      const existing = await getDoc(refDoc)

      const payload = {
        codAg,
        nomeAg: toStr(form.nomeAg),
        tipo: toStr(form.tipo),
        supervisor: toStr(form.supervisor),
        contatoSupervisor: toStr(form.contatoSupervisor),
        gerenteAg: toStr(form.gerenteAg),
        telGerente1: toStr(form.telGerente1),
        emailGerente: toStr(form.emailGerente),
        regional: toStr(form.regional),
        nomeDiretorRegional: toStr(form.nomeDiretorRegional),
        telefoneRegional: toStr(form.telefoneRegional),
        updatedAt: serverTimestamp(),
        updatedBy: user.email || '',
      }

      if (!existing.exists()) {
        await setDoc(refDoc, {
          ...payload,
          createdAt: serverTimestamp(),
          createdBy: user.email || '',
        })
      } else {
        await updateDoc(refDoc, payload)
      }

      setInfo(existing.exists() ? 'Agência atualizada ✅' : 'Agência salva ✅')
      resetForm()
      await loadAgencias()
    } catch (e: any) {
      console.error('handleSave error:', e)
      setError(`Falha ao salvar agência. (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleImportCsv() {
    if (!user) {
      setError('Você precisa estar logado.')
      return
    }

    if (!isAdmin) {
      setError('Apenas administrador pode importar a base.')
      return
    }

    if (!csvFile) {
      setError('Selecione o CSV da gestão de agências.')
      return
    }

    try {
      setImporting(true)
      setError(null)
      setInfo('')

      const text = await csvFile.text()
      const parsed = parseGestaoCsv(text)

      if (!parsed.length) {
        setError('Não encontrei registros válidos no CSV.')
        return
      }

      for (const row of parsed) {
        const refDoc = doc(db, 'gestao_agencias', row.codAg)
        const existing = await getDoc(refDoc)

        const payload = {
          codAg: row.codAg,
          nomeAg: row.nomeAg,
          tipo: row.tipo,
          supervisor: row.supervisor,
          contatoSupervisor: row.contatoSupervisor,
          gerenteAg: row.gerenteAg,
          telGerente1: row.telGerente1,
          emailGerente: row.emailGerente,
          regional: row.regional,
          nomeDiretorRegional: row.nomeDiretorRegional,
          telefoneRegional: row.telefoneRegional,
          updatedAt: serverTimestamp(),
          updatedBy: user.email || '',
        }

        if (!existing.exists()) {
          await setDoc(refDoc, {
            ...payload,
            createdAt: serverTimestamp(),
            createdBy: user.email || '',
          })
        } else {
          await updateDoc(refDoc, payload)
        }
      }

      setCsvFile(null)
      setInfo(`Base importada ✅ (${parsed.length} registros processados)`)
      await loadAgencias()
    } catch (e: any) {
      console.error('handleImportCsv error:', e)
      setError(`Falha ao importar CSV. (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
    } finally {
      setImporting(false)
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

      await loadAgencias()
    })

    return () => unsub()
  }, [router])

  const agenciaOptions = useMemo(() => {
    return [...rows]
      .filter((r) => isAgenciaTipoAG(r.tipo))
      .sort((a, b) => buildAgencyOptionLabel(a).localeCompare(buildAgencyOptionLabel(b)))
      .map((r) => buildAgencyOptionLabel(r))
  }, [rows])

  const filtered = useMemo(() => {
    const rawTerm = q.trim()
    const term = rawTerm.toLowerCase()
    const list = [...rows].sort((a, b) => a.nomeAg.localeCompare(b.nomeAg))

    if (!term) return list

    const selectedCode = extractAgencyCodeFromSearch(rawTerm)
    const typedOnlyDigits = /^\d+$/.test(rawTerm)
    const looksLikeAgencySelection = typedOnlyDigits || rawTerm.includes(' - ') || !!selectedCode

    if (looksLikeAgencySelection) {
      return list.filter((r) => {
        if (!isAgenciaTipoAG(r.tipo)) return false

        const normalizedCode = normalizeAgencyCode(r.codAg)
        const label = buildAgencyOptionLabel(r).toLowerCase()
        const nome = toStr(r.nomeAg).toLowerCase()

        if (selectedCode) {
          return normalizedCode === selectedCode
        }

        return (
          normalizedCode.includes(normalizeAgencyCode(rawTerm)) ||
          label.includes(term) ||
          nome.includes(term)
        )
      })
    }

    return list.filter((r) =>
      [
        r.codAg,
        normalizeAgencyCode(r.codAg),
        r.nomeAg,
        r.tipo,
        r.supervisor,
        r.contatoSupervisor,
        r.gerenteAg,
        r.telGerente1,
        r.emailGerente,
        r.regional,
        r.nomeDiretorRegional,
        r.telefoneRegional,
        isAgenciaTipoAG(r.tipo) ? buildAgencyOptionLabel(r) : '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)
    )
  }, [rows, q])

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <span className="pill">Gestão Agências</span>
        <h1 className="h1" style={{ marginTop: '.75rem' }}>
          🏦 Gestão de Agências
        </h1>
        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          Cadastre, edite e consulte supervisor, gerente e regional das agências.
        </p>
      </div>

      <div
        className="card"
        style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}
      >
        <Pill>Total: {rows.length}</Pill>
        <Pill>Filtrados: {filtered.length}</Pill>

        <button
          className="btn-primary"
          onClick={loadAgencias}
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
            <div className="label">Buscar agência</div>
            <input
              className="input"
              list="agencias-ag-list"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Digite ou escolha: 0000 - Nome da agência"
            />
            <datalist id="agencias-ag-list">
              {agenciaOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>

          {isAdmin && (
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'end' }}>
              <button type="button" className="btn-primary" onClick={startNew}>
                + Nova agência
              </button>

              {showForm && <LightButton onClick={resetForm}>Cancelar</LightButton>}
            </div>
          )}
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

      {isAdmin && (
        <div className="card" style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <span className="pill">Admin</span>
            <h2 className="h2" style={{ marginTop: '.6rem' }}>
              Importar base CSV
            </h2>
            <p className="p-muted" style={{ marginTop: '.35rem' }}>
              Importa sua base atual e atualiza as agências pelo <b>COD_AG</b>.
            </p>
          </div>

          <label>
            <div className="label">Arquivo CSV</div>
            <input
              className="input"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={handleImportCsv}
              disabled={importing}
            >
              {importing ? 'Importando...' : 'Importar CSV'}
            </button>
          </div>
        </div>
      )}

      {showForm && isAdmin && (
        <div className="card" style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <span className="pill">{editingCodAg ? 'Editar' : 'Nova'}</span>
            <h2 className="h2" style={{ marginTop: '.6rem' }}>
              {editingCodAg ? 'Editar agência' : 'Cadastrar agência'}
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
              <div className="label">COD_AG</div>
              <input
                className="input"
                value={form.codAg}
                onChange={(e) => updateForm('codAg', e.target.value)}
                placeholder="Ex.: 1025"
                disabled={!!editingCodAg}
              />
            </label>

            <label>
              <div className="label">NOME_AG</div>
              <input
                className="input"
                value={form.nomeAg}
                onChange={(e) => updateForm('nomeAg', e.target.value)}
                placeholder="Nome da agência"
              />
            </label>

            <label>
              <div className="label">TIPO</div>
              <input
                className="input"
                value={form.tipo}
                onChange={(e) => updateForm('tipo', e.target.value)}
                placeholder="AG / PAB / etc"
              />
            </label>

            <label>
              <div className="label">SUPERVISOR</div>
              <input
                className="input"
                value={form.supervisor}
                onChange={(e) => updateForm('supervisor', e.target.value)}
                placeholder="Nome do supervisor"
              />
            </label>

            <label>
              <div className="label">CONTATO_SUPERVISOR</div>
              <input
                className="input"
                value={form.contatoSupervisor}
                onChange={(e) => updateForm('contatoSupervisor', e.target.value)}
                placeholder="Telefone do supervisor"
              />
            </label>

            <label>
              <div className="label">GERENTE_AG</div>
              <input
                className="input"
                value={form.gerenteAg}
                onChange={(e) => updateForm('gerenteAg', e.target.value)}
                placeholder="Nome do gerente"
              />
            </label>

            <label>
              <div className="label">TEL_GERENTE1</div>
              <input
                className="input"
                value={form.telGerente1}
                onChange={(e) => updateForm('telGerente1', e.target.value)}
                placeholder="Telefone do gerente"
              />
            </label>

            <label>
              <div className="label">EMAIL_GERENTE</div>
              <input
                className="input"
                value={form.emailGerente}
                onChange={(e) => updateForm('emailGerente', e.target.value)}
                placeholder="Email do gerente"
              />
            </label>

            <label>
              <div className="label">REGIONAL</div>
              <input
                className="input"
                value={form.regional}
                onChange={(e) => updateForm('regional', e.target.value)}
                placeholder="Código ou nome regional"
              />
            </label>

            <label>
              <div className="label">NOME_DIRETORREGIONAL</div>
              <input
                className="input"
                value={form.nomeDiretorRegional}
                onChange={(e) => updateForm('nomeDiretorRegional', e.target.value)}
                placeholder="Nome do diretor regional"
              />
            </label>

            <label>
              <div className="label">TELEFONE_REGIONAL</div>
              <input
                className="input"
                value={form.telefoneRegional}
                onChange={(e) => updateForm('telefoneRegional', e.target.value)}
                placeholder="Telefone regional"
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editingCodAg ? 'Salvar alterações' : 'Salvar agência'}
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1rem',
          }}
        >
          {filtered.map((r) => (
            <div key={r.codAg} className="card" style={{ display: 'grid', gap: '.75rem' }}>
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
                  <Pill>COD_AG: {r.codAg || '—'}</Pill>
                  <Pill>{r.tipo || '—'}</Pill>
                </div>

                {isAdmin && (
                  <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                    <LightButton onClick={() => startEdit(r)} title="Editar agência">
                      ✏️ Editar
                    </LightButton>
                  </div>
                )}
              </div>

              <div>
                <div className="p-muted" style={{ fontSize: 12 }}>
                  Nome da Agência
                </div>
                <div style={{ fontWeight: 900, fontSize: '1.08rem', marginTop: '.15rem' }}>
                  {r.nomeAg || '—'}
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '.6rem',
                }}
              >
                <InfoBox label="Supervisor" value={r.supervisor || '—'} />
                <InfoBox label="Contato Supervisor" value={r.contatoSupervisor || '—'} />
                <InfoBox label="Gerente Agência" value={r.gerenteAg || '—'} />
                <InfoBox label="Telefone Gerente" value={r.telGerente1 || '—'} />
                <InfoBox label="Email Gerente" value={r.emailGerente || '—'} />
                <InfoBox label="Regional" value={r.regional || '—'} />
                <InfoBox label="Diretor Regional" value={r.nomeDiretorRegional || '—'} />
                <InfoBox label="Telefone Regional" value={r.telefoneRegional || '—'} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-soft">
          <p className="p-muted">
            {loading ? 'Carregando agências...' : 'Nenhuma agência encontrada.'}
          </p>
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