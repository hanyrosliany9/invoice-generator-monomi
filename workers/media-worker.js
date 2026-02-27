/**
 * Cloudflare Worker — Authenticated Media Delivery from R2
 *
 * Serves media files from private R2 with full HTTP Range request support
 * (RFC 7233), enabling video seeking, fast initial load, and progressive
 * buffering without routing bytes through the VPS.
 *
 * Key fixes in this version:
 *  1. Range header forwarded to R2 → 206 Partial Content returned for seeks
 *  2. Accept-Ranges: bytes on every response → browser knows seeking works
 *  3. Content-Range set correctly for partial responses
 *  4. CORS preflight allows Range header and exposes Content-Range
 *  5. HEAD request support for Safari's Accept-Ranges probe
 *  6. Cache-Control: private → prevents Cloudflare CDN from interfering
 *     with range-request handling (known CDN+range stalling bug)
 *
 * URL format: https://media.monomiagency.com/view/TOKEN/path/to/file.ext
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight — MUST allow Range so browsers send it cross-origin
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: corsHeaders(),
      });
    }

    // Parse /view/TOKEN/path/to/file.ext
    const pathParts = url.pathname.split('/').filter(Boolean);
    if (pathParts.length < 3 || pathParts[0] !== 'view') {
      return new Response(
        'Invalid URL format. Expected: /view/TOKEN/path/to/file.ext',
        { status: 400, headers: corsHeaders() },
      );
    }

    const token = pathParts[1];
    const key = pathParts.slice(2).join('/');

    // Validate token (edge-cached for 15 min to reduce backend API load)
    const valid = await validateToken(token, env);
    if (!valid) {
      return new Response('Unauthorized: Invalid or expired token', {
        status: 401,
        headers: corsHeaders(),
      });
    }

    // HEAD — Safari and some players probe for Accept-Ranges before seeking
    if (request.method === 'HEAD') {
      const meta = await env.MY_BUCKET.head(key);
      if (!meta) {
        return new Response('Not Found', { status: 404, headers: corsHeaders() });
      }
      const h = new Headers(corsHeaders());
      meta.writeHttpMetadata(h);
      h.set('Accept-Ranges', 'bytes');
      h.set('Content-Length', String(meta.size));
      h.set('ETag', meta.httpEtag);
      h.set('Cache-Control', 'private, max-age=3600');
      return new Response(null, { status: 200, headers: h });
    }

    // GET — forward Range header to R2 for partial content requests
    const rangeHeader = request.headers.get('Range');
    let object;
    try {
      object = rangeHeader
        ? await env.MY_BUCKET.get(key, { range: request.headers })
        : await env.MY_BUCKET.get(key);
    } catch (err) {
      return new Response('Error fetching from R2: ' + err.message, {
        status: 500,
        headers: corsHeaders(),
      });
    }

    if (!object) {
      return new Response('Not Found', { status: 404, headers: corsHeaders() });
    }

    const headers = new Headers(corsHeaders());
    object.writeHttpMetadata(headers); // sets Content-Type from R2 metadata
    headers.set('ETag', object.httpEtag);
    headers.set('Accept-Ranges', 'bytes'); // tells browser seeking is supported

    let status = 200;

    if (rangeHeader && object.range) {
      // R2 sets object.range = { offset, end, length } for the chunk it served
      const { offset, end, length } = object.range;
      headers.set('Content-Range', `bytes ${offset}-${end}/${object.size}`);
      headers.set('Content-Length', String(length));
      status = 206;
    } else {
      headers.set('Content-Length', String(object.size));
    }

    // Preserve original filename for inline display / downloads
    const originalName = object.customMetadata?.originalName;
    if (originalName) {
      const encoded = encodeURIComponent(originalName);
      headers.set(
        'Content-Disposition',
        `inline; filename="${originalName}"; filename*=UTF-8''${encoded}`,
      );
    }

    // private  → Cloudflare CDN won't cache (avoids CDN+range stalling bug)
    // max-age  → browser caches the chunk for 1 hour
    headers.set('Cache-Control', 'private, max-age=3600');

    return new Response(object.body, { status, headers });
  },
};

/**
 * CORS headers required for cross-origin video streaming:
 *  - Allow-Headers: Range       → browser sends Range request across origins
 *  - Expose-Headers: Content-Range, Accept-Ranges → browser reads seek metadata
 */
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type, Authorization',
    'Access-Control-Expose-Headers':
      'Content-Range, Accept-Ranges, Content-Length, ETag',
    'Access-Control-Max-Age': '86400',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  };
}

/**
 * Validate token — tries media access token first, then public share token.
 * Validation responses are edge-cached for 15 minutes to reduce backend load.
 */
async function validateToken(token, env) {
  if (!token || token.length < 10) return false;

  const backendUrl = env.BACKEND_URL || 'https://admin.monomiagency.com';

  // 1. Media access token (authenticated users)
  try {
    const res = await fetch(
      `${backendUrl}/api/v1/media/validate-token?token=${encodeURIComponent(token)}`,
      { cf: { cacheTtl: 900, cacheEverything: true } },
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.data?.success && data?.data?.data?.valid) return true;
    }
  } catch (_) {}

  // 2. Public share token (public project links)
  try {
    const res = await fetch(
      `${backendUrl}/api/v1/media-collab/public/validate-token?token=${encodeURIComponent(token)}`,
      { cf: { cacheTtl: 900, cacheEverything: true } },
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.data?.success && data?.data?.data?.valid && data?.data?.data?.isPublic)
        return true;
    }
  } catch (_) {}

  return false;
}
