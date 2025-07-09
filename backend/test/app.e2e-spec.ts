import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Indonesian Business Management System (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@bisnis.co.id',
        password: 'password123',
      });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('/health (GET)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.timestamp).toBeDefined();
          expect(res.body.uptime).toBeDefined();
        });
    });
  });

  describe('Authentication', () => {
    it('/api/v1/auth/login (POST) - success', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@bisnis.co.id',
          password: 'password123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.access_token).toBeDefined();
          expect(res.body.user.email).toBe('admin@bisnis.co.id');
          expect(res.body.user.role).toBe('ADMIN');
        });
    });

    it('/api/v1/auth/login (POST) - invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@bisnis.co.id',
          password: 'wrongpassword',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Email atau password salah');
        });
    });

    it('/api/v1/auth/profile (GET) - with token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe('admin@bisnis.co.id');
          expect(res.body.role).toBe('ADMIN');
        });
    });

    it('/api/v1/auth/profile (GET) - without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .expect(401);
    });
  });

  describe('Clients', () => {
    it('/api/v1/clients (GET) - list clients', () => {
      return request(app.getHttpServer())
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.pagination).toBeDefined();
          expect(res.body.pagination.total).toBeGreaterThan(0);
        });
    });

    it('/api/v1/clients/stats (GET) - client statistics', () => {
      return request(app.getHttpServer())
        .get('/api/v1/clients/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.total).toBeGreaterThan(0);
          expect(res.body.recent).toBeInstanceOf(Array);
        });
    });

    it('/api/v1/clients/client-1 (GET) - get specific client', () => {
      return request(app.getHttpServer())
        .get('/api/v1/clients/client-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe('client-1');
          expect(res.body.name).toBe('PT Teknologi Maju');
          expect(res.body.quotations).toBeDefined();
          expect(res.body.invoices).toBeDefined();
          expect(res.body.projects).toBeDefined();
        });
    });
  });

  describe('Projects', () => {
    it('/api/v1/projects (GET) - list projects', () => {
      return request(app.getHttpServer())
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.pagination).toBeDefined();
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    it('/api/v1/projects/stats (GET) - project statistics', () => {
      return request(app.getHttpServer())
        .get('/api/v1/projects/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.total).toBeGreaterThan(0);
          expect(res.body.byStatus).toBeDefined();
          expect(res.body.byType).toBeDefined();
        });
    });

    it('/api/v1/projects/project-1 (GET) - get specific project', () => {
      return request(app.getHttpServer())
        .get('/api/v1/projects/project-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe('project-1');
          expect(res.body.number).toBe('PRJ-202501-001');
          expect(res.body.description).toBe('Pembuatan Website E-commerce');
        });
    });
  });

  describe('Quotations', () => {
    it('/api/v1/quotations (GET) - list quotations', () => {
      return request(app.getHttpServer())
        .get('/api/v1/quotations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.pagination).toBeDefined();
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    it('/api/v1/quotations/stats (GET) - quotation statistics', () => {
      return request(app.getHttpServer())
        .get('/api/v1/quotations/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.total).toBeGreaterThan(0);
          expect(res.body.byStatus).toBeDefined();
        });
    });

    it('/api/v1/quotations/recent (GET) - recent quotations', () => {
      return request(app.getHttpServer())
        .get('/api/v1/quotations/recent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('/api/v1/quotations/quotation-1 (GET) - get specific quotation', () => {
      return request(app.getHttpServer())
        .get('/api/v1/quotations/quotation-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe('quotation-1');
          expect(res.body.quotationNumber).toBe('QT-202501-001');
          expect(res.body.status).toBe('APPROVED');
        });
    });
  });

  describe('Invoices', () => {
    it('/api/v1/invoices (GET) - list invoices', () => {
      return request(app.getHttpServer())
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.pagination).toBeDefined();
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    it('/api/v1/invoices/stats (GET) - invoice statistics', () => {
      return request(app.getHttpServer())
        .get('/api/v1/invoices/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.total).toBeGreaterThan(0);
          expect(res.body.byStatus).toBeDefined();
          expect(+res.body.totalRevenue).toBeGreaterThan(0);
        });
    });

    it('/api/v1/invoices/recent (GET) - recent invoices', () => {
      return request(app.getHttpServer())
        .get('/api/v1/invoices/recent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('/api/v1/invoices/overdue (GET) - overdue invoices', () => {
      return request(app.getHttpServer())
        .get('/api/v1/invoices/overdue')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
        });
    });

    it('/api/v1/invoices/invoice-1 (GET) - get specific invoice', () => {
      return request(app.getHttpServer())
        .get('/api/v1/invoices/invoice-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe('invoice-1');
          expect(res.body.invoiceNumber).toBe('INV-202501-001');
          expect(res.body.materaiRequired).toBe(true);
        });
    });

    it('/api/v1/invoices/from-quotation/quotation-2 (POST) - create invoice from quotation', () => {
      return request(app.getHttpServer())
        .post('/api/v1/invoices/from-quotation/quotation-2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400); // Should fail because invoice already exists
    });
  });

  describe('PDF Generation', () => {
    it('/api/v1/pdf/invoice/invoice-1/preview (GET) - preview invoice PDF', () => {
      return request(app.getHttpServer())
        .get('/api/v1/pdf/invoice/invoice-1/preview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect('content-type', 'application/pdf');
    });

    it('/api/v1/pdf/quotation/quotation-1/preview (GET) - preview quotation PDF', () => {
      return request(app.getHttpServer())
        .get('/api/v1/pdf/quotation/quotation-1/preview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect('content-type', 'application/pdf');
    });
  });

  describe('Indonesian Business Features', () => {
    it('should handle materai requirements for invoices', () => {
      return request(app.getHttpServer())
        .get('/api/v1/invoices/invoice-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.materaiRequired).toBe(true);
          expect(+res.body.totalAmount).toBeGreaterThan(5000000);
        });
    });

    it('should return Indonesian error messages', () => {
      return request(app.getHttpServer())
        .get('/api/v1/invoices/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toBe('Invoice tidak ditemukan');
        });
    });

    it('should handle Indonesian business workflow', async () => {
      // Get approved quotation
      const quotationResponse = await request(app.getHttpServer())
        .get('/api/v1/quotations/quotation-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(quotationResponse.body.status).toBe('APPROVED');

      // Check if invoice was created from quotation
      const invoiceResponse = await request(app.getHttpServer())
        .get('/api/v1/invoices/invoice-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(invoiceResponse.body.quotationId).toBe('quotation-1');
      expect(invoiceResponse.body.materaiRequired).toBe(true);
    });
  });
});