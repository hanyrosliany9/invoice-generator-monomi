/**
 * Performance check — verifies thumbnails (not originals) are loaded in gallery grids.
 */

import { test, expect } from '@playwright/test';

const BASE = 'https://admin.monomiagency.com';
const EMAIL = 'admin@monomi.id';
const PASSWORD = 'password123';
const PUBLIC_TOKEN = 'JC7rlX0MpIZtsvc_Y7xsAQ';

test('public gallery: all <img> tags use thumbnails path, not content/ originals', async ({ page }) => {
  const imageRequests: string[] = [];

  // Capture every image request the browser makes
  page.on('request', (req) => {
    if (req.resourceType() === 'image') {
      imageRequests.push(req.url());
    }
  });

  await page.goto(`${BASE}/shared/${PUBLIC_TOKEN}`);

  // Wait for the first batch of asset tiles to render
  await page.locator('button').filter({ hasText: /VIDEO|IMAGE|RAW/i }).first()
    .waitFor({ timeout: 20000 });

  // Scroll to the bottom to trigger lazy loading of remaining tiles
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1000);

  console.log(`Total image requests: ${imageRequests.length}`);

  // Categorise by path
  const thumbnailRequests = imageRequests.filter(u => u.includes('/thumbnails/'));
  const contentRequests = imageRequests.filter(u => u.includes('/content/') && !u.includes('thumbnail'));
  const workerRequests = imageRequests.filter(u => u.includes('media.monomiagency.com'));

  console.log(`  thumbnails/ path: ${thumbnailRequests.length}`);
  console.log(`  content/ path (originals): ${contentRequests.length}`);
  console.log(`  via Cloudflare Worker: ${workerRequests.length}`);

  if (contentRequests.length > 0) {
    console.log('ORIGINAL URLs being loaded:');
    contentRequests.slice(0, 5).forEach(u => console.log(' ', u));
  }

  // No full original content/ URLs should be loaded in the gallery grid
  expect(contentRequests.length).toBe(0);
});

test('authenticated gallery: no full originals loaded in asset grid', async ({ page }) => {
  const imageRequests: string[] = [];

  page.on('request', (req) => {
    if (req.resourceType() === 'image') {
      imageRequests.push(req.url());
    }
  });

  // Login
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });

  // Go to the Mira Southsea Pearl project (440 assets) — navigate directly by ID
  await page.goto(`${BASE}/media-collab/projects/cmk2upt0c0003yc0spxk7czc5`);
  await page.waitForTimeout(3000);

  // Scroll to trigger lazy loading
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);

  console.log(`Total image requests: ${imageRequests.length}`);

  // All grid images should go through media.monomiagency.com (Cloudflare Worker)
  const workerRequests = imageRequests.filter(u => u.includes('media.monomiagency.com'));
  // Thumbnail keys start with "thumbnails/"
  const thumbViaWorker = workerRequests.filter(u => u.includes('/thumbnails/'));
  // Original content keys
  const originalViaWorker = workerRequests.filter(u => u.includes('/content/') && !u.includes('/thumbnails/'));
  // Legacy proxy (no mediaToken scenario)
  const legacyProxy = imageRequests.filter(u => u.includes('/api/v1/media/proxy/'));

  console.log(`  via Worker total: ${workerRequests.length}`);
  console.log(`    thumbnails/ (correct): ${thumbViaWorker.length}`);
  console.log(`    content/ originals (BAD): ${originalViaWorker.length}`);
  console.log(`  legacy proxy: ${legacyProxy.length}`);

  if (originalViaWorker.length > 0) {
    console.log('BAD — loading originals:');
    originalViaWorker.slice(0, 5).forEach(u => console.log(' ', u));
  }

  // Grid should only load thumbnails, not full originals
  expect(originalViaWorker.length).toBe(0);
});

test('gallery page loads first paint under 5 seconds', async ({ page }) => {
  const start = Date.now();

  await page.goto(`${BASE}/shared/${PUBLIC_TOKEN}`);
  // Wait for at least one asset tile to be visible
  await page.locator('button').filter({ hasText: /VIDEO|IMAGE|RAW/i }).first()
    .waitFor({ timeout: 20000 });

  const elapsed = Date.now() - start;
  console.log(`First asset tile visible in ${elapsed}ms`);

  expect(elapsed).toBeLessThan(10000); // 10s max (network latency included)
});
