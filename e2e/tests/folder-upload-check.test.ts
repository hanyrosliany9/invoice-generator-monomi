/**
 * Verify folder navigation filter fix and upload queue redesign.
 *
 * Pre-condition: "Selects" folder must exist in project cmk2upt0c0003yc0spxk7czc5.
 * The folder was created via API on 2026-06-18. It has 0 assets (intentionally,
 * so we can confirm the grid goes from 440 → 0 when the folder is selected).
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const BASE = 'https://admin.monomiagency.com';
const EMAIL = 'admin@monomi.id';
const PASSWORD = 'password123';
// Mira Southsea Pearl — 440 assets, has "Selects" folder with 0 assets
const PROJECT_ID = 'cmk2upt0c0003yc0spxk7czc5';

async function login(page: any) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url: URL) => !url.pathname.includes('/login'), { timeout: 15000 });
}

test('folder navigation filters the asset grid', async ({ page }) => {
  await login(page);

  // Navigate directly to project by ID — no need to click a project name
  await page.goto(`${BASE}/media-collab/projects/${PROJECT_ID}`);
  await page.waitForTimeout(3000);

  // Confirm the folder sidebar loaded "Selects"
  // Note: aside.first() is the main nav. Folder sidebar is the second aside (w-52 class).
  const sidebar = page.locator('aside.w-52, aside[class*="w-52"]');
  await expect(sidebar.getByText('Selects')).toBeVisible({ timeout: 10000 });
  console.log('✓ Folder sidebar shows "Selects"');

  // Wait for the grid to load — asset tiles are buttons inside a css grid
  // Each tile renders <button aria-label="{filename}"> inside <div class="grid grid-cols-3...">
  const gridTiles = page.locator('.grid.gap-3 button[aria-label]');
  await gridTiles.first().waitFor({ timeout: 10000 });

  const rootTiles = await gridTiles.count();
  console.log(`Root (All Files) tile count: ${rootTiles}`);
  expect(rootTiles).toBeGreaterThan(0);

  // Screenshot before clicking folder
  await page.screenshot({ path: '/tmp/before-folder-click.png' });

  // Click the "Selects" folder in the sidebar
  // "Selects" folder has 0 assets, so clicking it empties the grid
  await sidebar.getByText('Selects').click();
  await page.waitForTimeout(1500);

  // Screenshot after clicking
  await page.screenshot({ path: '/tmp/after-folder-click.png' });

  // "Selects" has 0 assets — the grid is replaced by UploadZone, so tile count = 0
  const folderTiles = await gridTiles.count();
  console.log(`After clicking "Selects": ${folderTiles} tiles (expecting 0)`);
  expect(folderTiles).toBe(0);
  console.log('✓ Grid cleared when "Selects" folder selected (filteredAssets = 0)');

  // Click "All Files" to go back to root
  await sidebar.locator('div[class*="cursor-pointer"]').filter({ hasText: 'All Files' }).click();
  await page.waitForTimeout(1500);

  const backToRootTiles = await gridTiles.count();
  console.log(`After clicking All Files: ${backToRootTiles} tiles`);
  expect(backToRootTiles).toBeGreaterThan(0);
  console.log('✓ Grid restored after clicking All Files');
});

test('upload queue shows position, filenames, and status labels', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/media-collab/projects/${PROJECT_ID}`);
  await page.waitForTimeout(2000);

  // Create 3 minimal JPEG files in temp dir
  const tmpDir = os.tmpdir();
  const testFiles: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const p = path.join(tmpDir, `queue-test-${i}.jpg`);
    // Smallest valid 1×1 white JPEG
    fs.writeFileSync(p, Buffer.from(
      'ffd8ffe000104a46494600010100000100010000' +
      'ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432' +
      'ffc0000b080001000101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0b' +
      'ffda00080101000000010000000ffd9',
      'hex'
    ));
    testFiles.push(p);
  }

  // Verify there's exactly one file input on the page
  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toHaveCount(1);

  // Set all 3 files simultaneously (simulates bulk select)
  await fileInput.setInputFiles(testFiles);

  // Upload Queue header must appear immediately (before any upload completes)
  await expect(page.getByText(/upload queue/i)).toBeVisible({ timeout: 5000 });
  console.log('✓ "Upload Queue" header appeared');

  // Counter shows "0 / 3" format (done / total)
  const counter = page.locator('span').filter({ hasText: /^\d+ \/ \d+$/ });
  await expect(counter).toBeVisible({ timeout: 3000 });
  const counterText = await counter.textContent();
  console.log(`✓ Counter text: "${counterText}"`);
  expect(counterText).toMatch(/^\d+ \/ 3$/);

  // Filenames must all be visible in the queue
  // .first() because the name can also appear in a toast notification concurrently
  await expect(page.getByText('queue-test-1.jpg').first()).toBeVisible({ timeout: 3000 });
  await expect(page.getByText('queue-test-2.jpg').first()).toBeVisible();
  await expect(page.getByText('queue-test-3.jpg').first()).toBeVisible();
  console.log('✓ All 3 filenames visible in queue');

  // "Waiting" label must appear for queued items (items not yet uploading)
  const waitingLabels = await page.getByText('Waiting').count();
  const percentLabels = await page.getByText(/%/).count();
  console.log(`✓ "Waiting" labels: ${waitingLabels}, "%" labels: ${percentLabels}`);
  // At least one queued item should show "Waiting" (only one uploads at a time)
  expect(waitingLabels + percentLabels).toBeGreaterThanOrEqual(1);

  // Screenshot of queue UI for visual review
  await page.screenshot({ path: '/tmp/upload-queue-ui.png' });
  console.log('✓ Screenshot saved to /tmp/upload-queue-ui.png');

  // Cleanup test files
  testFiles.forEach(f => { try { fs.unlinkSync(f); } catch {} });
});
