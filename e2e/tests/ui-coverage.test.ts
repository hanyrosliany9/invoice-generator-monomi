import { test, expect } from '@playwright/test';

test.describe('UI Coverage Tests - Indonesian Business System', () => {
  test.beforeEach(async ({ page }) => {
    // Login to the application
    await page.goto('http://localhost:3000');
    await page.fill('[data-testid="email-input"]', 'admin@bisnis.co.id');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/dashboard');
  });

  test('Dashboard navigation works', async ({ page }) => {
    await expect(page.locator('h1, h2')).toContainText(/dashboard/i);
    console.log('✅ Dashboard is accessible');
  });

  test('Invoices page has all required test IDs', async ({ page }) => {
    await page.goto('http://localhost:3000/invoices');
    
    // Check for key buttons we added test IDs to
    await expect(page.locator('[data-testid="create-invoice-button"]')).toBeVisible();
    console.log('✅ Create Invoice button found');
    
    await expect(page.locator('[data-testid="invoice-export-button"]')).toBeVisible();
    console.log('✅ Export Invoice button found');
    
    await expect(page.locator('[data-testid="invoice-filter-button"]')).toBeVisible();
    console.log('✅ Filter Invoice button found');
  });

  test('Quotations page has all required test IDs', async ({ page }) => {
    await page.goto('http://localhost:3000/quotations');
    
    await expect(page.locator('[data-testid="create-quotation-button"]')).toBeVisible();
    console.log('✅ Create Quotation button found');
    
    await expect(page.locator('[data-testid="quotation-export-button"]')).toBeVisible();
    console.log('✅ Export Quotation button found');
  });

  test('Clients page has all required test IDs', async ({ page }) => {
    await page.goto('http://localhost:3000/clients');
    
    await expect(page.locator('[data-testid="create-client-button"]')).toBeVisible();
    console.log('✅ Create Client button found');
    
    await expect(page.locator('[data-testid="client-import-button"]')).toBeVisible();
    console.log('✅ Import Client button found');
    
    await expect(page.locator('[data-testid="client-export-button"]')).toBeVisible();
    console.log('✅ Export Client button found');
  });

  test('Projects page has all required test IDs', async ({ page }) => {
    await page.goto('http://localhost:3000/projects');
    
    await expect(page.locator('[data-testid="create-project-button"]')).toBeVisible();
    console.log('✅ Create Project button found');
    
    await expect(page.locator('[data-testid="project-filter-button"]')).toBeVisible();
    console.log('✅ Filter Project button found');
  });

  test('Settings page has all required test IDs', async ({ page }) => {
    await page.goto('http://localhost:3000/settings');
    
    await expect(page.locator('[data-testid="reset-settings-button"]')).toBeVisible();
    console.log('✅ Reset Settings button found');
  });

  test('Indonesian business features are present', async ({ page }) => {
    await page.goto('http://localhost:3000/invoices');
    
    // Check for Materai (Indonesian stamp duty) functionality
    await expect(page.locator('[data-testid="materai-reminder-button"]')).toBeVisible();
    console.log('✅ Materai reminder system found');
    
    // Check for Indonesian currency formatting
    const currencyElements = page.locator('.idr-amount, [data-currency="IDR"]');
    const count = await currencyElements.count();
    console.log(`✅ Found ${count} IDR currency elements`);
  });
});