// Stub providers — wire up real SDKs when adopted.
import type { EmailProvider } from "../types";


export const mailgunProvider: EmailProvider = {
  name: "mailgun",
  async send() {
    throw new Error("Mailgun provider not yet implemented. Configure MAILGUN_API_KEY/MAILGUN_DOMAIN.");
  },
};

export const sesProvider: EmailProvider = {
  name: "ses",
  async send() {
    throw new Error("AWS SES provider not yet implemented. Configure AWS credentials.");
  },
};
