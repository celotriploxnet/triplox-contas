'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { getBytes, ref, uploadBytes } from 'firebase/storage'
import * as XLSX from 'xlsx'

import { auth, storage } from '@/lib/firebase'

const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'
const CONSORCIO_PATH = 'consorcio/consorcios-liberados.xlsx'

type ConsorcioRow = {
  chave: string
  nomeEmpresa: string
  codigoUsuario: string
  cpfUsuario: string
  telefone: string
  email: string
  cnpj: string
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
  if (!rawDigits) return ''
  const digits = rawDigits.length < 11 ? rawDigits.padStart(11, '0') : rawDigits
  if (digits.length !== 11) return text(value)
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
}

function formatCpfDraft(value: unknown) {
  const digits = text(value).replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function normalizeCnpj(value: unknown) {
  const digits = text(value).replace(/\D/g, '')
  return digits ? digits.padStart(14, '0') : ''
}

function formatPhone(value: unknown) {
  const original = text(value)
  const digits = original.replace(/\D/g, '')
  if (digits.length === 11) return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  if (digits.length === 10) return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
  return original
}

function recordValue(record: Record<string, unknown>, ...names: string[]) {
  const values = new Map(Object.entries(record).map(([key, value]) => [headerKey(key), value]))
  for (const name of names) {
    const value = values.get(headerKey(name))
    if (value !== undefined && value !== null && text(value)) return value
  }
  return ''
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
    return {
      chave: storeKey(recordValue(record, 'CHAVE_LOJA')),
      nomeEmpresa: text(recordValue(record, 'NomeEmpresa', 'NM_PARCEIRO')),
      codigoUsuario: text(recordValue(record, 'CodigoUsuario', 'USUÁRIO')),
      cpfUsuario: cpfFormat(recordValue(record, 'CpfUsuario', 'CPF')),
      telefone: formatPhone(recordValue(record, 'Telefone', 'TelefoneResponsavel')),
      email: text(recordValue(record, 'Email', 'E-mail')),
      cnpj: normalizeCnpj(recordValue(record, 'CNPJ')),
    }
  })

  const headers = Object.keys(raw[0] || {}).map(headerKey)
  if (!headers.includes('chaveloja') ||
      !headers.some((key) => key === 'nomeempresa' || key === 'nmparceiro') ||
      !headers.some((key) => key === 'codigousuario' || key === 'usuario')) {
    throw new Error('Não encontrei as colunas CHAVE_LOJA, NomeEmpresa/NM_PARCEIRO e CodigoUsuario/USUÁRIO.')
  }

  const validRows = mapped.filter((row) => row.chave && row.nomeEmpresa && row.codigoUsuario)
  if (!validRows.length) throw new Error('Não encontrei registros completos na planilha de consórcios.')
  return validRows
}

function sheetColumn(sheet: XLSX.WorkSheet, aliases: string[]) {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
  const normalizedAliases = aliases.map(headerKey)
  for (let column = range.s.c; column <= range.e.c; column += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: column })]
    if (cell && normalizedAliases.includes(headerKey(cell.v))) return column
  }
  return -1
}

function setSheetText(sheet: XLSX.WorkSheet, row: number, column: number, value: unknown) {
  sheet[XLSX.utils.encode_cell({ r: row, c: column })] = { t: 's', v: text(value) }
}

function serializeWorkbook(workbook: XLSX.WorkBook) {
  return new Uint8Array(XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer)
}

function mergeExistingAccessData(bytes: Uint8Array, previousRows: ConsorcioRow[]) {
  const workbook = XLSX.read(bytes, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) throw new Error('A planilha não contém uma aba com dados.')
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
  const headerRow = range.s.r
  const keyColumn = sheetColumn(sheet, ['CHAVE_LOJA'])
  const codeColumn = sheetColumn(sheet, ['CodigoUsuario', 'USUÁRIO'])
  const cnpjColumn = sheetColumn(sheet, ['CNPJ'])
  let cpfColumn = sheetColumn(sheet, ['CpfUsuario', 'CPF'])
  if (keyColumn < 0 || codeColumn < 0) {
    throw new Error('A nova planilha precisa ter CHAVE_LOJA e CodigoUsuario/USUÁRIO.')
  }
  if (cpfColumn < 0) {
    cpfColumn = range.e.c + 1
    setSheetText(sheet, headerRow, cpfColumn, 'CpfUsuario')
    range.e.c = cpfColumn
    sheet['!ref'] = XLSX.utils.encode_range(range)
  }

  const previousByKey = new Map(previousRows.filter((row) => row.chave).map((row) => [row.chave, row]))
  const previousByCnpj = new Map(previousRows.filter((row) => row.cnpj).map((row) => [row.cnpj, row]))
  const lastRow = XLSX.utils.decode_range(sheet['!ref'] || 'A1').e.r
  for (let row = headerRow + 1; row <= lastRow; row += 1) {
    const keyCell = sheet[XLSX.utils.encode_cell({ r: row, c: keyColumn })]
    const cnpjCell = cnpjColumn >= 0 ? sheet[XLSX.utils.encode_cell({ r: row, c: cnpjColumn })] : undefined
    const currentKey = storeKey(keyCell?.v)
    const currentCnpj = normalizeCnpj(cnpjCell?.v)
    const previous = (currentKey && previousByKey.get(currentKey)) || (currentCnpj && previousByCnpj.get(currentCnpj))
    if (!previous) continue

    if (!currentKey && previous.chave) setSheetText(sheet, row, keyColumn, previous.chave)
    const codeCell = sheet[XLSX.utils.encode_cell({ r: row, c: codeColumn })]
    if (!text(codeCell?.v) && previous.codigoUsuario) setSheetText(sheet, row, codeColumn, previous.codigoUsuario)
    const cpfCell = sheet[XLSX.utils.encode_cell({ r: row, c: cpfColumn })]
    if (!text(cpfCell?.v) && previous.cpfUsuario) setSheetText(sheet, row, cpfColumn, previous.cpfUsuario.replace(/\D/g, ''))
  }
  return serializeWorkbook(workbook)
}

function updateCpfInWorkbook(bytes: Uint8Array, rowData: ConsorcioRow, cpf: string) {
  const workbook = XLSX.read(bytes, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) throw new Error('A planilha não contém uma aba com dados.')
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
  const headerRow = range.s.r
  const keyColumn = sheetColumn(sheet, ['CHAVE_LOJA'])
  const cnpjColumn = sheetColumn(sheet, ['CNPJ'])
  let cpfColumn = sheetColumn(sheet, ['CpfUsuario', 'CPF'])
  if (keyColumn < 0) throw new Error('Não encontrei a coluna CHAVE_LOJA na base atual.')
  if (cpfColumn < 0) {
    cpfColumn = range.e.c + 1
    setSheetText(sheet, headerRow, cpfColumn, 'CpfUsuario')
    range.e.c = cpfColumn
    sheet['!ref'] = XLSX.utils.encode_range(range)
  }

  const lastRow = XLSX.utils.decode_range(sheet['!ref'] || 'A1').e.r
  let targetRow = -1
  for (let row = headerRow + 1; row <= lastRow; row += 1) {
    const keyCell = sheet[XLSX.utils.encode_cell({ r: row, c: keyColumn })]
    const cnpjCell = cnpjColumn >= 0 ? sheet[XLSX.utils.encode_cell({ r: row, c: cnpjColumn })] : undefined
    if ((rowData.chave && storeKey(keyCell?.v) === rowData.chave) ||
        (!rowData.chave && rowData.cnpj && normalizeCnpj(cnpjCell?.v) === rowData.cnpj)) {
      targetRow = row
      break
    }
  }
  if (targetRow < 0) throw new Error('Não consegui localizar a loja na base atual para salvar o CPF.')
  setSheetText(sheet, targetRow, cpfColumn, cpf)
  return serializeWorkbook(workbook)
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
  const [savingCpfKey, setSavingCpfKey] = useState('')
  const baseBytesRef = useRef<Uint8Array | null>(null)

  async function loadData() {
    if (!auth.currentUser) return
    setLoading(true)
    setError('')
    try {
      const consorcioBytes = new Uint8Array(await getBytes(ref(storage, CONSORCIO_PATH)))
      baseBytesRef.current = consorcioBytes
      const registros = readConsorcio(consorcioBytes)
      setRows(registros)
      setInfo(`${registros.length} registro${registros.length === 1 ? '' : 's'} carregado${registros.length === 1 ? '' : 's'} da planilha de consórcio.`)
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
      let previousRows: ConsorcioRow[] = []
      try {
        const previousBytes = new Uint8Array(await getBytes(ref(storage, CONSORCIO_PATH)))
        previousRows = readConsorcio(previousBytes)
      } catch (cause: unknown) {
        const failure = cause as { code?: string }
        if (failure?.code !== 'storage/object-not-found') throw cause
      }
      const mergedBytes = mergeExistingAccessData(bytes, previousRows)
      const mergedBlob = new Blob([mergedBytes.buffer as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      await uploadBytes(ref(storage, CONSORCIO_PATH), mergedBlob, {
        contentType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      baseBytesRef.current = mergedBytes
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

  async function saveCpf(row: ConsorcioRow) {
    if (!isAdmin) {
      setError('Somente o administrador pode atualizar o CPF.')
      return
    }
    const cpf = row.cpfUsuario.replace(/\D/g, '')
    if (cpf.length !== 11) {
      setError('Informe os 11 números do CPF antes de salvar.')
      return
    }
    if (!baseBytesRef.current) {
      setError('Não consegui localizar a base atual. Atualize a lista e tente novamente.')
      return
    }

    setSavingCpfKey(row.chave)
    setError('')
    setInfo('Salvando CPF…')
    try {
      const updatedBytes = updateCpfInWorkbook(baseBytesRef.current, row, cpf)
      const updatedBlob = new Blob([updatedBytes.buffer as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      await uploadBytes(ref(storage, CONSORCIO_PATH), updatedBlob, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      baseBytesRef.current = updatedBytes
      setRows((current) => current.map((item) =>
        item.chave === row.chave ? { ...item, cpfUsuario: cpfFormat(cpf) } : item
      ))
      setInfo(`CPF de ${row.nomeEmpresa} salvo na base de consórcio.`)
    } catch (cause: unknown) {
      console.error('Falha ao salvar CPF de acesso ao consórcio:', cause)
      const failure = cause as { code?: string }
      setError(failure?.code === 'storage/unauthorized'
        ? 'O Firebase Storage não autorizou salvar o CPF. Verifique a permissão de escrita para o administrador.'
        : 'Não consegui salvar o CPF na base. Confira a conexão e tente novamente.')
      setInfo('')
    } finally {
      setSavingCpfKey('')
    }
  }

  async function copiarOrientacoesWhatsApp(row: ConsorcioRow) {
    const cpfPrimeirosTresNumeros = row.cpfUsuario.replace(/\D/g, '').slice(0, 3)
    const mensagem = [
      `Olá! Seguem as orientações de acesso ao consórcio para ${row.nomeEmpresa}:`,
      '',
      row.cpfUsuario
        ? `O CPF de acesso para o consórcio é sempre o do Responsável da Loja. Para confirmação, informe o CPF do responsável que começa com: ${cpfPrimeirosTresNumeros}.`
        : 'O CPF de acesso para o consórcio é sempre o do Responsável da Loja. Confirme os dados com o responsável da loja.',
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
      `${row.nomeEmpresa} ${row.codigoUsuario} ${row.cpfUsuario} ${row.chave} ${row.telefone} ${row.email}`
        .toLocaleLowerCase('pt-BR').includes(needle)
    )
  }, [rows, search])

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <header className="card" style={{ display: 'grid', gap: '.65rem' }}>
        <span className="pill">Consórcio</span>
        <h1 className="h1" style={{ margin: 0 }}>Expressos com consórcio liberado</h1>
        <p className="p-muted" style={{ margin: 0 }}>
          A lista exibe as lojas com usuário de consórcio liberado e os dados de contato disponíveis.
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
            Envie a planilha mais completa com CHAVE_LOJA, nome da empresa, usuário, telefone e e-mail. Os CPFs e códigos já cadastrados serão preservados pela chave loja ou CNPJ.
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
            placeholder="Buscar empresa, CPF, código, telefone ou e-mail"
            aria-label="Buscar empresa, CPF, código, telefone ou e-mail"
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
                  {isAdmin ? (
                    <div style={{ display: 'grid', gap: '.45rem' }}>
                      <input
                        id={`cpf-${row.chave}`}
                        className="input"
                        type="text"
                        inputMode="numeric"
                        maxLength={14}
                        value={row.cpfUsuario}
                        disabled={Boolean(savingCpfKey)}
                        onChange={(event) => {
                          const cpfUsuario = formatCpfDraft(event.target.value)
                          setRows((current) => current.map((item) =>
                            item.chave === row.chave ? { ...item, cpfUsuario } : item
                          ))
                        }}
                        placeholder="000.000.000-00"
                        aria-label={`CPF do responsável da loja ${row.nomeEmpresa}`}
                      />
                      <button
                        type="button"
                        onClick={() => void saveCpf(row)}
                        disabled={Boolean(savingCpfKey) || row.cpfUsuario.replace(/\D/g, '').length !== 11}
                        style={{ ...secondaryButtonStyle, justifySelf: 'start', opacity: savingCpfKey ? 0.6 : 1 }}
                      >
                        {savingCpfKey === row.chave ? 'Salvando CPF…' : 'Salvar CPF'}
                      </button>
                    </div>
                  ) : (
                    <strong style={{ display: 'block' }}>{row.cpfUsuario || 'CPF não cadastrado'}</strong>
                  )}
                </div>
                <div>
                  <span style={fieldLabelStyle}>Código do usuário</span>
                  <strong style={{ display: 'block', overflowWrap: 'anywhere' }}>{row.codigoUsuario}</strong>
                </div>
                <div>
                  <span style={fieldLabelStyle}>Telefone</span>
                  <strong style={{ display: 'block', overflowWrap: 'anywhere' }}>{row.telefone || 'Não informado'}</strong>
                </div>
                <div>
                  <span style={fieldLabelStyle}>E-mail</span>
                  <strong style={{ display: 'block', overflowWrap: 'anywhere' }}>{row.email || 'Não informado'}</strong>
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
