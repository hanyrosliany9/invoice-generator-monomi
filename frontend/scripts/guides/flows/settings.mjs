/**
 * Guide: pengaturan-aplikasi (Pengaturan: /settings tabs and the Android app).
 * Read-only: nothing is saved, the backup download and the APK download are never clicked.
 * Standalone: it needs no demo data (the settings page shows the company's own settings).
 */
export const standalone = true;
export const needs = [];

const SLUG = 'pengaturan-aplikasi';
const id = (n) => `${SLUG}/${n}`;
const H = (loc, o = {}) => ({ locator: loc, ...o });

export async function run(ctx) {
  const { go, shot, sleep } = ctx;
  const { page } = await ctx.staff({ w: 1280, h: 1000 });
  page.on('dialog', (d) => d.accept().catch(() => {})); // "unsaved changes" confirm after typing in Keamanan
  const nav = page.getByRole('navigation', { name: 'Settings sections' });
  const open = async (label) => {
    await nav.getByRole('button', { name: new RegExp(`^${label}`) }).click();
    await sleep(900);
  };
  const main = page.locator('main');

  // 1. The page and its sections -----------------------------------------------------------------------------------
  await go(page, '/settings', 2200);
  await shot(page, id('buka'), {
    highlights: [
      H(nav, { n: 1, pad: 4, scroll: false }),
      H(page.locator('section').filter({ has: page.getByRole('button', { name: 'Simpan Profil' }) }), { n: 2, pad: 4, scroll: false }),
    ],
  });

  // 2. Profile ------------------------------------------------------------------------------------------------------
  await shot(page, id('profil'), {
    highlights: [
      H(page.getByLabel(/^Nama Lengkap/), { n: 1, pad: 4, scroll: false }),
      H(page.getByLabel(/^Zona Waktu/), { n: 2, pad: 4, scroll: false }),
      H(page.getByLabel(/^Bahasa/), { n: 3, pad: 4, scroll: false }),
      H(page.getByRole('button', { name: 'Simpan Profil' }), { n: 4, pad: 4, scroll: false }),
    ],
  });

  // 3. Security (typed, never saved) -----------------------------------------------------------------------------------
  await open('Keamanan');
  await page.getByLabel(/^Kata Sandi Saat Ini/).fill('KataSandiLama1');
  await page.getByLabel(/^Kata Sandi Baru/).fill('KataSandiBaru2026');
  await page.getByLabel(/^Konfirmasi Kata Sandi Baru/).fill('KataSandiBaru2026');
  await sleep(500);
  await shot(page, id('keamanan'), {
    highlights: [
      H(page.getByLabel(/^Kata Sandi Saat Ini/), { n: 1, pad: 4, scroll: false }),
      H(page.getByLabel(/^Kata Sandi Baru/), { n: 2, pad: 4, scroll: false }),
      H(page.getByLabel(/^Konfirmasi Kata Sandi Baru/), { n: 3, pad: 4, scroll: false }),
      H(page.getByRole('button', { name: 'Ubah Kata Sandi' }), { n: 4, pad: 4, scroll: false }),
    ],
  });

  // 4. Company (admin) -----------------------------------------------------------------------------------------------------
  await open('Perusahaan');
  await shot(page, id('perusahaan'), {
    highlights: [
      H(page.getByLabel(/^Nama Perusahaan/), { n: 1, pad: 4, scroll: false }),
      H(page.getByLabel(/^NPWP/), { n: 2, pad: 4, scroll: false }),
      H(page.getByLabel(/^Alamat/), { n: 3, pad: 4, scroll: false }),
      H(page.getByRole('button', { name: 'Simpan Perusahaan' }), { n: 4, pad: 4, scroll: false }),
    ],
  });

  // 5. Bank accounts (admin) ---------------------------------------------------------------------------------------------------
  await open('Rekening Bank');
  await shot(page, id('rekening'), {
    highlights: [
      H(page.getByLabel(/^Nama Pemilik Rekening/), { n: 1, pad: 4, scroll: false }),
      H(page.getByText(/^Rekening 01/).locator('xpath=ancestor::div[1]'), { n: 2, pad: 4, scroll: false }),
      H(page.getByRole('button', { name: 'Simpan Rekening' }), { n: 3, pad: 4, scroll: false }),
    ],
  });

  // 6. Invoicing and numbering (admin) -------------------------------------------------------------------------------------------
  await open('Invoice & Penomoran');
  await shot(page, id('invoice'), {
    highlights: [
      H(page.getByLabel(/^Termin Pembayaran Default/), { n: 1, pad: 4, scroll: false }),
      H(page.getByTestId('materai-rule'),{ n: 2, pad: 4, scroll: false }),
      H(page.getByLabel(/^Prefix Invoice/), { n: 3, pad: 4, scroll: false }),
      H(page.getByLabel(/^Prefix Penawaran/), { n: 4, pad: 4, scroll: false }),
      H(page.getByRole('switch').first(), { n: 5, pad: 4, scroll: false }),
    ],
  });

  // 7. Notifications -------------------------------------------------------------------------------------------------------------
  await open('Notifikasi');
  await shot(page, id('notifikasi'), {
    highlights: [
      H(page.getByRole('switch').nth(0), { n: 1, pad: 6, scroll: false }),
      H(page.getByRole('switch').nth(1), { n: 2, pad: 6, scroll: false }),
    ],
  });

  // 8. Backup (admin) -------------------------------------------------------------------------------------------------------------
  await open('Cadangan Data');
  await shot(page, id('cadangan'), {
    highlights: [
      H(page.getByRole('switch').first(), { n: 1, pad: 6, scroll: false }),
      H(page.getByLabel(/^Frekuensi/), { n: 2, pad: 4, scroll: false }),
      H(page.getByRole('button', { name: /Unduh \.sql/ }), { n: 3, pad: 4, scroll: false }),
    ],
  });

  // 9. Mobile app ----------------------------------------------------------------------------------------------------------------------
  await open('Aplikasi Mobile');
  await shot(page, id('aplikasi'), {
    highlights: [
      H(page.getByRole('button', { name: 'Unduh APK' }), { n: 1, pad: 5, scroll: false, badge: 'tr' }),
      H(page.getByText('Cara memasang:').locator('xpath=ancestor::div[1]'), { n: 2, pad: 5, scroll: false }),
    ],
  });
  void main;
  await page.close();
}
