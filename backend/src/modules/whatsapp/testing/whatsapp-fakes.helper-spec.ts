/**
 * Test doubles for the WhatsApp specs (not a test file itself: jest only
 * picks up "*.spec.ts", and the build excludes "*spec.ts").
 *
 *  - FakePrisma: generic in-memory store with enough where/select/include/
 *    unique-constraint support for the WhatsApp + CRM code paths.
 *  - FakeGraph: route table standing in for graph.facebook.com, injected as
 *    the client's fetch; records every request (url, method, headers, body).
 */
import { createHmac } from "crypto";
import { Prisma } from "@prisma/client";

type Row = Record<string, any>;
let seq = 0;
const newId = (p: string) => `${p}${++seq}`;

/** model -> relation -> [targetModel, localKey|foreignKey, kind] */
const RELATIONS: Record<
  string,
  Record<string, [string, string, "one" | "back-one" | "many"]>
> = {
  whatsAppConversation: {
    contact: ["whatsAppContact", "contactId", "one"],
    assignedTo: ["user", "assignedToId", "one"],
    messages: ["whatsAppMessage", "conversationId", "many"],
  },
  whatsAppContact: {
    lead: ["lead", "leadId", "one"],
    conversation: ["whatsAppConversation", "contactId", "back-one"],
  },
  whatsAppMessage: {
    sentBy: ["user", "sentById", "one"],
    conversation: ["whatsAppConversation", "conversationId", "one"],
  },
  metaEventOutbox: {
    lead: ["lead", "leadId", "one"],
    adClick: ["adClick", "adClickId", "one"],
  },
  adClick: { lead: ["lead", "leadId", "one"] },
  lead: {
    stage: ["leadStage", "stageId", "one"],
    campaign: ["campaign", "campaignId", "one"],
    assignedTo: ["user", "assignedToId", "one"],
    client: ["client", "clientId", "one"],
    project: ["project", "projectId", "one"],
    quotation: ["quotation", "quotationId", "one"],
    activities: ["leadActivity", "leadId", "many"],
    metaEvents: ["metaEventOutbox", "leadId", "many"],
    adClick: ["adClick", "leadId", "back-one"],
  },
  leadActivity: {
    actor: ["user", "actorId", "one"],
    fromStage: ["leadStage", "fromStageId", "one"],
    toStage: ["leadStage", "toStageId", "one"],
  },
};

const UNIQUE: Record<string, string[]> = {
  whatsAppMessage: ["waMessageId"],
  whatsAppContact: ["waId"],
  whatsAppConversation: ["contactId"],
  whatsAppWebhookEvent: ["payloadHash"],
  metaEventOutbox: ["dedupeKey"],
  adClick: ["ref", "eventId", "leadId", "visitKey"],
  campaign: ["code"],
};

const DEFAULTS: Record<string, () => Row> = {
  whatsAppConversation: () => ({
    unreadCount: 0,
    status: "OPEN",
    lastMessageAt: null,
    lastInboundAt: null,
    freeEntryUntil: null,
    assignedToId: null,
    lastReadReceiptFor: null,
    lastMessagePreview: null,
  }),
  whatsAppContact: () => ({
    leadId: null,
    profileName: null,
    phoneBookName: null,
    phone: null,
  }),
  whatsAppMessage: () => ({
    status: "RECEIVED",
    referral: null,
    sentById: null,
    mediaId: null,
    errorCode: null,
    errorTitle: null,
  }),
  whatsAppWebhookEvent: () => ({
    attempts: 0,
    processedAt: null,
    failedAt: null,
    lockedUntil: null,
    lastError: null,
    receivedAt: new Date(),
  }),
  whatsAppConnection: () => ({ status: "DISCONNECTED", accessTokenEnc: null }),
  metaEventOutbox: () => ({
    route: "BUSINESS_MESSAGING",
    adClickId: null,
    attempts: 0,
    status: "PENDING_CONFIG",
    nextTryAt: null,
    response: null,
    lastError: null,
    sentAt: null,
    value: null,
  }),
  lead: () => ({
    firstResponseAt: null,
    referral: null,
    ctwaClid: null,
    adId: null,
    waId: null,
    assignedToId: null,
    clientId: null,
    projectId: null,
    quotationId: null,
    campaignId: null,
  }),
  campaign: () => ({ metaAdIds: [] }),
  adClick: () => ({
    visitId: null,
    visitKey: null,
    leadForwardedAt: null,
    clientIp: null,
    userAgent: null,
    fbclid: null,
    fbc: null,
    fbp: null,
    ref: null,
    eventId: null,
    instagramHandle: null,
    brandName: null,
    category: null,
    pageViewAt: null,
    viewContentAt: null,
    engagedAt: null,
    leadId: null,
    linkedAt: null,
    campaignCode: null,
    pageUrl: null,
    meta: null,
  }),
};

const isDbNull = (v: any) =>
  v === Prisma.DbNull || v === Prisma.JsonNull || v === Prisma.AnyNull;
const cmp = (x: any) =>
  x instanceof Date ? x.getTime() : x instanceof Prisma.Decimal ? Number(x) : x;

export class FakePrisma {
  tables: Record<string, Row[]> = {};
  [model: string]: any;

  constructor(seed: Record<string, Row[]> = {}) {
    for (const [k, rows] of Object.entries(seed))
      this.tables[k] = rows.map((r) => ({ ...r }));
    const models = new Set([
      ...Object.keys(RELATIONS),
      ...Object.keys(UNIQUE),
      ...Object.keys(DEFAULTS),
      "user",
      "leadStage",
      "crmSettings",
      "client",
      "project",
      "quotation",
      ...Object.keys(seed),
    ]);
    for (const m of models) {
      this.tables[m] = this.tables[m] ?? [];
      (this as any)[m] = this.delegate(m);
    }
  }

  table(m: string): Row[] {
    return (this.tables[m] = this.tables[m] ?? []);
  }

  $transaction = async (arg: any) =>
    typeof arg === "function" ? arg(this) : Promise.all(arg);

  // ---------------------------------------------------------------------

  private matchValue(model: string, row: Row, key: string, cond: any): boolean {
    const rel = RELATIONS[model]?.[key];
    if (rel) {
      const [target, k, kind] = rel;
      if (kind === "one") {
        const r = this.table(target).find((x) => x.id === row[k]);
        if (cond === null) return !r;
        return !!r && this.matches(target, r, cond);
      }
      return true;
    }
    const v = row[key];
    if (cond === undefined) return true;
    if (cond === null) return v === null || v === undefined;
    if (isDbNull(cond)) return v === null || v === undefined;
    if (cond instanceof Date)
      return v instanceof Date && v.getTime() === cond.getTime();
    if (typeof cond === "object" && !Array.isArray(cond)) {
      let ok = true;
      if ("equals" in cond)
        ok =
          ok &&
          (isDbNull(cond.equals)
            ? v == null
            : cond.mode === "insensitive" &&
                typeof v === "string" &&
                typeof cond.equals === "string"
              ? v.toLowerCase() === cond.equals.toLowerCase()
              : v === cond.equals);
      if ("in" in cond) ok = ok && cond.in.includes(v);
      if ("not" in cond) {
        ok =
          ok &&
          (cond.not === null || isDbNull(cond.not)
            ? v !== null && v !== undefined
            : v !== cond.not);
      }
      if ("contains" in cond) {
        const a = String(v ?? ""),
          b = String(cond.contains);
        ok =
          ok &&
          v != null &&
          (cond.mode === "insensitive"
            ? a.toLowerCase().includes(b.toLowerCase())
            : a.includes(b));
      }
      if ("startsWith" in cond)
        ok = ok && typeof v === "string" && v.startsWith(cond.startsWith);
      if ("has" in cond) ok = ok && Array.isArray(v) && v.includes(cond.has);
      if ("gt" in cond) ok = ok && v != null && cmp(v) > cmp(cond.gt);
      if ("gte" in cond) ok = ok && v != null && cmp(v) >= cmp(cond.gte);
      if ("lt" in cond) ok = ok && v != null && cmp(v) < cmp(cond.lt);
      if ("lte" in cond) ok = ok && v != null && cmp(v) <= cmp(cond.lte);
      return ok;
    }
    return v === cond;
  }

  matches(model: string, row: Row, where: any = {}): boolean {
    for (const [k, cond] of Object.entries(where ?? {})) {
      if (k === "AND") {
        if (!(cond as any[]).every((c) => this.matches(model, row, c)))
          return false;
      } else if (k === "OR") {
        if (!(cond as any[]).some((c) => this.matches(model, row, c)))
          return false;
      } else if (k === "NOT") {
        const list = Array.isArray(cond) ? cond : [cond];
        if (list.some((c) => this.matches(model, row, c))) return false;
      } else if (!this.matchValue(model, row, k, cond)) {
        return false;
      }
    }
    return true;
  }

  private _pick(
    model: string,
    row: Row | undefined | null,
    args: any = {},
  ): Row | null {
    if (!row) return null;
    const out: Row = {};
    const sel = args.select;
    const inc = args.include;
    if (sel) {
      for (const [k, v] of Object.entries(sel)) {
        if (!v) continue;
        if (RELATIONS[model]?.[k])
          out[k] = this.relation(model, row, k, v === true ? {} : v);
        else out[k] = row[k];
      }
      return out;
    }
    Object.assign(out, row);
    for (const [k, v] of Object.entries(inc ?? {})) {
      if (!v) continue;
      out[k] = this.relation(model, row, k, v === true ? {} : v);
    }
    return out;
  }

  private relation(model: string, row: Row, key: string, args: any) {
    const rel = RELATIONS[model]?.[key];
    if (!rel) return null;
    const [target, k, kind] = rel;
    if (kind === "one")
      return this._pick(
        target,
        this.table(target).find((x) => x.id === row[k]),
        args,
      );
    if (kind === "back-one")
      return this._pick(
        target,
        this.table(target).find((x) => x[k] === row.id),
        args,
      );
    let rows = this.table(target).filter(
      (x) => x[k] === row.id && this.matches(target, x, args.where),
    );
    rows = this.sort(rows, args.orderBy);
    return rows.map((r) => this._pick(target, r, args));
  }

  private sort(rows: Row[], orderBy: any): Row[] {
    const list = !orderBy ? [] : Array.isArray(orderBy) ? orderBy : [orderBy];
    if (!list.length) return rows;
    return [...rows].sort((a, b) => {
      for (const o of list) {
        const [k, dir] = Object.entries(o)[0] as [string, string];
        const x = cmp(a[k]),
          y = cmp(b[k]);
        if (x === y) continue;
        if (x == null) return 1;
        if (y == null) return -1;
        return (x < y ? -1 : 1) * (dir === "desc" ? -1 : 1);
      }
      return 0;
    });
  }

  private applyData(row: Row, data: Row) {
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) continue;
      if (
        v &&
        typeof v === "object" &&
        !(v instanceof Date) &&
        !(v instanceof Prisma.Decimal) &&
        !Array.isArray(v)
      ) {
        if ("increment" in v) {
          row[k] = (row[k] ?? 0) + v.increment;
          continue;
        }
        if ("decrement" in v) {
          row[k] = (row[k] ?? 0) - v.decrement;
          continue;
        }
        if ("set" in v) {
          row[k] = v.set;
          continue;
        }
        if ("connect" in v) continue;
      }
      row[k] = isDbNull(v) ? null : v;
    }
    row.updatedAt = new Date();
  }

  private checkUnique(model: string, row: Row, selfId?: string) {
    for (const f of UNIQUE[model] ?? []) {
      if (row[f] === null || row[f] === undefined) continue;
      if (this.table(model).some((x) => x.id !== selfId && x[f] === row[f])) {
        const e: any = new Error(`Unique constraint failed on ${model}.${f}`);
        e.code = "P2002";
        throw e;
      }
    }
  }

  private findUniqueRow(model: string, where: Row): Row | undefined {
    return this.table(model).find((r) => this.matches(model, r, where));
  }

  private delegate(model: string) {
    const self = this;
    const create = (data: Row) => {
      const row: Row = {
        id: data.id ?? newId(model.slice(0, 3)),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...(DEFAULTS[model]?.() ?? {}),
      };
      self.applyData(row, data);
      self.checkUnique(model, row);
      self.table(model).push(row);
      return row;
    };
    return {
      findUnique: async (args: any) =>
        self._pick(model, self.findUniqueRow(model, args.where), args),
      findUniqueOrThrow: async (args: any) => {
        const r = self.findUniqueRow(model, args.where);
        if (!r) throw new Error("not found");
        return self._pick(model, r, args);
      },
      findFirst: async (args: any = {}) => {
        const rows = self.sort(
          self.table(model).filter((r) => self.matches(model, r, args.where)),
          args.orderBy,
        );
        return self._pick(model, rows[0], args);
      },
      findMany: async (args: any = {}) => {
        let rows = self.sort(
          self.table(model).filter((r) => self.matches(model, r, args.where)),
          args.orderBy,
        );
        if (args.skip) rows = rows.slice(args.skip);
        if (args.take !== undefined) rows = rows.slice(0, args.take);
        return rows.map((r) => self._pick(model, r, args));
      },
      count: async (args: any = {}) =>
        self.table(model).filter((r) => self.matches(model, r, args.where))
          .length,
      create: async (args: any) => self._pick(model, create(args.data), args),
      createMany: async (args: any) => {
        let count = 0;
        for (const d of args.data) {
          try {
            create(d);
            count += 1;
          } catch (e: any) {
            if (!(args.skipDuplicates && e.code === "P2002")) throw e;
          }
        }
        return { count };
      },
      update: async (args: any) => {
        const r = self.findUniqueRow(model, args.where);
        if (!r) {
          const e: any = new Error(`Record to update not found (${model})`);
          e.code = "P2025";
          throw e;
        }
        const copy = { ...r };
        self.applyData(copy, args.data);
        self.checkUnique(model, copy, r.id);
        Object.assign(r, copy);
        return self._pick(model, r, args);
      },
      updateMany: async (args: any) => {
        const rows = self
          .table(model)
          .filter((r) => self.matches(model, r, args.where));
        rows.forEach((r) => self.applyData(r, args.data));
        return { count: rows.length };
      },
      upsert: async (args: any) => {
        const r = self.findUniqueRow(model, args.where);
        if (r) {
          self.applyData(r, args.update);
          return self._pick(model, r, args);
        }
        return self._pick(
          model,
          create({ ...args.where, ...args.create }),
          args,
        );
      },
      delete: async (args: any) => {
        const t = self.table(model);
        const i = t.findIndex((r) => self.matches(model, r, args.where));
        const [r] = t.splice(i, 1);
        return r;
      },
      deleteMany: async (args: any = {}) => {
        const t = self.table(model);
        const keep = t.filter((r) => !self.matches(model, r, args.where));
        const count = t.length - keep.length;
        self.tables[model] = keep;
        return { count };
      },
      aggregate: async (args: any) => {
        const rows = self
          .table(model)
          .filter((r) => self.matches(model, r, args.where));
        const out: Row = {};
        if (args._count) out._count = { _all: rows.length };
        if (args._sum) {
          out._sum = {};
          for (const k of Object.keys(args._sum))
            out._sum[k] = rows.length
              ? rows.reduce((a, r) => a + Number(r[k] ?? 0), 0)
              : null;
        }
        return out;
      },
      groupBy: async (args: any) => {
        const rows = self
          .table(model)
          .filter((r) => self.matches(model, r, args.where));
        const groups = new Map<string, Row[]>();
        for (const r of rows) {
          const key = JSON.stringify(args.by.map((b: string) => r[b]));
          groups.set(key, [...(groups.get(key) ?? []), r]);
        }
        return [...groups.entries()].map(([key, rs]) => {
          const vals = JSON.parse(key);
          const g: Row = {};
          args.by.forEach((b: string, i: number) => (g[b] = vals[i]));
          if (args._count) g._count = { _all: rs.length };
          return g;
        });
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Fake Graph API
// ---------------------------------------------------------------------------

export interface RecordedCall {
  url: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body: any;
}

type Handler = (call: RecordedCall) => {
  status?: number;
  json?: any;
  body?: Buffer;
  headers?: Record<string, string>;
};

export class FakeGraph {
  calls: RecordedCall[] = [];
  routes: Array<{ method: string; re: RegExp; handler: Handler }> = [];

  on(method: string, re: RegExp, handler: Handler | any) {
    this.routes.unshift({
      method,
      re,
      handler:
        typeof handler === "function" ? handler : () => ({ json: handler }),
    });
    return this;
  }

  fetch = async (url: string, init: RequestInit = {}): Promise<Response> => {
    const u = new URL(url);
    const headers = Object.fromEntries(
      Object.entries((init.headers ?? {}) as Record<string, string>),
    );
    const call: RecordedCall = {
      url,
      method: (init.method ?? "GET").toUpperCase(),
      path: u.pathname,
      headers,
      body: typeof init.body === "string" ? JSON.parse(init.body) : null,
    };
    this.calls.push(call);
    const route = this.routes.find(
      (r) => r.method === call.method && r.re.test(u.pathname),
    );
    if (!route)
      return new Response(
        JSON.stringify({ error: { message: "no route", code: 100 } }),
        { status: 400 },
      );
    const r = route.handler(call);
    if (r.body)
      return new Response(new Uint8Array(r.body), {
        status: r.status ?? 200,
        headers: r.headers,
      });
    return new Response(JSON.stringify(r.json ?? {}), {
      status: r.status ?? 200,
      headers: { "content-type": "application/json", ...(r.headers ?? {}) },
    });
  };
}

export const APP_SECRET = "8f3a1c9e7b2d4f60a5e1c3b7d9f2a4e6";
export const VERIFY_TOKEN = "vT9kQ2mX7pL4zR8wN3bF6hJ1";
export const WABA_ID = "102030405060";
export const PHONE_ID = "998877665544";
export const DATASET_ID = "556677889900";
export const ACCESS_TOKEN = "EAAGtestSystemUserToken1234567890abcdefXYZ";

export function sign(body: string | Buffer, secret = APP_SECRET): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

/** Env for a fully configured instance (tests set/restore process.env). */
export function waEnv(
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    WHATSAPP_ACCESS_TOKEN: ACCESS_TOKEN,
    WHATSAPP_WABA_ID: WABA_ID,
    WHATSAPP_PHONE_NUMBER_ID: PHONE_ID,
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: VERIFY_TOKEN,
    META_APP_SECRET: APP_SECRET,
    META_APP_ID: "1234567890",
    ...extra,
  };
}

export function withEnv(vars: Record<string, string | undefined>): () => void {
  const saved: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return () => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  };
}

export const WA_ENV_KEYS = [
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_WABA_ID",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
  "META_APP_SECRET",
  "META_APP_ID",
  "WHATSAPP_APP_SECRET",
  "WHATSAPP_APP_ID",
  "META_DATASET_ID",
  "META_CAPI_ENABLED",
  "META_CAPI_TEST_EVENT_CODE",
  "WHATSAPP_COEXISTENCE_ENABLED",
  "WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID",
  "WHATSAPP_HISTORY_LEAD_MAX_AGE_DAYS",
  "WHATSAPP_GRAPH_BASE_URL",
  "NODE_ENV",
];

/** Unix seconds for "minutes ago". */
export const unixAgo = (minutes: number) =>
  String(Math.floor((Date.now() - minutes * 60000) / 1000));

export function messagesPayload(
  value: Record<string, unknown>,
  field = "messages",
) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: WABA_ID,
        changes: [
          {
            field,
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "6281100000000",
                phone_number_id: PHONE_ID,
              },
              ...value,
            },
          },
        ],
      },
    ],
  };
}
