import { InstagramGraphClient } from "./instagram-graph.client";
import { InstagramApiService } from "./instagram-api.service";
import { InstagramTokenService, refreshDecision } from "./instagram-token.service";
import {
  addDays,
  daysToSync,
  InstagramSyncService,
  keyFailureAbort,
  PERMISSION_NOTE,
  wibMidnight,
} from "./instagram-sync.service";
import { createHash } from "crypto";
import { encryptToken, decryptToken, tokenAad, tokenKeyFingerprint } from "./utils/token-crypto";
import { FakeGraph, FakePrisma, graphError, testConfig } from "./testing/instagram-fakes.helper-spec";

const TOKEN = "IGAAcurrentTokenValue_0123456789abcdefghijklmnopqrstuvwxyz";
const DAY = 86400000;
// 2026-10-03 10:00 WIB
const NOW = new Date("2026-10-03T03:00:00Z");

function silence(...objs: any[]) {
  for (const o of objs) {
    const logger = o?.logger;
    if (logger) for (const m of ["log", "warn", "error", "debug"]) jest.spyOn(logger, m).mockImplementation(() => undefined);
  }
}

function setup(conn: Record<string, any> = {}) {
  const prisma = new FakePrisma();
  const graph = new FakeGraph();
  const cfg = testConfig({
    accountMetrics: ["reach", "views", "total_interactions", "follows_and_unfollows"],
    accountSeriesMetrics: ["follower_count"],
    feedMetrics: ["reach", "views", "likes", "total_interactions"],
    reelsMetrics: ["reach", "views", "ig_reels_avg_watch_time"],
    backfillDays: 3,
  });
  const client = new InstagramGraphClient(graph.fetch as any);
  const api = new InstagramApiService(client, cfg);
  const tokens = new InstagramTokenService(prisma as any, api, cfg);
  tokens.now = () => NOW;
  const sync = new InstagramSyncService(prisma as any, api, tokens, cfg, null);
  sync.now = () => NOW;
  sync.sleep = async () => undefined;
  silence(client, tokens, sync);
  prisma.instagramConnection.rows.push({
    id: "conn-1",
    clientId: "client-a",
    igUserId: "1784",
    username: "brandco",
    status: "ACTIVE",
    scopes: ["instagram_business_basic", "instagram_business_manage_insights"],
    accessTokenEnc: encryptToken(TOKEN, cfg.tokenKey, tokenAad("client-a")),
    tokenExpiresAt: new Date(NOW.getTime() + 50 * DAY),
    tokenRefreshedAt: new Date(NOW.getTime() - 10 * DAY),
    createdAt: new Date(NOW.getTime() - 10 * DAY),
    lastSyncAt: null,
    ...conn,
  });

  graph.on("GET /me", { id: "9001", user_id: "1784", username: "brandco", account_type: "BUSINESS", followers_count: 1500, media_count: 3 });
  // Account totals: follows_and_unfollows is rejected (e.g. < 100 followers).
  graph.on("GET /1784/insights", (url: URL) => {
    const metric = url.searchParams.get("metric")!;
    if (url.searchParams.get("metric_type") !== "total_value") {
      // follower_count time series
      return {
        body: {
          data: [
            {
              name: "follower_count",
              period: "day",
              values: [
                { value: 4, end_time: "2026-10-01T07:00:00+0000" },
                { value: 6, end_time: "2026-10-02T07:00:00+0000" },
              ],
            },
          ],
        },
      };
    }
    if (metric.split(",").includes("follows_and_unfollows")) return graphError(100, "(#100) metric[3] must be one of the following values");
    const since = Number(url.searchParams.get("since"));
    const dayIdx = Math.round((since * 1000 - wibMidnight("2026-09-30").getTime()) / DAY);
    const values: Record<string, number> = { reach: 100 + dayIdx, views: 300 + dayIdx, total_interactions: 10 + dayIdx };
    return {
      body: { data: metric.split(",").filter((m) => m in values).map((m) => ({ name: m, period: "day", total_value: { value: values[m] } })) },
    };
  });
  graph.on("GET /1784/media", {
    data: [
      { id: "m-reel", media_type: "VIDEO", media_product_type: "REELS", caption: "Reel launch\u0007", timestamp: "2026-10-01T05:00:00+0000", permalink: "https://www.instagram.com/reel/abc/", like_count: 50, comments_count: 5 },
      { id: "m-feed", media_type: "IMAGE", media_product_type: "FEED", caption: "Photo", timestamp: "2026-09-20T05:00:00+0000", permalink: "https://www.instagram.com/p/def/" },
      { id: "m-old", media_type: "IMAGE", media_product_type: "FEED", timestamp: "2025-01-01T00:00:00+0000" },
    ],
    paging: { next: "https://evil.example/steal?access_token=x" },
  });
  graph.on("GET /m-reel/insights", (url: URL) => {
    const metrics = url.searchParams.get("metric")!.split(",");
    if (metrics.includes("ig_reels_avg_watch_time") && metrics.length === 1) return graphError(100, "unsupported");
    if (metrics.length > 1 && metrics.includes("ig_reels_avg_watch_time")) return graphError(100, "unsupported");
    const v: Record<string, number> = { reach: 900, views: 2000 };
    return { body: { data: metrics.filter((m) => m in v).map((m) => ({ name: m, period: "lifetime", values: [{ value: v[m] }] })) } };
  });
  graph.on("GET /m-feed/insights", (url: URL) => {
    const metrics = url.searchParams.get("metric")!.split(",");
    const v: Record<string, number> = { reach: 400, views: 700, likes: 30, total_interactions: 41 };
    return { body: { data: metrics.map((m) => ({ name: m, period: "lifetime", values: [{ value: v[m] }] })) } };
  });
  return { prisma, graph, cfg, api, tokens, sync };
}

describe("daysToSync", () => {
  it("first sync backfills the window ending yesterday (WIB)", () => {
    expect(daysToSync(null, NOW, 3)).toEqual(["2026-09-30", "2026-10-01", "2026-10-02"]);
  });
  it("always re-fetches the last 3 completed days and fills gaps since the last sync", () => {
    expect(daysToSync(new Date("2026-10-02T19:00:00Z"), NOW, 30)).toEqual(["2026-09-30", "2026-10-01", "2026-10-02"]);
    expect(daysToSync(new Date("2026-09-20T19:00:00Z"), NOW, 30)[0]).toBe("2026-09-18");
    expect(daysToSync(new Date("2025-01-01T00:00:00Z"), NOW, 5)).toHaveLength(5);
  });
  it("addDays / wibMidnight", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(wibMidnight("2026-10-01").toISOString()).toBe("2026-09-30T17:00:00.000Z");
  });
});

describe("token refresh", () => {
  const base = { createdAt: new Date(NOW.getTime() - 50 * DAY), tokenRefreshedAt: null as Date | null };
  it("decides refresh only for tokens >= 24h old expiring within ~10 days", () => {
    expect(refreshDecision({ ...base, tokenExpiresAt: new Date(NOW.getTime() + 5 * DAY) }, NOW)).toBe("refresh");
    expect(refreshDecision({ ...base, tokenExpiresAt: new Date(NOW.getTime() + 30 * DAY) }, NOW)).toBe("ok");
    expect(
      refreshDecision({ createdAt: NOW, tokenRefreshedAt: new Date(NOW.getTime() - 3600_000), tokenExpiresAt: new Date(NOW.getTime() + 5 * DAY) }, NOW),
    ).toBe("ok");
    expect(refreshDecision({ ...base, tokenExpiresAt: new Date(NOW.getTime() - 1) }, NOW)).toBe("expired");
  });

  it("refreshes and re-encrypts when due", async () => {
    const ctx = setup({ tokenExpiresAt: new Date(NOW.getTime() + 3 * DAY) });
    ctx.graph.on("GET /refresh_access_token", { access_token: "IGAArefreshedToken_abcdefghijklmnopqrstuvwxyz0123456789", expires_in: 5184000 });
    const row = ctx.prisma.instagramConnection.rows[0];
    const t = await ctx.tokens.freshToken(row as any);
    expect(t).toBe("IGAArefreshedToken_abcdefghijklmnopqrstuvwxyz0123456789");
    expect(decryptToken(row.accessTokenEnc, ctx.cfg.tokenKey, tokenAad("client-a"))).toBe(t);
    expect(row.tokenExpiresAt.getTime()).toBe(NOW.getTime() + 5184000 * 1000);
    expect(row.tokenRefreshedAt).toEqual(NOW);
  });

  it("marks the connection EXPIRED (token dropped) when refresh is refused", async () => {
    const ctx = setup({ tokenExpiresAt: new Date(NOW.getTime() + 3 * DAY) });
    ctx.graph.on("GET /refresh_access_token", () => graphError(190, "Error validating access token", 400, 463));
    const r = await ctx.sync.syncConnection("conn-1");
    expect(r).toMatchObject({ status: "failed", reason: "token" });
    expect(ctx.prisma.instagramConnection.rows[0]).toMatchObject({ status: "EXPIRED", accessTokenEnc: null });
  });

  it("an already-expired token is marked EXPIRED without calling Meta", async () => {
    const ctx = setup({ tokenExpiresAt: new Date(NOW.getTime() - DAY) });
    await ctx.sync.syncConnection("conn-1");
    expect(ctx.prisma.instagramConnection.rows[0].status).toBe("EXPIRED");
    expect(ctx.graph.calls).toHaveLength(0);
  });

  it("a transient refresh failure keeps using the current token", async () => {
    const ctx = setup({ tokenExpiresAt: new Date(NOW.getTime() + 3 * DAY) });
    ctx.graph.on("GET /refresh_access_token", () => ({ status: 500, body: { error: { code: 2, message: "temporarily unavailable" } } }));
    const r = await ctx.sync.syncConnection("conn-1");
    expect(r.status).toBe("ok");
    expect(ctx.prisma.instagramConnection.rows[0].status).toBe("ACTIVE");
  });
});

describe("InstagramSyncService.syncConnection", () => {
  it("stores profile, daily totals, follower series and media; tolerates rejected metrics", async () => {
    const ctx = setup();
    const r = await ctx.sync.syncConnection("conn-1");
    expect(r.status).toBe("ok");
    expect(r.daysSynced).toBe(3);
    expect(r.failedMetrics).toEqual(expect.arrayContaining(["follows_and_unfollows", "reels:ig_reels_avg_watch_time"]));

    const days = Object.fromEntries(
      ctx.prisma.instagramDailyMetric.rows.map((d) => [d.date.toISOString().slice(0, 10), d]),
    );
    expect(days["2026-10-01"].metrics).toEqual({ reach: 101, views: 301, total_interactions: 11, follower_count: 6 });
    expect(days["2026-09-30"].metrics.follower_count).toBe(4);
    expect(days["2026-10-03"].followersCount).toBe(1500); // today's snapshot
    expect(days["2026-10-01"].metrics).not.toHaveProperty("follows_and_unfollows");

    const media = Object.fromEntries(ctx.prisma.instagramMediaSnapshot.rows.map((m) => [m.mediaId, m]));
    expect(Object.keys(media).sort()).toEqual(["m-feed", "m-reel"]); // old post outside lookback
    expect(media["m-reel"].metrics).toEqual({ reach: 900, views: 2000, likes: 50, comments: 5 });
    expect(media["m-reel"].caption).toBe("Reel launch");
    expect(media["m-feed"].metrics).toMatchObject({ views: 700, total_interactions: 41 });

    const conn = ctx.prisma.instagramConnection.rows[0];
    expect(conn.lastSyncAt).toEqual(NOW);
    expect(conn.followersCount).toBe(1500);
    expect(conn.lastError).toMatch(/follows_and_unfollows/);
    // Pagination to a foreign host (would leak the token) is never followed.
    expect(ctx.graph.calls.some((c) => c.url.host === "evil.example")).toBe(false);
    // Rejected metric is not retried on later days of the same run.
    const totalsCalls = ctx.graph.calls.filter((c) => c.path === "/1784/insights" && c.url.searchParams.get("metric_type"));
    expect(totalsCalls.filter((c) => c.url.searchParams.get("metric") === "follows_and_unfollows")).toHaveLength(1);
  });

  it("missing data is stored as absent (null), never as zero", async () => {
    const ctx = setup();
    ctx.graph.on("GET /1784/insights", (url: URL) =>
      url.searchParams.get("metric_type") ? { body: { data: [] } } : { body: { data: [] } },
    );
    await ctx.sync.syncConnection("conn-1");
    const d = ctx.prisma.instagramDailyMetric.rows.find((x) => x.date.toISOString().startsWith("2026-10-01"));
    expect(d?.metrics).toEqual({});
  });

  it("stops on a rate limit, keeps what was stored and does not advance lastSyncAt", async () => {
    const ctx = setup();
    let n = 0;
    ctx.graph.on("GET /1784/insights", () => {
      n++;
      if (n >= 2) return graphError(4, "Application request limit reached");
      return { body: { data: [{ name: "reach", total_value: { value: 5 } }] } };
    });
    const r = await ctx.sync.syncConnection("conn-1");
    expect(r).toMatchObject({ status: "failed", reason: "rate_limit" });
    const conn = ctx.prisma.instagramConnection.rows[0];
    expect(conn.status).toBe("ACTIVE");
    expect(conn.lastSyncAt).toBeNull();
    expect(conn.lastError).toMatch(/rate limit/i);
    expect(ctx.prisma.instagramDailyMetric.rows.some((d) => d.metrics.reach === 5)).toBe(true);
  });

  it("stops early (partial) when usage headers approach the limit", async () => {
    const ctx = setup();
    ctx.graph.on("GET /me", () => ({
      body: { id: "9001", user_id: "1784", username: "brandco", followers_count: 1 },
      headers: { "x-business-use-case-usage": JSON.stringify({ "1784": [{ type: "instagram", call_count: 96 }] }) },
    }));
    const r = await ctx.sync.syncConnection("conn-1");
    expect(r.status).toBe("partial");
    expect(r.daysSynced).toBe(0);
    expect(ctx.prisma.instagramConnection.rows[0].lastSyncAt).toBeNull();
  });

  it("explains Standard-Access permission errors", async () => {
    const ctx = setup();
    ctx.graph.on("GET /1784/insights", () => graphError(10, "(#10) Application does not have permission for this action", 403));
    await ctx.sync.syncConnection("conn-1");
    expect(ctx.prisma.instagramConnection.rows[0].lastError).toContain(PERMISSION_NOTE);
  });

  it("skips insights calls when the insights scope was not granted", async () => {
    const ctx = setup({ scopes: ["instagram_business_basic"] });
    await ctx.sync.syncConnection("conn-1");
    expect(ctx.graph.calls.some((c) => c.path.endsWith("/insights"))).toBe(false);
    expect(ctx.prisma.instagramConnection.rows[0].lastError).toMatch(/Izin insights/);
  });

  it("token errors during sync flag the connection for reconnection", async () => {
    const ctx = setup();
    ctx.graph.on("GET /me", () => graphError(190, "Session has been invalidated", 400, 460));
    await ctx.sync.syncConnection("conn-1");
    expect(ctx.prisma.instagramConnection.rows[0]).toMatchObject({ status: "REVOKED", accessTokenEnc: null });
  });

  it("never runs two syncs of the same connection at once; skips inactive ones", async () => {
    const ctx = setup();
    const [a, b] = await Promise.all([ctx.sync.syncConnection("conn-1"), ctx.sync.syncConnection("conn-1")]);
    expect([a.status, b.status].sort()).toEqual(["ok", "skipped"]);
    ctx.prisma.instagramConnection.rows[0].status = "REVOKED";
    expect((await ctx.sync.syncConnection("conn-1")).status).toBe("skipped");
  });

  it("hourly story job stores live stories with story metrics", async () => {
    const ctx = setup();
    ctx.graph.on("GET /1784/stories", { data: [{ id: "s1", media_type: "IMAGE", timestamp: "2026-10-03T01:00:00+0000" }] });
    ctx.graph.on("GET /s1/insights", (url: URL) => {
      const ms = url.searchParams.get("metric")!.split(",");
      return { body: { data: ms.filter((m) => m === "reach" || m === "replies").map((m) => ({ name: m, values: [{ value: m === "reach" ? 80 : 2 }] })) } };
    });
    expect(await ctx.sync.storySync()).toBe(1);
    const s = ctx.prisma.instagramMediaSnapshot.rows.find((m) => m.mediaId === "s1")!;
    expect(s.mediaProductType).toBe("STORY");
    expect(s.metrics).toEqual({ reach: 80, replies: 2 });
    const asked = ctx.graph.calls.find((c) => c.path === "/s1/insights")!.url.searchParams.get("metric")!;
    expect(asked).not.toMatch(/impressions|link_clicks/);
  });
});

/** Same graph + database, different TOKEN_ENCRYPTION_KEY (a rotated / mistyped key). */
function withKey(ctx: ReturnType<typeof setup>, key: Buffer) {
  const cfg = { ...ctx.cfg, tokenKey: key };
  const graphClient = new InstagramGraphClient(ctx.graph.fetch as any);
  const api = new InstagramApiService(graphClient, cfg);
  const tokens = new InstagramTokenService(ctx.prisma as any, api, cfg);
  tokens.now = () => NOW;
  const sync = new InstagramSyncService(ctx.prisma as any, api, tokens, cfg, null);
  sync.now = () => NOW;
  sync.sleep = async () => undefined;
  silence(graphClient, tokens, sync);
  return { cfg, api, tokens, sync };
}

const OTHER_KEY = createHash("sha256").update("a-different-key").digest();

function addConnection(ctx: ReturnType<typeof setup>, id: string, key: Buffer, withKeyId = true) {
  const clientId = `client-${id}`;
  ctx.prisma.instagramConnection.rows.push({
    id,
    clientId,
    igUserId: "1784",
    username: `brand-${id}`,
    status: "ACTIVE",
    scopes: ["instagram_business_basic", "instagram_business_manage_insights"],
    accessTokenEnc: encryptToken(TOKEN, key, tokenAad(clientId)),
    tokenKeyId: withKeyId ? tokenKeyFingerprint(key) : null,
    activeIgUserId: `ig-${id}`,
    tokenExpiresAt: new Date(NOW.getTime() + 50 * DAY),
    tokenRefreshedAt: new Date(NOW.getTime() - 10 * DAY),
    createdAt: new Date(NOW.getTime() - 10 * DAY),
    lastSyncAt: null,
    lastError: null,
  });
}

describe("TOKEN_ENCRYPTION_KEY mismatch (token is never deleted)", () => {
  it("rotate then restore: ERROR with the token kept, then automatic recovery", async () => {
    const ctx = setup();
    const conn = ctx.prisma.instagramConnection.rows[0];
    conn.tokenKeyId = tokenKeyFingerprint(ctx.cfg.tokenKey);
    conn.activeIgUserId = "1784";
    const stored = conn.accessTokenEnc;

    const rotated = withKey(ctx, OTHER_KEY);
    const r = await rotated.sync.syncConnection("conn-1");
    expect(r).toMatchObject({ status: "failed", reason: "token_key" });
    expect(conn).toMatchObject({ status: "ERROR", accessTokenEnc: stored, activeIgUserId: "1784" });
    expect(conn.lastError).toMatch(/^Token key mismatch/);
    expect(conn.lastError).not.toContain(TOKEN);
    expect(ctx.graph.calls).toHaveLength(0); // no Meta call with an unusable token

    // Correct key restored -> next run recovers by itself.
    const back = await ctx.sync.syncConnection("conn-1");
    expect(back.status).toBe("ok");
    expect(conn.status).toBe("ACTIVE");
    expect(conn.lastError ?? "").not.toMatch(/Token key mismatch/);
  });

  it("legacy rows without a fingerprint: wrong key -> ERROR (kept); right key -> recovers and records the fingerprint", async () => {
    const ctx = setup(); // row has no tokenKeyId
    const conn = ctx.prisma.instagramConnection.rows[0];
    const rotated = withKey(ctx, OTHER_KEY);
    expect((await rotated.sync.syncConnection("conn-1")).reason).toBe("token_key");
    expect(conn.accessTokenEnc).not.toBeNull();
    expect(conn.status).toBe("ERROR");
    expect((await ctx.sync.syncConnection("conn-1")).status).toBe("ok");
    expect(conn).toMatchObject({ status: "ACTIVE", tokenKeyId: tokenKeyFingerprint(ctx.cfg.tokenKey) });
  });

  it("daily job aborts and modifies nothing when the key opens none / most tokens; restoring the key resumes", async () => {
    const ctx = setup();
    ctx.prisma.instagramConnection.rows[0].tokenKeyId = tokenKeyFingerprint(ctx.cfg.tokenKey);
    addConnection(ctx, "conn-2", ctx.cfg.tokenKey);
    addConnection(ctx, "conn-3", ctx.cfg.tokenKey, false);
    const before = JSON.stringify(ctx.prisma.instagramConnection.rows);

    const rotated = withKey(ctx, OTHER_KEY);
    const errorLog = jest.spyOn((rotated.sync as any).logger, "error");
    expect(await rotated.sync.dailySync()).toEqual([]);
    expect(JSON.stringify(ctx.prisma.instagramConnection.rows)).toBe(before);
    expect(ctx.graph.calls).toHaveLength(0);
    expect(errorLog).toHaveBeenCalledWith(expect.stringMatching(/ABORTED: 3 of 3 stored tokens/));

    const results = await ctx.sync.dailySync();
    expect(results.map((x) => x.status)).toEqual(["ok", "ok", "ok"]);
    expect(ctx.prisma.instagramConnection.rows.every((c) => c.status === "ACTIVE" && c.accessTokenEnc)).toBe(true);
  });

  it("a single connection under another key is flagged (token kept) while the others sync", async () => {
    const ctx = setup();
    const conn = ctx.prisma.instagramConnection.rows[0];
    conn.accessTokenEnc = encryptToken(TOKEN, OTHER_KEY, tokenAad("client-a"));
    conn.tokenKeyId = tokenKeyFingerprint(OTHER_KEY);
    addConnection(ctx, "conn-2", ctx.cfg.tokenKey);
    addConnection(ctx, "conn-3", ctx.cfg.tokenKey);
    const results = await ctx.sync.dailySync();
    expect(results.find((x) => x.connectionId === "conn-1")).toMatchObject({ status: "failed", reason: "token_key" });
    expect(results.filter((x) => x.status === "ok")).toHaveLength(2);
    expect(conn).toMatchObject({ status: "ERROR" });
    expect(conn.accessTokenEnc).not.toBeNull();
  });

  it("abort rule: all, or a majority of at least two", () => {
    expect(keyFailureAbort(0, 0)).toBe(false);
    expect(keyFailureAbort(1, 1)).toBe(true);
    expect(keyFailureAbort(3, 1)).toBe(false);
    expect(keyFailureAbort(3, 2)).toBe(true);
    expect(keyFailureAbort(4, 2)).toBe(false);
    expect(keyFailureAbort(10, 6)).toBe(true);
  });
});

describe("daily job and rate limits", () => {
  it.each([4, 17, 32, 613])("app/user-level rate limit (code %i) stops the whole run", async (code) => {
    const ctx = setup();
    addConnection(ctx, "conn-2", ctx.cfg.tokenKey);
    addConnection(ctx, "conn-3", ctx.cfg.tokenKey);
    ctx.graph.on("GET /1784/insights", () => graphError(code, "Application request limit reached"));
    const results = await ctx.sync.dailySync();
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ reason: "rate_limit", rateLimitScope: "app" });
    // The other connections were never called.
    expect(ctx.graph.calls.filter((c) => c.path === "/me")).toHaveLength(1);
  });

  it("per-account (business use case) throttling only skips that account", async () => {
    const ctx = setup();
    addConnection(ctx, "conn-2", ctx.cfg.tokenKey);
    ctx.graph.on("GET /1784/insights", () => graphError(80002, "Too many calls to this Instagram account"));
    const results = await ctx.sync.dailySync();
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.reason === "rate_limit" && r.rateLimitScope === "account")).toBe(true);
  });

  it("hourly story job stops on an app-level rate limit", async () => {
    const ctx = setup();
    addConnection(ctx, "conn-2", ctx.cfg.tokenKey);
    ctx.graph.on("GET /1784/stories", () => graphError(4, "Application request limit reached"));
    await ctx.sync.storySync();
    expect(ctx.graph.calls.filter((c) => c.path === "/1784/stories")).toHaveLength(1);
  });
});
