import { BadRequestException, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { InstagramGraphClient } from "./instagram-graph.client";
import { InstagramApiService } from "./instagram-api.service";
import { InstagramTokenService } from "./instagram-token.service";
import { InstagramSyncService, SCOPE_NOTE } from "./instagram-sync.service";
import { InstagramOAuthService } from "./instagram-oauth.service";
import { PortalInstagramController } from "./portal-instagram.controller";
import { PortalScopeService } from "../portal/portal-scope.service";
import { buildSignedRequest } from "./utils/signed-request";
import { sha256Hex } from "./utils/oauth-state";
import { decryptToken, tokenAad, tokenKeyFingerprint } from "./utils/token-crypto";
import { BIND_COOKIE_PATH, bindCookieName, bindCookieOptions } from "./utils/bind-cookie";
import { FakeGraph, FakePrisma, TEST_APP_SECRET, testConfig, withAggregate } from "./testing/instagram-fakes.helper-spec";

const LONG = "IGAAlongLivedTokenValue_0123456789abcdefghijklmnopqrstuvwxyz";
const SHORT = "IGAAshortLivedTokenValue_0123456789abcdefghijklmnop";

function silence(...objs: any[]) {
  for (const o of objs) {
    const logger = o?.logger;
    if (logger) for (const m of ["log", "warn", "error", "debug"]) jest.spyOn(logger, m).mockImplementation(() => undefined);
  }
}

function setup(opts: { accountType?: string; permissions?: string } = {}) {
  const prisma = withAggregate(new FakePrisma());
  const graph = new FakeGraph();
  const cfg = testConfig();
  const client = new InstagramGraphClient(graph.fetch as any);
  const api = new InstagramApiService(client, cfg);
  const tokens = new InstagramTokenService(prisma as any, api, cfg);
  const sync = new InstagramSyncService(prisma as any, api, tokens, cfg, null);
  const syncSpy = jest.spyOn(sync, "syncInBackground").mockReturnValue(true);
  const oauth = new InstagramOAuthService(prisma as any, api, tokens, sync, cfg);
  silence(client, tokens, sync, oauth);

  graph
    .on("POST api.fake.test/oauth/access_token", {
      data: [
        {
          access_token: SHORT,
          user_id: "9001",
          permissions: opts.permissions ?? "instagram_business_basic,instagram_business_manage_insights",
        },
      ],
    })
    .on("GET /access_token", { access_token: LONG, token_type: "bearer", expires_in: 5184000 })
    .on("GET /me", {
      id: "9001",
      user_id: "17841400000000001",
      username: "brandco",
      account_type: opts.accountType ?? "BUSINESS",
      profile_picture_url: "https://cdn.fake.test/p.jpg",
      followers_count: 1200,
      media_count: 50,
      biography: "Brand bio",
    });

  prisma.client.rows.push(
    { id: "client-a", name: "Client A", instagramHandle: null, instagramAvatarUrl: null, instagramBio: null, isInternal: false },
    { id: "client-b", name: "Client B", instagramHandle: "@keepme", instagramAvatarUrl: null, instagramBio: null, isInternal: false },
    { id: "client-int", name: "Monomi", instagramHandle: null, instagramAvatarUrl: null, instagramBio: null, isInternal: true },
  );
  prisma.user.rows.push({ id: "staff-1", email: "admin@monomi.id", role: "ADMIN", isActive: true });
  prisma.clientPortalContact.rows.push(
    { id: "contact-a", clientId: "client-a", email: "owner@clienta.test", isActive: true },
    { id: "contact-b", clientId: "client-b", email: "owner@clientb.test", isActive: true },
  );
  return { prisma, graph, cfg, api, tokens, sync, syncSpy, oauth };
}

const staff = { type: "staff" as const, id: "staff-1", email: "admin@monomi.id" };

async function connectAndCallback(ctx: ReturnType<typeof setup>, clientId = "client-a", extraQuery: Record<string, unknown> = {}) {
  const start = await ctx.oauth.startConnect(clientId, staff);
  const state = new URL(start.authorizeUrl).searchParams.get("state")!;
  const outcome = await ctx.oauth.handleCallback({ code: "AQBcode123#_", state, ...extraQuery }, start.bindValue);
  return { start, state, outcome };
}

describe("InstagramOAuthService — connect", () => {
  it("builds the authorize URL and stores only a hash of the nonce", async () => {
    const ctx = setup();
    const { authorizeUrl } = await ctx.oauth.startConnect("client-a", staff);
    const u = new URL(authorizeUrl);
    expect(u.origin + u.pathname).toBe("https://www.fake.test/oauth/authorize");
    expect(u.searchParams.get("client_id")).toBe(ctx.cfg.appId);
    expect(u.searchParams.get("redirect_uri")).toBe(ctx.cfg.redirectUri);
    expect(u.searchParams.get("response_type")).toBe("code");
    expect(u.searchParams.get("scope")).toBe("instagram_business_basic,instagram_business_manage_insights");
    // Staff are usually logged into another Instagram account in their browser.
    expect(u.searchParams.get("force_reauth")).toBe("true");
    const state = u.searchParams.get("state")!;
    const row = ctx.prisma.instagramOAuthState.rows[0];
    expect(row.nonceHash).toBe(sha256Hex(state.split(".")[0]));
    expect(JSON.stringify(row)).not.toContain(state.split(".")[0]);
    expect(row.returnTo).toMatch(/\/clients\/client-a$/);
  });

  it("portal contacts get force_reauth only on reconnect; staff always", async () => {
    const ctx = setup();
    const portal = { type: "portal" as const, id: "contact-a", email: "owner@clienta.test" };
    const first = await ctx.oauth.startConnect("client-a", portal);
    expect(new URL(first.authorizeUrl).searchParams.has("force_reauth")).toBe(false);
    await connectAndCallback(ctx);
    const again = await ctx.oauth.startConnect("client-a", portal);
    expect(new URL(again.authorizeUrl).searchParams.get("force_reauth")).toBe("true");
    const staffAgain = await ctx.oauth.startConnect("client-b", staff);
    expect(new URL(staffAgain.authorizeUrl).searchParams.get("force_reauth")).toBe("true");
  });

  it("404 for an unknown client; the internal Monomi client is allowed", async () => {
    const ctx = setup();
    await expect(ctx.oauth.startConnect("nope", staff)).rejects.toBeInstanceOf(NotFoundException);
    await expect(ctx.oauth.startConnect("client-int", staff)).resolves.toHaveProperty("authorizeUrl");
  });
});

describe("InstagramOAuthService — callback", () => {
  it("success: exchanges tokens, encrypts the token, fills the client profile, starts the backfill", async () => {
    const ctx = setup();
    const { outcome } = await connectAndCallback(ctx);
    expect(outcome).toMatchObject({ kind: "redirect", reason: "connected" });
    expect((outcome as any).url).toMatch(/\/clients\/client-a\?instagram=connected$/);

    const exchange = ctx.graph.calls.find((c) => c.path === "/oauth/access_token")!;
    const form = new URLSearchParams(exchange.body);
    expect(form.get("code")).toBe("AQBcode123"); // trailing "#_" stripped
    expect(form.get("redirect_uri")).toBe(ctx.cfg.redirectUri);
    expect(form.get("grant_type")).toBe("authorization_code");

    const conn = ctx.prisma.instagramConnection.rows[0];
    expect(conn).toMatchObject({
      clientId: "client-a",
      igUserId: "17841400000000001",
      igScopedUserId: "9001",
      username: "brandco",
      status: "ACTIVE",
      connectedBy: "admin@monomi.id",
    });
    expect(conn.accessTokenEnc).not.toContain(LONG);
    expect(JSON.stringify(ctx.prisma.instagramConnection.rows)).not.toContain(LONG);
    expect(decryptToken(conn.accessTokenEnc, ctx.cfg.tokenKey, tokenAad("client-a"))).toBe(LONG);
    expect(conn.tokenKeyId).toBe(tokenKeyFingerprint(ctx.cfg.tokenKey));
    expect(conn.activeIgUserId).toBe("17841400000000001");
    // Provenance of what was copied onto the client profile.
    expect(conn).toMatchObject({ syncedHandle: "@brandco", syncedAvatarUrl: "https://cdn.fake.test/p.jpg", syncedBio: "Brand bio" });
    expect(conn.tokenExpiresAt.getTime()).toBeGreaterThan(Date.now() + 59 * 86400000);

    const client = ctx.prisma.client.rows.find((c) => c.id === "client-a")!;
    expect(client).toMatchObject({ instagramHandle: "@brandco", instagramAvatarUrl: "https://cdn.fake.test/p.jpg", instagramBio: "Brand bio" });
    expect(ctx.syncSpy).toHaveBeenCalledWith(conn.id, "connect");
  });

  it("never returns the token from status()", async () => {
    const ctx = setup();
    await connectAndCallback(ctx);
    const status = await ctx.oauth.status("client-a");
    expect(status.connected).toBe(true);
    expect(status.connection).not.toHaveProperty("accessTokenEnc");
    expect(JSON.stringify(status)).not.toContain(LONG);
    expect(JSON.stringify(status)).not.toContain("v1:");
  });

  it("does not overwrite a filled handle unless staff opted in", async () => {
    const ctx = setup();
    await connectAndCallback(ctx, "client-b");
    expect(ctx.prisma.client.rows.find((c) => c.id === "client-b")!.instagramHandle).toBe("@keepme");
    const start = await ctx.oauth.startConnect("client-b", staff, { syncProfile: true });
    const state = new URL(start.authorizeUrl).searchParams.get("state")!;
    await ctx.oauth.handleCallback({ code: "c2", state }, start.bindValue);
    expect(ctx.prisma.client.rows.find((c) => c.id === "client-b")!.instagramHandle).toBe("@brandco");
  });

  it("state is single-use", async () => {
    const ctx = setup();
    const { start, state } = await connectAndCallback(ctx);
    const replay = await ctx.oauth.handleCallback({ code: "again", state }, start.bindValue);
    expect(replay).toMatchObject({ kind: "redirect", reason: "state" });
  });

  it("rejects a callback from a different browser (no / wrong binding cookie)", async () => {
    const ctx = setup();
    const start = await ctx.oauth.startConnect("client-a", staff);
    const state = new URL(start.authorizeUrl).searchParams.get("state")!;
    expect(await ctx.oauth.handleCallback({ code: "c", state }, undefined)).toMatchObject({ reason: "session" });
    expect(ctx.prisma.instagramConnection.rows).toHaveLength(0);
    expect(ctx.graph.calls).toHaveLength(0);
  });

  it("expired state sends the person back with reason=expired", async () => {
    const ctx = setup();
    const start = await ctx.oauth.startConnect("client-a", staff);
    const state = new URL(start.authorizeUrl).searchParams.get("state")!;
    ctx.oauth.now = () => new Date(Date.now() + 11 * 60 * 1000);
    const r = await ctx.oauth.handleCallback({ code: "c", state }, start.bindValue);
    expect(r).toMatchObject({ kind: "redirect", reason: "expired" });
  });

  it("forged state -> error page, no redirect, no token exchange", async () => {
    const ctx = setup();
    const r = await ctx.oauth.handleCallback({ code: "c", state: "forged.1790000000.sig" }, "x");
    expect(r).toEqual({ kind: "page", status: 400, reason: "state" });
    expect(ctx.graph.calls).toHaveLength(0);
  });

  it("user denied -> reason=denied, nothing stored", async () => {
    const ctx = setup();
    const { outcome } = await connectAndCallback(ctx, "client-a", { error: "access_denied", error_reason: "user_denied" });
    expect(outcome).toMatchObject({ reason: "denied" });
    expect((outcome as any).url).toContain("instagram=error");
    expect(ctx.prisma.instagramConnection.rows).toHaveLength(0);
    expect(ctx.graph.calls).toHaveLength(0);
  });

  it("personal (non-business) account -> reason=not_business, nothing stored", async () => {
    const ctx = setup({ accountType: "PERSONAL" });
    const { outcome } = await connectAndCallback(ctx);
    expect(outcome).toMatchObject({ reason: "not_business" });
    expect(ctx.prisma.instagramConnection.rows).toHaveLength(0);
  });

  it("token exchange failure -> reason=exchange; permission failure -> reason=access", async () => {
    const ctx = setup();
    ctx.graph.on("POST api.fake.test/oauth/access_token", () => ({ status: 400, body: { error_type: "OAuthException", code: 400, error_message: "Invalid code" } }));
    expect((await connectAndCallback(ctx)).outcome).toMatchObject({ reason: "exchange" });
    ctx.graph.on("POST api.fake.test/oauth/access_token", () => ({ status: 400, body: { error: { code: 10, message: "not allowed" } } }));
    expect((await connectAndCallback(ctx)).outcome).toMatchObject({ reason: "access" });
  });

  it("partial grant without insights is stored with a clear message", async () => {
    const ctx = setup({ permissions: "instagram_business_basic" });
    await connectAndCallback(ctx);
    expect(ctx.prisma.instagramConnection.rows[0].lastError).toBe(SCOPE_NOTE);
    expect((await ctx.oauth.status("client-a")).insightsGranted).toBe(false);
  });

  it("re-checks the initiator at callback time", async () => {
    const ctx = setup();
    const start = await ctx.oauth.startConnect("client-a", staff);
    ctx.prisma.user.rows[0].isActive = false;
    const state = new URL(start.authorizeUrl).searchParams.get("state")!;
    expect(await ctx.oauth.handleCallback({ code: "c", state }, start.bindValue)).toMatchObject({ reason: "forbidden" });
  });

  it("a different Instagram account for a client that already has one is refused; history is kept", async () => {
    const ctx = setup();
    await connectAndCallback(ctx);
    const old = ctx.prisma.instagramConnection.rows[0];
    const oldToken = old.accessTokenEnc;
    ctx.prisma.instagramDailyMetric.rows.push({ id: "d1", connectionId: old.id, date: new Date("2026-09-01T00:00:00Z"), metrics: { reach: 1 } });
    ctx.graph.on("GET /me", { id: "9002", user_id: "17841400000000002", username: "otherbrand", account_type: "MEDIA_CREATOR" });
    const staffTry = await connectAndCallback(ctx);
    expect(staffTry.outcome).toMatchObject({ kind: "redirect", reason: "other_account" });
    expect((staffTry.outcome as any).url).toContain("reason=other_account");

    // Same from the portal: a contact can never wipe history implicitly.
    const portal = { type: "portal" as const, id: "contact-a", email: "owner@clienta.test" };
    const start = await ctx.oauth.startConnect("client-a", portal);
    const state = new URL(start.authorizeUrl).searchParams.get("state")!;
    expect(await ctx.oauth.handleCallback({ code: "c", state }, start.bindValue)).toMatchObject({ reason: "other_account" });

    expect(ctx.prisma.instagramConnection.rows).toHaveLength(1);
    expect(ctx.prisma.instagramConnection.rows[0]).toMatchObject({ username: "brandco", accessTokenEnc: oldToken, status: "ACTIVE" });
    expect(ctx.prisma.instagramDailyMetric.rows).toHaveLength(1);

    // After an explicit "disconnect + hapus data" the other account can be connected.
    ctx.graph.on("DELETE /me/permissions", { success: true });
    await ctx.oauth.disconnect("client-a", true);
    expect((await connectAndCallback(ctx)).outcome).toMatchObject({ reason: "connected" });
    expect(ctx.prisma.instagramConnection.rows[0].username).toBe("otherbrand");
  });

  it("the same Instagram account cannot be attached to a second client while it holds a token", async () => {
    const ctx = setup();
    await connectAndCallback(ctx, "client-a");
    const b = await connectAndCallback(ctx, "client-b");
    expect(b.outcome).toMatchObject({ kind: "redirect", reason: "in_use" });
    expect(ctx.prisma.instagramConnection.rows.map((r) => r.clientId)).toEqual(["client-a"]);
    // Client B's profile is untouched.
    expect(ctx.prisma.client.rows.find((c) => c.id === "client-b")!.instagramHandle).toBe("@keepme");

    // Once client A's token is gone (disconnect without purge), the account is free again.
    ctx.graph.on("DELETE /me/permissions", { success: true });
    await ctx.oauth.disconnect("client-a", false);
    expect(ctx.prisma.instagramConnection.rows[0].activeIgUserId).toBeNull();
    expect((await connectAndCallback(ctx, "client-b")).outcome).toMatchObject({ reason: "connected" });
    // ...and client A reconnecting it now collides with client B.
    expect((await connectAndCallback(ctx, "client-a")).outcome).toMatchObject({ reason: "in_use" });
  });

  it("a unique-constraint race on the account claim is reported as in_use", async () => {
    const ctx = setup();
    await connectAndCallback(ctx, "client-a");
    // Simulate the race: the pre-check does not see client A's claim.
    ctx.prisma.instagramConnection.findFirst.mockResolvedValueOnce(null);
    expect((await connectAndCallback(ctx, "client-b")).outcome).toMatchObject({ reason: "in_use" });
    expect(ctx.prisma.instagramConnection.rows).toHaveLength(1);
  });

  it("the binding cookie of the flow's own kind is required (staff vs portal cookies are separate)", async () => {
    const ctx = setup();
    const start = await ctx.oauth.startConnect("client-a", staff);
    const state = new URL(start.authorizeUrl).searchParams.get("state")!;
    // Only a portal cookie with the right value: not accepted for a staff flow.
    expect(await ctx.oauth.handleCallback({ code: "c", state }, { portal: start.bindValue })).toMatchObject({
      reason: "session",
      flow: "staff",
    });
    const start2 = await ctx.oauth.startConnect("client-a", staff);
    const state2 = new URL(start2.authorizeUrl).searchParams.get("state")!;
    expect(await ctx.oauth.handleCallback({ code: "c", state: state2 }, { staff: start2.bindValue, portal: "other" })).toMatchObject({
      reason: "connected",
      flow: "staff",
    });
  });
});

describe("browser-binding cookie", () => {
  it("production: __Host- prefix, Secure, Path=/, no Domain; separate names per flow", () => {
    const prod = { NODE_ENV: "production" } as NodeJS.ProcessEnv;
    expect(bindCookieName("staff", prod)).toBe("__Host-ig_bind_staff");
    expect(bindCookieName("portal", prod)).toBe("__Host-ig_bind_portal");
    const o = bindCookieOptions(prod);
    expect(o).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    expect(o).not.toHaveProperty("domain");
  });

  it("development (http): no prefix, scoped to the callback path", () => {
    const dev = { NODE_ENV: "development" } as NodeJS.ProcessEnv;
    expect(bindCookieName("staff", dev)).toBe("ig_bind_staff");
    expect(bindCookieOptions(dev)).toMatchObject({ secure: false, path: BIND_COOKIE_PATH });
  });
});

describe("disconnect, deauthorize, data deletion", () => {
  it("disconnect deletes the token but keeps history; purge deletes everything", async () => {
    const ctx = setup();
    await connectAndCallback(ctx);
    const conn = ctx.prisma.instagramConnection.rows[0];
    ctx.prisma.instagramDailyMetric.rows.push({ id: "d1", connectionId: conn.id, date: new Date("2026-09-01T00:00:00Z"), metrics: {} });
    ctx.graph.on("DELETE /me/permissions", { success: true });
    const r = await ctx.oauth.disconnect("client-a", false);
    expect(r).toMatchObject({ disconnected: true, purged: false });
    expect(conn).toMatchObject({ accessTokenEnc: null, status: "REVOKED", activeIgUserId: null });
    // A plain disconnect keeps the client profile.
    expect(ctx.prisma.client.rows.find((c) => c.id === "client-a")!.instagramHandle).toBe("@brandco");
    expect(ctx.prisma.instagramDailyMetric.rows).toHaveLength(1);
    await ctx.oauth.disconnect("client-a", true);
    expect(ctx.prisma.instagramConnection.rows).toHaveLength(0);
    expect(ctx.prisma.instagramDailyMetric.rows).toHaveLength(0);
    // "hapus data" also clears the profile fields copied from Instagram.
    expect(ctx.prisma.client.rows.find((c) => c.id === "client-a")).toMatchObject({
      instagramHandle: null,
      instagramAvatarUrl: null,
      instagramBio: null,
    });
    await expect(ctx.oauth.disconnect("client-a", false)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("deauthorize: valid signed_request revokes the matching connection", async () => {
    const ctx = setup();
    await connectAndCallback(ctx);
    const sr = buildSignedRequest({ algorithm: "HMAC-SHA256", issued_at: 1790000000, user_id: "9001" }, TEST_APP_SECRET);
    const conn = ctx.prisma.instagramConnection.rows[0];
    ctx.prisma.instagramDailyMetric.rows.push({ id: "d1", connectionId: conn.id, date: new Date("2026-09-01T00:00:00Z"), metrics: {} });
    // Staff later typed their own bio: that one is not Instagram data any more.
    ctx.prisma.client.rows.find((c) => c.id === "client-a")!.instagramBio = "Bio ditulis staf";
    await expect(ctx.oauth.deauthorize(sr)).resolves.toEqual({ success: true });
    expect(conn).toMatchObject({ status: "REVOKED", accessTokenEnc: null, activeIgUserId: null, syncedHandle: null });
    expect(ctx.prisma.client.rows.find((c) => c.id === "client-a")).toMatchObject({
      instagramHandle: null,
      instagramAvatarUrl: null,
      instagramBio: "Bio ditulis staf",
    });
    // Synced history stays until a deletion request / "hapus data".
    expect(ctx.prisma.instagramDailyMetric.rows).toHaveLength(1);
  });

  it("deauthorize / data deletion reject invalid or tampered signed_request", async () => {
    const ctx = setup();
    await connectAndCallback(ctx);
    const forged = buildSignedRequest({ algorithm: "HMAC-SHA256", user_id: "9001" }, "not-the-app-secret");
    await expect(ctx.oauth.deauthorize(forged)).rejects.toBeInstanceOf(BadRequestException);
    const good = buildSignedRequest({ algorithm: "HMAC-SHA256", user_id: "9001" }, TEST_APP_SECRET);
    const [sig] = good.split(".");
    const tampered = `${sig}.${Buffer.from(JSON.stringify({ algorithm: "HMAC-SHA256", user_id: "17841400000000001" })).toString("base64url")}`;
    await expect(ctx.oauth.dataDeletion(tampered)).rejects.toBeInstanceOf(BadRequestException);
    await expect(ctx.oauth.dataDeletion(undefined)).rejects.toBeInstanceOf(BadRequestException);
    expect(ctx.prisma.instagramConnection.rows[0].status).toBe("ACTIVE");
  });

  it("data deletion purges the user's data and returns a status URL + code", async () => {
    const ctx = setup();
    await connectAndCallback(ctx);
    const conn = ctx.prisma.instagramConnection.rows[0];
    ctx.prisma.instagramMediaSnapshot.rows.push({ id: "m1", connectionId: conn.id, mediaId: "1", metrics: {} });
    const sr = buildSignedRequest({ algorithm: "HMAC-SHA256", user_id: "17841400000000001" }, TEST_APP_SECRET);
    const r = await ctx.oauth.dataDeletion(sr);
    expect(r.confirmation_code).toMatch(/^IGDEL-[A-F0-9]{18}$/);
    expect(r.url).toContain(`/data-deletion?code=${r.confirmation_code}`);
    expect(ctx.prisma.instagramConnection.rows).toHaveLength(0);
    expect(ctx.prisma.instagramMediaSnapshot.rows).toHaveLength(0);
    // Profile fields copied from Instagram are removed from the client too.
    expect(ctx.prisma.client.rows.find((c) => c.id === "client-a")).toMatchObject({
      instagramHandle: null,
      instagramAvatarUrl: null,
      instagramBio: null,
    });
    await expect(ctx.oauth.deletionStatus(r.confirmation_code)).resolves.toMatchObject({ status: "COMPLETED" });
    await expect(ctx.oauth.deletionStatus("IGDEL-000000000000000000")).rejects.toBeInstanceOf(NotFoundException);
    await expect(ctx.oauth.deletionStatus("'; drop table")).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("data deletion — provenance and report sections", () => {
  function addSection(ctx: ReturnType<typeof setup>, id: string, clientId: string, layout: Record<string, unknown>) {
    ctx.prisma.reportSection.rows.push({ id, reportId: `rep-${clientId}`, layout, report: { project: { clientId } } });
  }

  it("keeps manually entered profile values and deletes only this account's Instagram sections", async () => {
    const ctx = setup();
    // client-b has a manual handle "@keepme": connecting never overwrites it,
    // so deletion must never clear it either.
    await connectAndCallback(ctx, "client-b");
    const conn = ctx.prisma.instagramConnection.rows[0];
    expect(conn.syncedHandle).toBeNull();
    const clientB = ctx.prisma.client.rows.find((c) => c.id === "client-b")!;
    clientB.instagramAvatarUrl = "https://cdn.monomi.test/manual-avatar.jpg"; // edited by staff after sync

    addSection(ctx, "s-ig", "client-b", { source: "instagram", instagramUserId: "17841400000000001", instagramConnectionId: conn.id });
    addSection(ctx, "s-ig-legacy", "client-b", { source: "instagram", instagramUsername: "brandco" });
    addSection(ctx, "s-ig-other", "client-b", { source: "instagram", instagramUserId: "17841400000009999" });
    addSection(ctx, "s-ig-other-client", "client-a", { source: "instagram", instagramUsername: "brandco" });
    addSection(ctx, "s-manual", "client-b", { source: "manual" });

    const sr = buildSignedRequest({ algorithm: "HMAC-SHA256", user_id: "9001" }, TEST_APP_SECRET);
    const r = await ctx.oauth.dataDeletion(sr);
    expect(ctx.prisma.instagramConnection.rows).toHaveLength(0);
    expect(clientB).toMatchObject({
      instagramHandle: "@keepme",
      instagramAvatarUrl: "https://cdn.monomi.test/manual-avatar.jpg",
      instagramBio: null, // was empty, filled from Instagram -> removed
    });
    expect(ctx.prisma.reportSection.rows.map((x) => x.id).sort()).toEqual(["s-ig-other", "s-ig-other-client", "s-manual"]);
    await expect(ctx.oauth.deletionStatus(r.confirmation_code)).resolves.toMatchObject({ status: "COMPLETED" });
  });

  it("instagram sections are found by account id even after the connection was purged", async () => {
    const ctx = setup();
    addSection(ctx, "s-ig", "client-a", { source: "instagram", instagramScopedUserId: "9001", instagramUserId: "1784x" });
    const sr = buildSignedRequest({ algorithm: "HMAC-SHA256", user_id: "9001" }, TEST_APP_SECRET);
    await ctx.oauth.dataDeletion(sr);
    expect(ctx.prisma.reportSection.rows).toHaveLength(0);
  });

  it("a failure part-way reports an error and records no COMPLETED request", async () => {
    const ctx = setup();
    await connectAndCallback(ctx);
    const conn = ctx.prisma.instagramConnection.rows[0];
    ctx.prisma.reportSection.rows.push({ id: "s1", reportId: "r", layout: { source: "instagram", instagramConnectionId: conn.id }, report: { project: { clientId: "client-a" } } });
    ctx.prisma.reportSection.deleteMany.mockRejectedValueOnce(new Error("db down"));
    const sr = buildSignedRequest({ algorithm: "HMAC-SHA256", user_id: "9001" }, TEST_APP_SECRET);
    await expect(ctx.oauth.dataDeletion(sr)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(ctx.prisma.instagramDataDeletionRequest.rows).toHaveLength(0);
    expect(ctx.prisma.instagramConnection.rows).toHaveLength(1); // (real DB: whole transaction rolled back)
  });
});

describe("tenant isolation (portal)", () => {
  const sessionFor = (clientId: string, contactId: string, email: string) => ({
    email,
    expiresAt: new Date(Date.now() + 3600_000),
    contacts: [{ id: contactId, clientId, name: "Owner", email, tokenVersion: 0, client: { id: clientId } as any }],
  });

  function controller(ctx: ReturnType<typeof setup>) {
    return new PortalInstagramController(new PortalScopeService(ctx.prisma as any), ctx.oauth);
  }
  const res = () => ({ cookie: jest.fn() }) as any;

  it("a contact of client A cannot connect, read or disconnect client B", async () => {
    const ctx = setup();
    const c = controller(ctx);
    const a = sessionFor("client-a", "contact-a", "owner@clienta.test");
    await expect(c.connect(a as any, "client-b", res())).rejects.toBeInstanceOf(NotFoundException);
    await expect(c.status(a as any, "client-b")).rejects.toBeInstanceOf(NotFoundException);
    await expect(c.disconnect(a as any, "client-b", { purge: true })).rejects.toBeInstanceOf(NotFoundException);
    expect(ctx.prisma.instagramOAuthState.rows).toHaveLength(0);
  });

  it("a contact connects their own client via the portal redirect URI and returns to the portal", async () => {
    const ctx = setup();
    const c = controller(ctx);
    const r = res();
    const a = sessionFor("client-a", "contact-a", "owner@clienta.test");
    const { authorizeUrl } = await c.connect(a as any, "client-a", r);
    expect(new URL(authorizeUrl).searchParams.get("redirect_uri")).toBe(ctx.cfg.portalRedirectUri);
    expect(r.cookie).toHaveBeenCalledWith("ig_bind_portal", expect.any(String), expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/api/v1/instagram/oauth" }));
    const row = ctx.prisma.instagramOAuthState.rows[0];
    expect(row).toMatchObject({ initiatorType: "portal", initiatorId: "contact-a", syncProfile: false });
    expect(row.returnTo).toMatch(/\/c\/client-a\/reports$/);

    const state = new URL(authorizeUrl).searchParams.get("state")!;
    const bind = r.cookie.mock.calls[0][1];
    const outcome = await ctx.oauth.handleCallback({ code: "c", state }, bind);
    expect(outcome).toMatchObject({ reason: "connected" });
    expect(ctx.prisma.instagramConnection.rows[0].connectedBy).toBe("portal:owner@clienta.test");
    const exchange = ctx.graph.calls.find((x) => x.path === "/oauth/access_token")!;
    expect(new URLSearchParams(exchange.body).get("redirect_uri")).toBe(ctx.cfg.portalRedirectUri);

    const status = await c.status(a as any, "client-a");
    expect(status.connection).not.toHaveProperty("connectedBy");
    expect(JSON.stringify(status)).not.toContain(LONG);
  });

  it("a deactivated portal contact's pending flow is refused at callback", async () => {
    const ctx = setup();
    const c = controller(ctx);
    const r = res();
    const { authorizeUrl } = await c.connect(sessionFor("client-a", "contact-a", "owner@clienta.test") as any, "client-a", r);
    ctx.prisma.clientPortalContact.rows[0].isActive = false;
    const state = new URL(authorizeUrl).searchParams.get("state")!;
    expect(await ctx.oauth.handleCallback({ code: "c", state }, r.cookie.mock.calls[0][1])).toMatchObject({ reason: "forbidden" });
  });
});
