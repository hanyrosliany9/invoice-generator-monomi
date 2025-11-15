import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InvoiceCounterService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get next invoice number with thread-safe atomic increment
   * Format: {PREFIX}YYYY/MM/XXXX (e.g., INV-2025/01/0001)
   * Uses invoicePrefix from SystemSettings
   */
  async getNextInvoiceNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Use transaction with row-level lock for thread safety
    const result = await this.prisma.$transaction(async (tx) => {
      // Get invoice prefix from system settings
      const settings = await tx.systemSettings.findUnique({
        where: { id: 'default' },
        select: { invoicePrefix: true },
      });

      const prefix = settings?.invoicePrefix || 'INV-';

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

      // Format: {PREFIX}YYYY/MM/XXXX
      const paddedSequence = counter.sequence.toString().padStart(4, '0');
      const paddedMonth = month.toString().padStart(2, '0');

      return `${prefix}${year}/${paddedMonth}/${paddedSequence}`;
    });

    return result;
  }

  /**
   * Get next quotation number with thread-safe atomic increment
   * Format: {PREFIX}YYYYMM-XXX (e.g., QT-202501-001)
   * Uses quotationPrefix from SystemSettings
   */
  async getNextQuotationNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const result = await this.prisma.$transaction(async (tx) => {
      // Get quotation prefix from system settings
      const settings = await tx.systemSettings.findUnique({
        where: { id: 'default' },
        select: { quotationPrefix: true },
      });

      const prefix = settings?.quotationPrefix || 'QT-';

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

      const paddedSequence = counter.sequence.toString().padStart(3, '0');
      const paddedMonth = month.toString().padStart(2, '0');

      return `${prefix}${year}${paddedMonth}-${paddedSequence}`;
    });

    return result;
  }
}
