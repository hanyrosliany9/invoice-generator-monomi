import { GraphApiError } from "../instagram/instagram-graph.client";
import { MetaGraphError } from "./meta-graph.client";

/**
 * Publishing failures, normalised into a stable code (the UI translates it),
 * a human-readable bilingual message (Bahasa Indonesia / English, stored on
 * the publication), and a retry policy:
 *  - retryable: the scheduler tries again with exponential backoff;
 *  - deferMs:   not a failure (quota full, video still processing): try again
 *               later without consuming an attempt;
 *  - otherwise terminal until someone presses "Retry".
 * Messages never contain tokens or signed URLs (Meta text is scrubbed by the
 * Graph client before it gets here).
 */
export type PublishErrorCode =
  | "NOT_CONFIGURED"
  | "CONFIG_INVALID"
  | "NOT_INTERNAL_CLIENT"
  | "VALIDATION"
  | "TOKEN_INVALID"
  | "PERMISSION_DENIED"
  | "RATE_LIMITED"
  | "PUBLISH_LIMIT_REACHED"
  | "MEDIA_FETCH_FAILED"
  | "MEDIA_INVALID"
  | "MEDIA_PROCESSING_FAILED"
  | "MEDIA_STORAGE_UNAVAILABLE"
  | "CONTAINER_EXPIRED"
  | "META_TRANSIENT"
  | "OUTCOME_UNCERTAIN"
  | "CANCELLED"
  | "DUPLICATE_POST"
  | "UNKNOWN";

export class PublishError extends Error {
  constructor(
    readonly code: PublishErrorCode,
    message: string,
    readonly retryable = false,
    readonly deferMs?: number,
  ) {
    super(message);
    this.name = "PublishError";
  }
}

/** Defer marker: not an error, e.g. the video is still processing. */
export class PublishDeferred extends Error {
  constructor(
    readonly reason: "processing" | "quota",
    readonly delayMs: number,
    message: string,
  ) {
    super(message);
    this.name = "PublishDeferred";
  }
}

const bi = (id: string, en: string) => `${id} / ${en}`;

/**
 * Stored message = bilingual headline, then (optionally) a newline and the
 * raw detail (Meta text / numbers). The UI localizes by the error code and
 * shows the part after the newline verbatim; rows written before this format
 * have no newline and fall back to the stored text.
 */
const withDetail = (detail?: string) => (detail ? `\n${detail}` : "");

export const MSG = {
  notConfigured: bi(
    "Publikasi otomatis belum dikonfigurasi (token Meta belum diatur).",
    "Auto-publishing is not configured (Meta token not set).",
  ),
  configInvalid: (reason: string) =>
    `${bi("Konfigurasi Meta tidak valid", "Meta configuration is invalid")}: ${reason}.`,
  notInternal: bi(
    "Publikasi otomatis hanya untuk klien internal (Monomi) pada tahap ini.",
    "Auto-publishing is only available for the internal client (Monomi) in this phase.",
  ),
  token: bi(
    "Token Meta tidak valid atau sudah dicabut. Buat ulang token system user di Business Settings.",
    "The Meta token is invalid or revoked. Regenerate the system user token in Business Settings.",
  ),
  permission: (detail?: string) =>
    bi(
      "Izin Meta kurang (mis. pages_manage_posts / instagram_content_publish) atau aset belum ditugaskan ke system user.",
      "Missing Meta permission (e.g. pages_manage_posts / instagram_content_publish) or the asset is not assigned to the system user.",
    ) + withDetail(detail),
  rateLimited: bi(
    "Meta membatasi jumlah panggilan API sementara. Akan dicoba lagi otomatis.",
    "Meta is rate-limiting API calls. Will retry automatically.",
  ),
  publishLimit: (used?: number, total?: number) =>
    bi(
      "Batas publikasi Instagram 24 jam tercapai. Akan dicoba lagi otomatis.",
      "Instagram 24-hour publishing limit reached. Will retry automatically.",
    ) + withDetail(used !== undefined ? `${used}/${total}` : undefined),
  publishLimitGaveUp: bi(
    "Batas publikasi Instagram masih penuh setelah 24 jam. Tekan Coba lagi nanti.",
    "Instagram publishing limit still reached after 24 hours. Press Retry later.",
  ),
  mediaFetch: bi(
    "Meta tidak bisa mengunduh media dari penyimpanan. Akan dicoba lagi dengan tautan baru.",
    "Meta could not download the media from storage. Will retry with a fresh link.",
  ),
  mediaInvalid: (detail: string) =>
    bi("Media ditolak Meta", "Media rejected by Meta") + withDetail(detail),
  processingFailed: (detail: string) =>
    bi("Meta gagal memproses media", "Meta failed to process the media") +
    withDetail(detail),
  processingTimeout: bi(
    "Meta belum selesai memproses video setelah beberapa jam. Tekan Coba lagi.",
    "Meta has not finished processing the video after several hours. Press Retry.",
  ),
  storage: bi(
    "Penyimpanan media (R2) belum dikonfigurasi, jadi tautan media untuk Meta tidak bisa dibuat.",
    "Media storage (R2) is not configured, so media links for Meta cannot be created.",
  ),
  expired: bi(
    "Kontainer media Instagram kedaluwarsa; akan dibuat ulang.",
    "The Instagram media container expired; it will be recreated.",
  ),
  transient: bi(
    "Gangguan sementara di Meta. Akan dicoba lagi otomatis.",
    "Temporary Meta error. Will retry automatically.",
  ),
  uncertain: bi(
    "Tidak bisa memastikan apakah postingan sudah terbit (koneksi ke Meta terputus). Periksa akun/Halaman dulu; tekan Coba lagi hanya jika postingan belum ada.",
    "Could not confirm whether the post went live (connection to Meta dropped). Check the account/Page first; press Retry only if the post is not there.",
  ),
  verifying: bi(
    "Koneksi ke Meta terputus saat menerbitkan; memeriksa apakah postingan sudah terbit.",
    "Connection to Meta dropped while publishing; checking whether the post went live.",
  ),
  processing: bi(
    "Meta masih memproses video.",
    "Meta is still processing the video.",
  ),
  cancelledManual: bi(
    "Dibatalkan: konten sudah ditandai terbit/diarsipkan secara manual.",
    "Cancelled: the content was marked published/archived manually.",
  ),
  duplicate: bi(
    "Facebook menolak postingan duplikat (isi sama dengan postingan terbaru).",
    "Facebook rejected a duplicate post (same content as a recent post).",
  ),
  unknown: (detail: string) =>
    bi("Gagal menerbitkan", "Publishing failed") + withDetail(detail),
};

/** Instagram content-publishing error subcodes (developers.facebook.com, IG Platform error codes). */
const IG_MEDIA_SUBCODES: Record<
  number,
  { code: PublishErrorCode; retryable: boolean; text: string }
> = {
  2207001: { code: "META_TRANSIENT", retryable: true, text: "server error" },
  2207003: {
    code: "MEDIA_FETCH_FAILED",
    retryable: true,
    text: "timeout downloading media",
  },
  2207004: {
    code: "MEDIA_INVALID",
    retryable: false,
    text: "image is too large (max 8 MB)",
  },
  2207005: {
    code: "MEDIA_INVALID",
    retryable: false,
    text: "unsupported image format (JPEG only)",
  },
  2207006: {
    code: "MEDIA_FETCH_FAILED",
    retryable: true,
    text: "media not found at the URL",
  },
  2207008: {
    code: "META_TRANSIENT",
    retryable: true,
    text: "temporary publishing error",
  },
  2207009: {
    code: "MEDIA_INVALID",
    retryable: false,
    text: "unsupported aspect ratio (feed images 4:5 to 1.91:1)",
  },
  2207010: {
    code: "VALIDATION",
    retryable: false,
    text: "caption too long (max 2,200 characters / 30 hashtags / 20 mentions)",
  },
  2207020: {
    code: "CONTAINER_EXPIRED",
    retryable: true,
    text: "media container expired",
  },
  2207023: {
    code: "MEDIA_INVALID",
    retryable: false,
    text: "unknown media type",
  },
  2207026: {
    code: "MEDIA_INVALID",
    retryable: false,
    text: "unsupported video format (MP4/MOV, H.264/HEVC, AAC)",
  },
  2207027: {
    code: "META_TRANSIENT",
    retryable: true,
    text: "media not ready for publishing yet",
  },
  2207028: {
    code: "MEDIA_INVALID",
    retryable: false,
    text: "carousel validation failed (2-10 items)",
  },
  2207032: {
    code: "META_TRANSIENT",
    retryable: true,
    text: "failed to create media",
  },
  2207042: {
    code: "PUBLISH_LIMIT_REACHED",
    retryable: true,
    text: "publishing limit reached",
  },
  2207050: {
    code: "PERMISSION_DENIED",
    retryable: false,
    text: "Instagram account is restricted or inactive",
  },
  2207051: {
    code: "MEDIA_INVALID",
    retryable: false,
    text: "Instagram blocked this action (spam/policy)",
  },
  2207052: {
    code: "MEDIA_FETCH_FAILED",
    retryable: true,
    text: "media could not be fetched from the URL",
  },
  2207053: {
    code: "META_TRANSIENT",
    retryable: true,
    text: "unknown upload error",
  },
};

/** Generic Graph codes related to media / posting (IG and Pages). */
const MEDIA_CODES: Record<
  number,
  { code: PublishErrorCode; retryable: boolean; text: string }
> = {
  9004: {
    code: "MEDIA_FETCH_FAILED",
    retryable: true,
    text: "media could not be fetched from the URL",
  },
  9007: {
    code: "META_TRANSIENT",
    retryable: true,
    text: "media not ready for publishing yet",
  },
  36000: {
    code: "MEDIA_INVALID",
    retryable: false,
    text: "media file is too large",
  },
  36001: {
    code: "MEDIA_INVALID",
    retryable: false,
    text: "media resolution is not supported",
  },
  36003: {
    code: "MEDIA_INVALID",
    retryable: false,
    text: "unsupported aspect ratio",
  },
  36004: {
    code: "MEDIA_INVALID",
    retryable: false,
    text: "media duration is not supported",
  },
  324: {
    code: "MEDIA_INVALID",
    retryable: false,
    text: "missing or invalid image file",
  },
  352: {
    code: "MEDIA_INVALID",
    retryable: false,
    text: "unsupported video format",
  },
  389: {
    code: "MEDIA_FETCH_FAILED",
    retryable: true,
    text: "unable to fetch the video file from the URL",
  },
  6000: {
    code: "MEDIA_PROCESSING_FAILED",
    retryable: true,
    text: "problem uploading the video",
  },
  368: {
    code: "PERMISSION_DENIED",
    retryable: false,
    text: "temporarily blocked for policy violations",
  },
};

/** Map a Graph error to a PublishError with a clear, actionable message. */
export function publishErrorFromGraph(e: GraphApiError): PublishError {
  const detail = (e instanceof MetaGraphError && e.userMessage) || e.message;
  if (e.subcode !== undefined && IG_MEDIA_SUBCODES[e.subcode]) {
    const m = IG_MEDIA_SUBCODES[e.subcode];
    return toPublishError(m.code, m.retryable, m.text);
  }
  if (e.code !== undefined && MEDIA_CODES[e.code]) {
    const m = MEDIA_CODES[e.code];
    return toPublishError(m.code, m.retryable, m.text);
  }
  if (e.code === 506)
    return new PublishError("DUPLICATE_POST", MSG.duplicate, false);
  switch (e.kind) {
    case "token":
      return new PublishError("TOKEN_INVALID", MSG.token, false);
    case "permission":
      return new PublishError(
        "PERMISSION_DENIED",
        MSG.permission(detail),
        false,
      );
    case "rate_limit":
      return new PublishError(
        "RATE_LIMITED",
        MSG.rateLimited,
        true,
        15 * 60_000,
      );
    case "transient":
      return new PublishError("META_TRANSIENT", MSG.transient, true);
    case "invalid_param":
      // code 100 + subcode 33 = object missing or not accessible with this token.
      if (e.subcode === 33)
        return new PublishError(
          "PERMISSION_DENIED",
          MSG.permission(detail),
          false,
        );
      return new PublishError("MEDIA_INVALID", MSG.mediaInvalid(detail), false);
    default:
      return new PublishError("UNKNOWN", MSG.unknown(detail), false);
  }
}

function toPublishError(
  code: PublishErrorCode,
  retryable: boolean,
  text: string,
): PublishError {
  switch (code) {
    case "MEDIA_FETCH_FAILED":
      return new PublishError(code, MSG.mediaFetch, retryable);
    case "PUBLISH_LIMIT_REACHED":
      return new PublishError(code, MSG.publishLimit(), true);
    case "CONTAINER_EXPIRED":
      return new PublishError(code, MSG.expired, true);
    case "META_TRANSIENT":
      return new PublishError(code, MSG.transient, true);
    case "PERMISSION_DENIED":
      return new PublishError(code, MSG.permission(text), false);
    case "MEDIA_PROCESSING_FAILED":
      return new PublishError(code, MSG.processingFailed(text), retryable);
    default:
      return new PublishError(code, MSG.mediaInvalid(text), retryable);
  }
}
