import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

type AssuntoTipo = "treinamento" | "checkin";

function getAssuntoLabel(assuntoTipo?: AssuntoTipo) {
  return assuntoTipo === "treinamento" ? "Baixa de Treinamento" : "Baixa de Check-in";
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
      assuntoTipo,
      assuntoLabel, // opcional (vem do front)
      nomeExpresso,
      chave,
      agencia,
      pacb,
      motivo,
      emailGerente,
      solicitanteEmail,
      solicitanteNome,
    } = body || {};

    // 🔒 Validação obrigatória
    const obrigatorios = [
      ["Tipo / assunto", assuntoTipo],
      ["Nome do Expresso", nomeExpresso],
      ["Chave", chave],
      ["Agência", agencia],
      ["PACB", pacb],
      ["Motivo", motivo],
      ["E-mail do gerente da agência", emailGerente],
    ] as const;

    for (const [campo, valor] of obrigatorios) {
      if (!valor || String(valor).trim() === "") {
        return bad(`Campo obrigatório: ${campo}`);
      }
    }

    // valida tipo
    const tipo = String(assuntoTipo).trim().toLowerCase() as AssuntoTipo;
    if (tipo !== "treinamento" && tipo !== "checkin") {
      return bad("Tipo inválido. Use 'treinamento' ou 'checkin'.");
    }

    const assuntoFinal =
      (assuntoLabel && String(assuntoLabel).trim()) || getAssuntoLabel(tipo);

    // 🕒 DATA/HORA FIXA NA BAHIA
    const dataHora = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Bahia",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date());

    // ✉️ EMAIL TEXTO PURO (mais organizado)
    const linhas: string[] = [];

    linhas.push(`SOLICITAÇÃO — ${assuntoFinal.toUpperCase()}`);
    linhas.push("");
    linhas.push("📌 Dados da empresa");
    linhas.push(`• Nome do Expresso: ${nomeExpresso}`);
    linhas.push(`• Chave: ${chave}`);
    linhas.push(`• Agência: ${agencia}`);
    linhas.push(`• PACB: ${pacb}`);
    linhas.push("");
    linhas.push("📝 Motivo");
    linhas.push(String(motivo));
    linhas.push("");
    linhas.push(`📩 E-mail do gerente da agência: ${emailGerente}`);
    linhas.push("");
    linhas.push(`🕒 Data/Hora (Bahia): ${dataHora}`);

    // ➕ Solicitante (se houver)
    if (solicitanteNome && String(solicitanteNome).trim()) {
      linhas.push("");
      linhas.push(`👤 Solicitante: ${solicitanteNome}`);
    }
    if (solicitanteEmail && String(solicitanteEmail).trim()) {
      if (!linhas.includes("")) linhas.push("");
      linhas.push(`✉️ E-mail do solicitante: ${solicitanteEmail}`);
    }

    const texto = linhas.join("\n");

    await resend.emails.send({
      from: `TreinoExpresso <${fromEmail}>`,
      to: toEmail,
      subject: `${assuntoFinal} - ${nomeExpresso}`,
      text: texto,
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