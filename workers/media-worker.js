/**
 * Cloudflare Worker — Authenticated Media Delivery from R2
 *
 * Serves media files from private R2 with full HTTP Range request support
 * (RFC 7233), enabling video seeking, fast initial load, and progressive
 * buffering without routing bytes through the VPS.
 *
 * Token validation:
 *   Validates JWT tokens at the edge using crypto.subtle (HS256) with the
 *   same JWT_SECRET used by the NestJS backend. No backend round-trip needed.
 *   Requires TOKEN_SECRET worker secret: `wrangler secret put TOKEN_SECRET`
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

    // Validate token at the edge (no backend round-trip)
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
 * Decode base64url string to Uint8Array
 */
function base64UrlDecode(b64url) {
  // Convert base64url → standard base64, then decode
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/**
 * Validate a JWT token at the edge using crypto.subtle (HS256).
 *
 * Accepts:
 *   - Media access tokens:  { purpose: 'media-access', sub, exp }
 *   - Public share tokens:  { purpose: 'public-share', isPublic: true, exp }
 *
 * Requires env.TOKEN_SECRET (same value as backend JWT_SECRET).
 * Set it with: wrangler secret put TOKEN_SECRET
 */
async function validateToken(token, env) {
  if (!token || token.length < 10) return false;

  const secret = env.TOKEN_SECRET;
  if (!secret) {
    // TOKEN_SECRET not configured — deny all requests
    console.error('[Worker] TOKEN_SECRET is not set. Run: wrangler secret put TOKEN_SECRET');
    return false;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Import the HMAC-SHA256 key
    const keyData = new TextEncoder().encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    // Verify signature: HMAC-SHA256(header.payload) === signature
    const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlDecode(signatureB64);
    const valid = await crypto.subtle.verify('HMAC', cryptoKey, signature, signingInput);
    if (!valid) return false;

    // Decode and check payload
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) return false;

    // Accept media-access tokens (authenticated users)
    if (payload.purpose === 'media-access') return true;

    // Accept public-share tokens (public project links)
    if (payload.purpose === 'public-share' && payload.isPublic === true) return true;

    return false;
  } catch (e) {
    console.error('[Worker] JWT validation error:', e.message);
    return false;
  }
}
