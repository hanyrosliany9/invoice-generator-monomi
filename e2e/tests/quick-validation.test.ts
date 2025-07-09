import { test, expect } from '@playwright/test';

test.describe('Quick Validation Tests - Real Application', () => {
  test('Frontend is accessible', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page).toHaveTitle(/Sistem Manajemen Bisnis Indonesia/i);
  });

  test('Login form is present', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible({ timeout: 10000 });
  });

  test('Backend API health check', async ({ request }) => {
    const response = await request.get('http://localhost:5000/api/v1/health');
    expect(response.status()).toBe(200);
  });

  test('Database connection works', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Fill login form
    await page.fill('[data-testid="email-input"]', 'admin@bisnis.co.id');
    await page.fill('[data-testid="password-input"]', 'password123');
    
    // Click login
    await page.click('[data-testid="login-button"]');
    
    // Should redirect to dashboard (or show some response that indicates DB connection)
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page.locator('h1, h2')).toContainText(/dashboard/i);
  });

  test('Key UI elements have test IDs', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Verify test IDs are present for key elements
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });
});