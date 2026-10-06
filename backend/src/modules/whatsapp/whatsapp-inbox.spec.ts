import {
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "../auth/guards/roles.guard";
import { MetaCapiService } from "./meta-capi.service";
import { WhatsAppApiService } from "./whatsapp-api.service";
import { WhatsAppController } from "./whatsapp.controller";
import { WhatsAppGraphClient } from "./whatsapp-graph.client";
import { WhatsAppInboxService } from "./whatsapp-inbox.service";
import { WhatsAppIngestService } from "./whatsapp-ingest.service";
import { WhatsAppStatusService } from "./whatsapp-status.service";
import { WhatsAppWebhookController } from "./whatsapp-webhook.controller";
import {
  ACCESS_TOKEN,
  FakeGraph,
  FakePrisma,
  PHONE_ID,
  WABA_ID,
  WA_ENV_KEYS,
  waEnv,
  withEnv,
} from "./testing/whatsapp-fakes.helper-spec";

const CUSTOMER = "6281299991204";

function setup(lastInboundMinutesAgo: number | null) {
  const now = Date.now();
  const prisma = new FakePrisma({
    user: [
      { id: "u1", name: "Sari", isActive: true, role: "ADMIN" },
      { id: "u2", name: "Video", isActive: true, role: "VIDEOGRAPHER" },
    ],
    lead: [
      {
        id: "L1",
        name: "Rina",
        phone: "+6281299991204",
        waId: CUSTOMER,
        stageId: "st",
        firstContactAt: new Date(now - 3600_000),
        lastContactAt: new Date(now - 3600_000),
        firstResponseAt: null,
      },
    ],
    leadStage: [
      { id: "st", key: "NEW", name: "New", type: "OPEN", color: "#fff" },
    ],
    whatsAppContact: [
      {
        id: "ct1",
        waId: CUSTOMER,
        phone: "+6281299991204",
        profileName: "Rina",
        phoneBookName: null,
        leadId: "L1",
      },
    ],
    whatsAppConversation: [
      {
        id: "cv1",
        contactId: "ct1",
        unreadCount: 2,
        status: "OPEN",
        assignedToId: null,
        lastReadReceiptFor: null,
        lastMessageAt: new Date(now - 60_000),
        lastMessagePreview: "Halo",
        lastInboundAt:
          lastInboundMinutesAgo === null
            ? null
            : new Date(now - lastInboundMinutesAgo * 60_000),
        freeEntryUntil: null,
      },
    ],
    whatsAppMessage: [
      {
        id: "m1",
        waMessageId: "wamid.IN1",
        conversationId: "cv1",
        direction: "IN",
        origin: "CUSTOMER",
        type: "text",
        text: "Halo",
        status: "RECEIVED",
        timestamp: new Date(now - 60_000),
        referral: { headline: "Promo", ctwa_clid: "abcd1234" },
      },
      {
        id: "m2",
        waMessageId: "wamid.IMG",
        conversationId: "cv1",
        direction: "IN",
        origin: "CUSTOMER",
        type: "image",
        text: null,
        mediaId: "777888999000",
        mediaMime: "image/jpeg",
        status: "RECEIVED",
        timestamp: new Date(now - 50_000),
      },
    ],
  });
  const graph = new FakeGraph()
    .on("POST", new RegExp(`/${PHONE_ID}/messages$`), (c: any) => ({
      json:
        c.body.status === "read"
          ? { success: true }
          : {
              messaging_product: "whatsapp",
              messages: [{ id: `wamid.SENT${graph.calls.length}` }],
            },
    }))
    .on("GET", new RegExp(`/${WABA_ID}/message_templates$`), {
      data: [
        {
          name: "follow_up",
          language: "id",
          status: "APPROVED",
          category: "MARKETING",
          components: [
            { type: "BODY", text: "Halo {{1}}, masih tertarik dengan {{2}}?" },
          ],
        },
        {
          name: "pending_one",
          language: "id",
          status: "PENDING",
          components: [{ type: "BODY", text: "x" }],
        },
      ],
    })
    .on("GET", /\/777888999000$/, {
      url: "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=777",
      mime_type: "image/jpeg",
      file_size: 3,
    })
    .on("GET", /\/whatsapp_business\/attachments/, () => ({
      body: Buffer.from("JPG"),
      headers: { "content-type": "image/jpeg" },
    }));
  const api = new WhatsAppApiService(
    prisma as any,
    new WhatsAppGraphClient(graph.fetch as any),
  );
  const ingest = new WhatsAppIngestService(prisma as any, {} as any, api);
  const inbox = new WhatsAppInboxService(prisma as any, api, ingest);
  const status = new WhatsAppStatusService(
    prisma as any,
    api,
    new MetaCapiService(prisma as any, api),
  );
  return { prisma, graph, inbox, status, t: prisma.tables };
}

describe("WhatsAppInboxService", () => {
  let restore: () => void;
  beforeEach(() => {
    restore = withEnv({
      ...Object.fromEntries(WA_ENV_KEYS.map((k) => [k, undefined])),
      ...waEnv(),
    });
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => {
    restore();
    jest.restoreAllMocks();
  });

  it("sends a text inside the 24h window: Graph body, bearer header, stored as MONOMI by the staff member, first response set", async () => {
    const { inbox, graph, t } = setup(30);
    const msg = await inbox.sendText("cv1", "  Halo kak Rina!  ", "m1", "u1");
    const call = graph.calls.find((c) => c.method === "POST")!;
    expect(call.path).toBe(`/v26.0/${PHONE_ID}/messages`);
    expect(call.headers.Authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
    expect(call.body).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: CUSTOMER,
      type: "text",
      text: { body: "Halo kak Rina!", preview_url: false },
      context: { message_id: "wamid.IN1" },
    });
    expect(msg).toMatchObject({ status: "PENDING" });
    const stored = t.whatsAppMessage.find((m: any) => m.id === msg.id);
    expect(stored).toMatchObject({
      direction: "OUT",
      origin: "MONOMI",
      sentById: "u1",
      text: "Halo kak Rina!",
      contextWaMessageId: "wamid.IN1",
    });
    expect(t.whatsAppConversation[0].unreadCount).toBe(0);
    expect(t.lead[0].firstResponseAt).toBeInstanceOf(Date);
    expect(t.leadActivity[0]).toMatchObject({
      type: "WHATSAPP",
      actorId: "u1",
      body: "@wa.monomi: Halo kak Rina!",
    });
  });

  it("refuses free-form text outside the 24h window (409 WINDOW_CLOSED) without calling Meta", async () => {
    for (const ago of [24 * 60 + 1, null]) {
      const { inbox, graph } = setup(ago);
      const err = await inbox
        .sendText("cv1", "Halo", undefined, "u1")
        .catch((e) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.getResponse()).toMatchObject({ code: "WINDOW_CLOSED" });
      expect(graph.calls).toHaveLength(0);
    }
  });

  it("maps Meta's re-engagement error (131047) to WINDOW_CLOSED", async () => {
    const { inbox, graph } = setup(10);
    graph.on("POST", /messages$/, () => ({
      status: 400,
      json: { error: { code: 131047, message: "Re-engagement message" } },
    }));
    const err = await inbox
      .sendText("cv1", "Halo", undefined, "u1")
      .catch((e) => e);
    expect(err.getResponse()).toMatchObject({ code: "WINDOW_CLOSED" });
  });

  it("templates: only APPROVED, allowed outside the window, parameter count enforced", async () => {
    const { inbox, graph, t } = setup(null);
    const list = await inbox.templates();
    expect(list.map((x) => x.name)).toEqual(["follow_up"]);
    expect(list[0].paramCount).toBe(2);
    await expect(
      inbox.sendTemplate("cv1", "follow_up", "id", ["Rina"], "u1"),
    ).rejects.toThrow(/2 isian/);
    await expect(
      inbox.sendTemplate("cv1", "pending_one", "id", [], "u1"),
    ).rejects.toThrow(/tidak ditemukan/);
    const sent = await inbox.sendTemplate(
      "cv1",
      "follow_up",
      "id",
      ["Rina", "video\nproduk"],
      "u1",
    );
    const call = graph.calls.filter((c) => c.method === "POST").pop()!;
    expect(call.body.template).toEqual({
      name: "follow_up",
      language: { code: "id" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: "Rina" },
            { type: "text", text: "video produk" },
          ],
        },
      ],
    });
    expect(t.whatsAppMessage.find((m: any) => m.id === sent.id)).toMatchObject({
      type: "template",
      templateName: "follow_up",
      text: "Halo Rina, masih tertarik dengan video produk?",
    });
  });

  it("mark read: resets unread and sends one read receipt for the newest customer message", async () => {
    const { inbox, graph, t } = setup(5);
    await inbox.markRead("cv1");
    await inbox.markRead("cv1");
    const reads = graph.calls.filter((c) => c.body?.status === "read");
    expect(reads).toHaveLength(1);
    expect(reads[0].body).toEqual({
      messaging_product: "whatsapp",
      status: "read",
      message_id: "wamid.IMG",
    });
    expect(t.whatsAppConversation[0]).toMatchObject({
      unreadCount: 0,
      lastReadReceiptFor: "wamid.IMG",
    });
  });

  it("media proxy downloads through the server and never exposes the Meta URL", async () => {
    const { inbox } = setup(5);
    const m = await inbox.media("m2");
    expect(m).toMatchObject({ contentType: "image/jpeg", inline: true });
    expect(m.buffer.toString()).toBe("JPG");
    expect(JSON.stringify(Object.keys(m))).not.toContain("url");
    await expect(inbox.media("m1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("assign only to active admins; link/unlink a lead", async () => {
    const { inbox, t } = setup(5);
    await expect(inbox.assign("cv1", "u2")).rejects.toThrow();
    await inbox.assign("cv1", "u1");
    expect(t.whatsAppConversation[0].assignedToId).toBe("u1");
    await inbox.linkLead("cv1", null);
    expect(t.whatsAppContact[0].leadId).toBeNull();
    await inbox.linkLead("cv1", "L1");
    expect(t.whatsAppContact[0].leadId).toBe("L1");
  });

  it("conversation list / detail / status never contain the access token; CTWA banner exposed", async () => {
    const { inbox, status } = setup(5);
    const list = await inbox.list({}, "u1");
    expect(list.items[0]).toMatchObject({
      id: "cv1",
      window: { open: true },
      contact: { displayName: "Rina" },
    });
    const detail = await inbox.get("cv1");
    expect(detail.ctwa?.referral).toMatchObject({ headline: "Promo" });
    const messages = await inbox.messages("cv1");
    expect(messages.items.find((m: any) => m.id === "m2")).toMatchObject({
      hasMedia: true,
    });
    expect(messages.items.some((m: any) => "mediaId" in m)).toBe(false);
    const st = await status.status(true);
    for (const v of [list, detail, messages, st])
      expect(JSON.stringify(v)).not.toContain(ACCESS_TOKEN);
    expect(st.env.accessToken).toBe(true);
    expect(JSON.stringify(st)).not.toContain(
      process.env.META_APP_SECRET as string,
    );
    expect(JSON.stringify(st)).not.toContain(
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN as string,
    );
  });

  it("reports not configured without credentials", async () => {
    restore();
    restore = withEnv(
      Object.fromEntries(WA_ENV_KEYS.map((k) => [k, undefined])),
    );
    const { inbox, status } = setup(5);
    await expect(
      inbox.sendText("cv1", "x", undefined, "u1"),
    ).rejects.toMatchObject({ status: 503 });
    const st = await status.status();
    expect(st).toMatchObject({
      configured: false,
      check: null,
      webhook: { ready: false },
    });
  });
});

describe("WhatsApp access control", () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);
  const ctx = (role: string, handler: (...a: any[]) => any): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => WhatsAppController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: "u1", role } }),
      }),
    }) as unknown as ExecutionContext;

  it("restricts the staff controller to SUPER_ADMIN/ADMIN behind the JWT guard", () => {
    expect(reflector.get("roles", WhatsAppController)).toEqual([
      "SUPER_ADMIN",
      "ADMIN",
    ]);
    const guards = Reflect.getMetadata(
      "__guards__",
      WhatsAppController,
    ) as any[];
    expect(guards.map((g) => g.name)).toEqual(
      expect.arrayContaining(["JwtAuthGuard", "RolesGuard"]),
    );
  });

  it.each([
    "media",
    "sendText",
    "sendTemplate",
    "list",
    "settingsStatus",
    "revealVerifyToken",
    "completeEmbeddedSignup",
    "runCapi",
  ])("%s: videographers are rejected", (method) => {
    const handler = (WhatsAppController.prototype as any)[method];
    expect(handler).toBeDefined();
    expect(guard.canActivate(ctx("ADMIN", handler))).toBe(true);
    expect(() => guard.canActivate(ctx("VIDEOGRAPHER", handler))).toThrow(
      ForbiddenException,
    );
  });

  it("only the webhook controller is public (no guards; protected by the signature instead)", () => {
    expect(
      Reflect.getMetadata("__guards__", WhatsAppWebhookController),
    ).toBeUndefined();
  });
});
