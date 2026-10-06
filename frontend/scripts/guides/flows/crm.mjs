/**
 * Guide: crm-leads-whatsapp (campaigns, ad message, ad spend, quick add, board, list, follow-ups,
 * moving stages, convert, dashboard). Standalone: uses the demo data of seed-crm.mjs.
 */
export const standalone = true;
export const needs = ['crm'];

const SLUG = 'crm-leads-whatsapp';
const id = (n) => `${SLUG}/${n}`;

export async function run(ctx) {
  const { ids, go, shot, sleep } = ctx;
  const { page } = await ctx.staff({ w: 1440, h: 900 });
  const H = (loc, o = {}) => ({ locator: loc, ...o });

  // 1. Campaigns ---------------------------------------------------------
  await go(page, '/crm/campaigns', 2000);
  await page.getByText('Promo Video Oktober (Demo)').first().click();
  await sleep(600);
  await shot(page, id('kampanye'), {
    highlights: [
      H(page.getByRole('button', { name: /Kampanye baru/ }), { n: 1, badge: 'tr' }),
      H(page.locator('table tbody tr').first(), { n: 2, pad: 3 }),
    ],
  });

  // 2. The pre-filled ad message -------------------------------------------
  const copyBtn = page.getByRole('button', { name: /Salin pesan/ });
  await copyBtn.scrollIntoViewIfNeeded();
  await shot(page, id('pesan-iklan'), {
    highlights: [
      H(page.getByText(/Pesan otomatis untuk iklan WhatsApp/).first().locator('xpath=following::*[contains(text(),"[FB-OKT1]")][1]'), { n: 1, pad: 8 }),
      H(copyBtn, { n: 2 }),
    ],
  });

  // 3. Log ad spend ------------------------------------------------------------
  await page.getByRole('button', { name: /Catat biaya/ }).first().click();
  await sleep(600);
  const dlg = page.getByRole('dialog');
  await dlg.locator('input[type=number]').fill('450000');
  await dlg.getByRole('textbox').last().fill('Boost akhir pekan');
  await sleep(300);
  await shot(page, id('biaya-iklan'), {
    highlights: [
      H(dlg.getByText('Dari', { exact: true }).locator('xpath=following-sibling::*[1]'), { n: 1, pad: 3 }),
      H(dlg.locator('input[type=number]'), { n: 2 }),
      H(dlg.getByRole('button', { name: /^Simpan$/ }), { n: 3, badge: 'tr' }),
    ],
  });
  await dlg.getByRole('button', { name: /^Batal$/ }).click();
  await sleep(400);

  // 4. Quick add by pasting a WhatsApp message (Ctrl/Cmd+Shift+L) -----------------
  await go(page, '/crm/leads', 2200);
  await page.keyboard.press('Control+Shift+L');
  await sleep(900);
  const add = page.getByRole('dialog');
  await add.locator('#crm-quick-text').fill('Dian Pratama +62 813-9988-7766\nHalo Monomi, saya tertarik dengan paket video produk. Boleh minta info harganya? [FB-OKT1]');
  await sleep(900);
  await shot(page, id('tambah-lead'), {
    highlights: [
      H(add.locator('#crm-quick-text'), { n: 1 }),
      H(add.getByText('Terdeteksi otomatis').locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]'), { n: 2, pad: 3 }),
      H(add.getByRole('button', { name: /^Simpan lead$/ }), { n: 3, badge: 'tr' }),
    ],
  });
  await page.keyboard.press('Escape');
  await sleep(500);

  // 5. The board -----------------------------------------------------------------
  await go(page, '/crm/leads', 2200);
  await shot(page, id('papan'), {
    highlights: [
      H(page.getByRole('button', { name: /Lead baru/ }), { n: 1, badge: 'tr' }),
      H(page.getByRole('region', { name: /^Baru$/ }), { n: 2, pad: 4 }),
      H(page.getByRole('button', { name: /belum dibalas/ }), { n: 3, badge: 'bl' }),
    ],
  });

  // 6. List view with bulk actions --------------------------------------------------
  await page.getByRole('button', { name: /^Daftar$/ }).click();
  await sleep(900);
  const rows = page.locator('table tbody tr');
  await rows.nth(0).locator('input[type=checkbox]').check();
  await rows.nth(1).locator('input[type=checkbox]').check();
  await sleep(500);
  await shot(page, id('daftar'), {
    highlights: [
      H(page.getByRole('group', { name: /Tampilan/ }), { n: 1, pad: 3 }),
      H(page.getByRole('region', { name: /Aksi massal/ }), { n: 2, pad: 3 }),
    ],
  });
  await page.getByRole('button', { name: /^Papan$/ }).click();
  await sleep(500);

  // 7. Follow-ups: Dewi has one scheduled -----------------------------------------------
  await go(page, `/crm/leads/${ids.lead.dewi}`, 2200);
  await shot(page, id('tindak-lanjut'), {
    highlights: [
      H(page.getByText('Tindak lanjut', { exact: true }).first().locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 1, pad: 3 }),
      H(page.getByText('Tambah aktivitas', { exact: true }).first().locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 2, pad: 3 }),
    ],
  });

  // 8. Move stage ---------------------------------------------------------------------------
  await page.getByRole('button', { name: /Pindah tahap/ }).click();
  await sleep(600);
  await shot(page, id('pindah-tahap'), {
    highlights: [
      H(page.locator('button', { hasText: 'Pindah tahap' }), { n: 1, badge: 'tl' }),
      H(page.locator('[role=menu]'), { n: 2, pad: 3 }),
    ],
  });
  await page.keyboard.press('Escape');
  await sleep(300);

  // 9. Convert Lina into a client + draft quotation ---------------------------------------------
  await go(page, `/crm/leads/${ids.lead.lina}`, 2200);
  await page.getByRole('button', { name: /Konversi ke Klien/ }).first().click();
  await sleep(800);
  const cv = page.getByRole('dialog');
  await shot(page, id('konversi'), {
    highlights: [
      H(cv.getByText('Buat draf penawaran').first().locator('xpath=ancestor::label[1]'), { n: 1, pad: 3 }),
      H(cv.locator('input[type=number]').first(), { n: 2 }),
      H(cv.getByRole('button', { name: /Konversi & buat penawaran/ }), { n: 3, badge: 'tr' }),
    ],
  });
  await cv.getByRole('button', { name: /Konversi & buat penawaran/ }).click();
  await sleep(2500);
  await shot(page, id('hasil'), {
    highlights: [
      H(page.getByRole('dialog'), { n: 1, pad: 3 }),
    ],
  });
  await page.keyboard.press('Escape');
  await sleep(400);

  // 10. Dashboard -----------------------------------------------------------------------------------------
  await go(page, '/crm/dashboard', 2500);
  await shot(page, id('dasbor'), {
    highlights: [
      H(page.getByText('Lead baru', { exact: true }).first().locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 1, pad: 3 }),
      H(page.getByText(/Per kampanye/i).first().locator('xpath=ancestor::div[contains(@class,"rounded")][1]'), { n: 2, pad: 3, scroll: false }),
    ],
  });
}
