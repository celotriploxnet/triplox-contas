/*
  ARQUIVO COMPLETO DO SIMULADOR - page.tsx

  Dobby manteve o fluxo completo e adicionou:
  - dadosDocumento
  - senha4Digitos
  - senha6Digitos

  Observação: a versão anterior ficou menor porque foi compactada em algumas linhas.
  Esta versão mantém o mesmo fluxo completo, com todas as telas do simulador.
*/

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
  const [nomeMae, setNomeMae] = useState('ODETE FERREIRA ROSA')
  const [nomePai, setNomePai] = useState('')
  const [maeNaoInformada, setMaeNaoInformada] = useState(false)
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
    return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function formatarCelular(valor: string) {
    const numeros = valor.replace(/\D/g, '').slice(0, 11)
    if (numeros.length <= 10) {
      return numeros.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
    }
    return numeros.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
  }

  function avancarCpf() {
    if (cpf.replace(/\D/g, '').length !== 11) {
      setErro('Informe um CPF válido para continuar.')
      return
    }
    setErro('')
    setTela('tipoConta')
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
                style={{ backgroundImage: "linear-gradient(90deg, rgba(0,0,0,.78), rgba(0,0,0,.18)), url('/simulador/mulher-tablet.jpg')" }}
              />
              <div className="relative z-10 flex h-full flex-col justify-center px-8 text-white md:px-16">
                <div className="mb-10 text-4xl md:text-6xl">←</div>
                <h1 className="text-3xl font-semibold md:text-5xl">Abertura de conta</h1>
              </div>
            </section>

            <section className="relative z-20 -mt-14 px-4 md:-mt-20 md:px-10">
              <div className="rounded-3xl bg-gradient-to-r from-[#ed1c24] to-[#b00075] p-5 text-white shadow-2xl md:p-8">
                <p className="mb-6 text-center text-lg font-bold md:text-2xl">Para começar, informe o CPF</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1 rounded-2xl bg-black/15 px-5 py-5 backdrop-blur-sm">
                    <label className="block text-base font-semibold md:text-lg">CPF da pessoa</label>
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
                  <button onClick={avancarCpf} className="flex h-16 w-16 items-center justify-center rounded-full bg-[#34259b] text-3xl shadow-xl">⌕</button>
                </div>
                {erro && <p className="mt-4 text-center text-sm font-bold text-white">{erro}</p>}
              </div>
            </section>

            <section className="px-6 pt-16 md:px-12 md:pt-24">
              <h2 className="mb-6 text-2xl font-bold text-zinc-900 md:text-4xl">Mais praticidade para a vida financeira</h2>
              <p className="max-w-4xl text-base leading-relaxed text-zinc-700 md:text-xl">
                Com a conta-corrente Bradesco, é possível receber e transferir dinheiro via Pix, pagar contas pelo celular, fazer empréstimos e muito mais.
              </p>
            </section>

            <section className="grid grid-cols-1 gap-5 px-5 pt-10 pb-24 md:grid-cols-3 md:px-10">
              <InfoCard icon="♙" title="Pra quem é" text="Para qualquer pessoa Física. A conta pode ser individual ou conjunta - com até 7 titulares." />
              <InfoCard icon="?" title="Como funciona" text="Só é necessário informar os dados pessoais e apresentar documentos de identificação." />
              <InfoCard icon="$" title="Vantagens" text="A conta é aberta na hora e já dá pra fazer transferências, depósitos e pagamentos." />
            </section>
          </>
        )}

        {tela === 'tipoConta' && (
          <>
            <TopoTela titulo="Tipo de conta" voltar={() => setTela('cpf')} icone="♙" />
            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-5xl text-center">
                <h1 className="mb-14 text-2xl font-bold text-zinc-700 md:text-4xl">Qual conta a pessoa quer abrir?</h1>
                <p className="mb-12 text-lg font-semibold text-zinc-500 md:text-2xl">Todas servem para fazer Pix, pagar conta, receber dinheiro e mais.</p>
              </div>
              <div className="mx-auto flex max-w-6xl flex-col gap-7">
                <TipoContaCard title="Conta individual" subtitle="Pra apenas 1 titular." onClick={() => setTela('rendaMensal')} />
                <TipoContaCard title="Conta conjunta" subtitle="De 2 a 3 titulares, sendo necessário que estejam presentes." onClick={() => setTela('rendaMensal')} />
                <TipoContaCard title="Conta pra salário" subtitle="Pra quem trabalha em uma empresa que tem convênio com o Bradesco." onClick={() => setTela('rendaMensal')} />
                <TipoContaCard title="Conta pra benefício INSS" subtitle="Para quem é aposentado ou pensionista do INSS." onClick={() => setTela('rendaMensal')} />
              </div>
            </section>
          </>
        )}

        {tela === 'rendaMensal' && (
          <>
            <TopoTela titulo="Dados pessoais" voltar={() => setTela('tipoConta')} icone="♙" />
            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-3xl">
                <h1 className="mb-20 text-center text-2xl font-bold text-zinc-700 md:text-4xl">Qual é a renda mensal da pessoa?</h1>
                <div className="mx-auto max-w-2xl">
                  <label className="mb-2 block text-lg font-semibold text-zinc-500">R$</label>
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
                {erro && <p className="mt-6 text-center text-sm font-bold text-[#b00020]">{erro}</p>}
                <div className="mt-28 flex flex-col items-center gap-8">
                  <button onClick={continuarRenda} className="w-full max-w-sm rounded-full bg-[#35249b] px-10 py-5 text-lg font-bold text-white shadow-lg">Continuar</button>
                  <button onClick={() => setTela('tipoConta')} className="text-lg font-semibold text-[#2f2383]">Voltar</button>
                </div>
              </div>
            </section>
          </>
        )}

        {tela === 'alfabetizada' && (
          <>
            <TopoTela titulo="Dados pessoais" voltar={() => setTela('rendaMensal')} icone="♙" />
            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-5xl text-center">
                <h1 className="mb-14 text-2xl font-bold text-zinc-700 md:text-4xl">A pessoa é alfabetizada?</h1>
              </div>
              <div className="mx-auto flex max-w-6xl flex-col gap-7 pb-32">
                <OpcaoSimplesCard title="Sim" onClick={() => setTela('biometria')} />
                <OpcaoSimplesCard title="Não" subtitle="É necessária a presença de duas testemunhas." onClick={() => alert('Fluxo de testemunhas será criado.')} />
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
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-[#cc092f] text-5xl text-[#cc092f]">☺</div>
                </div>
                <h1 className="max-w-4xl text-center text-3xl font-bold leading-relaxed text-zinc-700 md:text-5xl">
                  Pra concluir, faça a biometria de quem está abrindo a conta
                </h1>
                <div className="mt-16 flex w-full max-w-4xl flex-col gap-10">
                  <DicaItem icon="☀" text="Estejam em um lugar bem iluminado" />
                  <DicaItem icon="⊘" text="Peça para a pessoa tirar boné, óculos ou acessórios que cubram o rosto" />
                  <DicaItem icon="☺" text="Segure a câmera na altura do rosto da pessoa e siga as instruções" />
                </div>
                <button onClick={() => setTela('cameraBiometria')} className="mt-24 w-full max-w-sm rounded-full bg-[#35249b] px-10 py-5 text-xl font-bold text-white shadow-xl">Continuar</button>
              </div>
            </section>
          </>
        )}

        {tela === 'cameraBiometria' && (
          <section className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-900 text-white">
            <button onClick={() => setTela('biometria')} className="absolute left-6 top-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/80 text-5xl text-zinc-700">×</button>
            <div className="absolute right-8 top-8 h-5 w-5 rounded-full bg-green-400" />
            <div className="flex h-[62vh] w-[72vw] max-w-[620px] items-center justify-center rounded-[50%] border-[18px] border-white/15 bg-white/20">
              <div className="rounded-xl bg-zinc-800/80 px-10 py-5 text-2xl font-semibold text-white shadow-xl">Aguarde...</div>
            </div>
            <button onClick={() => setTela('contatos')} className="mt-12 rounded-full bg-[#35249b] px-10 py-4 text-lg font-bold text-white shadow-xl">Continuar</button>
            <div className="absolute bottom-10 max-w-[90%] rounded-full bg-white/70 px-8 py-3 text-center text-sm font-semibold text-zinc-600">
              Tela onde será posicionada a facial do cliente com a câmera frontal do seu tablet
            </div>
          </section>
        )}

        {tela === 'contatos' && (
          <>
            <TopoTela titulo="Dados pessoais" voltar={() => setTela('cameraBiometria')} icone="♙" />
            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-3xl">
                <h1 className="mb-20 text-center text-2xl font-bold text-zinc-700 md:text-4xl">Quais são os contatos da pessoa?</h1>
                <div className="space-y-16">
                  <CampoLinha label="Celular" value={celular} onChange={(value) => setCelular(formatarCelular(value))} placeholder="(71) 99999-9999" />
                  <CampoLinha label="E-mail" value={email} onChange={setEmail} placeholder="Opcional" />
                </div>
                <div className="mt-20 text-center">
                  <p className="text-xl font-semibold text-zinc-600">Peça autorização da pessoa para que o Bradesco entre em contato com ela.</p>
                  <div className="mx-auto mt-10 flex max-w-2xl items-start gap-5 rounded-2xl bg-zinc-100 p-6 text-left">
                    <input type="checkbox" checked={aceiteContato} onChange={() => setAceiteContato(!aceiteContato)} className="mt-1 h-6 w-6 accent-[#35249b]" />
                    <p className="text-lg font-semibold text-zinc-700">Concordo que o Bradesco fale comigo sobre minha conta e novidades por esse celular</p>
                  </div>
                </div>
                <div className="mt-16 flex flex-col items-center gap-10">
                  <button onClick={() => setTela('dadosPessoa')} className="w-full max-w-sm rounded-full bg-[#35249b] px-10 py-5 text-xl font-bold text-white shadow-xl">Continuar</button>
                  <button onClick={() => setTela('cpf')} className="text-lg font-semibold text-[#2f2383]">Voltar ao início</button>
                </div>
              </div>
            </section>
          </>
        )}

        {tela === 'dadosPessoa' && (
          <>
            <TopoTela titulo="Dados pessoais" voltar={() => setTela('contatos')} icone="♙" />
            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-3xl">
                <h1 className="mb-16 text-center text-2xl font-bold text-zinc-700 md:text-4xl">Quais são os dados da pessoa?</h1>
                <div className="space-y-14">
                  <CampoLinha label="CPF" value={cpf} readOnly />
                  <CampoLinha label="Nome completo" value="NOME COMPLETO DO CLIENTE" readOnly />
                  <CampoLinha label="data de nascimento" value="10/05/1986" readOnly />
                  <CampoLinha label="País onde nasceu" value={paisNascimento} onChange={setPaisNascimento} icon="⌕" />
                  <CampoLinha label="Estado onde nasceu" value={estadoNascimento} onChange={setEstadoNascimento} icon="⌕" placeholder="Selecione o estado de nascimento" />
                  <CampoLinha label="Cidade onde nasceu" value={cidadeNascimento} onChange={setCidadeNascimento} icon="⌕" placeholder="Selecione a Cidade de nascimento do cliente" />
                </div>
                <BotaoDuplo continuar={() => setTela('endereco')} voltarInicio={() => setTela('cpf')} />
              </div>
            </section>
          </>
        )}

        {tela === 'endereco' && (
          <>
            <TopoTela titulo="Dados pessoais" voltar={() => setTela('dadosPessoa')} icone="♙" />
            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-3xl">
                <h1 className="mb-8 text-center text-2xl font-bold text-zinc-700 md:text-4xl">Qual é o endereço da pessoa?</h1>
                <p className="mb-16 text-center text-lg font-semibold text-zinc-500 md:text-2xl">O cartão será enviado para o endereço informado.</p>
                <div className="space-y-12">
                  <CampoLinha label="CEP" value={cep} onChange={setCep} />
                  <CampoLinha label="Estado" value={estado} onChange={setEstado} icon="⌕" />
                  <CampoLinha label="Cidade" value={cidade} onChange={setCidade} icon="⌕" />
                  <CampoLinha label="Bairro" value={bairro} onChange={setBairro} />
                  <CampoLinha label="Rua, alameda, avenida" value={rua} onChange={setRua} />
                  <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                    <div>
                      <CampoLinha label="Número" value={numero} onChange={setNumero} readOnly={semNumero} />
                      <label className="mt-4 flex items-center gap-3 text-base font-semibold text-zinc-500">
                        <input type="checkbox" checked={semNumero} onChange={() => setSemNumero(!semNumero)} className="h-5 w-5 accent-[#35249b]" />
                        Sem número
                      </label>
                    </div>
                    <CampoLinha label="Complemento" value={complemento} onChange={setComplemento} placeholder="Opcional." />
                  </div>
                </div>
                <BotaoDuplo continuar={() => setTela('profissao')} voltarInicio={() => setTela('cpf')} />
              </div>
            </section>
          </>
        )}

        {tela === 'profissao' && (
          <>
            <TopoTela titulo="Dados pessoais" voltar={() => setTela('endereco')} icone="♙" />
            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-3xl">
                <h1 className="mb-20 text-center text-2xl font-bold text-zinc-700 md:text-4xl">Qual é a profissão da pessoa?</h1>
                <div className="mx-auto max-w-2xl">
                  <div className="flex items-center gap-4 border-b border-zinc-500">
                    <select
                      value={categoriaProfissional}
                      onChange={(event) => setCategoriaProfissional(event.target.value)}
                      className="w-full bg-transparent py-3 text-2xl font-semibold text-zinc-500 outline-none"
                    >
                      <option value="">Categoria profissional</option>
                      <option value="assalariado">Assalariado</option>
                      <option value="autonomo">Autônomo</option>
                      <option value="aposentado">Aposentado/Pensionista</option>
                      <option value="empresario">Empresário</option>
                      <option value="outros">Outros</option>
                    </select>
                    <span className="text-3xl text-zinc-400">˅</span>
                  </div>
                </div>
                <div className="mt-24 flex flex-col items-center gap-10">
                  <button onClick={() => setTela('residenciaFiscal')} className="w-full max-w-sm rounded-full bg-[#35249b] px-10 py-5 text-xl font-bold text-white shadow-xl">Continuar</button>
                  <button onClick={() => setTela('endereco')} className="text-lg font-semibold text-[#2f2383]">Voltar</button>
                </div>
              </div>
            </section>
          </>
        )}

        {tela === 'residenciaFiscal' && (
          <>
            <TopoTela titulo="Dados pessoais" voltar={() => setTela('profissao')} icone="♙" />
            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-5xl text-center">
                <h1 className="mb-6 text-2xl font-bold text-zinc-700 md:text-4xl">A pessoa tem residência fiscal apenas no Brasil?</h1>
                <p className="mb-14 text-lg font-semibold text-zinc-500 md:text-2xl">Por que pedimos essa informação ?</p>
              </div>
              <div className="mx-auto flex max-w-6xl flex-col gap-7 pb-32">
                <OpcaoSimplesCard title="Sim" onClick={() => setTela('documentos')} />
                <OpcaoSimplesCard title="Não" subtitle="É necessário um documento da outra nacionalidade." onClick={() => setTela('documentos')} />
              </div>
            </section>
          </>
        )}

        {tela === 'documentos' && (
          <>
            <TopoTela titulo="Documentos" voltar={() => setTela('residenciaFiscal')} icone="♙" />
            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-5xl text-center">
                <h1 className="mb-14 text-2xl font-bold text-zinc-700 md:text-4xl">Qual documento a pessoa vai usar?</h1>
              </div>
              <div className="mx-auto flex max-w-6xl flex-col gap-7 pb-32">
                <TipoContaCard title="RG" subtitle="Carteira de identidade." onClick={() => setTela('documentoDicas')} />
                <TipoContaCard title="CNH" subtitle="Carteira de motorista." onClick={() => setTela('documentoDicas')} />
                <TipoContaCard title="RNM ou RNE" subtitle="Documento de identidade estrangeira." onClick={() => setTela('documentoDicas')} />
                <TipoContaCard title="Outro" subtitle="Identidade nacional, carteira de trabalho, registro profissional e CIM." onClick={() => setTela('documentoDicas')} />
              </div>
            </section>
          </>
        )}

        {tela === 'documentoDicas' && (
          <>
            <TopoTela titulo="Documentos" voltar={() => setTela('documentos')} icone="♙" />
            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto flex max-w-4xl flex-col items-center">
                <DocumentoIlustracao />
                <h1 className="mb-14 max-w-3xl text-center text-2xl font-bold leading-relaxed text-zinc-700 md:text-4xl">
                  Antes de capturar a imagem do documento, confira estas dicas
                </h1>
                <div className="flex w-full max-w-3xl flex-col gap-10">
                  <DicaItem icon="☀" text="Escolha um lugar bem iluminado" />
                  <DicaItem icon="▣" text="Coloque o documento original sobre uma superfície plana, se possível sem o plástico" />
                  <DicaItem icon="▤" text="Capture um lado por vez - a frente é onde tem a foto" />
                </div>
                <button onClick={() => setTela('documentoFrenteAviso')} className="mt-16 w-full max-w-sm rounded-full bg-[#35249b] px-10 py-5 text-xl font-bold text-white shadow-xl">
                  Ok, vamos lá
                </button>
              </div>
            </section>
          </>
        )}

        {tela === 'documentoFrenteAviso' && (
          <DocumentoAviso titulo="Frente do documento" texto="Centralize a frente do documento." voltar={() => setTela('documentoDicas')} continuar={() => setTela('documentoFrenteFoto')} />
        )}

        {tela === 'documentoFrenteFoto' && (
          <DocumentoCamera titulo="Frente do documento" voltar={() => setTela('documentoFrenteAviso')} capturar={() => setTela('documentoVersoAviso')} />
        )}

        {tela === 'documentoVersoAviso' && (
          <DocumentoAviso titulo="Verso do documento" texto="Centralize o verso do documento." voltar={() => setTela('documentoFrenteFoto')} continuar={() => setTela('documentoVersoFoto')} />
        )}

        {tela === 'documentoVersoFoto' && (
          <DocumentoCamera titulo="Verso do documento" voltar={() => setTela('documentoVersoAviso')} capturar={() => setTela('dadosDocumento')} />
        )}

        {tela === 'dadosDocumento' && (
          <>
            <TopoTela titulo="Documentos" voltar={() => setTela('documentoVersoFoto')} icone="♙" />
            <section className="px-6 pb-24 md:px-16">
              <div className="mx-auto max-w-3xl">
                <h1 className="mb-16 text-center text-2xl font-bold leading-relaxed text-zinc-700 md:text-4xl">
                  Confira com a pessoa as informações do documento
                </h1>
                <div className="space-y-12">
                  <CampoLinha label="Número do documento" value={numeroDocumento} onChange={setNumeroDocumento} />
                  <CampoLinha label="Órgão emissor" value={orgaoEmissor} onChange={setOrgaoEmissor} icon="⌕" />

                  <div>
                    <label className="mb-2 block text-base font-semibold text-zinc-400">UF Órgão Emissor</label>
                    <div className="flex items-center gap-4 border-b border-zinc-500">
                      <select
                        value={ufOrgaoEmissor}
                        onChange={(event) => setUfOrgaoEmissor(event.target.value)}
                        className="w-full bg-transparent py-3 text-2xl font-semibold text-zinc-500 outline-none"
                      >
                        <option value="">UF Órgão Emissor</option>
                        <option value="BA">BA</option>
                        <option value="SP">SP</option>
                        <option value="RJ">RJ</option>
                        <option value="MG">MG</option>
                      </select>
                      <span className="text-3xl text-zinc-400">˅</span>
                    </div>
                  </div>

                  <CampoLinha label="Data de expedição/emissão" value={dataExpedicao} onChange={setDataExpedicao} placeholder="00/00/0000" />

                  <div>
                    <CampoLinha label="Nome da mãe" value={nomeMae} onChange={setNomeMae} readOnly={maeNaoInformada} />
                    <label className="mt-4 flex items-center gap-3 text-base font-semibold text-zinc-500">
                      <input type="checkbox" checked={maeNaoInformada} onChange={() => setMaeNaoInformada(!maeNaoInformada)} className="h-5 w-5 accent-[#35249b]" />
                      Não informado
                    </label>
                  </div>

                  <CampoLinha label="Nome do pai" value={nomePai} onChange={setNomePai} />
                </div>

                <div className="mt-20 flex flex-col items-center gap-10">
                  <button onClick={() => setTela('senha4Digitos')} className="w-full max-w-sm rounded-full bg-[#35249b] px-10 py-5 text-xl font-bold text-white shadow-xl">
                    Continuar
                  </button>
                  <button onClick={() => setTela('documentoVersoFoto')} className="text-lg font-semibold text-[#2f2383]">
                    Voltar
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {tela === 'senha4Digitos' && (
          <>
            <TopoTela titulo="Documentos" voltar={() => setTela('dadosDocumento')} icone="♙" />
            <TelaSenha
              icone="🔒"
              titulo="Peça para criar a senha de acesso à conta na maquininha"
              descricao={
                <>
                  Ela deve ter <strong>4 dígitos</strong> e a pessoa vai usá-la para acessar a conta pelo app Bradesco, internet banking e Fone Fácil.
                </>
              }
              continuar={() => setTela('senha6Digitos')}
              textoBotao="Continuar"
              mostrarRegras
            />
          </>
        )}

        {tela === 'senha6Digitos' && (
          <>
            <TopoTela titulo="Documentos" voltar={() => setTela('senha4Digitos')} icone="♙" />
            <TelaSenha
              icone="💳"
              titulo="Agora peça para criar a senha do cartão"
              descricao={
                <>
                  Ela deve ter <strong>6 dígitos</strong> e a pessoa irá usa-la com o seu cartão da conta, compras no débito.
                </>
              }
              continuar={() => alert('Próxima etapa será criada.')}
              textoBotao="Continuar"
            />
          </>
        )}

        {![
          'documentoFrenteAviso',
          'documentoFrenteFoto',
          'documentoVersoAviso',
          'documentoVersoFoto',
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
          <div className="text-3xl font-bold text-[#cc092f] md:text-5xl">bradesco</div>
          <div className="text-2xl font-bold text-[#8a1f55] md:text-4xl">expresso</div>
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

function TopoTela({ titulo, voltar, icone }: { titulo: string; voltar: () => void; icone: string }) {
  return (
    <>
      <div className="h-7 bg-gradient-to-r from-[#e30613] to-[#a00078]" />
      <section className="px-6 pt-10 md:px-16 md:pt-16">
        <button onClick={voltar} className="mb-10 text-4xl font-light text-[#2f2383]">←</button>
        <div className="mb-20 flex items-center justify-center gap-4 text-zinc-500">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-400 text-3xl">{icone}</span>
          <span className="text-2xl font-semibold md:text-3xl">{titulo}</span>
        </div>
      </section>
    </>
  )
}

function BotaoDuplo({ continuar, voltarInicio }: { continuar: () => void; voltarInicio: () => void }) {
  return (
    <div className="mt-16 flex flex-col items-center gap-10">
      <button onClick={continuar} className="w-full max-w-sm rounded-full bg-[#35249b] px-10 py-5 text-xl font-bold text-white shadow-xl">Continuar</button>
      <button onClick={voltarInicio} className="text-lg font-semibold text-[#2f2383]">Voltar ao início</button>
    </div>
  )
}

function DocumentoAviso({ titulo, texto, voltar, continuar }: { titulo: string; texto: string; voltar: () => void; continuar: () => void }) {
  return (
    <section className="fixed inset-0 z-50 overflow-y-auto bg-zinc-900/75 px-4 py-6">
      <div className="flex min-h-full items-center justify-center">
        <div className="relative w-full max-w-3xl bg-white shadow-2xl">
          <button onClick={voltar} className="absolute right-4 top-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white text-4xl font-light text-zinc-500 shadow-lg">×</button>
          <div className="border-b border-zinc-200 px-8 py-6 pr-20 text-center">
            <h1 className="text-2xl font-bold text-zinc-700 md:text-4xl">{titulo}</h1>
          </div>
          <div className="border-b border-zinc-200 px-8 py-10 text-center">
            <p className="text-lg font-semibold text-zinc-500 md:text-2xl">{texto}</p>
          </div>
          <div className="flex justify-center px-8 py-7">
            <button onClick={continuar} className="rounded-full bg-[#35249b] px-12 py-4 text-lg font-bold text-white shadow-xl">Ok, entendi</button>
          </div>
        </div>
      </div>
    </section>
  )
}

function DocumentoCamera({ titulo, voltar, capturar }: { titulo: string; voltar: () => void; capturar: () => void }) {
  return (
    <section className="fixed inset-0 z-50 overflow-y-auto bg-zinc-900/85">
      <div className="mx-auto flex min-h-full w-full max-w-[1400px] flex-col">
        <div className="relative bg-white">
          <Header />
          <button onClick={voltar} className="absolute right-4 top-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white text-4xl font-light text-zinc-600 shadow-xl">×</button>
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
            <button onClick={capturar} className="relative z-20 mt-5 w-full max-w-xs rounded-full bg-[#35249b] px-8 py-4 text-base font-bold text-white shadow-xl md:text-lg">
              Capturar Foto
            </button>
          </div>

          <button onClick={voltar} className="mt-5 text-base font-semibold text-white underline">Voltar</button>
        </div>
      </div>
    </section>
  )
}

function TelaSenha({
  icone,
  titulo,
  descricao,
  continuar,
  textoBotao,
  mostrarRegras = false,
}: {
  icone: string
  titulo: string
  descricao: React.ReactNode
  continuar: () => void
  textoBotao: string
  mostrarRegras?: boolean
}) {
  return (
    <section className="px-6 pb-24 md:px-16">
      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <div className="mb-12 flex h-52 w-52 items-center justify-center rounded-[42px] bg-zinc-100 shadow-inner">
          <div className="text-8xl">{icone}</div>
        </div>

        <h1 className="max-w-3xl text-2xl font-bold leading-relaxed text-zinc-700 md:text-4xl">{titulo}</h1>

        <p className="mt-8 max-w-3xl text-lg font-semibold text-zinc-500 md:text-2xl">{descricao}</p>

        {mostrarRegras && (
          <div className="mt-16 w-full max-w-3xl rounded-3xl bg-zinc-50 p-8 text-left shadow-lg">
            <h2 className="mb-8 text-2xl font-bold text-zinc-700">Por motivos de segurança, a senha não pode ter:</h2>
            <div className="space-y-6 text-lg font-semibold text-zinc-600">
              <p>🔒 Números sequenciais (1234)</p>
              <p>🔒 Data de nascimento</p>
              <p>🔒 Dois ou mais números repetidos (1994)</p>
              <p>🔒 Zero no início (0258)</p>
            </div>
          </div>
        )}

        <button onClick={continuar} className="mt-16 w-full max-w-sm rounded-full bg-[#35249b] px-10 py-5 text-xl font-bold text-white shadow-xl">
          {textoBotao}
        </button>
      </div>
    </section>
  )
}

function RgExemplo() {
  return (
    <div className="flex h-[320px] w-[205px] flex-col overflow-hidden rounded-xl border-2 border-zinc-300 bg-white shadow-2xl md:h-[360px] md:w-[230px]">
      <div className="bg-[#2f2383] px-4 py-3 text-center text-sm font-bold text-white">RG EXEMPLO</div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-200 text-5xl text-zinc-500">♙</div>
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
      <p className="text-lg font-semibold text-zinc-600 md:text-2xl">{text}</p>
    </div>
  )
}

function InfoCard({ icon, title, text }: { icon: string; title: string; text: string }) {
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
      <label className="mb-2 block text-base font-semibold text-zinc-400">{label}</label>
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

function TipoContaCard({ title, subtitle, onClick }: { title: string; subtitle: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group flex min-h-[112px] w-full items-center justify-between overflow-hidden bg-white text-left shadow-xl">
      <div className="h-full min-h-[112px] w-4 bg-[#4534c5]" />
      <div className="flex-1 px-7 py-6">
        <h2 className="text-xl font-bold text-zinc-700 md:text-2xl">{title}</h2>
        <p className="mt-1 text-base font-semibold text-zinc-500 md:text-lg">{subtitle}</p>
      </div>
      <div className="px-8 text-5xl font-light text-zinc-400">›</div>
    </button>
  )
}

function OpcaoSimplesCard({ title, subtitle, onClick }: { title: string; subtitle?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group flex min-h-[112px] w-full items-center justify-between overflow-hidden bg-white text-left shadow-xl">
      <div className="h-full min-h-[112px] w-4 bg-[#4534c5]" />
      <div className="flex-1 px-7 py-6">
        <h2 className="text-xl font-bold text-zinc-700 md:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-base font-semibold text-zinc-500 md:text-lg">{subtitle}</p>}
      </div>
      <div className="px-8 text-5xl font-light text-zinc-400">›</div>
    </button>
  )
}
