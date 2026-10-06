import { ContentFormat, ContentPlatform } from "@prisma/client";

/**
 * Pure validation + planning: which Meta flow a content item maps to, and
 * every reason it cannot be published, BEFORE anything is sent to Meta.
 *
 * Specs (Meta docs, Graph API v25/v26, checked 2026-10):
 *  Instagram (POST /{ig-user-id}/media):
 *   - images: JPEG only, <= 8 MB, feed aspect ratio 4:5 .. 1.91:1;
 *   - single feed video: published as REELS (media_type=VIDEO is gone for
 *     feed), share_to_feed=true;
 *   - reels: MP4/MOV, <= 300 MB, 3 s .. 15 min, ratio 0.01:1 .. 10:1 (9:16 rec.);
 *   - stories: JPEG <= 8 MB or video MP4/MOV <= 100 MB, 3 .. 60 s;
 *   - carousel: 2 .. 10 images/videos (the planner allows 20; the API 10);
 *   - caption <= 2,200 chars, <= 30 hashtags, <= 20 @mentions.
 *  Facebook Page:
 *   - photos (POST /{page-id}/photos url=): JPEG/PNG/GIF/BMP/TIFF, <= 10 MB;
 *   - multi-photo (unpublished photos + /feed attached_media): images only;
 *   - video (POST graph-video /{page-id}/videos file_url=): MP4/MOV <= 1 GB;
 *   - reels (/{page-id}/video_reels): 9:16, >= 540x960, 3 .. 90 s;
 *   - stories: photo (/photo_stories) or video (/video_stories, 9:16, 3 .. 90 s);
 *   - text only: POST /{page-id}/feed message=.
 * Width/height/duration are checked when known (sent by the uploader);
 * otherwise Meta validates and its error is mapped to a clear message.
 */

export const AUTO_PUBLISH_PLATFORMS: ContentPlatform[] = [
  ContentPlatform.INSTAGRAM,
  ContentPlatform.FACEBOOK,
];

export interface PlanMedia {
  id: string;
  key: string;
  type: string; // MediaType
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  order: number;
}

export interface PlanItem {
  caption: string;
  format: ContentFormat;
  media: PlanMedia[];
}

export type IgPlan =
  | { kind: "IMAGE"; media: PlanMedia }
  | { kind: "REELS"; media: PlanMedia }
  | { kind: "STORY"; media: PlanMedia; video: boolean }
  | { kind: "CAROUSEL"; media: PlanMedia[] };

export type FbPlan =
  | { kind: "TEXT" }
  | { kind: "PHOTO"; media: PlanMedia }
  | { kind: "MULTI_PHOTO"; media: PlanMedia[] }
  | { kind: "VIDEO"; media: PlanMedia }
  | { kind: "REEL"; media: PlanMedia }
  | { kind: "PHOTO_STORY"; media: PlanMedia }
  | { kind: "VIDEO_STORY"; media: PlanMedia };

export interface PlanResult<P> {
  plan: P | null;
  errors: string[];
}

const MB = 1024 * 1024;
const bi = (id: string, en: string) => `${id} / ${en}`;

export const isVideo = (m: PlanMedia) =>
  m.type === "VIDEO" || m.mimeType?.toLowerCase().startsWith("video/");
const mime = (m: PlanMedia) => (m.mimeType || "").toLowerCase();
const isJpeg = (m: PlanMedia) =>
  ["image/jpeg", "image/jpg", "image/pjpeg"].includes(mime(m));
const IG_VIDEO_MIMES = ["video/mp4", "video/quicktime"];
const FB_IMAGE_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/gif",
  "image/bmp",
  "image/tiff",
];
const FB_VIDEO_MIMES = ["video/mp4", "video/quicktime"];
const ratio = (m: PlanMedia): number | null =>
  m.width && m.height && m.width > 0 && m.height > 0
    ? m.width / m.height
    : null;
const fmtRatio = (r: number) => r.toFixed(2);
const label = (m: PlanMedia, i: number, n: number) =>
  n > 1 ? ` #${i + 1}` : "";

export const sortMedia = (media: PlanMedia[]) =>
  [...media].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

function captionErrorsInstagram(caption: string): string[] {
  const out: string[] = [];
  const text = caption ?? "";
  if ([...text].length > 2200) {
    out.push(
      bi(
        "Caption Instagram maksimal 2.200 karakter.",
        "Instagram captions are limited to 2,200 characters.",
      ),
    );
  }
  const hashtags = text.match(/(^|\s)#[^\s#]+/g)?.length ?? 0;
  if (hashtags > 30) {
    out.push(
      bi(
        `Instagram maksimal 30 hashtag (ada ${hashtags}).`,
        `Instagram allows at most 30 hashtags (found ${hashtags}).`,
      ),
    );
  }
  const mentions = text.match(/(^|\s)@[A-Za-z0-9._]+/g)?.length ?? 0;
  if (mentions > 20) {
    out.push(
      bi(
        `Instagram maksimal 20 mention (ada ${mentions}).`,
        `Instagram allows at most 20 @mentions (found ${mentions}).`,
      ),
    );
  }
  return out;
}

function igImageErrors(m: PlanMedia, where: string, feed: boolean): string[] {
  const out: string[] = [];
  if (!isJpeg(m)) {
    out.push(
      bi(
        `Instagram hanya menerima gambar JPEG${where} (file ini ${m.mimeType || "tidak diketahui"}). Ekspor ulang sebagai JPG.`,
        `Instagram only accepts JPEG images${where} (this file is ${m.mimeType || "unknown"}). Re-export it as JPG.`,
      ),
    );
  }
  if (m.size > 8 * MB) {
    out.push(
      bi(
        `Gambar Instagram${where} maksimal 8 MB.`,
        `Instagram images${where} must be 8 MB or smaller.`,
      ),
    );
  }
  const r = ratio(m);
  if (feed && r !== null && (r < 0.8 - 0.005 || r > 1.91 + 0.005)) {
    out.push(
      bi(
        `Rasio gambar${where} ${fmtRatio(r)} tidak didukung feed Instagram (harus antara 4:5 dan 1.91:1).`,
        `Image${where} aspect ratio ${fmtRatio(r)} is not supported in the Instagram feed (must be between 4:5 and 1.91:1).`,
      ),
    );
  }
  return out;
}

function igVideoErrors(
  m: PlanMedia,
  where: string,
  maxMb: number,
  maxSec: number,
): string[] {
  const out: string[] = [];
  if (!IG_VIDEO_MIMES.includes(mime(m))) {
    out.push(
      bi(
        `Video Instagram${where} harus MP4 atau MOV (file ini ${m.mimeType || "tidak diketahui"}).`,
        `Instagram videos${where} must be MP4 or MOV (this file is ${m.mimeType || "unknown"}).`,
      ),
    );
  }
  if (m.size > maxMb * MB) {
    out.push(
      bi(
        `Video Instagram${where} maksimal ${maxMb} MB.`,
        `Instagram videos${where} must be ${maxMb} MB or smaller.`,
      ),
    );
  }
  if (m.duration != null && m.duration > 0) {
    if (m.duration < 3)
      out.push(
        bi(
          `Video${where} minimal 3 detik.`,
          `Video${where} must be at least 3 seconds.`,
        ),
      );
    if (m.duration > maxSec) {
      out.push(
        bi(
          `Video${where} maksimal ${maxSec >= 120 ? `${Math.round(maxSec / 60)} menit` : `${maxSec} detik`}.`,
          `Video${where} must be at most ${maxSec >= 120 ? `${Math.round(maxSec / 60)} minutes` : `${maxSec} seconds`}.`,
        ),
      );
    }
  }
  const r = ratio(m);
  if (r !== null && (r < 0.01 || r > 10)) {
    out.push(
      bi(
        `Rasio video${where} tidak didukung Instagram.`,
        `Video${where} aspect ratio is not supported by Instagram.`,
      ),
    );
  }
  return out;
}

export function planInstagram(item: PlanItem): PlanResult<IgPlan> {
  const media = sortMedia(item.media ?? []);
  const errors = captionErrorsInstagram(item.caption);
  if (media.length === 0) {
    return {
      plan: null,
      errors: [
        ...errors,
        bi(
          "Instagram butuh minimal satu foto atau video.",
          "Instagram needs at least one photo or video.",
        ),
      ],
    };
  }
  let plan: IgPlan | null = null;
  if (item.format === ContentFormat.STORY) {
    if (media.length > 1) {
      errors.push(
        bi(
          "Story hanya boleh satu media.",
          "A story takes exactly one media file.",
        ),
      );
    }
    const m = media[0];
    if (isVideo(m)) errors.push(...igVideoErrors(m, "", 100, 60));
    else errors.push(...igImageErrors(m, "", false));
    plan = { kind: "STORY", media: m, video: isVideo(m) };
  } else if (item.format === ContentFormat.REEL) {
    if (media.length > 1)
      errors.push(
        bi("Reel hanya boleh satu video.", "A reel takes exactly one video."),
      );
    const m = media[0];
    if (!isVideo(m)) {
      errors.push(
        bi(
          "Reel Instagram harus berupa video.",
          "An Instagram reel must be a video.",
        ),
      );
    } else {
      errors.push(...igVideoErrors(m, "", 300, 15 * 60));
    }
    plan = { kind: "REELS", media: m };
  } else if (media.length === 1) {
    const m = media[0];
    if (isVideo(m)) {
      errors.push(...igVideoErrors(m, "", 300, 15 * 60));
      plan = { kind: "REELS", media: m };
    } else {
      errors.push(...igImageErrors(m, "", true));
      plan = { kind: "IMAGE", media: m };
    }
  } else {
    if (media.length > 10) {
      errors.push(
        bi(
          `Carousel Instagram via API maksimal 10 media (ada ${media.length}).`,
          `Instagram carousels published via the API take at most 10 items (found ${media.length}).`,
        ),
      );
    }
    media.forEach((m, i) => {
      const where = label(m, i, media.length);
      if (isVideo(m)) errors.push(...igVideoErrors(m, where, 300, 15 * 60));
      else errors.push(...igImageErrors(m, where, true));
    });
    plan = { kind: "CAROUSEL", media };
  }
  return { plan: errors.length ? null : plan, errors };
}

function fbImageErrors(m: PlanMedia, where: string): string[] {
  const out: string[] = [];
  if (!FB_IMAGE_MIMES.includes(mime(m))) {
    out.push(
      bi(
        `Format gambar Facebook${where} tidak didukung (${m.mimeType || "tidak diketahui"}); gunakan JPG atau PNG.`,
        `Unsupported Facebook image format${where} (${m.mimeType || "unknown"}); use JPG or PNG.`,
      ),
    );
  }
  if (m.size > 10 * MB)
    out.push(
      bi(
        `Gambar Facebook${where} maksimal 10 MB.`,
        `Facebook images${where} must be 10 MB or smaller.`,
      ),
    );
  return out;
}

function fbVideoErrors(m: PlanMedia, vertical: boolean): string[] {
  const out: string[] = [];
  if (!FB_VIDEO_MIMES.includes(mime(m))) {
    out.push(
      bi(
        `Video Facebook harus MP4 atau MOV (file ini ${m.mimeType || "tidak diketahui"}).`,
        `Facebook videos must be MP4 or MOV (this file is ${m.mimeType || "unknown"}).`,
      ),
    );
  }
  if (m.size > 1024 * MB)
    out.push(
      bi(
        "Video Facebook maksimal 1 GB.",
        "Facebook videos must be 1 GB or smaller.",
      ),
    );
  if (vertical) {
    if (
      m.duration != null &&
      m.duration > 0 &&
      (m.duration < 3 || m.duration > 90)
    ) {
      out.push(
        bi(
          "Reel/Story Facebook harus 3-90 detik.",
          "Facebook reels/stories must be 3-90 seconds long.",
        ),
      );
    }
    const r = ratio(m);
    if (r !== null && (r < 0.5 || r > 0.6)) {
      out.push(
        bi(
          `Reel/Story Facebook harus vertikal 9:16 (rasio file ${fmtRatio(r)}).`,
          `Facebook reels/stories must be vertical 9:16 (file ratio ${fmtRatio(r)}).`,
        ),
      );
    }
    if (m.width && m.height && (m.width < 540 || m.height < 960)) {
      out.push(
        bi(
          "Reel/Story Facebook minimal 540x960 piksel.",
          "Facebook reels/stories must be at least 540x960 pixels.",
        ),
      );
    }
  }
  return out;
}

export function planFacebook(item: PlanItem): PlanResult<FbPlan> {
  const media = sortMedia(item.media ?? []);
  const errors: string[] = [];
  if ([...(item.caption ?? "")].length > 63206) {
    errors.push(
      bi(
        "Teks Facebook terlalu panjang (maks 63.206 karakter).",
        "Facebook text is too long (max 63,206 characters).",
      ),
    );
  }
  let plan: FbPlan | null = null;
  if (item.format === ContentFormat.STORY) {
    if (media.length !== 1) {
      errors.push(
        bi(
          "Story Facebook butuh tepat satu media.",
          "A Facebook story takes exactly one media file.",
        ),
      );
    } else if (isVideo(media[0])) {
      errors.push(...fbVideoErrors(media[0], true));
      plan = { kind: "VIDEO_STORY", media: media[0] };
    } else {
      errors.push(...fbImageErrors(media[0], ""));
      plan = { kind: "PHOTO_STORY", media: media[0] };
    }
  } else if (item.format === ContentFormat.REEL) {
    if (media.length !== 1 || !isVideo(media[0])) {
      errors.push(
        bi(
          "Reel Facebook butuh tepat satu video.",
          "A Facebook reel takes exactly one video.",
        ),
      );
    } else {
      errors.push(...fbVideoErrors(media[0], true));
      plan = { kind: "REEL", media: media[0] };
    }
  } else if (media.length === 0) {
    if (!(item.caption ?? "").trim()) {
      errors.push(
        bi(
          "Postingan teks Facebook butuh caption.",
          "A Facebook text post needs a caption.",
        ),
      );
    }
    plan = { kind: "TEXT" };
  } else if (media.length === 1) {
    if (isVideo(media[0])) {
      errors.push(...fbVideoErrors(media[0], false));
      plan = { kind: "VIDEO", media: media[0] };
    } else {
      errors.push(...fbImageErrors(media[0], ""));
      plan = { kind: "PHOTO", media: media[0] };
    }
  } else {
    if (media.some(isVideo)) {
      errors.push(
        bi(
          "Postingan multi-foto Facebook tidak bisa berisi video. Pisahkan video menjadi postingan sendiri.",
          "Facebook multi-photo posts cannot contain videos. Publish the video as its own post.",
        ),
      );
    }
    media.forEach((m, i) =>
      errors.push(
        ...(isVideo(m) ? [] : fbImageErrors(m, label(m, i, media.length))),
      ),
    );
    plan = { kind: "MULTI_PHOTO", media };
  }
  return { plan: errors.length ? null : plan, errors };
}

/** Errors for every target (prefixed with the platform), empty when publishable. */
export function validateForTargets(
  item: PlanItem,
  targets: ContentPlatform[],
): string[] {
  const out: string[] = [];
  for (const t of targets) {
    if (t === ContentPlatform.INSTAGRAM)
      out.push(...planInstagram(item).errors.map((e) => `Instagram: ${e}`));
    else if (t === ContentPlatform.FACEBOOK)
      out.push(...planFacebook(item).errors.map((e) => `Facebook: ${e}`));
    else
      out.push(
        bi(
          `${t} tidak didukung untuk publikasi otomatis.`,
          `${t} is not supported for auto-publishing.`,
        ),
      );
  }
  return out;
}

/** Normalise requested targets: unique, only IG/FB. Throws message on anything else. */
export function normaliseTargets(targets: unknown): {
  targets: ContentPlatform[];
  error?: string;
} {
  if (!Array.isArray(targets))
    return { targets: [], error: "autoPublishTargets must be an array" };
  const uniq = Array.from(new Set(targets as string[]));
  const bad = uniq.filter(
    (t) => !AUTO_PUBLISH_PLATFORMS.includes(t as ContentPlatform),
  );
  if (bad.length) {
    return {
      targets: [],
      error: bi(
        `Publikasi otomatis hanya mendukung Instagram dan Facebook (bukan ${bad.join(", ")}).`,
        `Auto-publishing supports Instagram and Facebook only (not ${bad.join(", ")}).`,
      ),
    };
  }
  return { targets: uniq as ContentPlatform[] };
}
