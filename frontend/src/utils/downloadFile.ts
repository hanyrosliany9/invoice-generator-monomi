/**
 * Single-file download helper shared by the lightbox, the public preview
 * overlay and the video review modal.
 *
 * - Images / other small files: fetched into a blob and saved through an anchor
 *   carrying the original filename. The media worker sends
 *   `Access-Control-Allow-Origin: *`, so this works cross-origin.
 * - Videos (potentially multi-GB) are never buffered. They are opened in a NEW
 *   tab via an anchor; on media-worker URLs `?download=1` makes the worker reply
 *   with `Content-Disposition: attachment`, so the browser downloads straight to
 *   disk and the app tab is never navigated away.
 *
 * On failure the helper throws; callers are expected to show an error toast
 * (window.open after an await is popup-blocked on mobile).
 */

const BLOB_REVOKE_DELAY_MS = 60_000;

export interface DownloadFileOptions {
  isVideo?: boolean;
}

function clickAnchor(href: string, opts: { filename?: string; newTab?: boolean } = {}): void {
  const a = document.createElement('a');
  a.href = href;
  if (opts.filename !== undefined && opts.filename !== '') a.download = opts.filename;
  if (opts.newTab === true) a.target = '_blank';
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function isWorkerUrl(url: string): boolean {
  return url.includes('media.monomiagency.com/view/');
}

export function withDownloadParam(url: string): string {
  return url + (url.includes('?') ? '&' : '?') + 'download=1';
}

export async function downloadFile(
  url: string,
  filename?: string,
  options: DownloadFileOptions = {},
): Promise<void> {
  if (options.isVideo === true) {
    clickAnchor(isWorkerUrl(url) ? withDownloadParam(url) : url, { newTab: true });
    return;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  clickAnchor(objectUrl, {
    filename: filename !== undefined && filename !== '' ? filename : 'download',
  });
  // Revoking immediately can cancel the download on mobile browsers.
  setTimeout(() => URL.revokeObjectURL(objectUrl), BLOB_REVOKE_DELAY_MS);
}
