// Run: node workers/public-guides.test.mjs  (no dependencies)
import assert from 'node:assert/strict';
import { resolvePublicGuideKey, servePublicGuide, isPublicGuidePath } from './public-guides.js';

const ok = (p) => resolvePublicGuideKey(p);
assert.deepEqual(ok('/public-guides/quotation.ab12cd34.mp4'), { key: 'public-guides/quotation.ab12cd34.mp4', contentType: 'video/mp4' });
assert.equal(ok('/public-guides/q.id.vtt').contentType, 'text/vtt; charset=utf-8');
assert.equal(ok('/public-guides/q.webp').contentType, 'image/webp');
assert.equal(ok('/public-guides/q.JPG').contentType, 'image/jpeg');
for (const bad of [
  '/public-guides/', '/public-guides', '/public-guides/../secret.mp4', '/public-guides/a/../../x.mp4',
  '/public-guides/%2e%2e/x.mp4', '/public-guides/..%2fx.mp4', '/public-guides/a%5Cb.mp4', '/public-guides/x.exe',
  '/public-guides/x', '/public-guides//x.mp4', '/public-guides/./x.mp4', '/public-guides/a b.mp4', '/public-guides/%00.mp4',
  '/other/x.mp4', '/view/TOKEN/public-guides/x.mp4', '/public-guides/%E0%A4%A.mp4', '/public-guides/a/b/c/d.mp4',
]) assert.equal(ok(bad), null, bad);
assert.equal(isPublicGuidePath('/public-guides/x'), true);
assert.equal(isPublicGuidePath('/view/t/x'), false);

// Route behaviour with a fake bucket
const data = new Uint8Array(100).map((_, i) => i);
const env = {
  MY_BUCKET: {
    head: async (k) => (k === 'public-guides/a.mp4' ? { size: 100, httpEtag: '"e"' } : null),
    get: async (k, opts) => {
      if (k !== 'public-guides/a.mp4') return null;
      if (opts?.range) return { body: data.slice(10, 20), size: 100, httpEtag: '"e"', range: { offset: 10, length: 10 } };
      return { body: data, size: 100, httpEtag: '"e"' };
    },
  },
};
const cors = { 'Access-Control-Allow-Origin': '*' };
const req = (m, p, h) => new Request('https://media.example' + p, { method: m, headers: h });
let r = await servePublicGuide(req('GET', '/public-guides/a.mp4'), env, cors);
assert.equal(r.status, 200);
assert.equal(r.headers.get('content-type'), 'video/mp4');
assert.equal(r.headers.get('cache-control'), 'public, max-age=31536000, immutable');
assert.equal(r.headers.get('access-control-allow-origin'), '*');
r = await servePublicGuide(req('GET', '/public-guides/a.mp4', { Range: 'bytes=10-19' }), env, cors);
assert.equal(r.status, 206);
assert.equal(r.headers.get('content-range'), 'bytes 10-19/100');
r = await servePublicGuide(req('HEAD', '/public-guides/a.mp4'), env, cors);
assert.equal(r.status, 200);
assert.equal(r.headers.get('content-length'), '100');
r = await servePublicGuide(req('GET', '/public-guides/missing.mp4'), env, cors);
assert.equal(r.status, 404);
r = await servePublicGuide(req('GET', '/public-guides/..%2fa.mp4'), env, cors);
assert.equal(r.status, 404);
console.log('public-guides: all ok');
