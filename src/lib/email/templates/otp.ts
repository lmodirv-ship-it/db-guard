export function renderOtpEmail(opts: { code: string; appName?: string; minutes?: number }) {
  const appName = opts.appName ?? "DB-GUARD";
  const minutes = opts.minutes ?? 10;
  const text = `Your ${appName} verification code is: ${opts.code}\n\nThis code expires in ${minutes} minutes. If you didn't request it, you can safely ignore this email.`;
  const html = `<!doctype html>
<html><body style="margin:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px">
    <h1 style="font-size:20px;font-weight:600;margin:0 0 8px">${appName}</h1>
    <p style="font-size:14px;color:#475569;margin:0 0 32px">Your verification code</p>
    <div style="font-size:36px;font-weight:700;letter-spacing:0.4em;text-align:center;padding:24px;background:#f1f5f9;border-radius:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${opts.code}</div>
    <p style="font-size:13px;color:#64748b;margin:24px 0 0">This code expires in ${minutes} minutes. If you didn't request it, ignore this email.</p>
  </div>
</body></html>`;
  return { html, text, subject: `${opts.code} is your ${appName} verification code` };
}
