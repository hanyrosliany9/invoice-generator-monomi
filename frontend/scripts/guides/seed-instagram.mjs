/**
 * Demo Instagram data for a client, so the report builder offers "Ambil dari Instagram" and the Instagram cards
 * show a connected account. Nothing talks to Instagram: the backend runs with INSTAGRAM_SYNC_ENABLED=false (and
 * dummy META_APP_ID / META_APP_SECRET so the integration counts as configured), and the rows are written straight
 * to Postgres with an empty token. The rows belong to a (Demo) client, so cleanup removes them with it (cascade);
 * flows that add them for one guide call removeInstagram() when they are done.
 */
import pg from 'pg';
import { cfg } from './lib.mjs';

const IG_USER_ID = '17841499990000001';

const wib = (d) => new Date(d.getTime() + 7 * 3600e3);

export async function seedInstagram(clientId, { username = 'kopisenja.demo', month, year } = {}) {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1;
  const db = new pg.Client({ connectionString: cfg.dbUrl });
  await db.connect();
  try {
    await db.query('DELETE FROM instagram_connections WHERE "clientId" = $1 OR "igUserId" = $2', [clientId, IG_USER_ID]);
    const id = `demoig${Date.now().toString(36)}`;
    await db.query(
      `INSERT INTO instagram_connections (id, "clientId", "igUserId", "igScopedUserId", username, "accountType", "profilePictureUrl", "followersCount", "mediaCount",
         "accessTokenEnc", "tokenExpiresAt", "tokenRefreshedAt", scopes, status, "lastSyncAt", "connectedBy", "activeIgUserId", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$3,$4,'BUSINESS',NULL,4820,236,NULL,$5,$6,$7,'ACTIVE',$6,'admin@monomi.id',$3,$8,$6)`,
      [id, clientId, IG_USER_ID, username, new Date(Date.now() + 55 * 86400e3), new Date(), ['instagram_business_basic', 'instagram_business_manage_insights'],
        new Date(Date.now() - 6 * 86400e3)],
    );
    // One row per day of the report month up to today (WIB).
    const today = wib(now);
    const lastDay = m === today.getUTCMonth() + 1 && y === today.getUTCFullYear() ? today.getUTCDate() : new Date(Date.UTC(y, m, 0)).getUTCDate();
    let followers = 4700;
    for (let d = 1; d <= lastDay; d += 1) {
      followers += 4 + ((d * 7) % 9);
      const reach = 1300 + ((d * 137) % 700);
      const likes = 90 + ((d * 17) % 60);
      const comments = 6 + (d % 7);
      const shares = 8 + ((d * 3) % 9);
      const saves = 12 + ((d * 5) % 11);
      const metrics = {
        reach, views: reach * 2 + 400, accounts_engaged: 80 + ((d * 11) % 50), total_interactions: likes + comments + shares + saves,
        likes, comments, shares, saves, replies: 2 + (d % 4), reposts: d % 3, profile_links_taps: 9 + (d % 8),
      };
      const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      await db.query('INSERT INTO instagram_daily_metrics (id, "connectionId", date, "followersCount", metrics, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5::jsonb,now(),now())',
        [`demoigd${d}${Date.now().toString(36)}`, id, date, followers, JSON.stringify(metrics)]);
    }
    const posts = [
      ['REELS', 'VIDEO', 'Reels: bikin es kopi susu gula aren dalam 30 detik (Demo)'],
      ['FEED', 'IMAGE', 'Menu baru bulan ini: kopi susu pandan (Demo)'],
      ['FEED', 'CAROUSEL_ALBUM', 'Tiga alasan kenapa kopi kami beda (Demo)'],
      ['REELS', 'VIDEO', 'Di balik layar sesi foto menu (Demo)'],
      ['FEED', 'IMAGE', 'Promo akhir pekan: beli 2 gratis 1 (Demo)'],
      ['FEED', 'IMAGE', 'Terima kasih sudah mampir minggu ini (Demo)'],
    ];
    for (const [i, [productType, mediaType, caption]] of posts.entries()) {
      const day = Math.min(lastDay, 1 + i);
      const reach = 2100 + i * 310;
      const likes = 140 + i * 23;
      const ts = new Date(Date.UTC(y, m - 1, day, 5, 0, 0));
      await db.query(
        `INSERT INTO instagram_media_snapshots (id, "connectionId", "mediaId", "mediaType", "mediaProductType", permalink, caption, timestamp, "thumbnailUrl", metrics, "fetchedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NULL,$9::jsonb,now())`,
        [`demoigm${i}${Date.now().toString(36)}`, id, `1789900000000${i}`, mediaType, productType, `https://www.instagram.com/p/DemoPost${i}/`, caption, ts,
          JSON.stringify({ reach, views: reach * 2, likes, comments: 9 + i * 2, shares: 12 + i, saved: 20 + i * 3, total_interactions: likes + 40 + i * 6, like_count: likes, comments_count: 9 + i * 2 })],
      );
    }
    return { id, username };
  } finally {
    await db.end();
  }
}

export async function removeInstagram(clientId) {
  const db = new pg.Client({ connectionString: cfg.dbUrl });
  await db.connect();
  try {
    await db.query('DELETE FROM instagram_connections WHERE "clientId" = $1 OR "igUserId" = $2', [clientId, IG_USER_ID]);
  } finally {
    await db.end();
  }
}
