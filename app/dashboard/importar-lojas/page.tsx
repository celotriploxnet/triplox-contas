'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'

type LojaRow = {
  chaveLoja: string
  nomeExpresso: string
  agencia: string
  pacb: string
}

function splitAgenciaPacb(v: string) {
  const raw = (v || '').trim()
  if (!raw) return { agencia: '', pacb: '' }

  // Normaliza: remove espaços
  const cleaned = raw.replace(/\s+/g, '')

  // Formato padrão: 1234/567
  const parts = cleaned.split('/')
  if (parts.length >= 2) {
    return { agencia: parts[0] || '', pacb: parts[1] || '' }
  }

  // Caso venha "1234-567"
  const partsDash = cleaned.split('-')
  if (partsDash.length >= 2) {
    return { agencia: partsDash[0] || '', pacb: partsDash[1] || '' }
  }

  // Se vier só um valor
  return { agencia: cleaned, pacb: '' }
}

// CSV parser simples (aceita ; ou , e aspas)
function parseCSV(text: string): Record<string, string>[] {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim() !== '')

  if (lines.length < 2) return []

  const headerLine = lines[0]
  const semiCount = (headerLine.match(/;/g) || []).length
  const commaCount = (headerLine.match(/,/g) || []).length
  const delim = semiCount >= commaCount ? ';' : ','

  const parseLine = (line: string) => {
    const out: string[] = []
    let cur = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]

      if (ch === '"') {
        const next = line[i + 1]
        if (inQuotes && next === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
        continue
      }

      if (ch === delim && !inQuotes) {
        out.push(cur)
        cur = ''
        continue
      }

      cur += ch
    }

    out.push(cur)
    return out.map((s) => s.trim())
  }

  const headers = parseLine(lines[0]).map((h) => h.trim())

  return lines.slice(1).map((line) => {
    const cols = parseLine(line)
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => (obj[h] = (cols[idx] ?? '').trim()))
    return obj
  })
}

export default function ImportarLojasPage() {
  const router = useRouter()
  const ADMIN_EMAIL = 'marcelo@treinexpresso.com.br'

  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<LojaRow[]>([])
  const [msg, setMsg] = useState<string>('')
  const [err, setErr] = useState<string>('')

  const [importando, setImportando] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push('/login')
        return
      }
      setUser(u)
      setIsAdmin((u.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase())
    })
    return () => unsub()
  }, [router])

  const canImport = useMemo(
    () => isAdmin && rows.length > 0 && !importando,
    [isAdmin, rows.length, importando]
  )

  async function handleReadCSV() {
    setErr('')
    setMsg('')
    setRows([])

    if (!file) {
      setErr('Selecione um arquivo CSV.')
      return
    }

    try {
      const text = await file.text()
      const parsed = parseCSV(text)

      // ✅ MAPEAMENTO EXATO DO SEU CSV:
      // chave_loja -> chave
      // nome_loja  -> nome do expresso
      // ag_pacb    -> "agencia/pacb"
      const mapped: LojaRow[] = parsed
        .map((r) => {
          const chave = (r['chave_loja'] || '').trim()
          const nome = (r['nome_loja'] || '').trim()
          const agPacb = (r['ag_pacb'] || '').trim()

          const { agencia, pacb } = splitAgenciaPacb(agPacb)

          return {
            chaveLoja: chave,
            nomeExpresso: nome,
            agencia,
            pacb,
          }
        })
        .filter((x) => x.chaveLoja)

      if (mapped.length === 0) {
        setErr('Não encontrei nenhuma linha válida. Confirme se o CSV tem as colunas: chave_loja, nome_loja, ag_pacb.')
        return
      }

      setRows(mapped)
      setMsg(`✅ CSV lido! Registros prontos para importar: ${mapped.length}`)
    } catch (e: any) {
      console.error(e)
      setErr(`Erro ao ler CSV: ${e?.message || 'sem mensagem'}`)
    }
  }

  async function importarFirestore() {
    if (!isAdmin) {
      setErr('Apenas admin pode importar.')
      return
    }
    if (rows.length === 0) {
      setErr('Nenhum registro para importar.')
      return
    }

    setErr('')
    setMsg('')
    setImportando(true)

    try {
      // Batches seguros
      const chunkSize = 400
      let total = 0

      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize)
        const batch = writeBatch(db)

        for (const r of chunk) {
          const ref = doc(db, 'lojas', r.chaveLoja)
          batch.set(
            ref,
            {
              chaveLoja: r.chaveLoja,
              nomeExpresso: r.nomeExpresso,
              agencia: r.agencia,
              pacb: r.pacb,
              updatedAt: serverTimestamp(),
              updatedBy: user?.email || '',
            },
            { merge: true }
          )
        }

        await batch.commit()
        total += chunk.length
        setMsg(`Importando... (${total}/${rows.length})`)
      }

      setMsg(`✅ Importação concluída! ${rows.length} registros atualizados no Firestore (coleção "lojas").`)
    } catch (e: any) {
      console.error(e)
      setErr(`Erro ao importar: ${e?.message || 'sem mensagem'}`)
    } finally {
      setImportando(false)
    }
  }

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <span className="pill">Admin</span>
        <h1 className="h1" style={{ marginTop: '.75rem' }}>
          Importar base de Lojas (CSV)
        </h1>
        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          Colunas usadas: <b>chave_loja</b>, <b>nome_loja</b>, <b>ag_pacb</b> (ex: 3575/117).
        </p>
      </div>

      <div className="card" style={{ display: 'grid', gap: '1rem' }}>
        {!isAdmin && (
          <div className="card-soft" style={{ borderColor: 'rgba(214,31,44,.25)' }}>
            <p className="p-muted" style={{ color: 'rgba(214,31,44,.95)' }}>
              Você não é admin. Esta página é apenas para administrador.
            </p>
          </div>
        )}

        <label>
          <div className="label">Arquivo CSV</div>
          <input
            className="input"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={!isAdmin}
          />
        </label>

        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button className="btn-primary" type="button" onClick={handleReadCSV} disabled={!isAdmin || !file}>
            Ler CSV
          </button>

          <button className="btn-primary" type="button" onClick={importarFirestore} disabled={!canImport}>
            {importando ? 'Importando...' : 'Importar para Firestore'}
          </button>
        </div>

        {msg && (
          <div className="card-soft">
            <p className="font-semibold">{msg}</p>
          </div>
        )}

        {err && (
          <div className="card-soft" style={{ borderColor: 'rgba(214,31,44,.25)' }}>
            <p className="p-muted" style={{ color: 'rgba(214,31,44,.95)' }}>
              {err}
            </p>
          </div>
        )}

        {rows.length > 0 && (
          <div className="card-soft">
            <div className="h2">Prévia (primeiras 10)</div>
            <div style={{ marginTop: '.75rem', display: 'grid', gap: '.5rem' }}>
              {rows.slice(0, 10).map((r) => (
                <div key={r.chaveLoja} style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
                  <span className="pill">Chave: {r.chaveLoja}</span>
                  <span className="pill">Expresso: {r.nomeExpresso || '—'}</span>
                  <span className="pill">Agência: {r.agencia || '—'}</span>
                  <span className="pill">PACB: {r.pacb || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="p-muted">
        Logado como: <b>{user?.email}</b>
      </p>
    </section>
  )
}