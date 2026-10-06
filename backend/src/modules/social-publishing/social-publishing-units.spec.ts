import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { ContentFormat, ContentPlatform, UserRole } from "@prisma/client";
import { createHmac } from "crypto";
import { MediaService } from "../media/media.service";
import { MetaGraphClient, MetaGraphError } from "./meta-graph.client";
import { MediaUrlSigner, SIGNED_URL_TTL_SECONDS } from "./media-url.signer";
import {
  loadSocialPublishingConfig,
  looksLikeTokenPlaceholder,
} from "./social-publishing.config";
import {
  planFacebook,
  planInstagram,
  PlanItem,
  validateForTargets,
} from "./publish-plan";
import { safePermalink } from "./publish-context";
import { MSG, publishErrorFromGraph } from "./publish-errors";
import { GraphApiError } from "../instagram/instagram-graph.client";
import { AutoPublishPolicy } from "./auto-publish.policy";
import { MetaAccountsService } from "./meta-accounts.service";
import { safeCdnUrl } from "./social-publishing.service";
import {
  FakePrisma,
  IG_ID,
  jpeg,
  json,
  mp4,
  PAGE_ID,
  SYSTEM_TOKEN,
} from "./testing/social-fakes.helper-spec";

const ENV = {
  META_SYSTEM_USER_TOKEN: SYSTEM_TOKEN,
  META_PAGE_ID: PAGE_ID,
  META_IG_USER_ID: IG_ID,
} as unknown as NodeJS.ProcessEnv;

// ============================================================================
describe("loadSocialPublishingConfig", () => {
  it("is 'not configured' (and the app boots) when nothing is set", () => {
    expect(loadSocialPublishingConfig({} as any)).toEqual({
      status: "not_configured",
      missing: ["META_SYSTEM_USER_TOKEN", "META_PAGE_ID", "META_IG_USER_ID"],
    });
  });

  it("treats empty docker-compose passthroughs as unset", () => {
    expect(
      loadSocialPublishingConfig({
        META_SYSTEM_USER_TOKEN: "",
        META_PAGE_ID: " ",
        META_IG_USER_ID: "",
      } as any).status,
    ).toBe("not_configured");
  });

  it("is invalid (feature off, no crash) when only some values are set", () => {
    const s = loadSocialPublishingConfig({ META_PAGE_ID: PAGE_ID } as any);
    expect(s).toMatchObject({ status: "invalid" });
    expect((s as any).reason).toMatch(/META_SYSTEM_USER_TOKEN/);
  });

  it("rejects placeholders and malformed ids without echoing the token", () => {
    const s = loadSocialPublishingConfig({
      ...ENV,
      META_SYSTEM_USER_TOKEN: "your-system-user-token-here-please-change",
    } as any);
    expect(s.status).toBe("invalid");
    expect(JSON.stringify(s)).not.toContain("your-system-user-token");
    expect(
      loadSocialPublishingConfig({ ...ENV, META_PAGE_ID: "monomi" } as any)
        .status,
    ).toBe("invalid");
    expect(
      loadSocialPublishingConfig({ ...ENV, META_IG_USER_ID: "@monomi" } as any)
        .status,
    ).toBe("invalid");
    expect(
      loadSocialPublishingConfig({ ...ENV, META_GRAPH_VERSION: "26" } as any)
        .status,
    ).toBe("invalid");
    expect(
      loadSocialPublishingConfig({
        ...ENV,
        META_SYSTEM_APP_SECRET: "nope",
      } as any).status,
    ).toBe("invalid");
  });

  it("does not flag random tokens that merely contain common substrings", () => {
    expect(
      looksLikeTokenPlaceholder(
        `EAAG${"x1".repeat(10)}todo12345678dummy${"Zq".repeat(40)}`,
      ),
    ).toBe(false);
    expect(looksLikeTokenPlaceholder("<paste token>")).toBe(true);
  });

  it("defaults to graph.facebook.com and v26.0", () => {
    const s = loadSocialPublishingConfig(ENV);
    expect(s.status).toBe("configured");
    const c = (s as any).config;
    expect(c.graphVersion).toBe("v26.0");
    expect(c.graphBaseUrl).toBe("https://graph.facebook.com");
    expect(c.graphVideoBaseUrl).toBe("https://graph-video.facebook.com");
    expect(c.ruploadBaseUrl).toBe("https://rupload.facebook.com");
    expect(c.schedulerEnabled).toBe(true);
  });

  it("honours the dev-only base URL override outside production and ignores it in production", () => {
    const dev = loadSocialPublishingConfig({
      ...ENV,
      META_GRAPH_BASE_URL: "http://localhost:5499/",
    } as any) as any;
    expect(dev.config.graphBaseUrl).toBe("http://localhost:5499");
    const prod = loadSocialPublishingConfig({
      ...ENV,
      NODE_ENV: "production",
      META_GRAPH_BASE_URL: "http://localhost:5499",
    } as any) as any;
    expect(prod.config.graphBaseUrl).toBe("https://graph.facebook.com");
    expect(prod.config.ruploadBaseUrl).toBe("https://rupload.facebook.com");
  });

  it("has a scheduler kill switch", () => {
    expect(
      (
        loadSocialPublishingConfig({
          ...ENV,
          META_AUTOPUBLISH_ENABLED: "false",
        } as any) as any
      ).config.schedulerEnabled,
    ).toBe(false);
  });
});

// ============================================================================
describe("MetaGraphClient", () => {
  it("sends the token only in the Authorization header and adds appsecret_proof when configured", async () => {
    const fetch = jest.fn(async () => json(200, { ok: true }));
    const client = new MetaGraphClient(fetch as any);
    await client.call(
      "https://graph.facebook.com/v26.0/me",
      SYSTEM_TOKEN,
      { query: { fields: "id" } },
      "a".repeat(32),
    );
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).not.toContain(SYSTEM_TOKEN);
    expect(url).toContain(
      `appsecret_proof=${createHmac("sha256", "a".repeat(32)).update(SYSTEM_TOKEN).digest("hex")}`,
    );
    expect((init.headers as any).Authorization).toBe(`OAuth ${SYSTEM_TOKEN}`);
    expect(init.redirect).toBe("error");
    expect(init.signal).toBeDefined();
  });

  it("marks a POST timeout as ambiguous but a GET timeout as not", async () => {
    const fetch = jest.fn(async () => {
      const e = new Error("aborted");
      e.name = "TimeoutError";
      throw e;
    });
    const client = new MetaGraphClient(fetch as any);
    const post = await client
      .call("https://graph.facebook.com/v26.0/1/feed", "t".repeat(50), {
        form: { message: "x" },
      })
      .catch((e) => e);
    const get = await client
      .call("https://graph.facebook.com/v26.0/1", "t".repeat(50))
      .catch((e) => e);
    expect(post).toBeInstanceOf(MetaGraphError);
    expect(post.ambiguous).toBe(true);
    expect(post.kind).toBe("transient");
    expect(get.ambiguous).toBe(false);
  });

  it("classifies Meta errors and scrubs tokens from their messages", async () => {
    const fetch = jest.fn(async () =>
      json(400, {
        error: {
          message: `Bad token ${SYSTEM_TOKEN}`,
          type: "OAuthException",
          code: 190,
        },
      }),
    );
    const err = await new MetaGraphClient(fetch as any)
      .call("https://graph.facebook.com/v26.0/me", SYSTEM_TOKEN)
      .catch((e) => e);
    expect(err.kind).toBe("token");
    expect(err.ambiguous).toBe(false);
    expect(err.message).not.toContain(SYSTEM_TOKEN);
  });
});

// ============================================================================
describe("MediaUrlSigner (real R2 presigner, no network)", () => {
  const config = (over: Record<string, string | undefined> = {}) =>
    ({
      get: (k: string) =>
        ({
          R2_ACCESS_KEY_ID: "AKIAEXAMPLEACCESSKEY",
          R2_SECRET_ACCESS_KEY: "r2-secret-access-key-for-tests-only-0000",
          R2_ENDPOINT: "https://0123456789abcdef.r2.cloudflarestorage.com",
          R2_BUCKET_NAME: "content-media",
          ...over,
        })[k],
    }) as any;

  it("produces an HTTPS, single-object, SigV4 URL that expires after the TTL", async () => {
    const signer = new MediaUrlSigner(new MediaService(config()));
    const key = "content/2026-10-06/abcd1234-photo.jpg";
    const url = new URL(await signer.sign(key));
    expect(url.protocol).toBe("https:");
    expect(url.hostname).toMatch(/r2\.cloudflarestorage\.com$/);
    expect(decodeURIComponent(url.pathname)).toContain(key);
    expect(url.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256");
    expect(url.searchParams.get("X-Amz-Expires")).toBe(
      String(SIGNED_URL_TTL_SECONDS),
    );
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[a-f0-9]{64}$/);
    expect(url.toString()).not.toContain("r2-secret-access-key");
    const signedAt = url.searchParams.get("X-Amz-Date")!; // 20261006T131500Z
    const t = Date.parse(
      signedAt.replace(
        /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/,
        "$1-$2-$3T$4:$5:$6Z",
      ),
    );
    expect(Math.abs(t - Date.now())).toBeLessThan(60_000);
  });

  it("clamps the TTL (min 15 min, max 6 h)", async () => {
    const signer = new MediaUrlSigner(new MediaService(config()));
    expect(
      new URL(await signer.sign("a.jpg", 10)).searchParams.get("X-Amz-Expires"),
    ).toBe("900");
    expect(
      new URL(await signer.sign("a.jpg", 7 * 86400)).searchParams.get(
        "X-Amz-Expires",
      ),
    ).toBe("21600");
  });

  it("refuses when R2 is not configured, for http endpoints and for traversal keys", async () => {
    await expect(
      new MediaUrlSigner(
        new MediaService(config({ R2_ENDPOINT: undefined })),
      ).sign("a.jpg"),
    ).rejects.toMatchObject({
      code: "MEDIA_STORAGE_UNAVAILABLE",
    });
    await expect(
      new MediaUrlSigner(
        new MediaService(config({ R2_ENDPOINT: "http://minio.local:9000" })),
      ).sign("a.jpg"),
    ).rejects.toMatchObject({ code: "MEDIA_STORAGE_UNAVAILABLE" });
    const signer = new MediaUrlSigner(new MediaService(config()));
    await expect(signer.sign("../secrets.txt")).rejects.toMatchObject({
      code: "MEDIA_INVALID",
    });
    await expect(signer.sign("/abs.jpg")).rejects.toMatchObject({
      code: "MEDIA_INVALID",
    });
  });
});

// ============================================================================
const item = (
  format: ContentFormat,
  media: any[],
  caption = "Halo",
): PlanItem => ({
  caption,
  format,
  media: media.map((m, i) => ({ id: `m${i}`, order: i, ...m })),
});

describe("publish plan / media validation", () => {
  it("maps formats to Instagram flows", () => {
    expect(planInstagram(item(ContentFormat.FEED, [jpeg()])).plan?.kind).toBe(
      "IMAGE",
    );
    expect(planInstagram(item(ContentFormat.FEED, [mp4()])).plan?.kind).toBe(
      "REELS",
    );
    expect(planInstagram(item(ContentFormat.REEL, [mp4()])).plan?.kind).toBe(
      "REELS",
    );
    expect(
      planInstagram(item(ContentFormat.STORY, [mp4({ duration: 15 })])).plan,
    ).toMatchObject({ kind: "STORY", video: true });
    expect(
      planInstagram(item(ContentFormat.FEED, [jpeg(), jpeg()])).plan?.kind,
    ).toBe("CAROUSEL");
  });

  it("rejects what Instagram would reject, with bilingual reasons", () => {
    const png = planInstagram(
      item(ContentFormat.FEED, [jpeg({ mimeType: "image/png" })]),
    );
    expect(png.plan).toBeNull();
    expect(png.errors[0]).toMatch(/JPEG.*\/.*JPEG/);
    expect(
      planInstagram(
        item(ContentFormat.FEED, [jpeg({ width: 1080, height: 1920 })]),
      ).errors.join(),
    ).toMatch(/4:5/);
    expect(
      planInstagram(
        item(ContentFormat.FEED, [jpeg({ width: 2000, height: 1000 })]),
      ).errors.join(),
    ).toMatch(/1.91/);
    expect(
      planInstagram(
        item(ContentFormat.FEED, [jpeg({ size: 9 * 1024 * 1024 })]),
      ).errors.join(),
    ).toMatch(/8 MB/);
    expect(
      planInstagram(
        item(
          ContentFormat.FEED,
          Array.from({ length: 11 }, () => jpeg()),
        ),
      ).errors.join(),
    ).toMatch(/10/);
    expect(
      planInstagram(item(ContentFormat.REEL, [jpeg()])).errors.join(),
    ).toMatch(/video/i);
    expect(
      planInstagram(
        item(ContentFormat.STORY, [mp4({ duration: 75 })]),
      ).errors.join(),
    ).toMatch(/60/);
    expect(
      planInstagram(
        item(ContentFormat.FEED, [mp4({ duration: 2 })]),
      ).errors.join(),
    ).toMatch(/3/);
    expect(
      planInstagram(
        item(ContentFormat.FEED, [mp4({ mimeType: "video/webm" })]),
      ).errors.join(),
    ).toMatch(/MP4/);
    expect(planInstagram(item(ContentFormat.FEED, [])).errors.join()).toMatch(
      /minimal satu/,
    );
    const tags = Array.from({ length: 31 }, (_, i) => `#t${i}`).join(" ");
    expect(
      planInstagram(item(ContentFormat.FEED, [jpeg()], tags)).errors.join(),
    ).toMatch(/30 hashtag/);
    expect(
      planInstagram(
        item(ContentFormat.FEED, [jpeg()], "x".repeat(2201)),
      ).errors.join(),
    ).toMatch(/2.200/);
  });

  it("accepts the edges of the Instagram feed ratio range and unknown dimensions", () => {
    expect(
      planInstagram(
        item(ContentFormat.FEED, [jpeg({ width: 1080, height: 1350 })]),
      ).errors,
    ).toEqual([]);
    expect(
      planInstagram(
        item(ContentFormat.FEED, [jpeg({ width: 1910, height: 1000 })]),
      ).errors,
    ).toEqual([]);
    expect(
      planInstagram(
        item(ContentFormat.FEED, [jpeg({ width: null, height: null })]),
      ).errors,
    ).toEqual([]);
  });

  it("maps formats to Facebook flows and rejects unsupported combinations", () => {
    expect(planFacebook(item(ContentFormat.FEED, [])).plan?.kind).toBe("TEXT");
    expect(
      planFacebook(item(ContentFormat.FEED, [jpeg({ mimeType: "image/png" })]))
        .plan?.kind,
    ).toBe("PHOTO");
    expect(
      planFacebook(item(ContentFormat.FEED, [jpeg(), jpeg()])).plan?.kind,
    ).toBe("MULTI_PHOTO");
    expect(planFacebook(item(ContentFormat.FEED, [mp4()])).plan?.kind).toBe(
      "VIDEO",
    );
    expect(planFacebook(item(ContentFormat.REEL, [mp4()])).plan?.kind).toBe(
      "REEL",
    );
    expect(planFacebook(item(ContentFormat.STORY, [jpeg()])).plan?.kind).toBe(
      "PHOTO_STORY",
    );
    expect(planFacebook(item(ContentFormat.STORY, [mp4()])).plan?.kind).toBe(
      "VIDEO_STORY",
    );
    expect(
      planFacebook(item(ContentFormat.FEED, [jpeg(), mp4()])).errors.join(),
    ).toMatch(/multi-foto/);
    expect(
      planFacebook(
        item(ContentFormat.REEL, [mp4({ width: 1920, height: 1080 })]),
      ).errors.join(),
    ).toMatch(/9:16/);
    expect(
      planFacebook(
        item(ContentFormat.REEL, [mp4({ duration: 120 })]),
      ).errors.join(),
    ).toMatch(/90/);
    expect(
      planFacebook(item(ContentFormat.FEED, [], "  ")).errors.join(),
    ).toMatch(/caption/);
    expect(
      planFacebook(
        item(ContentFormat.FEED, [jpeg({ mimeType: "image/webp" })]),
      ).errors.join(),
    ).toMatch(/JPG atau PNG/);
  });

  it("prefixes errors per platform and refuses other platforms", () => {
    const errs = validateForTargets(
      item(ContentFormat.FEED, [jpeg({ mimeType: "image/png" })]),
      [
        ContentPlatform.INSTAGRAM,
        ContentPlatform.FACEBOOK,
        ContentPlatform.TIKTOK,
      ],
    );
    expect(errs[0]).toMatch(/^Instagram: /);
    expect(errs.some((e) => e.startsWith("Facebook"))).toBe(false); // PNG is fine on FB
    expect(errs.join()).toMatch(/TIKTOK/);
  });
});

// ============================================================================
describe("link safety", () => {
  it("only stores https permalinks on Meta domains", () => {
    expect(safePermalink("/1122/posts/33")).toBe(
      "https://www.facebook.com/1122/posts/33",
    );
    expect(safePermalink("https://www.instagram.com/p/abc/")).toBe(
      "https://www.instagram.com/p/abc/",
    );
    expect(safePermalink("javascript:alert(1)")).toBeNull();
    expect(safePermalink("https://evil.example/instagram.com")).toBeNull();
    expect(safePermalink("https://instagram.com.evil.example/")).toBeNull();
    expect(safePermalink("http://www.facebook.com/x")).toBeNull();
  });

  it("only passes avatar URLs from Meta CDNs", () => {
    expect(safeCdnUrl("https://scontent.xx.fbcdn.net/a.jpg")).toBeTruthy();
    expect(safeCdnUrl("https://evil.example/a.jpg")).toBeNull();
    expect(safeCdnUrl("data:image/png;base64,AAA")).toBeNull();
  });
});

// ============================================================================
describe("AutoPublishPolicy (content calendar edits)", () => {
  function policy(env: NodeJS.ProcessEnv = ENV) {
    const prisma = new FakePrisma();
    const accounts = new MetaAccountsService(
      new MetaGraphClient(jest.fn() as any),
      loadSocialPublishingConfig(env),
    );
    return { prisma, p: new AutoPublishPolicy(prisma as any, accounts) };
  }
  const goodItem = item(ContentFormat.FEED, [jpeg()]);

  it("lets an admin enable auto-publish for the internal client and normalises targets", async () => {
    const { prisma, p } = policy();
    const monomi = prisma.addClient(true);
    await expect(
      p.validateEnable({
        userRole: UserRole.ADMIN,
        clientId: monomi.id,
        targets: ["INSTAGRAM", "INSTAGRAM", "FACEBOOK"],
        item: goodItem,
      }),
    ).resolves.toEqual(["INSTAGRAM", "FACEBOOK"]);
  });

  it("refuses non-admins, non-internal clients, empty / unsupported targets, invalid media and missing config", async () => {
    const { prisma, p } = policy();
    const monomi = prisma.addClient(true);
    const acme = prisma.addClient(false);
    const base = {
      userRole: UserRole.ADMIN,
      clientId: monomi.id,
      targets: ["INSTAGRAM"],
      item: goodItem,
    };
    await expect(
      p.validateEnable({ ...base, userRole: UserRole.VIDEOGRAPHER }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      p.validateEnable({ ...base, clientId: acme.id }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      p.validateEnable({ ...base, targets: [] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      p.validateEnable({ ...base, targets: ["TIKTOK"] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    const bad = await p
      .validateEnable({
        ...base,
        item: item(ContentFormat.FEED, [jpeg({ mimeType: "image/webp" })]),
      })
      .catch((e) => e);
    expect(bad).toBeInstanceOf(BadRequestException);
    expect(JSON.stringify(bad.getResponse())).toMatch(/JPEG/);

    const unconfigured = policy({} as any);
    const m2 = unconfigured.prisma.addClient(true);
    await expect(
      unconfigured.p.validateEnable({ ...base, clientId: m2.id }),
    ).rejects.toThrow(/belum dikonfigurasi/);
  });

  it("blocks non-admin edits of auto-publish items and any edit while publishing", async () => {
    const { prisma, p } = policy();
    const monomi = prisma.addClient(true);
    const it = prisma.addItem({ clientId: monomi.id });
    await expect(
      p.assertModifiable(it as any, UserRole.VIDEOGRAPHER),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      p.assertModifiable(it as any, UserRole.ADMIN),
    ).resolves.toBeUndefined();
    await prisma.socialPublication.create({
      data: {
        contentId: it.id,
        platform: "INSTAGRAM",
        status: "PUBLISHING",
        lockedUntil: new Date(Date.now() + 60_000),
      },
    });
    await expect(
      p.assertModifiable(it as any, UserRole.ADMIN),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("resets unpublished state but keeps published and outcome-uncertain rows", async () => {
    const { prisma, p } = policy();
    const monomi = prisma.addClient(true);
    const a = prisma.addItem({ clientId: monomi.id });
    const mk = (
      platform: string,
      status: string,
      requestedAt: Date | null = null,
    ) =>
      prisma.socialPublication.create({
        data: { contentId: a.id, platform, status, requestedAt },
      });
    await mk("INSTAGRAM", "PUBLISHED");
    await mk("FACEBOOK", "FAILED", new Date());
    await p.resetUnpublished(a.id);
    expect(prisma.pubs).toHaveLength(2);
    prisma.pubs = [];
    await mk("INSTAGRAM", "PENDING");
    await mk("FACEBOOK", "FAILED");
    await p.resetUnpublished(a.id);
    expect(prisma.pubs).toHaveLength(0);
  });
});

describe("publish error messages (localized by the UI via errorCode)", () => {
  it("keeps the raw Meta detail on its own line after the bilingual headline", () => {
    const e = publishErrorFromGraph(new GraphApiError("x", "other", 400, 100, 2207009));
    expect(e.code).toBe("MEDIA_INVALID");
    const [head, detail] = e.message.split("\n");
    expect(head).toBe("Media ditolak Meta / Media rejected by Meta");
    expect(detail).toMatch(/aspect ratio/);
  });

  it("uses its own code for Facebook duplicate posts and no detail line for fixed messages", () => {
    const e = publishErrorFromGraph(new GraphApiError("dup", "other", 400, 506));
    expect(e.code).toBe("DUPLICATE_POST");
    expect(e.message).toBe(MSG.duplicate);
    expect(MSG.publishLimit(5, 100)).toContain("\n5/100");
    expect(MSG.publishLimit()).not.toContain("\n");
  });
});
