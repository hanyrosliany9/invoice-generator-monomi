import { BadRequestException, ConflictException } from "@nestjs/common";
import { CrmLeadsService } from "./crm-leads.service";
import { CrmOutboxService } from "./crm-outbox.service";

const stageNew = { id: "st-new", key: "NEW", name: "New", order: 1, type: "OPEN", metaEvent: null, isActive: true };
const stageProposal = { id: "st-prop", key: "PROPOSAL", name: "Proposal", order: 4, type: "OPEN", metaEvent: null, isActive: true };

function makeService(overrides: { leads?: any[]; clients?: any[] } = {}) {
  const leads: any[] = overrides.leads ?? [];
  const clientsDb: any[] = overrides.clients ?? [];
  const outbox: any[] = [];
  const activities: any[] = [];
  let seq = 0;

  const db: any = {
    lead: {
      findFirst: jest.fn(async ({ where }: any) => leads.find((l) => l.phone === where.phone) ?? null),
      findUnique: jest.fn(async ({ where }: any) => {
        const l = leads.find((x) => x.id === where.id);
        if (!l) return null;
        return {
          ...l,
          stage: [stageNew, stageProposal].find((s) => s.id === l.stageId),
          campaign: l.campaign ?? null,
          activities: [],
          metaEvents: outbox,
          firstContactAt: l.firstContactAt ?? new Date(),
        };
      }),
      create: jest.fn(async ({ data }: any) => {
        const l = { id: `L${++seq}`, ...data, firstResponseAt: null };
        leads.push(l);
        return l;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const l = leads.find((x) => x.id === where.id);
        Object.assign(l, data);
        return l;
      }),
    },
    leadStage: {
      findFirst: jest.fn(async ({ where }: any) =>
        where.key === "PROPOSAL" ? stageProposal : stageNew),
      findUnique: jest.fn(async ({ where }: any) => [stageNew, stageProposal].find((s) => s.id === where.id) ?? null),
    },
    campaign: { findUnique: jest.fn(), findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    leadActivity: { create: jest.fn(async ({ data }: any) => { activities.push(data); return data; }) },
    metaEventOutbox: {
      createMany: jest.fn(async ({ data }: any) => {
        const fresh = data.filter((d: any) => !outbox.some((o) => o.dedupeKey === d.dedupeKey));
        outbox.push(...fresh);
        return { count: fresh.length };
      }),
      updateMany: jest.fn(async () => ({ count: 0 })),
    },
    client: {
      findMany: jest.fn(async () => clientsDb),
      findFirst: jest.fn(async () => null),
      findUnique: jest.fn(async ({ where }: any) => clientsDb.find((c) => c.id === where.id) ?? null),
    },
    projectTypeConfig: { findFirst: jest.fn(async () => ({ id: "pt1" })) },
    $transaction: jest.fn(async (arg: any) => (typeof arg === "function" ? arg(db) : Promise.all(arg))),
  };

  const flow: any = { changeStage: jest.fn(async () => ({})), firstActiveStageOfType: jest.fn() };
  const settings: any = { getThresholdMinutes: jest.fn(async () => 15) };
  const clients: any = { create: jest.fn(async (d: any) => ({ id: "c-new", ...d })) };
  const projects: any = { create: jest.fn(async () => ({ id: "p1" })) };
  const quotations: any = { create: jest.fn(async () => ({ id: "q1" })) };
  const svc = new CrmLeadsService(db, flow, new CrmOutboxService(), settings, clients, projects, quotations);
  return { svc, db, leads, outbox, activities, flow, clients, projects, quotations };
}

describe("CrmLeadsService.create", () => {
  it("normalises the phone, sets waId, and queues LeadSubmitted for a WhatsApp ad lead", async () => {
    const { svc, leads, outbox, activities } = makeService();
    await svc.create({ name: "Rina", phone: "0812-9999-1204" }, "u1");
    expect(leads[0]).toMatchObject({ phone: "+6281299991204", waId: "6281299991204", source: "WHATSAPP_ORGANIC", assignedToId: "u1" });
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({ eventName: "LeadSubmitted", status: "PENDING_CONFIG", dedupeKey: `${leads[0].id}:LeadSubmitted` });
    expect(activities[0]).toMatchObject({ type: "STAGE_CHANGE", fromStageId: null, toStageId: "st-new", metaEvent: "LeadSubmitted" });
  });

  it("does not queue a Meta event for referral leads", async () => {
    const { svc, outbox } = makeService();
    await svc.create({ name: "Kopi Senja", source: "REFERRAL" as any }, "u1");
    expect(outbox).toHaveLength(0);
  });

  it("refuses duplicate phones with a 409 carrying the existing lead, unless allowDuplicate", async () => {
    const { svc, leads } = makeService({
      leads: [{ id: "L0", name: "Budi", phone: "+6285712349921", stageId: "st-new", createdAt: new Date() }],
    });
    await expect(svc.create({ name: "Budi 2", phone: "085712349921" }, "u1")).rejects.toMatchObject({
      response: { code: "DUPLICATE_LEAD", existing: { id: "L0" } },
    });
    await expect(svc.create({ name: "Budi 2", phone: "085712349921" }, "u1")).rejects.toBeInstanceOf(ConflictException);
    await svc.create({ name: "Budi 2", phone: "085712349921", allowDuplicate: true }, "u1");
    expect(leads).toHaveLength(2);
  });

  it("rejects invalid numbers and empty submissions", async () => {
    const { svc } = makeService();
    await expect(svc.create({ name: "x", phone: "12" }, "u1")).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.create({}, "u1")).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("CrmLeadsService.convert", () => {
  const baseLead = () => ({
    id: "L9", name: "Dewi Lestari", company: "Toko Kue Manis", phone: "+6281300005530", email: null,
    stageId: "st-new", stage: stageNew, estimatedValue: 12_000_000, clientId: null, projectId: null, quotationId: null,
    campaign: { id: "c1", name: "October Video Promo", code: "FB-OKT1" },
  });

  it("creates a client, project and draft quotation, links them, and moves the lead to Proposal", async () => {
    const { svc, leads, clients, projects, quotations, flow, activities } = makeService({ leads: [baseLead()] });
    const res = await svc.convert("L9", {}, "u1");
    expect(clients.create).toHaveBeenCalledWith(expect.objectContaining({ name: "Toko Kue Manis", contactPerson: "Dewi Lestari", phone: "+6281300005530" }));
    expect(projects.create).toHaveBeenCalledWith(expect.objectContaining({ clientId: "c-new", projectTypeId: "pt1", estimatedBudget: 12_000_000 }));
    expect(quotations.create).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: "c-new", projectId: "p1", totalAmount: 12_000_000, amountPerProject: 12_000_000 }),
      "u1",
    );
    expect(res).toEqual({ leadId: "L9", clientId: "c-new", projectId: "p1", quotationId: "q1", clientCreated: true });
    expect(leads[0]).toMatchObject({ clientId: "c-new", projectId: "p1", quotationId: "q1" });
    // Stable key + parts (the UI translates), not Indonesian display text.
    expect(activities.find((a) => a.type === "CONVERTED")?.body).toBe("@lead.converted: clientNew,project,quotation");
    expect(flow.changeStage).toHaveBeenCalledWith("L9", "st-prop", "u1", { note: "@lead.quotationCreated" });
  });

  it("reuses an existing client with the same phone instead of creating one", async () => {
    const { svc, clients } = makeService({
      leads: [baseLead()],
      clients: [{ id: "c-old", name: "Kue Manis", phone: "0813-0000-5530" }],
    });
    const res = await svc.convert("L9", {}, "u1");
    expect(clients.create).not.toHaveBeenCalled();
    expect(res.clientId).toBe("c-old");
    expect(res.clientCreated).toBe(false);
  });

  it("client only: no project / quotation when createQuotation is false", async () => {
    const { svc, projects, quotations } = makeService({ leads: [baseLead()] });
    const res = await svc.convert("L9", { createQuotation: false }, "u1");
    expect(projects.create).not.toHaveBeenCalled();
    expect(quotations.create).not.toHaveBeenCalled();
    expect(res.quotationId).toBeNull();
  });

  it("needs an amount for the quotation and refuses a second one", async () => {
    const lead = { ...baseLead(), estimatedValue: 0 };
    const { svc } = makeService({ leads: [lead] });
    await expect(svc.convert("L9", {}, "u1")).rejects.toBeInstanceOf(BadRequestException);

    const { svc: svc2 } = makeService({ leads: [{ ...baseLead(), quotationId: "q-existing" }] });
    await expect(svc2.convert("L9", {}, "u1")).rejects.toBeInstanceOf(ConflictException);
  });

  it("refuses the internal client", async () => {
    const { svc } = makeService({ leads: [baseLead()], clients: [{ id: "c-int", isInternal: true }] });
    await expect(svc.convert("L9", { clientId: "c-int" }, "u1")).rejects.toBeInstanceOf(BadRequestException);
  });
});
