// Provider-agnostic email types
export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface SendEmailResult {
  id: string;
  provider: string;
}

export interface EmailProvider {
  name: string;
  send(params: SendEmailParams): Promise<SendEmailResult>;
}
