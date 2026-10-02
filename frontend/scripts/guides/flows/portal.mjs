/**
 * Guides for the client portal ("Bantuan"): masuk-portal, membaca-laporan,
 * media-klien, deck-klien, rencana-konten-klien. Captured on a 390px phone
 * viewport at 2x. Also one desktop shot for the staff guide portal-klien.
 */
import { cfg, readLogLength, scrollTo, waitForPortalCode } from '../lib.mjs';
import { PORTAL_EMAIL } from '../seed.mjs';

async function typeEmailAndCode(page, sleep) {
  const at = readLogLength();
  await page.fill('#portal-email', PORTAL_EMAIL);
  await page.click('button[type=submit]');
  await page.waitForSelector('#portal-code');
  const code = await waitForPortalCode(PORTAL_EMAIL, at);
  return code;
}

export async function run(ctx) {
  const { ids, shot, sleep } = ctx;
  const H = (loc, o = {}) => ({ locator: loc, ...o });
  const base = `${cfg.appUrl}/portal`;
  const { page } = await ctx.anon({ w: 390, h: 844, dsf: 2, mobile: true });
  const g = (url, wait = 1800) => page.goto(base + url).then(() => sleep(wait));

  // ---- masuk-portal -------------------------------------------------------
  let S = 'masuk-portal';
  await g('/login', 1500);
  await page.fill('#portal-email', PORTAL_EMAIL);
  await shot(page, `${S}/email`, {
    highlights: [H(page.locator('#portal-email'), { n: 1 }), H(page.locator('button[type=submit]'), { n: 2, badge: 'tr' })],
  });
  const at = readLogLength();
  await page.click('button[type=submit]');
  await page.waitForSelector('#portal-code');
  const code = await waitForPortalCode(PORTAL_EMAIL, at);
  await page.fill('#portal-code', code.slice(0, 5)); // 6th digit would sign in straight away
  await sleep(300);
  await shot(page, `${S}/kode`, { highlights: [H(page.locator('#portal-code'), { n: 1 })] });
  await page.fill('#portal-code', code);
  await page.getByText('Kopi Senja (Demo)').first().waitFor({ timeout: 20000 });
  await sleep(800);
  await shot(page, `${S}/pilih-klien`, {
    highlights: [H(page.getByText('Kopi Senja (Demo)').first().locator('xpath=ancestor::a[1] | ancestor::button[1]'), { n: 1 })],
  });
  await g(`/c/${ids.client}/content`, 2500);
  await shot(page, `${S}/beranda`, {
    highlights: [H(page.getByRole('navigation').first(), { n: 1, pad: 4 }), H(page.getByRole('button', { name: /Ganti klien/ }), { n: 2, badge: 'br' })],
  });

  // ---- rencana-konten-klien -----------------------------------------------------
  S = 'rencana-konten-klien';
  await shot(page, `${S}/rencana`, {
    highlights: [H(page.getByText('Instagram', { exact: true }).first(), { n: 1, pad: 10 })],
  });
  await page.getByRole('button', { name: /Buka pratinjau Instagram/ }).click();
  await sleep(1500);
  await shot(page, `${S}/ponsel`, { highlights: [] });
  await page.keyboard.press('Escape');
  await sleep(300);

  // ---- membaca-laporan -------------------------------------------------------------
  S = 'membaca-laporan';
  await g(`/c/${ids.client}/reports`, 2000);
  await shot(page, `${S}/daftar`, { highlights: [H(page.getByText('Lihat laporan').first(), { n: 1, pad: 8 })] });
  await page.locator('a[href*="reports/"]').first().click();
  await sleep(3500);
  await shot(page, `${S}/ringkasan`, {
    highlights: [
      H(page.getByRole('button', { name: /Unduh PDF/ }), { n: 1 }),
      H(page.getByText('Ringkasan', { exact: true }).first(), { n: 2, scroll: false, pad: 8 }),
    ],
  });
  const chart = page.getByText('Tren Jangkauan').first();
  await scrollTo(chart, 140);
  await sleep(2000);
  await shot(page, `${S}/grafik`, { highlights: [H(chart.locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 1, scroll: false, pad: 4 })] });
  const table = page.getByText('Tabel Data').first();
  await scrollTo(table, 120);
  await sleep(500);
  await shot(page, `${S}/data`, { highlights: [H(table.locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 1, scroll: false, pad: 4 })] });

  // ---- media-klien -----------------------------------------------------------------------
  S = 'media-klien';
  await g(`/c/${ids.client}/media`, 2500);
  await shot(page, `${S}/daftar`, { highlights: [H(page.getByText('Hasil Foto Menu Baru (Demo)').first().locator('xpath=ancestor::a[1]'), { n: 1, pad: 4 })] });
  await g(`/c/${ids.client}/media/${ids.mediaProject}`, 3500);
  await shot(page, `${S}/galeri`, {
    highlights: [H(page.getByRole('button', { name: /Unduh Semua/ }), { n: 1, badge: 'tr' }), H(page.getByText('Semua', { exact: true }).first().locator('xpath=..'), { n: 2, pad: 4 })],
  });
  await page.locator('img').nth(2).click();
  await sleep(1500);
  await shot(page, `${S}/lightbox`, {
    highlights: [H(page.locator('button:has(svg.lucide-download)').last(), { n: 1, scroll: false, pad: 8 })],
  });
  const stars = page.getByText('RATING ASET', { exact: false }).first();
  await scrollTo(stars, 90).catch(() => {});
  await page.locator('button:has(svg.lucide-star)').nth(3).click();
  await page.getByPlaceholder(/Tulis masukan/).fill('Fotonya bagus sekali, tolong tambahkan versi hitam-putih.');
  await sleep(300);
  await shot(page, `${S}/rating`, {
    highlights: [
      H(page.locator('button:has(svg.lucide-star)').nth(3), { n: 1, scroll: false, pad: 6 }),
      H(page.getByPlaceholder(/Tulis masukan/), { n: 2, scroll: false }),
    ],
  });
  await page.keyboard.press('Escape');

  // ---- deck-klien --------------------------------------------------------------------------
  S = 'deck-klien';
  await g(`/c/${ids.client}/decks`, 2200);
  await shot(page, `${S}/daftar`, { highlights: [H(page.getByText('Strategi Konten Kuartal Ini (Demo)').first().locator('xpath=ancestor::a[1]'), { n: 1, pad: 4 })] });
  await page.locator('a[href*="decks/"]').first().click();
  await sleep(3500);
  await shot(page, `${S}/slide`, {
    highlights: [H(page.getByRole('button', { name: /Ekspor PDF/ }), { n: 1 }), H(page.getByText(/slide 1\/5/i), { n: 2, pad: 8, scroll: false })],
  });
  const cm = page.getByText(/komentar/i).first();
  await scrollTo(cm, 120).catch(() => {});
  await sleep(500);
  await page.getByPlaceholder(/Tulis komentar/).fill('Slide 2 sudah sesuai, mohon tambahkan target jangkauan.');
  await shot(page, `${S}/komentar`, {
    highlights: [H(page.getByPlaceholder(/Tulis komentar/).locator('xpath=ancestor::div[1]'), { n: 1, scroll: false, pad: 6 })],
  });
  await page.close();

  // ---- desktop shot for the staff guide (what the client sees) --------------------------------
  const { page: dp } = await ctx.anon({ w: 1280, h: 800, dsf: 1, mobile: false });
  await dp.goto(`${base}/login`);
  await sleep(1200);
  const code2 = await typeEmailAndCode(dp, sleep);
  await dp.fill('#portal-code', code2);
  await dp.getByText('Kopi Senja (Demo)').first().waitFor({ timeout: 20000 });
  await dp.goto(`${base}/c/${ids.client}/reports`);
  await sleep(2500);
  await shot(dp, 'portal-klien/dilihat-klien', {
    highlights: [H(dp.getByRole('navigation').first(), { n: 1, pad: 4 })],
  });
  await dp.close();
}
