'use client'

import { FormEvent, useMemo, useState } from 'react'

type BemDesejado = '' | 'MOTO' | 'CARRO' | 'IMOVEL'

export default function CotacaoConsorcioPage() {
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [celular, setCelular] = useState('')
  const [email, setEmail] = useState('')
  const [bemDesejado, setBemDesejado] = useState<BemDesejado>('')
  const [valorBem, setValorBem] = useState('')

  // Campo invisível para ajudar contra robôs.
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
      return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`
    }

    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(
      6,
      9
    )}-${numeros.slice(9, 11)}`
  }

  function formatarCelular(valor: string) {
    const numeros = somenteNumeros(valor).slice(0, 11)

    if (numeros.length <= 2) {
      return numeros
    }

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

    if (!numeros) {
      return ''
    }

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
        'Solicitação enviada com sucesso! Em breve nossa equipe entrará em contato com você.'
      )

      setNome('')
      setCpf('')
      setCelular('')
      setEmail('')
      setBemDesejado('')
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
    <main
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(145deg, #ffffff 0%, #fff7f8 48%, #f4f5f7 100%)',
        padding: '28px 16px 50px',
        fontFamily:
          'Arial, Helvetica, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          margin: '0 auto',
        }}
      >
        {/* CABEÇALHO */}
        <header
          style={{
            textAlign: 'center',
            marginBottom: 26,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#cc092f',
              color: '#ffffff',
              borderRadius: 999,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 800,
              marginBottom: 20,
              letterSpacing: '.2px',
            }}
          >
            CONSÓRCIO
          </div>

          <h1
            style={{
              margin: 0,
              color: '#1e1e23',
              fontSize: 'clamp(32px, 7vw, 48px)',
              lineHeight: 1.05,
              fontWeight: 900,
              letterSpacing: '-1.5px',
            }}
          >
            Seu próximo sonho
            <br />
            pode começar aqui.
          </h1>

          <p
            style={{
              margin: '16px auto 0',
              maxWidth: 600,
              color: '#616168',
              fontSize: 17,
              lineHeight: 1.55,
            }}
          >
            Preencha seus dados para receber uma cotação de consórcio de
            acordo com o que você procura.
          </p>
        </header>

        {/* CARD PRINCIPAL */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 26,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.10)',
            border: '1px solid #eeeeee',
          }}
        >
          <div
            style={{
              height: 7,
              background: 'linear-gradient(90deg, #9f001f, #df103e)',
            }}
          />

          <div
            style={{
              padding: 'clamp(22px, 5vw, 40px)',
            }}
          >
            <div
              style={{
                marginBottom: 28,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  color: '#242429',
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                Solicite sua cotação
              </h2>

              <p
                style={{
                  margin: '7px 0 0',
                  color: '#77777c',
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                É rápido, simples e sem compromisso.
              </p>
            </div>

            <form onSubmit={enviarCotacao}>
              {/* Honeypot */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: '-9999px',
                  width: 1,
                  height: 1,
                  overflow: 'hidden',
                }}
              >
                <label>
                  Empresa
                  <input
                    type="text"
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </label>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: 19,
                }}
              >
                {/* NOME */}
                <div>
                  <label style={labelStyle}>Nome completo</label>

                  <input
                    style={inputStyle}
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Digite seu nome completo"
                    autoComplete="name"
                    maxLength={100}
                    required
                  />
                </div>

                {/* CPF */}
                <div>
                  <label style={labelStyle}>CPF</label>

                  <input
                    style={inputStyle}
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(formatarCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={14}
                    required
                  />
                </div>

                {/* CELULAR */}
                <div>
                  <label style={labelStyle}>Celular / WhatsApp</label>

                  <input
                    style={inputStyle}
                    type="tel"
                    value={celular}
                    onChange={(e) =>
                      setCelular(formatarCelular(e.target.value))
                    }
                    placeholder="(00) 00000-0000"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={15}
                    required
                  />
                </div>

                {/* EMAIL */}
                <div>
                  <label style={labelStyle}>E-mail</label>

                  <input
                    style={inputStyle}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    autoComplete="email"
                    maxLength={150}
                    required
                  />
                </div>

                {/* BEM */}
                <div>
                  <label style={labelStyle}>Bem desejado</label>

                  <select
                    style={{
                      ...inputStyle,
                      cursor: 'pointer',
                    }}
                    value={bemDesejado}
                    onChange={(e) =>
                      setBemDesejado(e.target.value as BemDesejado)
                    }
                    required
                  >
                    <option value="">Selecione uma opção</option>
                    <option value="MOTO">🏍️ Moto</option>
                    <option value="CARRO">🚗 Carro</option>
                    <option value="IMOVEL">🏠 Imóvel</option>
                  </select>
                </div>

                {/* VALOR */}
                <div>
                  <label style={labelStyle}>
                    Valor do bem desejado
                  </label>

                  <input
                    style={inputStyle}
                    type="text"
                    value={valorBem}
                    onChange={(e) =>
                      setValorBem(formatarValor(e.target.value))
                    }
                    placeholder="R$ 0,00"
                    inputMode="numeric"
                    maxLength={25}
                    required
                  />
                </div>
              </div>

              {/* LGPD */}
              <div
                style={{
                  marginTop: 24,
                  padding: '16px 17px',
                  borderRadius: 15,
                  background: '#fff6f8',
                  border: '1px solid #f4d1d9',
                  display: 'flex',
                  gap: 11,
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    fontSize: 20,
                    lineHeight: 1,
                    flexShrink: 0,
                    paddingTop: 1,
                  }}
                >
                  🔒
                </div>

                <p
                  style={{
                    margin: 0,
                    color: '#54545a',
                    fontSize: 12.5,
                    lineHeight: 1.55,
                  }}
                >
                  <strong style={{ color: '#333338' }}>
                    Seus dados estão protegidos.
                  </strong>{' '}
                  Os dados informados serão tratados de forma segura e
                  utilizados exclusivamente para atendimento desta
                  solicitação, em conformidade com a Lei Geral de Proteção
                  de Dados — LGPD (Lei nº 13.709/2018) e demais normas
                  aplicáveis.
                </p>
              </div>

              {/* ERRO */}
              {erro && (
                <div
                  style={{
                    marginTop: 20,
                    background: '#fff1f3',
                    color: '#a30728',
                    border: '1px solid #f5bcc8',
                    padding: '14px 16px',
                    borderRadius: 14,
                    fontSize: 14,
                    lineHeight: 1.45,
                    fontWeight: 700,
                  }}
                >
                  ⚠️ {erro}
                </div>
              )}

              {/* SUCESSO */}
              {sucesso && (
                <div
                  style={{
                    marginTop: 20,
                    background: '#effcf4',
                    color: '#08783d',
                    border: '1px solid #b8e7ca',
                    padding: '16px',
                    borderRadius: 14,
                    fontSize: 14,
                    lineHeight: 1.5,
                    fontWeight: 700,
                    textAlign: 'center',
                  }}
                >
                  ✅ {sucesso}
                </div>
              )}

              {/* BOTÃO */}
              <button
                type="submit"
                disabled={!formularioValido || enviando}
                style={{
                  width: '100%',
                  marginTop: 24,
                  border: 'none',
                  borderRadius: 15,
                  padding: '17px 18px',
                  background:
                    !formularioValido || enviando
                      ? '#bcbcc0'
                      : 'linear-gradient(135deg, #dc0a38, #ad0027)',
                  color: '#ffffff',
                  fontSize: 17,
                  fontWeight: 900,
                  cursor:
                    !formularioValido || enviando
                      ? 'not-allowed'
                      : 'pointer',
                  boxShadow:
                    !formularioValido || enviando
                      ? 'none'
                      : '0 12px 28px rgba(204, 9, 47, .27)',
                }}
              >
                {enviando
                  ? 'Enviando sua solicitação...'
                  : 'Solicitar minha cotação →'}
              </button>
            </form>
          </div>
        </div>

        {/* RODAPÉ */}
        <div
          style={{
            textAlign: 'center',
            marginTop: 22,
            padding: '0 10px',
          }}
        >
          <p
            style={{
              margin: 0,
              color: '#7a7a80',
              fontSize: 11,
              lineHeight: 1.55,
            }}
          >
            A solicitação de cotação não representa contratação,
            aprovação de crédito ou garantia de contemplação.
            Condições sujeitas às regras e critérios aplicáveis ao
            produto.
          </p>

          <p
            style={{
              margin: '12px 0 0',
              color: '#a0a0a5',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            TreinExpresso • Cotação de Consórcio
          </p>
        </div>
      </div>
    </main>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 7,
  color: '#2b2b30',
  fontSize: 14,
  fontWeight: 800,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #d9d9dd',
  borderRadius: 13,
  padding: '15px 15px',
  background: '#ffffff',
  color: '#232328',
  fontSize: 16,
  outline: 'none',
}