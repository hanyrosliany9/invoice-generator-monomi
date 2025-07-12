// Price Inheritance Service Tests
// Comprehensive testing for Indonesian business compliance and price inheritance logic

import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { PriceInheritanceService } from '../price-inheritance.service'
import { CreatePriceInheritanceDto, PriceInheritanceMode, EntityType } from '../dto/price-inheritance.dto'

describe('PriceInheritanceService', () => {
  let service: PriceInheritanceService
  let prisma: PrismaService

  // Mock data
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User'
  }

  const mockProject = {
    id: 'project-123',
    name: 'Website Development',
    projectNumber: 'PRJ-001',
    budget: 50000000,
    description: 'Modern website development',
    createdBy: 'user-123',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-10'),
    client: {
      id: 'client-123',
      name: 'PT Indonesia Maju'
    }
  }

  const mockQuotation = {
    id: 'quotation-123',
    quotationNumber: 'Q-001',
    totalAmount: 45000000,
    status: 'APPROVED',
    notes: 'Initial quotation',
    projectId: 'project-123',
    updatedBy: 'user-123',
    createdAt: new Date('2025-01-05'),
    updatedAt: new Date('2025-01-08'),
    project: mockProject
  }

  const mockInvoice = {
    id: 'invoice-123',
    invoiceNumber: 'INV-001',
    totalAmount: 50000000,
    quotationId: 'quotation-123',
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
    quotation: mockQuotation
  }

  const mockPrismaService = {
    user: {
      findUnique: jest.fn()
    },
    quotation: {
      findUnique: jest.fn(),
      findMany: jest.fn()
    },
    invoice: {
      findUnique: jest.fn()
    },
    userInteraction: {
      create: jest.fn()
    }
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceInheritanceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService
        }
      ]
    }).compile()

    service = module.get<PriceInheritanceService>(PriceInheritanceService)
    prisma = module.get<PrismaService>(PrismaService)

    // Reset mocks
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getAvailableSources', () => {
    it('should get available sources for quotation', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)
      mockPrismaService.quotation.findUnique.mockResolvedValue(mockQuotation)
      mockPrismaService.quotation.findMany.mockResolvedValue([])

      const sources = await service.getAvailableSources(EntityType.QUOTATION, 'quotation-123', 'user-123')

      expect(sources).toHaveLength(1)
      expect(sources[0]).toEqual({
        id: 'project-123',
        type: 'project',
        entityName: 'Website Development',
        entityNumber: 'PRJ-001',
        originalAmount: 50000000,
        lastUpdated: mockProject.updatedAt,
        metadata: {
          createdBy: 'user-123',
          notes: 'Modern website development'
        }
      })
    })

    it('should get available sources for invoice', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice)

      const sources = await service.getAvailableSources('invoice', 'invoice-123', 'user-123')

      expect(sources).toHaveLength(2)
      
      // Should include quotation as primary source
      expect(sources[0]).toEqual({
        id: 'quotation-123',
        type: EntityType.QUOTATION,
        entityName: 'Quotation Q-001',
        entityNumber: 'Q-001',
        originalAmount: 45000000,
        lastUpdated: mockQuotation.updatedAt,
        metadata: {
          approvedBy: 'user-123',
          notes: 'Initial quotation'
        }
      })

      // Should include project as secondary source
      expect(sources[1]).toEqual({
        id: 'project-123',
        type: 'project',
        entityName: 'Website Development',
        entityNumber: 'PRJ-001',
        originalAmount: 50000000,
        lastUpdated: mockProject.updatedAt,
        metadata: {
          createdBy: 'user-123',
          notes: 'Modern website development'
        }
      })
    })

    it('should throw NotFoundException for invalid entity', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)
      mockPrismaService.quotation.findUnique.mockResolvedValue(null)

      await expect(
        service.getAvailableSources(EntityType.QUOTATION, 'invalid-id', 'user-123')
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw NotFoundException for invalid user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      await expect(
        service.getAvailableSources(EntityType.QUOTATION, 'quotation-123', 'invalid-user')
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('validatePriceInheritance', () => {
    it('should validate valid price inheritance', async () => {
      const result = await service.validatePriceInheritance(
        50000000, // 50 million IDR
        PriceInheritanceMode.CUSTOM,
        'source-123',
        45000000 // inherited amount
      )

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.compliance.materaiRequired).toBe(true)
      expect(result.compliance.materaiAmount).toBe(10000)
    })

    it('should detect invalid amount', async () => {
      const result = await service.validatePriceInheritance(
        0, // Invalid amount
        PriceInheritanceMode.CUSTOM
      )

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('harus berupa angka yang valid')
    })

    it('should detect extreme price deviation', async () => {
      const result = await service.validatePriceInheritance(
        75000000, // 75 million (67% higher than 45 million)
        PriceInheritanceMode.CUSTOM,
        'source-123',
        45000000
      )

      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].message).toContain('menyimpang')
      expect(result.warnings[0].message).toContain('66.7%')
    })

    it('should detect materai requirement for large amounts', async () => {
      const result = await service.validatePriceInheritance(
        60000000, // 60 million IDR (> 5 million threshold)
        PriceInheritanceMode.INHERIT
      )

      expect(result.compliance.materaiRequired).toBe(true)
      expect(result.compliance.materaiAmount).toBe(10000)
      expect(result.suggestions).toContainEqual(
        expect.objectContaining({
          type: 'materai',
          message: expect.stringContaining('Materai')
        })
      )
    })

    it('should detect very large transaction requiring higher materai', async () => {
      const result = await service.validatePriceInheritance(
        1500000000, // 1.5 billion IDR (> 1 billion threshold)
        PriceInheritanceMode.INHERIT
      )

      expect(result.compliance.materaiRequired).toBe(true)
      expect(result.compliance.materaiAmount).toBe(20000) // Higher materai amount
    })

    it('should not require materai for small amounts', async () => {
      const result = await service.validatePriceInheritance(
        3000000, // 3 million IDR (< 5 million threshold)
        PriceInheritanceMode.INHERIT
      )

      expect(result.compliance.materaiRequired).toBe(false)
      expect(result.compliance.materaiAmount).toBe(0)
    })

    it('should suggest formal communication for large transactions', async () => {
      const result = await service.validatePriceInheritance(
        150000000, // 150 million IDR
        PriceInheritanceMode.INHERIT
      )

      expect(result.suggestions).toContainEqual(
        expect.objectContaining({
          type: 'business_etiquette',
          message: expect.stringContaining('komunikasi formal')
        })
      )
    })

    it('should include tax compliance information', async () => {
      const result = await service.validatePriceInheritance(
        50000000,
        PriceInheritanceMode.INHERIT
      )

      expect(result.compliance.taxCompliance.ppnRequired).toBe(true)
      expect(result.compliance.taxCompliance.ppnRate).toBe(11)
      expect(result.suggestions).toContainEqual(
        expect.objectContaining({
          type: 'tax_compliance',
          message: expect.stringContaining('PPN 11%')
        })
      )
    })

    it('should provide business timing guidance', async () => {
      const result = await service.validatePriceInheritance(
        50000000,
        PriceInheritanceMode.INHERIT
      )

      expect(result.compliance.businessEtiquette.suggestedTiming).toBeDefined()
      expect(result.compliance.businessEtiquette.communicationStyle).toMatch(/formal|semi-formal|casual/)
      expect(result.compliance.businessEtiquette.culturalNotes).toBeInstanceOf(Array)
      expect(result.compliance.businessEtiquette.culturalNotes.length).toBeGreaterThan(0)
    })
  })

  describe('createPriceInheritance', () => {
    const createDto: CreatePriceInheritanceDto = {
      entityType: EntityType.QUOTATION,
      entityId: 'quotation-123',
      mode: PriceInheritanceMode.CUSTOM,
      currentAmount: 50000000,
      sourceId: 'project-123',
      inheritedAmount: 45000000,
      trackUserInteraction: true
    }

    it('should create price inheritance successfully', async () => {
      mockPrismaService.userInteraction.create.mockResolvedValue({})

      const result = await service.createPriceInheritance(createDto, 'user-123')

      expect(result.config.mode).toBe(PriceInheritanceMode.CUSTOM)
      expect(result.config.currentAmount).toBe(50000000)
      expect(result.config.deviationPercentage).toBeCloseTo(11.1, 1) // (50-45)/45 * 100
      expect(result.config.requiresApproval).toBe(false) // < 20% deviation
      expect(result.validation.isValid).toBe(true)
    })

    it('should require approval for large deviations', async () => {
      const largeDeviationDto = {
        ...createDto,
        currentAmount: 60000000 // 33% higher than inherited
      }

      const result = await service.createPriceInheritance(largeDeviationDto, 'user-123')

      expect(result.config.deviationPercentage).toBeCloseTo(33.3, 1)
      expect(result.config.requiresApproval).toBe(true) // > 20% deviation
    })

    it('should track user interaction when enabled', async () => {
      mockPrismaService.userInteraction.create.mockResolvedValue({})

      await service.createPriceInheritance(createDto, 'user-123')

      expect(mockPrismaService.userInteraction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          entityType: EntityType.QUOTATION,
          entityId: 'quotation-123',
          action: 'price_inheritance_created',
          metadata: expect.objectContaining({
            action: 'price_inheritance_created',
            mode: PriceInheritanceMode.CUSTOM,
            amount: 50000000
          }),
          timestamp: expect.any(Date)
        }
      })
    })

    it('should not track interaction when disabled', async () => {
      const noTrackingDto = {
        ...createDto,
        trackUserInteraction: false
      }

      await service.createPriceInheritance(noTrackingDto, 'user-123')

      expect(mockPrismaService.userInteraction.create).not.toHaveBeenCalled()
    })

    it('should throw BadRequestException for invalid configuration', async () => {
      const invalidDto = {
        ...createDto,
        currentAmount: 0 // Invalid amount
      }

      await expect(
        service.createPriceInheritance(invalidDto, 'user-123')
      ).rejects.toThrow(BadRequestException)
    })

    it('should handle interaction tracking errors gracefully', async () => {
      mockPrismaService.userInteraction.create.mockRejectedValue(new Error('Database error'))

      // Should not throw error even if tracking fails
      const result = await service.createPriceInheritance(createDto, 'user-123')
      expect(result).toBeDefined()
      expect(result.config.mode).toBe(PriceInheritanceMode.CUSTOM)
    })
  })

  describe('Indonesian Compliance', () => {
    it('should calculate correct materai for different amounts', async () => {
      // Test different materai thresholds
      const testCases = [
        { amount: 3000000, expectedMaterai: 0 },      // Below threshold
        { amount: 5000000, expectedMaterai: 10000 },   // At threshold
        { amount: 50000000, expectedMaterai: 10000 },  // Normal range
        { amount: 1000000000, expectedMaterai: 20000 }, // High value
        { amount: 2000000000, expectedMaterai: 20000 }  // Very high value
      ]

      for (const testCase of testCases) {
        const result = await service.validatePriceInheritance(testCase.amount, PriceInheritanceMode.INHERIT)
        expect(result.compliance.materaiAmount).toBe(testCase.expectedMaterai)
        expect(result.compliance.materaiRequired).toBe(testCase.expectedMaterai > 0)
      }
    })

    it('should provide appropriate communication style based on amount', async () => {
      // Small transaction - semi-formal
      const smallResult = await service.validatePriceInheritance(50000000, PriceInheritanceMode.INHERIT)
      expect(smallResult.compliance.businessEtiquette.communicationStyle).toBe('semi-formal')

      // Large transaction - formal
      const largeResult = await service.validatePriceInheritance(150000000, PriceInheritanceMode.INHERIT)
      expect(largeResult.compliance.businessEtiquette.communicationStyle).toBe('formal')
    })

    it('should include Indonesian cultural notes', async () => {
      const result = await service.validatePriceInheritance(50000000, PriceInheritanceMode.INHERIT)
      
      expect(result.compliance.businessEtiquette.culturalNotes).toContain(
        'Dalam budaya Indonesia, transparansi harga sangat dihargai'
      )
      expect(result.compliance.businessEtiquette.culturalNotes).toContain(
        'Berikan penjelasan yang jelas untuk setiap penyimpangan harga'
      )
    })

    it('should provide timing guidance based on current time', async () => {
      const result = await service.validatePriceInheritance(50000000, PriceInheritanceMode.INHERIT)
      
      expect(result.compliance.businessEtiquette.suggestedTiming).toMatch(
        /Pagi|Siang|Sore|WIB/
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle NaN and Infinity amounts', async () => {
      const nanResult = await service.validatePriceInheritance(NaN, PriceInheritanceMode.INHERIT)
      expect(nanResult.isValid).toBe(false)

      const infinityResult = await service.validatePriceInheritance(Infinity, PriceInheritanceMode.INHERIT)
      expect(infinityResult.isValid).toBe(false)
    })

    it('should handle negative amounts', async () => {
      const result = await service.validatePriceInheritance(-1000000, PriceInheritanceMode.INHERIT)
      expect(result.isValid).toBe(false)
      expect(result.errors[0].message).toContain('harus berupa angka yang valid')
    })

    it('should handle very large amounts', async () => {
      const result = await service.validatePriceInheritance(999999999999, PriceInheritanceMode.INHERIT)
      expect(result.isValid).toBe(true)
      expect(result.compliance.materaiRequired).toBe(true)
      expect(result.compliance.materaiAmount).toBe(20000)
    })

    it('should handle missing inherited amount for custom mode', async () => {
      const result = await service.validatePriceInheritance(
        50000000,
        PriceInheritanceMode.CUSTOM,
        'source-123'
        // No inherited amount provided
      )

      expect(result.isValid).toBe(true)
      expect(result.warnings.length).toBe(0) // No deviation warning without inherited amount
    })
  })

  describe('Performance', () => {
    it('should validate quickly for typical amounts', async () => {
      const startTime = performance.now()
      
      await service.validatePriceInheritance(50000000, PriceInheritanceMode.INHERIT)
      
      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(100) // Should complete in < 100ms
    })

    it('should handle multiple concurrent validations', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        service.validatePriceInheritance((i + 1) * 10000000, PriceInheritanceMode.INHERIT)
      )

      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(10)
      results.forEach(result => {
        expect(result.isValid).toBe(true)
        expect(result.compliance).toBeDefined()
      })
    })
  })
})