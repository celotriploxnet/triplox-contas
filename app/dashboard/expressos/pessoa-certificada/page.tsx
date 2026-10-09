'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { getBytes, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import * as XLSX from 'xlsx'

import { auth, db, storage } from '@/lib/firebase'

type CertRow = {
  cnpj: string
  chaveLoja: string
  correspondente: string
  cpfCandidato: string
  nomeCandidato: string
  statusProva: string
  dataRealizacao: string
}

/* =========================
   HELPERS
   ========================= */
function toStr(v: any) {
  return v === null || v === undefined ? '' : String(v).trim()
}

function digitsOnly(v: any) {
  return toStr(v).replace(/\D/g, '')
}

function formatCPF(v: any) {
  const d = digitsOnly(v).padStart(11, '0').slice(0, 11)
  if (d.length !== 11) return toStr(v)
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
}

function maskCPF(v: any) {
  const d = digitsOnly(v).padStart(11, '0').slice(0, 11)
  if (d.length !== 11) return toStr(v)

  const inicio = d.slice(0, 3)
  return `${inicio}.***.***-**`
}

function formatCNPJ(v: any) {
  const d = digitsOnly(v).padStart(14, '0').slice(0, 14)
  if (d.length !== 14) return toStr(v)
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
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
    .toUpperCase()
}

function toUint8(bytes: any): Uint8Array {
  if (bytes instanceof Uint8Array) return bytes
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes)
  return new Uint8Array(bytes)
}

function parseDateToPtBR(v: any) {
  const raw = toStr(v)
  if (!raw) return ''

  if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) return raw

  const n = Number(raw)
  if (Number.isFinite(n) && n > 20000 && n < 90000) {
    const d = XLSX.SSF.parse_date_code(n)
    if (d?.y && d?.m && d?.d) {
      const pad = (x: number) => String(x).padStart(2, '0')
      return `${pad(d.d)}/${pad(d.m)}/${d.y}`
    }
  }

  const dt = new Date(raw)
  if (!Number.isNaN(dt.getTime())) {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(dt)
  }

  return raw
}

function statusTone(status: string) {
  const s = (status || '').toLowerCase()
  if (s.includes('pend')) return 'yellow'
  if (s.includes('certifica') && s.includes('ok')) return 'green'
  if (s.includes('bloque') || s.includes('reprov')) return 'red'
  if (s.includes('aprov')) return 'green'
  if (s.includes('aguard') || s.includes('andam')) return 'yellow'
  return 'gray'
}

function StatusPill({ status }: { status: string }) {
  const tone = statusTone(status)

  const styleMap: Record<string, React.CSSProperties> = {
    green: {
      background: 'rgba(34,197,94,.10)',
      border: '1px solid rgba(34,197,94,.20)',
      color: 'rgba(21,128,61,.95)',
    },
    red: {
      background: 'rgba(214,31,44,.10)',
      border: '1px solid rgba(214,31,44,.20)',
      color: 'rgba(214,31,44,.95)',
    },
    yellow: {
      background: 'rgba(234,179,8,.12)',
      border: '1px solid rgba(234,179,8,.25)',
      color: 'rgba(161,98,7,.95)',
    },
    gray: {
      background: 'rgba(15,15,25,.06)',
      border: '1px solid rgba(15,15,25,.10)',
      color: 'rgba(16,16,24,.70)',
    },
  }

  return (
    <span className="pill" style={styleMap[tone]}>
      {status || '—'}
    </span>
  )
}

function LightButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode
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
        padding: '.65rem .9rem',
        fontSize: '.9rem',
        fontWeight: 800,
        border: '1px solid rgba(15,15,25,.18)',
        background: 'rgba(255,255,255,.85)',
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

function buildWhatsAppMessage(r: CertRow, canViewFullCpf: boolean) {
  const cpfExibido = canViewFullCpf ? r.cpfCandidato : maskCPF(r.cpfCandidato)

  return [
    '🪪 *Consulta de Certificação*',
    '',
    `👤 *Candidato:* ${r.nomeCandidato || '—'}`,
    `🆔 *CPF:* ${cpfExibido || '—'}`,
    `🏪 *Chave Loja:* ${r.chaveLoja || '—'}`,
    `🧾 *CNPJ:* ${r.cnpj || '—'}`,
    `🏢 *Correspondente:* ${r.correspondente || '—'}`,
    '',
    `✅ *Status da certificação:* ${r.statusProva || '—'}`,
    `📅 *Data da certificação:* ${r.dataRealizacao || '—'}`,
  ].join('\n')
}

/* =========================
   PAGE
   ========================= */
export default function PessoaCertificadaPage() {
  const router = useRouter()

  const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'
  const BASE_PATH = 'pessoa-certificada/basevinculo.xlsx'

  const [user, setUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [info, setInfo] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [rows, setRows] = useState<CertRow[]>([])
  const [q, setQ] = useState('')

  const [baseFile, setBaseFile] = useState<File | null>(null)
  const [cpfVisivelMap, setCpfVisivelMap] = useState<Record<string, boolean>>({})

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

  function makeCpfKey(r: CertRow, idx?: number) {
    return `${r.chaveLoja}__${r.cpfCandidato}__${r.nomeCandidato}__${idx ?? ''}`
  }

  function toggleCpfVisivel(key: string) {
    setCpfVisivelMap((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  async function loadBase() {
    if (!auth.currentUser) {
      setError('Você precisa estar logado.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setInfo('')

      const bytesAny = await getBytes(ref(storage, BASE_PATH))
      const u8 = toUint8(bytesAny)

      const wb = XLSX.read(u8, { type: 'array', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

      const normalized = raw.map((obj) => {
        const out: Record<string, any> = {}
        for (const [k, v] of Object.entries(obj)) out[normalizeKey(k)] = v
        return out
      })

      const mapped: CertRow[] = normalized.map((r) => {
        const cnpj = formatCNPJ(r['CNPJ_LOJA'] || r['CNPJ'])
        const chave = toStr(r['CHAVE_LOJA'])
        const correspondente = toStr(r['RZ_SOCIAL'] || r['CORRESPONDENTE'])
        const vinculo = toStr(r['COLABORADOR_ESTA_VINCULADO_AO_CNPJ'])
        const statusBase = toStr(r['STATUS_CERTIFICACAO'])

        const semCertificado =
          vinculo.toUpperCase().includes('NÃO POSSUI CERTIFICADO') ||
          vinculo.toUpperCase().includes('NAO POSSUI CERTIFICADO')

        const nomeRaw = toStr(r['NOME_INSCRITO'] || r['NOME CANDIDATO'] || r['NOME_CANDIDATO'])
        const cpfRaw = toStr(r['CPF'] || r['CPF CANDIDATO'] || r['CPF_CANDIDATO'])
        const dataRaw = r['DATA_CERTIFICACAO'] || r['DATA REALIZAÇÃO'] || r['DATA_REALIZACAO'] || ''

        const valorVazio = (v: any) => {
          const x = toStr(v)
          return !x || x === '-' || x === "'-"
        }

        const nome = semCertificado || valorVazio(nomeRaw) ? '' : nomeRaw
        const cpf = semCertificado || valorVazio(cpfRaw) ? '' : formatCPF(cpfRaw)
        const data = semCertificado || valorVazio(dataRaw) ? '' : parseDateToPtBR(dataRaw)

        const status =
          statusBase ||
          (semCertificado ? 'BLOQUEADO - SEM CERTIFICACAO' : vinculo || '—')

        return {
          cnpj,
          chaveLoja: chave,
          correspondente,
          cpfCandidato: cpf,
          nomeCandidato: nome,
          statusProva: status,
          dataRealizacao: data,
        }
      })
      setRows(mapped)
      setCpfVisivelMap({})
      setInfo('Base carregada ✅')
    } catch (e: any) {
      console.error('loadBase error:', e)
      setError(`Falha ao carregar a base (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleUploadBase() {
    if (!user) {
      setError('Você precisa estar logado.')
      return
    }
    if (!isAdmin) {
      setError('Apenas o administrador pode atualizar o CSV.')
      return
    }
    if (!baseFile) {
      setError('Selecione o arquivo basevinculo.xlsx para enviar.')
      return
    }

    const name = baseFile.name.toLowerCase()
    if (!name.endsWith('.xlsx')) {
      setError('Envie somente arquivo .xlsx')
      return
    }

    try {
      setUploading(true)
      setError(null)
      setInfo('')

      await uploadBytes(ref(storage, BASE_PATH), baseFile, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      setInfo('Base atualizada ✅')
      setBaseFile(null)
      await loadBase()
    } catch (e: any) {
      console.error('handleUploadBase error:', e)
      setError(`Falha ao enviar (${e?.code || 'sem-code'}): ${e?.message || 'erro'}`)
    } finally {
      setUploading(false)
    }
  }

  async function openDownloadBase() {
    try {
      const url = await getDownloadURL(ref(storage, BASE_PATH))
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      console.error(e)
      setError('Não foi possível gerar link para baixar a base.')
    }
  }

  async function copyWhatsApp(r: CertRow, cpfVisivel: boolean) {
    try {
      const msg = buildWhatsAppMessage(r, cpfVisivel)
      await navigator.clipboard.writeText(msg)
      setInfo('Mensagem copiada ✅ (cole no WhatsApp)')
      setError(null)
    } catch (e) {
      console.error(e)
      setError('Não consegui copiar a mensagem.')
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
      loadBase()
    })

    return () => unsub()
  }, [router])

  const term = q.trim().toLowerCase()
  const hasSearch = term.length > 0

  const filtered = useMemo(() => {
    if (!hasSearch) return []
    return rows.filter((r) =>
      [
        r.cnpj,
        r.nomeCandidato,
        r.chaveLoja,
        r.cpfCandidato,
        r.correspondente,
        r.statusProva,
        r.dataRealizacao,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)
    )
  }, [rows, term, hasSearch])

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <span className="pill">Certificação</span>
        <h1 className="h1" style={{ marginTop: '.75rem' }}>
          👤 Consultar Pessoa Certificada
        </h1>
        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          Digite no campo abaixo para buscar por <b>CNPJ</b>, <b>nome</b>, <b>chave loja</b> ou <b>CPF</b>. Se o Expresso tiver mais de uma certificação, todas serão exibidas.
        </p>
      </div>

      <div className="card" style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn-primary" onClick={loadBase} disabled={loading || checkingAuth}>
            {checkingAuth ? 'Verificando login...' : loading ? 'Carregando...' : 'Recarregar base'}
          </button>

          {isAdmin && (
            <LightButton onClick={openDownloadBase} title="Baixar o CSV atual">
              Baixar base
            </LightButton>
          )}

          {isAdmin && <span className="pill">Admin</span>}
          {!isAdmin && <span className="pill">CPF mascarado</span>}
          {info && <span className="pill">{info}</span>}
        </div>

        <label>
          <div className="label">Buscar</div>
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ex.: 12.345.678/0001-99 | João | 12345 | 000.000.000-00"
          />
        </label>

        {isAdmin && (
          <div className="card-soft" style={{ display: 'grid', gap: '.85rem' }}>
            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="pill">Admin</span>
              <div className="h2">Atualizar base de Certificação</div>
            </div>

            <label>
              <div className="label">Arquivo (XLSX)</div>
              <input
                className="input"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => setBaseFile(e.target.files?.[0] ?? null)}
              />
              <p className="p-muted" style={{ marginTop: '.35rem', fontSize: 13 }}>
                O arquivo será salvo fixo em: <b>{BASE_PATH}</b> (substitui o anterior).
              </p>
            </label>

            <button className="btn-primary" type="button" onClick={handleUploadBase} disabled={uploading}>
              {uploading ? 'Enviando...' : 'Enviar e substituir base'}
            </button>
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

      {hasSearch && (
        <>
          <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="pill">Encontrados: {filtered.length}</span>
            <span className="p-muted">
              Mostrando resultados para: <b>{q}</b>
            </span>
          </div>

          {filtered.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))',
                gap: '1rem',
              }}
            >
              {filtered.map((r, idx) => {
                const cpfKey = makeCpfKey(r, idx)
                const cpfVisivel = isAdmin && !!cpfVisivelMap[cpfKey]
                const cpfExibido = cpfVisivel ? r.cpfCandidato : maskCPF(r.cpfCandidato)

                return (
                  <div
                    key={`${r.chaveLoja}-${r.cpfCandidato}-${idx}`}
                    className="card"
                    style={{ display: 'grid', gap: '.65rem' }}
                  >
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
                      <div style={{ fontWeight: 900, fontSize: '1.02rem' }}>{r.nomeCandidato || '—'}</div>
                      <StatusPill status={r.statusProva} />
                    </div>

                    <div style={{ display: 'grid', gap: '.25rem' }}>
                      <div className="p-muted" style={{ fontSize: 12 }}>
                        Correspondente
                      </div>
                      <div style={{ fontWeight: 900 }}>{r.correspondente || '—'}</div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: '.6rem',
                      }}
                    >
                      <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                        <div className="p-muted" style={{ fontSize: 12 }}>
                          CNPJ
                        </div>
                        <div style={{ fontWeight: 900 }}>{r.cnpj || '—'}</div>
                      </div>

                      <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                        <div className="p-muted" style={{ fontSize: 12 }}>
                          Chave Loja
                        </div>
                        <div style={{ fontWeight: 900 }}>{r.chaveLoja || '—'}</div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: '.6rem',
                      }}
                    >
                      <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                        <div className="p-muted" style={{ fontSize: 12, marginBottom: '.3rem' }}>
                          CPF Candidato
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            gap: '.5rem',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ fontWeight: 900 }}>{cpfExibido || '—'}</div>

                          {isAdmin && (
                            <LightButton
                              onClick={() => toggleCpfVisivel(cpfKey)}
                              title={cpfVisivel ? 'Ocultar CPF' : 'Mostrar CPF'}
                            >
                              {cpfVisivel ? '🙈 Ocultar' : '👁 Mostrar'}
                            </LightButton>
                          )}
                        </div>
                      </div>

                      <div className="card-soft" style={{ padding: '.75rem .9rem' }}>
                        <div className="p-muted" style={{ fontSize: 12 }}>
                          Data da certificação
                        </div>
                        <div style={{ fontWeight: 900 }}>{r.dataRealizacao || '—'}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <LightButton
                        onClick={() => copyWhatsApp(r, cpfVisivel)}
                        title="Copiar mensagem para WhatsApp"
                      >
                        📤 Copiar WhatsApp
                      </LightButton>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="card-soft">
              <p className="p-muted">Nenhum registro encontrado para essa busca.</p>
            </div>
          )}
        </>
      )}

      {!hasSearch && (
        <div className="card-soft">
          <p className="p-muted">Digite algo na busca para exibir os resultados.</p>
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