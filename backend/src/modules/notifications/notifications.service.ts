import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import {
  NotificationType,
  SendNotificationDto,
} from "./dto/send-notification.dto";
import {
  getErrorMessage,
  isError,
} from "../../common/utils/error-handling.util";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const isDevelopment = this.configService.get("NODE_ENV") === "development";

    if (isDevelopment) {
      // For development, log emails to console instead of sending
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: "unix",
        buffer: true,
      });
      this.logger.log(
        "Email transporter initialized for development (console logging)",
      );
    } else {
      // Production SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: this.configService.get("SMTP_HOST"),
        port: parseInt(this.configService.get("SMTP_PORT") || "587"),
        secure: false, // true for 465, false for other ports
        auth: {
          user: this.configService.get("SMTP_USER"),
          pass: this.configService.get("SMTP_PASSWORD"),
        },
      });
      this.logger.log("Email transporter initialized for production");
    }
  }

  async sendNotification(dto: SendNotificationDto): Promise<void> {
    try {
      const fromEmail =
        this.configService.get("FROM_EMAIL") || "noreply@monomi.finance";

      const mailOptions = {
        from: fromEmail,
        to: dto.to,
        subject: dto.subject,
        html: this.generateEmailContent(dto),
      };

      const isDevelopment =
        this.configService.get("NODE_ENV") === "development";

      if (isDevelopment) {
        // Log email content in development
        this.logger.log(`📧 EMAIL NOTIFICATION (Development Mode)`);
        this.logger.log(`From: ${mailOptions.from}`);
        this.logger.log(`To: ${mailOptions.to}`);
        this.logger.log(`Subject: ${mailOptions.subject}`);
        this.logger.log(`Type: ${dto.type}`);
        this.logger.log(`Content: ${mailOptions.html}`);
        this.logger.log(`---`);
      } else {
        // Send actual email in production
        await this.transporter.sendMail(mailOptions);
        this.logger.log(`Email sent successfully to ${dto.to} for ${dto.type}`);
      }

      // Log notification in database
      await this.logNotification(dto, "SENT");
    } catch (error) {
      this.logger.error(
        `Failed to send notification: ${getErrorMessage(error)}`,
        isError(error) ? error.stack : undefined,
      );
      await this.logNotification(dto, "FAILED", getErrorMessage(error));
      throw error;
    }
  }

  private generateEmailContent(dto: SendNotificationDto): string {
    const { type, data } = dto;

    switch (type) {
      case NotificationType.QUOTATION_STATUS_CHANGE:
        return this.generateQuotationStatusChangeEmail(data);
      case NotificationType.INVOICE_GENERATED:
        return this.generateInvoiceGeneratedEmail(data);
      case NotificationType.QUOTATION_EXPIRING:
        return this.generateQuotationExpiringEmail(data);
      case NotificationType.INVOICE_OVERDUE:
        return this.generateInvoiceOverdueEmail(data);
      case NotificationType.MATERAI_REMINDER:
        return this.generateMateraiReminderEmail(data);
      case NotificationType.PAYMENT_RECEIVED:
        return this.generatePaymentReceivedEmail(data);
      case NotificationType.DECK_INVITE:
        return this.generateDeckInviteEmail(data);
      default:
        return `<p>${dto.subject}</p>`;
    }
  }

  private generateQuotationStatusChangeEmail(data: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Status Quotation Diperbarui</h2>
        <p>Yth. Bapak/Ibu,</p>
        <p>Status quotation <strong>${data.quotationNumber}</strong> telah diperbarui menjadi <strong>${data.newStatus}</strong>.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
          <p><strong>Detail Quotation:</strong></p>
          <ul>
            <li>Nomor: ${data.quotationNumber}</li>
            <li>Klien: ${data.clientName}</li>
            <li>Proyek: ${data.projectName}</li>
            <li>Total: ${data.totalAmount}</li>
            <li>Status: ${data.newStatus}</li>
          </ul>
        </div>
        <p>Terima kasih atas perhatian Anda.</p>
        <p>Salam,<br>Tim Monomi Finance</p>
      </div>
    `;
  }

  private generateInvoiceGeneratedEmail(data: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Invoice Telah Dibuat</h2>
        <p>Yth. Bapak/Ibu,</p>
        <p>Invoice <strong>${data.invoiceNumber}</strong> telah berhasil dibuat dari quotation yang telah disetujui.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
          <p><strong>Detail Invoice:</strong></p>
          <ul>
            <li>Nomor Invoice: ${data.invoiceNumber}</li>
            <li>Dari Quotation: ${data.quotationNumber}</li>
            <li>Klien: ${data.clientName}</li>
            <li>Proyek: ${data.projectName}</li>
            <li>Total: ${data.totalAmount}</li>
            <li>Jatuh Tempo: ${data.dueDate}</li>
          </ul>
        </div>
        ${data.materaiRequired ? '<p style="color: #ffc107; font-weight: bold;">⚠️ Invoice ini memerlukan materai IDR 10.000</p>' : ""}
        <p>Silakan lakukan pembayaran sesuai dengan tanggal jatuh tempo.</p>
        <p>Terima kasih atas kerjasamanya.</p>
        <p>Salam,<br>Tim Monomi Finance</p>
      </div>
    `;
  }

  private generateQuotationExpiringEmail(data: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ffc107;">Quotation Akan Berakhir</h2>
        <p>Yth. Bapak/Ibu,</p>
        <p>Quotation <strong>${data.quotationNumber}</strong> akan berakhir dalam <strong>${data.daysRemaining} hari</strong>.</p>
        <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
          <p><strong>Detail Quotation:</strong></p>
          <ul>
            <li>Nomor: ${data.quotationNumber}</li>
            <li>Klien: ${data.clientName}</li>
            <li>Berlaku Hingga: ${data.validUntil}</li>
            <li>Total: ${data.totalAmount}</li>
          </ul>
        </div>
        <p>Mohon segera melakukan tindak lanjut jika Anda masih berminat dengan penawaran ini.</p>
        <p>Terima kasih atas perhatian Anda.</p>
        <p>Salam,<br>Tim Monomi Finance</p>
      </div>
    `;
  }

  private generateInvoiceOverdueEmail(data: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Invoice Jatuh Tempo</h2>
        <p>Yth. Bapak/Ibu,</p>
        <p>Invoice <strong>${data.invoiceNumber}</strong> telah melewati tanggal jatuh tempo.</p>
        <div style="background-color: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
          <p><strong>Detail Invoice:</strong></p>
          <ul>
            <li>Nomor: ${data.invoiceNumber}</li>
            <li>Klien: ${data.clientName}</li>
            <li>Tanggal Jatuh Tempo: ${data.dueDate}</li>
            <li>Jumlah Terlambat: ${data.daysOverdue} hari</li>
            <li>Total: ${data.totalAmount}</li>
          </ul>
        </div>
        <p>Mohon segera melakukan pembayaran untuk menghindari denda keterlambatan.</p>
        <p>Terima kasih atas perhatian Anda.</p>
        <p>Salam,<br>Tim Monomi Finance</p>
      </div>
    `;
  }

  private generateMateraiReminderEmail(data: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #17a2b8;">Pengingat Materai</h2>
        <p>Yth. Bapak/Ibu,</p>
        <p>Invoice <strong>${data.invoiceNumber}</strong> dengan nilai di atas IDR 5.000.000 memerlukan materai.</p>
        <div style="background-color: #d1ecf1; padding: 15px; border-left: 4px solid #17a2b8; margin: 20px 0;">
          <p><strong>Detail Invoice:</strong></p>
          <ul>
            <li>Nomor: ${data.invoiceNumber}</li>
            <li>Total: ${data.totalAmount}</li>
            <li>Materai yang Diperlukan: IDR 10.000</li>
          </ul>
        </div>
        <p>Silakan tempelkan materai IDR 10.000 pada dokumen invoice sebelum diserahkan.</p>
        <p>Terima kasih atas perhatian Anda.</p>
        <p>Salam,<br>Tim Monomi Finance</p>
      </div>
    `;
  }

  private generatePaymentReceivedEmail(data: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Pembayaran Diterima</h2>
        <p>Yth. Bapak/Ibu,</p>
        <p>Pembayaran untuk invoice <strong>${data.invoiceNumber}</strong> telah kami terima dan dikonfirmasi.</p>
        <div style="background-color: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
          <p><strong>Detail Pembayaran:</strong></p>
          <ul>
            <li>Nomor Invoice: ${data.invoiceNumber}</li>
            <li>Klien: ${data.clientName}</li>
            <li>Jumlah Dibayar: ${data.amountPaid}</li>
            <li>Metode Pembayaran: ${data.paymentMethod || '-'}</li>
            <li>Tanggal Pembayaran: ${data.paymentDate}</li>
            ${data.transactionRef ? `<li>Referensi Transaksi: ${data.transactionRef}</li>` : ''}
          </ul>
        </div>
        <p>Terima kasih atas pembayaran Anda yang tepat waktu.</p>
        <p>Salam,<br>Tim Monomi Finance</p>
      </div>
    `;
  }

  private generateDeckInviteEmail(data: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6f42c1;">Undangan Kolaborasi Deck</h2>
        <p>Yth. ${data.guestName || 'Tamu'},</p>
        <p><strong>${data.inviterName}</strong> mengundang Anda untuk berkolaborasi pada deck presentasi <strong>${data.deckTitle}</strong>.</p>
        <div style="background-color: #f3eeff; padding: 15px; border-left: 4px solid #6f42c1; margin: 20px 0;">
          <p><strong>Detail Undangan:</strong></p>
          <ul>
            <li>Deck: ${data.deckTitle}</li>
            <li>Peran: ${data.role}</li>
            ${data.expiresAt ? `<li>Berlaku Hingga: ${data.expiresAt}</li>` : ''}
          </ul>
        </div>
        <p>Klik tautan berikut untuk menerima undangan:</p>
        <p><a href="${data.inviteLink}" style="background-color:#6f42c1;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">Terima Undangan</a></p>
        <p style="font-size:12px;color:#888;">Atau salin tautan: ${data.inviteLink}</p>
        <p>Terima kasih.</p>
        <p>Salam,<br>Tim Monomi</p>
      </div>
    `;
  }

  private async logNotification(
    dto: SendNotificationDto,
    status: "SENT" | "FAILED",
    errorMessage?: string,
  ): Promise<void> {
    try {
      await this.prisma.notificationLog.create({
        data: {
          type: dto.type,
          recipient: dto.to,
          subject: dto.subject,
          status: status as any,
          error: errorMessage ?? null,
          relatedEntityType: dto.entityType ?? null,
          relatedEntityId: dto.entityId ?? null,
        },
      });
    } catch (error) {
      // Never let logging failure bubble up — just warn
      this.logger.error(
        `Failed to persist notification log: ${getErrorMessage(error)}`,
      );
    }
  }

  // Workflow-specific notification methods
  async sendQuotationStatusUpdate(
    quotationId: string,
    newStatus: string,
  ): Promise<void> {
    try {
      const quotation = await this.prisma.quotation.findUnique({
        where: { id: quotationId },
        include: { client: true, project: true },
      });

      if (!quotation || !quotation.client?.email) {
        this.logger.warn(
          `Cannot send notification: quotation ${quotationId} or client email not found`,
        );
        return;
      }

      const statusMap: Record<string, string> = {
        DRAFT: "Draft",
        SENT: "Terkirim",
        APPROVED: "Disetujui",
        DECLINED: "Ditolak",
        REVISED: "Revisi",
      };

      await this.sendNotification({
        type: NotificationType.QUOTATION_STATUS_CHANGE,
        to: quotation.client.email,
        subject: `Status Quotation ${quotation.quotationNumber} - ${statusMap[newStatus] || newStatus}`,
        entityType: "quotation",
        entityId: quotationId,
        data: {
          quotationNumber: quotation.quotationNumber,
          newStatus: statusMap[newStatus] || newStatus,
          clientName: quotation.client.name,
          projectName: quotation.project?.description || "",
          totalAmount: `IDR ${Number(quotation.totalAmount).toLocaleString("id-ID")}`,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send quotation status update: ${getErrorMessage(error)}`,
      );
    }
  }

  async sendInvoiceGenerated(
    invoiceId: string,
    quotationId: string,
  ): Promise<void> {
    try {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { client: true, project: true },
      });

      const quotation = await this.prisma.quotation.findUnique({
        where: { id: quotationId },
      });

      if (!invoice || !invoice.client?.email) {
        this.logger.warn(
          `Cannot send notification: invoice ${invoiceId} or client email not found`,
        );
        return;
      }

      await this.sendNotification({
        type: NotificationType.INVOICE_GENERATED,
        to: invoice.client.email,
        subject: `Invoice ${invoice.invoiceNumber} Telah Dibuat`,
        entityType: "invoice",
        entityId: invoiceId,
        data: {
          invoiceNumber: invoice.invoiceNumber,
          quotationNumber: quotation?.quotationNumber || "",
          clientName: invoice.client.name,
          projectName: invoice.project?.description || "",
          totalAmount: `IDR ${Number(invoice.totalAmount).toLocaleString("id-ID")}`,
          dueDate: new Date(invoice.dueDate).toLocaleDateString("id-ID"),
          materaiRequired: invoice.materaiRequired,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send invoice generated notification: ${getErrorMessage(error)}`,
      );
    }
  }

  async sendQuotationExpiring(
    quotationId: string,
    daysRemaining: number,
  ): Promise<void> {
    try {
      const quotation = await this.prisma.quotation.findUnique({
        where: { id: quotationId },
        include: { client: true },
      });

      if (!quotation || !quotation.client?.email) {
        return;
      }

      await this.sendNotification({
        type: NotificationType.QUOTATION_EXPIRING,
        to: quotation.client.email,
        subject: `Quotation ${quotation.quotationNumber} Akan Berakhir`,
        entityType: "quotation",
        entityId: quotationId,
        data: {
          quotationNumber: quotation.quotationNumber,
          clientName: quotation.client.name,
          daysRemaining,
          validUntil: new Date(quotation.validUntil).toLocaleDateString(
            "id-ID",
          ),
          totalAmount: `IDR ${Number(quotation.totalAmount).toLocaleString("id-ID")}`,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send quotation expiring notification: ${getErrorMessage(error)}`,
      );
    }
  }

  async getNotificationTemplates() {
    return {
      templates: [
        {
          type: "QUOTATION_STATUS_CHANGE",
          name: "Perubahan Status Quotation",
          description: "Dikirim ketika status quotation berubah",
          variables: [
            "quotationNumber",
            "newStatus",
            "clientName",
            "projectName",
            "totalAmount",
          ],
        },
        {
          type: "INVOICE_GENERATED",
          name: "Invoice Dibuat",
          description: "Dikirim ketika invoice dibuat dari quotation",
          variables: [
            "invoiceNumber",
            "quotationNumber",
            "clientName",
            "projectName",
            "totalAmount",
            "dueDate",
            "materaiRequired",
          ],
        },
        {
          type: "QUOTATION_EXPIRING",
          name: "Quotation Akan Berakhir",
          description: "Dikirim ketika quotation akan berakhir",
          variables: [
            "quotationNumber",
            "clientName",
            "daysRemaining",
            "validUntil",
            "totalAmount",
          ],
        },
        {
          type: "INVOICE_OVERDUE",
          name: "Invoice Jatuh Tempo",
          description: "Dikirim ketika invoice melewati tanggal jatuh tempo",
          variables: [
            "invoiceNumber",
            "clientName",
            "dueDate",
            "daysOverdue",
            "totalAmount",
          ],
        },
        {
          type: "MATERAI_REMINDER",
          name: "Pengingat Materai",
          description: "Dikirim untuk invoice yang memerlukan materai",
          variables: ["invoiceNumber", "totalAmount"],
        },
      ],
    };
  }

  async getNotificationStats() {
    const [statusCounts, typeCounts, recentNotifications] = await Promise.all([
      this.prisma.notificationLog.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      this.prisma.notificationLog.groupBy({
        by: ["type"],
        _count: { id: true },
      }),
      this.prisma.notificationLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          type: true,
          recipient: true,
          subject: true,
          status: true,
          relatedEntityType: true,
          relatedEntityId: true,
          createdAt: true,
        },
      }),
    ]);

    const totalSent =
      statusCounts.find((s) => s.status === "SENT")?._count.id ?? 0;
    const totalFailed =
      statusCounts.find((s) => s.status === "FAILED")?._count.id ?? 0;

    const byType: Record<string, number> = {};
    for (const row of typeCounts) {
      byType[row.type] = row._count.id;
    }

    return {
      totalSent,
      totalFailed,
      byType,
      recentNotifications,
    };
  }

  // ── New workflow helpers ─────────────────────────────────────────────────

  async sendPaymentReceived(
    invoiceId: string,
    paymentId: string,
  ): Promise<void> {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          invoice: {
            include: {
              client: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      if (!payment || !payment.invoice?.client?.email) {
        this.logger.warn(
          `sendPaymentReceived: invoice/client email not found for payment ${paymentId}`,
        );
        return;
      }

      const invoice = payment.invoice;
      await this.sendNotification({
        type: NotificationType.PAYMENT_RECEIVED,
        to: invoice.client.email!,
        subject: `Pembayaran Diterima untuk Invoice ${invoice.invoiceNumber}`,
        entityType: "payment",
        entityId: paymentId,
        data: {
          invoiceNumber: invoice.invoiceNumber,
          clientName: invoice.client.name,
          amountPaid: `IDR ${Number(payment.amount).toLocaleString("id-ID")}`,
          paymentMethod: payment.paymentMethod,
          paymentDate: new Date(payment.paymentDate).toLocaleDateString("id-ID"),
          transactionRef: payment.transactionRef,
        },
      });
    } catch (error) {
      this.logger.error(
        `sendPaymentReceived failed: ${getErrorMessage(error)}`,
        isError(error) ? error.stack : undefined,
      );
    }
  }

  async sendDeckInvite(
    collaboratorId: string,
    inviteLink: string,
  ): Promise<void> {
    try {
      const collab = await this.prisma.deckCollaborator.findUnique({
        where: { id: collaboratorId },
        include: {
          deck: { select: { id: true, title: true } },
          inviter: { select: { id: true, name: true } },
        },
      });

      if (!collab || !collab.guestEmail) {
        this.logger.warn(
          `sendDeckInvite: no guestEmail on collaborator ${collaboratorId}`,
        );
        return;
      }

      await this.sendNotification({
        type: NotificationType.DECK_INVITE,
        to: collab.guestEmail,
        subject: `Undangan Kolaborasi: ${collab.deck.title}`,
        entityType: "deck",
        entityId: collab.deckId,
        data: {
          deckTitle: collab.deck.title,
          guestName: collab.guestName,
          inviterName: collab.inviter.name,
          role: collab.role,
          inviteLink,
          expiresAt: collab.expiresAt
            ? new Date(collab.expiresAt).toLocaleDateString("id-ID")
            : null,
        },
      });
    } catch (error) {
      this.logger.error(
        `sendDeckInvite failed: ${getErrorMessage(error)}`,
        isError(error) ? error.stack : undefined,
      );
    }
  }
}
