import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { Decimal } from "@prisma/client/runtime/library";
import { TransformationUtil } from "../../common/utils/transformation.util";
import { getErrorMessage } from "../../common/utils/error-handling.util";

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
    private configService: ConfigService,
  ) {
    // Load materai configuration from environment or defaults
    this.materaiConfig = {
      enabled: this.configService.get<boolean>("MATERAI_ENABLED", true),
      threshold: this.configService.get<number>("MATERAI_THRESHOLD", 5000000), // 5 million IDR
      stampDutyAmount: this.configService.get<number>(
        "MATERAI_STAMP_AMOUNT",
        10000,
      ), // 10,000 IDR
      enforceCompliance: this.configService.get<boolean>(
        "MATERAI_ENFORCE_COMPLIANCE",
        true,
      ),
      reminderDays: [30, 14, 7, 3, 1], // Days before due date to send reminders
      autoApply: this.configService.get<boolean>("MATERAI_AUTO_APPLY", false),
    };

    this.logger.log(
      "Materai service initialized with config:",
      this.materaiConfig,
    );
  }

  /**
   * Check if an invoice requires materai based on Indonesian law
   */
  async checkMateraiRequirement(
    invoiceId: string,
  ): Promise<MateraiCheckResult> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        totalAmount: true,
        materaiRequired: true,
        materaiApplied: true,
      },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const amount = Number(invoice.totalAmount);
    const required =
      this.materaiConfig.enabled && amount > this.materaiConfig.threshold;

    return {
      required,
      amount,
      threshold: this.materaiConfig.threshold,
      message: required
        ? `Invoice memerlukan materai karena nilai lebih dari ${TransformationUtil.formatIDR(this.materaiConfig.threshold)}`
        : `Invoice tidak memerlukan materai karena nilai kurang dari ${TransformationUtil.formatIDR(this.materaiConfig.threshold)}`,
      compliance: {
        lawReference: "UU No. 13 Tahun 1985 tentang Bea Meterai",
        effectiveDate: "1985-12-31",
        penalty: "Denda 2x lipat dari bea meterai yang terutang",
      },
    };
  }

  /**
   * Apply materai to an invoice
   */
  async applyMaterai(invoiceId: string, appliedBy: string): Promise<void> {
    const materaiCheck = await this.checkMateraiRequirement(invoiceId);

    if (!materaiCheck.required) {
      throw new Error("Invoice does not require materai");
    }

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        materaiApplied: true,
      },
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
        materaiApplied: false,
      },
    });

    this.logger.log(
      `Materai removed from invoice ${invoiceId} by ${removedBy}`,
    );
  }

  /**
   * Bulk apply materai to multiple invoices
   */
  async bulkApplyMaterai(
    invoiceIds: string[],
    appliedBy: string,
  ): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (const invoiceId of invoiceIds) {
      try {
        await this.applyMaterai(invoiceId, appliedBy);
        success.push(invoiceId);
      } catch (error) {
        failed.push(invoiceId);
        this.logger.error(
          `Failed to apply materai to invoice ${invoiceId}: ${getErrorMessage(error)}`,
        );
      }
    }

    return { success, failed };
  }

  /**
   * Get materai statistics
   */
  async getMateraiStats(): Promise<MateraiStats> {
    const [total, withMaterai, withoutMaterai, recentApplications] =
      await Promise.all([
        this.prisma.invoice.count({
          where: {
            materaiRequired: true,
          },
        }),
        this.prisma.invoice.count({
          where: {
            materaiRequired: true,
            materaiApplied: true,
          },
        }),
        this.prisma.invoice.count({
          where: {
            materaiRequired: true,
            materaiApplied: false,
          },
        }),
        this.prisma.invoice.findMany({
          where: {
            materaiApplied: true,
          },
          include: {
            client: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 10,
        }),
      ]);

    const totalStampDutyAmount =
      withMaterai * this.materaiConfig.stampDutyAmount;
    const complianceRate = total > 0 ? (withMaterai / total) * 100 : 100;

    return {
      totalInvoicesRequiringMaterai: total,
      totalInvoicesWithMaterai: withMaterai,
      totalInvoicesWithoutMaterai: withoutMaterai,
      complianceRate: Math.round(complianceRate * 100) / 100,
      totalStampDutyAmount,
      recentMateraiApplications: recentApplications.map((invoice) => ({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: TransformationUtil.formatIDR(invoice.totalAmount),
        appliedAt: TransformationUtil.dateToString(invoice.updatedAt)!,
        clientName: invoice.client?.name || "Unknown",
      })),
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
          in: ["SENT", "OVERDUE"],
        },
      },
      include: {
        client: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return invoices.map((invoice) => {
      const daysUntilDue = Math.ceil(
        (new Date(invoice.dueDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      );

      return {
        ...invoice,
        daysUntilDue,
        shouldSendReminder:
          this.materaiConfig.reminderDays.includes(daysUntilDue),
        urgencyLevel:
          daysUntilDue <= 3 ? "HIGH" : daysUntilDue <= 7 ? "MEDIUM" : "LOW",
      };
    });
  }

  /**
   * Update materai configuration
   */
  async updateMateraiConfig(
    config: Partial<MateraiConfig>,
  ): Promise<MateraiConfig> {
    Object.assign(this.materaiConfig, config);
    this.logger.log("Materai configuration updated:", this.materaiConfig);
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
        dueDate: true,
      },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const issues: string[] = [];
    const recommendations: string[] = [];
    const amount = Number(invoice.totalAmount);
    const requiresMaterai = amount > this.materaiConfig.threshold;

    // Check if materai requirement is correctly set
    if (requiresMaterai && !invoice.materaiRequired) {
      issues.push("Invoice should be marked as requiring materai");
      recommendations.push("Update invoice to set materaiRequired = true");
    } else if (!requiresMaterai && invoice.materaiRequired) {
      issues.push("Invoice should not be marked as requiring materai");
      recommendations.push("Update invoice to set materaiRequired = false");
    }

    // Check if materai is applied when required
    if (invoice.materaiRequired && !invoice.materaiApplied) {
      issues.push("Materai is required but not applied");
      recommendations.push("Apply materai stamp to ensure legal compliance");
    }

    // Check for overdue compliance
    if (
      invoice.materaiRequired &&
      !invoice.materaiApplied &&
      invoice.status === "OVERDUE"
    ) {
      issues.push("Overdue invoice missing required materai");
      recommendations.push(
        "Immediate action required: Apply materai and update invoice",
      );
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations,
    };
  }

  // Enhanced automation features for workflow efficiency

  /**
   * Smart materai detection with auto-suggestions
   */
  async smartMateraiDetection(invoiceId: string): Promise<{
    autoDetected: boolean;
    suggestion: {
      action: "APPLY_MATERAI" | "NO_MATERAI_NEEDED" | "REVIEW_REQUIRED";
      confidence: number;
      reasoning: string;
      estimatedCost: number;
      urgencyLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    };
    complianceRisk: {
      level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      penalties: string[];
      timeToCompliance: number; // days
    };
    automation: {
      canAutoApply: boolean;
      requiresUserConfirmation: boolean;
      blockers: string[];
    };
  }> {
    try {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          client: true,
          project: true,
          quotation: true,
        },
      });

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      const amount = Number(invoice.totalAmount);
      const threshold = this.materaiConfig.threshold;
      const requiresMaterai = amount > threshold;

      // Calculate confidence based on amount proximity to threshold
      let confidence = 100;
      if (Math.abs(amount - threshold) / threshold < 0.1) {
        confidence = 75; // Lower confidence if close to threshold
      }

      // Determine action
      let action: "APPLY_MATERAI" | "NO_MATERAI_NEEDED" | "REVIEW_REQUIRED";
      let reasoning: string;

      if (requiresMaterai) {
        action = "APPLY_MATERAI";
        reasoning = `Invoice senilai ${TransformationUtil.formatIDR(amount)} melebihi batas materai ${TransformationUtil.formatIDR(threshold)}. Materai wajib diterapkan sesuai UU No. 13 Tahun 1985.`;
      } else if (amount > threshold * 0.9) {
        action = "REVIEW_REQUIRED";
        reasoning = `Invoice senilai ${TransformationUtil.formatIDR(amount)} mendekati batas materai. Pastikan perhitungan sudah benar.`;
        confidence = 60;
      } else {
        action = "NO_MATERAI_NEEDED";
        reasoning = `Invoice senilai ${TransformationUtil.formatIDR(amount)} di bawah batas materai. Tidak diperlukan materai.`;
      }

      // Calculate urgency based on invoice status and due date
      let urgencyLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
      if (requiresMaterai && !invoice.materaiApplied) {
        const daysUntilDue = Math.ceil(
          (new Date(invoice.dueDate).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (daysUntilDue <= 1) urgencyLevel = "CRITICAL";
        else if (daysUntilDue <= 3) urgencyLevel = "HIGH";
        else if (daysUntilDue <= 7) urgencyLevel = "MEDIUM";
      }

      // Assess compliance risk
      let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
      const penalties: string[] = [];
      let timeToCompliance = 30;

      if (requiresMaterai && !invoice.materaiApplied) {
        if (invoice.status === "OVERDUE") {
          riskLevel = "CRITICAL";
          penalties.push("Denda 2x lipat nilai materai (Rp 20.000)");
          penalties.push("Risiko sengketa hukum");
          timeToCompliance = 0;
        } else if (invoice.status === "SENT") {
          riskLevel = "HIGH";
          penalties.push("Denda 2x lipat nilai materai jika terlambat");
          timeToCompliance = Math.max(
            0,
            Math.ceil(
              (new Date(invoice.dueDate).getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          );
        } else {
          riskLevel = "MEDIUM";
          timeToCompliance = 14;
        }
      }

      // Determine automation capabilities
      const blockers: string[] = [];
      let canAutoApply = this.materaiConfig.autoApply && requiresMaterai;
      let requiresUserConfirmation =
        !this.materaiConfig.autoApply || confidence < 90;

      if (invoice.status === "PAID") {
        blockers.push("Invoice sudah dibayar, tidak dapat diubah");
        canAutoApply = false;
      }

      if (invoice.materaiApplied) {
        blockers.push("Materai sudah diterapkan");
        canAutoApply = false;
      }

      return {
        autoDetected: true,
        suggestion: {
          action,
          confidence,
          reasoning,
          estimatedCost: requiresMaterai
            ? this.materaiConfig.stampDutyAmount
            : 0,
          urgencyLevel,
        },
        complianceRisk: {
          level: riskLevel,
          penalties,
          timeToCompliance,
        },
        automation: {
          canAutoApply,
          requiresUserConfirmation,
          blockers,
        },
      };
    } catch (error) {
      this.logger.error("Smart materai detection failed:", error);
      throw new Error(
        `Smart materai detection failed: ${getErrorMessage(error)}`,
      );
    }
  }

  /**
   * Auto-apply materai with compliance validation
   */
  async autoApplyMaterai(
    invoiceId: string,
    userId: string,
  ): Promise<{
    applied: boolean;
    materaiAmount: number;
    complianceNotes: string;
    timestamp: Date;
  }> {
    try {
      const detection = await this.smartMateraiDetection(invoiceId);

      if (!detection.automation.canAutoApply) {
        throw new Error(
          `Cannot auto-apply materai: ${detection.automation.blockers.join(", ")}`,
        );
      }

      if (detection.suggestion.action !== "APPLY_MATERAI") {
        throw new Error(
          `Auto-apply not recommended: ${detection.suggestion.reasoning}`,
        );
      }

      // Apply materai
      await this.applyMaterai(invoiceId, userId);

      const timestamp = new Date();
      const complianceNotes =
        `Materai diterapkan otomatis pada ${timestamp.toISOString()}. ` +
        `Nilai invoice: ${detection.suggestion.estimatedCost > 0 ? TransformationUtil.formatIDR(detection.suggestion.estimatedCost) : "N/A"}. ` +
        `Dasar hukum: UU No. 13 Tahun 1985. ` +
        `Diproses oleh: Sistem Otomatis (User: ${userId}).`;

      // Track business journey event
      const event = await this.prisma.businessJourneyEvent.create({
        data: {
          type: "MATERAI_APPLIED",
          title: "Materai Diterapkan Otomatis",
          description: complianceNotes,
          status: "COMPLETED",
          amount: detection.suggestion.estimatedCost,
          invoiceId: invoiceId,
          createdBy: userId,
        },
      });

      // Create metadata separately
      await this.prisma.businessJourneyEventMetadata.create({
        data: {
          eventId: event.id,
          userCreated: userId,
          source: "SYSTEM",
          priority:
            detection.suggestion.urgencyLevel === "CRITICAL"
              ? "HIGH"
              : "MEDIUM",
          tags: ["automation", "materai", "compliance"],
          relatedDocuments: [invoiceId],
          materaiRequired: true,
          materaiAmount: this.materaiConfig.stampDutyAmount,
          complianceStatus: "COMPLIANT",
        },
      });

      return {
        applied: true,
        materaiAmount: this.materaiConfig.stampDutyAmount,
        complianceNotes,
        timestamp,
      };
    } catch (error) {
      this.logger.error("Auto-apply materai failed:", error);
      throw new Error(`Auto-apply materai failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Bulk smart materai detection for multiple invoices
   */
  async bulkSmartMateraiDetection(invoiceIds: string[]): Promise<{
    results: Array<{
      invoiceId: string;
      invoiceNumber: string;
      detection: any;
      recommendation: string;
    }>;
    summary: {
      requireMaterai: number;
      noMateraiNeeded: number;
      reviewRequired: number;
      totalEstimatedCost: number;
      highRiskCount: number;
    };
  }> {
    try {
      const results = [];
      let requireMaterai = 0;
      let noMateraiNeeded = 0;
      let reviewRequired = 0;
      let totalEstimatedCost = 0;
      let highRiskCount = 0;

      for (const invoiceId of invoiceIds) {
        try {
          const detection = await this.smartMateraiDetection(invoiceId);
          const invoice = await this.prisma.invoice.findUnique({
            where: { id: invoiceId },
            select: { invoiceNumber: true },
          });

          let recommendation = "";
          switch (detection.suggestion.action) {
            case "APPLY_MATERAI":
              requireMaterai++;
              recommendation = `Terapkan materai (${TransformationUtil.formatIDR(detection.suggestion.estimatedCost)})`;
              totalEstimatedCost += detection.suggestion.estimatedCost;
              break;
            case "NO_MATERAI_NEEDED":
              noMateraiNeeded++;
              recommendation = "Tidak perlu materai";
              break;
            case "REVIEW_REQUIRED":
              reviewRequired++;
              recommendation = "Perlu review manual";
              break;
          }

          if (["HIGH", "CRITICAL"].includes(detection.complianceRisk.level)) {
            highRiskCount++;
          }

          results.push({
            invoiceId,
            invoiceNumber: invoice?.invoiceNumber || "Unknown",
            detection,
            recommendation,
          });
        } catch (error) {
          results.push({
            invoiceId,
            invoiceNumber: "Error",
            detection: null,
            recommendation: `Error: ${getErrorMessage(error)}`,
          });
        }
      }

      return {
        results,
        summary: {
          requireMaterai,
          noMateraiNeeded,
          reviewRequired,
          totalEstimatedCost,
          highRiskCount,
        },
      };
    } catch (error) {
      this.logger.error("Bulk smart materai detection failed:", error);
      throw new Error(
        `Bulk smart materai detection failed: ${getErrorMessage(error)}`,
      );
    }
  }
}
