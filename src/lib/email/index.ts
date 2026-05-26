import type { EmailProvider, SendEmailParams, SendEmailResult } from "./types";
import { lovableProvider } from "./providers/lovable";
import { resendProvider } from "./providers/resend";
import { smtpProvider, mailgunProvider, sesProvider } from "./providers/stubs";

const providers: Record<string, EmailProvider> = {
  lovable: lovableProvider,
  resend: resendProvider,
  smtp: smtpProvider,
  mailgun: mailgunProvider,
  ses: sesProvider,
};

export function getEmailProvider(): EmailProvider {
  const name = (process.env.EMAIL_PROVIDER ?? "lovable").toLowerCase();
  return providers[name] ?? lovableProvider;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const provider = getEmailProvider();
  return provider.send(params);
}

export type { EmailProvider, SendEmailParams, SendEmailResult } from "./types";
