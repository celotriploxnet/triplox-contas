'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, type User } from 'firebase/auth'
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'

import { auth, db } from '@/lib/firebase'

const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'

type Prestacao = {
  id: string
  userId: string
  userNome: string
  userEmail?: string

  dataViagem: string
  destino: string
  kmInicial: number
  kmFinal: number
  kmRodado: number
  gasolina: number
  alimentacao: number
  hospedagem: number
  totalViagem: number

  // novos (podem não existir em prestações antigas)
  outrasDespesas?: number
  outrasDespesasDesc?: string
  statusPagamento?: 'PAGA' | 'PENDENTE'
  pagoAt?: any
  pagoBy?: string

  createdAt?: any
}

function toNumber(v: any) {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

function toStr(v: any) {
  return v === null || v === undefined ? '' : String(v).trim()
}

function moneyBR(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

/** dd-mm-aaaa */
function fmtDateOnlyDash(v: any) {
  try {
    if (!v) return '—'
    const dt: Date = typeof v?.toDate === 'function' ? v.toDate() : new Date(v)
    if (Number.isNaN(dt.getTime())) return '—'
    const dd = String(dt.getDate()).padStart(2, '0')
    const mm = String(dt.getMonth() + 1).padStart(2, '0')
    const yy = String(dt.getFullYear())
    return `${dd}-${mm}-${yy}`
  } catch {
    return '—'
  }
}

/** MM/AAAA (para filtro) */
function monthKeyFromCreatedAt(v: any) {
  try {
    if (!v) return ''
    const dt: Date = typeof v?.toDate === 'function' ? v.toDate() : new Date(v)
    if (Number.isNaN(dt.getTime())) return ''
    const mm = String(dt.getMonth() + 1).padStart(2, '0')
    const yy = String(dt.getFullYear())
    return `${mm}/${yy}`
  } catch {
    return ''
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

function pillStylePaid(status: 'PAGA' | 'PENDENTE') {
  return status === 'PAGA'
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

  // filtros
  const [fMes, setFMes] = useState('Todos') // MM/AAAA
  const [fEmail, setFEmail] = useState('') // admin
  const [fStatusPg, setFStatusPg] = useState<'Todos' | 'PAGA' | 'PENDENTE'>('Todos')

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

        // status pagamento (prestação antiga pode não ter -> default PENDENTE)
        const statusPagamentoRaw = toStr(data.statusPagamento || data.status_pagamento || data.pagoStatus)
        const statusPagamento: Prestacao['statusPagamento'] =
          statusPagamentoRaw.toUpperCase() === 'PAGA' ? 'PAGA' : 'PENDENTE'

        // outras despesas (prestação antiga pode não ter -> default 0)
        const outrasDespesas = toNumber(data.outrasDespesas ?? data.outraDespesa ?? data.outras_despesas)
        const outrasDespesasDesc = String(
          data.outrasDespesasDesc || data.descricaoOutrasDespesas || data.outras_despesas_desc || ''
        )

        return {
          id: d.id,
          userId: String(data.userId || ''),
          userNome: String(data.userNome || ''),
          userEmail: String(data.userEmail || data.email || ''),

          dataViagem: String(data.dataViagem || ''),
          destino: String(data.destino || ''),
          kmInicial: toNumber(data.kmInicial),
          kmFinal: toNumber(data.kmFinal),
          kmRodado: toNumber(data.kmRodado),
          gasolina: toNumber(data.gasolina),
          alimentacao: toNumber(data.alimentacao),
          hospedagem: toNumber(data.hospedagem),
          totalViagem: toNumber(data.totalViagem),

          outrasDespesas,
          outrasDespesasDesc,

          statusPagamento,
          pagoAt: data.pagoAt || data.paidAt,
          pagoBy: String(data.pagoBy || data.paidBy || ''),

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

  async function togglePago(it: Prestacao) {
    if (!user || !isAdmin) return
    try {
      setError(null)
      setInfo('')

      const current = it.statusPagamento || 'PENDENTE'
      const next: Prestacao['statusPagamento'] = current === 'PAGA' ? 'PENDENTE' : 'PAGA'

      const refDoc = doc(db, 'prestacoes', it.id)
      await updateDoc(refDoc, {
        statusPagamento: next,
        pagoAt: next === 'PAGA' ? serverTimestamp() : null,
        pagoBy: next === 'PAGA' ? (user.email || '') : '',
      })

      setItems((prev) =>
        prev.map((p) =>
          p.id === it.id
            ? { ...p, statusPagamento: next, pagoBy: next === 'PAGA' ? (user.email || '') : '', pagoAt: next === 'PAGA' ? new Date() : null }
            : p
        )
      )

      setInfo(next === 'PAGA' ? 'Marcado como PAGA ✅' : 'Marcado como PENDENTE ✅')
    } catch (e: any) {
      console.error('togglePago error:', e)
      setError(`Não consegui atualizar o status. (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
    }
  }

  // ✅ EXCLUIR (admin pode qualquer; usuário só as dele)
  async function excluirPrestacao(it: Prestacao) {
    if (!user) return
    const canDelete = isAdmin || it.userId === user.uid
    if (!canDelete) {
      setError('Você não tem permissão para excluir esta prestação.')
      return
    }

    const ok = window.confirm(
      `Tem certeza que deseja excluir esta prestação?\n\nDestino: ${it.destino || '—'}\nEnviada: ${fmtDateOnlyDash(
        it.createdAt
      )}\n\nEssa ação não pode ser desfeita.`
    )
    if (!ok) return

    try {
      setError(null)
      setInfo('Excluindo...')

      // 1) apagar docs da subcoleção comprovantes
      const compRef = collection(db, 'prestacoes', it.id, 'comprovantes')
      const compSnap = await getDocs(compRef)

      const batch = writeBatch(db)
      compSnap.forEach((d) => batch.delete(d.ref))

      // 2) apagar doc principal
      batch.delete(doc(db, 'prestacoes', it.id))

      await batch.commit()

      // UI
      setItems((prev) => prev.filter((p) => p.id !== it.id))
      setUrlsMap((prev) => {
        const cp = { ...prev }
        delete cp[it.id]
        return cp
      })

      setInfo('Prestação excluída ✅')
    } catch (e: any) {
      console.error('excluirPrestacao error:', e)
      setError(`Não consegui excluir. (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
      setInfo('')
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
  }, [router])

  const months = useMemo(() => {
    const set = new Set<string>()
    items.forEach((it) => {
      const k = monthKeyFromCreatedAt(it.createdAt)
      if (k) set.add(k)
    })
    const arr = Array.from(set)
    arr.sort((a, b) => {
      const [ma, ya] = a.split('/').map(Number)
      const [mb, yb] = b.split('/').map(Number)
      const da = (ya || 0) * 100 + (ma || 0)
      const db = (yb || 0) * 100 + (mb || 0)
      return db - da
    })
    return ['Todos', ...arr]
  }, [items])

  const filteredItems = useMemo(() => {
    const emailTerm = fEmail.trim().toLowerCase()

    return items.filter((it) => {
      if (fMes !== 'Todos') {
        const k = monthKeyFromCreatedAt(it.createdAt)
        if (k !== fMes) return false
      }

      if (fStatusPg !== 'Todos') {
        const st = it.statusPagamento || 'PENDENTE'
        if (st !== fStatusPg) return false
      }

      if (isAdmin && emailTerm) {
        const hay = `${toStr(it.userEmail)} ${toStr(it.userNome)} ${toStr(it.userId)}`.toLowerCase()
        if (!hay.includes(emailTerm)) return false
      }

      return true
    })
  }, [items, fMes, fEmail, fStatusPg, isAdmin])

  const totalGeral = useMemo(() => filteredItems.length, [filteredItems])
  const totalValor = useMemo(() => filteredItems.reduce((acc, it) => acc + (it.totalViagem || 0), 0), [filteredItems])

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

        {/* FILTROS + ATUALIZAR + INFO/ERRO */}
        <div className="card" style={{ display: 'grid', gap: '.85rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '.75rem',
              alignItems: 'end',
            }}
          >
            <label>
              <div className="label">Mês (MM/AAAA)</div>
              <select className="input" value={fMes} onChange={(e) => setFMes(e.target.value)}>
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div className="label">Status</div>
              <select className="input" value={fStatusPg} onChange={(e) => setFStatusPg(e.target.value as any)}>
                <option value="Todos">Todos</option>
                <option value="PENDENTE">Pendente</option>
                <option value="PAGA">Paga</option>
              </select>
            </label>

            {isAdmin && (
              <label>
                <div className="label">Usuário (email / nome / uid)</div>
                <input
                  className="input"
                  value={fEmail}
                  onChange={(e) => setFEmail(e.target.value)}
                  placeholder="Ex.: joao@email.com"
                />
              </label>
            )}

            <button
              type="button"
              className="btn-primary"
              onClick={() => user && loadPrestacoes(user)}
              disabled={loading || checking || !user}
              style={{ height: 44 }}
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
        </div>

        {/* RESUMO */}
        <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="pill">Total: {totalGeral}</span>
          <span className="pill">Somatório: {moneyBR(totalValor)}</span>
        </div>

        {loading && <p className="p-muted">Carregando...</p>}

        {!loading && filteredItems.length === 0 && (
          <div className="card-soft">
            <p className="p-muted">Nenhuma prestação encontrada.</p>
          </div>
        )}

        {/* LISTA */}
        {filteredItems.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1rem',
            }}
          >
            {filteredItems.map((it) => {
              const urls = urlsMap[it.id]
              const hasUrls = Array.isArray(urls)
              const urlList = hasUrls ? urls : []

              const status = it.statusPagamento || 'PENDENTE'
              const outras = toNumber(it.outrasDespesas)
              const outrasDesc = toStr(it.outrasDespesasDesc)

              const canDelete = !!user && (isAdmin || it.userId === user.uid)

              return (
                <div key={it.id} className="card" style={{ display: 'grid', gap: '.8rem' }}>
                  <div className="card-soft" style={{ padding: '.8rem .95rem', display: 'grid', gap: '.25rem' }}>
                    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="pill">{moneyBR(it.totalViagem)}</span>
                      <span className="pill">KM: {it.kmRodado}</span>

                      <span className="pill" style={pillStylePaid(status)}>
                        {status}
                      </span>

                      <span className="pill">Enviada: {fmtDateOnlyDash(it.createdAt)}</span>

                      {isAdmin && (
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => togglePago(it)}
                          style={{ marginLeft: 'auto' }}
                          title="Alternar PAGA / PENDENTE"
                        >
                          {status === 'PAGA' ? 'Marcar PENDENTE' : 'Marcar PAGA'}
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => excluirPrestacao(it)}
                          style={{
                            textDecoration: 'none',
                            background: 'rgba(214,31,44,.10)',
                            border: '1px solid rgba(214,31,44,.20)',
                            color: 'rgba(214,31,44,.95)',
                          }}
                          title="Excluir prestação"
                        >
                          Excluir 🗑️
                        </button>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="p-muted" style={{ fontSize: 12, marginTop: '.15rem' }}>
                        <b>Usuário:</b> {it.userNome || '—'}
                        {it.userEmail ? ` (${it.userEmail})` : ''} • UID: {it.userId || '—'}
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

                  {/* OUTRAS DESPESAS + DESCRIÇÃO */}
                  <div className="card-soft" style={{ padding: '.75rem .9rem', display: 'grid', gap: '.35rem' }}>
                    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="pill">Outras despesas: {outras > 0 ? moneyBR(outras) : '—'}</span>
                      {outras > 0 && (
                        <span
                          className="pill"
                          style={{
                            background: 'rgba(15,15,25,.06)',
                            border: '1px solid rgba(15,15,25,.10)',
                            color: 'rgba(16,16,24,.80)',
                          }}
                          title="Descrição de outras despesas"
                        >
                          {outrasDesc || '—'}
                        </span>
                      )}
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
                                <div style={{ fontWeight: 900 }}>📄 PDF</div>
                              ) : (
                                <div style={{ fontWeight: 900 }}>📎 ARQ</div>
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