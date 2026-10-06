import { Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  buildCapiEvent,
  CAPI_MAX_ATTEMPTS,
  MetaCapiService,
  SKIP_NO_CLID,
  SKIP_TOO_OLD,
} from "./meta-capi.service";
import { WhatsAppApiService } from "./whatsapp-api.service";
import { WhatsAppGraphClient } from "./whatsapp-graph.client";
import {
  ACCESS_TOKEN,
  DATASET_ID,
  FakeGraph,
  FakePrisma,
  WABA_ID,
  WA_ENV_KEYS,
  waEnv,
  withEnv,
} from "./testing/whatsapp-fakes.helper-spec";

const CLID =
  "ARAkLkA8rmlFeiCktEJQ-QTwRiyYHAFDLMNDBH0CD3qpjd0HR4irJ6LEkR7JwFF4XvnO2E4Nx0";
const MIN = 60_000;

function setup(
  rows: Array<Partial<Record<string, any>>>,
  leads: any[] = [
    { id: "L1", ctwaClid: CLID },
    { id: "L2", ctwaClid: null },
  ],
) {
  const now = Date.now();
  const prisma = new FakePrisma({
    lead: leads,
    metaEventOutbox: rows.map((r, i) => ({
      id: `ev${i + 1}`,
      leadId: "L1",
      eventName: "LeadSubmitted",
      eventTime: new Date(now - 10 * MIN),
      value: null,
      currency: "IDR",
      status: "PENDING_CONFIG",
      payload: {},
      attempts: 0,
      nextTryAt: null,
      createdAt: new Date(now - (rows.length - i) * 1000),
      updatedAt: new Date(),
      ...r,
    })),
  });
  const graph = new FakeGraph().on(
    "POST",
    new RegExp(`/${DATASET_ID}/events$`),
    (c: any) => ({
      json: {
        events_received: c.body.data.length,
        messages: [],
        fbtrace_id: "Atrace123",
      },
    }),
  );
  const api = new WhatsAppApiService(
    prisma as any,
    new WhatsAppGraphClient(graph.fetch as any),
  );
  return {
    prisma,
    graph,
    capi: new MetaCapiService(prisma as any, api),
    t: prisma.tables,
  };
}

describe("Conversions API for Business Messaging sender", () => {
  let restore: () => void;
  const enabled = () => ({
    ...waEnv(),
    META_DATASET_ID: DATASET_ID,
    META_CAPI_ENABLED: "true",
  });
  beforeEach(() => {
    restore = withEnv({
      ...Object.fromEntries(WA_ENV_KEYS.map((k) => [k, undefined])),
      ...enabled(),
    });
  });
  afterEach(() => {
    restore();
    jest.restoreAllMocks();
  });
  const reenv = (vars: Record<string, string | undefined>) => {
    restore();
    restore = withEnv({
      ...Object.fromEntries(WA_ENV_KEYS.map((k) => [k, undefined])),
      ...vars,
    });
  };

  it("builds the exact event shape", () => {
    const t = new Date("2026-10-06T10:00:00Z");
    expect(
      buildCapiEvent(
        {
          eventName: "Purchase",
          eventTime: t,
          value: new Prisma.Decimal("7500000"),
        },
        CLID,
        WABA_ID,
      ),
    ).toEqual({
      event_name: "Purchase",
      event_time: 1791280800,
      action_source: "business_messaging",
      messaging_channel: "whatsapp",
      user_data: { whatsapp_business_account_id: WABA_ID, ctwa_clid: CLID },
      custom_data: { currency: "IDR", value: 7500000 },
    });
    expect(
      buildCapiEvent(
        { eventName: "QualifiedLead", eventTime: t, value: null },
        CLID,
        WABA_ID,
      ),
    ).not.toHaveProperty("custom_data");
  });

  it("sends nothing while META_CAPI_ENABLED is off (or no dataset): rows stay PENDING_CONFIG", async () => {
    for (const env of [
      { ...waEnv(), META_DATASET_ID: DATASET_ID },
      { ...waEnv(), META_CAPI_ENABLED: "true" },
      { META_CAPI_ENABLED: "true", META_DATASET_ID: DATASET_ID },
    ]) {
      reenv(env);
      const { capi, graph, t } = setup([{}]);
      const r = await capi.run();
      expect(r.enabled).toBe(false);
      expect(graph.calls).toHaveLength(0);
      expect(t.metaEventOutbox[0].status).toBe("PENDING_CONFIG");
    }
  });

  it("queues and sends with the exact payload; stores the response; SKIPPED without ctwa_clid or older than 7 days", async () => {
    const { capi, graph, t } = setup([
      { eventName: "QualifiedLead" },
      { id: "noclid", leadId: "L2" },
      { id: "old", eventTime: new Date(Date.now() - 8 * 24 * 3600_000) },
      { id: "buy", eventName: "Purchase", value: new Prisma.Decimal(12000000) },
    ]);
    const r = await capi.run();
    expect(r).toMatchObject({ enabled: true, queued: 2, skipped: 2, sent: 2 });
    expect(graph.calls).toHaveLength(1);
    const call = graph.calls[0];
    expect(call.path).toBe(`/v26.0/${DATASET_ID}/events`);
    expect(call.headers.Authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
    expect(call.url).not.toContain(ACCESS_TOKEN);
    expect(Object.keys(call.body)).toEqual(["data"]);
    expect(call.body.data).toEqual([
      expect.objectContaining({
        event_name: "QualifiedLead",
        action_source: "business_messaging",
        messaging_channel: "whatsapp",
        user_data: { whatsapp_business_account_id: WABA_ID, ctwa_clid: CLID },
      }),
      expect.objectContaining({
        event_name: "Purchase",
        custom_data: { currency: "IDR", value: 12000000 },
      }),
    ]);
    const byId = (id: string) =>
      t.metaEventOutbox.find((x: any) => x.id === id);
    expect(byId("ev1")).toMatchObject({
      status: "SENT",
      attempts: 1,
      response: { events_received: 2, fbtrace_id: "Atrace123" },
    });
    expect(byId("ev1")?.sentAt).toBeInstanceOf(Date);
    expect(byId("noclid")).toMatchObject({
      status: "SKIPPED",
      lastError: SKIP_NO_CLID,
    });
    expect(byId("old")).toMatchObject({
      status: "SKIPPED",
      lastError: SKIP_TOO_OLD,
    });
  });

  it("adds test_event_code when configured", async () => {
    reenv({ ...enabled(), META_CAPI_TEST_EVENT_CODE: "TEST12345" });
    const { capi, graph } = setup([{}]);
    await capi.run();
    expect(graph.calls[0].body.test_event_code).toBe("TEST12345");
  });

  it("batches up to 1000 events per request", async () => {
    const { capi, graph, t } = setup(Array.from({ length: 1001 }, () => ({})));
    const r = await capi.run();
    expect(r.sent).toBe(1001);
    expect(graph.calls.map((c) => c.body.data.length)).toEqual([1000, 1]);
    expect(t.metaEventOutbox.every((x: any) => x.status === "SENT")).toBe(true);
  });

  it("retries transient failures with backoff, then FAILED after max attempts; never logs the token", async () => {
    const logs: string[] = [];
    for (const level of ["log", "warn", "error", "debug"] as const) {
      jest
        .spyOn(Logger.prototype, level)
        .mockImplementation(
          (...args: any[]) => void logs.push(String(args[0])),
        );
    }
    const { capi, graph, t } = setup([{}]);
    graph.on("POST", /events$/, () => ({
      status: 500,
      json: { error: { message: `Service down ${ACCESS_TOKEN}`, code: 2 } },
    }));
    const r = await capi.run();
    expect(r.retrying).toBe(1);
    const row = t.metaEventOutbox[0];
    expect(row).toMatchObject({ status: "QUEUED", attempts: 1 });
    expect(row.nextTryAt.getTime()).toBeGreaterThan(Date.now());
    expect(row.lastError).not.toContain(ACCESS_TOKEN);
    // not due yet -> no new call
    await capi.run();
    expect(graph.calls).toHaveLength(1);
    // last allowed attempt
    row.attempts = CAPI_MAX_ATTEMPTS - 1;
    row.nextTryAt = null;
    await capi.run();
    expect(row.status).toBe("FAILED");
    for (const l of logs) expect(l).not.toContain(ACCESS_TOKEN);
  });

  it("isolates a malformed event: invalid_param batch is retried one by one", async () => {
    const { capi, graph, t } = setup([
      {},
      { id: "bad", eventName: "Purchase", value: new Prisma.Decimal(1) },
    ]);
    graph.on("POST", /events$/, (c: any) =>
      c.body.data.some((e: any) => e.event_name === "Purchase")
        ? {
            status: 400,
            json: { error: { message: "Invalid parameter", code: 100 } },
          }
        : { json: { events_received: c.body.data.length } },
    );
    const r = await capi.run();
    expect(graph.calls.map((c) => c.body.data.length)).toEqual([2, 1, 1]);
    expect(r).toMatchObject({ sent: 1, failed: 1 });
    expect(t.metaEventOutbox.find((x: any) => x.id === "bad")?.status).toBe(
      "FAILED",
    );
  });
});
