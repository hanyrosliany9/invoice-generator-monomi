import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuotationsService } from '../quotations/quotations.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, QuotationStatus } from '@prisma/client';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prismaService: PrismaService;
  let quotationsService: QuotationsService;

  const mockPrismaService = {
    invoice: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  const mockQuotationsService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: QuotationsService,
          useValue: mockQuotationsService,
        },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
    prismaService = module.get<PrismaService>(PrismaService);
    quotationsService = module.get<QuotationsService>(QuotationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create invoice with materai calculation', async () => {
      const createInvoiceDto = {
        clientId: 'client-1',
        projectId: 'project-1',
        amountPerProject: 75000000,
        totalAmount: 75000000,
        dueDate: new Date('2025-02-09').toISOString(),
        paymentInfo: 'Bank details',
        terms: 'Payment terms',
      };

      const expectedInvoice = {
        id: 'invoice-1',
        invoiceNumber: 'INV-202501-001',
        totalAmount: 75000000,
        materaiRequired: true,
        materaiApplied: false,
        status: InvoiceStatus.DRAFT,
        ...createInvoiceDto,
      };

      mockPrismaService.invoice.create.mockResolvedValue(expectedInvoice);

      const result = await service.create(createInvoiceDto, 'user-id');

      expect(result).toEqual(expectedInvoice);
      expect(mockPrismaService.invoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          materaiRequired: true,
          createdBy: 'user-id',
        }),
        include: expect.any(Object),
      });
    });

    it('should not require materai for amounts under 5 million', async () => {
      const createInvoiceDto = {
        clientId: 'client-1',
        projectId: 'project-1',
        amountPerProject: 3000000,
        totalAmount: 3000000,
        dueDate: new Date('2025-02-09').toISOString(),
        paymentInfo: 'Bank details',
        terms: 'Payment terms',
      };

      const expectedInvoice = {
        id: 'invoice-1',
        invoiceNumber: 'INV-202501-001',
        totalAmount: 3000000,
        materaiRequired: false,
        materaiApplied: false,
        status: InvoiceStatus.DRAFT,
        ...createInvoiceDto,
      };

      mockPrismaService.invoice.create.mockResolvedValue(expectedInvoice);

      const result = await service.create(createInvoiceDto, 'user-id');

      expect(result).toEqual(expectedInvoice);
      expect(mockPrismaService.invoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          materaiRequired: false,
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('createFromQuotation', () => {
    it('should create invoice from approved quotation', async () => {
      const quotationId = 'quotation-1';
      const mockQuotation = {
        id: quotationId,
        status: QuotationStatus.APPROVED,
        clientId: 'client-1',
        projectId: 'project-1',
        amountPerProject: { toNumber: () => 75000000 },
        totalAmount: { toNumber: () => 75000000 },
        terms: 'Payment terms',
      };

      mockQuotationsService.findOne.mockResolvedValue(mockQuotation);
      mockPrismaService.invoice.findFirst.mockResolvedValue(null);

      const expectedInvoice = {
        id: 'invoice-1',
        invoiceNumber: 'INV-202501-001',
        quotationId,
        totalAmount: 75000000,
        materaiRequired: true,
        status: InvoiceStatus.DRAFT,
      };

      mockPrismaService.invoice.create.mockResolvedValue(expectedInvoice);

      const result = await service.createFromQuotation(quotationId, 'user-id');

      expect(result).toEqual(expectedInvoice);
      expect(mockQuotationsService.findOne).toHaveBeenCalledWith(quotationId);
      expect(mockPrismaService.invoice.findFirst).toHaveBeenCalledWith({
        where: { quotationId },
      });
    });

    it('should throw error for non-approved quotation', async () => {
      const quotationId = 'quotation-1';
      const mockQuotation = {
        id: quotationId,
        status: QuotationStatus.SENT,
        clientId: 'client-1',
        projectId: 'project-1',
        amountPerProject: { toNumber: () => 75000000 },
        totalAmount: { toNumber: () => 75000000 },
        terms: 'Payment terms',
      };

      mockQuotationsService.findOne.mockResolvedValue(mockQuotation);

      await expect(
        service.createFromQuotation(quotationId, 'user-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if invoice already exists for quotation', async () => {
      const quotationId = 'quotation-1';
      const mockQuotation = {
        id: quotationId,
        status: QuotationStatus.APPROVED,
        clientId: 'client-1',
        projectId: 'project-1',
        amountPerProject: { toNumber: () => 75000000 },
        totalAmount: { toNumber: () => 75000000 },
        terms: 'Payment terms',
      };

      const existingInvoice = {
        id: 'invoice-1',
        quotationId,
      };

      mockQuotationsService.findOne.mockResolvedValue(mockQuotation);
      mockPrismaService.invoice.findFirst.mockResolvedValue(existingInvoice);

      await expect(
        service.createFromQuotation(quotationId, 'user-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateMateraiStatus', () => {
    it('should update materai status for invoice that requires it', async () => {
      const invoiceId = 'invoice-1';
      const mockInvoice = {
        id: invoiceId,
        materaiRequired: true,
        materaiApplied: false,
      };

      const updatedInvoice = {
        ...mockInvoice,
        materaiApplied: true,
      };

      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockPrismaService.invoice.update.mockResolvedValue(updatedInvoice);

      const result = await service.updateMateraiStatus(invoiceId, true);

      expect(result).toEqual(updatedInvoice);
      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: invoiceId },
        data: { materaiApplied: true },
        include: expect.any(Object),
      });
    });

    it('should throw error for invoice that does not require materai', async () => {
      const invoiceId = 'invoice-1';
      const mockInvoice = {
        id: invoiceId,
        materaiRequired: false,
        materaiApplied: false,
      };

      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      await expect(
        service.updateMateraiStatus(invoiceId, true),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateInvoiceNumber', () => {
    it('should generate invoice number with correct format', async () => {
      mockPrismaService.invoice.count.mockResolvedValue(5);

      const result = await service.generateInvoiceNumber();

      expect(result).toMatch(/^INV-\d{6}-\d{3}$/);
      expect(mockPrismaService.invoice.count).toHaveBeenCalledWith({
        where: {
          creationDate: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        },
      });
    });
  });

  describe('getInvoiceStats', () => {
    it('should return invoice statistics', async () => {
      const mockTotal = 10;
      const mockByStatus = [
        { status: InvoiceStatus.DRAFT, _count: { status: 2 } },
        { status: InvoiceStatus.SENT, _count: { status: 3 } },
        { status: InvoiceStatus.PAID, _count: { status: 5 } },
      ];
      const mockTotalRevenue = { _sum: { totalAmount: 250000000 } };
      const mockOverdueCount = 1;

      mockPrismaService.invoice.count
        .mockResolvedValueOnce(mockTotal)
        .mockResolvedValueOnce(mockOverdueCount);
      mockPrismaService.invoice.groupBy.mockResolvedValue(mockByStatus);
      mockPrismaService.invoice.aggregate.mockResolvedValue(mockTotalRevenue);

      const result = await service.getInvoiceStats();

      expect(result).toEqual({
        total: mockTotal,
        byStatus: {
          DRAFT: 2,
          SENT: 3,
          PAID: 5,
        },
        totalRevenue: 250000000,
        overdueCount: mockOverdueCount,
      });
    });
  });
});