/**
 * Guides (staff): deck-presentasi, media-downloader, dashboard-navigasi, pengguna-peran.
 * Everything the guide creates carries the "(Demo)" marker.
 */
import { scrollTo, DEMO } from '../lib.mjs';

const H = (loc, o = {}) => ({ locator: loc, ...o });

export async function run(ctx) {
  // The deck editor toolbar is wider than a laptop screen, so capture it at 1920.
  const wide = await ctx.staff({ w: 1920, h: 960 });
  await deck(ctx, wide.page);
  await wide.page.close();
  const { page } = await ctx.staff({ w: 1280, h: 820 });
  await mediaDownloader(ctx, page);
  await dashboard(ctx, page);
  await penggunaPeran(ctx, page);
  await page.close();
}

/* ------------------------------------------------------------------ */
async function deck(ctx, page) {
  const { ids, go, shot, sleep } = ctx;
  const id = (n) => `deck-presentasi/${n}`;
  void ids; void scrollTo;

  // 1. List
  await go(page, '/decks', 1800);
  await shot(page, id('daftar'), {
    highlights: [
      H(page.getByRole('button', { name: /Deck Baru/ }).first(), { n: 1, badge: 'tr' }),
      H(page.getByRole('button', { name: /Impor/ }).first(), { n: 2, badge: 'tr' }),
    ],
  });

  // 2. New deck dialog
  await page.getByRole('button', { name: /Deck Baru/ }).first().click();
  await sleep(600);
  await page.getByPlaceholder('Judul deck...').fill(`Pitch Kampanye Ramadan ${DEMO}`);
  await page.getByPlaceholder(/Deskripsi singkat/).fill('Presentasi konsep kampanye untuk klien.');
  await shot(page, id('buat'), {
    highlights: [
      H(page.getByPlaceholder('Judul deck...'), { n: 1, scroll: false }),
      H(page.getByRole('dialog').getByRole('combobox').first(), { n: 2, scroll: false }),
      H(page.getByRole('button', { name: 'Buat Deck' }), { n: 3, scroll: false, badge: 'tr' }),
    ],
  });
  await page.getByRole('button', { name: 'Buat Deck' }).click();
  await page.waitForURL(/\/decks\/[a-z0-9]{20,}/, { timeout: 15000 });
  await sleep(3000);
  await shot(page, id('editor'), {
    highlights: [
      H(page.getByRole('button', { name: /^Text$|Text/ }).first(), { n: 1, scroll: false, badge: 'tr' }),
      H(page.getByRole('button', { name: /Slide Baru/ }), { n: 2, scroll: false, badge: 'tr' }),
      H(page.getByText('Properti').first().locator('xpath=ancestor::*[contains(@class,"border-l") or contains(@class,"w-")][1]'), { n: 3, scroll: false, pad: 0 }),
    ],
  });

  // 4. Add text
  await page.getByRole('button', { name: /^Text$|Text/ }).first().click();
  await sleep(700);
  await shot(page, id('teks-menu'), {
    highlights: [H(page.getByText('Title', { exact: true }).first(), { n: 1, scroll: false, pad: 10 })],
  });
  await page.getByText('Title', { exact: true }).first().click();
  await sleep(1000);
  const box = await page.locator('canvas').first().boundingBox();
  // The inserted title sits at the top-left of the slide; double-click it to edit.
  await page.mouse.dblclick(box.x + 150, box.y + 125);
  await sleep(700);
  await page.keyboard.press('Control+A');
  await page.keyboard.type('Kampanye Ramadan Pelangi', { delay: 15 });
  await sleep(400);
  await page.mouse.click(box.x + box.width - 60, box.y + box.height - 60);
  await sleep(900);
  await shot(page, id('teks'), { highlights: [] });

  // 5. New slide
  await page.getByRole('button', { name: /Slide Baru/ }).locator('xpath=following-sibling::button[1]').click();
  await sleep(900);
  await shot(page, id('slide-baru'), {
    highlights: [
      H(page.getByRole('menuitem', { name: /Mood Board/ }).locator('xpath=ancestor::*[@role="menu"][1]'), { n: 1, scroll: false, pad: 3, badge: 'tr' }),
      H(page.getByRole('button', { name: /Slide Baru/ }), { n: 2, scroll: false }),
    ],
  });
  await page.keyboard.press('Escape');
  await sleep(500);

  // 6. Share
  const share = page.getByRole('button', { name: /Bagikan/ }).first();
  await share.scrollIntoViewIfNeeded();
  await sleep(500);
  await shot(page, id('bagikan-tombol'), {
    highlights: [
      H(share, { n: 1, scroll: false }),
      H(page.getByRole('button', { name: /Ekspor/ }).first(), { n: 2, scroll: false, badge: 'tr' }),
    ],
  });
  await share.click();
  await sleep(1200);
  await shot(page, id('bagikan'), {
    highlights: [
      H(page.getByRole('dialog').getByText('Tautan publik').first().locator('xpath=ancestor::div[2]'), { n: 1, scroll: false, pad: 2 }),
      H(page.getByPlaceholder('kolaborator@email.com'), { n: 2, scroll: false }),
      H(page.getByRole('button', { name: /Undang/ }), { n: 3, scroll: false, badge: 'tr' }),
    ],
  });
  await page.keyboard.press('Escape');
  await sleep(500);

  // 7. Export
  await page.getByRole('button', { name: /Ekspor/ }).first().click();
  await sleep(800);
  await shot(page, id('ekspor'), {
    highlights: [H(page.getByRole('menuitem', { name: /Kualitas Standar/ }), { n: 1, scroll: false, pad: 3 })],
  });
}

/* ------------------------------------------------------------------ */
async function mediaDownloader(ctx, page) {
  const { go, shot, sleep } = ctx;
  const id = (n) => `media-downloader/${n}`;

  // 1. Paste a link (it is typed only; nothing is downloaded while capturing)
  await go(page, '/media-downloader', 1800);
  await page.getByPlaceholder(/youtube.com\/watch/).fill('https://www.instagram.com/p/Demo-Post-123/');
  await sleep(500);
  await shot(page, id('tautan'), {
    highlights: [
      H(page.getByPlaceholder(/youtube.com\/watch/), { n: 1, scroll: false }),
      H(page.getByRole('button', { name: /Tempel/ }), { n: 2, scroll: false, badge: 'tr' }),
    ],
  });

  // 2. Quality + audio only
  await page.getByRole('combobox').filter({ hasText: /Kualitas Terbaik/ }).first().click();
  await sleep(600);
  await shot(page, id('kualitas'), {
    highlights: [
      H(page.getByRole('listbox').or(page.getByRole('menu')).first(), { n: 1, scroll: false, pad: 3 }),
      H(page.getByText('Audio saja').first().locator('xpath=ancestor::div[2]'), { n: 2, scroll: false, pad: 4, badge: 'tr' }),
    ],
  });
  await page.keyboard.press('Escape');

  // 3. Download + session history
  await shot(page, id('unduh'), {
    highlights: [
      H(page.getByRole('button', { name: /Unduh Sekarang/ }), { n: 1, scroll: false }),
      H(page.getByText('Riwayat sesi').first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 2, scroll: false, pad: 3 }),
    ],
  });
}

/* ------------------------------------------------------------------ */
async function dashboard(ctx, page) {
  const { go, shot, sleep } = ctx;
  const id = (n) => `dashboard-navigasi/${n}`;

  // 1. Dashboard
  await go(page, '/', 2500);
  await shot(page, id('dashboard'), {
    highlights: [
      H(page.getByText('Belum Tertagih').first().locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 1, scroll: false, pad: 2 }),
      H(page.getByRole('link', { name: /Invoice Baru/ }).or(page.getByRole('button', { name: /Invoice Baru/ })).first(), { n: 2, scroll: false, badge: 'tr' }),
      H(page.getByText('Status Invoice').first().locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 3, scroll: false, pad: 2 }),
    ],
  });

  // 2. Sidebar groups
  await shot(page, id('menu'), {
    highlights: [
      H(page.getByRole('link', { name: 'Klien', exact: true }).first(), { n: 1, scroll: false, pad: 3 }),
      H(page.getByRole('link', { name: 'Shot List', exact: true }).first(), { n: 2, scroll: false, pad: 3 }),
      H(page.getByRole('link', { name: 'Panduan', exact: true }).first(), { n: 3, scroll: false, pad: 3 }),
    ].filter(Boolean),
  });

  // 3. Command palette
  await page.keyboard.press('Control+K');
  await sleep(700);
  await page.keyboard.type('invoice', { delay: 30 });
  await sleep(900);
  await shot(page, id('palet'), { highlights: [] });
  await page.keyboard.press('Escape');
  await sleep(400);

  // 4. Language toggle
  await shot(page, id('bahasa'), {
    highlights: [
      H(page.getByRole('button', { name: 'EN', exact: true }).first().locator('xpath=ancestor::div[1]'), { n: 1, scroll: false, pad: 5, badge: 'tl' }),
    ],
  });
  await page.getByRole('button', { name: 'EN', exact: true }).first().click();
  await sleep(1200);
  await shot(page, id('bahasa-en'), { highlights: [] });
  await page.getByRole('button', { name: 'ID', exact: true }).first().click();
  await sleep(800);
}

/* ------------------------------------------------------------------ */
async function penggunaPeran(ctx, page) {
  const { go, shot, sleep } = ctx;
  const id = (n) => `pengguna-peran/${n}`;

  // 1. List
  await go(page, '/users', 1800);
  await shot(page, id('daftar'), {
    highlights: [
      H(page.getByRole('link', { name: /Pengguna Baru/ }).or(page.getByRole('button', { name: /Pengguna Baru/ })).first(), { n: 1, badge: 'tr' }),
      H(page.getByRole('combobox').filter({ hasText: /Semua Peran/ }).first(), { n: 2, scroll: false }),
    ],
  });

  // 2. New user
  await go(page, '/users/new', 1500);
  await page.getByPlaceholder('Nama lengkap pengguna').fill(`Rani Videografer ${DEMO}`);
  await page.getByPlaceholder('nama@monomi.id').fill('demo.rani@contoh.co.id');
  await page.getByRole('combobox').first().click();
  await sleep(600);
  await shot(page, id('peran'), {
    highlights: [
      H(page.getByRole('listbox').first(), { n: 1, scroll: false, pad: 3 }),
      H(page.getByPlaceholder('nama@monomi.id'), { n: 2, scroll: false }),
    ],
  });
  await page.getByRole('option', { name: /Videografer/i }).first().click();
  await sleep(500);
  await page.getByPlaceholder('Masukkan kata sandi awal').fill('Demo#Rani2026');
  await scrollTo(page.getByPlaceholder('Masukkan kata sandi awal'), 300);
  await shot(page, id('sandi'), {
    highlights: [
      H(page.getByPlaceholder('Masukkan kata sandi awal'), { n: 1, scroll: false }),
      H(page.getByRole('button', { name: 'Simpan' }).first(), { n: 2, scroll: false, badge: 'tr' }),
    ],
  });
  await page.getByRole('button', { name: 'Simpan' }).first().click();
  await sleep(2500);

  // 3. After saving
  await go(page, '/users', 1800);
  await shot(page, id('hasil'), {
    highlights: [
      H(page.getByText('Rani Videografer').first().locator('xpath=ancestor::tr[1]'), { n: 1, scroll: false, pad: 3 }),
    ],
  });
}
