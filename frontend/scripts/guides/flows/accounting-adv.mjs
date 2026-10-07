/**
 * Guide: akuntansi-lanjutan (admin: where to find the ledger and the reports beyond the basic ones, and what each tells you).
 * The base seed has expenses, invoices and payments; seed-extra.mjs adds opening capital and three purchases (two on credit).
 * Read-only: nothing is posted (the "Hitung ECL" dialog is cancelled).
 */
import { seedAccounting } from '../seed-extra.mjs';

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

  // 1. General ledger ------------------------------------------------------------------------------------------------------
  await go(page, '/accounting/general-ledger', 2800);
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
  await shot(page, id('arus-kas'), {
    highlights: [
      H(page.getByText('Operasional', { exact: true }).first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 1, pad: 4, scroll: false }),
      H(page.getByText('Investasi', { exact: true }).first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 2, pad: 4, scroll: false }),
      H(page.getByRole('button', { name: /Ekspor/ }), { n: 3, pad: 4, scroll: false, badge: 'tr' }),
    ],
  });

  // 4. Receivables aging ----------------------------------------------------------------------------------------------------------
  await go(page, '/accounting/ar-aging', 2800);
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
  await shot(page, id('aging-hutang'), {
    highlights: [
      H(gridWith('Belum J.T.'), { n: 1, pad: 3, scroll: false }),
      H(page.getByText('Analisis Umur per Kategori').first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 2, pad: 4, scroll: false }),
    ],
  });

  // 6. Purchase report --------------------------------------------------------------------------------------------------------------
  await go(page, '/accounting/purchases', 2800);
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
  await shot(page, id('ecl'), {
    highlights: [
      H(dlg.getByText(/Tanggal Perhitungan/i).first().locator('xpath=ancestor::div[1]'), { n: 1, pad: 4, scroll: false }),
      H(dlg.getByText(/Opsi Posting/i).first().locator('xpath=ancestor::div[1]'), { n: 2, pad: 4, scroll: false }),
      H(dlg.getByRole('button', { name: 'Hitung ECL' }), { n: 3, pad: 4, scroll: false }),
    ],
  });
  await dlg.getByRole('button', { name: 'Batal' }).click();
  await sleep(500);
  void dateButtons; void panelOf;
  await page.close();
}
