import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExchangeRateDto } from '../dto/create-exchange-rate.dto';
import { UpdateExchangeRateDto } from '../dto/update-exchange-rate.dto';
import { Currency } from '@prisma/client';

@Injectable()
export class ExchangeRateService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get current active exchange rate
   */
  async getCurrentRate(
    fromCurrency: Currency,
    toCurrency: Currency = Currency.IDR,
  ) {
    if (fromCurrency === toCurrency) {
      // Same currency, rate is 1
      return {
        fromCurrency,
        toCurrency,
        rate: 1,
        effectiveDate: new Date(),
        isActive: true,
      };
    }

    const rate = await this.prisma.exchangeRate.findFirst({
      where: {
        fromCurrency,
        toCurrency,
        isActive: true,
        effectiveDate: { lte: new Date() },
        OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    });

    if (!rate) {
      throw new NotFoundException(
        `No active exchange rate found for ${fromCurrency} to ${toCurrency}`,
      );
    }

    return rate;
  }

  /**
   * Convert amount to IDR
   */
  async convertToIDR(amount: number, fromCurrency: Currency): Promise<number> {
    if (fromCurrency === Currency.IDR) {
      return amount;
    }

    const rate = await this.getCurrentRate(fromCurrency, Currency.IDR);
    return amount * Number(rate.rate);
  }

  /**
   * Convert amount between currencies
   */
  async convertCurrency(
    amount: number,
    fromCurrency: Currency,
    toCurrency: Currency,
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    // Always convert through IDR
    if (fromCurrency !== Currency.IDR && toCurrency !== Currency.IDR) {
      // Convert from -> IDR -> to
      const idrAmount = await this.convertToIDR(amount, fromCurrency);
      const toRate = await this.getCurrentRate(toCurrency, Currency.IDR);
      return idrAmount / Number(toRate.rate);
    }

    const rate = await this.getCurrentRate(fromCurrency, toCurrency);
    return amount * Number(rate.rate);
  }

  /**
   * Create new exchange rate
   */
  async createExchangeRate(createDto: CreateExchangeRateDto) {
    // Validate: cannot create rate for same currency
    if (createDto.fromCurrency === createDto.toCurrency) {
      throw new BadRequestException(
        'Cannot create exchange rate for the same currency',
      );
    }

    // Check if a rate already exists for this date
    const existingRate = await this.prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: createDto.fromCurrency,
        toCurrency: createDto.toCurrency || Currency.IDR,
        effectiveDate: createDto.effectiveDate,
      },
    });

    if (existingRate) {
      throw new BadRequestException(
        `Exchange rate for ${createDto.fromCurrency} to ${createDto.toCurrency || Currency.IDR} already exists for ${createDto.effectiveDate.toISOString().split('T')[0]}`,
      );
    }

    // Deactivate previous rates if this is the new active rate
    if (createDto.isActive) {
      await this.prisma.exchangeRate.updateMany({
        where: {
          fromCurrency: createDto.fromCurrency,
          toCurrency: createDto.toCurrency || Currency.IDR,
          isActive: true,
          effectiveDate: { lt: createDto.effectiveDate },
        },
        data: {
          isActive: false,
          expiryDate: createDto.effectiveDate,
        },
      });
    }

    return this.prisma.exchangeRate.create({
      data: {
        fromCurrency: createDto.fromCurrency,
        toCurrency: createDto.toCurrency || Currency.IDR,
        rate: createDto.rate,
        effectiveDate: createDto.effectiveDate,
        expiryDate: createDto.expiryDate,
        source: createDto.source,
        isAutomatic: createDto.isAutomatic || false,
        isActive: createDto.isActive !== undefined ? createDto.isActive : true,
        createdBy: createDto.createdBy,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get all exchange rates with filters
   */
  async getExchangeRates(filters?: {
    fromCurrency?: Currency;
    toCurrency?: Currency;
    isActive?: boolean;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters?.fromCurrency) where.fromCurrency = filters.fromCurrency;
    if (filters?.toCurrency) where.toCurrency = filters.toCurrency;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    if (filters?.startDate || filters?.endDate) {
      where.effectiveDate = {};
      if (filters.startDate) where.effectiveDate.gte = filters.startDate;
      if (filters.endDate) where.effectiveDate.lte = filters.endDate;
    }

    return this.prisma.exchangeRate.findMany({
      where,
      orderBy: [{ fromCurrency: 'asc' }, { effectiveDate: 'desc' }],
    });
  }

  /**
   * Get exchange rate by ID
   */
  async getExchangeRate(id: string) {
    const rate = await this.prisma.exchangeRate.findUnique({
      where: { id },
    });

    if (!rate) {
      throw new NotFoundException(`Exchange rate with ID ${id} not found`);
    }

    return rate;
  }

  /**
   * Update exchange rate
   */
  async updateExchangeRate(id: string, updateDto: UpdateExchangeRateDto) {
    const existingRate = await this.getExchangeRate(id);

    // If activating this rate, deactivate others
    if (updateDto.isActive && !existingRate.isActive) {
      await this.prisma.exchangeRate.updateMany({
        where: {
          fromCurrency: existingRate.fromCurrency,
          toCurrency: existingRate.toCurrency,
          isActive: true,
          id: { not: id },
        },
        data: {
          isActive: false,
        },
      });
    }

    return this.prisma.exchangeRate.update({
      where: { id },
      data: {
        rate: updateDto.rate,
        effectiveDate: updateDto.effectiveDate,
        expiryDate: updateDto.expiryDate,
        source: updateDto.source,
        isAutomatic: updateDto.isAutomatic,
        isActive: updateDto.isActive,
        updatedAt: new Date(),
        updatedBy: updateDto.updatedBy,
      },
    });
  }

  /**
   * Delete exchange rate
   */
  async deleteExchangeRate(id: string) {
    await this.getExchangeRate(id); // Verify exists

    return this.prisma.exchangeRate.delete({
      where: { id },
    });
  }

  /**
   * Get exchange rate history for a currency pair
   */
  async getExchangeRateHistory(
    fromCurrency: Currency,
    toCurrency: Currency = Currency.IDR,
    limit: number = 30,
  ) {
    return this.prisma.exchangeRate.findMany({
      where: {
        fromCurrency,
        toCurrency,
      },
      orderBy: {
        effectiveDate: 'desc',
      },
      take: limit,
    });
  }
}
