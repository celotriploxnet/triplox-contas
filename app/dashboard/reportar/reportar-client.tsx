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
          setMensagemBusca('Expresso localizado com sucesso pela chave loja.')
          return
        }

        setErro('Nenhum expresso encontrado com a chave loja informada.')
        return
      }

      if (sugestoesExpresso.length === 1) {
        preencherExpresso(sugestoesExpresso[0])
        setMensagemBusca('Expresso localizado com sucesso pelo nome.')
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

    if (digits.length <= 2) {
      return digits
    }

    if (digits.length <= 7) {
      return `${digits.slice(0, 2)} ${digits.slice(2)}`
    }

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
        setMensagem(`Chamado aberto com sucesso. Protocolo: ${protocolo}`)
      } else {
        setMensagem(
          `Chamado aberto com sucesso. Protocolo: ${protocolo}. Porém, o e-mail não foi enviado.`
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
    return <div className="app-container">Carregando...</div>
  }

  if (!user) {
    return (
      <div className="app-container">
        Você precisa estar logado para acessar a área Reportar.
      </div>
    )
  }

  return (
    <section className="app-container" style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <span className="pill">Chamados</span>
        <h1 className="h1" style={{ marginTop: '.5rem' }}>📕 Reportar</h1>
        <p className="p-muted" style={{ marginTop: '.35rem' }}>
          Abra chamados de solicitação, problema, reclamação ou elogios e sugestões.
        </p>
      </div>

      <div className="card">
        <h2 className="h2">Localizar expresso</h2>

        <div className="grid gap-4 sm:grid-cols-3" style={{ marginTop: '1rem' }}>
          <div>
            <label className="label">Chave Loja</label>
            <input
              value={buscaChaveLoja}
              onChange={(e) => setBuscaChaveLoja(e.target.value)}
              className="input"
              placeholder="Digite a chave loja"
            />
          </div>

          <div className="relative" ref={sugestoesRef}>
            <label className="label">Nome do Expresso</label>
            <input
              value={buscaNomeExpresso}
              onChange={(e) => {
                setBuscaNomeExpresso(e.target.value)
                setMensagemBusca('')
              }}
              onFocus={() => {
                if (sugestoesExpresso.length > 0) {
                  setMostrarSugestoes(true)
                }
              }}
              className="input"
              placeholder="Digite parte do nome do expresso"
              autoComplete="off"
            />

            {loadingSugestoes && (
              <div className="p-muted" style={{ marginTop: '.35rem', fontSize: 12 }}>
                Buscando opções...
              </div>
            )}

            {mostrarSugestoes && sugestoesExpresso.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  zIndex: 20,
                  marginTop: '.5rem',
                  maxHeight: '18rem',
                  width: '100%',
                  overflow: 'auto',
                  borderRadius: '22px',
                  border: '1px solid rgba(15,15,25,.08)',
                  background: '#fff',
                  boxShadow: '0 10px 24px rgba(10, 10, 20, .08)',
                }}
              >
                {sugestoesExpresso.map((item) => (
                  <button
                    key={item.id || `${item.chaveLoja}-${item.nomeExpresso}`}
                    type="button"
                    onClick={() => {
                      preencherExpresso(item)
                      setMensagemBusca('Expresso selecionado com sucesso.')
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      borderBottom: '1px solid rgba(15,15,25,.06)',
                      padding: '.85rem 1rem',
                      textAlign: 'left',
                      background: 'transparent',
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{item.nomeExpresso || '-'}</div>
                    <div style={{ fontSize: 12, color: 'rgba(16,16,24,.68)' }}>
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
              onClick={buscarExpresso}
              disabled={loadingBuscaExpresso}
              className="btn-primary"
            >
              {loadingBuscaExpresso ? 'Buscando...' : 'Buscar expresso'}
            </button>

            <button
              type="button"
              onClick={limparExpressoSelecionado}
              className="btn-ghost"
              style={{
                color: 'var(--text)',
                background: 'rgba(255,255,255,.92)',
                border: '1px solid rgba(15, 15, 25, .10)',
              }}
            >
              Limpar
            </button>
          </div>
        </div>

        {mensagemBusca && (
          <div className="card-soft" style={{ marginTop: '1rem', color: '#166534' }}>
            {mensagemBusca}
          </div>
        )}

        {!mensagemBusca &&
          buscaNomeExpresso.trim().length >= 2 &&
          sugestoesExpresso.length === 0 &&
          !loadingSugestoes && (
            <div className="card-soft" style={{ marginTop: '1rem', color: '#92400e' }}>
              Nenhuma opção encontrada para esse nome.
            </div>
          )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="card">
          <h2 className="h2">Dados do Expresso</h2>

          <div className="grid gap-3 sm:grid-cols-2" style={{ marginTop: '1rem' }}>
            <Campo label="Chave Loja" value={expressoKey} />
            <Campo label="Nome do Expresso" value={nomeExpresso} />
            <Campo label="Agência" value={agencia} />
            <Campo label="PACB" value={pacb} />
            <Campo label="Status" value={statusExpresso} />
            <Campo label="Usuário logado" value={perfil?.name || perfil?.email || '-'} />
          </div>

          {!expressoKey && (
            <div className="card-soft" style={{ marginTop: '1rem', color: '#92400e' }}>
              Você pode abrir esta página pelo botão 📕 no Expresso Geral ou localizar o expresso digitando a chave loja ou parte do nome acima.
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="h2">Abrir novo chamado</h2>

          <form onSubmit={abrirChamado} style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
            <div>
              <label className="label">Tipo do chamado</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoChamado)}
                className="input"
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
                value={contatoNome}
                onChange={(e) => setContatoNome(e.target.value)}
                className="input"
                placeholder="Digite o nome"
              />
            </div>

            <div>
              <label className="label">Celular de contato</label>
              <input
                value={contatoTelefone}
                onChange={(e) => setContatoTelefone(formatarCelularBR(e.target.value))}
                inputMode="numeric"
                className="input"
                placeholder="xx xxxxx-xxxx"
              />
            </div>

            <div>
              <label className="label">Explique o que houve</label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={5}
                className="input"
                placeholder="Descreva o ocorrido"
              />
            </div>

            {erro && (
              <div className="card-soft" style={{ color: '#b91c1c' }}>
                {erro}
              </div>
            )}

            {erroEmail && (
              <div className="card-soft" style={{ color: '#92400e' }}>
                Falha no envio do e-mail: {erroEmail}
              </div>
            )}

            {mensagem && (
              <div className="card-soft" style={{ color: '#166534' }}>
                {mensagem}
              </div>
            )}

            <button type="submit" disabled={loadingSubmit} className="btn-primary">
              {loadingSubmit ? 'Enviando...' : 'Abrir chamado'}
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '.75rem',
          }}
        >
          <h2 className="h2">
            {perfil?.isAdmin ? 'Todos os chamados' : 'Meus chamados'}
          </h2>

          <button
            onClick={() => carregarChamados(user.uid, !!perfil?.isAdmin)}
            className="btn-ghost"
            style={{
              color: 'var(--text)',
              background: 'rgba(255,255,255,.92)',
              border: '1px solid rgba(15, 15, 25, .10)',
            }}
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
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '.85rem',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'grid', gap: '.25rem' }}>
                    <div style={{ fontSize: 14, color: 'rgba(16,16,24,.68)' }}>
                      Protocolo:{' '}
                      <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                        {item.protocolo}
                      </span>
                    </div>

                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                      {item.nomeExpresso || '-'}
                    </div>

                    <div style={{ fontSize: 14, color: 'rgba(16,16,24,.68)' }}>
                      Chave Loja: {item.expressoKey || '-'} | Agência: {item.agencia || '-'} | PACB: {item.pacb || '-'}
                    </div>

                    <div style={{ fontSize: 14, color: 'rgba(16,16,24,.68)' }}>
                      Tipo: {labelTipoChamado(item.tipo)}
                    </div>

                    <div style={{ fontSize: 14, color: 'rgba(16,16,24,.68)' }}>
                      Status do chamado:{' '}
                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            item.statusChamado === 'ABERTO'
                              ? '#d61f2c'
                              : '#15803d',
                        }}
                      >
                        {item.statusChamado}
                      </span>
                    </div>

                    <div style={{ fontSize: 14, color: 'rgba(16,16,24,.68)' }}>
                      Contato: {item.contatoNome || '-'} | Celular: {item.contatoTelefone || '-'}
                    </div>

                    <div style={{ fontSize: 14, color: 'rgba(16,16,24,.68)' }}>
                      Criado em: {formatarDataHoraBrasilia(item.createdAt)}
                    </div>

                    <div style={{ fontSize: 14, color: 'rgba(16,16,24,.68)' }}>
                      Mudança de status:{' '}
                      {formatarDataHoraBrasilia(
                        item.statusChangedAt || item.resolvedAt || item.updatedAt
                      )}
                    </div>

                    {item.solucaoTexto && (
                      <div
                        style={{
                          marginTop: '.5rem',
                          borderRadius: '22px',
                          border: '1px solid rgba(21,128,61,.16)',
                          background: 'rgba(240,253,244,.95)',
                          padding: '.9rem',
                          color: '#166534',
                        }}
                      >
                        <div style={{ marginBottom: '.25rem', fontWeight: 700 }}>
                          Solução informada
                        </div>
                        <div>{item.solucaoTexto}</div>
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: '.5rem',
                        borderRadius: '22px',
                        background: 'rgba(255,255,255,.7)',
                        padding: '.9rem',
                        fontSize: 14,
                        color: 'var(--text)',
                      }}
                    >
                      {item.descricao || '-'}
                    </div>

                    {perfil?.isAdmin && (
                      <div style={{ fontSize: 12, color: 'rgba(16,16,24,.68)' }}>
                        Aberto por: {item.userName || '-'} ({item.userEmail || '-'})
                      </div>
                    )}
                  </div>

                  {perfil?.isAdmin && (
                    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                      {item.statusChamado === 'ABERTO' && (
                        <button
                          onClick={() => marcarComoSolucionado(item)}
                          className="btn-primary"
                          style={{
                            background:
                              'linear-gradient(90deg, #16a34a, #0f9f6e)',
                            boxShadow:
                              '0 14px 28px rgba(22,163,74,.18), 0 14px 28px rgba(15,159,110,.14)',
                          }}
                        >
                          Marcar solucionado
                        </button>
                      )}

                      <button
                        onClick={() => excluirChamado(item.id)}
                        className="btn-primary"
                        style={{
                          background:
                            'linear-gradient(90deg, #d61f2c, #b5163b)',
                          boxShadow:
                            '0 14px 28px rgba(214,31,44,.18), 0 14px 28px rgba(181,22,59,.14)',
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function Campo({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: '1px solid rgba(15, 15, 25, .08)',
        background: 'rgba(255,255,255,.75)',
        borderRadius: '22px',
        boxShadow: '0 10px 24px rgba(10, 10, 20, .08)',
        padding: '1rem',
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '.05em',
          color: 'rgba(16,16,24,.68)',
        }}
      >
        {label}
      </div>
      <div style={{ marginTop: '.25rem', fontSize: 14, fontWeight: 600 }}>
        {value || '-'}
      </div>
    </div>
  )
}