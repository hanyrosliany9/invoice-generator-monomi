/**
 * Shared helpers for the guide screenshot capture (see README.md).
 * Plain ESM, no TypeScript, so it runs with `node` and nothing else.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const FRONTEND = path.resolve(HERE, '..', '..');
export const PUBLIC_GUIDES = path.join(FRONTEND, 'public', 'guides');
export const MANIFEST_TS = path.join(FRONTEND, 'src', 'guides', 'imageManifest.ts');

export const cfg = {
  apiUrl: (process.env.GUIDE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, ''),
  appUrl: (process.env.GUIDE_APP_URL || 'http://localhost:5173').replace(/\/$/, ''),
  email: process.env.GUIDE_ADMIN_EMAIL || 'admin@monomi.id',
  password: process.env.GUIDE_ADMIN_PASSWORD || 'password123',
  // Console log of the local backend. The dev mailer prints the portal's
  // 6-digit login code there ("Portal login code for <email>: 123456").
  backendLog: process.env.GUIDE_BACKEND_LOG || '',
  dbUrl: process.env.GUIDE_DATABASE_URL || 'postgresql://invoiceuser:devpassword@localhost:5438/invoices',
};

/** Every row created by the capture carries this marker, so cleanup can find it. */
export const DEMO = '(Demo)';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Set by capture.mjs --record: slower smooth scrolling (see lib-record.mjs). */
export const mode = { record: false };

/* ------------------------------------------------------------------ */
/*  API                                                                */
/* ------------------------------------------------------------------ */

let token = null;
export async function login() {
  const r = await fetch(`${cfg.apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: cfg.email, password: cfg.password }),
  });
  if (!r.ok) throw new Error(`login failed: ${r.status} ${await r.text()}`);
  const j = await r.json();
  const d = j.data ?? j;
  token = d.access_token ?? d.accessToken;
  if (!token) throw new Error('login returned no token');
  return token;
}

export async function api(method, urlPath, body, form, { soft = false } = {}) {
  if (!token) await login();
  const headers = { authorization: `Bearer ${token}` };
  let payload;
  if (form) payload = form;
  else if (body !== undefined && body !== null) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const r = await fetch(cfg.apiUrl + urlPath, { method, headers, body: payload });
  const text = await r.text();
  let j;
  try { j = JSON.parse(text); } catch { j = text; }
  if (!r.ok) {
    if (soft) return null;
    throw new Error(`${method} ${urlPath} -> ${r.status} ${String(text).slice(0, Number(process.env.GUIDE_ERR_LEN || 300))}`);
  }
  return j && typeof j === 'object' && 'data' in j ? j.data : j;
}

/* ------------------------------------------------------------------ */
/*  Placeholder media (the capture never touches real storage)         */
/* ------------------------------------------------------------------ */

const PALETTES = [
  ['#451a03', '#f59e0b'], ['#78350f', '#fde68a'], ['#292524', '#fb923c'], ['#422006', '#fbbf24'],
  ['#0f172a', '#ec4899'], ['#1e1b4b', '#22d3ee'], ['#3b0764', '#f59e0b'], ['#064e3b', '#34d399'],
];

/** Gradient JPEG with a short label, sized w x h. */
export async function placeholderImage(w, h, label, seed = 0) {
  const [c1, c2] = PALETTES[Math.abs(seed) % PALETTES.length];
  const fs1 = Math.round(Math.min(w, h) / 9);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <circle cx="${w * 0.72}" cy="${h * 0.3}" r="${Math.min(w, h) * 0.18}" fill="#ffffff" fill-opacity="0.14"/>
  <text x="50%" y="52%" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="${fs1}" fill="#fff">${escapeXml(label)}</text>
  <text x="50%" y="${52 + 9}%" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.round(fs1 / 2.4)}" fill="#fff" fill-opacity="0.8">Contoh (Demo)</text>
</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 70 }).toBuffer();
}

function escapeXml(s) {
  return String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);
}

/**
 * Serve placeholders for every media request so the browser never reaches a
 * real bucket or CDN. Dimensions are read from `..._1080x1350.jpg` style names.
 */
export async function installMediaStub(context) {
  const hosts = /(media-demo\.invalid|dev-not-used\.r2\.cloudflarestorage\.com|r2\.cloudflarestorage\.com|media\.monomiagency\.com|r2\.dev|fbcdn\.net)/i;
  // The staff app also reads media through the backend proxy (/api/v1/media/view/<key>),
  // which would in turn call storage; answer those in the browser as well.
  const proxied = /\/api\/v1\/media\/(view|thumbnail|thumb|stream|download-url|public)/;
  await context.route((u) => hosts.test(u.hostname) || proxied.test(u.pathname), async (route) => {
    const url = route.request().url();
    const m = url.match(/_(\d{2,4})x(\d{2,4})/);
    const w = m ? Math.min(Number(m[1]), 900) : 800;
    const h = m ? Math.round((Number(m[2]) * w) / Number(m[1])) : 600;
    const name = decodeURIComponent(url.split('?')[0].split('/').pop() || '').replace(/\.[a-z0-9]+(\?.*)?$/i, '');
    if (/\.(mp4|mov|webm)(\?|$)/i.test(url)) return route.fulfill({ status: 204, body: '' });
    const label = (name.split('_')[0] || 'Konten').replace(/[-]+/g, ' ').slice(0, 22);
    const body = await placeholderImage(w, h, label, hashCode(name));
    return route.fulfill({ status: 200, contentType: 'image/jpeg', body, headers: { 'cache-control': 'max-age=60' } });
  });
}

function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/* ------------------------------------------------------------------ */
/*  Screenshot + highlight                                             */
/* ------------------------------------------------------------------ */

const manifest = {};

export function loadManifest() {
  try {
    const src = fs.readFileSync(MANIFEST_TS, 'utf8');
    const m = src.match(/=\s*(\{[\s\S]*?\});/);
    if (m) Object.assign(manifest, JSON.parse(m[1]));
  } catch { /* first run */ }
}

export function saveManifest() {
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  const body = `/* GENERATED by frontend/scripts/guides/capture.mjs - do not edit by hand. */\nexport const guideImageManifest: Partial<Record<string, { w: number; h: number }>> = ${JSON.stringify(sorted, null, 2)};\n`;
  fs.mkdirSync(path.dirname(MANIFEST_TS), { recursive: true });
  fs.writeFileSync(MANIFEST_TS, body.replace(/\r\n/g, '\n'));
}

/**
 * Outline each target and pin a numbered badge to its corner. Targets are
 * Playwright locators; coordinates are computed right now (viewport space)
 * and drawn as position:fixed, so call `screenshot` straight afterwards.
 */
export async function highlight(page, targets) {
  // Phase 1: bring the first target (or the ones flagged `scroll: true`) into view.
  for (let i = 0; i < targets.length; i += 1) {
    const t = targets[i];
    await t.locator.first().waitFor({ state: 'visible', timeout: 8000 });
    if (t.scroll === true || (i === 0 && t.scroll !== false)) await t.locator.first().scrollIntoViewIfNeeded().catch(() => {});
  }
  await sleep(120);
  // Phase 2: measure everything in the final scroll position.
  const boxes = [];
  for (let i = 0; i < targets.length; i += 1) {
    const t = targets[i];
    boxes.push({ n: t.n ?? i + 1, pad: t.pad ?? 6, badge: t.badge ?? 'tl', box: await t.locator.first().boundingBox() });
  }
  await page.evaluate((items) => {
    document.getElementById('__guide_hl')?.remove();
    const root = document.createElement('div');
    root.id = '__guide_hl';
    root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647';
    for (const it of items) {
      if (!it.box) continue;
      const { x, y, width, height } = it.box;
      const frame = document.createElement('div');
      frame.style.cssText = `position:fixed;left:${x - it.pad}px;top:${y - it.pad}px;width:${width + it.pad * 2}px;height:${height + it.pad * 2}px;border:3px solid #ff8a00;border-radius:10px;box-shadow:0 0 0 2px rgba(0,0,0,.35),0 0 18px rgba(255,138,0,.55)`;
      const badge = document.createElement('div');
      badge.textContent = String(it.n);
      const bx = it.badge.includes('r') ? x + width + it.pad - 14 : x - it.pad - 14;
      const by = it.badge.includes('b') ? y + height + it.pad - 14 : y - it.pad - 14;
      badge.style.cssText = `position:fixed;left:${Math.max(2, bx)}px;top:${Math.max(2, by)}px;width:28px;height:28px;border-radius:50%;background:#ff8a00;color:#1a1100;font:700 15px/28px system-ui,sans-serif;text-align:center;box-shadow:0 0 0 2px #1a1100,0 2px 8px rgba(0,0,0,.5)`;
      root.append(frame, badge);
    }
    document.body.append(root);
  }, boxes);
  return boxes;
}

/** Put `locator` `offset` px below the top of the viewport (window scroll). */
export async function scrollTo(locator, offset = 110) {
  await locator.first().evaluate((el, off) => {
    // The app shell scrolls inside <main>, not the window: find the real scroller.
    let p = el.parentElement;
    while (p && !(p.scrollHeight > p.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(p).overflowY))) p = p.parentElement;
    const base = p ? p.getBoundingClientRect().top : 0;
    const delta = el.getBoundingClientRect().top - base - off;
    const behavior = window.__guideSmooth ? 'smooth' : 'auto';
    if (p) p.scrollBy({ top: delta, behavior }); else window.scrollBy({ top: delta, behavior });
  }, offset);
  await sleep(mode.record ? 900 : 300);
}

export async function clearHighlight(page) {
  await page.evaluate(() => document.getElementById('__guide_hl')?.remove());
}

/**
 * Take a screenshot and save it as optimised WebP under
 * public/guides/<slug>/<name>.webp. `id` is "<slug>/<name>".
 */
export async function shot(page, id, { highlights = [], fullPage = false, quality = 72, keepToasts = false } = {}) {
  // Toasts are transient noise in a guide, unless the step is about one.
  await page.evaluate((hide) => {
    let st = document.getElementById('__guide_notoast');
    if (!hide) { st?.remove(); return; }
    if (!st) {
      st = document.createElement('style');
      st.id = '__guide_notoast';
      st.textContent = '[data-sonner-toaster],.ant-message,.ant-notification{display:none!important}';
      document.head.append(st);
    }
  }, !keepToasts);
  if (highlights.length > 0) await highlight(page, highlights);
  await sleep(150);
  const png = await page.screenshot({ type: 'png', fullPage });
  await clearHighlight(page);
  const out = path.join(PUBLIC_GUIDES, `${id}.webp`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const info = await sharp(png).webp({ quality, effort: 5, smartSubsample: true }).toFile(out);
  manifest[id] = { w: info.width, h: info.height };
  console.log(`  shot ${id}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
  return info;
}

/* ------------------------------------------------------------------ */
/*  Portal login code                                                  */
/* ------------------------------------------------------------------ */

export function readLogLength() {
  try { return fs.statSync(cfg.backendLog).size; } catch { return 0; }
}

export async function waitForPortalCode(email, fromByte) {
  if (!cfg.backendLog) throw new Error('Set GUIDE_BACKEND_LOG to the backend console log to read portal codes');
  for (let i = 0; i < 40; i += 1) {
    await sleep(500);
    const buf = fs.readFileSync(cfg.backendLog);
    const txt = buf.subarray(Math.min(fromByte, buf.length)).toString('utf8');
    const re = new RegExp(`Portal login code for ${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: (\\d{6})`, 'g');
    const all = [...txt.matchAll(re)];
    if (all.length > 0) return all[all.length - 1][1];
  }
  throw new Error(`no portal code found in ${cfg.backendLog}`);
}
