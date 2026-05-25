import type { EmailProvider, SendEmailParams, SendEmailResult } from "./types";
import { lovableProvider } from "./providers/lovable";
import { resendProvider } from "./providers/resend";
import { smtpProvider } from "./providers/smtp.server";
import { mailgunProvider, sesProvider } from "./providers/stubs";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const providers: Record<string, EmailProvider> = {
  lovable: lovableProvider,
  resend: resendProvider,
  smtp: smtpProvider,
  mailgun: mailgunProvider,
  ses: sesProvider,
};

export function getEmailProvider(): EmailProvider {
  const name = (process.env.EMAIL_PROVIDER ?? "smtp").toLowerCase();
  return providers[name] ?? smtpProvider;
}

async function logEmail(
  to: string,
  subject: string,
  status: "sent" | "failed",
  errorMessage?: string,
) {
  try {
    await supabaseAdmin.from("email_logs").insert({
      to_email: to,
      subject,
      status,
      error_message: errorMessage ?? null,
    });
  } catch (e) {
    console.error("email_logs_insert_failed", e);
  }
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const provider = getEmailProvider();
  const to = Array.isArray(params.to) ? params.to.join(",") : params.to;
  try {
    const res = await provider.send(params);
    await logEmail(to, params.subject, "sent");
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`sendEmail_failed[${provider.name}]`, msg);
    await logEmail(to, params.subject, "failed", `${provider.name}: ${msg}`);
    throw err;
  }
}

export type { EmailProvider, SendEmailParams, SendEmailResult } from "./types";
