import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InvoiceCounterService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get next invoice number with thread-safe atomic increment
   * Format: INV/YYYY/MM/XXXX
   */
  async getNextInvoiceNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Use transaction with row-level lock for thread safety
    const result = await this.prisma.$transaction(async (tx) => {
      // Get or create counter with exclusive lock
      const counter = await tx.invoiceCounter.upsert({
        where: {
          year_month: { year, month },
        },
        create: {
          year,
          month,
          sequence: 1,
        },
        update: {
          sequence: { increment: 1 },
        },
      });

      // Format: INV/YYYY/MM/XXXX
      const paddedSequence = counter.sequence.toString().padStart(4, '0');
      const paddedMonth = month.toString().padStart(2, '0');

      return `INV/${year}/${paddedMonth}/${paddedSequence}`;
    });

    return result;
  }

  /**
   * Get next quotation number with thread-safe atomic increment
   * Format: QUO/YYYY/MM/XXXX
   */
  async getNextQuotationNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const result = await this.prisma.$transaction(async (tx) => {
      const counter = await tx.quotationCounter.upsert({
        where: {
          year_month: { year, month },
        },
        create: {
          year,
          month,
          sequence: 1,
        },
        update: {
          sequence: { increment: 1 },
        },
      });

      const paddedSequence = counter.sequence.toString().padStart(4, '0');
      const paddedMonth = month.toString().padStart(2, '0');

      return `QUO/${year}/${paddedMonth}/${paddedSequence}`;
    });

    return result;
  }
}
