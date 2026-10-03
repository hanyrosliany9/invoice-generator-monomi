/**
 * Record mode for the guide capture (`node capture.mjs --record <flows>`).
 * The same flows run as for screenshots, but every browser page is recorded to
 * video and the flow is slowed down to human pace:
 *  - a fake cursor glides to each element before it is clicked,
 *  - text is typed character by character,
 *  - every `shot()` becomes a "step": the highlight + numbered badge stay on
 *    screen for a few seconds (long enough to read, and to narrate).
 * Step start/end times (ms, wall clock) are written to out/videos/timeline/<flow>.json;
 * build-videos.mjs cuts and encodes the final MP4s from them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { HERE, sleep, highlight, clearHighlight } from './lib.mjs';
import { narrationSeconds } from './guide-data.mjs';

export const OUT = path.join(HERE, 'out', 'videos');
export const RAW_DIR = path.join(OUT, 'raw');
export const TIMELINE_DIR = path.join(OUT, 'timeline');

const HOLD_MIN = Number(process.env.GUIDE_HOLD_MIN || 2800);
const HOLD_MAX = Number(process.env.GUIDE_HOLD_MAX || 9000);

const reg = { pages: [], steps: [], counter: 0 };
const stateOf = (page) => reg.pages.find((p) => p.page === page);

/* ---------------- fake cursor (runs in every page) ---------------- */

/** Init script: draws an arrow (finger on phones) that follows the real mouse with a glide, plus a click ripple. */
export function cursorInitScript({ mobile }) {
  const boot = () => {
    if (window.__guideCursor || !document.documentElement) return;
    window.__guideCursor = true;
    window.__guideSmooth = true;
    const el = document.createElement('div');
    el.id = '__guide_cursor';
    const size = mobile ? 40 : 28;
    el.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;display:none;will-change:transform;transition:transform 600ms cubic-bezier(.25,.8,.3,1)';
    el.innerHTML = mobile
      ? `<div style="width:${size}px;height:${size}px;margin:-${size / 2}px 0 0 -${size / 2}px;border-radius:50%;background:rgba(255,255,255,.55);border:3px solid #ff8a00;box-shadow:0 2px 10px rgba(0,0,0,.45)"></div>`
      : `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.55))"><path d="M4 2l15 9-6.5 1.6L9.6 19z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    const place = (x, y, animate) => {
      el.style.transitionDuration = animate ? `${window.__gcDur ?? 120}ms` : '0ms';
      el.style.transform = `translate(${x}px,${y}px)`;
      el.style.display = 'block';
      try { sessionStorage.setItem('__gc', `${x},${y}`); } catch { /* ignore */ }
    };
    let first = true;
    try {
      const saved = sessionStorage.getItem('__gc');
      if (saved) { const [x, y] = saved.split(',').map(Number); place(x, y, false); first = false; }
    } catch { /* ignore */ }
    addEventListener('mousemove', (e) => { place(e.clientX, e.clientY, !first); first = false; }, true);
    addEventListener('mousedown', (e) => {
      const r = document.createElement('div');
      r.style.cssText = `position:fixed;left:${e.clientX - 22}px;top:${e.clientY - 22}px;width:44px;height:44px;border-radius:50%;border:4px solid #ff8a00;pointer-events:none;z-index:2147483646`;
      document.documentElement.append(r);
      r.animate([{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 550, easing: 'ease-out' }).onfinish = () => r.remove();
    }, true);
    document.documentElement.append(el);
  };
  boot();
  addEventListener('DOMContentLoaded', boot);
}

/* ---------------- patching Playwright to behave like a person ---------------- */

async function glide(page, x, y) {
  const st = stateOf(page);
  const prev = st?.cursor ?? { x: 0, y: 0 };
  const dist = Math.hypot(x - prev.x, y - prev.y);
  const ms = Math.round(Math.min(900, Math.max(280, dist * 1.1)));
  await page.evaluate((d) => { window.__gcDur = d; }, ms).catch(() => {});
  await page.mouse.move(x, y);
  if (st) st.cursor = { x, y };
  await sleep(ms + 80);
  await page.evaluate(() => { window.__gcDur = 120; }).catch(() => {});
}

async function approach(loc) {
  const page = loc.page();
  await loc.scrollIntoViewIfNeeded({ timeout: 8000 });
  const box = await loc.boundingBox({ timeout: 3000 });
  if (!box) return;
  const vp = page.viewportSize() ?? { width: 1280, height: 800 };
  const x = Math.min(vp.width - 4, Math.max(4, box.x + Math.min(box.width / 2, 120)));
  const y = Math.min(vp.height - 4, Math.max(4, box.y + box.height / 2));
  await glide(page, x, y);
}

const UNTYPABLE = new Set(['date', 'datetime-local', 'time', 'month', 'week', 'color', 'range', 'file', 'checkbox', 'radio']);

let patched = false;
export function patchPlaywright(page) {
  if (patched) return;
  patched = true;
  const PageP = Object.getPrototypeOf(page);
  const LocP = Object.getPrototypeOf(page.locator('body'));
  const KbP = Object.getPrototypeOf(page.keyboard);
  const o = { click: LocP.click, fill: LocP.fill, goto: PageP.goto, press: KbP.press };

  LocP.click = async function click(opts) {
    await approach(this).catch(() => {});
    const r = await o.click.call(this, opts);
    await sleep(450);
    return r;
  };

  LocP.fill = async function fill(value, opts) {
    if (typeof value !== 'string' || value === '') return o.fill.call(this, value, opts);
    const info = await this.evaluate((el) => ({ tag: el.tagName, type: el.type, ro: el.readOnly || el.disabled })).catch(() => null);
    const typable = info && !info.ro && (info.tag === 'TEXTAREA' || (info.tag === 'INPUT' && !UNTYPABLE.has(info.type)));
    if (!typable) return o.fill.call(this, value, opts);
    try {
      await approach(this).catch(() => {});
      await o.click.call(this, { timeout: 5000 });
      await o.fill.call(this, '', opts);
      const head = value.slice(0, 90);
      await this.pressSequentially(head, { delay: Math.round(Math.min(75, Math.max(22, 2400 / head.length))) });
    } catch { /* fall through: the real fill below sets the final value */ }
    // The real fill is authoritative (masks, formatting); skip it if typing already produced the value
    // or the page moved on (a code field that submits on the last digit).
    const cur = await this.inputValue({ timeout: 1500 }).catch(() => null);
    if (cur !== null && cur !== value) await o.fill.call(this, value, opts).catch((e) => { if (cur === '') throw e; });
    await sleep(350);
  };

  PageP.click = function click(selector, opts) { return this.locator(selector).click(opts); };
  PageP.fill = function fill(selector, value, opts) { return this.locator(selector).fill(value, opts); };

  PageP.goto = async function goto(url, opts) {
    const r = await o.goto.call(this, url, opts);
    const st = stateOf(this);
    if (st) st.lastGoEnd = Date.now();
    return r;
  };

  KbP.press = async function press(key, opts) {
    await sleep(350);
    const r = await o.press.call(this, key, opts);
    await sleep(450);
    return r;
  };
}

/* ---------------- page registry ---------------- */

export function registerPage(page, { w, h, mobile }) {
  const st = {
    index: reg.counter++, page, w, h, mobile,
    t0: Date.now(), tClose: null, ready: Date.now(), lastGoEnd: 0, lastEnd: 0, cursor: null, video: page.video(),
  };
  reg.pages.push(st);
  page.on('close', () => { st.tClose = Date.now(); });
  return st;
}

/** Call once the page shows the app (after sign-in): earlier frames are never used. */
export function markReady(page) {
  const st = stateOf(page);
  if (st) st.ready = Date.now();
}

/** Called by ctx.go (flows that use page.goto directly are covered by the goto patch). */
export function markGo(page) {
  const st = stateOf(page);
  if (st) st.lastGoEnd = Date.now();
}

/* ---------------- one step = one shot() ---------------- */

export async function recShot(page, id, { highlights = [], keepToasts = false } = {}) {
  const [slug, stepId] = id.split('/');
  const st = stateOf(page);
  await page.evaluate((hide) => {
    let s = document.getElementById('__guide_notoast');
    if (!hide) { s?.remove(); return; }
    if (!s) {
      s = document.createElement('style');
      s.id = '__guide_notoast';
      s.textContent = '[data-sonner-toaster],.ant-message,.ant-notification{display:none!important}';
      document.head.append(s);
    }
  }, !keepToasts);

  const prev = [...reg.steps].reverse().find((s) => s.guide === slug);
  const start = prev && prev.page === st.index ? prev.end : Math.max(st.lastGoEnd, st.lastEnd, st.ready);
  const n = reg.steps.filter((s) => s.guide === slug).length + 1;

  let boxes = [];
  if (highlights.length > 0) boxes = await highlight(page, highlights);
  await page.evaluate((num) => {
    let c = document.getElementById('__guide_chip');
    if (!c) {
      c = document.createElement('div');
      c.id = '__guide_chip';
      c.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:2147483645;pointer-events:none;padding:5px 12px;border-radius:999px;background:rgba(20,14,4,.88);color:#ffd9a0;font:600 13px/1.2 system-ui,sans-serif;letter-spacing:.02em;box-shadow:0 0 0 1px rgba(255,138,0,.55)';
      document.documentElement.append(c);
    }
    c.textContent = `Langkah ${num}`;
  }, n);

  // Point at each highlighted element in turn while the highlight stays on screen.
  const narr = Math.max(narrationSeconds(slug, stepId, 'id'), narrationSeconds(slug, stepId, 'en')) * 1000 + 900;
  const shownAfter = Date.now() - start;
  const hold = Math.round(Math.min(HOLD_MAX, Math.max(HOLD_MIN, narr - shownAfter)));
  const points = boxes.filter((b) => b.box).slice(0, 3);
  const t0 = Date.now();
  const vp = page.viewportSize() ?? { width: 1280, height: 800 };
  for (const [i, b] of points.entries()) {
    await glide(page, Math.min(vp.width - 6, Math.max(6, b.box.x + Math.min(b.box.width * 0.5, 160))), Math.min(vp.height - 6, Math.max(6, b.box.y + b.box.height / 2)));
    const left = t0 + ((i + 1) * hold) / Math.max(1, points.length) - Date.now();
    if (left > 0) await sleep(left);
  }
  const rest = t0 + hold - Date.now();
  if (rest > 0) await sleep(rest);

  const end = Date.now();
  await clearHighlight(page);
  await page.evaluate(() => document.getElementById('__guide_chip')?.remove());
  st.lastEnd = end;
  reg.steps.push({ guide: slug, step: stepId, page: st.index, start, end });
  console.log(`  step ${id}  ${((end - start) / 1000).toFixed(1)}s`);
}

/** After the flow's contexts are closed: resolve the video files and write the timeline. */
export async function flushTimeline(flow) {
  fs.mkdirSync(TIMELINE_DIR, { recursive: true });
  const pages = [];
  for (const p of reg.pages) {
    let file = null;
    try { file = p.video ? await p.video.path() : null; } catch { /* no video */ }
    if (file && fs.existsSync(file)) {
      fs.mkdirSync(RAW_DIR, { recursive: true });
      const dest = path.join(RAW_DIR, `${flow}-p${p.index}.webm`);
      fs.copyFileSync(file, dest);
      try { fs.unlinkSync(file); } catch { /* ignore */ }
      file = dest;
    }
    pages.push({ index: p.index, video: file ? path.relative(OUT, file).replace(/\\/g, '/') : null, w: p.w, h: p.h, mobile: p.mobile, t0: p.t0, tClose: p.tClose });
  }
  const used = new Set(reg.steps.map((s) => s.page));
  const out = { flow, pages: pages.filter((p) => used.has(p.index)), steps: reg.steps };
  fs.writeFileSync(path.join(TIMELINE_DIR, `${flow}.json`), JSON.stringify(out, null, 1));
  // drop the unused page recordings (login pages and the like)
  for (const p of pages) if (!used.has(p.index) && p.video) { try { fs.unlinkSync(path.join(OUT, p.video)); } catch { /* ignore */ } }
  reg.pages = [];
  reg.steps = [];
  reg.counter = 0;
  return out;
}
