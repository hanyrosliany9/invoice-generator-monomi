// Playwright Configuration for Indonesian Business Management System
// Comprehensive test automation setup with Indonesian business context

import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration optimized for Indonesian Business Management System testing
 * Includes device emulation for Indonesian market, network conditions, and cultural context
 */
export default defineConfig({
  // Test directory configuration
  testDir: './tests/automation',
  
  // Timeout configuration (adjusted for Indonesian network conditions)
  timeout: 60000, // 60 seconds for slow Indonesian networks
  expect: {
    timeout: 10000 // 10 seconds for assertions
  },
  
  // Global test configuration
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Retry on CI due to network variability
  workers: process.env.CI ? 2 : undefined, // Limit workers on CI
  
  // Test reporting
  reporter: [
    ['html', { outputFolder: 'test-reports/html' }],
    ['json', { outputFile: 'test-reports/test-results.json' }],
    ['junit', { outputFile: 'test-reports/junit.xml' }],
    ['allure-playwright', { outputFolder: 'test-reports/allure-results' }]
  ],
  
  // Global test configuration
  use: {
    // Indonesian locale setup
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    
    // Base URL for testing
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // Browser context configuration
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Indonesian business context headers
    extraHTTPHeaders: {
      'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
      'X-Timezone': 'Asia/Jakarta',
      'X-Currency': 'IDR',
      'X-Business-Context': 'Indonesian-SME'
    },
    
    // Performance and accessibility
    actionTimeout: 15000, // Increased for slower networks
    navigationTimeout: 30000, // Increased for Indonesian conditions
  },

  // Project configurations for different testing scenarios
  projects: [
    // =========================================================================
    // DESKTOP TESTING (Indonesian Business Context)
    // =========================================================================
    {
      name: 'Desktop Chrome - Indonesian Business',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 }, // Common Indonesian office resolution
        launchOptions: {
          args: [
            '--lang=id-ID',
            '--disable-web-security', // For testing integrations
            '--allow-running-insecure-content'
          ]
        }
      },
      testMatch: '**/indonesian-business-test-suite.spec.ts'
    },
    
    {
      name: 'Desktop Firefox - Indonesian Business',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1366, height: 768 },
      },
      testMatch: '**/indonesian-business-test-suite.spec.ts'
    },

    // =========================================================================
    // MOBILE TESTING (Indonesian Mobile Market)
    // =========================================================================
    {
      name: 'Android Budget Phone - Indonesian Market',
      use: {
        ...devices['Galaxy S9+'], // Representative mid-range Android
        viewport: { width: 360, height: 740 },
        userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G965F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        // Simulate lower-end device performance
        launchOptions: {
          args: ['--enable-low-end-device-mode']
        }
      },
      testMatch: '**/mobile/**/*.spec.ts'
    },
    
    {
      name: 'Android Mid-Range - Indonesian Market',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
      },
      testMatch: '**/mobile/**/*.spec.ts'
    },

    // =========================================================================
    // NETWORK CONDITIONS TESTING
    // =========================================================================
    {
      name: 'Indonesian 3G Network Simulation',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--force-effective-connection-type=3g']
        }
      },
      testMatch: '**/performance/**/*.spec.ts'
    },
    
    {
      name: 'Indonesian 4G Network Simulation',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--force-effective-connection-type=4g']
        }
      },
      testMatch: '**/performance/**/*.spec.ts'
    },

    // =========================================================================
    // ACCESSIBILITY TESTING (Indonesian Context)
    // =========================================================================
    {
      name: 'Accessibility - Indonesian Screen Readers',
      use: {
        ...devices['Desktop Chrome'],
        extraHTTPHeaders: {
          'Accept-Language': 'id-ID',
          'X-Screen-Reader': 'NVDA-Indonesian'
        }
      },
      testMatch: '**/accessibility/**/*.spec.ts'
    },

    // =========================================================================
    // CULTURAL VALIDATION TESTING
    // =========================================================================
    {
      name: 'Cultural Validation - Jakarta Business',
      use: {
        ...devices['Desktop Chrome'],
        extraHTTPHeaders: {
          'X-Region': 'Jakarta',
          'X-Business-Style': 'fast-paced',
          'X-Formality-Level': 'formal'
        }
      },
      testMatch: '**/cultural/**/*.spec.ts'
    },
    
    {
      name: 'Cultural Validation - Yogyakarta Traditional',
      use: {
        ...devices['Desktop Chrome'],
        extraHTTPHeaders: {
          'X-Region': 'Yogyakarta',
          'X-Business-Style': 'traditional',
          'X-Formality-Level': 'very-formal'
        }
      },
      testMatch: '**/cultural/**/*.spec.ts'
    },

    // =========================================================================
    // SECURITY TESTING
    // =========================================================================
    {
      name: 'Security Testing - Indonesian Compliance',
      use: {
        ...devices['Desktop Chrome'],
        extraHTTPHeaders: {
          'X-Security-Level': 'high',
          'X-Compliance': 'Indonesian-Financial'
        },
        ignoreHTTPSErrors: false, // Strict HTTPS enforcement
      },
      testMatch: '**/security/**/*.spec.ts'
    },

    // =========================================================================
    // LOAD TESTING PREPARATION
    // =========================================================================
    {
      name: 'Load Test Setup - Indonesian Business Peak',
      use: {
        ...devices['Desktop Chrome'],
        extraHTTPHeaders: {
          'X-Load-Test': 'true',
          'X-Business-Hours': 'peak',
          'X-User-Type': 'business-owner'
        }
      },
      testMatch: '**/load-preparation/**/*.spec.ts'
    }
  ],

  // Web server configuration for local testing
  webServer: {
    command: 'npm run dev',
    port: 3000,
    timeout: 120000, // 2 minutes to start (Docker considerations)
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: 'test',
      INDONESIA_TIMEZONE: 'Asia/Jakarta',
      DEFAULT_CURRENCY: 'IDR',
      MATERAI_THRESHOLD: '5000000',
      ENABLE_CULTURAL_VALIDATION: 'true'
    }
  },

  // Global setup and teardown
  globalSetup: require.resolve('./global-setup.ts'),
  globalTeardown: require.resolve('./global-teardown.ts'),
});

// Environment-specific configurations
if (process.env.NODE_ENV === 'ci') {
  // CI-specific optimizations
  module.exports.use = {
    ...module.exports.use,
    video: 'off', // Disable video in CI to save space
    trace: 'off',  // Disable trace in CI
  };
  
  // Reduce parallelism in CI
  module.exports.workers = 2;
  module.exports.retries = 3;
}

if (process.env.INDONESIAN_REGION) {
  // Region-specific testing
  module.exports.use.extraHTTPHeaders['X-Region'] = process.env.INDONESIAN_REGION;
}

if (process.env.BUSINESS_SIZE) {
  // Business size specific testing (micro, small, medium)
  module.exports.use.extraHTTPHeaders['X-Business-Size'] = process.env.BUSINESS_SIZE;
}

// Custom test annotations for Indonesian business context
export const annotations = {
  // Performance annotations
  slowNetwork: { type: 'slow-network', description: 'Test requires Indonesian 3G/4G simulation' },
  quickResponse: { type: 'quick-response', description: 'Should respond quickly on Indonesian networks' },
  
  // Cultural annotations
  culturalValidation: { type: 'cultural', description: 'Requires Indonesian cultural validation' },
  formalLanguage: { type: 'formal-bahasa', description: 'Tests formal Bahasa Indonesia usage' },
  honorificUsage: { type: 'honorific', description: 'Tests proper honorific usage (Bapak/Ibu)' },
  
  // Business annotations
  materaiRequired: { type: 'materai', description: 'Tests materai compliance (≥5M IDR)' },
  whatsappIntegration: { type: 'whatsapp', description: 'Tests WhatsApp Business integration' },
  invoiceWorkflow: { type: 'invoice-workflow', description: 'Tests quotation-to-invoice workflow' },
  
  // Accessibility annotations
  screenReader: { type: 'screen-reader', description: 'Tests Indonesian screen reader compatibility' },
  keyboardNav: { type: 'keyboard', description: 'Tests keyboard navigation in Indonesian context' },
  
  // Regional annotations
  jakarta: { type: 'region-jakarta', description: 'Jakarta business context testing' },
  yogyakarta: { type: 'region-yogya', description: 'Yogyakarta traditional business testing' },
  surabaya: { type: 'region-surabaya', description: 'Surabaya commercial business testing' }
};

// Test data configuration for Indonesian business scenarios
export const testDataConfig = {
  // Default Indonesian business test data
  defaultCompany: {
    name: 'PT Maju Bersama Indonesia',
    npwp: '12.345.678.9-123.000',
    address: 'Jl. Sudirman No. 123, Jakarta Selatan',
    phone: '+62-21-12345678',
    email: 'info@majubersama.co.id'
  },
  
  defaultClient: {
    name: 'Budi Santoso',
    title: 'Direktur',
    honorific: 'Bapak',
    company: 'PT Sukses Mandiri',
    phone: '+62-812-3456-7890',
    email: 'budi.santoso@suksesmandiri.com'
  },
  
  // Test amounts for materai validation
  amounts: {
    belowMaterai: 3500000,    // Below 5M IDR threshold
    aboveMaterai: 7500000,    // Above 5M IDR threshold
    highValue: 25000000       // High value transaction
  },
  
  // Indonesian holidays for business hours testing
  holidays2024: [
    '2024-01-01', // New Year
    '2024-02-10', // Chinese New Year
    '2024-03-11', // Nyepi
    '2024-03-29', // Good Friday
    '2024-04-10', // Eid al-Fitr
    '2024-04-11', // Eid al-Fitr
    '2024-05-01', // Labor Day
    '2024-05-09', // Ascension Day
    '2024-05-23', // Vesak Day
    '2024-06-01', // Pancasila Day
    '2024-06-17', // Eid al-Adha
    '2024-07-07', // Islamic New Year
    '2024-08-17', // Independence Day
    '2024-09-16', // Prophet Muhammad's Birthday
    '2024-12-25'  // Christmas
  ]
};