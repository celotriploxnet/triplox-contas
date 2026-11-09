'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  arrayUnion, doc, getDoc, setDoc, Timestamp,
} from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { ROTEIROS_COMERCIAIS } from '@/lib/roteiros-comerciais'
import styles from './PlanoComercialExpresso.module.css'

type Props = {
  expresso: { chave: string; nome: string; agencia: string; pacb: string; municipio: string }
  registroCollection: string
}
type Interacao = {
  id: string; tipo: string; resultado: string; produtos: string[]; observacoes: string
  proximoContato: string; createdAt?: { toDate?: () => Date; toMillis?: () => number }; createdBy?: string
}
type Comissao = { id: string; label: string; type: string; value: number }

const OPCOES_RESULTADO = ['Falou com responsável', 'Sem contato', 'Reunião agendada', 'Treinamento realizado', 'Material enviado', 'Retorno pendente']

function idSeguro(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 120) || 'sem-chave'
}

function formatarData(value?: Interacao['createdAt']) {
  const date = value?.toDate?.()
  return date ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date) : 'Salvando…'
}

function dinheiro(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export default function PlanoComercialExpresso({ expresso, registroCollection }: Props) {
  const [aberto, setAberto] = useState(false)
  const [aba, setAba] = useState<'roteiro' | 'historico'>('roteiro')
  const [produtoId, setProdutoId] = useState(ROTEIROS_COMERCIAIS[0].id)
  const [historico, setHistorico] = useState<Interacao[]>([])
  const [comissoes, setComissoes] = useState<Comissao[]>([])
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [tipo, setTipo] = useState('Ligação')
  const [resultado, setResultado] = useState(OPCOES_RESULTADO[0])
  const [produtosFalados, setProdutosFalados] = useState<string[]>([])
  const [observacoes, setObservacoes] = useState('')
  const [proximoContato, setProximoContato] = useState('')

  const produto = ROTEIROS_COMERCIAIS.find((item) => item.id === produtoId) || ROTEIROS_COMERCIAIS[0]
  const comissaoIds = produto.comissaoIds || (produto.comissaoId ? [produto.comissaoId] : [])
  const comissoesProduto = comissaoIds.map((id) => comissoes.find((item) => item.id === id)).filter((item): item is Comissao => !!item)
  const roteiroTexto = useMemo(() => [
    `ABERTURA — ${expresso.nome || 'Expresso'}\n${produto.abertura}`,
    `\nPERGUNTAS PARA DESCOBRIR A NECESSIDADE\n${produto.perguntas.map((item, i) => `${i + 1}. ${item}`).join('\n')}`,
    `\nPONTOS-CHAVE\n${produto.pontos.map((item) => `• ${item}`).join('\n')}`,
    `\nFECHAMENTO\n${produto.fechamento}`,
    `\nATENÇÃO\n${produto.cuidado}`,
  ].join('\n'), [expresso.nome, produto])

  const carregarDados = useCallback(async () => {
    if (!auth.currentUser) { setErro('Entre no sistema para acessar o plano comercial.'); return }
    setCarregando(true); setErro('')
    const expressoId = idSeguro(expresso.chave || `${expresso.agencia}-${expresso.pacb}-${expresso.nome}`)
    try {
      const [expressoSnap, configSnap] = await Promise.all([
        getDoc(doc(db, registroCollection, expressoId)),
        getDoc(doc(db, 'config', 'comissoes_simulador')).catch((error) => {
          console.error('Não consegui consultar as comissões do simulador:', error)
          return null
        }),
      ])
      const registros = expressoSnap.exists() ? expressoSnap.data().historicoComercial : []
      setHistorico(Array.isArray(registros) ? [...registros].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)) : [])
      const data = configSnap?.exists() ? configSnap.data() : null
      setComissoes(Array.isArray(data?.items) ? data.items.map((item: any) => ({
        id: String(item.id), label: String(item.label || ''), type: item.type === 'percent' ? 'percent' : 'fixed', value: Number(item.value) || 0,
      })) : [])
    } catch (e: any) {
      console.error('Erro ao carregar plano comercial:', e)
      setErro(`Não consegui carregar os dados comerciais (${e?.code || 'erro'}).`)
    } finally { setCarregando(false) }
  }, [expresso.agencia, expresso.chave, expresso.municipio, expresso.nome, expresso.pacb, registroCollection])

  useEffect(() => { if (aberto) void carregarDados() }, [aberto, carregarDados])

  async function registrarInteracao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!auth.currentUser) { setErro('Sua sessão expirou. Entre novamente para registrar.'); return }
    setSalvando(true); setErro(''); setSucesso('')
    const expressoId = idSeguro(expresso.chave || `${expresso.agencia}-${expresso.pacb}-${expresso.nome}`)
    try {
      const payload = {
        id: crypto.randomUUID(), expressoId, expressoChave: expresso.chave, expressoNome: expresso.nome,
        agencia: expresso.agencia, pacb: expresso.pacb, municipio: expresso.municipio,
        tipo, resultado, produtos: produtosFalados, observacoes: observacoes.trim(),
        proximoContato, createdAt: Timestamp.now(), createdBy: auth.currentUser.email || auth.currentUser.uid,
      }
      await setDoc(doc(db, registroCollection, expressoId), { historicoComercial: arrayUnion(payload) }, { merge: true })
      setSucesso('Atendimento registrado no histórico deste ponto.')
      setObservacoes(''); setProdutosFalados([]); setProximoContato(''); setResultado(OPCOES_RESULTADO[0])
      await carregarDados()
    } catch (e: any) {
      console.error('Erro ao registrar interação comercial:', e)
      setErro(`Não consegui salvar o atendimento (${e?.code || 'erro'}).`)
    } finally { setSalvando(false) }
  }

  function alternarProduto(id: string) {
    setProdutosFalados((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  useEffect(() => {
    if (!aberto) return
    const overflowOriginal = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const fecharComEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAberto(false)
    }
    window.addEventListener('keydown', fecharComEsc)
    return () => {
      document.body.style.overflow = overflowOriginal
      window.removeEventListener('keydown', fecharComEsc)
    }
  }, [aberto])

  if (!aberto) return (
    <button type="button" onClick={() => { setAba('roteiro'); setAberto(true) }} title="Abrir roteiro comercial e histórico de contatos" className={styles.planoAbrir}>
      <span aria-hidden="true">🗣️</span> Plano comercial
    </button>
  )

  return createPortal(
    (
      <div className={styles.planoBackdrop} onClick={(event) => { if (event.target === event.currentTarget) setAberto(false) }}>
      <section role="dialog" aria-modal="true" aria-labelledby="plano-comercial-titulo" className={styles.planoJanela}>
        <header className={styles.planoCabecalho}>
          <div className={styles.planoIdentificacao}>
            <span className={styles.planoEyebrow}>Expresso Geral · Relacionamento comercial</span>
            <h2 id="plano-comercial-titulo">{expresso.nome || 'Ponto de venda'}</h2>
            <div className={styles.planoLocal}>{expresso.municipio || 'Município não informado'} <span>·</span> Agência {expresso.agencia || '—'} / PACB {expresso.pacb || '—'}</div>
          </div>
          <button type="button" onClick={() => setAberto(false)} aria-label="Fechar plano comercial" className={styles.planoFechar}>✕</button>
        </header>

        <nav className={styles.planoAbas} aria-label="Seções do plano comercial">
          {(['roteiro', 'historico'] as const).map((item) => (
            <button key={item} type="button" onClick={() => setAba(item)} aria-current={aba === item ? 'page' : undefined} className={`${styles.planoAba} ${aba === item ? styles.planoAbaAtiva : ''}`}>
              {item === 'roteiro' ? 'Roteiro de conversa' : <>Histórico <span className={styles.planoContagem}>{historico.length}</span></>}
            </button>
          ))}
        </nav>

        <div className={styles.planoConteudo}>
          {erro && <div role="alert" className={`${styles.planoAviso} ${styles.planoErro}`}>{erro}</div>}
          {sucesso && <div role="status" className={`${styles.planoAviso} ${styles.planoSucesso}`}>{sucesso}</div>}
          {carregando && <div className={styles.planoCarregando}><span className={styles.planoSpinner} />Carregando histórico e comissões…</div>}

          {aba === 'roteiro' && <>
            <div className={styles.planoGradePrincipal}>
              <aside className={styles.planoPainelProduto}>
                <label className={styles.planoLabel} htmlFor="plano-produto">Produto para conversar</label>
                <select id="plano-produto" value={produtoId} onChange={(event) => setProdutoId(event.target.value)} className={`${styles.planoCampo} ${styles.planoSelect}`}>
                  {ROTEIROS_COMERCIAIS.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                </select>
                <div className={styles.planoComissoes}>
                  <div className={styles.planoSecaoTitulo}>Comissão no simulador</div>
                  {comissoesProduto.length ? comissoesProduto.map((item) => (
                    <div key={item.id} className={styles.planoComissaoLinha}><span>{item.label}</span><strong>{item.type === 'percent' ? `${item.value}%` : dinheiro(item.value)}</strong></div>
                  )) : <div className={styles.planoComissaoVazia}>{comissaoIds.length ? 'Comissão não localizada no simulador.' : 'Sem comissão cadastrada para esta atividade.'}</div>}
                </div>
                <a href={produto.id === 'pessoal' ? '/dashboard/cursos/emprestimo-pessoal' : produto.id === 'inss' ? '/dashboard/cursos/consignadoinss' : produto.id === 'vivavida' ? '/dashboard/cursos/vivavida' : produto.id === 'micro' ? '/dashboard/cursos/microsseguro' : produto.id === 'dental' ? '/dashboard/cursos/dental' : produto.id === 'residencial' ? '/dashboard/cursos/seguroresidencial' : produto.id === 'conta' || produto.id === 'cartao' ? '/dashboard/cursos/contacorrente' : '/dashboard/cursos'} className={styles.planoCursoLink}>Abrir curso ou material <span aria-hidden="true">↗</span></a>
                <p className={styles.planoAjuda}>Use este guia como apoio. Consulte o curso para revisar detalhes e condições atuais do produto.</p>
              </aside>

              <article className={styles.planoRoteiroCard}>
                <div className={styles.planoRoteiroTopo}>
                  <div><span className={styles.planoEyebrow}>Guia rápido</span><h3>Conduza a conversa</h3></div>
                  <button type="button" onClick={() => navigator.clipboard?.writeText(roteiroTexto)} className={styles.planoCopiar}>Copiar roteiro</button>
                </div>
                <p className={styles.planoRoteiroTexto}>{roteiroTexto}</p>
              </article>
            </div>

            <form onSubmit={registrarInteracao} className={styles.planoRegistro}>
              <div className={styles.planoRegistroTopo}>
                <div><span className={styles.planoEyebrow}>Acompanhamento</span><h3>Registrar contato</h3></div>
                <span className={styles.planoRegistroDica}>O registro fica vinculado a este ponto de venda.</span>
              </div>
              <div className={styles.planoFormGrade}>
                <label className={styles.planoLabel}>Tipo de contato<select value={tipo} onChange={(event) => setTipo(event.target.value)} className={styles.planoCampo}><option>Ligação</option><option>Visita presencial</option><option>Treinamento</option><option>WhatsApp</option><option>Envio de material</option></select></label>
                <label className={styles.planoLabel}>Resultado<select value={resultado} onChange={(event) => setResultado(event.target.value)} className={styles.planoCampo}>{OPCOES_RESULTADO.map((item) => <option key={item}>{item}</option>)}</select></label>
              </div>
              <fieldset className={styles.planoProdutosFieldset}>
                <legend className={styles.planoLabel}>Produtos conversados <span className={styles.planoOpcional}>Opcional</span></legend>
                <div className={styles.planoProdutosGrade}>
                  {ROTEIROS_COMERCIAIS.map((item) => <label key={item.id} className={`${styles.planoCheckbox} ${produtosFalados.includes(item.id) ? styles.planoCheckboxAtivo : ''}`}><input type="checkbox" checked={produtosFalados.includes(item.id)} onChange={() => alternarProduto(item.id)} /><span>{item.nome}</span></label>)}
                </div>
              </fieldset>
              <label className={styles.planoLabel}>Resumo do contato<textarea value={observacoes} onChange={(event) => setObservacoes(event.target.value)} rows={3} placeholder="Necessidades, dúvidas, objeções e combinados…" className={`${styles.planoCampo} ${styles.planoObservacoes}`} /><span className={styles.planoAjuda}>Não registre senhas, códigos de segurança ou dados bancários sensíveis.</span></label>
              <div className={styles.planoSalvarLinha}>
                <label className={`${styles.planoLabel} ${styles.planoDataLabel}`}>Próximo contato <span className={styles.planoOpcional}>Opcional</span><input type="date" value={proximoContato} onChange={(event) => setProximoContato(event.target.value)} className={styles.planoCampo} /></label>
                <button disabled={salvando} type="submit" className={styles.planoSalvar}>{salvando ? 'Salvando…' : 'Salvar no histórico'}</button>
              </div>
            </form>
          </>}

          {aba === 'historico' && <div className={styles.planoHistorico}>
            <div className={styles.planoHistoricoTopo}><div><span className={styles.planoEyebrow}>Linha do tempo</span><h3>Histórico de contatos</h3></div><button type="button" onClick={() => setAba('roteiro')} className={styles.planoNovoContato}>+ Registrar contato</button></div>
            {historico.length === 0 && !carregando && <div className={styles.planoHistoricoVazio}><span className={styles.planoVazioIcone}>◷</span><strong>Nenhum contato registrado ainda</strong><p>Registre ligações, visitas e treinamentos para acompanhar o relacionamento com este ponto.</p><button type="button" onClick={() => setAba('roteiro')} className={styles.planoNovoContato}>Registrar primeiro contato</button></div>}
            {historico.map((item) => <article key={item.id} className={styles.planoHistoricoCard}>
              <div className={styles.planoHistoricoCardTopo}><div className={styles.planoHistoricoTitulo}><span className={styles.planoHistoricoPonto} /> <strong>{item.tipo}</strong><span className={styles.planoResultado}>{item.resultado}</span></div><time>{formatarData(item.createdAt)}</time></div>
              {item.produtos?.length > 0 && <div className={styles.planoHistoricoProdutos}><b>Produtos:</b> {item.produtos.map((id) => ROTEIROS_COMERCIAIS.find((p) => p.id === id)?.nome || id).join(', ')}</div>}
              {item.observacoes && <p className={styles.planoHistoricoTexto}>{item.observacoes}</p>}
              {item.proximoContato && <div className={styles.planoProximoContato}>Próximo contato: {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' }).format(new Date(`${item.proximoContato}T12:00:00Z`))}</div>}
              {item.createdBy && <div className={styles.planoHistoricoAutor}>Registrado por {item.createdBy}</div>}
            </article>)}
          </div>}
        </div>
      </section>
      </div>
    ),
    document.body
  )
}
