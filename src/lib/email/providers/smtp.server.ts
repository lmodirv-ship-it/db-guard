import nodemailer, { type Transporter } from "nodemailer";
import type { EmailProvider } from "../types";

let cached: Transporter | null = null;

function getTransport(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  if (cached) return cached;
  cached = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return cached;
}

export const smtpProvider: EmailProvider = {
  name: "smtp",
  async send(params) {
    const transport = getTransport();
    if (!transport) {
      throw new Error("SMTP not configured (missing SMTP_HOST/SMTP_USER/SMTP_PASS)");
    }
    const from =
      params.from ?? process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? "no-reply@localhost";
    const info = await transport.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    return { id: info.messageId, provider: "smtp" };
  },
};
