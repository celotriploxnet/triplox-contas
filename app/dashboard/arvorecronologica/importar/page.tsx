'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import * as XLSX from 'xlsx'

const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'

type LinhaImportada = {
  chave: string
  nome: string
  municipio: string
  agencia: string
  pacb: string
  statusAnalise: string
  dtCertificacao: string
  trx: number

  qtdContas: number
  qtdContasComDeposito: number
  qtdCestaServ: number
  qtdSuperProtegido: number
  qtdMobilidade: number
  qtdCartaoEmitido: number
  qtdChesContratado: number
  qtdLimeAbConta: number
  qtdLime: number
  qtdConsignado: number
  qtdCreditoParcelado: number
  qtdMicrosseguro: number
  qtdVivaVida: number
  qtdPlanoOdonto: number
  qtdSegResidencial: number
  qtdSegCartaoDeb: number
  vlrExpSorte: number
  qtdExpSorte: number
  referencia: string
  pontos: number
}

function toStr(v: any) {
  return v === null || v === undefined ? '' : String(v).trim()
}

function normalizeKey(k: string) {
  return toStr(k)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function parseNumber(v: any) {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const s = toStr(v).replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

function splitAgPacb(v: any) {
  const raw = toStr(v)
  if (!raw) return { agencia: '', pacb: '' }

  const parts = raw.split('/')
  return {
    agencia: toStr(parts[0]),
    pacb: toStr(parts[1]),
  }
}

function validarMes(valor: string) {
  return /^(0[1-9]|1[0-2])\/\d{4}$/.test(valor)
}

function gerarMesOrdem(mesRef: string) {
  const [mes, ano] = mesRef.split('/')
  return Number(`${ano}${mes}`)
}

function formatDatePtBR(dt: Date | null) {
  if (!dt) return ''
  const dia = String(dt.getDate()).padStart(2, '0')
  const mes = String(dt.getMonth() + 1).padStart(2, '0')
  const ano = dt.getFullYear()
  return `${dia}/${mes}/${ano}`
}

function parseExcelSerialDate(n: number): Date | null {
  if (!Number.isFinite(n) || n < 1) return null
  const parsed = XLSX.SSF.parse_date_code(n)
  if (parsed?.y && parsed?.m && parsed?.d) {
    const dt = new Date(parsed.y, parsed.m - 1, parsed.d)
    return Number.isNaN(dt.getTime()) ? null : dt
  }
  return null
}

function parseDateFlexible(v: any): Date | null {
  if (v === null || v === undefined || v === '') return null

  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v
  }

  if (typeof v === 'number') {
    return parseExcelSerialDate(v)
  }

  const raw = toStr(v)
  if (!raw) return null

  const mBR = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (mBR) {
    const dd = Number(mBR[1])
    const mm = Number(mBR[2])
    const yy = Number(mBR[3])
    const dt = new Date(yy, mm - 1, dd)
    return Number.isNaN(dt.getTime()) ? null : dt
  }

  const mISO = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (mISO) {
    const yy = Number(mISO[1])
    const mm = Number(mISO[2])
    const dd = Number(mISO[3])
    const dt = new Date(yy, mm - 1, dd)
    return Number.isNaN(dt.getTime()) ? null : dt
  }

  const maybeNum = Number(raw.replace(',', '.'))
  if (Number.isFinite(maybeNum)) {
    return parseExcelSerialDate(maybeNum)
  }

  return null
}

function parseCertificacao(v: any) {
  const dt = parseDateFlexible(v)
  if (!dt) return toStr(v)
  return formatDatePtBR(dt)
}

function getFirstValue(
  obj: Record<string, any>,
  exactKeys: string[],
  containsTerms: string[] = []
) {
  for (const key of exactKeys) {
    const value = obj[key]
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  if (containsTerms.length > 0) {
    for (const key of Object.keys(obj)) {
      const hit = containsTerms.every((term) => key.includes(term))
      if (hit) {
        const value = obj[key]
        if (value !== undefined && value !== null && value !== '') {
          return value
        }
      }
    }
  }

  return ''
}

function calcPontos(r: {
  qtdContasComDeposito: number
  qtdContas: number
  qtdCestaServ: number
  qtdSuperProtegido: number
  qtdMobilidade: number
  qtdLime: number
  qtdConsignado: number
  qtdCreditoParcelado: number
  qtdMicrosseguro: number
  qtdVivaVida: number
  qtdPlanoOdonto: number
  qtdSegCartaoDeb: number
  vlrExpSorte: number
}) {
  const expSortePts = Math.floor((r.vlrExpSorte || 0) / 50)

  return (
    (r.qtdContasComDeposito || 0) * 7 +
    (r.qtdContas || 0) * 3 +
    (r.qtdCestaServ || 0) * 3 +
    (r.qtdSuperProtegido || 0) * 1 +
    (r.qtdMobilidade || 0) * 0.5 +
    (r.qtdLime || 0) * 6.5 +
    (r.qtdConsignado || 0) * 5.5 +
    (r.qtdCreditoParcelado || 0) * 6.5 +
    (r.qtdMicrosseguro || 0) * 1 +
    (r.qtdVivaVida || 0) * 1 +
    (r.qtdPlanoOdonto || 0) * 1 +
    (r.qtdSegCartaoDeb || 0) * 1 +
    expSortePts
  )
}

function mapearLinha(r: Record<string, any>): LinhaImportada | null {
  const chave = toStr(getFirstValue(r, ['chave_loja', 'chave loja', 'chave']))
  if (!chave) return null

  const nome = toStr(getFirstValue(r, ['nome_loja', 'nome da loja', 'nome']))
  const municipio = toStr(getFirstValue(r, ['municipio']))

  const agpacb = getFirstValue(r, ['ag_pacb', 'agencia/pacb'])
  const split = splitAgPacb(agpacb)

  const agenciaDireta = toStr(getFirstValue(r, ['agencia']))
  const pacbDireto = toStr(getFirstValue(r, ['pacb']))

  const agencia = split.agencia || agenciaDireta
  const pacb = split.pacb || pacbDireto

  const statusAnalise = toStr(
    getFirstValue(r, ['status_analise', 'status analise', 'status'], ['status'])
  )

  const valorCertificacao = getFirstValue(
    r,
    ['dt_certificacao', 'dt certificacao', 'certificacao', 'certificação'],
    ['cert']
  )

  const dtCertificacao = parseCertificacao(valorCertificacao)

  const trx = parseNumber(
    getFirstValue(
      r,
      ['qtd_trxcontabil', 'qtd_trx_contabil', 'qtd trxcontabil', 'qtd_trx'],
      ['trx']
    )
  )

  const qtdContas = parseNumber(getFirstValue(r, ['qtd_contas', 'qtd contas']))
  const qtdContasComDeposito = parseNumber(
    getFirstValue(r, ['qtd_contas_com_deposito', 'qtd contas com deposito'])
  )
  const qtdCestaServ = parseNumber(getFirstValue(r, ['qtd_cesta_serv', 'qtd cesta serv']))

  const qtdSuperProtegido = parseNumber(
    getFirstValue(
      r,
      [
        'qtd_super_protegido',
        'qtd super protegido',
        'qtd_superprotegido',
        'super protegido',
        'qtdsuperprotegido',
      ],
      ['super']
    )
  )

  const qtdMobilidade = parseNumber(getFirstValue(r, ['qtd_mobilidade', 'qtd mobilidade']))
  const qtdCartaoEmitido = parseNumber(
    getFirstValue(r, ['qtd_cartao_emitido', 'qtd cartao emitido'])
  )
  const qtdChesContratado = parseNumber(
    getFirstValue(r, ['qtd_chesp_contratado', 'qtd chesp contratado'])
  )
  const qtdLimeAbConta = parseNumber(
    getFirstValue(r, ['qtd_lime_ab_conta', 'qtd lime ab conta'])
  )
  const qtdLime = parseNumber(getFirstValue(r, ['qtd_lime', 'qtd lime']))
  const qtdConsignado = parseNumber(getFirstValue(r, ['qtd_consignado', 'qtd consignado']))

  const qtdCreditoParcelado = parseNumber(
    getFirstValue(
      r,
      [
        'qtd_credito_parcel_dtlhes',
        'qtd_credito_parcelado_dtlhes',
        'qtd_credito_parcel',
        'credito parcelado',
        'qtd_credito_parcel_dtlh',
        'qtd_credito_parcel_detalhes',
      ],
      ['credito', 'parcel']
    )
  )

  const qtdMicrosseguro = parseNumber(getFirstValue(r, ['qtd_microsseguro', 'qtd microsseguro']))
  const qtdVivaVida = parseNumber(
    getFirstValue(r, ['qtd_micro_vivavida', 'qtd micro vivavida', 'viva vida'])
  )
  const qtdPlanoOdonto = parseNumber(
    getFirstValue(r, ['qtd_plano_odonto', 'qtd plano odonto', 'odonto'])
  )
  const qtdSegResidencial = parseNumber(
    getFirstValue(r, ['qtd_seg_residencial', 'qtd seg residencial'])
  )

  const qtdSegCartaoDeb = parseNumber(
    getFirstValue(
      r,
      [
        'qtd_seg_cartao_deb',
        'qtd seg cartao deb',
        'qtd_seg_cartao',
        'seg cartao deb',
        'qtd_seg_cartao_debito',
      ],
      ['cartao', 'deb']
    )
  )

  const vlrExpSorte = parseNumber(
    getFirstValue(
      r,
      ['vlr_exp_sorte', 'vlr exp sorte', 'valor exp sorte', 'vlr_expsorte'],
      ['exp', 'sorte']
    )
  )

  const qtdExpSorte = parseNumber(getFirstValue(r, ['qtd_exp_sorte', 'qtd exp sorte']))

  const referencia = toStr(
    getFirstValue(
      r,
      ['referencia', 'referência', 'expresso referência?', 'expresso referencia?'],
      ['refer']
    )
  )

  const pontos = calcPontos({
    qtdContasComDeposito,
    qtdContas,
    qtdCestaServ,
    qtdSuperProtegido,
    qtdMobilidade,
    qtdLime,
    qtdConsignado,
    qtdCreditoParcelado,
    qtdMicrosseguro,
    qtdVivaVida,
    qtdPlanoOdonto,
    qtdSegCartaoDeb,
    vlrExpSorte,
  })

  return {
    chave,
    nome,
    municipio,
    agencia,
    pacb,
    statusAnalise,
    dtCertificacao,
    trx,
    qtdContas,
    qtdContasComDeposito,
    qtdCestaServ,
    qtdSuperProtegido,
    qtdMobilidade,
    qtdCartaoEmitido,
    qtdChesContratado,
    qtdLimeAbConta,
    qtdLime,
    qtdConsignado,
    qtdCreditoParcelado,
    qtdMicrosseguro,
    qtdVivaVida,
    qtdPlanoOdonto,
    qtdSegResidencial,
    qtdSegCartaoDeb,
    vlrExpSorte,
    qtdExpSorte,
    referencia,
    pontos,
  }
}

export default function ImportarArvoreCronologicaPage() {
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [mes, setMes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<LinhaImportada[]>([])
  const [colunas, setColunas] = useState<string[]>([])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push('/login')
        return
      }

      if ((u.email || '').toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        router.push('/dashboard')
        return
      }

      setUser(u)
    })

    return () => unsub()
  }, [router])

  async function processarPreview(arquivo: File) {
    const buffer = await arquivo.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
      defval: '',
      raw: true,
    })

    const rowsNormalizadas = rawRows.map((obj) => {
      const out: Record<string, any> = {}
      for (const [k, v] of Object.entries(obj)) {
        out[normalizeKey(k)] = v
      }
      return out
    })

    const cols = rowsNormalizadas.length ? Object.keys(rowsNormalizadas[0]) : []
    setColunas(cols)

    const mapped = rowsNormalizadas
      .map(mapearLinha)
      .filter(Boolean) as LinhaImportada[]

    setPreview(mapped.slice(0, 5))
    return mapped
  }

  async function importar() {
    try {
      setMsg('')

      if (!mes) {
        setMsg('Informe o mês de referência.')
        return
      }

      if (!validarMes(mes)) {
        setMsg('Formato deve ser MM/AAAA.')
        return
      }

      if (!file) {
        setMsg('Selecione o arquivo.')
        return
      }

      setLoading(true)

      const linhas = await processarPreview(file)
      const mesOrdem = gerarMesOrdem(mes)
      const mesDoc = mes.replace('/', '-')

      const batch = writeBatch(db)
      let contador = 0

      for (const r of linhas) {
        const ref = doc(db, 'arvorecronologica', r.chave, 'meses', mesDoc)

        batch.set(ref, {
          mesReferencia: mes,
          mesOrdem,

          chave: r.chave,
          nome: r.nome,
          municipio: r.municipio,
          agencia: r.agencia,
          pacb: r.pacb,

          statusAnalise: r.statusAnalise,
          dtCertificacao: r.dtCertificacao,

          trx: r.trx,
          pontos: r.pontos,

          qtdContas: r.qtdContas,
          qtdContasComDeposito: r.qtdContasComDeposito,
          qtdCestaServ: r.qtdCestaServ,
          qtdSuperProtegido: r.qtdSuperProtegido,
          qtdMobilidade: r.qtdMobilidade,
          qtdCartaoEmitido: r.qtdCartaoEmitido,
          qtdChesContratado: r.qtdChesContratado,
          qtdLimeAbConta: r.qtdLimeAbConta,
          qtdLime: r.qtdLime,
          qtdConsignado: r.qtdConsignado,
          qtdCreditoParcelado: r.qtdCreditoParcelado,
          qtdMicrosseguro: r.qtdMicrosseguro,
          qtdVivaVida: r.qtdVivaVida,
          qtdPlanoOdonto: r.qtdPlanoOdonto,
          qtdSegResidencial: r.qtdSegResidencial,
          qtdSegCartaoDeb: r.qtdSegCartaoDeb,
          vlrExpSorte: r.vlrExpSorte,
          qtdExpSorte: r.qtdExpSorte,
          referencia: r.referencia,

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })

        contador++
      }

      await batch.commit()

      setMsg(`Importação concluída. ${contador} expressos atualizados.`)
      setFile(null)
    } catch (e: any) {
      console.error(e)
      setMsg(e?.message || 'Erro ao importar arquivo.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <section style={{ display: 'grid', gap: '1.5rem' }}>
        <p>Verificando acesso...</p>
      </section>
    )
  }

  return (
    <section style={{ display: 'grid', gap: '1.5rem' }}>
      <div>
        <span className="pill">Árvore Cronológica</span>

        <h1 className="h1" style={{ marginTop: '.6rem' }}>
          Importar histórico mensal
        </h1>

        <p className="p-muted">Aceita arquivos CSV, XLS ou XLSX.</p>
      </div>

      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault()
          importar()
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Mês de referência</label>

            <input
              className="input"
              placeholder="03/2026"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Arquivo de produção</label>

            <input
              className="input"
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={async (e) => {
                const f = e.target.files?.[0] || null
                setFile(f)

                if (f) {
                  try {
                    setMsg('Lendo arquivo para prévia...')
                    await processarPreview(f)
                    setMsg('Arquivo lido com sucesso. Confira a prévia abaixo.')
                  } catch (err) {
                    console.error(err)
                    setMsg('Erro ao ler arquivo para prévia.')
                    setPreview([])
                    setColunas([])
                  }
                } else {
                  setPreview([])
                  setColunas([])
                }
              }}
              required
            />
          </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Importando...' : 'Importar Árvore Cronológica'}
          </button>
        </div>

        {msg && (
          <div className="card-soft" style={{ marginTop: '1rem' }}>
            {msg}
          </div>
        )}

        <div
          style={{
            marginTop: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <button
            type="button"
            className="btn-ghost"
            onClick={() => router.push('/dashboard')}
          >
            Voltar
          </button>
        </div>
      </form>

      {colunas.length > 0 && (
        <div className="card">
          <h2 className="h2">Colunas detectadas no arquivo</h2>

          <div
            style={{
              marginTop: '1rem',
              display: 'flex',
              gap: '.5rem',
              flexWrap: 'wrap',
            }}
          >
            {colunas.map((c) => (
              <span key={c} className="pill">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {preview.length > 0 && (
        <div className="card">
          <h2 className="h2">Prévia das 5 primeiras linhas importadas</h2>

          <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
            {preview.map((r, idx) => (
              <div key={`${r.chave}-${idx}`} className="card-soft">
                <div style={{ display: 'grid', gap: '.35rem' }}>
                  <div><b>Chave:</b> {r.chave}</div>
                  <div><b>Nome:</b> {r.nome || '—'}</div>
                  <div><b>Município:</b> {r.municipio || '—'}</div>
                  <div><b>Agência / PACB:</b> {r.agencia || '—'} / {r.pacb || '—'}</div>
                  <div><b>Status:</b> {r.statusAnalise || '—'}</div>
                  <div><b>Certificação:</b> {r.dtCertificacao || '—'}</div>
                  <div><b>TRX:</b> {r.trx}</div>
                  <div><b>Pontos:</b> {r.pontos}</div>
                  <div><b>Contas:</b> {r.qtdContas}</div>
                  <div><b>Consignado:</b> {r.qtdConsignado}</div>
                  <div><b>Plano Odonto:</b> {r.qtdPlanoOdonto}</div>
                  <div><b>Microsseguro:</b> {r.qtdMicrosseguro}</div>
                  <div><b>Viva Vida:</b> {r.qtdVivaVida}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}