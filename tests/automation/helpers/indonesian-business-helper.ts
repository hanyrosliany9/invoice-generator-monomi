// Indonesian Business Test Helper
// Comprehensive helper functions for Indonesian business workflow testing

import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';

export interface IndonesianBusinessConfig {
  locale: string;
  timezone: string;
  currency: string;
  language: string;
  materai_threshold: number;
  business_hours: {
    start: string;
    end: string;
    lunch_break: { start: string; end: string; };
  };
  holidays: string[];
}

export interface BusinessClient {
  name: string;
  title: string;
  honorific: string;
  gender: 'male' | 'female';
  company: string;
  phone: string;
  email: string;
  preferred_communication: 'whatsapp' | 'email' | 'phone';
}

export interface BusinessProject {
  title: string;
  description: string;
  value: number;
  duration: string;
  deliverables: string[];
}

export interface BusinessCompany {
  name: string;
  npwp: string;
  address: string;
  phone: string;
  email: string;
}

export class IndonesianBusinessTestHelper {
  private page: Page;
  private config: IndonesianBusinessConfig;
  private testData: any[] = [];

  constructor(page: Page, config: IndonesianBusinessConfig) {
    this.page = page;
    this.config = config;
  }

  /**
   * Navigate to page and ensure Indonesian locale is loaded
   */
  async navigateWithIndonesianContext(url: string): Promise<void> {
    await this.page.goto(url);
    
    // Wait for Indonesian locale to load
    await this.page.waitForFunction(() => {
      return document.documentElement.lang === 'id' || 
             document.querySelector('[data-locale="id-ID"]') !== null;
    });
    
    // Set Indonesian business context in localStorage
    await this.page.evaluate((config) => {
      localStorage.setItem('business-locale', config.locale);
      localStorage.setItem('business-timezone', config.timezone);
      localStorage.setItem('business-currency', config.currency);
      localStorage.setItem('materai-threshold', config.materai_threshold.toString());
    }, this.config);
  }

  /**
   * Fill quotation form with Indonesian business data
   */
  async fillQuotationForm(data: { 
    client: BusinessClient; 
    project: BusinessProject; 
    company: BusinessCompany; 
  }): Promise<void> {
    const { client, project, company } = data;

    // Fill client information with Indonesian formatting
    await this.page.fill('[data-testid="client-name"]', client.name);
    await this.page.fill('[data-testid="client-title"]', client.title);
    await this.page.fill('[data-testid="client-company"]', client.company);
    await this.page.fill('[data-testid="client-phone"]', this.formatIndonesianPhone(client.phone));
    await this.page.fill('[data-testid="client-email"]', client.email);
    
    // Set honorific appropriately
    await this.page.selectOption('[data-testid="client-honorific"]', client.honorific);
    
    // Fill project information
    await this.page.fill('[data-testid="project-title"]', project.title);
    await this.page.fill('[data-testid="project-description"]', project.description);
    await this.page.fill('[data-testid="project-duration"]', project.duration);
    
    // Fill project value with Indonesian currency formatting
    await this.page.fill('[data-testid="project-value"]', project.value.toString());
    
    // Add deliverables
    for (let i = 0; i < project.deliverables.length; i++) {
      await this.page.click('[data-testid="add-deliverable"]');
      await this.page.fill(`[data-testid="deliverable-${i}"]`, project.deliverables[i]);
    }
    
    // Fill company information
    await this.page.fill('[data-testid="company-name"]', company.name);
    await this.page.fill('[data-testid="company-npwp"]', company.npwp);
    await this.page.fill('[data-testid="company-address"]', company.address);
    await this.page.fill('[data-testid="company-phone"]', this.formatIndonesianPhone(company.phone));
    await this.page.fill('[data-testid="company-email"]', company.email);
    
    // Set quotation date to current Indonesian date
    const indonesianDate = this.formatIndonesianDate(new Date());
    await this.page.fill('[data-testid="quotation-date"]', indonesianDate);
    
    // Set validity period (standard 30 days for Indonesian business)
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    await this.page.fill('[data-testid="valid-until"]', this.formatIndonesianDate(validUntil));
    
    // Add Indonesian business terms
    const indonesianTerms = this.getStandardIndonesianTerms();
    await this.page.fill('[data-testid="terms-conditions"]', indonesianTerms);
    
    // Store test data for cleanup
    this.testData.push({
      type: 'quotation',
      client: client.name,
      project: project.title,
      value: project.value
    });
  }

  /**
   * Create a sample quotation for testing
   */
  async createSampleQuotation(project: BusinessProject): Promise<string> {
    await this.navigateWithIndonesianContext('/quotations/create');
    
    const sampleData = {
      client: {
        name: 'Budi Santoso',
        title: 'Direktur',
        honorific: 'Bapak',
        gender: 'male' as const,
        company: 'PT Sukses Mandiri',
        phone: '+62-812-3456-7890',
        email: 'budi.santoso@suksesmandiri.com',
        preferred_communication: 'whatsapp' as const
      },
      project: project,
      company: {
        name: 'PT Maju Bersama Indonesia',
        npwp: '12.345.678.9-123.000',
        address: 'Jl. Sudirman No. 123, Jakarta Selatan',
        phone: '+62-21-12345678',
        email: 'info@majubersama.co.id'
      }
    };
    
    await this.fillQuotationForm(sampleData);
    await this.page.click('[data-testid="submit-quotation"]');
    
    // Wait for success and get quotation ID
    await this.page.waitForSelector('[data-testid="quotation-id"]');
    const quotationId = await this.page.textContent('[data-testid="quotation-id"]');
    
    return quotationId || '';
  }

  /**
   * Create a sample invoice for testing
   */
  async createSampleInvoice(project: BusinessProject): Promise<string> {
    // First create a quotation
    const quotationId = await this.createSampleQuotation(project);
    
    // Navigate to quotation and convert to invoice
    await this.page.goto(`/quotations/${quotationId}`);
    await this.page.click('[data-testid="convert-to-invoice"]');
    
    // Configure invoice settings
    await this.setInvoiceDueDate(14); // Standard 14 days for Indonesian business
    
    // Add Indonesian payment terms
    const paymentTerms = 'Pembayaran dalam 14 hari kerja setelah invoice diterima melalui transfer bank.';
    await this.page.fill('[data-testid="payment-terms"]', paymentTerms);
    
    // Add Indonesian business notes
    const notes = 'Terima kasih atas kepercayaan Bapak/Ibu kepada kami. Mohon konfirmasi pembayaran setelah transfer dilakukan.';
    await this.page.fill('[data-testid="invoice-notes"]', notes);
    
    // Handle materai compliance if needed
    if (project.value >= this.config.materai_threshold) {
      await this.page.check('[data-testid="materai-compliance-checkbox"]');
    }
    
    // Submit invoice
    await this.page.click('[data-testid="create-invoice"]');
    
    // Wait for success and get invoice ID
    await this.page.waitForSelector('[data-testid="invoice-id"]');
    const invoiceId = await this.page.textContent('[data-testid="invoice-id"]');
    
    return invoiceId || '';
  }

  /**
   * Create an overdue invoice for testing payment reminders
   */
  async createOverdueInvoice(): Promise<string> {
    const overdueProject: BusinessProject = {
      title: 'Overdue Test Project',
      description: 'Test project for overdue invoice testing',
      value: 7500000,
      duration: '2 bulan',
      deliverables: ['Testing deliverable']
    };
    
    const invoiceId = await this.createSampleInvoice(overdueProject);
    
    // Simulate overdue by updating due date in database (would need API call in real implementation)
    await this.page.evaluate((id) => {
      // Mock overdue status
      localStorage.setItem(`invoice-${id}-overdue`, 'true');
      localStorage.setItem(`invoice-${id}-overdue-days`, '7');
    }, invoiceId);
    
    return invoiceId;
  }

  /**
   * Set invoice due date with Indonesian business calendar consideration
   */
  async setInvoiceDueDate(daysFromNow: number): Promise<void> {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysFromNow);
    
    // Skip weekends and Indonesian holidays
    while (this.isWeekendOrHoliday(dueDate)) {
      dueDate.setDate(dueDate.getDate() + 1);
    }
    
    const formattedDate = this.formatIndonesianDate(dueDate);
    await this.page.fill('[data-testid="due-date"]', formattedDate);
  }

  /**
   * Validate materai calculation
   */
  async validateMateraiCalculation(amount: number): Promise<boolean> {
    const materaiRequired = amount >= this.config.materai_threshold;
    
    if (materaiRequired) {
      const materaiIndicator = this.page.locator('[data-testid="materai-indicator"]');
      await expect(materaiIndicator).toBeVisible();
      await expect(materaiIndicator).toContainText('Materai diperlukan');
      
      // Validate materai amount (standard Rp 10.000)
      const materaiAmount = this.page.locator('[data-testid="materai-amount"]');
      await expect(materaiAmount).toContainText('Rp 10.000');
      
      return true;
    } else {
      const materaiIndicator = this.page.locator('[data-testid="materai-not-required"]');
      await expect(materaiIndicator).toContainText('Materai tidak diperlukan');
      
      return false;
    }
  }

  /**
   * Extract PDF content for validation
   */
  async extractPDFContent(pdfPath: string): Promise<string> {
    try {
      const pdfBuffer = fs.readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      
      let fullText = '';
      
      // Extract text from all pages (simplified - in real implementation would use proper PDF parsing)
      for (const page of pages) {
        // This is a simplified extraction - would need proper PDF text extraction library
        const pageContent = page.getTextContent?.() || '';
        fullText += pageContent + '\n';
      }
      
      return fullText;
    } catch (error) {
      console.error('PDF extraction error:', error);
      return '';
    }
  }

  /**
   * Validate Indonesian currency formatting
   */
  async validateCurrencyFormat(amount: number, expectedFormat: string): Promise<void> {
    const formattedAmount = this.formatIndonesianCurrency(amount, expectedFormat);
    const currencyElement = this.page.locator('[data-testid="formatted-currency"]');
    await expect(currencyElement).toContainText(formattedAmount);
  }

  /**
   * Validate Indonesian date formatting
   */
  async validateDateFormat(date: Date): Promise<void> {
    const formattedDate = this.formatIndonesianDate(date);
    const dateElement = this.page.locator('[data-testid="formatted-date"]');
    await expect(dateElement).toContainText(formattedDate);
  }

  /**
   * Send WhatsApp message with Indonesian business template
   */
  async sendIndonesianWhatsAppMessage(messageType: 'quotation' | 'invoice' | 'reminder'): Promise<void> {
    await this.page.click('[data-testid="send-whatsapp"]');
    
    // Select message template
    await this.page.selectOption('[data-testid="message-template"]', messageType);
    
    // Validate Indonesian business message content
    const messageContent = this.page.locator('[data-testid="whatsapp-message-content"]');
    const messageText = await messageContent.textContent();
    
    // Validate Indonesian business etiquette
    expect(messageText).toContain('Selamat');
    expect(messageText).toContain('Bapak/Ibu');
    expect(messageText).toContain('Terima kasih');
    
    // Send message
    await this.page.click('[data-testid="send-message"]');
    
    // Validate confirmation
    const confirmation = this.page.locator('[data-testid="send-confirmation"]');
    await expect(confirmation).toContainText('berhasil dikirim');
  }

  /**
   * Test Indonesian business hours validation
   */
  async validateBusinessHours(): Promise<boolean> {
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const businessStart = parseInt(this.config.business_hours.start.split(':')[0]);
    const businessEnd = parseInt(this.config.business_hours.end.split(':')[0]);
    
    const isBusinessHours = currentHour >= businessStart && currentHour < businessEnd;
    
    const businessHoursIndicator = this.page.locator('[data-testid="business-hours-status"]');
    
    if (isBusinessHours) {
      await expect(businessHoursIndicator).toContainText('Jam Kerja');
      await expect(businessHoursIndicator).toHaveClass(/active/);
    } else {
      await expect(businessHoursIndicator).toContainText('Di Luar Jam Kerja');
      await expect(businessHoursIndicator).toHaveClass(/inactive/);
    }
    
    return isBusinessHours;
  }

  /**
   * Cleanup test data
   */
  async cleanup(): Promise<void> {
    // Clean up created test data
    for (const item of this.testData) {
      try {
        if (item.type === 'quotation') {
          // Would delete quotation via API
          console.log(`Cleaning up quotation for ${item.client}`);
        } else if (item.type === 'invoice') {
          // Would delete invoice via API
          console.log(`Cleaning up invoice for ${item.client}`);
        }
      } catch (error) {
        console.warn(`Cleanup failed for ${item.type}:`, error);
      }
    }
    
    // Clear test data array
    this.testData = [];
    
    // Clear localStorage
    await this.page.evaluate(() => {
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('test-') || 
        key.startsWith('invoice-') && key.includes('overdue') ||
        key.startsWith('business-')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));
    });
  }

  // Helper methods

  private formatIndonesianPhone(phone: string): string {
    // Ensure Indonesian format (+62)
    if (!phone.startsWith('+62')) {
      if (phone.startsWith('0')) {
        return '+62' + phone.substring(1);
      } else if (phone.startsWith('62')) {
        return '+' + phone;
      } else {
        return '+62' + phone;
      }
    }
    return phone;
  }

  private formatIndonesianDate(date: Date): string {
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: this.config.timezone
    });
  }

  private formatIndonesianCurrency(amount: number, format: string = 'full'): string {
    switch (format) {
      case 'full':
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(amount);
      
      case 'abbreviated':
        if (amount >= 1000000000) {
          return `Rp ${(amount / 1000000000).toFixed(1)}M`;
        } else if (amount >= 1000000) {
          return `Rp ${(amount / 1000000).toFixed(1)}jt`;
        } else if (amount >= 1000) {
          return `Rp ${(amount / 1000).toFixed(0)}rb`;
        }
        return `Rp ${amount.toLocaleString('id-ID')}`;
      
      case 'symbol-only':
        return `Rp${amount.toLocaleString('id-ID')}`;
      
      default:
        return `Rp ${amount.toLocaleString('id-ID')}`;
    }
  }

  private isWeekendOrHoliday(date: Date): boolean {
    // Check weekend (Saturday = 6, Sunday = 0)
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return true;
    }
    
    // Check Indonesian holidays
    const dateString = date.toISOString().split('T')[0];
    return this.config.holidays.includes(dateString);
  }

  private getStandardIndonesianTerms(): string {
    return `SYARAT DAN KETENTUAN:

1. Harga yang tercantum belum termasuk PPN 11%
2. Pembayaran dilakukan dalam 2 (dua) tahap:
   - 50% di muka setelah penandatanganan kontrak
   - 50% setelah pekerjaan selesai dan diterima klien
3. Pembayaran melalui transfer bank ke rekening yang akan diberikan
4. Quotation ini berlaku selama 30 hari kerja
5. Pekerjaan dimulai setelah pembayaran tahap pertama diterima
6. Perubahan spesifikasi akan dikenakan biaya tambahan
7. Force majeure tidak menjadi tanggung jawab penyedia jasa

Terima kasih atas kepercayaan Bapak/Ibu kepada kami.`;
  }
}

export default IndonesianBusinessTestHelper;