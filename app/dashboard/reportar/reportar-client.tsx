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

  function formatarData(value: any) {
    if (!value) return '-'

    try {
      const date =
        typeof value?.toDate === 'function'
          ? value.toDate()
          : value instanceof Date
            ? value
            : null

      if (!date) return '-'

      return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date)
    } catch {
      return '-'
    }
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

  async function marcarComoSolucionado(chamadoId: string) {
    if (!perfil?.isAdmin || !user) return

    try {
      await updateDoc(doc(db, 'chamados', chamadoId), {
        statusChamado: 'SOLUCIONADO',
        updatedAt: serverTimestamp(),
        resolvedAt: serverTimestamp(),
        statusChangedAt: serverTimestamp(),
        resolvedBy: user.uid,
      })

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
    return <div className="p-6 text-white">Carregando...</div>
  }

  if (!user) {
    return (
      <div className="p-6 text-white">
        Você precisa estar logado para acessar a área Reportar.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#7a0019] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl bg-white p-5 shadow-lg">
          <h1 className="text-2xl font-bold text-[#7a0019]">📕 Reportar</h1>
          <p className="mt-1 text-sm text-gray-600">
            Abra chamados de solicitação, problema, reclamação ou elogios e
            sugestões.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-lg">
          <h2 className="text-lg font-bold text-[#7a0019]">
            Localizar expresso
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Chave Loja
              </label>
              <input
                value={buscaChaveLoja}
                onChange={(e) => setBuscaChaveLoja(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-[#7a0019]"
                placeholder="Digite a chave loja"
              />
            </div>

            <div className="relative md:col-span-1" ref={sugestoesRef}>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nome do Expresso
              </label>
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
                className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-[#7a0019]"
                placeholder="Digite parte do nome do expresso"
                autoComplete="off"
              />

              {loadingSugestoes && (
                <div className="mt-1 text-xs text-gray-500">
                  Buscando opções...
                </div>
              )}

              {mostrarSugestoes && sugestoesExpresso.length > 0 && (
                <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                  {sugestoesExpresso.map((item) => (
                    <button
                      key={item.id || `${item.chaveLoja}-${item.nomeExpresso}`}
                      type="button"
                      onClick={() => {
                        preencherExpresso(item)
                        setMensagemBusca('Expresso selecionado com sucesso.')
                      }}
                      className="block w-full border-b border-gray-100 px-3 py-3 text-left last:border-b-0 hover:bg-gray-50"
                    >
                      <div className="font-semibold text-gray-800">
                        {item.nomeExpresso || '-'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Chave Loja: {item.chaveLoja || '-'} | Agência:{' '}
                        {item.agencia || '-'} | PACB: {item.pacb || '-'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={buscarExpresso}
                disabled={loadingBuscaExpresso}
                className="rounded-xl bg-[#7a0019] px-4 py-2 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingBuscaExpresso ? 'Buscando...' : 'Buscar expresso'}
              </button>

              <button
                type="button"
                onClick={limparExpressoSelecionado}
                className="rounded-xl border border-[#7a0019] px-4 py-2 font-semibold text-[#7a0019]"
              >
                Limpar
              </button>
            </div>
          </div>

          {mensagemBusca && (
            <div className="mt-4 rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-700">
              {mensagemBusca}
            </div>
          )}

          {!mensagemBusca &&
            buscaNomeExpresso.trim().length >= 2 &&
            sugestoesExpresso.length === 0 &&
            !loadingSugestoes && (
              <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700">
                Nenhuma opção encontrada para esse nome.
              </div>
            )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-lg">
            <h2 className="text-lg font-bold text-[#7a0019]">
              Dados do Expresso
            </h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Campo label="Chave Loja" value={expressoKey} />
              <Campo label="Nome do Expresso" value={nomeExpresso} />
              <Campo label="Agência" value={agencia} />
              <Campo label="PACB" value={pacb} />
              <Campo label="Status" value={statusExpresso} />
              <Campo
                label="Usuário logado"
                value={perfil?.name || perfil?.email || '-'}
              />
            </div>

            {!expressoKey && (
              <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700">
                Você pode abrir esta página pelo botão 📕 no Expresso Geral ou
                localizar o expresso digitando a chave loja ou parte do nome
                acima.
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-lg">
            <h2 className="text-lg font-bold text-[#7a0019]">
              Abrir novo chamado
            </h2>

            <form onSubmit={abrirChamado} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Tipo do chamado
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoChamado)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-[#7a0019]"
                >
                  {TIPOS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nome com quem falou
                </label>
                <input
                  value={contatoNome}
                  onChange={(e) => setContatoNome(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-[#7a0019]"
                  placeholder="Digite o nome"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Celular de contato
                </label>
                <input
                  value={contatoTelefone}
                  onChange={(e) =>
                    setContatoTelefone(formatarCelularBR(e.target.value))
                  }
                  inputMode="numeric"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-[#7a0019]"
                  placeholder="xx xxxxx-xxxx"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Explique o que houve
                </label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={5}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-[#7a0019]"
                  placeholder="Descreva o ocorrido"
                />
              </div>

              {erro && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                  {erro}
                </div>
              )}

              {erroEmail && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                  Falha no envio do e-mail: {erroEmail}
                </div>
              )}

              {mensagem && (
                <div className="rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-700">
                  {mensagem}
                </div>
              )}

              <button
                type="submit"
                disabled={loadingSubmit}
                className="rounded-xl bg-[#7a0019] px-4 py-2 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingSubmit ? 'Enviando...' : 'Abrir chamado'}
              </button>
            </form>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[#7a0019]">
              {perfil?.isAdmin ? 'Todos os chamados' : 'Meus chamados'}
            </h2>
            <button
              onClick={() => carregarChamados(user.uid, !!perfil?.isAdmin)}
              className="rounded-xl border border-[#7a0019] px-3 py-2 text-sm font-semibold text-[#7a0019]"
            >
              Atualizar
            </button>
          </div>

          {loadingLista ? (
            <div className="mt-4 text-sm text-gray-600">
              Carregando lista...
            </div>
          ) : chamados.length === 0 ? (
            <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
              Nenhum chamado encontrado.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {chamados.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-gray-200 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <div className="text-sm text-gray-500">
                        Protocolo:{' '}
                        <span className="font-semibold text-gray-800">
                          {item.protocolo}
                        </span>
                      </div>

                      <div className="text-base font-bold text-[#7a0019]">
                        {item.nomeExpresso || '-'}
                      </div>

                      <div className="text-sm text-gray-600">
                        Chave Loja: {item.expressoKey || '-'} | Agência:{' '}
                        {item.agencia || '-'} | PACB: {item.pacb || '-'}
                      </div>

                      <div className="text-sm text-gray-600">
                        Tipo: {labelTipoChamado(item.tipo)}
                      </div>

                      <div className="text-sm text-gray-600">
                        Status do chamado:{' '}
                        <span
                          className={
                            item.statusChamado === 'ABERTO'
                              ? 'font-semibold text-red-600'
                              : 'font-semibold text-green-600'
                          }
                        >
                          {item.statusChamado}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600">
                        Contato: {item.contatoNome || '-'} | Celular:{' '}
                        {item.contatoTelefone || '-'}
                      </div>

                      <div className="text-sm text-gray-600">
                        Criado em: {formatarData(item.createdAt)}
                      </div>

                      <div className="text-sm text-gray-600">
                        Mudança de status:{' '}
                        {formatarData(
                          item.statusChangedAt ||
                            item.resolvedAt ||
                            item.updatedAt
                        )}
                      </div>

                      <div className="mt-2 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                        {item.descricao || '-'}
                      </div>

                      {perfil?.isAdmin && (
                        <div className="text-xs text-gray-500">
                          Aberto por: {item.userName || '-'} ({item.userEmail || '-'})
                        </div>
                      )}
                    </div>

                    {perfil?.isAdmin && (
                      <div className="flex shrink-0 gap-2">
                        {item.statusChamado === 'ABERTO' && (
                          <button
                            onClick={() => marcarComoSolucionado(item.id)}
                            className="rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white"
                          >
                            Marcar solucionado
                          </button>
                        )}
                        <button
                          onClick={() => excluirChamado(item.id)}
                          className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white"
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
      </div>
    </div>
  )
}

function Campo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-gray-800">
        {value || '-'}
      </div>
    </div>
  )
}