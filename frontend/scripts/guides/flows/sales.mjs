/**
 * Guides (staff, admin): klien-baru, proyek-baru, quotation, invoice, piutang-pembayaran.
 * Everything the guide creates carries the "(Demo)" marker.
 */
import { scrollTo, DEMO } from '../lib.mjs';

const H = (loc, o = {}) => ({ locator: loc, ...o });

/** Open a Radix select / combobox trigger and click the option with this text. */
async function choose(page, trigger, optionText) {
  await trigger.click();
  await page.waitForTimeout(400);
  await page.getByRole('option', { name: optionText }).first().click();
  await page.waitForTimeout(300);
}

export async function run(ctx) {
  const { ids, go, shot, sleep } = ctx;
  const { page } = await ctx.staff({ w: 1280, h: 820 });
  await klienBaru(ctx, page);
  await proyekBaru(ctx, page);
  await quotation(ctx, page);
  await invoice(ctx, page);
  await piutang(ctx, page);
  const wide = await ctx.staff({ w: 1440, h: 860 });
  await piutangLaporan(ctx, wide.page);
  await wide.page.close();
  await page.close();
  void ids; void go; void shot; void sleep;
}

/* ------------------------------------------------------------------ */
async function klienBaru(ctx, page) {
  const { ids, go, shot, sleep } = ctx;
  const id = (n) => `klien-baru/${n}`;

  // 1. List
  await go(page, '/clients', 1500);
  await shot(page, id('daftar'), {
    highlights: [
      H(page.getByRole('link', { name: /Klien Baru/ }).or(page.getByRole('button', { name: /Klien Baru/ })).first(), { n: 1, badge: 'tr' }),
      H(page.getByPlaceholder(/Cari nama, perusahaan/), { n: 2, scroll: false }),
    ],
  });

  // 2. Identity
  await go(page, '/clients/new', 1200);
  await page.getByPlaceholder('Nama lengkap atau panggilan klien').fill(`Studio Pelangi ${DEMO}`);
  await page.getByPlaceholder(/PT, CV, atau nama studio/).fill(`CV Pelangi Kreatif ${DEMO}`);
  await page.getByPlaceholder('01.234.567.8-901.000').fill('01.234.567.8-901.000');
  await choose(page, page.getByRole("combobox").first(), /Net 14/);
  await shot(page, id('identitas'), {
    highlights: [
      H(page.getByPlaceholder('Nama lengkap atau panggilan klien'), { n: 1, scroll: false }),
      H(page.getByPlaceholder('01.234.567.8-901.000'), { n: 2, scroll: false }),
      H(page.getByRole('combobox').first(), { n: 3, scroll: false }),
    ],
  });

  // 3. Contact + address
  await page.getByPlaceholder('Nama narahubung utama').fill('Maya Anggraini');
  await page.getByPlaceholder('nama@perusahaan.com').fill('demo.maya@contoh.co.id');
  await page.getByPlaceholder('+62 812 3456 7890').fill('+62 812 5550 1234');
  await page.getByPlaceholder(/BCA · 1234567890/).fill('BCA · 7771234567 · CV Pelangi Kreatif');
  await page.getByPlaceholder(/Jl. Sudirman No. 1/).fill('Jl. Dipatiukur No. 21, Bandung, Jawa Barat 40132');
  await scrollTo(page.getByPlaceholder('Nama narahubung utama'), 150);
  await shot(page, id('kontak'), {
    highlights: [
      H(page.getByPlaceholder('Nama narahubung utama'), { n: 1, scroll: false }),
      H(page.getByPlaceholder('nama@perusahaan.com'), { n: 2, scroll: false, badge: 'tr' }),
      H(page.getByPlaceholder(/BCA · 1234567890/), { n: 3, scroll: false, badge: 'tr' }),
      H(page.getByPlaceholder(/Jl. Sudirman No. 1/), { n: 4, scroll: false }),
    ],
  });

  // 4. Save -> detail page
  await page.getByRole('button', { name: 'Simpan' }).first().click();
  await page.waitForURL(/\/clients\/[a-z0-9]+$/, { timeout: 15000 });
  await sleep(1800);
  await shot(page, id('profil'), {
    highlights: [
      H(page.getByRole('button', { name: 'Edit' }).or(page.getByRole('link', { name: 'Edit' })).first(), { n: 1, badge: 'tl', scroll: false }),
      H(page.getByRole('button', { name: /Tindakan lainnya|More actions/ }).first(), { n: 2, badge: 'tr', scroll: false }),
    ],
  });

  // 5. History on a client with documents
  await go(page, `/clients/${ids.client}`, 1800);
  const hist = page.getByRole('heading', { name: 'Riwayat Proyek' });
  await scrollTo(hist, 90);
  await shot(page, id('riwayat'), {
    highlights: [
      H(page.getByRole('heading', { name: 'Riwayat Proyek' }).locator('xpath=ancestor::section[1]|ancestor::div[contains(@class,"rounded")][1]'), { n: 1, scroll: false, pad: 4 }),
    ],
  });
  const inv = page.getByRole('heading', { name: 'Riwayat Invoice' });
  await scrollTo(inv, 90);
  await shot(page, id('riwayat-invoice'), {
    highlights: [
      H(inv.locator('xpath=ancestor::section[1]|ancestor::div[contains(@class,"rounded")][1]'), { n: 1, scroll: false, pad: 4 }),
      H(page.getByRole('heading', { name: 'Riwayat Penawaran' }).locator('xpath=ancestor::section[1]|ancestor::div[contains(@class,"rounded")][1]'), { n: 2, scroll: false, pad: 4 }),
    ],
  });

  // 6. Edit
  await go(page, `/clients/${ids.client}/edit`, 1500);
  await shot(page, id('ubah'), {
    highlights: [H(page.getByPlaceholder('Nama lengkap atau panggilan klien'), { n: 1, scroll: false }), H(page.getByRole('button', { name: 'Simpan' }).first(), { n: 2, scroll: false, badge: 'tr' })],
  });
}

/* ------------------------------------------------------------------ */
async function proyekBaru(ctx, page) {
  const { ids, go, shot, sleep } = ctx;
  const id = (n) => `proyek-baru/${n}`;

  // 1. List
  await go(page, '/projects', 1500);
  await shot(page, id('daftar'), {
    highlights: [
      H(page.getByRole('link', { name: /Proyek Baru/ }).or(page.getByRole('button', { name: /Proyek Baru/ })).first(), { n: 1, badge: 'tr' }),
      H(page.getByPlaceholder(/Cari/).first(), { n: 2, scroll: false }),
    ],
  });

  // 2. Identity
  await go(page, '/projects/new', 1200);
  const desc = page.getByPlaceholder(/Ringkasan tujuan proyek/);
  await desc.fill(`Video Iklan Ramadan Pelangi ${DEMO}`);
  await page.getByPlaceholder(/Video 30 detik, Landing page/).fill('Video iklan 30 detik + 3 cutdown');
  await page.getByPlaceholder(/Pengembangan konsep kreatif/).fill(['1. Konsep kreatif dan storyboard', '2. Syuting 1 hari', '3. Editing, color grading, 2 kali revisi'].join(String.fromCharCode(10)));
  await shot(page, id('identitas'), {
    highlights: [
      H(desc, { n: 1, scroll: false }),
      H(page.getByPlaceholder(/Video 30 detik, Landing page/), { n: 2, scroll: false }),
      H(page.getByPlaceholder(/Pengembangan konsep kreatif/), { n: 3, scroll: false }),
    ],
  });

  // 3. Client, type and dates
  const clientBtn = page.getByRole('combobox').filter({ hasText: /Pilih klien/ }).or(page.getByRole('button', { name: /Pilih klien/ })).first();
  await scrollTo(clientBtn, 160);
  await clientBtn.click();
  await sleep(500);
  await page.getByPlaceholder(/Cari berdasarkan nama/).fill('Studio Pelangi');
  await sleep(500);
  await page.getByRole('button', { name: /Studio Pelangi \(Demo\)/ }).first().click();
  await sleep(300);
  const typeBtn = page.getByRole('combobox').filter({ hasText: /Pilih jenis proyek/ }).first();
  await typeBtn.click();
  await sleep(400);
  await page.getByRole('option', { name: /Production Work/ }).first().click();
  await sleep(300);
  const pickDate = async (nth, day) => {
    await page.getByRole('button', { name: 'Pilih tanggal' }).first().click();
    await sleep(400);
    await page.locator('[data-slot="calendar"] button[data-day]').filter({ hasText: new RegExp(`^${day}$`) }).first().click();
    await sleep(300);
    void nth;
  };
  await pickDate(0, 10);
  const endBtn = page.getByRole('button', { name: 'Pilih tanggal' }).first();
  await endBtn.click();
  await sleep(400);
  await page.getByRole('button', { name: /Next Month|Berikutnya/ }).first().click();
  await sleep(300);
  await page.locator('[data-slot="calendar"] button[data-day]').filter({ hasText: /^20$/ }).first().click();
  await sleep(500);
  await scrollTo(page.getByText('Klien & Jenis').first(), 110);
  await shot(page, id('klien-jenis'), {
    highlights: [
      H(page.getByRole('combobox').filter({ hasText: /Studio Pelangi/ }).first(), { n: 1, scroll: false }),
      H(page.getByRole('combobox').filter({ hasText: /Production Work/ }).first(), { n: 2, scroll: false }),
    ],
  });
  // 4. Products & cost estimate
  await page.getByPlaceholder('Nama item').first().fill('Produksi Video Iklan 30 detik');
  await page.getByPlaceholder(/Deskripsi singkat \(dicetak/).first().fill('Konsep, syuting 1 hari, editing, 2 kali revisi');
  await page.locator('input[placeholder="0"]').first().fill('9500000');
  await sleep(400);
  const prod = page.getByText('Produk & Layanan').first();
  await scrollTo(prod, 110);
  await shot(page, id('produk'), {
    highlights: [
      H(page.getByPlaceholder('Nama item').first(), { n: 1, scroll: false }),
      H(page.locator('input[placeholder="0"]').first(), { n: 2, scroll: false, badge: 'tr' }),
      H(page.getByRole('button', { name: /Tambah Baris$/ }).first(), { n: 3, scroll: false }),
    ],
  });
  const est = page.getByText('Estimasi Anggaran Biaya').first();
  await page.getByRole('button', { name: /Tambah Baris Biaya/ }).click();
  await sleep(500);
  await page.getByRole('combobox').filter({ hasText: /Pilih kategori/ }).first().click();
  await sleep(400);
  await page.getByRole('button', { name: /Freelancer Videografer/ }).first().click();
  await sleep(300);
  await page.getByPlaceholder('0').last().fill('3500000');
  await page.getByPlaceholder('Catatan opsional').fill('Sewa kamera dan videografer freelance');
  await sleep(400);
  await scrollTo(est, 90);
  await shot(page, id('anggaran'), {
    highlights: [
      H(page.getByRole('combobox').filter({ hasText: /Freelancer Videografer/ }).first(), { n: 1, scroll: false }),
      H(page.getByRole('combobox').filter({ hasText: /Langsung/ }).first(), { n: 2, scroll: false }),
      H(page.getByPlaceholder('0').last(), { n: 3, scroll: false, badge: 'tr' }),
    ],
  });

  // 5. Save -> detail
  await page.getByRole('button', { name: 'Simpan' }).last().click();
  await page.waitForURL(/\/projects\/[a-z0-9]{20,}$/, { timeout: 20000 });
  await sleep(2000);
  await shot(page, id('detail'), {
    highlights: [
      H(page.getByText(/^(PLANNING|Perencanaan)$/i).first(), { n: 1, scroll: false }),
      H(page.getByRole('link', { name: /Pusat Produksi/ }).or(page.getByRole('button', { name: /Pusat Produksi/ })).first(), { n: 2, scroll: false }),
      H(page.getByRole('link', { name: 'Edit' }).or(page.getByRole('button', { name: 'Edit' })).first(), { n: 3, scroll: false, badge: 'tr' }),
    ],
  });
  const projectUrl = page.url();

  // 6. Status: Mulai Proyek in the "..." menu
  await page.getByRole('button', { name: /Tindakan lainnya/ }).first().click();
  await sleep(500);
  await shot(page, id('status'), {
    highlights: [H(page.getByRole('menuitem', { name: /Mulai Proyek/ }), { n: 1, scroll: false, pad: 4 })],
  });
  await page.keyboard.press('Escape');

  // 7. Production hub
  await go(page, `${new URL(projectUrl).pathname}/production`, 2000);
  await shot(page, id('production-hub'), {
    highlights: [
      H(page.getByText('Tautan Akses Tamu').first().locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 1, scroll: false, pad: 4 }),
      H(page.getByRole('button', { name: /Shot List Baru/ }).first(), { n: 2, scroll: false }),
    ],
  });
  void ids;
}

/* ------------------------------------------------------------------ */
async function quotation(ctx, page) {
  const { ids, go, shot, sleep } = ctx;
  const id = (n) => `quotation/${n}`;
  const biz = ids.biz;

  // 1. List
  await go(page, '/quotations', 1500);
  await shot(page, id('daftar'), {
    highlights: [
      H(page.getByRole('link', { name: /Penawaran Baru/ }).or(page.getByRole('button', { name: /Penawaran Baru/ })).first(), { n: 1, badge: 'tr' }),
      H(page.getByRole('combobox').filter({ hasText: /Semua Status/ }).first(), { n: 2, scroll: false }),
    ],
  });

  // 2. Client + project
  await go(page, '/quotations/new', 1500);
  await page.getByRole('combobox').filter({ hasText: /Pilih klien/ }).first().click();
  await sleep(400);
  await page.getByRole('button', { name: /Kopi Senja \(Demo\)/ }).first().click();
  await sleep(500);
  await page.getByRole('combobox').filter({ hasText: /Pilih proyek|Pilih/ }).last().click().catch(() => {});
  await sleep(500);
  await page.getByRole('button', { name: /Kampanye Lebaran/ }).first().click();
  await sleep(400);
  await shot(page, id('klien-proyek'), {
    highlights: [
      H(page.getByRole('combobox').filter({ hasText: /Kopi Senja/ }).first(), { n: 1, scroll: false }),
      H(page.getByRole('combobox').filter({ hasText: /Kampanye Lebaran/ }).first(), { n: 2, scroll: false }),
      H(page.getByRole('button', { name: /\d{4}$/ }).first(), { n: 3, scroll: false }),
    ],
  });

  // 3. Items + PPN
  await page.getByLabel('Item 1 nama').fill('Video Promosi Ramadan 30 detik');
  await page.getByLabel('Item 1 deskripsi').fill('Konsep, syuting 1 hari, editing');
  await page.getByLabel('Item 1 harga').fill('7500000');
  await page.getByRole('button', { name: /Tambah item/ }).click();
  await sleep(400);
  await page.getByLabel('Item 2 nama').fill('Cutdown 15 detik untuk Reels');
  await page.getByLabel('Item 2 harga').fill('1500000');
  await sleep(400);
  await scrollTo(page.getByLabel('Item 1 nama'), 160);
  await shot(page, id('item'), {
    highlights: [
      H(page.getByLabel('Item 1 nama'), { n: 1, scroll: false }),
      H(page.getByLabel('Item 1 harga'), { n: 2, scroll: false, badge: 'tr' }),
      H(page.getByRole('button', { name: /Tambah item/ }), { n: 3, scroll: false }),
    ],
  });
  const ppn = page.getByText('Sertakan PPN 11%').first();
  await scrollTo(ppn, 220);
  await shot(page, id('ppn'), {
    highlights: [
      H(ppn.locator('xpath=ancestor::label[1]|..'), { n: 1, scroll: false, pad: 8 }),
      H(page.getByText('Ringkasan Nilai').first().locator('xpath=following::div[contains(@class,"rounded")][1]'), { n: 2, scroll: false, pad: 2 }),
    ],
  });

  // 4. Scope, payment terms, conditions
  await page.getByPlaceholder(/produksi konten video selama 1 bulan/).fill('Produksi video promosi Ramadan 30 detik dan 1 cutdown 15 detik untuk Instagram Reels dan TikTok.');
  const terms = page.getByText('Pembayaran Penuh').first();
  await scrollTo(terms, 200);
  await shot(page, id('ketentuan'), {
    highlights: [
      H(page.getByRole('button', { name: 'Pembayaran Penuh' }).locator('xpath=..'), { n: 1, scroll: false, pad: 4 }),
      H(page.getByText('KETENTUAN', { exact: false }).last().locator('xpath=following::textarea[1]'), { n: 2, scroll: false }),
    ],
  });
  await page.getByRole('button', { name: 'Simpan' }).last().click();
  await page.waitForURL(/\/quotations\/[a-z0-9]{20,}$/, { timeout: 20000 });
  await sleep(2000);

  // 5. Send
  await shot(page, id('kirim'), {
    highlights: [
      H(page.getByText(/^Draf$/).first(), { n: 1, scroll: false }),
      H(page.getByRole('button', { name: /^Kirim$/ }), { n: 2, scroll: false }),
      H(page.getByRole('button', { name: /Aksi penawaran/ }), { n: 3, scroll: false, badge: 'tr' }),
    ],
  });

  // 6. Approve / decline (a quotation that is already sent)
  await go(page, `/quotations/${biz.qSent.id}`, 1800);
  await shot(page, id('setujui'), {
    highlights: [
      H(page.getByText(/^Terkirim$/).first(), { n: 1, scroll: false }),
      H(page.getByRole('button', { name: /^Tolak$/ }), { n: 2, scroll: false }),
      H(page.getByRole('button', { name: /^Setujui$/ }), { n: 3, scroll: false, badge: 'tr' }),
    ],
  });

  // 7. Approved -> invoice
  await go(page, `/quotations/${biz.qApproved.id}`, 1800);
  await shot(page, id('disetujui'), {
    highlights: [
      H(page.getByText(/^Disetujui$/).first(), { n: 1, scroll: false }),
      H(page.getByRole('button', { name: /Lihat Invoice/ }).or(page.getByRole('link', { name: /Lihat Invoice/ })).first(), { n: 2, scroll: false }),
      H(page.getByText(/Materai diperlukan/).first(), { n: 3, scroll: false, badge: 'tr' }),
    ],
  });

  // 8. Declined -> revise
  await go(page, `/quotations/${biz.qDeclined.id}`, 1800);
  await shot(page, id('revisi'), {
    highlights: [
      H(page.getByText(/^Ditolak$/).first(), { n: 1, scroll: false }),
      H(page.getByRole('button', { name: /Buat Revisi/ }), { n: 2, scroll: false }),
    ],
  });
}

/* ------------------------------------------------------------------ */
async function invoice(ctx, page) {
  const { ids, go, shot, sleep } = ctx;
  const id = (n) => `invoice/${n}`;
  const biz = ids.biz;

  // 1. List
  await go(page, '/invoices', 1800);
  await shot(page, id('daftar'), {
    highlights: [
      H(page.getByRole('link', { name: /Invoice Baru/ }).or(page.getByRole('button', { name: /Invoice Baru/ })).first(), { n: 1, badge: 'tr' }),
      H(page.getByText('Belum Tertagih').first().locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 2, scroll: false, pad: 2 }),
    ],
  });

  // 2. Status filter
  await page.getByRole('combobox').filter({ hasText: /Semua Status/ }).first().click();
  await sleep(500);
  await shot(page, id('status'), {
    highlights: [H(page.getByRole('listbox').or(page.getByRole('menu')).first(), { n: 1, scroll: false, pad: 4 })],
  });
  await page.keyboard.press('Escape');

  // 3. Draft invoice generated from an approved quotation
  await go(page, `/invoices/${biz.invDraft}`, 1800);
  await shot(page, id('dari-penawaran'), {
    highlights: [
      H(page.getByText(/^Draf$/).first(), { n: 1, scroll: false }),
      H(page.getByText(/^QT-\d{6}-\d+/).first().locator('xpath=..'), { n: 2, scroll: false, pad: 4 }),
      H(page.getByRole('button', { name: /^Kirim$/ }), { n: 3, scroll: false }),
    ],
  });

  // 4. Materai reminder
  await shot(page, id('materai'), {
    highlights: [
      H(page.getByText('Materai diperlukan').first().locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 1, scroll: false, pad: 3 }),
      H(page.getByText('Belum diterapkan').first().locator('xpath=..'), { n: 2, scroll: false, pad: 4 }),
    ],
  });

  // 5. Tick "Materai sudah ditempel" on the edit page
  await go(page, `/invoices/${biz.invDraft}/edit`, 1800);
  const stamp = page.getByText('Materai sudah ditempel').first();
  await scrollTo(stamp, 300);
  await shot(page, id('materai-tempel'), {
    highlights: [
      H(stamp.locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 1, scroll: false, pad: 3 }),
      H(page.getByRole('button', { name: /Simpan/ }).last(), { n: 2, scroll: false, badge: 'tr' }),
    ],
  });

  // 6. Print / PDF
  await go(page, `/invoices/${biz.invDraft}`, 1500);
  await page.getByRole('button', { name: /Tindakan lainnya/ }).first().click();
  await sleep(500);
  await shot(page, id('pdf'), {
    highlights: [
      H(page.getByRole('menuitem', { name: /Pratinjau PDF/ }), { n: 1, scroll: false, pad: 2 }),
    ],
  });
  await page.keyboard.press('Escape');

  // 7. Send
  await page.getByRole('button', { name: /^Kirim$/ }).click();
  await sleep(2000);
  await shot(page, id('kirim'), {
    highlights: [
      H(page.getByText(/^Sent$|^Terkirim$/).first(), { n: 1, scroll: false }),
      H(page.getByRole('button', { name: /Catat Pembayaran/ }), { n: 2, scroll: false }),
    ],
  });
}

/* ------------------------------------------------------------------ */
async function piutang(ctx, page) {
  const { ids, go, shot, sleep } = ctx;
  const id = (n) => `piutang-pembayaran/${n}`;
  const biz = ids.biz;

  // 1. Record a payment
  await go(page, `/invoices/${biz.invPartial}`, 1800);
  await shot(page, id('tombol'), {
    highlights: [
      H(page.getByRole('button', { name: /Catat Pembayaran/ }), { n: 1, scroll: false }),
      H(page.getByText('Sisa', { exact: true }).first().locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 2, scroll: false, pad: 3 }),
    ],
  });
  await page.getByRole('button', { name: /Catat Pembayaran/ }).click();
  await sleep(700);
  await page.getByRole('dialog').locator('input[type=number]').first().fill('1500000');
  await page.getByPlaceholder(/mis. ref transfer/).fill('TRF-BCA-DEMO-0102');
  await sleep(300);
  await shot(page, id('form'), {
    highlights: [
      H(page.getByRole('dialog').locator('input[type=number]').first(), { n: 1, scroll: false }),
      H(page.getByRole('dialog').getByText('Transfer Bank').first().locator('xpath=ancestor::*[@role="combobox"][1]|..'), { n: 2, scroll: false, badge: 'tr' }),
      H(page.getByRole('dialog').getByRole('button', { name: 'Catat Pembayaran' }), { n: 3, scroll: false, badge: 'tr' }),
    ],
  });
  await page.getByRole('dialog').getByRole('button', { name: 'Catat Pembayaran' }).click();
  await sleep(2500);
  await shot(page, id('hasil'), {
    highlights: [
      H(page.getByText('Dibayar', { exact: true }).first().locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 1, scroll: false, pad: 3 }),
    ],
  });

  // 2. Overdue on the list
  await go(page, '/invoices', 1800);
  await page.getByPlaceholder(/Cari berdasarkan nomor/).fill('Batik');
  await sleep(1200);
  await shot(page, id('jatuh-tempo'), {
    highlights: [
      H(page.getByText('perlu tindakan').first().locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 1, scroll: false, pad: 2 }),
      H(page.getByText('Jatuh Tempo', { exact: true }).last(), { n: 2, scroll: false, pad: 6, badge: 'tr' }),
    ],
  });

}

/** Accounts receivable is wide: capture it at 1440. */
async function piutangLaporan(ctx, page) {
  const { go, shot } = ctx;
  const id = (n) => `piutang-pembayaran/${n}`;
  await go(page, '/accounting/accounts-receivable', 2200);
  await shot(page, id('piutang'), {
    highlights: [
      H(page.getByText('faktur terbuka per tanggal pelaporan').first().locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 1, scroll: false, pad: 2 }),
      H(page.getByRole('combobox').filter({ hasText: /Semua Umur/ }).first(), { n: 2, scroll: false }),
      H(page.getByRole('button', { name: /PDF/ }).first(), { n: 3, scroll: false, badge: 'tr' }),
    ],
  });
}

