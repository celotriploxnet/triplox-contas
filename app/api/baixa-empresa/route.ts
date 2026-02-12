import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function escapeHtml(input: string) {
  return String(input || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function nl2br(input: string) {
  return escapeHtml(input).replace(/\n/g, "<br/>");
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

    const assunto = `Solicitação de baixa de check-in - ${nomeExpresso}`;
    const dataHora = new Date().toLocaleString("pt-BR");

    const temSolicitante =
      (solicitanteNome && String(solicitanteNome).trim()) ||
      (solicitanteEmail && String(solicitanteEmail).trim());

    // ✅ Plain text (fallback) - sem "—"
    let texto =
      `Solicitação de baixa de empresa\n\n` +
      `Nome do Expresso: ${nomeExpresso}\n` +
      `Chave: ${chave}\n` +
      `Agência: ${agencia}\n` +
      `PACB: ${pacb}\n` +
      `Motivo do pedido de baixa: ${motivo}\n` +
      `E-mail do gerente da agência: ${emailGerente}\n\n` +
      `Data/Hora: ${dataHora}\n`;

    if (temSolicitante) {
      if (solicitanteNome && String(solicitanteNome).trim()) {
        texto += `\nSolicitante (nome): ${solicitanteNome}\n`;
      }
      if (solicitanteEmail && String(solicitanteEmail).trim()) {
        texto += `Solicitante (email/login): ${solicitanteEmail}\n`;
      }
    }

    // ✅ HTML bonito - bloco "Solicitante" só aparece se tiver dado
    const solicitanteHtml = temSolicitante
      ? `
        <div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;">
          <div style="color:rgba(255,255,255,.70);font-size:12px;">
            ${
              solicitanteNome && String(solicitanteNome).trim()
                ? `<div><b style="color:#fff;">Solicitante:</b> ${escapeHtml(
                    solicitanteNome
                  )}</div>`
                : ""
            }
            ${
              solicitanteEmail && String(solicitanteEmail).trim()
                ? `<div><b style="color:#fff;">Login:</b> ${escapeHtml(
                    solicitanteEmail
                  )}</div>`
                : ""
            }
          </div>

          ${
            solicitanteEmail && String(solicitanteEmail).trim()
              ? `<a href="mailto:${encodeURIComponent(
                  solicitanteEmail
                )}" style="display:inline-block;text-decoration:none;background:linear-gradient(135deg,#ff2a2a,#7c3aed);color:#ffffff;font-weight:800;font-size:13px;padding:10px 14px;border-radius:12px;">
                  Responder solicitante →
                </a>`
              : ""
          }
        </div>
      `
      : "";

    const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(assunto)}</title>
  </head>
  <body style="margin:0;padding:0;background:#0b0a12;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Solicitação de baixa - ${escapeHtml(nomeExpresso)}
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b0a12;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;">
            <tr>
              <td style="padding:0 0 14px 0;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="width:14px;height:14px;border-radius:999px;background:linear-gradient(135deg,#ff2a2a,#7c3aed);box-shadow:0 0 0 6px rgba(124,58,237,.12);"></div>
                  <div>
                    <div style="font-weight:900;letter-spacing:.2px;color:#ffffff;font-size:18px;line-height:1.1;">
                      Sistema • Triplo-X
                    </div>
                    <div style="color:rgba(255,255,255,.65);font-size:12px;margin-top:2px;">
                      Solicitação automática • ${escapeHtml(dataHora)}
                    </div>
                  </div>
                </div>
              </td>
            </tr>

            <tr>
              <td style="border-radius:18px;overflow:hidden;background:linear-gradient(135deg,rgba(255,42,42,.20),rgba(124,58,237,.20));padding:1px;">
                <div style="background:#111026;border-radius:17px;padding:18px 18px 16px 18px;">
                  <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;">
                    <div style="color:#ffffff;font-size:18px;font-weight:900;">
                      Solicitação de baixa de Check-in
                    </div>
                    <div style="display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.06);color:rgba(255,255,255,.85);font-size:12px;">
                      <span style="width:8px;height:8px;border-radius:999px;background:#22c55e;display:inline-block;"></span>
                      Novo pedido
                    </div>
                  </div>

                  <div style="margin-top:10px;color:rgba(255,255,255,.75);font-size:13px;line-height:1.5;">
                    Um usuário enviou um pedido de baixa. Confira os dados abaixo.
                  </div>

                  <div style="margin-top:16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;overflow:hidden;border-radius:14px;background:rgba(255,255,255,.04);">
                      <tr>
                        <td style="padding:12px 14px;color:rgba(255,255,255,.70);font-size:12px;border-bottom:1px solid rgba(255,255,255,.06);width:40%;">Nome do Expresso</td>
                        <td style="padding:12px 14px;color:#ffffff;font-size:13px;font-weight:700;border-bottom:1px solid rgba(255,255,255,.06);">${escapeHtml(nomeExpresso)}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 14px;color:rgba(255,255,255,.70);font-size:12px;border-bottom:1px solid rgba(255,255,255,.06);">Chave</td>
                        <td style="padding:12px 14px;color:#ffffff;font-size:13px;font-weight:700;border-bottom:1px solid rgba(255,255,255,.06);">${escapeHtml(chave)}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 14px;color:rgba(255,255,255,.70);font-size:12px;border-bottom:1px solid rgba(255,255,255,.06);">Agência</td>
                        <td style="padding:12px 14px;color:#ffffff;font-size:13px;font-weight:700;border-bottom:1px solid rgba(255,255,255,.06);">${escapeHtml(agencia)}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 14px;color:rgba(255,255,255,.70);font-size:12px;border-bottom:1px solid rgba(255,255,255,.06);">PACB</td>
                        <td style="padding:12px 14px;color:#ffffff;font-size:13px;font-weight:700;border-bottom:1px solid rgba(255,255,255,.06);">${escapeHtml(pacb)}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 14px;color:rgba(255,255,255,.70);font-size:12px;border-bottom:1px solid rgba(255,255,255,.06);vertical-align:top;">Motivo do pedido</td>
                        <td style="padding:12px 14px;color:#ffffff;font-size:13px;line-height:1.55;">${nl2br(motivo)}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 14px;color:rgba(255,255,255,.70);font-size:12px;border-top:1px solid rgba(255,255,255,.06);">E-mail do gerente</td>
                        <td style="padding:12px 14px;color:#ffffff;font-size:13px;font-weight:700;border-top:1px solid rgba(255,255,255,.06);">${escapeHtml(emailGerente)}</td>
                      </tr>
                    </table>
                  </div>

                  ${solicitanteHtml}

                  <div style="margin-top:14px;color:rgba(255,255,255,.50);font-size:11px;line-height:1.4;">
                    Este e-mail foi gerado automaticamente pelo sistema Triplo-X.
                  </div>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 4px 0 4px;color:rgba(255,255,255,.45);font-size:11px;line-height:1.4;text-align:center;">
                © ${new Date().getFullYear()} TreinoExpresso • TriploX Contas
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    const { data, error } = await resend.emails.send({
      from: `TreinoExpresso <${fromEmail}>`,
      to: toEmail,
      subject: assunto,
      text: texto,
      html,
      replyTo: solicitanteEmail && String(solicitanteEmail).trim() ? solicitanteEmail : undefined,
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