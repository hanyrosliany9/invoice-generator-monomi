/**
 * Guide: publikasi-otomatis (auto-publishing Instagram / Facebook from the Monomi content calendar).
 * Standalone: Monomi content with published, scheduled and failed publications from seed-crm.mjs
 * (the backend talks to the fake Meta Graph, nothing is posted anywhere).
 */
export const standalone = true;
export const needs = ['publishing'];

const SLUG = 'publikasi-otomatis';
const id = (n) => `${SLUG}/${n}`;

export async function run(ctx) {
  const { ids, go, shot, sleep } = ctx;
  const { page } = await ctx.staff({ w: 1440, h: 1100 });
  const H = (loc, o = {}) => ({ locator: loc, ...o });
  const cal = `/calendar/content/clients/${ids.monomi}`;

  // 1. Turn it on in the create dialog ----------------------------------------------------------
  await go(page, cal, 2500);
  await page.getByRole('button', { name: /Tambah Konten/ }).first().click();
  await sleep(900);
  const dlg = page.getByRole('dialog');
  await dlg.getByPlaceholder(/Tulis keterangan/).fill('Di balik layar sesi foto produk kami. Lampu, kamera, aksi! #MonomiAgency');
  const sw = dlg.locator('#auto-publish-switch');
  await sw.scrollIntoViewIfNeeded();
  await sw.click();
  await sleep(500);
  const section = dlg.getByTestId('auto-publish-section');
  await section.getByRole('checkbox').first().check().catch(() => {});
  await section.getByLabel('Facebook Page').check().catch(() => {});
  await sleep(500);
  await shot(page, id('nyalakan'), {
    highlights: [
      H(sw, { n: 1, pad: 4, badge: 'tr' }),
      H(section.getByRole('checkbox').first().locator('xpath=ancestor::*[self::div][1]'), { n: 2, pad: 3 }),
    ],
  });

  // 2. Requirements: the hints tell what is missing (media, schedule) --------------------------------
  await shot(page, id('syarat'), {
    highlights: [
      H(section, { n: 1, pad: 4 }),
      H(dlg.getByText(/^Media/).first(), { n: 2, pad: 4, scroll: false }),
    ],
  });
  await dlg.getByRole('button', { name: /^Batal$/ }).click();
  await sleep(500);

  // 3. Status chips per platform in the list view -------------------------------------------------------
  await page.getByRole('tab', { name: 'Daftar' }).click();
  await sleep(1500);
  const chips = page.getByTestId('publish-chips');
  await shot(page, id('status'), {
    highlights: [
      H(chips.nth(0), { n: 1, pad: 3 }),
      H(chips.nth(1), { n: 2, pad: 3 }),
      H(chips.nth(2), { n: 3, pad: 3 }),
    ],
  });

  // 4. Published: permalinks -------------------------------------------------------------------------------
  await page.getByText(/Di balik layar sesi foto produk terbaru/).first().click();
  await sleep(1200);
  const panel = page.getByTestId('auto-publish-panel');
  await shot(page, id('terbit'), {
    highlights: [
      H(panel, { n: 1, pad: 4 }),
      H(page.getByRole('link', { name: /Lihat postingan/ }).first(), { n: 2, pad: 3 }),
    ],
  });
  await page.keyboard.press('Escape');
  await sleep(600);

  // 5. Failed: reason + Retry ---------------------------------------------------------------------------------
  await page.getByText(/FAILME Teaser Reels/).first().click();
  await sleep(1200);
  await shot(page, id('gagal'), {
    highlights: [
      H(page.getByTestId('reason-INSTAGRAM'), { n: 1, pad: 4 }),
      H(page.getByTestId('retry-publish'), { n: 2, pad: 4 }),
    ],
  });
  await page.keyboard.press('Escape');
  await sleep(600);

  // 6. Scheduled: Publish now ---------------------------------------------------------------------------------------
  await page.getByText(/Bulan baru, tampilan baru/).first().click();
  await sleep(1200);
  await shot(page, id('terbitkan-sekarang'), {
    highlights: [
      H(panel, { n: 1, pad: 4 }),
      H(page.getByTestId('publish-now'), { n: 2, pad: 4 }),
    ],
  });
  await page.keyboard.press('Escape');
  await sleep(600);

  // 7. Connection card ---------------------------------------------------------------------------------------------------
  await go(page, cal, 2500);
  await page.getByTestId('check-connection').click();
  await sleep(2500);
  await shot(page, id('koneksi'), {
    highlights: [
      H(page.getByTestId('social-connection-card'), { n: 1, pad: 4 }),
      H(page.getByTestId('check-connection'), { n: 2, pad: 4, badge: 'tr' }),
    ],
  });
}
