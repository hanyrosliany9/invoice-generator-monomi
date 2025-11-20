/**
 * Cloudflare Worker - Authenticated Media Delivery from R2
 *
 * Purpose: Serve media files from private R2 bucket with token authentication
 * Architecture: User → Worker (Edge) → R2 → CDN Cache → User
 *
 * Flow:
 * 1. User requests: https://media.monomiagency.com/view/TOKEN/content/file.jpg
 * 2. Worker validates token (checks against backend API or Redis)
 * 3. If valid, fetch from R2 and return with cache headers
 * 4. CDN caches response for 24 hours
 *
 * Environment Variables Required:
 * - R2_BUCKET (binding): R2 bucket binding named MY_BUCKET
 * - BACKEND_URL (secret): Backend API URL for token validation
 * - TOKEN_SECRET (secret): JWT secret for local token validation (optional)
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }

    // Parse URL: /view/TOKEN/key/path/to/file.jpg
    const pathParts = url.pathname.split('/').filter(p => p);

    if (pathParts.length < 3 || pathParts[0] !== 'view') {
      return new Response('Invalid URL format. Expected: /view/TOKEN/key/path/to/file.jpg', {
        status: 400
      });
    }

    const token = pathParts[1];
    const key = pathParts.slice(2).join('/'); // Reconstruct full key path

    try {
      // Validate token
      const isValid = await validateToken(token, env);

      if (!isValid) {
        return new Response('Unauthorized: Invalid or expired token', {
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        });
      }

      // Fetch from R2
      const object = await env.MY_BUCKET.get(key);

      if (!object) {
        return new Response('File not found', {
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        });
      }

      // Return file with cache headers
      const headers = new Headers();
      headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
      headers.set('Cache-Control', 'public, max-age=86400, must-revalidate'); // 24h cache
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
      headers.set('ETag', object.httpEtag);

      // Add original filename if available
      if (object.customMetadata?.originalName) {
        const encodedFilename = encodeURIComponent(object.customMetadata.originalName);
        headers.set('Content-Disposition', `inline; filename="${object.customMetadata.originalName}"; filename*=UTF-8''${encodedFilename}`);
      }

      return new Response(object.body, { headers });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal server error: ' + error.message, {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
  },
};

/**
 * Validate media access token or public share token
 *
 * Tries to validate token in this order:
 * 1. Media access token (authenticated users)
 * 2. Public share token (public project links)
 *
 * @param token - Token to validate
 * @param env - Worker environment variables
 * @returns true if token is valid, false otherwise
 */
async function validateToken(token, env) {
  try {
    // Basic token format check
    if (!token || token.length < 10) {
      return false;
    }

    const backendUrl = env.BACKEND_URL || 'https://admin.monomiagency.com';

    // Try 1: Validate as media access token (authenticated user)
    try {
      const mediaValidationUrl = `${backendUrl}/api/v1/media/validate-token?token=${encodeURIComponent(token)}`;

      const mediaResponse = await fetch(mediaValidationUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Cache validation results for 15 minutes to reduce backend load (consistent with public token caching)
        cf: {
          cacheTtl: 900, // 15 minutes (was 5 minutes)
          cacheEverything: true,
        },
      });

      if (mediaResponse.ok) {
        const data = await mediaResponse.json();
        // Backend returns: { data: { success: true, data: { userId, valid: true } } }
        if (data.data && data.data.success && data.data.data && data.data.data.valid) {
          console.log('Token validated as media access token');
          return true;
        }
      }
    } catch (error) {
      console.log('Not a media access token, trying public token...', error.message);
    }

    // Try 2: Validate as public share token (public project)
    try {
      const publicValidationUrl = `${backendUrl}/api/v1/media-collab/public/validate-token?token=${encodeURIComponent(token)}`;
      console.log('[Worker] Validating public token:', publicValidationUrl);

      const publicResponse = await fetch(publicValidationUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Cache public token validation for 15 minutes (aggressive caching for performance)
        // Public share tokens don't change frequently, and caching eliminates 95%+ of backend API calls
        cf: {
          cacheTtl: 900, // 15 minutes (was 0 - caused 100% backend API calls!)
          cacheEverything: true,
        },
      });

      console.log('[Worker] Public validation response status:', publicResponse.status);

      if (publicResponse.ok) {
        const data = await publicResponse.json();
        console.log('[Worker] Public validation data:', JSON.stringify(data));

        // Backend returns: { data: { success: true, data: { projectId, valid: true, isPublic: true } } }
        if (data.data && data.data.success && data.data.data && data.data.data.valid && data.data.data.isPublic) {
          console.log('[Worker] ✅ Token validated as public share token');
          return true;
        } else {
          console.log('[Worker] ❌ Public token validation failed - invalid data structure');
        }
      } else {
        console.log('[Worker] ❌ Public token validation HTTP error:', publicResponse.status);
      }
    } catch (error) {
      console.log('[Worker] ❌ Public token validation error:', error.message);
    }

    // Both validation attempts failed
    console.error('Token validation failed: not a media token or public token');
    return false;

  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

/**
 * Handle CORS preflight requests
 */
function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
