import type { EmailProvider, SendEmailParams, SendEmailResult } from "../types";

export const resendProvider: EmailProvider = {
  name: "resend",
  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
    const from = params.from ?? process.env.HN_MAIL_FROM ?? "DB-GUARD <onboarding@resend.dev>";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend send failed: ${res.status} ${await res.text().catch(() => "")}`);
    }
    const data = (await res.json()) as { id: string };
    return { id: data.id, provider: "resend" };
  },
};
