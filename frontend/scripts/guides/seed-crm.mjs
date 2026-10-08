/**
 * Demo data for the CRM / WhatsApp inbox / auto-publishing guides (flows crm, crm-inbox, crm-publish,
 * crm-setup). Everything is marked "(Demo)" so cleanup.mjs can remove it, and nothing leaves the machine:
 * the backend must run against the fake Meta Graph (fake-meta-graph.mjs), see README.md.
 *
 * WhatsApp chats are created the way Meta delivers them, through the signed webhook, so the backend must
 * know the same secret as GUIDE_WA_APP_SECRET (META_APP_SECRET) and the same WABA / phone number ids.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import pg from 'pg';
import { api, cfg, sleep } from './lib.mjs';
import { CRM_STATE_FILE } from './cleanup.mjs';

const SECRET = process.env.GUIDE_WA_APP_SECRET || '0123456789abcdef0123456789abcdef';
const WABA = process.env.GUIDE_WA_WABA_ID || '1234567890';
const PHONE_ID = process.env.GUIDE_WA_PHONE_NUMBER_ID || '1111111111';
const BIZ_NUMBER = process.env.GUIDE_WA_DISPLAY_NUMBER || '628111111111';

const ts = (min) => String(Math.floor(Date.now() / 1000) - min * 60);
const day = (d, h = 10) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(h, 0, 0, 0); return x.toISOString(); };
const ymd = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };

async function webhook(value, field = 'messages') {
  const payload = { object: 'whatsapp_business_account', entry: [{ id: WABA, changes: [{ field, value: { messaging_product: 'whatsapp', metadata: { display_phone_number: BIZ_NUMBER, phone_number_id: PHONE_ID }, ...value } }] }] };
  const raw = JSON.stringify(payload);
  const sig = `sha256=${crypto.createHmac('sha256', SECRET).update(raw).digest('hex')}`;
  const r = await fetch(`${cfg.apiUrl}/whatsapp/webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': sig }, body: raw });
  if (r.status !== 200) throw new Error(`webhook -> ${r.status}`);
  await sleep(1100);
}
let seq = 0;
const inbound = (wa, name, text, ageMin, referral) => webhook({
  contacts: [{ profile: { name }, wa_id: wa }],
  messages: [{ from: wa, id: `wamid.DEMOIN${Date.now()}${++seq}`, timestamp: ts(ageMin), type: 'text', text: { body: text }, ...(referral ? { referral } : {}) }],
});
const adReferral = (id, headline, body, clid, image) => ({
  source_url: `https://fb.me/demo${id}`, source_id: id, source_type: 'ad', headline, body, media_type: 'image',
  image_url: `https://scontent.fcgk1-1.fna.fbcdn.net/v/${image}_1080x1080.jpg`, ctwa_clid: clid,
});

async function loginAs(email) {
  const r = await fetch(`${cfg.apiUrl}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: cfg.password }) });
  const j = await r.json();
  return (j.data ?? j).access_token;
}
const asToken = async (token, method, p, body) => {
  const r = await fetch(cfg.apiUrl + p, { method, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(`${method} ${p} -> ${r.status}`);
  return (await r.json()).data;
};

/** Remember what cleanup must restore (counters, quick replies, start time). Only written once per run. */
async function recordState() {
  if (fs.existsSync(CRM_STATE_FILE)) return;
  const db = new pg.Client({ connectionString: cfg.dbUrl });
  await db.connect();
  const counters = [];
  for (const table of ['quotation_counters', 'invoice_counters']) {
    for (const r of (await db.query(`SELECT year, month, sequence FROM ${table}`)).rows) counters.push({ table, ...r });
  }
  const qr = (await db.query('SELECT "whatsappQuickReplies" AS q FROM crm_settings LIMIT 1')).rows[0]?.q ?? null;
  await db.end();
  fs.writeFileSync(CRM_STATE_FILE, JSON.stringify({ startedAt: new Date(Date.now() - 60_000).toISOString().replace('T', ' ').replace('Z', ''), counters, quickReplies: qr }, null, 1));
}

/** Campaigns, spend, quick replies, WhatsApp chats and leads. Returns ids for the flows. */
export async function seedCrm() {
  await recordState();
  const ids = {};
  const stages = await api('GET', '/crm/stages');
  const S = Object.fromEntries(stages.map((s) => [s.key, s.id]));
  const me = (await api('GET', '/crm/assignees'))[0].id;
  ids.me = me;

  const camp = (name, code, platform, budget, msg) => api('POST', '/crm/campaigns', { name: `${name} (Demo)`, code, platform, status: 'ACTIVE', budget, prefillMessage: msg });
  const c1 = await camp('Promo Video Oktober', 'FB-OKT1', 'BOTH', 6000000, 'Halo Monomi, saya tertarik dengan paket video produk. Boleh minta info harganya? [FB-OKT1]');
  const c2 = await camp('Promo Reels Foto Produk', 'IG-REELS2', 'INSTAGRAM', 3000000, 'Halo Monomi, saya lihat promo reels dan ingin tanya soal foto produk. [IG-REELS2]');
  ids.c1 = c1.id; ids.c2 = c2.id;
  // Ad spend comes from Meta: the real sync code runs against fake-meta-graph.mjs (account, campaigns, ads, paged
  // daily insights) and links the two Meta campaigns, which carry the same names, to these CRM campaigns.
  ids.metaSync = await api('POST', '/crm/meta-ads/sync', {}, undefined, { soft: true });
  console.log('  meta ads sync:', JSON.stringify(ids.metaSync)?.slice(0, 200));
  // Only what Meta cannot know is typed in by hand: one "other costs" entry (creative + studio).
  await api('POST', `/crm/campaigns/${c1.id}/spend`, { dateFrom: ymd(-5), dateTo: ymd(-5), amount: 1200000, note: 'Kreatif dan sewa studio (Demo)' });

  await api('PUT', '/whatsapp/quick-replies', { items: [
    { title: 'Salam pembuka', text: 'Halo, terima kasih sudah menghubungi Monomi Agency! Ada yang bisa kami bantu?' },
    { title: 'Daftar harga', text: 'Paket video produk kami mulai dari Rp 5.000.000 untuk 3 video. Boleh kami kirim daftar harga lengkapnya?' },
    { title: 'Minta brief', text: 'Boleh bagikan nama brand, target audiens, dan jumlah video yang dibutuhkan?' },
    { title: 'Jadwalkan telepon', text: 'Apakah besok Anda ada waktu untuk telepon singkat? Kabari jam yang cocok ya.' },
  ] });

  // ---- WhatsApp chats (leads are created by the webhook, like in real life) ----
  const RINA = '6281212341204'; const DEWI = '6281300005530'; const BUDI = '6285712349921';
  const AGUS = '6281911110002'; const HADI = '6281911110004';
  await inbound(RINA, 'Rina Wijaya (Demo)', 'Halo Monomi, saya tertarik dengan paket video produk. Boleh minta info harganya? [FB-OKT1]', 95,
    adReferral('120210000000001', 'Paket Video Produk - Promo Oktober', 'Video produk profesional untuk brand Anda. Chat sekarang untuk daftar harga!', 'ARDemoClid0001xyz', 'demo-ad-video-produk'));
  const findConv = async (q) => ((await api('GET', `/whatsapp/conversations?q=${encodeURIComponent(q)}`)).items ?? [])[0];
  const rina = await findConv('Rina');
  ids.rinaConv = rina.id;
  await api('POST', `/whatsapp/conversations/${rina.id}/messages`, { text: 'Halo Kak Rina! Terima kasih sudah tertarik. Paket video produk kami mulai Rp 5.000.000 untuk 3 video. Boleh kami kirim daftar harga lengkapnya?' });
  const msgs = await api('GET', `/whatsapp/conversations/${rina.id}/messages`);
  const out = (msgs.items ?? msgs).find((m) => m.direction === 'OUT');
  const wamid = out?.waMessageId;
  if (wamid) {
    await webhook({ statuses: [{ id: wamid, status: 'delivered', timestamp: ts(88), recipient_id: RINA }] });
    await webhook({ statuses: [{ id: wamid, status: 'read', timestamp: ts(80), recipient_id: RINA }] });
  }
  await webhook({ contacts: [{ profile: { name: 'Rina Wijaya (Demo)' }, wa_id: RINA }], messages: [{ from: RINA, id: 'wamid.DEMOIN_R2', timestamp: ts(60), type: 'text', text: { body: 'Boleh, tolong kirim daftar harganya. Kami butuh 3 video untuk lini skincare baru.' } }] });
  await webhook({ message_echoes: [{ from: BIZ_NUMBER, to: RINA, id: 'wamid.DEMOECHO1', timestamp: ts(45), type: 'text', text: { body: 'Siap! Daftar harga kami kirim sebagai PDF sekarang ya, dibalas langsung dari aplikasi di HP.' } }] }, 'smb_message_echoes');
  await webhook({ contacts: [{ profile: { name: 'Rina Wijaya (Demo)' }, wa_id: RINA }], messages: [{ from: RINA, id: 'wamid.DEMOIN_R3', timestamp: ts(7), type: 'text', text: { body: 'Sudah saya terima, terima kasih! Bisa jadwalkan telepon besok?' } }] });

  await webhook({ contacts: [{ profile: { name: 'Dewi Lestari (Demo)' }, wa_id: DEWI }], messages: [{ from: DEWI, id: 'wamid.DEMOIN_D1', timestamp: ts(30), type: 'text', text: { body: 'Halo Monomi, saya tertarik dengan paket video produk [FB-OKT1]' }, referral: adReferral('120210000000002', 'Paket Reels untuk F&B', 'Reels bulanan untuk kafe atau toko kue Anda.', 'ARDemoClid0002xyz', 'demo-ad-reels-fnb') }] });
  for (const [i, t] of ['Saya punya toko kue, namanya Toko Kue Manis.', 'Kami butuh sekitar 4 Reels per bulan mulai November.', 'Ada contoh portofolio untuk F&B?'].entries()) {
    await webhook({ contacts: [{ profile: { name: 'Dewi Lestari (Demo)' }, wa_id: DEWI }], messages: [{ from: DEWI, id: `wamid.DEMOIN_D${i + 2}`, timestamp: ts(25 - i * 4), type: 'text', text: { body: t } }] });
  }
  await webhook({ contacts: [{ profile: { name: 'Budi Santoso (Demo)' }, wa_id: BUDI }], messages: [{ from: BUDI, id: 'wamid.DEMOIN_B1', timestamp: ts(150), type: 'text', text: { body: 'Halo Monomi, saya lihat promo reels dan ingin tanya soal foto produk. [IG-REELS2]' }, referral: adReferral('120210000000003', 'Promo Reels Foto Produk', 'Foto produk yang membuat orang membeli.', 'ARDemoClid0003xyz', 'demo-ad-foto-produk') }] });
  await webhook({ contacts: [{ profile: { name: 'Budi Santoso (Demo)' }, wa_id: BUDI }], messages: [{ from: BUDI, id: 'wamid.DEMOIN_B2', timestamp: ts(140), type: 'text', text: { body: 'Berapa harga untuk 20 foto produk?' } }] });
  await webhook({ contacts: [{ profile: { name: 'Agus Prasetyo (Demo)' }, wa_id: AGUS }], messages: [{ from: AGUS, id: 'wamid.DEMOIN_A1', timestamp: ts(30 * 60), type: 'text', text: { body: 'Halo Monomi, tanya paket video untuk toko saya.' } }] });
  await webhook({ contacts: [{ profile: { name: 'Hadi Kusuma (Demo)' }, wa_id: HADI }], messages: [{ from: HADI, id: 'wamid.DEMOIN_H1', timestamp: ts(600), type: 'text', text: { body: 'Selamat pagi, kami butuh video company profile untuk pabrik kami.' } }] });
  const convs = (await api('GET', '/whatsapp/conversations')).items;
  const conv = (q) => convs.find((c) => JSON.stringify(c).includes(q));
  ids.conv = { rina: rina.id, dewi: conv(DEWI).id, budi: conv(BUDI).id, agus: conv(AGUS).id, hadi: conv(HADI).id };
  await api('POST', `/whatsapp/conversations/${ids.conv.hadi}/read`);
  await api('POST', `/whatsapp/conversations/${ids.conv.hadi}/messages`, { text: 'Selamat pagi Pak Hadi, dengan senang hati. Boleh dibagikan lokasi pabrik dan durasi videonya?' }).catch(() => {});

  // ---- leads (the webhook already made Rina, Dewi, Budi, Agus, Hadi) ----
  const C = { 'FB-OKT1': c1.id, 'IG-REELS2': c2.id };
  const leads = (await api('GET', '/crm/leads')).items;
  const L = (q) => leads.find((l) => l.name.includes(q));
  ids.lead = { rina: L('Rina').id, dewi: L('Dewi').id, budi: L('Budi').id, agus: L('Agus').id, hadi: L('Hadi').id };
  const mk = async (name, phone, camp, stage, value, extra = {}) => {
    const l = await api('POST', '/crm/leads', { name: `${name} (Demo)`, phone, campaignId: camp ? C[camp] : undefined, estimatedValue: value, assignedToId: me, firstMessage: extra.msg, source: extra.source, company: extra.company, allowDuplicate: true });
    if (stage !== 'NEW') await api('POST', `/crm/leads/${l.id}/stage`, { stageId: S[stage] });
    return l;
  };
  const maya = await mk('Maya Tanjung', '081911110003', 'IG-REELS2', 'MEETING', 15000000, { msg: 'Ingin reels untuk toko baju saya' });
  const sari = await mk('Sari Nugroho', '081911110005', 'FB-OKT1', 'PROPOSAL', 25000000, { msg: 'Mau paket konten bulanan', company: 'Sari Boutique (Demo)' });
  const toni = await mk('Toni Rahman', '081911110006', 'FB-OKT1', 'NEW', 5000000, { msg: 'Berapa harga foto produk?' });
  const kopi = await mk('Kopi Senja', '081377770001', null, 'NEW', 0, { source: 'REFERRAL' });
  const lina = await mk('Lina Hartono', '081911110007', 'IG-REELS2', 'QUALIFIED', 9000000, { msg: 'Halo, bisa buat video unboxing?' });
  await api('POST', `/crm/leads/${toni.id}/lost`, { reason: 'Terlalu mahal' });
  await api('POST', `/crm/leads/${ids.lead.rina}/stage`, { stageId: S.QUALIFIED });
  await api('POST', `/crm/leads/${ids.lead.dewi}/stage`, { stageId: S.QUALIFIED });
  await api('POST', `/crm/leads/${ids.lead.hadi}/stage`, { stageId: S.PROPOSAL });
  await api('PATCH', `/crm/leads/${ids.lead.dewi}`, { estimatedValue: 12000000, company: 'Toko Kue Manis (Demo)' });
  await api('PATCH', `/crm/leads/${ids.lead.rina}`, { estimatedValue: 7500000, company: 'Glow Skincare (Demo)' });
  await api('POST', `/crm/leads/${ids.lead.dewi}/activities`, { type: 'NOTE', body: 'Butuh 4 Reels per bulan mulai November. Minta contoh portofolio F&B.' });
  await api('POST', `/crm/leads/${ids.lead.rina}/activities`, { type: 'CALL', body: 'Bahas 3 video untuk lini skincare baru. Proposal segera dikirim.' });
  await api('POST', `/crm/leads/${ids.lead.dewi}/follow-up`, { at: new Date(Date.now() + 3 * 3600e3).toISOString(), note: 'kirim contoh portofolio F&B' });
  await api('POST', `/crm/leads/${ids.lead.agus}/follow-up`, { at: new Date(Date.now() - 3600e3).toISOString(), note: 'telepon balik soal harga' });
  ids.lead.maya = maya.id; ids.lead.sari = sari.id; ids.lead.toni = toni.id; ids.lead.kopi = kopi.id; ids.lead.lina = lina.id;

  await seedLandingLeads(ids);

  // Sari and Budi become clients: draft quotation -> approved -> Won (feeds the dashboard).
  const sa = await loginAs('superadmin@monomi.id');
  for (const [leadId, amount] of [[sari.id, 25000000], [ids.lead.budi, 6500000]]) {
    const conv = await api('POST', `/crm/leads/${leadId}/convert`, { createProject: true, createQuotation: true, amount });
    await asToken(sa, 'PATCH', `/quotations/${conv.quotationId}/status`, { status: 'SENT' });
    await asToken(sa, 'PATCH', `/quotations/${conv.quotationId}/status`, { status: 'APPROVED' });
  }
  return ids;
}

/* ------------------------------------------------------------------ */
/*  Landing-page taps (link.monomiagency.com), through the real public endpoint  */
/* ------------------------------------------------------------------ */

const TRACK_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const LANDING = 'https://link.monomiagency.com/';
let tapSeq = 0;
/** Marker of every demo visit: cleanup finds the clicks (and the leads they created) by it. */
export const DEMO_VISIT_PREFIX = 'demo-visit-';

async function trackEvent(body, ip) {
  const r = await fetch(`${cfg.apiUrl}/public/track/event`, {
    method: 'POST',
    headers: { 'content-type': 'text/plain', 'x-forwarded-for': ip, 'user-agent': TRACK_UA },
    body: JSON.stringify(body),
  });
  if (r.status !== 200) throw new Error(`track event -> ${r.status}`);
}

/**
 * One visitor of the landing page. `verified` sends the PageView first (and waits for the 3 s minimum age), which
 * makes the WhatsApp tap pass the anti-abuse gate and create a waiting lead. Without it the tap is only stored,
 * ready to be linked by its Kode. Each visitor gets its own documentation-range IP so the per-network cap never bites.
 */
async function landingTap({ ref, verified, meta, metaCampaignId, metaAdId, ip }) {
  const n = ++tapSeq;
  const visitId = `${DEMO_VISIT_PREFIX}${Date.now().toString(36)}${n}`;
  const utm = metaCampaignId ? { source: 'meta', medium: 'paid', campaign: metaCampaignId, content: metaAdId } : {};
  const pageUrl = metaCampaignId ? `${LANDING}?utm_source=meta&utm_medium=paid&utm_campaign=${metaCampaignId}&utm_content=${metaAdId}` : LANDING;
  if (verified) {
    await trackEvent({ name: 'PageView', visitId, eventId: `${visitId}-pv`, pageUrl, utm }, ip);
    await sleep(3600);
  }
  await trackEvent({ name: 'Lead', visitId, eventId: `${visitId}-lead`, ref, pageUrl, utm, meta }, ip);
  await sleep(600);
}

/**
 * Landing-page leads: two waiting leads (one with Instagram, brand and category, one that skipped the form),
 * a tap that is only stored for the "Kode" chat step, and a tap linked to Rina's lead through its Kode.
 */
async function seedLandingLeads(ids) {
  const campaigns = await api('GET', '/crm/campaigns').catch(() => []);
  const metaOf = (code) => (Array.isArray(campaigns) ? campaigns : campaigns.items ?? []).find((c) => c.code === code)?.metaCampaignId;
  const m1 = metaOf('FB-OKT1') ?? '120210100000001';
  const m2 = metaOf('IG-REELS2') ?? '120210100000002';
  await landingTap({
    ref: 'D7NAR2', verified: true, ip: '203.0.113.21', metaCampaignId: m1, metaAdId: '120210200000001',
    meta: { instagram: '@dapurnara.id', brandName: 'Dapur Nara (Demo)', category: 'Makanan & Minuman' },
  });
  await landingTap({ ref: 'V8T3QX', verified: true, ip: '203.0.113.22', metaCampaignId: m2, metaAdId: '120210200000003', meta: {} });
  ids.refs = { waitingForm: 'D7NAR2', waitingSkipped: 'V8T3QX', chat: 'K7QM2X', linked: 'R4NA9P' };
  // stored taps (no PageView first): linkable by their Kode, no lead is created
  await landingTap({
    ref: ids.refs.chat, verified: false, ip: '203.0.113.23', metaCampaignId: m1, metaAdId: '120210200000002',
    meta: { instagram: '@tokobunga.mawar' },
  });
  await landingTap({ ref: ids.refs.linked, verified: false, ip: '203.0.113.24', metaCampaignId: m1, metaAdId: '120210200000001', meta: { instagram: '@glowskin.id', brandName: 'Glow Skincare', category: 'Skincare' } });
  await api('POST', `/crm/leads/${ids.lead.rina}/ad-click`, { code: ids.refs.linked });
  // visitors who only looked at the page and never tapped WhatsApp: real traffic always has more visits than taps
  for (const [i, ip] of ['203.0.113.31', '203.0.113.32', '203.0.113.33', '203.0.113.34'].entries()) {
    const visitId = `${DEMO_VISIT_PREFIX}browse${Date.now().toString(36)}${i}`;
    await trackEvent({ name: 'PageView', visitId, eventId: `${visitId}-pv`, pageUrl: LANDING, utm: {} }, ip);
  }
  const leads = (await api('GET', '/crm/leads?awaiting=true')).items ?? [];
  ids.waiting = {
    form: leads.find((l) => /Dapur Nara/.test(l.name))?.id,
    skipped: leads.find((l) => /Website visitor/.test(l.name))?.id,
  };
  console.log('  waiting leads:', JSON.stringify(ids.waiting));
}

/** Monomi (internal client) content with Instagram + Facebook auto-publishing: published, scheduled, failed, plain. */
export async function seedPublishing(ids = {}) {
  await recordState();
  const db = new pg.Client({ connectionString: cfg.dbUrl });
  await db.connect();
  const monomi = (await db.query(`SELECT id FROM clients WHERE "isInternal" = true LIMIT 1`)).rows[0];
  await db.end();
  if (!monomi) throw new Error('internal Monomi client not found');
  ids.monomi = monomi.id;
  const media = (n) => [{ url: `https://media.monomiagency.com/content/demo/demo-${n}_1080x1350.jpg`, key: `content/2026-10-07/demo-${n}_1080x1350.jpg`, mimeType: 'image/jpeg', size: 245000, width: 1080, height: 1350, originalName: `demo-${n}.jpg`, order: 0 }];
  const mk = (d) => api('POST', '/content-calendar', { clientId: monomi.id, format: 'FEED', ...d });
  const BOTH = ['INSTAGRAM', 'FACEBOOK'];
  const pub = await mk({ caption: 'Di balik layar sesi foto produk terbaru kami (Demo). Lampu, kamera, aksi! #MonomiAgency #BTS', platforms: BOTH, status: 'SCHEDULED', scheduledAt: day(3), autoPublish: true, autoPublishTargets: BOTH, media: media('bts') });
  const sch = await mk({ caption: 'Bulan baru, tampilan baru: promo video Oktober sudah tayang (Demo). DM kami untuk booking! #PromoVideo', platforms: BOTH, status: 'SCHEDULED', scheduledAt: day(2, 18), autoPublish: true, autoPublishTargets: BOTH, media: media('promo') });
  const fail = await mk({ caption: 'FAILME Teaser Reels: 3 tips foto produk yang menarik (Demo)', platforms: ['INSTAGRAM'], status: 'SCHEDULED', scheduledAt: day(4, 9), autoPublish: true, autoPublishTargets: ['INSTAGRAM'], media: media('tips') });
  await mk({ caption: 'Sorotan klien: Toko Kue Manis (Demo), intip proses syuting Reels kami', platforms: ['INSTAGRAM'], status: 'DRAFT', scheduledAt: day(6, 12), media: media('klien') });
  await mk({ caption: 'Tips mingguan: pencahayaan untuk studio produk kecil (Demo)', platforms: ['FACEBOOK'], status: 'SCHEDULED', scheduledAt: day(8, 14), media: media('cahaya') });
  ids.pub = pub.id; ids.sch = sch.id; ids.fail = fail.id;
  // Publish two of them now (fake Graph): one succeeds, the FAILME one ends up Failed.
  for (const id of [pub.id, fail.id]) await api('POST', `/social-publishing/items/${id}/publish`, {}).catch((e) => console.log('  publish:', e.message));
  await sleep(7000);
  return ids;
}
