// Shared Resend email sender. Requires RESEND_API_KEY secret.
export const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@send.notiproof.com";
export const RESEND_FROM_NAME = Deno.env.get("RESEND_FROM_NAME") ?? "NotiProof";

export interface SendEmailInput {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  replyTo?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<{ ok: true; id?: string } | { ok: false; status: number; error: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return { ok: false, status: 500, error: "RESEND_API_KEY is not configured" };
  const name = (input.fromName ?? RESEND_FROM_NAME).replace(/[<>"]/g, "").trim() || RESEND_FROM_NAME;
  const to = input.to.name ? `${input.to.name.replace(/[<>"]/g, "")} <${input.to.email}>` : input.to.email;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${name} <${RESEND_FROM_EMAIL}>`,
      to: [to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    }),
  });
  const body = await res.text();
  if (!res.ok) {
    let msg = body;
    try { msg = JSON.parse(body)?.message ?? body; } catch { /* raw */ }
    console.error("Resend error", res.status, body);
    return { ok: false, status: res.status, error: `Resend: ${msg}` };
  }
  let id: string | undefined;
  try { id = JSON.parse(body)?.id; } catch { /* ignore */ }
  return { ok: true, id };
}
