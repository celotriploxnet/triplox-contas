'use client'

import { FormEvent, useMemo, useState } from 'react'

type BemDesejado = '' | 'MOTO' | 'CARRO' | 'IMOVEL'

export default function CotacaoConsorcioPage() {
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [celular, setCelular] = useState('')
  const [email, setEmail] = useState('')
  const [bemDesejado, setBemDesejado] = useState<BemDesejado>('MOTO')
  const [valorBem, setValorBem] = useState('')
  const [empresa, setEmpresa] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')

  function somenteNumeros(valor: string) {
    return valor.replace(/\D/g, '')
  }

  function formatarCPF(valor: string) {
    const numeros = somenteNumeros(valor).slice(0, 11)

    if (numeros.length <= 3) return numeros

    if (numeros.length <= 6) {
      return `${numeros.slice(0, 3)}.${numeros.slice(3)}`
    }

    if (numeros.length <= 9) {
      return `${numeros.slice(0, 3)}.${numeros.slice(
        3,
        6
      )}.${numeros.slice(6)}`
    }

    return `${numeros.slice(0, 3)}.${numeros.slice(
      3,
      6
    )}.${numeros.slice(6, 9)}-${numeros.slice(9, 11)}`
  }

  function formatarCelular(valor: string) {
    const numeros = somenteNumeros(valor).slice(0, 11)

    if (numeros.length <= 2) return numeros

    if (numeros.length <= 7) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
    }

    if (numeros.length <= 10) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(
        2,
        6
      )}-${numeros.slice(6)}`
    }

    return `(${numeros.slice(0, 2)}) ${numeros.slice(
      2,
      7
    )}-${numeros.slice(7, 11)}`
  }

  function formatarValor(valor: string) {
    const numeros = somenteNumeros(valor)

    if (!numeros) return ''

    const numero = Number(numeros) / 100

    return numero.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  function cpfCompleto(valor: string) {
    return somenteNumeros(valor).length === 11
  }

  function celularCompleto(valor: string) {
    const tamanho = somenteNumeros(valor).length
    return tamanho === 10 || tamanho === 11
  }

  const formularioValido = useMemo(() => {
    return (
      nome.trim().length >= 3 &&
      cpfCompleto(cpf) &&
      celularCompleto(celular) &&
      email.trim() !== '' &&
      bemDesejado !== '' &&
      valorBem.trim() !== ''
    )
  }, [nome, cpf, celular, email, bemDesejado, valorBem])

  async function enviarCotacao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setErro('')
    setSucesso('')

    if (!nome.trim()) {
      setErro('Informe seu nome completo.')
      return
    }

    if (!cpfCompleto(cpf)) {
      setErro('Informe um CPF válido.')
      return
    }

    if (!celularCompleto(celular)) {
      setErro('Informe um celular válido.')
      return
    }

    if (!email.trim()) {
      setErro('Informe seu e-mail.')
      return
    }

    if (!bemDesejado) {
      setErro('Selecione o bem desejado.')
      return
    }

    if (!valorBem.trim()) {
      setErro('Informe o valor do bem desejado.')
      return
    }

    setEnviando(true)

    try {
      const response = await fetch('/api/cotacao-consorcio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: nome.trim(),
          cpf,
          celular,
          email: email.trim(),
          bemDesejado,
          valorBem,
          empresa,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Não foi possível enviar sua solicitação. Tente novamente.'
        )
      }

      setSucesso(
        'Sua solicitação foi enviada com sucesso! Em breve entraremos em contato com você.'
      )

      setNome('')
      setCpf('')
      setCelular('')
      setEmail('')
      setBemDesejado('MOTO')
      setValorBem('')
      setEmpresa('')
    } catch (error: any) {
      console.error('Erro ao enviar cotação:', error)

      setErro(
        error?.message ||
          'Não foi possível enviar sua solicitação. Tente novamente.'
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <main className="pagina">
        {/* CABEÇALHO */}
        <header className="cabecalho">
          <div className="cabecalhoInterno">
            <img
              src="/bradesco-expresso-vermelho.png"
              alt="Bradesco Expresso"
              className="logo"
            />

            <div className="seguroTopo">
              <div className="iconeEscudo">▣</div>

              <div>
                <strong>Ambiente seguro</strong>
                <span>para solicitação de cotação</span>
              </div>
            </div>
          </div>
        </header>

        {/* HERO */}
        <section className="hero">
          <div className="heroInterno">
            <div className="heroTexto">
              <div className="selo">
                CONSÓRCIO BRADESCO
              </div>

              <h1>
                Seu próximo sonho
                <br />
                pode estar mais perto.
              </h1>

              <p>
                Escolha o que você deseja conquistar, informe o valor
                aproximado e solicite sua cotação de forma rápida,
                simples e sem compromisso.
              </p>

              <div className="beneficiosHero">
                <div className="beneficio">
                  <div className="beneficioIcone">
                    ◷
                  </div>

                  <div>
                    <strong>
                      Solicitação rápida
                    </strong>

                    <span>
                      Leva menos de
                      <br />
                      2 minutos
                    </span>
                  </div>
                </div>

                <div className="beneficio">
                  <div className="beneficioIcone">
                    ♢
                  </div>

                  <div>
                    <strong>
                      Sem compromisso
                    </strong>

                    <span>
                      Receba as opções
                      <br />
                      disponíveis
                    </span>
                  </div>
                </div>

                <div className="beneficio">
                  <div className="beneficioIcone">
                    🔒
                  </div>

                  <div>
                    <strong>
                      Atendimento seguro
                    </strong>

                    <span>
                      Seus dados
                      <br />
                      são protegidos
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="heroImagemArea">
              <div className="grafismo grafismo1" />
              <div className="grafismo grafismo2" />

              <img
                src="/hero-consorcio-familia.jpg"
                alt=""
                className="heroImagem"
              />
            </div>
          </div>
        </section>

        {/* FORMULÁRIO */}
        <section className="areaFormulario">
          <div className="card">
            <div className="tituloArea">
              <div className="alvo">
                ◎
              </div>

              <div>
                <h2>
                  O que você deseja realizar?
                </h2>

                <p>
                  Conte pra gente. Vamos buscar uma opção de consórcio
                  que combine com o seu objetivo.
                </p>
              </div>
            </div>

            {/* BENS */}
            <div className="opcoes">
              <button
                type="button"
                className={`opcao ${
                  bemDesejado === 'MOTO'
                    ? 'opcaoAtiva'
                    : ''
                }`}
                onClick={() => setBemDesejado('MOTO')}
              >
                <div className="check">
                  {bemDesejado === 'MOTO' ? '✓' : ''}
                </div>

                <div className="bemIcone">
                  🏍️
                </div>

                <strong>
                  Moto
                </strong>

                <span>
                  Sua próxima moto
                </span>
              </button>

              <button
                type="button"
                className={`opcao ${
                  bemDesejado === 'CARRO'
                    ? 'opcaoAtiva'
                    : ''
                }`}
                onClick={() => setBemDesejado('CARRO')}
              >
                <div className="check">
                  {bemDesejado === 'CARRO' ? '✓' : ''}
                </div>

                <div className="bemIcone">
                  🚗
                </div>

                <strong>
                  Carro
                </strong>

                <span>
                  Seu próximo veículo
                </span>
              </button>

              <button
                type="button"
                className={`opcao ${
                  bemDesejado === 'IMOVEL'
                    ? 'opcaoAtiva'
                    : ''
                }`}
                onClick={() =>
                  setBemDesejado('IMOVEL')
                }
              >
                <div className="check">
                  {bemDesejado === 'IMOVEL' ? '✓' : ''}
                </div>

                <div className="bemIcone">
                  🏠
                </div>

                <strong>
                  Imóvel
                </strong>

                <span>
                  Sua casa ou investimento
                </span>
              </button>
            </div>

            <div className="divisor">
              <span>
                Agora precisamos conhecer você
              </span>
            </div>

            <form onSubmit={enviarCotacao}>
              {/* HONEYPOT */}
              <div className="honeypot">
                <label>
                  Empresa
                  <input
                    type="text"
                    value={empresa}
                    onChange={(e) =>
                      setEmpresa(e.target.value)
                    }
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </label>
              </div>

              <div className="grid">
                <div className="campo campoTotal">
                  <label>
                    Nome completo
                  </label>

                  <div className="inputWrap">
                    <span className="inputIcone">
                      ♙
                    </span>

                    <input
                      type="text"
                      value={nome}
                      onChange={(e) =>
                        setNome(e.target.value)
                      }
                      placeholder="Digite seu nome completo"
                      autoComplete="name"
                      maxLength={100}
                      required
                    />
                  </div>
                </div>

                <div className="campo">
                  <label>
                    CPF
                  </label>

                  <div className="inputWrap">
                    <span className="inputIcone">
                      ▦
                    </span>

                    <input
                      type="text"
                      value={cpf}
                      onChange={(e) =>
                        setCpf(
                          formatarCPF(
                            e.target.value
                          )
                        )
                      }
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={14}
                      required
                    />
                  </div>
                </div>

                <div className="campo">
                  <label>
                    Celular / WhatsApp
                  </label>

                  <div className="inputWrap">
                    <span className="inputIcone">
                      ☎
                    </span>

                    <input
                      type="tel"
                      value={celular}
                      onChange={(e) =>
                        setCelular(
                          formatarCelular(
                            e.target.value
                          )
                        )
                      }
                      placeholder="(00) 00000-0000"
                      inputMode="tel"
                      autoComplete="tel"
                      maxLength={15}
                      required
                    />
                  </div>
                </div>

                <div className="campo campoTotal">
                  <label>
                    E-mail
                  </label>

                  <div className="inputWrap">
                    <span className="inputIcone">
                      ✉
                    </span>

                    <input
                      type="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      placeholder="seuemail@exemplo.com"
                      autoComplete="email"
                      maxLength={150}
                      required
                    />
                  </div>
                </div>

                <div className="campo campoTotal">
                  <label>
                    Valor aproximado do bem
                  </label>

                  <div className="valorWrap">
                    <span className="cifrao">
                      R$
                    </span>

                    <input
                      type="text"
                      value={valorBem}
                      onChange={(e) =>
                        setValorBem(
                          formatarValor(
                            e.target.value
                          )
                        )
                      }
                      placeholder="R$ 0,00"
                      inputMode="numeric"
                      maxLength={25}
                      required
                    />
                  </div>

                  <small>
                    Informe aproximadamente quanto custa o bem que
                    você deseja adquirir.
                  </small>
                </div>
              </div>

              {/* LGPD */}
              <div className="lgpd">
                <div className="lgpdIcone">
                  🔒
                </div>

                <div>
                  <strong>
                    Seus dados estão protegidos.
                  </strong>

                  <p>
                    Todos os dados informados serão tratados de forma
                    segura e utilizados exclusivamente para atendimento
                    desta solicitação, em conformidade com a Lei Geral de
                    Proteção de Dados — LGPD (Lei nº 13.709/2018) e demais
                    normas aplicáveis.
                  </p>
                </div>
              </div>

              {erro && (
                <div className="erro">
                  ⚠️ {erro}
                </div>
              )}

              {sucesso && (
                <div className="sucesso">
                  <div className="sucessoCheck">
                    ✓
                  </div>

                  <div>
                    <strong>
                      Solicitação enviada!
                    </strong>

                    <span>
                      {sucesso}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="botao"
                disabled={
                  !formularioValido ||
                  enviando
                }
              >
                {enviando ? (
                  <>
                    <span className="loader" />
                    Enviando solicitação...
                  </>
                ) : (
                  <>
                    Quero receber minha cotação
                    <span className="seta">
                      →
                    </span>
                  </>
                )}
              </button>

              <div className="gratis">
                <span>✓</span>
                Solicitação gratuita e sem compromisso
              </div>
            </form>
          </div>
        </section>

        {/* TIPOS */}
        <section className="tipos">
          <div className="tipo">
            <span>
              🏍️
            </span>
            <strong>
              Motos
            </strong>
          </div>

          <div className="separador" />

          <div className="tipo">
            <span>
              🚗
            </span>
            <strong>
              Carros
            </strong>
          </div>

          <div className="separador" />

          <div className="tipo">
            <span>
              🏠
            </span>
            <strong>
              Imóveis
            </strong>
          </div>
        </section>

        {/* RODAPÉ */}
        <footer className="rodape">
          <div className="rodapeInterno">
            <img
              src="/bradesco-expresso-vermelho.png"
              alt="Bradesco Expresso"
              className="logoRodape"
            />

            <p>
              A solicitação de cotação não representa contratação,
              aprovação de crédito ou garantia de contemplação.
              Condições sujeitas às regras, critérios e disponibilidade
              do produto.
            </p>

            <div className="seguroRodape">
              <span>
                ◇
              </span>

              <div>
                <strong>
                  Ambiente seguro
                </strong>

                <small>
                  Seus dados protegidos
                </small>
              </div>
            </div>
          </div>
        </footer>
      </main>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .pagina {
          min-height: 100vh;
          background: #f7f7f8;
          font-family:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Arial,
            Helvetica,
            sans-serif;
          color: #202024;
        }

        /* CABEÇALHO */

        .cabecalho {
          background: white;
          border-bottom: 1px solid #eeeeef;
        }

        .cabecalhoInterno {
          max-width: 1120px;
          margin: 0 auto;
          min-height: 112px;
          padding: 18px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
        }

        .logo {
          display: block;
          width: 225px;
          max-width: 48vw;
          height: auto;
        }

        .seguroTopo {
          display: flex;
          align-items: center;
          gap: 11px;
          border: 1.5px solid #d70a35;
          border-radius: 15px;
          padding: 11px 17px;
          color: #c40730;
        }

        .iconeEscudo {
          width: 35px;
          height: 35px;
          border: 2px solid #d70a35;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .seguroTopo strong,
        .seguroTopo span {
          display: block;
        }

        .seguroTopo strong {
          font-size: 12px;
        }

        .seguroTopo span {
          margin-top: 2px;
          font-size: 10px;
        }

        /* HERO */

        .hero {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 82% 40%,
              #ec1749 0%,
              transparent 33%
            ),
            linear-gradient(
              125deg,
              #bb0029 0%,
              #dd002f 53%,
              #e40032 100%
            );
          color: white;
        }

        .heroInterno {
          max-width: 1120px;
          margin: 0 auto;
          min-height: 430px;
          padding: 45px 28px 75px;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          align-items: center;
          gap: 35px;
        }

        .heroTexto {
          position: relative;
          z-index: 3;
        }

        .selo {
          display: inline-flex;
          border: 1px solid
            rgba(255,255,255,.65);
          border-radius: 9px;
          padding: 7px 13px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .2px;
        }

        .hero h1 {
          margin: 20px 0 0;
          max-width: 590px;
          font-size: clamp(
            40px,
            5vw,
            61px
          );
          line-height: 1.02;
          letter-spacing: -2.3px;
          font-weight: 900;
        }

        .heroTexto > p {
          max-width: 570px;
          margin: 20px 0 0;
          font-size: 16px;
          line-height: 1.65;
          color:
            rgba(255,255,255,.94);
        }

        .beneficiosHero {
          margin-top: 30px;
          display: flex;
          gap: 27px;
          flex-wrap: wrap;
        }

        .beneficio {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }

        .beneficioIcone {
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
        }

        .beneficio strong,
        .beneficio span {
          display: block;
        }

        .beneficio strong {
          font-size: 11px;
          font-weight: 900;
        }

        .beneficio span {
          margin-top: 3px;
          font-size: 10px;
          line-height: 1.4;
          color:
            rgba(255,255,255,.90);
        }

        .heroImagemArea {
          position: relative;
          height: 355px;
          align-self: end;
        }

        .heroImagem {
          position: absolute;
          z-index: 2;
          width: 100%;
          height: 100%;
          right: 0;
          bottom: -10px;
          object-fit: cover;
          object-position: center center;
          border-radius: 0;
          mix-blend-mode: normal;
        }

        .grafismo {
          position: absolute;
          border:
            2px solid rgba(255,255,255,.55);
          border-radius: 50%;
        }

        .grafismo1 {
          z-index: 1;
          width: 260px;
          height: 260px;
          right: -70px;
          top: 15px;
        }

        .grafismo2 {
          z-index: 1;
          width: 190px;
          height: 190px;
          right: -15px;
          top: 50px;
        }

        /* CARD */

        .areaFormulario {
          position: relative;
          z-index: 10;
          max-width: 980px;
          margin: -53px auto 0;
          padding: 0 18px;
        }

        .card {
          background: white;
          border-radius: 26px;
          padding: 30px 33px 25px;
          box-shadow:
            0 24px 70px
            rgba(76,0,18,.13);
        }

        .tituloArea {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }

        .alvo {
          color: #d40735;
          font-size: 38px;
          line-height: 1;
          font-weight: 900;
        }

        .tituloArea h2 {
          margin: 0;
          font-size: 23px;
          letter-spacing: -.5px;
        }

        .tituloArea p {
          margin: 6px 0 0;
          color: #73737a;
          font-size: 13px;
          line-height: 1.5;
        }

        /* OPÇÕES */

        .opcoes {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 15px;
          margin-top: 25px;
        }

        .opcao {
          position: relative;
          min-height: 145px;
          border: 1.5px solid #dddddf;
          border-radius: 13px;
          background: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition:
            .18s ease;
        }

        .opcao:hover {
          border-color: #e04a69;
          transform: translateY(-2px);
        }

        .opcaoAtiva {
          border: 2px solid #df0a39;
          box-shadow:
            0 9px 24px
            rgba(204,9,47,.09);
        }

        .check {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            #d70a35;
          color: white;
          font-size: 12px;
          font-weight: 900;
        }

        .opcao:not(.opcaoAtiva) .check {
          background:
            transparent;
        }

        .bemIcone {
          font-size: 34px;
          line-height: 1;
        }

        .opcao strong {
          margin-top: 10px;
          font-size: 18px;
        }

        .opcao span {
          margin-top: 4px;
          color: #65656b;
          font-size: 11px;
        }

        /* DIVISOR */

        .divisor {
          position: relative;
          margin: 29px 0 21px;
          text-align: center;
        }

        .divisor::before {
          content: "";
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: #dedee1;
        }

        .divisor span {
          position: relative;
          background: white;
          padding: 0 20px;
          color: #77777d;
          font-size: 12px;
        }

        /* FORM */

        .honeypot {
          position: absolute;
          left: -9999px;
          height: 1px;
          width: 1px;
          overflow: hidden;
        }

        .grid {
          display: grid;
          grid-template-columns:
            repeat(2, 1fr);
          gap: 16px 20px;
        }

        .campoTotal {
          grid-column: span 2;
        }

        .campo label {
          display: block;
          margin-bottom: 6px;
          font-size: 12px;
          font-weight: 700;
          color: #242428;
        }

        .inputWrap {
          position: relative;
        }

        .inputIcone {
          position: absolute;
          left: 15px;
          top: 50%;
          transform:
            translateY(-50%);
          color: #77777d;
          font-size: 18px;
        }

        .inputWrap input {
          width: 100%;
          height: 49px;
          border:
            1px solid #d9d9dc;
          border-radius: 8px;
          padding:
            0 14px 0 47px;
          background: white;
          outline: none;
          font-size: 14px;
          color: #242428;
          transition:
            .16s ease;
        }

        .inputWrap input:focus {
          border-color: #d70a35;
          box-shadow:
            0 0 0 3px
            rgba(215,10,53,.08);
        }

        .inputWrap input::placeholder,
        .valorWrap input::placeholder {
          color: #98989e;
        }

        /* VALOR */

        .valorWrap {
          display: flex;
          height: 52px;
          border:
            1px solid #d9d9dc;
          border-radius: 8px;
          overflow: hidden;
        }

        .valorWrap:focus-within {
          border-color: #d70a35;
          box-shadow:
            0 0 0 3px
            rgba(215,10,53,.08);
        }

        .cifrao {
          width: 53px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d70a35;
          font-weight: 900;
        }

        .valorWrap input {
          flex: 1;
          border: none;
          outline: none;
          padding: 0 14px;
          font-size: 15px;
          color: #252529;
        }

        .campo small {
          display: block;
          margin-top: 6px;
          color: #77777d;
          font-size: 10px;
        }

        /* LGPD */

        .lgpd {
          margin-top: 21px;
          display: flex;
          gap: 14px;
          align-items: center;
          border:
            1px solid #f1b8c4;
          background:
            linear-gradient(
              90deg,
              #fff3f5,
              #fff8f9
            );
          border-radius: 10px;
          padding: 15px 18px;
        }

        .lgpdIcone {
          flex-shrink: 0;
          width: 54px;
          height: 54px;
          border-radius: 50%;
          background: #ffdce4;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 27px;
        }

        .lgpd strong {
          display: block;
          font-size: 13px;
        }

        .lgpd p {
          margin: 4px 0 0;
          font-size: 11px;
          line-height: 1.5;
          color: #505056;
        }

        /* MENSAGENS */

        .erro {
          margin-top: 18px;
          border-radius: 9px;
          padding: 13px 15px;
          background: #fff0f3;
          border: 1px solid #f0b7c4;
          color: #a6082b;
          font-size: 12px;
          font-weight: 700;
        }

        .sucesso {
          margin-top: 18px;
          display: flex;
          align-items: center;
          gap: 11px;
          border-radius: 9px;
          padding: 14px 15px;
          background: #effbf4;
          border: 1px solid #b6e4c6;
          color: #09763e;
        }

        .sucessoCheck {
          width: 31px;
          height: 31px;
          border-radius: 50%;
          flex-shrink: 0;
          background: #128348;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .sucesso strong,
        .sucesso span {
          display: block;
        }

        .sucesso strong {
          font-size: 12px;
        }

        .sucesso span {
          margin-top: 2px;
          font-size: 10px;
        }

        /* BOTÃO */

        .botao {
          margin-top: 18px;
          width: 100%;
          min-height: 53px;
          border: none;
          border-radius: 8px;
          padding: 14px 20px;
          background:
            linear-gradient(
              90deg,
              #d90035,
              #e70035
            );
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 19px;
          font-weight: 900;
          cursor: pointer;
          box-shadow:
            0 12px 26px
            rgba(198,0,41,.19);
          transition:
            .16s ease;
        }

        .botao:not(:disabled):hover {
          transform:
            translateY(-1px);
          filter: brightness(.97);
        }

        .botao:disabled {
          background: #c5c5c8;
          box-shadow: none;
          cursor: not-allowed;
        }

        .seta {
          margin-left: auto;
          font-size: 25px;
          line-height: 1;
        }

        .loader {
          width: 17px;
          height: 17px;
          border-radius: 50%;
          border: 2px solid
            rgba(255,255,255,.4);
          border-top-color: white;
          animation:
            girar .7s linear infinite;
        }

        @keyframes girar {
          to {
            transform:
              rotate(360deg);
          }
        }

        .gratis {
          margin-top: 10px;
          text-align: center;
          font-size: 11px;
          color: #55555a;
        }

        .gratis span {
          color: #d70a35;
          font-weight: 900;
          margin-right: 7px;
        }

        /* TIPOS */

        .tipos {
          max-width: 980px;
          margin: 16px auto 23px;
          padding: 19px 35px;
          border-radius: 18px;
          background: white;
          display: flex;
          align-items: center;
          justify-content: space-around;
          box-shadow:
            0 7px 23px
            rgba(0,0,0,.04);
        }

        .tipo {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .tipo span {
          font-size: 25px;
        }

        .tipo strong {
          font-size: 13px;
        }

        .separador {
          width: 1px;
          height: 35px;
          background: #dddddf;
        }

        /* RODAPÉ */

        .rodape {
          background:
            linear-gradient(
              90deg,
              #ba002a,
              #d90035
            );
        }

        .rodapeInterno {
          max-width: 1120px;
          min-height: 104px;
          margin: 0 auto;
          padding: 18px 28px;
          display: grid;
          grid-template-columns:
            180px 1fr 190px;
          align-items: center;
          gap: 35px;
        }

        .logoRodape {
          width: 160px;
          height: auto;
          filter:
            brightness(0) invert(1);
        }

        .rodape p {
          margin: 0;
          color:
            rgba(255,255,255,.93);
          font-size: 9px;
          line-height: 1.5;
        }

        .seguroRodape {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          align-items: center;
          color: white;
        }

        .seguroRodape > span {
          width: 32px;
          height: 32px;
          border: 2px solid white;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .seguroRodape strong,
        .seguroRodape small {
          display: block;
        }

        .seguroRodape strong {
          font-size: 10px;
        }

        .seguroRodape small {
          margin-top: 2px;
          font-size: 9px;
        }

        /* RESPONSIVO */

        @media (
          max-width: 780px
        ) {
          .cabecalhoInterno {
            min-height: 88px;
            padding: 13px 16px;
          }

          .logo {
            width: 175px;
          }

          .seguroTopo {
            padding: 8px 10px;
          }

          .iconeEscudo {
            display: none;
          }

          .seguroTopo strong {
            font-size: 10px;
          }

          .seguroTopo span {
            font-size: 8px;
          }

          .heroInterno {
            min-height: auto;
            padding:
              38px 18px 78px;
            grid-template-columns: 1fr;
          }

          .heroTexto {
            text-align: center;
          }

          .hero h1 {
            max-width: 650px;
            margin-left: auto;
            margin-right: auto;
          }

          .heroTexto > p {
            margin-left: auto;
            margin-right: auto;
          }

          .beneficiosHero {
            justify-content:
              center;
          }

          .heroImagemArea {
            display: none;
          }

          .areaFormulario {
            margin-top: -42px;
            padding: 0 11px;
          }

          .card {
            padding: 25px 17px 21px;
            border-radius: 22px;
          }

          .tituloArea {
            align-items: center;
          }

          .alvo {
            font-size: 30px;
          }

          .tituloArea h2 {
            font-size: 20px;
          }

          .opcoes {
            gap: 8px;
          }

          .opcao {
            min-height: 125px;
          }

          .bemIcone {
            font-size: 28px;
          }

          .opcao strong {
            font-size: 15px;
          }

          .opcao span {
            text-align: center;
            font-size: 9px;
          }

          .grid {
            grid-template-columns: 1fr;
          }

          .campoTotal {
            grid-column: span 1;
          }

          .botao {
            font-size: 15px;
          }

          .tipos {
            margin:
              15px 11px 22px;
            padding: 16px 10px;
          }

          .tipo {
            flex-direction: column;
            gap: 3px;
          }

          .tipo strong {
            font-size: 10px;
          }

          .tipo span {
            font-size: 22px;
          }

          .rodapeInterno {
            grid-template-columns: 1fr;
            text-align: center;
            gap: 14px;
            padding: 22px 18px;
          }

          .logoRodape {
            margin: 0 auto;
          }

          .seguroRodape {
            justify-content: center;
          }
        }

        @media (
          max-width: 430px
        ) {
          .logo {
            width: 145px;
          }

          .seguroTopo {
            border-radius: 10px;
          }

          .seguroTopo span {
            display: none;
          }

          .hero h1 {
            font-size: 39px;
          }

          .heroTexto > p {
            font-size: 14px;
          }

          .beneficiosHero {
            display: grid;
            grid-template-columns:
              1fr;
            max-width: 280px;
            margin-left: auto;
            margin-right: auto;
          }

          .beneficio {
            text-align: left;
          }

          .opcoes {
            grid-template-columns:
              1fr;
          }

          .opcao {
            min-height: 88px;
            padding: 12px 15px;
            display: grid;
            grid-template-columns:
              45px 1fr;
            text-align: left;
            justify-items: start;
          }

          .bemIcone {
            grid-row: span 2;
          }

          .opcao strong {
            margin-top: 0;
          }

          .opcao span {
            text-align: left;
          }

          .check {
            top: 50%;
            transform:
              translateY(-50%);
          }

          .lgpd {
            align-items: flex-start;
          }

          .lgpdIcone {
            width: 43px;
            height: 43px;
            font-size: 20px;
          }
        }
      `}</style>
    </>
  )
}