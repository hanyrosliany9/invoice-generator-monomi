/** Guide: portal-klien (staff side: giving a client access to the portal). */
import { scrollTo } from '../lib.mjs';

const SLUG = 'portal-klien';
const id = (n) => `${SLUG}/${n}`;

export async function run(ctx) {
  const { ids, go, shot, sleep } = ctx;
  const { page } = await ctx.staff({ w: 1280, h: 900 });
  const H = (loc, o = {}) => ({ locator: loc, ...o });

  // 1. The "Portal Klien" card on the client page ----------------------------
  await go(page, `/clients/${ids.client}`, 2200);
  const title = page.getByRole('heading', { name: 'Portal Klien' });
  await scrollTo(title, 130);
  await shot(page, id('kartu'), {
    highlights: [
      H(title.locator('xpath=ancestor::section[1]'), { n: 1, pad: 6 }),
      H(page.getByRole('link', { name: /localhost|portal\./ }).first(), { n: 2, pad: 8, badge: 'tr' }),
    ],
  });

  // 2. Add a contact ------------------------------------------------------------
  await page.getByLabel('Nama kontak').fill('Sinta Wijaya (Demo)');
  await page.getByLabel('Email kontak').fill('demo.sinta@contoh.co.id');
  await sleep(300);
  await scrollTo(title, 130);
  await shot(page, id('tambah-kontak'), {
    highlights: [
      H(page.getByLabel('Nama kontak'), { n: 1 }),
      H(page.getByLabel('Email kontak'), { n: 2 }),
      H(page.getByRole('button', { name: /Tambah kontak/ }), { n: 3, badge: 'tr' }),
    ],
  });
  await page.getByRole('button', { name: /Tambah kontak/ }).click();
  await sleep(1500);

  // 3. Active / inactive + invitation ----------------------------------------------
  const rendra = page.getByText('Rendra Pratama (Demo)').first().locator('xpath=ancestor::li[1] | ancestor::div[.//button[contains(.,"Kirim undangan")]][1]');
  await page.getByRole('switch', { name: 'Aktif' }).nth(1).click();
  await sleep(1200);
  await scrollTo(title, 130);
  await shot(page, id('aktif-undang'), {
    highlights: [
      H(page.getByRole('switch', { name: 'Aktif' }).nth(1), { n: 1, pad: 8 }),
      H(page.getByRole('button', { name: /Kirim undangan/ }).first(), { n: 2 }),
    ],
  });
  await page.getByRole('switch', { name: 'Aktif' }).nth(1).click().catch(() => {});
  void rendra;
  await page.close();
}
