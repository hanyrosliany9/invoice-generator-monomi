/**
 * Guide: crm-pengaturan (admin: response-time target and pipeline stages at /crm/settings).
 *
 * The flow really edits the settings through the UI (rename, colour, order, switch, new stage), so the stage rows and the
 * response-time target are saved first and put back in `finally` (straight in Postgres, like cleanup.mjs does for its rows).
 * Standalone: it needs no demo data. The WhatsApp / landing-page / Meta Ads cards on the same page are described in
 * crm-whatsapp-setup (the backend of the capture points them at the fake Meta Graph, see README.md).
 */
import pg from 'pg';
import { cfg, scrollTo } from '../lib.mjs';

export const standalone = true;
export const needs = [];

const SLUG = 'crm-pengaturan';
const id = (n) => `${SLUG}/${n}`;
const H = (loc, o = {}) => ({ locator: loc, ...o });

async function withDb(fn) {
  const db = new pg.Client({ connectionString: cfg.dbUrl });
  await db.connect();
  try { return await fn(db); } finally { await db.end(); }
}

async function saveState() {
  return withDb(async (db) => ({
    stages: (await db.query('SELECT * FROM lead_stages')).rows,
    settings: (await db.query('SELECT * FROM crm_settings')).rows,
  }));
}

async function restoreState(state) {
  await withDb(async (db) => {
    const keep = state.stages.map((s) => s.id);
    // custom stages added by the flow (leads cannot point at them: nothing was moved into them)
    await db.query('DELETE FROM lead_stages WHERE id <> ALL($1::text[])', [keep]);
    for (const s of state.stages) {
      await db.query(
        'UPDATE lead_stages SET name = $2, "order" = $3, color = $4, type = $5, "metaEvent" = $6, "isActive" = $7, "updatedAt" = $8 WHERE id = $1',
        [s.id, s.name, s.order, s.color, s.type, s.metaEvent, s.isActive, s.updatedAt],
      );
    }
    for (const r of state.settings) {
      await db.query('UPDATE crm_settings SET "responseThresholdMinutes" = $2, "updatedAt" = $3 WHERE id = $1', [r.id, r.responseThresholdMinutes, r.updatedAt]);
    }
  });
}

export async function run(ctx) {
  const { go, shot, sleep } = ctx;
  const state = await saveState();
  const { page } = await ctx.staff({ w: 1440, h: 1000 });
  page.on('dialog', (d) => d.accept().catch(() => {})); // "Delete this stage?"
  try {
    const rows = page.getByRole('listitem').filter({ has: page.locator('input[aria-label="Nama tahap"]') });
    const row = (i) => rows.nth(i);
    const thresholdPanel = page.getByRole('heading', { name: 'Target waktu respons' }).locator('xpath=..');
    const stagesPanel = page.getByRole('heading', { name: 'Tahap pipeline' }).locator('xpath=..');

    // 1. The page --------------------------------------------------------------------------------------------------------
    await go(page, '/crm/settings', 2500);
    await shot(page, id('buka'), {
      highlights: [
        H(thresholdPanel, { n: 1, pad: 4, scroll: false }),
        H(stagesPanel, { n: 2, pad: 4, scroll: false }),
      ],
    });

    // 2. Response-time target ---------------------------------------------------------------------------------------------------
    const minutes = page.locator('#crm-threshold');
    await minutes.fill('30');
    await sleep(300);
    await shot(page, id('target'), {
      highlights: [
        H(minutes, { n: 1, pad: 5, scroll: false }),
        H(thresholdPanel.getByRole('button', { name: 'Simpan' }), { n: 2, pad: 5, scroll: false }),
      ],
    });
    await thresholdPanel.getByRole('button', { name: 'Simpan' }).click();
    await sleep(1200);

    // 3. Anatomy of a stage row (Dikualifikasi) ---------------------------------------------------------------------------------------
    const q = row(1);
    await shot(page, id('tahap'), {
      highlights: [
        H(q.getByLabel('Warna'), { n: 1, pad: 4, scroll: false }),
        H(q.getByLabel('Nama tahap'), { n: 2, pad: 4, scroll: false }),
        H(q.getByLabel('Tipe'), { n: 3, pad: 4, scroll: false }),
        H(q.getByLabel('Event Meta'), { n: 4, pad: 4, scroll: false }),
        H(q.getByRole('switch'), { n: 5, pad: 1, scroll: false }),
        H(q.getByLabel('Naikkan'), { n: 6, pad: 1, scroll: false, badge: 'tr' }),
      ],
    });

    // 4. Rename and recolour ------------------------------------------------------------------------------------------------------------
    await q.getByLabel('Nama tahap').fill('Prospek Serius (Demo)');
    await q.getByLabel('Nama tahap').press('Enter');
    await sleep(900);
    await q.getByLabel('Warna').fill('#ff8a00');
    await sleep(1100);
    await shot(page, id('ganti-nama'), {
      highlights: [
        H(q.getByLabel('Warna'), { n: 1, pad: 4, scroll: false }),
        H(q.getByLabel('Nama tahap'), { n: 2, pad: 4, scroll: false }),
      ],
    });

    // 5. Reorder: move Meeting down ------------------------------------------------------------------------------------------------------
    const meeting = row(2);
    await meeting.getByLabel('Turunkan').click();
    await sleep(1400);
    await shot(page, id('urutan'), {
      highlights: [
        H(row(3).getByLabel('Naikkan'), { n: 1, pad: 5, scroll: false }),
        H(row(3).getByLabel('Turunkan'), { n: 2, pad: 5, scroll: false }),
        H(row(3).getByLabel('Nama tahap'), { n: 3, pad: 4, scroll: false }),
      ],
    });
    await row(3).getByLabel('Naikkan').click();
    await sleep(1200);

    // 6. Switch a stage off -----------------------------------------------------------------------------------------------------------------
    const proposal = row(3);
    await proposal.getByRole('switch').click();
    await sleep(1200);
    await shot(page, id('nonaktif'), {
      highlights: [H(proposal.getByRole('switch'), { n: 1, pad: 6, scroll: false })],
    });
    await proposal.getByRole('switch').click();
    await sleep(900);

    // 7. A new stage -----------------------------------------------------------------------------------------------------------------------------
    await page.locator('#crm-new-stage').fill('Negosiasi (Demo)');
    await page.getByRole('button', { name: /Tambah tahap/ }).click();
    await sleep(1500);
    await scrollTo(page.locator('#crm-new-stage'), 500);
    await sleep(400);
    await shot(page, id('tambah'), {
      highlights: [
        H(page.locator('#crm-new-stage'), { n: 1, pad: 5, scroll: false }),
        H(page.getByRole('button', { name: /Tambah tahap/ }), { n: 2, pad: 5, scroll: false }),
        H(page.getByLabel('Hapus tahap'), { n: 3, pad: 5, scroll: false, badge: 'tr' }),
      ],
    });
    await page.getByLabel('Hapus tahap').click();
    await sleep(1200);

    // 8. Which stage sends which Meta event ----------------------------------------------------------------------------------------------------------
    await page.evaluate(() => document.getElementById('crm-threshold')?.scrollIntoView({ block: 'start' }));
    await sleep(500);
    await shot(page, id('event-meta'), {
      highlights: [
        H(row(1).getByLabel('Event Meta'), { n: 1, pad: 5, scroll: false }),
        H(row(4).getByLabel('Event Meta'), { n: 2, pad: 5, scroll: false }),
        H(row(4).getByLabel('Tipe'), { n: 3, pad: 5, scroll: false }),
      ],
    });

    // 9. The other cards on the page -------------------------------------------------------------------------------------------------------------------
    const trackingHead = page.locator('#tracking').getByRole('heading').first();
    const adsHead = page.locator('#meta-ads').getByRole('heading').first();
    await scrollTo(trackingHead, 110);
    await sleep(600);
    await shot(page, id('kartu-lain'), {
      highlights: [
        H(trackingHead.locator('xpath=ancestor::*[self::section or self::div][2]'), { n: 1, pad: 4, scroll: false }),
        H(adsHead.locator('xpath=ancestor::*[self::section or self::div][2]'), { n: 2, pad: 4, scroll: false }),
      ],
    });

    // 10. WhatsApp card -------------------------------------------------------------------------------------------------------------------------------------
    const waHead = page.locator('#whatsapp').getByRole('heading').first();
    await scrollTo(waHead, 110);
    await sleep(600);
    await shot(page, id('whatsapp'), {
      highlights: [
        H(page.locator('#whatsapp'), { n: 1, pad: 4, scroll: false }),
      ],
    });
  } finally {
    await page.close().catch(() => {});
    await restoreState(state);
  }
}
