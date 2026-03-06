'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { useSearchParams } from 'next/navigation'

import { auth, db } from '@/lib/firebase'
import {
  Chamado,
  gerarProtocolo,
  labelTipoChamado,
  normalizarChaveLoja,
  TipoChamado,
} from '@/lib/chamados'

type Perfil = {
  name?: string
  email?: string
  role?: string
  isAdmin?: boolean
}

type Loja = {
  id?: string
  chaveLoja?: string
  nomeExpresso?: string
  agencia?: string
  pacb?: string
  status?: string
}

type ChamadoComDatas = Chamado & {
  createdAt?: Timestamp | any
  updatedAt?: Timestamp | any
  resolvedAt?: Timestamp | any
  statusChangedAt?: Timestamp | any
}

const TIPOS: { value: TipoChamado; label: string }[] = [
  { value: 'SOLICITACAO', label: '1 - Solicitação' },
  { value: 'PROBLEMA', label: '2 - Reportar Problema' },
  { value: 'RECLAMACAO', label: '3 - Reclamação' },
  { value: 'ELOGIO_SUGESTAO', label: '4 - Elogios e Sugestões' },
]

export default function ReportarClientPage() {
  const searchParams = useSearchParams()
  const sugestoesRef = useRef<HTMLDivElement | null>(null)

  const [user, setUser] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  const [loadingSubmit, setLoadingSubmit] = useState(false)
  const [loadingLista, setLoadingLista] = useState(false)
  const [loadingBuscaExpresso, setLoadingBuscaExpresso] = useState(false)
  const [loadingSugestoes, setLoadingSugestoes] = useState(false)

  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [mensagemBusca, setMensagemBusca] = useState('')
  const [erroEmail, setErroEmail] = useState('')

  const [chamados, setChamados] = useState<ChamadoComDatas[]>([])

  const [tipo, setTipo] = useState<TipoChamado>('SOLICITACAO')
  const [contatoNome, setContatoNome] = useState('')
  const [contatoTelefone, setContatoTelefone] = useState('')
  const [descricao, setDescricao] = useState('')

  const [buscaChaveLoja, setBuscaChaveLoja] = useState('')
  const [buscaNomeExpresso, setBuscaNomeExpresso] = useState('')
  const [sugestoesExpresso, setSugestoesExpresso] = useState<Loja[]>([])
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)

  const [expressoKeyState, setExpressoKeyState] = useState('')
  const [nomeExpressoState, setNomeExpressoState] = useState('')
  const [agenciaState, setAgenciaState] = useState('')
  const [pacbState, setPacbState] = useState('')
  const [statusExpressoState, setStatusExpressoState] = useState('')

  const expressoKeyParam = useMemo(
    () => normalizarChaveLoja(searchParams.get('chaveLoja') || ''),
    [searchParams]
  )

  const nomeExpressoParam = searchParams.get('nomeExpresso') || ''
  const agenciaParam = searchParams.get('agencia') || ''
  const pacbParam = searchParams.get('pacb') || ''
  const statusExpressoParam = searchParams.get('status') || ''

  const expressoKey = expressoKeyState
  const nomeExpresso = nomeExpressoState
  const agencia = agenciaState
  const pacb = pacbState
  const statusExpresso = statusExpressoState

  useEffect(() => {
    if (
      expressoKeyParam ||
      nomeExpressoParam ||
      agenciaParam ||
      pacbParam ||
      statusExpressoParam
    ) {
      setExpressoKeyState(expressoKeyParam)
      setNomeExpressoState(nomeExpressoParam)
      setAgenciaState(agenciaParam)
      setPacbState(pacbParam)
      setStatusExpressoState(statusExpressoParam)

      setBuscaChaveLoja(expressoKeyParam)
      setBuscaNomeExpresso(nomeExpressoParam)
    }
  }, [
    expressoKeyParam,
    nomeExpressoParam,
    agenciaParam,
    pacbParam,
    statusExpressoParam,
  ])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)

      if (!firebaseUser) {
        setPerfil(null)
        setLoadingUser(false)
        return
      }

      try {
        const userRef = doc(db, 'users', firebaseUser.uid)
        const userSnap = await getDoc(userRef)
        const data = userSnap.exists() ? userSnap.data() : {}

        setPerfil({
          name: data?.name || firebaseUser.displayName || '',
          email: data?.email || firebaseUser.email || '',
          role: data?.role || '',
          isAdmin: data?.role === 'admin' || data?.isAdmin === true,
        })
      } catch (e) {
        console.error('ERRO AO LER USERS:', e)
        setPerfil({
          name: firebaseUser.displayName || '',
          email: firebaseUser.email || '',
          role: '',
          isAdmin: false,
        })
      } finally {
        setLoadingUser(false)
      }
    })

    return () => unsub()
  }, [])

  useEffect(() => {
    if (!user || !perfil) return
    carregarChamados(user.uid, !!perfil.isAdmin)
  }, [user, perfil])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        sugestoesRef.current &&
        !sugestoesRef.current.contains(event.target as Node)
      ) {
        setMostrarSugestoes(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const termo = buscaNomeExpresso.trim()

    if (termo.length < 2) {
      setSugestoesExpresso([])
      setMostrarSugestoes(false)
      return
    }

    const timer = setTimeout(() => {
      buscarSugestoesExpresso(termo)
    }, 250)

    return () => clearTimeout(timer)
  }, [buscaNomeExpresso])

  function ordenarChamadosPorData(lista: ChamadoComDatas[]) {
    return [...lista].sort((a, b) => {
      const da =
        typeof a?.createdAt?.toDate === 'function'
          ? a.createdAt.toDate().getTime()
          : 0
      const dbb =
        typeof b?.createdAt?.toDate === 'function'
          ? b.createdAt.toDate().getTime()
          : 0

      return dbb - da
    })
  }

  async function carregarChamados(uid?: string, isAdmin?: boolean) {
    if (!uid) return

    setLoadingLista(true)
    setErro('')

    try {
      const chamadosRef = collection(db, 'chamados')

      if (isAdmin) {
        const qAdmin = query(chamadosRef, orderBy('createdAt', 'desc'))
        const snapAdmin = await getDocs(qAdmin)

        const listaAdmin = snapAdmin.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as ChamadoComDatas[]

        setChamados(listaAdmin)
        return
      }

      try {
        const qUser = query(
          chamadosRef,
          where('userId', '==', uid),
          orderBy('createdAt', 'desc')
        )

        const snapUser = await getDocs(qUser)

        const listaUser = snapUser.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as ChamadoComDatas[]

        setChamados(listaUser)
      } catch (indexError) {
        console.warn(
          'Consulta com orderBy falhou, tentando fallback sem índice:',
          indexError
        )

        const qUserFallback = query(chamadosRef, where('userId', '==', uid))
        const snapFallback = await getDocs(qUserFallback)

        const listaFallback = snapFallback.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as ChamadoComDatas[]

        setChamados(ordenarChamadosPorData(listaFallback))
      }
    } catch (e: any) {
      console.error('ERRO AO CARREGAR CHAMADOS:', e)
      setErro(
        e?.message ||
          'Não foi possível carregar os chamados. Se aparecer índice do Firestore no console, basta clicar no link para criar.'
      )
    } finally {
      setLoadingLista(false)
    }
  }

  function preencherExpresso(loja: Loja) {
    setExpressoKeyState(normalizarChaveLoja(loja?.chaveLoja || ''))
    setNomeExpressoState(loja?.nomeExpresso || '')
    setAgenciaState(loja?.agencia || '')
    setPacbState(loja?.pacb || '')
    setStatusExpressoState(loja?.status || '')

    setBuscaChaveLoja(loja?.chaveLoja || '')
    setBuscaNomeExpresso(loja?.nomeExpresso || '')
    setSugestoesExpresso([])
    setMostrarSugestoes(false)
  }

  async function buscarSugestoesExpresso(termo: string) {
    setLoadingSugestoes(true)

    try {
      const lojasRef = collection(db, 'lojas')
      const snap = await getDocs(lojasRef)

      const lojas = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Loja[]

      const termoLower = termo.trim().toLowerCase()

      const filtradas = lojas
        .filter((loja) => {
          const nome = String(loja?.nomeExpresso || '').trim().toLowerCase()
          const chave = String(loja?.chaveLoja || '').trim().toLowerCase()

          return nome.includes(termoLower) || chave.includes(termoLower)
        })
        .slice(0, 12)

      setSugestoesExpresso(filtradas)
      setMostrarSugestoes(filtradas.length > 0)
    } catch (e) {
      console.error('Erro ao buscar sugestões:', e)
      setSugestoesExpresso([])
      setMostrarSugestoes(false)
    } finally {
      setLoadingSugestoes(false)
    }
  }

  async function buscarExpresso() {
    setMensagemBusca('')
    setErro('')
    setErroEmail('')

    const chaveNormalizada = normalizarChaveLoja(buscaChaveLoja)

    if (!chaveNormalizada && !buscaNomeExpresso.trim()) {
      setErro('Digite a chave loja ou selecione um nome do expresso.')
      return
    }

    setLoadingBuscaExpresso(true)

    try {
      if (chaveNormalizada) {
        const lojasRef = collection(db, 'lojas')
        const qChave = query(
          lojasRef,
          where('chaveLoja', '==', chaveNormalizada),
          limit(1)
        )
        const snapChave = await getDocs(qChave)

        if (!snapChave.empty) {
          const loja = {
            id: snapChave.docs[0].id,
            ...snapChave.docs[0].data(),
          } as Loja

          preencherExpresso(loja)
          setMensagemBusca('✅ Dados preenchidos automaticamente.')
          return
        }

        setErro('⚠️ Chave não encontrada. Preencha manualmente.')
        return
      }

      if (sugestoesExpresso.length === 1) {
        preencherExpresso(sugestoesExpresso[0])
        setMensagemBusca('✅ Expresso localizado com sucesso.')
        return
      }

      if (sugestoesExpresso.length > 1) {
        setErro('Selecione um expresso na lista de sugestões.')
        setMostrarSugestoes(true)
        return
      }

      setErro('Nenhum expresso encontrado com os dados informados.')
    } catch (e: any) {
      console.error(e)
      setErro(
        'Não foi possível buscar o expresso. Confira se a collection "lojas" possui os campos chaveLoja, nomeExpresso, agencia, pacb e status.'
      )
    } finally {
      setLoadingBuscaExpresso(false)
    }
  }

  function limparExpressoSelecionado() {
    setExpressoKeyState('')
    setNomeExpressoState('')
    setAgenciaState('')
    setPacbState('')
    setStatusExpressoState('')
    setBuscaChaveLoja('')
    setBuscaNomeExpresso('')
    setMensagemBusca('')
    setErro('')
    setErroEmail('')
    setSugestoesExpresso([])
    setMostrarSugestoes(false)
  }

  async function verificarChamadoAberto() {
    const chamadosRef = collection(db, 'chamados')
    const q = query(
      chamadosRef,
      where('expressoKey', '==', expressoKey),
      where('statusChamado', '==', 'ABERTO'),
      limit(1)
    )

    const snap = await getDocs(q)
    return !snap.empty
  }

  async function enviarEmail(payload: any) {
    try {
      const response = await fetch('/api/reportar-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const mensagemErro =
          data?.error ||
          data?.message ||
          'Falha ao enviar e-mail. Verifique o console do servidor.'

        console.error('Erro ao enviar email:', data)
        setErroEmail(mensagemErro)
        return false
      }

      setErroEmail('')
      return true
    } catch (e: any) {
      console.error('Erro ao enviar email:', e)
      setErroEmail(e?.message || 'Erro inesperado ao enviar e-mail.')
      return false
    }
  }

  function somenteNumeros(value: string) {
    return value.replace(/\D/g, '')
  }

  function formatarCelularBR(value: string) {
    const digits = somenteNumeros(value).slice(0, 11)

    if (digits.length <= 2) return digits
    if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2)}`
    return `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
  }

  function telefoneCompleto(value: string) {
    return somenteNumeros(value).length === 11
  }

  function formatarDataHoraBrasilia(value: any) {
    if (!value) return '-'

    try {
      const date =
        typeof value?.toDate === 'function'
          ? value.toDate()
          : value instanceof Date
            ? value
            : null

      if (!date) return '-'

      const partes = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(date)

      const get = (type: string) =>
        partes.find((p) => p.type === type)?.value || ''

      return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`
    } catch {
      return '-'
    }
  }

  function dataHoraBrasiliaAgora() {
    const partes = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date())

    const get = (type: string) =>
      partes.find((p) => p.type === type)?.value || ''

    return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`
  }

  const isFormValid = useMemo(() => {
    return (
      expressoKey.trim() !== '' &&
      nomeExpresso.trim() !== '' &&
      contatoNome.trim() !== '' &&
      telefoneCompleto(contatoTelefone) &&
      descricao.trim() !== ''
    )
  }, [expressoKey, nomeExpresso, contatoNome, contatoTelefone, descricao])

  async function abrirChamado(e: React.FormEvent) {
    e.preventDefault()
    setMensagem('')
    setErro('')
    setErroEmail('')

    if (!user) {
      setErro('Você precisa estar logado para abrir um chamado.')
      return
    }

    if (!expressoKey || !nomeExpresso) {
      setErro(
        'Primeiro localize um expresso pela chave loja ou selecione um nome na lista.'
      )
      return
    }

    if (!contatoNome.trim()) {
      setErro('Informe o nome com quem falou.')
      return
    }

    if (!telefoneCompleto(contatoTelefone)) {
      setErro('Informe o celular completo no formato xx xxxxx-xxxx.')
      return
    }

    if (!descricao.trim()) {
      setErro('Explique o que houve.')
      return
    }

    setLoadingSubmit(true)

    try {
      const jaExisteAberto = await verificarChamadoAberto()

      if (jaExisteAberto) {
        setErro(
          'Já existe um chamado em aberto para este expresso. Aguarde a solução antes de abrir outro.'
        )
        setLoadingSubmit(false)
        return
      }

      const protocolo = gerarProtocolo()

      const payload: Omit<ChamadoComDatas, 'id'> = {
        protocolo,
        userId: user.uid,
        userEmail: perfil?.email || user.email || '',
        userName: perfil?.name || user.displayName || '',
        expressoKey,
        nomeExpresso,
        agencia,
        pacb,
        statusExpresso,
        tipo,
        contatoNome: contatoNome.trim(),
        contatoTelefone: formatarCelularBR(contatoTelefone),
        descricao: descricao.trim(),
        statusChamado: 'ABERTO',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        statusChangedAt: serverTimestamp(),
      }

      await addDoc(collection(db, 'chamados'), payload)

      const emailOk = await enviarEmail({
        protocolo,
        userEmail: payload.userEmail,
        userName: payload.userName,
        expressoKey,
        nomeExpresso,
        agencia,
        pacb,
        statusExpresso,
        tipo,
        contatoNome: payload.contatoNome,
        contatoTelefone: payload.contatoTelefone,
        descricao: payload.descricao,
        statusChamado: 'ABERTO',
        dataHoraEvento: dataHoraBrasiliaAgora(),
      })

      if (emailOk) {
        setMensagem(`✅ Chamado aberto com sucesso. Protocolo: ${protocolo}`)
      } else {
        setMensagem(
          `✅ Chamado aberto com sucesso. Protocolo: ${protocolo}. Porém, o e-mail não foi enviado.`
        )
      }

      setContatoNome('')
      setContatoTelefone('')
      setDescricao('')

      await carregarChamados(user.uid, !!perfil?.isAdmin)
    } catch (e: any) {
      console.error(e)
      setErro(e?.message || 'Erro ao abrir chamado.')
    } finally {
      setLoadingSubmit(false)
    }
  }

  async function marcarComoSolucionado(item: ChamadoComDatas) {
    if (!perfil?.isAdmin || !user) return

    const resposta = window.prompt(
      `Digite a solução para o chamado ${item.protocolo}:`,
      item.solucaoTexto || ''
    )

    if (resposta === null) return

    const solucaoTexto = resposta.trim()

    if (!solucaoTexto) {
      window.alert('Informe o texto da solução antes de marcar como solucionado.')
      return
    }

    try {
      const dataHoraSolucao = dataHoraBrasiliaAgora()

      await updateDoc(doc(db, 'chamados', item.id), {
        statusChamado: 'SOLUCIONADO',
        solucaoTexto,
        updatedAt: serverTimestamp(),
        resolvedAt: serverTimestamp(),
        statusChangedAt: serverTimestamp(),
        resolvedBy: user.uid,
      })

      const emailOk = await enviarEmail({
        protocolo: item.protocolo,
        userEmail: item.userEmail,
        userName: item.userName,
        expressoKey: item.expressoKey,
        nomeExpresso: item.nomeExpresso,
        agencia: item.agencia,
        pacb: item.pacb,
        statusExpresso: item.statusExpresso,
        tipo: item.tipo,
        contatoNome: item.contatoNome,
        contatoTelefone: item.contatoTelefone,
        descricao: item.descricao,
        statusChamado: 'SOLUCIONADO',
        dataHoraEvento: dataHoraSolucao,
        solucaoTexto,
      })

      if (!emailOk) {
        setMensagem(
          `Chamado ${item.protocolo} marcado como solucionado, mas o e-mail do usuário não foi enviado.`
        )
      } else {
        setMensagem(`Chamado ${item.protocolo} marcado como solucionado.`)
      }

      await carregarChamados(user.uid, !!perfil?.isAdmin)
    } catch (e) {
      console.error(e)
      alert('Erro ao atualizar o chamado.')
    }
  }

  async function excluirChamado(chamadoId: string) {
    if (!perfil?.isAdmin || !user) return

    const ok = window.confirm('Deseja realmente excluir este chamado?')
    if (!ok) return

    try {
      await deleteDoc(doc(db, 'chamados', chamadoId))
      await carregarChamados(user.uid, !!perfil?.isAdmin)
    } catch (e) {
      console.error(e)
      alert('Erro ao excluir o chamado.')
    }
  }

  if (loadingUser) {
    return <section style={{ display: 'grid', gap: '1.25rem' }}>Carregando...</section>
  }

  if (!user) {
    return (
      <section style={{ display: 'grid', gap: '1.25rem' }}>
        Você precisa estar logado para acessar a área Reportar.
      </section>
    )
  }

  return (
    <section style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <span className="pill">Chamados</span>
        <h1 className="h1">Reportar</h1>
        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          Localize o expresso e abra chamados de solicitação, problema, reclamação ou elogios e sugestões.
        </p>
      </div>

      <div className="card">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Chave Loja</label>
            <input
              className="input"
              value={buscaChaveLoja}
              onChange={(e) => setBuscaChaveLoja(e.target.value)}
              placeholder="Digite a chave"
            />
          </div>

          <div style={{ position: 'relative' }} ref={sugestoesRef}>
            <label className="label">Nome do Expresso</label>
            <input
              className="input"
              value={buscaNomeExpresso}
              onChange={(e) => {
                setBuscaNomeExpresso(e.target.value)
                setMensagemBusca('')
              }}
              onFocus={() => {
                if (sugestoesExpresso.length > 0) setMostrarSugestoes(true)
              }}
              placeholder="Digite parte do nome do expresso"
              autoComplete="off"
            />

            <p className="p-muted" style={{ fontSize: 12 }}>
              {loadingSugestoes ? 'Buscando opções...' : ' '}
            </p>

            {mostrarSugestoes && sugestoesExpresso.length > 0 && (
              <div
                className="card-soft"
                style={{
                  position: 'absolute',
                  zIndex: 20,
                  width: '100%',
                  marginTop: '.35rem',
                  maxHeight: '18rem',
                  overflow: 'auto',
                  padding: '.35rem',
                }}
              >
                {sugestoesExpresso.map((item) => (
                  <button
                    key={item.id || `${item.chaveLoja}-${item.nomeExpresso}`}
                    type="button"
                    onClick={() => {
                      preencherExpresso(item)
                      setMensagemBusca('✅ Expresso selecionado com sucesso.')
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '.75rem .8rem',
                      borderRadius: '18px',
                      border: 'none',
                      background: 'transparent',
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{item.nomeExpresso || '-'}</div>
                    <div className="p-muted" style={{ fontSize: 12 }}>
                      Chave Loja: {item.chaveLoja || '-'} | Agência: {item.agencia || '-'} | PACB: {item.pacb || '-'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'end', gap: '.5rem' }}>
            <button
              type="button"
              className="btn-primary"
              disabled={loadingBuscaExpresso}
              onClick={buscarExpresso}
            >
              {loadingBuscaExpresso ? 'Buscando...' : 'Buscar expresso'}
            </button>

            <button
              type="button"
              className="btn-ghost"
              style={{ color: '#fff' }}
              onClick={limparExpressoSelecionado}
            >
              Limpar
            </button>
          </div>
        </div>

        {mensagemBusca && (
          <div className="card-soft" style={{ marginTop: '1rem' }}>
            {mensagemBusca}
          </div>
        )}

        {erro && !mensagemBusca && (
          <div className="card-soft" style={{ marginTop: '1rem' }}>
            {erro}
          </div>
        )}
      </div>

      <form onSubmit={abrirChamado} className="card">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Chave Loja</label>
            <input className="input" value={expressoKey} readOnly />
          </div>

          <div>
            <label className="label">Nome do Expresso</label>
            <input className="input" value={nomeExpresso} readOnly />
          </div>

          <div>
            <label className="label">Agência</label>
            <input className="input" value={agencia} readOnly />
          </div>

          <div>
            <label className="label">PACB</label>
            <input className="input" value={pacb} readOnly />
          </div>

          <div className="sm:col-span-2">
            <label className="label">Tipo do chamado</label>
            <select
              className="input"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoChamado)}
            >
              {TIPOS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Nome com quem falou</label>
            <input
              className="input"
              value={contatoNome}
              onChange={(e) => setContatoNome(e.target.value)}
              placeholder="Digite o nome"
            />
          </div>

          <div>
            <label className="label">Celular de contato</label>
            <input
              className="input"
              value={contatoTelefone}
              onChange={(e) => setContatoTelefone(formatarCelularBR(e.target.value))}
              placeholder="xx xxxxx-xxxx"
              inputMode="numeric"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label">Explique o que houve</label>
            <textarea
              className="input"
              rows={5}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o ocorrido"
            />
          </div>
        </div>

        {erroEmail && (
          <div className="card-soft" style={{ marginTop: '1rem' }}>
            Falha no envio do e-mail: {erroEmail}
          </div>
        )}

        {mensagem && (
          <div className="card-soft" style={{ marginTop: '1rem' }}>
            {mensagem}
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button
            type="button"
            className="btn-ghost"
            style={{ color: '#fff' }}
            onClick={limparExpressoSelecionado}
          >
            Limpar formulário
          </button>

          <button
            className="btn-primary"
            type="submit"
            disabled={!isFormValid || loadingSubmit}
          >
            {loadingSubmit ? 'Enviando...' : 'Abrir chamado ➜'}
          </button>
        </div>
      </form>

      <div className="card">
        <div className="flex justify-between items-center gap-3">
          <div>
            <span className="pill">
              {perfil?.isAdmin ? 'Painel completo' : 'Seus chamados'}
            </span>
            <h2 className="h2" style={{ marginTop: '.6rem' }}>
              {perfil?.isAdmin ? 'Todos os chamados' : 'Meus chamados'}
            </h2>
          </div>

          <button
            className="btn-ghost"
            style={{ color: '#fff' }}
            onClick={() => carregarChamados(user.uid, !!perfil?.isAdmin)}
          >
            Atualizar
          </button>
        </div>

        {loadingLista ? (
          <div className="p-muted" style={{ marginTop: '1rem' }}>
            Carregando lista...
          </div>
        ) : chamados.length === 0 ? (
          <div className="card-soft" style={{ marginTop: '1rem' }}>
            Nenhum chamado encontrado.
          </div>
        ) : (
          <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
            {chamados.map((item) => (
              <div key={item.id} className="card-soft">
                <div style={{ display: 'grid', gap: '.35rem' }}>
                  <div style={{ fontSize: 14 }}>
                    <b>Protocolo:</b> {item.protocolo}
                  </div>
                  <div style={{ fontSize: 14 }}>
                    <b>Expresso:</b> {item.nomeExpresso || '-'}
                  </div>
                  <div style={{ fontSize: 14 }}>
                    <b>Chave Loja:</b> {item.expressoKey || '-'} | <b>Agência:</b> {item.agencia || '-'} | <b>PACB:</b> {item.pacb || '-'}
                  </div>
                  <div style={{ fontSize: 14 }}>
                    <b>Tipo:</b> {labelTipoChamado(item.tipo)}
                  </div>
                  <div style={{ fontSize: 14 }}>
                    <b>Status:</b>{' '}
                    <span
                      style={{
                        fontWeight: 800,
                        color: item.statusChamado === 'ABERTO' ? 'var(--red)' : '#15803d',
                      }}
                    >
                      {item.statusChamado}
                    </span>
                  </div>
                  <div style={{ fontSize: 14 }}>
                    <b>Contato:</b> {item.contatoNome || '-'} | <b>Celular:</b> {item.contatoTelefone || '-'}
                  </div>
                  <div style={{ fontSize: 14 }}>
                    <b>Criado em:</b> {formatarDataHoraBrasilia(item.createdAt)}
                  </div>
                  <div style={{ fontSize: 14 }}>
                    <b>Mudança de status:</b>{' '}
                    {formatarDataHoraBrasilia(
                      item.statusChangedAt || item.resolvedAt || item.updatedAt
                    )}
                  </div>

                  {item.solucaoTexto && (
                    <div className="card-soft" style={{ marginTop: '.35rem' }}>
                      <b>Solução informada</b>
                      <div style={{ marginTop: '.35rem' }}>{item.solucaoTexto}</div>
                    </div>
                  )}

                  <div className="card-soft" style={{ marginTop: '.35rem' }}>
                    {item.descricao || '-'}
                  </div>

                  {perfil?.isAdmin && (
                    <div className="p-muted" style={{ fontSize: 12 }}>
                      Aberto por: {item.userName || '-'} ({item.userEmail || '-'})
                    </div>
                  )}
                </div>

                {perfil?.isAdmin && (
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                    {item.statusChamado === 'ABERTO' && (
                      <button
                        type="button"
                        className="btn-primary"
                        style={{
                          background:
                            'linear-gradient(90deg, #16a34a, #0f9f6e)',
                          boxShadow:
                            '0 14px 28px rgba(22,163,74,.16), 0 14px 28px rgba(15,159,110,.14)',
                        }}
                        onClick={() => marcarComoSolucionado(item)}
                      >
                        Marcar solucionado
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-primary"
                      style={{
                        background:
                          'linear-gradient(90deg, #d61f2c, #b5163b)',
                        boxShadow:
                          '0 14px 28px rgba(214,31,44,.16), 0 14px 28px rgba(181,22,59,.14)',
                      }}
                      onClick={() => excluirChamado(item.id)}
                    >
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}