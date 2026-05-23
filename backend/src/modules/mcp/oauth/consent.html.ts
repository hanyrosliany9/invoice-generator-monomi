interface ConsentPageArgs {
  requestId: string;
  clientName: string;
  errorMessage?: string;
}

function escape(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderConsentPage(args: ConsentPageArgs): string {
  const clientName = escape(args.clientName);
  const requestId = escape(args.requestId);
  const errorBlock = args.errorMessage
    ? `<div class="error">${escape(args.errorMessage)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Hubungkan ${clientName} ke Monomi</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif;
    background: #0f172a; color: #e2e8f0; margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 32px; max-width: 420px; width: 100%; box-shadow: 0 12px 32px rgba(0,0,0,0.45); }
  h1 { margin: 0 0 8px; font-size: 20px; }
  p.lead { color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0 0 24px; }
  .scope { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #cbd5e1; }
  .scope ul { margin: 8px 0 0 18px; padding: 0; }
  .scope li { margin: 4px 0; }
  label { display: block; font-size: 13px; color: #cbd5e1; margin-top: 14px; margin-bottom: 6px; }
  input { width: 100%; box-sizing: border-box; padding: 10px 12px; background: #0f172a; border: 1px solid #475569; border-radius: 6px; color: #f1f5f9; font-size: 14px; }
  input:focus { outline: 2px solid #6366f1; border-color: transparent; }
  button { width: 100%; margin-top: 20px; padding: 12px; background: #4f46e5; color: white; border: 0; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; }
  button:hover:not(:disabled) { background: #6366f1; }
  button:disabled { background: #475569; cursor: progress; opacity: .8; }
  .error { margin: 0 0 16px; padding: 10px 12px; background: #7f1d1d; color: #fecaca; border-radius: 6px; font-size: 13px; }
  .meta { margin-top: 20px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5; }
</style>
</head>
<body>
  <form class="card" method="post" action="/consent" autocomplete="off" onsubmit="var b=this.querySelector('button[type=submit]'); if (b.dataset.submitted) return false; b.dataset.submitted='1'; b.disabled=true; b.textContent='Menghubungkan…';">
    <h1>Hubungkan <strong>${clientName}</strong> ke Monomi</h1>
    <p class="lead">Aplikasi ini meminta akses untuk membaca dan menulis data atas nama Anda di Monomi.</p>

    ${errorBlock}

    <div class="scope">
      <strong>Hak akses yang diberikan:</strong>
      <ul>
        <li>Membaca data sesuai peran Anda</li>
        <li>Membuat draft dokumen (Anda tetap menyetujui sebelum dikirim)</li>
        <li>Mencatat aktivitas ke audit log</li>
      </ul>
    </div>

    <input type="hidden" name="request_id" value="${requestId}" />

    <label for="email">Email</label>
    <input id="email" name="email" type="email" required autofocus autocomplete="username" />

    <label for="password">Password</label>
    <input id="password" name="password" type="password" required autocomplete="current-password" />

    <button type="submit" id="submit-btn">Setujui &amp; Hubungkan</button>

    <div class="meta">
      Penggunaan AI dihitung terhadap langganan Claude Anda sendiri,<br/>
      bukan kuota Monomi. Anda dapat mencabut akses kapan saja di Pengaturan.
    </div>
  </form>
</body>
</html>`;
}
