import { Body, Controller, INestApplication, Post } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { APP_GUARD } from "@nestjs/core";
import request from "supertest";
import { registerRawBodyRoutes } from "../../config/body-parser.config";
import { WhatsAppWebhookController } from "./whatsapp-webhook.controller";
import { WhatsAppWebhookService } from "./whatsapp-webhook.service";
import {
  APP_SECRET,
  VERIFY_TOKEN,
  WA_ENV_KEYS,
  messagesPayload,
  sign,
  waEnv,
  withEnv,
} from "./testing/whatsapp-fakes.helper-spec";

@Controller("other")
class OtherJsonController {
  @Post()
  echo(@Body() body: any) {
    return { got: body };
  }
}

describe("WhatsApp webhook endpoint (raw body + signature + verification)", () => {
  let app: INestApplication;
  const stored: Array<{ raw: Buffer; payload: any }> = [];
  const kicked: string[] = [];
  let restore: () => void;
  const fakeService = {
    store: jest.fn(async (raw: Buffer, payload: any) => {
      stored.push({ raw, payload });
      return { id: `ev${stored.length}`, duplicate: false };
    }),
    kick: jest.fn((id: string) => kicked.push(id)),
  };

  beforeAll(async () => {
    restore = withEnv(
      Object.fromEntries(WA_ENV_KEYS.map((k) => [k, undefined])),
    );
    const moduleRef = await Test.createTestingModule({
      controllers: [WhatsAppWebhookController, OtherJsonController],
      providers: [
        { provide: WhatsAppWebhookService, useValue: fakeService },
        { provide: APP_GUARD, useValue: { canActivate: () => true } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    registerRawBodyRoutes(app, "api/v1");
    app.setGlobalPrefix("api/v1");
    await app.init();
  });
  afterAll(async () => {
    await app.close();
    restore();
  });

  let restoreEnv: () => void = () => undefined;
  beforeEach(() => {
    stored.length = 0;
    kicked.length = 0;
    restoreEnv = withEnv(waEnv());
  });
  afterEach(() => restoreEnv());

  const url = "/api/v1/whatsapp/webhook";

  describe("GET verification", () => {
    it("echoes hub.challenge for the right verify token", async () => {
      const res = await request(app.getHttpServer()).get(url).query({
        "hub.mode": "subscribe",
        "hub.verify_token": VERIFY_TOKEN,
        "hub.challenge": "1158201444",
      });
      expect(res.status).toBe(200);
      expect(res.text).toBe("1158201444");
      expect(res.headers["content-type"]).toMatch(/text\/plain/);
    });

    it.each([
      [
        {
          "hub.mode": "subscribe",
          "hub.verify_token": "wrong-token-value-123",
          "hub.challenge": "1",
        },
      ],
      [
        {
          "hub.mode": "unsubscribe",
          "hub.verify_token": VERIFY_TOKEN,
          "hub.challenge": "1",
        },
      ],
      [{ "hub.mode": "subscribe", "hub.challenge": "1" }],
      [
        {
          "hub.mode": "subscribe",
          "hub.verify_token": VERIFY_TOKEN,
          "hub.challenge": "<script>alert(1)</script>",
        },
      ],
    ])("403 for %j", async (q) => {
      const res = await request(app.getHttpServer()).get(url).query(q);
      expect(res.status).toBe(403);
    });

    it("404 when the webhook is not configured", async () => {
      restoreEnv();
      restoreEnv = withEnv({ WHATSAPP_WEBHOOK_VERIFY_TOKEN: undefined });
      const res = await request(app.getHttpServer()).get(url).query({
        "hub.mode": "subscribe",
        "hub.verify_token": VERIFY_TOKEN,
        "hub.challenge": "1",
      });
      expect(res.status).toBe(404);
    });
  });

  describe("POST events", () => {
    const body = JSON.stringify(messagesPayload({ messages: [] }), null, 1); // whitespace on purpose

    it("accepts a valid signature over the RAW body, stores the exact bytes and processes async", async () => {
      const res = await request(app.getHttpServer())
        .post(url)
        .set("Content-Type", "application/json")
        .set("X-Hub-Signature-256", sign(body))
        .send(body);
      expect(res.status).toBe(200);
      expect(stored).toHaveLength(1);
      expect(Buffer.isBuffer(stored[0].raw)).toBe(true);
      expect(stored[0].raw.toString()).toBe(body);
      expect(stored[0].payload.object).toBe("whatsapp_business_account");
      expect(kicked).toEqual(["ev1"]);
    });

    it("rejects a tampered body (401) without storing", async () => {
      const res = await request(app.getHttpServer())
        .post(url)
        .set("Content-Type", "application/json")
        .set("X-Hub-Signature-256", sign(body))
        .send(body.replace('"messages"', '"messagez"'));
      expect(res.status).toBe(401);
      expect(stored).toHaveLength(0);
    });

    it("rejects a missing or wrong-secret signature (401)", async () => {
      const r1 = await request(app.getHttpServer())
        .post(url)
        .set("Content-Type", "application/json")
        .send(body);
      expect(r1.status).toBe(401);
      const r2 = await request(app.getHttpServer())
        .post(url)
        .set("Content-Type", "application/json")
        .set("X-Hub-Signature-256", sign(body, "not-the-app-secret-0000000000"))
        .send(body);
      expect(r2.status).toBe(401);
      expect(stored).toHaveLength(0);
    });

    it("rejects a signature computed over re-serialised JSON (proves raw-body verification)", async () => {
      const compact = JSON.stringify(JSON.parse(body));
      const res = await request(app.getHttpServer())
        .post(url)
        .set("Content-Type", "application/json")
        .set("X-Hub-Signature-256", sign(compact))
        .send(body);
      expect(res.status).toBe(401);
    });

    it("ignores other objects (200, not stored) and rejects invalid JSON with a valid signature (400)", async () => {
      const other = JSON.stringify({ object: "page", entry: [] });
      const r1 = await request(app.getHttpServer())
        .post(url)
        .set("Content-Type", "application/json")
        .set("X-Hub-Signature-256", sign(other))
        .send(other);
      expect(r1.status).toBe(200);
      const bad = "{not json";
      const r2 = await request(app.getHttpServer())
        .post(url)
        .set("Content-Type", "application/json")
        .set("X-Hub-Signature-256", sign(bad))
        .send(bad);
      expect(r2.status).toBe(400);
      expect(stored).toHaveLength(0);
    });

    it("caps the body at 3mb (413)", async () => {
      const big = JSON.stringify({
        object: "whatsapp_business_account",
        pad: "x".repeat(3 * 1024 * 1024 + 10),
      });
      const res = await request(app.getHttpServer())
        .post(url)
        .set("Content-Type", "application/json")
        .set("X-Hub-Signature-256", sign(big))
        .send(big);
      expect(res.status).toBe(413);
    });

    it("answers 500 (so Meta retries) when the event cannot be stored", async () => {
      fakeService.store.mockRejectedValueOnce(new Error("db down"));
      const res = await request(app.getHttpServer())
        .post(url)
        .set("Content-Type", "application/json")
        .set("X-Hub-Signature-256", sign(body))
        .send(body);
      expect(res.status).toBe(500);
      expect(kicked).toHaveLength(0);
    });

    it("404 when not configured (no app secret)", async () => {
      restoreEnv();
      restoreEnv = withEnv({ ...waEnv(), META_APP_SECRET: undefined });
      const res = await request(app.getHttpServer())
        .post(url)
        .set("Content-Type", "application/json")
        .set("X-Hub-Signature-256", sign(body))
        .send(body);
      expect(res.status).toBe(404);
    });

    it("does not change JSON parsing of other routes", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/other")
        .send({ a: 1 });
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ got: { a: 1 } });
    });
  });

  it("uses the app secret override when set", async () => {
    restoreEnv();
    restoreEnv = withEnv({
      ...waEnv(),
      WHATSAPP_APP_SECRET: "fedcba9876543210fedcba9876543210",
    });
    const body = JSON.stringify(messagesPayload({ messages: [] }));
    const ok = await request(app.getHttpServer())
      .post(url)
      .set("Content-Type", "application/json")
      .set(
        "X-Hub-Signature-256",
        sign(body, "fedcba9876543210fedcba9876543210"),
      )
      .send(body);
    expect(ok.status).toBe(200);
    const old = await request(app.getHttpServer())
      .post(url)
      .set("Content-Type", "application/json")
      .set("X-Hub-Signature-256", sign(body, APP_SECRET))
      .send(body);
    expect(old.status).toBe(401);
  });
});
