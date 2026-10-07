/**
 * Guide: kalender-proyek (the company calendar at /calendar and a project's own calendar at /projects/<id>/calendar).
 * The project's content calendar (/projects/<id>/content-calendar) is the planner of perencana-konten limited to one project;
 * it is only mentioned in the text (its page currently shows no items, see the report of this change).
 * The event created here carries the "(Demo)" marker and is deleted again in the flow itself (and by cleanup.mjs).
 */
import { scrollTo } from '../lib.mjs';

const SLUG = 'kalender-proyek';
const id = (n) => `${SLUG}/${n}`;
const H = (loc, o = {}) => ({ locator: loc, ...o });

export async function run(ctx) {
  const { ids, go, shot, sleep } = ctx;
  const { page } = await ctx.staff({ w: 1440, h: 1250 });
  page.on('dialog', (d) => d.accept().catch(() => {})); // "Hapus acara ini?"

  // A few events so both calendars have something to show (title carries the marker, cleanup removes them).
  const at = (days, h, m = 0) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d; };
  const mk = (title, category, days, h, location) => ctx.api('POST', '/calendar-events', {
    title: `${title} (Demo)`, category, projectId: ids.project, location,
    startTime: at(days, h).toISOString(), endTime: at(days, h + 2).toISOString(),
  });
  await mk('Rapat kickoff konten bulanan', 'MEETING', 1, 10, 'Kantor Kopi Senja');
  await mk('Syuting video profil gerai', 'PHOTOSHOOT', 4, 9, 'Kopi Senja, Bandung');
  await mk('Kirim draf video ke klien', 'DELIVERY', 7, 15);
  await mk('Tenggat revisi caption', 'TASK', 10, 17);

  // 1. The company calendar -------------------------------------------------------------------------------------------
  await go(page, '/calendar', 2500);
  const kpi = page.getByText('Jatuh Tempo 30 Hari', { exact: true }).locator('xpath=ancestor::div[contains(@class,"grid")][1]');
  await shot(page, id('bulan'), {
    highlights: [
      H(kpi, { n: 1, pad: 3, scroll: false }),
      H(page.getByRole('button', { name: 'Hari Ini', exact: true }).locator('xpath=ancestor::div[1]'), { n: 2, pad: 3, scroll: false }),
      H(page.getByRole('button', { name: /Kalender Konten/ }), { n: 3, pad: 4, scroll: false, badge: 'tr' }),
    ],
  });

  // 2. Pick a day: the right-hand panels follow ---------------------------------------------------------------------------
  const dayCell = page.locator('button').filter({ hasText: /INV-\d+/ }).first();
  await dayCell.click();
  await sleep(900);
  await shot(page, id('hari'), {
    highlights: [
      H(dayCell, { n: 1, pad: 2, scroll: false }),
      H(page.getByText('Hari Terpilih', { exact: true }).first().locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 2, pad: 3, scroll: false }),
      H(page.getByText('Agenda Mendatang', { exact: true }).first().locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 3, pad: 3, scroll: false }),
    ],
  });

  // 3. A project's calendar ---------------------------------------------------------------------------------------------------
  await go(page, `/projects/${ids.project}/calendar`, 2500);
  await shot(page, id('proyek'), {
    highlights: [
      H(page.getByRole('button', { name: /Tambah Acara/ }).first(), { n: 1, pad: 4, scroll: false, badge: 'tr' }),
      H(page.getByRole('button', { name: /Kalender Konten/ }), { n: 2, pad: 4, scroll: false }),
      H(page.getByRole('tab', { name: 'Semua' }).or(page.getByRole('button', { name: 'Semua', exact: true })).first(), { n: 3, pad: 4, scroll: false }),
    ],
  });

  // 4. Add an event on a day of this month --------------------------------------------------------------------------------------
  const today = new Date();
  const target = Math.min(28, today.getDate() + 13);
  await page.getByRole('button', { name: /Tambah Acara/ }).first().click();
  await sleep(900);
  const dlg = page.getByRole('dialog');
  await dlg.getByPlaceholder(/Nama tonggak/).fill('Sesi foto menu baru (Demo)');
  await dlg.getByRole('combobox').first().click();
  await sleep(400);
  await page.getByRole('option', { name: 'Pemotretan' }).click();
  await sleep(400);
  // the date is not prefilled: pick it in the date picker
  await dlg.getByRole('button', { name: /Pilih tanggal/ }).click();
  await sleep(500);
  await page.locator('[role=gridcell] button, button[name=day]').filter({ hasText: new RegExp(`^${target}$`) }).first().click();
  await sleep(500);
  await dlg.getByPlaceholder(/Lokasi/).fill('Kopi Senja, Jl. Braga No. 12, Bandung');
  await sleep(500);
  await shot(page, id('tambah-acara'), {
    highlights: [
      H(dlg.getByPlaceholder(/Nama tonggak/), { n: 1, pad: 4, scroll: false }),
      H(dlg.getByRole('combobox').first(), { n: 2, pad: 4, scroll: false }),
      H(dlg.getByText(/^Tanggal/).locator('xpath=ancestor::div[contains(@class,"grid")][1]'), { n: 3, pad: 4, scroll: false }),
      H(dlg.getByRole('button', { name: 'Simpan Acara' }), { n: 4, pad: 4, scroll: false }),
    ],
  });
  await dlg.getByRole('button', { name: 'Simpan Acara' }).click();
  await sleep(1800);

  // 5. The event on the grid; its detail panel ---------------------------------------------------------------------------------------
  const chip = page.getByText('Sesi foto menu baru (Demo)').first();
  await chip.click();
  await sleep(1000);
  await shot(page, id('acara'), {
    highlights: [
      H(chip, { n: 1, pad: 3, scroll: false }),
      H(page.getByRole('dialog').first(), { n: 2, pad: 0, scroll: false }),
      H(page.getByRole('dialog').getByRole('button', { name: /Hapus/ }).last(), { n: 3, pad: 4, scroll: false }),
    ],
  });
  await page.getByRole('dialog').getByRole('button', { name: /Hapus/ }).last().click();
  await sleep(1500);

  void scrollTo;
  await page.close();
}
