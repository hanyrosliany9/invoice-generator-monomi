import { Logger } from "@nestjs/common";
import { CrmLeadsService } from "../crm/crm-leads.service";
import { CrmOutboxService } from "../crm/crm-outbox.service";
import { WhatsAppApiService } from "./whatsapp-api.service";
import { WhatsAppGraphClient } from "./whatsapp-graph.client";
import { WhatsAppIngestService } from "./whatsapp-ingest.service";
import { WhatsAppWebhookService } from "./whatsapp-webhook.service";
import {
  FakeGraph,
  FakePrisma,
  WA_ENV_KEYS,
  messagesPayload,
  unixAgo,
  waEnv,
  withEnv,
} from "./testing/whatsapp-fakes.helper-spec";

const CTWA_CLID =
  "ARAkLkA8rmlFeiCktEJQ-QTwRiyYHAFDLMNDBH0CD3qpjd0HR4irJ6LEkR7JwFF4XvnO2E4Nx0";
const CUSTOMER = "6281299991204";

function setup(seed: Record<string, any[]> = {}) {
  const prisma = new FakePrisma({
    leadStage: [
      {
        id: "st-new",
        key: "NEW",
        name: "New",
        order: 1,
        type: "OPEN",
        metaEvent: null,
        isActive: true,
      },
    ],
    campaign: [
      {
        id: "camp1",
        code: "FB-OKT1",
        name: "Oktober",
        metaAdIds: ["120211234567890"],
      },
    ],
    crmSettings: [{ id: "default", responseThresholdMinutes: 15 }],
    ...seed,
  });
  const graph = new FakeGraph();
  const api = new WhatsAppApiService(
    prisma as any,
    new WhatsAppGraphClient(graph.fetch as any),
  );
  const settings: any = { getThresholdMinutes: async () => 15 };
  const leads = new CrmLeadsService(
    prisma as any,
    {} as any,
    new CrmOutboxService(),
    settings,
    {} as any,
    {} as any,
    {} as any,
  );
  const ingest = new WhatsAppIngestService(prisma as any, leads, api);
  const webhooks = new WhatsAppWebhookService(prisma as any, ingest);
  return { prisma, graph, api, ingest, webhooks, t: prisma.tables };
}

const ctwaMessage = (
  id = "wamid.CTWA1",
  text = "Halo Monomi, saya tertarik [FB-OKT1]",
  minutesAgo = 2,
) => ({
  from: CUSTOMER,
  id,
  timestamp: unixAgo(minutesAgo),
  type: "text",
  text: { body: text },
  referral: {
    source_url: "https://fb.me/abc",
    source_id: "120211234567890",
    source_type: "ad",
    headline: "Video produk profesional",
    body: "Chat kami",
    media_type: "image",
    ctwa_clid: CTWA_CLID,
  },
});

describe("WhatsAppIngestService", () => {
  let restore: () => void;
  beforeEach(() => {
    restore = withEnv({
      ...Object.fromEntries(WA_ENV_KEYS.map((k) => [k, undefined])),
      ...waEnv(),
    });
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => {
    restore();
    jest.restoreAllMocks();
  });

  it("CTWA inbound: creates the lead (source, campaign by [CODE], ctwa_clid, ad id, referral) + LeadSubmitted, opens 72h free entry", async () => {
    const { ingest, t } = setup();
    const r = await ingest.processPayload(
      messagesPayload({
        contacts: [{ wa_id: CUSTOMER, profile: { name: "Rina Ayu" } }],
        messages: [ctwaMessage()],
      }),
    );
    expect(r).toMatchObject({ messages: 1, leadsCreated: 1 });
    expect(t.lead).toHaveLength(1);
    const lead = t.lead[0];
    expect(lead).toMatchObject({
      name: "Rina Ayu",
      phone: "+6281299991204",
      waId: CUSTOMER,
      source: "WHATSAPP_CTWA",
      campaignId: "camp1",
      campaignCode: "FB-OKT1",
      ctwaClid: CTWA_CLID,
      adId: "120211234567890",
      firstMessage: "Halo Monomi, saya tertarik [FB-OKT1]",
      assignedToId: null,
    });
    expect(lead.referral).toMatchObject({
      headline: "Video produk profesional",
      ctwa_clid: CTWA_CLID,
    });
    expect(t.metaEventOutbox).toHaveLength(1);
    expect(t.metaEventOutbox[0]).toMatchObject({
      eventName: "LeadSubmitted",
      status: "PENDING_CONFIG",
      leadId: lead.id,
    });
    const contact = t.whatsAppContact[0];
    expect(contact).toMatchObject({
      waId: CUSTOMER,
      leadId: lead.id,
      profileName: "Rina Ayu",
    });
    const conv = t.whatsAppConversation[0];
    expect(conv.unreadCount).toBe(1);
    expect(conv.lastInboundAt).toBeInstanceOf(Date);
    expect(conv.freeEntryUntil.getTime() - conv.lastInboundAt.getTime()).toBe(
      72 * 3600_000,
    );
    expect(t.whatsAppMessage[0]).toMatchObject({
      direction: "IN",
      origin: "CUSTOMER",
      status: "RECEIVED",
      type: "text",
    });
  });

  it("matches the campaign by Meta ad id when the message has no code; organic when no referral", async () => {
    const { ingest, t } = setup();
    await ingest.processPayload(
      messagesPayload({
        messages: [ctwaMessage("wamid.A", "Halo, berapa harganya?")],
      }),
    );
    expect(t.lead[0]).toMatchObject({
      campaignId: "camp1",
      source: "WHATSAPP_CTWA",
    });
    await ingest.processPayload(
      messagesPayload({
        messages: [
          {
            from: "6285700001111",
            id: "wamid.B",
            timestamp: unixAgo(1),
            type: "text",
            text: { body: "Halo" },
          },
        ],
      }),
    );
    expect(t.lead[1]).toMatchObject({
      source: "WHATSAPP_ORGANIC",
      campaignId: null,
      ctwaClid: null,
      name: "+6285700001111",
    });
  });

  it("is idempotent: the same message twice creates one message and one lead", async () => {
    const { ingest, webhooks, t } = setup();
    const payload = messagesPayload({ messages: [ctwaMessage()] });
    await ingest.processPayload(payload);
    const again = await ingest.processPayload(payload);
    expect(again).toMatchObject({
      messages: 0,
      duplicates: 1,
      leadsCreated: 0,
    });
    expect(t.whatsAppMessage).toHaveLength(1);
    expect(t.lead).toHaveLength(1);
    expect(t.whatsAppConversation[0].unreadCount).toBe(1);
    // identical redelivery of the raw body is dropped at intake
    const raw = Buffer.from(JSON.stringify(payload));
    expect((await webhooks.store(raw, payload)).duplicate).toBe(false);
    expect((await webhooks.store(raw, payload)).duplicate).toBe(true);
  });

  it("concurrent first messages from a new number still create a single lead", async () => {
    const { ingest, t } = setup();
    await Promise.all([
      ingest.processPayload(
        messagesPayload({ messages: [ctwaMessage("wamid.P1")] }),
      ),
      ingest.processPayload(
        messagesPayload({ messages: [ctwaMessage("wamid.P2", "Halo lagi")] }),
      ),
    ]);
    expect(t.lead).toHaveLength(1);
    expect(t.whatsAppMessage).toHaveLength(2);
  });

  it("links to an existing lead with the same phone instead of creating one", async () => {
    const { ingest, t } = setup({
      lead: [
        {
          id: "L-old",
          name: "Budi",
          phone: "+6281299991204",
          waId: null,
          stageId: "st-new",
          firstContactAt: new Date(Date.now() - 86400000),
          lastContactAt: new Date(Date.now() - 86400000),
          firstResponseAt: null,
          ctwaClid: null,
          adId: null,
        },
      ],
    });
    await ingest.processPayload(messagesPayload({ messages: [ctwaMessage()] }));
    expect(t.lead).toHaveLength(1);
    expect(t.whatsAppContact[0].leadId).toBe("L-old");
    // a later ad click is kept for attribution
    expect(t.lead[0].ctwaClid).toBe(CTWA_CLID);
    expect(
      t.leadActivity.some(
        (a: any) => a.type === "WHATSAPP" && a.body.startsWith("Pesan masuk"),
      ),
    ).toBe(true);
  });

  it("echoes from the WhatsApp Business app are PHONE_APP replies: firstResponseAt, activity, unread reset", async () => {
    const { ingest, t } = setup();
    await ingest.processPayload(
      messagesPayload({
        messages: [ctwaMessage("wamid.IN1", "Halo [FB-OKT1]", 5)],
      }),
    );
    await ingest.processPayload(
      messagesPayload(
        {
          message_echoes: [
            {
              from: "6281100000000",
              to: CUSTOMER,
              id: "wamid.ECHO1",
              timestamp: unixAgo(1),
              type: "text",
              text: { body: "Halo kak, boleh tahu kebutuhannya?" },
            },
          ],
        },
        "smb_message_echoes",
      ),
    );
    const echo = t.whatsAppMessage.find(
      (m: any) => m.waMessageId === "wamid.ECHO1",
    );
    expect(echo).toMatchObject({
      direction: "OUT",
      origin: "PHONE_APP",
      status: "SENT",
    });
    expect(t.lead[0].firstResponseAt).toBeInstanceOf(Date);
    expect(t.whatsAppConversation[0].unreadCount).toBe(0);
    expect(t.whatsAppConversation[0].lastMessagePreview).toBe(
      "Halo kak, boleh tahu kebutuhannya?",
    );
    const act = t.leadActivity.filter((a: any) => a.type === "WHATSAPP");
    expect(act.map((a: any) => a.body)).toEqual([
      "Dibalas dari HP (WhatsApp Business): Halo kak, boleh tahu kebutuhannya?",
    ]);
  });

  it("applies statuses forward-only, stores failures, and defers unknown fresh statuses", async () => {
    const { ingest, t, prisma } = setup();
    await ingest.processPayload(messagesPayload({ messages: [ctwaMessage()] }));
    prisma.tables.whatsAppMessage.push({
      id: "m-out",
      waMessageId: "wamid.OUT1",
      conversationId: t.whatsAppConversation[0].id,
      direction: "OUT",
      origin: "MONOMI",
      type: "text",
      text: "hi",
      status: "PENDING",
      timestamp: new Date(),
    });
    const st = (status: string, extra: any = {}) => ({
      id: "wamid.OUT1",
      status,
      timestamp: unixAgo(0),
      recipient_id: CUSTOMER,
      ...extra,
    });
    await ingest.processPayload(
      messagesPayload({ statuses: [st("sent"), st("read"), st("delivered")] }),
    );
    expect(
      prisma.tables.whatsAppMessage.find((m: any) => m.id === "m-out")?.status,
    ).toBe("READ");

    prisma.tables.whatsAppMessage.push({
      id: "m-out2",
      waMessageId: "wamid.OUT2",
      conversationId: "x",
      direction: "OUT",
      origin: "MONOMI",
      type: "text",
      status: "PENDING",
      timestamp: new Date(),
    });
    await ingest.processPayload(
      messagesPayload({
        statuses: [
          {
            id: "wamid.OUT2",
            status: "failed",
            timestamp: unixAgo(0),
            errors: [{ code: 131047, title: "Re-engagement message" }],
          },
        ],
      }),
    );
    expect(
      prisma.tables.whatsAppMessage.find((m: any) => m.id === "m-out2"),
    ).toMatchObject({
      status: "FAILED",
      errorCode: "131047",
      errorTitle: "Re-engagement message",
    });

    const r = await ingest.processPayload(
      messagesPayload({
        statuses: [
          { id: "wamid.NOTYET", status: "sent", timestamp: unixAgo(0) },
        ],
      }),
    );
    expect(r.deferredStatuses).toBe(1);
    const old = await ingest.processPayload(
      messagesPayload({
        statuses: [
          { id: "wamid.GONE", status: "sent", timestamp: unixAgo(60) },
        ],
      }),
    );
    expect(old.deferredStatuses).toBe(0);
  });

  it("history sync: HISTORY origin, direction by thread, progress, lead rules (30 days / referral), idempotent", async () => {
    const { ingest, t } = setup();
    const days = (d: number) => unixAgo(d * 24 * 60);
    const payload = messagesPayload(
      {
        history: [
          {
            metadata: { phase: 1, chunk_order: 2, progress: 40 },
            threads: [
              {
                id: "6281111111111", // recent chat -> lead
                messages: [
                  {
                    from: "6281111111111",
                    id: "wamid.H1",
                    timestamp: days(3),
                    type: "text",
                    text: { body: "Mau tanya paket" },
                    history_context: { status: "READ" },
                  },
                  {
                    from: "6281100000000",
                    id: "wamid.H2",
                    timestamp: days(2.9),
                    type: "text",
                    text: { body: "Siap kak" },
                    history_context: { status: "DELIVERED" },
                  },
                ],
              },
              {
                id: "6282222222222", // old chat, no referral -> no lead
                messages: [
                  {
                    from: "6282222222222",
                    id: "wamid.H3",
                    timestamp: days(60),
                    type: "text",
                    text: { body: "Halo" },
                  },
                ],
              },
              {
                id: "6283333333333", // old chat from an ad -> lead
                messages: [
                  {
                    ...ctwaMessage("wamid.H4", "Info [FB-OKT1]"),
                    from: "6283333333333",
                    timestamp: days(80),
                  },
                ],
              },
              {
                id: "6284444444444", // media older than 14 days: no media id
                messages: [
                  {
                    from: "6284444444444",
                    id: "wamid.H5",
                    timestamp: days(100),
                    type: "image",
                    image: { mime_type: "image/jpeg" },
                  },
                ],
              },
            ],
          },
        ],
      },
      "history",
    );
    const r = await ingest.processPayload(payload);
    expect(r.messages).toBe(5);
    expect(t.whatsAppMessage.every((m: any) => m.origin === "HISTORY")).toBe(
      true,
    );
    expect(
      t.whatsAppMessage.find((m: any) => m.waMessageId === "wamid.H2"),
    ).toMatchObject({ direction: "OUT", status: "DELIVERED" });
    expect(
      t.whatsAppMessage.find((m: any) => m.waMessageId === "wamid.H5"),
    ).toMatchObject({ type: "image", mediaId: null });
    expect(t.lead.map((l: any) => l.waId).sort()).toEqual([
      "6281111111111",
      "6283333333333",
    ]);
    const recent = t.lead.find((l: any) => l.waId === "6281111111111");
    expect(recent?.firstResponseAt).toBeInstanceOf(Date); // history reply after first contact
    expect(t.whatsAppConversation.every((c: any) => c.unreadCount === 0)).toBe(
      true,
    );
    expect(t.whatsAppConnection[0]).toMatchObject({
      historyPhase: 1,
      historyProgress: 40,
    });
    expect(
      t.leadActivity.filter((a: any) => a.type === "WHATSAPP"),
    ).toHaveLength(0); // no timeline flood

    const again = await ingest.processPayload(payload);
    expect(again).toMatchObject({
      messages: 0,
      duplicates: 5,
      leadsCreated: 0,
    });
  });

  it("history lead window is configurable (0 = only chats from ads)", async () => {
    restore();
    restore = withEnv({ ...waEnv(), WHATSAPP_HISTORY_LEAD_MAX_AGE_DAYS: "0" });
    const { ingest, t } = setup();
    await ingest.processPayload(
      messagesPayload(
        {
          history: [
            {
              threads: [
                {
                  id: "6281111111111",
                  messages: [
                    {
                      from: "6281111111111",
                      id: "wamid.X",
                      timestamp: unixAgo(10),
                      type: "text",
                      text: { body: "hi" },
                    },
                  ],
                },
              ],
            },
          ],
        },
        "history",
      ),
    );
    expect(t.lead).toHaveLength(0);
  });

  it("contact sync stores the phone-book name; remove clears it", async () => {
    const { ingest, t } = setup();
    const sync = (action: string) =>
      messagesPayload(
        {
          state_sync: [
            {
              type: "contact",
              contact: {
                full_name: "Pak Joko Kantor",
                phone_number: "+62 812-9999-1204",
              },
              action,
              metadata: { timestamp: unixAgo(0) },
            },
          ],
        },
        "smb_app_state_sync",
      );
    await ingest.processPayload(sync("add"));
    expect(t.whatsAppContact[0]).toMatchObject({
      waId: CUSTOMER,
      phoneBookName: "Pak Joko Kantor",
    });
    await ingest.processPayload(sync("remove"));
    expect(t.whatsAppContact[0].phoneBookName).toBeNull();
    expect(t.whatsAppConversation).toHaveLength(0);
  });

  it("account_update PARTNER_REMOVED marks the connection disconnected and drops the stored token", async () => {
    const { ingest, t } = setup({
      whatsAppConnection: [
        {
          id: "default",
          status: "CONNECTED",
          accessTokenEnc: "v1:a:b:c",
          wabaId: "102030405060",
        },
      ],
    });
    await ingest.processPayload(
      messagesPayload({ event: "PARTNER_REMOVED" }, "account_update"),
    );
    expect(t.whatsAppConnection[0]).toMatchObject({
      status: "DISCONNECTED",
      disconnectReason: "PARTNER_REMOVED",
      accessTokenEnc: null,
    });
  });

  it("ignores other phone numbers, unknown fields, malformed items and other objects", async () => {
    const { ingest, t } = setup();
    const other = messagesPayload({ messages: [ctwaMessage()] });
    other.entry[0].changes[0].value.metadata.phone_number_id = "111111111111";
    await ingest.processPayload(other);
    await ingest.processPayload(
      messagesPayload({ foo: 1 }, "message_template_status_update"),
    );
    await ingest.processPayload(
      messagesPayload({
        messages: [{ from: "abc", id: "x" }, null, { from: CUSTOMER }],
      }),
    );
    await ingest.processPayload({ object: "page", entry: [] });
    expect(t.whatsAppMessage).toHaveLength(0);
    expect(t.lead).toHaveLength(0);
  });
});

describe("WhatsAppWebhookService retries", () => {
  let restore: () => void;
  beforeEach(() => {
    restore = withEnv(waEnv());
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => {
    restore();
    jest.restoreAllMocks();
  });

  it("processes once, retries with backoff on failure, gives up after max attempts", async () => {
    const { webhooks, ingest, t } = setup();
    const payload = messagesPayload({ messages: [ctwaMessage()] });
    const { id } = await webhooks.store(
      Buffer.from(JSON.stringify(payload)),
      payload,
    );
    const spy = jest
      .spyOn(ingest, "processPayload")
      .mockRejectedValueOnce(new Error("db hiccup"));
    expect(await webhooks.process(id as string)).toBe("retry");
    const ev = t.whatsAppWebhookEvent[0];
    expect(ev).toMatchObject({
      attempts: 1,
      processedAt: null,
      lastError: "db hiccup",
    });
    expect(ev.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
    spy.mockRestore();
    expect(await webhooks.process(id as string)).toBe("processed");
    expect(t.whatsAppWebhookEvent[0].processedAt).toBeInstanceOf(Date);
    expect(t.lead).toHaveLength(1);
    expect(await webhooks.process(id as string)).toBe("skipped");

    t.whatsAppWebhookEvent[0] = {
      ...t.whatsAppWebhookEvent[0],
      processedAt: null,
      attempts: 7,
    };
    jest
      .spyOn(ingest, "processPayload")
      .mockRejectedValue(new Error("still broken"));
    expect(await webhooks.process(id as string)).toBe("failed");
    expect(t.whatsAppWebhookEvent[0].failedAt).toBeInstanceOf(Date);
  });

  it("re-queues an event whose statuses reference messages not stored yet", async () => {
    const { webhooks, t } = setup();
    const payload = messagesPayload({
      statuses: [
        { id: "wamid.SOON", status: "delivered", timestamp: unixAgo(0) },
      ],
    });
    const { id } = await webhooks.store(
      Buffer.from(JSON.stringify(payload)),
      payload,
    );
    expect(await webhooks.process(id as string)).toBe("retry");
    expect(t.whatsAppWebhookEvent[0].processedAt).toBeNull();
  });
});
