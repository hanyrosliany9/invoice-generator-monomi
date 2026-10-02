/** Guide: kolaborasi-media (staff media collaboration). */
import { scrollTo } from '../lib.mjs';

const SLUG = 'kolaborasi-media';
const id = (n) => `${SLUG}/${n}`;

export async function run(ctx) {
  const { ids, go, shot, sleep } = ctx;
  const { page } = await ctx.staff({ w: 1280, h: 900 });
  const H = (loc, o = {}) => ({ locator: loc, ...o });

  // 1. New project ---------------------------------------------------------
  await go(page, '/media-collab', 2200);
  await page.getByRole('button', { name: /Proyek Baru/ }).first().click();
  await sleep(600);
  const dlg = page.getByRole('dialog');
  await dlg.getByPlaceholder(/Kampanye Q3/).fill('Foto Produk Menu Ramadan');
  await shot(page, id('proyek-baru'), {
    highlights: [
      H(dlg.getByPlaceholder(/Kampanye Q3/), { n: 1 }),
      H(dlg.getByRole('button', { name: /Buat Proyek/ }), { n: 2, badge: 'tr' }),
    ],
  });
  await page.keyboard.press('Escape');

  // 2. Upload ------------------------------------------------------------------
  await go(page, `/media-collab/projects/${ids.mediaProject}`, 3000);
  await page.evaluate(() => document.querySelector('main')?.scrollTo(0, 0));
  await shot(page, id('unggah'), {
    highlights: [H(page.getByRole('button', { name: /Unggah Aset/ }).first(), { n: 1, badge: 'tl' })],
  });

  // 3. Folders ------------------------------------------------------------------
  const gallery = page.getByText('Galeri Aset', { exact: true }).first();
  await scrollTo(gallery, 60);
  await shot(page, id('folder'), {
    highlights: [
      H(page.getByText('Folder', { exact: true }).first().locator('xpath=following::button[1]'), { n: 1, scroll: false, pad: 6 }),
      H(page.getByText('Semua File').first(), { n: 2, scroll: false, pad: 6 }),
    ],
  });

  // 4. Select + download ----------------------------------------------------------------
  const pick = page.getByRole('button', { name: 'Pilih', exact: true });
  await pick.nth(0).click({ force: true });
  await pick.nth(2).click({ force: true });
  await sleep(500);
  await shot(page, id('pilih-unduh'), {
    highlights: [
      H(pick.nth(0), { n: 1, scroll: false, pad: 4 }),
      H(page.getByRole('button', { name: /Pilih Semua/ }), { n: 2, scroll: false }),
      H(page.getByText(/dipilih/).first().locator('xpath=ancestor::div[1]'), { n: 3, scroll: false, pad: 6 }),
    ],
  });

  // 5. Rating + comments ----------------------------------------------------------------------
  await go(page, `/media-collab/projects/${ids.mediaProject}`, 2800);
  await scrollTo(page.getByText('Galeri Aset', { exact: true }).first(), 60);
  await page.locator('img').nth(1).click({ force: true });
  await sleep(1800);
  await page.locator('button[aria-label="4 star"]').last().click({ force: true });
  await page.getByPlaceholder(/Tulis komentar/).last().fill('Warna sudah pas, lanjut ke versi final.');
  await shot(page, id('rating'), {
    highlights: [
      H(page.locator('button[aria-label="4 star"]').last().locator('xpath=..'), { n: 1, scroll: false, pad: 6 }),
      H(page.getByPlaceholder(/Tulis komentar/).last(), { n: 2, scroll: false }),
    ],
  });
  await page.keyboard.press('Escape');

  // 6. Public link ------------------------------------------------------------------------------------
  await go(page, `/media-collab/projects/${ids.mediaProject}`, 2500);
  await page.evaluate(() => document.querySelector('main')?.scrollTo(0, 0));
  await page.getByRole('button', { name: /Atur Berbagi/ }).click();
  await sleep(900);
  await shot(page, id('tautan'), {
    highlights: [
      H(page.getByRole('button', { name: /Salin/ }), { n: 1, scroll: false, badge: 'tr' }),
      H(page.getByRole('button', { name: /Nonaktifkan/ }), { n: 2, scroll: false, badge: 'tr' }),
      H(page.getByText('Kedaluwarsa Tautan').first().locator('xpath=ancestor::div[1]'), { n: 3, scroll: false, pad: 4 }),
    ],
  });
  await page.close();

  // 7. Phone: selection bar -------------------------------------------------------------------------------
  const { page: mp } = await ctx.staff({ w: 390, h: 844, dsf: 2, mobile: true });
  await mp.goto(`${ctx.cfg.appUrl}/media-collab/projects/${ids.mediaProject}`, { waitUntil: 'networkidle' }).catch(() => {});
  await sleep(2500);
  await scrollTo(mp.getByText('Galeri Aset', { exact: true }).first(), 70);
  await mp.getByRole('button', { name: 'Pilih', exact: true }).nth(0).click({ force: true });
  await mp.getByRole('button', { name: 'Pilih', exact: true }).nth(1).click({ force: true });
  await sleep(600);
  await shot(mp, id('pilih-hp'), { highlights: [] });
  await mp.close();
}
