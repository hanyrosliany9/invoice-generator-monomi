/**
 * Guides: pintasan-keyboard (staff) and pintasan-klien (client portal).
 * Screenshots: the "?" overlay, the lightbox with a key tooltip, the deck
 * editor's shortcuts dialog and the presentation hint. The tables themselves
 * are rendered from src/shortcuts/registry.ts, so they are not captured.
 */
import { cfg, readLogLength, waitForPortalCode } from '../lib.mjs';
import { PORTAL_EMAIL } from '../seed.mjs';

const H = (loc, o = {}) => ({ locator: loc, ...o });

export async function run(ctx) {
  const { ids, go, shot, sleep } = ctx;

  // ---- staff: ? overlay on the dashboard + lightbox ----------------------------------------
  const { page } = await ctx.staff({ w: 1280, h: 800 });
  let S = 'pintasan-keyboard';
  await go(page, '/', 2500);
  await page.keyboard.press('?');
  await sleep(700);
  await shot(page, `${S}/bantuan`, {
    highlights: [
      H(page.getByPlaceholder(/Cari berdasarkan aksi/), { n: 1, scroll: false }),
      H(page.getByRole('link', { name: /Lihat semua pintasan/ }), { n: 2, scroll: false, badge: 'tr' }),
    ],
  });
  await page.keyboard.press('Escape');
  await sleep(300);

  await go(page, `/media-collab/projects/${ids.mediaProject}`, 3000);
  await page.locator('img').nth(2).click({ force: true });
  await sleep(1500);
  const zoomIn = page.getByRole('button', { name: 'Perbesar', exact: true });
  await zoomIn.hover();
  await sleep(900); // tooltip delay
  await shot(page, `${S}/media`, {
    highlights: [H(zoomIn, { n: 1, scroll: false, pad: 6 })],
  });
  await page.keyboard.press('Escape');
  await sleep(300);

  // ---- staff: deck editor shortcuts dialog + presentation hint (wide, like the deck guide) -------
  await page.close();
  const wide = await ctx.staff({ w: 1600, h: 900 });
  const dp = wide.page;
  await go(dp, `/decks/${ids.deck}`, 3500);
  const helpBtn = dp.getByRole('button', { name: '?', exact: true });
  await helpBtn.click();
  await sleep(900);
  await shot(dp, `${S}/deck`, {
    highlights: [H(dp.getByRole('dialog').first(), { n: 1, scroll: false, pad: 4 })],
  });
  await dp.keyboard.press('Escape');
  await sleep(500);

  await dp.getByRole('button', { name: /Presentasi/ }).first().click();
  await sleep(900);
  await dp.mouse.move(800, 780);
  await sleep(500);
  const hint = dp.getByRole('button', { name: /Tekan\s*\?\s*untuk pintasan/ });
  await shot(dp, `${S}/presentasi`, {
    highlights: [H(hint, { n: 1, scroll: false, pad: 8 })],
  });
  await dp.keyboard.press('Escape');
  await dp.close();

  // ---- client portal ---------------------------------------------------------------------------------
  S = 'pintasan-klien';
  const base = `${cfg.appUrl}/portal`;
  const { page: pp } = await ctx.anon({ w: 1280, h: 800, dsf: 1, mobile: false });
  await pp.goto(`${base}/login`);
  await sleep(1200);
  const at = readLogLength();
  await pp.fill('#portal-email', PORTAL_EMAIL);
  await pp.click('button[type=submit]');
  await pp.waitForSelector('#portal-code');
  const code = await waitForPortalCode(PORTAL_EMAIL, at);
  await pp.fill('#portal-code', code);
  await pp.getByText('Kopi Senja (Demo)').first().waitFor({ timeout: 20000 });
  await sleep(800);
  await pp.goto(`${base}/c/${ids.client}/media/${ids.mediaProject}`);
  await sleep(3500);
  await pp.keyboard.press('?');
  await sleep(700);
  await shot(pp, `${S}/bantuan`, {
    highlights: [
      H(pp.getByRole('heading', { name: 'Penampil foto (lightbox)' }), { n: 1, scroll: false, pad: 6 }),
      H(pp.getByRole('link', { name: /Lihat semua pintasan/ }), { n: 2, scroll: false, badge: 'tr' }),
    ],
  });
  await pp.keyboard.press('Escape');
  await sleep(300);
  await pp.locator('img').nth(2).click();
  await sleep(1500);
  const pz = pp.getByRole('button', { name: 'Perbesar', exact: true });
  await pz.hover();
  await sleep(900);
  await shot(pp, `${S}/foto`, {
    highlights: [H(pz, { n: 1, scroll: false, pad: 6 })],
  });
  await pp.close();
}
