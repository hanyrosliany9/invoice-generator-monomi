import { CrmFlowService } from "./crm-flow.service";
import { CrmOutboxService } from "./crm-outbox.service";

/** Small in-memory prisma double for the models the flow touches. */
function makeDb() {
  const stages = [
    { id: "st-new", key: "NEW", name: "New", order: 1, type: "OPEN", metaEvent: null, isActive: true },
    { id: "st-q", key: "QUALIFIED", name: "Qualified", order: 2, type: "OPEN", metaEvent: "QualifiedLead", isActive: true },
    { id: "st-meet", key: "MEETING", name: "Meeting", order: 3, type: "OPEN", metaEvent: null, isActive: true },
    { id: "st-prop", key: "PROPOSAL", name: "Proposal", order: 4, type: "OPEN", metaEvent: null, isActive: true },
    { id: "st-won", key: "WON", name: "Won", order: 5, type: "WON", metaEvent: "Purchase", isActive: true },
    { id: "st-lost", key: "LOST", name: "Lost", order: 6, type: "LOST", metaEvent: null, isActive: true },
  ];
  const leads: any[] = [
    {
      id: "L1", name: "Dewi", phone: "+628130000001", waId: "628130000001", ctwaClid: "click-1", adId: null,
      campaignCode: "FB-OKT1", stageId: "st-new", estimatedValue: 5_000_000, quotationId: "Q1",
      firstResponseAt: null, lostReason: null,
    },
  ];
  const outbox: any[] = [];
  const activities: any[] = [];
  const quotations: any[] = [{ id: "Q1", totalAmount: 12_000_000 }];
  const invoices: any[] = [{ id: "I1", quotationId: "Q1" }, { id: "I2", quotationId: null }];

  const db: any = {
    stages, leads, outbox, activities,
    leadStage: {
      findUnique: async ({ where }: any) => stages.find((s) => s.id === where.id) ?? null,
      findFirst: async ({ where }: any) =>
        [...stages]
          .sort((a, b) => a.order - b.order)
          .find(
            (s) =>
              s.isActive &&
              (where.type === undefined || s.type === where.type) &&
              (where.metaEvent === undefined || s.metaEvent === where.metaEvent),
          ) ?? null,
    },
    lead: {
      findUnique: async ({ where }: any) => { const l = leads.find((x) => x.id === where.id); return l ? { ...l } : null; },
      findMany: async ({ where, include }: any) =>
        leads
          .filter((l) => l.quotationId === where.quotationId)
          .map((l) => ({ ...l, ...(include?.stage ? { stage: stages.find((s) => s.id === l.stageId) } : {}) })),
      update: async ({ where, data }: any) => {
        const l = leads.find((x) => x.id === where.id);
        Object.assign(l, data);
        return { ...l };
      },
    },
    leadActivity: { create: async ({ data }: any) => { activities.push(data); return data; } },
    quotation: { findUnique: async ({ where }: any) => quotations.find((q) => q.id === where.id) ?? null },
    invoice: { findUnique: async ({ where }: any) => invoices.find((i) => i.id === where.id) ?? null },
    metaEventOutbox: {
      createMany: async ({ data }: any) => {
        let count = 0;
        for (const row of data) {
          if (!outbox.some((o) => o.dedupeKey === row.dedupeKey)) { outbox.push({ ...row }); count += 1; }
        }
        return { count };
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const o of outbox) {
          if (o.dedupeKey === where.dedupeKey && o.status === where.status) { Object.assign(o, data); count += 1; }
        }
        return { count };
      },
    },
    adClick: {
      findFirst: async ({ where }: any) =>
        db.adClicks.find((c: any) => c.leadId === where.leadId && where.linkedVia.in.includes(c.linkedVia)) ?? null,
    },
    adClicks: [] as any[],
    $transaction: async (fn: any) => fn(db),
  };
  return db;
}

describe("CrmFlowService", () => {
  let db: ReturnType<typeof makeDb>;
  let flow: CrmFlowService;

  beforeEach(() => {
    db = makeDb();
    flow = new CrmFlowService(db, new CrmOutboxService());
  });

  describe("stage history", () => {
    it("appends a STAGE_CHANGE activity (from/to/actor) and never rewrites old ones", async () => {
      await flow.changeStage("L1", "st-q", "u1", { note: "needs 4 reels" });
      await flow.changeStage("L1", "st-new", "u1");
      expect(db.activities).toHaveLength(2);
      expect(db.activities[0]).toMatchObject({
        leadId: "L1", type: "STAGE_CHANGE", fromStageId: "st-new", toStageId: "st-q", actorId: "u1", body: "needs 4 reels",
      });
      expect(db.activities[1]).toMatchObject({ fromStageId: "st-q", toStageId: "st-new" });
      expect(db.leads[0].stageId).toBe("st-new");
    });

    it("is a no-op when the stage does not change", async () => {
      await flow.changeStage("L1", "st-new", "u1");
      expect(db.activities).toHaveLength(0);
    });

    it("a human stage change counts as first response, the system hook does not", async () => {
      await flow.changeStage("L1", "st-q", null);
      expect(db.leads[0].firstResponseAt).toBeNull();
      await flow.changeStage("L1", "st-new", "u1");
      expect(db.leads[0].firstResponseAt).toBeInstanceOf(Date);
    });

    it("moving into LOST stores the reason and leaving LOST clears it", async () => {
      await flow.changeStage("L1", "st-lost", "u1", { lostReason: "too expensive" });
      expect(db.leads[0].lostReason).toBe("too expensive");
      await flow.changeStage("L1", "st-new", "u1");
      expect(db.leads[0].lostReason).toBeNull();
    });

    it("rejects an unknown stage", async () => {
      await expect(flow.changeStage("L1", "nope", "u1")).rejects.toThrow();
    });
  });

  describe("meta event outbox", () => {
    it("queues QualifiedLead once (PENDING_CONFIG) even if the lead re-enters the stage", async () => {
      await flow.changeStage("L1", "st-q", "u1");
      await flow.changeStage("L1", "st-new", "u1");
      await flow.changeStage("L1", "st-q", "u1");
      const rows = db.outbox.filter((o: any) => o.eventName === "QualifiedLead");
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ status: "PENDING_CONFIG", leadId: "L1", currency: "IDR" });
      expect(rows[0].payload).toMatchObject({
        event_name: "QualifiedLead", action_source: "business_messaging",
        user_data: { ctwa_clid: "click-1", wa_id: "628130000001" },
      });
      // the activity records which event the stage change caused (first time only)
      expect(db.activities[0].metaEvent).toBe("QualifiedLead");
      expect(db.activities[2].metaEvent).toBeNull();
    });

    it("does not queue anything for a stage without a mapping", async () => {
      await flow.changeStage("L1", "st-lost", "u1");
      expect(db.outbox).toHaveLength(0);
    });
  });

  describe("implied QualifiedLead", () => {
    const qualified = (db: any) => db.outbox.filter((o: any) => o.eventName === "QualifiedLead");

    it("New -> Proposal (convert) queues QualifiedLead once", async () => {
      await flow.changeStage("L1", "st-prop", "u1", { note: "@lead.quotationCreated" });
      expect(qualified(db)).toHaveLength(1);
      expect(db.activities[0].metaEvent).toBe("QualifiedLead");
      await flow.changeStage("L1", "st-meet", "u1");
      await flow.changeStage("L1", "st-prop", "u1");
      expect(qualified(db)).toHaveLength(1);
    });

    it("New -> Won queues QualifiedLead then Purchase", async () => {
      await flow.changeStage("L1", "st-won", "u1");
      expect(db.outbox.map((o: any) => o.eventName)).toEqual(["QualifiedLead", "Purchase"]);
      expect(db.outbox[0].eventTime.getTime()).toBeLessThanOrEqual(db.outbox[1].eventTime.getTime());
      expect(db.activities[0].metaEvent).toBe("Purchase");
    });

    it("Qualified -> Proposal does not duplicate", async () => {
      await flow.changeStage("L1", "st-q", "u1");
      await flow.changeStage("L1", "st-prop", "u1");
      expect(qualified(db)).toHaveLength(1);
      expect(db.activities[1].metaEvent).toBeNull();
    });

    it("a SKIP_SENT_BEFORE_MERGE marker counts as already queued", async () => {
      db.outbox.push({ dedupeKey: "L1:QualifiedLead", leadId: "L1", eventName: "QualifiedLead", status: "SKIPPED" });
      await flow.changeStage("L1", "st-prop", "u1");
      expect(qualified(db)).toHaveLength(1);
    });

    it("moves to Lost, or to stages before Qualified, send nothing", async () => {
      await flow.changeStage("L1", "st-lost", "u1");
      expect(db.outbox).toHaveLength(0);
      db.leads[0].stageId = "st-q";
      await flow.changeStage("L1", "st-new", "u1");
      expect(db.outbox).toHaveLength(0);
    });

    it("a pipeline with no (active) Qualified-event stage does nothing", async () => {
      db.stages.find((s: any) => s.id === "st-q").isActive = false;
      await flow.changeStage("L1", "st-prop", "u1");
      expect(qualified(db)).toHaveLength(0);
      db.stages.find((s: any) => s.id === "st-q").isActive = true;
      db.stages.find((s: any) => s.id === "st-q").metaEvent = null;
      await flow.changeStage("L1", "st-won", "u1");
      expect(qualified(db)).toHaveLength(0);
    });

    it("quotation approved / invoice paid on an open lead also queues QualifiedLead", async () => {
      await flow.onInvoicePaid("I1");
      expect(db.outbox.map((o: any) => o.eventName).sort()).toEqual(["Purchase", "QualifiedLead"]);
    });

    it("a website-route lead gets a website QualifiedLead row", async () => {
      db.leads[0].ctwaClid = null;
      db.adClicks.push({ id: "AC1", leadId: "L1", linkedVia: "KODE" });
      await flow.changeStage("L1", "st-prop", "u1");
      expect(qualified(db)[0]).toMatchObject({
        route: "WEBSITE", adClickId: "AC1", status: "PENDING_CONFIG", dedupeKey: "L1:QualifiedLead",
      });
      expect(qualified(db)[0].payload).toMatchObject({ event_name: "QualifiedLead", lead_id: "L1" });
    });
  });

  describe("Purchase hooks", () => {
    const purchase = () => db.outbox.find((o: any) => o.eventName === "Purchase");
    it("quotation approved: moves the lead to Won and queues ONE Purchase with the quotation total", async () => {
      await flow.onQuotationApproved("Q1");
      expect(db.leads[0].stageId).toBe("st-won");
      const purchases = db.outbox.filter((o: any) => o.eventName === "Purchase");
      expect(purchases).toHaveLength(1);
      expect(Number(purchases[0].value)).toBe(12_000_000);
      expect(db.activities.at(-1)).toMatchObject({ toStageId: "st-won", actorId: null });
    });

    it("is idempotent across quotation approved + invoice paid + repeated calls", async () => {
      await flow.onQuotationApproved("Q1");
      await flow.onQuotationApproved("Q1");
      await flow.onInvoicePaid("I1");
      await flow.onInvoicePaid("I1");
      expect(db.outbox.filter((o: any) => o.eventName === "Purchase")).toHaveLength(1);
      expect(db.activities.filter((a: any) => a.toStageId === "st-won")).toHaveLength(1);
    });

    it("invoice paid alone also records the Purchase", async () => {
      await flow.onInvoicePaid("I1");
      expect(db.outbox.filter((o: any) => o.eventName === "Purchase")).toHaveLength(1);
      expect(db.leads[0].stageId).toBe("st-won");
    });

    it("refreshes the value of an unsent Purchase created from a manual Won move", async () => {
      db.leads[0].quotationId = null;
      await flow.changeStage("L1", "st-won", "u1"); // value = lead estimate 5M
      expect(Number(purchase().value)).toBe(5_000_000);
      db.leads[0].quotationId = "Q1";
      await flow.onQuotationApproved("Q1");
      expect(db.outbox.filter((o: any) => o.eventName === "Purchase")).toHaveLength(1);
      expect(Number(purchase().value)).toBe(12_000_000);
    });

    it("does not touch a Purchase that was already sent", async () => {
      await flow.onQuotationApproved("Q1");
      purchase().status = "SENT";
      await flow.onInvoicePaid("I1");
      expect(Number(purchase().value)).toBe(12_000_000);
      expect(purchase().status).toBe("SENT");
    });

    it("ignores invoices without a quotation and never throws", async () => {
      await expect(flow.onInvoicePaid("I2")).resolves.toBeUndefined();
      await expect(flow.onInvoicePaid("missing")).resolves.toBeUndefined();
      expect(db.outbox).toHaveLength(0);
      const broken = new CrmFlowService({ lead: { findMany: () => { throw new Error("db down"); } } } as any, new CrmOutboxService());
      await expect(broken.onQuotationApproved("Q1")).resolves.toBeUndefined();
    });
  });
});
