import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.FROM_EMAIL;
    const toEmail = process.env.MAIL_TO;

    if (!apiKey) return bad("RESEND_API_KEY não configurada.", 500);
    if (!fromEmail) return bad("FROM_EMAIL não configurada.", 500);
    if (!toEmail) return bad("MAIL_TO não configurada.", 500);

    const resend = new Resend(apiKey);

    const body = await req.json();
    const {
      nomeExpresso,
      chave,
      agencia,
      pacb,
      motivo,
      emailGerente,
      solicitanteEmail,
      solicitanteNome,
    } = body || {};

    // Validação
    const obrigatorios = [
      ["Nome do Expresso", nomeExpresso],
      ["Chave", chave],
      ["Agência", agencia],
      ["PACB", pacb],
      ["Motivo do pedido de baixa", motivo],
      ["E-mail do gerente da agência", emailGerente],
    ] as const;

    for (const [campo, valor] of obrigatorios) {
      if (!valor || String(valor).trim() === "") {
        return bad(`Campo obrigatório: ${campo}`);
      }
    }

    const dataHora = new Date().toLocaleString("pt-BR");

    let texto =
      `SOLICITAÇÃO DE BAIXA DE CHECKIN\n\n` +
      `Nome do Expresso: ${nomeExpresso}\n` +
      `Chave: ${chave}\n` +
      `Agência: ${agencia}\n` +
      `PACB: ${pacb}\n` +
      `Motivo do pedido de baixa:\n${motivo}\n\n` +
      `E-mail do gerente da agência: ${emailGerente}\n\n` +
      `Data/Hora: ${dataHora}\n`;

    // Só inclui solicitante se existir
    if (solicitanteNome && String(solicitanteNome).trim()) {
      texto += `\nSolicitante: ${solicitanteNome}`;
    }

    if (solicitanteEmail && String(solicitanteEmail).trim()) {
      texto += `\nE-mail do solicitante: ${solicitanteEmail}`;
    }

    await resend.emails.send({
      from: `TreinoExpresso <${fromEmail}>`,
      to: toEmail,
      subject: `Solicitação de baixa de CHECK-IN - ${nomeExpresso}`,
      text: texto, // 👈 EMAIL SIMPLES
      replyTo:
        solicitanteEmail && String(solicitanteEmail).trim()
          ? solicitanteEmail
          : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("ERRO ENVIO EMAIL:", e);
    return NextResponse.json(
      { ok: false, message: e?.message || "Erro ao enviar e-mail." },
      { status: 500 }
    );
  }
}