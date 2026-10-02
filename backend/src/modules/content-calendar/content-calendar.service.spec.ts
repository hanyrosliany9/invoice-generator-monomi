import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { ContentStatus, UserRole } from "@prisma/client";
import {
  CLIENT_VISIBLE_STATUSES,
  ContentCalendarService,
  resolvePublishedAt,
} from "./content-calendar.service";

/**
 * In-memory fake of the Prisma surface the service uses, so reference-safety
 * (what gets deleted from R2) is exercised against real filtering semantics
 * rather than canned return values. R2 is a jest mock: production storage is
 * never contacted.
 */
type Media = {
  id: string;
  key: string;
  thumbnailKey?: string | null;
  contentId: string;
  [k: string]: any;
};
type Item = {
  id: string;
  clientId: string;
  status: ContentStatus;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  gridOrder: number | null;
  createdBy: string;
  caption: string;
  format: string;
  platforms: string[];
  projectId: string | null;
};

function makeEnv() {
  const items: Item[] = [];
  let media: Media[] = [];
  let hlMedia: { key: string; thumbnailKey?: string | null }[] = [];
  let hlCovers: { coverKey: string }[] = [];
  let seq = 0;

  const withMedia = (it: Item) => ({
    ...it,
    media: media.filter((m) => m.contentId === it.id),
  });
  const matchKeys = (m: any, where: any) =>
    where.OR.some(
      (c: any) =>
        (c.key && c.key.in.includes(m.key)) ||
        (c.thumbnailKey && m.thumbnailKey && c.thumbnailKey.in.includes(m.thumbnailKey)),
    );

  const prisma: any = {
    contentCalendarItem: {
      findUnique: jest.fn(async ({ where }: any) => {
        const it = items.find((i) => i.id === where.id);
        return it ? withMedia(it) : null;
      }),
      findMany: jest.fn(async ({ where }: any) => {
        let r = items.slice();
        if (where?.id?.in) r = r.filter((i) => where.id.in.includes(i.id));
        if (where?.clientId) r = r.filter((i) => i.clientId === where.clientId);
        if (where?.status?.in) r = r.filter((i) => where.status.in.includes(i.status));
        return r.map(withMedia);
      }),
      aggregate: jest.fn(async ({ where }: any) => {
        const orders = items
          .filter((i) => i.clientId === where.clientId && i.gridOrder !== null)
          .map((i) => i.gridOrder as number);
        return { _min: { gridOrder: orders.length ? Math.min(...orders) : null } };
      }),
      create: jest.fn(async ({ data }: any) => {
        const id = `item${++seq}`;
        const it: Item = {
          id,
          clientId: data.clientId,
          status: data.status,
          scheduledAt: data.scheduledAt,
          publishedAt: data.publishedAt ?? null,
          gridOrder: data.gridOrder ?? null,
          createdBy: data.createdBy,
          caption: data.caption,
          format: data.format,
          platforms: data.platforms,
          projectId: data.projectId ?? null,
        };
        items.push(it);
        (data.media?.create ?? []).forEach((m: any) =>
          media.push({ ...m, id: `m${++seq}`, contentId: id }),
        );
        return withMedia(it);
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const it = items.find((i) => i.id === where.id)!;
        const { media: mediaOp, ...rest } = data;
        Object.assign(it, rest);
        if (mediaOp) {
          media = media.filter((m) => m.contentId !== it.id);
          mediaOp.create.forEach((m: any) =>
            media.push({ ...m, id: `m${++seq}`, contentId: it.id }),
          );
        }
        return withMedia(it);
      }),
      delete: jest.fn(async ({ where }: any) => {
        const idx = items.findIndex((i) => i.id === where.id);
        items.splice(idx, 1);
        media = media.filter((m) => m.contentId !== where.id);
      }),
    },
    contentMedia: {
      findMany: jest.fn(async ({ where }: any) =>
        media.filter((m) => matchKeys(m, where)),
      ),
    },
    highlightMedia: {
      findMany: jest.fn(async ({ where }: any) =>
        hlMedia.filter((m) => matchKeys(m, where)),
      ),
    },
    storyHighlight: {
      findMany: jest.fn(async ({ where }: any) =>
        hlCovers.filter((c) => where.coverKey.in.includes(c.coverKey)),
      ),
    },
    project: { findUnique: jest.fn() },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    client: { findUnique: jest.fn(async () => ({ id: "c1" })) },
  };
  const mediaService = {
    deleteMultipleFiles: jest.fn(async (_keys: string[]) => undefined),
  };
  const service = new ContentCalendarService(prisma, mediaService as any);

  const addItem = (over: Partial<Item> = {}, mediaKeys: string[] = []) => {
    const id = over.id ?? `item${++seq}`;
    items.push({
      id,
      clientId: "c1",
      status: ContentStatus.DRAFT,
      scheduledAt: null,
      publishedAt: null,
      gridOrder: null,
      createdBy: "u1",
      caption: "cap",
      format: "FEED",
      platforms: ["INSTAGRAM"],
      projectId: null,
      ...over,
    });
    mediaKeys.forEach((key, i) =>
      media.push({
        id: `m${++seq}`,
        key,
        thumbnailKey: null,
        contentId: id,
        url: `u/${key}`,
        type: "IMAGE",
        mimeType: "image/jpeg",
        size: 1,
        order: i,
      }),
    );
    return id;
  };

  return {
    prisma,
    mediaService,
    service,
    items,
    addItem,
    getMedia: () => media,
    setHighlightMedia: (m: typeof hlMedia) => (hlMedia = m),
    setHighlightCovers: (c: typeof hlCovers) => (hlCovers = c),
  };
}

const mediaDto = (key: string, extra: any = {}) => ({
  url: `u/${key}`,
  key,
  mimeType: "image/jpeg",
  size: 1,
  ...extra,
});
const deleted = (env: ReturnType<typeof makeEnv>) =>
  env.mediaService.deleteMultipleFiles.mock.calls.flatMap((c) => c[0]).sort();

describe("ContentCalendarService", () => {
  describe("A1: updating media never deletes kept files, and only after the DB write", () => {
    it("deletes only the removed key, keeps the other two", async () => {
      const env = makeEnv();
      const id = env.addItem({}, ["a", "b", "c"]);
      await env.service.update(
        id,
        { media: [mediaDto("a"), mediaDto("c")] } as any,
        "u1",
        UserRole.ADMIN,
      );
      expect(deleted(env)).toEqual(["b"]);
      expect(env.getMedia().map((m) => m.key).sort()).toEqual(["a", "c"]);
    });

    it("deletes nothing when the same media is resent", async () => {
      const env = makeEnv();
      const id = env.addItem({}, ["a", "b"]);
      await env.service.update(
        id,
        { media: [mediaDto("a"), mediaDto("b")] } as any,
        "u1",
        UserRole.ADMIN,
      );
      expect(env.mediaService.deleteMultipleFiles).not.toHaveBeenCalled();
    });

    it("keeps a kept thumbnail and deletes a dropped one", async () => {
      const env = makeEnv();
      const id = env.addItem({}, []);
      env.getMedia().push(
        { id: "v1", key: "v1", thumbnailKey: "t1", contentId: id },
        { id: "v2", key: "v2", thumbnailKey: "t2", contentId: id },
      );
      await env.service.update(
        id,
        { media: [mediaDto("v1", { thumbnailKey: "t1" })] } as any,
        "u1",
        UserRole.ADMIN,
      );
      expect(deleted(env)).toEqual(["t2", "v2"]);
    });

    it("does not touch R2 when validation fails before the DB write", async () => {
      const env = makeEnv();
      const id = env.addItem({}, ["a", "b"]);
      await expect(
        env.service.update(
          id,
          {
            media: [mediaDto("a")],
            status: ContentStatus.SCHEDULED,
            scheduledAt: new Date(Date.now() - 3600_000).toISOString(),
          } as any,
          "u1",
          UserRole.ADMIN,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(env.mediaService.deleteMultipleFiles).not.toHaveBeenCalled();
      expect(env.getMedia().map((m) => m.key).sort()).toEqual(["a", "b"]);
    });

    it("does not delete a removed file that a highlight still references", async () => {
      const env = makeEnv();
      const id = env.addItem({}, ["a", "b"]);
      env.setHighlightMedia([{ key: "b", thumbnailKey: null }]);
      await env.service.update(id, { media: [mediaDto("a")] } as any, "u1", UserRole.ADMIN);
      expect(env.mediaService.deleteMultipleFiles).not.toHaveBeenCalled();
    });

    it("does not delete a highlight cover", async () => {
      const env = makeEnv();
      const id = env.addItem({}, ["a", "b"]);
      env.setHighlightCovers([{ coverKey: "b" }]);
      await env.service.update(id, { media: [mediaDto("a")] } as any, "u1", UserRole.ADMIN);
      expect(env.mediaService.deleteMultipleFiles).not.toHaveBeenCalled();
    });
  });

  describe("duplicate + reference-safe deletion", () => {
    it("copies caption/platforms/format/media refs as an unscheduled DRAFT at the top of the grid", async () => {
      const env = makeEnv();
      const id = env.addItem(
        { status: ContentStatus.SCHEDULED, scheduledAt: new Date(Date.now() + 1e8), gridOrder: 0, caption: "hello", format: "REEL" },
        ["a", "b"],
      );
      env.addItem({ gridOrder: 3 });
      const copy: any = await env.service.duplicate(id, "u2", UserRole.VIDEOGRAPHER);
      expect(copy.id).not.toBe(id);
      expect(copy.status).toBe(ContentStatus.DRAFT);
      expect(copy.scheduledAt).toBeNull();
      expect(copy.caption).toBe("hello");
      expect(copy.format).toBe("REEL");
      expect(copy.createdBy).toBe("u2");
      expect(copy.gridOrder).toBe(-1); // before the current minimum (0)
      expect(copy.media.map((m: any) => m.key)).toEqual(["a", "b"]);
    });

    it("deleting the original keeps files the duplicate still uses", async () => {
      const env = makeEnv();
      const id = env.addItem({}, ["a", "b"]);
      const copy: any = await env.service.duplicate(id, "u1", UserRole.ADMIN);
      await env.service.remove(id, "u1", UserRole.ADMIN);
      expect(env.mediaService.deleteMultipleFiles).not.toHaveBeenCalled();
      // the copy now owns the last reference; deleting it frees the files
      await env.service.remove(copy.id, "u1", UserRole.ADMIN);
      expect(deleted(env)).toEqual(["a", "b"]);
    });

    it("editing the duplicate (removing a shared file) does not delete it for the original", async () => {
      const env = makeEnv();
      const id = env.addItem({}, ["a", "b"]);
      const copy: any = await env.service.duplicate(id, "u1", UserRole.ADMIN);
      await env.service.update(copy.id, { media: [mediaDto("a")] } as any, "u1", UserRole.ADMIN);
      expect(env.mediaService.deleteMultipleFiles).not.toHaveBeenCalled();
      expect(env.getMedia().filter((m) => m.contentId === id).map((m) => m.key).sort()).toEqual(["a", "b"]);
    });

    it("deletes from the DB first, then R2", async () => {
      const env = makeEnv();
      const id = env.addItem({}, ["a"]);
      const order: string[] = [];
      const realDelete = env.prisma.contentCalendarItem.delete.getMockImplementation();
      env.prisma.contentCalendarItem.delete.mockImplementationOnce(async (a: any) => {
        await realDelete(a);
        order.push("db");
      });
      env.mediaService.deleteMultipleFiles.mockImplementationOnce(async () => {
        order.push("r2");
      });
      await env.service.remove(id, "u1", UserRole.ADMIN);
      expect(order).toEqual(["db", "r2"]);
    });
  });

  describe("A4: client visibility", () => {
    it("only SCHEDULED and PUBLISHED are visible to clients", () => {
      expect([...CLIENT_VISIBLE_STATUSES].sort()).toEqual(["PUBLISHED", "SCHEDULED"]);
    });

    it("share/portal payload filters by visible statuses; staff findAll is unfiltered", async () => {
      const env = makeEnv();
      env.addItem({ status: ContentStatus.DRAFT });
      env.addItem({ status: ContentStatus.ARCHIVED });
      env.addItem({ status: ContentStatus.FAILED });
      env.addItem({ status: ContentStatus.SCHEDULED });
      env.addItem({ status: ContentStatus.PUBLISHED });
      env.prisma.client.findUnique = jest.fn(async () => ({
        id: "c1", name: "C", instagramHandle: null, instagramAvatarUrl: null, instagramBio: null,
        tiktokHandle: null, tiktokAvatarUrl: null, tiktokBio: null,
      }));
      env.prisma.storyHighlight.findMany = jest.fn(async () => []);
      const payload: any = await env.service.getClientSharedContent("c1");
      expect(payload.items.map((i: any) => i.status).sort()).toEqual(["PUBLISHED", "SCHEDULED"]);
      expect(payload.instagram.postCount).toBe(2);
      const call = env.prisma.contentCalendarItem.findMany.mock.calls.at(-1)[0];
      expect(call.where.status.in).toEqual(CLIENT_VISIBLE_STATUSES);
      const staff = await env.service.findAll({ clientId: "c1" });
      expect(staff).toHaveLength(5);
    });
  });

  describe("A5: new posts go top-left", () => {
    it("create after a rearrange gets gridOrder below the current minimum", async () => {
      const env = makeEnv();
      env.addItem({ gridOrder: 0 });
      env.addItem({ gridOrder: 4 });
      const created: any = await env.service.create({ caption: "x", clientId: "c1" } as any, "u1");
      expect(created.gridOrder).toBe(-1);
    });
    it("stays null when the grid was never arranged", async () => {
      const env = makeEnv();
      env.addItem({});
      const created: any = await env.service.create({ caption: "x", clientId: "c1" } as any, "u1");
      expect(created.gridOrder).toBeNull();
    });
  });

  describe("publishedAt (A9)", () => {
    const now = new Date("2026-10-02T10:00:00Z");
    it("uses the scheduled time when it is in the past", () => {
      const past = new Date("2026-09-28T02:00:00Z");
      expect(resolvePublishedAt(past, undefined, now)).toEqual(past);
    });
    it("uses now when the schedule is in the future or absent", () => {
      expect(resolvePublishedAt(new Date("2026-10-09T02:00:00Z"), undefined, now)).toEqual(now);
      expect(resolvePublishedAt(null, undefined, now)).toEqual(now);
    });
    it("an explicit date wins, but not in the future", () => {
      expect(resolvePublishedAt(null, "2026-09-01T00:00:00Z", now)).toEqual(new Date("2026-09-01T00:00:00Z"));
      expect(() => resolvePublishedAt(null, "2026-12-01T00:00:00Z", now)).toThrow(BadRequestException);
    });
    it("publish() stamps the scheduled time of an overdue item", async () => {
      const env = makeEnv();
      const past = new Date(Date.now() - 4 * 86400_000);
      const id = env.addItem({ status: ContentStatus.SCHEDULED, scheduledAt: past });
      const out: any = await env.service.publish(id, "u1", UserRole.ADMIN);
      expect(out.publishedAt).toEqual(past);
    });
  });

  describe("schedule edits (A10)", () => {
    it("clearing the schedule is allowed and returns SCHEDULED to DRAFT", async () => {
      const env = makeEnv();
      const id = env.addItem({ status: ContentStatus.SCHEDULED, scheduledAt: new Date(Date.now() + 1e8) });
      const out: any = await env.service.update(id, { scheduledAt: null } as any, "u1", UserRole.ADMIN);
      expect(out.scheduledAt).toBeNull();
      expect(out.status).toBe(ContentStatus.DRAFT);
    });
    it("adding a future date to a DRAFT schedules it", async () => {
      const env = makeEnv();
      const id = env.addItem({});
      const out: any = await env.service.update(
        id,
        { scheduledAt: new Date(Date.now() + 1e8).toISOString() } as any,
        "u1",
        UserRole.ADMIN,
      );
      expect(out.status).toBe(ContentStatus.SCHEDULED);
    });
    it("allowPastSchedule lets undo restore an overdue schedule", async () => {
      const env = makeEnv();
      const past = new Date(Date.now() - 86400_000);
      const id = env.addItem({ status: ContentStatus.SCHEDULED, scheduledAt: new Date(Date.now() + 1e8) });
      const out: any = await env.service.update(
        id,
        { scheduledAt: past.toISOString(), allowPastSchedule: true } as any,
        "u1",
        UserRole.ADMIN,
      );
      expect(out.scheduledAt).toEqual(past);
    });
  });

  describe("bulk", () => {
    it("SHIFT moves by N days keeping the time of day, reports failures per item", async () => {
      const env = makeEnv();
      const at = new Date("2030-01-10T02:00:00Z");
      const a = env.addItem({ status: ContentStatus.SCHEDULED, scheduledAt: at });
      const b = env.addItem({}); // no schedule
      const res = await env.service.bulk({ ids: [a, b, "nope"], action: "SHIFT", days: 3 }, "u1", UserRole.ADMIN);
      expect(res.succeeded).toEqual([a]);
      expect(res.failed.map((f) => f.id).sort()).toEqual([b, "nope"].sort());
      expect(env.items.find((i) => i.id === a)!.scheduledAt).toEqual(new Date("2030-01-13T02:00:00Z"));
    });
    it("SHIFT refuses to push a SCHEDULED item into the past", async () => {
      const env = makeEnv();
      const a = env.addItem({ status: ContentStatus.SCHEDULED, scheduledAt: new Date(Date.now() + 86400_000) });
      const res = await env.service.bulk({ ids: [a], action: "SHIFT", days: -30 }, "u1", UserRole.ADMIN);
      expect(res.failed).toHaveLength(1);
    });
    it("STATUS PUBLISHED stamps the real date", async () => {
      const env = makeEnv();
      const past = new Date(Date.now() - 5 * 86400_000);
      const a = env.addItem({ status: ContentStatus.SCHEDULED, scheduledAt: past });
      await env.service.bulk({ ids: [a], action: "STATUS", status: ContentStatus.PUBLISHED }, "u1", UserRole.ADMIN);
      expect(env.items[0].publishedAt).toEqual(past);
    });
    it("DELETE is permission-checked and reference-safe", async () => {
      const env = makeEnv();
      const mine = env.addItem({ createdBy: "u1" }, ["a", "shared"]);
      const theirs = env.addItem({ createdBy: "u9" }, ["shared"]);
      const res = await env.service.bulk({ ids: [mine, theirs], action: "DELETE" }, "u1", UserRole.VIDEOGRAPHER);
      expect(res.succeeded).toEqual([mine]);
      expect(res.failed[0].id).toBe(theirs);
      expect(deleted(env)).toEqual(["a"]); // "shared" is still used by the other post
    });
  });

  describe("reorder / duplicate authorization (L5)", () => {
    it("a videographer cannot reorder a grid that contains someone else's item (nothing written)", async () => {
      const env = makeEnv();
      const mine = env.addItem({ createdBy: "v1", gridOrder: 0 });
      const admins = env.addItem({ createdBy: "admin1", gridOrder: 1 });
      await expect(
        env.service.reorder(
          [{ id: mine, gridOrder: 1 }, { id: admins, gridOrder: 0 }],
          "v1",
          UserRole.VIDEOGRAPHER,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(env.prisma.contentCalendarItem.update).not.toHaveBeenCalled();
      expect(env.items.map((i) => i.gridOrder)).toEqual([0, 1]);
    });

    it("a videographer may reorder only their own items; admins may reorder anything", async () => {
      const env = makeEnv();
      const a = env.addItem({ createdBy: "v1", gridOrder: 0 });
      const b = env.addItem({ createdBy: "v1", gridOrder: 1 });
      await expect(
        env.service.reorder([{ id: a, gridOrder: 1 }, { id: b, gridOrder: 0 }], "v1", UserRole.VIDEOGRAPHER),
      ).resolves.toEqual({ updated: 2 });
      const c = env.addItem({ createdBy: "someone-else", gridOrder: 2 });
      await expect(
        env.service.reorder([{ id: a, gridOrder: 0 }, { id: c, gridOrder: 1 }], "admin1", UserRole.ADMIN),
      ).resolves.toEqual({ updated: 2 });
    });

    it("duplicate creates the copy under the caller and re-applies create's client/project rules", async () => {
      const env = makeEnv();
      const id = env.addItem({ createdBy: "admin1", clientId: "c1", projectId: "p1" });
      // The project has since been moved to another client.
      env.prisma.project.findUnique.mockResolvedValue({
        id: "p1", clientId: "c2", description: "Proj", client: { name: "Other" },
      });
      await expect(env.service.duplicate(id, "v1", UserRole.VIDEOGRAPHER)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(env.prisma.contentCalendarItem.create).not.toHaveBeenCalled();

      env.prisma.project.findUnique.mockResolvedValue({
        id: "p1", clientId: "c1", description: "Proj", client: { name: "Alpha" },
      });
      const copy: any = await env.service.duplicate(id, "v1", UserRole.VIDEOGRAPHER);
      expect(copy.createdBy).toBe("v1");
      expect(copy.clientId).toBe("c1");
    });

    it("duplicate refuses a caller without a known role, and a missing source", async () => {
      const env = makeEnv();
      const id = env.addItem();
      await expect(env.service.duplicate(id, "x", undefined as any)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(env.service.duplicate("nope", "u1", UserRole.ADMIN)).rejects.toThrow(/not found/);
    });
  });
});
