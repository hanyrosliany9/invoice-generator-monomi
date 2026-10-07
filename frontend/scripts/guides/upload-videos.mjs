/**
 * Uploads the built guide videos (out/videos/dist) to the R2 bucket under
 * public-guides/, where workers/media-worker.js serves them publicly.
 *
 *   node upload-videos.mjs --dry-run     print what would be uploaded
 *   node upload-videos.mjs               upload (needs `wrangler login` / CLOUDFLARE_API_TOKEN)
 *   node upload-videos.mjs --force       upload even files already recorded as uploaded
 *
 * File names contain a content hash, so a name is only ever uploaded once;
 * uploaded names are remembered in out/videos/.uploaded.json (idempotent,
 * safe to re-run). Runs wrangler from workers/ (where wrangler.toml lives).
 * Only files referenced by src/guides/videoManifest.ts are uploaded.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { FRONTEND, HERE } from './lib.mjs';

const DIST = path.join(HERE, 'out', 'videos', 'dist');
const STATE = path.join(HERE, 'out', 'videos', '.uploaded.json');
const WORKERS = path.resolve(FRONTEND, '..', 'workers');
const BUCKET = process.env.GUIDE_R2_BUCKET || 'monomi-finance';
const PREFIX = 'public-guides';
const dry = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

const TYPES = { mp4: 'video/mp4', vtt: 'text/vtt; charset=utf-8', webp: 'image/webp', jpg: 'image/jpeg' };

const src = fs.readFileSync(path.join(FRONTEND, 'src', 'guides', 'videoManifest.ts'), 'utf8');
const names = new Set(src.match(/[A-Za-z0-9-]+\.[0-9a-f]{8}(?:\.chapters)?(?:\.(?:id|en))?\.(?:mp4|webp|vtt)/g) ?? []);
const done = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {};

// Upload the big files last so a failure early on is cheap; captions and posters first.
const files = [...names].sort((a, b) => Number(a.endsWith('.mp4')) - Number(b.endsWith('.mp4')) || a.localeCompare(b));
let up = 0;
let skipped = 0;
let missing = 0;
for (const name of files) {
  const file = path.join(DIST, name);
  if (!fs.existsSync(file)) { console.log(`MISSING  ${name} (run build-videos.mjs)`); missing += 1; continue; }
  if (done[name] && !force) { skipped += 1; continue; }
  const type = TYPES[name.split('.').pop()];
  const kb = (fs.statSync(file).size / 1024).toFixed(0);
  const key = `${BUCKET}/${PREFIX}/${name}`;
  const cmd = ['wrangler', 'r2', 'object', 'put', key, '--file', file, '--content-type', type, '--remote'];
  if (dry) { console.log(`would upload  ${name}  ${kb} KB  ->  ${key}  (${type})`); up += 1; continue; }
  console.log(`uploading  ${name}  ${kb} KB`);
  // Windows needs a shell to find npx.cmd; quote arguments there so "text/vtt; charset=utf-8"
  // and paths with spaces reach wrangler as single arguments.
  const win = process.platform === 'win32';
  const args = win ? cmd.map((a) => (/[\s;&|^<>"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)) : cmd;
  const r = spawnSync('npx', args, { cwd: WORKERS, stdio: 'inherit', shell: win });
  if (r.status !== 0) { console.error(`FAILED ${name}`); process.exitCode = 1; break; }
  done[name] = new Date().toISOString();
  fs.writeFileSync(STATE, JSON.stringify(done, null, 1));
  up += 1;
}
console.log(`\n${dry ? 'would upload' : 'uploaded'} ${up}, already uploaded ${skipped}, missing ${missing}`);
if (missing > 0) process.exitCode = 1;
