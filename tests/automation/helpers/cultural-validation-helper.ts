// Cultural Validation Helper for Indonesian Business Context
// Validates cultural appropriateness, etiquette, and communication patterns

import { Page, expect } from '@playwright/test';

export interface CulturalValidationConfig {
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

export interface CulturalScore {
  overall: number;
  language_formality: number;
  honorific_usage: number;
  business_etiquette: number;
  time_sensitivity: number;
  cultural_symbols: number;
}

export interface CulturalValidationResult {
  valid: boolean;
  score: CulturalScore;
  recommendations: string[];
  warnings: string[];
}

export class CulturalValidationHelper {
  private page: Page;
  private config: CulturalValidationConfig;

  // Indonesian cultural patterns and keywords
  private readonly FORMAL_GREETINGS = [
    'Selamat pagi', 'Selamat siang', 'Selamat sore', 'Selamat malam',
    'Yang Terhormat', 'Dengan hormat', 'Assalamualaikum'
  ];

  private readonly HONORIFICS = {
    male: ['Bapak', 'Pak', 'Mas', 'Bang', 'Om'],
    female: ['Ibu', 'Bu', 'Mbak', 'Tante', 'Neng'],
    general: ['Bapak/Ibu', 'Saudara/i', 'Yang Terhormat']
  };

  private readonly POLITE_CLOSINGS = [
    'Terima kasih', 'Salam hormat', 'Wassalamualaikum',
    'Hormat kami', 'Salam sejahtera', 'Terima kasih atas perhatiannya'
  ];

  private readonly BUSINESS_PHRASES = [
    'Izin', 'Mohon', 'Silakan', 'Dengan ini', 'Atas perhatiannya',
    'Kerja sama', 'Kepercayaan', 'Pelayanan terbaik'
  ];

  private readonly INAPPROPRIATE_INFORMAL = [
    'Hi', 'Hey', 'Halo aja', 'Gimana', 'Kayak gini',
    'Oke banget', 'Mantap', 'Keren abis'
  ];

  private readonly REGIONAL_VARIATIONS = {
    jakarta: ['Selamat pagi', 'Pak', 'Bu', 'Terima kasih'],
    yogyakarta: ['Sugeng rawuh', 'Pak', 'Bu', 'Matur nuwun'],
    surabaya: ['Selamat pagi', 'Cak', 'Ning', 'Makasih'],
    medan: ['Horas', 'Pak', 'Bu', 'Terima kasih'],
    bandung: ['Wilujeng', 'Pak', 'Bu', 'Hatur nuhun']
  };

  constructor(page: Page, config: CulturalValidationConfig) {
    this.page = page;
    this.config = config;
  }

  /**
   * Validate Indonesian locale setup
   */
  async validateIndonesianLocale(): Promise<void> {
    // Check document language
    const documentLang = await this.page.getAttribute('html', 'lang');
    expect(documentLang).toBe('id');

    // Check currency format in any displayed amounts
    const currencyElements = this.page.locator('[data-currency]');
    if (await currencyElements.count() > 0) {
      const currencyText = await currencyElements.first().textContent();
      expect(currencyText).toContain('Rp');
    }

    // Check date format
    const dateElements = this.page.locator('[data-date]');
    if (await dateElements.count() > 0) {
      const dateText = await dateElements.first().textContent();
      // Indonesian date format should be DD/MM/YYYY or DD-MM-YYYY
      expect(dateText).toMatch(/\d{2}[\/\-]\d{2}[\/\-]\d{4}/);
    }

    // Check timezone indicator
    const timezoneElements = this.page.locator('[data-timezone]');
    if (await timezoneElements.count() > 0) {
      const timezoneText = await timezoneElements.first().textContent();
      expect(timezoneText).toContain('WIB');
    }
  }

  /**
   * Calculate cultural appropriateness score for text content
   */
  async calculateCulturalScore(textContent?: string): Promise<number> {
    let content = textContent;
    
    if (!content) {
      // Get all visible text content from the page
      content = await this.page.textContent('body') || '';
    }

    const score: CulturalScore = {
      overall: 0,
      language_formality: 0,
      honorific_usage: 0,
      business_etiquette: 0,
      time_sensitivity: 0,
      cultural_symbols: 0
    };

    // Language formality assessment (0-100)
    score.language_formality = this.assessLanguageFormality(content);
    
    // Honorific usage assessment (0-100)
    score.honorific_usage = this.assessHonorificUsage(content);
    
    // Business etiquette assessment (0-100)
    score.business_etiquette = this.assessBusinessEtiquette(content);
    
    // Time sensitivity assessment (0-100)
    score.time_sensitivity = await this.assessTimeSensitivity();
    
    // Cultural symbols assessment (0-100)
    score.cultural_symbols = await this.assessCulturalSymbols();
    
    // Calculate overall score (weighted average)
    score.overall = Math.round(
      (score.language_formality * 0.3) +
      (score.honorific_usage * 0.25) +
      (score.business_etiquette * 0.25) +
      (score.time_sensitivity * 0.1) +
      (score.cultural_symbols * 0.1)
    );

    return score.overall;
  }

  /**
   * Comprehensive cultural validation
   */
  async validateCulturalAppropriateness(textContent?: string): Promise<CulturalValidationResult> {
    let content = textContent;
    
    if (!content) {
      content = await this.page.textContent('body') || '';
    }

    const score = await this.calculateCulturalScore(content);
    const recommendations: string[] = [];
    const warnings: string[] = [];

    // Language formality validation
    if (!this.containsFormalGreeting(content)) {
      recommendations.push('Gunakan salam formal seperti "Selamat pagi/siang/sore" untuk pembukaan');
    }

    if (!this.containsPoliteClosing(content)) {
      recommendations.push('Tambahkan penutup yang sopan seperti "Terima kasih" atau "Salam hormat"');
    }

    // Honorific validation
    if (!this.containsAppropriateHonorific(content)) {
      recommendations.push('Gunakan sapaan yang tepat seperti "Bapak/Ibu" untuk menunjukkan respek');
    }

    // Inappropriate language detection
    const inappropriateTerms = this.detectInappropriateLanguage(content);
    if (inappropriateTerms.length > 0) {
      warnings.push(`Hindari penggunaan bahasa informal: ${inappropriateTerms.join(', ')}`);
    }

    // Business context validation
    if (!this.containsBusinessPhrases(content) && content.length > 100) {
      recommendations.push('Gunakan frasa bisnis yang sesuai seperti "kerja sama", "pelayanan terbaik"');
    }

    // Time sensitivity validation
    const currentTime = new Date();
    if (await this.isOutsideBusinessHours(currentTime)) {
      warnings.push('Perhatikan jam kerja Indonesia (08:00-17:00 WIB) untuk komunikasi bisnis');
    }

    // Religious consideration
    if (await this.isDuringPrayerTime(currentTime)) {
      warnings.push('Hindari mengirim komunikasi saat waktu sholat (khususnya Jumat 11:30-13:00 WIB)');
    }

    return {
      valid: score >= 70, // Minimum acceptable cultural score
      score: {
        overall: score,
        language_formality: this.assessLanguageFormality(content),
        honorific_usage: this.assessHonorificUsage(content),
        business_etiquette: this.assessBusinessEtiquette(content),
        time_sensitivity: await this.assessTimeSensitivity(),
        cultural_symbols: await this.assessCulturalSymbols()
      },
      recommendations,
      warnings
    };
  }

  /**
   * Validate WhatsApp message cultural appropriateness
   */
  async validateWhatsAppMessage(): Promise<CulturalValidationResult> {
    const messageContent = this.page.locator('[data-testid="whatsapp-message-content"]');
    const messageText = await messageContent.textContent() || '';
    
    const validation = await this.validateCulturalAppropriateness(messageText);
    
    // Additional WhatsApp-specific validations
    const whatsappRecommendations: string[] = [];
    
    // Check message length (WhatsApp business best practices)
    if (messageText.length > 1000) {
      whatsappRecommendations.push('Pertimbangkan mempersingkat pesan untuk WhatsApp (maksimal 1000 karakter)');
    }

    // Check for emoji usage (appropriate for Indonesian business WhatsApp)
    if (!messageText.includes('🙏') && !messageText.includes('😊')) {
      whatsappRecommendations.push('Pertimbangkan menambahkan emoji yang sopan seperti 🙏 atau 😊');
    }

    // Check for proper opening for WhatsApp
    if (!messageText.includes('Selamat') && !messageText.includes('Assalamualaikum')) {
      whatsappRecommendations.push('Gunakan pembukaan yang sesuai untuk WhatsApp bisnis Indonesia');
    }

    // Merge recommendations
    validation.recommendations = [...validation.recommendations, ...whatsappRecommendations];

    return validation;
  }

  /**
   * Validate invoice/quotation document cultural formatting
   */
  async validateDocumentCulturalFormat(): Promise<CulturalValidationResult> {
    const documentContent = await this.page.textContent('[data-testid="document-content"]') || '';
    
    const validation = await this.validateCulturalAppropriateness(documentContent);
    
    // Additional document-specific validations
    const documentRecommendations: string[] = [];
    
    // Check for proper document header
    if (!documentContent.includes('Kepada Yth.') && !documentContent.includes('Yang Terhormat')) {
      documentRecommendations.push('Gunakan pembukaan formal "Kepada Yth." atau "Yang Terhormat" untuk dokumen bisnis');
    }

    // Check for proper document structure
    if (!documentContent.includes('Dengan ini') && !documentContent.includes('Bersama ini')) {
      documentRecommendations.push('Gunakan pembuka formal dokumen seperti "Dengan ini kami sampaikan"');
    }

    // Check for proper closing
    if (!documentContent.includes('Demikian') && !documentContent.includes('Atas perhatian')) {
      documentRecommendations.push('Gunakan penutup formal seperti "Demikian penawaran ini" atau "Atas perhatiannya"');
    }

    // Check for company representation
    if (!documentContent.includes('Hormat kami') && !documentContent.includes('Salam hormat')) {
      documentRecommendations.push('Sertakan representasi perusahaan dengan "Hormat kami" atau "Salam hormat"');
    }

    validation.recommendations = [...validation.recommendations, ...documentRecommendations];

    return validation;
  }

  /**
   * Validate regional cultural preferences
   */
  async validateRegionalPreferences(region: string): Promise<boolean> {
    const regionPrefs = this.REGIONAL_VARIATIONS[region as keyof typeof this.REGIONAL_VARIATIONS];
    
    if (!regionPrefs) {
      return true; // Default to general Indonesian if region not specified
    }

    const pageContent = await this.page.textContent('body') || '';
    
    // Check if regional greetings are appropriately used
    const hasRegionalGreeting = regionPrefs.some(phrase => pageContent.includes(phrase));
    
    if (region === 'yogyakarta' || region === 'bandung') {
      // For Javanese/Sundanese regions, local language is acceptable
      return hasRegionalGreeting || this.containsFormalGreeting(pageContent);
    }

    // For other regions, standard Indonesian is expected
    return this.containsFormalGreeting(pageContent);
  }

  /**
   * Validate color scheme cultural appropriateness
   */
  async validateColorSchemeCulturalFit(): Promise<boolean> {
    // Indonesian business-friendly colors
    const appropriateColors = [
      'rgb(34, 139, 34)',   // Forest green (growth, prosperity)
      'rgb(255, 215, 0)',   // Gold (prosperity, value)
      'rgb(70, 130, 180)',  // Steel blue (trust, stability)
      'rgb(220, 20, 60)',   // Crimson (passion, energy)
      'rgb(25, 25, 112)'    // Midnight blue (professionalism)
    ];

    const inappropriateColors = [
      'rgb(255, 105, 180)', // Hot pink (unprofessional)
      'rgb(255, 0, 255)',   // Magenta (too flashy)
      'rgb(0, 255, 0)',     // Bright green (too bright)
      'rgb(255, 255, 0)'    // Yellow (attention-grabbing but unprofessional)
    ];

    // Check primary color scheme
    const primaryElements = this.page.locator('[data-testid*="primary"], .primary');
    
    if (await primaryElements.count() > 0) {
      const primaryColor = await primaryElements.first().evaluate(el => 
        getComputedStyle(el).backgroundColor
      );

      // Check if color is inappropriate
      const isInappropriate = inappropriateColors.some(color => 
        this.isColorSimilar(primaryColor, color)
      );

      return !isInappropriate;
    }

    return true; // Default to true if no primary color elements found
  }

  /**
   * Validate accessibility with Indonesian context
   */
  async validateIndonesianAccessibility(): Promise<boolean> {
    // Check for Indonesian ARIA labels
    const ariaLabels = await this.page.$$eval('[aria-label]', elements =>
      elements.map(el => el.getAttribute('aria-label'))
    );

    const hasIndonesianAriaLabels = ariaLabels.some(label =>
      label && (
        label.includes('Buat') ||
        label.includes('Simpan') ||
        label.includes('Kirim') ||
        label.includes('Hapus') ||
        label.includes('Edit')
      )
    );

    // Check for Indonesian screen reader announcements
    const announcements = this.page.locator('[data-testid*="announcement"], [role="status"]');
    if (await announcements.count() > 0) {
      const announcementText = await announcements.first().textContent();
      const hasIndonesianAnnouncements = announcementText && (
        announcementText.includes('berhasil') ||
        announcementText.includes('dimuat') ||
        announcementText.includes('tersimpan') ||
        announcementText.includes('terkirim')
      );

      return hasIndonesianAriaLabels && hasIndonesianAnnouncements;
    }

    return hasIndonesianAriaLabels;
  }

  // Private helper methods

  private assessLanguageFormality(content: string): number {
    let score = 50; // Base score

    // Check for formal greetings
    if (this.containsFormalGreeting(content)) {
      score += 20;
    }

    // Check for polite language
    if (this.BUSINESS_PHRASES.some(phrase => content.includes(phrase))) {
      score += 15;
    }

    // Check for formal pronouns
    if (content.includes('Bapak/Ibu') || content.includes('Saudara/i')) {
      score += 10;
    }

    // Deduct for informal language
    const informalCount = this.INAPPROPRIATE_INFORMAL.filter(term => content.includes(term)).length;
    score -= informalCount * 10;

    return Math.max(0, Math.min(100, score));
  }

  private assessHonorificUsage(content: string): number {
    let score = 30; // Base score

    // Check for appropriate honorifics
    const maleHonorifics = this.HONORIFICS.male.filter(h => content.includes(h)).length;
    const femaleHonorifics = this.HONORIFICS.female.filter(h => content.includes(h)).length;
    const generalHonorifics = this.HONORIFICS.general.filter(h => content.includes(h)).length;

    score += (maleHonorifics + femaleHonorifics + generalHonorifics) * 15;

    return Math.max(0, Math.min(100, score));
  }

  private assessBusinessEtiquette(content: string): number {
    let score = 40; // Base score

    // Check for polite closing
    if (this.containsPoliteClosing(content)) {
      score += 20;
    }

    // Check for business phrases
    const businessPhraseCount = this.BUSINESS_PHRASES.filter(phrase => content.includes(phrase)).length;
    score += Math.min(businessPhraseCount * 8, 25);

    // Check for gratitude expression
    if (content.includes('Terima kasih') || content.includes('Matur nuwun')) {
      score += 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  private async assessTimeSensitivity(): Promise<number> {
    const currentTime = new Date();
    let score = 70; // Base score

    // Deduct if outside business hours
    if (await this.isOutsideBusinessHours(currentTime)) {
      score -= 20;
    }

    // Deduct if during prayer time
    if (await this.isDuringPrayerTime(currentTime)) {
      score -= 30;
    }

    // Deduct if during lunch break
    if (await this.isDuringLunchBreak(currentTime)) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private async assessCulturalSymbols(): Promise<number> {
    let score = 60; // Base score

    // Check for appropriate color scheme
    const hasAppropriatColors = await this.validateColorSchemeCulturalFit();
    if (hasAppropriatColors) {
      score += 20;
    }

    // Check for Indonesian currency symbols
    const pageContent = await this.page.textContent('body') || '';
    if (pageContent.includes('Rp') || pageContent.includes('IDR')) {
      score += 10;
    }

    // Check for Indonesian date format
    const dateRegex = /\d{2}[\/\-]\d{2}[\/\-]\d{4}/;
    if (dateRegex.test(pageContent)) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private containsFormalGreeting(content: string): boolean {
    return this.FORMAL_GREETINGS.some(greeting => content.includes(greeting));
  }

  private containsPoliteClosing(content: string): boolean {
    return this.POLITE_CLOSINGS.some(closing => content.includes(closing));
  }

  private containsAppropriateHonorific(content: string): boolean {
    const allHonorifics = [
      ...this.HONORIFICS.male,
      ...this.HONORIFICS.female,
      ...this.HONORIFICS.general
    ];
    return allHonorifics.some(honorific => content.includes(honorific));
  }

  private containsBusinessPhrases(content: string): boolean {
    return this.BUSINESS_PHRASES.some(phrase => content.includes(phrase));
  }

  private detectInappropriateLanguage(content: string): string[] {
    return this.INAPPROPRIATE_INFORMAL.filter(term => content.includes(term));
  }

  private async isOutsideBusinessHours(time: Date): Promise<boolean> {
    const hour = time.getHours();
    const startHour = parseInt(this.config.business_hours.start.split(':')[0]);
    const endHour = parseInt(this.config.business_hours.end.split(':')[0]);
    
    return hour < startHour || hour >= endHour;
  }

  private async isDuringPrayerTime(time: Date): Promise<boolean> {
    // Friday prayer time consideration (11:30-13:00 WIB)
    const dayOfWeek = time.getDay();
    const hour = time.getHours();
    const minute = time.getMinutes();
    
    if (dayOfWeek === 5) { // Friday
      return (hour === 11 && minute >= 30) || hour === 12 || (hour === 13 && minute === 0);
    }
    
    return false;
  }

  private async isDuringLunchBreak(time: Date): Promise<boolean> {
    const hour = time.getHours();
    const lunchStart = parseInt(this.config.business_hours.lunch_break.start.split(':')[0]);
    const lunchEnd = parseInt(this.config.business_hours.lunch_break.end.split(':')[0]);
    
    return hour >= lunchStart && hour < lunchEnd;
  }

  private isColorSimilar(color1: string, color2: string, tolerance: number = 30): boolean {
    // Simple color similarity check (would need more sophisticated comparison in real implementation)
    return color1 === color2;
  }
}

export default CulturalValidationHelper;