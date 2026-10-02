/**
 * Clearly-fake demo data for the guide screenshots. Everything carries the
 * "(Demo)" marker so cleanup.mjs can remove it. No real client data is used.
 * Media is registered with fake storage keys; the capture serves placeholder
 * images in the browser instead of ever contacting real storage.
 */
import pg from 'pg';
import { api, cfg, DEMO } from './lib.mjs';
import { seedBusiness } from './seed-business.mjs';

const MIME = { jpg: 'image/jpeg', png: 'image/png', mp4: 'video/mp4', pdf: 'application/pdf' };

const iso = (d) => d.toISOString();
const addDays = (n, hourUtc = 3) => {
  const d = new Date();
  d.setUTCHours(hourUtc, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};

const U = 'https://media-demo.invalid/demo/';
const img = (n, w = 1080, h = 1350) => ({ url: `${U}${n}_${w}x${h}.jpg`, key: `demo/${n}_${w}x${h}.jpg`, mimeType: 'image/jpeg', size: 200000, width: w, height: h, originalName: `${n}.jpg` });
const vid = (n) => ({ url: `${U}${n}_1080x1920.mp4`, key: `demo/${n}_1080x1920.mp4`, mimeType: 'video/mp4', size: 900000, width: 1080, height: 1920, duration: 23, originalName: `${n}.mp4`, thumbnailUrl: `${U}${n}_thumb_1080x1920.jpg`, thumbnailKey: `demo/${n}_thumb_1080x1920.jpg` });

export const PORTAL_EMAIL = 'demo.dewi@contoh.co.id';

export const monthName = (m) => ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][m - 1];

export async function seed() {
  const ids = {};
  const now = new Date();
  ids.month = now.getMonth() + 1;
  ids.year = now.getFullYear();

  // Clients ------------------------------------------------------------
  const client = await api('POST', '/clients', {
    name: `Kopi Senja ${DEMO}`, company: `PT Kopi Senja Nusantara ${DEMO}`, email: 'demo.halo@contoh.co.id',
    phone: '+6281200001111', address: 'Jl. Braga No. 12, Bandung', contactPerson: 'Dewi Lestari', status: 'active',
    instagramHandle: 'kopisenja.demo', instagramBio: 'Kopi susu gula aren\nBuka setiap hari 08.00 - 22.00\nPesan lewat link di bawah',
    tiktokHandle: 'kopisenja.demo', tiktokBio: 'Ngopi santai di Bandung',
  });
  ids.client = client.id;
  const client2 = await api('POST', '/clients', {
    name: `Batik Pesisir ${DEMO}`, email: 'demo.batik@contoh.co.id', phone: '0811110000', status: 'active', instagramHandle: 'batikpesisir.demo',
  });
  ids.client2 = client2.id;

  await api('POST', `/clients/${client.id}/portal-contacts`, { email: PORTAL_EMAIL, name: `Dewi Lestari ${DEMO}` });
  await api('POST', `/clients/${client.id}/portal-contacts`, { email: 'demo.rendra@contoh.co.id', name: `Rendra Pratama ${DEMO}` });
  // The same contact also works with a second client, so the portal shows its "pick a client" screen.
  await api('POST', `/clients/${client2.id}/portal-contacts`, { email: PORTAL_EMAIL, name: `Dewi Lestari ${DEMO}` });

  // Projects -----------------------------------------------------------
  const pts = await api('GET', '/project-types');
  const ptl = Array.isArray(pts) ? pts : (pts.items || pts.data || []);
  // The planner and reports list only clients that have a SOCIAL_MEDIA project.
  ids.projectType = ptl.find((p) => p.code === 'SOCIAL_MEDIA')?.id;
  if (!ids.projectType) {
    // Fresh databases may have none; cleanup removes this one by its marker.
    const pt = await api('POST', '/project-types', { code: 'SOCIAL_MEDIA', name: `Manajemen Media Sosial ${DEMO}`, prefix: 'SM', description: 'Tipe proyek contoh' });
    ids.projectType = pt.id;
  }
  const mkProject = (description, clientId, output) => api('POST', '/projects', {
    description, output, projectTypeId: ids.projectType, clientId,
    startDate: `${ids.year}-01-01`, endDate: `${ids.year}-12-31`, estimatedBudget: 15000000,
    products: [{ name: 'Paket Konten Bulanan', description: 'Konten media sosial bulanan', price: 5000000, quantity: 1 }],
  });
  ids.project = (await mkProject(`Konten Media Sosial Bulanan ${DEMO}`, client.id, '20 konten per bulan')).id;
  ids.project2 = (await mkProject(`Kampanye Lebaran ${DEMO}`, client.id, 'Video promosi 30 detik')).id;
  ids.projectBatik = (await mkProject(`Konten Instagram ${DEMO}`, client2.id, '12 konten per bulan')).id;

  // Content planner (this client) -------------------------------------
  const long = 'Halo sahabat kopi! Es kopi susu gula aren kini hadir dengan ukuran baru. Dibuat dari biji kopi pilihan petani lokal dan gula aren asli. Pesan sekarang atau mampir ke gerai terdekat. #KopiSenja #KopiSusu #NgopiYuk';
  const items = [
    ['FEED', 'SCHEDULED', [img('menu-baru')], ['INSTAGRAM', 'TIKTOK'], 1, long],
    ['FEED', 'SCHEDULED', [img('cara-seduh-1'), img('cara-seduh-2', 1080, 1080), img('cara-seduh-3')], ['INSTAGRAM'], 3, 'Tiga langkah menyeduh kopi di rumah. Geser untuk melihat semuanya!'],
    ['REEL', 'SCHEDULED', [vid('behind-the-scenes')], ['INSTAGRAM', 'TIKTOK'], 5, 'Di balik layar pembuatan kopi susu gula aren #reels #kopi'],
    ['STORY', 'DRAFT', [img('jam-buka', 1080, 1920)], ['INSTAGRAM'], 6, 'Jam buka akhir pekan'],
    ['FEED', 'DRAFT', [], ['INSTAGRAM'], 8, 'Ide konten: testimoni pelanggan setia'],
    ['FEED', 'PUBLISHED', [img('terima-kasih')], ['INSTAGRAM'], -3, 'Terima kasih atas dukungan kalian semua!'],
    ['REEL', 'PUBLISHED', [vid('latte-art')], ['TIKTOK'], -5, 'Tutorial latte art untuk pemula #fyp #kopi'],
    ['FEED', 'SCHEDULED', [img('promo-sabtu')], ['INSTAGRAM'], 3, 'Promo akhir pekan: beli 2 gratis 1'],
    ['FEED', 'SCHEDULED', [img('single-origin')], ['INSTAGRAM'], 10, 'Single origin Toraja kini ada di menu'],
    ['REEL', 'SCHEDULED', [vid('tur-gerai')], ['INSTAGRAM'], 12, 'Tur singkat gerai baru kami'],
    ['FEED', 'SCHEDULED', [img('kolaborasi')], ['INSTAGRAM', 'TIKTOK'], 14, 'Kolaborasi dengan seniman lokal Bandung'],
  ];
  ids.content = [];
  for (const [i, [format, status, media, platforms, off, caption]] of items.entries()) {
    const when = addDays(off, 3 + (i % 5) * 2);
    const body = {
      caption: `${caption} ${DEMO}`, format, status, platforms, clientId: client.id, projectId: ids.project,
      media: media.map((m, k) => ({ ...m, order: k })),
      scheduledAt: status === 'DRAFT' && media.length === 0 ? null : iso(when), allowPastSchedule: true,
    };
    if (status === 'PUBLISHED') body.publishedAt = iso(when);
    const c = await api('POST', '/content-calendar', body);
    ids.content.push(c.id);
  }

  // Monomi's own planner (internal client) ----------------------------
  const all = await api('GET', '/clients?limit=200&includeInternal=true');
  const list = Array.isArray(all) ? all : (all.data || all.items || []);
  const internal = list.find((c) => c.isInternal);
  ids.internalClient = internal?.id;
  ids.internalContent = [];
  if (internal) {
    const own = [
      ['FEED', 'SCHEDULED', [img('showreel-2026')], ['INSTAGRAM'], 2, 'Showreel terbaru Monomi: dari ide sampai layar.'],
      ['REEL', 'SCHEDULED', [vid('di-balik-layar')], ['INSTAGRAM', 'TIKTOK'], 6, 'Di balik layar produksi video brand terbaru kami.'],
      ['FEED', 'DRAFT', [img('tips-konten')], ['INSTAGRAM'], 9, 'Tiga tips membuat konten yang konsisten.'],
    ];
    for (const [format, status, media, platforms, off, caption] of own) {
      const c = await api('POST', '/content-calendar', {
        caption: `${caption} ${DEMO}`, format, status, platforms, clientId: internal.id,
        media: media.map((m, k) => ({ ...m, order: k })), scheduledAt: iso(addDays(off, 4)), allowPastSchedule: true,
      });
      ids.internalContent.push(c.id);
    }
  }

  // Media collaboration -----------------------------------------------
  const mp = await api('POST', '/media-collab/projects', {
    name: `Hasil Foto Menu Baru ${DEMO}`, description: 'Foto dan video final untuk menu baru Kopi Senja.', clientId: client.id, projectId: ids.project,
  });
  ids.mediaProject = mp.id;
  const files = [
    ['kopi-susu-gula-aren.jpg', 1600, 1067], ['latte-art-close-up.jpg', 1067, 1600], ['barista-di-bar.jpg', 1600, 900], ['biji-kopi.jpg', 1200, 1200],
    ['interior-gerai.jpg', 1600, 1067], ['teaser-menu-baru.mp4', 1080, 1920], ['tur-gerai.mp4', 1920, 1080], ['poster-promo.jpg', 1200, 1600],
    ['cold-brew.jpg', 1000, 1000], ['logo-kopi-senja.png', 800, 800],
  ];
  const assets = files.map(([n, w, h], i) => {
    const ext = n.split('.').pop();
    return { key: `demo/m${i}_${w}x${h}.${ext}`, filename: `m${i}.${ext}`, originalName: n, mimeType: MIME[ext], size: 1200000 + i * 5000 };
  });
  await api('POST', `/media-collab/assets/register-batch/${mp.id}`, { assets });
  // Registered (not uploaded) assets have no thumbnail; point them at the placeholder URLs.
  const db = new pg.Client({ connectionString: cfg.dbUrl });
  await db.connect();
  try {
    await db.query(`UPDATE media_assets SET "thumbnailUrl" = regexp_replace(url, '\.(mp4|png)$', '.jpg') WHERE "projectId" = $1`, [mp.id]);
  } finally {
    await db.end();
  }
  await api('POST', `/media-collab/projects/${mp.id}/enable-public-sharing`, {}, undefined, { soft: true });
  const mp2 = await api('POST', '/media-collab/projects', { name: `Dokumentasi Event Pembukaan ${DEMO}`, clientId: client.id });
  ids.mediaProject2 = mp2.id;

  // Deck ---------------------------------------------------------------
  const deck = await api('POST', '/decks', { title: `Strategi Konten Kuartal Ini ${DEMO}`, clientId: client.id, projectId: ids.project });
  ids.deck = deck.id;
  const tpls = [
    ['TITLE', 'Strategi Konten', 'Kopi Senja'], ['TITLE_CONTENT', 'Tujuan Kampanye', 'Meningkatkan kunjungan gerai dan penjualan kopi susu gula aren'],
    ['TWO_COLUMN', 'Pilar Konten', 'Edukasi, promo, dan cerita pelanggan'], ['BLANK', 'Jadwal Produksi', ''],
  ];
  for (const [i, [t, ti, su]] of tpls.entries()) await api('POST', '/deck-slides', { deckId: deck.id, template: t, title: ti, subtitle: su, order: i });
  await api('PUT', `/decks/${deck.id}`, { status: 'PUBLISHED' }, undefined, { soft: true });
  await api('POST', `/decks/${deck.id}/enable-public-sharing`, { accessLevel: 'COMMENT' }, undefined, { soft: true });

  // Reports ------------------------------------------------------------
  const prevMonth = ids.month === 1 ? 12 : ids.month - 1;
  const prevYear = ids.month === 1 ? ids.year - 1 : ids.year;
  ids.prevMonth = prevMonth;
  ids.prevYear = prevYear;
  const mkReport = async (month, year) => {
    const rep = await api('POST', '/reports', {
      projectId: ids.project, title: `Laporan Media Sosial ${monthName(month)} ${year} ${DEMO}`, month, year,
      description: 'Ringkasan performa Instagram dan TikTok bulan ini.',
    });
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = String(i + 1).padStart(2, '0');
      const m = String(month).padStart(2, '0');
      return [`${year}-${m}-${d}`, 1200 + ((i * 337) % 900) + i * 40, 3400 + ((i * 521) % 1700) + i * 90, 210 + ((i * 53) % 140), 8 + ((i * 7) % 24), 12 + ((i * 11) % 40)];
    });
    const s1 = await api('POST', `/reports/${rep.id}/sections/manual`, {
      title: 'Performa Instagram Harian', description: 'Jangkauan dan interaksi per hari.', kind: 'table',
      columns: [{ name: 'Tanggal', type: 'date' }, { name: 'Jangkauan', type: 'number' }, { name: 'Impresi', type: 'number' }, { name: 'Suka', type: 'number' }, { name: 'Komentar', type: 'number' }, { name: 'Simpan', type: 'number' }],
      rows: days,
    });
    const s2 = await api('POST', `/reports/${rep.id}/sections/manual`, {
      title: 'Angka Utama Bulan Ini', kind: 'metrics',
      columns: [{ name: 'Pengikut baru', type: 'number' }, { name: 'Total jangkauan', type: 'number' }, { name: 'Engagement rate', type: 'percent' }, { name: 'Konten terbit', type: 'number' }],
      rows: [[438, 61250, 4.8, 22]],
    });
    return { rep, sections: [s1, s2] };
  };
  const prev = await mkReport(prevMonth, prevYear);
  ids.reportPrev = prev.rep.id;
  await api('POST', `/reports/${prev.rep.id}/status`, { status: 'SENT' }, undefined, { soft: true });
  // The current month is created through the UI by the guide itself.

  ids.biz = await seedBusiness(ids);
  return ids;
}
