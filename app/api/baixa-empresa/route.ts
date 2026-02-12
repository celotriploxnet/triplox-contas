import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.FROM_EMAIL; // ex: no-reply@treinoexpresso.com.br
    const toEmail = process.env.MAIL_TO; // ex: marcelo@treinexpresso.com.br

    // ✅ Só valida dentro do request (não quebra build)
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

    const assunto = `Solicitação de baixa de empresa - ${nomeExpresso}`;

    const texto =
      `Solicitação de baixa de empresa\n\n` +
      `Nome do Expresso: ${nomeExpresso}\n` +
      `Chave: ${chave}\n` +
      `Agência: ${agencia}\n` +
      `PACB: ${pacb}\n` +
      `Motivo do pedido de baixa: ${motivo}\n` +
      `E-mail do gerente da agência: ${emailGerente}\n\n` +
      `Solicitante (nome): ${solicitanteNome || "—"}\n` +
      `Solicitante (email/login): ${solicitanteEmail || "—"}\n` +
      `Data/Hora: ${new Date().toLocaleString("pt-BR")}\n`;

    const { data, error } = await resend.emails.send({
      from: `TreinoExpresso <${fromEmail}>`,
      to: toEmail,
      subject: assunto,
      text: texto,
      replyTo: solicitanteEmail || undefined,
    });

    if (error) {
      console.error("RESEND ERROR:", error);
      return bad(error.message || "Falha ao enviar e-mail (Resend).", 500);
    }

    return NextResponse.json({ ok: true, id: data?.id || null });
  } catch (e: any) {
    console.error("API BAIXA EMPRESA ERROR:", e);
    return NextResponse.json(
      { ok: false, message: e?.message || "Erro interno ao enviar e-mail." },
      { status: 500 }
    );
  }
}