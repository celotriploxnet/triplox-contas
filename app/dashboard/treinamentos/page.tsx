'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

import { onAuthStateChanged, User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'

import { auth, db, storage } from '@/lib/firebase'

type LinhaTreinamento = {
  chaveLoja: string
  razaoSocial: string
  nomeLoja: string
  cnpj: string
  codAgRelacionamento: string
  nomeAg: string
  numPacb: string
  municipio: string
  ddd: string
  telefone: string
  statusTablet: string
  contato: string
  emailContato: string
}

function toStr(v: any) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return String(Math.trunc(v))
  return String(v).trim()
}

function padNum(v: any, len: number) {
  const s = toStr(v).replace(/\D/g, '')
  return s.padStart(len, '0')
}

function formatCNPJ(cnpj: any, filial: any, controle: any) {
  const base = padNum(cnpj, 8)
  const fil = padNum(filial, 4)
  const ctrl = padNum(controle, 2)
  const full = `${base}${fil}${ctrl}`.slice(0, 14).padStart(14, '0')
  return full.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  )
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

async function readExcelFile(file: File): Promise<LinhaTreinamento[]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]

  const raw: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

  const normalized = raw.map((obj) => {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(obj)) out[normalizeKey(k)] = v
    return out
  })

  return normalized.map((r) => ({
    chaveLoja: toStr(r['Chave Loja']),
    razaoSocial: toStr(r['Razão Social']),
    nomeLoja: toStr(r['Nome da Loja']),
    cnpj: formatCNPJ(r['CNPJ'], r['Filial'], r['Controle']),
    codAgRelacionamento: toStr(r['Cód. Ag. Relacionamento']),
    nomeAg: toStr(r['Nome Ag.']),
    numPacb: toStr(r['Num. PACB']),
    municipio: toStr(r['Municipio']),
    ddd: toStr(r['DDD']),
    telefone: toStr(r['Telefone']),
    statusTablet: toStr(r['Status do Tablet']),
    contato: toStr(r['Contato']),
    emailContato: toStr(r['Email do contato']) || toStr(r['Email Contato']),
  }))
}

export default function TreinamentosPage() {
  const router = useRouter()

  // ✅ arquivo fixo
  const FIXED_PATH = 'trainings/lista-atual.xls'

  const [user, setUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingRole, setCheckingRole] = useState(true)

  const [file, setFile] = useState<File | null>(null)

  const [rows, setRows] = useState<LinhaTreinamento[]>([])
  const [q, setQ] = useState('')

  const [loadingRead, setLoadingRead] = useState(false)
  const [loadingUpload, setLoadingUpload] = useState(false)

  const [err, setErr] = useState<string | null>(null)
  const [sourceInfo, setSourceInfo] = useState<string>('')

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) =>
      [
        r.chaveLoja,
        r.razaoSocial,
        r.nomeLoja,
        r.municipio,
        r.cnpj,
        r.nomeAg,
        r.numPacb,
        r.statusTablet,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)
    )
  }, [rows, q])

  async function loadCurrentList() {
    // ✅ garante que só roda com auth pronto
    if (!auth.currentUser) {
      setErr('Você precisa estar logado para visualizar a lista.')
      return
    }

    setErr(null)
    setLoadingRead(true)
    setRows([])
    setQ('')
    setSourceInfo('')

    try {
      const fileRef = ref(storage, FIXED_PATH)
      const url = await getDownloadURL(fileRef)

      const resp = await fetch(url)
      if (!resp.ok) throw new Error('Não consegui baixar a lista atual do Storage.')

      const blob = await resp.blob()
      const tempFile = new File([blob], 'lista-atual.xls', { type: blob.type })

      const data = await readExcelFile(tempFile)
      setRows(data)
      setSourceInfo(`Lista carregada do Storage: ${FIXED_PATH}`)
    } catch (e: any) {
      console.error('loadCurrentList error:', e)

      const code = e?.code as string | undefined

      if (code === 'storage/object-not-found') {
        setErr('Ainda não existe lista atual no Storage. Peça ao admin para enviar.')
      } else if (code === 'storage/unauthorized') {
        setErr(
          'Sem permissão para ler a lista. Confirme as Storage Rules (read para usuários logados).'
        )
      } else {
        setErr(
          'Falha ao carregar a lista (arquivo inexistente ou permissão). Veja o console para detalhes.'
        )
      }
    } finally {
      setLoadingRead(false)
    }
  }

  async function handleUploadFixed() {
    if (!file) {
      setErr('Selecione o arquivo XLS/XLSX para enviar.')
      return
    }
    if (!auth.currentUser) {
      setErr('Você precisa estar logado.')
      return
    }
    if (!isAdmin) {
      setErr('Apenas administrador pode enviar.')
      return
    }

    try {
      setErr(null)
      setLoadingUpload(true)

      const name = file.name.toLowerCase()
      if (!name.endsWith('.xls') && !name.endsWith('.xlsx')) {
        throw new Error('Envie um arquivo .xls ou .xlsx.')
      }

      const fileRef = ref(storage, FIXED_PATH)
      await uploadBytes(fileRef, file, { contentType: file.type || undefined })

      setSourceInfo(`Lista atual atualizada ✅ (${FIXED_PATH})`)

      // ✅ recarrega do Storage pra garantir que ficou certo
      await loadCurrentList()
      setFile(null)
    } catch (e: any) {
      console.error('handleUploadFixed error:', e)
      const code = e?.code as string | undefined
      if (code === 'storage/unauthorized') {
        setErr(
          'Upload negado. Confirme: você está como admin no Firestore (users/{uid}.role="admin") e as Storage Rules.'
        )
      } else {
        setErr(e?.message || 'Erro ao enviar. Verifique as rules do Storage.')
      }
    } finally {
      setLoadingUpload(false)
    }
  }

  // ✅ Auth primeiro → depois role → depois carrega lista
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      setCheckingAuth(false)

      if (!u) {
        setIsAdmin(false)
        setCheckingRole(false)
        router.push('/login')
        return
      }

      // checa role no Firestore
      try {
        const snap = await getDoc(doc(db, 'users', u.uid))
        setIsAdmin(snap.exists() && snap.data()?.role === 'admin')
      } catch (e) {
        console.error('Erro ao checar role:', e)
        setIsAdmin(false)
      } finally {
        setCheckingRole(false)
      }

      // ✅ agora que está autenticado, pode ler Storage
      await loadCurrentList()
    })

    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <span className="pill">Treinamentos</span>
        <h1 className="h1" style={{ marginTop: '.75rem' }}>
          Lista de empresas a treinar
        </h1>
        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          Qualquer usuário pode visualizar. Apenas admin pode atualizar a lista.
        </p>
      </div>

      {/* Leitura para todos (logados) */}
      <div className="card" style={{ display: 'grid', gap: '1rem' }}>
        <div
          style={{
            display: 'flex',
            gap: '.75rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <button
            className="btn-primary"
            onClick={loadCurrentList}
            disabled={loadingRead || checkingAuth}
          >
            {checkingAuth ? 'Verificando login...' : loadingRead ? 'Carregando...' : 'Recarregar lista'}
          </button>

          {sourceInfo && <span className="pill">{sourceInfo}</span>}
          {!checkingRole && isAdmin && <span className="pill">Admin</span>}
        </div>

        {err && (
          <div className="card-soft" style={{ borderColor: 'rgba(214,31,44,.25)' }}>
            <p className="p-muted" style={{ color: 'rgba(214,31,44,.95)' }}>
              {err}
            </p>
          </div>
        )}
      </div>

      {/* Upload só admin */}
      {!checkingRole && isAdmin && (
        <div className="card" style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <span className="pill">Admin</span>
            <h2 className="h2" style={{ marginTop: '.6rem' }}>
              Atualizar lista atual
            </h2>
            <p className="p-muted" style={{ marginTop: '.35rem' }}>
              O arquivo será salvo como <b>{FIXED_PATH}</b> (substitui o anterior).
            </p>
          </div>

          <label>
            <div className="label">Arquivo (XLS/XLSX)</div>
            <input
              type="file"
              accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="input"
            />
          </label>

          <button onClick={handleUploadFixed} disabled={loadingUpload} className="btn-primary">
            {loadingUpload ? 'Enviando...' : 'Enviar e substituir lista'}
          </button>
        </div>
      )}

      {/* Tabela */}
      {rows.length > 0 && (
        <div className="card" style={{ display: 'grid', gap: '1rem' }}>
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <span className="pill">Registros: {filtered.length}</span>

            <div style={{ flex: 1, minWidth: 260 }}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por chave, loja, razão social, município, CNPJ..."
                className="input"
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  {[
                    'Chave Loja',
                    'Razão Social',
                    'Nome da Loja',
                    'CNPJ',
                    'Cód. Ag. Rel.',
                    'Nome Ag.',
                    'PACB',
                    'Município',
                    'DDD',
                    'Telefone',
                    'Status Tablet',
                    'Contato',
                    'Email',
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        fontSize: 12,
                        padding: '12px 10px',
                        borderBottom: '1px solid rgba(15, 15, 25, .10)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((r, idx) => (
                  <tr key={`${r.chaveLoja}-${idx}`}>
                    {[
                      r.chaveLoja,
                      r.razaoSocial,
                      r.nomeLoja,
                      r.cnpj,
                      r.codAgRelacionamento,
                      r.nomeAg,
                      r.numPacb,
                      r.municipio,
                      r.ddd,
                      r.telefone,
                      r.statusTablet,
                      r.contato,
                      r.emailContato,
                    ].map((v, i) => (
                      <td
                        key={i}
                        style={{
                          fontSize: 13,
                          padding: '10px',
                          borderBottom: '1px solid rgba(15, 15, 25, .06)',
                          verticalAlign: 'top',
                          whiteSpace: i === 1 || i === 2 ? 'normal' : 'nowrap',
                          minWidth: i === 1 || i === 2 ? 220 : undefined,
                        }}
                      >
                        {v || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Debug opcional */}
      {!checkingAuth && user && (
        <p className="p-muted" style={{ marginTop: '0.25rem' }}>
          Logado como: <b>{user.email}</b>
        </p>
      )}
    </section>
  )
}