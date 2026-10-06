import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import {
  ContentFormat,
  ContentPlatform,
  ContentStatus,
  UserRole,
} from "@prisma/client";
import { MetaGraphClient } from "./meta-graph.client";
import { MetaAccountsService } from "./meta-accounts.service";
import { InstagramPublisher } from "./instagram.publisher";
import { FacebookPublisher } from "./facebook.publisher";
import {
  MAX_ATTEMPTS,
  SocialPublishingService,
} from "./social-publishing.service";
import { SocialPublishingScheduler } from "./social-publishing.scheduler";
import { loadSocialPublishingConfig } from "./social-publishing.config";
import {
  FakeMeta,
  FakePrisma,
  fakeSigner,
  IG_ID,
  jpeg,
  mp4,
  PAGE_ID,
  PAGE_TOKEN,
  SYSTEM_TOKEN,
} from "./testing/social-fakes.helper-spec";

const IG = ContentPlatform.INSTAGRAM;
const FB = ContentPlatform.FACEBOOK;
const ADMIN = { id: "user-admin", role: UserRole.ADMIN };

const ENV = {
  META_SYSTEM_USER_TOKEN: SYSTEM_TOKEN,
  META_PAGE_ID: PAGE_ID,
  META_IG_USER_ID: IG_ID,
  META_GRAPH_VERSION: "v26.0",
} as unknown as NodeJS.ProcessEnv;

function setup(
  env: NodeJS.ProcessEnv = ENV,
  shared?: { prisma: FakePrisma; meta: FakeMeta },
) {
  const prisma = shared?.prisma ?? new FakePrisma();
  const meta = shared?.meta ?? new FakeMeta();
  const graph = new MetaGraphClient(meta.fetch);
  const accounts = new MetaAccountsService(
    graph,
    loadSocialPublishingConfig(env),
  );
  const signer = fakeSigner();
  const svc = new SocialPublishingService(
    prisma as any,
    accounts,
    signer as any,
    new InstagramPublisher(accounts),
    new FacebookPublisher(accounts),
  );
  svc.sleep = async () => undefined;
  svc.pollIntervalMs = 1;
  svc.pollBudgetMs = 5_000;
  const scheduler = new SocialPublishingScheduler(svc, accounts, null);
  const internal =
    prisma.clients.find((c) => c.isInternal) ?? prisma.addClient(true);
  return { prisma, meta, svc, accounts, signer, scheduler, internal };
}

const posts = (meta: FakeMeta, path: string) =>
  meta.calls.filter((c) => c.method === "POST" && c.path === path);
const pubFor = (
  prisma: FakePrisma,
  itemId: string,
  platform: ContentPlatform,
) =>
  prisma.pubs.find((p) => p.contentId === itemId && p.platform === platform)!;

async function armAndRun(t: ReturnType<typeof setup>) {
  await t.svc.armDueItems();
  await t.svc.processMany(await t.svc.findDuePublicationIds(), "scheduler");
}

// ============================================================================
// Instagram flows
// ============================================================================

describe("Instagram publishing", () => {
  it("publishes a single feed image: container with signed image_url + caption, then media_publish", async () => {
    const t = setup();
    const item = t.prisma.addItem({ clientId: t.internal.id, targets: [IG] });
    await armAndRun(t);

    const create = posts(t.meta, `/${IG_ID}/media`);
    expect(create).toHaveLength(1);
    expect(create[0].form.get("image_url")).toMatch(
      /^https:\/\/acct\.r2\.cloudflarestorage\.com\/.+X-Amz-Signature=/,
    );
    expect(create[0].form.get("caption")).toBe(item.caption);
    expect(create[0].form.get("media_type")).toBeNull();
    expect(posts(t.meta, `/${IG_ID}/media_publish`)).toHaveLength(1);

    const pub = pubFor(t.prisma, item.id, IG);
    expect(pub.status).toBe("PUBLISHED");
    expect(pub.externalId).toMatch(/^\d+$/);
    expect(pub.permalink).toMatch(/^https:\/\/www\.instagram\.com\/p\//);
    expect(t.prisma.items[0].status).toBe(ContentStatus.PUBLISHED);
    expect(t.prisma.items[0].publishedAt).toBeInstanceOf(Date);
    expect(t.prisma.audits.map((a) => a.action)).toEqual([
      "SOCIAL_PUBLISH_ATTEMPT",
      "SOCIAL_PUBLISH_SUCCESS",
    ]);
  });

  it("publishes a single feed video as a reel (media_type=REELS, share_to_feed) after polling status_code", async () => {
    const t = setup();
    t.meta.videoPolls = 3;
    const item = t.prisma.addItem({
      clientId: t.internal.id,
      targets: [IG],
      media: [mp4()],
    });
    await armAndRun(t);

    const create = posts(t.meta, `/${IG_ID}/media`)[0];
    expect(create.form.get("media_type")).toBe("REELS");
    expect(create.form.get("share_to_feed")).toBe("true");
    expect(create.form.get("video_url")).toMatch(/^https:\/\//);
    const statusReads = t.meta.calls.filter(
      (c) => c.url.searchParams.get("fields") === "status_code,status",
    );
    expect(statusReads.length).toBeGreaterThanOrEqual(3);
    expect(pubFor(t.prisma, item.id, IG).status).toBe("PUBLISHED");
  });

  it("publishes a REEL format item", async () => {
    const t = setup();
    t.prisma.addItem({
      clientId: t.internal.id,
      targets: [IG],
      format: ContentFormat.REEL,
      media: [mp4()],
    });
    await armAndRun(t);
    expect(posts(t.meta, `/${IG_ID}/media`)[0].form.get("media_type")).toBe(
      "REELS",
    );
    expect(posts(t.meta, `/${IG_ID}/media_publish`)).toHaveLength(1);
  });

  it("publishes a story (media_type=STORIES, no caption)", async () => {
    const t = setup();
    t.prisma.addItem({
      clientId: t.internal.id,
      targets: [IG],
      format: ContentFormat.STORY,
      media: [jpeg({ width: 1080, height: 1920 })],
    });
    await armAndRun(t);
    const create = posts(t.meta, `/${IG_ID}/media`)[0];
    expect(create.form.get("media_type")).toBe("STORIES");
    expect(create.form.get("image_url")).toBeTruthy();
    expect(create.form.get("caption")).toBeNull();
    expect(posts(t.meta, `/${IG_ID}/media_publish`)).toHaveLength(1);
  });

  it("publishes a carousel: one child per item in order (video child media_type=VIDEO), then the parent", async () => {
    const t = setup();
    const item = t.prisma.addItem({
      clientId: t.internal.id,
      targets: [IG],
      media: [jpeg(), mp4({ width: 1080, height: 1350 }), jpeg()],
    });
    await armAndRun(t);

    const creates = posts(t.meta, `/${IG_ID}/media`);
    expect(creates).toHaveLength(4);
    const [c1, c2, c3, parent] = creates;
    [c1, c2, c3].forEach((c) =>
      expect(c.form.get("is_carousel_item")).toBe("true"),
    );
    expect(c1.form.get("image_url")).toBeTruthy();
    expect(c2.form.get("media_type")).toBe("VIDEO");
    expect(parent.form.get("media_type")).toBe("CAROUSEL");
    expect(parent.form.get("caption")).toBe(item.caption);
    const childIds = [...t.meta.containers.keys()].slice(0, 3);
    expect(parent.form.get("children")).toBe(childIds.join(","));
    expect(pubFor(t.prisma, item.id, IG).status).toBe("PUBLISHED");
  });

  it("defers while a video is still processing and resumes the SAME container next run", async () => {
    const t = setup();
    t.meta.videoPolls = 1000; // never finishes within this run
    t.svc.pollBudgetMs = 0;
    const item = t.prisma.addItem({
      clientId: t.internal.id,
      targets: [IG],
      media: [mp4()],
    });
    await armAndRun(t);

    let pub = pubFor(t.prisma, item.id, IG);
    expect(pub.status).toBe("PENDING");
    expect(pub.attempts).toBe(0); // processing is not a failure
    expect(pub.errorCode).toBe("PROCESSING");
    expect(pub.state.containerId).toBeTruthy();
    expect(pub.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());

    // finish processing, make it due, run again
    t.meta.containers.get(pub.state.containerId)!.status = "FINISHED";
    pub.nextAttemptAt = new Date(Date.now() - 1);
    await t.svc.processMany(await t.svc.findDuePublicationIds(), "scheduler");
    pub = pubFor(t.prisma, item.id, IG);
    expect(pub.status).toBe("PUBLISHED");
    expect(posts(t.meta, `/${IG_ID}/media`)).toHaveLength(1); // no second container
  });

  it("checks content_publishing_limit and defers (no container, no attempt) when the quota is full", async () => {
    const t = setup();
    t.meta.quota = { usage: 100, total: 100 };
    const item = t.prisma.addItem({ clientId: t.internal.id, targets: [IG] });
    await armAndRun(t);
    const pub = pubFor(t.prisma, item.id, IG);
    expect(
      t.meta.calls.some((c) => c.path === `/${IG_ID}/content_publishing_limit`),
    ).toBe(true);
    expect(posts(t.meta, `/${IG_ID}/media`)).toHaveLength(0);
    expect(pub.status).toBe("PENDING");
    expect(pub.errorCode).toBe("PUBLISH_LIMIT_REACHED");
    expect(pub.attempts).toBe(0);
    expect(pub.nextAttemptAt.getTime() - Date.now()).toBeGreaterThan(
      25 * 60_000,
    );
  });

  it("recreates an EXPIRED container instead of publishing it", async () => {
    const t = setup();
    const item = t.prisma.addItem({ clientId: t.internal.id, targets: [IG] });
    await t.svc.armDueItems();
    const pub = pubFor(t.prisma, item.id, IG);
    t.meta.containers.set("555000", {
      status: "EXPIRED",
      polls: 0,
      params: {},
      published: 0,
    });
    pub.state = { containerId: "555000" };
    await t.svc.processPublication(pub.id, "scheduler");
    expect(posts(t.meta, `/${IG_ID}/media`)).toHaveLength(1);
    expect(
      posts(t.meta, `/${IG_ID}/media_publish`)[0].form.get("creation_id"),
    ).not.toBe("555000");
    expect(pubFor(t.prisma, item.id, IG).status).toBe("PUBLISHED");
  });
});

// ============================================================================
// Facebook flows
// ============================================================================

describe("Facebook Page publishing", () => {
  it("publishes a photo with the Page token (url + message) and stores an absolute permalink", async () => {
    const t = setup();
    const item = t.prisma.addItem({ clientId: t.internal.id, targets: [FB] });
    await armAndRun(t);
    const call = posts(t.meta, `/${PAGE_ID}/photos`)[0];
    expect(call.headers.authorization).toBe(`OAuth ${PAGE_TOKEN}`);
    expect(call.form.get("url")).toMatch(/^https:\/\//);
    expect(call.form.get("message")).toBe(item.caption);
    const pub = pubFor(t.prisma, item.id, FB);
    expect(pub.status).toBe("PUBLISHED");
    expect(pub.externalId).toMatch(new RegExp(`^${PAGE_ID}_\\d+$`));
    expect(pub.permalink).toMatch(/^https:\/\/www\.facebook\.com\//);
  });

  it("publishes multiple photos as unpublished photos + one /feed post with attached_media", async () => {
    const t = setup();
    t.prisma.addItem({
      clientId: t.internal.id,
      targets: [FB],
      media: [jpeg(), jpeg({ mimeType: "image/png" })],
    });
    await armAndRun(t);
    const photos = posts(t.meta, `/${PAGE_ID}/photos`);
    expect(photos).toHaveLength(2);
    photos.forEach((p) => expect(p.form.get("published")).toBe("false"));
    const feed = posts(t.meta, `/${PAGE_ID}/feed`)[0];
    expect(
      JSON.parse(feed.form.get("attached_media[0]")!).media_fbid,
    ).toBeTruthy();
    expect(
      JSON.parse(feed.form.get("attached_media[1]")!).media_fbid,
    ).toBeTruthy();
    expect(t.meta.pagePosts[0].kind).toBe("multi");
  });

  it("publishes a feed video via graph-video.facebook.com /{page}/videos with file_url", async () => {
    const t = setup();
    t.prisma.addItem({
      clientId: t.internal.id,
      targets: [FB],
      media: [mp4({ width: 1920, height: 1080 })],
    });
    await armAndRun(t);
    const call = posts(t.meta, `/${PAGE_ID}/videos`)[0];
    expect(call.url.host).toBe("graph-video.facebook.com");
    expect(call.form.get("file_url")).toMatch(/^https:\/\//);
    expect(call.form.get("description")).toBeTruthy();
  });

  it("publishes a reel: start -> rupload (file_url header, built from the video id) -> finish PUBLISHED", async () => {
    const t = setup();
    const item = t.prisma.addItem({
      clientId: t.internal.id,
      targets: [FB],
      format: ContentFormat.REEL,
      media: [mp4()],
    });
    await armAndRun(t);
    const reelCalls = posts(t.meta, `/${PAGE_ID}/video_reels`);
    expect(reelCalls.map((c) => c.form.get("upload_phase"))).toEqual([
      "start",
      "finish",
    ]);
    expect(reelCalls[1].form.get("video_state")).toBe("PUBLISHED");
    expect(reelCalls[1].form.get("description")).toBe(item.caption);
    const upload = t.meta.calls.find((c) =>
      c.path.startsWith("/video-upload/"),
    )!;
    expect(upload.url.host).toBe("rupload.facebook.com");
    expect(upload.headers["file_url"]).toMatch(/^https:\/\//);
    expect(upload.headers.authorization).toBe(`OAuth ${PAGE_TOKEN}`);
    expect(pubFor(t.prisma, item.id, FB).status).toBe("PUBLISHED");
  });

  it("publishes a text post to /feed when there is no media", async () => {
    const t = setup();
    t.prisma.addItem({ clientId: t.internal.id, targets: [FB], media: [] });
    await armAndRun(t);
    expect(posts(t.meta, `/${PAGE_ID}/feed`)).toHaveLength(1);
    expect(t.meta.pagePosts[0].kind).toBe("text");
  });

  it("publishes a photo story (unpublished photo + photo_stories)", async () => {
    const t = setup();
    t.prisma.addItem({
      clientId: t.internal.id,
      targets: [FB],
      format: ContentFormat.STORY,
      media: [jpeg()],
    });
    await armAndRun(t);
    expect(posts(t.meta, `/${PAGE_ID}/photos`)[0].form.get("published")).toBe(
      "false",
    );
    expect(posts(t.meta, `/${PAGE_ID}/photo_stories`)).toHaveLength(1);
  });
});

// ============================================================================
// Page token
// ============================================================================

describe("Page access token", () => {
  it("is derived once with the system user token and cached across publishes", async () => {
    const t = setup();
    t.prisma.addItem({ clientId: t.internal.id, targets: [FB] });
    t.prisma.addItem({ clientId: t.internal.id, targets: [FB], media: [] });
    await armAndRun(t);
    const derive = t.meta.calls.filter(
      (c) =>
        c.path === `/${PAGE_ID}` &&
        c.url.searchParams.get("fields") === "access_token",
    );
    expect(derive).toHaveLength(1);
    expect(derive[0].headers.authorization).toBe(`OAuth ${SYSTEM_TOKEN}`);
    expect(t.prisma.pubs.every((p) => p.status === "PUBLISHED")).toBe(true);
  });

  it("concurrent callers share one derivation request", async () => {
    const t = setup();
    const account = t.accounts.resolve(t.internal as any);
    const tokens = await Promise.all([
      t.accounts.getPageToken(account),
      t.accounts.getPageToken(account),
    ]);
    expect(tokens).toEqual([PAGE_TOKEN, PAGE_TOKEN]);
    expect(t.meta.pageTokenFetches).toBe(1);
  });

  it("is re-derived after Meta rejects it as invalid", async () => {
    const t = setup();
    const account = t.accounts.resolve(t.internal as any);
    await t.accounts.getPageToken(account);
    t.meta.fault((c) => c.method === "POST" && c.path === `/${PAGE_ID}/feed`, {
      kind: "error",
      status: 400,
      code: 190,
    });
    t.prisma.addItem({ clientId: t.internal.id, targets: [FB], media: [] });
    await armAndRun(t);
    expect(t.meta.pageTokenFetches).toBe(2);
    expect(t.prisma.pubs[0].status).toBe("PUBLISHED");
  });
});

// ============================================================================
// Idempotency
// ============================================================================

describe("idempotency", () => {
  it("overlapping workers on the same publication publish exactly once", async () => {
    const t = setup();
    const item = t.prisma.addItem({ clientId: t.internal.id, targets: [IG] });
    await t.svc.armDueItems();
    const id = pubFor(t.prisma, item.id, IG).id;
    const results = await Promise.all([
      t.svc.processPublication(id, "scheduler"),
      t.svc.processPublication(id, "scheduler"),
      t.svc.processPublication(id, "manual"),
    ]);
    expect(results.filter((r) => r === "PUBLISHED")).toHaveLength(1);
    expect(results.filter((r) => r === null)).toHaveLength(2);
    expect(posts(t.meta, `/${IG_ID}/media_publish`)).toHaveLength(1);
  });

  it("two app instances ticking at the same time never double-post", async () => {
    const shared = { prisma: new FakePrisma(), meta: new FakeMeta() };
    const a = setup(ENV, shared);
    const b = setup(ENV, shared);
    shared.prisma.addItem({ clientId: a.internal.id, targets: [IG, FB] });
    shared.prisma.addItem({
      clientId: a.internal.id,
      targets: [IG],
      media: [mp4()],
    });
    await Promise.all([
      a.scheduler.tick(),
      b.scheduler.tick(),
      a.scheduler.tick(),
    ]);
    expect(shared.meta.containers.size).toBe(2);
    expect(
      [...shared.meta.containers.values()].every((c) => c.published === 1),
    ).toBe(true);
    expect(posts(shared.meta, `/${PAGE_ID}/photos`)).toHaveLength(1);
    expect(shared.prisma.pubs.every((p) => p.status === "PUBLISHED")).toBe(
      true,
    );
  });

  it("re-arming an already published item creates nothing new", async () => {
    const t = setup();
    t.prisma.addItem({ clientId: t.internal.id, targets: [IG] });
    await armAndRun(t);
    t.prisma.items[0].status = ContentStatus.SCHEDULED; // pretend someone flipped it back
    await armAndRun(t);
    expect(t.prisma.pubs).toHaveLength(1);
    expect(posts(t.meta, `/${IG_ID}/media_publish`)).toHaveLength(1);
  });

  it("IG media_publish applied but the answer was lost: the retry finds the media instead of re-publishing", async () => {
    const t = setup();
    const item = t.prisma.addItem({ clientId: t.internal.id, targets: [IG] });
    t.meta.fault(
      (c) => c.path === `/${IG_ID}/media_publish`,
      { kind: "timeout" },
      1,
      true,
    );
    await armAndRun(t);
    let pub = pubFor(t.prisma, item.id, IG);
    expect(pub.status).toBe("PENDING");
    expect(pub.errorCode).toBe("VERIFYING");
    expect(pub.requestedAt).toBeInstanceOf(Date);

    pub.nextAttemptAt = new Date(Date.now() - 1);
    await t.svc.processMany(await t.svc.findDuePublicationIds(), "scheduler");
    pub = pubFor(t.prisma, item.id, IG);
    expect(pub.status).toBe("PUBLISHED");
    expect(pub.externalId).toBe(t.meta.igMedia[0].id);
    expect(pub.permalink).toBe(t.meta.igMedia[0].permalink);
    expect(posts(t.meta, `/${IG_ID}/media_publish`)).toHaveLength(1);
  });

  it("IG media_publish timed out before reaching Meta: the retry publishes the same FINISHED container once", async () => {
    const t = setup();
    const item = t.prisma.addItem({ clientId: t.internal.id, targets: [IG] });
    t.meta.fault(
      (c) => c.path === `/${IG_ID}/media_publish`,
      { kind: "timeout" },
      1,
      false,
    );
    await armAndRun(t);
    const pub = pubFor(t.prisma, item.id, IG);
    pub.nextAttemptAt = new Date(Date.now() - 1);
    await t.svc.processMany(await t.svc.findDuePublicationIds(), "scheduler");
    expect(pubFor(t.prisma, item.id, IG).status).toBe("PUBLISHED");
    expect(posts(t.meta, `/${IG_ID}/media`)).toHaveLength(1);
    expect([...t.meta.containers.values()][0].published).toBe(1);
  });

  it("FB photo applied but the answer was lost: the retry adopts the post found in published_posts", async () => {
    const t = setup();
    const item = t.prisma.addItem({ clientId: t.internal.id, targets: [FB] });
    t.meta.fault(
      (c) => c.method === "POST" && c.path === `/${PAGE_ID}/photos`,
      { kind: "timeout" },
      1,
      true,
    );
    await armAndRun(t);
    const pub = pubFor(t.prisma, item.id, FB);
    expect(pub.errorCode).toBe("VERIFYING");
    pub.nextAttemptAt = new Date(Date.now() - 1);
    await t.svc.processMany(await t.svc.findDuePublicationIds(), "scheduler");
    expect(pubFor(t.prisma, item.id, FB).status).toBe("PUBLISHED");
    expect(pubFor(t.prisma, item.id, FB).externalId).toBe(
      t.meta.pagePosts[0].id,
    );
    expect(posts(t.meta, `/${PAGE_ID}/photos`)).toHaveLength(1);
  });

  it("FB outcome unknown and no post found: stops as OUTCOME_UNCERTAIN (no automatic second post); explicit Retry posts", async () => {
    const t = setup();
    const item = t.prisma.addItem({ clientId: t.internal.id, targets: [FB] });
    t.meta.fault(
      (c) => c.method === "POST" && c.path === `/${PAGE_ID}/photos`,
      { kind: "timeout" },
      1,
      false,
    );
    await armAndRun(t);
    let pub = pubFor(t.prisma, item.id, FB);
    pub.nextAttemptAt = new Date(Date.now() - 1);
    await t.svc.processMany(await t.svc.findDuePublicationIds(), "scheduler");
    pub = pubFor(t.prisma, item.id, FB);
    expect(pub.status).toBe("FAILED");
    expect(pub.errorCode).toBe("OUTCOME_UNCERTAIN");
    expect(pub.errorMessage).toMatch(/Periksa/);
    expect(posts(t.meta, `/${PAGE_ID}/photos`)).toHaveLength(1);
    expect(t.prisma.items[0].status).toBe(ContentStatus.FAILED);

    // Publish now without confirming is refused; Retry (= confirmed) posts once.
    await expect(t.svc.requestPublish(item.id, ADMIN)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await t.svc.requestPublish(item.id, ADMIN, { retry: true });
    await new Promise((r) => setImmediate(r));
    await waitFor(() => pubFor(t.prisma, item.id, FB).status === "PUBLISHED");
    expect(posts(t.meta, `/${PAGE_ID}/photos`)).toHaveLength(2);
    expect(t.prisma.items[0].status).toBe(ContentStatus.PUBLISHED);
  });

  it("a worker whose lease was taken over cannot overwrite the new owner's state", async () => {
    const t = setup();
    const item = t.prisma.addItem({ clientId: t.internal.id, targets: [IG] });
    await t.svc.armDueItems();
    const row = pubFor(t.prisma, item.id, IG);
    let hijacked = false;
    // While worker A creates the container, its lease expires and B claims.
    t.meta.fault(
      (c) => {
        if (!hijacked && c.method === "POST" && c.path === `/${IG_ID}/media`) {
          hijacked = true;
          row.lockedUntil = new Date(0);
          void t.svc.claim(row.id);
        }
        return false;
      },
      { kind: "timeout" },
      1,
    );
    const res = await t.svc.processPublication(row.id, "scheduler");
    expect(res).toBeNull();
    const now = pubFor(t.prisma, item.id, IG);
    expect(now.status).toBe("PUBLISHING"); // still owned by B
    expect(now.state).toBeNull(); // A's container id was not written
    expect(posts(t.meta, `/${IG_ID}/media_publish`)).toHaveLength(0);
  });
});

// ============================================================================
// Retries and error mapping
// ============================================================================

describe("retries and errors", () => {
  it("transient errors back off exponentially and fail after MAX_ATTEMPTS", async () => {
    const t = setup();
    // Container creation is idempotent-safe, so a "service unavailable" there is a plain retry.
    const item = t.prisma.addItem({ clientId: t.internal.id, targets: [IG] });
    t.meta.fault(
      (c) => c.method === "POST" && c.path === `/${IG_ID}/media`,
      { kind: "error", status: 503, code: 2 },
      99,
    );
    const delays: number[] = [];
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      if (i === 0) await t.svc.armDueItems();
      const pub = pubFor(t.prisma, item.id, IG);
      pub.nextAttemptAt = null;
      const before = Date.now();
      await t.svc.processPublication(pub.id, "scheduler");
      const after = pubFor(t.prisma, item.id, IG);
      if (after.nextAttemptAt)
        delays.push(after.nextAttemptAt.getTime() - before);
    }
    const pub = pubFor(t.prisma, item.id, IG);
    expect(pub.status).toBe("FAILED");
    expect(pub.attempts).toBe(MAX_ATTEMPTS);
    expect(pub.errorCode).toBe("META_TRANSIENT");
    expect(delays).toHaveLength(MAX_ATTEMPTS - 1);
    expect(delays[1]).toBeGreaterThan(delays[0] * 1.8);
    expect(delays[2]).toBeGreaterThan(delays[1] * 1.8);
    expect(posts(t.meta, `/${IG_ID}/media`)).toHaveLength(MAX_ATTEMPTS);
    expect(posts(t.meta, `/${IG_ID}/media_publish`)).toHaveLength(0);
  });

  it("an ambiguous 5xx on a Page post is verified, then stops as uncertain instead of re-posting", async () => {
    const t = setup();
    const item = t.prisma.addItem({
      clientId: t.internal.id,
      targets: [FB],
      media: [],
    });
    t.meta.fault(
      (c) => c.method === "POST" && c.path === `/${PAGE_ID}/feed`,
      { kind: "error", status: 500, code: 2 },
      99,
    );
    await armAndRun(t);
    expect(pubFor(t.prisma, item.id, FB).errorCode).toBe("VERIFYING");
    pubFor(t.prisma, item.id, FB).nextAttemptAt = null;
    await t.svc.processPublication(
      pubFor(t.prisma, item.id, FB).id,
      "scheduler",
    );
    expect(pubFor(t.prisma, item.id, FB).status).toBe("FAILED");
    expect(pubFor(t.prisma, item.id, FB).errorCode).toBe("OUTCOME_UNCERTAIN");
    expect(posts(t.meta, `/${PAGE_ID}/feed`)).toHaveLength(1);
  });

  it("permission errors fail immediately with an actionable message", async () => {
    const t = setup();
    const item = t.prisma.addItem({ clientId: t.internal.id, targets: [IG] });
    t.meta.fault((c) => c.method === "POST" && c.path === `/${IG_ID}/media`, {
      kind: "error",
      status: 403,
      code: 10,
      message: "(#10) Application does not have permission for this action",
    });
    await armAndRun(t);
    const pub = pubFor(t.prisma, item.id, IG);
    expect(pub.status).toBe("FAILED");
    expect(pub.errorCode).toBe("PERMISSION_DENIED");
    expect(pub.errorMessage).toMatch(/instagram_content_publish/);
    expect(pub.attempts).toBe(1);
  });

  it("maps an invalid aspect ratio (2207009) to MEDIA_INVALID", async () => {
    const t = setup();
    const item = t.prisma.addItem({
      clientId: t.internal.id,
      targets: [IG],
      media: [jpeg({ width: null, height: null })],
    });
    t.meta.fault((c) => c.method === "POST" && c.path === `/${IG_ID}/media`, {
      kind: "error",
      status: 400,
      code: 36003,
      subcode: 2207009,
    });
    await armAndRun(t);
    const pub = pubFor(t.prisma, item.id, IG);
    expect(pub.status).toBe("FAILED");
    expect(pub.errorCode).toBe("MEDIA_INVALID");
    expect(pub.errorMessage).toMatch(/aspect ratio/);
  });

  it("media fetch failures are retried", async () => {
    const t = setup();
    const item = t.prisma.addItem({ clientId: t.internal.id, targets: [IG] });
    t.meta.fault((c) => c.method === "POST" && c.path === `/${IG_ID}/media`, {
      kind: "error",
      status: 400,
      code: 9004,
      subcode: 2207052,
    });
    await armAndRun(t);
    const pub = pubFor(t.prisma, item.id, IG);
    expect(pub.status).toBe("PENDING");
    expect(pub.errorCode).toBe("MEDIA_FETCH_FAILED");
  });

  it("invalid media is rejected before calling Meta (PNG to Instagram)", async () => {
    const t = setup();
    const item = t.prisma.addItem({
      clientId: t.internal.id,
      targets: [IG],
      media: [jpeg({ mimeType: "image/png" })],
    });
    await armAndRun(t);
    const pub = pubFor(t.prisma, item.id, IG);
    expect(pub.status).toBe("FAILED");
    expect(pub.errorCode).toBe("VALIDATION");
    expect(pub.errorMessage).toMatch(/JPEG/);
    expect(t.meta.calls.filter((c) => c.method === "POST")).toHaveLength(0);
  });
});

// ============================================================================
// Guards, partial failure, rollup
// ============================================================================

describe("guards and per-platform status", () => {
  it("never arms or publishes for a non-internal client", async () => {
    const t = setup();
    const acme = t.prisma.addClient(false);
    const item = t.prisma.addItem({ clientId: acme.id, targets: [IG, FB] });
    await armAndRun(t);
    expect(t.prisma.pubs).toHaveLength(0);

    // Even a row inserted by other means is refused server-side without calling Meta.
    await t.prisma.socialPublication.create({
      data: { contentId: item.id, platform: IG },
    });
    const row = t.prisma.pubs[0];
    await t.svc.processPublication(row.id, "manual");
    expect(row.status).toBe("FAILED");
    expect(row.errorCode).toBe("NOT_INTERNAL_CLIENT");
    expect(t.meta.calls).toHaveLength(0);
    await expect(
      t.svc.requestPublish(item.id, ADMIN, { targets: [IG] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("only admins may publish now", async () => {
    const t = setup();
    const item = t.prisma.addItem({ clientId: t.internal.id, targets: [IG] });
    await expect(
      t.svc.requestPublish(
        item.id,
        { id: "v1", role: UserRole.VIDEOGRAPHER },
        { targets: [IG] },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(t.prisma.pubs).toHaveLength(0);
  });

  it("validates media before accepting Publish now", async () => {
    const t = setup();
    const item = t.prisma.addItem({
      clientId: t.internal.id,
      targets: [IG],
      media: [],
    });
    await expect(
      t.svc.requestPublish(item.id, ADMIN, { targets: [IG] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("does nothing and says so when Meta is not configured", async () => {
    const t = setup({} as NodeJS.ProcessEnv);
    const item = t.prisma.addItem({ clientId: t.internal.id, targets: [IG] });
    expect(await t.scheduler.tick()).toBeNull();
    expect(t.svc.status()).toMatchObject({
      configured: false,
      state: "not_configured",
    });
    await expect(
      t.svc.requestPublish(item.id, ADMIN, { targets: [IG] }),
    ).rejects.toThrow(/not configured|belum dikonfigurasi/);
  });

  it("tracks per-platform status: IG published, FB failed -> item FAILED; retrying FB publishes only FB", async () => {
    const t = setup();
    const item = t.prisma.addItem({
      clientId: t.internal.id,
      targets: [IG, FB],
    });
    t.meta.fault(
      (c) => c.method === "POST" && c.path === `/${PAGE_ID}/photos`,
      {
        kind: "error",
        status: 403,
        code: 200,
        message:
          "(#200) The user hasn't authorized the application to perform this action",
      },
    );
    await armAndRun(t);
    expect(pubFor(t.prisma, item.id, IG).status).toBe("PUBLISHED");
    expect(pubFor(t.prisma, item.id, FB).status).toBe("FAILED");
    expect(t.prisma.items[0].status).toBe(ContentStatus.FAILED);

    const res = await t.svc.requestPublish(item.id, ADMIN, { retry: true });
    const byPlatform = Object.fromEntries(
      res.map((p: any) => [p.platform, p.status]),
    );
    expect(byPlatform.INSTAGRAM).toBe("PUBLISHED");
    expect(["PENDING", "PUBLISHING"]).toContain(byPlatform.FACEBOOK); // background run may have claimed it
    await waitFor(() => pubFor(t.prisma, item.id, FB).status === "PUBLISHED");
    expect(t.prisma.items[0].status).toBe(ContentStatus.PUBLISHED);
    expect(posts(t.meta, `/${IG_ID}/media_publish`)).toHaveLength(1);
  });

  it("cancels instead of posting when the item was marked published manually", async () => {
    const t = setup();
    const item = t.prisma.addItem({ clientId: t.internal.id, targets: [IG] });
    await t.svc.armDueItems();
    t.prisma.items[0].status = ContentStatus.PUBLISHED;
    await t.svc.processMany(await t.svc.findDuePublicationIds(), "scheduler");
    expect(pubFor(t.prisma, item.id, IG).errorCode).toBe("CANCELLED");
    expect(t.meta.calls.filter((c) => c.method === "POST")).toHaveLength(0);
  });

  it("does not arm items whose time has not come or that are not auto-publish", async () => {
    const t = setup();
    t.prisma.addItem({
      clientId: t.internal.id,
      scheduledAt: new Date(Date.now() + 3600_000),
    });
    t.prisma.addItem({ clientId: t.internal.id, autoPublish: false });
    t.prisma.addItem({ clientId: t.internal.id, status: ContentStatus.DRAFT });
    expect(await t.svc.armDueItems()).toBe(0);
  });
});

// ============================================================================
// Secrets
// ============================================================================

describe("tokens are never logged, stored or returned", () => {
  it("across successful, failing and checking flows", async () => {
    const out: string[] = [];
    const spies = [
      jest
        .spyOn(process.stdout, "write")
        .mockImplementation((chunk: any) => (out.push(String(chunk)), true)),
      jest
        .spyOn(process.stderr, "write")
        .mockImplementation((chunk: any) => (out.push(String(chunk)), true)),
      ...(["log", "warn", "error", "info", "debug"] as const).map((m) =>
        jest
          .spyOn(console, m)
          .mockImplementation(
            (...a: any[]) => void out.push(a.map(String).join(" ")),
          ),
      ),
    ];
    try {
      const t = setup();
      t.prisma.addItem({ clientId: t.internal.id, targets: [IG, FB] });
      t.prisma.addItem({
        clientId: t.internal.id,
        targets: [FB],
        format: ContentFormat.REEL,
        media: [mp4()],
      });
      // Meta echoing a token in an error message must still not leak it.
      t.meta.fault(
        (c) => c.method === "POST" && c.path === `/${PAGE_ID}/photos`,
        {
          kind: "error",
          status: 400,
          code: 100,
          message: `Invalid parameter for token ${PAGE_TOKEN} and ${SYSTEM_TOKEN}`,
        },
      );
      await armAndRun(t);
      const status = t.svc.status();
      const check = await t.svc.checkConnection(true);

      const everything = [
        out.join("\n"),
        JSON.stringify(t.prisma.pubs),
        JSON.stringify(t.prisma.audits),
        JSON.stringify(status),
        JSON.stringify(check),
      ].join("\n");
      for (const secret of [SYSTEM_TOKEN, PAGE_TOKEN])
        expect(everything).not.toContain(secret);
      // Tokens travel only in the Authorization header, never in URL or body.
      for (const c of t.meta.calls) {
        expect(c.url.toString()).not.toMatch(/EAA/);
        expect(c.raw).not.toMatch(/EAA/);
        expect(c.headers.authorization).toMatch(/^OAuth EAA/);
      }
      expect(check).toMatchObject({
        ok: true,
        tokenValid: true,
        pageTokenOk: true,
        instagram: { username: "monomi.agency", matchesConfig: true },
      });
    } finally {
      spies.forEach((s) => s.mockRestore());
    }
  });
});

async function waitFor(cond: () => boolean, ms = 2000) {
  const end = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > end) throw new Error("waitFor timed out");
    await new Promise((r) => setTimeout(r, 5));
  }
}
