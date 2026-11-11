'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { getBytes, ref, uploadBytes } from 'firebase/storage'
import * as XLSX from 'xlsx'

import { auth, storage } from '@/lib/firebase'

const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'
const CONSORCIO_PATH = 'consorcio/consorcios-liberados.xlsx'
const BASE_PATH = 'base-lojas/banco-junho-2026.csv'

type ConsorcioRow = {
  chave: string
  nomeEmpresa: string
  codigoUsuario: string
  cpfUsuario: string
}

function text(value: unknown) {
  return value === null || value === undefined ? '' : String(value).trim()
}

function headerKey(value: unknown) {
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
}

function storeKey(value: unknown) {
  return text(value).replace(/\D/g, '').replace(/^0+(?=\d)/, '')
}

function cpfFormat(value: unknown) {
  const rawDigits = text(value).replace(/\D/g, '')
  const digits = rawDigits.length < 11 ? rawDigits.padStart(11, '0') : rawDigits
  if (digits.length !== 11) return text(value)
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
}

function sheetRows(bytes: Uint8Array | ArrayBuffer | string, type: 'array' | 'string') {
  const workbook = XLSX.read(bytes, { type })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) throw new Error('A planilha não contém uma aba com dados.')
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
}

function readConsorcio(bytes: Uint8Array | ArrayBuffer) {
  const raw = sheetRows(bytes, 'array')
  if (!raw.length) throw new Error('A planilha de consórcio está vazia.')

  const mapped = raw.map((record) => {
    const values = new Map(Object.entries(record).map(([key, value]) => [headerKey(key), value]))
    return {
      chave: storeKey(values.get('chaveloja')),
      nomeEmpresa: text(values.get('nomeempresa')),
      codigoUsuario: text(values.get('codigousuario')),
      cpfUsuario: cpfFormat(values.get('cpfusuario')),
    }
  })

  if (!mapped.some((row) => row.chave) || !raw[0] ||
      !Object.keys(raw[0]).some((key) => headerKey(key) === 'nomeempresa') ||
      !Object.keys(raw[0]).some((key) => headerKey(key) === 'codigousuario') ||
      !Object.keys(raw[0]).some((key) => headerKey(key) === 'cpfusuario')) {
    throw new Error('Não encontrei as colunas CHAVE_LOJA, NomeEmpresa, CodigoUsuario e CpfUsuario.')
  }

  const validRows = mapped.filter((row) => row.chave && row.nomeEmpresa && row.codigoUsuario && row.cpfUsuario)
  if (!validRows.length) throw new Error('Não encontrei registros completos na planilha de consórcios.')
  return validRows
}

async function loadEligibleRows(consorcioBytes: Uint8Array | ArrayBuffer, baseBytes: Uint8Array | ArrayBuffer) {
  const eligibleKeys = new Set(
    sheetRows(new TextDecoder('utf-8').decode(baseBytes), 'string')
      .map((record) => {
        const values = new Map(Object.entries(record).map(([key, value]) => [headerKey(key), value]))
        return storeKey(values.get('chaveloja') || values.get('chave'))
      })
      .filter(Boolean)
  )

  if (!eligibleKeys.size) throw new Error('Não consegui localizar chaves na base atual de expressos.')
  return readConsorcio(consorcioBytes).filter((row) => eligibleKeys.has(row.chave))
}

export default function ConsorcioPage() {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [rows, setRows] = useState<ConsorcioRow[]>([])
  const [search, setSearch] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')

  async function loadData() {
    if (!auth.currentUser) return
    setLoading(true)
    setError('')
    try {
      const [consorcioBytes, baseBytes] = await Promise.all([
        getBytes(ref(storage, CONSORCIO_PATH)),
        getBytes(ref(storage, BASE_PATH)),
      ])
      const filtered = await loadEligibleRows(consorcioBytes, baseBytes)
      setRows(filtered)
      setInfo(`${filtered.length} registro${filtered.length === 1 ? '' : 's'} de consórcio liberado${filtered.length === 1 ? '' : 's'} na base atual.`)
    } catch (cause: unknown) {
      console.error('Falha ao carregar consórcios liberados:', cause)
      const failure = cause as { code?: string; message?: string }
      if (failure?.code === 'storage/object-not-found') {
        setError('A base de consórcios ainda não foi enviada. O administrador pode carregar o arquivo nesta página.')
      } else if (failure?.code === 'storage/unauthorized' || failure?.code === 'storage/unauthenticated') {
        setError('O Firebase Storage bloqueou a leitura de uma das bases. É necessário liberar acesso de leitura para os usuários do portal.')
      } else if (failure?.message?.includes('colunas') || failure?.message?.includes('vazia') || failure?.message?.includes('registros completos')) {
        setError(failure.message || 'A planilha está vazia ou sem os campos necessários.')
      } else {
        setError(`Não consegui carregar os dados${failure?.code ? ` (${failure.code})` : ''}. Confira as permissões do Firebase Storage e se as duas bases estão disponíveis.`)
      }
    } finally {
      setLoading(false)
    }
  }

  async function uploadFile(file?: File) {
    if (!file) return
    if (!isAdmin) {
      setError('Somente o administrador pode atualizar essa base.')
      return
    }
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError('Selecione o arquivo de consórcios no formato .xlsx.')
      return
    }

    setUploading(true)
    setError('')
    setInfo('Validando a planilha…')
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      readConsorcio(bytes)
      await uploadBytes(ref(storage, CONSORCIO_PATH), file, {
        contentType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      setInfo('Arquivo atualizado. Carregando os registros liberados…')
      await loadData()
    } catch (cause: unknown) {
      console.error('Falha ao atualizar base de consórcio:', cause)
      const failure = cause as { code?: string; message?: string }
      setError(failure?.code === 'storage/unauthorized'
        ? 'O Firebase Storage não autorizou o envio. É necessário liberar escrita para o administrador no caminho da base de consórcios.'
        : failure?.message?.includes('colunas') || failure?.message?.includes('vazia') || failure?.message?.includes('registros completos')
        ? failure.message || 'A planilha está vazia ou sem os campos necessários.'
        : 'Não consegui atualizar a planilha. Verifique o arquivo e tente novamente.')
      setInfo('')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function copiarOrientacoesWhatsApp(row: ConsorcioRow) {
    const cpfPrimeirosTresNumeros = row.cpfUsuario.replace(/\D/g, '').slice(0, 3)
    const mensagem = [
      `Olá! Seguem as orientações de acesso ao consórcio para ${row.nomeEmpresa}:`,
      '',
      `O CPF de acesso para o consórcio é sempre o do Responsável da Loja. Para confirmação, informe apenas os 3 primeiros números: ${cpfPrimeirosTresNumeros}.`,
      `Código do usuário: ${row.codigoUsuario}`,
      '',
      'O código de usuário deve ser usado somente na criação do primeiro acesso ou quando for alterar a senha.',
      'Caso esqueça a senha, ou precise criar uma nova, o site para isso é o NEWCON:',
      'https://consorcioparceiro.bradesco.com.br/',
      '',
      'A comercialização de cartas pode ser feita pelo seu tablet ou pelo site, no celular ou computador:',
      'https://bradesco.parceiroconsorcio.com.br/login',
      '',
      'Caso o ícone de comercialização do consórcio não esteja aparecendo no seu tablet, entre em contato com o Suporte da TDS:',
      'Ligação: 0800-727-7667',
      'WhatsApp: (11) 3534-8599',
      '',
      'Dúvidas? Fale conosco!',
    ].join('\n')

    try {
      await navigator.clipboard.writeText(mensagem)
      setInfo('Mensagem copiada ✅ Agora é só colar no WhatsApp.')
      setError('')
    } catch (cause) {
      console.error('Não foi possível copiar as orientações de consórcio:', cause)
      setError('Não consegui copiar a mensagem. Verifique a permissão de área de transferência do navegador.')
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCheckingAuth(false)
      if (!user) {
        router.push('/login')
        return
      }
      setIsAdmin((user.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase())
      void loadData()
    })
    return () => unsubscribe()
    // loadData is intentionally called once when the authenticated user is known.
  }, [router])

  useEffect(() => {
    const chave = new URLSearchParams(window.location.search).get('chave')
    if (chave) setSearch(chave.replace(/\D/g, ''))
  }, [])

  const visibleRows = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('pt-BR')
    if (!needle) return rows
    return rows.filter((row) =>
      `${row.nomeEmpresa} ${row.codigoUsuario} ${row.cpfUsuario} ${row.chave}`.toLocaleLowerCase('pt-BR').includes(needle)
    )
  }, [rows, search])

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <header className="card" style={{ display: 'grid', gap: '.65rem' }}>
        <span className="pill">Consórcio</span>
        <h1 className="h1" style={{ margin: 0 }}>Expressos com consórcio liberado</h1>
        <p className="p-muted" style={{ margin: 0 }}>
          A lista considera apenas as chaves que também estão na base atual de expressos.
        </p>
        <div style={{ display: 'flex', gap: '.65rem', flexWrap: 'wrap', marginTop: '.25rem' }}>
          <button type="button" className="btn-primary" onClick={() => router.push('/dashboard/expressos/geral-junho-2026')}>
            Voltar ao Expresso Geral
          </button>
          <button type="button" onClick={() => void loadData()} disabled={loading || checkingAuth} style={secondaryButtonStyle}>
            {loading ? 'Atualizando…' : 'Atualizar lista'}
          </button>
        </div>
      </header>

      {isAdmin && (
        <div className="card" style={{ display: 'grid', gap: '.75rem' }}>
          <strong>Atualizar base de consórcios</strong>
          <p className="p-muted" style={{ margin: 0 }}>
            Envie a planilha Excel com as colunas CHAVE_LOJA, NomeEmpresa, CodigoUsuario e CpfUsuario.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={uploading || checkingAuth}
              onChange={(event) => {
                const file = event.target.files?.[0]
                setSelectedFileName(file?.name || '')
                void uploadFile(file)
              }}
              style={{ display: 'none' }}
              aria-label="Selecionar planilha de consórcios"
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading || checkingAuth}
              style={{ ...secondaryButtonStyle, opacity: uploading || checkingAuth ? 0.6 : 1 }}
            >
              {uploading ? 'Enviando planilha…' : 'Escolher arquivo Excel'}
            </button>
            <span className="p-muted" style={{ overflowWrap: 'anywhere' }}>
              {selectedFileName || 'Nenhum arquivo selecionado'}
            </span>
          </div>
          {uploading && <span className="p-muted">Enviando e atualizando a lista…</span>}
        </div>
      )}

      {error && <div role="alert" className="card" style={{ color: '#b42318', border: '1px solid #fecdca' }}>{error}</div>}
      {info && <div role="status" className="card" style={{ color: '#166534' }}>{info}</div>}

      <div className="card" style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <strong>{visibleRows.length} resultado{visibleRows.length === 1 ? '' : 's'}</strong>
          <input
            className="input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar empresa, CPF ou código"
            aria-label="Buscar empresa, CPF ou código"
            style={{ flex: '1 1 260px', maxWidth: 480 }}
          />
        </div>

        {loading && rows.length === 0 ? (
          <p className="p-muted">Carregando os dados…</p>
        ) : visibleRows.length === 0 ? (
          <p className="p-muted" style={{ margin: 0 }}>
            {rows.length ? 'Nenhum registro corresponde à busca.' : 'Não há registros de consórcio liberado para as chaves da base atual.'}
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '.85rem' }}>
            {visibleRows.map((row, index) => (
              <article key={`${row.codigoUsuario}-${row.cpfUsuario}-${index}`} className="card-soft" style={{ display: 'grid', gap: '.6rem', minWidth: 0 }}>
                <div>
                  <span style={fieldLabelStyle}>Nome da empresa</span>
                  <strong style={{ display: 'block', overflowWrap: 'anywhere' }}>{row.nomeEmpresa}</strong>
                </div>
                <div>
                  <span style={fieldLabelStyle}>CPF</span>
                  <strong style={{ display: 'block' }}>{row.cpfUsuario}</strong>
                </div>
                <div>
                  <span style={fieldLabelStyle}>Código do usuário</span>
                  <strong style={{ display: 'block', overflowWrap: 'anywhere' }}>{row.codigoUsuario}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => void copiarOrientacoesWhatsApp(row)}
                  title="Copiar orientações para enviar pelo WhatsApp"
                  style={{ ...secondaryButtonStyle, justifySelf: 'start', marginTop: '.25rem' }}
                >
                  📤 Copiar para WhatsApp
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

const fieldLabelStyle = { color: 'rgba(16,16,24,.58)', fontSize: '.8rem', display: 'block', marginBottom: '.15rem' }
const secondaryButtonStyle = {
  border: '1px solid rgba(15,15,25,.18)',
  background: '#fff',
  color: 'rgba(16,16,24,.9)',
  borderRadius: 999,
  padding: '.65rem .95rem',
  fontWeight: 800,
  cursor: 'pointer',
}
