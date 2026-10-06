/**
 * Guide: crm-whatsapp-setup (admin: what each state of the WhatsApp settings card means, webhook, Conversions API).
 *
 * The card shows what the SERVER is configured with, so each state needs a differently configured backend
 * (all pointed at the fake Meta Graph). Run once per state, restarting the backend in between:
 *
 *   GUIDE_WA_STATE=ready       (default) a complete, valid configuration
 *   GUIDE_WA_STATE=off         no WHATSAPP_* variables at all
 *   GUIDE_WA_STATE=incomplete  only WHATSAPP_ACCESS_TOKEN (verify token, WABA and phone number ids missing)
 *   GUIDE_WA_STATE=invalid     a WABA id that is not numeric
 *
 * See README.md ("CRM / WhatsApp guides"). Standalone: needs no demo rows (in the ready state it also shows
 * the demo webhook traffic when the crm flow data exists).
 */
export const standalone = true;
export const needs = [];

const SLUG = 'crm-whatsapp-setup';
const id = (n) => `${SLUG}/${n}`;

export async function run(ctx) {
  const { go, shot, sleep } = ctx;
  const state = process.env.GUIDE_WA_STATE || 'ready';
  const { page } = await ctx.staff({ w: 1440, h: 900 });
  const H = (loc, o = {}) => ({ locator: loc, ...o });
  const card = page.locator('#whatsapp');
  const section = (i) => card.locator('section').nth(i);

  await go(page, '/crm/settings', 2500);
  await card.scrollIntoViewIfNeeded();
  await sleep(600);

  if (state !== 'ready') {
    const name = { off: 'mati', incomplete: 'belum-lengkap', invalid: 'tidak-valid' }[state];
    if (!name) throw new Error(`unknown GUIDE_WA_STATE ${state}`);
    await shot(page, id(name), {
      highlights: [
        H(section(0).locator('dd').first(), { n: 1, pad: 5 }),
        // incomplete: the plain message; invalid: the "Technical details" disclosure the text points at
        ...(state === 'off' ? [] : [H(state === 'invalid' ? section(0).locator('details summary').first() : section(0).locator('p.text-warning').first(), { n: 2, pad: 4, scroll: false })]),
      ],
    });
    return;
  }

  // Ready state ---------------------------------------------------------------------------------------------
  await page.evaluate(() => document.getElementById('whatsapp')?.scrollIntoView({ block: 'start' }));
  await sleep(500);
  await shot(page, id('aturan-keselamatan'), {
    highlights: [H(card.locator('[role=note]'), { n: 1, pad: 5 })],
  });

  await shot(page, id('kartu-status'), {
    highlights: [
      H(section(0).locator('dd').first(), { n: 1, pad: 5 }),
      H(page.getByRole('button', { name: 'Periksa koneksi' }), { n: 2, pad: 4, badge: 'tr', scroll: false }),
    ],
  });

  await shot(page, id('lokasi-token'), {
    highlights: [
      H(section(0).locator('dl'), { n: 1, pad: 6 }),
      H(section(0).locator('table'), { n: 2, pad: 4, scroll: false }),
    ],
  });

  // Webhook: reveal the verify token (a dummy one in the demo environment)
  await section(1).getByRole('button', { name: /Tampilkan & salin/ }).click();
  await sleep(1200);
  await section(1).scrollIntoViewIfNeeded();
  await sleep(500);
  await shot(page, id('webhook'), {
    highlights: [
      H(section(1).locator('dl'), { n: 1, pad: 6 }),
      H(section(1).getByRole('button', { name: /Tampilkan & salin/ }), { n: 2, pad: 4, badge: 'tr', scroll: false }),
    ],
  });

  await section(2).scrollIntoViewIfNeeded();
  await sleep(500);
  await shot(page, id('capi'), {
    highlights: [
      H(section(2).locator('dl'), { n: 1, pad: 6 }),
      H(section(2).getByRole('button', { name: /Kirim event yang antre/ }), { n: 2, pad: 4, scroll: false }),
    ],
  });

  await section(3).scrollIntoViewIfNeeded();
  await sleep(500);
  await shot(page, id('hubungkan'), {
    highlights: [H(section(3), { n: 1, pad: 6 })],
  });
}
