'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

import { onAuthStateChanged, User } from 'firebase/auth'
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  getDoc,
  deleteDoc,
} from 'firebase/firestore'
import { getBytes, getDownloadURL, ref, uploadBytes } from 'firebase/storage'

import { auth, db, storage } from '@/lib/firebase'

/* =========================
   TYPES
   ========================= */
type LinhaTreinamento = {
  chaveLoja: string
  razaoSocial: string
  nomeLoja: string
  cnpj: string // xx.xxx.xxx/xxxx-xx
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

type Agendamento = {
  chaveLoja: string
  trainerUid: string
  trainerEmail: string
  scheduledAt: Timestamp
  status: 'agendado' | 'concluido'
  updatedAt?: any
  nomeLoja?: string
  razaoSocial?: string
  municipio?: string
  cnpj?: string
  listUploadedAt?: Timestamp
}

/* =========================
   UI HELPERS
   ========================= */
function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="card-soft"
      style={{
        padding: '.75rem .9rem',
        display: 'grid',
        gap: '.25rem',
        minWidth: 160,
      }}
    >
      <div className="p-muted" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div style={{ fontWeight: 900, letterSpacing: '-0.01em' }}>
        {value || '—'}
      </div>
    </div>
  )
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gap: '.15rem' }}>
      <div className="p-muted" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div style={{ fontWeight: 800 }}>{value || '—'}</div>
    </div>
  )
}

function formatPtBR(ts?: Timestamp) {
  if (!ts) return '—'
  const d = ts.toDate()
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
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

/* =========================
   XLS HELPERS
   ========================= */
function toStr(v: any) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return String(Math.trunc(v))
  return String(v).trim()
}

function digitsOnly(v: any) {
  return toStr(v).replace(/\D/g, '')
}

function padNum(v: any, len: number) {
  return digitsOnly(v).padStart(len, '0')
}

function formatCNPJ(cnpj: any, filial: any, controle: any) {
  const base = padNum(cnpj, 8)
  const fil = padNum(filial, 4)
  const ctrl = padNum(controle, 2)

  const full = (base + fil + ctrl).slice(0, 14).padStart(14, '0')
  return full.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
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

function toUint8(bytes: any): Uint8Array {
  if (bytes instanceof Uint8Array) return bytes
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes)
  // @ts-ignore
  if (typeof Buffer !== 'undefined' && bytes instanceof Buffer) return new Uint8Array(bytes)
  return new Uint8Array(bytes)
}

function readWorkbook(bytesAny: any): XLSX.WorkBook {
  const u8 = toUint8(bytesAny)
  return XLSX.read(u8, { type: 'array' })
}

function sheetRows(wb: XLSX.WorkBook): Record<string, any>[] {
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const raw: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

  return raw.map((obj) => {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(obj)) out[normalizeKey(k)] = v
    return out
  })
}

function mapToLinhaTreinamento(r: Record<string, any>): LinhaTreinamento {
  return {
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
  }
}

/* =========================
   COMPANY CARD
   ========================= */
function CompanyCard({
  r,
  ag,
  isAdmin,
  isMine,
  onStartSchedule,
  onCopyWhatsApp,
  onMarkDone,
  onReset,
  resetting,
}: {
  r: LinhaTreinamento
  ag?: Agendamento
  isAdmin: boolean
  isMine: boolean
  onStartSchedule: () => void
  onCopyWhatsApp: () => void
  onMarkDone: () => void
  onReset: () => void
  resetting: boolean
}) {
  const telefone = [r.ddd, r.telefone].filter(Boolean).join(' ')
  const canEdit = isAdmin || isMine

  return (
    <div className="card" style={{ display: 'grid', gap: '.75rem', padding: '1.1rem' }}>
      <div
        className="card-soft"
        style={{
          display: 'flex',
          gap: '.6rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="pill">
            {ag?.status === 'concluido' ? 'Concluído' : ag ? 'Agendado' : 'Sem agendamento'}
          </span>

          <span className="p-muted" style={{ fontSize: 13 }}>
            {ag
              ? `Data: ${formatPtBR(ag.scheduledAt)} • Responsável: ${ag.trainerEmail || '—'}`
              : 'Ninguém assumiu ainda.'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button className="btn-primary" type="button" onClick={onStartSchedule}>
            {ag ? (canEdit ? 'Reagendar' : 'Ver') : 'Assumir e agendar'}
          </button>

          <LightButton onClick={onCopyWhatsApp}>Copiar msg WhatsApp</LightButton>

          {ag && canEdit && ag.status !== 'concluido' && (
            <LightButton onClick={onMarkDone}>Marcar concluído</LightButton>
          )}

          {/* ✅ SÓ ADMIN: RESETAR */}
          {isAdmin && ag && (
            <LightButton
              onClick={onReset}
              disabled={resetting}
              title="Apaga o agendamento e volta para 'Sem agendamento'"
            >
              {resetting ? 'Resetando...' : 'Resetar'}
            </LightButton>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '.6rem',
        }}
      >
        <InfoBox label="Chave Loja" value={r.chaveLoja} />
        <InfoBox label="PACB" value={r.numPacb} />
        <InfoBox label="Cód. Ag. Relacionamento" value={r.codAgRelacionamento} />
        <InfoBox label="Município" value={r.municipio} />
      </div>

      <div>
        <div className="p-muted" style={{ fontSize: 12 }}>
          Razão Social
        </div>
        <div style={{ fontWeight: 900, fontSize: '1.05rem', marginTop: '.15rem' }}>
          {r.razaoSocial || '—'}
        </div>

        <div className="p-muted" style={{ fontSize: 12, marginTop: '.65rem' }}>
          Nome da Loja
        </div>
        <div style={{ fontWeight: 900, fontSize: '1.05rem', marginTop: '.15rem' }}>
          {r.nomeLoja || '—'}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          alignItems: 'start',
        }}
      >
        <FieldRow label="CNPJ" value={r.cnpj} />
        <FieldRow label="Agente (Nome Ag.)" value={r.nomeAg} />
        <FieldRow label="Telefone" value={telefone} />
        <FieldRow label="Contato" value={r.contato} />
        <FieldRow label="Email do contato" value={r.emailContato} />
        <div>
          <div className="p-muted" style={{ fontSize: 12 }}>
            Status do Tablet
          </div>
          <div style={{ marginTop: '.15rem' }}>
            <span className="pill">{r.statusTablet || '—'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================
   PAGE
   ========================= */
export default function TreinamentosPage() {
  const router = useRouter()

  const FIXED_PATH = 'trainings/lista-atual.xls'
  const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'

  const [user, setUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<LinhaTreinamento[]>([])
  const [q, setQ] = useState('')

  const [loadingRead, setLoadingRead] = useState(false)
  const [loadingUpload, setLoadingUpload] = useState(false)

  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string>('')

  const [agMap, setAgMap] = useState<Record<string, Agendamento>>({})
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [dtLocal, setDtLocal] = useState<string>('')
  const [savingSchedule, setSavingSchedule] = useState(false)

  const [resettingKey, setResettingKey] = useState<string | null>(null)

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
        r.contato,
        r.emailContato,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)
    )
  }, [rows, q])

  async function loadAssignments() {
    try {
      const snap = await getDocs(collection(db, 'treinamentos_agendamentos'))
      const next: Record<string, Agendamento> = {}
      snap.forEach((d) => {
        next[d.id] = d.data() as Agendamento
      })
      setAgMap(next)
    } catch (e) {
      console.error('loadAssignments error:', e)
    }
  }

  async function loadCurrentList() {
    if (!auth.currentUser) {
      setErr('Você precisa estar logado para visualizar a lista.')
      return
    }

    setErr(null)
    setInfo('')
    setLoadingRead(true)

    try {
      const bytesAny = await getBytes(ref(storage, FIXED_PATH))
      const wb = readWorkbook(bytesAny)
      const raw = sheetRows(wb)
      const mapped = raw.map(mapToLinhaTreinamento)

      setRows(mapped)
      setInfo('Lista carregada ✅')
      await loadAssignments()
    } catch (e: any) {
      console.error('loadCurrentList error:', e)
      const code = e?.code || 'sem-code'
      const msg = e?.message || 'sem-message'
      setErr(`Erro ao carregar (${code}): ${msg}`)
    } finally {
      setLoadingRead(false)
    }
  }

  async function openDownload() {
    try {
      const url = await getDownloadURL(ref(storage, FIXED_PATH))
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      console.error(e)
      setErr('Não foi possível gerar o link de download.')
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
      setInfo('')
      setLoadingUpload(true)

      const name = file.name.toLowerCase()
      if (!name.endsWith('.xls') && !name.endsWith('.xlsx')) {
        throw new Error('Envie um arquivo .xls ou .xlsx.')
      }

      await uploadBytes(ref(storage, FIXED_PATH), file, {
        contentType: file.type || undefined,
      })

      await setDoc(
        doc(db, 'config', 'lista_treinamentos'),
        {
          uploadedAt: serverTimestamp(),
          uploadedBy: auth.currentUser.email || '',
        },
        { merge: true }
      )

      setInfo('Lista atual atualizada ✅')
      await loadCurrentList()
      setFile(null)
    } catch (e: any) {
      console.error('handleUploadFixed error:', e)
      const code = e?.code || 'sem-code'
      const msg = e?.message || 'sem-message'
      setErr(`Erro ao enviar (${code}): ${msg}`)
    } finally {
      setLoadingUpload(false)
    }
  }

  function startSchedule(chaveLoja: string) {
    setEditingKey(chaveLoja)

    const ag = agMap[chaveLoja]
    if (ag?.scheduledAt) {
      const d = ag.scheduledAt.toDate()
      const pad = (n: number) => String(n).padStart(2, '0')
      setDtLocal(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
          d.getHours()
        )}:${pad(d.getMinutes())}`
      )
    } else {
      setDtLocal('')
    }
  }

  async function saveSchedule(r: LinhaTreinamento) {
    if (!user) {
      setErr('Você precisa estar logado.')
      return
    }
    if (!dtLocal) {
      setErr('Escolha a data e hora do treinamento.')
      return
    }

    try {
      setErr(null)
      setInfo('')
      setSavingSchedule(true)

      const date = new Date(dtLocal)
      if (Number.isNaN(date.getTime())) {
        setErr('Data/hora inválida.')
        return
      }

      const cfgSnap = await getDoc(doc(db, 'config', 'lista_treinamentos'))
      const cfgUploadedAt = cfgSnap.exists() ? (cfgSnap.data() as any).uploadedAt : null

      const payload: Agendamento = {
        chaveLoja: r.chaveLoja,
        nomeLoja: r.nomeLoja,
        razaoSocial: r.razaoSocial,
        municipio: r.municipio,
        cnpj: r.cnpj,
        trainerUid: user.uid,
        trainerEmail: user.email || '',
        scheduledAt: Timestamp.fromDate(date),
        status: 'agendado',
        updatedAt: serverTimestamp() as any,
        ...(cfgUploadedAt ? { listUploadedAt: cfgUploadedAt } : {}),
      }

      await setDoc(doc(db, 'treinamentos_agendamentos', r.chaveLoja), payload, { merge: true })

      setInfo('Treinamento agendado ✅')
      setEditingKey(null)
      setDtLocal('')
      await loadAssignments()
    } catch (e: any) {
      console.error('saveSchedule error:', e)
      const code = e?.code || 'sem-code'
      const msg = e?.message || 'sem-message'
      setErr(`Falha ao agendar (${code}): ${msg}`)
    } finally {
      setSavingSchedule(false)
    }
  }

  async function markDone(chaveLoja: string) {
    try {
      setErr(null)
      await setDoc(
        doc(db, 'treinamentos_agendamentos', chaveLoja),
        { status: 'concluido', updatedAt: serverTimestamp() },
        { merge: true }
      )
      setInfo('Marcado como concluído ✅')
      await loadAssignments()
    } catch (e) {
      console.error(e)
      setErr('Não consegui marcar como concluído.')
    }
  }

  // ✅ NOVO: Resetar (admin) -> apaga o doc do agendamento
  async function resetAgendamento(chaveLoja: string) {
    if (!isAdmin) return
    const ok = window.confirm(
      'Tem certeza que deseja resetar?\n\nIsso vai apagar o agendamento e a empresa voltará para "Sem agendamento".'
    )
    if (!ok) return

    try {
      setErr(null)
      setInfo('')
      setResettingKey(chaveLoja)

      await deleteDoc(doc(db, 'treinamentos_agendamentos', chaveLoja))

      setInfo('Agendamento resetado ✅')
      await loadAssignments()
    } catch (e: any) {
      console.error('resetAgendamento error:', e)
      const code = e?.code || 'sem-code'
      const msg = e?.message || 'sem-message'
      setErr(`Falha ao resetar (${code}): ${msg}`)
    } finally {
      setResettingKey(null)
    }
  }

  function buildWhatsAppMessage(r: LinhaTreinamento, ag?: Agendamento) {
    const telefone = [r.ddd, r.telefone].filter(Boolean).join(' ')
    const dataHora = ag?.scheduledAt ? formatPtBR(ag.scheduledAt) : 'a definir'
    const responsavel = ag?.trainerEmail || user?.email || '—'
    const status = ag?.status === 'concluido' ? 'Concluído' : ag ? 'Agendado' : 'Sem agendamento'

    const agenciaLinha =
      r.codAgRelacionamento || r.nomeAg
        ? `🏦 *Agência:* ${r.codAgRelacionamento || '—'}${r.nomeAg ? ` — ${r.nomeAg}` : ''}`
        : ''

    return [
      '📌 *Treinamento — Agendamento*',
      '',
      `🏪 *Loja:* ${r.nomeLoja || '—'}`,
      `🏢 *Razão Social:* ${r.razaoSocial || '—'}`,
      `🔑 *Chave Loja:* ${r.chaveLoja || '—'}`,
      `🧾 *CNPJ:* ${r.cnpj || '—'}`,
      `📍 *Município:* ${r.municipio || '—'}`,
      ...(agenciaLinha ? [agenciaLinha] : []),
      '',
      `📅 *Data/Hora:* ${dataHora}`,
      `👤 *Responsável:* ${responsavel}`,
      `✅ *Status:* ${status}`,
      '',
      `📞 *Telefone:* ${telefone || '—'}`,
      `🙋 *Contato:* ${r.contato || '—'}`,
      `✉️ *E-mail:* ${r.emailContato || '—'}`,
    ].join('\n')
  }

  async function copyWhatsAppMessage(r: LinhaTreinamento) {
    try {
      const ag = agMap[r.chaveLoja]
      const msg = buildWhatsAppMessage(r, ag)
      await navigator.clipboard.writeText(msg)
      setInfo('Mensagem copiada ✅ (cole no WhatsApp)')
      setErr(null)
    } catch (e) {
      console.error(e)
      setErr('Não consegui copiar a mensagem.')
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

      setIsAdmin((u.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase())
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
          Favor só assumir e agendar quando já tiver certeza e ter falado com o cliente.
        </p>
      </div>

      <div className="card" style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn-primary" onClick={loadCurrentList} disabled={loadingRead || checkingAuth}>
            {checkingAuth ? 'Verificando login...' : loadingRead ? 'Carregando...' : 'Recarregar lista'}
          </button>

          <LightButton onClick={openDownload}>Baixar lista atual</LightButton>

          {isAdmin && <span className="pill">Admin</span>}
          {info && <span className="pill">{info}</span>}
        </div>

        {err && (
          <div className="card-soft" style={{ borderColor: 'rgba(214,31,44,.25)' }}>
            <p className="p-muted" style={{ color: 'rgba(214,31,44,.95)' }}>
              {err}
            </p>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="card" style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <span className="pill">Admin</span>
            <h2 className="h2" style={{ marginTop: '.6rem' }}>
              Atualizar lista atual
            </h2>
            <p className="p-muted" style={{ marginTop: '.35rem' }}>
              O arquivo será salvo como <b>trainings/lista-atual.xls</b> (substitui o anterior).
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

      {rows.length > 0 && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
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

          <div style={{ display: 'grid', gap: '1rem' }}>
            {filtered.map((r) => {
              const ag = agMap[r.chaveLoja]
              const isMine = !!user && ag?.trainerUid === user.uid

              return (
                <div key={r.chaveLoja} style={{ display: 'grid', gap: '.75rem' }}>
                  {editingKey === r.chaveLoja && (
                    <div className="card" style={{ display: 'grid', gap: '.75rem' }}>
                      <div className="h2">Agendar treinamento</div>

                      <label>
                        <div className="label">Data e hora</div>
                        <input
                          className="input"
                          type="datetime-local"
                          value={dtLocal}
                          onChange={(e) => setDtLocal(e.target.value)}
                        />
                        <div className="p-muted" style={{ marginTop: '.35rem' }}>
                          Exibição final:{' '}
                          <b>{dtLocal ? formatPtBR(Timestamp.fromDate(new Date(dtLocal))) : '—'}</b>
                        </div>
                      </label>

                      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                        <button
                          className="btn-primary"
                          type="button"
                          onClick={() => saveSchedule(r)}
                          disabled={savingSchedule}
                        >
                          {savingSchedule ? 'Salvando...' : 'Confirmar agendamento'}
                        </button>

                        <LightButton
                          onClick={() => {
                            setEditingKey(null)
                            setDtLocal('')
                          }}
                        >
                          Cancelar
                        </LightButton>
                      </div>
                    </div>
                  )}

                  <CompanyCard
                    r={r}
                    ag={ag}
                    isAdmin={isAdmin}
                    isMine={isMine}
                    onStartSchedule={() => startSchedule(r.chaveLoja)}
                    onCopyWhatsApp={() => copyWhatsAppMessage(r)}
                    onMarkDone={() => markDone(r.chaveLoja)}
                    onReset={() => resetAgendamento(r.chaveLoja)}
                    resetting={resettingKey === r.chaveLoja}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!checkingAuth && user && (
        <p className="p-muted" style={{ marginTop: '0.25rem' }}>
          Logado como: <b>{user.email}</b>
        </p>
      )}
    </section>
  )
}