import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InvoiceStatus, QuotationStatus } from '@prisma/client';
import { WorkflowSummaryDto, WorkflowStatsDto, WorkflowCheckResultDto } from './dto';
import { TransformationUtil } from '../../common/utils/transformation.util';

export interface WorkflowSummary {
  id: string;
  type: 'quotation' | 'invoice';
  number: string;
  clientName: string;
  status: string;
  totalAmount: number;
  dueDate?: Date;
  validUntil?: Date;
  createdAt: Date;
}

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService
  ) {}

  // Run every day at 9 AM
  @Cron('0 9 * * *', {
    name: 'quotation-expiry-check',
    timeZone: 'Asia/Jakarta', // Indonesian timezone
  })
  async processExpiredQuotations(): Promise<void> {
    this.logger.log('🔄 Running quotation expiry check...');
    
    try {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Find quotations expiring in 3 days (warning)
      const expiringQuotations = await this.prisma.quotation.findMany({
        where: {
          status: {
            in: [QuotationStatus.SENT, QuotationStatus.DRAFT]
          },
          validUntil: {
            gte: tomorrow,
            lte: threeDaysFromNow
          }
        },
        include: {
          client: true,
          project: true
        }
      });

      this.logger.log(`Found ${expiringQuotations.length} quotations expiring in 3 days`);

      // Send notifications for expiring quotations
      for (const quotation of expiringQuotations) {
        const daysRemaining = Math.ceil(
          (new Date(quotation.validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        
        await this.notificationsService.sendQuotationExpiring(quotation.id, daysRemaining);
        this.logger.log(`Sent expiry notification for quotation ${quotation.quotationNumber}`);
      }

      // Find quotations that have already expired and auto-decline them
      const expiredQuotations = await this.prisma.quotation.findMany({
        where: {
          status: {
            in: [QuotationStatus.SENT, QuotationStatus.DRAFT]
          },
          validUntil: {
            lt: new Date()
          }
        }
      });

      this.logger.log(`Found ${expiredQuotations.length} expired quotations to auto-decline`);

      // Auto-decline expired quotations
      for (const quotation of expiredQuotations) {
        await this.prisma.quotation.update({
          where: { id: quotation.id },
          data: { status: QuotationStatus.DECLINED }
        });
        this.logger.log(`Auto-declined expired quotation ${quotation.quotationNumber}`);
      }

    } catch (error) {
      this.logger.error(`Error processing expired quotations: ${error.message}`, error.stack);
    }
  }

  // Run every day at 10 AM
  @Cron('0 10 * * *', {
    name: 'invoice-overdue-check',
    timeZone: 'Asia/Jakarta', // Indonesian timezone
  })
  async processOverdueInvoices(): Promise<void> {
    this.logger.log('🔄 Running overdue invoice check...');
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find invoices that are overdue
      const overdueInvoices = await this.prisma.invoice.findMany({
        where: {
          status: InvoiceStatus.SENT,
          dueDate: {
            lt: today
          }
        },
        include: {
          client: true,
          project: true
        }
      });

      this.logger.log(`Found ${overdueInvoices.length} overdue invoices`);

      // Update status to OVERDUE and send notifications
      for (const invoice of overdueInvoices) {
        // Update status
        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: InvoiceStatus.OVERDUE }
        });

        // Send overdue notification
        if (invoice.client?.email) {
          const daysOverdue = Math.ceil(
            (today.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
          );

          await this.notificationsService.sendNotification({
            type: 'INVOICE_OVERDUE' as any,
            to: invoice.client.email,
            subject: `Invoice ${invoice.invoiceNumber} Jatuh Tempo`,
            entityType: 'invoice',
            entityId: invoice.id,
            data: {
              invoiceNumber: invoice.invoiceNumber,
              clientName: invoice.client.name,
              dueDate: new Date(invoice.dueDate).toLocaleDateString('id-ID'),
              daysOverdue,
              totalAmount: `IDR ${Number(invoice.totalAmount).toLocaleString('id-ID')}`
            }
          });
        }

        this.logger.log(`Updated invoice ${invoice.invoiceNumber} to OVERDUE status`);
      }

    } catch (error) {
      this.logger.error(`Error processing overdue invoices: ${error.message}`, error.stack);
    }
  }

  // Run every day at 11 AM
  @Cron('0 11 * * *', {
    name: 'materai-reminder-check',
    timeZone: 'Asia/Jakarta', // Indonesian timezone
  })
  async processMateraiReminders(): Promise<void> {
    this.logger.log('🔄 Running materai reminder check...');
    
    try {
      // Find invoices that require materai but haven't been applied
      const invoicesNeedingMaterai = await this.prisma.invoice.findMany({
        where: {
          materaiRequired: true,
          materaiApplied: false,
          status: {
            in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE]
          }
        },
        include: {
          client: true
        }
      });

      this.logger.log(`Found ${invoicesNeedingMaterai.length} invoices needing materai reminders`);

      // Send materai reminders
      for (const invoice of invoicesNeedingMaterai) {
        if (invoice.client?.email) {
          await this.notificationsService.sendNotification({
            type: 'MATERAI_REMINDER' as any,
            to: invoice.client.email,
            subject: `Pengingat Materai - Invoice ${invoice.invoiceNumber}`,
            entityType: 'invoice',
            entityId: invoice.id,
            data: {
              invoiceNumber: invoice.invoiceNumber,
              totalAmount: `IDR ${Number(invoice.totalAmount).toLocaleString('id-ID')}`
            }
          });

          this.logger.log(`Sent materai reminder for invoice ${invoice.invoiceNumber}`);
        }
      }

    } catch (error) {
      this.logger.error(`Error processing materai reminders: ${error.message}`, error.stack);
    }
  }

  // Manual trigger for testing
  async runWorkflowChecks(): Promise<WorkflowCheckResultDto> {
    this.logger.log('🔄 Running manual workflow checks...');
    const startTime = Date.now();
    const errors: string[] = [];
    let expiredQuotations = 0;
    let overdueInvoices = 0;
    let materaiReminders = 0;
    let notificationsSent = 0;

    try {
      // Count expired quotations
      const expiredQuotationsResult = await this.prisma.quotation.count({
        where: {
          status: { in: [QuotationStatus.SENT, QuotationStatus.DRAFT] },
          validUntil: { lt: new Date() }
        }
      });
      expiredQuotations = expiredQuotationsResult;

      await this.processExpiredQuotations();
    } catch (error) {
      errors.push(`Quotation processing: ${error.message}`);
    }

    try {
      // Count overdue invoices
      const overdueInvoicesResult = await this.prisma.invoice.count({
        where: {
          status: InvoiceStatus.SENT,
          dueDate: { lt: new Date() }
        }
      });
      overdueInvoices = overdueInvoicesResult;

      await this.processOverdueInvoices();
    } catch (error) {
      errors.push(`Invoice processing: ${error.message}`);
    }

    try {
      // Count materai reminders
      const materaiRemindersResult = await this.prisma.invoice.count({
        where: {
          materaiRequired: true,
          materaiApplied: false,
          status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] }
        }
      });
      materaiReminders = materaiRemindersResult;

      await this.processMateraiReminders();
    } catch (error) {
      errors.push(`Materai processing: ${error.message}`);
    }

    const executionTime = Date.now() - startTime;
    notificationsSent = expiredQuotations + overdueInvoices + materaiReminders;

    this.logger.log('✅ Manual workflow checks completed');

    return {
      expiredQuotations,
      overdueInvoices,
      materaiReminders,
      notificationsSent,
      executionTime,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  async getActiveWorkflows(): Promise<WorkflowSummaryDto[]> {
    try {
      const [activeQuotations, activeInvoices] = await Promise.all([
        // Active quotations (not declined or converted to invoice)
        this.prisma.quotation.findMany({
          where: {
            status: {
              in: [QuotationStatus.DRAFT, QuotationStatus.SENT, QuotationStatus.APPROVED]
            }
          },
          include: {
            client: true,
            invoices: {
              select: { id: true }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }),
        // Active invoices (not paid)
        this.prisma.invoice.findMany({
          where: {
            status: {
              in: [InvoiceStatus.DRAFT, InvoiceStatus.SENT, InvoiceStatus.OVERDUE]
            }
          },
          include: {
            client: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        })
      ]);

      const workflows: WorkflowSummaryDto[] = [];

      // Add quotations that haven't been converted to invoices
      for (const quotation of activeQuotations) {
        if (quotation.invoices.length === 0) {
          const daysRemaining = Math.ceil((new Date(quotation.validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          workflows.push({
            id: quotation.id,
            type: 'quotation',
            number: quotation.quotationNumber,
            clientName: quotation.client?.name || 'Unknown',
            status: quotation.status,
            totalAmount: TransformationUtil.decimalToString(quotation.totalAmount),
            validUntil: TransformationUtil.dateToString(quotation.validUntil),
            createdAt: TransformationUtil.dateToString(quotation.createdAt),
            daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
            isUrgent: daysRemaining <= 3 && daysRemaining > 0,
            priority: daysRemaining <= 1 ? 'HIGH' : daysRemaining <= 3 ? 'MEDIUM' : 'LOW'
          });
        }
      }

      // Add active invoices
      for (const invoice of activeInvoices) {
        const daysRemaining = Math.ceil((new Date(invoice.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        workflows.push({
          id: invoice.id,
          type: 'invoice',
          number: invoice.invoiceNumber,
          clientName: invoice.client?.name || 'Unknown',
          status: invoice.status,
          totalAmount: TransformationUtil.decimalToString(invoice.totalAmount),
          dueDate: TransformationUtil.dateToString(invoice.dueDate),
          createdAt: TransformationUtil.dateToString(invoice.createdAt),
          daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
          isUrgent: daysRemaining <= 3 || invoice.status === InvoiceStatus.OVERDUE,
          priority: invoice.status === InvoiceStatus.OVERDUE || daysRemaining <= 0 ? 'HIGH' : daysRemaining <= 3 ? 'MEDIUM' : 'LOW'
        });
      }

      // Sort by creation date (newest first)
      workflows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return workflows;
    } catch (error) {
      this.logger.error(`Error getting active workflows: ${error.message}`);
      return [];
    }
  }

  async getWorkflowStats(): Promise<WorkflowStatsDto> {
    try {
      const [quotationStats, invoiceStats] = await Promise.all([
        this.prisma.quotation.groupBy({
          by: ['status'],
          _count: true,
          _sum: {
            totalAmount: true
          }
        }),
        this.prisma.invoice.groupBy({
          by: ['status'],
          _count: true,
          _sum: {
            totalAmount: true
          }
        })
      ]);

      const today = new Date();
      const overdueInvoices = await this.prisma.invoice.count({
        where: {
          status: InvoiceStatus.SENT,
          dueDate: { lt: today }
        }
      });

      const expiringQuotations = await this.prisma.quotation.count({
        where: {
          status: {
            in: [QuotationStatus.SENT, QuotationStatus.DRAFT]
          },
          validUntil: {
            gte: today,
            lte: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
          }
        }
      });

      const materaiReminders = await this.prisma.invoice.count({
        where: {
          materaiRequired: true,
          materaiApplied: false,
          status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] }
        }
      });

      // Calculate totals
      const totalQuotationValue = quotationStats.reduce((sum, stat) => sum + Number(stat._sum.totalAmount || 0), 0);
      const totalInvoiceValue = invoiceStats.reduce((sum, stat) => sum + Number(stat._sum.totalAmount || 0), 0);
      const totalActiveWorkflows = quotationStats.reduce((sum, stat) => sum + stat._count, 0) + 
                                   invoiceStats.reduce((sum, stat) => sum + stat._count, 0);
      const highPriorityCount = overdueInvoices + expiringQuotations;

      return {
        quotations: quotationStats.map(stat => ({
          status: stat.status,
          _count: stat._count,
          _sum: {
            totalAmount: TransformationUtil.decimalToString(stat._sum.totalAmount)
          }
        })),
        invoices: invoiceStats.map(stat => ({
          status: stat.status,
          _count: stat._count,
          _sum: {
            totalAmount: TransformationUtil.decimalToString(stat._sum.totalAmount)
          }
        })),
        alerts: {
          overdueInvoices,
          expiringQuotations,
          materaiReminders
        },
        summary: {
          totalActiveWorkflows,
          totalValue: (totalQuotationValue + totalInvoiceValue).toString(),
          highPriorityCount
        }
      };
    } catch (error) {
      this.logger.error(`Error getting workflow stats: ${error.message}`);
      throw error;
    }
  }
}