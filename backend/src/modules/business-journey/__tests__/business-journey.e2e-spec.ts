// Business Journey E2E Integration Tests
// Full API endpoint testing with authentication and Indonesian compliance validation

import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request from 'supertest'
import { PrismaService } from '../../prisma/prisma.service'
import { BusinessJourneyModule } from '../business-journey.module'
import { AuthModule } from '../../auth/auth.module'
import { JwtService } from '@nestjs/jwt'
import {
  BusinessJourneyEventType,
  BusinessJourneyEventStatus,
  BusinessJourneyEventSource,
  BusinessJourneyPriority
} from '../dto/business-journey.dto'

describe('BusinessJourneyController (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let jwtService: JwtService
  let authToken: string

  // Test data
  let testUser: any
  let testClient: any
  let testProject: any
  let testInvoice: any

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [BusinessJourneyModule, AuthModule]
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))
    
    prisma = app.get<PrismaService>(PrismaService)
    jwtService = app.get<JwtService>(JwtService)

    await app.init()

    // Setup test data
    await setupTestData()
  })

  afterAll(async () => {
    await cleanupTestData()
    await app.close()
  })

  beforeEach(async () => {
    // Generate fresh auth token for each test
    authToken = jwtService.sign({
      sub: testUser.id,
      email: testUser.email,
      role: testUser.role
    })
  })

  async function setupTestData() {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test@monomi.id',
        password: 'hashedpassword',
        name: 'Test User',
        role: 'USER'
      }
    })

    // Create test client
    testClient = await prisma.client.create({
      data: {
        name: 'PT Test Indonesia',
        email: 'client@test.com',
        phone: '+62123456789',
        address: 'Jakarta, Indonesia',
        company: 'PT Test Indonesia'
      }
    })

    // Create test project
    testProject = await prisma.project.create({
      data: {
        number: 'PROJ-TEST-001',
        description: 'Test Project for E2E',
        output: 'Test deliverables',
        type: 'PRODUCTION',
        clientId: testClient.id,
        basePrice: 25000000,
        status: 'IN_PROGRESS'
      }
    })

    // Create test invoice
    testInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-TEST-001',
        creationDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        clientId: testClient.id,
        projectId: testProject.id,
        amountPerProject: 25000000,
        totalAmount: 25000000,
        paymentInfo: 'Bank Transfer: BCA 1234567890',
        materaiRequired: true,
        materaiApplied: false,
        materaiAmount: 10000,
        status: 'SENT',
        createdBy: testUser.id
      }
    })
  }

  async function cleanupTestData() {
    // Clean up in reverse order of dependencies
    await prisma.businessJourneyEvent.deleteMany()
    await prisma.uXMetrics.deleteMany()
    await prisma.invoice.deleteMany()
    await prisma.project.deleteMany()
    await prisma.client.deleteMany()
    await prisma.user.deleteMany()
  }

  describe('POST /business-journey/events', () => {
    it('should create a business journey event successfully', async () => {
      const createEventDto = {
        type: BusinessJourneyEventType.INVOICE_GENERATED,
        title: 'Invoice Dibuat',
        description: 'Invoice INV-TEST-001 telah dibuat untuk PT Test Indonesia',
        status: BusinessJourneyEventStatus.COMPLETED,
        amount: 25000000,
        clientId: testClient.id,
        projectId: testProject.id,
        invoiceId: testInvoice.id,
        metadata: {
          userCreated: testUser.id,
          source: BusinessJourneyEventSource.SYSTEM,
          priority: BusinessJourneyPriority.HIGH,
          tags: ['invoice', 'materai-required'],
          relatedDocuments: [testInvoice.id],
          notes: 'Auto-generated event for invoice creation',
          materaiRequired: true,
          materaiAmount: 10000
        }
      }

      const response = await request(app.getHttpServer())
        .post('/business-journey/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createEventDto)
        .expect(201)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Business journey event created successfully',
        data: expect.objectContaining({
          id: expect.any(String),
          type: BusinessJourneyEventType.INVOICE_GENERATED,
          title: 'Invoice Dibuat',
          amount: 25000000,
          clientId: testClient.id,
          metadata: expect.objectContaining({
            materaiRequired: true,
            materaiAmount: 10000,
            tags: expect.arrayContaining(['invoice', 'materai-required'])
          })
        })
      })
    })

    it('should validate materai compliance for high-value transactions', async () => {
      const highValueEvent = {
        type: BusinessJourneyEventType.INVOICE_GENERATED,
        title: 'High Value Invoice',
        description: 'Invoice with value above materai threshold',
        amount: 8000000, // Above 5M IDR threshold
        clientId: testClient.id,
        metadata: {
          userCreated: testUser.id,
          materaiRequired: false, // Should be true for high value
          materaiAmount: 0 // Should be 10000
        }
      }

      const response = await request(app.getHttpServer())
        .post('/business-journey/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(highValueEvent)
        .expect(201)

      // Event should be created but with compliance warnings in logs
      expect(response.body.data.amount).toBe(8000000)
    })

    it('should return 400 for invalid input data', async () => {
      const invalidEvent = {
        type: 'INVALID_TYPE',
        title: '', // Empty title should fail validation
        description: 'Test description'
      }

      await request(app.getHttpServer())
        .post('/business-journey/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidEvent)
        .expect(400)
    })

    it('should return 401 without authentication', async () => {
      const createEventDto = {
        type: BusinessJourneyEventType.CLIENT_CREATED,
        title: 'Test Event',
        description: 'Test description'
      }

      await request(app.getHttpServer())
        .post('/business-journey/events')
        .send(createEventDto)
        .expect(401)
    })
  })

  describe('GET /business-journey/clients/:clientId/timeline', () => {
    let testEvent: any

    beforeEach(async () => {
      // Create a test event for timeline testing
      testEvent = await prisma.businessJourneyEvent.create({
        data: {
          type: BusinessJourneyEventType.CLIENT_CREATED,
          title: 'Klien Dibuat',
          description: 'PT Test Indonesia telah ditambahkan ke sistem',
          status: BusinessJourneyEventStatus.COMPLETED,
          clientId: testClient.id,
          createdBy: testUser.id,
          metadata: {
            create: {
              userCreated: testUser.id,
              source: BusinessJourneyEventSource.USER,
              priority: BusinessJourneyPriority.MEDIUM,
              tags: ['client'],
              relatedDocuments: [],
              materaiRequired: false
            }
          }
        }
      })
    })

    afterEach(async () => {
      await prisma.businessJourneyEvent.deleteMany({
        where: { clientId: testClient.id }
      })
    })

    it('should return client timeline successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/business-journey/clients/${testClient.id}/timeline`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Business journey timeline retrieved successfully',
        data: expect.objectContaining({
          clientId: testClient.id,
          clientName: 'PT Test Indonesia',
          totalEvents: expect.any(Number),
          totalRevenue: expect.any(Number),
          events: expect.arrayContaining([
            expect.objectContaining({
              id: testEvent.id,
              type: BusinessJourneyEventType.CLIENT_CREATED,
              title: 'Klien Dibuat'
            })
          ]),
          summary: expect.objectContaining({
            totalProjects: expect.any(Number),
            totalQuotations: expect.any(Number),
            totalInvoices: expect.any(Number),
            completionRate: expect.any(Number)
          }),
          materaiCompliance: expect.objectContaining({
            required: expect.any(Boolean),
            compliancePercentage: expect.any(Number)
          })
        })
      })
    })

    it('should filter timeline by event types', async () => {
      // Create additional event
      await prisma.businessJourneyEvent.create({
        data: {
          type: BusinessJourneyEventType.INVOICE_GENERATED,
          title: 'Invoice Dibuat',
          description: 'Test invoice event',
          status: BusinessJourneyEventStatus.COMPLETED,
          amount: 10000000,
          clientId: testClient.id,
          createdBy: testUser.id,
          metadata: {
            create: {
              userCreated: testUser.id,
              source: BusinessJourneyEventSource.SYSTEM,
              priority: BusinessJourneyPriority.HIGH,
              tags: ['invoice'],
              relatedDocuments: [],
              materaiRequired: true,
              materaiAmount: 10000
            }
          }
        }
      })

      const response = await request(app.getHttpServer())
        .get(`/business-journey/clients/${testClient.id}/timeline`)
        .query({
          eventTypes: [BusinessJourneyEventType.INVOICE_GENERATED]
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.data.events).toHaveLength(1)
      expect(response.body.data.events[0].type).toBe(BusinessJourneyEventType.INVOICE_GENERATED)
    })

    it('should filter timeline by date range', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
      const endDate = new Date().toISOString()

      const response = await request(app.getHttpServer())
        .get(`/business-journey/clients/${testClient.id}/timeline`)
        .query({
          startDate,
          endDate
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.data.events).toBeDefined()
    })

    it('should handle pagination', async () => {
      const response = await request(app.getHttpServer())
        .get(`/business-journey/clients/${testClient.id}/timeline`)
        .query({
          page: 1,
          limit: 5
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.data.events.length).toBeLessThanOrEqual(5)
    })

    it('should return 404 for non-existent client', async () => {
      const nonExistentClientId = '00000000-0000-0000-0000-000000000000'

      await request(app.getHttpServer())
        .get(`/business-journey/clients/${nonExistentClientId}/timeline`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })

    it('should return 400 for invalid client ID format', async () => {
      await request(app.getHttpServer())
        .get('/business-journey/clients/invalid-uuid/timeline')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
    })
  })

  describe('PUT /business-journey/events/:eventId', () => {
    let testEvent: any

    beforeEach(async () => {
      testEvent = await prisma.businessJourneyEvent.create({
        data: {
          type: BusinessJourneyEventType.QUOTATION_SENT,
          title: 'Quotation Dikirim',
          description: 'Quotation telah dikirim ke klien',
          status: BusinessJourneyEventStatus.IN_PROGRESS,
          clientId: testClient.id,
          createdBy: testUser.id,
          metadata: {
            create: {
              userCreated: testUser.id,
              source: BusinessJourneyEventSource.USER,
              priority: BusinessJourneyPriority.MEDIUM,
              tags: ['quotation'],
              relatedDocuments: [],
              notes: 'Original notes',
              materaiRequired: false
            }
          }
        }
      })
    })

    afterEach(async () => {
      await prisma.businessJourneyEvent.deleteMany({
        where: { id: testEvent.id }
      })
    })

    it('should update business journey event successfully', async () => {
      const updateDto = {
        title: 'Quotation Disetujui',
        status: BusinessJourneyEventStatus.COMPLETED,
        metadata: {
          priority: BusinessJourneyPriority.HIGH,
          notes: 'Updated notes - quotation approved',
          tags: ['quotation', 'approved']
        }
      }

      const response = await request(app.getHttpServer())
        .put(`/business-journey/events/${testEvent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Business journey event updated successfully',
        data: expect.objectContaining({
          id: testEvent.id,
          title: 'Quotation Disetujui',
          status: BusinessJourneyEventStatus.COMPLETED,
          metadata: expect.objectContaining({
            priority: BusinessJourneyPriority.HIGH,
            notes: 'Updated notes - quotation approved',
            tags: expect.arrayContaining(['quotation', 'approved'])
          })
        })
      })
    })

    it('should return 404 for non-existent event', async () => {
      const nonExistentEventId = '00000000-0000-0000-0000-000000000000'
      
      await request(app.getHttpServer())
        .put(`/business-journey/events/${nonExistentEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Title' })
        .expect(404)
    })
  })

  describe('DELETE /business-journey/events/:eventId', () => {
    let testEvent: any

    beforeEach(async () => {
      testEvent = await prisma.businessJourneyEvent.create({
        data: {
          type: BusinessJourneyEventType.CLIENT_CREATED,
          title: 'Test Event for Deletion',
          description: 'This event will be deleted',
          status: BusinessJourneyEventStatus.COMPLETED,
          clientId: testClient.id,
          createdBy: testUser.id,
          metadata: {
            create: {
              userCreated: testUser.id,
              source: BusinessJourneyEventSource.USER,
              priority: BusinessJourneyPriority.LOW,
              tags: ['test'],
              relatedDocuments: [],
              materaiRequired: false
            }
          }
        }
      })
    })

    it('should delete business journey event successfully', async () => {
      await request(app.getHttpServer())
        .delete(`/business-journey/events/${testEvent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204)

      // Verify event is deleted
      const deletedEvent = await prisma.businessJourneyEvent.findUnique({
        where: { id: testEvent.id }
      })
      expect(deletedEvent).toBeNull()
    })

    it('should return 404 for non-existent event', async () => {
      const nonExistentEventId = '00000000-0000-0000-0000-000000000000'
      
      await request(app.getHttpServer())
        .delete(`/business-journey/events/${nonExistentEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })
  })

  describe('POST /business-journey/events/auto-create', () => {
    it('should auto-create event for invoice creation', async () => {
      const autoCreatePayload = {
        entityType: 'invoice',
        entityId: testInvoice.id,
        action: 'created',
        metadata: {
          invoiceNumber: testInvoice.invoiceNumber,
          amount: Number(testInvoice.totalAmount)
        }
      }

      const response = await request(app.getHttpServer())
        .post('/business-journey/events/auto-create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(autoCreatePayload)
        .expect(201)

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          type: BusinessJourneyEventType.INVOICE_GENERATED,
          clientId: testClient.id,
          invoiceId: testInvoice.id,
          metadata: expect.objectContaining({
            source: BusinessJourneyEventSource.SYSTEM,
            materaiRequired: true // Because amount > 5M IDR
          })
        })
      })
    })

    it('should return null for unsupported entity/action', async () => {
      const autoCreatePayload = {
        entityType: 'unknown',
        entityId: 'some-id',
        action: 'unknown'
      }

      const response = await request(app.getHttpServer())
        .post('/business-journey/events/auto-create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(autoCreatePayload)
        .expect(201)

      expect(response.body.data).toBeNull()
      expect(response.body.message).toContain('No event created')
    })
  })

  describe('POST /business-journey/analytics/ux-metrics', () => {
    it('should record UX metrics successfully', async () => {
      const metricsDto = {
        componentName: 'BusinessJourneyTimeline',
        eventType: 'render',
        metricName: 'load_time',
        value: 250.5,
        sessionId: 'session-123',
        clientId: testClient.id,
        url: `/clients/${testClient.id}`,
        performanceData: {
          lcp: 300,
          fid: 75,
          cls: 0.08,
          fcp: 180,
          ttfb: 120
        }
      }

      const response = await request(app.getHttpServer())
        .post('/business-journey/analytics/ux-metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .send(metricsDto)
        .expect(201)

      expect(response.body).toMatchObject({
        success: true,
        message: 'UX metrics recorded successfully',
        data: null
      })

      // Verify metrics were saved
      const savedMetrics = await prisma.uXMetrics.findFirst({
        where: {
          componentName: 'BusinessJourneyTimeline',
          metricName: 'load_time'
        }
      })

      expect(savedMetrics).toBeDefined()
      expect(savedMetrics!.value).toBe(250.5)
      expect(savedMetrics!.userId).toBe(testUser.id)
    })
  })

  describe('GET /business-journey/analytics/summary/:clientId', () => {
    it('should return business analytics summary', async () => {
      // Create some test events for analytics
      await prisma.businessJourneyEvent.createMany({
        data: [
          {
            type: BusinessJourneyEventType.CLIENT_CREATED,
            title: 'Klien Dibuat',
            description: 'Test client creation',
            status: BusinessJourneyEventStatus.COMPLETED,
            clientId: testClient.id,
            createdBy: testUser.id
          },
          {
            type: BusinessJourneyEventType.INVOICE_GENERATED,
            title: 'Invoice Dibuat',
            description: 'Test invoice creation',
            status: BusinessJourneyEventStatus.COMPLETED,
            amount: 15000000,
            clientId: testClient.id,
            invoiceId: testInvoice.id,
            createdBy: testUser.id
          }
        ]
      })

      const response = await request(app.getHttpServer())
        .get(`/business-journey/analytics/summary/${testClient.id}`)
        .query({ period: 'month' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Business analytics summary retrieved successfully',
        data: expect.objectContaining({
          period: 'month',
          clientId: testClient.id,
          summary: expect.objectContaining({
            totalProjects: expect.any(Number),
            totalQuotations: expect.any(Number),
            totalInvoices: expect.any(Number),
            completionRate: expect.any(Number)
          }),
          materaiCompliance: expect.objectContaining({
            required: expect.any(Boolean),
            compliancePercentage: expect.any(Number)
          }),
          trends: expect.objectContaining({
            revenueGrowth: expect.any(Number),
            conversionRate: expect.any(Number),
            averageProjectValue: expect.any(Number)
          })
        })
      })
    })
  })

  describe('GET /business-journey/compliance/materai/:clientId', () => {
    it('should return materai compliance report', async () => {
      const response = await request(app.getHttpServer())
        .get(`/business-journey/compliance/materai/${testClient.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Materai compliance report retrieved successfully',
        data: expect.objectContaining({
          clientId: testClient.id,
          clientName: 'PT Test Indonesia',
          materaiCompliance: expect.objectContaining({
            required: expect.any(Boolean),
            totalRequiredAmount: expect.any(Number),
            appliedAmount: expect.any(Number),
            pendingAmount: expect.any(Number),
            compliancePercentage: expect.any(Number)
          }),
          recommendations: expect.arrayContaining([
            expect.any(String)
          ])
        })
      })

      // Should include recommendations for pending materai
      if (response.body.data.materaiCompliance.pendingAmount > 0) {
        expect(response.body.data.recommendations).toContain(
          expect.stringContaining('materai')
        )
      }
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid UUID parameters gracefully', async () => {
      await request(app.getHttpServer())
        .get('/business-journey/clients/invalid-uuid/timeline')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
    })

    it('should validate input data strictly', async () => {
      const invalidEventDto = {
        type: BusinessJourneyEventType.INVOICE_GENERATED,
        title: 'a'.repeat(300), // Too long
        description: 'Valid description',
        amount: -1000, // Negative amount
        metadata: {
          tags: 'not-an-array', // Should be array
          materaiAmount: 'invalid-number' // Should be number
        }
      }

      const response = await request(app.getHttpServer())
        .post('/business-journey/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidEventDto)
        .expect(400)

      expect(response.body.message).toBeInstanceOf(Array)
      expect(response.body.message.some((msg: string) => 
        msg.includes('title') || msg.includes('amount') || msg.includes('tags')
      )).toBe(true)
    })

    it('should handle database constraints properly', async () => {
      // Try to create event with non-existent client ID
      const eventWithInvalidClient = {
        type: BusinessJourneyEventType.CLIENT_CREATED,
        title: 'Test Event',
        description: 'Test description',
        clientId: '00000000-0000-0000-0000-000000000000'
      }

      await request(app.getHttpServer())
        .post('/business-journey/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(eventWithInvalidClient)
        .expect(400)
    })
  })
})