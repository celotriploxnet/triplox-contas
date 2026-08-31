import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

const tentativas = new Map<
  string,
  {
    quantidade: number
    inicio: number
  }
>()

const JANELA_RATE_LIMIT = 10 * 60 * 1000
const MAX_TENTATIVAS = 5

function respostaErro(message: string, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      message,
    },
    {
      status,
    }
  )
}

function limparTexto(value: unknown, limite = 500) {
  return String(value ?? '')
    .trim()
    .replace(/\r/g, '')
    .slice(0, limite)
}

function somenteNumeros(value: unknown) {
  return String(value ?? '').replace(/\D/g, '')
}

function emailValido(email: string) {
  if (!email) return false

  if (email.includes('\n') || email.includes('\r')) {
    return false
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function cpfValido(cpfRecebido: string) {
  const cpf = somenteNumeros(cpfRecebido)

  if (cpf.length !== 11) {
    return false
  }

  if (/^(\d)\1{10}$/.test(cpf)) {
    return false
  }

  let soma = 0

  for (let i = 0; i < 9; i++) {
    soma += Number(cpf.charAt(i)) * (10 - i)
  }

  let primeiroDigito = (soma * 10) % 11

  if (primeiroDigito === 10 || primeiroDigito === 11) {
    primeiroDigito = 0
  }

  if (primeiroDigito !== Number(cpf.charAt(9))) {
    return false
  }

  soma = 0

  for (let i = 0; i < 10; i++) {
    soma += Number(cpf.charAt(i)) * (11 - i)
  }

  let segundoDigito = (soma * 10) % 11

  if (segundoDigito === 10 || segundoDigito === 11) {
    segundoDigito = 0
  }

  return segundoDigito === Number(cpf.charAt(10))
}

function formatarCPF(cpfRecebido: string) {
  const cpf = somenteNumeros(cpfRecebido).slice(0, 11)

  return cpf.replace(
    /(\d{3})(\d{3})(\d{3})(\d{2})/,
    '$1.$2.$3-$4'
  )
}

function formatarTelefone(telefoneRecebido: string) {
  const numero = somenteNumeros(telefoneRecebido).slice(0, 11)

  if (numero.length === 11) {
    return `(${numero.slice(0, 2)}) ${numero.slice(
      2,
      7
    )}-${numero.slice(7)}`
  }

  if (numero.length === 10) {
    return `(${numero.slice(0, 2)}) ${numero.slice(
      2,
      6
    )}-${numero.slice(6)}`
  }

  return telefoneRecebido
}

function formatarDataHoraBrasilia(date = new Date()) {
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
    partes.find((parte) => parte.type === type)?.value || ''

  return `${get('day')}/${get('month')}/${get('year')} ${get(
    'hour'
  )}:${get('minute')}`
}

function obterIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  return req.headers.get('x-real-ip') || 'desconhecido'
}

function verificarRateLimit(ip: string) {
  const agora = Date.now()
  const registro = tentativas.get(ip)

  if (!registro) {
    tentativas.set(ip, {
      quantidade: 1,
      inicio: agora,
    })

    return true
  }

  if (agora - registro.inicio > JANELA_RATE_LIMIT) {
    tentativas.set(ip, {
      quantidade: 1,
      inicio: agora,
    })

    return true
  }

  if (registro.quantidade >= MAX_TENTATIVAS) {
    return false
  }

  registro.quantidade += 1

  tentativas.set(ip, registro)

  return true
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function labelBem(bem: string) {
  if (bem === 'MOTO') return 'Moto'
  if (bem === 'CARRO') return 'Carro'
  if (bem === 'IMOVEL') return 'Imóvel'

  return bem
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    const fromEmail = process.env.FROM_EMAIL
    const toEmail = process.env.MAIL_TO

    if (!apiKey) {
      return respostaErro(
        'RESEND_API_KEY não configurada.',
        500
      )
    }

    if (!fromEmail) {
      return respostaErro(
        'FROM_EMAIL não configurada.',
        500
      )
    }

    if (!toEmail) {
      return respostaErro(
        'MAIL_TO não configurada.',
        500
      )
    }

    /*
     * Proteção básica contra muitos envios
     * vindos do mesmo endereço.
     */
    const ip = obterIp(req)

    if (!verificarRateLimit(ip)) {
      return respostaErro(
        'Muitas solicitações foram realizadas em pouco tempo. Aguarde alguns minutos e tente novamente.',
        429
      )
    }

    const body = await req.json()

    /*
     * Honeypot.
     * Pessoas normais nunca verão ou preencherão
     * este campo.
     */
    const empresa = limparTexto(body?.empresa, 100)

    if (empresa) {
      /*
       * Respondemos sucesso para não revelar
       * ao robô que ele foi bloqueado.
       */
      return NextResponse.json({
        ok: true,
      })
    }

    const nome = limparTexto(body?.nome, 100)
    const cpf = limparTexto(body?.cpf, 20)
    const celular = limparTexto(body?.celular, 30)
    const email = limparTexto(body?.email, 150).toLowerCase()
    const bemDesejado = limparTexto(body?.bemDesejado, 30).toUpperCase()
    const valorBem = limparTexto(body?.valorBem, 30)

    /*
     * Validações
     */

    if (nome.length < 3) {
      return respostaErro('Informe seu nome completo.')
    }

    if (!cpfValido(cpf)) {
      return respostaErro('Informe um CPF válido.')
    }

    const telefoneNumeros = somenteNumeros(celular)

    if (
      telefoneNumeros.length !== 10 &&
      telefoneNumeros.length !== 11
    ) {
      return respostaErro('Informe um celular válido.')
    }

    if (!emailValido(email)) {
      return respostaErro('Informe um e-mail válido.')
    }

    const bensPermitidos = ['MOTO', 'CARRO', 'IMOVEL']

    if (!bensPermitidos.includes(bemDesejado)) {
      return respostaErro('Selecione um bem válido.')
    }

    if (!valorBem) {
      return respostaErro(
        'Informe o valor do bem desejado.'
      )
    }

    const cpfFormatado = formatarCPF(cpf)
    const celularFormatado = formatarTelefone(celular)
    const bemLabel = labelBem(bemDesejado)
    const dataHora = formatarDataHoraBrasilia()

    const resend = new Resend(apiKey)

    /*
     * ------------------------------------------------------
     * E-MAIL PARA O ADMINISTRADOR / MARCELO
     * ------------------------------------------------------
     */

    const textoAdmin = [
      `NOVA COTAÇÃO DE CONSÓRCIO`,
      ``,
      `👤 DADOS DO CLIENTE`,
      `Nome: ${nome}`,
      `CPF: ${cpfFormatado}`,
      `Celular / WhatsApp: ${celularFormatado}`,
      `E-mail: ${email}`,
      ``,
      `🎯 COTAÇÃO DESEJADA`,
      `Bem: ${bemLabel}`,
      `Valor desejado: ${valorBem}`,
      ``,
      `🕒 Data/Hora (Brasília): ${dataHora}`,
      `🌐 Origem: treinoexpresso.com.br/cotacao-consorcio`,
      ``,
      `Os dados foram enviados através do formulário público de cotação de consórcio do TreinExpresso.`,
    ].join('\n')

    const envioAdmin = await resend.emails.send({
      from: `TreinExpresso <${fromEmail}>`,
      to: toEmail,
      subject: `Nova cotação de Consórcio - ${nome} - ${bemLabel}`,
      text: textoAdmin,

      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="UTF-8" />
          </head>

          <body style="
            margin:0;
            padding:0;
            background:#f4f4f5;
            font-family:Arial,Helvetica,sans-serif;
          ">
            <div style="
              max-width:650px;
              margin:30px auto;
              background:#ffffff;
              border-radius:18px;
              overflow:hidden;
              border:1px solid #eeeeee;
            ">

              <div style="
                background:#cc092f;
                padding:27px 24px;
                color:#ffffff;
                text-align:center;
              ">
                <div style="
                  font-size:25px;
                  font-weight:800;
                ">
                  Nova Cotação de Consórcio
                </div>

                <div style="
                  margin-top:7px;
                  font-size:13px;
                  opacity:.9;
                ">
                  TreinExpresso
                </div>
              </div>

              <div style="
                padding:30px;
              ">

                <div style="
                  font-size:12px;
                  font-weight:800;
                  color:#cc092f;
                  text-transform:uppercase;
                  margin-bottom:12px;
                ">
                  Dados do cliente
                </div>

                <table
                  cellpadding="0"
                  cellspacing="0"
                  style="
                    width:100%;
                    border-collapse:collapse;
                  "
                >
                  <tr>
                    <td style="${labelStyleEmail}">
                      Nome
                    </td>

                    <td style="${valueStyleEmail}">
                      ${escapeHtml(nome)}
                    </td>
                  </tr>

                  <tr>
                    <td style="${labelStyleEmail}">
                      CPF
                    </td>

                    <td style="${valueStyleEmail}">
                      ${escapeHtml(cpfFormatado)}
                    </td>
                  </tr>

                  <tr>
                    <td style="${labelStyleEmail}">
                      Celular
                    </td>

                    <td style="${valueStyleEmail}">
                      ${escapeHtml(celularFormatado)}
                    </td>
                  </tr>

                  <tr>
                    <td style="${labelStyleEmail}">
                      E-mail
                    </td>

                    <td style="${valueStyleEmail}">
                      ${escapeHtml(email)}
                    </td>
                  </tr>
                </table>

                <div style="
                  margin-top:28px;
                  font-size:12px;
                  font-weight:800;
                  color:#cc092f;
                  text-transform:uppercase;
                  margin-bottom:12px;
                ">
                  Interesse
                </div>

                <table
                  cellpadding="0"
                  cellspacing="0"
                  style="
                    width:100%;
                    border-collapse:collapse;
                  "
                >
                  <tr>
                    <td style="${labelStyleEmail}">
                      Bem desejado
                    </td>

                    <td style="${valueStyleEmail}">
                      <strong>
                        ${escapeHtml(bemLabel)}
                      </strong>
                    </td>
                  </tr>

                  <tr>
                    <td style="${labelStyleEmail}">
                      Valor
                    </td>

                    <td style="${valueStyleEmail}">
                      <strong style="
                        color:#cc092f;
                        font-size:18px;
                      ">
                        ${escapeHtml(valorBem)}
                      </strong>
                    </td>
                  </tr>
                </table>

                <div style="
                  margin-top:25px;
                  padding:15px;
                  background:#fff5f7;
                  border-radius:12px;
                  border-left:4px solid #cc092f;
                  color:#555555;
                  font-size:13px;
                  line-height:1.5;
                ">
                  🕒 Solicitação recebida em
                  <strong>
                    ${escapeHtml(dataHora)}
                  </strong>
                  — horário de Brasília.
                </div>

              </div>

              <div style="
                background:#f7f7f8;
                padding:17px;
                text-align:center;
                color:#888888;
                font-size:11px;
              ">
                Solicitação enviada pelo
                treinoexpresso.com.br/cotacao-consorcio
              </div>

            </div>
          </body>
        </html>
      `,

      /*
       * Ao clicar em RESPONDER no e-mail,
       * a resposta vai para o cliente.
       */
      replyTo: email,
    })

    if (envioAdmin.error) {
      console.error(
        'Erro Resend - cotação para administrador:',
        envioAdmin.error
      )

      return respostaErro(
        'Não foi possível enviar sua solicitação. Tente novamente.',
        500
      )
    }

    /*
     * ------------------------------------------------------
     * CONFIRMAÇÃO PARA O CLIENTE
     * ------------------------------------------------------
     *
     * Se este segundo e-mail falhar, a cotação já foi
     * recebida pelo administrador, então não bloqueamos
     * o atendimento.
     */

    try {
      const envioCliente = await resend.emails.send({
        from: `TreinExpresso <${fromEmail}>`,
        to: email,
        subject: 'Recebemos sua solicitação de cotação',

        text: [
          `Olá, ${nome}!`,
          ``,
          `Recebemos sua solicitação de cotação de consórcio com sucesso.`,
          ``,
          `Bem desejado: ${bemLabel}`,
          `Valor desejado: ${valorBem}`,
          ``,
          `Nossa equipe poderá entrar em contato através dos dados informados para apresentar as opções disponíveis.`,
          ``,
          `Data/Hora da solicitação: ${dataHora}`,
          ``,
          `A solicitação de cotação não representa contratação, aprovação de crédito ou garantia de contemplação. Condições sujeitas às regras e critérios aplicáveis ao produto.`,
          ``,
          `TreinExpresso`,
        ].join('\n'),

        html: `
          <!DOCTYPE html>
          <html lang="pt-BR">
            <head>
              <meta charset="UTF-8" />
            </head>

            <body style="
              margin:0;
              padding:0;
              background:#f5f5f5;
              font-family:Arial,Helvetica,sans-serif;
            ">
              <div style="
                max-width:620px;
                margin:30px auto;
                background:#ffffff;
                border-radius:18px;
                overflow:hidden;
                border:1px solid #eeeeee;
              ">

                <div style="
                  background:#cc092f;
                  padding:27px;
                  color:white;
                  text-align:center;
                ">
                  <div style="
                    font-size:24px;
                    font-weight:800;
                  ">
                    Cotação recebida!
                  </div>
                </div>

                <div style="
                  padding:30px;
                  color:#444444;
                  font-size:15px;
                  line-height:1.6;
                ">

                  <p style="margin-top:0;">
                    Olá,
                    <strong>${escapeHtml(nome)}</strong>!
                  </p>

                  <p>
                    Recebemos sua solicitação de cotação de
                    consórcio com sucesso.
                  </p>

                  <div style="
                    margin:22px 0;
                    background:#fff5f7;
                    border-radius:14px;
                    padding:18px;
                  ">
                    <div style="
                      margin-bottom:8px;
                    ">
                      <strong>Bem desejado:</strong>
                      ${escapeHtml(bemLabel)}
                    </div>

                    <div>
                      <strong>Valor desejado:</strong>
                      <span style="
                        color:#cc092f;
                        font-weight:800;
                      ">
                        ${escapeHtml(valorBem)}
                      </span>
                    </div>
                  </div>

                  <p>
                    Nossa equipe poderá entrar em contato através
                    dos dados informados para apresentar as opções
                    disponíveis.
                  </p>

                  <p style="
                    margin-top:25px;
                    color:#777777;
                    font-size:12px;
                  ">
                    Solicitação realizada em
                    ${escapeHtml(dataHora)} — horário de Brasília.
                  </p>

                  <div style="
                    margin-top:25px;
                    padding-top:18px;
                    border-top:1px solid #eeeeee;
                    color:#888888;
                    font-size:11px;
                    line-height:1.5;
                  ">
                    A solicitação de cotação não representa
                    contratação, aprovação de crédito ou garantia
                    de contemplação. Condições sujeitas às regras
                    e critérios aplicáveis ao produto.
                  </div>

                </div>

              </div>
            </body>
          </html>
        `,
      })

      if (envioCliente.error) {
        console.error(
          'Cotação recebida, mas confirmação do cliente falhou:',
          envioCliente.error
        )
      }
    } catch (erroCliente) {
      console.error(
        'Erro ao enviar confirmação para cliente:',
        erroCliente
      )
    }

    return NextResponse.json({
      ok: true,
      message: 'Cotação enviada com sucesso.',
    })
  } catch (error: any) {
    console.error(
      'ERRO API COTACAO CONSORCIO:',
      error
    )

    return NextResponse.json(
      {
        ok: false,
        message:
          error?.message ||
          'Erro ao enviar solicitação de cotação.',
      },
      {
        status: 500,
      }
    )
  }
}

const labelStyleEmail = `
  width:35%;
  padding:13px 10px;
  border-bottom:1px solid #eeeeee;
  color:#777777;
  font-size:13px;
`

const valueStyleEmail = `
  padding:13px 10px;
  border-bottom:1px solid #eeeeee;
  color:#222222;
  font-size:15px;
`