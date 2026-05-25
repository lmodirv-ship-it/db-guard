import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { smtpProvider } from "./providers/smtp.server";

const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL ?? "info@hnchat.net";

export interface RegistrationUser {
  full_name: string;
  email: string;
  phone?: string | null;
  login_id: string;
  created_at: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function logEmail(
  to: string,
  subject: string,
  status: "sent" | "failed" | "skipped",
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

/**
 * Sends "New user registered" notification to admin. Never throws.
 * Logs every attempt to public.email_logs.
 */
export async function sendRegistrationEmail(user: RegistrationUser): Promise<void> {
  const subject = "New user registered";
  const to = ADMIN_NOTIFY_EMAIL;

  const text = [
    "New user registered",
    `Full name: ${user.full_name}`,
    `Email: ${user.email}`,
    `Phone: ${user.phone ?? "-"}`,
    `Login ID: ${user.login_id}`,
    `Registered at: ${user.created_at}`,
  ].join("\n");

  const html = `
    <h2>New user registered</h2>
    <ul>
      <li><b>Full name:</b> ${escapeHtml(user.full_name)}</li>
      <li><b>Email:</b> ${escapeHtml(user.email)}</li>
      <li><b>Phone:</b> ${escapeHtml(user.phone ?? "-")}</li>
      <li><b>Login ID:</b> <code>${escapeHtml(user.login_id)}</code></li>
      <li><b>Registered at:</b> ${escapeHtml(user.created_at)}</li>
    </ul>`;

  // If SMTP not configured, log skipped — registration must still succeed.
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    await logEmail(to, subject, "skipped", "SMTP not configured");
    return;
  }

  try {
    await smtpProvider.send({ to, subject, html, text });
    await logEmail(to, subject, "sent");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("send_registration_email_failed", msg);
    await logEmail(to, subject, "failed", msg);
  }
}
