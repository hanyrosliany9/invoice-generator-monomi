import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { RevenueRecognitionService } from '../../accounting/services/revenue-recognition.service';
import { InvoiceStatus, PaymentStatus } from '@prisma/client';

/**
 * Invoice Payment Listener
 *
 * Automatically triggers revenue recognition when invoices are paid.
 * Listens for invoice payment events and processes revenue recognition
 * according to PSAK 72 accounting standards.
 *
 * Events handled:
 * - invoice.paid: Triggered when invoice reaches PAID_OFF status
 * - invoice.payment.confirmed: Triggered when payment is confirmed
 */
@Injectable()
export class InvoicePaymentListener {
  private readonly logger = new Logger(InvoicePaymentListener.name);

  constructor(
    private prisma: PrismaService,
    private revenueRecognitionService: RevenueRecognitionService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Handle invoice paid event
   *
   * Triggered when an invoice is marked as PAID_OFF.
   * Automatically recognizes revenue for linked milestones.
   *
   * @param event Invoice paid event with invoiceId
   */
  @OnEvent('invoice.paid')
  async handleInvoicePaid(event: { invoiceId: string; userId?: string }) {
    try {
      this.logger.log(
        `Processing revenue recognition for paid invoice: ${event.invoiceId}`,
      );

      const invoice = await this.prisma.invoice.findUnique({
        where: { id: event.invoiceId },
        include: {
          paymentMilestone: true,
          projectMilestone: true,
          payments: {
            where: { status: PaymentStatus.CONFIRMED },
          },
        },
      });

      if (!invoice) {
        this.logger.warn(`Invoice not found: ${event.invoiceId}`);
        return;
      }

      // Only process revenue recognition if invoice is paid
      if (invoice.status !== InvoiceStatus.PAID_OFF) {
        this.logger.debug(
          `Invoice ${event.invoiceId} not in PAID_OFF status, skipping revenue recognition`,
        );
        return;
      }

      // Check if invoice has linked payment milestone
      if (invoice.paymentMilestone) {
        this.logger.log(
          `Invoice ${event.invoiceId} is linked to payment milestone ${invoice.paymentMilestoneId}`,
        );

        // If also linked to project milestone, recognize revenue
        if (invoice.projectMilestone) {
          await this.recognizeRevenueFromInvoicePayment(event.invoiceId, event.userId);
        }
      }

      // Emit event that revenue recognition is complete
      this.eventEmitter.emit('invoice.revenue-recognized', {
        invoiceId: event.invoiceId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `Error processing invoice payment for ${event.invoiceId}:`,
        error,
      );
      // Don't rethrow - log and continue to prevent blocking other operations
    }
  }

  /**
   * Handle payment confirmation event
   *
   * Triggered when a payment is confirmed (status: CONFIRMED).
   * Checks if invoice is now fully paid and triggers revenue recognition.
   *
   * @param event Payment confirmed event with invoiceId and amount
   */
  @OnEvent('invoice.payment.confirmed')
  async handlePaymentConfirmed(event: {
    invoiceId: string;
    paymentId: string;
    amount: number;
    userId?: string;
  }) {
    try {
      this.logger.log(
        `Payment confirmed for invoice: ${event.invoiceId}, amount: ${event.amount}`,
      );

      const invoice = await this.prisma.invoice.findUnique({
        where: { id: event.invoiceId },
        include: {
          payments: {
            where: { status: PaymentStatus.CONFIRMED },
          },
        },
      });

      if (!invoice) {
        this.logger.warn(`Invoice not found: ${event.invoiceId}`);
        return;
      }

      // Calculate total paid amount
      const totalPaid = invoice.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const invoiceTotal = Number(invoice.totalAmount);

      this.logger.debug(
        `Invoice ${event.invoiceId} - Total paid: ${totalPaid}, Invoice total: ${invoiceTotal}`,
      );

      // If invoice is now fully paid, emit paid event
      if (totalPaid >= invoiceTotal) {
        this.logger.log(
          `Invoice ${event.invoiceId} is fully paid, emitting invoice.paid event`,
        );
        this.eventEmitter.emit('invoice.paid', {
          invoiceId: event.invoiceId,
          userId: event.userId,
        });
      }
    } catch (error) {
      this.logger.error(
        `Error processing payment confirmation for ${event.invoiceId}:`,
        error,
      );
    }
  }

  /**
   * Recognize revenue from invoice payment
   *
   * Private method that handles the actual revenue recognition logic.
   * Links invoice payment to project milestone and recognizes revenue.
   *
   * @param invoiceId ID of the paid invoice
   * @param userId ID of the user triggering the recognition
   */
  private async recognizeRevenueFromInvoicePayment(
    invoiceId: string,
    userId?: string,
  ): Promise<void> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        projectMilestone: true,
      },
    });

    if (!invoice || !invoice.projectMilestone) {
      this.logger.debug(
        `Invoice ${invoiceId} has no linked project milestone, skipping revenue recognition`,
      );
      return;
    }

    try {
      // Recognize revenue for the project milestone
      this.logger.log(
        `Recognizing revenue for milestone ${invoice.projectMilestoneId} from invoice ${invoiceId}`,
      );

      // Assume milestone is 100% complete when invoice is paid
      // In real scenarios, you might check actual completion percentage
      await this.revenueRecognitionService.recognizeMilestoneRevenue({
        milestoneId: invoice.projectMilestoneId,
        completionPercentage: 100,
        recognitionDate: new Date(),
        userId: userId || 'system',
      });

      this.logger.log(
        `Revenue recognized successfully for milestone ${invoice.projectMilestoneId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error recognizing revenue for milestone ${invoice.projectMilestoneId}:`,
        error,
      );
      throw error;
    }
  }
}
