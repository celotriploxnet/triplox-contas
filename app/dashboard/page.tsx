'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'

import { auth, db, storage } from '@/lib/firebase'

type ArquivoObrigatorio = {
  id: string
  titulo: string
  storagePath: string
  fileName: string
  uploadedAt?: any
  uploadedBy?: string
}

export default function DashboardPage() {
  const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'
  const STORAGE_FOLDER = 'arquivos-obrigatorios'

  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userName, setUserName] = useState('Usuário')

  // lista de arquivos (Firestore)
  const [items, setItems] = useState<ArquivoObrigatorio[]>([])
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState('')
  const [error, setError] = useState<string | null>(null)

  // upload (admin)
  const [titulo, setTitulo] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // cache de URLs
  const [urlMap, setUrlMap] = useState<Record<string, string>>({})

  /* =========================
     AUTH
     ========================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)

      if (u?.email) {
        const raw = u.email.split('@')[0]
        const formatted = raw.charAt(0).toUpperCase() + raw.slice(1)
        setUserName(formatted)

        setIsAdmin(u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase())
      } else {
        setIsAdmin(false)
      }
    })

    return () => unsub()
  }, [])

  /* =========================
     LOAD LIST (Firestore)
     ========================= */
  async function loadObrigatorios() {
    try {
      setError(null)
      setInfo('')
      setLoading(true)

      const qy = query(collection(db, 'arquivos_obrigatorios'), orderBy('uploadedAt', 'desc'))
      const snap = await getDocs(qy)

      const list: ArquivoObrigatorio[] = []
      snap.forEach((d) => {
        const data = d.data() as any
        list.push({
          id: d.id,
          titulo: data.titulo || '',
          storagePath: data.storagePath || '',
          fileName: data.fileName || '',
          uploadedAt: data.uploadedAt,
          uploadedBy: data.uploadedBy || '',
        })
      })

      setItems(list)

      // pré-carrega urls (sem estourar rate)
      const nextUrlMap: Record<string, string> = {}
      for (const it of list) {
        if (!it.storagePath) continue
        try {
          nextUrlMap[it.id] = await getDownloadURL(ref(storage, it.storagePath))
        } catch (e) {
          console.error('Erro getDownloadURL:', it.id, e)
        }
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function sanitizeFileName(name: string) {
    return name
      .replace(/\s+/g, '-')
      .replace(/[^\w.\-]+/g, '')
      .replace(/-+/g, '-')
      .toLowerCase()
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

      // 1) sobe no Storage
      await uploadBytes(ref(storage, storagePath), pdfFile, {
        contentType: 'application/pdf',
      })

      // 2) salva registro no Firestore
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
    const ok = window.confirm(`Remover este arquivo?\n\n${it.titulo}\n${it.fileName}`)
    if (!ok) return

    try {
      setError(null)
      setInfo('')
      setDeletingId(it.id)

      // apaga no storage (se existir)
      if (it.storagePath) {
        await deleteObject(ref(storage, it.storagePath))
      }

      // apaga no firestore
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

  const cards = useMemo(() => items, [items])

  return (
    <section style={{ display: 'grid', gap: '1.5rem' }}>
      {/* BOAS-VINDAS */}
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

      {/* ARQUIVOS OBRIGATÓRIOS */}
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

        {/* BLOCO ADMIN (UPLOAD) */}
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

        {/* LISTA */}
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

                  <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                    <a
                      href={url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary"
                      style={{ display: 'inline-flex', pointerEvents: url ? 'auto' : 'none', opacity: url ? 1 : 0.65 }}
                      title={url ? 'Baixar PDF' : 'Link indisponível'}
                    >
                      Baixar PDF
                    </a>

                    {isAdmin && (
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => handleDelete(it)}
                        disabled={deletingId === it.id}
                        style={{ color: 'rgba(16,16,24,.92)', background: 'rgba(255,255,255,.65)' }}
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