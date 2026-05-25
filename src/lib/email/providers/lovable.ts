import type { EmailProvider, SendEmailParams, SendEmailResult } from "../types";

// Lovable Email provider — uses LOVABLE_API_KEY + Lovable Email API
export const lovableProvider: EmailProvider = {
  name: "lovable",
  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const from = params.from ?? process.env.HN_MAIL_FROM ?? "DB-GUARD <noreply@notify.hn-driver.com>";

    const res = await fetch("https://email.lovable.dev/v1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Lovable email send failed: ${res.status} ${body}`);
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { id: data.id ?? crypto.randomUUID(), provider: "lovable" };
  },
};
