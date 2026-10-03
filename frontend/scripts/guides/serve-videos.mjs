/**
 * Tiny static server for local player tests: serves out/videos/dist with Range
 * and CORS, like the media worker does for public-guides/.
 *   node serve-videos.mjs [port]      then run Vite with VITE_GUIDE_VIDEO_BASE=http://localhost:<port>
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { HERE } from './lib.mjs';

const DIST = path.join(HERE, 'out', 'videos', 'dist');
const port = Number(process.argv[2] || 5290);
const types = { mp4: 'video/mp4', vtt: 'text/vtt; charset=utf-8', webp: 'image/webp', jpg: 'image/jpeg' };

http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Range', 'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length' };
  const name = path.basename(decodeURIComponent((req.url || '').split('?')[0]));
  const file = path.join(DIST, name);
  const type = types[name.split('.').pop()];
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  if (!type || !fs.existsSync(file)) { res.writeHead(404, cors); return res.end('Not Found'); }
  const size = fs.statSync(file).size;
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  const h = { ...cors, 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
  if (m) {
    const start = m[1] ? Number(m[1]) : 0;
    const end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    res.writeHead(206, { ...h, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...h, 'Content-Length': size });
  return fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`serving ${DIST} on http://localhost:${port}`));
