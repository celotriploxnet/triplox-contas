'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { listAll, getDownloadURL, ref } from 'firebase/storage'

import { auth, storage } from '@/lib/firebase'

type Arquivo = {
  name: string
  url: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [userName, setUserName] = useState<string>('Usuário')

  const [files, setFiles] = useState<Arquivo[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* =========================
     AUTH + USER NAME
     ========================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)

      if (u?.email) {
        const rawName = u.email.split('@')[0]
        const formattedName =
          rawName.charAt(0).toUpperCase() + rawName.slice(1)

        setUserName(formattedName)
      }
    })

    return () => unsub()
  }, [])

  /* =========================
     LOAD FILES
     ========================= */
  async function loadFiles() {
    try {
      setError(null)
      setLoadingFiles(true)

      const folderRef = ref(storage, 'arquivos-obrigatorios')
      const res = await listAll(folderRef)

      const list: Arquivo[] = []

      for (const item of res.items) {
        const url = await getDownloadURL(item)
        list.push({ name: item.name, url })
      }

      setFiles(list)
    } catch (e) {
      console.error(e)
      setError('Não foi possível carregar os arquivos obrigatórios.')
    } finally {
      setLoadingFiles(false)
    }
  }

  useEffect(() => {
    loadFiles()
  }, [])

  return (
    <section style={{ display: 'grid', gap: '1.5rem' }}>
      {/* =========================
          BOAS-VINDAS
         ========================= */}
      <div className="card">
        <span className="pill">Dashboard</span>

        <h1 className="h1" style={{ marginTop: '1rem' }}>
          Bem-vindo, {userName} 👋
        </h1>

        <p className="p-muted" style={{ marginTop: '.5rem' }}>
          Aqui você encontra seus treinamentos, agenda e arquivos importantes para o dia a dia.
        </p>
      </div>

      {/* =========================
          ARQUIVOS OBRIGATÓRIOS
         ========================= */}
      <div className="card">
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <span className="pill">Arquivos</span>
          <h2 className="h2">Arquivos obrigatórios</h2>
        </div>

        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          Documentos oficiais para consulta e impressão.
        </p>

        {loadingFiles && (
          <p className="p-muted" style={{ marginTop: '1rem' }}>
            Carregando arquivos...
          </p>
        )}

        {error && (
          <p
            className="p-muted"
            style={{ marginTop: '1rem', color: 'rgba(214,31,44,.95)' }}
          >
            {error}
          </p>
        )}

        {!loadingFiles && files.length === 0 && (
          <p className="p-muted" style={{ marginTop: '1rem' }}>
            Nenhum arquivo disponível no momento.
          </p>
        )}

        {files.length > 0 && (
          <div
            style={{
              marginTop: '1rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1rem',
            }}
          >
            {files.map((f) => (
              <div key={f.name} className="card-soft">
                <div style={{ fontWeight: 800 }}>{f.name}</div>

                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  style={{ marginTop: '.75rem', display: 'inline-flex' }}
                >
                  Baixar arquivo
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {!user && (
        <p className="p-muted">
          Você não está autenticado.
        </p>
      )}
    </section>
  )
}