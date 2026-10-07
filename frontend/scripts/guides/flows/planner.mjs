/**
 * Guides: perencana-konten (content planner) and konten-monomi (Monomi's own
 * profile + planner).
 */
import fs from 'node:fs';
import { scrollTo } from '../lib.mjs';
import { STATE_FILE } from '../cleanup.mjs';

const SLUG = 'perencana-konten';
const id = (n) => `${SLUG}/${n}`;

export async function run(ctx) {
  const { ids, go, shot, sleep, api } = ctx;
  const { page } = await ctx.staff({ w: 1280, h: 900 });
  const H = (loc, o = {}) => ({ locator: loc, ...o });
  const card = (name) => page.getByText(name, { exact: true }).first().locator('xpath=ancestor::*[self::a or self::button or self::div[contains(@class,"rounded")]][1]');

  // 1. Pick a client ------------------------------------------------------
  await go(page, '/calendar/content', 1800);
  await shot(page, id('pilih-klien'), {
    highlights: [
      H(card('Kopi Senja (Demo)'), { n: 1 }),
      H(card('Monomi'), { n: 2 }),
    ],
  });

  // 2. The client's calendar ---------------------------------------------
  await go(page, `/calendar/content/clients/${ids.client}`, 2200);
  await shot(page, id('kalender'), {
    highlights: [
      H(page.getByRole('button', { name: /Tambah Konten/ }), { n: 1, badge: 'tr' }),
      H(page.getByRole('tablist').first(), { n: 2 }),
    ],
  });

  // 3. New content: caption, platform, format -------------------------------
  await page.getByRole('button', { name: /Tambah Konten/ }).first().click();
  await sleep(700);
  const dlg = page.getByRole('dialog');
  await dlg.getByPlaceholder(/Tulis keterangan/).fill('Promo akhir pekan: beli 2 gratis 1 untuk semua kopi susu. Berlaku Sabtu dan Minggu! #KopiSenja #PromoAkhirPekan');
  await dlg.getByRole('button', { name: 'TikTok' }).click();
  await sleep(300);
  await shot(page, id('buat-konten'), {
    highlights: [
      H(dlg.getByPlaceholder(/Tulis keterangan/), { n: 1 }),
      H(dlg.getByText('Platform', { exact: true }).locator('xpath=following-sibling::*[1]'), { n: 2, pad: 4 }),
      H(dlg.getByText('Tipe Konten', { exact: true }).locator('xpath=following-sibling::*[1]'), { n: 3, pad: 4 }),
    ],
  });

  // 4. Media + schedule (WIB) ----------------------------------------------
  await dlg.getByText('Pilih tanggal').click();
  await sleep(500);
  const days = page.locator('[role="gridcell"] button, td button').filter({ hasText: /^(15|16|17)$/ });
  if ((await days.count()) > 0) await days.first().click();
  await sleep(400);
  await shot(page, id('media-jadwal'), {
    highlights: [
      H(dlg.getByText('Tambah', { exact: true }).first(), { n: 1, pad: 10 }),
      H(dlg.getByText('Tanggal Jadwal').locator('xpath=following::*[self::button or self::input][1]'), { n: 2 }),
      H(dlg.getByText('Waktu (WIB)').locator('xpath=following::input[1]'), { n: 3, pad: 4 }),
      H(dlg.getByRole('button', { name: /Jadwalkan/ }), { n: 4, badge: 'tr' }),
    ],
  });
  await page.getByRole('button', { name: /^Batal$/ }).click().catch(() => {});
  await sleep(400);

  // 5. Status + publish -----------------------------------------------------
  await go(page, `/calendar/content/clients/${ids.client}`, 1800);
  await page.getByText(/Halo sahabat k/).first().click();
  await sleep(900);
  await shot(page, id('detail-aksi'), {
    highlights: [
      H(page.getByRole('button', { name: /^Duplikat/ }), { n: 1 }),
      H(page.getByRole('button', { name: /^Terbitkan/ }), { n: 2 }),
    ],
  });
  await page.getByRole('button', { name: /^Terbitkan/ }).click();
  await sleep(900);
  await shot(page, id('terbitkan'), {
    highlights: [
      H(page.getByRole('dialog').getByText(/Tanggal/).first().locator('xpath=following::button[1]'), { n: 1 }),
      H(page.getByRole('button', { name: /^Tandai terbit/ }), { n: 2, badge: 'tr' }),
    ],
  });
  await page.keyboard.press('Escape');
  await sleep(300);
  await page.keyboard.press('Escape');
  await sleep(300);

  // 6. Drag to reschedule + undo ----------------------------------------------
  await go(page, `/calendar/content/clients/${ids.client}`, 1800);
  const src = page.getByText(/Promo akhir p/).first();
  await scrollTo(page.getByRole('tablist').first(), 70);
  const sb = await src.boundingBox();
  const cells = await page.locator('[data-date], [data-day]').all().catch(() => []);
  let target = null;
  // The seeded dates are relative to today, so the post may sit in the last column of its week: take the day cell
  // to its right, else the one to its left (same week row).
  for (const dir of [1, -1]) {
    for (const c of cells) {
      const b = await c.boundingBox();
      if (b && dir * (b.x - sb.x) > 150 && Math.abs(b.y - sb.y) < 140) { target = b; break; }
    }
    if (target) break;
  }
  if (!target) target = { x: sb.x + 280, y: sb.y - 10, width: 100, height: 100 };
  await page.mouse.move(sb.x + 20, sb.y + 8);
  await page.mouse.down();
  await page.mouse.move(sb.x + 60, sb.y + 12, { steps: 4 });
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 12 });
  await sleep(300);
  await page.mouse.up();
  await sleep(900);
  await shot(page, id('seret'), {
    keepToasts: true,
    highlights: [
      H(page.getByText(/Promo akhir p/).first(), { n: 1, scroll: false, pad: 5 }),
      H(page.locator('[data-sonner-toast]').first(), { n: 2, scroll: false, pad: 4 }),
    ],
  });

  // 7. Bulk actions in list view -------------------------------------------------
  await go(page, `/calendar/content/clients/${ids.client}`, 1500);
  await page.getByRole('tab', { name: 'Daftar' }).click();
  await sleep(800);
  await page.getByRole('checkbox', { name: 'Pilih konten' }).nth(0).click();
  await page.getByRole('checkbox', { name: 'Pilih konten' }).nth(1).click();
  await sleep(400);
  await shot(page, id('aksi-massal'), {
    highlights: [
      H(page.getByText(/2 dipilih/).locator('xpath=ancestor::div[contains(@class,"flex")][1]'), { n: 1, pad: 8 }),
    ],
  });

  // 8. Instagram preview + highlights -------------------------------------------------
  await page.getByRole('tab', { name: 'Instagram' }).click();
  await sleep(1500);
  await scrollTo(page.getByText(/^preview$/i).first(), 40);
  await shot(page, id('pratinjau-ig'), {
    highlights: [
      H(page.getByText('kopisenja.demo', { exact: true }).first(), { n: 1, scroll: false, pad: 8 }),
      H(page.getByText(/Buka pratinjau ponsel/).first(), { n: 2, scroll: false }),
    ],
  });
  await scrollTo(page.getByRole('tablist').first(), 80);
  await page.getByRole('button', { name: /Highlights/ }).first().click();
  await sleep(900);
  await shot(page, id('highlights'), {
    highlights: [
      H(page.getByRole('dialog').getByPlaceholder(/Promo, Produk/), { n: 1 }),
      H(page.getByRole('dialog').getByText(/Media \(9:16\)/).locator('xpath=following::*[1]'), { n: 2, pad: 4 }),
      H(page.getByRole('button', { name: /Buat Highlight/ }), { n: 3, badge: 'tr' }),
    ],
  });
  await page.keyboard.press('Escape');
  await sleep(400);

  // 9. TikTok preview ---------------------------------------------------------------------
  await page.getByRole('tab', { name: 'TikTok' }).click();
  await sleep(1500);
  await scrollTo(page.getByText(/^preview$/i).first(), 40);
  await shot(page, id('pratinjau-tiktok'), { highlights: [H(page.getByText(/Buka pratinjau TikTok/).first(), { n: 1, scroll: false })] });

  // 10. Share link ---------------------------------------------------------------------------
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole('button', { name: /Bagikan/ }).first().click();
  await sleep(600);
  await page.getByRole('button', { name: /Aktifkan tautan berbagi/ }).click();
  await sleep(1500);
  await shot(page, id('bagikan'), {
    highlights: [
      H(page.getByRole('dialog').locator('input').first(), { n: 1, pad: 8 }),
      H(page.getByRole('dialog').getByRole('button', { name: /Salin/ }), { n: 2, badge: 'tr' }),
    ],
  });
  await page.keyboard.press('Escape');

  // ------------------------------------------------------------------
  // Sub-guide: Monomi's own content (konten-monomi)
  // ------------------------------------------------------------------
  const M = 'konten-monomi';
  const mid = (n) => `${M}/${n}`;
  const internal = ids.internalClient;
  if (internal) {
    const before = await api('GET', `/clients/${internal}`);
    fs.writeFileSync(STATE_FILE, JSON.stringify({ internalClient: before }, null, 1));

    await go(page, `/clients/${internal}`, 1800);
    await shot(page, mid('klien-monomi'), {
      highlights: [
        H(page.getByText('Internal', { exact: true }).first(), { n: 1, pad: 6 }),
        H(page.getByRole('button', { name: /Edit|Ubah/ }).first(), { n: 2 }),
      ],
    });

    await go(page, `/clients/${internal}/edit`, 1800);
    await page.getByLabel(/Username Instagram/).fill('monomi.studio');
    await page.getByLabel(/Bio/).first().fill('Studio kreatif: video, foto, dan media sosial\nBandung - Jakarta\nHubungi kami untuk kolaborasi');
    await scrollTo(page.getByText('Profil Instagram', { exact: true }).first(), 160);
    await shot(page, mid('profil-instagram'), {
      highlights: [
        H(page.getByLabel(/Username Instagram/), { n: 1 }),
        H(page.getByLabel(/Bio/).first(), { n: 2 }),
      ],
    });
    const save = page.getByRole('button', { name: /Simpan|Perbarui/ }).last();
    await save.scrollIntoViewIfNeeded();
    await save.click();
    await sleep(1800);

    await go(page, `/calendar/content/clients/${internal}`, 2200);
    await page.getByRole('tab', { name: 'Instagram' }).click();
    await sleep(1500);
    await scrollTo(page.getByRole('tablist').first(), 80);
    await shot(page, mid('planner-monomi'), { highlights: [H(page.getByRole('tab', { name: 'Instagram' }), { n: 1, scroll: false })] });
  }
  await page.close();
}
