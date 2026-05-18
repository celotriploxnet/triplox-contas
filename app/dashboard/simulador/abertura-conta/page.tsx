 'use client'

import { useState } from 'react'

type Tela =
  | 'cpf'
  | 'tipoConta'
  | 'rendaMensal'
  | 'alfabetizada'
  | 'biometria'
  | 'cameraBiometria'
  | 'contatos'
  | 'dadosPessoa'
  | 'endereco'
  | 'profissao'
  | 'residenciaFiscal'
  | 'documentos'
  | 'documentoDicas'
  | 'documentoFrenteAviso'
  | 'documentoFrenteFoto'
  | 'documentoVersoAviso'
  | 'documentoVersoFoto'
  | 'dadosDocumento'
  | 'senha4Digitos'
  | 'senha6Digitos'
  | 'seguroCartaoDebito'
  | 'contaConjunta'
  | 'avisoCestaServicos'
  | 'escolherCestaServicos'
  | 'perguntaInss'
  | 'receberBeneficioConta'
  | 'dadosBeneficioInss'
  | 'ofertaCartaoCredito'
  | 'pagamentoFaturaCartao'
  | 'produtosLimites'
  | 'resumoContrato'
  | 'termosContrato'
  | 'biometriaFinal'
  | 'cameraBiometriaFinal'
  | 'contaAberta'

export default function SimuladorAberturaConta() {
  const [cpf, setCpf] = useState('')
  const [rendaMensal, setRendaMensal] = useState('')
  const [celular, setCelular] = useState('')
  const [email, setEmail] = useState('')
  const [aceiteContato, setAceiteContato] = useState(true)

  const [paisNascimento, setPaisNascimento] = useState('BRASIL')
  const [estadoNascimento, setEstadoNascimento] = useState('')
  const [cidadeNascimento, setCidadeNascimento] = useState('')

  const [cep, setCep] = useState('')
  const [estado, setEstado] = useState('')
  const [cidade, setCidade] = useState('')
  const [bairro, setBairro] = useState('')
  const [rua, setRua] = useState('')
  const [numero, setNumero] = useState('')
  const [complemento, setComplemento] = useState('')
  const [semNumero, setSemNumero] = useState(false)

  const [categoriaProfissional, setCategoriaProfissional] = useState('')

  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [orgaoEmissor, setOrgaoEmissor] = useState('SSP')
  const [ufOrgaoEmissor, setUfOrgaoEmissor] = useState('')
  const [dataExpedicao, setDataExpedicao] = useState('')
  const [nomeMae, setNomeMae] = useState('Conferir nome da mãe')
  const [nomePai, setNomePai] = useState('')
  const [maeNaoInformada, setMaeNaoInformada] = useState(false)

  const [numeroBeneficio, setNumeroBeneficio] = useState('')
  const [diaVencimento, setDiaVencimento] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('Débito em conta')
  const [autorizaDebito, setAutorizaDebito] = useState(true)
  const [liConcordoTermos, setLiConcordoTermos] = useState(false)

  const [erro, setErro] = useState('')
  const [tela, setTela] = useState<Tela>('cpf')

  function formatarCpf(valor: string) {
    const numeros = valor.replace(/\D/g, '').slice(0, 11)

    return numeros
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }

  function formatarMoeda(valor: string) {
    const numeros = valor.replace(/\D/g, '')

    if (!numeros) return ''

    const numero = Number(numeros) / 100

    return numero.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  function formatarCelular(valor: string) {
    const numeros = valor.replace(/\D/g, '').slice(0, 11)

    if (numeros.length <= 10) {
      return numeros
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
    }

    return numeros
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
  }

  function avancarCpf() {
    const somenteNumeros = cpf.replace(/\D/g, '')

    if (somenteNumeros.length !== 11) {
      setErro('Informe um CPF válido para continuar.')
      return
    }

    setErro('')
    setTela('tipoConta')
  }

  function avancarParaRenda() {
    setErro('')
    setTela('rendaMensal')
  }

  function continuarRenda() {
    const somenteNumeros = rendaMensal.replace(/\D/g, '')

    if (!somenteNumeros || Number(somenteNumeros) <= 0) {
      setErro('Informe a renda mensal para continuar.')
      return
    }

    setErro('')
    setTela('alfabetizada')
  }

  return (
    <main className="min-h-screen bg-[#f4f4f5]">
      <div className="mx-auto min-h-screen w-full max-w-[1400px] bg-white shadow-2xl">
        <Header />

        {tela === 'cpf' && (
          <>
            <div className="h-7 bg-gradient-to-r from-[#e30613] to-[#a00078]" />

            <section className="relative h-[260px] overflow-hidden bg-zinc-800 md:h-[420px]">
              <div
                className="absolute inset-0 bg-cover bg-center"
                
              />

              <div className="relative z-10 flex h-full flex-col justify-center px-8 text-white md:px-16">
                <div className="mb-10 text-4xl md:text-6xl">←</div>

                <h1 className="text-3xl font-semibold md:text-5xl">
                  Abertura de conta
                </h1>
              </div>
            </section>

            <section className="relative z-20 -mt-14 px-4 md:-mt-20 md:px-10">
              <div className="rounded-3xl bg-gradient-to-r from-[#ed1c24] to-[#b00075] p-5 text-white shadow-2xl md:p-8">
                <p className="mb-6 text-center text-lg font-bold md:text-2xl">
                  Para começar, informe o CPF
                </p>

                <div className="flex items-center gap-4">
                  <div className="flex-1 rounded-2xl bg-black/15 px-5 py-5 backdrop-blur-sm">
                    <label className="block text-base font-semibold md:text-lg">
                      CPF da pessoa
                    </label>

                    <input
                      value={cpf}
                      onChange={(event) => {
                        setCpf(formatarCpf(event.target.value))
                        setErro('')
                      }}
                      inputMode="numeric"
                      maxLength={14}
                      placeholder="000.000.000-00"
                      className="mt-3 w-full bg-transparent text-xl font-semibold text-white outline-none placeholder:text-white/60 md:text-2xl"
                    />

                    <div className="mt-3 h-[2px] bg-white" />
                  </div>

                  <button
                    onClick={avancarCpf}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-[#34259b] text-3xl shadow-xl"
                  >
                    ⌕
                  </button>
                </div>

                {erro && (
                  <p className="mt-4 text-center text-sm font-bold text-white">
                    {erro}
                  </p>
                )}
              </div>
            </section>

            <section className="px-6 pt-16 md:px-12 md:pt-24">
              <h2 className="mb-6 text-2xl font-bold text-zinc-900 md:text-4xl">
                Mais praticidade para a vida financeira
              </h2>

              <p className="max-w-4xl text-base leading-relaxed text-zinc-700 md:text-xl">
                Com a conta-corrente Bradesco, é possível receber e transferir
                dinheiro via Pix, pagar contas pelo celular, fazer empréstimos e
                muito mais.
              </p>
            </section>

            <section className="grid grid-cols-1 gap-5 px-5 pt-10 pb-24 md:grid-cols-3 md:px-10">
              <InfoCard
                icon="♙"
                title="Pra quem é"
                text="Para qualquer pessoa Física. A conta pode ser individual ou conjunta - com até 7 titulares."
              />

              <InfoCard
                icon="?"
                title="Como funciona"
                text="Só é necessário informar os dados pessoais e apresentar documentos de identificação."
              />

              <InfoCard
                icon="$"
                title="Vantagens"
                text="A conta é aberta na hora e já dá pra fazer transferências, depósitos e pagamentos."
              />
            </section>
          </>
        )}

        {tela === 'tipoConta' && (
          <>
            <TopoTela
              titulo="Tipo de conta"
              voltar={() => setTela('cpf')}
              icone="♙"
            />

            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-5xl text-center">
                <h1 className="mb-14 text-2xl font-bold text-zinc-700 md:text-4xl">
                  Qual conta a pessoa quer abrir?
                </h1>

                <p className="mb-12 text-lg font-semibold text-zinc-500 md:text-2xl">
                  Todas servem para fazer Pix, pagar conta, receber dinheiro e
                  mais.
                </p>
              </div>

              <div className="mx-auto flex max-w-6xl flex-col gap-7">
                <TipoContaCard
                  title="Conta individual"
                  subtitle="Pra apenas 1 titular."
                  onClick={avancarParaRenda}
                />

                <TipoContaCard
                  title="Conta conjunta"
                  subtitle="De 2 a 3 titulares, sendo necessário que estejam presentes."
                  onClick={avancarParaRenda}
                />

                <TipoContaCard
                  title="Conta pra salário"
                  subtitle="Pra quem trabalha em uma empresa que tem convênio com o Bradesco."
                  onClick={avancarParaRenda}
                />

                <TipoContaCard
                  title="Conta pra benefício INSS"
                  subtitle="Para quem é aposentado ou pensionista do INSS."
                  onClick={avancarParaRenda}
                />
              </div>
            </section>
          </>
        )}

        {tela === 'rendaMensal' && (
          <>
            <TopoTela
              titulo="Dados pessoais"
              voltar={() => setTela('tipoConta')}
              icone="♙"
            />

            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-3xl">
                <h1 className="mb-20 text-center text-2xl font-bold text-zinc-700 md:text-4xl">
                  Qual é a renda mensal da pessoa?
                </h1>

                <div className="mx-auto max-w-2xl">
                  <label className="mb-2 block text-lg font-semibold text-zinc-500">
                    R$
                  </label>

                  <input
                    value={rendaMensal}
                    onChange={(event) => {
                      setRendaMensal(formatarMoeda(event.target.value))
                      setErro('')
                    }}
                    inputMode="numeric"
                    placeholder="0,00"
                    className="w-full border-b border-zinc-500 bg-transparent py-3 text-2xl font-semibold text-zinc-700 outline-none"
                  />
                </div>

                {erro && (
                  <p className="mt-6 text-center text-sm font-bold text-[#b00020]">
                    {erro}
                  </p>
                )}

                <div className="mt-28 flex flex-col items-center gap-8">
                  <button
                    onClick={continuarRenda}
                    className="w-full max-w-sm rounded-full bg-[#35249b] px-10 py-5 text-lg font-bold text-white shadow-lg"
                  >
                    Continuar
                  </button>

                  <button
                    onClick={() => setTela('tipoConta')}
                    className="text-lg font-semibold text-[#2f2383]"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {tela === 'alfabetizada' && (
          <>
            <TopoTela
              titulo="Dados pessoais"
              voltar={() => setTela('rendaMensal')}
              icone="♙"
            />

            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-5xl text-center">
                <h1 className="mb-14 text-2xl font-bold text-zinc-700 md:text-4xl">
                  A pessoa é alfabetizada?
                </h1>
              </div>

              <div className="mx-auto flex max-w-6xl flex-col gap-7 pb-32">
                <OpcaoSimplesCard
                  title="Sim"
                  onClick={() => setTela('biometria')}
                />

                <OpcaoSimplesCard
                  title="Não"
                  subtitle="É necessária a presença de duas testemunhas."
                  onClick={() =>
                    alert('Fluxo de testemunhas será criado.')
                  }
                />
              </div>
            </section>
          </>
        )}

        {tela === 'biometria' && (
          <>
            <div className="h-7 bg-gradient-to-r from-[#e30613] to-[#a00078]" />

            <section className="min-h-[calc(100vh-170px)] px-6 py-10 md:px-16 md:py-16">
              <div className="mx-auto flex max-w-5xl flex-col items-center">
                <div className="mb-16 mt-10 flex h-52 w-52 items-center justify-center rounded-[40px] border-4 border-zinc-300 bg-zinc-50">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-[#cc092f] text-5xl text-[#cc092f]">
                    ☺
                  </div>
                </div>

                <h1 className="max-w-4xl text-center text-3xl font-bold leading-relaxed text-zinc-700 md:text-5xl">
                  Pra concluir, faça a biometria de quem está abrindo a conta
                </h1>

                <div className="mt-16 flex w-full max-w-4xl flex-col gap-10">
                  <DicaItem icon="☀" text="Estejam em um lugar bem iluminado" />
                  <DicaItem
                    icon="⊘"
                    text="Peça para a pessoa tirar boné, óculos ou acessórios que cubram o rosto"
                  />
                  <DicaItem
                    icon="☺"
                    text="Segure a câmera na altura do rosto da pessoa e siga as instruções"
                  />
                </div>

                <button
                  onClick={() => setTela('cameraBiometria')}
                  className="mt-24 w-full max-w-sm rounded-full bg-[#35249b] px-10 py-5 text-xl font-bold text-white shadow-xl"
                >
                  Continuar
                </button>
              </div>
            </section>
          </>
        )}

        {tela === 'cameraBiometria' && (
          <section className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-900 text-white">
            <button
              onClick={() => setTela('biometria')}
              className="absolute left-6 top-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/80 text-5xl text-zinc-700"
            >
              ×
            </button>

            <div className="absolute right-8 top-8 h-5 w-5 rounded-full bg-green-400" />

            <div className="flex h-[62vh] w-[72vw] max-w-[620px] items-center justify-center rounded-[50%] border-[18px] border-white/15 bg-white/20">
              <div className="rounded-xl bg-zinc-800/80 px-10 py-5 text-2xl font-semibold text-white shadow-xl">
                Aguarde...
              </div>
            </div>

            <button
              onClick={() => setTela('contatos')}
              className="mt-12 rounded-full bg-[#35249b] px-10 py-4 text-lg font-bold text-white shadow-xl"
            >
              Continuar
            </button>

            <div className="absolute bottom-10 max-w-[90%] rounded-full bg-white/70 px-8 py-3 text-center text-sm font-semibold text-zinc-600">
              Tela onde será posicionada a facial do cliente com a câmera frontal do seu tablet
            </div>
          </section>
        )}

        {tela === 'contatos' && (
          <>
            <TopoTela
              titulo="Dados pessoais"
              voltar={() => setTela('cameraBiometria')}
              icone="♙"
            />

            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-3xl">
                <h1 className="mb-20 text-center text-2xl font-bold text-zinc-700 md:text-4xl">
                  Quais são os contatos da pessoa?
                </h1>

                <div className="space-y-16">
                  <CampoLinha
                    label="Celular"
                    value={celular}
                    onChange={(value) => setCelular(formatarCelular(value))}
                    placeholder="(71) 99999-9999"
                  />

                  <CampoLinha
                    label="E-mail"
                    value={email}
                    onChange={setEmail}
                    placeholder="Opcional"
                  />
                </div>

                <div className="mt-20 text-center">
                  <p className="text-xl font-semibold text-zinc-600">
                    Peça autorização da pessoa para que o Bradesco entre em
                    contato com ela.
                  </p>

                  <div className="mx-auto mt-10 flex max-w-2xl items-start gap-5 rounded-2xl bg-zinc-100 p-6 text-left">
                    <input
                      type="checkbox"
                      checked={aceiteContato}
                      onChange={() => setAceiteContato(!aceiteContato)}
                      className="mt-1 h-6 w-6 accent-[#35249b]"
                    />

                    <p className="text-lg font-semibold text-zinc-700">
                      Concordo que o Bradesco fale comigo sobre minha conta e
                      novidades por esse celular
                    </p>
                  </div>
                </div>

                <div className="mt-16 flex flex-col items-center gap-10">
                  <button
                    onClick={() => setTela('dadosPessoa')}
                    className="w-full max-w-sm rounded-full bg-[#35249b] px-10 py-5 text-xl font-bold text-white shadow-xl"
                  >
                    Continuar
                  </button>

                  <button
                    onClick={() => setTela('cpf')}
                    className="text-lg font-semibold text-[#2f2383]"
                  >
                    Voltar ao início
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {tela === 'dadosPessoa' && (
          <>
            <TopoTela
              titulo="Dados pessoais"
              voltar={() => setTela('contatos')}
              icone="♙"
            />

            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-3xl">
                <h1 className="mb-16 text-center text-2xl font-bold text-zinc-700 md:text-4xl">
                  Quais são os dados da pessoa?
                </h1>

                <div className="space-y-14">
                  <CampoLinha label="CPF" value={cpf} readOnly />

                  <CampoLinha
                    label="Nome completo"
                    value="NOME COMPLETO DO CLIENTE"
                    readOnly
                  />

                  <CampoLinha
                    label="data de nascimento"
                    value="10/05/1986"
                    readOnly
                  />

                  <CampoLinha
                    label="País onde nasceu"
                    value={paisNascimento}
                    onChange={setPaisNascimento}
                    icon="⌕"
                  />

                  <CampoLinha
                    label="Estado onde nasceu"
                    value={estadoNascimento}
                    onChange={setEstadoNascimento}
                    icon="⌕"
                    placeholder="Selecione o estado de nascimento"
                  />

                  <CampoLinha
                    label="Cidade onde nasceu"
                    value={cidadeNascimento}
                    onChange={setCidadeNascimento}
                    icon="⌕"
                    placeholder="Selecione a Cidade de nascimento do cliente"
                  />
                </div>

                <BotaoDuplo
                  continuar={() => setTela('endereco')}
                  voltarInicio={() => setTela('cpf')}
                />
              </div>
            </section>
          </>
        )}

        {tela === 'endereco' && (
          <>
            <TopoTela
              titulo="Dados pessoais"
              voltar={() => setTela('dadosPessoa')}
              icone="♙"
            />

            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-3xl">
                <h1 className="mb-8 text-center text-2xl font-bold text-zinc-700 md:text-4xl">
                  Qual é o endereço da pessoa?
                </h1>

                <p className="mb-16 text-center text-lg font-semibold text-zinc-500 md:text-2xl">
                  O cartão será enviado para o endereço informado.
                </p>

                <div className="space-y-12">
                  <CampoLinha label="CEP" value={cep} onChange={setCep} />

                  <CampoLinha
                    label="Estado"
                    value={estado}
                    onChange={setEstado}
                    icon="⌕"
                  />

                  <CampoLinha
                    label="Cidade"
                    value={cidade}
                    onChange={setCidade}
                    icon="⌕"
                  />

                  <CampoLinha
                    label="Bairro"
                    value={bairro}
                    onChange={setBairro}
                  />

                  <CampoLinha
                    label="Rua, alameda, avenida"
                    value={rua}
                    onChange={setRua}
                  />

                  <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                    <div>
                      <CampoLinha
                        label="Número"
                        value={numero}
                        onChange={setNumero}
                        readOnly={semNumero}
                      />

                      <label className="mt-4 flex items-center gap-3 text-base font-semibold text-zinc-500">
                        <input
                          type="checkbox"
                          checked={semNumero}
                          onChange={() => setSemNumero(!semNumero)}
                          className="h-5 w-5 accent-[#35249b]"
                        />
                        Sem número
                      </label>
                    </div>

                    <CampoLinha
                      label="Complemento"
                      value={complemento}
                      onChange={setComplemento}
                      placeholder="Opcional."
                    />
                  </div>
                </div>

                <BotaoDuplo
                  continuar={() => setTela('profissao')}
                  voltarInicio={() => setTela('cpf')}
                />
              </div>
            </section>
          </>
        )}

        {tela === 'profissao' && (
          <>
            <TopoTela
              titulo="Dados pessoais"
              voltar={() => setTela('endereco')}
              icone="♙"
            />

            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-3xl">
                <h1 className="mb-20 text-center text-2xl font-bold text-zinc-700 md:text-4xl">
                  Qual é a profissão da pessoa?
                </h1>

                <div className="mx-auto max-w-2xl">
                  <div className="flex items-center gap-4 border-b border-zinc-500">
                    <select
                      value={categoriaProfissional}
                      onChange={(event) =>
                        setCategoriaProfissional(event.target.value)
                      }
                      className="w-full bg-transparent py-3 text-2xl font-semibold text-zinc-500 outline-none"
                    >
                      <option value="">Categoria profissional</option>
                      <option value="assalariado">Assalariado</option>
                      <option value="autonomo">Autônomo</option>
                      <option value="aposentado">
                        Aposentado/Pensionista
                      </option>
                      <option value="empresario">Empresário</option>
                      <option value="outros">Outros</option>
                    </select>

                    <span className="text-3xl text-zinc-400">˅</span>
                  </div>
                </div>

                <div className="mt-24 flex flex-col items-center gap-10">
                  <button
                    onClick={() => setTela('residenciaFiscal')}
                    className="w-full max-w-sm rounded-full bg-[#35249b] px-10 py-5 text-xl font-bold text-white shadow-xl"
                  >
                    Continuar
                  </button>

                  <button
                    onClick={() => setTela('endereco')}
                    className="text-lg font-semibold text-[#2f2383]"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {tela === 'residenciaFiscal' && (
          <>
            <TopoTela
              titulo="Dados pessoais"
              voltar={() => setTela('profissao')}
              icone="♙"
            />

            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-5xl text-center">
                <h1 className="mb-6 text-2xl font-bold text-zinc-700 md:text-4xl">
                  A pessoa tem residência fiscal apenas no Brasil?
                </h1>

                <p className="mb-14 text-lg font-semibold text-zinc-500 md:text-2xl">
                  Por que pedimos essa informação ?
                </p>
              </div>

              <div className="mx-auto flex max-w-6xl flex-col gap-7 pb-32">
                <OpcaoSimplesCard
                  title="Sim"
                  onClick={() => setTela('documentos')}
                />

                <OpcaoSimplesCard
                  title="Não"
                  subtitle="É necessário um documento da outra nacionalidade."
                  onClick={() => setTela('documentos')}
                />
              </div>
            </section>
          </>
        )}

        {tela === 'documentos' && (
          <>
            <TopoTela
              titulo="Documentos"
              voltar={() => setTela('residenciaFiscal')}
              icone="♙"
            />

            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-5xl text-center">
                <h1 className="mb-14 text-2xl font-bold text-zinc-700 md:text-4xl">
                  Qual documento a pessoa vai usar?
                </h1>
              </div>

              <div className="mx-auto flex max-w-6xl flex-col gap-7 pb-32">
                <TipoContaCard
                  title="RG"
                  subtitle="Carteira de identidade."
                  onClick={() => setTela('documentoDicas')}
                />

                <TipoContaCard
                  title="CNH"
                  subtitle="Carteira de motorista."
                  onClick={() => setTela('documentoDicas')}
                />

                <TipoContaCard
                  title="RNM ou RNE"
                  subtitle="Documento de identidade estrangeira."
                  onClick={() => setTela('documentoDicas')}
                />

                <TipoContaCard
                  title="Outro"
                  subtitle="Identidade nacional, carteira de trabalho, registro profissional e CIM."
                  onClick={() => setTela('documentoDicas')}
                />
              </div>
            </section>
          </>
        )}

        {tela === 'documentoDicas' && (
          <>
            <TopoTela
              titulo="Documentos"
              voltar={() => setTela('documentos')}
              icone="♙"
            />

            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto flex max-w-4xl flex-col items-center">
                <DocumentoIlustracao />

                <h1 className="mb-14 max-w-3xl text-center text-2xl font-bold leading-relaxed text-zinc-700 md:text-4xl">
                  Antes de capturar a imagem do documento, confira estas dicas
                </h1>

                <div className="flex w-full max-w-3xl flex-col gap-10">
                  <DicaItem icon="☀" text="Escolha um lugar bem iluminado" />
                  <DicaItem
                    icon="▣"
                    text="Coloque o documento original sobre uma superfície plana, se possível sem o plástico"
                  />
                  <DicaItem
                    icon="▤"
                    text="Capture um lado por vez - a frente é onde tem a foto"
                  />
                </div>

                <button
                  onClick={() => setTela('documentoFrenteAviso')}
                  className="mt-16 w-full max-w-sm rounded-full bg-[#35249b] px-10 py-5 text-xl font-bold text-white shadow-xl"
                >
                  Ok, vamos lá
                </button>
              </div>
            </section>
          </>
        )}

        {tela === 'documentoFrenteAviso' && (
          <DocumentoAviso
            titulo="Frente do documento"
            texto="Centralize a frente do documento."
            voltar={() => setTela('documentoDicas')}
            continuar={() => setTela('documentoFrenteFoto')}
          />
        )}

        {tela === 'documentoFrenteFoto' && (
          <DocumentoCamera
            titulo="Frente do documento"
            voltar={() => setTela('documentoFrenteAviso')}
            capturar={() => setTela('documentoVersoAviso')}
          />
        )}

        {tela === 'documentoVersoAviso' && (
          <DocumentoAviso
            titulo="Verso do documento"
            texto="Centralize o verso do documento."
            voltar={() => setTela('documentoFrenteFoto')}
            continuar={() => setTela('documentoVersoFoto')}
          />
        )}

        {tela === 'documentoVersoFoto' && (
          <DocumentoCamera
            titulo="Verso do documento"
            voltar={() => setTela('documentoVersoAviso')}
            capturar={() => setTela('dadosDocumento')}
          />
        )}

        {tela === 'dadosDocumento' && (
          <>
            <TopoTela
              titulo="Documentos"
              voltar={() => setTela('documentoVersoFoto')}
              icone="♙"
            />

            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-3xl">
                <h1 className="mb-16 text-center text-2xl font-bold leading-relaxed text-zinc-700 md:text-4xl">
                  Confira com a pessoa as informações do documento
                </h1>

                <div className="space-y-12">
                  <CampoLinha
                    label="Número do documento"
                    value={numeroDocumento}
                    onChange={setNumeroDocumento}
                  />

                  <CampoLinha
                    label="Órgão emissor"
                    value={orgaoEmissor}
                    onChange={setOrgaoEmissor}
                    icon="⌕"
                  />

                  <div>
                    <label className="mb-2 block text-base font-semibold text-zinc-400">
                      UF Órgão Emissor
                    </label>

                    <div className="flex items-center gap-4 border-b border-zinc-500">
                      <select
                        value={ufOrgaoEmissor}
                        onChange={(event) =>
                          setUfOrgaoEmissor(event.target.value)
                        }
                        className="w-full bg-transparent py-3 text-2xl font-semibold text-zinc-500 outline-none"
                      >
                        <option value="">UF Órgão Emissor</option>
                        <option value="BA">BA</option>
                        <option value="SP">SP</option>
                        <option value="RJ">RJ</option>
                        <option value="MG">MG</option>
                        <option value="PE">PE</option>
                        <option value="ES">ES</option>
                      </select>

                      <span className="text-3xl text-zinc-400">˅</span>
                    </div>
                  </div>

                  <CampoLinha
                    label="Data de expedição/emissão"
                    value={dataExpedicao}
                    onChange={setDataExpedicao}
                    placeholder="00/00/0000"
                  />

                  <div>
                    <CampoLinha
                      label="Nome da mãe"
                      value={nomeMae}
                      onChange={setNomeMae}
                      readOnly={maeNaoInformada}
                    />

                    <label className="mt-4 flex items-center gap-3 text-base font-semibold text-zinc-500">
                      <input
                        type="checkbox"
                        checked={maeNaoInformada}
                        onChange={() => {
                          const novoValor = !maeNaoInformada
                          setMaeNaoInformada(novoValor)
                          setNomeMae(novoValor ? '' : 'AQUI JÁ VEM O NOME DA MAE')
                        }}
                        className="h-5 w-5 accent-[#35249b]"
                      />
                      Não informado
                    </label>
                  </div>

                  <CampoLinha
                    label="Nome do pai"
                    value={nomePai}
                    onChange={setNomePai}
                  />
                </div>

                <div className="mt-20 flex flex-col items-center gap-10">
                  <button
                    onClick={() => setTela('senha4Digitos')}
                    className="w-full max-w-sm rounded-full bg-[#35249b] px-10 py-5 text-xl font-bold text-white shadow-xl"
                  >
                    Continuar
                  </button>

                  <button
                    onClick={() => setTela('documentoVersoFoto')}
                    className="text-lg font-semibold text-[#2f2383]"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {tela === 'senha4Digitos' && (
          <>
            <TopoTela
              titulo="Documentos"
              voltar={() => setTela('dadosDocumento')}
              icone="♙"
            />

            <TelaSenha
              icone="🔒"
              titulo="Peça para criar a senha de acesso à conta na maquininha"
              descricao="Ela deve ter 4 dígitos e a pessoa vai usá-la para acessar a conta pelo app Bradesco, internet banking e Fone Fácil."
              destaque="4 dígitos"
              mostrarRegras
              continuar={() => setTela('senha6Digitos')}
            />
          </>
        )}

        {tela === 'senha6Digitos' && (
          <>
            <TopoTela
              titulo="Documentos"
              voltar={() => setTela('senha4Digitos')}
              icone="♙"
            />

            <TelaSenha
              icone="💳"
              titulo="Agora peça para criar a senha do cartão"
              descricao="Ela deve ter 6 dígitos e a pessoa irá usa-la com o seu cartão da conta, compras no débito."
              destaque="6 dígitos"
              continuar={() => setTela('seguroCartaoDebito')}
            />
          </>
        )}

        {tela === 'seguroCartaoDebito' && (
          <>
            <TopoTela
              titulo="Produtos"
              voltar={() => setTela('senha6Digitos')}
              icone="♙"
            />

            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
                <ProdutoIlustracao />

                <h1 className="mb-12 max-w-4xl text-2xl font-bold leading-relaxed text-zinc-700 md:text-4xl">
                  A pessoa quer proteger o cartão?
                </h1>

                <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white text-left shadow-xl">
                  <div className="border-b border-zinc-200 px-7 py-6">
                    <h2 className="text-xl font-bold text-zinc-600 md:text-2xl">
                      Coberturas
                    </h2>
                  </div>

                  <div className="grid gap-0 divide-y divide-zinc-200">
                    <CoberturaItem
                      icon="$"
                      title="Transações indevidas"
                      value="Até R$ 7.000,00"
                      text="Proteção em caso de compras, aluguéis de bens e serviços, saques, pagamentos e transferências com o cartão físico ou digital em situações de roubo ou ameaça."
                    />

                    <CoberturaItem
                      icon="♡"
                      title="Morte ou invalidez"
                      value="Até R$ 5.000,00"
                      text="Indenização em caso de morte ou invalidez permanente total ou parcial por crime."
                    />
                  </div>

                  <div className="border-t border-zinc-200 px-7 py-7 text-center">
                    <p className="text-xl font-bold text-zinc-700 md:text-3xl">
                      Tudo por apenas R$ 4,99/mês
                    </p>
                  </div>
                </div>

                <div className="mt-16 flex w-full max-w-3xl flex-col gap-6 md:flex-row">
                  <button
                    onClick={() => setTela('contaConjunta')}
                    className="w-full rounded-full bg-[#35249b] px-10 py-5 text-xl font-bold text-white shadow-xl"
                  >
                    Sim
                  </button>

                  <button
                    onClick={() => setTela('contaConjunta')}
                    className="w-full rounded-full bg-zinc-300 px-10 py-5 text-xl font-bold text-zinc-700 shadow-xl"
                  >
                    Não
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {tela === 'contaConjunta' && (
          <>
            <TopoTela
              titulo="Documentos"
              voltar={() => setTela('seguroCartaoDebito')}
              icone="▣"
            />

            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-5xl text-center">
                <h1 className="mb-6 text-2xl font-bold text-zinc-700 md:text-4xl">
                  Quer abrir uma conta conjunta?
                </h1>

                <p className="mb-14 text-lg font-semibold text-zinc-500 md:text-2xl">
                  Como funciona a conta conjunta ?
                </p>
              </div>

              <div className="mx-auto flex max-w-6xl flex-col gap-7 pb-32">
                <OpcaoSimplesCard
                  title="Sim"
                  subtitle="É necessário cadastrar outro titular."
                  onClick={() => setTela('avisoCestaServicos')}
                />

                <OpcaoSimplesCard
                  title="Não"
                  onClick={() => setTela('avisoCestaServicos')}
                />
              </div>
            </section>
          </>
        )}

        {tela === 'avisoCestaServicos' && (
          <AvisoCestaServicos
            voltar={() => setTela('contaConjunta')}
            continuar={() => setTela('escolherCestaServicos')}
          />
        )}

        {tela === 'escolherCestaServicos' && (
          <>
            <TopoTela
              titulo="Produtos e Serviços"
              voltar={() => setTela('avisoCestaServicos')}
              icone="▤"
            />

            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-6xl">
                <h1 className="mb-14 text-center text-2xl font-bold text-zinc-700 md:text-4xl">
                  Peça para a pessoa escolher uma cesta de serviços
                </h1>

                <div className="flex flex-col gap-7">
                  <CestaServicoCard
                    title="PACOTE SERVIÇO PADRONIZADO I"
                    valor="R$ 18,65"
                    onClick={() => setTela('perguntaInss')}
                  />

                  <CestaServicoCard
                    title="PACOTE SERVIÇO PADRONIZADO II"
                    valor="R$ 28,95"
                    onClick={() => setTela('perguntaInss')}
                  />

                  <CestaServicoCard
                    title="PACOTE SERVIÇO PADRONIZADO III"
                    valor="R$ 39,90"
                    onClick={() => setTela('perguntaInss')}
                  />
                </div>
              </div>
            </section>
          </>
        )}


        {tela === 'perguntaInss' && (
          <>
            <TopoTela
              titulo="Produtos e Serviços"
              voltar={() => setTela('escolherCestaServicos')}
              icone="▤"
            />

            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-5xl text-center">
                <h1 className="mb-14 text-2xl font-bold text-zinc-700 md:text-4xl">
                  A pessoa recebe benefício do INSS?
                </h1>
              </div>

              <div className="mx-auto flex max-w-6xl flex-col gap-7 pb-32">
                <OpcaoSimplesCard
                  title="Sim"
                  onClick={() => setTela('receberBeneficioConta')}
                />

                <OpcaoSimplesCard
                  title="Não"
                  onClick={() => setTela('ofertaCartaoCredito')}
                />
              </div>
            </section>
          </>
        )}

        {tela === 'receberBeneficioConta' && (
          <>
            <TopoTela
              titulo="Produtos e Serviços"
              voltar={() => setTela('perguntaInss')}
              icone="▤"
            />

            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-5xl text-center">
                <h1 className="mb-14 text-2xl font-bold leading-relaxed text-zinc-700 md:text-4xl">
                  Ela quer começar a receber na conta que está abrindo agora?
                </h1>
              </div>

              <div className="mx-auto flex max-w-6xl flex-col gap-7 pb-32">
                <OpcaoSimplesCard
                  title="Sim"
                  onClick={() => setTela('dadosBeneficioInss')}
                />

                <OpcaoSimplesCard
                  title="Não"
                  onClick={() => setTela('ofertaCartaoCredito')}
                />
              </div>
            </section>
          </>
        )}

        {tela === 'dadosBeneficioInss' && (
          <>
            <TopoTela
              titulo="Produtos e Serviços"
              voltar={() => setTela('receberBeneficioConta')}
              icone="▤"
            />

            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-3xl">
                <h1 className="mb-20 text-center text-2xl font-bold text-zinc-700 md:text-4xl">
                  Informe os dados do benefício do INSS
                </h1>

                <div className="mb-20 border-b-4 border-[#b33a4b] pb-5 text-center">
                  <p className="text-2xl font-bold text-[#b33a4b]">
                    INSS
                  </p>
                </div>

                <CampoLinha
                  label="Número do benefício"
                  value={numeroBeneficio}
                  onChange={setNumeroBeneficio}
                />

                <div className="mt-28 flex flex-col items-center gap-8">
                  <button
                    onClick={() => setTela('ofertaCartaoCredito')}
                    className="w-full max-w-sm rounded-full bg-[#35249b] px-10 py-5 text-lg font-bold text-white shadow-lg"
                  >
                    Continuar
                  </button>

                  <button
                    onClick={() => setTela('receberBeneficioConta')}
                    className="text-lg font-semibold text-[#2f2383]"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {tela === 'ofertaCartaoCredito' && (
          <>
            <TopoTela
              titulo="Produtos e Serviços"
              voltar={() => setTela('perguntaInss')}
              icone="▤"
            />

            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-6xl">
                <h1 className="mb-3 text-center text-2xl font-bold text-zinc-700 md:text-4xl">
                  Peça para a pessoa escolher o cartão de crédito
                </h1>

                <p className="mb-10 text-center text-lg font-semibold text-zinc-500 md:text-2xl">
                  Mostre todos os cartões e seus benefícios.
                </p>

                <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xl font-semibold text-zinc-600">
                        Seguro Superprotegido por apenas R$9,99/mês
                      </p>

                      <button className="mt-5 text-xl font-bold text-[#35249b]">
                        Ver coberturas
                      </button>
                    </div>

                    <div className="flex h-8 w-16 items-center justify-end rounded-full bg-[#6c63b7] p-1">
                      <div className="h-6 w-6 rounded-full bg-white" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-7">
                  <CartaoCreditoCard
                    title="BRADESCO NEO VISA PLATINUM"
                    anuidade="12x de R$ 33,00"
                    onClick={() => setTela('pagamentoFaturaCartao')}
                  />

                  <CartaoCreditoCard
                    title="ELO MAIS"
                    anuidade="Grátis*"
                    observacao="após 1 ano 12x de R$ 38"
                    onClick={() => setTela('pagamentoFaturaCartao')}
                  />
                </div>
              </div>
            </section>
          </>
        )}

        {tela === 'pagamentoFaturaCartao' && (
          <>
            <TopoTela
              titulo="Produtos e Serviços"
              voltar={() => setTela('ofertaCartaoCredito')}
              icone="▤"
            />

            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-4xl">
                <div className="mb-16 flex items-center gap-8">
                  <div className="h-28 w-44 rounded-xl bg-zinc-700 shadow-xl" />

                  <div>
                    <p className="text-lg font-semibold text-zinc-500">
                      Cartão de crédito
                    </p>

                    <h2 className="text-2xl font-bold text-zinc-700">
                      BRADESCO NEO VISA PLATINUM
                    </h2>

                    <button
                      onClick={() => setTela('ofertaCartaoCredito')}
                      className="mt-4 text-lg font-semibold text-[#35249b]"
                    >
                      Alterar
                    </button>
                  </div>
                </div>

                <h1 className="mb-14 text-2xl font-bold text-zinc-700 md:text-4xl">
                  Selecione as opções de pagamento da fatura
                </h1>

                <div className="space-y-12">
                  <div>
                    <label className="mb-2 block text-base font-semibold text-zinc-500">
                      Dia do vencimento
                    </label>

                    <div className="flex items-center gap-4 border-b border-zinc-500">
                      <select
                        value={diaVencimento}
                        onChange={(event) => setDiaVencimento(event.target.value)}
                        className="w-full bg-transparent py-3 text-2xl font-semibold text-zinc-600 outline-none"
                      >
                        <option value="">Selecione o dia</option>
                        <option value="05">05</option>
                        <option value="10">10</option>
                        <option value="15">15</option>
                        <option value="20">20</option>
                        <option value="25">25</option>
                      </select>

                      <span className="text-3xl text-zinc-400">˅</span>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-base font-semibold text-zinc-500">
                      Forma de pagamento
                    </label>

                    <div className="flex items-center gap-4 border-b border-zinc-500">
                      <select
                        value={formaPagamento}
                        onChange={(event) => setFormaPagamento(event.target.value)}
                        className="w-full bg-transparent py-3 text-2xl font-semibold text-zinc-600 outline-none"
                      >
                        <option value="Débito em conta">Débito em conta</option>
                        <option value="Boleto">Boleto</option>
                      </select>

                      <span className="text-3xl text-zinc-400">˅</span>
                    </div>
                  </div>
                </div>

                <div className="mt-14 rounded-xl border border-zinc-200 bg-zinc-50 p-6">
                  <p className="text-lg font-semibold leading-relaxed text-zinc-600">
                    Avise que é possível consultar a fatura pelo app Bradesco,
                    app Bradesco Cartões e internet banking
                  </p>
                </div>

                <div className="mt-14 text-center">
                  <p className="text-lg font-semibold leading-relaxed text-zinc-600">
                    Explique estas opções e peça a autorização da pessoa para caso
                    não tenha saldo em conta no dia do débito:
                  </p>
                </div>

                <label className="mt-10 flex items-start gap-4 text-base font-semibold leading-relaxed text-zinc-600 md:text-lg">
                  <input
                    type="checkbox"
                    checked={autorizaDebito}
                    onChange={() => setAutorizaDebito(!autorizaDebito)}
                    className="mt-1 h-6 w-6 accent-[#35249b]"
                  />

                  Autorizo novas tentativas de débito da parcela vencida,
                  incluindo valores parciais, utilizando o saldo disponível na conta
                </label>

                <div className="mt-16 flex flex-col items-center gap-8">
                  <button
                    onClick={() => setTela('produtosLimites')}
                    className="w-full max-w-sm rounded-full bg-[#35249b] px-10 py-5 text-xl font-bold text-white shadow-xl"
                  >
                    Continuar
                  </button>

                  <button
                    onClick={() => setTela('ofertaCartaoCredito')}
                    className="text-lg font-semibold text-[#2f2383]"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            </section>
          </>
        )}


        {tela === 'produtosLimites' && (
          <>
            <TopoTela
              titulo="Produtos e Serviços"
              voltar={() => setTela('pagamentoFaturaCartao')}
              icone="▤"
            />

            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-5xl">
                <div className="mb-10 rounded-t-2xl bg-gradient-to-r from-[#c83f4a] to-[#8d1b64] px-8 py-10 text-center text-white shadow-xl">
                  <h1 className="text-2xl font-bold md:text-4xl">
                    Confirme se a pessoa quer mais limite na conta
                  </h1>

                  <p className="mt-6 text-base font-semibold leading-relaxed md:text-xl">
                    Os valores são pré-aprovados e podem aumentar conforme o uso da conta.
                  </p>
                </div>

                <div className="space-y-8">
                  <ProdutoLimiteItem
                    title="Limite de crédito pessoal"
                    value="R$ 379,99"
                    description="Dinheiro rápido e até 60 dias pra começar a pagar."
                    checked
                  />

                  <ProdutoLimiteItem
                    title="Cartão de crédito"
                    value="R$ 1.282,49"
                    description="Limite para cartão de crédito"
                    checked
                  />

                  <ProdutoLimiteItem
                    title="Cheque especial"
                    value="R$ 427,49"
                    description="Crédito pra usar em situações de emergência."
                    checked
                  />
                </div>

                <div className="mt-16 flex flex-col items-center gap-8">
                  <button
                    onClick={() => setTela('resumoContrato')}
                    className="w-full max-w-sm rounded-full bg-[#35249b] px-10 py-5 text-xl font-bold text-white shadow-xl"
                  >
                    Continuar
                  </button>

                  <button
                    onClick={() => setTela('pagamentoFaturaCartao')}
                    className="text-lg font-semibold text-[#2f2383]"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {tela === 'resumoContrato' && (
          <>
            <TopoTela
              titulo="Produtos e Serviços"
              voltar={() => setTela('produtosLimites')}
              icone="▤"
            />

            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-5xl">
                <h1 className="mb-14 text-center text-2xl font-bold leading-relaxed text-zinc-700 md:text-4xl">
                  Peça para a pessoa confirmar os produtos e serviços escolhidos
                </h1>

                <div className="space-y-7">
                  <ResumoProdutoCard
                    title="Cesta de serviços"
                    description="PACOTE SERVIÇO PADRONIZADO I"
                    actionText="Alterar cesta"
                  />

                  <ResumoProdutoCard
                    title="Seguro Cartão de Débito"
                    description="R$ 4,99/mês"
                    toggle
                  />

                  <ResumoProdutoCard
                    title="Cartão de crédito"
                    description="BRADESCO NEO VISA PLATINUM"
                    detail="Limite: R$ 1282,49"
                    actionText="Alterar cartão"
                    toggle
                  />

                  <ResumoProdutoCard
                    title="Seguro do cartão de crédito"
                    description="R$ 9,99/mês"
                    toggle
                  />

                  <ResumoProdutoCard
                    title="Cheque especial"
                    description="R$ 427,49"
                    toggle
                  />

                  <ResumoProdutoCard
                    title="Limite de crédito pessoal"
                    description="R$ 379,99"
                    toggle
                  />
                </div>

                <div className="mt-16 flex flex-col items-center gap-8">
                  <button
                    onClick={() => setTela('termosContrato')}
                    className="w-full max-w-sm rounded-full bg-[#35249b] px-10 py-5 text-xl font-bold text-white shadow-xl"
                  >
                    Continuar
                  </button>

                  <button
                    onClick={() => setTela('produtosLimites')}
                    className="text-lg font-semibold text-[#2f2383]"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {tela === 'termosContrato' && (
          <>
            <TopoTela
              titulo="Documentos"
              voltar={() => setTela('resumoContrato')}
              icone="▣"
            />

            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-5xl">
                <h1 className="mb-14 text-center text-2xl font-bold leading-relaxed text-zinc-700 md:text-4xl">
                  É necessário que a pessoa confira os termos
                </h1>

                <div className="space-y-7">
                  <TermoCard title="Termo de Abertura de Contas" />
                  <TermoCard title="Termo de Consulta SCR" />
                  <TermoCard title="Termo de Cesta de Tarifas" />
                  <TermoCard title="Termo de Cartão de Crédito" />
                  <TermoCard title="Termo de Residência" />
                </div>

                <label className="mt-14 flex items-center justify-center gap-4 text-lg font-semibold text-zinc-600">
                  <input
                    type="checkbox"
                    checked={liConcordoTermos}
                    onChange={() => setLiConcordoTermos(!liConcordoTermos)}
                    className="h-6 w-6 accent-[#35249b]"
                  />
                  Li e concordo com todos os termos
                </label>

                <div className="mt-12 flex flex-col items-center gap-8">
                  <button
                    onClick={() => setTela('biometriaFinal')}
                    disabled={!liConcordoTermos}
                    className={`w-full max-w-sm rounded-full px-10 py-5 text-xl font-bold text-white shadow-xl ${
                      liConcordoTermos
                        ? 'bg-[#35249b]'
                        : 'cursor-not-allowed bg-zinc-400'
                    }`}
                  >
                    Continuar
                  </button>

                  <button
                    onClick={() => setTela('resumoContrato')}
                    className="text-lg font-semibold text-[#2f2383]"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {tela === 'biometriaFinal' && (
          <>
            <div className="h-7 bg-gradient-to-r from-[#e30613] to-[#a00078]" />

            <section className="min-h-[calc(100vh-170px)] px-6 py-10 md:px-16 md:py-16">
              <div className="mx-auto flex max-w-5xl flex-col items-center">
                <div className="mb-16 mt-10 flex h-52 w-52 items-center justify-center rounded-[40px] border-4 border-zinc-300 bg-zinc-50">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-[#cc092f] text-5xl text-[#cc092f]">
                    ☺
                  </div>
                </div>

                <h1 className="max-w-4xl text-center text-3xl font-bold leading-relaxed text-zinc-700 md:text-5xl">
                  Para finalizar, faça novamente a biometria de quem está abrindo a conta
                </h1>

                <div className="mt-16 flex w-full max-w-4xl flex-col gap-10">
                  <DicaItem icon="☀" text="Estejam em um lugar bem iluminado" />
                  <DicaItem
                    icon="⊘"
                    text="Peça para a pessoa tirar boné, óculos ou acessórios que cubram o rosto"
                  />
                  <DicaItem
                    icon="☺"
                    text="Segure a câmera na altura do rosto da pessoa e siga as instruções"
                  />
                </div>

                <button
                  onClick={() => setTela('cameraBiometriaFinal')}
                  className="mt-24 w-full max-w-sm rounded-full bg-[#35249b] px-10 py-5 text-xl font-bold text-white shadow-xl"
                >
                  Continuar
                </button>
              </div>
            </section>
          </>
        )}

        {tela === 'cameraBiometriaFinal' && (
          <section className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-900 text-white">
            <button
              onClick={() => setTela('biometriaFinal')}
              className="absolute left-6 top-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/80 text-5xl text-zinc-700"
            >
              ×
            </button>

            <div className="absolute right-8 top-8 h-5 w-5 rounded-full bg-green-400" />

            <div className="flex h-[62vh] w-[72vw] max-w-[620px] items-center justify-center rounded-[50%] border-[18px] border-white/15 bg-white/20">
              <div className="rounded-xl bg-zinc-800/80 px-10 py-5 text-2xl font-semibold text-white shadow-xl">
                Aguarde...
              </div>
            </div>

            <button
              onClick={() => setTela('contaAberta')}
              className="mt-12 rounded-full bg-[#35249b] px-10 py-4 text-lg font-bold text-white shadow-xl"
            >
              Continuar
            </button>

            <div className="absolute bottom-10 max-w-[90%] rounded-full bg-white/70 px-8 py-3 text-center text-sm font-semibold text-zinc-600">
              Tela onde será posicionada a facial do cliente com a câmera frontal do seu tablet
            </div>
          </section>
        )}

        {tela === 'contaAberta' && (
          <section className="relative min-h-screen bg-white px-6 py-12 md:px-16">
            <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
              <div className="mb-12 flex h-56 w-56 items-center justify-center rounded-[42px] bg-zinc-50 shadow-inner">
                <div className="text-8xl">🎉</div>
              </div>

              <h1 className="text-3xl font-bold text-zinc-700 md:text-5xl">
                Abertura de conta concluída
              </h1>

              <p className="mt-8 text-xl font-semibold text-zinc-600 md:text-3xl">
                Agência: XXXX | Conta-corrente: XXXX-X
              </p>

              <p className="mt-10 max-w-3xl text-lg font-semibold leading-relaxed text-zinc-500 md:text-2xl">
                A conta já está liberada para fazer transferências, pagamentos,
                Pix e mais. É só baixar o app Bradesco.
              </p>

              <div className="mt-14 grid h-64 w-64 grid-cols-7 gap-2 bg-white p-4 shadow-xl">
                {Array.from({ length: 49 }).map((_, index) => (
                  <div
                    key={index}
                    className={`${
                      [
                        0, 1, 2, 4, 5, 6, 7, 13, 14, 16, 18, 20, 21, 27,
                        28, 30, 32, 34, 35, 41, 42, 43, 44, 46, 47, 48,
                      ].includes(index)
                        ? 'bg-zinc-800'
                        : 'bg-white'
                    }`}
                  />
                ))}
              </div>

              <div className="mt-14 flex w-full max-w-2xl flex-col gap-6">
                <button className="rounded-full border-2 border-[#35249b] px-10 py-5 text-xl font-bold text-[#35249b]">
                  Enviar comprovante por e-mail
                </button>

                <button className="rounded-full border-2 border-[#35249b] px-10 py-5 text-xl font-bold text-[#35249b]">
                  Imprimir comprovante
                </button>
              </div>
            </div>

            <button className="fixed bottom-4 right-4 rounded-full bg-[#35249b] px-6 py-4 text-base font-bold text-white shadow-2xl">
              Ajuda
            </button>
          </section>
        )}

        {![
          'documentoFrenteAviso',
          'documentoFrenteFoto',
          'documentoVersoAviso',
          'documentoVersoFoto',
          'avisoCestaServicos',
          'cameraBiometriaFinal',
          'contaAberta',
        ].includes(tela) && (
          <button className="fixed bottom-4 right-4 rounded-full bg-[#35249b] px-6 py-4 text-base font-bold text-white shadow-2xl">
            Ajuda
          </button>
        )}
      </div>
    </main>
  )
}

function Header() {
  return (
    <header className="border-t-4 border-[#2f2383] bg-white px-4 py-5">
      <div className="flex items-center justify-between gap-4">
        <button className="text-[#2f2383]">
          <div className="space-y-1">
            <span className="block h-[2px] w-7 bg-[#2f2383]" />
            <span className="block h-[2px] w-7 bg-[#2f2383]" />
            <span className="block h-[2px] w-7 bg-[#2f2383]" />
          </div>

          <span className="mt-1 block text-xs font-medium">Menu</span>
        </button>

        <div className="flex flex-col items-center justify-center text-center leading-none">
          <div className="text-3xl font-bold text-[#cc092f] md:text-5xl">
            bradesco
          </div>

          <div className="text-2xl font-bold text-[#8a1f55] md:text-4xl">
            expresso
          </div>

          <div className="mt-3 rounded-full border border-[#ed1c24] bg-[#fff1f2] px-4 py-2 text-[10px] font-bold tracking-wide text-[#b00020] md:text-xs">
            USO SOMENTE PARA TREINAMENTO
          </div>
        </div>

        <div className="flex items-center gap-3 text-zinc-700">
          <span className="text-2xl">♡</span>
          <div className="h-10 w-10 rounded-full bg-zinc-200 md:h-12 md:w-12" />
          <span className="text-xl">⌄</span>
        </div>
      </div>
    </header>
  )
}

function TopoTela({
  titulo,
  voltar,
  icone,
}: {
  titulo: string
  voltar: () => void
  icone: string
}) {
  return (
    <>
      <div className="h-7 bg-gradient-to-r from-[#e30613] to-[#a00078]" />

      <section className="px-6 pt-10 md:px-16 md:pt-16">
        <button
          onClick={voltar}
          className="mb-10 text-4xl font-light text-[#2f2383]"
        >
          ←
        </button>

        <div className="mb-20 flex items-center justify-center gap-4 text-zinc-500">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-400 text-3xl">
            {icone}
          </span>

          <span className="text-2xl font-semibold md:text-3xl">{titulo}</span>
        </div>
      </section>
    </>
  )
}

function BotaoDuplo({
  continuar,
  voltarInicio,
}: {
  continuar: () => void
  voltarInicio: () => void
}) {
  return (
    <div className="mt-16 flex flex-col items-center gap-10">
      <button
        onClick={continuar}
        className="w-full max-w-sm rounded-full bg-[#35249b] px-10 py-5 text-xl font-bold text-white shadow-xl"
      >
        Continuar
      </button>

      <button
        onClick={voltarInicio}
        className="text-lg font-semibold text-[#2f2383]"
      >
        Voltar ao início
      </button>
    </div>
  )
}

function DocumentoAviso({
  titulo,
  texto,
  voltar,
  continuar,
}: {
  titulo: string
  texto: string
  voltar: () => void
  continuar: () => void
}) {
  return (
    <section className="fixed inset-0 z-50 overflow-y-auto bg-zinc-900/75 px-4 py-6">
      <div className="flex min-h-full items-center justify-center">
        <div className="relative w-full max-w-3xl bg-white shadow-2xl">
          <button
            onClick={voltar}
            className="absolute right-4 top-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white text-4xl font-light text-zinc-500 shadow-lg"
          >
            ×
          </button>

          <div className="border-b border-zinc-200 px-8 py-6 pr-20 text-center">
            <h1 className="text-2xl font-bold text-zinc-700 md:text-4xl">
              {titulo}
            </h1>
          </div>

          <div className="border-b border-zinc-200 px-8 py-10 text-center">
            <p className="text-lg font-semibold text-zinc-500 md:text-2xl">
              {texto}
            </p>
          </div>

          <div className="flex justify-center px-8 py-7">
            <button
              onClick={continuar}
              className="rounded-full bg-[#35249b] px-12 py-4 text-lg font-bold text-white shadow-xl"
            >
              Ok, entendi
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function DocumentoCamera({
  titulo,
  voltar,
  capturar,
}: {
  titulo: string
  voltar: () => void
  capturar: () => void
}) {
  return (
    <section className="fixed inset-0 z-50 overflow-y-auto bg-zinc-900/85">
      <div className="mx-auto flex min-h-full w-full max-w-[1400px] flex-col">
        <div className="relative bg-white">
          <Header />

          <button
            onClick={voltar}
            className="absolute right-4 top-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white text-4xl font-light text-zinc-600 shadow-xl"
          >
            ×
          </button>
        </div>

        <div className="h-7 bg-gradient-to-r from-[#e30613] to-[#a00078]" />

        <div className="flex flex-1 flex-col items-center px-4 py-6 md:py-8">
          <div className="mb-5 text-center text-white">
            <p className="text-base font-semibold md:text-lg">Documentos</p>
            <h1 className="mt-1 text-xl font-bold md:text-2xl">{titulo}</h1>
          </div>

          <div className="relative flex w-full max-w-[520px] flex-col items-center justify-center overflow-hidden bg-zinc-800/80 p-4 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-700/70 to-zinc-950/80" />

            <div className="relative z-10 flex h-[58vh] min-h-[330px] max-h-[540px] w-full max-w-[340px] items-center justify-center border-4 border-[#e85b6a] bg-white/10">
              <RgExemplo />
            </div>

            <button
              onClick={capturar}
              className="relative z-20 mt-5 w-full max-w-xs rounded-full bg-[#35249b] px-8 py-4 text-base font-bold text-white shadow-xl md:text-lg"
            >
              Capturar Foto
            </button>
          </div>

          <button
            onClick={voltar}
            className="mt-5 text-base font-semibold text-white underline"
          >
            Voltar
          </button>
        </div>
      </div>
    </section>
  )
}

function TelaSenha({
  icone,
  titulo,
  descricao,
  destaque,
  mostrarRegras = false,
  continuar,
}: {
  icone: string
  titulo: string
  descricao: string
  destaque: string
  mostrarRegras?: boolean
  continuar: () => void
}) {
  const partes = descricao.split(destaque)

  return (
    <section className="px-6 pb-24 md:px-16">
      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <div className="mb-12 flex h-52 w-52 items-center justify-center rounded-[42px] bg-zinc-100 shadow-inner">
          <div className="text-8xl">{icone}</div>
        </div>

        <h1 className="max-w-3xl text-2xl font-bold leading-relaxed text-zinc-700 md:text-4xl">
          {titulo}
        </h1>

        <p className="mt-8 max-w-3xl text-lg font-semibold text-zinc-500 md:text-2xl">
          {partes[0]}
          <strong>{destaque}</strong>
          {partes[1]}
        </p>

        {mostrarRegras && (
          <div className="mt-16 w-full max-w-3xl rounded-3xl bg-zinc-50 p-8 text-left shadow-lg">
            <h2 className="mb-8 text-2xl font-bold text-zinc-700">
              Por motivos de segurança, a senha não pode ter:
            </h2>

            <div className="space-y-6 text-lg font-semibold text-zinc-600">
              <p>🔒 Números sequenciais (1234)</p>
              <p>🔒 Data de nascimento</p>
              <p>🔒 Dois ou mais números repetidos (1994)</p>
              <p>🔒 Zero no início (0258)</p>
            </div>
          </div>
        )}

        <button
          onClick={continuar}
          className="mt-16 w-full max-w-sm rounded-full bg-[#35249b] px-10 py-5 text-xl font-bold text-white shadow-xl"
        >
          Continuar
        </button>
      </div>
    </section>
  )
}


function ProdutoIlustracao() {
  return (
    <div className="mb-12 flex h-64 w-64 items-center justify-center rounded-[48px] bg-zinc-50 shadow-inner">
      <div className="relative flex h-36 w-52 items-center justify-center rounded-2xl border-2 border-zinc-300 bg-white shadow-xl">
        <div className="absolute -right-8 -top-8 flex h-20 w-20 items-center justify-center rounded-full border-4 border-zinc-600 bg-green-400 text-5xl text-white">
          ✓
        </div>

        <div className="text-6xl text-[#cc092f]">💳</div>

        <div className="absolute -bottom-8 -right-6 text-5xl">🛡️</div>
      </div>
    </div>
  )
}

function CoberturaItem({
  icon,
  title,
  value,
  text,
}: {
  icon: string
  title: string
  value: string
  text: string
}) {
  return (
    <div className="grid grid-cols-[48px_1fr_auto] gap-5 px-7 py-7">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-400 text-xl text-zinc-500">
        {icon}
      </div>

      <div>
        <h3 className="text-xl font-bold text-zinc-700 md:text-2xl">
          {title}
        </h3>

        <p className="mt-4 text-base font-semibold leading-relaxed text-zinc-600 md:text-lg">
          {text}
        </p>
      </div>

      <div className="whitespace-nowrap text-base font-bold text-zinc-600 md:text-xl">
        {value}
      </div>
    </div>
  )
}

function AvisoCestaServicos({
  voltar,
  continuar,
}: {
  voltar: () => void
  continuar: () => void
}) {
  return (
    <section className="fixed inset-0 z-50 overflow-y-auto bg-zinc-900/75 px-4 py-6">
      <div className="flex min-h-full items-center justify-center">
        <div className="relative w-full max-w-4xl bg-white p-8 text-center shadow-2xl md:p-14">
          <button
            onClick={voltar}
            className="absolute right-6 top-5 text-4xl font-light text-zinc-400"
          >
            ×
          </button>

          <div className="mx-auto mb-10 flex h-52 w-52 items-center justify-center rounded-[42px] bg-zinc-100 shadow-inner">
            <div className="text-8xl">📋</div>
          </div>

          <h1 className="mx-auto max-w-3xl text-2xl font-bold leading-relaxed text-zinc-700 md:text-4xl">
            Explique todas as informações da conta-corrente e dos produtos que podem ser contratados
          </h1>

          <p className="mx-auto mt-8 max-w-3xl text-lg font-semibold leading-relaxed text-zinc-500 md:text-2xl">
            É importante que a pessoa saiba sobre a cesta de serviços, o cartão de crédito e cheque especial.
          </p>

          <button
            onClick={continuar}
            className="mt-12 rounded-full bg-[#35249b] px-12 py-4 text-lg font-bold text-white shadow-xl"
          >
            Ok, entendi
          </button>
        </div>
      </div>
    </section>
  )
}

function CestaServicoCard({
  title,
  valor,
  onClick,
}: {
  title: string
  valor: string
  onClick: () => void
}) {
  return (
    <div className="overflow-hidden bg-white text-left shadow-xl">
      <div className="flex">
        <div className="w-4 bg-[#4534c5]" />

        <div className="flex-1 p-7">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto]">
            <div className="flex items-start gap-4">
              <div className="text-4xl text-zinc-500">🧺</div>

              <div>
                <h2 className="text-xl font-bold leading-tight text-zinc-700 md:text-2xl">
                  {title}
                </h2>

                <button className="mt-16 text-base font-bold text-zinc-500 md:text-lg">
                  Ver detalhes
                </button>
              </div>
            </div>

            <div className="text-left md:text-right">
              <p className="text-lg font-semibold text-zinc-500">Valor</p>
              <p className="mt-3 text-3xl font-bold text-zinc-700">{valor}</p>
              <p className="mt-3 text-lg font-semibold text-zinc-500">
                observação
              </p>

              <button
                onClick={onClick}
                className="mt-10 rounded-full bg-[#35249b] px-10 py-3 text-base font-bold text-white shadow-lg"
              >
                Escolher esta
              </button>
            </div>
          </div>

          <div className="mt-8 text-right text-4xl font-light text-zinc-400">
            ˅
          </div>
        </div>
      </div>
    </div>
  )
}




function ProdutoLimiteItem({
  title,
  value,
  description,
  checked = false,
}: {
  title: string
  value: string
  description: string
  checked?: boolean
}) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-white p-7 shadow-xl">
      <div className="flex items-start justify-between gap-5">
        <div className="flex items-start gap-5">
          <input
            type="checkbox"
            checked={checked}
            readOnly
            className="mt-1 h-6 w-6 accent-[#35249b]"
          />

          <div>
            <h2 className="text-xl font-bold text-zinc-700 md:text-2xl">
              {title}
            </h2>

            <p className="mt-6 text-base font-semibold leading-relaxed text-zinc-600 md:text-lg">
              {description}
            </p>
          </div>
        </div>

        <p className="whitespace-nowrap text-xl font-bold text-zinc-700 md:text-2xl">
          {value}
        </p>
      </div>
    </div>
  )
}

function ResumoProdutoCard({
  title,
  description,
  detail,
  actionText,
  toggle = false,
}: {
  title: string
  description: string
  detail?: string
  actionText?: string
  toggle?: boolean
}) {
  return (
    <div className="overflow-hidden bg-white shadow-xl">
      <div className="flex">
        <div className="w-4 bg-[#4534c5]" />

        <div className="flex-1 p-7">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-lg font-semibold text-zinc-400">
                {title}
              </p>

              <h2 className="mt-5 text-xl font-bold text-zinc-700 md:text-2xl">
                {description}
              </h2>

              {detail && (
                <p className="mt-7 text-lg font-semibold text-zinc-600">
                  {detail}
                </p>
              )}
            </div>

            <div className="flex flex-col items-end gap-6">
              {toggle && (
                <div className="flex h-8 w-16 items-center justify-end rounded-full bg-[#6c63b7] p-1">
                  <div className="h-6 w-6 rounded-full bg-white" />
                </div>
              )}

              {actionText && (
                <button className="text-base font-bold text-[#35249b]">
                  {actionText}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TermoCard({ title }: { title: string }) {
  return (
    <button className="group flex min-h-[112px] w-full items-center overflow-hidden bg-white text-left shadow-xl">
      <div className="h-full min-h-[112px] w-4 bg-[#c83f4a]" />

      <div className="flex flex-1 items-center gap-7 px-7 py-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-2xl text-zinc-400">
          ▤
        </div>

        <h2 className="text-xl font-bold text-zinc-600 md:text-2xl">
          {title}
        </h2>
      </div>
    </button>
  )
}

function CartaoCreditoCard({
  title,
  anuidade,
  observacao,
  onClick,
}: {
  title: string
  anuidade: string
  observacao?: string
  onClick: () => void
}) {
  return (
    <div className="overflow-hidden bg-white text-left shadow-xl">
      <div className="flex">
        <div className="w-4 bg-[#4534c5]" />

        <div className="flex-1 p-7">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-6">
              <div className="h-20 w-32 rounded-lg bg-zinc-700 shadow-lg" />

              <div>
                <h2 className="text-xl font-bold text-zinc-700 md:text-2xl">
                  {title}
                </h2>

                <p className="mt-8 text-base font-semibold text-zinc-500">
                  Anuidade
                </p>

                <p className="mt-1 text-lg font-bold text-zinc-600">
                  {anuidade}
                </p>

                {observacao && (
                  <p className="mt-2 text-base font-semibold text-zinc-500">
                    {observacao}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={onClick}
              className="self-end rounded-full bg-[#35249b] px-9 py-3 text-base font-bold text-white shadow-lg"
            >
              Escolher este
            </button>
          </div>

          <button className="mt-10 text-lg font-bold text-zinc-500">
            Ver benefícios ˅
          </button>
        </div>
      </div>
    </div>
  )
}

function RgExemplo() {
  return (
    <div className="flex h-[320px] w-[205px] flex-col overflow-hidden rounded-xl border-2 border-zinc-300 bg-white shadow-2xl md:h-[360px] md:w-[230px]">
      <div className="bg-[#2f2383] px-4 py-3 text-center text-sm font-bold text-white">
        RG EXEMPLO
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-200 text-5xl text-zinc-500">
          ♙
        </div>

        <div className="w-full space-y-3">
          <div className="h-3 w-full rounded bg-zinc-300" />
          <div className="h-3 w-10/12 rounded bg-zinc-300" />
          <div className="h-3 w-11/12 rounded bg-zinc-300" />
          <div className="h-3 w-8/12 rounded bg-zinc-300" />
        </div>

        <div className="mt-3 h-12 w-full rounded border border-zinc-300 bg-zinc-100" />
      </div>
    </div>
  )
}

function DocumentoIlustracao() {
  return (
    <div className="mb-12 flex h-52 w-52 items-center justify-center rounded-[42px] bg-zinc-100 shadow-inner">
      <div className="rotate-[-12deg] rounded-3xl border-[10px] border-zinc-600 bg-white px-10 py-14 shadow-xl">
        <div className="h-14 w-14 rounded-md border-4 border-yellow-300" />
      </div>
    </div>
  )
}

function DicaItem({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-5">
      <span className="text-3xl text-[#cc092f]">{icon}</span>

      <p className="text-lg font-semibold text-zinc-600 md:text-2xl">
        {text}
      </p>
    </div>
  )
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: string
  title: string
  text: string
}) {
  return (
    <div className="rounded-3xl bg-white p-6 text-center shadow-xl">
      <div className="mb-5 text-4xl text-[#cc092f]">{icon}</div>

      <h3 className="mb-4 text-2xl font-bold text-zinc-900">{title}</h3>

      <p className="text-base leading-relaxed text-zinc-700">{text}</p>
    </div>
  )
}

function CampoLinha({
  label,
  value,
  onChange,
  readOnly,
  icon,
  placeholder,
}: {
  label: string
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  icon?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-2 block text-base font-semibold text-zinc-400">
        {label}
      </label>

      <div className="flex items-center gap-4 border-b border-zinc-500">
        {icon && <span className="text-2xl text-zinc-400">{icon}</span>}

        <input
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          readOnly={readOnly}
          placeholder={placeholder}
          className={`w-full bg-transparent py-3 text-2xl font-semibold outline-none placeholder:text-zinc-300 ${
            readOnly ? 'cursor-not-allowed text-zinc-400' : 'text-zinc-600'
          }`}
        />
      </div>
    </div>
  )
}

function TipoContaCard({
  title,
  subtitle,
  onClick,
}: {
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex min-h-[112px] w-full items-center justify-between overflow-hidden bg-white text-left shadow-xl"
    >
      <div className="h-full min-h-[112px] w-4 bg-[#4534c5]" />

      <div className="flex-1 px-7 py-6">
        <h2 className="text-xl font-bold text-zinc-700 md:text-2xl">
          {title}
        </h2>

        <p className="mt-1 text-base font-semibold text-zinc-500 md:text-lg">
          {subtitle}
        </p>
      </div>

      <div className="px-8 text-5xl font-light text-zinc-400">›</div>
    </button>
  )
}

function OpcaoSimplesCard({
  title,
  subtitle,
  onClick,
}: {
  title: string
  subtitle?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex min-h-[112px] w-full items-center justify-between overflow-hidden bg-white text-left shadow-xl"
    >
      <div className="h-full min-h-[112px] w-4 bg-[#4534c5]" />

      <div className="flex-1 px-7 py-6">
        <h2 className="text-xl font-bold text-zinc-700 md:text-2xl">
          {title}
        </h2>

        {subtitle && (
          <p className="mt-1 text-base font-semibold text-zinc-500 md:text-lg">
            {subtitle}
          </p>
        )}
      </div>

      <div className="px-8 text-5xl font-light text-zinc-400">›</div>
    </button>
  )
}
