'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import styles from './ConsignadoINSSSimulator.module.css'

type Step =
  | 'welcome'
  | 'errors'
  | 'cpf'
  | 'unlock'
  | 'faceInfo'
  | 'faceCapture'
  | 'dataprev'
  | 'offers'
  | 'offerSummary'
  | 'custom'
  | 'customSummary'
  | 'authorizations'
  | 'review'
  | 'finalFaceInfo'
  | 'finalFaceCapture'
  | 'done'

type Offer = {
  id: string
  title: string
  kind: 'Novo' | 'Refin'
  available: number
  balance?: number
  installments: number
  payment: number
}

const offers: Offer[] = [
  { id: 'novo', title: 'PENSÃO POR MORTE', kind: 'Novo', available: 18843.48, installments: 108, payment: 427.38 },
  { id: 'refin', title: 'APOSENTADORIA POR IDADE', kind: 'Refin', available: 408.18, balance: 8802.62, installments: 108, payment: 211.64 },
]

const monthlyRate = 0.0185
const demoClient = {
  name: 'Marcelo Sant Anna',
  cpf: 'xxx.xxx.xxx-xx',
  agency: 'xxxx',
  account: 'xxxxxx-x',
}

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(value) ? value : 0)
}

function currencyDigits(value: string) {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return (Number(digits) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseMoney(value: string) {
  return Number(value.replace(/\./g, '').replace(',', '.')) || 0
}

function estimatePayment(amount: number, count: number) {
  if (amount <= 0 || count <= 0) return 0
  return amount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -count))
}

function formatDate(value: string) {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

function getFollowingDate() {
  const date = new Date()
  const firstNextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1)
  const lastDay = new Date(firstNextMonth.getFullYear(), firstNextMonth.getMonth() + 1, 0).getDate()
  firstNextMonth.setDate(Math.min(30, lastDay))
  return `${firstNextMonth.getFullYear()}-${String(firstNextMonth.getMonth() + 1).padStart(2, '0')}-${String(firstNextMonth.getDate()).padStart(2, '0')}`
}

export default function ConsignadoINSSSimulator() {
  const [step, setStep] = useState<Step>('welcome')
  const [cpf, setCpf] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [benefitUnlocked, setBenefitUnlocked] = useState(false)
  const [dataprevAccepted, setDataprevAccepted] = useState(false)
  const [selectedOfferId, setSelectedOfferId] = useState('')
  const [customValue, setCustomValue] = useState('1.393,73')
  const [customInstallments, setCustomInstallments] = useState(92)
  const [firstDueDate, setFirstDueDate] = useState(getFollowingDate)
  const [customCalculated, setCustomCalculated] = useState(false)
  const [authorizeRetry, setAuthorizeRetry] = useState(false)
  const [authorizeCreditLimit, setAuthorizeCreditLimit] = useState(false)

  const selectedOffer = offers.find((offer) => offer.id === selectedOfferId) || null
  const customAmount = parseMoney(customValue)
  const customPayment = useMemo(() => estimatePayment(customAmount, customInstallments), [customAmount, customInstallments])
  const customTotal = customPayment * customInstallments
  const selectedContractAmount = selectedOffer
    ? selectedOffer.available + (selectedOffer.balance || 0)
    : 0
  const selectedTotal = selectedOffer ? selectedOffer.payment * selectedOffer.installments : 0

  const validationSteps: Step[] = ['cpf', 'unlock', 'faceInfo', 'faceCapture', 'dataprev']
  const simulationSteps: Step[] = ['offers', 'offerSummary', 'custom', 'customSummary']
  const stage = step === 'welcome' || validationSteps.includes(step)
    ? 0
    : simulationSteps.includes(step)
      ? 1
      : 2

  function goTo(next: Step) {
    setError('')
    setNotice('')
    setStep(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function back() {
    const previous: Partial<Record<Step, Step>> = {
      cpf: 'welcome',
      unlock: 'cpf',
      faceInfo: 'unlock',
      faceCapture: 'faceInfo',
      dataprev: 'faceCapture',
      offers: 'dataprev',
      offerSummary: 'offers',
      custom: 'offerSummary',
      customSummary: 'custom',
      authorizations: customCalculated ? 'customSummary' : 'offerSummary',
      review: 'authorizations',
      finalFaceInfo: 'review',
      finalFaceCapture: 'finalFaceInfo',
    }
    const target = previous[step]
    if (target) goTo(target)
  }

  function submitCpf() {
    const digits = cpf.replace(/\D/g, '')
    if (digits.length !== 11) {
      setError('Digite os 11 números do CPF para avançar nesta demonstração.')
      return
    }
    goTo('unlock')
  }

  function startCustomSimulation() {
    if (customAmount < 100) {
      setError('O valor da simulação deve ser de pelo menos R$ 100,00.')
      return
    }
    if (customAmount > 18843.48) {
      setError('O valor deve respeitar o limite ilustrativo de R$ 18.843,48.')
      return
    }
    if (customInstallments < 91 || customInstallments > 108) {
      setError('Escolha um prazo entre 91 e 108 parcelas.')
      return
    }
    if (!firstDueDate) {
      setError('Informe a data desejada para o vencimento da primeira parcela.')
      return
    }
    setCustomCalculated(true)
    goTo('customSummary')
  }

  function finishSimulation() {
    goTo('done')
    setNotice('Demonstração finalizada. Nenhuma proposta real foi enviada ou contratada.')
  }

  function restart() {
    setCpf('')
    setError('')
    setNotice('')
    setBenefitUnlocked(false)
    setDataprevAccepted(false)
    setSelectedOfferId('')
    setCustomValue('1.393,73')
    setCustomInstallments(92)
    setFirstDueDate(getFollowingDate())
    setCustomCalculated(false)
    setAuthorizeRetry(false)
    setAuthorizeCreditLimit(false)
    goTo('welcome')
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.brand} aria-label="Voltar ao painel do portal">
          <Image src="/logos/logobradescoexpresso.png" alt="Bradesco Expresso" width={190} height={80} priority />
        </Link>
        <span className={styles.trainingBadge}>Simulador demonstrativo</span>
      </header>
      <div className={styles.redBar} />

      <div className={styles.content}>
        {step === 'errors' && (
          <div className={styles.errorBackRow}>
            <button type="button" className={styles.backButton} onClick={() => goTo('welcome')}>← <span>Voltar ao simulador</span></button>
          </div>
        )}

        {step !== 'welcome' && step !== 'done' && step !== 'errors' && (
          <div className={styles.topControls}>
            <button type="button" className={styles.backButton} onClick={back} aria-label="Voltar uma etapa">← <span>Voltar</span></button>
            <Progress stage={stage} />
          </div>
        )}

        {step === 'welcome' && (
          <section className={styles.welcome}>
            <div className={styles.titleBlock}>
              <span className={styles.eyebrow}>Jornada de treinamento</span>
              <h1>SIMULADOR EMPRÉSTIMO CONSIGNADO INSS</h1>
              <p>Explore as principais etapas da contratação com o cliente, da validação do benefício à autorização final.</p>
            </div>

            <button type="button" className={styles.productTile} onClick={() => goTo('cpf')} aria-label="Abrir simulador de Crédito Consignado INSS">
              <span className={styles.productAccent} />
              <span className={styles.productIcon}>▤<b>＋</b></span>
              <span>Crédito Consignado INSS</span>
              <span className={styles.productArrow}>›</span>
            </button>

            <div className={styles.eligibilityNotice}>
              <span className={styles.noticeIcon}>i</span>
              <p>
                Para realizar o empréstimo consignado nesse canal, o cliente precisa ser correntista Bradesco e receber o benefício por essa conta-corrente. Pessoas com <strong>conta-benefício</strong> não podem contratar consignado por esse canal.
              </p>
            </div>

            <section className={styles.benefitSection}>
              <div>
                <span className={styles.sectionEyebrow}>Exemplo para treinamento</span>
                <h2>Confira o tipo de conta do cliente</h2>
                <p>O cartão de benefício é diferente da conta-corrente habilitada para esta jornada.</p>
              </div>
              <IllustrativeBenefitCard />
            </section>

            <section className={styles.flowSection}>
              <div className={styles.sectionHeading}>
                <span className={styles.sectionEyebrow}>Antes de começar</span>
                <h2>Fique atento ao fluxo da contratação</h2>
                <p>Antes de iniciar o consignado, explique ao cliente estes pontos:</p>
              </div>
              <div className={styles.flowImage}>
                <Image
                  src="/simuladores/consignado-inss/fluxo-contratacao.jpg"
                  alt="Fluxo: desbloquear o benefício no Meu INSS, seguir pela Plataforma Expresso, confirmar no Meu INSS e aguardar a liberação do crédito"
                  width={1162}
                  height={960}
                  sizes="(max-width: 760px) 100vw, 1100px"
                />
              </div>
            </section>

            <div className={styles.centerActions}>
              <div className={styles.introActionRow}>
                <button type="button" className={styles.primaryButton} onClick={() => goTo('cpf')}>Iniciar simulador <span>→</span></button>
                <button type="button" className={styles.secondaryButton} onClick={() => goTo('errors')}>⚠️ Possíveis erros</button>
              </div>
              <p>Etapas demonstrativas. Nenhum dado ou pedido será enviado ao banco.</p>
            </div>
          </section>
        )}

        {step === 'errors' && (
          <Screen title="Possíveis erros e como orientar" subtitle="Se alguma destas mensagens aparecer, confira os pontos abaixo com o cliente antes de tentar novamente.">
            <div className={styles.errorCases}>
              <article className={styles.errorCase}>
                <span className={styles.errorCaseIcon}>⛔</span>
                <div>
                  <span className={styles.sectionEyebrow}>Mensagem de elegibilidade</span>
                  <h2>“Não é possível continuar a contratação”</h2>
                  <p>O benefício pode não atender aos critérios para contratação do consignado INSS neste momento.</p>
                  <ul>
                    <li>Confira se a aposentadoria ou pensão já tem mais de 90 dias.</li>
                    <li>Confirme se o benefício está desbloqueado para empréstimo no Meu INSS.</li>
                  </ul>
                </div>
              </article>
              <article className={styles.errorCase}>
                <span className={styles.errorCaseIcon}>🔄</span>
                <div>
                  <span className={styles.sectionEyebrow}>Mensagem temporária</span>
                  <h2>“Algo deu errado. Por favor, tente mais tarde.”</h2>
                  <p>Peça ao cliente para acessar o aplicativo Bradesco com a própria conta e pesquisar por “Crédito Consignado INSS” ou pelo nome do serviço. Se o erro continuar, confira também os dados cadastrais e a prova de vida descritos abaixo.</p>
                </div>
              </article>
            </div>

            <section className={styles.regularizationPanel}>
              <div className={styles.sectionHeading}>
                <span className={styles.sectionEyebrow}>Orientação para regularizar</span>
                <h2>O que verificar com o cliente</h2>
              </div>
              <ol className={styles.regularizationList}>
                <li><span>1</span><p><strong>Benefício:</strong> confirme se está desbloqueado no Meu INSS e se já completou 90 dias, quando esse critério se aplicar.</p></li>
                <li><span>2</span><p><strong>Cadastro na agência:</strong> confira se os dados da conta e do CPF estão atualizados. O endereço residencial cadastrado no banco deve ser o mesmo que consta no Meu INSS; mantenha apenas um endereço residencial atualizado.</p></li>
                <li><span>3</span><p><strong>Prova de vida:</strong> verifique se está atualizada. Ela pode ser realizada no tablet quando essa opção estiver disponível na jornada.</p></li>
                <li><span>4</span><p><strong>Nova tentativa:</strong> depois de concluir as atualizações, aguarde 24 horas e tente novamente.</p></li>
              </ol>
              <div className={styles.errorContactNote}><strong>Se o erro persistir</strong><span>Após os procedimentos e o prazo de espera, fale com nossa equipe para ajudar na verificação.</span></div>
              <p className={styles.privacyNote}>O cliente deve acessar os próprios aplicativos e nunca compartilhar senha ou código de segurança.</p>
            </section>

            <div className={styles.footerActions}>
              <button type="button" className={styles.primaryButton} onClick={() => goTo('welcome')}>Voltar ao início <span>→</span></button>
            </div>
          </Screen>
        )}

        {step === 'cpf' && (
          <Screen title="Crédito Consignado INSS" subtitle="Simule agora e conheça a jornada de contratação.">
            <div className={styles.cpfPanel}>
              <div>
                <span className={styles.sectionEyebrow}>Simule agora</span>
                <h2>Informe o CPF da pessoa</h2>
                <p>Esta demonstração valida apenas o formato. O CPF digitado não é guardado nem enviado.</p>
              </div>
              <div className={styles.cpfEntry}>
                <label htmlFor="cpf-demo">CPF da pessoa</label>
                <input
                  id="cpf-demo"
                  value={cpf}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, '').slice(0, 11)
                    const formatted = digits.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
                    setCpf(formatted)
                    setError('')
                  }}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={14}
                  placeholder="000.000.000-00"
                />
                <span className={styles.inputHint}>Digite 11 números para continuar.</span>
              </div>
            </div>
            <FooterActions error={error} onContinue={submitCpf} continueLabel="Consultar benefício" />
          </Screen>
        )}

        {step === 'unlock' && (
          <Screen title="Antes de começar, desbloqueie o benefício" subtitle="O desbloqueio deve ser feito no Meu INSS antes de cada nova contratação.">
            <div className={styles.instructionPanel}>
              <div className={styles.instructionLead}><span>🔓</span><div><strong>Como desbloquear o benefício</strong><small>Oriente a pessoa a acessar o aplicativo ou portal Meu INSS com sua conta gov.br.</small></div></div>
              <ol className={styles.numberedList}>
                <li><span>1</span><p>Acesse <strong>Do que você precisa?</strong> no Meu INSS.</p></li>
                <li><span>2</span><p>Busque <strong>desbloquear</strong> e escolha “Bloquear/Desbloquear Benefício para Empréstimo Consignado”.</p></li>
                <li><span>3</span><p>Selecione o benefício e siga as instruções do aplicativo.</p></li>
                <li><span>4</span><p>Envie uma foto de um documento de identificação, se o Meu INSS solicitar.</p></li>
                <li><span>5</span><p>Depois de concluir, volte para continuar a simulação.</p></li>
              </ol>
            </div>
            <div className={styles.attentionNotice}><strong>Importante</strong><span>Se o benefício continuar bloqueado, interrompa a jornada e ajude o cliente a concluir o desbloqueio no Meu INSS.</span></div>
            <label className={styles.checkRow}><input type="checkbox" checked={benefitUnlocked} onChange={(event) => setBenefitUnlocked(event.target.checked)} /><span>A pessoa já desbloqueou o benefício</span></label>
            {!benefitUnlocked && <p className={styles.smallNote}>Marque a confirmação para liberar a próxima etapa.</p>}
            <FooterActions error={error} onContinue={() => benefitUnlocked ? goTo('faceInfo') : setError('Confirme o desbloqueio do benefício para continuar.')} continueLabel="Continuar" disabled={!benefitUnlocked} />
          </Screen>
        )}

        {step === 'faceInfo' && (
          <Screen title="Reconhecimento facial" subtitle="Prepare a pessoa para fazer a biometria facial de quem solicitará o crédito.">
            <div className={styles.faceIntro}>
              <div className={styles.faceIllustration}><span>◉</span><b>✓</b></div>
              <div className={styles.faceTips}>
                <Tip icon="☀" text="Escolha um local bem iluminado." />
                <Tip icon="◉" text="Peça para retirar boné, óculos escuros ou acessórios que cubram o rosto." />
                <Tip icon="▣" text="Mantenha a câmera na altura do rosto e siga as instruções da tela." />
              </div>
            </div>
            <FooterActions error={error} onContinue={() => goTo('faceCapture')} continueLabel="Continuar para a biometria" />
          </Screen>
        )}

        {step === 'faceCapture' && (
          <Screen title="Reconhecimento facial" subtitle="Posicione o rosto dentro da área indicada.">
            <FaceCapture note="Sempre faça a biometria em um local com boa iluminação." onContinue={() => goTo('dataprev')} continueLabel="Continuar" />
          </Screen>
        )}

        {step === 'dataprev' && (
          <Screen title="Autorize a consulta do benefício" subtitle="A consulta permite visualizar as informações do benefício disponíveis para a simulação.">
            <div className={styles.authorizationPanel}>
              <div className={styles.dataprevIllustration}><span>▤</span><b>✓</b></div>
              <h2>Peça autorização para consultar os dados do benefício</h2>
              <p>Explique que as informações disponíveis na Dataprev serão usadas para apresentar as opções de crédito. Peça que a pessoa leia e autorize antes de continuar.</p>
              <label className={styles.checkRow}><input type="checkbox" checked={dataprevAccepted} onChange={(event) => setDataprevAccepted(event.target.checked)} /><span>Li e concordo com o termo de autorização para consulta</span></label>
              <p className={styles.smallNote}>Tela de demonstração: nenhuma consulta real é feita.</p>
              {!dataprevAccepted && <p className={styles.smallNote}>Marque a autorização para liberar as ofertas demonstrativas.</p>}
            </div>
            <FooterActions error={error} onContinue={() => dataprevAccepted ? goTo('offers') : setError('Marque o aceite de demonstração para prosseguir.')} continueLabel="Ver opções de simulação" disabled={!dataprevAccepted} />
          </Screen>
        )}

        {step === 'offers' && (
          <Screen title="Selecione uma opção" subtitle="As opções abaixo são exemplos visuais. A disponibilidade real depende da análise do banco.">
            <div className={styles.offerList}>
              {offers.map((offer, index) => (
                <button
                  key={offer.id}
                  type="button"
                  className={`${styles.offerCard} ${selectedOfferId === offer.id ? styles.offerSelected : ''}`}
                  onClick={() => { setSelectedOfferId(offer.id); setError('') }}
                  aria-pressed={selectedOfferId === offer.id}
                >
                  <span className={`${styles.offerAccent} ${index === 1 ? styles.offerAccentPurple : ''}`} />
                  <span className={styles.offerText}>
                    <strong>{money(offer.available)}</strong>
                    <span>{offer.title}</span>
                    {offer.balance && <small>Saldo devedor: <b>{money(offer.balance)}</b></small>}
                  </span>
                  <span className={styles.offerChevron}>{selectedOfferId === offer.id ? '✓' : '›'}</span>
                </button>
              ))}
            </div>
            <div className={styles.attentionNotice}><strong>Fique atento</strong><span>Alguns clientes podem visualizar somente uma oferta; outros podem ter duas. Quando aparecer saldo devedor, trata-se de um refinanciamento (refin).</span></div>
            {!selectedOffer && <p className={styles.smallNote}>Selecione uma opção para ativar o botão de continuar.</p>}
            <FooterActions error={error} onContinue={() => selectedOffer ? goTo('offerSummary') : setError('Selecione uma oferta para continuar.')} continueLabel="Continuar com esta opção" disabled={!selectedOffer} />
          </Screen>
        )}

        {step === 'offerSummary' && selectedOffer && (
          <Screen title="Esta é a oferta selecionada" subtitle="A pessoa pode contratar o valor apresentado ou fazer uma simulação personalizada.">
            <LoanSummary
              title={selectedOffer.kind === 'Refin' ? 'Resumo do refinanciamento' : 'Resumo do empréstimo'}
              requested={selectedOffer.available}
              gross={selectedContractAmount}
              installments={selectedOffer.installments}
              payment={selectedOffer.payment}
              total={selectedTotal}
              firstDue={formatDate(getFollowingDate())}
              balance={selectedOffer.balance}
            />
            <div className={styles.attentionNotice}><strong>Importante</strong><span>Valores, parcelas e condições nesta página são ilustrativos. A proposta real deve ser conferida no sistema oficial antes de qualquer contratação.</span></div>
            <div className={styles.actionStack}>
              <button type="button" className={styles.primaryButton} onClick={() => { setCustomCalculated(false); goTo('authorizations') }}>Continuar com a oferta</button>
              <button type="button" className={styles.secondaryButton} onClick={() => { setCustomCalculated(false); goTo('custom') }}>Refazer simulação personalizada</button>
              <button type="button" className={styles.textButton} onClick={() => goTo('offers')}>Escolher outra oferta</button>
            </div>
          </Screen>
        )}

        {step === 'custom' && (
          <Screen title="Vamos fazer uma simulação personalizada" subtitle="Informe o valor, o prazo e quando a pessoa gostaria de começar a pagar.">
            <div className={styles.customForm}>
              <label><span>De quanto a pessoa precisa?</span><div className={styles.currencyInput}><b>R$</b><input inputMode="decimal" value={customValue} onChange={(event) => { setCustomValue(currencyDigits(event.target.value)); setError('') }} aria-label="Valor desejado" /></div><small>Exemplo para treinamento: de R$ 100,00 até R$ 18.843,48.</small></label>
              <label><span>Em quantas parcelas?</span><select value={customInstallments} onChange={(event) => setCustomInstallments(Number(event.target.value))}>{Array.from({ length: 18 }, (_, index) => 91 + index).map((count) => <option key={count} value={count}>{count} parcelas</option>)}</select><small>Escolha um prazo entre 91 e 108 parcelas.</small></label>
              <label><span>Quando quer começar a pagar?</span><input type="date" value={firstDueDate} onChange={(event) => setFirstDueDate(event.target.value)} /></label>
            </div>
            <div className={styles.rateInfo}><span>Taxa usada apenas nesta demonstração</span><strong>1,85% ao mês · 24,60% ao ano</strong></div>
            <FooterActions error={error} onContinue={startCustomSimulation} continueLabel="Simular valor" />
          </Screen>
        )}

        {step === 'customSummary' && (
          <Screen title="Resumo do valor solicitado" subtitle="Confira a estimativa antes de seguir para as autorizações.">
            <LoanSummary title="Simulação personalizada" requested={customAmount} gross={customAmount} installments={customInstallments} payment={customPayment} total={customTotal} firstDue={formatDate(firstDueDate)} />
            <p className={styles.disclaimer}>Cálculo demonstrativo com taxa fixa de referência de 1,85% ao mês. A taxa, o prazo, o valor liberado e a aprovação reais dependem da proposta apresentada no canal oficial.</p>
            <div className={styles.actionStack}>
              <button type="button" className={styles.primaryButton} onClick={() => goTo('authorizations')}>Continuar com esta simulação</button>
              <button type="button" className={styles.secondaryButton} onClick={() => goTo('custom')}>Refazer valores</button>
            </div>
          </Screen>
        )}

        {step === 'authorizations' && (
          <Screen title="Autorizações finais" subtitle="Explique cada autorização e peça o consentimento da pessoa antes de marcar.">
            <div className={styles.clientMiniCard}><span>Dados ilustrativos do cliente</span><strong>{demoClient.name}</strong><small>Ag.: {demoClient.agency} | C/C: {demoClient.account}</small></div>
            <p className={styles.bodyCopy}>Ao continuar, a pessoa autoriza que, se a parcela não for descontada do benefício no vencimento, o débito possa ser feito na conta indicada, conforme as condições informadas no canal oficial.</p>
            <div className={styles.consentList}>
              <label className={styles.checkRow}><input type="checkbox" checked={authorizeRetry} onChange={(event) => setAuthorizeRetry(event.target.checked)} /><span>Autorizo novas tentativas de débito da parcela vencida, inclusive de valores parciais, utilizando o saldo disponível na conta.</span></label>
              <label className={styles.checkRow}><input type="checkbox" checked={authorizeCreditLimit} onChange={(event) => setAuthorizeCreditLimit(event.target.checked)} /><span>Autorizo o débito da parcela utilizando o limite de crédito disponível na conta, ciente de que a liberação está sujeita à análise de crédito.</span></label>
            </div>
            {(!authorizeRetry || !authorizeCreditLimit) && <p className={styles.smallNote}>Marque as autorizações somente depois de explicá-las ao cliente.</p>}
            <p className={styles.smallNote}>Na operação real, essas autorizações ficam válidas até a quitação do contrato ou sua revogação.</p>
            <FooterActions error={error} onContinue={() => authorizeRetry && authorizeCreditLimit ? goTo('review') : setError('Para continuar nesta demonstração, marque as duas autorizações após explicá-las ao cliente.')} continueLabel="Revisar dados do empréstimo" disabled={!authorizeRetry || !authorizeCreditLimit} />
          </Screen>
        )}

        {step === 'review' && (
          <Screen title="Peça para a pessoa conferir os dados" subtitle="Confira junto com o cliente as informações da proposta antes de continuar.">
            <div className={styles.reviewCard}>
              <ReviewRow label="Nome completo" value={demoClient.name} />
              <ReviewRow label="CPF" value={demoClient.cpf} />
              <ReviewRow label="Conta de crédito" value={`Ag.: ${demoClient.agency} | C/C: ${demoClient.account}`} />
              <ReviewRow label="Valor solicitado" value={money(customCalculated ? customAmount : selectedOffer?.available || 0)} />
              <ReviewRow label="Valor bruto do empréstimo" value={money(customCalculated ? customAmount : selectedContractAmount)} />
              {selectedOffer?.balance && !customCalculated && <ReviewRow label="Saldo devedor refinanciado" value={money(selectedOffer.balance)} />}
              <ReviewRow label="Juros" value="1,85% ao mês · 24,60% ao ano" />
              <ReviewRow label="Parcelas" value={`${customCalculated ? customInstallments : selectedOffer?.installments || 0} parcelas`} />
              <ReviewRow label="Valor estimado da parcela" value={money(customCalculated ? customPayment : selectedOffer?.payment || 0)} />
              <ReviewRow label="Total estimado das parcelas" value={money(customCalculated ? customTotal : selectedTotal)} />
              <ReviewRow label="Vencimento da primeira parcela" value={customCalculated ? formatDate(firstDueDate) : formatDate(getFollowingDate())} />
              <ReviewRow label="Vencimento da última parcela" value={customCalculated ? addMonths(firstDueDate, customInstallments - 1) : addMonths(getFollowingDate(), (selectedOffer?.installments || 1) - 1)} />
            </div>
            <div className={styles.attentionNotice}><strong>Confira com atenção</strong><span>Esta tela não substitui o resumo oficial do contrato. No atendimento real, confirme todos os dados exibidos no sistema antes de prosseguir.</span></div>
            <FooterActions error={error} onContinue={() => goTo('finalFaceInfo')} continueLabel="Continuar para a última biometria" />
          </Screen>
        )}

        {step === 'finalFaceInfo' && (
          <Screen title="Último reconhecimento facial" subtitle="Peça que o próprio cliente faça a biometria para confirmar a contratação.">
            <div className={styles.faceIntro}>
              <div className={styles.faceIllustration}><span>◉</span><b>✓</b></div>
              <div className={styles.faceTips}>
                <Tip icon="☀" text="Use um local bem iluminado." />
                <Tip icon="◉" text="Deixe o rosto descoberto, sem boné ou óculos escuros." />
                <Tip icon="▣" text="Mantenha a câmera na altura do rosto e siga as instruções." />
              </div>
            </div>
            <FooterActions error={error} onContinue={() => goTo('finalFaceCapture')} continueLabel="Continuar" />
          </Screen>
        )}

        {step === 'finalFaceCapture' && (
          <Screen title="Reconhecimento facial final" subtitle="Na jornada real, o cliente confirma sua identidade nesta etapa.">
            <FaceCapture note="Faça a biometria em um local com boa iluminação." onContinue={finishSimulation} continueLabel="Finalizar demonstração" />
          </Screen>
        )}

        {step === 'done' && (
          <Screen title="Demonstração concluída" subtitle="Na contratação real, ainda é necessário concluir a autorização no Meu INSS.">
            <div className={styles.successPanel}>
              <div className={styles.successIcon}>✓</div>
              <h2>Para concluir, o cliente deve autorizar a solicitação pelo Meu INSS em até 5 dias.</h2>
              <p>Acompanhe as notificações do Meu INSS. A liberação do crédito depende da confirmação e da análise da instituição.</p>
              <div className={styles.demoReceipt}><strong>Simulação demonstrativa</strong><span>Nenhuma proposta real foi enviada, contratada ou consultada.</span></div>
            </div>
            {notice && <p className={styles.noticeText}>{notice}</p>}
            <div className={styles.actionStack}>
              <button type="button" className={styles.secondaryButton} onClick={() => setNotice('Nesta demonstração, o comprovante não é enviado por e-mail.')}>✉ Simular envio de comprovante por e-mail</button>
              <button type="button" className={styles.secondaryButton} onClick={() => window.print()}>Imprimir resumo demonstrativo</button>
              <button type="button" className={styles.primaryButton} onClick={restart}>Iniciar novamente</button>
              <Link href="/dashboard" className={styles.textButton}>Voltar ao portal</Link>
            </div>
          </Screen>
        )}

        {error && step === 'welcome' && <p className={styles.globalError} role="alert">{error}</p>}
      </div>
      <footer className={styles.footer}><span>Material de capacitação do TreinExpresso</span><span>Uso demonstrativo · Consulte as condições no sistema oficial</span></footer>
    </main>
  )
}

function Screen({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className={styles.screen}>
      <div className={styles.screenHeading}><span className={styles.sectionEyebrow}>Crédito Consignado INSS</span><h1>{title}</h1><p>{subtitle}</p></div>
      {children}
    </section>
  )
}

function Progress({ stage }: { stage: number }) {
  const labels = ['Validação', 'Simulação', 'Confirmação']
  return (
    <div className={styles.progress} aria-label={`Etapa ${stage + 1} de 3: ${labels[stage]}`}>
      {labels.map((label, index) => <div key={label} className={`${styles.progressItem} ${index < stage ? styles.progressComplete : ''} ${index === stage ? styles.progressCurrent : ''}`}><span>{index < stage ? '✓' : index + 1}</span><small>{label}</small></div>)}
    </div>
  )
}

function FooterActions({ error, onContinue, continueLabel, disabled = false }: { error: string; onContinue: () => void; continueLabel: string; disabled?: boolean }) {
  return (
    <div className={styles.footerActions}>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button type="button" className={styles.primaryButton} onClick={onContinue} disabled={disabled}>{continueLabel} <span>→</span></button>
      <span className={styles.actionHint}>Confira as informações com o cliente antes de avançar.</span>
    </div>
  )
}

function Tip({ icon, text }: { icon: string; text: string }) {
  return <div className={styles.tip}><span>{icon}</span><p>{text}</p></div>
}

function FaceCapture({ note, onContinue, continueLabel }: { note: string; onContinue: () => void; continueLabel: string }) {
  return (
    <div className={styles.captureWrap}>
      <div className={styles.faceOval}><span>Posicione seu rosto<br />no oval</span></div>
      <p className={styles.captureNote}>☀ {note}</p>
      <button type="button" className={styles.primaryButton} onClick={onContinue}>{continueLabel} <span>→</span></button>
      <small className={styles.smallNote}>Espaço ilustrativo; esta página não acessa a câmera.</small>
    </div>
  )
}

function LoanSummary({ title, requested, gross, installments, payment, total, firstDue, balance }: { title: string; requested: number; gross: number; installments: number; payment: number; total: number; firstDue: string; balance?: number }) {
  return (
    <div className={styles.loanSummary}>
      <div className={styles.summaryHeader}><span>Simulação · Confirmação</span><h2>{title}</h2></div>
      <div className={styles.paymentHero}><strong>{installments}x de {money(payment)}</strong><span>Valor liberado estimado: <b>{money(requested)}</b></span></div>
      <div className={styles.summaryGrid}>
        <ReviewRow label="Valor bruto do empréstimo" value={money(gross)} />
        {balance ? <ReviewRow label="Saldo devedor" value={money(balance)} /> : null}
        <ReviewRow label="Vencimento da 1ª parcela" value={firstDue} />
        <ReviewRow label="Taxa ilustrativa" value="1,85% ao mês · 24,60% ao ano" />
        <ReviewRow label="Total estimado das parcelas" value={money(total)} />
      </div>
      <p className={styles.summaryFootnote}>Após a contratação real, as parcelas são descontadas do benefício conforme as informações e regras vigentes.</p>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return <div className={styles.reviewRow}><span>{label}</span><strong>{value}</strong></div>
}

function IllustrativeBenefitCard() {
  return (
    <div className={styles.cardDemo} aria-label="Exemplo ilustrativo de cartão de identificação do beneficiário">
      <div className={styles.cardTop}><span>◉ bradesco</span><b>🇧🇷 INSS</b></div>
      <div className={styles.cardRibbon}>INSS · CARTÃO DE IDENTIFICAÇÃO DO BENEFICIÁRIO</div>
      <div className={styles.cardDetails}><span>NOME:</span><strong>Marcelo Sant&apos;Anna</strong></div>
      <div className={styles.cardDetails}><span>Nº DO BENEFÍCIO:</span><strong>xxxxx-x</strong></div>
      <div className={styles.cardSpecies}>ESPÉCIE: <b>—</b></div>
      <span className={styles.cardSample}>EXEMPLO ILUSTRATIVO</span>
    </div>
  )
}

function addMonths(date: string, count: number) {
  if (!date) return ''
  const [year, month, day] = date.split('-').map(Number)
  const targetMonth = new Date(year, month - 1 + count, 1)
  const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate()
  const result = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), Math.min(day, lastDay))
  return `${String(result.getDate()).padStart(2, '0')}/${String(result.getMonth() + 1).padStart(2, '0')}/${result.getFullYear()}`
}
