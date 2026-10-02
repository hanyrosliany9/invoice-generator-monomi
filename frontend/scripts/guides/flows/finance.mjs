/**
 * Guides (staff, admin): pengeluaran, akuntansi-dasar, aset-penyusutan, vendor-pembelian, gaji, penjualan.
 * Everything the guide creates carries the "(Demo)" marker.
 */
import { scrollTo, DEMO } from '../lib.mjs';

const H = (loc, o = {}) => ({ locator: loc, ...o });

export async function run(ctx) {
  const { page } = await ctx.staff({ w: 1280, h: 820 });
  await pengeluaran(ctx, page);
  await page.close();
  // Financial reports are wide: capture them at 1440 so amounts and dates are not clipped.
  const wide = await ctx.staff({ w: 1440, h: 860 });
  await akuntansi(ctx, wide.page);
  await wide.page.close();
  const { page: p2 } = await ctx.staff({ w: 1280, h: 820 });
  const wide2 = await ctx.staff({ w: 1440, h: 860 });
  await aset(ctx, p2);
  await vendorPembelian(ctx, p2);
  await gaji(ctx, p2);
  await penjualan(ctx, wide2.page);
  await p2.close();
  await wide2.page.close();
}

/* ------------------------------------------------------------------ */
async function pengeluaran(ctx, page) {
  const { ids, go, shot, sleep } = ctx;
  const id = (n) => `pengeluaran/${n}`;

  // 1. List
  await go(page, '/expenses', 1800);
  await shot(page, id('daftar'), {
    highlights: [
      H(page.getByRole('link', { name: /Pengeluaran Baru/ }).or(page.getByRole('button', { name: /Pengeluaran Baru/ })).first(), { n: 1, badge: 'tr' }),
      H(page.getByRole('button', { name: /Kategori/ }).or(page.getByRole('link', { name: /Kategori/ })).first(), { n: 2, badge: 'tr' }),
      H(page.getByPlaceholder(/Cari nomor, vendor/), { n: 3, scroll: false }),
    ],
  });

  // 2. Detail form: category, date, amount
  await go(page, '/expenses/new', 1500);
  await page.getByRole('combobox').filter({ hasText: /Pilih kategori pengeluaran/ }).first().click();
  await sleep(500);
  await page.getByRole('button', { name: /Sewa Properti & Peralatan/ }).first().click().catch(async () => {
    await page.getByText(/Sewa Properti & Peralatan/).first().click();
  });
  await sleep(400);
  await page.getByPlaceholder('0').first().fill('2500000');
  await page.getByPlaceholder(/contoh: Sewa kantor/).fill(`Sewa lighting set untuk syuting iklan ${DEMO}`);
  await page.getByPlaceholder('PT Vendor Indonesia').fill(`Rental Kamera Sinema Jakarta ${DEMO}`);
  await sleep(400);
  await shot(page, id('detail'), {
    highlights: [
      H(page.getByRole('combobox').filter({ hasText: /Sewa Properti/ }).first(), { n: 1, scroll: false }),
      H(page.getByPlaceholder('0').first(), { n: 2, scroll: false }),
      H(page.getByRole('button', { name: 'Bank', exact: true }).locator('xpath=..'), { n: 3, scroll: false, pad: 4, badge: 'tr' }),
    ],
  });

  // 3. Vendor
  await scrollTo(page.getByPlaceholder('PT Vendor Indonesia'), 230);
  await shot(page, id('vendor'), {
    highlights: [
      H(page.getByPlaceholder('PT Vendor Indonesia'), { n: 1, scroll: false }),
      H(page.getByPlaceholder('01.234.567.8-901.000').first(), { n: 2, scroll: false }),
    ],
  });

  // 4. Tax (optional section)
  await page.getByText('PPN & PPh').first().click();
  await sleep(700);
  await page.getByRole('switch').first().click();
  await sleep(700);
  await scrollTo(page.getByText('PPN & PPh').first(), 130);
  await shot(page, id('pajak'), {
    highlights: [
      H(page.getByRole('switch').first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 1, scroll: false, pad: 3 }),
      H(page.getByText('PPH (PAJAK PENGHASILAN)', { exact: false }).first().locator('xpath=following::*[@role="combobox"][1]'), { n: 2, scroll: false, pad: 3 }),
      H(page.getByText('Ringkasan').first().locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 3, scroll: false, pad: 3, badge: 'tr' }),
    ],
  });

  // 5. Project + billable
  const ctxCard = page.getByText('Proyek & Tagihan').first();
  await scrollTo(ctxCard, 130);
  await page.getByRole('combobox').filter({ hasText: /pilih proyek terkait/ }).first().click();
  await sleep(500);
  await page.getByRole('button', { name: /Video Profil Gerai/ }).first().click();
  await sleep(500);
  await shot(page, id('proyek'), {
    highlights: [
      H(page.getByText('Dapat Ditagihkan ke Klien').first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 1, scroll: false, pad: 3 }),
      H(page.getByRole('combobox').filter({ hasText: /Video Profil Gerai/ }).first(), { n: 2, scroll: false }),
    ],
  });

  // 6. Save: the expense is recorded and journalled straight away
  await page.getByRole('button', { name: 'Catat Pengeluaran', exact: true }).last().click();
  await page.waitForURL((u) => u.pathname === '/expenses', { timeout: 20000 });
  await sleep(2200);
  const row = page.getByRole('row').filter({ hasText: 'Sewa lighting set' }).first();
  await shot(page, id('tersimpan'), {
    highlights: [
      H(row, { n: 1, scroll: false, pad: 2 }),
      H(row.getByText(/GL/).first(), { n: 2, scroll: false, pad: 4, badge: 'tr' }),
    ],
  });

  // 7. Detail + journal link
  await row.click();
  await page.waitForURL(/\/expenses\/[a-z0-9]{20,}/, { timeout: 15000 });
  await sleep(2000);
  await shot(page, id('jurnal'), {
    highlights: [
      H(page.getByText('Lihat jurnal').first(), { n: 1, scroll: false, pad: 6 }),
      H(page.getByText('Rincian Pajak').first().locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 2, scroll: false, pad: 3 }),
      H(page.getByRole('button', { name: /^Edit$/ }).or(page.getByRole('link', { name: /^Edit$/ })).first(), { n: 3, scroll: false, badge: 'tr' }),
    ],
  });

  // 8. Categories
  await go(page, '/expenses/categories', 2000);
  await shot(page, id('kategori'), { highlights: [] });
  void ids;
}

/* ------------------------------------------------------------------ */
async function akuntansi(ctx, page) {
  const { go, shot, sleep } = ctx;
  const id = (n) => `akuntansi-dasar/${n}`;

  // 1. Journal list
  await go(page, '/accounting/journal-entries', 2000);
  await shot(page, id('jurnal'), {
    highlights: [
      H(page.getByText('Total Entri').first().locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 1, scroll: false, pad: 2 }),
      H(page.getByRole('combobox').filter({ hasText: /Semua Tipe/ }).first(), { n: 2, scroll: false }),
      H(page.getByRole('link', { name: /Jurnal Baru/ }).or(page.getByRole('button', { name: /Jurnal Baru/ })).first(), { n: 3, scroll: false, badge: 'tr' }),
    ],
  });

  // 2. New manual journal: header
  await go(page, '/accounting/journal-entries/create', 1800);
  await page.getByPlaceholder(/Deskripsi lengkap/).fill('Setoran modal awal pemilik (Demo)');
  await page.getByPlaceholder(/Contoh: INV-2026-001/).fill('BKM-DEMO-001');
  await sleep(300);
  await shot(page, id('jurnal-baru'), {
    highlights: [
      H(page.getByText('Tipe Transaksi', { exact: false }).first().locator('xpath=following::*[@role="combobox"][1]'), { n: 1, scroll: false }),
      H(page.getByPlaceholder(/Deskripsi lengkap/), { n: 2, scroll: false }),
      H(page.getByPlaceholder(/Contoh: INV-2026-001/), { n: 3, scroll: false }),
    ],
  });

  // 3. Lines: debit Bank, credit Owner Capital
  const pickAccount = async (nth, code) => {
    await page.getByRole('combobox').filter({ hasText: /Pilih akun|Pilih a/ }).first().click();
    await sleep(400);
    await page.getByPlaceholder(/Cari/).last().fill(code);
    await sleep(500);
    await page.getByRole('button', { name: new RegExp(code) }).first().click();
    await sleep(300);
    void nth;
  };
  await pickAccount(0, '1-1020');
  await pickAccount(1, '3-1010');
  const nums = page.locator('input[type=number]');
  await nums.nth(0).fill('150000000');
  await nums.nth(3).fill('150000000');
  await sleep(500);
  await scrollTo(page.getByText('Item Jurnal').first(), 120);
  await shot(page, id('jurnal-baris'), {
    highlights: [
      H(page.getByText('Item Jurnal').first().locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 1, scroll: false, pad: 2 }),
      H(page.getByText('Saldo Jurnal').first().locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 2, scroll: false, pad: 2, badge: 'tr' }),
      H(page.getByRole('button', { name: /Simpan & Posting/ }), { n: 3, scroll: false, badge: 'tr' }),
    ],
  });
  await page.getByRole('button', { name: /Simpan & Posting/ }).click();
  await sleep(3000);

  // 4. Cash & bank
  await go(page, '/accounting/cash-bank-balance', 2200);
  await page.getByRole('button', { name: /Hitung Ulang/ }).click().catch(() => {});
  await sleep(3000);
  await shot(page, id('kas-bank'), {
    highlights: [
      H(page.getByRole('combobox').filter({ hasText: /2026/ }).first(), { n: 1, scroll: false }),
      H(page.getByText('Total Kas & Bank').first().locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 2, scroll: false, pad: 2 }),
      H(page.getByRole('button', { name: /Hitung Ulang/ }), { n: 3, scroll: false, badge: 'tr' }),
    ],
  });

  // 5. Income statement
  await go(page, '/accounting/income-statement', 2200);
  await shot(page, id('laba-rugi'), {
    highlights: [
      H(page.getByRole('button', { name: /1 Oktober 2026/ }).first().locator('xpath=ancestor::div[1]'), { n: 1, scroll: false, pad: 4 }),
      H(page.getByRole('button', { name: /Ekspor/ }), { n: 2, scroll: false, badge: 'tr' }),
    ],
  });

  // 6. Balance sheet
  await go(page, '/accounting/balance-sheet', 2200);
  await shot(page, id('neraca'), {
    highlights: [H(page.getByText(/Neraca seimbang|Neraca tidak seimbang/).first(), { n: 1, scroll: false, pad: 6 })],
  });

  // 7. Chart of accounts
  await go(page, '/accounting/chart-of-accounts', 2000);
  await shot(page, id('bagan-akun'), {
    highlights: [
      H(page.getByPlaceholder(/Cari kode atau nama akun/), { n: 1, scroll: false }),
      H(page.getByRole('button', { name: /Akun Baru/ }), { n: 2, scroll: false, badge: 'tr' }),
    ],
  });
}

/* ------------------------------------------------------------------ */
async function aset(ctx, page) {
  const { ids, go, shot, sleep } = ctx;
  const id = (n) => `aset-penyusutan/${n}`;
  void ids;

  // 1. List
  await go(page, '/assets', 1800);
  await shot(page, id('daftar'), {
    highlights: [
      H(page.getByRole('link', { name: /Aset Baru/ }).or(page.getByRole('button', { name: /Aset Baru/ })).first(), { n: 1, badge: 'tr' }),
      H(page.getByPlaceholder(/Cari kode, nama/), { n: 2, scroll: false }),
    ],
  });

  // 2. New asset: identity + acquisition
  await go(page, '/assets/new', 1500);
  await page.getByPlaceholder('Canon EOS R5').fill(`Lensa Sigma 24-70mm f/2.8 ${DEMO}`);
  await page.getByRole('combobox').filter({ hasText: /Pilih kategori/ }).first().click();
  await sleep(500);
  await page.getByRole('option', { name: 'Lens' }).first().click();
  await sleep(400);
  await page.getByPlaceholder('PT Sumber Berkah Kamera').fill('Toko Elektronik Maju Jaya');
  await page.locator('input[placeholder="0"]').first().fill('18500000');
  await sleep(400);
  await shot(page, id('identitas'), {
    highlights: [
      H(page.getByPlaceholder('Canon EOS R5'), { n: 1, scroll: false }),
      H(page.getByRole('combobox').filter({ hasText: /Lens/ }).first(), { n: 2, scroll: false }),
    ],
  });
  await scrollTo(page.getByRole('heading', { name: 'Akuisisi', exact: true }), 120);
  await shot(page, id('akuisisi'), {
    highlights: [
      H(page.locator('input[placeholder="0"]').first(), { n: 1, scroll: false }),
      H(page.getByText('SUMBER DANA', { exact: false }).first().locator('xpath=following::*[@role="combobox"][1]'), { n: 2, scroll: false }),
    ],
  });

  // 3. Depreciation section
  await scrollTo(page.getByRole('heading', { name: 'Penyusutan', exact: true }), 120);
  await page.getByRole('combobox').filter({ hasText: /Pilih kelompok/ }).first().click();
  await sleep(500);
  await page.getByRole('option').first().click();
  await sleep(500);
  await shot(page, id('penyusutan-form'), {
    highlights: [
      H(page.getByText('KELOMPOK PENYUSUTAN', { exact: false }).first().locator('xpath=following::*[@role="combobox"][1]'), { n: 1, scroll: false }),
      H(page.getByText('UMUR EKONOMIS', { exact: false }).first().locator('xpath=following::input[1]'), { n: 2, scroll: false, badge: 'tr' }),
      H(page.getByText('NILAI SISA', { exact: false }).first().locator('xpath=following::input[1]'), { n: 3, scroll: false }),
    ],
  });

  // 4. Save -> asset detail with the depreciation scheme
  await page.getByRole('button', { name: 'Simpan', exact: true }).first().click();
  await page.waitForURL(/\/assets\/[a-z0-9]{20,}/, { timeout: 20000 });
  await sleep(2200);
  await shot(page, id('detail'), {
    highlights: [
      H(page.getByRole('heading', { name: 'Skema Penyusutan' }).locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 1, scroll: true, pad: 3 }),
      H(page.getByRole('button', { name: /Proses Penyusutan/ }), { n: 2, scroll: false, badge: 'tr' }),
    ],
  });

  // 5. Monthly depreciation page
  await go(page, '/accounting/depreciation', 2200);
  await shot(page, id('proses'), {
    highlights: [
      H(page.getByRole('button', { name: /Proses Depresiasi/ }), { n: 1, scroll: false, badge: 'tr' }),
      H(page.getByText('Total Akumulasi').first().locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 2, scroll: false, pad: 2 }),
    ],
  });
}

/* ------------------------------------------------------------------ */
async function vendorPembelian(ctx, page) {
  const { go, shot, sleep } = ctx;
  const id = (n) => `vendor-pembelian/${n}`;

  // 1. Vendor list
  await go(page, '/vendors', 1800);
  await shot(page, id('daftar'), {
    highlights: [
      H(page.getByRole('link', { name: /Vendor Baru/ }).or(page.getByRole('button', { name: /Vendor Baru/ })).first(), { n: 1, badge: 'tr' }),
      H(page.getByPlaceholder(/Cari nama, kode/), { n: 2, scroll: false }),
    ],
  });

  // 2. New vendor
  await go(page, '/vendors/new', 1500);
  await page.getByPlaceholder(/Nama resmi vendor/).fill(`Studio Foto Cahaya ${DEMO}`);
  await page.getByPlaceholder('Nama narahubung utama').fill('Hendra Kusuma');
  await page.getByPlaceholder('kontak@vendor.co.id').fill('demo.cahaya@contoh.co.id');
  await page.getByPlaceholder('+62 21 5555 0000').fill('+62 22 5550 7788');
  await shot(page, id('identitas'), {
    highlights: [
      H(page.getByPlaceholder(/Nama resmi vendor/), { n: 1, scroll: false }),
      H(page.getByPlaceholder('Nama narahubung utama'), { n: 2, scroll: false }),
      H(page.getByPlaceholder('kontak@vendor.co.id'), { n: 3, scroll: false }),
    ],
  });
  await scrollTo(page.getByRole('heading', { name: /Pajak & NPWP/ }), 130);
  await shot(page, id('pajak'), {
    highlights: [
      H(page.getByRole('heading', { name: /Pajak & NPWP/ }).locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 1, scroll: false, pad: 3 }),
    ],
  });
  await scrollTo(page.getByRole('heading', { name: /Perbankan & Pembayaran/ }), 130);
  await shot(page, id('bank'), {
    highlights: [
      H(page.getByRole('heading', { name: /Perbankan & Pembayaran/ }).locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 1, scroll: false, pad: 3 }),
    ],
  });
  await page.getByRole('button', { name: 'Simpan', exact: true }).first().click();
  await sleep(3000);

  // 3. New purchase (credit -> Hutang Usaha)
  await go(page, '/accounting/purchases/new', 1800);
  await page.getByRole('combobox').filter({ hasText: /Pilih vendor/ }).first().click();
  await sleep(500);
  await page.getByRole('option', { name: /Rental Kamera Sinema/ }).first().click();
  await sleep(400);
  await page.getByPlaceholder(/cth. Beli meja kantor/).fill('Sewa kamera cinema 2 hari');
  await page.getByRole('combobox').filter({ hasText: /Pilih akun/ }).first().click();
  await sleep(500);
  await page.getByRole('option', { name: /5-3020/ }).first().click();
  await sleep(400);
  await page.getByPlaceholder('0').first().fill('3500000');
  await sleep(500);
  await shot(page, id('pembelian'), {
    highlights: [
      H(page.getByRole('combobox').filter({ hasText: /Rental Kamera/ }).first(), { n: 1, scroll: false }),
      H(page.getByRole('combobox').filter({ hasText: /Hutang Usaha/ }).first(), { n: 2, scroll: false }),
      H(page.getByPlaceholder(/cth. Beli meja kantor/), { n: 3, scroll: false }),
      H(page.getByRole('button', { name: /Simpan Pembelian/ }), { n: 4, scroll: false, badge: 'tr' }),
    ],
  });
  await page.getByRole('button', { name: /Simpan Pembelian/ }).click();
  await sleep(3000);

  // 4. Accounts payable
  await go(page, '/accounting/accounts-payable', 2200);
  await shot(page, id('hutang'), {
    highlights: [
      H(page.getByRole('button', { name: /PDF/ }).first(), { n: 1, scroll: false, badge: 'tr' }),
    ],
  });
}

/* ------------------------------------------------------------------ */
async function gaji(ctx, page) {
  const { go, shot, sleep } = ctx;
  const id = (n) => `gaji/${n}`;

  // 1. Staff list
  await go(page, '/salaries', 2000);
  await shot(page, id('karyawan'), {
    highlights: [
      H(page.getByRole('link', { name: /Tambah Karyawan/ }).or(page.getByRole('button', { name: /Tambah Karyawan/ })).first(), { n: 1, badge: 'tr' }),
      H(page.getByRole('button', { name: /Pembayaran Baru/ }).or(page.getByRole('link', { name: /Pembayaran Baru/ })).first(), { n: 2, badge: 'tr' }),
    ],
  });

  // 2. New staff
  await go(page, '/salaries/staff/new', 1500);
  await page.getByPlaceholder('Budi Santoso').fill(`Dina Kamerawati ${DEMO}`);
  await page.getByPlaceholder('Videografer').fill('Asisten Kamera');
  await page.getByPlaceholder('budi@example.com').fill('demo.dina@contoh.co.id');
  await page.getByPlaceholder('5000000').fill('4500000');
  await page.getByPlaceholder('BCA / Mandiri / BRI').fill('BCA');
  await page.getByPlaceholder('1234567890').fill('7771239999');
  await shot(page, id('karyawan-baru'), {
    highlights: [
      H(page.getByPlaceholder('Budi Santoso'), { n: 1, scroll: false }),
      H(page.getByPlaceholder('5000000'), { n: 2, scroll: false }),
      H(page.getByRole('button', { name: 'Buat Karyawan' }), { n: 3, scroll: false, badge: 'tr' }),
    ],
  });
  await page.getByRole('button', { name: 'Buat Karyawan' }).click();
  await sleep(2500);

  // 3. New salary payment
  await go(page, '/salaries/payments/new', 1800);
  await page.getByRole('combobox').filter({ hasText: /Pilih karyawan/ }).first().click();
  await sleep(500);
  await page.getByRole('button', { name: /Dina Kamerawati/ }).first().click();
  await sleep(500);
  await page.getByPlaceholder('0').first().fill('300000');
  await sleep(500);
  await shot(page, id('pembayaran'), {
    highlights: [
      H(page.getByRole('combobox').filter({ hasText: /Dina/ }).first(), { n: 1, scroll: false }),
      H(page.getByText('Tunjangan (IDR)').first().locator('xpath=following::input[1]'), { n: 2, scroll: false }),
      H(page.getByText('Ringkasan Pembayaran').first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 3, scroll: false, pad: 3, badge: 'tr' }),
    ],
  });
  await page.getByRole('button', { name: 'Buat Pembayaran' }).click();
  await sleep(2500);

  // 4. Payments tab
  await go(page, '/salaries', 2000);
  await page.getByText('Pembayaran', { exact: true }).first().click();
  await sleep(1500);
  await shot(page, id('draft'), { highlights: [] });
}

/* ------------------------------------------------------------------ */
async function penjualan(ctx, page) {
  const { go, shot, sleep } = ctx;
  const id = (n) => `penjualan/${n}`;

  // 1. Sales report
  await go(page, '/accounting/sales', 2200);
  await shot(page, id('laporan'), {
    highlights: [
      H(page.getByText('Belum Lunas').first().locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 1, scroll: false, pad: 2 }),
      H(page.getByRole('button', { name: /\+ Penjualan/ }).or(page.getByRole('link', { name: /\+ Penjualan/ })).first(), { n: 2, scroll: false, badge: 'tr' }),
      H(page.getByRole('button', { name: 'Tandai Lunas' }).first(), { n: 3, scroll: false, badge: 'tr' }),
    ],
  });

  // 2. Mark a receivable as paid (dialog only; confirmed by the reader)
  await page.getByRole('button', { name: 'Tandai Lunas' }).first().click();
  await sleep(700);
  await shot(page, id('lunas'), {
    highlights: [
      H(page.getByRole('dialog').getByText('Terima ke', { exact: false }).first().locator('xpath=following::*[@role="combobox"][1]'), { n: 1, scroll: false, pad: 3 }),
      H(page.getByRole('dialog').getByRole('button', { name: 'Tandai Lunas' }), { n: 2, scroll: false, badge: 'tr' }),
    ],
  });
  await page.keyboard.press('Escape');
  await sleep(400);

  // 3. New sale
  await go(page, '/accounting/sales/new', 1800);
  await page.getByRole('combobox').filter({ hasText: /Pilih pelanggan/ }).first().click();
  await sleep(500);
  await page.getByRole('option', { name: /Kopi Senja/ }).first().click();
  await sleep(400);
  await page.getByPlaceholder(/cth. Jasa Fotografi/).fill('Jasa fotografi event pembukaan gerai');
  await page.getByRole('combobox').filter({ hasText: /Pilih akun/ }).first().click();
  await sleep(500);
  await page.getByRole('option', { name: /4-1010/ }).first().click();
  await sleep(400);
  await page.getByPlaceholder('0').first().fill('2500000');
  await sleep(500);
  await shot(page, id('baru'), {
    highlights: [
      H(page.getByRole('combobox').filter({ hasText: /Kopi Senja/ }).first(), { n: 1, scroll: false }),
      H(page.getByRole('combobox').filter({ hasText: /Piutang Usaha/ }).first(), { n: 2, scroll: false }),
      H(page.getByPlaceholder(/cth. Jasa Fotografi/), { n: 3, scroll: false }),
      H(page.getByRole('button', { name: /Simpan Penjualan/ }), { n: 4, scroll: false, badge: 'tr' }),
    ],
  });
}
