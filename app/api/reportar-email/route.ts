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
    partes.find((p) => p.type === type)?.value || ''

  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`
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
    const solucaoTexto = escapeText(body?.solucaoTexto)
    const dataHoraEvento = escapeText(body?.dataHoraEvento || formatarDataHoraBrasilia())

    const obrigatorios = [
      ['Protocolo', protocolo],
      ['E-mail do usuário', userEmail],
      ['Tipo', tipo],
      ['Chave Loja', expressoKey],
      ['Nome do Expresso', nomeExpresso],
    ] as const

    for (const [campo, valor] of obrigatorios) {
      if (!valor || String(valor).trim() === '') {
        return bad(`Campo obrigatório: ${campo}`)
      }
    }

    const tipoLabel = labelTipoChamado(tipo)

    if (statusChamado === 'SOLUCIONADO') {
      const textoAdmin = [
        `CHAMADO SOLUCIONADO — ${protocolo}`,
        ``,
        `📌 Dados do chamado`,
        `• Protocolo: ${protocolo}`,
        `• Tipo: ${tipoLabel}`,
        `• Status do chamado: SOLUCIONADO`,
        ``,
        `🏪 Dados do expresso`,
        `• Nome do Expresso: ${nomeExpresso}`,
        `• Chave Loja: ${expressoKey}`,
        `• Agência: ${agencia || '—'}`,
        `• PACB: ${pacb || '—'}`,
        `• Status do Expresso: ${statusExpresso || '—'}`,
        ``,
        `👤 Usuário do chamado`,
        `• Nome: ${userName || '—'}`,
        `• E-mail: ${userEmail}`,
        ``,
        `👥 Contato informado no chamado`,
        `• Nome com quem falou: ${contatoNome || '—'}`,
        `• Telefone: ${contatoTelefone || '—'}`,
        ``,
        `📝 Descrição original`,
        `${descricao || '—'}`,
        ``,
        `✅ Solução informada pelo admin`,
        `${solucaoTexto || '—'}`,
        ``,
        `🕒 Data/Hora da solução (Brasília): ${dataHoraEvento}`,
      ].join('\n')

      await resend.emails.send({
        from: `TreinoExpresso <${fromEmail}>`,
        to: toEmail,
        subject: `Chamado solucionado - ${protocolo} - ${nomeExpresso}`,
        text: textoAdmin,
        replyTo: userEmail || undefined,
      })

      await resend.emails.send({
        from: `TreinoExpresso <${fromEmail}>`,
        to: userEmail,
        subject: `Seu chamado foi solucionado - ${protocolo}`,
        text: [
          `Olá${userName ? `, ${userName}` : ''}!`,
          ``,
          `Seu chamado foi marcado como SOLUCIONADO.`,
          ``,
          `Protocolo: ${protocolo}`,
          `Tipo: ${tipoLabel}`,
          `Expresso: ${nomeExpresso}`,
          `Chave Loja: ${expressoKey}`,
          `Agência: ${agencia || '—'}`,
          `PACB: ${pacb || '—'}`,
          `Data/Hora da solução (Brasília): ${dataHoraEvento}`,
          ``,
          `✅ Solução informada:`,
          `${solucaoTexto || '—'}`,
          ``,
          `Descrição do chamado:`,
          `${descricao || '—'}`,
        ].join('\n'),
      })

      return NextResponse.json({ ok: true })
    }

    const textoAberturaAdmin = [
      `CHAMADO ABERTO — ${protocolo}`,
      ``,
      `📌 Dados do chamado`,
      `• Protocolo: ${protocolo}`,
      `• Tipo: ${tipoLabel}`,
      `• Status do chamado: ${statusChamado}`,
      ``,
      `🏪 Dados do expresso`,
      `• Nome do Expresso: ${nomeExpresso}`,
      `• Chave Loja: ${expressoKey}`,
      `• Agência: ${agencia || '—'}`,
      `• PACB: ${pacb || '—'}`,
      `• Status do Expresso: ${statusExpresso || '—'}`,
      ``,
      `👤 Contato informado`,
      `• Nome com quem falou: ${contatoNome || '—'}`,
      `• Telefone: ${contatoTelefone || '—'}`,
      ``,
      `📝 Descrição`,
      `${descricao || '—'}`,
      ``,
      `🙋 Usuário que abriu o chamado`,
      `• Nome: ${userName || '—'}`,
      `• E-mail: ${userEmail}`,
      ``,
      `🕒 Data/Hora (Brasília): ${dataHoraEvento}`,
    ].join('\n')

    await resend.emails.send({
      from: `TreinoExpresso <${fromEmail}>`,
      to: toEmail,
      subject: `Chamado aberto - ${protocolo} - ${nomeExpresso}`,
      text: textoAberturaAdmin,
      replyTo: userEmail || undefined,
    })

    try {
      await resend.emails.send({
        from: `TreinoExpresso <${fromEmail}>`,
        to: userEmail,
        subject: `Cópia do seu chamado - ${protocolo}`,
        text: [
          `Seu chamado foi registrado com sucesso.`,
          ``,
          `Protocolo: ${protocolo}`,
          `Tipo: ${tipoLabel}`,
          `Expresso: ${nomeExpresso}`,
          `Chave Loja: ${expressoKey}`,
          `Status do chamado: ${statusChamado}`,
          `Data/Hora (Brasília): ${dataHoraEvento}`,
          ``,
          `Descrição:`,
          `${descricao || '—'}`,
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