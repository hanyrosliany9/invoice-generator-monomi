/**
 * Guide: crm-whatsapp-inbox (unread filters, CTWA ad banner, replying, phone-app replies, 24h window and
 * templates, quick replies, assigning, lead tab, phone layout, settings). Standalone, demo data from seed-crm.mjs.
 */
export const standalone = true;
export const needs = ['crm'];

const SLUG = 'crm-whatsapp-inbox';
const id = (n) => `${SLUG}/${n}`;

export async function run(ctx) {
  const { ids, go, shot, sleep } = ctx;
  const { page } = await ctx.staff({ w: 1440, h: 900 });
  const H = (loc, o = {}) => ({ locator: loc, ...o });
  const row = (name) => page.locator('a[href^="/crm/inbox/"]', { hasText: name }).first();
  /** Scroll the conversation's message list to the top / bottom. */
  const scrollMessages = (where) => page.evaluate((w) => {
    for (const el of document.querySelectorAll('section[aria-label] *')) {
      if (el.scrollHeight > el.clientHeight + 20 && /(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.querySelector('ul[aria-live]')) {
        el.scrollTop = w === 'top' ? 0 : el.scrollHeight;
      }
    }
  }, where);

  // 1. The inbox ---------------------------------------------------------------------
  await go(page, '/crm/inbox', 2200);
  await shot(page, id('buka-inbox'), {
    highlights: [
      H(page.getByRole('tablist').first(), { n: 1, pad: 3 }),
      H(row('Dewi Lestari'), { n: 2, pad: 2 }),
      H(page.getByLabel('Jendela balas'), { n: 3, pad: 3 }),
    ],
  });

  // 2. Unread filter -----------------------------------------------------------------------
  await page.getByRole('tab', { name: 'Belum dibaca' }).click();
  await sleep(1200);
  await shot(page, id('filter'), {
    highlights: [
      H(page.getByRole('tab', { name: 'Belum dibaca' }), { n: 1, pad: 3 }),
      H(page.getByRole('link', { name: /Inbox/ }).first(), { n: 2, pad: 3, badge: 'tr' }),
    ],
  });
  await page.getByRole('tab', { name: 'Semua' }).click();
  await sleep(600);

  // 3. Chat that started from an ad: banner with the ad image ---------------------------------
  await row('Dewi Lestari').click();
  await sleep(1800);
  await scrollMessages('top');
  await sleep(500);
  await shot(page, id('lead-otomatis'), {
    highlights: [
      H(page.getByText('Berawal dari iklan Click-to-WhatsApp').locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]'), { n: 1, pad: 4 }),
      H(page.getByRole('link', { name: /Lead:/ }), { n: 2, pad: 3 }),
    ],
  });

  // 4. Quick replies menu (Dewi's chat is open, window is open) ---------------------------------
  await scrollMessages('bottom');
  await page.getByRole('button', { name: 'Balasan cepat' }).click();
  await sleep(700);
  await shot(page, id('balasan-cepat'), {
    highlights: [
      H(page.locator('button[aria-label="Balasan cepat"]'), { n: 1, pad: 4 }),
      H(page.locator('[role=menu]'), { n: 2, pad: 3 }),
    ],
  });
  await page.keyboard.press('Escape');
  await sleep(300);

  // 5. Reply with Ctrl+Enter: Rina ----------------------------------------------------------------
  await row('Rina Wijaya').click();
  await sleep(1500);
  const box = page.getByLabel('Balasan', { exact: true });
  await box.fill('Baik Kak Rina, besok jam 10.00 kita telepon ya. Kami siapkan proposal paket 3 video.');
  await sleep(400);
  await box.press('Control+Enter');
  await sleep(1800);
  await scrollMessages('bottom');
  await sleep(400);
  await shot(page, id('balas'), {
    highlights: [
      H(box, { n: 1, pad: 3 }),
      H(page.getByRole('button', { name: 'Kirim', exact: true }), { n: 2, pad: 3 }),
      H(page.locator('li').filter({ hasText: 'Baik Kak Rina, besok jam 10.00' }).last(), { n: 3, pad: 3, badge: 'tl' }),
    ],
  });

  // 6. Replies from the phone app are mirrored -----------------------------------------------------
  await shot(page, id('dari-hp'), {
    highlights: [
      H(page.locator('li').filter({ hasText: 'Dikirim dari aplikasi HP' }).first(), { n: 1, pad: 4 }),
    ],
  });

  // 7. 24-hour window closed (Agus) --------------------------------------------------------------------
  await row('Agus Prasetyo').click();
  await sleep(1500);
  await shot(page, id('jendela-24-jam'), {
    highlights: [
      H(page.getByText(/Jendela 24 jam tertutup/), { n: 1, pad: 4 }),
      H(page.getByRole('button', { name: 'Kirim template' }), { n: 2, pad: 3 }),
    ],
  });

  // 8. Template with variables ---------------------------------------------------------------------------
  await page.getByRole('button', { name: 'Kirim template' }).click();
  await sleep(1500);
  const dlg = page.getByRole('dialog');
  await dlg.locator('select').selectOption({ index: 1 });
  await sleep(500);
  const vars = dlg.locator('input');
  await vars.nth(0).fill('Pak Agus');
  await vars.nth(1).fill('paket video untuk toko Anda');
  await sleep(500);
  await shot(page, id('template'), {
    highlights: [
      H(dlg.locator('select'), { n: 1, pad: 3 }),
      H(vars.nth(0), { n: 2, pad: 3 }),
      H(dlg.getByText('Pratinjau').locator('xpath=following-sibling::*[1]'), { n: 3, pad: 3 }),
    ],
  });
  await dlg.getByRole('button', { name: 'Batal' }).click();
  await sleep(400);

  // 9. Assign, link to a lead, archive -------------------------------------------------------------------------
  await row('Budi Santoso').click();
  await sleep(1500);
  await page.getByLabel('Ditugaskan ke').selectOption({ index: 1 });
  await sleep(900);
  await shot(page, id('tetapkan'), {
    highlights: [
      H(page.getByLabel('Ditugaskan ke'), { n: 1, pad: 3 }),
      H(page.getByRole('button', { name: /Ganti lead yang terhubung/ }), { n: 2, pad: 4 }),
      H(page.getByRole('button', { name: 'Arsipkan' }), { n: 3, pad: 4 }),
    ],
  });

  // 10. The same chat inside the lead page ---------------------------------------------------------------------------
  await go(page, `/crm/leads/${ids.lead.rina}`, 2000);
  await page.getByRole('tab', { name: /WhatsApp/ }).first().click().catch(async () => { await page.getByText('WhatsApp', { exact: true }).first().click(); });
  await sleep(1800);
  await shot(page, id('tab-lead'), {
    highlights: [
      H(page.getByRole('tab', { name: /WhatsApp/ }).first(), { n: 1, pad: 3 }),
    ],
  });

  // 11. Quick replies live in the settings ------------------------------------------------------------------------------
  await go(page, '/crm/settings', 2500);
  const qr = page.getByRole('heading', { name: 'Balasan cepat' }).locator('xpath=ancestor::div[1]');
  await qr.scrollIntoViewIfNeeded();
  await sleep(500);
  await shot(page, id('pengaturan'), {
    highlights: [
      H(page.getByRole('button', { name: 'Tambah balasan cepat' }), { n: 1, pad: 4 }),
      H(page.locator('li').filter({ has: page.locator('textarea') }).first(), { n: 2, pad: 3 }),
    ],
  });

  // 12. Phone layout: the conversation list fits the screen (390 px) ------------------------------------------------------
  const m = await ctx.staff({ w: 390, h: 844, dsf: 2, mobile: true });
  await go(m.page, '/crm/inbox', 2500);
  await shot(m.page, id('di-hp'), {
    highlights: [
      H(m.page.getByRole('tablist').first(), { n: 1, pad: 3 }),
      H(m.page.locator('a[href^="/crm/inbox/"]', { hasText: 'Budi Santoso' }).first(), { n: 2, pad: 2 }),
    ],
  });
}
