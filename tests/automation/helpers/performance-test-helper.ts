// Performance Test Helper for Indonesian Business Context
// Specialized performance testing for Indonesian network conditions and business metrics

import { Page, expect } from '@playwright/test';

export interface IndonesianNetworkConditions {
  name: string;
  downloadThroughput: number; // bytes/second
  uploadThroughput: number;   // bytes/second
  latency: number;            // milliseconds
  packetLoss: number;         // percentage (0-1)
}

export interface BusinessPerformanceMetrics {
  quotationLoadTime: number;
  invoiceRenderTime: number;
  materaiCalculationTime: number;
  whatsappIntegrationTime: number;
  currencyFormattingTime: number;
  pdfGenerationTime: number;
  searchResponseTime: number;
  dashboardLoadTime: number;
}

export interface CoreWebVitals {
  lcp: number | null;  // Largest Contentful Paint
  fid: number | null;  // First Input Delay
  cls: number | null;  // Cumulative Layout Shift
  fcp: number | null;  // First Contentful Paint
  ttfb: number | null; // Time to First Byte
}

export interface PerformanceThresholds {
  // Core Web Vitals (adjusted for Indonesian conditions)
  lcp: { good: number; poor: number };
  fid: { good: number; poor: number };
  cls: { good: number; poor: number };
  fcp: { good: number; poor: number };
  ttfb: { good: number; poor: number };
  
  // Indonesian business metrics
  quotationLoad: { good: number; poor: number };
  invoiceRender: { good: number; poor: number };
  materaiCalculation: { good: number; poor: number };
  whatsappIntegration: { good: number; poor: number };
  currencyFormatting: { good: number; poor: number };
}

export class PerformanceTestHelper {
  private page: Page;
  
  // Indonesian network conditions for testing
  private readonly INDONESIAN_NETWORK_CONDITIONS: IndonesianNetworkConditions[] = [
    {
      name: 'Indonesian 3G (Rural)',
      downloadThroughput: 750 * 1024,      // 750 KB/s
      uploadThroughput: 250 * 1024,        // 250 KB/s
      latency: 300,                        // 300ms
      packetLoss: 0.02                     // 2%
    },
    {
      name: 'Indonesian 4G (Urban)',
      downloadThroughput: 2 * 1024 * 1024, // 2 MB/s
      uploadThroughput: 1 * 1024 * 1024,   // 1 MB/s
      latency: 150,                        // 150ms
      packetLoss: 0.01                     // 1%
    },
    {
      name: 'Indonesian 4G+ (Jakarta)',
      downloadThroughput: 5 * 1024 * 1024, // 5 MB/s
      uploadThroughput: 2 * 1024 * 1024,   // 2 MB/s
      latency: 80,                         // 80ms
      packetLoss: 0.005                    // 0.5%
    },
    {
      name: 'Indonesian WiFi (Office)',
      downloadThroughput: 10 * 1024 * 1024, // 10 MB/s
      uploadThroughput: 5 * 1024 * 1024,    // 5 MB/s
      latency: 50,                          // 50ms
      packetLoss: 0.001                     // 0.1%
    }
  ];

  // Performance thresholds adjusted for Indonesian conditions
  private readonly PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
    // Core Web Vitals (adjusted for Indonesian network conditions)
    lcp: { good: 2500, poor: 4000 },    // +25% for network conditions
    fid: { good: 100, poor: 300 },      // Standard
    cls: { good: 0.1, poor: 0.25 },     // Standard
    fcp: { good: 1800, poor: 3000 },    // +20% for network
    ttfb: { good: 800, poor: 1800 },    // +100% for geography
    
    // Indonesian business metrics
    quotationLoad: { good: 2000, poor: 5000 },
    invoiceRender: { good: 1500, poor: 3000 },
    materaiCalculation: { good: 500, poor: 1500 },
    whatsappIntegration: { good: 1000, poor: 3000 },
    currencyFormatting: { good: 50, poor: 200 }
  };

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Set Indonesian network conditions for testing
   */
  async setIndonesianNetworkConditions(conditionName: string): Promise<void> {
    const condition = this.INDONESIAN_NETWORK_CONDITIONS.find(c => c.name === conditionName);
    
    if (!condition) {
      throw new Error(`Network condition '${conditionName}' not found`);
    }

    // Use Playwright's network emulation
    await this.page.route('**/*', async (route) => {
      // Add latency
      await new Promise(resolve => setTimeout(resolve, condition.latency));
      
      // Simulate packet loss
      if (Math.random() < condition.packetLoss) {
        await route.abort('failed');
        return;
      }
      
      await route.continue();
    });

    console.log(`Set network conditions: ${condition.name}`);
  }

  /**
   * Measure Core Web Vitals with Indonesian context
   */
  async getCoreWebVitals(): Promise<CoreWebVitals> {
    const vitals = await this.page.evaluate(() => {
      return new Promise<CoreWebVitals>((resolve) => {
        const vitals: CoreWebVitals = {
          lcp: null,
          fid: null,
          cls: null,
          fcp: null,
          ttfb: null
        };

        // Use web-vitals library if available
        if (typeof window !== 'undefined' && (window as any).webVitals) {
          const { getCLS, getFID, getFCP, getLCP, getTTFB } = (window as any).webVitals;
          
          getCLS((metric: any) => { vitals.cls = metric.value; });
          getFID((metric: any) => { vitals.fid = metric.value; });
          getFCP((metric: any) => { vitals.fcp = metric.value; });
          getLCP((metric: any) => { vitals.lcp = metric.value; });
          getTTFB((metric: any) => { vitals.ttfb = metric.value; });
          
          setTimeout(() => resolve(vitals), 1000);
        } else {
          // Fallback to Performance API
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          const paint = performance.getEntriesByType('paint');
          
          if (navigation) {
            vitals.ttfb = navigation.responseStart - navigation.requestStart;
          }
          
          const fcp = paint.find(p => p.name === 'first-contentful-paint');
          if (fcp) {
            vitals.fcp = fcp.startTime;
          }
          
          resolve(vitals);
        }
      });
    });

    return vitals;
  }

  /**
   * Measure Indonesian business-specific performance metrics
   */
  async measureBusinessPerformanceMetrics(): Promise<BusinessPerformanceMetrics> {
    const metrics: BusinessPerformanceMetrics = {
      quotationLoadTime: 0,
      invoiceRenderTime: 0,
      materaiCalculationTime: 0,
      whatsappIntegrationTime: 0,
      currencyFormattingTime: 0,
      pdfGenerationTime: 0,
      searchResponseTime: 0,
      dashboardLoadTime: 0
    };

    // Measure quotation loading time
    metrics.quotationLoadTime = await this.measureOperationTime(async () => {
      await this.page.goto('/quotations');
      await this.page.waitForSelector('[data-testid="quotation-list"]');
    });

    // Measure invoice rendering time
    metrics.invoiceRenderTime = await this.measureOperationTime(async () => {
      await this.page.goto('/invoices/create');
      await this.page.waitForSelector('[data-testid="invoice-form"]');
    });

    // Measure materai calculation time
    metrics.materaiCalculationTime = await this.measureOperationTime(async () => {
      await this.page.fill('[data-testid="amount-input"]', '5500000');
      await this.page.waitForSelector('[data-testid="materai-result"]');
    });

    // Measure currency formatting time
    metrics.currencyFormattingTime = await this.measureOperationTime(async () => {
      await this.page.fill('[data-testid="currency-input"]', '15000000');
      await this.page.waitForSelector('[data-testid="formatted-currency"]');
    });

    // Measure search response time
    metrics.searchResponseTime = await this.measureOperationTime(async () => {
      await this.page.fill('[data-testid="search-input"]', 'Budi');
      await this.page.waitForSelector('[data-testid="search-results"]');
    });

    // Measure dashboard load time
    metrics.dashboardLoadTime = await this.measureOperationTime(async () => {
      await this.page.goto('/dashboard');
      await this.page.waitForSelector('[data-testid="dashboard-widgets"]');
    });

    return metrics;
  }

  /**
   * Measure PDF generation time for Indonesian business documents
   */
  async measurePDFGenerationTime(): Promise<number> {
    return await this.measureOperationTime(async () => {
      const downloadPromise = this.page.waitForDownload();
      await this.page.click('[data-testid="download-pdf"]');
      await downloadPromise;
    });
  }

  /**
   * Measure WhatsApp integration performance
   */
  async measureWhatsAppIntegrationTime(): Promise<number> {
    return await this.measureOperationTime(async () => {
      await this.page.click('[data-testid="send-whatsapp"]');
      await this.page.waitForSelector('[data-testid="whatsapp-modal"]');
      await this.page.fill('[data-testid="whatsapp-message"]', 'Test message');
      await this.page.click('[data-testid="send-whatsapp-message"]');
      await this.page.waitForSelector('[data-testid="whatsapp-success"]');
    });
  }

  /**
   * Validate performance against Indonesian thresholds
   */
  async validatePerformanceThresholds(metrics: CoreWebVitals & BusinessPerformanceMetrics): Promise<boolean> {
    let allPassed = true;
    const failures: string[] = [];

    // Validate Core Web Vitals
    if (metrics.lcp && metrics.lcp > this.PERFORMANCE_THRESHOLDS.lcp.poor) {
      failures.push(`LCP (${metrics.lcp}ms) exceeds poor threshold (${this.PERFORMANCE_THRESHOLDS.lcp.poor}ms)`);
      allPassed = false;
    }

    if (metrics.fid && metrics.fid > this.PERFORMANCE_THRESHOLDS.fid.poor) {
      failures.push(`FID (${metrics.fid}ms) exceeds poor threshold (${this.PERFORMANCE_THRESHOLDS.fid.poor}ms)`);
      allPassed = false;
    }

    if (metrics.cls && metrics.cls > this.PERFORMANCE_THRESHOLDS.cls.poor) {
      failures.push(`CLS (${metrics.cls}) exceeds poor threshold (${this.PERFORMANCE_THRESHOLDS.cls.poor})`);
      allPassed = false;
    }

    if (metrics.fcp && metrics.fcp > this.PERFORMANCE_THRESHOLDS.fcp.poor) {
      failures.push(`FCP (${metrics.fcp}ms) exceeds poor threshold (${this.PERFORMANCE_THRESHOLDS.fcp.poor}ms)`);
      allPassed = false;
    }

    if (metrics.ttfb && metrics.ttfb > this.PERFORMANCE_THRESHOLDS.ttfb.poor) {
      failures.push(`TTFB (${metrics.ttfb}ms) exceeds poor threshold (${this.PERFORMANCE_THRESHOLDS.ttfb.poor}ms)`);
      allPassed = false;
    }

    // Validate Indonesian business metrics
    if (metrics.quotationLoadTime > this.PERFORMANCE_THRESHOLDS.quotationLoad.poor) {
      failures.push(`Quotation load time (${metrics.quotationLoadTime}ms) exceeds threshold`);
      allPassed = false;
    }

    if (metrics.invoiceRenderTime > this.PERFORMANCE_THRESHOLDS.invoiceRender.poor) {
      failures.push(`Invoice render time (${metrics.invoiceRenderTime}ms) exceeds threshold`);
      allPassed = false;
    }

    if (metrics.materaiCalculationTime > this.PERFORMANCE_THRESHOLDS.materaiCalculation.poor) {
      failures.push(`Materai calculation time (${metrics.materaiCalculationTime}ms) exceeds threshold`);
      allPassed = false;
    }

    if (failures.length > 0) {
      console.error('Performance threshold failures:', failures);
    }

    return allPassed;
  }

  /**
   * Test performance under different Indonesian network conditions
   */
  async testPerformanceAcrossNetworkConditions(): Promise<Map<string, BusinessPerformanceMetrics>> {
    const results = new Map<string, BusinessPerformanceMetrics>();

    for (const condition of this.INDONESIAN_NETWORK_CONDITIONS) {
      console.log(`Testing performance under ${condition.name}...`);
      
      // Set network condition
      await this.setIndonesianNetworkConditions(condition.name);
      
      // Measure performance
      const metrics = await this.measureBusinessPerformanceMetrics();
      results.set(condition.name, metrics);
      
      // Reset network conditions
      await this.page.unroute('**/*');
      
      console.log(`${condition.name} results:`, metrics);
    }

    return results;
  }

  /**
   * Measure memory usage for Indonesian business workflows
   */
  async measureMemoryUsage(): Promise<{ usedJSHeapSize: number; totalJSHeapSize: number; }> {
    const memoryInfo = await this.page.evaluate(() => {
      if ('memory' in performance) {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        };
      }
      return { usedJSHeapSize: 0, totalJSHeapSize: 0 };
    });

    return memoryInfo;
  }

  /**
   * Test offline performance for Indonesian business scenarios
   */
  async testOfflinePerformance(): Promise<{ 
    canCreateQuotationOffline: boolean;
    canViewExistingDataOffline: boolean;
    offlineStorageSize: number;
  }> {
    // Set offline mode
    await this.page.setOffline(true);

    let canCreateQuotationOffline = false;
    let canViewExistingDataOffline = false;

    try {
      // Test quotation creation offline
      await this.page.goto('/quotations/create');
      await this.page.fill('[data-testid="client-name"]', 'Offline Test Client');
      canCreateQuotationOffline = true;
    } catch (error) {
      console.log('Cannot create quotation offline:', error);
    }

    try {
      // Test viewing existing data offline
      await this.page.goto('/dashboard');
      await this.page.waitForSelector('[data-testid="offline-dashboard"]', { timeout: 5000 });
      canViewExistingDataOffline = true;
    } catch (error) {
      console.log('Cannot view data offline:', error);
    }

    // Measure offline storage size
    const offlineStorageSize = await this.page.evaluate(() => {
      let totalSize = 0;
      
      // Measure localStorage
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length;
        }
      }
      
      // Measure sessionStorage
      for (let key in sessionStorage) {
        if (sessionStorage.hasOwnProperty(key)) {
          totalSize += sessionStorage[key].length;
        }
      }
      
      return totalSize;
    });

    // Restore online mode
    await this.page.setOffline(false);

    return {
      canCreateQuotationOffline,
      canViewExistingDataOffline,
      offlineStorageSize
    };
  }

  /**
   * Generate performance report for Indonesian business context
   */
  async generatePerformanceReport(): Promise<string> {
    const vitals = await this.getCoreWebVitals();
    const businessMetrics = await this.measureBusinessPerformanceMetrics();
    const memoryUsage = await this.measureMemoryUsage();
    const offlinePerformance = await this.testOfflinePerformance();

    const report = {
      timestamp: new Date().toISOString(),
      context: 'Indonesian Business Management System',
      coreWebVitals: vitals,
      businessMetrics: businessMetrics,
      memoryUsage: memoryUsage,
      offlineCapabilities: offlinePerformance,
      thresholdValidation: await this.validatePerformanceThresholds({
        ...vitals,
        ...businessMetrics
      }),
      recommendations: this.generatePerformanceRecommendations(vitals, businessMetrics)
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * Monitor real-time performance during Indonesian business operations
   */
  async monitorRealTimePerformance(durationMs: number = 60000): Promise<any[]> {
    const measurements: any[] = [];
    const startTime = Date.now();

    const measurementInterval = setInterval(async () => {
      const timestamp = Date.now();
      const vitals = await this.getCoreWebVitals();
      const memory = await this.measureMemoryUsage();

      measurements.push({
        timestamp,
        relativeTime: timestamp - startTime,
        vitals,
        memory
      });
    }, 5000); // Measure every 5 seconds

    // Wait for the specified duration
    await new Promise(resolve => setTimeout(resolve, durationMs));
    clearInterval(measurementInterval);

    return measurements;
  }

  // Private helper methods

  private async measureOperationTime(operation: () => Promise<void>): Promise<number> {
    const startTime = Date.now();
    await operation();
    return Date.now() - startTime;
  }

  private generatePerformanceRecommendations(
    vitals: CoreWebVitals, 
    businessMetrics: BusinessPerformanceMetrics
  ): string[] {
    const recommendations: string[] = [];

    // Core Web Vitals recommendations
    if (vitals.lcp && vitals.lcp > this.PERFORMANCE_THRESHOLDS.lcp.good) {
      recommendations.push('Optimize images and reduce server response time to improve LCP for Indonesian users');
    }

    if (vitals.fcp && vitals.fcp > this.PERFORMANCE_THRESHOLDS.fcp.good) {
      recommendations.push('Minimize render-blocking resources to improve FCP on slower Indonesian networks');
    }

    if (vitals.ttfb && vitals.ttfb > this.PERFORMANCE_THRESHOLDS.ttfb.good) {
      recommendations.push('Consider CDN implementation for better TTFB in Indonesian regions');
    }

    // Business metrics recommendations
    if (businessMetrics.quotationLoadTime > this.PERFORMANCE_THRESHOLDS.quotationLoad.good) {
      recommendations.push('Implement pagination or virtual scrolling for quotation lists');
    }

    if (businessMetrics.materaiCalculationTime > this.PERFORMANCE_THRESHOLDS.materaiCalculation.good) {
      recommendations.push('Cache materai calculations for frequently used amounts');
    }

    if (businessMetrics.currencyFormattingTime > this.PERFORMANCE_THRESHOLDS.currencyFormatting.good) {
      recommendations.push('Implement memoization for Indonesian currency formatting');
    }

    if (businessMetrics.pdfGenerationTime > 3000) {
      recommendations.push('Optimize PDF generation for Indonesian business documents');
    }

    // Network-specific recommendations
    recommendations.push('Test regularly with Indonesian 3G/4G network conditions');
    recommendations.push('Implement progressive loading for better experience on slower connections');
    recommendations.push('Consider offline-first approach for core Indonesian business functions');

    return recommendations;
  }
}

export default PerformanceTestHelper;