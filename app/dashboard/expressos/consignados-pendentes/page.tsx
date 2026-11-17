'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, getDocs } from 'firebase/firestore'
import { getBytes, getMetadata, ref, uploadBytes } from 'firebase/storage'
import { ArrowLeft, CalendarDays, CircleAlert, Eye, EyeOff, FileSpreadsheet, MapPin, RefreshCw, Search, TrendingUp, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'

import { auth, db, storage } from '@/lib/firebase'

const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'
const ADMIN_UID = 'Z1VO0zsXyIf23YwmmGjhTm3hIBE2'
const BASE_PENDENCIAS = 'consignados-pendentes/consignados-pendentes.xlsx'
const BASE_EXPRESSOS = 'expressos_registro_junho_2026'

type Pendencia = {
  id: string
  agencia: string
  valorContrato: number
  cpfCliente: string
  dataContrato: string
  tipo: string
  motivo: string
}

type ExpressoCandidato = {
  id: string
  chave: string
  nome: string
  agencia: string
  pacb: string
  municipio: string
  valorConsignado: number
}

type GrupoAgencia = {
  agencia: string
  pendencias: Pendencia[]
  candidatos: ExpressoCandidato[]
  totalProducao: number
}

function text(value: unknown) {
  return value === null || value === undefined ? '' : String(value).trim()
}

function keyFor(value: unknown) {
  return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

function digits(value: unknown) {
  return text(value).replace(/\D/g, '')
}

function normalizeAgency(value: unknown) {
  return digits(text(value).split(/[\/|]/)[0]).replace(/^0+(?=\d)/, '')
}

function recordValue(record: Record<string, unknown>, ...names: string[]) {
  const values = new Map(Object.entries(record).map(([key, value]) => [keyFor(key), value]))
  for (const name of names) {
    const value = values.get(keyFor(name))
    if (value !== undefined && value !== null && text(value)) return value
  }
  return ''
}

function parseMoney(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  let raw = text(value).replace(/R\$/gi, '').replace(/\s/g, '')
  if (!raw) return 0
  if (raw.includes(',') && raw.includes('.')) {
    raw = raw.lastIndexOf(',') > raw.lastIndexOf('.')
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(/,/g, '')
  } else if (raw.includes(',')) {
    raw = raw.replace(',', '.')
  }
  const parsed = Number(raw.replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function parseContractDate(value: unknown) {
  let year = 0
  let month = 0
  let day = 0

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    year = value.getFullYear()
    month = value.getMonth() + 1
    day = value.getDate()
  } else if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) ({ y: year, m: month, d: day } = parsed)
  } else {
    const raw = text(value)
    const iso = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
    const br = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/)
    if (iso) [, year, month, day] = iso.map(Number) as [string, number, number, number]
    else if (br) [, day, month, year] = br.map(Number) as [string, number, number, number]
  }

  if (!year || !month || !day) return text(value)
  return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`
}

function parsePendencias(bytes: Uint8Array | ArrayBuffer) {
  const workbook = XLSX.read(bytes, { type: 'array', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) throw new Error('A planilha não tem uma aba com dados.')
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: true })
  if (!records.length) throw new Error('A planilha de pendências está vazia.')

  const headers = new Set(Object.keys(records[0]).map(keyFor))
  const required = ['codag', 'vlrcontrato', 'cpfcliente', 'datacontrato', 'tipo']
  const missing = required.filter((header) => !headers.has(header))
  if (missing.length) throw new Error('Não encontrei todas as colunas necessárias: COD_AG, VLR_CONTRATO, CPF_CLIENTE, DATA_CONTRATO e TIPO.')

  const rows = records.map((record, index): Pendencia => ({
    id: `${index}-${normalizeAgency(recordValue(record, 'COD_AG'))}-${digits(recordValue(record, 'CPF_CLIENTE'))}`,
    agencia: normalizeAgency(recordValue(record, 'COD_AG')),
    valorContrato: parseMoney(recordValue(record, 'VLR_CONTRATO')),
    cpfCliente: digits(recordValue(record, 'CPF_CLIENTE'))
      ? digits(recordValue(record, 'CPF_CLIENTE')).slice(-11).padStart(11, '0')
      : '',
    dataContrato: parseContractDate(recordValue(record, 'DATA_CONTRATO')),
    tipo: text(recordValue(record, 'TIPO')).toUpperCase(),
    motivo: text(recordValue(record, 'MOTIVO')),
  })).filter((row) => row.agencia)

  if (!rows.length) throw new Error('Não encontrei contratos com COD_AG preenchido.')
  return rows
}

function parseCandidate(record: Record<string, unknown>, id: string): ExpressoCandidato | null {
  const agenciaRaw = recordValue(record, 'cod_ag', 'codAg', 'agencia', 'agPacb', 'ag_pacb', 'agencia / pacb')
  const agency = normalizeAgency(agenciaRaw)
  const chave = text(recordValue(record, 'chave', 'chave_loja', 'chaveLoja'))
  const nome = text(recordValue(record, 'nome', 'nome_loja', 'nomeLoja', 'expresso'))
  if (!agency || !nome || record.presenteNaUltimaBase === false) return null

  return {
    id: `${chave || id}-${text(recordValue(record, 'pacb'))}`,
    chave,
    nome,
    agencia: agency,
    pacb: text(recordValue(record, 'pacb')),
    municipio: text(recordValue(record, 'municipio', 'cidade')),
    valorConsignado: Math.max(0, parseMoney(recordValue(record, 'vlrConsignadoTotal', 'vlr_consignado_total', 'consignado total'))),
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function cpfMascarado(value: string) {
  if (!value) return 'CPF não informado'
  return value.length === 11 ? `${value.slice(0, 3)}.***.***-**` : '***.***.***-**'
}

function cpfCompleto(value: string) {
  return value.length === 11 ? value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : 'CPF não informado'
}

function tipoContrato(value: string) {
  const normalized = keyFor(value)
  if (normalized === 'refin') return 'Refinanciamento'
  if (normalized === 'novo') return 'Novo'
  return value || 'Não informado'
}

function statusError(cause: unknown) {
  return cause as { code?: string; message?: string }
}

export default function ConsignadosPendentesPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pendencias, setPendencias] = useState<Pendencia[]>([])
  const [candidatos, setCandidatos] = useState<ExpressoCandidato[]>([])
  const [revealedCpfs, setRevealedCpfs] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [fileName, setFileName] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  const [error, setError] = useState('')
  const [candidateError, setCandidateError] = useState('')
  const [info, setInfo] = useState('')

  const loadData = useCallback(async () => {
    if (!auth.currentUser) return
    setLoading(true)
    setError('')
    setCandidateError('')
    try {
      const baseRef = ref(storage, BASE_PENDENCIAS)
      const [bytes, metadata] = await Promise.all([getBytes(baseRef), getMetadata(baseRef)])
      const rows = parsePendencias(new Uint8Array(bytes))
      setPendencias(rows)
      setFileName(metadata.customMetadata?.originalFileName || 'CONSIGNADOSPENDENTES.xlsx')
      setUpdatedAt(metadata.updated || metadata.timeCreated || '')
      setInfo(`${rows.length} contratos pendentes carregados.`)
    } catch (cause: unknown) {
      const failure = statusError(cause)
      if (failure.code === 'storage/object-not-found') {
        setPendencias([])
        setFileName('')
        setUpdatedAt('')
        setError('A base de pendências ainda não foi carregada. O administrador pode enviar o arquivo nesta página.')
      } else if (failure.code === 'storage/unauthorized' || failure.code === 'storage/unauthenticated') {
        setError('O Firebase Storage bloqueou o acesso à base de pendências. Confira as regras do caminho consignados-pendentes.')
      } else {
        setError(failure.message || 'Não consegui carregar a planilha de pendências.')
      }
    }

    try {
      const snapshot = await getDocs(collection(db, BASE_EXPRESSOS))
      const unique = new Map<string, ExpressoCandidato>()
      snapshot.docs.forEach((docSnap) => {
        const candidate = parseCandidate(docSnap.data(), docSnap.id)
        if (!candidate) return
        const key = candidate.id
        const previous = unique.get(key)
        if (!previous || candidate.valorConsignado > previous.valorConsignado) unique.set(key, candidate)
      })
      setCandidatos([...unique.values()])
    } catch (cause: unknown) {
      const failure = statusError(cause)
      setCandidateError(failure.code === 'permission-denied'
        ? 'Sem permissão para consultar a base de produção dos Expressos.'
        : 'Não consegui consultar a produção de consignado dos Expressos. Sincronize ou confira a base atual.')
    } finally {
      setLoading(false)
    }
  }, [])

  async function uploadFile(file?: File) {
    if (!file) return
    if (!isAdmin) {
      setError('Somente o administrador pode carregar a base de pendências.')
      return
    }
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError('Selecione a planilha no formato .xlsx.')
      return
    }

    setUploading(true)
    setError('')
    setInfo('Validando a planilha…')
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const parsed = parsePendencias(bytes)
      await uploadBytes(ref(storage, BASE_PENDENCIAS), new Blob([bytes.buffer as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }), {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        customMetadata: { originalFileName: file.name },
      })
      setPendencias(parsed)
      setFileName(file.name)
      setUpdatedAt(new Date().toISOString())
      setRevealedCpfs(new Set())
      setInfo(`${parsed.length} contratos pendentes carregados. Análise por agência atualizada.`)
    } catch (cause: unknown) {
      const failure = statusError(cause)
      setError(failure.code === 'storage/unauthorized'
        ? 'O Firebase Storage não autorizou o envio. Libere a escrita de administrador no caminho consignados-pendentes.'
        : failure.message || 'Não consegui processar a planilha. Confira as colunas e tente novamente.')
      setInfo('')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCheckingAuth(false)
      if (!user) {
        setIsAdmin(false)
        router.push('/login')
        return
      }
      setIsAdmin((user.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase() || user.uid === ADMIN_UID)
      void loadData()
    })
    return () => unsubscribe()
  }, [loadData, router])

  const totalPendente = useMemo(() => pendencias.reduce((total, row) => total + row.valorContrato, 0), [pendencias])

  const grupos = useMemo(() => {
    const termo = search.trim().toLocaleLowerCase('pt-BR')
    const filtradas = termo
      ? pendencias.filter((row) => `${row.agencia} ${row.cpfCliente} ${row.tipo} ${row.motivo} ${row.dataContrato}`.toLocaleLowerCase('pt-BR').includes(termo)
        || (digits(termo).length > 2 && row.cpfCliente.includes(digits(termo))))
      : pendencias
    const agencyGroups = new Map<string, Pendencia[]>()
    filtradas.forEach((row) => agencyGroups.set(row.agencia, [...(agencyGroups.get(row.agencia) || []), row]))

    return [...agencyGroups.entries()]
      .map(([agencia, agencyPendencias]): GrupoAgencia => {
        const agencyCandidates = candidatos
          .filter((candidate) => candidate.agencia === agencia)
          .sort((a, b) => b.valorConsignado - a.valorConsignado || a.nome.localeCompare(b.nome, 'pt-BR'))
        const totalProducao = agencyCandidates.reduce((sum, candidate) => sum + candidate.valorConsignado, 0)
        return {
          agencia,
          pendencias: agencyPendencias,
          candidatos: agencyCandidates.slice(0, 5),
          totalProducao,
        }
      })
      .sort((a, b) => a.agencia.localeCompare(b.agencia, 'pt-BR', { numeric: true }))
  }, [candidatos, pendencias, search])

  function toggleCpf(id: string) {
    setRevealedCpfs((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <main style={{ display: 'grid', gap: '1rem', maxWidth: 1250, margin: '0 auto', paddingBottom: '2rem' }}>
      <header className="card" style={{ display: 'grid', gap: '.8rem', padding: 'clamp(1rem, 3vw, 1.5rem)', background: 'linear-gradient(135deg, #fff 0%, #fff7f7 100%)' }}>
        <span className="pill" style={{ justifySelf: 'start' }}>Produção • Consignado</span>
        <div>
          <h1 className="h1" style={{ margin: 0 }}>Consignados pendentes</h1>
          <p className="p-muted" style={{ margin: '.4rem 0 0', maxWidth: 850 }}>
            Pendências agrupadas por agência e possíveis Expressos ordenados pelo valor de consignado registrado na base atual. O ranking é uma estimativa para orientar a apuração, não confirma quem realizou o contrato.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.55rem' }}>
          <button type="button" className="btn-primary" onClick={() => router.push('/dashboard/expressos/geral-junho-2026')} style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}>
            <ArrowLeft size={16} /> Expresso Geral
          </button>
          <button type="button" onClick={() => void loadData()} disabled={loading || checkingAuth} style={secondaryButtonStyle}>
            <RefreshCw size={15} /> {loading ? 'Atualizando…' : 'Atualizar análise'}
          </button>
        </div>
        <p className="p-muted" style={{ margin: 0, fontSize: '.78rem' }}>
          Arquivo: {fileName || 'nenhum arquivo carregado'}{updatedAt ? ` • Atualizado em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(updatedAt))}` : ''}
        </p>
      </header>

      {isAdmin && (
        <section className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'grid', gap: '.25rem' }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }}><FileSpreadsheet size={18} color="#c8102e" /> Carregar base de pendências</strong>
            <span className="p-muted" style={{ fontSize: '.84rem' }}>Excel com COD_AG, VLR_CONTRATO, CPF_CLIENTE, DATA_CONTRATO e TIPO.</span>
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden disabled={uploading} onChange={(event) => void uploadFile(event.target.files?.[0])} aria-label="Selecionar arquivo de consignados pendentes" />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading || checkingAuth} style={secondaryButtonStyle}>
            <Upload size={16} /> {uploading ? 'Enviando arquivo…' : 'Escolher planilha Excel'}
          </button>
        </section>
      )}

      {error && <div role="alert" className="card" style={{ color: '#b42318', border: '1px solid #fecdca', display: 'flex', alignItems: 'flex-start', gap: '.5rem' }}><CircleAlert size={18} />{error}</div>}
      {candidateError && <div role="alert" className="card" style={{ color: '#92400e', border: '1px solid #fed7aa' }}>{candidateError}</div>}
      {info && <div role="status" className="card" style={{ color: '#166534' }}>{info}</div>}

      {pendencias.length > 0 && (
        <section className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '.7rem', alignItems: 'center' }}>
          <Pill>{pendencias.length} contratos pendentes</Pill>
          <Pill>{new Set(pendencias.map((row) => row.agencia)).size} agências</Pill>
          <Pill>{formatCurrency(totalPendente)} em contratos</Pill>
          <label style={{ display: 'flex', alignItems: 'center', gap: '.45rem', flex: '1 1 250px', maxWidth: 470, marginLeft: 'auto' }}>
            <Search size={17} color="#64748b" />
            <input className="input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar agência, CPF, tipo ou motivo" aria-label="Buscar pendência" />
          </label>
        </section>
      )}

      {loading && pendencias.length === 0 ? (
        <section className="card p-muted">Carregando pendências e produção dos Expressos…</section>
      ) : grupos.length === 0 ? (
        <section className="card" style={{ textAlign: 'center', padding: 'clamp(1.5rem, 5vw, 3rem)' }}>
          <FileSpreadsheet size={34} color="#c8102e" style={{ margin: '0 auto .7rem' }} />
          <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{pendencias.length ? 'Nenhuma pendência corresponde à busca' : 'Carregue uma base para iniciar a análise'}</h2>
          <p className="p-muted" style={{ margin: '.45rem auto 0', maxWidth: 580 }}>
            {pendencias.length ? 'Tente pesquisar por outra agência, CPF, tipo de contrato ou motivo.' : 'A análise identifica cada agência da planilha e sugere até cinco Expressos pelo volume de consignado da base atual.'}
          </p>
        </section>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {grupos.map((grupo) => (
            <section key={grupo.agencia} className="card" style={{ display: 'grid', gap: '1rem', padding: 'clamp(1rem, 3vw, 1.3rem)' }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '.6rem', borderBottom: '1px solid rgba(15,15,25,.09)', paddingBottom: '.8rem' }}>
                <span style={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 12, background: 'rgba(200,16,46,.09)', color: '#c8102e' }}><MapPin size={20} /></span>
                <div style={{ flex: '1 1 180px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Agência {grupo.agencia}</h2>
                  <span className="p-muted" style={{ fontSize: '.82rem' }}>{grupo.pendencias.length} {grupo.pendencias.length === 1 ? 'pendência' : 'pendências'}</span>
                </div>
                <Pill>{formatCurrency(grupo.pendencias.reduce((sum, row) => sum + row.valorContrato, 0))} pendente</Pill>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1rem', alignItems: 'start' }}>
                <div style={{ display: 'grid', gap: '.65rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '.45rem', margin: 0, fontSize: '.95rem' }}><CalendarDays size={17} color="#c8102e" /> Contratos com pendência</h3>
                  {grupo.pendencias.map((row) => {
                    const cpfVisible = revealedCpfs.has(row.id)
                    return (
                      <article key={row.id} className="card-soft" style={{ display: 'grid', gap: '.55rem', minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.65rem', alignItems: 'flex-start' }}>
                          <strong style={{ color: '#182230', fontSize: '1.02rem' }}>{formatCurrency(row.valorContrato)}</strong>
                          <Pill>{tipoContrato(row.tipo)}</Pill>
                        </div>
                        <span className="p-muted" style={{ fontSize: '.84rem' }}>Data do contrato: <strong style={{ color: '#202939' }}>{row.dataContrato || 'Não informada'}</strong></span>
                        <button type="button" onClick={() => toggleCpf(row.id)} aria-label={cpfVisible ? 'Ocultar CPF do cliente' : 'Exibir CPF completo do cliente'} style={cpfButtonStyle}>
                          {cpfVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                          <span>CPF: {cpfVisible ? cpfCompleto(row.cpfCliente) : cpfMascarado(row.cpfCliente)}</span>
                          <span style={{ fontSize: '.72rem', color: '#64748b' }}>{cpfVisible ? 'Ocultar' : 'Toque para revelar'}</span>
                        </button>
                        {row.motivo && <span style={{ fontSize: '.82rem', lineHeight: 1.4 }}><b>Motivo:</b> {row.motivo}</span>}
                      </article>
                    )
                  })}
                </div>

                <div style={{ display: 'grid', gap: '.65rem' }}>
                  <div>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '.45rem', margin: 0, fontSize: '.95rem' }}><TrendingUp size={17} color="#c8102e" /> Possíveis Expressos responsáveis</h3>
                    <p className="p-muted" style={{ margin: '.25rem 0 0', fontSize: '.77rem' }}>Até cinco, ordenados pela produção de consignado registrada na base.</p>
                  </div>
                  {grupo.candidatos.length ? grupo.candidatos.map((candidate, index) => {
                    const share = grupo.totalProducao > 0 ? candidate.valorConsignado / grupo.totalProducao * 100 : null
                    return (
                      <article key={candidate.id} className="card-soft" style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', alignItems: 'center', gap: '.65rem', minWidth: 0 }}>
                        <span style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: '50%', background: index === 0 ? 'rgba(200,16,46,.1)' : 'rgba(15,15,25,.06)', color: index === 0 ? '#c8102e' : '#475569', fontWeight: 900 }}>{index + 1}º</span>
                        <div style={{ minWidth: 0, display: 'grid', gap: '.15rem' }}>
                          <strong style={{ overflowWrap: 'anywhere', fontSize: '.88rem' }}>{candidate.nome}</strong>
                          <span className="p-muted" style={{ fontSize: '.75rem' }}>
                            Chave {candidate.chave || '—'}{candidate.pacb ? ` • PACB ${candidate.pacb}` : ''}{candidate.municipio ? ` • ${candidate.municipio}` : ''}
                          </span>
                          <span style={{ fontSize: '.77rem', color: candidate.valorConsignado > 0 ? '#166534' : '#64748b', fontWeight: 750 }}>
                            {candidate.valorConsignado > 0 ? `Consignado na base: ${formatCurrency(candidate.valorConsignado)}` : 'Sem consignado informado na base'}
                          </span>
                        </div>
                        <span style={{ color: '#92400e', fontWeight: 850, fontSize: '.8rem', whiteSpace: 'nowrap' }}>
                          {share === null ? '—' : `${share.toFixed(1).replace('.', ',')}%`}
                        </span>
                      </article>
                    )
                  }) : (
                    <div className="card-soft" style={{ display: 'grid', gap: '.25rem' }}>
                      <strong>Sem Expressos encontrados para esta agência.</strong>
                      <span className="p-muted" style={{ fontSize: '.8rem' }}>Confira o código da agência na pendência e a base de produção sincronizada no Expresso Geral.</span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      {grupos.length > 0 && (
        <p className="p-muted" style={{ margin: 0, fontSize: '.78rem' }}>
          A porcentagem ao lado indica a participação do Expresso no consignado registrado entre os Expressos daquela agência; não é uma probabilidade estatística nem confirma a autoria. Valores e ranking dependem da atualização da base de produção.
        </p>
      )}
    </main>
  )
}

function Pill({ children }: { children: ReactNode }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '.34rem .62rem', background: 'rgba(15,15,25,.06)', color: '#344054', fontSize: '.78rem', fontWeight: 800 }}>{children}</span>
}

const secondaryButtonStyle = {
  borderRadius: 999,
  padding: '.58rem .85rem',
  border: '1px solid rgba(15,15,25,.16)',
  background: '#fff',
  color: '#202939',
  fontWeight: 800,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '.4rem',
}

const cpfButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap' as const,
  gap: '.38rem',
  width: 'fit-content',
  maxWidth: '100%',
  padding: '.38rem .55rem',
  border: '1px solid rgba(15,15,25,.12)',
  borderRadius: 10,
  background: '#fff',
  color: '#202939',
  fontSize: '.82rem',
  fontWeight: 750,
  cursor: 'pointer',
  textAlign: 'left' as const,
}
