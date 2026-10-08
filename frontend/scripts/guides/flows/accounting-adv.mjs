/**
 * Guide: akuntansi-lanjutan (admin: where to find the ledger and the reports beyond the basic ones, and what each tells you).
 * The base seed has expenses, invoices and payments; seed-extra.mjs adds opening capital and three purchases (two on credit).
 * Read-only: nothing is posted (the "Hitung ECL" dialog is cancelled).
 */
import { seedAccounting } from '../seed-extra.mjs';
import { showAccountingSidebar } from '../lib.mjs';

const SLUG = 'akuntansi-lanjutan';
const id = (n) => `${SLUG}/${n}`;
const H = (loc, o = {}) => ({ locator: loc, ...o });

export async function run(ctx) {
  const { ids, go, shot, sleep } = ctx;
  await seedAccounting(ids);
  const { page } = await ctx.staff({ w: 1440, h: 1000 });
  const gridWith = (text) => page.locator('.grid').filter({ hasText: text }).last();
  const panelOf = (loc) => loc.locator('xpath=ancestor::*[contains(@class,"rounded")][1]');
  const dateButtons = page.locator('button').filter({ hasText: /^\s*\d{1,2} \w+\.{0,3}\s*\d{0,4}/ });

  // lib.shot() scrolls the sidebar to the Akuntansi section and opens "Kas & Bank" on /accounting pages; the shots of the
  // dialogs on a second page call it explicitly through showSidebar.
  const showSidebar = (pg = page) => showAccountingSidebar(pg);

  // 1. General ledger ------------------------------------------------------------------------------------------------------
  await go(page, '/accounting/general-ledger', 2800);
  await showSidebar();
  await shot(page, id('buku-besar'), {
    highlights: [
      H(gridWith('Total Entri'), { n: 1, pad: 3, scroll: false }),
      H(page.getByPlaceholder(/Cari kode akun/), { n: 2, pad: 4, scroll: false }),
      H(page.locator('table').first(), { n: 3, pad: 4, scroll: false }),
      H(page.getByRole('button', { name: /Ekspor/ }), { n: 4, pad: 4, scroll: false, badge: 'tr' }),
    ],
  });

  // 2. Trial balance ----------------------------------------------------------------------------------------------------------
  await go(page, '/accounting/trial-balance', 2800);
  await showSidebar();
  await shot(page, id('neraca-saldo'), {
    highlights: [
      H(page.getByText(/Buku besar seimbang/), { n: 1, pad: 6, scroll: false }),
      H(page.getByPlaceholder(/Cari kode atau nama akun/), { n: 2, pad: 4, scroll: false }),
      H(page.locator('table').first(), { n: 3, pad: 3, scroll: false }),
      H(page.getByRole('button', { name: /Ekspor/ }), { n: 4, pad: 4, scroll: false, badge: 'tr' }),
    ],
  });

  // 3. Cash flow ---------------------------------------------------------------------------------------------------------------
  await go(page, '/accounting/cash-flow', 2800);
  await showSidebar();
  await shot(page, id('arus-kas'), {
    highlights: [
      H(page.getByText('Operasional', { exact: true }).first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 1, pad: 4, scroll: false }),
      H(page.getByText('Investasi', { exact: true }).first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 2, pad: 4, scroll: false }),
      H(page.getByRole('button', { name: /Ekspor/ }), { n: 3, pad: 4, scroll: false, badge: 'tr' }),
    ],
  });

  // 4. Receivables aging ----------------------------------------------------------------------------------------------------------
  await go(page, '/accounting/ar-aging', 2800);
  await showSidebar();
  await shot(page, id('aging-piutang'), {
    highlights: [
      H(gridWith('Belum J.T.'), { n: 1, pad: 3, scroll: false }),
      H(page.getByText('Analisis Umur per Klien').first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 2, pad: 4, scroll: false }),
      H(page.getByRole('button', { name: 'PDF' }), { n: 3, pad: 4, scroll: false }),
      H(page.getByRole('button', { name: 'Excel' }), { n: 4, pad: 4, scroll: false, badge: 'tr' }),
    ],
  });

  // 5. Payables aging --------------------------------------------------------------------------------------------------------------
  await go(page, '/accounting/ap-aging', 2800);
  await showSidebar();
  await shot(page, id('aging-hutang'), {
    highlights: [
      H(gridWith('Belum J.T.'), { n: 1, pad: 3, scroll: false }),
      H(page.getByText('Analisis Umur per Kategori').first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 2, pad: 4, scroll: false }),
    ],
  });

  // 6. Purchase report --------------------------------------------------------------------------------------------------------------
  await go(page, '/accounting/purchases', 2800);
  await showSidebar();
  await shot(page, id('laporan-pembelian'), {
    highlights: [
      H(gridWith('Total Pembelian'), { n: 1, pad: 3, scroll: false }),
      H(page.locator('table').first(), { n: 2, pad: 4, scroll: false }),
      H(page.getByRole('button', { name: /\+ Pembelian/ }).or(page.getByRole('link', { name: /\+ Pembelian/ })).first(), { n: 3, pad: 4, scroll: false, badge: 'tr' }),
    ],
  });

  // 7. Adjusting entry wizard ----------------------------------------------------------------------------------------------------------
  await go(page, '/accounting/adjusting-entries', 2500);
  await page.getByText('Beban Dibayar Dimuka', { exact: true }).first().click();
  await sleep(700);
  await showSidebar();
  await shot(page, id('jurnal-penyesuaian'), {
    highlights: [
      H(page.getByText('Pilih Tipe', { exact: true }).first().locator('xpath=ancestor::div[1]'), { n: 1, pad: 4, scroll: false }),
      H(page.getByText('Beban Dibayar Dimuka', { exact: true }).first().locator('xpath=ancestor::button[1]'), { n: 2, pad: 4, scroll: false }),
      H(page.getByRole('button', { name: /Lanjut/ }), { n: 3, pad: 4, scroll: false, badge: 'tr' }),
    ],
  });

  // 8. ECL provision (the dialog is cancelled: nothing is posted) ---------------------------------------------------------------------------
  await go(page, '/accounting/ecl-provisions', 2800);
  await page.getByRole('button', { name: /Hitung ECL/ }).first().click();
  await sleep(1200);
  const dlg = page.getByRole('dialog');
  await showSidebar();
  await shot(page, id('ecl'), {
    highlights: [
      H(dlg.getByText(/Tanggal Perhitungan/i).first().locator('xpath=ancestor::div[1]'), { n: 1, pad: 4, scroll: false }),
      H(dlg.getByText(/Opsi Posting/i).first().locator('xpath=ancestor::div[1]'), { n: 2, pad: 4, scroll: false }),
      H(dlg.getByRole('button', { name: 'Hitung ECL' }), { n: 3, pad: 4, scroll: false }),
    ],
  });
  await dlg.getByRole('button', { name: 'Batal' }).click();
  await sleep(500);

  // 9. Cash & Bank: the three forms are opened and filled but never saved, so nothing is posted -------------------------------------
  const dialog = page.getByRole('dialog');
  const combo = async (root, labelRe, optionRe) => {
    await root.locator('label', { hasText: labelRe }).locator('xpath=..').getByRole('combobox').click();
    await sleep(400);
    await page.keyboard.type(optionRe, { delay: 60 }); // the account picker is a searchable popover: type the code, Enter picks the first match
    await sleep(300);
    await page.keyboard.press('Enter');
    await sleep(400);
  };
  const field = (root, labelRe) => root.locator('label', { hasText: labelRe }).locator('xpath=..');
  const dayIn = async (pg, root, labelRe, d) => {
    await root.locator('label', { hasText: labelRe }).locator('xpath=..').getByRole('button').click();
    await sleep(500);
    await pg.locator('[role=gridcell] button').filter({ hasText: new RegExp(`^${d}$`) }).first().click();
    await sleep(500);
  };
  const type = async (loc, text) => { await loc.click(); await loc.fill(text); await sleep(250); };

  await go(page, '/accounting/cash-receipts', 2500);
  await page.getByRole('button', { name: 'Penerimaan Baru' }).first().click();
  await sleep(900);
  await combo(dialog, /^Diterima di/, '1-1020');
  await combo(dialog, /^Sumber/, '4-1010');
  await type(field(dialog, /^Jumlah/).locator('input'), '7500000');
  await type(field(dialog, /^Deskripsi/).locator('input'), 'Pelunasan jasa dokumentasi acara (Demo)');
  await showSidebar();
  await shot(page, id('kas-masuk-keluar'), {
    highlights: [
      H(field(dialog, /^Jumlah/), { n: 1, pad: 4, scroll: false }),
      H(field(dialog, /^Diterima di/), { n: 2, pad: 4, scroll: false }),
      H(field(dialog, /^Sumber/), { n: 3, pad: 4, scroll: false }),
      H(dialog.getByRole('button', { name: 'Simpan sebagai draft' }), { n: 4, pad: 4, scroll: false, badge: 'tr' }),
    ],
  });
  await dialog.getByRole('button', { name: 'Batal' }).click();
  await sleep(500);

  await go(page, '/accounting/bank-transfers', 2500);
  await page.getByRole('button', { name: 'Transfer Baru' }).first().click();
  await sleep(900);
  const pickSelect = async (labelRe, optionRe) => {
    await field(dialog, labelRe).getByRole('combobox').click();
    await sleep(400);
    await page.getByRole('option', { name: optionRe }).first().click();
    await sleep(400);
  };
  await dayIn(page, dialog, /^Tanggal Transfer/, 7);
  await pickSelect(/^Dari Akun/, /1-1020/);
  await pickSelect(/^Ke Akun/, /1-1010/);
  await type(field(dialog, /^Jumlah Transfer/).locator('input'), '5000000');
  await type(field(dialog, /^Biaya Transfer/).locator('input'), '6500');
  await pickSelect(/^Akun Biaya/, /6-2160/);
  await type(field(dialog, /^Deskripsi/).locator('textarea'), 'Tarik tunai untuk kas kecil kantor (Demo)');
  await showSidebar();
  await shot(page, id('transfer-bank'), {
    highlights: [
      H(field(dialog, /^Dari Akun/).getByRole('combobox'), { n: 1, pad: 4, scroll: false }),
      H(field(dialog, /^Ke Akun/).getByRole('combobox'), { n: 2, pad: 4, scroll: false }),
      H(field(dialog, /^Jumlah Transfer/).locator('input'), { n: 3, pad: 4, scroll: false }),
      H(field(dialog, /^Biaya Transfer/).locator('input'), { n: 4, pad: 4, scroll: false }),
      H(dialog.getByRole('button', { name: 'Buat Transfer' }), { n: 5, pad: 4, scroll: false, badge: 'tr' }),
    ],
  });
  await dialog.getByRole('button', { name: 'Batal' }).click();
  await sleep(500);
  await page.close();

  // Bank reconciliation: a taller page, so the whole dialog (balances, adjustments, result) fits
  const { page: tall } = await ctx.staff({ w: 1440, h: 1500 });
  await go(tall, '/accounting/bank-reconciliations', 2500);
  await tall.getByRole('button', { name: 'Rekonsiliasi Baru' }).first().click();
  await sleep(900);
  const dlg2 = tall.getByRole('dialog');
  const f2 = (re) => dlg2.locator('label', { hasText: re }).locator('xpath=..');
  await f2(/^Akun Bank/).getByRole('combobox').click();
  await sleep(400);
  await tall.getByRole('option', { name: /1-1020/ }).first().click();
  await sleep(400);
  const day = (re, d) => dayIn(tall, dlg2, re, d);
  await day(/^Tanggal Statement/, 7);
  await day(/^Mulai Periode/, 1);
  await day(/^Akhir Periode/, 7);
  await type(f2(/^Referensi Statement/).locator('input'), 'RK-OKT-DEMO (Demo)');
  await type(f2(/^Saldo Buku Akhir/).locator('input'), '112000000');
  await type(f2(/^Saldo Bank Statement/).locator('input'), '112500000');
  await type(f2(/^Outstanding Checks|^Cek Beredar/).locator('input'), '350000');
  await type(f2(/^Biaya Bank/).locator('input'), '50000');
  await type(f2(/^Bunga Bank/).locator('input'), '200000');
  await showSidebar(tall);
  await shot(tall, id('rekonsiliasi-bank'), {
    highlights: [
      H(f2(/^Akun Bank/), { n: 1, pad: 4, scroll: false }),
      H(f2(/^Saldo Bank Statement/), { n: 2, pad: 4, scroll: false }),
      H(dlg2.getByText('Item Penyesuaian').locator('xpath=ancestor::div[1]'), { n: 3, pad: 4, scroll: false }),
      H(dlg2.getByText('Hasil Perhitungan').locator('xpath=ancestor::div[1]'), { n: 4, pad: 4, scroll: false }),
      H(dlg2.getByRole('button', { name: 'Buat Rekonsiliasi' }), { n: 5, pad: 4, scroll: false, badge: 'tr' }),
    ],
  });
  await dlg2.getByRole('button', { name: 'Batal' }).click();
  await sleep(500);
  await tall.close();
  void dateButtons; void panelOf;
}
