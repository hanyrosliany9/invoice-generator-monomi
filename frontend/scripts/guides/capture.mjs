/**
 * Re-runnable screenshot capture for the in-app guides (Panduan / Bantuan).
 *
 *   node capture.mjs                  all guides
 *   node capture.mjs report planner   only the named flows (see ./flows)
 *   node capture.mjs --clean-only     just remove leftover demo data
 *   node capture.mjs --keep           do not clean up at the end (debugging)
 *   node capture.mjs --record sales   record videos instead of screenshots (then: node build-videos.mjs)
 *
 * Needs a running local stack; see README.md for the environment variables.
 * Seeds "(Demo)" data through the staff API, drives the real UI with
 * Playwright, outlines the relevant element with a numbered badge, saves the
 * shot as WebP under public/guides/<slug>/ and finally deletes the demo data.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import {
  api, cfg, installMediaStub, loadManifest, saveManifest, shot, sleep, PUBLIC_GUIDES, login, mode,
} from './lib.mjs';
import {
  cursorInitScript, flushTimeline, markGo, markReady, patchPlaywright, recShot, registerPage, OUT as VIDEO_OUT, RAW_DIR,
} from './lib-record.mjs';
import { seed } from './seed.mjs';
import { seedCrm, seedPublishing } from './seed-crm.mjs';
import { cleanup, countRemaining, STATE_FILE } from './cleanup.mjs';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const only = args.filter((a) => !a.startsWith('--'));
// --record: same flows, but recorded to video at human pace (README: "Videos"). No images are written.
const RECORD = flags.has('--record');
mode.record = RECORD;

const FLOWS = [
  'report', 'planner', 'client-portal', 'media', 'portal',
  'sales', 'finance', 'production', 'tools', 'shortcuts',
  // CRM / WhatsApp / auto-publishing: standalone flows (own demo data, see seed-crm.mjs)
  'crm', 'crm-inbox', 'crm-publish', 'crm-setup',
  // Instagram, manual invoice, settings, CRM settings, calendars, reports/milestones, advanced accounting
  'instagram', 'invoice-manual', 'settings', 'crm-settings', 'calendar', 'reports-misc', 'accounting-adv',
];

// Login is rate-limited (5 per minute), so sign in through the UI once and
// reuse that session (cookies + localStorage) for every later browser context.
let staffSession = null;

async function newBrowserContext(browser, { w, h, dsf = 1, mobile = false, storageState, record = RECORD }) {
  const context = await browser.newContext({
    storageState,
    ...(record ? { recordVideo: { dir: RAW_DIR, size: { width: w, height: h } } } : {}),
    viewport: { width: w, height: h },
    deviceScaleFactor: dsf,
    hasTouch: mobile,
    isMobile: mobile,
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    serviceWorkers: 'block', // the PWA worker would bypass the media stub
  });
  context.setDefaultTimeout(25000);
  await context.addInitScript(() => {
    try { localStorage.setItem('monomi.lang', 'id'); localStorage.setItem('monomi.portal.lang', 'id'); } catch { /* ignore */ }
  });
  await installMediaStub(context);
  if (record) await context.addInitScript(cursorInitScript, { mobile });
  return context;
}

/**
 * Signs in through the real login form and returns the session (storageState).
 *
 * This used to run inside the recorded page. In record mode the e-mail is typed one character at a
 * time (about 1.5 s) and a Vite dev server that is still optimising dependencies (cold start) or a
 * remount of the lazily loaded login page throws the typed text away: the e-mail came out empty and
 * the submit never left /login. Now the sign-in happens in a plain, unrecorded context (the login
 * frames are never part of a video anyway), waits for the page to settle, and checks that both
 * fields really hold their values right before submitting; it retries (and backs off on the 5 per
 * minute login limit) instead of failing on the first glitch.
 */
async function signInOnce(browser) {
  const context = await newBrowserContext(browser, { w: 1280, h: 760, record: false });
  const page = await context.newPage();
  try {
    let lastProblem = 'unknown';
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await page.goto(`${cfg.appUrl}/login`, { waitUntil: 'networkidle' }).catch(() => {});
      await page.locator('#email').waitFor({ state: 'visible', timeout: 30000 });
      await sleep(1200 * attempt); // let a cold dev server finish optimising / reloading
      await page.locator('#email').fill(cfg.email);
      await page.locator('#password').fill(cfg.password);
      const [em, pw] = await Promise.all([page.locator('#email').inputValue(), page.locator('#password').inputValue()]);
      if (em !== cfg.email || pw !== cfg.password) {
        lastProblem = `form lost its text (email ${em === '' ? 'empty' : 'ok'}, password ${pw === '' ? 'empty' : 'ok'})`;
        console.log(`  login attempt ${attempt}: ${lastProblem}, retrying`);
        continue;
      }
      await page.locator('button[type=submit]').click();
      try {
        await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 });
        await sleep(1500);
        return await context.storageState();
      } catch {
        const text = ((await page.locator('body').innerText().catch(() => '')) || '').toLowerCase();
        lastProblem = /terlalu banyak|too many/.test(text) ? 'rate limited' : 'still on /login after submit';
        console.log(`  login attempt ${attempt}: ${lastProblem}`);
        if (lastProblem === 'rate limited') await sleep(65000);
      }
    }
    throw new Error(`could not sign in through the UI: ${lastProblem}`);
  } finally {
    await context.close().catch(() => {});
  }
}

async function main() {
  if (flags.has('--clean-only')) {
    await cleanup();
    console.log('remaining demo rows:', await countRemaining());
    return;
  }

  await login();
  loadManifest();

  // --reuse: keep the data of a previous `--keep` run (ids read from GUIDE_IDS_OUT); handy while writing a flow.
  const reuse = flags.has('--reuse') && process.env.GUIDE_IDS_OUT && fs.existsSync(process.env.GUIDE_IDS_OUT);
  // Start from a clean slate (also recovers from an earlier failed run).
  if (!reuse) await cleanup({ quiet: true });

  const browser = await chromium.launch();
  let ids;
  try {
    const wantedNames = only.length > 0 ? FLOWS.filter((f) => only.includes(f)) : FLOWS.filter((f) => fs.existsSync(new URL(`./flows/${f}.mjs`, import.meta.url)));
    const mods = await Promise.all(wantedNames.map((f) => import(`./flows/${f}.mjs`)));
    // Standalone flows (crm*) bring their own demo data and do not need the base seed.
    const standalone = mods.length > 0 && mods.every((m) => m.standalone === true);
    if (reuse) ids = JSON.parse(fs.readFileSync(process.env.GUIDE_IDS_OUT, 'utf8'));
    else if (standalone) {
      ids = {};
      if (mods.some((m) => (m.needs ?? []).includes('crm'))) Object.assign(ids, await seedCrm());
      if (mods.some((m) => (m.needs ?? []).includes('publishing'))) await seedPublishing(ids);
    } else {
      ids = await seed();
      if (mods.some((m) => (m.needs ?? []).includes('crm'))) Object.assign(ids, await seedCrm());
      if (mods.some((m) => (m.needs ?? []).includes('publishing'))) await seedPublishing(ids);
    }
    if (process.env.GUIDE_IDS_OUT && !reuse) fs.writeFileSync(process.env.GUIDE_IDS_OUT, JSON.stringify(ids, null, 1));
    const openPages = [];
    const track = (page, { w, h, mobile }) => {
      if (!RECORD) return;
      patchPlaywright(page);
      registerPage(page, { w, h, mobile });
    };
    const ctx = {
      ids,
      browser,
      cfg,
      api,
      sleep,
      shot: RECORD ? recShot : shot,
      go: async (page, p, wait = 800) => {
        await page.goto(cfg.appUrl + p, { waitUntil: 'networkidle' }).catch(() => {});
        await sleep(wait);
        if (RECORD) markGo(page);
      },
      /** Signed-in staff browser context. Desktop 1280 wide by default. */
      async staff({ w = 1280, h = 760, dsf = 1, mobile = false } = {}) {
        staffSession ??= await signInOnce(browser);
        const context = await newBrowserContext(browser, { w, h, dsf, mobile, storageState: staffSession });
        const page = await context.newPage();
        openPages.push(page);
        track(page, { w, h, mobile });
        await page.goto(`${cfg.appUrl}/`, { waitUntil: 'domcontentloaded' });
        if (RECORD) markReady(page);
        return { context, page };
      },
      /** Anonymous browser context (portal, public links). */
      async anon({ w = 390, h = 844, dsf = 2, mobile = true } = {}) {
        const context = await newBrowserContext(browser, { w, h, dsf, mobile });
        const page = await context.newPage();
        page.on('pageerror', (e) => console.log('  [pageerror]', String(e.message).slice(0, 300)));
        page.on('console', async (m) => {
          if (m.type() !== 'error' || m.text().startsWith('Failed to load resource')) return;
          const extra = await Promise.all(m.args().map((a) => a.evaluate((v) => (v && (v.componentStack || v.stack)) || '').catch(() => '')));
          console.log('  [console]', m.text().slice(0, 300), extra.join(' ').slice(0, 900));
        });
        openPages.push(page);
        track(page, { w, h, mobile });
        return { context, page };
      },
    };

    const wanted = only.length > 0 ? FLOWS.filter((f) => only.includes(f)) : FLOWS.filter((f) => fs.existsSync(new URL(`./flows/${f}.mjs`, import.meta.url)));
    for (const name of wanted) {
      console.log(`\n== ${name}`);
      const flow = await import(`./flows/${name}.mjs`);
      try {
        await flow.run(ctx);
      } catch (e) {
        // Leave a picture of where it stopped (set GUIDE_DEBUG_DIR to enable).
        if (process.env.GUIDE_DEBUG_DIR) {
          for (const [i, pg] of openPages.entries()) {
            await pg.screenshot({ path: path.join(process.env.GUIDE_DEBUG_DIR, `fail-${name}-${i}.png`) }).catch(() => {});
          }
        }
        throw e;
      } finally {
        for (const pg of openPages.splice(0)) await pg.context().close().catch(() => {});
        if (RECORD) {
          const t = await flushTimeline(name);
          console.log(`  timeline: ${t.steps.length} steps, ${t.pages.length} page recording(s)`);
        }
      }
    }
    if (!RECORD) saveManifest();
  } finally {
    await browser.close().catch(() => {});
    if (!flags.has('--keep')) {
      await cleanup();
      console.log('remaining demo rows:', await countRemaining());
    }
    if (fs.existsSync(STATE_FILE) && !flags.has('--keep')) fs.unlinkSync(STATE_FILE);
  }

  if (RECORD) {
    console.log(`
raw recordings + timelines in ${path.relative(process.cwd(), VIDEO_OUT)}; next: node build-videos.mjs`);
    return;
  }
  const total = dirSize(PUBLIC_GUIDES);
  console.log(`\nimages: ${(total / 1024).toFixed(0)} KB in ${path.relative(process.cwd(), PUBLIC_GUIDES)}`);
}

function dirSize(dir) {
  let n = 0;
  for (const e of fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : []) {
    const p = path.join(dir, e.name);
    n += e.isDirectory() ? dirSize(p) : fs.statSync(p).size;
  }
  return n;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
