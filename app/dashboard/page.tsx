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
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import {
  deleteObject,
  getDownloadURL,
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
  readonly?: boolean // ✅ arquivos que já existiam no Storage (sem doc no Firestore)
}

export default function DashboardPage() {
  const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'
  const STORAGE_FOLDER = 'arquivos-obrigatorios'

  // ✅ Base geral (banco.csv)
  const BASE_DEST_PATH = 'base-lojas/banco.csv'

  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userName, setUserName] = useState('Usuário')

  // lista de arquivos (Firestore + Storage extra)
  const [items, setItems] = useState<ArquivoObrigatorio[]>([])
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState('')
  const [error, setError] = useState<string | null>(null)

  // upload (admin) - PDFs
  const [titulo, setTitulo] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ✅ upload base (CSV/Excel)
  const [baseFile, setBaseFile] = useState<File | null>(null)
  const [uploadingBase, setUploadingBase] = useState(false)

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
     LOAD LIST (Firestore + Storage extra)
     (mantém seu comportamento antigo e só adiciona os arquivos antigos do Storage)
     ========================= */
  async function loadObrigatorios() {
    try {
      setError(null)
      setInfo('')
      setLoading(true)

      // 1) Firestore (como sempre)
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

      // 2) pré-carrega urls do Firestore (mantido)
      const nextUrlMap: Record<string, string> = {}
      for (const it of list) {
        if (!it.storagePath) continue
        try {
          nextUrlMap[it.id] = await getDownloadURL(ref(storage, it.storagePath))
        } catch (e) {
          console.error('Erro getDownloadURL:', it.id, e)
        }
      }

      // 3) NOVO: lista arquivos que já existiam no Storage (mas não têm doc no Firestore)
      try {
        const folderRef = ref(storage, STORAGE_FOLDER)
        const listed = await listAll(folderRef)

        const storageOnly: ArquivoObrigatorio[] = []
        for (const itemRef of listed.items) {
          if (firestorePaths.has(itemRef.fullPath)) continue

          // título “bonitinho” baseado no nome do arquivo
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

        // junta (Firestore primeiro, depois Storage-only)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* =========================
     ADMIN: UPLOAD PDF (mantido)
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
     ADMIN: DELETE (mantido, mas bloqueia apagar os "storageOnly")
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
     ✅ ADMIN: BASE (CSV/EXCEL)
     ========================= */

  function isCsv(file: File) {
    const n = file.name.toLowerCase()
    return n.endsWith('.csv')
  }

  function isExcel(file: File) {
    const n = file.name.toLowerCase()
    return n.endsWith('.xlsx') || n.endsWith('.xls')
  }

  async function uploadCsvTextToBase(csvText: string) {
    // garante newline final (ajuda alguns parsers)
    const fixed = csvText.endsWith('\n') ? csvText : csvText + '\n'

    const blob = new Blob([fixed], { type: 'text/csv;charset=utf-8' })
    const storageRef = ref(storage, BASE_DEST_PATH)

    await uploadBytes(storageRef, blob, { contentType: 'text/csv' })
  }

  async function handleUploadBaseCsvDirect() {
    if (!user || !isAdmin) {
      setError('Apenas o administrador pode atualizar a base.')
      return
    }
    if (!baseFile) {
      setError('Selecione um arquivo CSV (.csv).')
      return
    }
    if (!isCsv(baseFile)) {
      setError('Esse botão é apenas para CSV. Use “Atualizar base automática (Excel)” para .xlsx/.xls.')
      return
    }

    try {
      setUploadingBase(true)
      setError(null)
      setInfo('')

      // Sobe o CSV como está
      await uploadBytes(ref(storage, BASE_DEST_PATH), baseFile, {
        contentType: 'text/csv',
      })

      setInfo('Base atualizada (CSV) ✅')
      setBaseFile(null)
    } catch (e: any) {
      console.error(e)
      setError(`Erro ao atualizar base: ${e?.message || 'erro'}`)
    } finally {
      setUploadingBase(false)
    }
  }

  async function handleUploadBaseAutoExcel() {
    if (!user || !isAdmin) {
      setError('Apenas o administrador pode atualizar a base.')
      return
    }
    if (!baseFile) {
      setError('Selecione um arquivo (.xlsx/.xls/.csv).')
      return
    }

    try {
      setUploadingBase(true)
      setError(null)
      setInfo('')

      if (isCsv(baseFile)) {
        // Se mandou CSV, já sobe direto
        await uploadBytes(ref(storage, BASE_DEST_PATH), baseFile, {
          contentType: 'text/csv',
        })
        setInfo('Base atualizada (CSV) ✅')
        setBaseFile(null)
        return
      }

      if (!isExcel(baseFile)) {
        setError('Formato inválido. Envie .xlsx, .xls ou .csv.')
        return
      }

      // ✅ Lê Excel e converte para CSV automaticamente
      const buf = await baseFile.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })

      const sheetName = wb.SheetNames?.[0]
      if (!sheetName) {
        setError('Planilha sem abas. Verifique o arquivo.')
        return
      }

      const ws = wb.Sheets[sheetName]
      const csv = XLSX.utils.sheet_to_csv(ws)

      await uploadCsvTextToBase(csv)

      setInfo('Base atualizada automaticamente (Excel → CSV) ✅')
      setBaseFile(null)
    } catch (e: any) {
      console.error(e)
      setError(`Erro ao atualizar base automática: ${e?.message || 'erro'}`)
    } finally {
      setUploadingBase(false)
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

      {/* ✅ CARDS (FUNCIONÁRIO) */}
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
      </div>

      {/* ✅ ADMIN: CSV (seu bloco já existente) */}
      {isAdmin && (
        <div className="card">
          <span className="pill">Admin</span>
          <h2 className="h2" style={{ marginTop: '.65rem' }}>
            Administração
          </h2>
          <p className="p-muted" style={{ marginTop: '.35rem' }}>
            Atualize a base de lojas para o autopreencher da Baixa.
          </p>

          <div style={{ marginTop: '1rem' }}>
            <Link href="/dashboard/importar-lojas" className="btn-primary">
              📄 Atualizar base de lojas (CSV)
            </Link>
          </div>
        </div>
      )}

      {/* ✅ NOVO: ADMIN - ATUALIZAR BANCO GERAL (CSV/EXCEL AUTOMÁTICO) */}
      {isAdmin && (
        <div className="card">
          <span className="pill">Admin</span>

          <h2 className="h2" style={{ marginTop: '.65rem' }}>
            Atualizar banco geral de dados
          </h2>

          <p className="p-muted" style={{ marginTop: '.35rem' }}>
            Envie <b>.csv</b> ou <b>Excel (.xlsx/.xls)</b>. No modo automático, o sistema converte o Excel em CSV e salva em{' '}
            <b>{BASE_DEST_PATH}</b>.
          </p>

          <div style={{ marginTop: '1rem', display: 'grid', gap: '.75rem', maxWidth: 520 }}>
            <label>
              <div className="label">Arquivo da base (CSV ou Excel)</div>
              <input
                className="input"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setBaseFile(e.target.files?.[0] ?? null)}
              />
              <p className="p-muted" style={{ marginTop: '.35rem', fontSize: 13 }}>
                Dica: pode mandar direto o Excel do relatório — eu converto automaticamente.
              </p>
            </label>

            <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
              <button
                className="btn-primary"
                type="button"
                onClick={handleUploadBaseAutoExcel}
                disabled={uploadingBase}
                title="Converte Excel em CSV e atualiza a base"
              >
                {uploadingBase ? 'Atualizando...' : '⚡ Atualizar base automática (Excel/CSV)'}
              </button>

              <button
                className="btn-primary"
                type="button"
                onClick={handleUploadBaseCsvDirect}
                disabled={uploadingBase}
                title="Sobe o CSV exatamente como está"
              >
                {uploadingBase ? 'Atualizando...' : '📄 Atualizar base (CSV direto)'}
              </button>
            </div>

            <p className="p-muted" style={{ fontSize: 12 }}>
              Isso <b>não altera</b> nenhum outro dado do sistema — apenas substitui o arquivo do banco no Storage.
            </p>
          </div>
        </div>
      )}

      {/* ARQUIVOS OBRIGATÓRIOS (SEU BLOCO ANTIGO + STORAGE EXTRA) */}
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