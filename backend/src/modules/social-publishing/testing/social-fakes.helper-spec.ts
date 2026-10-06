/**
 * Test doubles for the social-publishing specs (excluded from the build by
 * the "*spec.ts" pattern, not run by jest because it is not ".spec.ts").
 *
 *  - FakePrisma: in-memory store for content items, clients, publications and
 *    audit logs, with enough `where` support (OR / lt / lte / gt / in / notIn,
 *    nested `content.client`) that the conditional-UPDATE lease (claim) is
 *    exercised with real semantics. Each call runs synchronously inside one
 *    microtask, i.e. atomically, like a single SQL statement.
 *  - FakeMeta: a stateful stand-in for graph.facebook.com,
 *    graph-video.facebook.com and rupload.facebook.com, injected as the fetch
 *    of MetaGraphClient. Records every request (to assert tokens only travel
 *    in the Authorization header) and supports fault injection.
 */
import { ContentFormat, ContentPlatform, ContentStatus } from "@prisma/client";

type Row = Record<string, any>;
let seq = 0;
const nextId = (p: string) => `${p}${++seq}`;

const cmp = (x: any) => (x instanceof Date ? x.getTime() : x);

function matchValue(v: any, cond: any): boolean {
  if (cond === undefined) return true;
  if (cond === null) return v === null || v === undefined;
  if (cond instanceof Date)
    return v instanceof Date && v.getTime() === cond.getTime();
  if (typeof cond === "object" && !Array.isArray(cond)) {
    let ok = true;
    if ("in" in cond) ok = ok && cond.in.includes(v);
    if ("notIn" in cond) ok = ok && !cond.notIn.includes(v);
    if ("not" in cond)
      ok =
        ok &&
        (cond.not === null ? v !== null && v !== undefined : v !== cond.not);
    if ("has" in cond) ok = ok && Array.isArray(v) && v.includes(cond.has);
    if ("gt" in cond) ok = ok && v != null && cmp(v) > cmp(cond.gt);
    if ("gte" in cond) ok = ok && v != null && cmp(v) >= cmp(cond.gte);
    if ("lt" in cond) ok = ok && v != null && cmp(v) < cmp(cond.lt);
    if ("lte" in cond) ok = ok && v != null && cmp(v) <= cmp(cond.lte);
    return ok;
  }
  return v === cond;
}

export class FakePrisma {
  clients: Row[] = [];
  items: Row[] = [];
  media: Row[] = [];
  pubs: Row[] = [];
  audits: Row[] = [];
  now = () => new Date();

  match(
    table: "items" | "pubs" | "clients",
    row: Row,
    where: any = {},
  ): boolean {
    for (const [k, cond] of Object.entries(where ?? {})) {
      if (k === "OR") {
        if (!(cond as any[]).some((c) => this.match(table, row, c)))
          return false;
      } else if (k === "AND") {
        if (!(cond as any[]).every((c) => this.match(table, row, c)))
          return false;
      } else if (k === "content" && table === "pubs") {
        const item = this.items.find((i) => i.id === row.contentId);
        if (!item || !this.match("items", item, cond)) return false;
      } else if (k === "client" && table === "items") {
        const c = this.clients.find((x) => x.id === row.clientId);
        if (!c || !this.match("clients", c, cond)) return false;
      } else if (!matchValue(row[k], cond)) {
        return false;
      }
    }
    return true;
  }

  private itemView(it: Row, select?: any) {
    const out: Row = { ...it };
    out.client = this.clients.find((c) => c.id === it.clientId) ?? null;
    out.media = this.media
      .filter((m) => m.contentId === it.id)
      .sort((a, b) => a.order - b.order);
    if (select?.publications)
      out.publications = this.pubs
        .filter((p) => p.contentId === it.id)
        .map((p) => ({ ...p }));
    return out;
  }

  private apply(row: Row, data: Row) {
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) row[k] = v;
    }
    row.updatedAt = this.now();
  }

  client = {
    findUnique: jest.fn(
      async ({ where }: any) =>
        this.clients.find((c) => c.id === where.id) ?? null,
    ),
  };

  contentCalendarItem = {
    findMany: jest.fn(async ({ where, take }: any) => {
      const rows = this.items.filter((i) => this.match("items", i, where));
      rows.sort((a, b) => cmp(a.scheduledAt) - cmp(b.scheduledAt));
      return rows.slice(0, take ?? rows.length).map((r) => this.itemView(r));
    }),
    findUnique: jest.fn(async ({ where, select }: any) => {
      const it = this.items.find((i) => i.id === where.id);
      return it ? this.itemView(it, select) : null;
    }),
    updateMany: jest.fn(async ({ where, data }: any) => {
      const rows = this.items.filter((i) => this.match("items", i, where));
      rows.forEach((r) => this.apply(r, data));
      return { count: rows.length };
    }),
  };

  socialPublication = {
    createMany: jest.fn(async ({ data, skipDuplicates }: any) => {
      let count = 0;
      for (const d of data) {
        if (
          this.pubs.some(
            (p) => p.contentId === d.contentId && p.platform === d.platform,
          )
        ) {
          if (skipDuplicates) continue;
          throw new Error("unique violation");
        }
        this.pubs.push(this.newPub(d));
        count++;
      }
      return { count };
    }),
    create: jest.fn(async ({ data }: any) => {
      if (
        this.pubs.some(
          (p) => p.contentId === data.contentId && p.platform === data.platform,
        )
      ) {
        throw new Error("unique violation");
      }
      const row = this.newPub(data);
      this.pubs.push(row);
      return { ...row };
    }),
    findMany: jest.fn(async ({ where, take }: any) => {
      const rows = this.pubs.filter((p) => this.match("pubs", p, where));
      return rows.slice(0, take ?? rows.length).map((r) => ({ ...r }));
    }),
    findUnique: jest.fn(async ({ where }: any) => {
      const r = this.pubs.find((p) => p.id === where.id);
      return r ? { ...r } : null;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const r = this.pubs.find((p) => p.id === where.id);
      if (!r) throw new Error("not found");
      this.apply(r, data);
      return { ...r };
    }),
    updateMany: jest.fn(async ({ where, data }: any) => {
      const rows = this.pubs.filter((p) => this.match("pubs", p, where));
      rows.forEach((r) => this.apply(r, data));
      return { count: rows.length };
    }),
    count: jest.fn(
      async ({ where }: any) =>
        this.pubs.filter((p) => this.match("pubs", p, where)).length,
    ),
    deleteMany: jest.fn(async ({ where }: any) => {
      const before = this.pubs.length;
      this.pubs = this.pubs.filter((p) => !this.match("pubs", p, where));
      return { count: before - this.pubs.length };
    }),
  };

  auditLog = {
    create: jest.fn(async ({ data }: any) => {
      this.audits.push({ ...data });
      return data;
    }),
  };

  private newPub(d: Row): Row {
    const now = this.now();
    return {
      id: nextId("pub"),
      status: "PENDING",
      attempts: 0,
      nextAttemptAt: null,
      lockToken: null,
      lockedUntil: null,
      state: null,
      requestedAt: null,
      externalId: null,
      permalink: null,
      errorCode: null,
      errorMessage: null,
      lastAttemptAt: null,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
      ...d,
    };
  }

  // ---- seeding helpers ----

  addClient(isInternal: boolean): Row {
    const c = {
      id: nextId(isInternal ? "monomi" : "client"),
      name: isInternal ? "Monomi" : "Acme",
      isInternal,
    };
    this.clients.push(c);
    return c;
  }

  addItem(opts: {
    clientId: string;
    caption?: string;
    format?: ContentFormat;
    status?: ContentStatus;
    scheduledAt?: Date | null;
    autoPublish?: boolean;
    targets?: ContentPlatform[];
    media?: Partial<Row>[];
  }): Row {
    const it = {
      id: nextId("item"),
      caption: opts.caption ?? "Halo dari Monomi #monomi",
      format: opts.format ?? ContentFormat.FEED,
      status: opts.status ?? ContentStatus.SCHEDULED,
      scheduledAt:
        opts.scheduledAt === undefined
          ? new Date(Date.now() - 60_000)
          : opts.scheduledAt,
      publishedAt: null,
      clientId: opts.clientId,
      createdBy: "user-admin",
      autoPublish: opts.autoPublish ?? true,
      autoPublishTargets: opts.targets ?? [
        ContentPlatform.INSTAGRAM,
        ContentPlatform.FACEBOOK,
      ],
      autoPublishBy: "user-admin",
    };
    this.items.push(it);
    (opts.media ?? [jpeg()]).forEach((m, i) =>
      this.media.push({
        id: nextId("media"),
        contentId: it.id,
        order: i,
        ...m,
      }),
    );
    return it;
  }
}

export const jpeg = (over: Partial<Row> = {}): Row => ({
  key: `content/2026-10-06/${nextId("k")}-photo.jpg`,
  type: "IMAGE",
  mimeType: "image/jpeg",
  size: 500_000,
  width: 1080,
  height: 1350,
  duration: null,
  ...over,
});

export const mp4 = (over: Partial<Row> = {}): Row => ({
  key: `content/2026-10-06/${nextId("k")}-clip.mp4`,
  type: "VIDEO",
  mimeType: "video/mp4",
  size: 20_000_000,
  width: 1080,
  height: 1920,
  duration: 20,
  ...over,
});

// ---------------------------------------------------------------------------

export interface RecordedCall {
  method: string;
  url: URL;
  path: string;
  headers: Record<string, string>;
  form: URLSearchParams;
  raw: string;
}

export type Fault =
  | {
      kind: "error";
      status: number;
      code?: number;
      subcode?: number;
      message?: string;
      type?: string;
    }
  | { kind: "timeout" };

export const SYSTEM_TOKEN = "EAAsystemUserTokenTOP-SECRET-1234567890abcdef";
export const PAGE_TOKEN = "EAApageTokenDERIVED-SECRET-0987654321fedcba";
export const PAGE_ID = "1122334455";
export const IG_ID = "17841400000000001";

/**
 * Stateful fake of the Meta endpoints the publishers use. Video containers
 * stay IN_PROGRESS for `videoPolls` status reads.
 */
export class FakeMeta {
  calls: RecordedCall[] = [];
  containers = new Map<
    string,
    {
      status: string;
      polls: number;
      params: Record<string, string>;
      published: number;
    }
  >();
  igMedia: {
    id: string;
    caption: string;
    timestamp: string;
    permalink: string;
    container: string;
  }[] = [];
  pagePosts: {
    id: string;
    message: string;
    created_time: string;
    permalink_url: string;
    kind: string;
  }[] = [];
  videos = new Map<
    string,
    { edge: string; uploaded: boolean; finished: boolean; fileUrl?: string }
  >();
  quota = { usage: 0, total: 100 };
  videoPolls = 2;
  /** Faults by matcher; `times` defaults to 1. */
  faults: {
    match: (c: RecordedCall) => boolean;
    fault: Fault;
    times: number;
    after?: boolean;
  }[] = [];
  pageTokenFetches = 0;
  private n = 1000;

  fault(
    match: (c: RecordedCall) => boolean,
    fault: Fault,
    times = 1,
    after = false,
  ) {
    this.faults.push({ match, fault, times, after });
  }

  get fetch() {
    return async (input: string, init?: RequestInit): Promise<Response> => {
      const url = new URL(input);
      const headers: Record<string, string> = {};
      Object.entries((init?.headers ?? {}) as Record<string, string>).forEach(
        ([k, v]) => (headers[k.toLowerCase()] = v),
      );
      const raw = typeof init?.body === "string" ? init.body : "";
      const call: RecordedCall = {
        method: init?.method ?? "GET",
        url,
        path: url.pathname.replace(/^\/v\d+\.\d+/, ""),
        headers,
        form: new URLSearchParams(raw),
        raw,
      };
      this.calls.push(call);
      const f = this.faults.find((x) => x.times > 0 && x.match(call));
      if (f && !f.after) {
        f.times--;
        return this.faultResponse(f.fault);
      }
      const res = this.route(call);
      if (f && f.after) {
        // The request WAS applied, but the caller never sees the answer.
        f.times--;
        return this.faultResponse(f.fault);
      }
      return res;
    };
  }

  private faultResponse(f: Fault): Response {
    if (f.kind === "timeout") {
      const e = new Error("The operation was aborted due to timeout");
      e.name = "TimeoutError";
      throw e;
    }
    return json(f.status, {
      error: {
        message: f.message ?? "Fake error",
        type: f.type ?? "OAuthException",
        code: f.code,
        error_subcode: f.subcode,
      },
    });
  }

  private id() {
    return String(++this.n) + "000000";
  }

  private route(c: RecordedCall): Response {
    const auth = c.headers["authorization"] ?? "";
    const p = c.path;
    const q = c.url.searchParams;
    const isPage = auth === `OAuth ${PAGE_TOKEN}`;
    const isSystem = auth === `OAuth ${SYSTEM_TOKEN}`;
    if (!isPage && !isSystem)
      return json(401, {
        error: {
          message: "Invalid OAuth access token",
          type: "OAuthException",
          code: 190,
        },
      });

    // ---- page token derivation ----
    if (
      c.method === "GET" &&
      p === `/${PAGE_ID}` &&
      q.get("fields") === "access_token"
    ) {
      if (!isSystem)
        return json(400, {
          error: { message: "need system token", code: 100 },
        });
      this.pageTokenFetches++;
      return json(200, { id: PAGE_ID, access_token: PAGE_TOKEN });
    }
    if (c.method === "GET" && p === "/me")
      return json(200, { id: "999", name: "Monomi Publisher" });
    if (c.method === "GET" && p === "/me/permissions") {
      return json(200, {
        data: [
          "pages_show_list",
          "pages_read_engagement",
          "pages_manage_posts",
          "instagram_basic",
          "instagram_content_publish",
        ].map((permission) => ({ permission, status: "granted" })),
      });
    }
    if (c.method === "GET" && p === `/${PAGE_ID}`) {
      return json(200, {
        id: PAGE_ID,
        name: "Monomi Agency",
        picture: { data: { url: "https://scontent.xx.fbcdn.net/page.jpg" } },
        instagram_business_account: {
          id: IG_ID,
          username: "monomi.agency",
          profile_picture_url: "https://scontent.cdninstagram.com/ig.jpg",
        },
      });
    }

    // ---- Instagram (system user token) ----
    if (p === `/${IG_ID}/content_publishing_limit`) {
      return json(200, {
        data: [
          {
            quota_usage: this.quota.usage,
            config: { quota_total: this.quota.total, quota_duration: 86400 },
          },
        ],
      });
    }
    if (c.method === "POST" && p === `/${IG_ID}/media`) {
      if (!isSystem)
        return json(400, { error: { message: "wrong token", code: 190 } });
      const params = Object.fromEntries(c.form.entries());
      const id = this.id();
      const video = !!params.video_url;
      this.containers.set(id, {
        status: video ? "IN_PROGRESS" : "FINISHED",
        polls: 0,
        params,
        published: 0,
      });
      return json(200, { id });
    }
    if (c.method === "POST" && p === `/${IG_ID}/media_publish`) {
      const cid = c.form.get("creation_id") ?? "";
      const ct = this.containers.get(cid);
      if (!ct)
        return json(400, {
          error: { message: "Invalid creation_id", code: 100 },
        });
      if (ct.status === "PUBLISHED")
        return json(400, {
          error: {
            message: "Container already published",
            code: 100,
            error_subcode: 2207020,
          },
        });
      if (ct.status !== "FINISHED")
        return json(400, {
          error: {
            message: "Media not ready",
            code: 9007,
            error_subcode: 2207027,
          },
        });
      ct.status = "PUBLISHED";
      ct.published++;
      this.quota.usage++;
      const id = this.id();
      this.igMedia.unshift({
        id,
        caption: ct.params.caption ?? "",
        timestamp: new Date().toISOString().replace("Z", "+0000"),
        permalink: `https://www.instagram.com/p/FAKE${id}/`,
        container: cid,
      });
      return json(200, { id });
    }
    if (
      c.method === "GET" &&
      (p === `/${IG_ID}/media` || p === `/${IG_ID}/stories`)
    ) {
      return json(200, { data: this.igMedia });
    }

    // ---- Facebook Page (page token) ----
    if (c.method === "POST" && p.startsWith(`/${PAGE_ID}/`)) {
      if (!isPage)
        return json(403, {
          error: { message: "(#200) requires a Page access token", code: 200 },
        });
      const edge = p.slice(`/${PAGE_ID}/`.length);
      const f = Object.fromEntries(c.form.entries());
      if (edge === "photos") {
        const id = this.id();
        if (f.published === "false") return json(200, { id });
        const postId = `${PAGE_ID}_${id}`;
        this.addPost(postId, f.message ?? "", "photo");
        return json(200, { id, post_id: postId });
      }
      if (edge === "feed") {
        const postId = `${PAGE_ID}_${this.id()}`;
        this.addPost(
          postId,
          f.message ?? "",
          Object.keys(f).some((k) => k.startsWith("attached_media"))
            ? "multi"
            : "text",
        );
        return json(200, { id: postId });
      }
      if (edge === "videos") {
        const id = this.id();
        this.addPost(`${PAGE_ID}_${id}`, f.description ?? "", "video");
        return json(200, { id });
      }
      if (edge === "video_reels" || edge === "video_stories") {
        if (f.upload_phase === "start") {
          const id = this.id();
          this.videos.set(id, { edge, uploaded: false, finished: false });
          return json(200, {
            video_id: id,
            upload_url: `https://rupload.facebook.com/video-upload/v26.0/${id}`,
          });
        }
        if (f.upload_phase === "finish") {
          const v = this.videos.get(f.video_id);
          if (!v || !v.uploaded)
            return json(400, {
              error: { message: "video not uploaded", code: 100 },
            });
          v.finished = true;
          return json(
            200,
            edge === "video_stories"
              ? { success: true, post_id: `${PAGE_ID}_${f.video_id}` }
              : { success: true },
          );
        }
      }
      if (edge === "photo_stories")
        return json(200, { success: true, post_id: `${PAGE_ID}_${this.id()}` });
      return json(400, {
        error: { message: `unknown edge ${edge}`, code: 100 },
      });
    }
    if (c.method === "POST" && p.startsWith("/video-upload/")) {
      const vid = p.split("/").pop()!;
      const v = this.videos.get(vid);
      if (!v)
        return json(400, { error: { message: "unknown video", code: 100 } });
      v.uploaded = true;
      v.fileUrl = c.headers["file_url"];
      return json(200, { success: true });
    }
    if (c.method === "GET" && p === `/${PAGE_ID}/published_posts`) {
      return json(200, { data: this.pagePosts });
    }

    // ---- generic object reads ----
    if (c.method === "GET") {
      const id = p.slice(1);
      const fields = q.get("fields") ?? "";
      const ct = this.containers.get(id);
      if (ct && fields.includes("status_code")) {
        if (ct.status === "IN_PROGRESS" && ++ct.polls >= this.videoPolls)
          ct.status = "FINISHED";
        return json(200, {
          id,
          status_code: ct.status,
          status:
            ct.status === "ERROR"
              ? "Error: failed with error code 2207026"
              : "",
        });
      }
      if (fields === "permalink") {
        const m = this.igMedia.find((x) => x.id === id);
        return json(200, {
          id,
          permalink: m?.permalink ?? `https://www.instagram.com/p/FAKE${id}/`,
        });
      }
      if (fields === "permalink_url")
        return json(200, { id, permalink_url: `/${PAGE_ID}/posts/${id}` });
      if (fields === "status") {
        const v = this.videos.get(id);
        return json(200, {
          id,
          status: {
            video_status: v?.finished ? "ready" : "processing",
            publishing_phase: {
              status: v?.finished ? "complete" : "not_started",
            },
          },
        });
      }
    }
    return json(404, {
      error: { message: `no route ${c.method} ${p}`, code: 803 },
    });
  }

  private addPost(id: string, message: string, kind: string) {
    this.pagePosts.unshift({
      id,
      message,
      kind,
      created_time: new Date().toISOString().replace("Z", "+0000"),
      permalink_url: `https://www.facebook.com/${id}`,
    });
  }
}

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const fakeSigner = () => ({
  sign: jest.fn(
    async (key: string) =>
      `https://acct.r2.cloudflarestorage.com/content-media/${key}?X-Amz-Expires=7200&X-Amz-Signature=deadbeef`,
  ),
});
