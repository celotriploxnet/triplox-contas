'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, type User } from 'firebase/auth'
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type DocumentData,
} from 'firebase/firestore'

import { auth, db } from '@/lib/firebase'

const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'

type Prestacao = {
  id: string
  userId: string
  userNome: string
  dataViagem: string
  destino: string
  kmInicial: number
  kmFinal: number
  kmRodado: number
  gasolina: number
  alimentacao: number
  hospedagem: number
  totalViagem: number
  createdAt?: any
}

function toNumber(v: any) {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

function moneyBR(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function fmtDateTime(v: any) {
  try {
    if (!v) return '—'
    const dt: Date = typeof v?.toDate === 'function' ? v.toDate() : new Date(v)
    if (Number.isNaN(dt.getTime())) return '—'
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dt)
  } catch {
    return '—'
  }
}

/* =========================
   PREVIEW HELPERS
   ========================= */
function extFromUrl(url: string) {
  const clean = url.split('?')[0].split('#')[0]
  const last = clean.split('.').pop()?.toLowerCase() || ''
  return last
}

function isImageUrl(url: string) {
  const e = extFromUrl(url)
  return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(e)
}

function isPdfUrl(url: string) {
  const e = extFromUrl(url)
  return e === 'pdf'
}

function fileLabel(url: string) {
  const clean = url.split('?')[0].split('#')[0]
  const name = clean.split('/').pop() || 'arquivo'
  return decodeURIComponent(name)
}

type PreviewItem = {
  url: string
  kind: 'image' | 'pdf' | 'other'
  label: string
}

export default function HistoricoPage() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState('')

  const [items, setItems] = useState<Prestacao[]>([])

  // cache de comprovantes por prestacaoId
  const [urlsMap, setUrlsMap] = useState<Record<string, string[]>>({})
  const [loadingUrlsId, setLoadingUrlsId] = useState<string | null>(null)

  // modal preview
  const [previewOpen, setPreviewOpen] = useState(false)
  const [preview, setPreview] = useState<PreviewItem | null>(null)

  function openPreview(url: string) {
    const kind: PreviewItem['kind'] = isImageUrl(url) ? 'image' : isPdfUrl(url) ? 'pdf' : 'other'
    setPreview({ url, kind, label: fileLabel(url) })
    setPreviewOpen(true)
  }

  function closePreview() {
    setPreviewOpen(false)
    setPreview(null)
  }

  // fecha modal com ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closePreview()
    }
    if (previewOpen) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewOpen])

  async function loadPrestacoes(u: User) {
    try {
      setLoading(true)
      setError(null)
      setInfo('')

      const baseRef = collection(db, 'prestacoes')

      const qy =
        (u.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase()
          ? query(baseRef, orderBy('createdAt', 'desc'))
          : query(baseRef, where('userId', '==', u.uid), orderBy('createdAt', 'desc'))

      const snap = await getDocs(qy)

      const list: Prestacao[] = snap.docs.map((d) => {
        const data = d.data() as DocumentData
        return {
          id: d.id,
          userId: String(data.userId || ''),
          userNome: String(data.userNome || ''),
          dataViagem: String(data.dataViagem || ''),
          destino: String(data.destino || ''),
          kmInicial: toNumber(data.kmInicial),
          kmFinal: toNumber(data.kmFinal),
          kmRodado: toNumber(data.kmRodado),
          gasolina: toNumber(data.gasolina),
          alimentacao: toNumber(data.alimentacao),
          hospedagem: toNumber(data.hospedagem),
          totalViagem: toNumber(data.totalViagem),
          createdAt: data.createdAt,
        }
      })

      setItems(list)
      setInfo('Histórico carregado ✅')
    } catch (e: any) {
      console.error('loadPrestacoes error:', e)
      setError(`Erro ao carregar histórico. (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
    } finally {
      setLoading(false)
    }
  }

  async function loadComprovantes(prestacaoId: string) {
    if (!user) return
    try {
      setLoadingUrlsId(prestacaoId)
      setError(null)
      setInfo('')

      const compRef = collection(db, 'prestacoes', prestacaoId, 'comprovantes')
      const qy = query(compRef, orderBy('createdAt', 'desc'), limit(1))
      const snap = await getDocs(qy)

      let urls: string[] = []
      if (!snap.empty) {
        const data = snap.docs[0].data() as any
        if (Array.isArray(data?.urls)) urls = data.urls.filter((x: any) => typeof x === 'string' && x)
      }

      setUrlsMap((prev) => ({ ...prev, [prestacaoId]: urls }))
      setInfo(urls.length ? 'Comprovantes carregados ✅' : 'Sem comprovantes nesta prestação.')
    } catch (e: any) {
      console.error('loadComprovantes error:', e)
      setError(`Erro ao carregar comprovantes. (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
    } finally {
      setLoadingUrlsId(null)
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setChecking(false)

      if (!u) {
        setIsAdmin(false)
        router.push('/login')
        return
      }

      const admin = (u.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase()
      setIsAdmin(admin)

      loadPrestacoes(u)
    })

    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const totalGeral = useMemo(() => items.length, [items])
  const totalValor = useMemo(() => items.reduce((acc, it) => acc + (it.totalViagem || 0), 0), [items])

  return (
    <>
      {/* MODAL PREVIEW */}
      {previewOpen && preview && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closePreview}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(10,10,20,.62)',
            display: 'grid',
            placeItems: 'center',
            padding: '1rem',
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(980px, 100%)',
              maxHeight: '86vh',
              overflow: 'hidden',
              display: 'grid',
              gap: '.75rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '.6rem',
                alignItems: 'center',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontWeight: 900, fontSize: '1.05rem' }}>{preview.label}</div>

              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                <a
                  className="btn-ghost"
                  href={preview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    textDecoration: 'none',
                    background: 'rgba(255,255,255,.75)',
                    color: 'rgba(16,16,24,.92)',
                  }}
                >
                  Abrir em nova aba
                </a>

                <button className="btn-primary" type="button" onClick={closePreview}>
                  Fechar ✕
                </button>
              </div>
            </div>

            <div
              className="card-soft"
              style={{
                padding: '.75rem',
                height: '72vh',
                overflow: 'auto',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {preview.kind === 'image' && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.url}
                  alt={preview.label}
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    borderRadius: 14,
                  }}
                />
              )}

              {preview.kind === 'pdf' && (
                <iframe
                  src={preview.url}
                  title={preview.label}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 0,
                    borderRadius: 14,
                    background: 'rgba(255,255,255,.8)',
                  }}
                />
              )}

              {preview.kind === 'other' && (
                <div style={{ textAlign: 'center' }}>
                  <p className="p-muted" style={{ fontWeight: 800 }}>
                    Esse tipo de arquivo não tem miniatura/preview.
                  </p>
                  <a
                    className="btn-primary"
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }}
                  >
                    Abrir arquivo
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <section style={{ display: 'grid', gap: '1.25rem' }}>
        <div>
          <span className="pill">Histórico</span>
          <h1 className="h1" style={{ marginTop: '.75rem' }}>
            📑 Histórico de prestações
          </h1>
          <p className="p-muted" style={{ marginTop: '.35rem' }}>
            {isAdmin ? (
              <>Você está como <b>Admin</b> e pode ver todas as prestações.</>
            ) : (
              <>Aqui aparecem somente as suas prestações.</>
            )}
          </p>
        </div>

        {/* RESUMO */}
        <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="pill">Total: {totalGeral}</span>
          <span className="pill">Somatório: {moneyBR(totalValor)}</span>

          <button
            type="button"
            className="btn-primary"
            onClick={() => user && loadPrestacoes(user)}
            disabled={loading || checking || !user}
            style={{ marginLeft: 'auto' }}
          >
            {checking ? 'Verificando login...' : loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        {(info || error) && (
          <div className="card-soft" style={{ borderColor: error ? 'rgba(214,31,44,.25)' : undefined }}>
            {info && <p className="p-muted" style={{ fontWeight: 800 }}>{info}</p>}
            {error && (
              <p className="p-muted" style={{ color: 'rgba(214,31,44,.95)', fontWeight: 900 }}>
                {error}
              </p>
            )}
          </div>
        )}

        {loading && <p className="p-muted">Carregando...</p>}

        {!loading && items.length === 0 && (
          <div className="card-soft">
            <p className="p-muted">Nenhuma prestação encontrada.</p>
          </div>
        )}

        {/* LISTA */}
        {items.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1rem',
            }}
          >
            {items.map((it) => {
              const urls = urlsMap[it.id]
              const hasUrls = Array.isArray(urls)
              const urlList = hasUrls ? urls : []

              return (
                <div key={it.id} className="card" style={{ display: 'grid', gap: '.8rem' }}>
                  <div className="card-soft" style={{ padding: '.8rem .95rem', display: 'grid', gap: '.25rem' }}>
                    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="pill">{moneyBR(it.totalViagem)}</span>
                      <span className="pill">KM: {it.kmRodado}</span>
                      <span className="pill">{fmtDateTime(it.createdAt)}</span>
                    </div>

                    {isAdmin && (
                      <div className="p-muted" style={{ fontSize: 12, marginTop: '.15rem' }}>
                        <b>Usuário:</b> {it.userNome || '—'} ({it.userId})
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gap: '.25rem' }}>
                    <div className="p-muted" style={{ fontSize: 12 }}>Data da viagem</div>
                    <div style={{ fontWeight: 900 }}>{it.dataViagem || '—'}</div>
                  </div>

                  <div style={{ display: 'grid', gap: '.25rem' }}>
                    <div className="p-muted" style={{ fontSize: 12 }}>Destino</div>
                    <div style={{ fontWeight: 900 }}>{it.destino || '—'}</div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                      gap: '.6rem',
                    }}
                  >
                    <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                      <div className="p-muted" style={{ fontSize: 12 }}>Gasolina</div>
                      <div style={{ fontWeight: 900 }}>{moneyBR(it.gasolina)}</div>
                    </div>

                    <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                      <div className="p-muted" style={{ fontSize: 12 }}>Alimentação</div>
                      <div style={{ fontWeight: 900 }}>{moneyBR(it.alimentacao)}</div>
                    </div>

                    <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                      <div className="p-muted" style={{ fontSize: 12 }}>Hospedagem</div>
                      <div style={{ fontWeight: 900 }}>{moneyBR(it.hospedagem)}</div>
                    </div>
                  </div>

                  {/* COMPROVANTES */}
                  <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => loadComprovantes(it.id)}
                      disabled={loadingUrlsId === it.id}
                    >
                      {loadingUrlsId === it.id ? 'Carregando...' : hasUrls ? 'Recarregar comprovantes' : 'Ver comprovantes'}
                    </button>

                    {hasUrls && <span className="pill">{urlList.length} arquivo(s)</span>}
                  </div>

                  {/* GRID MINIATURAS */}
                  {hasUrls && urlList.length > 0 && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))',
                        gap: '.6rem',
                      }}
                    >
                      {urlList.map((u, idx) => {
                        const img = isImageUrl(u)
                        const pdf = isPdfUrl(u)

                        return (
                          <button
                            key={`${it.id}-thumb-${idx}`}
                            type="button"
                            onClick={() => openPreview(u)}
                            title="Clique para visualizar"
                            className="card-soft"
                            style={{
                              padding: '.45rem',
                              borderRadius: 14,
                              cursor: 'pointer',
                              display: 'grid',
                              gap: '.35rem',
                              textAlign: 'left',
                            }}
                          >
                            <div
                              style={{
                                height: 74,
                                borderRadius: 12,
                                overflow: 'hidden',
                                background: 'rgba(255,255,255,.75)',
                                display: 'grid',
                                placeItems: 'center',
                              }}
                            >
                              {img ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={u}
                                  alt={`Comprovante ${idx + 1}`}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : pdf ? (
                                <div style={{ fontWeight: 900 }}>
                                  📄 PDF
                                </div>
                              ) : (
                                <div style={{ fontWeight: 900 }}>
                                  📎 ARQ
                                </div>
                              )}
                            </div>

                            <div className="p-muted" style={{ fontSize: 11, fontWeight: 800, lineHeight: 1.15 }}>
                              {img ? `Imagem ${idx + 1}` : pdf ? `PDF ${idx + 1}` : `Arquivo ${idx + 1}`}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!checking && user && (
          <p className="p-muted" style={{ marginTop: '.25rem' }}>
            Logado como: <b>{user.email}</b>
            {isAdmin ? ' (Admin)' : ''}
          </p>
        )}
      </section>
    </>
  )
}
