/**
 * Guide: laporan-bisnis (the /reports catalogue, the monthly business report, the four system reports) and
 * analitik-milestone (/milestones). The business numbers come from the base seed (clients, invoices, payments); the milestones
 * come from a quotation with payment terms (DP 30% / Pelunasan 70%) created by seed-extra.mjs.
 */
import { scrollTo } from '../lib.mjs';
import { seedMilestones } from '../seed-extra.mjs';

const REP = 'laporan-bisnis';
const MS = 'analitik-milestone';
const H = (loc, o = {}) => ({ locator: loc, ...o });


export async function run(ctx) {
  const { go, shot, sleep } = ctx;
  const { page } = await ctx.staff({ w: 1440, h: 1200 });
  const id = (n) => `${REP}/${n}`;
  /** The tightest grid (a KPI band) that contains this text. */
  const gridWith = (text) => page.locator('.grid').filter({ hasText: text }).last();

  // 1. The catalogue ------------------------------------------------------------------------------------------------------
  await go(page, '/reports', 2200);
  await shot(page, id('katalog'), {
    highlights: [
      H(page.getByRole('button', { name: /Ekspor PDF/ }), { n: 1, pad: 4, scroll: false }),
      H(page.getByRole('button', { name: /Laporan Baru/ }), { n: 2, pad: 4, scroll: false, badge: 'tr' }),
      H(page.getByRole('button').filter({ hasText: 'Laporan Bisnis Bulanan' }), { n: 3, pad: 4, scroll: false }),
      H(page.getByRole('heading', { name: 'Laporan Analitik Sistem' }).locator('xpath=ancestor::section[1]'), { n: 4, pad: 4, scroll: false }),
      H(page.getByRole('heading', { name: 'Laporan Tersimpan' }).locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 5, pad: 4, scroll: false }),
    ],
  });

  // 2. Monthly business report: numbers --------------------------------------------------------------------------------------
  await go(page, '/reports/monthly', 3000);
  const selects = page.getByRole('combobox');
  await shot(page, id('bulanan'), {
    highlights: [
      H(selects.nth(0), { n: 1, pad: 4, scroll: false }),
      H(selects.nth(1), { n: 2, pad: 4, scroll: false }),
      H(page.getByRole('button', { name: /Cetak \/ PDF/ }), { n: 3, pad: 4, scroll: false }),
      H(gridWith('Pendapatan (Lunas)'), { n: 4, pad: 3, scroll: false }),
    ],
  });

  // 3. ...and its tables ------------------------------------------------------------------------------------------------------------
  const topClients = page.getByText(/^Klien Teratas/).first();
  await scrollTo(topClients, 300);
  await sleep(800);
  await shot(page, id('bulanan-rinci'), {
    highlights: [
      H(page.getByText(/^Pendapatan per Periode/).first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 1, pad: 4, scroll: false }),
      H(topClients.locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 2, pad: 4, scroll: false }),
      H(page.getByText(/^Invoice menurut Status/).first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 3, pad: 4, scroll: false }),
    ],
  });

  // 4. The four system reports -------------------------------------------------------------------------------------------------------
  await go(page, '/reports/system/revenue', 2800);
  await shot(page, id('pendapatan'), {
    highlights: [
      H(gridWith('Total Pendapatan'), { n: 1, pad: 3, scroll: false }),
      H(page.getByText(/^Pendapatan per Periode/).first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 2, pad: 4, scroll: false }),
      H(page.getByText('Kembali ke Laporan'), { n: 3, pad: 4, scroll: false }),
    ],
  });
  await go(page, '/reports/system/payment', 2800);
  await shot(page, id('pembayaran'), {
    highlights: [
      H(gridWith('Invoice Jatuh Tempo'), { n: 1, pad: 3, scroll: false }),
      H(page.getByText(/^Invoice menurut Status/).first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 2, pad: 4, scroll: false }),
    ],
  });
  await go(page, '/reports/system/clients', 2800);
  await shot(page, id('klien'), {
    highlights: [
      H(gridWith('Total Klien'), { n: 1, pad: 3, scroll: false }),
      H(page.getByText(/^Klien Teratas/).first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 2, pad: 4, scroll: false }),
    ],
  });
  await go(page, '/reports/system/projects', 2800);
  await shot(page, id('proyek'), {
    highlights: [
      H(gridWith('Total Proyek'), { n: 1, pad: 3, scroll: false }),
      H(page.getByText(/^Proyek Teratas/).first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 2, pad: 4, scroll: false }),
    ],
  });

  // 5. Milestone analytics -------------------------------------------------------------------------------------------------------------------
  const ms = (n) => `${MS}/${n}`;
  await seedMilestones(ctx.ids);
  await go(page, '/milestones', 3000);
  await shot(page, ms('ringkasan'), {
    highlights: [
      H(gridWith('Total Milestone'), { n: 1, pad: 3, scroll: false }),
      H(page.getByText('Filter Aktif').locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 2, pad: 4, scroll: false }),
      H(page.getByRole('button', { name: /Ekspor JSON/ }), { n: 3, pad: 4, scroll: false, badge: 'tr' }),
    ],
  });
  await shot(page, ms('metrik'), {
    highlights: [
      H(gridWith('Siklus Pembayaran'), { n: 1, pad: 3, scroll: false }),
      H(page.getByText('Profitabilitas per Fase').locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 2, pad: 4, scroll: false }),
    ],
  });
  const detail = page.getByText('Detail Milestone', { exact: true }).first();
  await scrollTo(detail, 120);
  await sleep(800);
  await shot(page, ms('tabel'), {
    highlights: [
      H(detail.locator('xpath=ancestor::*[contains(@class,"rounded")][1]'), { n: 1, pad: 4, scroll: false }),
    ],
  });
  await page.close();
}
