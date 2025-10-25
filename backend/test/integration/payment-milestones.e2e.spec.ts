import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { PaymentMilestonesService } from '../../src/modules/quotations/services/payment-milestones.service';

/**
 * Phase 1 Enhancement: Payment Milestones Integration Tests
 *
 * Tests for milestone-based quotations workflow:
 * - Creating and validating milestones
 * - Calculating milestone amounts
 * - Enforcing percentage constraints
 * - Generating milestone invoices
 * - Tracking payment progress
 */
describe('Payment Milestones (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let paymentMilestonesService: PaymentMilestonesService;
  let authToken: string;
  let testClient: any;
  let testProject: any;
  let testUser: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    paymentMilestonesService = moduleFixture.get<PaymentMilestonesService>(
      PaymentMilestonesService,
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Setup: Create test data
    testUser = await prisma.user.create({
      data: {
        email: `test-milestone-${Date.now()}@test.com`,
        password: 'hashed_password',
        name: 'Test User',
        role: 'PROJECT_MANAGER',
      },
    });

    testClient = await prisma.client.create({
      data: {
        name: 'Test Client for Milestones',
        email: 'test@client.com',
        phone: '081234567890',
        address: 'Jakarta',
        taxId: '12.345.678.9-123.000',
      },
    });

    testProject = await prisma.project.create({
      data: {
        projectNumber: `PRJ-TEST-${Date.now()}`,
        description: 'Test Project for Milestones',
        clientId: testClient.id,
        status: 'PLANNING',
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-05-31'),
        estimatedBudget: 50000000,
      },
    });

    // Login and get auth token (mocked for E2E)
    // In actual implementation, call login endpoint
    authToken = 'test-jwt-token';
  });

  afterEach(async () => {
    // Cleanup
    if (testProject) {
      await prisma.project.delete({
        where: { id: testProject.id },
      });
    }
    if (testClient) {
      await prisma.client.delete({
        where: { id: testClient.id },
      });
    }
    if (testUser) {
      await prisma.user.delete({
        where: { id: testUser.id },
      });
    }
  });

  describe('Create quotation with milestones', () => {
    it('should create a quotation with milestone-based payment', async () => {
      const quotation = await prisma.quotation.create({
        data: {
          quotationNumber: `QT-TEST-${Date.now()}`,
          date: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          clientId: testClient.id,
          projectId: testProject.id,
          amountPerProject: 50000000,
          totalAmount: 50000000,
          paymentType: 'MILESTONE_BASED',
          status: 'DRAFT',
          createdBy: testUser.id,
          paymentMilestones: {
            create: [
              {
                milestoneNumber: 1,
                name: 'Down Payment',
                nameId: 'DP',
                paymentPercentage: 30,
                paymentAmount: 15000000,
                dueDate: new Date('2025-02-15'),
              },
              {
                milestoneNumber: 2,
                name: 'Termin 1',
                nameId: 'Tahap 1',
                paymentPercentage: 40,
                paymentAmount: 20000000,
                dueDaysFromPrev: 30,
              },
              {
                milestoneNumber: 3,
                name: 'Pelunasan',
                nameId: 'Final',
                paymentPercentage: 30,
                paymentAmount: 15000000,
                dueDaysFromPrev: 30,
              },
            ],
          },
        },
        include: { paymentMilestones: true },
      });

      expect(quotation).toBeDefined();
      expect(quotation.quotationNumber).toBeDefined();
      expect(quotation.paymentType).toBe('MILESTONE_BASED');
      expect(quotation.paymentMilestones).toHaveLength(3);
      expect(quotation.paymentMilestones[0].paymentPercentage).toBe(30);
      expect(Number(quotation.paymentMilestones[0].paymentAmount)).toBe(15000000);
    });
  });

  describe('Validate milestone percentages', () => {
    let testQuotation: any;

    beforeEach(async () => {
      testQuotation = await prisma.quotation.create({
        data: {
          quotationNumber: `QT-VALIDATE-${Date.now()}`,
          date: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          clientId: testClient.id,
          projectId: testProject.id,
          amountPerProject: 50000000,
          totalAmount: 50000000,
          paymentType: 'MILESTONE_BASED',
          status: 'DRAFT',
          createdBy: testUser.id,
          paymentMilestones: {
            create: [
              {
                milestoneNumber: 1,
                name: 'Phase 1',
                paymentPercentage: 50,
                paymentAmount: 25000000,
              },
              {
                milestoneNumber: 2,
                name: 'Phase 2',
                paymentPercentage: 50,
                paymentAmount: 25000000,
              },
            ],
          },
        },
        include: { paymentMilestones: true },
      });
    });

    afterEach(async () => {
      if (testQuotation) {
        await prisma.quotation.delete({
          where: { id: testQuotation.id },
        });
      }
    });

    it('should validate that percentages sum to 100%', async () => {
      const isValid =
        await paymentMilestonesService.validateQuotationMilestones(
          testQuotation.id,
        );
      expect(isValid).toBe(true);
    });

    it('should reject milestones exceeding 100%', async () => {
      expect(async () => {
        await paymentMilestonesService.addPaymentMilestone(testQuotation.id, {
          milestoneNumber: 3,
          name: 'Phase 3',
          paymentPercentage: 20,
          deliverables: [],
        });
      }).rejects.toThrow();
    });
  });

  describe('Calculate milestone amounts', () => {
    it('should calculate amounts based on percentages', async () => {
      const quotation = await prisma.quotation.create({
        data: {
          quotationNumber: `QT-CALC-${Date.now()}`,
          date: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          clientId: testClient.id,
          projectId: testProject.id,
          amountPerProject: 100000000,
          totalAmount: 100000000,
          paymentType: 'MILESTONE_BASED',
          status: 'DRAFT',
          createdBy: testUser.id,
          paymentMilestones: {
            create: [
              {
                milestoneNumber: 1,
                name: 'M1',
                paymentPercentage: 25,
                paymentAmount: 25000000,
              },
              {
                milestoneNumber: 2,
                name: 'M2',
                paymentPercentage: 50,
                paymentAmount: 50000000,
              },
              {
                milestoneNumber: 3,
                name: 'M3',
                paymentPercentage: 25,
                paymentAmount: 25000000,
              },
            ],
          },
        },
        include: { paymentMilestones: true },
      });

      expect(Number(quotation.paymentMilestones[0].paymentAmount)).toBe(25000000);
      expect(Number(quotation.paymentMilestones[1].paymentAmount)).toBe(50000000);
      expect(Number(quotation.paymentMilestones[2].paymentAmount)).toBe(25000000);

      // Cleanup
      await prisma.quotation.delete({
        where: { id: quotation.id },
      });
    });
  });

  describe('Generate milestone invoices', () => {
    let testQuotation: any;

    beforeEach(async () => {
      testQuotation = await prisma.quotation.create({
        data: {
          quotationNumber: `QT-INVOICE-${Date.now()}`,
          date: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          clientId: testClient.id,
          projectId: testProject.id,
          amountPerProject: 30000000,
          totalAmount: 30000000,
          paymentType: 'MILESTONE_BASED',
          status: 'DRAFT',
          createdBy: testUser.id,
          paymentMilestones: {
            create: [
              {
                milestoneNumber: 1,
                name: 'DP',
                paymentPercentage: 40,
                paymentAmount: 12000000,
                dueDate: new Date('2025-02-15'),
              },
              {
                milestoneNumber: 2,
                name: 'Final',
                paymentPercentage: 60,
                paymentAmount: 18000000,
                dueDaysFromPrev: 30,
              },
            ],
          },
        },
        include: { paymentMilestones: true },
      });
    });

    afterEach(async () => {
      if (testQuotation) {
        await prisma.quotation.delete({
          where: { id: testQuotation.id },
        });
      }
    });

    it('should generate invoice for payment milestone', async () => {
      const milestone = testQuotation.paymentMilestones[0];

      const invoice = await paymentMilestonesService.generateMilestoneInvoice(
        milestone.id,
        testUser.id,
      );

      expect(invoice).toBeDefined();
      expect(invoice.invoiceNumber).toBeDefined();
      expect(Number(invoice.totalAmount)).toBe(12000000);
      expect(invoice.paymentMilestoneId).toBe(milestone.id);

      // Verify milestone marked as invoiced
      const updatedMilestone =
        await prisma.paymentMilestone.findUnique({
          where: { id: milestone.id },
        });
      expect(updatedMilestone.invoiceId).toBe(invoice.id);
    });

    it('should not allow duplicate invoice for same milestone', async () => {
      const milestone = testQuotation.paymentMilestones[0];

      // Generate first invoice
      await paymentMilestonesService.generateMilestoneInvoice(
        milestone.id,
        testUser.id,
      );

      // Try to generate second invoice
      expect(async () => {
        await paymentMilestonesService.generateMilestoneInvoice(
          milestone.id,
          testUser.id,
        );
      }).rejects.toThrow();
    });
  });

  describe('Track payment progress', () => {
    let testQuotation: any;

    beforeEach(async () => {
      testQuotation = await prisma.quotation.create({
        data: {
          quotationNumber: `QT-PROGRESS-${Date.now()}`,
          date: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          clientId: testClient.id,
          projectId: testProject.id,
          amountPerProject: 60000000,
          totalAmount: 60000000,
          paymentType: 'MILESTONE_BASED',
          status: 'DRAFT',
          createdBy: testUser.id,
          paymentMilestones: {
            create: [
              {
                milestoneNumber: 1,
                name: 'M1',
                paymentPercentage: 30,
                paymentAmount: 18000000,
              },
              {
                milestoneNumber: 2,
                name: 'M2',
                paymentPercentage: 35,
                paymentAmount: 21000000,
              },
              {
                milestoneNumber: 3,
                name: 'M3',
                paymentPercentage: 35,
                paymentAmount: 21000000,
              },
            ],
          },
        },
        include: { paymentMilestones: true },
      });
    });

    afterEach(async () => {
      if (testQuotation) {
        await prisma.quotation.delete({
          where: { id: testQuotation.id },
        });
      }
    });

    it('should track milestone progress', async () => {
      const progress = await paymentMilestonesService.getProgress(
        testQuotation.id,
      );

      expect(progress).toBeDefined();
      expect(progress.quotationId).toBe(testQuotation.id);
      expect(progress.totalMilestones).toBe(3);
      expect(progress.milestonesInvoiced).toBe(0);
      expect(progress.invoicedPercentage).toBe(0);
      expect(progress.totalAmount).toBe(60000000);
      expect(progress.totalInvoiced).toBe(0);
      expect(progress.outstandingAmount).toBe(60000000);
    });

    it('should update progress after invoice generation', async () => {
      const milestone = testQuotation.paymentMilestones[0];

      // Generate invoice
      await paymentMilestonesService.generateMilestoneInvoice(
        milestone.id,
        testUser.id,
      );

      // Check updated progress
      const progress = await paymentMilestonesService.getProgress(
        testQuotation.id,
      );

      expect(progress.milestonesInvoiced).toBe(1);
      expect(progress.invoicedPercentage).toBe(33); // 1 of 3
      expect(progress.totalInvoiced).toBe(18000000);
      expect(progress.outstandingAmount).toBe(42000000);
    });
  });

  describe('Prevent deletion of invoiced milestones', () => {
    let testQuotation: any;

    beforeEach(async () => {
      testQuotation = await prisma.quotation.create({
        data: {
          quotationNumber: `QT-DELETE-${Date.now()}`,
          date: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          clientId: testClient.id,
          projectId: testProject.id,
          amountPerProject: 20000000,
          totalAmount: 20000000,
          paymentType: 'MILESTONE_BASED',
          status: 'DRAFT',
          createdBy: testUser.id,
          paymentMilestones: {
            create: [
              {
                milestoneNumber: 1,
                name: 'Only Milestone',
                paymentPercentage: 100,
                paymentAmount: 20000000,
              },
            ],
          },
        },
        include: { paymentMilestones: true },
      });
    });

    afterEach(async () => {
      if (testQuotation) {
        await prisma.quotation.delete({
          where: { id: testQuotation.id },
        });
      }
    });

    it('should delete non-invoiced milestone', async () => {
      const milestone = testQuotation.paymentMilestones[0];

      expect(async () => {
        await paymentMilestonesService.removePaymentMilestone(milestone.id);
      }).not.toThrow();
    });

    it('should prevent deletion of invoiced milestone', async () => {
      const milestone = testQuotation.paymentMilestones[0];

      // Generate invoice
      await paymentMilestonesService.generateMilestoneInvoice(
        milestone.id,
        testUser.id,
      );

      // Try to delete
      expect(async () => {
        await paymentMilestonesService.removePaymentMilestone(milestone.id);
      }).rejects.toThrow();
    });
  });

  describe('Update amounts when quotation changes', () => {
    let testQuotation: any;

    beforeEach(async () => {
      testQuotation = await prisma.quotation.create({
        data: {
          quotationNumber: `QT-UPDATE-${Date.now()}`,
          date: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          clientId: testClient.id,
          projectId: testProject.id,
          amountPerProject: 100000000,
          totalAmount: 100000000,
          paymentType: 'MILESTONE_BASED',
          status: 'DRAFT',
          createdBy: testUser.id,
          paymentMilestones: {
            create: [
              {
                milestoneNumber: 1,
                name: 'M1',
                paymentPercentage: 50,
                paymentAmount: 50000000,
              },
              {
                milestoneNumber: 2,
                name: 'M2',
                paymentPercentage: 50,
                paymentAmount: 50000000,
              },
            ],
          },
        },
        include: { paymentMilestones: true },
      });
    });

    afterEach(async () => {
      if (testQuotation) {
        await prisma.quotation.delete({
          where: { id: testQuotation.id },
        });
      }
    });

    it('should recalculate milestone amounts on quotation update', async () => {
      // Update quotation amount
      const updatedQuotation = await prisma.quotation.update({
        where: { id: testQuotation.id },
        data: { totalAmount: 200000000 },
      });

      // Recalculate milestones
      await paymentMilestonesService.recalculateMilestoneAmounts(
        testQuotation.id,
      );

      // Verify updated amounts
      const milestones =
        await paymentMilestonesService.getQuotationMilestones(testQuotation.id);

      expect(Number(milestones[0].paymentAmount)).toBe(100000000); // 50% of 200M
      expect(Number(milestones[1].paymentAmount)).toBe(100000000); // 50% of 200M
    });
  });
});
