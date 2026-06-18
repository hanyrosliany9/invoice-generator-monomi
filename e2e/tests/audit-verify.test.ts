/**
 * Audit verification test — checks the key flows fixed in this session:
 * 1. Login page loads, works, shows proper error messages
 * 2. Media collab project list loads after login
 * 3. Public share page loads with correct asset gallery
 * 4. GuestFeedbackPanel: star rating + comment form present
 */

import { test, expect } from '@playwright/test';

const BASE = 'https://admin.monomiagency.com';
const EMAIL = 'admin@monomi.id';
const PASSWORD = 'password123';
const PUBLIC_TOKEN = 'JC7rlX0MpIZtsvc_Y7xsAQ'; // Mira Southsea Pearl (440 assets)

test.describe('Login page', () => {
  test('loads without blank screen', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.locator('h1')).toContainText('monomi', { timeout: 10000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('shows error message on wrong credentials', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    // Error message appears (text depends on locale — just check it's visible)
    await expect(
      page.locator('[class*="danger"], [class*="error"], [class*="alert"]').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    expect(page.url()).not.toContain('/login');
  });
});

test.describe('Media collab (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  });

  test('media collab page loads project list', async ({ page }) => {
    await page.goto(`${BASE}/media-collab`);
    // "Media Collaboration" heading visible
    await expect(page.getByText('Media Collaboration').first()).toBeVisible({ timeout: 15000 });
    // At least one project card visible — use .first() since "Mira Southsea Pearl June 2026" also exists
    await expect(page.getByText('Mira Southsea Pearl').first()).toBeVisible({ timeout: 10000 });
    // No error boundary
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});

test.describe('Public share page', () => {
  test('gallery loads with assets', async ({ page }) => {
    await page.goto(`${BASE}/shared/${PUBLIC_TOKEN}`);
    // Header brand name
    await expect(page.getByText('monomi').first()).toBeVisible({ timeout: 10000 });
    // Asset tiles — the badge shows mediaType e.g. "VIDEO", "IMAGE"
    await expect(
      page.locator('button').filter({ hasText: /VIDEO|IMAGE|RAW/i }).first()
    ).toBeVisible({ timeout: 20000 });
  });

  test('clicking an asset opens lightbox with GuestFeedbackPanel', async ({ page }) => {
    await page.goto(`${BASE}/shared/${PUBLIC_TOKEN}`);
    const firstAsset = page.locator('button').filter({ hasText: /VIDEO|IMAGE|RAW/i }).first();
    await firstAsset.waitFor({ timeout: 20000 });
    await firstAsset.click();

    // Lightbox opens
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 8000 });

    // GuestFeedbackPanel header visible ("LEAVE FEEDBACK")
    await expect(page.getByText(/leave feedback/i)).toBeVisible({ timeout: 5000 });

    // Star rating section
    await expect(page.getByText(/asset rating/i)).toBeVisible({ timeout: 5000 });

    // Comment form: name field + textarea + send button
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /send comment/i })).toBeVisible();
  });

  test('VIEW_ONLY: comment submission blocked with error message', async ({ page }) => {
    await page.goto(`${BASE}/shared/${PUBLIC_TOKEN}`);
    const firstAsset = page.locator('button').filter({ hasText: /VIDEO|IMAGE|RAW/i }).first();
    await firstAsset.waitFor({ timeout: 20000 });
    await firstAsset.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 8000 });

    // Fill guest name + comment
    await page.locator('input[id="guest-name-input"]').fill('Test Auditor');
    await page.locator('textarea').fill('Test comment from audit verification');

    // Send — API returns 403 (VIEW_ONLY) → error message appears
    await page.locator('button').filter({ hasText: /send comment/i }).click();
    await expect(
      page.locator('[class*="danger"], [class*="error"]').filter({ hasText: /.+/ }).first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('VIEW_ONLY: star rating click shows error state', async ({ page }) => {
    await page.goto(`${BASE}/shared/${PUBLIC_TOKEN}`);
    const firstAsset = page.locator('button').filter({ hasText: /VIDEO|IMAGE|RAW/i }).first();
    await firstAsset.waitFor({ timeout: 20000 });
    await firstAsset.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/asset rating/i)).toBeVisible({ timeout: 5000 });

    // Click the 4th star (stars are buttons inside the rating group)
    const stars = page.locator('[role="group"]').filter({ hasText: /asset rating/i })
      .locator('button[type="button"]').first().locator('xpath=../button');
    // Simpler: find all star buttons inside the feedback panel
    const starButtons = page.locator('[role="dialog"] button[aria-label*="star"], [role="dialog"] button[aria-label*="bintang"]');
    const starCount = await starButtons.count();
    if (starCount > 0) {
      await starButtons.nth(3).click();
      // Should show an error (403 from VIEW_ONLY)
      await expect(
        page.locator('[role="dialog"]').locator('[class*="danger"], [class*="error"]').first()
      ).toBeVisible({ timeout: 8000 });
    } else {
      // If aria-label doesn't match, click inside the rating section directly
      const ratingSection = page.locator('[role="dialog"]').getByText(/asset rating/i)
        .locator('xpath=../..').locator('button').first();
      await ratingSection.click();
      await expect(
        page.locator('[role="dialog"]').locator('[class*="danger"], [class*="error"]').first()
      ).toBeVisible({ timeout: 8000 });
    }
  });
});
