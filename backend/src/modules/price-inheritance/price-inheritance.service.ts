// Price Inheritance Service - Indonesian Business Management System
// Comprehensive price inheritance with Indonesian business compliance and validation

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { 
  CreatePriceInheritanceDto, 
  UpdatePriceInheritanceDto,
  PriceInheritanceResponseDto,
  PriceValidationResponseDto,
  PriceSourceDto,
  IndonesianComplianceDto,
  ValidationSeverity,
  IndonesianBusinessRule,
  PriceInheritanceMode,
  PriceSourceType,
  CommunicationStyle
} from './dto/price-inheritance.dto'

interface PriceValidationRule {
  id: string
  type: IndonesianBusinessRule | 'pricing' | 'business_logic'
  severity: ValidationSeverity
  message: string
  indonesianContext?: string
  suggestedAction?: string
  isBlocking?: boolean
  metadata?: {
    threshold?: number
    calculatedValue?: number
    requiredDocuments?: string[]
  }
}

interface IndonesianComplianceResult {
  materaiRequired: boolean
  materaiAmount: number
  taxCompliance: {
    ppnRequired: boolean
    ppnRate: number
    pphRequired: boolean
    pphRate: number
  }
  businessEtiquette: {
    suggestedTiming: string
    communicationStyle: CommunicationStyle
    culturalNotes: string[]
  }
}

@Injectable()
export class PriceInheritanceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get available price sources for a given entity
   */
  async getAvailableSources(
    entityType: 'quotation' | 'invoice',
    entityId: string,
    userId: string
  ): Promise<PriceSourceDto[]> {
    // Validate user access
    await this.validateUserAccess(entityType, entityId, userId)

    const sources: PriceSourceDto[] = []

    if (entityType === 'quotation') {
      // For quotations, get project as source
      const quotation = await this.prisma.quotation.findUnique({
        where: { id: entityId },
        include: {
          project: {
            include: {
              client: true
            }
          }
        }
      })

      if (!quotation?.project) {
        throw new NotFoundException('Project not found for quotation')
      }

      sources.push({
        id: quotation.project.id,
        type: PriceSourceType.PROJECT,
        entityName: quotation.project.description,
        entityNumber: quotation.project.number,
        originalAmount: Number(quotation.totalAmount) || 0,
        lastUpdated: quotation.project.updatedAt,
        metadata: {
          createdBy: 'system',
          notes: quotation.project.description
        }
      })

      // Get previous quotations for this project
      const previousQuotations = await this.prisma.quotation.findMany({
        where: {
          projectId: quotation.projectId,
          id: { not: entityId },
          status: 'APPROVED'
        },
        orderBy: { createdAt: 'desc' },
        take: 3
      })

      for (const prevQuotation of previousQuotations) {
        sources.push({
          id: prevQuotation.id,
          type: PriceSourceType.QUOTATION,
          entityName: `Quotation ${prevQuotation.quotationNumber}`,
          entityNumber: prevQuotation.quotationNumber,
          originalAmount: Number(prevQuotation.totalAmount),
          lastUpdated: prevQuotation.updatedAt,
          metadata: {
            approvedBy: prevQuotation.createdBy,
            notes: prevQuotation.terms || 'No notes available'
          }
        })
      }

    } else if (entityType === 'invoice') {
      // For invoices, get quotation and project as sources
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: entityId },
        include: {
          quotation: {
            include: {
              project: {
                include: {
                  client: true
                }
              }
            }
          }
        }
      })

      if (!invoice?.quotation) {
        throw new NotFoundException('Quotation not found for invoice')
      }

      // Add quotation as primary source
      sources.push({
        id: invoice.quotation.id,
        type: PriceSourceType.QUOTATION,
        entityName: `Quotation ${invoice.quotation.quotationNumber}`,
        entityNumber: invoice.quotation.quotationNumber,
        originalAmount: Number(invoice.quotation.totalAmount),
        lastUpdated: invoice.quotation.updatedAt,
        metadata: {
          approvedBy: invoice.quotation.createdBy,
          notes: invoice.quotation.terms || 'No notes available'
        }
      })

      // Add project as secondary source
      if (invoice.quotation.project) {
        sources.push({
          id: invoice.quotation.project.id,
          type: PriceSourceType.PROJECT,
          entityName: invoice.quotation.project.description,
          entityNumber: invoice.quotation.project.number,
          originalAmount: Number(invoice.quotation.totalAmount) || 0,
          lastUpdated: invoice.quotation.project.updatedAt,
          metadata: {
            createdBy: invoice.quotation.createdBy,
            notes: invoice.quotation.project.description
          }
        })
      }
    }

    return sources
  }

  /**
   * Validate price inheritance configuration
   */
  async validatePriceInheritance(
    amount: number,
    mode: PriceInheritanceMode,
    sourceId?: string,
    inheritedAmount?: number
  ): Promise<PriceValidationResponseDto> {
    const rules: PriceValidationRule[] = []
    const warnings: PriceValidationRule[] = []
    const errors: PriceValidationRule[] = []
    const suggestions: PriceValidationRule[] = []

    // Basic amount validation
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push({
        id: 'invalid-amount',
        type: 'pricing',
        severity: ValidationSeverity.ERROR,
        message: 'Jumlah harus berupa angka yang valid dan lebih besar dari nol',
        isBlocking: true
      })
    }

    // Price deviation validation
    if (mode === PriceInheritanceMode.CUSTOM && inheritedAmount && inheritedAmount > 0) {
      const deviation = Math.abs((amount - inheritedAmount) / inheritedAmount) * 100

      if (deviation > 50) {
        warnings.push({
          id: 'extreme-deviation',
          type: 'pricing',
          severity: ValidationSeverity.WARNING,
          message: `Harga menyimpang ${deviation.toFixed(1)}% dari sumber`,
          indonesianContext: 'Penyimpangan harga yang besar dapat mempengaruhi profitabilitas dan daya saing',
          suggestedAction: 'Pertimbangkan untuk meninjau kembali harga atau dokumentasikan alasan penyimpangan',
          metadata: {
            threshold: 50,
            calculatedValue: deviation
          }
        })
      } else if (deviation > 20) {
        suggestions.push({
          id: 'significant-deviation',
          type: 'pricing',
          severity: ValidationSeverity.INFO,
          message: `Harga menyimpang ${deviation.toFixed(1)}% dari sumber`,
          indonesianContext: 'Penyimpangan moderat masih dapat diterima dengan justifikasi yang tepat',
          suggestedAction: 'Berikan penjelasan untuk penyimpangan harga kepada klien'
        })
      }
    }

    // Indonesian compliance validation
    const compliance = await this.validateIndonesianCompliance(amount)

    if (compliance.materaiRequired) {
      suggestions.push({
        id: 'materai-required',
        type: IndonesianBusinessRule.MATERAI,
        severity: ValidationSeverity.INFO,
        message: `Materai Rp ${this.formatIDR(compliance.materaiAmount)} diperlukan`,
        indonesianContext: 'Sesuai dengan UU No. 13 Tahun 1985 tentang Bea Materai',
        suggestedAction: 'Siapkan materai sebelum mencetak dokumen',
        metadata: {
          requiredDocuments: ['Materai', 'Dokumen asli untuk ditempel materai']
        }
      })
    }

    // Business etiquette validation
    if (amount >= 100000000) {
      suggestions.push({
        id: 'formal-communication',
        type: IndonesianBusinessRule.BUSINESS_ETIQUETTE,
        severity: ValidationSeverity.INFO,
        message: 'Transaksi besar memerlukan komunikasi formal',
        indonesianContext: 'Dalam budaya bisnis Indonesia, transaksi besar memerlukan pendekatan yang lebih formal dan personal',
        suggestedAction: 'Gunakan gaya komunikasi formal dan pertimbangkan pertemuan langsung'
      })
    }

    // Tax compliance
    if (compliance.taxCompliance.ppnRequired) {
      suggestions.push({
        id: 'ppn-compliance',
        type: IndonesianBusinessRule.TAX_COMPLIANCE,
        severity: ValidationSeverity.INFO,
        message: `PPN ${compliance.taxCompliance.ppnRate}% perlu diperhitungkan`,
        indonesianContext: 'Sesuai dengan peraturan perpajakan Indonesia yang berlaku',
        suggestedAction: 'Pastikan perhitungan PPN sudah benar dalam dokumen'
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      compliance,
      totalRules: rules.length,
      validationTimestamp: new Date()
    }
  }

  /**
   * Create price inheritance configuration
   */
  async createPriceInheritance(
    dto: CreatePriceInheritanceDto,
    userId: string
  ): Promise<PriceInheritanceResponseDto> {
    // Validate the configuration
    const validation = await this.validatePriceInheritance(
      dto.currentAmount,
      dto.mode,
      dto.sourceId,
      dto.inheritedAmount
    )

    if (!validation.isValid) {
      throw new BadRequestException({
        message: 'Konfigurasi harga tidak valid',
        errors: validation.errors
      })
    }

    // Calculate final configuration
    const deviationPercentage = dto.inheritedAmount && dto.inheritedAmount > 0
      ? Math.abs((dto.currentAmount - dto.inheritedAmount) / dto.inheritedAmount) * 100
      : 0

    const config = {
      mode: dto.mode,
      sourceId: dto.sourceId,
      currentAmount: dto.currentAmount,
      inheritedAmount: dto.inheritedAmount,
      deviationPercentage,
      requiresApproval: deviationPercentage > 20,
      createdBy: userId,
      createdAt: new Date()
    }

    // Store user interaction for analytics (if tracking enabled)
    if (dto.trackUserInteraction) {
      await this.trackUserInteraction(dto.entityType, dto.entityId, userId, {
        action: 'price_inheritance_created',
        mode: dto.mode,
        amount: dto.currentAmount,
        deviation: deviationPercentage
      })
    }

    return {
      config,
      validation,
      metadata: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        calculatedAt: new Date(),
        version: '1.0'
      }
    }
  }

  /**
   * Update price inheritance configuration
   */
  async updatePriceInheritance(
    id: string,
    dto: UpdatePriceInheritanceDto,
    userId: string
  ): Promise<PriceInheritanceResponseDto> {
    // Similar to create but with update logic
    const validation = await this.validatePriceInheritance(
      dto.currentAmount,
      dto.mode,
      dto.sourceId,
      dto.inheritedAmount
    )

    const deviationPercentage = dto.inheritedAmount && dto.inheritedAmount > 0
      ? Math.abs((dto.currentAmount - dto.inheritedAmount) / dto.inheritedAmount) * 100
      : 0

    const config = {
      mode: dto.mode,
      sourceId: dto.sourceId,
      currentAmount: dto.currentAmount,
      inheritedAmount: dto.inheritedAmount,
      deviationPercentage,
      requiresApproval: deviationPercentage > 20,
      updatedBy: userId,
      updatedAt: new Date()
    }

    return {
      config,
      validation,
      metadata: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        calculatedAt: new Date(),
        version: '1.0'
      }
    }
  }

  /**
   * Get price inheritance analytics
   */
  async getPriceInheritanceAnalytics(
    dateFrom: Date,
    dateTo: Date,
    userId?: string
  ) {
    // Implementation for analytics data
    return {
      totalConfigurations: 0,
      modeDistribution: {
        inherit: 0,
        custom: 0,
        partial: 0
      },
      averageDeviation: 0,
      complianceRate: 0,
      userSatisfaction: 0
    }
  }

  // Private helper methods

  private async validateUserAccess(
    entityType: string,
    entityId: string,
    userId: string
  ): Promise<void> {
    // Implement user access validation based on entity type
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    // Add role-based access control logic here
  }

  private async validateIndonesianCompliance(
    amount: number
  ): Promise<IndonesianComplianceResult> {
    const materaiRequired = amount >= 5000000
    const materaiAmount = this.calculateMateraiAmount(amount)

    return {
      materaiRequired,
      materaiAmount,
      taxCompliance: {
        ppnRequired: true, // PPN is generally required in Indonesia
        ppnRate: 11, // Current PPN rate in Indonesia
        pphRequired: amount >= 50000000, // PPh for large transactions
        pphRate: 2.5 // Typical PPh rate
      },
      businessEtiquette: {
        suggestedTiming: this.getBusinessTiming(),
        communicationStyle: amount >= 100000000 ? CommunicationStyle.FORMAL : CommunicationStyle.SEMI_FORMAL,
        culturalNotes: [
          'Dalam budaya Indonesia, transparansi harga sangat dihargai',
          'Berikan penjelasan yang jelas untuk setiap penyimpangan harga',
          'Sertakan breakdown detail untuk membangun kepercayaan klien'
        ]
      }
    }
  }

  private calculateMateraiAmount(amount: number): number {
    if (amount < 5000000) {
      return 0
    } else if (amount < 1000000000) {
      return 10000 // 10,000 IDR materai
    } else {
      return 20000 // 20,000 IDR materai for high-value transactions
    }
  }

  private getBusinessTiming(): string {
    const hour = new Date().getHours()
    if (hour >= 9 && hour <= 12) {
      return 'Pagi (09:00-12:00 WIB) - Waktu terbaik untuk diskusi bisnis'
    } else if (hour >= 13 && hour <= 16) {
      return 'Siang (13:00-16:00 WIB) - Waktu yang baik untuk negosiasi'
    } else {
      return 'Sore/Malam - Pertimbangkan untuk menunda diskusi harga ke hari kerja'
    }
  }

  private formatIDR(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  private async trackUserInteraction(
    entityType: string,
    entityId: string,
    userId: string,
    data: any
  ): Promise<void> {
    // Track user interactions for UX analytics
    try {
      // TODO: Create userInteraction table in database schema
      // await this.prisma.userInteraction.create({
      //   data: {
      //     userId,
      //     entityType,
      //     entityId,
      //     action: data.action,
      //     metadata: data,
      //     timestamp: new Date()
      //   }
      // })
    } catch (error) {
      // Log error but don't fail the main operation
      console.error('Failed to track user interaction:', error)
    }
  }
}