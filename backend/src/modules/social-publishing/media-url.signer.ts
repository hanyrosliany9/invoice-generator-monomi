import { Injectable } from "@nestjs/common";
import { MediaService } from "../media/media.service";
import { MSG, PublishError } from "./publish-errors";

/**
 * Short-lived, single-object, HTTPS links Meta can fetch media from.
 *
 * Uses an R2 presigned GET (AWS SigV4 query auth) from the backend's existing
 * S3 client: the URL grants read access to exactly ONE object key and expires
 * after SIGNED_URL_TTL_SECONDS. Deliberately NOT the media-worker JWT, which
 * grants 24h access to all media of a user. The bucket stays private.
 *
 * TTL: Meta fetches images while the container is created (seconds) and
 * videos during processing (minutes); a re-attempt that needs to fetch again
 * signs a fresh link. 2 hours covers slow video processing with margin.
 * Signed URLs are passed to Meta only: never logged, stored or returned.
 */
export const SIGNED_URL_TTL_SECONDS = 2 * 60 * 60;

// eslint-disable-next-line no-control-regex
const SAFE_KEY = /^[^\u0000-\u001f\u007f\\]{1,1024}$/;

@Injectable()
export class MediaUrlSigner {
  constructor(private readonly media: MediaService) {}

  async sign(
    key: string,
    ttlSeconds: number = SIGNED_URL_TTL_SECONDS,
  ): Promise<string> {
    if (
      typeof key !== "string" ||
      !SAFE_KEY.test(key) ||
      key.startsWith("/") ||
      key.split("/").includes("..")
    ) {
      throw new PublishError(
        "MEDIA_INVALID",
        MSG.mediaInvalid("invalid storage key"),
        false,
      );
    }
    if (!this.media.isR2Enabled()) {
      throw new PublishError("MEDIA_STORAGE_UNAVAILABLE", MSG.storage, false);
    }
    const ttl = Math.min(
      Math.max(Math.floor(ttlSeconds), 15 * 60),
      6 * 60 * 60,
    );
    let url: string;
    try {
      url = await this.media.getPresignedUrl(key, ttl);
    } catch {
      throw new PublishError("MEDIA_STORAGE_UNAVAILABLE", MSG.storage, true);
    }
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new PublishError("MEDIA_STORAGE_UNAVAILABLE", MSG.storage, false);
    }
    // Meta requires public HTTPS URLs; never hand out an http link.
    if (parsed.protocol !== "https:") {
      throw new PublishError("MEDIA_STORAGE_UNAVAILABLE", MSG.storage, false);
    }
    return parsed.toString();
  }
}
