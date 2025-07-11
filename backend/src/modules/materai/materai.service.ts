import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { TransformationUtil } from '../../common/utils/transformation.util';

export interface MateraiConfig {
  enabled: boolean;
  threshold: number;
  stampDutyAmount: number;
  enforceCompliance: boolean;
  reminderDays: number[];
  autoApply: boolean;
}

export interface MateraiCheckResult {
  required: boolean;
  amount: number;
  threshold: number;
  message: string;
  compliance: {
    lawReference: string;
    effectiveDate: string;
    penalty: string;
  };
}

export interface MateraiStats {
  totalInvoicesRequiringMaterai: number;
  totalInvoicesWithMaterai: number;
  totalInvoicesWithoutMaterai: number;
  complianceRate: number;
  totalStampDutyAmount: number;
  recentMateraiApplications: Array<{
    invoiceId: string;
    invoiceNumber: string;
    amount: string;
    appliedAt: string;
    clientName: string;
  }>;
}

@Injectable()
export class MateraiService {
  private readonly logger = new Logger(MateraiService.name);
  private readonly materaiConfig: MateraiConfig;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService
  ) {
    // Load materai configuration from environment or defaults
    this.materaiConfig = {
      enabled: this.configService.get<boolean>('MATERAI_ENABLED', true),
      threshold: this.configService.get<number>('MATERAI_THRESHOLD', 5000000), // 5 million IDR
      stampDutyAmount: this.configService.get<number>('MATERAI_STAMP_AMOUNT', 10000), // 10,000 IDR
      enforceCompliance: this.configService.get<boolean>('MATERAI_ENFORCE_COMPLIANCE', true),
      reminderDays: [30, 14, 7, 3, 1], // Days before due date to send reminders
      autoApply: this.configService.get<boolean>('MATERAI_AUTO_APPLY', false)
    };

    this.logger.log('Materai service initialized with config:', this.materaiConfig);
  }

  /**
   * Check if an invoice requires materai based on Indonesian law
   */
  async checkMateraiRequirement(invoiceId: string): Promise<MateraiCheckResult> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        totalAmount: true,
        materaiRequired: true,
        materaiApplied: true
      }
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const amount = Number(invoice.totalAmount);
    const required = this.materaiConfig.enabled && amount > this.materaiConfig.threshold;

    return {
      required,
      amount,
      threshold: this.materaiConfig.threshold,
      message: required 
        ? `Invoice memerlukan materai karena nilai lebih dari ${TransformationUtil.formatIDR(this.materaiConfig.threshold)}`
        : `Invoice tidak memerlukan materai karena nilai kurang dari ${TransformationUtil.formatIDR(this.materaiConfig.threshold)}`,
      compliance: {
        lawReference: 'UU No. 13 Tahun 1985 tentang Bea Meterai',
        effectiveDate: '1985-12-31',
        penalty: 'Denda 2x lipat dari bea meterai yang terutang'
      }
    };
  }

  /**
   * Apply materai to an invoice
   */
  async applyMaterai(invoiceId: string, appliedBy: string): Promise<void> {
    const materaiCheck = await this.checkMateraiRequirement(invoiceId);
    
    if (!materaiCheck.required) {
      throw new Error('Invoice does not require materai');
    }

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        materaiApplied: true
      }
    });

    this.logger.log(`Materai applied to invoice ${invoiceId} by ${appliedBy}`);
  }

  /**
   * Remove materai from an invoice
   */
  async removeMaterai(invoiceId: string, removedBy: string): Promise<void> {
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        materaiApplied: false
      }
    });

    this.logger.log(`Materai removed from invoice ${invoiceId} by ${removedBy}`);
  }

  /**
   * Bulk apply materai to multiple invoices
   */
  async bulkApplyMaterai(invoiceIds: string[], appliedBy: string): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (const invoiceId of invoiceIds) {
      try {
        await this.applyMaterai(invoiceId, appliedBy);
        success.push(invoiceId);
      } catch (error) {
        failed.push(invoiceId);
        this.logger.error(`Failed to apply materai to invoice ${invoiceId}: ${error.message}`);
      }
    }

    return { success, failed };
  }

  /**
   * Get materai statistics
   */
  async getMateraiStats(): Promise<MateraiStats> {
    const [total, withMaterai, withoutMaterai, recentApplications] = await Promise.all([
      this.prisma.invoice.count({
        where: {
          materaiRequired: true
        }
      }),
      this.prisma.invoice.count({
        where: {
          materaiRequired: true,
          materaiApplied: true
        }
      }),
      this.prisma.invoice.count({
        where: {
          materaiRequired: true,
          materaiApplied: false
        }
      }),
      this.prisma.invoice.findMany({
        where: {
          materaiApplied: true
        },
        include: {
          client: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: 10
      })
    ]);

    const totalStampDutyAmount = withMaterai * this.materaiConfig.stampDutyAmount;
    const complianceRate = total > 0 ? (withMaterai / total) * 100 : 100;

    return {
      totalInvoicesRequiringMaterai: total,
      totalInvoicesWithMaterai: withMaterai,
      totalInvoicesWithoutMaterai: withoutMaterai,
      complianceRate: Math.round(complianceRate * 100) / 100,
      totalStampDutyAmount,
      recentMateraiApplications: recentApplications.map(invoice => ({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: TransformationUtil.formatIDR(invoice.totalAmount),
        appliedAt: TransformationUtil.dateToString(invoice.updatedAt)!,
        clientName: invoice.client?.name || 'Unknown'
      }))
    };
  }

  /**
   * Get invoices requiring materai reminders
   */
  async getInvoicesRequiringMateraiReminders(): Promise<any[]> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        materaiRequired: true,
        materaiApplied: false,
        status: {
          in: ['SENT', 'OVERDUE']
        }
      },
      include: {
        client: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    return invoices.map(invoice => {
      const daysUntilDue = Math.ceil(
        (new Date(invoice.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        ...invoice,
        daysUntilDue,
        shouldSendReminder: this.materaiConfig.reminderDays.includes(daysUntilDue),
        urgencyLevel: daysUntilDue <= 3 ? 'HIGH' : daysUntilDue <= 7 ? 'MEDIUM' : 'LOW'
      };
    });
  }

  /**
   * Update materai configuration
   */
  async updateMateraiConfig(config: Partial<MateraiConfig>): Promise<MateraiConfig> {
    Object.assign(this.materaiConfig, config);
    this.logger.log('Materai configuration updated:', this.materaiConfig);
    return this.materaiConfig;
  }

  /**
   * Get current materai configuration
   */
  getMateraiConfig(): MateraiConfig {
    return { ...this.materaiConfig };
  }

  /**
   * Validate materai compliance for an invoice
   */
  async validateMateraiCompliance(invoiceId: string): Promise<{
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        totalAmount: true,
        materaiRequired: true,
        materaiApplied: true,
        status: true,
        dueDate: true
      }
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const issues: string[] = [];
    const recommendations: string[] = [];
    const amount = Number(invoice.totalAmount);
    const requiresMaterai = amount > this.materaiConfig.threshold;

    // Check if materai requirement is correctly set
    if (requiresMaterai && !invoice.materaiRequired) {
      issues.push('Invoice should be marked as requiring materai');
      recommendations.push('Update invoice to set materaiRequired = true');
    } else if (!requiresMaterai && invoice.materaiRequired) {
      issues.push('Invoice should not be marked as requiring materai');
      recommendations.push('Update invoice to set materaiRequired = false');
    }

    // Check if materai is applied when required
    if (invoice.materaiRequired && !invoice.materaiApplied) {
      issues.push('Materai is required but not applied');
      recommendations.push('Apply materai stamp to ensure legal compliance');
    }

    // Check for overdue compliance
    if (invoice.materaiRequired && !invoice.materaiApplied && invoice.status === 'OVERDUE') {
      issues.push('Overdue invoice missing required materai');
      recommendations.push('Immediate action required: Apply materai and update invoice');
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations
    };
  }
}
