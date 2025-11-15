import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { IndonesianCompanyInfo } from "../reports/indonesian-pdf-formatter";

@Injectable()
export class CompanySettingsService {
  private readonly logger = new Logger(CompanySettingsService.name);
  private cachedSettings: IndonesianCompanyInfo | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get company settings formatted for Indonesian PDF reports
   * Uses caching to reduce database queries
   */
  async getCompanyInfo(): Promise<IndonesianCompanyInfo> {
    const now = Date.now();

    // Return cached data if still valid
    if (this.cachedSettings && now < this.cacheExpiry) {
      return this.cachedSettings;
    }

    // Fetch from database
    const settings = await this.prisma.companySettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      this.logger.error("Company settings not found in database");
      throw new NotFoundException(
        "Company settings not configured. Please contact administrator.",
      );
    }

    // Map database fields to IndonesianCompanyInfo interface
    // Extract city and postal code from address if possible
    const addressParts = this.parseAddress(settings.address || "");

    const companyInfo: IndonesianCompanyInfo = {
      name: settings.companyName,
      address: addressParts.street,
      city: addressParts.city,
      postalCode: addressParts.postalCode,
      phone: settings.phone || "-",
      email: settings.email || "-",
      website: settings.website || "-",
      npwp: settings.taxNumber || "00.000.000.0-000.000", // Default NPWP format
      siup: "SIUP/2024/001", // TODO: Add SIUP field to database schema
    };

    // Cache the result
    this.cachedSettings = companyInfo;
    this.cacheExpiry = now + this.CACHE_TTL;

    return companyInfo;
  }

  /**
   * Get raw company settings from database
   */
  async getSettings() {
    const settings = await this.prisma.companySettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      throw new NotFoundException("Company settings not found");
    }

    return settings;
  }

  /**
   * Update company settings and clear cache
   */
  async updateSettings(data: any) {
    const updated = await this.prisma.companySettings.update({
      where: { id: "default" },
      data,
    });

    // Clear cache
    this.cachedSettings = null;
    this.cacheExpiry = 0;

    return updated;
  }

  /**
   * Clear cached company settings
   */
  clearCache(): void {
    this.cachedSettings = null;
    this.cacheExpiry = 0;
    this.logger.log("Company settings cache cleared");
  }

  /**
   * Parse address string to extract city and postal code
   * Example: "Taman Cibaduyut Indah Blok E 232" -> street, city, postal code
   */
  private parseAddress(address: string): {
    street: string;
    city: string;
    postalCode: string;
  } {
    // Default values
    let street = address;
    let city = "Bandung"; // Default city based on Cibaduyut
    let postalCode = "40000";

    // Try to detect city names in address
    const cityPatterns = [
      { pattern: /bandung/i, city: "Bandung", postal: "40000" },
      { pattern: /jakarta/i, city: "Jakarta", postal: "12000" },
      { pattern: /surabaya/i, city: "Surabaya", postal: "60000" },
      { pattern: /medan/i, city: "Medan", postal: "20000" },
      { pattern: /semarang/i, city: "Semarang", postal: "50000" },
    ];

    for (const { pattern, city: cityName, postal } of cityPatterns) {
      if (pattern.test(address)) {
        city = cityName;
        postalCode = postal;
        break;
      }
    }

    // Try to extract postal code if present (5 digits)
    const postalMatch = address.match(/\b\d{5}\b/);
    if (postalMatch) {
      postalCode = postalMatch[0];
    }

    return { street, city, postalCode };
  }
}
