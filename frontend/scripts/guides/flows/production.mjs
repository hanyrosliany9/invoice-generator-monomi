/**
 * Guides (staff): shot-list, jadwal-syuting, call-sheet, production-hub.
 * Everything the guide creates carries the "(Demo)" marker.
 */
import { scrollTo, DEMO } from '../lib.mjs';

const H = (loc, o = {}) => ({ locator: loc, ...o });

export async function run(ctx) {
  const { page } = await ctx.staff({ w: 1280, h: 820 });
  await shotList(ctx, page);
  await jadwal(ctx, page);
  await callSheet(ctx, page);
  await hub(ctx, page);
  await page.close();
}

/* ------------------------------------------------------------------ */
async function shotList(ctx, page) {
  const { ids, go, shot, sleep } = ctx;
  const id = (n) => `shot-list/${n}`;
  const biz = ids.biz;

  // 1. List
  await go(page, '/shot-lists', 1800);
  await shot(page, id('daftar'), {
    highlights: [
      H(page.getByRole('button', { name: /Shot List Baru/ }).first(), { n: 1, badge: 'tr' }),
      H(page.getByRole('combobox').filter({ hasText: /Semua Proyek/ }).first(), { n: 2, scroll: false }),
    ],
  });

  // 2. New shot list dialog
  await page.getByRole('button', { name: /Shot List Baru/ }).first().click();
  await sleep(600);
  await page.getByPlaceholder('Nama shot list').fill(`Shot List Iklan Ramadan ${DEMO}`);
  await page.getByRole('dialog').getByRole('combobox').first().click();
  await sleep(500);
  await page.getByRole('button', { name: /Video Profil Gerai/ }).first().click();
  await sleep(400);
  await page.getByPlaceholder(/Deskripsi singkat/).fill('Shot untuk iklan Ramadan 30 detik.');
  await shot(page, id('buat'), {
    highlights: [
      H(page.getByPlaceholder('Nama shot list'), { n: 1, scroll: false }),
      H(page.getByRole('dialog').getByRole('combobox').first(), { n: 2, scroll: false }),
      H(page.getByRole('button', { name: 'Buat Shot List' }), { n: 3, scroll: false, badge: 'tr' }),
    ],
  });
  await page.getByRole('button', { name: 'Buat Shot List' }).click();
  await page.waitForURL(/\/shot-lists\/[a-z0-9]{20,}/, { timeout: 15000 });
  await sleep(2000);
  // 3. Add shots
  await scrollTo(page.getByText('Baris Shot').first(), 110);
  const rows = [
    ['Wide: gerai dari seberang jalan saat matahari terbit', 'LS', 'A-Cam', 'Static', '8'],
    ['Close up: tangan barista menuang kopi', 'CU', 'A-Cam', 'Slider', '6'],
    ['Medium: pelanggan tersenyum menikmati kopi', 'MS', 'B-Cam', 'Handheld', '7'],
  ];
  for (let i = 0; i < rows.length; i += 1) {
    await page.getByRole('button', { name: /Tambah Shot/ }).click();
    await sleep(350);
    const [desc, type, cam, move, secs] = rows[i];
    await page.getByPlaceholder('Aksi / lokasi / subjek').nth(i).fill(desc);
    await page.getByPlaceholder('LS / CU').nth(i).fill(type);
    await page.getByPlaceholder('Kamera').nth(i).fill(cam);
    await page.getByPlaceholder('Gerakan (Pan / Track)').nth(i).fill(move);
    await page.getByPlaceholder('dtk').nth(i).fill(secs);
  }
  await sleep(400);
  await scrollTo(page.getByText('Baris Shot').first(), 110);
  await shot(page, id('shot'), {
    highlights: [
      H(page.getByPlaceholder('Aksi / lokasi / subjek').first(), { n: 1, scroll: false }),
      H(page.getByPlaceholder('LS / CU').first(), { n: 2, scroll: false }),
      H(page.getByRole('button', { name: /Tambah Shot/ }), { n: 3, scroll: false }),
    ],
  });
  await page.getByRole('button', { name: /^Simpan$/ }).click();
  await sleep(2500);

  // 4. Row actions on a longer list
  await go(page, `/shot-lists/${biz.shotList}`, 2200);
  await scrollTo(page.getByText('Baris Shot').first(), 110);
  await shot(page, id('urutan'), {
    highlights: [
      H(page.getByRole('button', { name: 'Duplikat shot' }).first().locator('xpath=..'), { n: 1, scroll: false, pad: 4, badge: 'tr' }),
    ],
  });

  // 5. PDF
  await shot(page, id('pdf'), {
    highlights: [
      H(page.getByRole('button', { name: /Unduh PDF/ }), { n: 1, scroll: false }),
      H(page.getByRole('button', { name: /^Simpan$/ }), { n: 2, scroll: false, badge: 'tr' }),
    ],
  });
}

/* ------------------------------------------------------------------ */
async function jadwal(ctx, page) {
  const { ids, go, shot, sleep } = ctx;
  const id = (n) => `jadwal-syuting/${n}`;
  const biz = ids.biz;

  // 1. List
  await go(page, '/schedules', 1800);
  await shot(page, id('daftar'), {
    highlights: [
      H(page.getByRole('button', { name: /Jadwal Baru/ }).first(), { n: 1, badge: 'tr' }),
      H(page.getByRole('combobox').filter({ hasText: /Semua Proyek/ }).first(), { n: 2, scroll: false }),
    ],
  });

  // 2. New schedule dialog
  await page.getByRole('button', { name: /Jadwal Baru/ }).first().click();
  await sleep(600);
  const dlg = page.getByRole('dialog');
  await dlg.getByPlaceholder(/Unit Utama/).fill(`Jadwal Syuting Iklan Ramadan ${DEMO}`);
  await dlg.getByRole('combobox').nth(0).click();
  await sleep(500);
  await page.getByRole('button', { name: /Video Profil Gerai/ }).first().click();
  await sleep(500);
  await dlg.getByRole('combobox').nth(1).click();
  await sleep(500);
  await page.getByRole('button', { name: /Shot List Video Profil/ }).first().click();
  await sleep(400);
  await dlg.locator('input[type=date]').fill('2026-10-12');
  await sleep(300);
  await shot(page, id('buat'), {
    highlights: [
      H(dlg.getByPlaceholder(/Unit Utama/), { n: 1, scroll: false }),
      H(dlg.getByRole('combobox').nth(1), { n: 2, scroll: false }),
      H(dlg.locator('input[type=date]'), { n: 3, scroll: false }),
    ],
  });
  await dlg.getByRole('button', { name: 'Buat Jadwal' }).click();
  await page.waitForURL(/\/schedules\/[a-z0-9]{20,}/, { timeout: 15000 });
  await sleep(2200);

  // 3. Shoot days
  const addDay = page.getByRole('button', { name: /Tambah Hari Syuting/ });
  await scrollTo(page.getByText('Tambah Hari Syuting').first(), 160);
  await addDay.click();
  await sleep(1200);
  await addDay.click();
  await sleep(1500);
  await scrollTo(page.getByText('Tambah Hari Syuting').first(), 160);
  await shot(page, id('hari'), {
    highlights: [
      H(addDay, { n: 1, scroll: false, badge: 'tr' }),
    ],
  });

  // 4. Import scenes from the shot list into day 1 (day menu)
  await page.getByRole('button', { name: /Aksi hari syuting/ }).first().click();
  await sleep(600);
  await shot(page, id('impor-menu'), {
    highlights: [H(page.getByRole('menuitem', { name: /Impor dari shot list/ }), { n: 1, scroll: false, pad: 3 })],
  });
  await page.getByRole('menuitem', { name: /Impor dari shot list/ }).click();
  await sleep(1000);
  await page.getByRole('dialog').getByText('Shot List Video Profil Gerai').first().click();
  await sleep(500);
  await shot(page, id('impor-dialog'), {
    highlights: [
      H(page.getByRole('dialog').getByText('Shot List Video Profil Gerai').first().locator('xpath=ancestor::*[self::button or self::label or self::div][1]'), { n: 1, scroll: false, pad: 3 }),
      H(page.getByRole('dialog').getByRole('button', { name: /Impor adegan/ }), { n: 2, scroll: false, badge: 'tr' }),
    ],
  });
  await page.getByRole('dialog').getByRole('button', { name: /Impor adegan/ }).click();
  await sleep(2500);
  await scrollTo(page.getByText('Tambah Hari Syuting').first(), 160);
  await shot(page, id('strip'), {
    highlights: [
      H(page.getByText('HARI 1').first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 1, scroll: false, pad: 3 }),
    ],
  });

  // 5. Auto schedule + PDF
  await scrollTo(page.getByText('Otomatisasi').first(), 110);
  await shot(page, id('otomatis'), {
    highlights: [
      H(page.getByRole('combobox').filter({ hasText: /Lokasi/ }).first(), { n: 1, scroll: false }),
      H(page.getByRole('button', { name: /Jadwalkan Otomatis/ }), { n: 2, scroll: false, badge: 'tr' }),
    ],
  });
  void biz;
}

/* ------------------------------------------------------------------ */
async function callSheet(ctx, page) {
  const { go, shot, sleep } = ctx;
  const id = (n) => `call-sheet/${n}`;

  // 1. List
  await go(page, '/call-sheets', 1800);
  await shot(page, id('daftar'), {
    highlights: [
      H(page.getByRole('button', { name: /Call Sheet Baru/ }).first(), { n: 1, badge: 'tr' }),
      H(page.getByPlaceholder(/Cari nama produksi/), { n: 2, scroll: false }),
    ],
  });

  // 2. Dialog
  await page.getByRole('button', { name: /Call Sheet Baru/ }).first().click();
  await sleep(600);
  const dlg = page.getByRole('dialog');
  await dlg.getByPlaceholder(/Kampanye Brand/).fill(`Iklan Ramadan Pelangi ${DEMO}`);
  await dlg.getByRole('button', { name: /Pilih tanggal shoot/ }).click();
  await sleep(500);
  await page.locator('[data-slot="calendar"] button[data-day]').filter({ hasText: /^20$/ }).first().click();
  await sleep(400);
  await shot(page, id('buat'), {
    highlights: [
      H(dlg.getByRole('combobox').first(), { n: 1, scroll: false }),
      H(dlg.getByPlaceholder(/Kampanye Brand/), { n: 2, scroll: false }),
      H(dlg.getByRole('button', { name: /Buat & Buka Editor/ }), { n: 3, scroll: false, badge: 'tr' }),
    ],
  });
  await dlg.getByRole('button', { name: /Buat & Buka Editor/ }).click();
  await page.waitForURL(/\/call-sheets\/[a-z0-9]{20,}/, { timeout: 15000 });
  await sleep(2500);
  // 3. Production info + call times
  await page.getByPlaceholder('Nama sutradara').fill('Raka Pratama');
  await page.getByPlaceholder('Nama produser').fill('Sari Wulandari');
  const times = page.getByText('Waktu Panggilan').first();
  const timeInputs = times.locator('xpath=ancestor::*[contains(@class,"rounded")][1]').locator('input');
  await timeInputs.nth(0).fill('06:30');
  await timeInputs.nth(1).fill('08:00');
  await timeInputs.nth(2).fill('12:00');
  await sleep(500);
  await shot(page, id('info'), {
    highlights: [
      H(page.getByPlaceholder('Nama sutradara'), { n: 1, scroll: false }),
      H(page.getByPlaceholder('Nama produser'), { n: 2, scroll: false, badge: 'tr' }),
      H(page.getByText('Call Kru').first().locator('xpath=ancestor::*[self::div][1]'), { n: 3, scroll: false, pad: 4 }),
    ],
  });

  // 4. Location
  await scrollTo(page.getByText('Lokasi Shoot').first(), 100);
  await page.getByPlaceholder('Contoh: Studio Selatan').fill('Gerai Kopi Senja, Bandung');
  await page.getByPlaceholder('Instruksi parkir untuk kru...').fill('Parkir mobil kru di basement, motor di depan gerai.');
  await sleep(400);
  await shot(page, id('lokasi'), {
    highlights: [
      H(page.getByPlaceholder('Contoh: Studio Selatan'), { n: 1, scroll: false }),
      H(page.getByText('Isi Semua Otomatis').first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 2, scroll: false, pad: 3 }),
    ],
  });

  // 5. Crew + activities
  await scrollTo(page.getByText('Jadwal Aktivitas').first(), 100);
  await page.getByRole('button', { name: /Tambah Aktivitas/ }).click();
  await sleep(600);
  await page.getByPlaceholder(/Nama a/).first().fill('Persiapan dan setup kamera');
  await page.getByRole('button', { name: /Tambah Kru/ }).click();
  await sleep(800);
  await scrollTo(page.getByText('Jadwal Aktivitas').first(), 100);
  await shot(page, id('kru'), {
    highlights: [
      H(page.getByRole('button', { name: /Tambah Aktivitas/ }), { n: 1, scroll: false }),
      H(page.getByRole('button', { name: /Tambah Kru/ }), { n: 2, scroll: false }),
    ],
  });

  // 6. Mark ready + PDF
  await page.getByRole('button', { name: /Simpan Call Sheet/ }).click();
  await sleep(2000);
  await scrollTo(page.getByText('Info Produksi').first(), 400);
  await page.getByRole('button', { name: /^Aksi$/ }).click().catch(() => {});
  await sleep(600);
  await shot(page, id('siap'), {
    highlights: [
      H(page.locator('button').filter({ hasText: 'Tandai Siap' }).first(), { n: 1, scroll: false, pad: 4 }),
      H(page.locator('[role=menuitem]').filter({ hasText: 'Unduh PDF' }).first(), { n: 2, scroll: false, pad: 3 }),
    ],
  });
}

/* ------------------------------------------------------------------ */
async function hub(ctx, page) {
  const { ids, go, shot, sleep, api } = ctx;
  const id = (n) => `production-hub/${n}`;
  const biz = ids.biz;

  // 1. Open the hub from the project
  await go(page, `/projects/${biz.projectVideo}`, 2000);
  await shot(page, id('buka'), {
    highlights: [
      H(page.getByRole('link', { name: /Pusat Produksi/ }).or(page.getByRole('button', { name: /Pusat Produksi/ })).first(), { n: 1, scroll: false }),
    ],
  });

  // 2. Hub with its documents
  await go(page, `/projects/${biz.projectVideo}/production`, 2200);
  await shot(page, id('isi'), {
    highlights: [
      H(page.getByText('Briefing kru di hari syuting').first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 1, scroll: false, pad: 3 }),
      H(page.getByText('Jadwal syuting per hari dan stripboard').first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 2, scroll: false, pad: 3 }),
    ],
  });

  // 3. Generate the guest link
  await page.getByRole('button', { name: /Buat Tautan/ }).click();
  await sleep(2000);
  await shot(page, id('tautan'), {
    highlights: [
      H(page.getByText('Tautan Akses Tamu').first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 1, scroll: false, pad: 4 }),
    ],
  });

  // 4. What the client sees (no login)
  const project = await api('GET', `/projects/${biz.projectVideo}`);
  const token = project.productionHubToken;
  const anon = await ctx.anon({ w: 1280, h: 820, dsf: 1, mobile: false });
  await anon.page.goto(`${ctx.cfg.appUrl}/guest/hub/${token}`, { waitUntil: 'networkidle' }).catch(() => {});
  await sleep(2000);
  await ctx.shot(anon.page, id('tamu'), { highlights: [] });
  await anon.page.close();
}
