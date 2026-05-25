interface PasswordResetParams {
  full_name: string;
  hn_user_code: string;
  code: string;
  minutes: number;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export function renderPasswordResetEmail(p: PasswordResetParams) {
  const subject = `[DB-GUARD] Password reset code: ${p.code}`;
  const html = `<!doctype html><html><body style="margin:0;background:#0b0b14;color:#e9e9f1;font-family:system-ui,Segoe UI,Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="font-size:11px;letter-spacing:4px;color:#f1d97c">DB-GUARD · IDENTITY</div>
    <h1 style="margin:8px 0 4px;color:#fff;font-size:22px">Reset your password</h1>
    <p style="margin:0 0 20px;color:#9aa1b1;font-size:14px">Hi ${escapeHtml(p.full_name)} (<code style="color:#f1d97c">${escapeHtml(p.hn_user_code)}</code>), use the code below to set a new password. It expires in ${p.minutes} minutes.</p>
    <div style="margin:24px 0;padding:20px;background:#11111c;border:1px solid #1e1e2e;border-radius:12px;text-align:center">
      <div style="font-size:11px;letter-spacing:3px;color:#9aa1b1">VERIFICATION CODE</div>
      <div style="margin-top:8px;font-family:monospace;font-size:32px;letter-spacing:8px;color:#f1d97c">${escapeHtml(p.code)}</div>
    </div>
    <p style="color:#9aa1b1;font-size:13px">If you didn't request this, you can safely ignore this email — no changes were made.</p>
    <p style="margin:24px 0 0;color:#5b6173;font-size:11px">DB-GUARD · HN Unified Identity</p>
  </div></body></html>`;
  const text = `DB-GUARD password reset\n\nHi ${p.full_name} (${p.hn_user_code}),\nYour reset code is: ${p.code}\nIt expires in ${p.minutes} minutes.\n\nIf you didn't request this, ignore this email.`;
  return { subject, html, text };
}
