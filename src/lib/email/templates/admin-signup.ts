interface AdminSignupParams {
  full_name: string;
  email: string;
  user_id: string;
  hn_user_code: string;
  workspace_id: string;
  database_id: string;
  ip: string | null;
  user_agent: string | null;
  source_app: string;
  registered_at: string;
}

export function renderAdminSignupEmail(p: AdminSignupParams) {
  const subject = `[HN Account] New signup — ${p.hn_user_code} (${p.email})`;
  const rows: Array<[string, string]> = [
    ["Name", p.full_name],
    ["Email", p.email],
    ["HN Code", p.hn_user_code],
    ["User ID", p.user_id],
    ["Workspace ID", p.workspace_id],
    ["Database ID", p.database_id],
    ["Source App", p.source_app],
    ["Registered", p.registered_at],
    ["IP", p.ip ?? "—"],
    ["Device", p.user_agent ?? "—"],
  ];
  const tr = (k: string, v: string) =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #1e1e2e;color:#9aa1b1;font-size:12px;text-transform:uppercase;letter-spacing:1px">${k}</td><td style="padding:8px 12px;border-bottom:1px solid #1e1e2e;color:#f1d97c;font-family:monospace;font-size:13px">${escapeHtml(v)}</td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;background:#0b0b14;color:#e9e9f1;font-family:system-ui,Segoe UI,Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px">
    <div style="font-size:11px;letter-spacing:4px;color:#f1d97c">HN ACCOUNT · ADMIN ALERT</div>
    <h1 style="margin:8px 0 4px;color:#fff;font-size:22px">New user registered</h1>
    <p style="margin:0 0 24px;color:#9aa1b1;font-size:14px">A new HN account was just provisioned.</p>
    <table style="width:100%;border-collapse:collapse;background:#11111c;border:1px solid #1e1e2e;border-radius:12px;overflow:hidden">
      ${rows.map(([k, v]) => tr(k, v)).join("")}
    </table>
    <p style="margin:24px 0 0;color:#5b6173;font-size:11px">HN Account · Notification System</p>
  </div></body></html>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  return { subject, html, text };
}

export function renderWelcomeEmail(p: { full_name: string; hn_user_code: string }) {
  const subject = `Welcome to HN, ${p.full_name} 🎉`;
  const html = `<!doctype html><html><body style="margin:0;background:#0b0b14;color:#e9e9f1;font-family:system-ui,Segoe UI,Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;text-align:center">
    <div style="font-size:11px;letter-spacing:6px;color:#f1d97c">HN ACCOUNT</div>
    <h1 style="margin:14px 0 6px;color:#fff;font-size:28px">Welcome to HN</h1>
    <p style="margin:0 0 28px;color:#9aa1b1;font-size:15px">Your unified HN identity is ready.</p>
    <div style="display:inline-block;padding:16px 28px;border:1px solid rgba(241,217,124,.45);border-radius:14px;background:rgba(241,217,124,.05)">
      <div style="font-size:10px;letter-spacing:3px;color:#9aa1b1">YOUR HN CODE</div>
      <div style="margin-top:6px;font-family:monospace;font-size:24px;color:#f1d97c;letter-spacing:2px">${escapeHtml(p.hn_user_code)}</div>
    </div>
    <p style="margin:28px 0 0;color:#9aa1b1;font-size:13px;line-height:1.6">
      One key for HN Chat, HN Driver, HN Souk, HN Studio, HN Video AI and DB·GUARD.<br/>
      Keep this code safe — it is your master access key.
    </p>
  </div></body></html>`;
  const text = `Welcome to HN, ${p.full_name}!\nYour HN Code: ${p.hn_user_code}\nKeep this code safe — it is your master access key.`;
  return { subject, html, text };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
