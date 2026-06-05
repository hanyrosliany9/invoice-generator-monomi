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
    if (!env.TOKEN_SECRET) {
      console.error('[Worker] TOKEN_SECRET secret is not configured. Run: wrangler secret put TOKEN_SECRET');
      return new Response('Worker misconfigured: TOKEN_SECRET not set', {
        status: 503,
        headers: corsHeaders(),
      });
    }

    // validateToken returns the decoded payload on success, or null on failure.
    // Scope enforcement (when the token carries a `scope` claim) is done here,
    // after we have both the verified payload and the requested R2 key.
    const payload = await validateToken(token, env);
    if (!payload) {
      return new Response('Unauthorized: Invalid or expired token', {
        status: 401,
        headers: corsHeaders(),
      });
    }

    // ── Scope enforcement ────────────────────────────────────────────────────
    // New public-share tokens carry: scope.projectId + scope.keyPrefixes[]
    // Legacy/unscoped tokens have no `scope` claim → allow as before (backward compat).
    //
    // When scope IS present we enforce that the requested R2 key starts with at
    // least one of the allowed prefixes.  This ensures a client share token for
    // project A cannot be used to fetch assets from project B.
    //
    // NOTE: R2 keys are currently formatted as  {folder}/{date}/{hash}-{name}.ext
    // (not project-namespaced), so the prefixes are of the form "content/2025-01-08/".
    // Full project-level enforcement will be tightened once keys are namespaced as
    // "projects/{projectId}/content/…" — no worker change required at that point,
    // only the prefix values in issued tokens will change.
    if (payload.scope) {
      const { keyPrefixes } = payload.scope;

      // If keyPrefixes is a non-empty array, enforce it.
      // An empty array means the project has no assets yet; allow (nothing to block).
      if (Array.isArray(keyPrefixes) && keyPrefixes.length > 0) {
        const allowed = keyPrefixes.some((prefix) => key.startsWith(prefix));
        if (!allowed) {
          console.warn(
            `[Worker] Scope violation: key "${key}" not in allowed prefixes for project "${payload.scope.projectId}"`,
          );
          return new Response('Forbidden: token scope does not cover this asset', {
            status: 403,
            headers: corsHeaders(),
          });
        }
      }
    }
    // ── End scope enforcement ────────────────────────────────────────────────

    // HEAD — Safari and some players probe for Accept-Ranges before seeking
    if (request.method === 'HEAD') {
      const meta = await env.MY_BUCKET.head(key);
      if (!meta) {
        return new Response('Not Found', { status: 404, headers: corsHeaders() });
      }
      const h = new Headers(corsHeaders());
      meta.writeHttpMetadata(h);
      if (!h.get('Content-Type')) {
        const ext = key.split('.').pop()?.toLowerCase();
        const mimeMap = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', avi: 'video/x-msvideo', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', pdf: 'application/pdf' };
        h.set('Content-Type', mimeMap[ext] || 'application/octet-stream');
      }
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

    // Fallback: if R2 metadata has no Content-Type, infer from file extension.
    // Browsers reject video elements with a missing or wrong Content-Type (error code 4).
    if (!headers.get('Content-Type')) {
      const ext = key.split('.').pop()?.toLowerCase();
      const mimeMap = {
        mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
        avi: 'video/x-msvideo', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        png: 'image/png', gif: 'image/gif', webp: 'image/webp', pdf: 'application/pdf',
      };
      const fallback = mimeMap[ext] || 'application/octet-stream';
      headers.set('Content-Type', fallback);
    }

    headers.set('ETag', object.httpEtag);
    headers.set('Accept-Ranges', 'bytes'); // tells browser seeking is supported

    let status = 200;

    if (rangeHeader && object.range) {
      // R2 returns object.range = { offset, length } — it does NOT include `end`.
      // Calculate end from offset + length - 1 per RFC 7233.
      const { offset, length } = object.range;
      const end = offset + length - 1;
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
 *   - Public share tokens:  { purpose: 'public-share', isPublic: true, exp,
 *                             scope?: { projectId, keyPrefixes: string[] } }
 *
 * Returns the decoded payload object on success so the caller can inspect optional
 * claims (e.g. `scope`).  Returns null on any failure (invalid signature, expired,
 * wrong purpose, etc.).
 *
 * Backward compatibility: tokens without a `scope` claim are accepted as before.
 * The scope enforcement logic lives in the main fetch handler, not here, so this
 * function only validates signature + expiry + purpose.
 *
 * Requires env.TOKEN_SECRET (same value as backend JWT_SECRET).
 * Set it with: wrangler secret put TOKEN_SECRET
 */
async function validateToken(token, env) {
  if (!token || token.length < 10) return null;

  const secret = env.TOKEN_SECRET;
  if (!secret) {
    // TOKEN_SECRET not configured — deny all requests
    console.error('[Worker] TOKEN_SECRET is not set. Run: wrangler secret put TOKEN_SECRET');
    return null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

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
    if (!valid) return null;

    // Decode and check payload
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) return null;

    // Accept media-access tokens (authenticated users)
    if (payload.purpose === 'media-access') return payload;

    // Accept public-share tokens (public project links)
    // scope claim is optional — enforcement is done by the caller
    if (payload.purpose === 'public-share' && payload.isPublic === true) return payload;

    return null;
  } catch (e) {
    console.error('[Worker] JWT validation error:', e.message);
    return null;
  }
}
