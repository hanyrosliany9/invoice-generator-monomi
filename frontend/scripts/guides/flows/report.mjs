/** Guide: laporan-bulanan (monthly social media report). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { monthName } from '../seed.mjs';
import { scrollTo } from '../lib.mjs';
import { removeInstagram, seedInstagram } from '../seed-instagram.mjs';

const SLUG = 'laporan-bulanan';
const id = (n) => `${SLUG}/${n}`;

export async function run(ctx) {
  const { ids, go, shot, sleep } = ctx;
  const { page } = await ctx.staff({ w: 1280, h: 900 });
  const H = (loc, o = {}) => ({ locator: loc, ...o });

  // 1. Landing page ----------------------------------------------------
  await go(page, '/reports/social-media', 1200);
  await shot(page, id('daftar'), {
    highlights: [H(page.getByRole('button', { name: /Laporan Baru/ }), { badge: 'tl' })],
  });

  // 2. New report: project, month ---------------------------------------
  await page.getByRole('button', { name: /Laporan Baru/ }).first().click();
  await page.waitForURL(/reports\/builder/);
  await sleep(600);
  const combos = page.getByRole('combobox');
  await combos.nth(0).click();
  await page.getByRole('option', { name: /Konten Media Sosial Bulanan/ }).click();
  await combos.nth(1).click();
  await page.getByRole('option', { name: new RegExp(`^${monthName(ids.month)}$`) }).click();
  const title = `Laporan Media Sosial ${monthName(ids.month)} ${ids.year} (Demo)`;
  await page.getByLabel(/Judul Laporan/).fill(title);
  await sleep(400);
  await shot(page, id('identitas'), {
    highlights: [
      H(combos.nth(0), { n: 1 }),
      H(combos.nth(1), { n: 2 }),
      H(page.getByRole('button', { name: /Simpan & Lanjutkan/ }), { n: 3, badge: 'tr' }),
    ],
  });

  // The client has a synced Instagram account (demo rows, see seed-instagram.mjs), so the data chooser offers a 4th
  // mode, "Ambil dari Instagram". Removed again at the end of this flow so later flows see an unconnected client.
  await seedInstagram(ids.client, { month: ids.month, year: ids.year });

  // 3. Saved: data sections --------------------------------------------
  await page.getByRole('button', { name: /Simpan & Lanjutkan/ }).click();
  await page.waitForURL(/reports\/[^/]+\/edit/);
  await sleep(1200);
  const tabs = page.getByRole('tab');
  const panelTitle = page.getByText('Tambah bagian data', { exact: true }).first();
  await scrollTo(panelTitle, 90);
  await shot(page, id('bagian-data'), { highlights: [H(page.getByRole('tablist').first(), { pad: 8 })] });

  // 4. Upload a file -----------------------------------------------------
  const csv = path.join(os.tmpdir(), 'instagram-harian-contoh.csv');
  const pad = (n) => String(n).padStart(2, '0');
  const rows = ['Tanggal,Jangkauan,Impresi,Suka,Komentar'];
  for (let d = 1; d <= 10; d += 1) rows.push(`${ids.year}-${pad(ids.month)}-${pad(d)},${1200 + d * 85},${3400 + d * 120},${210 + d * 9},${8 + d}`);
  fs.writeFileSync(csv, rows.join('\n'));
  await page.getByLabel(/Judul Bagian/).fill('Instagram Harian');
  await scrollTo(panelTitle, 90);
  await shot(page, id('unggah-file'), {
    highlights: [
      H(tabs.filter({ hasText: /Unggah file/ }), { n: 1 }),
      H(page.locator('label[for="csv-upload"]'), { n: 2 }),
      H(page.getByText(/Belum punya file/).locator('xpath=ancestor::div[contains(@class,"rounded-md")][1]'), { n: 3 }),
    ],
  });

  await page.locator('#csv-upload').setInputFiles(csv);
  await page.waitForSelector('text=/baris, .* kolom dibaca/');
  await sleep(500);
  await scrollTo(panelTitle, 90);
  await shot(page, id('pratinjau-file'), {
    highlights: [H(page.getByText(/baris, .* kolom dibaca/), { pad: 8 })],
  });

  // 5. Type in a table ---------------------------------------------------
  await tabs.filter({ hasText: /Ketik di tabel/ }).click();
  await sleep(400);
  await page.getByRole('button', { name: /Instagram harian/ }).first().click();
  await sleep(500);
  const fillCell = async (r, c, v) => { await page.locator(`[data-cell="${r}-${c}"]`).fill(String(v)); };
  for (let r = 0; r < 5; r += 1) {
    await fillCell(r, 1, 1200 + r * 90);
    await fillCell(r, 2, 3400 + r * 130);
  }
  await scrollTo(panelTitle, 90);
  await shot(page, id('ketik-tabel'), {
    highlights: [
      H(page.getByRole('button', { name: /Instagram harian/ }).first(), { n: 1 }),
      H(page.locator('[data-cell="0-1"]'), { n: 2, pad: 4 }),
    ],
  });

  // 6. Paste from Excel --------------------------------------------------
  await page.getByRole('button', { name: /Tempel dari Excel/ }).click();
  await sleep(300);
  const tsv = ['Tanggal\tJangkauan\tImpresi\tSuka\tKomentar']
    .concat(Array.from({ length: 8 }, (_, i) => `${i + 1}/${ids.month}/${ids.year}\t${1300 + i * 70}\t${3600 + i * 110}\t${220 + i * 8}\t${9 + i}`)).join('\n');
  await page.getByRole('textbox', { name: /Tempel dari Excel/ }).fill(tsv);
  await scrollTo(panelTitle, 90);
  await shot(page, id('tempel-excel'), {
    highlights: [
      H(page.getByRole('button', { name: /Tempel dari Excel/ }), { n: 1 }),
      H(page.getByRole('textbox', { name: /Tempel dari Excel/ }), { n: 2 }),
      H(page.getByRole('button', { name: /Pakai tabel yang ditempel/ }), { n: 3 }),
    ],
  });
  await page.getByRole('button', { name: /Pakai tabel yang ditempel/ }).click();
  await sleep(400);

  // 7. Headline numbers --------------------------------------------------
  await tabs.filter({ hasText: /Angka utama/ }).click();
  await sleep(500);
  await scrollTo(panelTitle, 90);
  await shot(page, id('angka-utama'), {
    highlights: [H(tabs.filter({ hasText: /Angka utama/ }), { n: 1 })],
  });

  // 8. Save the typed table as a section; charts appear --------------------
  await tabs.filter({ hasText: /Ketik di tabel/ }).click();
  await sleep(300);
  await page.getByRole('button', { name: /^Tambah Bagian$/ }).click();
  await sleep(2500);
  const vizTitle = page.getByText('Visualisasi', { exact: true }).first();
  await scrollTo(vizTitle, 120);
  await shot(page, id('grafik'), {
    highlights: [
      H(page.getByText('Tipe Grafik').first().locator('xpath=following::*[@role="combobox"][1]'), { n: 1 }),
      H(page.getByText('Sumbu X').first().locator('xpath=following::*[@role="combobox"][1]'), { n: 2 }),
      H(page.getByRole('button', { name: /^Simpan$/ }).first(), { n: 3, badge: 'tr' }),
    ],
  });

  // 9. Preview as the client ----------------------------------------------
  await page.getByText(/Pratinjau sebagai klien/).first().click();
  await page.waitForURL(/\/preview/);
  await sleep(2500);
  await shot(page, id('pratinjau-klien'), {
    highlights: [H(page.getByText(/Pratinjau: beginilah tampilan untuk klien/), { pad: 10 })],
  });

  // 10. Done -> report detail; publish (mark as finished) -----------------------
  const reportUrl = page.url().replace(/\/preview$/, '');
  await go(page, new URL(reportUrl).pathname, 1500);
  await page.getByRole('button', { name: /Tindakan lain/ }).click();
  await sleep(400);
  await shot(page, id('tayangkan'), {
    highlights: [
      H(page.getByRole('menuitem', { name: /Tayangkan di portal/ }), { n: 1, badge: 'tl' }),
    ],
  });
  await page.getByRole('menuitem', { name: /Tayangkan di portal/ }).click();
  await sleep(1500);

  // 11. Send to client dialog (not submitted) -----------------------------------
  await page.getByRole('button', { name: /^Kirim ke klien/ }).first().click();
  await sleep(1200);
  await shot(page, id('kirim'), {
    highlights: [H(page.getByRole('button', { name: /Kirim email/ }), { n: 1, badge: 'tr' })],
  });
  await page.keyboard.press('Escape');
  await sleep(400);

  // 12. Back to draft (live banner) ------------------------------------------------
  await shot(page, id('kembali-draf'), {
    highlights: [
      H(page.getByRole('button', { name: /^Kembalikan ke draf/ }).first(), { n: 1 }),
      H(page.getByText(/Tayang di portal klien/).first(), { n: 2, pad: 10, badge: 'tl' }),
    ],
  });

  // 13. Copy to next month ----------------------------------------------------------
  await page.getByRole('button', { name: /Tindakan lain/ }).click();
  await sleep(300);
  await page.getByRole('menuitem', { name: /Salin ke bulan depan/ }).click();
  await sleep(900);
  await shot(page, id('salin'), {
    highlights: [
      H(page.getByRole('dialog').getByRole('combobox').first(), { n: 1 }),
      H(page.getByRole('button', { name: /^Salin ke / }), { n: 2, badge: 'tr' }),
    ],
  });

  await removeInstagram(ids.client);
  await page.close();
}
