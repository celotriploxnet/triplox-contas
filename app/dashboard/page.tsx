'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { onAuthStateChanged, User } from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import {
  deleteObject,
  getDownloadURL,
  getBytes,
  listAll,
  ref,
  uploadBytes,
} from 'firebase/storage'
import * as XLSX from 'xlsx'

import { auth, db, storage } from '@/lib/firebase'

type ArquivoObrigatorio = {
  id: string
  titulo: string
  storagePath: string
  fileName: string
  uploadedAt?: any
  uploadedBy?: string
  readonly?: boolean
}

type BaseMeta = {
  updatedAt?: any
  updatedBy?: string
  originalFileName?: string
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function formatPtBRDateTimeFromDate(d: Date) {
  const dd = pad2(d.getDate())
  const mm = pad2(d.getMonth() + 1)
  const yyyy = d.getFullYear()
  const hh = pad2(d.getHours())
  const mi = pad2(d.getMinutes())
  return `${dd}/${mm}/${yyyy} às ${hh}:${mi}`
}

function safeTextDecoder(u8: Uint8Array) {
  try {
    return new TextDecoder('utf-8').decode(u8)
  } catch {
    let s = ''
    for (const b of u8) s += String.fromCharCode(b)
    return s
  }
}

function sanitizeFileName(name: string) {
  return name
    .replace(/\s+/g, '-')
    .replace(/[^\w.\-]+/g, '')
    .replace(/-+/g, '-')
    .toLowerCase()
}

function isChamadoAberto(status: any) {
  const s = String(status || '').trim().toLowerCase()
  if (!s) return true
  return s !== 'solucionado'
}

export default function DashboardPage() {
  const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'
  const STORAGE_FOLDER = 'arquivos-obrigatorios'

  const BASE_STORAGE_PATH = 'base-lojas/banco.csv'
  const BASE_BACKUP_FOLDER = 'base-lojas/backups'
  const BASE_META_DOC = { col: 'config', docId: 'base_lojas' }

  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userName, setUserName] = useState('Usuário')

  const [items, setItems] = useState<ArquivoObrigatorio[]>([])
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [titulo, setTitulo] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [urlMap, setUrlMap] = useState<Record<string, string>>({})

  const [baseFile, setBaseFile] = useState<File | null>(null)
  const [baseUploading, setBaseUploading] = useState(false)
  const [baseInfo, setBaseInfo] = useState('')
  const [baseError, setBaseError] = useState<string | null>(null)
  const [baseMeta, setBaseMeta] = useState<BaseMeta | null>(null)

  const [chamadosAbertos, setChamadosAbertos] = useState(0)
  const [carregandoChamados, setCarregandoChamados] = useState(false)

  /* =========================
     AUTH
     ========================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)

      if (u?.email) {
        const raw = u.email.split('@')[0]
        const formatted = raw.charAt(0).toUpperCase() + raw.slice(1)
        setUserName(formatted)

        setIsAdmin(u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase())
      } else {
        setIsAdmin(false)
      }

      if (u?.uid) {
        await loadChamadosAbertos(u.uid)
      } else {
        setChamadosAbertos(0)
      }
    })

    return () => unsub()
  }, [])

  /* =========================
     CHAMADOS
     ========================= */
  async function loadChamadosAbertos(uid: string) {
    try {
      setCarregandoChamados(true)

      const qy = query(collection(db, 'chamados'), where('userId', '==', uid))
      const snap = await getDocs(qy)

      let total = 0
      snap.forEach((d) => {
        const data = d.data() as any
        if (isChamadoAberto(data?.statusChamado)) total++
      })

      setChamadosAbertos(total)
    } catch (e) {
      console.warn('Falha ao carregar chamados em aberto:', e)
      setChamadosAbertos(0)
    } finally {
      setCarregandoChamados(false)
    }
  }

  /* =========================
     LOAD BASE META (Firestore)
     ========================= */
  async function loadBaseMeta() {
    try {
      const refDoc = doc(db, BASE_META_DOC.col, BASE_META_DOC.docId)
      const snap = await getDoc(refDoc)
      if (!snap.exists()) {
        setBaseMeta(null)
        return
      }
      const data = snap.data() as any
      setBaseMeta({
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy || '',
        originalFileName: data.originalFileName || '',
      })
    } catch (e) {
      console.warn('Falha ao ler meta da base:', e)
      setBaseMeta(null)
    }
  }

  /* =========================
     LOAD LIST (Firestore + Storage extra)
     ========================= */
  async function loadObrigatorios() {
    try {
      setError(null)
      setInfo('')
      setLoading(true)

      const qy = query(collection(db, 'arquivos_obrigatorios'), orderBy('uploadedAt', 'desc'))
      const snap = await getDocs(qy)

      const list: ArquivoObrigatorio[] = []
      const firestorePaths = new Set<string>()

      snap.forEach((d) => {
        const data = d.data() as any
        const storagePath = data.storagePath || ''
        list.push({
          id: d.id,
          titulo: data.titulo || '',
          storagePath,
          fileName: data.fileName || '',
          uploadedAt: data.uploadedAt,
          uploadedBy: data.uploadedBy || '',
        })
        if (storagePath) firestorePaths.add(storagePath)
      })

      const nextUrlMap: Record<string, string> = {}
      for (const it of list) {
        if (!it.storagePath) continue
        try {
          nextUrlMap[it.id] = await getDownloadURL(ref(storage, it.storagePath))
        } catch (e) {
          console.error('Erro getDownloadURL:', it.id, e)
        }
      }

      try {
        const folderRef = ref(storage, STORAGE_FOLDER)
        const listed = await listAll(folderRef)

        const storageOnly: ArquivoObrigatorio[] = []
        for (const itemRef of listed.items) {
          if (firestorePaths.has(itemRef.fullPath)) continue

          const base = itemRef.name.replace(/\.pdf$/i, '')
          const pretty = base
            .replace(/^\d{4}-\d{2}-\d{2}.*?-/, '')
            .replace(/[-_]+/g, ' ')
            .trim()

          const tituloAuto = pretty
            ? pretty.charAt(0).toUpperCase() + pretty.slice(1)
            : 'Documento'

          const fakeId = `storage:${itemRef.fullPath}`

          storageOnly.push({
            id: fakeId,
            titulo: tituloAuto,
            storagePath: itemRef.fullPath,
            fileName: itemRef.name,
            readonly: true,
          })

          try {
            nextUrlMap[fakeId] = await getDownloadURL(itemRef)
          } catch (e) {
            console.error('Erro getDownloadURL (storageOnly):', itemRef.fullPath, e)
          }
        }

        list.push(...storageOnly)
      } catch (e) {
        console.warn('Não consegui listar arquivos antigos do Storage:', e)
      }

      setItems(list)
      setUrlMap(nextUrlMap)
    } catch (e: any) {
      console.error(e)
      setError(`Não foi possível carregar os arquivos. (${e?.code || 'sem-code'})`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadObrigatorios()
    loadBaseMeta()
  }, [])

  /* =========================
     ADMIN: UPLOAD PDF
     ========================= */
  function validatePdf(file: File) {
    const name = file.name.toLowerCase()
    const okExt = name.endsWith('.pdf')
    const okType = file.type === 'application/pdf' || file.type === ''
    return okExt && okType
  }

  async function handleUpload() {
    if (!user) {
      setError('Você precisa estar logado.')
      return
    }
    if (!isAdmin) {
      setError('Apenas o administrador pode enviar arquivos.')
      return
    }
    if (!titulo.trim()) {
      setError('Preencha: “O que se refere”.')
      return
    }
    if (!pdfFile) {
      setError('Selecione o PDF para enviar.')
      return
    }
    if (!validatePdf(pdfFile)) {
      setError('Envie somente arquivo PDF (.pdf).')
      return
    }

    try {
      setError(null)
      setInfo('')
      setUploading(true)

      const safeName = sanitizeFileName(pdfFile.name)
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      const storagePath = `${STORAGE_FOLDER}/${stamp}-${safeName}`

      await uploadBytes(ref(storage, storagePath), pdfFile, {
        contentType: 'application/pdf',
      })

      await addDoc(collection(db, 'arquivos_obrigatorios'), {
        titulo: titulo.trim(),
        storagePath,
        fileName: pdfFile.name,
        uploadedAt: serverTimestamp(),
        uploadedBy: user.email || '',
      })

      setInfo('Arquivo enviado ✅')
      setTitulo('')
      setPdfFile(null)

      await loadObrigatorios()
    } catch (e: any) {
      console.error(e)
      setError(`Falha ao enviar. (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
    } finally {
      setUploading(false)
    }
  }

  /* =========================
     ADMIN: DELETE
     ========================= */
  async function handleDelete(it: ArquivoObrigatorio) {
    if (!user || !isAdmin) return
    if (it.readonly) {
      setError(
        'Este arquivo é antigo (só está no Storage). Para removê-lo, envie novamente pelo sistema ou peça ao admin remover manualmente no Storage.'
      )
      return
    }

    const ok = window.confirm(`Remover este arquivo?\n\n${it.titulo}\n${it.fileName}`)
    if (!ok) return

    try {
      setError(null)
      setInfo('')
      setDeletingId(it.id)

      if (it.storagePath) {
        await deleteObject(ref(storage, it.storagePath))
      }

      await deleteDoc(doc(db, 'arquivos_obrigatorios', it.id))

      setInfo('Arquivo removido ✅')
      await loadObrigatorios()
    } catch (e: any) {
      console.error(e)
      setError(`Falha ao remover. (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
    } finally {
      setDeletingId(null)
    }
  }

  /* =========================
     ADMIN: BASE UPLOAD
     ========================= */
  function validateBaseFile(file: File) {
    const name = file.name.toLowerCase()
    const okExt = name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls')
    return okExt
  }

  async function backupCurrentBaseIfExists() {
    try {
      const currentBytes = await getBytes(ref(storage, BASE_STORAGE_PATH))
      if (!currentBytes || currentBytes.byteLength === 0) return

      const now = new Date()
      const stamp = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}_${pad2(now.getHours())}-${pad2(
        now.getMinutes()
      )}-${pad2(now.getSeconds())}`

      const backupPath = `${BASE_BACKUP_FOLDER}/banco_${stamp}.csv`
      await uploadBytes(ref(storage, backupPath), currentBytes, { contentType: 'text/csv' })
    } catch (e: any) {
      const code = String(e?.code || '')
      if (code.includes('storage/object-not-found')) return
      console.warn('Backup da base falhou:', e)
    }
  }

  async function handleBaseUpload() {
    if (!user) {
      setBaseError('Você precisa estar logado.')
      return
    }
    if (!isAdmin) {
      setBaseError('Apenas o administrador pode atualizar a base.')
      return
    }
    if (!baseFile) {
      setBaseError('Selecione um arquivo (.xlsx, .xls ou .csv).')
      return
    }
    if (!validateBaseFile(baseFile)) {
      setBaseError('Envie somente .xlsx, .xls ou .csv.')
      return
    }

    try {
      setBaseError(null)
      setBaseInfo('')
      setBaseUploading(true)

      await backupCurrentBaseIfExists()

      const buf = await baseFile.arrayBuffer()

      {
        const now = new Date()
        const stamp = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}_${pad2(now.getHours())}-${pad2(
          now.getMinutes()
        )}-${pad2(now.getSeconds())}`
        const safeName = sanitizeFileName(baseFile.name)
        const origPath = `${BASE_BACKUP_FOLDER}/upload_${stamp}_${safeName}`
        await uploadBytes(ref(storage, origPath), new Uint8Array(buf), {
          contentType: baseFile.type || 'application/octet-stream',
        })
      }

      let csvText = ''

      const lower = baseFile.name.toLowerCase()
      if (lower.endsWith('.csv')) {
        csvText = safeTextDecoder(new Uint8Array(buf))
      } else {
        const wb = XLSX.read(buf, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        csvText = XLSX.utils.sheet_to_csv(ws)
      }

      const csvBytes = new TextEncoder().encode(csvText)

      await uploadBytes(ref(storage, BASE_STORAGE_PATH), csvBytes, { contentType: 'text/csv' })

      await setDoc(
        doc(db, BASE_META_DOC.col, BASE_META_DOC.docId),
        {
          updatedAt: serverTimestamp(),
          updatedBy: user.email || '',
          originalFileName: baseFile.name,
        },
        { merge: true }
      )

      setBaseInfo('Base atualizada ✅')
      setBaseFile(null)

      await loadBaseMeta()
    } catch (e: any) {
      console.error(e)
      setBaseError(`Falha ao atualizar base. (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
    } finally {
      setBaseUploading(false)
    }
  }

  const cards = useMemo(() => items, [items])

  const baseUpdatedLabel = useMemo(() => {
    const ts = baseMeta?.updatedAt
    try {
      if (ts?.toDate) {
        const d = ts.toDate() as Date
        return formatPtBRDateTimeFromDate(d)
      }
    } catch {}
    return null
  }, [baseMeta])

  const textoChamados = useMemo(() => {
    if (carregandoChamados) return 'Carregando seus chamados...'
    if (chamadosAbertos === 0) return 'Você não tem chamados em aberto.'
    if (chamadosAbertos === 1) return 'Você tem 1 chamado em aberto.'
    return `Você tem ${chamadosAbertos} chamados em aberto.`
  }, [carregandoChamados, chamadosAbertos])

  return (
    <section style={{ display: 'grid', gap: '1.5rem' }}>
      <div className="card">
        <span className="pill">Dashboard</span>

        <h1 className="h1" style={{ marginTop: '1rem' }}>
          Bem-vindo, {userName} 👋
        </h1>

        <p className="p-muted" style={{ marginTop: '.5rem' }}>
          Aqui você encontra seus treinamentos, agenda e arquivos importantes para o dia a dia.
        </p>

        {isAdmin && (
          <div style={{ marginTop: '.75rem' }}>
            <span className="pill">Admin</span>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard/treinamentos" className="card-soft">
          <div className="h2">📚 Treinamentos</div>
          <p className="p-muted mt-1">Ver empresas, assumir e agendar treinamentos.</p>
        </Link>

        <Link href="/dashboard/baixa-empresa" className="card-soft">
          <div className="h2">📤 Solicitar Baixa</div>
          <p className="p-muted mt-1">Baixa de treinamento ou check-in.</p>
        </Link>

        <Link href="/dashboard/nova-prestacao" className="card-soft">
          <div className="h2">💰 Solicitar Reembolso</div>
          <p className="p-muted mt-1">Enviar nova prestação e anexar comprovantes.</p>
        </Link>

        <Link href="/dashboard/historico" className="card-soft">
          <div className="h2">📑 Histórico</div>
          <p className="p-muted mt-1">Consultar prestações e downloads anteriores.</p>
        </Link>

        <Link href="/dashboard/agenda" className="card-soft">
          <div className="h2">🗓️ Agenda</div>
          <p className="p-muted mt-1">Ver agendamentos.</p>
        </Link>

        <Link href="/dashboard/reportar" className="card-soft">
          <div className="h2">📕 Reportar</div>
          <p className="p-muted mt-1">
            Abrir chamado ou acompanhar problemas reportados.
          </p>
          <p className="p-muted mt-1" style={{ fontWeight: 900 }}>
            {textoChamados}
          </p>
        </Link>
      </div>

      {isAdmin && (
        <div className="card">
          <span className="pill">Admin</span>
          <h2 className="h2" style={{ marginTop: '.65rem' }}>
            Base de dados (Expresso)
          </h2>
          <p className="p-muted" style={{ marginTop: '.35rem' }}>
            Atualize a base principal (banco.csv) direto por Excel ou CSV. O sistema faz backup automático.
          </p>

          <div style={{ marginTop: '.85rem', display: 'grid', gap: '.6rem' }}>
            <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="pill">📊 Base atualizada em:</span>
              <span className="p-muted" style={{ fontWeight: 900 }}>
                {baseUpdatedLabel ? baseUpdatedLabel : '—'}
              </span>
              {baseMeta?.originalFileName ? (
                <span className="pill" title="Último arquivo enviado">
                  {baseMeta.originalFileName}
                </span>
              ) : null}
            </div>

            {baseInfo && (
              <div>
                <span className="pill">{baseInfo}</span>
              </div>
            )}

            {baseError && (
              <div className="card-soft" style={{ borderColor: 'rgba(214,31,44,.25)' }}>
                <p className="p-muted" style={{ color: 'rgba(214,31,44,.95)', fontWeight: 800 }}>
                  {baseError}
                </p>
              </div>
            )}

            <label>
              <div className="label">Arquivo da base (.xlsx / .xls / .csv)</div>
              <input
                className="input"
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                onChange={(e) => setBaseFile(e.target.files?.[0] ?? null)}
              />
              <p className="p-muted" style={{ marginTop: '.35rem', fontSize: 13 }}>
                Você pode subir Excel direto. O sistema converte internamente para CSV e atualiza <b>base-lojas/banco.csv</b>.
              </p>
            </label>

            <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="button" className="btn-primary" onClick={handleBaseUpload} disabled={baseUploading}>
                {baseUploading ? 'Atualizando...' : '✅ Atualizar base automática'}
              </button>

              <button
                type="button"
                className="btn-ghost"
                onClick={loadBaseMeta}
                disabled={baseUploading}
                style={{ color: 'rgba(16,16,24,.92)', background: 'rgba(255,255,255,.65)' }}
              >
                Recarregar status
              </button>

              <Link href="/dashboard/importar-lojas" className="btn-ghost" style={{ textDecoration: 'none' }}>
                Abrir importador antigo
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="pill">Arquivos</span>
          <h2 className="h2">Arquivos obrigatórios</h2>

          <button
            type="button"
            className="btn-primary"
            onClick={loadObrigatorios}
            disabled={loading}
            style={{ marginLeft: 'auto' }}
          >
            {loading ? 'Atualizando...' : 'Atualizar lista'}
          </button>
        </div>

        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          Documentos oficiais para consulta, impressão e download.
        </p>

        {info && (
          <div style={{ marginTop: '.75rem' }}>
            <span className="pill">{info}</span>
          </div>
        )}

        {error && (
          <div className="card-soft" style={{ marginTop: '.75rem' }}>
            <p className="p-muted" style={{ color: 'rgba(214,31,44,.95)', fontWeight: 800 }}>
              {error}
            </p>
          </div>
        )}

        {isAdmin && (
          <div className="card-soft" style={{ marginTop: '1rem', display: 'grid', gap: '.85rem' }}>
            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="pill">Admin</span>
              <div className="h2">Enviar PDF para downloads</div>
            </div>

            <label>
              <div className="label">O que se refere</div>
              <input
                className="input"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Checklist do treinamento / Contrato / Roteiro oficial..."
              />
            </label>

            <label>
              <div className="label">Arquivo (PDF)</div>
              <input
                className="input"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              />
              <p className="p-muted" style={{ marginTop: '.35rem', fontSize: 13 }}>
                Somente PDF. O arquivo ficará disponível para todos os usuários logados.
              </p>
            </label>

            <button type="button" className="btn-primary" onClick={handleUpload} disabled={uploading}>
              {uploading ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        )}

        {loading && (
          <p className="p-muted" style={{ marginTop: '1rem' }}>
            Carregando...
          </p>
        )}

        {!loading && cards.length === 0 && (
          <p className="p-muted" style={{ marginTop: '1rem' }}>
            Nenhum arquivo disponível no momento.
          </p>
        )}

        {cards.length > 0 && (
          <div
            style={{
              marginTop: '1rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
            }}
          >
            {cards.map((it) => {
              const url = urlMap[it.id]
              return (
                <div key={it.id} className="card-soft" style={{ display: 'grid', gap: '.65rem' }}>
                  <div style={{ fontWeight: 900 }}>{it.titulo}</div>
                  <div className="p-muted" style={{ fontSize: 13 }}>
                    {it.fileName}
                  </div>

                  <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <a
                      href={url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary"
                      style={{
                        display: 'inline-flex',
                        pointerEvents: url ? 'auto' : 'none',
                        opacity: url ? 1 : 0.65,
                      }}
                      title={url ? 'Baixar PDF' : 'Link indisponível'}
                    >
                      Baixar PDF
                    </a>

                    {it.readonly && <span className="pill">Arquivo antigo</span>}

                    {isAdmin && !it.readonly && (
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => handleDelete(it)}
                        disabled={deletingId === it.id}
                        style={{
                          color: 'rgba(16,16,24,.92)',
                          background: 'rgba(255,255,255,.65)',
                        }}
                      >
                        {deletingId === it.id ? 'Removendo...' : 'Remover'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {!user && <p className="p-muted">Você não está autenticado.</p>}
    </section>
  )
}