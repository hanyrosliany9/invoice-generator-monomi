import type { Request, Response } from "express";
import { MediaService } from "../media/media.service";

/**
 * Stream an (already access-checked) content-planner media file to the
 * response, honouring HTTP Range requests. Shared by the public content share
 * and the client portal so both send identical headers.
 *
 * The caller MUST have verified that `key` belongs to the viewer's client
 * (ContentCalendarService.assertClientOwnsMediaKey) before calling this.
 */
export async function streamContentMedia(
  mediaService: MediaService,
  key: string,
  req: Request,
  res: Response,
): Promise<void> {
  const rangeHeader = req.headers["range"] as string | undefined;
  const { stream, contentType, contentLength, originalName, statusCode, contentRange } =
    await mediaService.getFileStream(key, { range: rangeHeader });

  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Length", contentLength);
  res.setHeader("Cache-Control", "private, max-age=3600, must-revalidate");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  if (contentRange) {
    res.setHeader("Content-Range", contentRange);
  }
  if (originalName) {
    const encoded = encodeURIComponent(originalName);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${originalName}"; filename*=UTF-8''${encoded}`,
    );
  }
  res.status(statusCode || 200);
  stream.pipe(res);
}
