import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(req: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return bad("RESEND_API_KEY não configurada nas variáveis de ambiente.", 500);
    }

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

    // ✅ Validação básica
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

    // ⚠️ IMPORTANTE:
    // Antes de validar domínio no Resend, você só pode enviar "from" usando domínio do Resend.
    // E o resend.dev tem restrições de destinatário em alguns casos.  [oai_citation:1‡resend.com](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain?utm_source=chatgpt.com)
    // Se der 403 por isso, me diga que eu te guio pra validar um domínio (rapidinho).
    const from = "TreinoExpresso <onboarding@resend.dev>";

    const { data, error } = await resend.emails.send({
      from,
      to: "marcelo@treinexpresso.com.br",
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