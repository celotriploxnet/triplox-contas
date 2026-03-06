import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { labelTipoChamado } from '@/lib/chamados'

export const runtime = 'nodejs'

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status })
}

function escapeText(value: unknown) {
  return String(value ?? '').trim()
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    const fromEmail = process.env.FROM_EMAIL
    const toEmail = process.env.MAIL_TO

    if (!apiKey) return bad('RESEND_API_KEY não configurada.', 500)
    if (!fromEmail) return bad('FROM_EMAIL não configurada.', 500)
    if (!toEmail) return bad('MAIL_TO não configurada.', 500)

    const resend = new Resend(apiKey)

    const body = await req.json()

    const protocolo = escapeText(body?.protocolo)
    const userEmail = escapeText(body?.userEmail)
    const userName = escapeText(body?.userName)
    const expressoKey = escapeText(body?.expressoKey)
    const nomeExpresso = escapeText(body?.nomeExpresso)
    const agencia = escapeText(body?.agencia)
    const pacb = escapeText(body?.pacb)
    const statusExpresso = escapeText(body?.statusExpresso)
    const tipo = body?.tipo
    const contatoNome = escapeText(body?.contatoNome)
    const contatoTelefone = escapeText(body?.contatoTelefone)
    const descricao = escapeText(body?.descricao)
    const statusChamado = escapeText(body?.statusChamado || 'ABERTO')

    const obrigatorios = [
      ['Protocolo', protocolo],
      ['E-mail do usuário', userEmail],
      ['Tipo', tipo],
      ['Chave Loja', expressoKey],
      ['Nome do Expresso', nomeExpresso],
      ['Contato', contatoNome],
      ['Telefone', contatoTelefone],
      ['Descrição', descricao],
    ] as const

    for (const [campo, valor] of obrigatorios) {
      if (!valor || String(valor).trim() === '') {
        return bad(`Campo obrigatório: ${campo}`)
      }
    }

    const dataHora = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Bahia',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date())

    const linhas: string[] = []

    linhas.push(`CHAMADO ABERTO — ${protocolo}`)
    linhas.push('')
    linhas.push('📌 Dados do chamado')
    linhas.push(`• Protocolo: ${protocolo}`)
    linhas.push(`• Tipo: ${labelTipoChamado(tipo)}`)
    linhas.push(`• Status do chamado: ${statusChamado}`)
    linhas.push('')

    linhas.push('🏪 Dados do expresso')
    linhas.push(`• Nome do Expresso: ${nomeExpresso}`)
    linhas.push(`• Chave Loja: ${expressoKey}`)
    linhas.push(`• Agência: ${agencia || '—'}`)
    linhas.push(`• PACB: ${pacb || '—'}`)
    linhas.push(`• Status do Expresso: ${statusExpresso || '—'}`)
    linhas.push('')

    linhas.push('👤 Contato informado')
    linhas.push(`• Nome com quem falou: ${contatoNome}`)
    linhas.push(`• Telefone: ${contatoTelefone}`)
    linhas.push('')

    linhas.push('📝 Descrição')
    linhas.push(descricao)
    linhas.push('')

    linhas.push('🙋 Usuário que abriu o chamado')
    linhas.push(`• Nome: ${userName || '—'}`)
    linhas.push(`• E-mail: ${userEmail}`)
    linhas.push('')

    linhas.push(`🕒 Data/Hora (Bahia): ${dataHora}`)

    const texto = linhas.join('\n')

    const assunto = `Chamado aberto - ${protocolo} - ${nomeExpresso}`

    // 1) ENVIA PARA O ADMIN (mesmo padrão do baixa-empresa)
    await resend.emails.send({
      from: `TreinoExpresso <${fromEmail}>`,
      to: toEmail,
      subject: assunto,
      text: texto,
      replyTo: userEmail || undefined,
    })

    // 2) TENTA ENVIAR UMA CÓPIA PARA O USUÁRIO
    // Se falhar, não derruba a rota inteira
    try {
      await resend.emails.send({
        from: `TreinoExpresso <${fromEmail}>`,
        to: userEmail,
        subject: `Cópia do seu chamado - ${protocolo}`,
        text: [
          `Seu chamado foi registrado com sucesso.`,
          ``,
          `Protocolo: ${protocolo}`,
          `Tipo: ${labelTipoChamado(tipo)}`,
          `Expresso: ${nomeExpresso}`,
          `Chave Loja: ${expressoKey}`,
          `Status do chamado: ${statusChamado}`,
          ``,
          `Descrição:`,
          descricao,
          ``,
          `Data/Hora (Bahia): ${dataHora}`,
        ].join('\n'),
      })
    } catch (userMailError) {
      console.error('Erro ao enviar cópia para o usuário:', userMailError)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('ERRO ENVIO EMAIL REPORTAR:', e)

    return NextResponse.json(
      { ok: false, message: e?.message || 'Erro ao enviar e-mail.' },
      { status: 500 }
    )
  }
}