// Business Journey Service Integration Tests
// Comprehensive test suite for Indonesian business compliance and functionality

import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { BusinessJourneyService } from '../business-journey.service'
import { PrismaService } from '../../prisma/prisma.service'
import {
  CreateBusinessJourneyEventDto,
  UpdateBusinessJourneyEventDto,
  BusinessJourneyFiltersDto,
  BusinessJourneyEventType,
  BusinessJourneyEventStatus,
  BusinessJourneyEventSource,
  BusinessJourneyPriority,
  CreateUXMetricsDto
} from '../dto/business-journey.dto'
import { Prisma } from '@prisma/client'

// Mock Prisma Client
const mockPrismaService = {
  businessJourneyEvent: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  client: {
    findUnique: jest.fn(),
    count: jest.fn()
  },
  project: {
    count: jest.fn(),
    aggregate: jest.fn(),
    findUnique: jest.fn()
  },
  quotation: {
    count: jest.fn(),
    findUnique: jest.fn()
  },
  invoice: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    aggregate: jest.fn()
  },
  payment: {
    count: jest.fn(),
    aggregate: jest.fn(),
    findUnique: jest.fn()
  },
  uXMetrics: {
    create: jest.fn()
  }
}

describe('BusinessJourneyService', () => {
  let service: BusinessJourneyService
  let prisma: typeof mockPrismaService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessJourneyService,
        {
          provide: PrismaService,
          useValue: mockPrismaService
        }
      ]
    }).compile()

    service = module.get<BusinessJourneyService>(BusinessJourneyService)
    prisma = module.get(PrismaService)

    // Reset all mocks
    jest.clearAllMocks()
  })

  describe('createEvent', () => {
    const mockUserId = 'user-123'
    const createEventDto: CreateBusinessJourneyEventDto = {
      type: BusinessJourneyEventType.INVOICE_GENERATED,
      title: 'Invoice Dibuat',
      description: 'Invoice INV-001 telah dibuat',
      status: BusinessJourneyEventStatus.COMPLETED,
      amount: 10000000,
      clientId: 'client-123',
      invoiceId: 'invoice-123',
      metadata: {
        userCreated: mockUserId,
        source: BusinessJourneyEventSource.SYSTEM,
        priority: BusinessJourneyPriority.HIGH,
        tags: ['invoice', 'materai-required'],
        materaiRequired: true,
        materaiAmount: 10000
      }
    }

    const mockCreatedEvent = {
      id: 'event-123',
      ...createEventDto,
      amount: new Prisma.Decimal(10000000),
      createdBy: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        ...createEventDto.metadata,
        id: 'metadata-123',
        eventId: 'event-123',
        materaiAmount: new Prisma.Decimal(10000),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      client: {
        id: 'client-123',
        name: 'PT Test Indonesia'
      },
      invoice: {
        id: 'invoice-123',
        invoiceNumber: 'INV-001'
      }
    }

    it('should create a business journey event successfully', async () => {
      prisma.businessJourneyEvent.create.mockResolvedValue(mockCreatedEvent)

      const result = await service.createEvent(createEventDto, mockUserId)

      expect(prisma.businessJourneyEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: createEventDto.type,
          title: createEventDto.title,
          description: createEventDto.description,
          status: createEventDto.status,
          amount: new Prisma.Decimal(createEventDto.amount!),
          createdBy: mockUserId
        }),
        include: expect.objectContaining({
          metadata: true,
          client: true,
          invoice: true
        })
      })

      expect(result).toMatchObject({
        id: 'event-123',
        type: BusinessJourneyEventType.INVOICE_GENERATED,
        title: 'Invoice Dibuat',
        amount: 10000000
      })
    })

    it('should validate materai compliance for high-value transactions', async () => {
      const highValueEvent = {
        ...createEventDto,
        amount: 6000000, // Above 5M IDR threshold
        metadata: {
          ...createEventDto.metadata,
          userCreated: mockUserId, // Ensure userCreated is explicitly set
          materaiRequired: false // Should trigger warning
        }
      }

      prisma.businessJourneyEvent.create.mockResolvedValue({
        ...mockCreatedEvent,
        amount: new Prisma.Decimal(6000000)
      })

      await service.createEvent(highValueEvent, mockUserId)

      // Should still create the event but log warnings
      expect(prisma.businessJourneyEvent.create).toHaveBeenCalled()
    })

    it('should throw BadRequestException on database error', async () => {
      prisma.businessJourneyEvent.create.mockRejectedValue(new Error('Database error'))

      await expect(
        service.createEvent(createEventDto, mockUserId)
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('getClientTimeline', () => {
    const clientId = 'client-123'
    const filters: BusinessJourneyFiltersDto = {
      eventTypes: [BusinessJourneyEventType.INVOICE_GENERATED],
      startDate: '2025-01-01T00:00:00Z',
      endDate: '2025-01-31T23:59:59Z',
      page: 1,
      limit: 20
    }

    const mockClient = {
      id: clientId,
      name: 'PT Test Indonesia',
      email: 'test@test.com',
      phone: '+62123456789'
    }

    const mockEvents = [
      {
        id: 'event-1',
        type: BusinessJourneyEventType.CLIENT_CREATED,
        title: 'Klien Dibuat',
        description: 'Klien baru telah ditambahkan',
        status: BusinessJourneyEventStatus.COMPLETED,
        amount: null,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        metadata: {
          userCreated: 'user-123',
          source: BusinessJourneyEventSource.USER,
          priority: BusinessJourneyPriority.MEDIUM,
          tags: ['client'],
          relatedDocuments: [],
          materaiRequired: false,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01')
        },
        client: mockClient
      },
      {
        id: 'event-2',
        type: BusinessJourneyEventType.INVOICE_GENERATED,
        title: 'Invoice Dibuat',
        description: 'Invoice INV-001 telah dibuat',
        status: BusinessJourneyEventStatus.COMPLETED,
        amount: new Prisma.Decimal(10000000),
        createdAt: new Date('2025-01-05'),
        updatedAt: new Date('2025-01-05'),
        metadata: {
          userCreated: 'user-123',
          source: BusinessJourneyEventSource.SYSTEM,
          priority: BusinessJourneyPriority.HIGH,
          tags: ['invoice', 'materai-required'],
          relatedDocuments: ['invoice-123'],
          materaiRequired: true,
          materaiAmount: new Prisma.Decimal(10000),
          createdAt: new Date('2025-01-05'),
          updatedAt: new Date('2025-01-05')
        },
        client: mockClient,
        invoice: {
          id: 'invoice-123',
          invoiceNumber: 'INV-001'
        }
      }
    ]

    const mockSummary = {
      totalProjects: 2,
      totalQuotations: 3,
      totalInvoices: 2,
      totalPayments: 1,
      averageProjectValue: 25000000,
      averagePaymentDelay: 15,
      completionRate: 80
    }

    const mockMateraiCompliance = {
      required: true,
      totalRequiredAmount: 10000,
      appliedAmount: 0,
      pendingAmount: 10000,
      compliancePercentage: 0
    }

    beforeEach(() => {
      prisma.client.findUnique.mockResolvedValue(mockClient)
      prisma.businessJourneyEvent.findMany.mockResolvedValue(mockEvents)
      
      // Mock summary data
      prisma.project.count.mockResolvedValue(2)
      prisma.quotation.count.mockResolvedValue(3)
      prisma.invoice.count.mockResolvedValue(2)
      prisma.payment.count.mockResolvedValue(1)
      prisma.project.aggregate.mockResolvedValue({
        _avg: { basePrice: new Prisma.Decimal(25000000) }
      })

      // Mock materai compliance data
      prisma.invoice.findMany.mockResolvedValue([
        {
          totalAmount: new Prisma.Decimal(10000000),
          materaiRequired: true,
          materaiApplied: false,
          materaiAmount: null
        }
      ])

      // Mock total revenue
      prisma.payment.aggregate.mockResolvedValue({
        _sum: { amount: new Prisma.Decimal(50000000) }
      })
    })

    it('should return client timeline successfully', async () => {
      const result = await service.getClientTimeline(clientId, filters)

      expect(prisma.client.findUnique).toHaveBeenCalledWith({
        where: { id: clientId }
      })

      expect(prisma.businessJourneyEvent.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          clientId,
          type: { in: [BusinessJourneyEventType.INVOICE_GENERATED] },
          createdAt: {
            gte: new Date('2025-01-01T00:00:00Z'),
            lte: new Date('2025-01-31T23:59:59Z')
          }
        }),
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20
      })

      expect(result).toMatchObject({
        clientId,
        clientName: 'PT Test Indonesia',
        totalEvents: 2,
        totalRevenue: 50000000,
        events: expect.arrayContaining([
          expect.objectContaining({
            id: 'event-1',
            type: BusinessJourneyEventType.CLIENT_CREATED
          }),
          expect.objectContaining({
            id: 'event-2',
            type: BusinessJourneyEventType.INVOICE_GENERATED,
            amount: 10000000
          })
        ]),
        summary: expect.objectContaining({
          totalProjects: 2,
          totalQuotations: 3,
          completionRate: 80
        }),
        materaiCompliance: expect.objectContaining({
          required: true,
          pendingAmount: 10000
        })
      })
    })

    it('should handle search term filtering', async () => {
      const searchFilters = {
        ...filters,
        searchTerm: 'Invoice'
      }

      await service.getClientTimeline(clientId, searchFilters)

      expect(prisma.businessJourneyEvent.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          OR: [
            { title: { contains: 'Invoice', mode: 'insensitive' } },
            { description: { contains: 'Invoice', mode: 'insensitive' } }
          ]
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: expect.any(Number),
        take: expect.any(Number)
      })
    })

    it('should handle amount range filtering', async () => {
      const amountFilters = {
        ...filters,
        minAmount: 5000000,
        maxAmount: 15000000
      }

      await service.getClientTimeline(clientId, amountFilters)

      expect(prisma.businessJourneyEvent.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          amount: {
            gte: new Prisma.Decimal(5000000),
            lte: new Prisma.Decimal(15000000)
          }
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: expect.any(Number),
        take: expect.any(Number)
      })
    })

    it('should throw NotFoundException for non-existent client', async () => {
      prisma.client.findUnique.mockResolvedValue(null)

      await expect(
        service.getClientTimeline('non-existent', filters)
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('updateEvent', () => {
    const eventId = 'event-123'
    const userId = 'user-123'
    const updateDto: UpdateBusinessJourneyEventDto = {
      title: 'Updated Title',
      status: BusinessJourneyEventStatus.IN_PROGRESS,
      metadata: {
        priority: BusinessJourneyPriority.CRITICAL,
        notes: 'Updated notes'
      }
    }

    const mockExistingEvent = {
      id: eventId,
      type: BusinessJourneyEventType.INVOICE_GENERATED,
      title: 'Original Title',
      status: BusinessJourneyEventStatus.PENDING,
      metadata: {
        id: 'metadata-123',
        priority: BusinessJourneyPriority.MEDIUM
      }
    }

    const mockUpdatedEvent = {
      ...mockExistingEvent,
      ...updateDto,
      metadata: {
        ...mockExistingEvent.metadata,
        ...updateDto.metadata,
        userModified: userId,
        updatedAt: new Date()
      }
    }

    it('should update event successfully', async () => {
      prisma.businessJourneyEvent.findUnique.mockResolvedValue(mockExistingEvent)
      prisma.businessJourneyEvent.update.mockResolvedValue(mockUpdatedEvent)

      const result = await service.updateEvent(eventId, updateDto, userId)

      expect(prisma.businessJourneyEvent.findUnique).toHaveBeenCalledWith({
        where: { id: eventId },
        include: { metadata: true }
      })

      expect(prisma.businessJourneyEvent.update).toHaveBeenCalledWith({
        where: { id: eventId },
        data: expect.objectContaining({
          title: updateDto.title,
          status: updateDto.status,
          metadata: {
            update: expect.objectContaining({
              userModified: userId,
              priority: updateDto.metadata!.priority,
              notes: updateDto.metadata!.notes
            })
          }
        }),
        include: expect.any(Object)
      })

      expect(result.title).toBe('Updated Title')
      expect(result.status).toBe(BusinessJourneyEventStatus.IN_PROGRESS)
    })

    it('should throw NotFoundException for non-existent event', async () => {
      prisma.businessJourneyEvent.findUnique.mockResolvedValue(null)

      await expect(
        service.updateEvent('non-existent', updateDto, userId)
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('deleteEvent', () => {
    const eventId = 'event-123'

    it('should delete event successfully', async () => {
      const mockEvent = { id: eventId }
      prisma.businessJourneyEvent.findUnique.mockResolvedValue(mockEvent)
      prisma.businessJourneyEvent.delete.mockResolvedValue(mockEvent)

      await service.deleteEvent(eventId)

      expect(prisma.businessJourneyEvent.findUnique).toHaveBeenCalledWith({
        where: { id: eventId }
      })

      expect(prisma.businessJourneyEvent.delete).toHaveBeenCalledWith({
        where: { id: eventId }
      })
    })

    it('should throw NotFoundException for non-existent event', async () => {
      prisma.businessJourneyEvent.findUnique.mockResolvedValue(null)

      await expect(
        service.deleteEvent('non-existent')
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('autoCreateEvent', () => {
    const userId = 'user-123'

    it('should auto-create event for invoice creation', async () => {
      const mockInvoice = {
        id: 'invoice-123',
        invoiceNumber: 'INV-001',
        totalAmount: new Prisma.Decimal(10000000),
        clientId: 'client-123',
        projectId: 'project-123',
        client: { id: 'client-123', name: 'PT Test' },
        project: { id: 'project-123', description: 'Test Project' }
      }

      prisma.invoice.findUnique.mockResolvedValue(mockInvoice)
      
      const mockCreatedEvent = {
        id: 'event-123',
        type: BusinessJourneyEventType.INVOICE_GENERATED,
        title: 'Invoice dibuat: INV-001',
        description: 'Event invoice_generated untuk Test Project',
        status: BusinessJourneyEventStatus.COMPLETED,
        amount: new Prisma.Decimal(10000000),
        clientId: 'client-123',
        projectId: 'project-123',
        invoiceId: 'invoice-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          userCreated: userId,
          source: BusinessJourneyEventSource.SYSTEM,
          priority: BusinessJourneyPriority.HIGH,
          tags: ['invoice_generated', 'materai-required'],
          materaiRequired: true,
          materaiAmount: new Prisma.Decimal(10000),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }

      prisma.businessJourneyEvent.create.mockResolvedValue(mockCreatedEvent)

      const result = await service.autoCreateEvent(
        'invoice',
        'invoice-123',
        'created',
        userId
      )

      expect(result).toBeDefined()
      expect(result).not.toBeNull()
      if (result) {
        expect(result.type).toBe(BusinessJourneyEventType.INVOICE_GENERATED)
        expect(result.metadata?.materaiRequired).toBe(true)
      }
    })

    it('should return null for unsupported entity/action combinations', async () => {
      const result = await service.autoCreateEvent(
        'client',
        'client-123',
        'updated', // Not mapped to any event type
        userId
      )

      expect(result).toBeNull()
    })
  })

  describe('recordUXMetrics', () => {
    it('should record UX metrics successfully', async () => {
      const metricsDto: CreateUXMetricsDto = {
        componentName: 'BusinessJourneyTimeline',
        eventType: 'render',
        metricName: 'load_time',
        value: 150.5,
        userId: 'user-123',
        sessionId: 'session-456',
        clientId: 'client-123',
        url: '/clients/client-123',
        userAgent: 'Mozilla/5.0...',
        performanceData: {
          lcp: 200,
          fid: 50,
          cls: 0.05
        }
      }

      prisma.uXMetrics.create.mockResolvedValue({ id: 'metrics-123' })

      await service.recordUXMetrics(metricsDto)

      expect(prisma.uXMetrics.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          componentName: 'BusinessJourneyTimeline',
          eventType: 'render',
          metricName: 'load_time',
          value: 150.5,
          userId: 'user-123',
          performanceData: expect.objectContaining({
            lcp: 200,
            fid: 50,
            cls: 0.05
          })
        })
      })
    })

    it('should not throw error if metrics recording fails', async () => {
      const metricsDto: CreateUXMetricsDto = {
        componentName: 'BusinessJourneyTimeline',
        eventType: 'error',
        metricName: 'component_error',
        value: 1
      }

      prisma.uXMetrics.create.mockRejectedValue(new Error('Metrics error'))

      // Should not throw
      await expect(service.recordUXMetrics(metricsDto)).resolves.toBeUndefined()
    })
  })

  describe('Indonesian Business Logic', () => {
    describe('materai compliance', () => {
      it('should calculate correct materai amount for 5M+ IDR', () => {
        // This would test the private calculateMateraiAmount method
        // We'll test it through the public autoCreateEvent method
        const amount = 6000000 // 6M IDR
        const expectedMaterai = 10000 // 10K IDR

        // Test through indirect access via materai validation
        expect(service['calculateMateraiAmount'](amount)).toBe(expectedMaterai)
      })

      it('should calculate correct materai amount for 1B+ IDR', () => {
        const amount = 1500000000 // 1.5B IDR
        const expectedMaterai = 20000 // 20K IDR

        expect(service['calculateMateraiAmount'](amount)).toBe(expectedMaterai)
      })

      it('should return 0 materai for amounts below threshold', () => {
        const amount = 4000000 // 4M IDR
        const expectedMaterai = 0

        expect(service['calculateMateraiAmount'](amount)).toBe(expectedMaterai)
      })
    })

    describe('event prioritization', () => {
      it('should assign CRITICAL priority to overdue payments', () => {
        const priority = service['getEventPriority'](BusinessJourneyEventType.PAYMENT_OVERDUE)
        expect(priority).toBe(BusinessJourneyPriority.CRITICAL)
      })

      it('should assign HIGH priority to invoice events', () => {
        const priority = service['getEventPriority'](BusinessJourneyEventType.INVOICE_GENERATED)
        expect(priority).toBe(BusinessJourneyPriority.HIGH)
      })

      it('should assign MEDIUM priority to client creation', () => {
        const priority = service['getEventPriority'](BusinessJourneyEventType.CLIENT_CREATED)
        expect(priority).toBe(BusinessJourneyPriority.MEDIUM)
      })
    })
  })
})