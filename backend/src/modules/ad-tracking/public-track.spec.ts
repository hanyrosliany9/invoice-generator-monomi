import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as vm from "vm";
import request from "supertest";
import { AdClickService } from "./ad-click.service";
import { resolveAdTrackingConfig } from "./ad-tracking.config";
import { PublicTrackController } from "./public-track.controller";
import { createPublicTrackBody, createPublicTrackCors } from "./public-track.http";
import { MONOMI_TRACK_JS } from "./monomi-track.snippet";
import { FakePrisma, withEnv } from "../whatsapp/testing/whatsapp-fakes.helper-spec";

const ALLOWED = "https://link.monomiagency.com";
const URL_PATH = "/api/v1/public/track/wa-click";
const body = (over: Record<string, unknown> = {}) => ({
  ref: "K7QM2X",
  eventId: "3f6b8c1e-2d4a-4f60-9a51-0c8d7e5b1a22",
  pageUrl: "https://link.monomiagency.com/?utm_campaign=FB-OKT1&fbclid=IwAR1",
  utm: { source: "meta", medium: "paid", campaign: "fb-okt1" },
  fbclid: "IwAR1",
  fbp: "fb.1.1759900000000.1234567890",
  ...over,
});

describe("public tracking endpoints", () => {
  let app: INestApplication;
  let prisma: FakePrisma;
  let restore: () => void;

  beforeEach(async () => {
    restore = withEnv({ NODE_ENV: "test", PUBLIC_TRACK_ALLOWED_ORIGINS: undefined });
    prisma = new FakePrisma({
      campaign: [{ id: "cmp1", code: "FB-OKT1", name: "Oktober 1" }],
    });
    const mod = await Test.createTestingModule({
      controllers: [PublicTrackController],
      providers: [{ provide: AdClickService, useValue: new AdClickService(prisma as any) }],
    }).compile();
    app = mod.createNestApplication();
    app.use(createPublicTrackCors(() => resolveAdTrackingConfig()));
    app.use(createPublicTrackBody());
    app.setGlobalPrefix("api/v1");
    app.getHttpAdapter().getInstance().set("trust proxy", 1);
    await app.init();
  });
  afterEach(async () => {
    await app.close();
    restore();
  });

  it("stores a click sent as text/plain (sendBeacon), with ip + user agent, campaign resolved case-insensitively", async () => {
    const res = await request(app.getHttpServer())
      .post(URL_PATH)
      .set("Origin", ALLOWED)
      .set("Content-Type", "text/plain;charset=UTF-8")
      .set("User-Agent", "TestAgent/1.0")
      .set("X-Forwarded-For", "203.0.113.9")
      .send(JSON.stringify(body()));
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe(ALLOWED);
    expect(res.headers["access-control-allow-credentials"]).toBeUndefined();
    const rows = prisma.tables.adClick;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      ref: "K7QM2X",
      clientIp: "203.0.113.9",
      userAgent: "TestAgent/1.0",
      campaignCode: "FB-OKT1",
      utmCampaign: "fb-okt1",
      leadId: null,
    });
    // fbc rebuilt from fbclid when the cookie was missing
    expect(rows[0].fbc).toMatch(/^fb\.1\.\d{13}\.IwAR1$/);
    // the click-time website Lead is queued with the same eventId for dedup
    expect(prisma.tables.metaEventOutbox).toHaveLength(1);
    expect(prisma.tables.metaEventOutbox[0]).toMatchObject({
      route: "WEBSITE",
      eventName: "Lead",
      leadId: null,
      status: "PENDING_CONFIG",
      dedupeKey: `click:${body().eventId}`,
    });
  });

  it("also accepts application/json", async () => {
    const res = await request(app.getHttpServer()).post(URL_PATH).set("Origin", ALLOWED).send(body());
    expect(res.status).toBe(200);
    expect(prisma.tables.adClick).toHaveLength(1);
  });

  it("is idempotent on eventId; the same ref with another eventId is a 409 and stores nothing", async () => {
    const send = (b: object) =>
      request(app.getHttpServer()).post(URL_PATH).set("Origin", ALLOWED).send(JSON.stringify(b));
    expect((await send(body())).status).toBe(200);
    expect((await send(body())).status).toBe(200); // retry / beacon fallback fetch
    expect(prisma.tables.adClick).toHaveLength(1);
    expect(prisma.tables.metaEventOutbox).toHaveLength(1);
    const clash = await send(body({ eventId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee" }));
    expect(clash.status).toBe(409);
    const reverse = await send(body({ ref: "ZZZZ22" }));
    expect(reverse.status).toBe(409); // eventId already used by another ref
    expect(prisma.tables.adClick).toHaveLength(1);
  });

  it("rejects invalid payloads with a generic 400 that never reflects the input", async () => {
    const evil = "<script>alert('xss-marker')</script>";
    for (const payload of [
      "not json",
      JSON.stringify({ ref: evil, eventId: evil }),
      JSON.stringify({ ...body(), ref: "bad" }),
      "",
    ]) {
      const res = await request(app.getHttpServer())
        .post(URL_PATH)
        .set("Origin", ALLOWED)
        .set("Content-Type", "text/plain")
        .send(payload);
      expect(res.status).toBe(400);
      expect(res.text).not.toContain("xss-marker");
      expect(res.text).not.toContain("not json");
    }
    expect(prisma.tables.adClick).toHaveLength(0);
  });

  it("caps the body at 4 KB (413) and stores nothing", async () => {
    const res = await request(app.getHttpServer())
      .post(URL_PATH)
      .set("Origin", ALLOWED)
      .set("Content-Type", "text/plain")
      .send(JSON.stringify(body({ meta: { brandName: "x".repeat(6000) } })));
    expect(res.status).toBe(413);
    expect(prisma.tables.adClick).toHaveLength(0);
  });

  describe("CORS", () => {
    it("answers the preflight for the allowed origin only", async () => {
      const ok = await request(app.getHttpServer())
        .options(URL_PATH)
        .set("Origin", ALLOWED)
        .set("Access-Control-Request-Method", "POST")
        .set("Access-Control-Request-Headers", "content-type");
      expect(ok.status).toBe(204);
      expect(ok.headers["access-control-allow-origin"]).toBe(ALLOWED);
      expect(ok.headers["access-control-allow-methods"]).toContain("POST");
      const bad = await request(app.getHttpServer())
        .options(URL_PATH)
        .set("Origin", "https://evil.example.com")
        .set("Access-Control-Request-Method", "POST");
      expect(bad.status).toBe(403);
      expect(bad.headers["access-control-allow-origin"]).toBeUndefined();
    });

    it("refuses other origins before anything is stored (also look-alike hosts and 'null')", async () => {
      for (const origin of [
        "https://evil.example.com",
        "https://link.monomiagency.com.evil.com",
        "http://link.monomiagency.com",
        "null",
      ]) {
        const res = await request(app.getHttpServer()).post(URL_PATH).set("Origin", origin).send(body());
        expect(res.status).toBe(403);
        expect(res.headers["access-control-allow-origin"]).toBeUndefined();
      }
      expect(prisma.tables.adClick).toHaveLength(0);
    });

    it("allows localhost outside production only, and honours PUBLIC_TRACK_ALLOWED_ORIGINS", async () => {
      const local = await request(app.getHttpServer()).post(URL_PATH).set("Origin", "http://localhost:8080").send(body());
      expect(local.status).toBe(200);
      const restoreProd = withEnv({ NODE_ENV: "production", PUBLIC_TRACK_ALLOWED_ORIGINS: "https://lp.example.com" });
      try {
        const prod = await request(app.getHttpServer())
          .post(URL_PATH)
          .set("Origin", "http://localhost:8080")
          .send(body({ ref: "ABCD23", eventId: "11111111-2222-4333-8444-555555555555" }));
        expect(prod.status).toBe(403);
        const custom = await request(app.getHttpServer())
          .post(URL_PATH)
          .set("Origin", "https://lp.example.com")
          .send(body({ ref: "ABCD23", eventId: "11111111-2222-4333-8444-555555555555" }));
        expect(custom.status).toBe(200);
        const dflt = await request(app.getHttpServer())
          .post(URL_PATH)
          .set("Origin", ALLOWED)
          .send(body({ ref: "EFGH34", eventId: "99999999-2222-4333-8444-555555555555" }));
        expect(dflt.status).toBe(403); // the default is replaced, not merged
      } finally {
        restoreProd();
      }
    });
  });

  describe("GET monomi-track.js", () => {
    it("serves the snippet as cacheable JavaScript with an ETag (304 on revalidation)", async () => {
      const res = await request(app.getHttpServer()).get("/api/v1/public/track/monomi-track.js");
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("application/javascript");
      expect(res.headers["cache-control"]).toContain("max-age=300");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
      const again = await request(app.getHttpServer())
        .get("/api/v1/public/track/monomi-track.js")
        .set("If-None-Match", res.headers.etag);
      expect(again.status).toBe(304);
    });
  });
});

describe("monomi-track.js source", () => {
  it("is valid plain JavaScript, tiny, and holds nothing sensitive", () => {
    expect(() => new vm.Script(MONOMI_TRACK_JS)).not.toThrow();
    expect(MONOMI_TRACK_JS.length).toBeLessThan(9000);
    expect(MONOMI_TRACK_JS).not.toMatch(/token|secret|password|access_token|EAA[A-Za-z0-9]{10}/i);
    expect(MONOMI_TRACK_JS).not.toContain("${");
    expect(MONOMI_TRACK_JS).toContain("MonomiTrack");
    expect(MONOMI_TRACK_JS).toContain("sendBeacon");
  });
});
