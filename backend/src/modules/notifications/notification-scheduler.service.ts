import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "./notifications.service";
import { getErrorMessage } from "../../common/utils/error-handling.util";

const WIB = "Asia/Jakarta";

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * FIX 3a — Overdue invoice reminders.
   * Runs every day at 08:00 WIB.
   * Selects invoices that are SENT or OVERDUE and whose dueDate is in the past.
   * One reminder per day per invoice is acceptable (no lastReminderAt guard needed).
   */
  @Cron("0 8 * * *", { timeZone: WIB })
  async sendOverdueReminders(): Promise<void> {
    this.logger.log("⏰ [Cron] sendOverdueReminders starting");
    const now = new Date();

    try {
      const overdueInvoices = await this.prisma.invoice.findMany({
        where: {
          status: { in: ["SENT", "OVERDUE"] },
          dueDate: { lt: now },
        },
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
      });

      this.logger.log(
        `sendOverdueReminders: found ${overdueInvoices.length} overdue invoices`,
      );

      for (const invoice of overdueInvoices) {
        if (!invoice.client?.email) continue;
        try {
          const daysOverdue = Math.floor(
            (now.getTime() - new Date(invoice.dueDate).getTime()) /
              (1000 * 60 * 60 * 24),
          );

          await this.notificationsService.sendNotification({
            type: "INVOICE_OVERDUE" as any,
            to: invoice.client.email,
            subject: `Pengingat: Invoice ${invoice.invoiceNumber} Telah Jatuh Tempo`,
            entityType: "invoice",
            entityId: invoice.id,
            data: {
              invoiceNumber: invoice.invoiceNumber,
              clientName: invoice.client.name,
              dueDate: new Date(invoice.dueDate).toLocaleDateString("id-ID"),
              daysOverdue,
              totalAmount: `IDR ${Number(invoice.totalAmount).toLocaleString("id-ID")}`,
            },
          });
        } catch (err) {
          this.logger.error(
            `sendOverdueReminders: failed for invoice ${invoice.id}: ${getErrorMessage(err)}`,
          );
        }
      }

      this.logger.log("⏰ [Cron] sendOverdueReminders done");
    } catch (err) {
      this.logger.error(
        `sendOverdueReminders cron error: ${getErrorMessage(err)}`,
      );
    }
  }

  /**
   * FIX 3b — Materai reminder.
   * Runs every day at 08:15 WIB.
   * Selects invoices where materaiRequired=true AND materaiApplied=false AND status=SENT.
   */
  @Cron("15 8 * * *", { timeZone: WIB })
  async sendMateraiReminders(): Promise<void> {
    this.logger.log("⏰ [Cron] sendMateraiReminders starting");

    try {
      const invoices = await this.prisma.invoice.findMany({
        where: {
          materaiRequired: true,
          materaiApplied: false,
          status: "SENT",
        },
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
      });

      this.logger.log(
        `sendMateraiReminders: found ${invoices.length} invoices needing materai`,
      );

      for (const invoice of invoices) {
        if (!invoice.client?.email) continue;
        try {
          await this.notificationsService.sendNotification({
            type: "MATERAI_REMINDER" as any,
            to: invoice.client.email,
            subject: `Pengingat Materai untuk Invoice ${invoice.invoiceNumber}`,
            entityType: "invoice",
            entityId: invoice.id,
            data: {
              invoiceNumber: invoice.invoiceNumber,
              totalAmount: `IDR ${Number(invoice.totalAmount).toLocaleString("id-ID")}`,
            },
          });
        } catch (err) {
          this.logger.error(
            `sendMateraiReminders: failed for invoice ${invoice.id}: ${getErrorMessage(err)}`,
          );
        }
      }

      this.logger.log("⏰ [Cron] sendMateraiReminders done");
    } catch (err) {
      this.logger.error(
        `sendMateraiReminders cron error: ${getErrorMessage(err)}`,
      );
    }
  }

  /**
   * FIX 3c — Quotation expiring reminder.
   * Runs every day at 08:30 WIB.
   * Selects quotations in SENT status whose validUntil is within the next 3 days.
   */
  @Cron("30 8 * * *", { timeZone: WIB })
  async sendQuotationExpiringReminders(): Promise<void> {
    this.logger.log("⏰ [Cron] sendQuotationExpiringReminders starting");
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    try {
      const quotations = await this.prisma.quotation.findMany({
        where: {
          status: "SENT",
          validUntil: {
            gte: now,
            lte: in3Days,
          },
        },
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
      });

      this.logger.log(
        `sendQuotationExpiringReminders: found ${quotations.length} expiring quotations`,
      );

      for (const quotation of quotations) {
        if (!quotation.client?.email) continue;
        try {
          const daysRemaining = Math.ceil(
            (new Date(quotation.validUntil).getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          await this.notificationsService.sendQuotationExpiring(
            quotation.id,
            daysRemaining,
          );
        } catch (err) {
          this.logger.error(
            `sendQuotationExpiringReminders: failed for quotation ${quotation.id}: ${getErrorMessage(err)}`,
          );
        }
      }

      this.logger.log("⏰ [Cron] sendQuotationExpiringReminders done");
    } catch (err) {
      this.logger.error(
        `sendQuotationExpiringReminders cron error: ${getErrorMessage(err)}`,
      );
    }
  }
}
