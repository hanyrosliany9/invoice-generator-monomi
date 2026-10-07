import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '@/i18n/locales/en.json';
import id from '@/i18n/locales/id.json';
import { GUIDES } from './data';
import { guideImageManifest } from './imageManifest';
import { guideVideoManifest } from './videoManifest';

/** Registry checks for the in-app guides (Panduan / Bantuan): structure, texts in both languages, images and videos. */

type StepText = { title?: string; body?: string; tip?: string };
type GuideText = { title?: string; purpose?: string; steps?: Record<string, StepText> };
const locales: Record<string, Record<string, GuideText>> = {
  id: (id as unknown as { guides: { items: Record<string, GuideText> } }).guides.items,
  en: (en as unknown as { guides: { items: Record<string, GuideText> } }).guides.items,
};

// vitest runs from frontend/
const publicGuides = `${path.resolve(process.cwd(), 'public', 'guides').split(path.sep).join('/')}/`;
const imageFile = (image: string): string => `${publicGuides}${image}.webp`;

describe('guide registry', () => {
  it('has unique slugs, and sub-guides point at a real guide', () => {
    const slugs = GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const g of GUIDES) {
      if (g.partOf !== undefined) expect(slugs, `${g.slug}.partOf`).toContain(g.partOf);
      expect(g.steps.length, `${g.slug} steps`).toBeGreaterThan(0);
      expect(new Set(g.steps.map((s) => s.id)).size, `${g.slug} step ids`).toBe(g.steps.length);
      for (const s of g.steps) if (s.href !== undefined) expect(s.href.startsWith('/'), `${g.slug}/${s.id} href`).toBe(true);
    }
  });

  it.each(['id', 'en'])('has complete %s texts for every guide and step, and none left over', (lang) => {
    const items = locales[lang];
    for (const g of GUIDES) {
      const text = items[g.slug];
      expect(text, `${lang}: ${g.slug}`).toBeDefined();
      expect(text.title?.trim(), `${lang}: ${g.slug}.title`).toBeTruthy();
      expect(text.purpose?.trim(), `${lang}: ${g.slug}.purpose`).toBeTruthy();
      for (const s of g.steps) {
        const st = text.steps?.[s.id];
        expect(st?.title?.trim(), `${lang}: ${g.slug}/${s.id}.title`).toBeTruthy();
        // shortcut steps get their tables from the registry; every other step needs a body
        if (s.shortcuts === undefined) expect(st?.body?.trim(), `${lang}: ${g.slug}/${s.id}.body`).toBeTruthy();
      }
      expect(Object.keys(text.steps ?? {}).sort(), `${lang}: ${g.slug} step keys`).toEqual(g.steps.map((s) => s.id).sort());
    }
    expect(Object.keys(items).sort(), `${lang}: guide keys`).toEqual(GUIDES.map((g) => g.slug).sort());
  });

  it('has a picture on disk, with its size in the manifest, for every illustrated step, and no orphan pictures', () => {
    const used = new Set<string>();
    for (const g of GUIDES) {
      for (const s of g.steps) {
        if (s.image === undefined) continue;
        used.add(s.image);
        expect(guideImageManifest[s.image], `manifest ${s.image}`).toBeDefined();
        expect(fs.existsSync(imageFile(s.image)), `file ${s.image}.webp`).toBe(true);
      }
    }
    for (const key of Object.keys(guideImageManifest)) {
      expect(used.has(key), `orphan manifest entry ${key}`).toBe(true);
      expect(fs.existsSync(imageFile(key)), `manifest entry without file ${key}`).toBe(true);
    }
    const onDisk: string[] = [];
    for (const dir of fs.readdirSync(publicGuides, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      for (const f of fs.readdirSync(`${publicGuides}${dir.name}`)) if (f.endsWith('.webp')) onDisk.push(`${dir.name}/${f.replace(/\.webp$/, '')}`);
    }
    expect(onDisk.filter((p) => !used.has(p)), 'pictures on disk that no step uses').toEqual([]);
  });

  it('lists video chapters only for steps of the guide they belong to', () => {
    for (const [slug, video] of Object.entries(guideVideoManifest)) {
      const guide = GUIDES.find((g) => g.slug === slug);
      expect(guide, `video for unknown guide ${slug}`).toBeDefined();
      const steps = new Set(guide?.steps.map((s) => s.id));
      for (const c of video?.chapters ?? []) expect(steps.has(c.step), `${slug} chapter ${c.step}`).toBe(true);
      expect(video?.mp4, `${slug} mp4`).toMatch(/\.mp4$/);
    }
  });
});
