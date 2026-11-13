'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { getBytes, getMetadata, ref, uploadBytes } from 'firebase/storage'
import { ArrowLeft, Building2, CalendarDays, CircleAlert, FileSpreadsheet, MapPin, RefreshCw, Search, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'

import { auth, storage } from '@/lib/firebase'

const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'
const ADMIN_UID = 'Z1VO0zsXyIf23YwmmGjhTm3hIBE2'
const BASE_PATH = 'informacoes-gerenciais/informacoes-gerenciais.xlsx'

type GerencialRow = {
  chave: string
  nome: string
  cnpj: string
  pacb: string
  codAg: string
  nomeAg: string
  municipio: string
  diretoriaRegional: string
  gerenciaRegional: string
  avancado: string
  presenca: string
  orgPagador: string
  inauguracao: string
  certificacao: string
  retiradaTablet: string
  codBloqueio: string
  motivoBloqueio: string
  dataBloqueio: string
  ultimaTransacao: string
  retiradaEquipamento: string
  treinamentoStatus: string
  statusLoja: string
  ativaMesAnterior: string
}

type BaseResult = { rows: GerencialRow[]; headers: string[] }

function text(value: unknown) {
  return value === null || value === undefined ? '' : String(value).trim()
}

function normalizeHeader(value: unknown) {
  return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

function normalizeKey(value: unknown) {
  return text(value).replace(/\D/g, '').replace(/^0+(?=\d)/, '')
}

function valueFor(record: Record<string, unknown>, ...names: string[]) {
  const fields = new Map(Object.entries(record).map(([key, value]) => [normalizeHeader(key), value]))
  for (const name of names) {
    const value = fields.get(normalizeHeader(name))
    if (value !== undefined && value !== null && text(value)) return text(value)
  }
  return ''
}

function parseBase(bytes: Uint8Array | ArrayBuffer): BaseResult {
  const workbook = XLSX.read(bytes, { type: 'array', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) throw new Error('A planilha não possui uma aba com dados.')

  const headers = (XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })[0] || []).map(text)
  const headerSet = new Set(headers.map(normalizeHeader))
  if (!headerSet.has('chaveloja') || !headerSet.has('nomeloja')) {
    throw new Error('Não encontrei as colunas CHAVE_LOJA e NOME_LOJA na primeira aba.')
  }

  const sourceRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false })
  const rows = sourceRows.map((record): GerencialRow => ({
    chave: normalizeKey(valueFor(record, 'CHAVE_LOJA')),
    nome: valueFor(record, 'NOME_LOJA'),
    cnpj: valueFor(record, 'CNPJ'),
    pacb: valueFor(record, 'PACB'),
    codAg: valueFor(record, 'COD_AG'),
    nomeAg: valueFor(record, 'NOME_AG'),
    municipio: valueFor(record, 'MUNICIPIO'),
    diretoriaRegional: valueFor(record, 'DIR_REGIONAL'),
    gerenciaRegional: valueFor(record, 'GER_REGIONAL'),
    avancado: valueFor(record, 'AVANCADO'),
    presenca: valueFor(record, 'PRESENCA'),
    orgPagador: valueFor(record, 'ORG_PAGADOR'),
    inauguracao: valueFor(record, 'DT_INAUG_LOJA'),
    certificacao: valueFor(record, 'DATA_CERTIFICACAO'),
    retiradaTablet: valueFor(record, 'DATA_RETIRADA_TABLET'),
    codBloqueio: valueFor(record, 'COD_BLOQUEIO'),
    motivoBloqueio: valueFor(record, 'MOTIVO_BLOQUEIO'),
    dataBloqueio: valueFor(record, 'DATA_BLOQUEIO'),
    ultimaTransacao: valueFor(record, 'DATA_ULT_TRANSACAO'),
    retiradaEquipamento: valueFor(record, 'DATA_RETIRADA_EQPTO'),
    treinamentoStatus: valueFor(record, 'TREINAMENTO_STATUS'),
    statusLoja: valueFor(record, 'STATUS_LOJA'),
    ativaMesAnterior: valueFor(record, 'LOJA_ATIVA_MES_ANTERIOR'),
  })).filter((row) => row.chave && row.nome)

  if (!rows.length) throw new Error('Não encontrei expressos com chave loja e nome preenchidos.')
  return { rows, headers }
}

function displayValue(value: string) {
  if (!value || value === '-') return 'Não informado'
  return value
}

function dataOuTraco(value: string) {
  return value && value !== '-' ? value : '-'
}

function yesNo(value: string) {
  const normalized = normalizeHeader(value)
  if (['s', 'sim', '1', 'true', 'x'].includes(normalized)) return 'Sim'
  if (['n', 'nao', '0', 'false'].includes(normalized)) return 'Não'
  if (normalized === '-') return 'Não'
  return displayValue(value)
}

function simOuTraco(value: string) {
  const normalized = normalizeHeader(value)
  return normalized === 's' || normalized === 'sim' ? 'Sim' : '-'
}

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 14) return displayValue(value)
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

function displayTime(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function DataField({ label, value, prominent = false }: { label: string; value: string; prominent?: boolean }) {
  return (
    <div style={{ minWidth: 0, display: 'grid', gap: '.28rem' }}>
      <span style={{ color: '#64748b', fontSize: '.76rem', fontWeight: 700, letterSpacing: '.035em', textTransform: 'uppercase' }}>{label}</span>
      <strong style={{ color: '#182230', fontSize: prominent ? '1.04rem' : '.96rem', lineHeight: 1.4, overflowWrap: 'anywhere' }}>{value || 'Não informado'}</strong>
    </div>
  )
}

function DataSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="card" style={{ display: 'grid', gap: '1rem', padding: 'clamp(1rem, 3vw, 1.4rem)' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '.55rem', margin: 0, color: '#202939', fontSize: '1.05rem' }}>
        <span style={{ color: '#c8102e', display: 'inline-flex' }}>{icon}</span>{title}
      </h2>
      {children}
    </section>
  )
}

export default function InformacoesGerenciaisPage() {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [rows, setRows] = useState<GerencialRow[]>([])
  const [searchKey, setSearchKey] = useState('')
  const [fileName, setFileName] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const loadBase = useCallback(async () => {
    if (!auth.currentUser) return
    setLoading(true)
    setError('')
    try {
      const storageRef = ref(storage, BASE_PATH)
      const [bytes, metadata] = await Promise.all([getBytes(storageRef), getMetadata(storageRef)])
      const parsed = parseBase(new Uint8Array(bytes))
      setRows(parsed.rows)
      setFileName(metadata.customMetadata?.originalFileName || 'Informações gerenciais')
      setUpdatedAt(metadata.updated || metadata.timeCreated || '')
      setInfo(`${parsed.rows.length.toLocaleString('pt-BR')} expressos carregados da base.`)
    } catch (cause: unknown) {
      const failure = cause as { code?: string; message?: string }
      if (failure.code === 'storage/object-not-found') {
        setError('A base mensal ainda não foi enviada. O administrador pode carregar o arquivo nesta página.')
      } else if (failure.code === 'storage/unauthorized' || failure.code === 'storage/unauthenticated') {
        setError('O Firebase Storage bloqueou o acesso. Confira as regras da pasta informacoes-gerenciais.')
      } else {
        setError(failure.message || 'Não consegui carregar a base de informações gerenciais.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  async function uploadBase(file?: File) {
    if (!file) return
    if (!isAdmin) {
      setError('Somente o administrador pode atualizar a base mensal.')
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
      const parsed = parseBase(bytes)
      await uploadBytes(ref(storage, BASE_PATH), new Blob([bytes.buffer as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }), {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        customMetadata: { originalFileName: file.name },
      })
      setRows(parsed.rows)
      setFileName(file.name)
      setUpdatedAt(new Date().toISOString())
      setInfo(`${parsed.rows.length.toLocaleString('pt-BR')} expressos carregados. Base mensal atualizada.`)
    } catch (cause: unknown) {
      const failure = cause as { code?: string; message?: string }
      setError(failure.code === 'storage/unauthorized'
        ? 'O Firebase Storage não autorizou o envio. Confira as permissões para o administrador.'
        : failure.message || 'Não consegui atualizar a base. Confira o arquivo e tente novamente.')
      setInfo('')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
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
      setIsAdmin((user.email || '').toLowerCase() === ADMIN_EMAIL || user.uid === ADMIN_UID)
      void loadBase()
    })
    return () => unsubscribe()
  }, [loadBase, router])

  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get('chave')
    if (key) setSearchKey(normalizeKey(key))
  }, [])

  const selected = useMemo(() => {
    const key = normalizeKey(searchKey)
    return key ? rows.find((row) => row.chave === key) || null : null
  }, [rows, searchKey])
  const keyNotFound = Boolean(normalizeKey(searchKey) && rows.length && !selected)

  function searchByKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const key = normalizeKey(searchKey)
    if (key) router.replace(`/dashboard/expressos/informacoesgerenciais?chave=${encodeURIComponent(key)}`)
  }

  return (
    <main style={{ display: 'grid', gap: '1rem', maxWidth: 1180, margin: '0 auto', paddingBottom: '2rem' }}>
      <header className="card" style={{ display: 'grid', gap: '.85rem', padding: 'clamp(1rem, 3vw, 1.5rem)', background: 'linear-gradient(135deg, #fff 0%, #fff7f7 100%)' }}>
        <span className="pill" style={{ justifySelf: 'start' }}>Informações gerenciais</span>
        <div>
          <h1 className="h1" style={{ margin: 0 }}>Resumo do Expresso</h1>
          <p className="p-muted" style={{ margin: '.4rem 0 0' }}>Consulte os dados cadastrais, regionais, treinamento e situação da loja pela chave loja.</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.6rem' }}>
          <button type="button" className="btn-primary" onClick={() => router.push('/dashboard/expressos/geral-junho-2026')} style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}>
            <ArrowLeft size={16} /> Expresso Geral
          </button>
          <button type="button" onClick={() => void loadBase()} disabled={loading || checkingAuth} style={secondaryButtonStyle}>
            <RefreshCw size={15} /> {loading ? 'Atualizando…' : 'Atualizar dados'}
          </button>
        </div>
        <form onSubmit={searchByKey} style={{ display: 'flex', flexWrap: 'wrap', gap: '.55rem', marginTop: '.25rem' }}>
          <input className="input" inputMode="numeric" value={searchKey} onChange={(event) => setSearchKey(event.target.value)} placeholder="Digite a chave loja" aria-label="Chave loja" style={{ flex: '1 1 220px', maxWidth: 420 }} />
          <button type="submit" style={secondaryButtonStyle}><Search size={15} /> Consultar Expresso</button>
        </form>
        <p className="p-muted" style={{ fontSize: '.78rem', margin: 0 }}>
          Base: {fileName || 'ainda não carregada'}{updatedAt ? ` • Atualizada em ${displayTime(updatedAt)}` : ''}
        </p>
      </header>

      {isAdmin && (
        <section className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'grid', gap: '.25rem' }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }}><FileSpreadsheet size={18} color="#c8102e" /> Atualizar base mensal</strong>
            <span className="p-muted" style={{ fontSize: '.84rem' }}>Envie a planilha Excel com CHAVE_LOJA e NOME_LOJA na primeira aba.</span>
          </div>
          <input ref={fileInput} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden disabled={uploading} onChange={(event) => void uploadBase(event.target.files?.[0])} aria-label="Selecionar base de informações gerenciais" />
          <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} style={secondaryButtonStyle}>
            <Upload size={16} /> {uploading ? 'Enviando planilha…' : 'Carregar nova planilha'}
          </button>
        </section>
      )}

      {error && <div role="alert" className="card" style={{ color: '#b42318', border: '1px solid #fecdca', display: 'flex', gap: '.5rem', alignItems: 'flex-start' }}><CircleAlert size={18} />{error}</div>}
      {info && <div role="status" className="card" style={{ color: '#166534' }}>{info}</div>}

      {!selected && !keyNotFound && (
        <section className="card" style={{ textAlign: 'center', padding: 'clamp(1.5rem, 5vw, 3rem)' }}>
          <Building2 size={34} color="#c8102e" style={{ margin: '0 auto .7rem' }} />
          <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{loading ? 'Carregando base…' : 'Pesquise pela chave loja'}</h2>
          <p className="p-muted" style={{ margin: '.45rem auto 0', maxWidth: 500 }}>Abra esta página pelo botão no Expresso Geral ou digite uma chave loja para consultar o cadastro.</p>
        </section>
      )}

      {keyNotFound && (
        <section role="status" className="card" style={{ borderColor: '#fed7aa', background: '#fffaf4', display: 'flex', gap: '.65rem', alignItems: 'center' }}>
          <CircleAlert color="#c2410c" size={20} /> Não encontrei a chave {normalizeKey(searchKey)} na base mensal carregada.
        </section>
      )}

      {selected && (
        <>
          <section className="card" style={{ display: 'grid', gap: '1rem', padding: 'clamp(1.1rem, 3.5vw, 1.8rem)', background: 'linear-gradient(130deg, #c8102e 0%, #8f0b22 100%)', color: '#fff', border: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ opacity: .82, fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 800 }}>Expresso</span>
                <h2 style={{ margin: '.3rem 0 0', fontSize: 'clamp(1.4rem, 4vw, 2.1rem)', lineHeight: 1.15, overflowWrap: 'anywhere' }}>{selected.nome}</h2>
              </div>
              <span style={{ padding: '.55rem .8rem', borderRadius: 999, background: 'rgba(255,255,255,.16)', fontWeight: 850, fontSize: '.92rem', whiteSpace: 'nowrap' }}>Chave {selected.chave}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.45rem 1.15rem', alignItems: 'center', color: 'rgba(255,255,255,.9)', fontSize: '.9rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem' }}><MapPin size={15} /> {displayValue(selected.municipio)}</span>
              <span>CNPJ {formatCnpj(selected.cnpj)}</span>
              <span>Agência {displayValue(selected.codAg)} • PACB {displayValue(selected.pacb)}</span>
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1rem' }}>
            <DataSection title="Dados do Expresso" icon={<Building2 size={19} />}>
              <div style={gridStyle}>
                <DataField label="Chave loja" value={selected.chave} prominent />
                <DataField label="Expresso" value={selected.nome} prominent />
                <DataField label="CNPJ" value={formatCnpj(selected.cnpj)} />
                <DataField label="PACB" value={selected.pacb} />
                <DataField label="Junção da agência" value={selected.codAg} />
                <DataField label="Agência" value={selected.nomeAg} />
                <DataField label="Cidade" value={selected.municipio} />
              </div>
            </DataSection>

            <DataSection title="Estrutura regional" icon={<MapPin size={19} />}>
              <div style={gridStyle}>
                <DataField label="Diretoria regional" value={selected.diretoriaRegional} />
                <DataField label="Gerência regional" value={selected.gerenciaRegional} />
              </div>
            </DataSection>

            <DataSection title="Perfil de atendimento" icon={<Building2 size={19} />}>
              <div style={gridStyle}>
                <DataField label="Avançado?" value={simOuTraco(selected.avancado)} />
                <DataField label="Presença?" value={simOuTraco(selected.presenca)} />
                <DataField label="Órgão pagador?" value={simOuTraco(selected.orgPagador)} />
              </div>
            </DataSection>

            <DataSection title="Datas e equipamentos" icon={<CalendarDays size={19} />}>
              <div style={gridStyle}>
                <DataField label="Inauguração" value={displayValue(selected.inauguracao)} />
                <DataField label="Data certificação" value={displayValue(selected.certificacao)} />
                <DataField label="Tablet retirado" value={dataOuTraco(selected.retiradaTablet)} />
                <DataField label="Data última transação" value={displayValue(selected.ultimaTransacao)} />
                <DataField label="Retirada do equipamento" value={dataOuTraco(selected.retiradaEquipamento)} />
              </div>
            </DataSection>

            <DataSection title="Bloqueio" icon={<CircleAlert size={19} />}>
              <div style={gridStyle}>
                <DataField label="Código bloqueio" value={selected.codBloqueio} />
                <DataField label="Motivo bloqueio" value={selected.motivoBloqueio} />
                <DataField label="Data do bloqueio" value={displayValue(selected.dataBloqueio)} />
              </div>
            </DataSection>

            <DataSection title="Treinamento e situação" icon={<FileSpreadsheet size={19} />}>
              <div style={gridStyle}>
                <DataField label="Status treinamento" value={selected.treinamentoStatus} />
                <DataField label="Status loja" value={selected.statusLoja} />
                <DataField label="Loja ativa mês anterior" value={yesNo(selected.ativaMesAnterior)} />
              </div>
            </DataSection>
          </div>
        </>
      )}
    </main>
  )
}

const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 145px), 1fr))', gap: '1rem 1.1rem' }
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
