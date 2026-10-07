/**
 * Guide: invoice-manual (admin: an invoice made by hand at /invoices/new, without a quotation).
 * The invoice is created for a (Demo) client, so cleanup removes it with the client. Nothing is sent.
 */
import { scrollTo, fillStable } from '../lib.mjs';

const SLUG = 'invoice-manual';
const id = (n) => `${SLUG}/${n}`;
const H = (loc, o = {}) => ({ locator: loc, ...o });

/** Pick an option of a searchable combobox (the invoice form uses its own Combobox, not a Radix select). */
async function pick(page, trigger, text) {
  await trigger.click();
  await page.waitForTimeout(500);
  await page.locator('button[data-index]').filter({ hasText: text }).first().click();
  await page.waitForTimeout(500);
}

export async function run(ctx) {
  const { ids, go, shot, sleep } = ctx;
  const { page } = await ctx.staff({ w: 1280, h: 900 });

  // 1. Start from the list ---------------------------------------------------------------------------------------
  await go(page, '/invoices', 1800);
  await shot(page, id('buka'), {
    highlights: [
      H(page.getByRole('link', { name: /Invoice Baru/ }).or(page.getByRole('button', { name: /Invoice Baru/ })).first(), { n: 1, badge: 'tr' }),
    ],
  });
  await page.getByRole('link', { name: /Invoice Baru/ }).or(page.getByRole('button', { name: /Invoice Baru/ })).first().click();
  await page.waitForURL(/invoices\/new/);
  await sleep(1500);

  // 2. Client, project, dates -------------------------------------------------------------------------------------------
  const combos = page.getByRole('combobox');
  await pick(page, combos.nth(0), /Batik Pesisir/);
  await pick(page, combos.nth(1), /Katalog Foto Koleksi Batik/);
  await sleep(1200); // the project's products fill the item rows
  await scrollTo(page.getByRole('heading', { name: 'Invoice Baru' }), 40);
  const dates = page.locator('button').filter({ hasText: /^\s*\d{1,2} \w+ \d{4}\s*$/ });
  await shot(page, id('klien-proyek'), {
    highlights: [
      H(combos.nth(0), { n: 1, pad: 3, scroll: false }),
      H(combos.nth(1), { n: 2, pad: 3, scroll: false, badge: 'tr' }),
      H(dates.nth(0), { n: 3, pad: 3, scroll: false, badge: 'tr' }),
      H(dates.nth(1), { n: 4, pad: 3, scroll: false }),
    ],
  });

  // PPN off first: a total of exactly Rp 5.000.000 has no stamp duty yet (see the ppn step)
  const ppn = page.getByText(/^PPN \(11%\)/).locator('xpath=ancestor::label[1]');
  await ppn.click();
  await sleep(400);

  // 3. Item rows: the project's product is already there; add one more row ----------------------------------------------
  await page.getByRole('button', { name: /Tambah Baris/ }).click();
  await sleep(500);
  const nameInputs = page.getByPlaceholder('Nama item / layanan');
  const last = nameInputs.last();
  await fillStable(last, 'Retouch tambahan 10 foto', { settle: 400 });
  const rows = page.locator('input[type=number]');
  const count = await rows.count();
  // qty then price of the last row are the last two number inputs
  await fillStable(rows.nth(count - 1), '500000', { settle: 400 });
  await sleep(400);
  const itemsTitle = page.getByText('Baris Item', { exact: true });
  await scrollTo(itemsTitle, 130);
  await shot(page, id('item'), {
    highlights: [
      H(nameInputs.first(), { n: 1, pad: 5, scroll: false }),
      H(page.getByRole('button', { name: /Tambah Baris/ }), { n: 2, pad: 5, scroll: false }),
      H(page.getByLabel('Hapus baris').last(), { n: 3, pad: 5, scroll: false, badge: 'tr' }),
    ],
  });

  // 4. PPN off: the total is exactly Rp 5.000.000 -> no materai -----------------------------------------------------------
  const summary = page.getByText('Ringkasan', { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded")][1]');
  await page.evaluate(() => window.scrollTo(0, 0));
  await scrollTo(page.getByRole('heading', { name: 'Invoice Baru' }), 40).catch(() => {});
  await sleep(400);
  await shot(page, id('ppn'), {
    highlights: [
      H(ppn, { n: 1, pad: 2, scroll: false }),
      H(page.getByText('Total', { exact: true }).locator('xpath=..'), { n: 2, pad: 3, scroll: false }),
    ],
  });

  // 5. PPN on: the total passes Rp 5.000.000 -> materai appears automatically ----------------------------------------------
  await ppn.click();
  await sleep(700);
  await shot(page, id('materai'), {
    highlights: [
      H(page.getByText('auto', { exact: true }).locator('xpath=ancestor::div[1]'), { n: 1, pad: 3, scroll: false }),
      H(page.getByText('Materai diperlukan').locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 2, pad: 6, scroll: false }),
    ],
  });

  // 6. Payment information and terms -----------------------------------------------------------------------------------------
  const finePrint = page.getByText('Informasi Pembayaran & Syarat', { exact: true });
  await scrollTo(finePrint, 100);
  await sleep(500);
  await shot(page, id('pembayaran'), {
    highlights: [
      H(page.locator('textarea.font-mono'), { n: 1, pad: 5, scroll: false }),
      H(page.getByRole('button', { name: /Pakai default/ }), { n: 2, pad: 5, scroll: false }),
      H(page.locator('textarea').last(), { n: 3, pad: 5, scroll: false }),
    ],
  });

  // 7. Save as a draft ---------------------------------------------------------------------------------------------------------
  await page.getByRole('button', { name: /^Simpan$/ }).click();
  await page.waitForURL(/\/invoices\/(?!new)[^/]+$/, { timeout: 20000 });
  await sleep(2200);
  await shot(page, id('simpan'), {
    highlights: [
      H(page.getByText(/^Draf$/).first(), { n: 1, pad: 6, scroll: false }),
      H(page.getByRole('button', { name: /^Kirim$/ }), { n: 2, pad: 5, scroll: false }),
      H(page.getByRole('button', { name: /Tindakan lainnya/ }).first(), { n: 3, pad: 5, scroll: false }),
    ],
  });
  void summary;
  await page.close();
}
