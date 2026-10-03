/**
 * Public, read-only delivery of the in-app tutorial videos (see
 * frontend/scripts/guides/README.md). Only keys under `public-guides/` of the
 * R2 bucket binding are served, GET/HEAD only, and no JWT is needed: the files
 * are tutorials for the app, not client media. Everything else keeps going
 * through the authenticated /view/TOKEN/... route in media-worker.js.
 *
 * Files are uploaded with a content hash in their name, so they are immutable
 * and can be cached for a year (Range requests included, for video seeking).
 */

export const PUBLIC_GUIDES_PREFIX = 'public-guides/';

const CONTENT_TYPES = {
  mp4: 'video/mp4',
  vtt: 'text/vtt; charset=utf-8',
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

/**
 * Map a request pathname to an R2 key, or null when it is not a servable
 * public guide file. Pure function (unit-tested in node).
 * Rejects traversal (`..`, `.`, empty segments, backslashes, NUL, encoded
 * slashes) and anything but [A-Za-z0-9._-] segments with an allowed extension.
 */
export function resolvePublicGuideKey(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes(String.fromCharCode(92)) ||decoded.includes('\0') || decoded.includes('%')) return null;
  if (!decoded.startsWith('/' + PUBLIC_GUIDES_PREFIX)) return null;
  const key = decoded.slice(1);
  const rest = key.slice(PUBLIC_GUIDES_PREFIX.length);
  if (rest === '') return null;
  const segments = rest.split('/');
  if (segments.length > 3) return null;
  for (const seg of segments) {
    if (seg === '' || seg === '.' || seg === '..' || !/^[A-Za-z0-9._-]+$/.test(seg)) return null;
  }
  const ext = segments[segments.length - 1].split('.').pop().toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) return null;
  return { key, contentType };
}

/** Is this request for the public prefix (even if the file name is invalid)? */
export function isPublicGuidePath(pathname) {
  return pathname.startsWith('/' + PUBLIC_GUIDES_PREFIX);
}

/** Serve one public guide file from R2. `cors` is the worker's CORS header object. */
export async function servePublicGuide(request, env, cors) {
  const resolved = resolvePublicGuideKey(new URL(request.url).pathname);
  if (!resolved) return new Response('Not Found', { status: 404, headers: cors });
  const { key, contentType } = resolved;

  const headers = new Headers(cors);
  headers.set('Content-Type', contentType);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('X-Content-Type-Options', 'nosniff');

  if (request.method === 'HEAD') {
    const meta = await env.MY_BUCKET.head(key);
    if (!meta) return new Response('Not Found', { status: 404, headers: cors });
    headers.set('Content-Length', String(meta.size));
    headers.set('ETag', meta.httpEtag);
    return new Response(null, { status: 200, headers });
  }

  const rangeHeader = request.headers.get('Range');
  let object;
  try {
    object = rangeHeader ? await env.MY_BUCKET.get(key, { range: request.headers }) : await env.MY_BUCKET.get(key);
  } catch (err) {
    return new Response('Error fetching from R2: ' + err.message, { status: 500, headers: cors });
  }
  if (!object) return new Response('Not Found', { status: 404, headers: cors });

  headers.set('ETag', object.httpEtag);
  let status = 200;
  if (rangeHeader && object.range) {
    const { offset, length } = object.range;
    headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
    headers.set('Content-Length', String(length));
    status = 206;
  } else {
    headers.set('Content-Length', String(object.size));
  }
  return new Response(object.body, { status, headers });
}
