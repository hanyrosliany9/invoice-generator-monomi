import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "./notifications.service";
import { getErrorMessage } from "../../common/utils/error-handling.util";

const WIB = "Asia/Jakarta";
const WIB_LOCALE_OPTS: Intl.DateTimeFormatOptions = { timeZone: WIB };

/** 24-hour dedup window: skip if a SENT log for this type+entity exists within the last day. */
async function alreadySentToday(
  prisma: PrismaService,
  type: string,
  relatedEntityId: string,
): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await prisma.notificationLog.findFirst({
    where: {
      type,
      relatedEntityId,
      status: "SENT",
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  return existing !== null;
}

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * FIX 2+3a — Overdue invoice reminders.
   * Runs every day at 08:00 WIB.
   * Selects invoices that are SENT or OVERDUE and whose dueDate is in the past.
   * Skips if a SENT log for the same invoice exists within the last 24 h (dedup).
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

        // FIX 2: dedup — skip if already sent today
        if (await alreadySentToday(this.prisma, "INVOICE_OVERDUE", invoice.id)) {
          this.logger.log(
            `sendOverdueReminders: skipping invoice ${invoice.id} — already sent within 24 h`,
          );
          continue;
        }

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
              // FIX 6: WIB timezone
              dueDate: new Date(invoice.dueDate).toLocaleDateString("id-ID", WIB_LOCALE_OPTS),
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
   * FIX 2+3b — Materai reminder.
   * Runs every day at 08:15 WIB.
   * Selects invoices where materaiRequired=true AND materaiApplied=false AND status=SENT.
   * FIX 3: respects SystemSettings.autoMateraiReminder.
   * FIX 2: skips if already sent within 24 h.
   */
  @Cron("15 8 * * *", { timeZone: WIB })
  async sendMateraiReminders(): Promise<void> {
    this.logger.log("⏰ [Cron] sendMateraiReminders starting");

    try {
      // FIX 3: check system-level toggle first
      const systemSettings = await this.prisma.systemSettings.findUnique({
        where: { id: "default" },
        select: { autoMateraiReminder: true },
      });
      if (systemSettings && !systemSettings.autoMateraiReminder) {
        this.logger.log(
          "sendMateraiReminders: skipping — autoMateraiReminder is disabled in SystemSettings",
        );
        return;
      }

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

        // FIX 2: dedup — skip if already sent today
        if (await alreadySentToday(this.prisma, "MATERAI_REMINDER", invoice.id)) {
          this.logger.log(
            `sendMateraiReminders: skipping invoice ${invoice.id} — already sent within 24 h`,
          );
          continue;
        }

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
   * FIX 2+3c — Quotation expiring reminder.
   * Runs every day at 08:30 WIB.
   * Selects quotations in SENT status whose validUntil is within the next 3 days.
   * FIX 2: skips if already sent within 24 h.
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

        // FIX 2: dedup — skip if already sent today
        if (await alreadySentToday(this.prisma, "QUOTATION_EXPIRING", quotation.id)) {
          this.logger.log(
            `sendQuotationExpiringReminders: skipping quotation ${quotation.id} — already sent within 24 h`,
          );
          continue;
        }

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
