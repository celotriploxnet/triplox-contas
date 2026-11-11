'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

type AssuntoTipo = 'treinamento' | 'checkin'

export default function BaixaEmpresaPage() {
  const router = useRouter()

  const [assuntoTipo, setAssuntoTipo] = useState<AssuntoTipo>('treinamento')

  // 🔑 chave primeiro
  const [chave, setChave] = useState('')
  const [nomeExpresso, setNomeExpresso] = useState('')
  const [agencia, setAgencia] = useState('')
  const [pacb, setPacb] = useState('')
  const [motivo, setMotivo] = useState('')
  const [emailGerente, setEmailGerente] = useState('')

  const [msg, setMsg] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.push('/login')
    })
    return () => unsub()
  }, [router])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const chaveParam = params.get('chave')
    const nomeParam = params.get('nomeExpresso')
    const agenciaParam = params.get('agencia')
    const pacbParam = params.get('pacb')

    if (chaveParam !== null) setChave(chaveParam)
    if (nomeParam !== null) setNomeExpresso(nomeParam)
    if (agenciaParam !== null) setAgencia(agenciaParam)
    if (pacbParam !== null) setPacb(pacbParam)
  }, [])

  const assuntoLabel =
    assuntoTipo === 'treinamento'
      ? 'BAIXA DE TREINAMENTO'
      : 'BAIXA DE CHECK-IN'

  // ✅ obrigatórios (email gerente NÃO entra)
  const isFormValid = useMemo(() => {
    return (
      chave.trim() !== '' &&
      nomeExpresso.trim() !== '' &&
      agencia.trim() !== '' &&
      pacb.trim() !== '' &&
      motivo.trim() !== ''
    )
  }, [chave, nomeExpresso, agencia, pacb, motivo])

  // 🔎 AUTOPREENCHER AO SAIR DO CAMPO CHAVE
  async function preencherPorChave() {
    const key = chave.trim()
    if (!key) return

    try {
      setBuscando(true)
      setMsg('')

      const snap = await getDoc(doc(db, 'lojas', key))

      if (!snap.exists()) {
        setMsg('⚠️ Chave não encontrada. Preencha manualmente.')
        return
      }

      const data = snap.data() as any

      setNomeExpresso(data.nomeExpresso || '')
      setAgencia(data.agencia || '')
      setPacb(data.pacb || '')

      setMsg('✅ Dados preenchidos automaticamente.')
    } catch (e) {
      console.error(e)
      setMsg('❌ Erro ao buscar dados da loja.')
    } finally {
      setBuscando(false)
    }
  }

  function buildWhatsAppMessage() {
    const solicitante = auth.currentUser?.email || '—'

    return [
      `📌 *${assuntoLabel}*`,
      ``,
      `🔑 *Chave Loja:* ${chave}`,
      `🏪 *Expresso:* ${nomeExpresso}`,
      `🏦 *Agência:* ${agencia}`,
      `🧾 *PACB:* ${pacb}`,
      ``,
      `📝 *Motivo:*`,
      `${motivo}`,
      ``,
      `👤 *Solicitante:* ${solicitante}`,
      emailGerente ? `📩 *Gerente:* ${emailGerente}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }

  async function copiarParaWhatsApp() {
    try {
      await navigator.clipboard.writeText(buildWhatsAppMessage())
      setMsg('✅ Mensagem copiada! Cole no WhatsApp.')
    } catch {
      setMsg('❌ Não consegui copiar a mensagem.')
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    setEnviando(true)

    try {
      const u = auth.currentUser

      const resp = await fetch('/api/baixa-empresa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assuntoTipo,
          assuntoLabel,
          chave,
          nomeExpresso,
          agencia,
          pacb,
          motivo,
          emailGerente,
          solicitanteEmail: u?.email || '',
          solicitanteNome: u?.displayName || '',
        }),
      })

      const data = await resp.json()
      if (!resp.ok || !data?.ok) {
        throw new Error(data?.message || 'Erro ao enviar.')
      }

      setMsg('✅ Solicitação enviada com sucesso!')
      setChave('')
      setNomeExpresso('')
      setAgencia('')
      setPacb('')
      setMotivo('')
      setEmailGerente('')
    } catch (err: any) {
      setMsg(`❌ ${err?.message || 'Erro ao enviar.'}`)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <span className="pill">Formulário</span>
        <h1 className="h1">Solicitação de baixa</h1>
        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          Digite a <b>Chave Loja</b> e saia do campo para autopreencher.
        </p>
      </div>

      <form onSubmit={enviar} className="card">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Tipo de solicitação</label>
            <select
              className="input"
              value={assuntoTipo}
              onChange={(e) => setAssuntoTipo(e.target.value as AssuntoTipo)}
            >
              <option value="treinamento">Baixa de Treinamento</option>
              <option value="checkin">Baixa de Check-in</option>
            </select>
          </div>

          <div>
            <label className="label">Chave Loja</label>
            <input
              className="input"
              value={chave}
              onChange={(e) => setChave(e.target.value)}
              onBlur={preencherPorChave}
              placeholder="Digite a chave"
              required
            />
            <p className="p-muted" style={{ fontSize: 12 }}>
              {buscando ? 'Buscando dados da loja...' : ' '}
            </p>
          </div>

          <div>
            <label className="label">Nome do Expresso</label>
            <input
              className="input"
              value={nomeExpresso}
              onChange={(e) => setNomeExpresso(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Agência</label>
            <input
              className="input"
              value={agencia}
              onChange={(e) => setAgencia(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">PACB</label>
            <input
              className="input"
              value={pacb}
              onChange={(e) => setPacb(e.target.value)}
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label">Motivo</label>
            <textarea
              className="input"
              rows={4}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label">E-mail do gerente (opcional)</label>
            <input
              className="input"
              type="email"
              value={emailGerente}
              onChange={(e) => setEmailGerente(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '.5rem' }}>
          <button
            type="button"
            className="btn-primary"
            disabled={!isFormValid}
            onClick={copiarParaWhatsApp}
          >
            Copiar para mandar pelo WhatsApp
          </button>
        </div>

        {msg && (
          <div className="card-soft" style={{ marginTop: '1rem' }}>
            {msg}
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Link href="/dashboard" className="btn-ghost" style={{ color: '#fff' }}>
            Voltar
          </Link>

          <button
            className="btn-primary"
            type="submit"
            disabled={!isFormValid || enviando}
          >
            {enviando ? 'Enviando...' : 'Enviar ➜'}
          </button>
        </div>
      </form>
    </section>
  )
}
