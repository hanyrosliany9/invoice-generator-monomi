import { test, expect, Page } from '@playwright/test';
import { pixelmatch } from 'pixelmatch';
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';

// Visual regression test configuration
interface VisualTestConfig {
  threshold: number;
  maskElements?: string[];
  fullPage?: boolean;
  clip?: { x: number; y: number; width: number; height: number };
  animations?: 'disabled' | 'allow';
  timeout?: number;
}

// Test viewport configurations
const viewports = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 }
];

// Theme configurations
const themes = [
  { name: 'light', colorScheme: 'light' },
  { name: 'dark', colorScheme: 'dark' }
];

test.describe('Visual Regression Tests', () => {
  let adminPage: Page;
  let visualReport: any = {
    timestamp: new Date().toISOString(),
    testResults: [],
    comparisons: [],
    errors: [],
    summary: {}
  };

  test.beforeAll(async ({ browser }) => {
    const adminContext = await browser.newContext({
      storageState: './admin-auth.json',
      locale: 'id-ID',
      timezoneId: 'Asia/Jakarta'
    });
    adminPage = await adminContext.newPage();
  });

  test.afterAll(async () => {
    // Generate visual regression report
    const reportPath = path.join('./test-results', 'visual-regression-report.json');
    await fs.promises.writeFile(reportPath, JSON.stringify(visualReport, null, 2));
    await adminPage.close();
  });

  // Helper function to take screenshot with configuration
  async function takeScreenshot(
    page: Page,
    elementSelector: string | undefined,
    config: VisualTestConfig
  ): Promise<Buffer> {
    // Mask dynamic elements
    if (config.maskElements) {
      for (const selector of config.maskElements) {
        await page.locator(selector).evaluateAll((elements) => {
          elements.forEach((el) => {
            (el as HTMLElement).style.visibility = 'hidden';
          });
        });
      }
    }

    // Disable animations if requested
    if (config.animations === 'disabled') {
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
          }
        `
      });
    }

    // Take screenshot
    const screenshotOptions: any = {
      fullPage: config.fullPage || false,
      clip: config.clip,
      timeout: config.timeout || 30000
    };

    if (elementSelector) {
      return await page.locator(elementSelector).screenshot(screenshotOptions);
    } else {
      return await page.screenshot(screenshotOptions);
    }
  }

  // Helper function to compare screenshots
  async function compareScreenshots(
    testName: string,
    actual: Buffer,
    expected: Buffer,
    threshold: number = 0.2
  ): Promise<{ match: boolean; diff: number; diffImage?: Buffer }> {
    const actualPng = PNG.sync.read(actual);
    const expectedPng = PNG.sync.read(expected);

    const { width, height } = actualPng;
    const diff = new PNG({ width, height });

    const numDiffPixels = pixelmatch(
      expectedPng.data,
      actualPng.data,
      diff.data,
      width,
      height,
      { threshold }
    );

    const totalPixels = width * height;
    const diffPercentage = (numDiffPixels / totalPixels) * 100;

    const match = diffPercentage < threshold;
    const diffImage = match ? undefined : PNG.sync.write(diff);

    visualReport.comparisons.push({
      testName,
      diffPercentage,
      numDiffPixels,
      totalPixels,
      match,
      timestamp: Date.now()
    });

    return { match, diff: diffPercentage, diffImage };
  }

  test.describe('Dashboard Visual Tests', () => {
    for (const viewport of viewports) {
      test(`Dashboard layout - ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Wait for dashboard components to load
        await page.waitForSelector('[data-testid="dashboard-container"]');
        await page.waitForSelector('[data-testid="metric-cards"]');
        await page.waitForSelector('[data-testid="revenue-chart"]');
        await page.waitForSelector('[data-testid="recent-activities"]');

        const config: VisualTestConfig = {
          threshold: 0.2,
          maskElements: [
            '[data-testid="current-date"]',
            '[data-testid="current-time"]',
            '[data-testid="user-avatar"]',
            '[data-testid="notification-badge"]'
          ],
          fullPage: true,
          animations: 'disabled'
        };

        // Take screenshot
        const screenshot = await takeScreenshot(page, undefined, config);

        // Compare with baseline
        await expect(screenshot).toMatchSnapshot(`dashboard-${viewport.name}.png`, {
          threshold: config.threshold
        });

        visualReport.testResults.push({
          test: `Dashboard layout - ${viewport.name}`,
          viewport: viewport,
          status: 'PASSED',
          timestamp: Date.now()
        });
      });
    }
  });

  test.describe('Invoice Form Visual Tests', () => {
    for (const viewport of viewports) {
      test(`Invoice form layout - ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/invoices');
        await page.waitForLoadState('networkidle');

        await page.click('[data-testid="create-invoice-button"]');
        await page.waitForSelector('[data-testid="invoice-form"]');

        const config: VisualTestConfig = {
          threshold: 0.2,
          maskElements: [
            '[data-testid="invoice-number"]',
            '[data-testid="creation-date"]'
          ],
          fullPage: true,
          animations: 'disabled'
        };

        const screenshot = await takeScreenshot(page, '[data-testid="invoice-form"]', config);

        await expect(screenshot).toMatchSnapshot(`invoice-form-${viewport.name}.png`, {
          threshold: config.threshold
        });

        visualReport.testResults.push({
          test: `Invoice form layout - ${viewport.name}`,
          viewport: viewport,
          status: 'PASSED',
          timestamp: Date.now()
        });
      });
    }
  });

  test.describe('Data Table Visual Tests', () => {
    const tables = [
      { name: 'clients', url: '/clients', selector: '[data-testid="clients-table"]' },
      { name: 'projects', url: '/projects', selector: '[data-testid="projects-table"]' },
      { name: 'quotations', url: '/quotations', selector: '[data-testid="quotations-table"]' },
      { name: 'invoices', url: '/invoices', selector: '[data-testid="invoices-table"]' }
    ];

    for (const table of tables) {
      test(`${table.name} table layout`, async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto(table.url);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector(table.selector);

        const config: VisualTestConfig = {
          threshold: 0.2,
          maskElements: [
            '[data-testid="table-row-id"]',
            '[data-testid="created-date"]',
            '[data-testid="updated-date"]'
          ],
          fullPage: false,
          animations: 'disabled'
        };

        const screenshot = await takeScreenshot(page, table.selector, config);

        await expect(screenshot).toMatchSnapshot(`${table.name}-table.png`, {
          threshold: config.threshold
        });

        visualReport.testResults.push({
          test: `${table.name} table layout`,
          status: 'PASSED',
          timestamp: Date.now()
        });
      });
    }
  });

  test.describe('PDF Preview Visual Tests', () => {
    test('Invoice PDF preview', async ({ page }) => {
      await page.goto('/invoices');
      await page.waitForLoadState('networkidle');

      // Click on first invoice
      await page.click('[data-testid="invoice-row"]:first-child');
      await page.waitForSelector('[data-testid="invoice-detail"]');

      // Generate PDF preview
      await page.click('[data-testid="preview-pdf-button"]');
      await page.waitForSelector('[data-testid="pdf-preview"]');

      const config: VisualTestConfig = {
        threshold: 0.3, // PDFs might have slight rendering differences
        maskElements: [
          '[data-testid="invoice-number"]',
          '[data-testid="invoice-date"]',
          '[data-testid="due-date"]'
        ],
        fullPage: false,
        animations: 'disabled'
      };

      const screenshot = await takeScreenshot(page, '[data-testid="pdf-preview"]', config);

      await expect(screenshot).toMatchSnapshot('invoice-pdf-preview.png', {
        threshold: config.threshold
      });

      visualReport.testResults.push({
        test: 'Invoice PDF preview',
        status: 'PASSED',
        timestamp: Date.now()
      });
    });

    test('Quotation PDF preview', async ({ page }) => {
      await page.goto('/quotations');
      await page.waitForLoadState('networkidle');

      // Click on first quotation
      await page.click('[data-testid="quotation-row"]:first-child');
      await page.waitForSelector('[data-testid="quotation-detail"]');

      // Generate PDF preview
      await page.click('[data-testid="preview-pdf-button"]');
      await page.waitForSelector('[data-testid="pdf-preview"]');

      const config: VisualTestConfig = {
        threshold: 0.3,
        maskElements: [
          '[data-testid="quotation-number"]',
          '[data-testid="quotation-date"]',
          '[data-testid="valid-until"]'
        ],
        fullPage: false,
        animations: 'disabled'
      };

      const screenshot = await takeScreenshot(page, '[data-testid="pdf-preview"]', config);

      await expect(screenshot).toMatchSnapshot('quotation-pdf-preview.png', {
        threshold: config.threshold
      });

      visualReport.testResults.push({
        test: 'Quotation PDF preview',
        status: 'PASSED',
        timestamp: Date.now()
      });
    });
  });

  test.describe('Chart and Graph Visual Tests', () => {
    test('Revenue chart visual regression', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="revenue-chart"]');

      // Wait for chart to render
      await page.waitForTimeout(3000);

      const config: VisualTestConfig = {
        threshold: 0.4, // Charts might have animation differences
        maskElements: [
          '[data-testid="chart-tooltip"]',
          '[data-testid="chart-hover-effect"]'
        ],
        fullPage: false,
        animations: 'disabled'
      };

      const screenshot = await takeScreenshot(page, '[data-testid="revenue-chart"]', config);

      await expect(screenshot).toMatchSnapshot('revenue-chart.png', {
        threshold: config.threshold
      });

      visualReport.testResults.push({
        test: 'Revenue chart visual regression',
        status: 'PASSED',
        timestamp: Date.now()
      });
    });

    test('Payment status chart', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="payment-status-chart"]');

      // Wait for chart to render
      await page.waitForTimeout(3000);

      const config: VisualTestConfig = {
        threshold: 0.4,
        maskElements: [
          '[data-testid="chart-tooltip"]',
          '[data-testid="chart-legend-hover"]'
        ],
        fullPage: false,
        animations: 'disabled'
      };

      const screenshot = await takeScreenshot(page, '[data-testid="payment-status-chart"]', config);

      await expect(screenshot).toMatchSnapshot('payment-status-chart.png', {
        threshold: config.threshold
      });

      visualReport.testResults.push({
        test: 'Payment status chart',
        status: 'PASSED',
        timestamp: Date.now()
      });
    });
  });

  test.describe('Modal and Dialog Visual Tests', () => {
    test('Create client modal', async ({ page }) => {
      await page.goto('/clients');
      await page.waitForLoadState('networkidle');

      await page.click('[data-testid="create-client-button"]');
      await page.waitForSelector('[data-testid="client-modal"]');

      const config: VisualTestConfig = {
        threshold: 0.2,
        maskElements: [],
        fullPage: false,
        animations: 'disabled'
      };

      const screenshot = await takeScreenshot(page, '[data-testid="client-modal"]', config);

      await expect(screenshot).toMatchSnapshot('create-client-modal.png', {
        threshold: config.threshold
      });

      visualReport.testResults.push({
        test: 'Create client modal',
        status: 'PASSED',
        timestamp: Date.now()
      });
    });

    test('Confirmation dialog', async ({ page }) => {
      await page.goto('/invoices');
      await page.waitForLoadState('networkidle');

      // Trigger delete confirmation
      await page.click('[data-testid="invoice-row"]:first-child [data-testid="delete-button"]');
      await page.waitForSelector('[data-testid="confirmation-dialog"]');

      const config: VisualTestConfig = {
        threshold: 0.2,
        maskElements: [],
        fullPage: false,
        animations: 'disabled'
      };

      const screenshot = await takeScreenshot(page, '[data-testid="confirmation-dialog"]', config);

      await expect(screenshot).toMatchSnapshot('confirmation-dialog.png', {
        threshold: config.threshold
      });

      visualReport.testResults.push({
        test: 'Confirmation dialog',
        status: 'PASSED',
        timestamp: Date.now()
      });
    });
  });

  test.describe('Error State Visual Tests', () => {
    test('404 error page', async ({ page }) => {
      await page.goto('/non-existent-page');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="error-page"]');

      const config: VisualTestConfig = {
        threshold: 0.2,
        maskElements: [],
        fullPage: true,
        animations: 'disabled'
      };

      const screenshot = await takeScreenshot(page, undefined, config);

      await expect(screenshot).toMatchSnapshot('404-error-page.png', {
        threshold: config.threshold
      });

      visualReport.testResults.push({
        test: '404 error page',
        status: 'PASSED',
        timestamp: Date.now()
      });
    });

    test('Network error state', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/v1/clients', (route) => {
        route.abort('failed');
      });

      await page.goto('/clients');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="network-error"]');

      const config: VisualTestConfig = {
        threshold: 0.2,
        maskElements: [],
        fullPage: false,
        animations: 'disabled'
      };

      const screenshot = await takeScreenshot(page, '[data-testid="network-error"]', config);

      await expect(screenshot).toMatchSnapshot('network-error-state.png', {
        threshold: config.threshold
      });

      visualReport.testResults.push({
        test: 'Network error state',
        status: 'PASSED',
        timestamp: Date.now()
      });
    });
  });

  test.describe('Indonesian Localization Visual Tests', () => {
    test('Indonesian date formatting', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Check various date displays
      await page.waitForSelector('[data-testid="current-date"]');
      await page.waitForSelector('[data-testid="recent-activities"]');

      const config: VisualTestConfig = {
        threshold: 0.2,
        maskElements: [
          '[data-testid="current-time"]',
          '[data-testid="user-avatar"]'
        ],
        fullPage: false,
        animations: 'disabled'
      };

      const screenshot = await takeScreenshot(page, '[data-testid="date-display-section"]', config);

      await expect(screenshot).toMatchSnapshot('indonesian-date-formatting.png', {
        threshold: config.threshold
      });

      visualReport.testResults.push({
        test: 'Indonesian date formatting',
        status: 'PASSED',
        timestamp: Date.now()
      });
    });

    test('IDR currency display', async ({ page }) => {
      await page.goto('/invoices');
      await page.waitForLoadState('networkidle');

      const config: VisualTestConfig = {
        threshold: 0.2,
        maskElements: [
          '[data-testid="invoice-number"]',
          '[data-testid="created-date"]'
        ],
        fullPage: false,
        animations: 'disabled'
      };

      const screenshot = await takeScreenshot(page, '[data-testid="amount-column"]', config);

      await expect(screenshot).toMatchSnapshot('idr-currency-display.png', {
        threshold: config.threshold
      });

      visualReport.testResults.push({
        test: 'IDR currency display',
        status: 'PASSED',
        timestamp: Date.now()
      });
    });

    test('Materai notification display', async ({ page }) => {
      await page.goto('/invoices');
      await page.waitForLoadState('networkidle');

      // Find invoice with materai requirement
      await page.click('[data-testid="invoice-row"]:has([data-testid="materai-required"]:has-text("Ya"))');
      await page.waitForSelector('[data-testid="invoice-detail"]');

      const config: VisualTestConfig = {
        threshold: 0.2,
        maskElements: [
          '[data-testid="invoice-number"]',
          '[data-testid="invoice-date"]'
        ],
        fullPage: false,
        animations: 'disabled'
      };

      const screenshot = await takeScreenshot(page, '[data-testid="materai-notification"]', config);

      await expect(screenshot).toMatchSnapshot('materai-notification.png', {
        threshold: config.threshold
      });

      visualReport.testResults.push({
        test: 'Materai notification display',
        status: 'PASSED',
        timestamp: Date.now()
      });
    });
  });

  test.describe('Accessibility Visual Tests', () => {
    test('High contrast mode', async ({ page }) => {
      // Enable high contrast mode
      await page.addStyleTag({
        content: `
          :root {
            --color-background: #000000;
            --color-text: #ffffff;
            --color-border: #ffffff;
            --color-primary: #ffff00;
            --color-secondary: #00ffff;
          }
        `
      });

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const config: VisualTestConfig = {
        threshold: 0.3,
        maskElements: [
          '[data-testid="current-date"]',
          '[data-testid="current-time"]'
        ],
        fullPage: true,
        animations: 'disabled'
      };

      const screenshot = await takeScreenshot(page, undefined, config);

      await expect(screenshot).toMatchSnapshot('high-contrast-mode.png', {
        threshold: config.threshold
      });

      visualReport.testResults.push({
        test: 'High contrast mode',
        status: 'PASSED',
        timestamp: Date.now()
      });
    });

    test('Focus indicators', async ({ page }) => {
      await page.goto('/invoices');
      await page.waitForLoadState('networkidle');

      await page.click('[data-testid="create-invoice-button"]');
      await page.waitForSelector('[data-testid="invoice-form"]');

      // Tab through form elements to show focus indicators
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const config: VisualTestConfig = {
        threshold: 0.2,
        maskElements: [],
        fullPage: false,
        animations: 'disabled'
      };

      const screenshot = await takeScreenshot(page, '[data-testid="invoice-form"]', config);

      await expect(screenshot).toMatchSnapshot('focus-indicators.png', {
        threshold: config.threshold
      });

      visualReport.testResults.push({
        test: 'Focus indicators',
        status: 'PASSED',
        timestamp: Date.now()
      });
    });
  });

  test.describe('Print and Export Visual Tests', () => {
    test('Print preview layout', async ({ page }) => {
      await page.goto('/invoices');
      await page.waitForLoadState('networkidle');

      await page.click('[data-testid="invoice-row"]:first-child');
      await page.waitForSelector('[data-testid="invoice-detail"]');

      // Trigger print preview
      await page.click('[data-testid="print-invoice-button"]');
      await page.waitForSelector('[data-testid="print-preview"]');

      const config: VisualTestConfig = {
        threshold: 0.2,
        maskElements: [
          '[data-testid="invoice-number"]',
          '[data-testid="invoice-date"]'
        ],
        fullPage: false,
        animations: 'disabled'
      };

      const screenshot = await takeScreenshot(page, '[data-testid="print-preview"]', config);

      await expect(screenshot).toMatchSnapshot('print-preview-layout.png', {
        threshold: config.threshold
      });

      visualReport.testResults.push({
        test: 'Print preview layout',
        status: 'PASSED',
        timestamp: Date.now()
      });
    });
  });

  test.describe('Animation and Transition Visual Tests', () => {
    test('Loading states', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Show loading state
      await page.evaluate(() => {
        document.querySelector('[data-testid="dashboard-container"]')?.setAttribute('data-loading', 'true');
      });

      await page.waitForSelector('[data-testid="loading-spinner"]');

      const config: VisualTestConfig = {
        threshold: 0.2,
        maskElements: [],
        fullPage: false,
        animations: 'allow' // Allow animations for loading states
      };

      const screenshot = await takeScreenshot(page, '[data-testid="loading-spinner"]', config);

      await expect(screenshot).toMatchSnapshot('loading-states.png', {
        threshold: config.threshold
      });

      visualReport.testResults.push({
        test: 'Loading states',
        status: 'PASSED',
        timestamp: Date.now()
      });
    });

    test('Hover effects', async ({ page }) => {
      await page.goto('/invoices');
      await page.waitForLoadState('networkidle');

      // Hover over first invoice row
      await page.hover('[data-testid="invoice-row"]:first-child');
      await page.waitForTimeout(500);

      const config: VisualTestConfig = {
        threshold: 0.2,
        maskElements: [
          '[data-testid="invoice-number"]',
          '[data-testid="created-date"]'
        ],
        fullPage: false,
        animations: 'allow'
      };

      const screenshot = await takeScreenshot(page, '[data-testid="invoice-row"]:first-child', config);

      await expect(screenshot).toMatchSnapshot('hover-effects.png', {
        threshold: config.threshold
      });

      visualReport.testResults.push({
        test: 'Hover effects',
        status: 'PASSED',
        timestamp: Date.now()
      });
    });
  });

  test('Generate Visual Regression Summary', async () => {
    // Calculate summary statistics
    const totalTests = visualReport.testResults.length;
    const passedTests = visualReport.testResults.filter(test => test.status === 'PASSED').length;
    const failedTests = visualReport.testResults.filter(test => test.status === 'FAILED').length;
    const totalComparisons = visualReport.comparisons.length;
    const avgDiffPercentage = visualReport.comparisons.reduce((sum, comp) => sum + comp.diffPercentage, 0) / totalComparisons;

    visualReport.summary = {
      totalTests,
      passedTests,
      failedTests,
      totalComparisons,
      avgDiffPercentage: avgDiffPercentage.toFixed(2),
      successRate: ((passedTests / totalTests) * 100).toFixed(2),
      timestamp: new Date().toISOString()
    };

    // Verify overall visual regression success
    expect(failedTests).toBe(0);
    expect(avgDiffPercentage).toBeLessThan(0.3);
    expect(visualReport.errors.length).toBe(0);

    console.log('Visual Regression Summary:', visualReport.summary);
  });
});