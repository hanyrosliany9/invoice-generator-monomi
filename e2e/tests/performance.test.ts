import { test, expect, Page } from '@playwright/test';
import { WebDriverConsoleMonitor } from '../utils/webdriver-console';
import * as lighthouse from 'lighthouse';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  pageLoadTime: 3000, // 3 seconds
  apiResponseTime: 500, // 500ms
  memoryUsage: 100, // 100MB
  firstContentfulPaint: 2000, // 2 seconds
  largestContentfulPaint: 2500, // 2.5 seconds
  firstInputDelay: 100, // 100ms
  cumulativeLayoutShift: 0.1, // 0.1 score
  performanceScore: 90, // 90/100
  accessibilityScore: 95, // 95/100
  bestPracticesScore: 90, // 90/100
  seoScore: 85 // 85/100
};

// Performance test configuration
interface PerformanceTestConfig {
  warmupRequests?: number;
  testIterations?: number;
  networkThrottling?: 'slow3g' | 'fast3g' | 'none';
  cpuThrottling?: number;
  cacheDisabled?: boolean;
  userAgent?: string;
}

test.describe('Performance Tests', () => {
  let adminPage: Page;
  let performanceReport: any = {
    timestamp: new Date().toISOString(),
    testResults: [],
    lighthouseReports: [],
    performanceMetrics: [],
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
    // Generate performance report
    const reportPath = path.join('./test-results', 'performance-report.json');
    await fs.promises.writeFile(reportPath, JSON.stringify(performanceReport, null, 2));
    await adminPage.close();
  });

  // Helper function to measure page load performance
  async function measurePageLoad(
    page: Page,
    url: string,
    config: PerformanceTestConfig = {}
  ): Promise<any> {
    const startTime = Date.now();
    
    // Set up network conditions
    if (config.networkThrottling) {
      await page.route('**/*', (route) => {
        const delay = config.networkThrottling === 'slow3g' ? 200 : 50;
        setTimeout(() => route.continue(), delay);
      });
    }

    // Start performance measurement
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    
    const endTime = Date.now();
    const pageLoadTime = endTime - startTime;

    // Get performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const timing = performance.timing;
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        pageLoadTime: timing.loadEventEnd - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstByte: timing.responseStart - timing.navigationStart,
        domReady: timing.domInteractive - timing.navigationStart,
        resourcesLoaded: timing.loadEventEnd - timing.domContentLoadedEventEnd,
        dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
        tcpConnection: timing.connectEnd - timing.connectStart,
        serverResponse: timing.responseEnd - timing.requestStart,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        largestContentfulPaint: paint.find(p => p.name === 'largest-contentful-paint')?.startTime || 0,
        navigation: {
          type: navigation.type,
          redirectCount: navigation.redirectCount,
          loadEventEnd: navigation.loadEventEnd,
          domContentLoadedEventEnd: navigation.domContentLoadedEventEnd
        }
      };
    });

    // Get memory usage
    const memoryUsage = await page.evaluate(() => {
      return {
        usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
        totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0,
        jsHeapSizeLimit: (performance as any).memory?.jsHeapSizeLimit || 0
      };
    });

    return {
      url,
      pageLoadTime,
      performanceMetrics,
      memoryUsage,
      timestamp: Date.now()
    };
  }

  // Helper function to run Lighthouse audit
  async function runLighthouseAudit(url: string): Promise<any> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    try {
      const lighthouseResult = await lighthouse(url, {
        port: 9222,
        output: 'json',
        logLevel: 'info',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo']
      });

      await browser.close();

      return {
        url,
        scores: {
          performance: lighthouseResult.lhr.categories.performance.score * 100,
          accessibility: lighthouseResult.lhr.categories.accessibility.score * 100,
          bestPractices: lighthouseResult.lhr.categories['best-practices'].score * 100,
          seo: lighthouseResult.lhr.categories.seo.score * 100
        },
        metrics: {
          firstContentfulPaint: lighthouseResult.lhr.audits['first-contentful-paint'].numericValue,
          largestContentfulPaint: lighthouseResult.lhr.audits['largest-contentful-paint'].numericValue,
          firstInputDelay: lighthouseResult.lhr.audits['first-input-delay'].numericValue,
          cumulativeLayoutShift: lighthouseResult.lhr.audits['cumulative-layout-shift'].numericValue,
          speedIndex: lighthouseResult.lhr.audits['speed-index'].numericValue,
          totalBlockingTime: lighthouseResult.lhr.audits['total-blocking-time'].numericValue
        },
        opportunities: lighthouseResult.lhr.audits,
        timestamp: Date.now()
      };
    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  // Helper function to measure API performance
  async function measureApiPerformance(
    page: Page,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<any> {
    const startTime = Date.now();
    
    const response = await page.evaluate(async (endpoint, method, body) => {
      const startTime = Date.now();
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: body ? JSON.stringify(body) : undefined
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      return {
        status: response.status,
        statusText: response.statusText,
        responseTime,
        headers: Object.fromEntries(response.headers.entries()),
        size: response.headers.get('content-length') || 0
      };
    }, endpoint, method, body);

    return {
      endpoint,
      method,
      ...response,
      timestamp: Date.now()
    };
  }

  test.describe('Page Load Performance', () => {
    const pagesToTest = [
      { name: 'Dashboard', url: '/dashboard' },
      { name: 'Clients', url: '/clients' },
      { name: 'Projects', url: '/projects' },
      { name: 'Quotations', url: '/quotations' },
      { name: 'Invoices', url: '/invoices' },
      { name: 'Reports', url: '/reports' }
    ];

    for (const pageTest of pagesToTest) {
      test(`${pageTest.name} page load performance`, async ({ page }) => {
        const testStartTime = Date.now();
        
        try {
          // Measure page load performance
          const performanceResult = await measurePageLoad(page, pageTest.url);
          
          // Validate performance thresholds
          expect(performanceResult.pageLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoadTime);
          expect(performanceResult.performanceMetrics.firstContentfulPaint).toBeLessThan(PERFORMANCE_THRESHOLDS.firstContentfulPaint);
          expect(performanceResult.performanceMetrics.largestContentfulPaint).toBeLessThan(PERFORMANCE_THRESHOLDS.largestContentfulPaint);
          expect(performanceResult.memoryUsage.usedJSHeapSize).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage * 1024 * 1024);

          performanceReport.performanceMetrics.push({
            test: `${pageTest.name} page load performance`,
            ...performanceResult,
            thresholds: PERFORMANCE_THRESHOLDS,
            passed: true
          });

          performanceReport.testResults.push({
            test: `${pageTest.name} page load performance`,
            duration: Date.now() - testStartTime,
            status: 'PASSED',
            metrics: performanceResult
          });

        } catch (error) {
          performanceReport.errors.push({
            test: `${pageTest.name} page load performance`,
            error: error.message,
            timestamp: Date.now()
          });
          throw error;
        }
      });
    }
  });

  test.describe('API Performance', () => {
    const apiEndpoints = [
      { name: 'Health Check', endpoint: '/health', method: 'GET' as const },
      { name: 'Login', endpoint: '/api/v1/auth/login', method: 'POST' as const },
      { name: 'Clients List', endpoint: '/api/v1/clients', method: 'GET' as const },
      { name: 'Projects List', endpoint: '/api/v1/projects', method: 'GET' as const },
      { name: 'Quotations List', endpoint: '/api/v1/quotations', method: 'GET' as const },
      { name: 'Invoices List', endpoint: '/api/v1/invoices', method: 'GET' as const },
      { name: 'Dashboard Stats', endpoint: '/api/v1/dashboard/stats', method: 'GET' as const }
    ];

    for (const apiTest of apiEndpoints) {
      test(`${apiTest.name} API performance`, async ({ page }) => {
        const testStartTime = Date.now();
        
        try {
          // Navigate to page first to ensure authentication
          await page.goto('/dashboard');
          await page.waitForLoadState('networkidle');

          // Measure API performance
          const apiResult = await measureApiPerformance(
            page,
            `${process.env.API_URL}${apiTest.endpoint}`,
            apiTest.method
          );

          // Validate API response time
          expect(apiResult.responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponseTime);
          expect(apiResult.status).toBeLessThan(400);

          performanceReport.performanceMetrics.push({
            test: `${apiTest.name} API performance`,
            ...apiResult,
            thresholds: PERFORMANCE_THRESHOLDS,
            passed: true
          });

          performanceReport.testResults.push({
            test: `${apiTest.name} API performance`,
            duration: Date.now() - testStartTime,
            status: 'PASSED',
            metrics: apiResult
          });

        } catch (error) {
          performanceReport.errors.push({
            test: `${apiTest.name} API performance`,
            error: error.message,
            timestamp: Date.now()
          });
          throw error;
        }
      });
    }
  });

  test.describe('Lighthouse Audits', () => {
    const pagesToAudit = [
      { name: 'Dashboard', url: '/dashboard' },
      { name: 'Invoices', url: '/invoices' },
      { name: 'Login', url: '/login' }
    ];

    for (const auditTest of pagesToAudit) {
      test(`${auditTest.name} Lighthouse audit`, async () => {
        const testStartTime = Date.now();
        
        try {
          // Run Lighthouse audit
          const lighthouseResult = await runLighthouseAudit(
            `${process.env.BASE_URL}${auditTest.url}`
          );

          // Validate Lighthouse scores
          expect(lighthouseResult.scores.performance).toBeGreaterThan(PERFORMANCE_THRESHOLDS.performanceScore);
          expect(lighthouseResult.scores.accessibility).toBeGreaterThan(PERFORMANCE_THRESHOLDS.accessibilityScore);
          expect(lighthouseResult.scores.bestPractices).toBeGreaterThan(PERFORMANCE_THRESHOLDS.bestPracticesScore);
          expect(lighthouseResult.scores.seo).toBeGreaterThan(PERFORMANCE_THRESHOLDS.seoScore);

          // Validate Core Web Vitals
          expect(lighthouseResult.metrics.firstContentfulPaint).toBeLessThan(PERFORMANCE_THRESHOLDS.firstContentfulPaint);
          expect(lighthouseResult.metrics.largestContentfulPaint).toBeLessThan(PERFORMANCE_THRESHOLDS.largestContentfulPaint);
          expect(lighthouseResult.metrics.firstInputDelay).toBeLessThan(PERFORMANCE_THRESHOLDS.firstInputDelay);
          expect(lighthouseResult.metrics.cumulativeLayoutShift).toBeLessThan(PERFORMANCE_THRESHOLDS.cumulativeLayoutShift);

          performanceReport.lighthouseReports.push({
            test: `${auditTest.name} Lighthouse audit`,
            ...lighthouseResult,
            thresholds: PERFORMANCE_THRESHOLDS,
            passed: true
          });

          performanceReport.testResults.push({
            test: `${auditTest.name} Lighthouse audit`,
            duration: Date.now() - testStartTime,
            status: 'PASSED',
            metrics: lighthouseResult
          });

        } catch (error) {
          performanceReport.errors.push({
            test: `${auditTest.name} Lighthouse audit`,
            error: error.message,
            timestamp: Date.now()
          });
          throw error;
        }
      });
    }
  });

  test.describe('Memory Usage and Leak Detection', () => {
    test('Memory usage during navigation', async ({ page }) => {
      const testStartTime = Date.now();
      const memorySnapshots: any[] = [];

      try {
        // Navigate through different pages and measure memory
        const pages = ['/dashboard', '/clients', '/projects', '/quotations', '/invoices'];
        
        for (const pageUrl of pages) {
          await page.goto(pageUrl);
          await page.waitForLoadState('networkidle');
          
          // Capture memory snapshot
          const memoryUsage = await page.evaluate(() => {
            return {
              usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
              totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0,
              jsHeapSizeLimit: (performance as any).memory?.jsHeapSizeLimit || 0,
              timestamp: Date.now(),
              url: window.location.pathname
            };
          });
          
          memorySnapshots.push(memoryUsage);
          
          // Wait a bit between navigations
          await page.waitForTimeout(1000);
        }

        // Analyze memory usage
        const initialMemory = memorySnapshots[0].usedJSHeapSize;
        const finalMemory = memorySnapshots[memorySnapshots.length - 1].usedJSHeapSize;
        const memoryGrowth = finalMemory - initialMemory;
        const memoryGrowthPercentage = (memoryGrowth / initialMemory) * 100;

        // Validate memory usage
        expect(memoryGrowthPercentage).toBeLessThan(50); // Less than 50% growth
        expect(finalMemory).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage * 1024 * 1024);

        performanceReport.performanceMetrics.push({
          test: 'Memory usage during navigation',
          memorySnapshots,
          memoryGrowth,
          memoryGrowthPercentage,
          initialMemory,
          finalMemory,
          thresholds: PERFORMANCE_THRESHOLDS,
          passed: true
        });

        performanceReport.testResults.push({
          test: 'Memory usage during navigation',
          duration: Date.now() - testStartTime,
          status: 'PASSED',
          metrics: { memoryGrowth, memoryGrowthPercentage }
        });

      } catch (error) {
        performanceReport.errors.push({
          test: 'Memory usage during navigation',
          error: error.message,
          timestamp: Date.now()
        });
        throw error;
      }
    });

    test('Memory leak detection in forms', async ({ page }) => {
      const testStartTime = Date.now();
      const memorySnapshots: any[] = [];

      try {
        await page.goto('/invoices');
        await page.waitForLoadState('networkidle');

        // Capture initial memory
        let memoryUsage = await page.evaluate(() => {
          return {
            usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
            totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0,
            timestamp: Date.now(),
            action: 'initial'
          };
        });
        memorySnapshots.push(memoryUsage);

        // Repeatedly open and close forms
        for (let i = 0; i < 10; i++) {
          // Open form
          await page.click('[data-testid="create-invoice-button"]');
          await page.waitForSelector('[data-testid="invoice-form"]');
          
          // Fill form
          await page.selectOption('[data-testid="invoice-client-select"]', 'client-1');
          await page.selectOption('[data-testid="invoice-project-select"]', 'project-1');
          await page.fill('[data-testid="invoice-amount-input"]', '1000000');
          
          // Cancel form
          await page.click('[data-testid="cancel-button"]');
          await page.waitForSelector('[data-testid="invoices-list"]');
          
          // Capture memory after each iteration
          memoryUsage = await page.evaluate((iteration) => {
            return {
              usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
              totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0,
              timestamp: Date.now(),
              action: `iteration-${iteration}`
            };
          }, i);
          memorySnapshots.push(memoryUsage);
        }

        // Analyze memory leak
        const initialMemory = memorySnapshots[0].usedJSHeapSize;
        const finalMemory = memorySnapshots[memorySnapshots.length - 1].usedJSHeapSize;
        const memoryGrowth = finalMemory - initialMemory;
        const memoryGrowthPercentage = (memoryGrowth / initialMemory) * 100;

        // Validate no significant memory leak
        expect(memoryGrowthPercentage).toBeLessThan(20); // Less than 20% growth after 10 iterations

        performanceReport.performanceMetrics.push({
          test: 'Memory leak detection in forms',
          memorySnapshots,
          memoryGrowth,
          memoryGrowthPercentage,
          iterations: 10,
          thresholds: PERFORMANCE_THRESHOLDS,
          passed: true
        });

        performanceReport.testResults.push({
          test: 'Memory leak detection in forms',
          duration: Date.now() - testStartTime,
          status: 'PASSED',
          metrics: { memoryGrowth, memoryGrowthPercentage }
        });

      } catch (error) {
        performanceReport.errors.push({
          test: 'Memory leak detection in forms',
          error: error.message,
          timestamp: Date.now()
        });
        throw error;
      }
    });
  });

  test.describe('Network Performance', () => {
    test('Bundle size and optimization', async ({ page }) => {
      const testStartTime = Date.now();
      const networkRequests: any[] = [];

      try {
        // Monitor network requests
        page.on('response', (response) => {
          const url = response.url();
          const size = response.headers()['content-length'];
          const contentType = response.headers()['content-type'];
          
          if (url.includes('static') || url.includes('assets') || url.includes('.js') || url.includes('.css')) {
            networkRequests.push({
              url,
              size: size ? parseInt(size) : 0,
              contentType,
              status: response.status(),
              timestamp: Date.now()
            });
          }
        });

        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Analyze bundle sizes
        const jsFiles = networkRequests.filter(req => req.contentType?.includes('javascript'));
        const cssFiles = networkRequests.filter(req => req.contentType?.includes('css'));
        const totalJSSize = jsFiles.reduce((sum, file) => sum + file.size, 0);
        const totalCSSSize = cssFiles.reduce((sum, file) => sum + file.size, 0);

        // Validate bundle sizes (thresholds in bytes)
        expect(totalJSSize).toBeLessThan(500 * 1024); // Less than 500KB total JS
        expect(totalCSSSize).toBeLessThan(100 * 1024); // Less than 100KB total CSS

        performanceReport.performanceMetrics.push({
          test: 'Bundle size and optimization',
          networkRequests,
          totalJSSize,
          totalCSSSize,
          jsFiles: jsFiles.length,
          cssFiles: cssFiles.length,
          thresholds: { maxJSSize: 500 * 1024, maxCSSSize: 100 * 1024 },
          passed: true
        });

        performanceReport.testResults.push({
          test: 'Bundle size and optimization',
          duration: Date.now() - testStartTime,
          status: 'PASSED',
          metrics: { totalJSSize, totalCSSSize }
        });

      } catch (error) {
        performanceReport.errors.push({
          test: 'Bundle size and optimization',
          error: error.message,
          timestamp: Date.now()
        });
        throw error;
      }
    });

    test('Caching effectiveness', async ({ page }) => {
      const testStartTime = Date.now();
      const cacheAnalysis: any = {
        firstVisit: [],
        secondVisit: [],
        cacheHits: 0,
        cacheMisses: 0
      };

      try {
        // First visit - monitor all requests
        page.on('response', (response) => {
          const url = response.url();
          const cacheControl = response.headers()['cache-control'];
          const etag = response.headers()['etag'];
          
          cacheAnalysis.firstVisit.push({
            url,
            cacheControl,
            etag,
            status: response.status(),
            fromCache: response.fromServiceWorker(),
            timestamp: Date.now()
          });
        });

        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Clear listeners
        page.removeAllListeners('response');

        // Second visit - check cache effectiveness
        page.on('response', (response) => {
          const url = response.url();
          const cacheControl = response.headers()['cache-control'];
          const status = response.status();
          
          cacheAnalysis.secondVisit.push({
            url,
            cacheControl,
            status,
            fromCache: status === 304 || response.fromServiceWorker(),
            timestamp: Date.now()
          });

          if (status === 304 || response.fromServiceWorker()) {
            cacheAnalysis.cacheHits++;
          } else {
            cacheAnalysis.cacheMisses++;
          }
        });

        // Reload page to test caching
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Calculate cache effectiveness
        const cacheEffectiveness = (cacheAnalysis.cacheHits / (cacheAnalysis.cacheHits + cacheAnalysis.cacheMisses)) * 100;

        // Validate cache effectiveness (should be at least 70%)
        expect(cacheEffectiveness).toBeGreaterThan(70);

        performanceReport.performanceMetrics.push({
          test: 'Caching effectiveness',
          cacheAnalysis,
          cacheEffectiveness,
          thresholds: { minCacheEffectiveness: 70 },
          passed: true
        });

        performanceReport.testResults.push({
          test: 'Caching effectiveness',
          duration: Date.now() - testStartTime,
          status: 'PASSED',
          metrics: { cacheEffectiveness }
        });

      } catch (error) {
        performanceReport.errors.push({
          test: 'Caching effectiveness',
          error: error.message,
          timestamp: Date.now()
        });
        throw error;
      }
    });
  });

  test.describe('Database Performance', () => {
    test('Database query performance', async ({ page }) => {
      const testStartTime = Date.now();
      const dbQueries: any[] = [];

      try {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Monitor API calls that trigger database queries
        const apiEndpoints = [
          '/api/v1/dashboard/stats',
          '/api/v1/clients?page=1&limit=10',
          '/api/v1/projects?page=1&limit=10',
          '/api/v1/quotations?page=1&limit=10',
          '/api/v1/invoices?page=1&limit=10'
        ];

        for (const endpoint of apiEndpoints) {
          const startTime = Date.now();
          
          const response = await page.evaluate(async (endpoint) => {
            const response = await fetch(endpoint, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
              }
            });
            return {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries())
            };
          }, `${process.env.API_URL}${endpoint}`);

          const endTime = Date.now();
          const queryTime = endTime - startTime;

          dbQueries.push({
            endpoint,
            queryTime,
            status: response.status,
            timestamp: Date.now()
          });

          // Validate query performance
          expect(queryTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponseTime);
        }

        // Calculate average query time
        const avgQueryTime = dbQueries.reduce((sum, query) => sum + query.queryTime, 0) / dbQueries.length;

        performanceReport.performanceMetrics.push({
          test: 'Database query performance',
          dbQueries,
          avgQueryTime,
          thresholds: PERFORMANCE_THRESHOLDS,
          passed: true
        });

        performanceReport.testResults.push({
          test: 'Database query performance',
          duration: Date.now() - testStartTime,
          status: 'PASSED',
          metrics: { avgQueryTime }
        });

      } catch (error) {
        performanceReport.errors.push({
          test: 'Database query performance',
          error: error.message,
          timestamp: Date.now()
        });
        throw error;
      }
    });
  });

  test('Generate Performance Summary', async () => {
    // Calculate summary statistics
    const totalTests = performanceReport.testResults.length;
    const passedTests = performanceReport.testResults.filter(test => test.status === 'PASSED').length;
    const failedTests = performanceReport.testResults.filter(test => test.status === 'FAILED').length;
    const totalErrors = performanceReport.errors.length;

    // Calculate average metrics
    const avgLoadTime = performanceReport.performanceMetrics
      .filter(metric => metric.pageLoadTime)
      .reduce((sum, metric) => sum + metric.pageLoadTime, 0) / 
      performanceReport.performanceMetrics.filter(metric => metric.pageLoadTime).length;

    const avgApiResponseTime = performanceReport.performanceMetrics
      .filter(metric => metric.responseTime)
      .reduce((sum, metric) => sum + metric.responseTime, 0) / 
      performanceReport.performanceMetrics.filter(metric => metric.responseTime).length;

    const avgLighthouseScore = performanceReport.lighthouseReports
      .reduce((sum, report) => sum + report.scores.performance, 0) / 
      performanceReport.lighthouseReports.length;

    performanceReport.summary = {
      totalTests,
      passedTests,
      failedTests,
      totalErrors,
      avgLoadTime: avgLoadTime.toFixed(2),
      avgApiResponseTime: avgApiResponseTime.toFixed(2),
      avgLighthouseScore: avgLighthouseScore.toFixed(2),
      successRate: ((passedTests / totalTests) * 100).toFixed(2),
      thresholdsMet: {
        pageLoadTime: avgLoadTime < PERFORMANCE_THRESHOLDS.pageLoadTime,
        apiResponseTime: avgApiResponseTime < PERFORMANCE_THRESHOLDS.apiResponseTime,
        lighthouseScore: avgLighthouseScore > PERFORMANCE_THRESHOLDS.performanceScore
      },
      timestamp: new Date().toISOString()
    };

    // Verify overall performance
    expect(failedTests).toBe(0);
    expect(totalErrors).toBe(0);
    expect(avgLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoadTime);
    expect(avgApiResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponseTime);
    expect(avgLighthouseScore).toBeGreaterThan(PERFORMANCE_THRESHOLDS.performanceScore);

    console.log('Performance Summary:', performanceReport.summary);
  });
});