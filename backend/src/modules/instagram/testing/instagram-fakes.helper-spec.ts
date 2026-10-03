/**
 * Test doubles for the Instagram specs (excluded from the build by the
 * "*spec.ts" pattern, not picked up by jest because it is not ".spec.ts").
 *
 *  - FakePrisma: tiny in-memory store for the models the module touches, with
 *    enough `where`/`select` support that "the token is never selected" and
 *    tenant scoping are actually exercised.
 *  - FakeGraph: a route table standing in for api.instagram.com /
 *    graph.instagram.com, injected as INSTAGRAM_FETCH.
 */
import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { loadInstagramConfig, InstagramConfig } from "../instagram.config";

type Row = Record<string, any>;

let seq = 0;
const id = (p: string) => `${p}_${++seq}`;

function matchValue(v: any, cond: any): boolean {
  if (cond === undefined) return true;
  if (cond === null) return v === null || v === undefined;
  if (cond instanceof Date) return v instanceof Date && v.getTime() === cond.getTime();
  if (typeof cond === "object" && !Array.isArray(cond)) {
    if ("in" in cond) return cond.in.includes(v);
    if ("not" in cond) return cond.not === null ? v !== null && v !== undefined : v !== cond.not;
    let ok = true;
    const cmp = (x: any) => (x instanceof Date ? x.getTime() : x);
    if ("gt" in cond) ok = ok && v !== null && v !== undefined && cmp(v) > cmp(cond.gt);
    if ("gte" in cond) ok = ok && v !== null && v !== undefined && cmp(v) >= cmp(cond.gte);
    if ("lt" in cond) ok = ok && v !== null && v !== undefined && cmp(v) < cmp(cond.lt);
    if ("lte" in cond) ok = ok && v !== null && v !== undefined && cmp(v) <= cmp(cond.lte);
    return ok;
  }
  return v === cond;
}

export function matches(row: Row, where: any = {}): boolean {
  for (const [k, cond] of Object.entries(where ?? {})) {
    if (k === "OR") {
      if (!(cond as any[]).some((w) => matches(row, w))) return false;
      continue;
    }
    if (k === "AND") {
      if (!(cond as any[]).every((w) => matches(row, w))) return false;
      continue;
    }
    if (cond && typeof cond === "object" && "path" in cond && "equals" in cond) {
      // Prisma JSON filter: { path: ["a", "b"], equals: v }
      const v = (cond.path as string[]).reduce((acc: any, key) => (acc && typeof acc === "object" ? acc[key] : undefined), row[k]);
      if (v !== cond.equals) return false;
      continue;
    }
    if (cond && typeof cond === "object" && !(cond instanceof Date) && !("in" in cond) && !("not" in cond)
      && !("gt" in cond) && !("gte" in cond) && !("lt" in cond) && !("lte" in cond)) {
      // compound unique key e.g. connectionId_date: { connectionId, date }
      if (!matches(row, cond)) return false;
      continue;
    }
    if (!matchValue(row[k], cond)) return false;
  }
  return true;
}

function pick(row: Row | undefined | null, select?: any): Row | null {
  if (!row) return null;
  if (!select) return { ...row };
  const out: Row = {};
  for (const [k, v] of Object.entries(select)) {
    if (v === true) out[k] = row[k];
    else if (v && typeof v === "object") out[k] = row[k] ?? null; // relation select: rows embed it
  }
  return out;
}

class Model {
  rows: Row[] = [];
  constructor(
    private readonly prefix: string,
    private readonly defaults: () => Row = () => ({}),
    private readonly unique: string[] = [],
  ) {}

  private find(where: any) {
    return this.rows.find((r) => matches(r, where));
  }
  findUnique = jest.fn(async ({ where, select }: any) => pick(this.find(where), select));
  findFirst = jest.fn(async ({ where, select }: any = {}) => pick(this.find(where), select));
  findMany = jest.fn(async ({ where, select }: any = {}) =>
    this.rows.filter((r) => matches(r, where)).map((r) => pick(r, select)),
  );
  count = jest.fn(async ({ where }: any = {}) => this.rows.filter((r) => matches(r, where)).length);
  private checkUnique(data: Row, self?: Row) {
    for (const u of this.unique) {
      if (data[u] !== undefined && data[u] !== null && this.rows.some((r) => r !== self && r[u] === data[u])) {
        throw new Prisma.PrismaClientKnownRequestError(`Unique constraint failed on ${u}`, {
          code: "P2002",
          clientVersion: "test",
          meta: { target: [u] },
        });
      }
    }
  }
  create = jest.fn(async ({ data, select }: any) => {
    this.checkUnique(data);
    const row = { id: id(this.prefix), createdAt: new Date(), updatedAt: new Date(), ...this.defaults(), ...data };
    this.rows.push(row);
    return pick(row, select);
  });
  update = jest.fn(async ({ where, data, select }: any) => {
    const row = this.find(where);
    if (!row) throw new Error(`${this.prefix}: record to update not found`);
    this.checkUnique(data, row);
    Object.assign(row, data, { updatedAt: new Date() });
    return pick(row, select);
  });
  updateMany = jest.fn(async ({ where, data }: any) => {
    const hit = this.rows.filter((r) => matches(r, where));
    hit.forEach((r) => Object.assign(r, data));
    return { count: hit.length };
  });
  upsert = jest.fn(async ({ where, create, update, select }: any) => {
    const row = this.find(where);
    if (row) {
      this.checkUnique(update, row);
      Object.assign(row, update, { updatedAt: new Date() });
      return pick(row, select);
    }
    return this.create({ data: create, select });
  });
  delete = jest.fn(async ({ where }: any) => {
    const i = this.rows.findIndex((r) => matches(r, where));
    if (i < 0) throw new Error(`${this.prefix}: record to delete not found`);
    const [row] = this.rows.splice(i, 1);
    return row;
  });
  deleteMany = jest.fn(async ({ where }: any = {}) => {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => !matches(r, where));
    return { count: before - this.rows.length };
  });
}

export class FakePrisma {
  client = new Model("client", () => ({
    instagramHandle: null,
    instagramAvatarUrl: null,
    instagramBio: null,
    isInternal: false,
    status: "active",
  }));
  user = new Model("user");
  clientPortalContact = new Model("contact");
  instagramConnection = new Model(
    "igc",
    () => ({
      status: "ACTIVE",
      scopes: [],
      lastSyncAt: null,
      lastError: null,
      tokenRefreshedAt: null,
      tokenExpiresAt: null,
      igScopedUserId: null,
      activeIgUserId: null,
      tokenKeyId: null,
      syncedHandle: null,
      syncedAvatarUrl: null,
      syncedBio: null,
      accountType: null,
      profilePictureUrl: null,
      followersCount: null,
      mediaCount: null,
    }),
    ["clientId", "activeIgUserId"],
  );
  instagramDailyMetric = new Model("igd", () => ({ followersCount: null, metrics: {} }));
  instagramMediaSnapshot = new Model("igm", () => ({ metrics: {} }));
  instagramOAuthState = new Model("igs", () => ({ consumedAt: null, syncProfile: false }), ["nonceHash"]);
  instagramDataDeletionRequest = new Model("igdel", () => ({ status: "COMPLETED", requestedAt: new Date() }), [
    "confirmationCode",
  ]);
  socialMediaReport = new Model("report");
  reportSection = new Model("section");

  constructor() {
    // client.findUnique with `select: { instagramConnection: ... }` (relation).
    const base = this.client.findUnique.getMockImplementation()!;
    this.client.findUnique.mockImplementation(async (args: any) => {
      const row = await base(args);
      if (row && args.select?.instagramConnection) {
        const conn = this.instagramConnection.rows.find((c) => c.clientId === args.where.id);
        row.instagramConnection = conn ? { id: conn.id } : null;
      }
      return row;
    });
    // Cascades (connection -> metrics/media).
    const cascade = (ids: string[]) => {
      this.instagramDailyMetric.rows = this.instagramDailyMetric.rows.filter((r) => !ids.includes(r.connectionId));
      this.instagramMediaSnapshot.rows = this.instagramMediaSnapshot.rows.filter((r) => !ids.includes(r.connectionId));
    };
    const del = this.instagramConnection.delete.getMockImplementation()!;
    this.instagramConnection.delete.mockImplementation(async (args: any) => {
      const row = await del(args);
      cascade([row.id]);
      return row;
    });
    const delMany = this.instagramConnection.deleteMany.getMockImplementation()!;
    this.instagramConnection.deleteMany.mockImplementation(async (args: any) => {
      const ids = this.instagramConnection.rows.filter((r) => matches(r, args?.where)).map((r) => r.id);
      const res = await delMany(args);
      cascade(ids);
      return res;
    });
  }

  instagramDailyMetricAggregate = jest.fn();
  $transaction = jest.fn(async (fn: any) => (typeof fn === "function" ? fn(this) : Promise.all(fn)));
}

/** Patch aggregate onto the daily-metric model (only used by status()). */
export function withAggregate(p: FakePrisma): FakePrisma {
  (p.instagramDailyMetric as any).aggregate = jest.fn(async ({ where }: any) => {
    const rows = p.instagramDailyMetric.rows.filter((r) => matches(r, where));
    const dates = rows.map((r) => r.date as Date).sort((a, b) => a.getTime() - b.getTime());
    return { _count: { _all: rows.length }, _min: { date: dates[0] ?? null }, _max: { date: dates[dates.length - 1] ?? null } };
  });
  return p;
}

export const TEST_APP_SECRET = "test-app-secret-0123456789abcdef";

export function testConfig(overrides: Partial<InstagramConfig> = {}): InstagramConfig {
  const cfg = loadInstagramConfig({
    NODE_ENV: "test",
    META_APP_ID: "123456789012345",
    META_APP_SECRET: TEST_APP_SECRET,
    TOKEN_ENCRYPTION_KEY: Buffer.from(createHash("sha256").update("k").digest()).toString("base64"),
    INSTAGRAM_REDIRECT_URI: "https://admin.example.test/api/v1/instagram/oauth/callback",
    INSTAGRAM_PORTAL_REDIRECT_URI: "https://portal.example.test/api/v1/instagram/oauth/callback",
    INSTAGRAM_GRAPH_BASE_URL: "https://graph.fake.test",
    INSTAGRAM_OAUTH_BASE_URL: "https://api.fake.test",
    INSTAGRAM_AUTHORIZE_URL: "https://www.fake.test/oauth/authorize",
    INSTAGRAM_BACKFILL_DAYS: "5",
  } as NodeJS.ProcessEnv);
  if (!cfg) throw new Error("test config failed");
  return { ...cfg, ...overrides };
}

export type Handler = (url: URL, init: RequestInit) => { status?: number; body: unknown; headers?: Record<string, string> };

/** Route table keyed by "METHOD /path" (version prefix stripped). */
export class FakeGraph {
  calls: { method: string; path: string; url: URL; body?: string }[] = [];
  routes = new Map<string, Handler>();

  on(key: string, h: Handler | unknown): this {
    this.routes.set(key, typeof h === "function" ? (h as Handler) : () => ({ body: h }));
    return this;
  }

  fetch = jest.fn(async (input: string, init: RequestInit = {}) => {
    const url = new URL(input);
    const method = (init.method ?? "GET").toUpperCase();
    const path = url.pathname.replace(/^\/v\d+\.\d+/, "");
    this.calls.push({ method, path, url, body: typeof init.body === "string" ? init.body : undefined });
    const handler =
      this.routes.get(`${method} ${url.host}${path}`) ?? this.routes.get(`${method} ${path}`);
    if (!handler) {
      return new Response(JSON.stringify({ error: { message: `no route ${method} ${path}`, code: 100 } }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    const r = handler(url, init);
    return new Response(JSON.stringify(r.body), {
      status: r.status ?? 200,
      headers: { "content-type": "application/json", ...(r.headers ?? {}) },
    });
  });
}

export function graphError(code: number, message = "error", status = 400, subcode?: number) {
  return { status, body: { error: { message, type: "OAuthException", code, error_subcode: subcode } } };
}
