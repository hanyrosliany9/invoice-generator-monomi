/**
 * Loads the app's guide structure (src/guides/data.ts) and texts (i18n locales)
 * for the video pipeline, without duplicating either. data.ts is bundled with
 * the esbuild that ships with Vite; lucide-react stays external.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { FRONTEND, HERE } from './lib.mjs';

const requireFromFrontend = createRequire(path.join(FRONTEND, 'package.json'));

let guidesCache = null;
export function loadGuides() {
  if (guidesCache) return guidesCache;
  const esbuild = requireFromFrontend('esbuild');
  const outfile = path.join(HERE, 'out', '.tmp', 'guides-data.cjs');
  esbuild.buildSync({
    entryPoints: [path.join(FRONTEND, 'src', 'guides', 'data.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile,
    external: ['lucide-react'],
    logLevel: 'silent',
  });
  const mod = createRequire(import.meta.url)(outfile);
  guidesCache = mod.GUIDES.map((g) => ({ slug: g.slug, audience: g.audience, minutes: g.minutes, steps: g.steps.map((s) => s.id) }));
  return guidesCache;
}

const localeCache = {};
export function loadLocale(lang) {
  if (!localeCache[lang]) {
    localeCache[lang] = JSON.parse(fs.readFileSync(path.join(FRONTEND, 'src', 'i18n', 'locales', `${lang}.json`), 'utf8'));
  }
  return localeCache[lang];
}

/** { title, purpose, steps: { id: { title, body, tip } } } for a guide in a language. */
export function guideText(slug, lang) {
  const it = loadLocale(lang)?.guides?.items?.[slug];
  if (!it) throw new Error(`no ${lang} text for guide ${slug}`);
  return it;
}

/* ---------------- narration text (shared by recording pacing and the .md scripts) ---------------- */

const WPS = { id: 2.4, en: 2.6 }; // comfortable words per second for a voice-over

const clean = (s, lang) => String(s ?? '')
  .replace(/\s*\(\d+\)/g, '')            // "(1)" badge references mean nothing when spoken
  .replace(/\s*&\s*/g, lang === 'id' ? ' dan ' : ' and ')
  .replace(/["“”]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const sentences = (s) => (clean(s).match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? []).map((x) => x.trim()).filter(Boolean);
export const wordCount = (s) => (s.match(/\S+/g) ?? []).length;

/** Spoken text of a step: its title plus the first sentence(s) of the body (about 30 words at most). */
export function narrationText(slug, stepId, lang) {
  const st = guideText(slug, lang).steps[stepId];
  if (!st) return '';
  const title = clean(st.title, lang).replace(/[.:]$/, '');
  let out = `${title}.`;
  for (const sn of sentences(st.body ?? '')) {
    if (wordCount(`${out} ${sn}`) > 32 && out !== `${title}.`) break;
    out = `${out} ${/[.!?]$/.test(sn) ? sn : `${sn}.`}`;
  }
  return out;
}

export const narrationSeconds = (slug, stepId, lang = 'id') => wordCount(narrationText(slug, stepId, lang)) / WPS[lang];
export const speechRate = WPS;

/** Caption text: the step title, and the first sentence of the body as the short instruction. */
export function captionText(slug, stepId, lang) {
  const st = guideText(slug, lang).steps[stepId];
  const title = clean(st.title, lang);
  const first = sentences(st.body ?? '')[0] ?? '';
  const short = first.length > 110 ? `${first.slice(0, 107).replace(/\s+\S*$/, '')}...` : first;
  return short ? `${title}\n${short}` : title;
}
