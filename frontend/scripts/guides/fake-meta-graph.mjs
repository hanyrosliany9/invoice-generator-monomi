/**
 * Tiny fake Meta Graph API for the CRM / WhatsApp / auto-publishing capture.
 * Point the backend at it so NO real Meta call happens while the guides are captured:
 *
 *   FG_PORT=5598 node fake-meta-graph.mjs &
 *   WHATSAPP_GRAPH_BASE_URL=http://127.0.0.1:5598 META_GRAPH_BASE_URL=http://127.0.0.1:5598 ...
 *
 * It answers just enough: token / WABA / phone-number checks, message templates, sending
 * messages, Conversions API events, and Instagram / Facebook publishing. A content caption
 * containing "FAILME" makes the media upload fail with Meta's "unsupported aspect ratio" error.
 * Anything that looks like registering / migrating a number is logged as an ALARM (it must never happen).
 */
import http from 'node:http';

const PORT = Number(process.env.FG_PORT || 5598);
let n = 0;

http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const u = new URL(req.url, 'http://x');
    const p = u.pathname.replace(/^\/v\d+\.\d+/, '');
    const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (/register|request_code|verify_code|two_step|migrat/i.test(req.url)) {
      console.log('ALARM: number registration style call', req.method, req.url);
      return send(200, { success: true });
    }
    if (/FAILME/.test(body) && req.method === 'POST' && /\/(media|feed|photos|videos)$/.test(p)) {
      return send(400, { error: { message: 'Media upload has failed: the image aspect ratio is not supported (Instagram requires between 4:5 and 1.91:1).', type: 'OAuthException', code: 100, error_subcode: 2207009, fbtrace_id: 'x' } });
    }
    if (p.startsWith('/media/')) { res.writeHead(200, { 'content-type': 'image/jpeg' }); return res.end(Buffer.from('fakejpegbytes')); }
    if (req.method === 'GET' && p === '/me') return send(200, { id: '999000111', name: 'Monomi Publishing System User' });
    if (req.method === 'GET' && p === '/me/permissions') {
      return send(200, { data: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish', 'business_management'].map((permission) => ({ permission, status: 'granted' })) });
    }
    if (req.method === 'GET' && /^\/\d+\/phone_numbers$/.test(p)) {
      return send(200, { data: [{ id: '1111111111', display_phone_number: '+62 811-1111-1111', verified_name: 'Monomi Agency', platform_type: 'CLOUD_API', status: 'CONNECTED', quality_rating: 'GREEN' }] });
    }
    if (req.method === 'GET' && /^\/\d+\/message_templates$/.test(p)) {
      return send(200, { data: [
        { name: 'tindak_lanjut_penawaran', language: 'id', status: 'APPROVED', category: 'UTILITY', components: [{ type: 'BODY', text: 'Halo {{1}}, kami dari Monomi ingin menindaklanjuti permintaan Anda tentang {{2}}. Apakah ada yang bisa kami bantu?' }] },
        { name: 'welcome_monomi', language: 'en', status: 'APPROVED', category: 'MARKETING', components: [{ type: 'BODY', text: 'Hi {{1}}, thanks for reaching out to Monomi Agency. When is a good time to talk?' }] },
      ] });
    }
    if (req.method === 'GET' && /^\/\d+\/subscribed_apps$/.test(p)) return send(200, { data: [] });
    if (req.method === 'POST' && /^\/\d+\/messages$/.test(p)) return send(200, { messages: [{ id: `wamid.FAKE${++n}` }] });
    if (req.method === 'POST' && /^\/\d+\/events$/.test(p)) {
      let d = [];
      try { d = JSON.parse(body).data; } catch { /* form encoded */ }
      return send(200, { events_received: d.length, fbtrace_id: 'trace' });
    }
    if (req.method === 'POST' && /^\/\d+\/dataset$/.test(p)) return send(200, { id: '999999999' });
    if (req.method === 'GET' && /^\/\d+$/.test(p) && u.searchParams.get('fields') === 'permalink') {
      return send(200, { id: p.slice(1), permalink: `https://www.instagram.com/p/DemoPost${p.slice(-4)}/` });
    }
    if (req.method === 'GET' && /^\/[\d_]+$/.test(p) && u.searchParams.get('fields') === 'permalink_url') {
      return send(200, { id: p.slice(1), permalink_url: `https://www.facebook.com/100200300400/posts/${p.slice(-6)}` });
    }
    if (req.method === 'GET' && /^\/\d+$/.test(p)) {
      return send(200, { id: p.slice(1), status_code: 'FINISHED', name: 'Monomi Agency', url: `http://127.0.0.1:${PORT}/media/x.jpg`, mime_type: 'image/jpeg', file_size: 13, access_token: `EAAPAGETOKEN${'x'.repeat(40)}`, instagram_business_account: { id: '22222222', username: 'monomi.agency' }, username: 'monomi.agency' });
    }
    if (req.method === 'GET' && p === '/oauth/access_token') return send(200, { access_token: `EAABIZTOKEN${'y'.repeat(40)}` });
    if (req.method === 'GET' && p === '/me/accounts') return send(200, { data: [] });
    if (req.method === 'POST' && /^\/\d+\/media$/.test(p)) return send(200, { id: `3333${++n}` });
    if (req.method === 'POST' && /^\/\d+\/media_publish$/.test(p)) return send(200, { id: `4444${++n}` });
    if (req.method === 'POST' && /^\/\d+\/(feed|photos|videos)$/.test(p)) return send(200, { id: `5555_${++n}`, post_id: `5555_${n}` });
    if (req.method === 'GET' && /content_publishing_limit/.test(p)) return send(200, { data: [{ quota_usage: 0, config: { quota_total: 100 } }] });
    return send(200, { ok: true, data: [], status_code: 'FINISHED', id: '1' });
  });
}).listen(PORT, '127.0.0.1', () => console.log('fake Meta Graph on', PORT, 'pid', process.pid));
