// Indonesian Business Test Suite - Comprehensive E2E Testing
// Automated testing framework for Indonesian Business Management System

import { test, expect, Page } from '@playwright/test';
import { IndonesianBusinessTestHelper } from './helpers/indonesian-business-helper';
import { CulturalValidationHelper } from './helpers/cultural-validation-helper';
import { PerformanceTestHelper } from './helpers/performance-test-helper';

// Test configuration for Indonesian business context
const INDONESIAN_TEST_CONFIG = {
  locale: 'id-ID',
  timezone: 'Asia/Jakarta',
  currency: 'IDR',
  language: 'bahasa-indonesia',
  materai_threshold: 5000000,
  business_hours: {
    start: '08:00',
    end: '17:00',
    lunch_break: { start: '12:00', end: '13:00' }
  },
  holidays: ['2024-01-01', '2024-08-17', '2024-12-25'] // Sample Indonesian holidays
};

// Indonesian business test data
const INDONESIAN_TEST_DATA = {
  companies: [
    {
      name: 'PT Maju Bersama Indonesia',
      npwp: '12.345.678.9-123.000',
      address: 'Jl. Sudirman No. 123, Jakarta Selatan',
      phone: '+62-21-12345678',
      email: 'info@majubersama.co.id'
    },
    {
      name: 'CV Berkah Nusantara',
      npwp: '98.765.432.1-456.000',
      address: 'Jl. Malioboro No. 456, Yogyakarta',
      phone: '+62-274-87654321',
      email: 'berkah@nusantara.co.id'
    }
  ],
  clients: [
    {
      name: 'Budi Santoso',
      title: 'Direktur',
      honorific: 'Bapak',
      gender: 'male',
      company: 'PT Sukses Mandiri',
      phone: '+62-812-3456-7890',
      email: 'budi.santoso@suksesmandiri.com',
      preferred_communication: 'whatsapp'
    },
    {
      name: 'Siti Nurhaliza',
      title: 'Manager Keuangan',
      honorific: 'Ibu',
      gender: 'female',
      company: 'CV Sinar Harapan',
      phone: '+62-813-9876-5432',
      email: 'siti.nurhaliza@sinarharapan.co.id',
      preferred_communication: 'email'
    }
  ],
  projects: [
    {
      title: 'Sistem Informasi Manajemen Keuangan',
      description: 'Pengembangan sistem manajemen keuangan terintegrasi',
      value: 15000000, // Above materai threshold
      duration: '3 bulan',
      deliverables: ['Analisis kebutuhan', 'Desain sistem', 'Implementasi', 'Testing', 'Pelatihan']
    },
    {
      title: 'Website Company Profile',
      description: 'Pembuatan website company profile responsif',
      value: 3500000, // Below materai threshold
      duration: '1 bulan',
      deliverables: ['Desain UI/UX', 'Frontend development', 'Backend development', 'Deployment']
    }
  ]
};

// Test helper instances
let businessHelper: IndonesianBusinessTestHelper;
let culturalHelper: CulturalValidationHelper;
let performanceHelper: PerformanceTestHelper;

test.beforeEach(async ({ page }) => {
  businessHelper = new IndonesianBusinessTestHelper(page, INDONESIAN_TEST_CONFIG);
  culturalHelper = new CulturalValidationHelper(page, INDONESIAN_TEST_CONFIG);
  performanceHelper = new PerformanceTestHelper(page);
  
  // Set Indonesian locale and timezone
  await page.addInitScript((config) => {
    // Set Indonesian locale
    Object.defineProperty(navigator, 'language', {
      get: () => config.language
    });
    
    // Set timezone
    Intl.DateTimeFormat = class extends Intl.DateTimeFormat {
      constructor(locales, options) {
        super(config.locale, { ...options, timeZone: config.timezone });
      }
    };
  }, INDONESIAN_TEST_CONFIG);
});

test.describe('Indonesian Business Core Workflow Tests', () => {
  
  test('should create quotation with Indonesian business format', async ({ page }) => {
    const client = INDONESIAN_TEST_DATA.clients[0];
    const project = INDONESIAN_TEST_DATA.projects[0];
    
    // Navigate to quotation creation
    await page.goto('/quotations/create');
    
    // Validate page loads with Indonesian locale
    await culturalHelper.validateIndonesianLocale();
    
    // Fill quotation form with Indonesian business data
    await businessHelper.fillQuotationForm({
      client: client,
      project: project,
      company: INDONESIAN_TEST_DATA.companies[0]
    });
    
    // Validate Indonesian business formatting
    await test.step('Validate Indonesian formatting', async () => {
      // Check currency formatting (IDR)
      const amountField = page.locator('[data-testid="quotation-amount"]');
      await expect(amountField).toContainText('Rp 15.000.000');
      
      // Check honorific usage
      const clientGreeting = page.locator('[data-testid="client-greeting"]');
      await expect(clientGreeting).toContainText('Bapak Budi Santoso');
      
      // Check date format (Indonesian)
      const dateField = page.locator('[data-testid="quotation-date"]');
      const indonesianDate = new Date().toLocaleDateString('id-ID');
      await expect(dateField).toContainText(indonesianDate);
    });
    
    // Test materai calculation for high-value quotation
    await test.step('Validate materai calculation', async () => {
      const materaiIndicator = page.locator('[data-testid="materai-indicator"]');
      await expect(materaiIndicator).toBeVisible();
      await expect(materaiIndicator).toContainText('Materai diperlukan');
      
      // Validate materai amount calculation
      const materaiAmount = page.locator('[data-testid="materai-amount"]');
      await expect(materaiAmount).toContainText('Rp 10.000');
    });
    
    // Submit quotation
    await page.click('[data-testid="submit-quotation"]');
    
    // Validate success message in Bahasa Indonesia
    const successMessage = page.locator('[data-testid="success-message"]');
    await expect(successMessage).toContainText('Quotation berhasil dibuat');
    
    // Validate quotation number format (Indonesian business standard)
    const quotationNumber = page.locator('[data-testid="quotation-number"]');
    await expect(quotationNumber).toMatch(/QT-\d{4}-\d{3}/);
  });
  
  test('should convert quotation to invoice with materai compliance', async ({ page }) => {
    // First create a quotation
    await businessHelper.createSampleQuotation(INDONESIAN_TEST_DATA.projects[0]);
    
    // Navigate to quotation list
    await page.goto('/quotations');
    
    // Select first quotation and convert to invoice
    await page.click('[data-testid="quotation-item"]:first-child [data-testid="convert-to-invoice"]');
    
    // Validate invoice creation form
    await test.step('Validate invoice form pre-population', async () => {
      // Check inherited data from quotation
      const clientName = page.locator('[data-testid="invoice-client-name"]');
      await expect(clientName).toContainText('Budi Santoso');
      
      const projectTitle = page.locator('[data-testid="invoice-project-title"]');
      await expect(projectTitle).toContainText('Sistem Informasi Manajemen Keuangan');
      
      const amount = page.locator('[data-testid="invoice-amount"]');
      await expect(amount).toContainText('Rp 15.000.000');
    });
    
    // Configure invoice-specific settings
    await test.step('Configure invoice settings', async () => {
      // Set due date (Indonesian business standard: 14 days)
      await businessHelper.setInvoiceDueDate(14);
      
      // Add Indonesian payment terms
      const paymentTerms = page.locator('[data-testid="payment-terms"]');
      await paymentTerms.fill('Pembayaran dalam 14 hari kerja setelah invoice diterima');
      
      // Add Indonesian business notes
      const notes = page.locator('[data-testid="invoice-notes"]');
      await notes.fill('Terima kasih atas kepercayaan Bapak/Ibu kepada kami. Mohon konfirmasi pembayaran setelah transfer.');
    });
    
    // Validate materai compliance reminder
    await test.step('Validate materai compliance', async () => {
      const materaiReminder = page.locator('[data-testid="materai-reminder"]');
      await expect(materaiReminder).toBeVisible();
      await expect(materaiReminder).toContainText('Invoice ini memerlukan materai karena nilai di atas Rp 5.000.000');
      
      // Check materai compliance checkbox
      await page.check('[data-testid="materai-compliance-checkbox"]');
    });
    
    // Submit invoice
    await page.click('[data-testid="create-invoice"]');
    
    // Validate invoice creation success
    const successMessage = page.locator('[data-testid="success-message"]');
    await expect(successMessage).toContainText('Invoice berhasil dibuat');
    
    // Validate invoice number format
    const invoiceNumber = page.locator('[data-testid="invoice-number"]');
    await expect(invoiceNumber).toMatch(/INV-\d{4}-\d{3}/);
  });
  
  test('should send invoice via WhatsApp with Indonesian business etiquette', async ({ page }) => {
    // Create sample invoice
    await businessHelper.createSampleInvoice(INDONESIAN_TEST_DATA.projects[0]);
    
    // Navigate to invoice detail
    await page.goto('/invoices/1');
    
    // Click WhatsApp send button
    await page.click('[data-testid="send-whatsapp"]');
    
    // Validate WhatsApp message composition modal
    await test.step('Validate WhatsApp message composition', async () => {
      const whatsappModal = page.locator('[data-testid="whatsapp-modal"]');
      await expect(whatsappModal).toBeVisible();
      
      // Check pre-filled Indonesian business message
      const messageContent = page.locator('[data-testid="whatsapp-message"]');
      const messageText = await messageContent.textContent();
      
      // Validate Indonesian business etiquette elements
      expect(messageText).toContain('Selamat');
      expect(messageText).toContain('Bapak/Ibu');
      expect(messageText).toContain('Terima kasih');
      expect(messageText).toContain('Yang Terhormat');
    });
    
    // Validate message template with cultural appropriateness
    await test.step('Validate cultural appropriateness', async () => {
      const culturalScore = await culturalHelper.calculateCulturalScore();
      expect(culturalScore).toBeGreaterThan(80); // High cultural appropriateness
    });
    
    // Validate phone number format for Indonesian numbers
    await test.step('Validate Indonesian phone number format', async () => {
      const phoneNumber = page.locator('[data-testid="recipient-phone"]');
      const phoneValue = await phoneNumber.inputValue();
      expect(phoneValue).toMatch(/^\+62/); // Indonesian country code
    });
    
    // Send WhatsApp message
    await page.click('[data-testid="send-whatsapp-message"]');
    
    // Validate sending confirmation
    const confirmationMessage = page.locator('[data-testid="whatsapp-confirmation"]');
    await expect(confirmationMessage).toContainText('Pesan WhatsApp berhasil dikirim');
  });
  
  test('should handle payment reminder with Indonesian cultural sensitivity', async ({ page }) => {
    // Create overdue invoice
    await businessHelper.createOverdueInvoice();
    
    // Navigate to payment reminders
    await page.goto('/payments/reminders');
    
    // Select overdue invoice
    await page.click('[data-testid="overdue-invoice"]:first-child');
    
    // Choose reminder type
    await page.selectOption('[data-testid="reminder-type"]', 'gentle');
    
    // Validate Indonesian cultural reminder message
    await test.step('Validate culturally appropriate reminder', async () => {
      const reminderPreview = page.locator('[data-testid="reminder-preview"]');
      const reminderText = await reminderPreview.textContent();
      
      // Check for polite Indonesian language
      expect(reminderText).toContain('Izin mengingatkan');
      expect(reminderText).toContain('Mohon maaf');
      expect(reminderText).not.toContain('Anda harus'); // Avoid demanding language
      
      // Validate appropriate honorific usage
      expect(reminderText).toContain('Bapak/Ibu');
    });
    
    // Send reminder
    await page.click('[data-testid="send-reminder"]');
    
    // Validate confirmation
    const successMessage = page.locator('[data-testid="reminder-success"]');
    await expect(successMessage).toContainText('Pengingat pembayaran telah dikirim dengan sopan');
  });
  
  test('should generate PDF invoice with Indonesian business format', async ({ page }) => {
    // Create sample invoice
    await businessHelper.createSampleInvoice(INDONESIAN_TEST_DATA.projects[0]);
    
    // Navigate to invoice detail
    await page.goto('/invoices/1');
    
    // Start PDF download and measure performance
    const downloadPromise = page.waitForDownload();
    await page.click('[data-testid="download-pdf"]');
    const download = await downloadPromise;
    
    // Validate PDF generation performance
    await test.step('Validate PDF generation performance', async () => {
      const generateTime = await performanceHelper.measurePDFGenerationTime();
      expect(generateTime).toBeLessThan(3000); // Max 3 seconds for Indonesian network conditions
    });
    
    // Save and validate PDF content
    const pdfPath = await download.path();
    const pdfContent = await businessHelper.extractPDFContent(pdfPath);
    
    // Validate Indonesian business PDF format
    await test.step('Validate PDF content format', async () => {
      // Check Indonesian currency formatting
      expect(pdfContent).toContain('Rp 15.000.000');
      
      // Check Indonesian date format
      const indonesianDate = new Date().toLocaleDateString('id-ID');
      expect(pdfContent).toContain(indonesianDate);
      
      // Check materai requirement notice
      expect(pdfContent).toContain('Materai diperlukan sesuai ketentuan yang berlaku');
      
      // Check Indonesian business language
      expect(pdfContent).toContain('Kepada Yth.');
      expect(pdfContent).toContain('Yang Terhormat');
      expect(pdfContent).toContain('Terima kasih');
    });
  });
  
  test('should handle multiple currency display preferences', async ({ page }) => {
    await page.goto('/settings/currency');
    
    // Test different Indonesian currency display options
    const currencyFormats = [
      { format: 'full', expected: 'Rp 15.000.000,00' },
      { format: 'abbreviated', expected: 'Rp 15jt' },
      { format: 'symbol-only', expected: 'Rp15.000.000' }
    ];
    
    for (const currencyFormat of currencyFormats) {
      await test.step(`Test currency format: ${currencyFormat.format}`, async () => {
        // Select currency format
        await page.selectOption('[data-testid="currency-format"]', currencyFormat.format);
        
        // Navigate to quotation to test formatting
        await page.goto('/quotations/create');
        
        // Enter test amount
        await page.fill('[data-testid="amount-input"]', '15000000');
        
        // Validate formatting
        const formattedAmount = page.locator('[data-testid="formatted-amount"]');
        await expect(formattedAmount).toContainText(currencyFormat.expected);
      });
    }
  });
  
  test('should validate accessibility for Indonesian screen readers', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test keyboard navigation
    await test.step('Test keyboard navigation', async () => {
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Navigate through main menu
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        const currentFocus = page.locator(':focus');
        await expect(currentFocus).toBeVisible();
      }
    });
    
    // Test ARIA labels in Indonesian
    await test.step('Test Indonesian ARIA labels', async () => {
      const quotationButton = page.locator('[data-testid="create-quotation"]');
      const ariaLabel = await quotationButton.getAttribute('aria-label');
      expect(ariaLabel).toContain('Buat quotation baru');
      
      const invoiceButton = page.locator('[data-testid="create-invoice"]');
      const invoiceAriaLabel = await invoiceButton.getAttribute('aria-label');
      expect(invoiceAriaLabel).toContain('Buat invoice baru');
    });
    
    // Test screen reader announcements
    await test.step('Test screen reader announcements', async () => {
      // Create quotation and listen for announcement
      await page.click('[data-testid="create-quotation"]');
      
      const announcement = page.locator('[data-testid="screen-reader-announcement"]');
      await expect(announcement).toContainText('Halaman pembuatan quotation telah dimuat');
    });
  });
  
  test('should handle Indonesian business hours and holiday considerations', async ({ page }) => {
    // Mock current time to Indonesian business hours
    await page.addInitScript(() => {
      const mockDate = new Date('2024-01-15T10:00:00+07:00'); // Monday 10 AM WIB
      Date.now = () => mockDate.getTime();
    });
    
    await page.goto('/dashboard');
    
    // Validate business hours indicator
    await test.step('Validate business hours indicator', async () => {
      const businessHoursIndicator = page.locator('[data-testid="business-hours-indicator"]');
      await expect(businessHoursIndicator).toContainText('Jam Kerja');
      await expect(businessHoursIndicator).toHaveClass(/active/);
    });
    
    // Test sending notification during business hours
    await test.step('Test business hour notification sending', async () => {
      await page.click('[data-testid="send-notification"]');
      
      const confirmationModal = page.locator('[data-testid="send-confirmation"]');
      await expect(confirmationModal).toContainText('Notifikasi akan dikirim sekarang');
    });
    
    // Mock time outside business hours
    await page.addInitScript(() => {
      const mockDate = new Date('2024-01-15T20:00:00+07:00'); // Monday 8 PM WIB
      Date.now = () => mockDate.getTime();
    });
    
    await page.reload();
    
    // Test notification scheduling outside business hours
    await test.step('Test after-hours notification scheduling', async () => {
      await page.click('[data-testid="send-notification"]');
      
      const scheduleModal = page.locator('[data-testid="schedule-confirmation"]');
      await expect(scheduleModal).toContainText('Notifikasi akan dikirim pada jam kerja berikutnya');
    });
  });
  
  test('should validate Indonesian regional business customizations', async ({ page }) => {
    const regions = [
      { code: 'JKT', name: 'Jakarta', businessStyle: 'fast-paced' },
      { code: 'YGY', name: 'Yogyakarta', businessStyle: 'traditional' },
      { code: 'SBY', name: 'Surabaya', businessStyle: 'commercial' }
    ];
    
    for (const region of regions) {
      await test.step(`Test regional customization for ${region.name}`, async () => {
        // Set regional preference
        await page.goto('/settings/regional');
        await page.selectOption('[data-testid="region-selector"]', region.code);
        
        // Navigate to quotation creation
        await page.goto('/quotations/create');
        
        // Validate regional business customizations
        const businessGreeting = page.locator('[data-testid="regional-greeting"]');
        
        switch (region.businessStyle) {
          case 'fast-paced':
            await expect(businessGreeting).toContainText('Selamat pagi');
            break;
          case 'traditional':
            await expect(businessGreeting).toContainText('Sugeng rawuh');
            break;
          case 'commercial':
            await expect(businessGreeting).toContainText('Selamat pagi, salam sejahtera');
            break;
        }
      });
    }
  });
});

test.describe('Performance Tests for Indonesian Network Conditions', () => {
  
  test('should load dashboard within Indonesian network thresholds', async ({ page }) => {
    // Simulate Indonesian 4G network conditions
    await page.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms latency
      await route.continue();
    });
    
    const startTime = Date.now();
    await page.goto('/dashboard');
    
    // Wait for main content to load
    await page.waitForSelector('[data-testid="dashboard-content"]');
    const loadTime = Date.now() - startTime;
    
    // Validate load time for Indonesian network conditions
    expect(loadTime).toBeLessThan(3000); // 3 seconds max for dashboard
    
    // Validate Core Web Vitals
    const performanceMetrics = await performanceHelper.getCoreWebVitals();
    expect(performanceMetrics.lcp).toBeLessThan(2500); // Adjusted for Indonesian conditions
    expect(performanceMetrics.fcp).toBeLessThan(1800);
  });
  
  test('should handle slow network gracefully', async ({ page }) => {
    // Simulate slow Indonesian 3G network
    await page.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 500)); // Add 500ms latency
      await route.continue();
    });
    
    await page.goto('/quotations/create');
    
    // Validate loading states
    const loadingIndicator = page.locator('[data-testid="loading-indicator"]');
    await expect(loadingIndicator).toBeVisible();
    
    // Validate offline capability
    await test.step('Test offline functionality', async () => {
      await page.setOffline(true);
      
      const offlineMessage = page.locator('[data-testid="offline-message"]');
      await expect(offlineMessage).toContainText('Koneksi terputus. Beberapa fitur mungkin tidak tersedia.');
      
      // Test that basic form filling still works
      await page.fill('[data-testid="client-name"]', 'Test Client');
      const clientName = await page.inputValue('[data-testid="client-name"]');
      expect(clientName).toBe('Test Client');
    });
  });
});

test.describe('Security and Compliance Tests', () => {
  
  test('should validate Indonesian data protection compliance', async ({ page }) => {
    await page.goto('/privacy-policy');
    
    // Validate Indonesian data protection notice
    const privacyNotice = page.locator('[data-testid="privacy-notice"]');
    await expect(privacyNotice).toContainText('Perlindungan Data Pribadi');
    await expect(privacyNotice).toContainText('Undang-Undang Nomor 27 Tahun 2022');
    
    // Test data export functionality
    await page.goto('/settings/data-export');
    await page.click('[data-testid="export-data"]');
    
    const exportConfirmation = page.locator('[data-testid="export-confirmation"]');
    await expect(exportConfirmation).toContainText('Data Anda akan diekspor sesuai dengan hak akses data pribadi');
  });
  
  test('should validate financial data security', async ({ page }) => {
    await page.goto('/quotations/create');
    
    // Test that financial data is properly masked in console
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    
    await page.fill('[data-testid="amount-input"]', '15000000');
    
    // Validate no financial data leaked in console
    const financialDataInLogs = logs.some(log => log.includes('15000000'));
    expect(financialDataInLogs).toBe(false);
    
    // Test proper HTTPS enforcement
    const currentURL = page.url();
    expect(currentURL).toMatch(/^https:/);
  });
});

// Test cleanup
test.afterEach(async ({ page }) => {
  // Clean up test data
  await businessHelper.cleanup();
  
  // Reset Indonesian locale settings
  await page.evaluate(() => {
    localStorage.removeItem('indonesian-preferences');
    sessionStorage.clear();
  });
});

export { INDONESIAN_TEST_CONFIG, INDONESIAN_TEST_DATA };