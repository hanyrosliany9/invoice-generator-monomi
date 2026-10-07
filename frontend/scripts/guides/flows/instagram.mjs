/**
 * Guides: instagram-klien (staff: connect a client's Instagram, what syncs, the monthly report, disconnect) and
 * instagram-portal (client portal: the client connects their own account).
 *
 * Nothing talks to Instagram: the backend runs with INSTAGRAM_SYNC_ENABLED=false and dummy META_APP_ID / META_APP_SECRET
 * (so the integration counts as "configured"), and the connection rows are written straight to Postgres
 * (seed-instagram.mjs). The Instagram login itself happens on instagram.com, so that step has no picture.
 */
import { cfg, readLogLength, scrollTo, waitForPortalCode } from '../lib.mjs';
import { monthName, PORTAL_EMAIL } from '../seed.mjs';
import { removeInstagram, seedInstagram, setInstagramStatus } from '../seed-instagram.mjs';

const STAFF = 'instagram-klien';
const PORTAL = 'instagram-portal';
const H = (loc, o = {}) => ({ locator: loc, ...o });

export async function run(ctx) {
  const { ids, go, shot, sleep, api } = ctx;
  const id = (n) => `${STAFF}/${n}`;
  const { page } = await ctx.staff({ w: 1280, h: 900 });
  const card = page.getByTestId('instagram-card');
  const openCard = async (wait = 2200) => {
    await go(page, `/clients/${ids.client}`, wait);
    await scrollTo(card.getByRole('heading', { name: 'Instagram' }), 110);
  };

  // A past month for the report (the report flow owns the current and previous month of this client).
  const m = ids.month - 2 >= 1 ? ids.month - 2 : ids.month + 10;
  const y = ids.month - 2 >= 1 ? ids.year : ids.year - 1;

  await removeInstagram(ids.client);

  // 1. Not connected ------------------------------------------------------------------------------------------
  await openCard();
  await shot(page, id('kartu'), {
    highlights: [
      H(card.locator('label').filter({ hasText: /Perbarui handle/ }), { n: 1, pad: 6, scroll: false }),
      H(card.getByRole('button', { name: 'Hubungkan Instagram' }), { n: 2, pad: 5, scroll: false, badge: 'tr' }),
      H(card.getByTestId('instagram-staff-login-hint'), { n: 3, pad: 6, scroll: false }),
    ],
  });

  // 2. Connected (the OAuth round-trip happens on instagram.com, see the text-only step) -----------------------
  await seedInstagram(ids.client, { month: m, year: y });
  await openCard();
  await shot(page, id('terhubung'), {
    highlights: [
      H(card.getByText('Terhubung', { exact: true }).first(), { n: 1, pad: 6, scroll: false }),
      H(card.getByText('@kopisenja.demo'), { n: 2, pad: 8, scroll: false }),
      H(card.locator('dl'), { n: 3, pad: 8, scroll: false }),
    ],
  });

  // 3. Sync now ------------------------------------------------------------------------------------------------
  const syncBtn = card.getByRole('button', { name: 'Sync sekarang' });
  await syncBtn.click();
  await sleep(900);
  await shot(page, id('sinkron'), {
    highlights: [
      H(syncBtn, { n: 1, pad: 5, scroll: false }),
      H(card.getByText('Sinkronisasi terakhir').locator('xpath=..'), { n: 2, pad: 6, scroll: false }),
    ],
  });

  // 4. A connection that needs attention (token expired) ---------------------------------------------------------
  await setInstagramStatus(ids.client, 'EXPIRED', 'Token Instagram kedaluwarsa. Hubungkan ulang akun.');
  await openCard();
  await shot(page, id('status'), {
    highlights: [
      H(card.getByText('Token kedaluwarsa', { exact: true }), { n: 1, pad: 6, scroll: false }),
      H(card.getByRole('status'), { n: 2, pad: 6, scroll: false }),
      H(card.getByRole('button', { name: 'Hubungkan ulang Instagram' }), { n: 3, pad: 5, scroll: false }),
    ],
  });
  await setInstagramStatus(ids.client, 'ACTIVE', null);

  // 5. Report builder: "Ambil dari Instagram" ------------------------------------------------------------------------
  const title = `Laporan Media Sosial ${monthName(m)} ${y} (Demo)`;
  let rep = await api('POST', '/reports', { projectId: ids.project, title, month: m, year: y, description: 'Ringkasan performa Instagram bulan ini.' }, undefined, { soft: true });
  if (!rep) { // a --reuse run: the report of the previous run is still there
    const list = await api('GET', '/reports');
    rep = (Array.isArray(list) ? list : list.data ?? list.items ?? []).find((r) => r.title === title);
  }
  await go(page, `/reports/${rep.id}/edit`, 2200);
  const panelTitle = page.getByText('Tambah bagian data', { exact: true }).first();
  await scrollTo(panelTitle, 90);
  await page.getByRole('tab', { name: /Ambil dari Instagram/ }).click();
  await sleep(1800);
  await scrollTo(panelTitle, 90);
  await shot(page, id('laporan'), {
    highlights: [
      H(page.getByRole('tab', { name: /Ambil dari Instagram/ }), { n: 1, pad: 5, scroll: false }),
      H(page.getByTestId('instagram-import-panel').locator('label').first(), { n: 2, pad: 6, scroll: false }),
    ],
  });

  // 6. Disconnect (the dialog is cancelled: nothing is removed) ---------------------------------------------------------
  await openCard(1800);
  await card.getByRole('button', { name: 'Putuskan' }).click();
  await sleep(800);
  const dlg = page.getByRole('dialog');
  await shot(page, id('putuskan'), {
    highlights: [
      H(dlg.locator('label').filter({ hasText: /Hapus juga semua data/ }), { n: 1, pad: 6, scroll: false }),
      H(dlg.getByRole('button', { name: 'Putuskan', exact: true }), { n: 2, pad: 5, scroll: false, badge: 'tr' }),
    ],
  });
  await page.keyboard.press('Escape');
  await sleep(400);
  await page.close();

  await portalPart(ctx);
  await removeInstagram(ids.client);
}

/** The client's own view on a phone. */
async function portalPart(ctx) {
  const { ids, shot, sleep } = ctx;
  const id = (n) => `${PORTAL}/${n}`;
  const base = `${cfg.appUrl}/portal`;
  const { page } = await ctx.anon({ w: 390, h: 844, dsf: 2, mobile: true });

  await removeInstagram(ids.client);
  await page.goto(`${base}/login`);
  await sleep(1500);
  const at = readLogLength();
  await page.fill('#portal-email', PORTAL_EMAIL);
  await page.click('button[type=submit]');
  await page.waitForSelector('#portal-code');
  const code = await waitForPortalCode(PORTAL_EMAIL, at);
  await page.fill('#portal-code', code);
  await page.getByText('Kopi Senja (Demo)').first().waitFor({ timeout: 20000 });
  await sleep(800);

  const card = page.getByTestId('portal-instagram-card');
  const openReports = async () => {
    await page.goto(`${base}/c/${ids.client}/reports`);
    await sleep(2500);
  };

  // 1. The card on the Reports tab
  await openReports();
  await shot(page, id('kartu'), {
    highlights: [
      H(page.getByRole('navigation').first(), { n: 1, pad: 4 }),
      H(card, { n: 2, pad: 4, scroll: false }),
    ],
  });

  // 2. What the client allows
  await scrollTo(card, 80);
  await shot(page, id('izin'), {
    highlights: [
      H(card.locator('ul'), { n: 1, pad: 6, scroll: false, badge: 'tr' }),
      H(card.getByRole('link', { name: 'Kebijakan privasi' }), { n: 2, pad: 4, scroll: false, badge: 'bl' }),
    ],
  });

  // 3. Connected (the Instagram login happens on instagram.com: text-only step)
  await seedInstagram(ids.client);
  await openReports();
  await shot(page, id('terhubung'), {
    highlights: [H(card, { n: 1, pad: 4 })],
  });

  // 4. Disconnect (dialog cancelled)
  await card.getByRole('button', { name: 'Putuskan' }).click();
  await sleep(900);
  const dlg = page.getByRole('dialog');
  await shot(page, id('putuskan'), {
    highlights: [
      H(dlg.locator('label').filter({ hasText: /Hapus juga semua data/ }), { n: 1, pad: 6, scroll: false }),
      H(dlg.getByRole('button', { name: 'Putuskan', exact: true }), { n: 2, pad: 5, scroll: false }),
    ],
  });
  await page.keyboard.press('Escape');
  await sleep(400);
  await page.close();
}
