// K6 Load Testing Script for Indonesian Business Management System
// Comprehensive load testing for quotation-to-invoice workflow with Indonesian business scenarios

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics for Indonesian business context
export const quotationRequests = new Counter('quotation_requests_total');
export const invoiceGenerations = new Counter('invoice_generations_total');
export const materaiCalculations = new Counter('materai_calculations_total');
export const errorRate = new Rate('errors');
export const quotationDuration = new Trend('quotation_duration');
export const invoiceDuration = new Trend('invoice_duration');
export const materaiDuration = new Trend('materai_duration');

// Test configuration
export const options = {
  scenarios: {
    // Indonesian Business Peak Hours (09:00-11:00 WIB)
    peak_hours: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },   // Ramp up
        { duration: '5m', target: 50 },   // Peak load
        { duration: '2m', target: 10 },   // Ramp down
        { duration: '1m', target: 0 },    // Cool down
      ],
      gracefulRampDown: '30s',
    },
    
    // Indonesian Business Normal Hours
    normal_hours: {
      executor: 'constant-vus',
      vus: 20,
      duration: '5m',
      startTime: '10m',
    },
    
    // Materai Calculation Stress Test
    materai_stress: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '3m',
      preAllocatedVUs: 20,
      maxVUs: 50,
      startTime: '15m',
    },
    
    // Indonesian Holiday Load (Lower traffic)
    holiday_load: {
      executor: 'constant-vus',
      vus: 5,
      duration: '2m',
      startTime: '18m',
    }
  },
  
  thresholds: {
    // Overall performance thresholds (adjusted for Indonesian internet conditions)
    http_req_duration: ['p(95)<3000'], // 95% of requests under 3s
    http_req_failed: ['rate<0.05'],     // Error rate under 5%
    
    // Indonesian business specific thresholds
    quotation_duration: ['p(95)<2000'], // Quotation loading under 2s
    invoice_duration: ['p(95)<1500'],   // Invoice generation under 1.5s
    materai_duration: ['p(95)<500'],    // Materai calculation under 0.5s
    
    // Business critical thresholds
    errors: ['rate<0.02'], // Less than 2% errors for financial system
  },
  
  // External metrics for monitoring
  ext: {
    loadimpact: {
      name: 'Indonesian Business Management System Load Test',
      projectID: 3482909,
    },
  },
};

// Test data for Indonesian business scenarios
const indonesianTestData = {
  companies: [
    'PT Maju Bersama Indonesia',
    'CV Berkah Nusantara',
    'PT Sukses Mandiri',
    'UD Sinar Harapan',
    'PT Teknologi Indonesia'
  ],
  
  clients: [
    { name: 'Budi Santoso', title: 'Direktur', honorific: 'Bapak' },
    { name: 'Siti Nurhaliza', title: 'Manager', honorific: 'Ibu' },
    { name: 'Ahmad Wijaya', title: 'Owner', honorific: 'Bapak' },
    { name: 'Indira Sari', title: 'Finance Director', honorific: 'Ibu' },
    { name: 'Rendra Karno', title: 'CEO', honorific: 'Bapak' }
  ],
  
  projects: [
    'Sistem Informasi Manajemen',
    'Website E-Commerce',
    'Aplikasi Mobile Banking',
    'Platform Digital Marketing',
    'Sistem Inventory Management'
  ],
  
  amounts: [
    1500000,    // Below materai threshold
    3000000,    // Below materai threshold
    5500000,    // Above materai threshold
    8000000,    // Above materai threshold
    12000000,   // Above materai threshold
    25000000    // High value transaction
  ]
};

// Base URL configuration
const BASE_URL = __ENV.API_BASE_URL || 'http://app-test:5000';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://app-test:3000';

// Helper function to get random item from array
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to generate Indonesian business quotation data
function generateQuotationData() {
  return {
    clientName: getRandomItem(indonesianTestData.clients).name,
    clientTitle: getRandomItem(indonesianTestData.clients).title,
    companyName: getRandomItem(indonesianTestData.companies),
    projectTitle: getRandomItem(indonesianTestData.projects),
    amount: getRandomItem(indonesianTestData.amounts),
    currency: 'IDR',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Penawaran harga untuk proyek pengembangan sistem',
    terms: 'Pembayaran 50% di muka, 50% setelah selesai',
    timezone: 'Asia/Jakarta'
  };
}

// Authentication helper
function authenticate() {
  const loginData = {
    email: 'admin@monomi.id',
    password: 'password123'
  };
  
  const response = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(loginData), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(response, {
    'authentication successful': (r) => r.status === 200,
    'received auth token': (r) => r.json('token') !== undefined,
  });
  
  return response.json('token');
}

// Main test function
export default function() {
  // Get authentication token
  const token = authenticate();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'Accept-Language': 'id-ID',
    'X-Timezone': 'Asia/Jakarta',
    'X-Currency': 'IDR'
  };

  group('Indonesian Business Workflow Tests', () => {
    
    // Test 1: Quotation Creation (Core Business Function)
    group('Quotation Management', () => {
      const quotationData = generateQuotationData();
      
      const quotationStart = Date.now();
      const quotationResponse = http.post(
        `${BASE_URL}/api/quotations`,
        JSON.stringify(quotationData),
        { headers }
      );
      const quotationEnd = Date.now();
      
      quotationDuration.add(quotationEnd - quotationStart);
      quotationRequests.add(1);
      
      const quotationSuccess = check(quotationResponse, {
        'quotation created successfully': (r) => r.status === 201,
        'quotation has Indonesian format': (r) => {
          const data = r.json();
          return data.currency === 'IDR' && data.amount !== undefined;
        },
        'quotation response time acceptable': (r) => r.timings.duration < 2000,
      });
      
      if (!quotationSuccess) {
        errorRate.add(1);
      }
      
      // Test materai calculation for this quotation
      if (quotationResponse.status === 201) {
        const quotationId = quotationResponse.json('id');
        
        group('Materai Calculation', () => {
          const materaiStart = Date.now();
          const materaiResponse = http.get(
            `${BASE_URL}/api/materai/calculate?amount=${quotationData.amount}`,
            { headers }
          );
          const materaiEnd = Date.now();
          
          materaiDuration.add(materaiEnd - materaiStart);
          materaiCalculations.add(1);
          
          const materaiSuccess = check(materaiResponse, {
            'materai calculation successful': (r) => r.status === 200,
            'materai calculation correct': (r) => {
              const data = r.json();
              const required = quotationData.amount >= 5000000;
              return data.required === required;
            },
            'materai response time fast': (r) => r.timings.duration < 500,
          });
          
          if (!materaiSuccess) {
            errorRate.add(1);
          }
        });
        
        // Test quotation to invoice conversion
        group('Invoice Generation', () => {
          const invoiceData = {
            quotationId: quotationId,
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            paymentTerms: 'Net 14 days',
            notes: 'Terima kasih atas kepercayaan Anda'
          };
          
          const invoiceStart = Date.now();
          const invoiceResponse = http.post(
            `${BASE_URL}/api/invoices/from-quotation`,
            JSON.stringify(invoiceData),
            { headers }
          );
          const invoiceEnd = Date.now();
          
          invoiceDuration.add(invoiceEnd - invoiceStart);
          invoiceGenerations.add(1);
          
          const invoiceSuccess = check(invoiceResponse, {
            'invoice generated successfully': (r) => r.status === 201,
            'invoice inherits quotation data': (r) => {
              const data = r.json();
              return data.amount === quotationData.amount && data.currency === 'IDR';
            },
            'invoice generation time acceptable': (r) => r.timings.duration < 1500,
          });
          
          if (!invoiceSuccess) {
            errorRate.add(1);
          }
        });
      }
    });
    
    // Test 2: Dashboard and Analytics (Business Intelligence)
    group('Dashboard Performance', () => {
      const dashboardResponse = http.get(`${BASE_URL}/api/dashboard/stats`, { headers });
      
      check(dashboardResponse, {
        'dashboard loads successfully': (r) => r.status === 200,
        'dashboard response time good': (r) => r.timings.duration < 1000,
        'dashboard has Indonesian business metrics': (r) => {
          const data = r.json();
          return data.currency === 'IDR';
        },
      });
      
      if (dashboardResponse.status !== 200) {
        errorRate.add(1);
      }
    });
    
    // Test 3: Search and Filtering (User Experience)
    group('Search Performance', () => {
      const searchQueries = ['Budi', 'Invoice', 'Quotation', 'PT'];
      const query = getRandomItem(searchQueries);
      
      const searchResponse = http.get(
        `${BASE_URL}/api/search?q=${query}&lang=id`,
        { headers }
      );
      
      check(searchResponse, {
        'search executes successfully': (r) => r.status === 200,
        'search response time fast': (r) => r.timings.duration < 800,
        'search supports Indonesian': (r) => r.headers['Content-Language'] === 'id-ID',
      });
      
      if (searchResponse.status !== 200) {
        errorRate.add(1);
      }
    });
    
    // Test 4: PDF Generation (Document Export)
    group('PDF Generation', () => {
      // This would test PDF generation for invoices with Indonesian formatting
      const pdfResponse = http.get(`${BASE_URL}/api/invoices/1/pdf?lang=id`, { headers });
      
      check(pdfResponse, {
        'PDF generation successful': (r) => r.status === 200,
        'PDF has correct content type': (r) => r.headers['Content-Type'] === 'application/pdf',
        'PDF generation time acceptable': (r) => r.timings.duration < 3000,
      });
      
      if (pdfResponse.status !== 200) {
        errorRate.add(1);
      }
    });
    
    // Test 5: WhatsApp Integration Endpoint
    group('WhatsApp Integration', () => {
      const whatsappData = {
        clientPhone: '+6281234567890',
        message: 'Selamat pagi Bapak, kami ingin mengirimkan invoice terbaru.',
        template: 'invoice_notification'
      };
      
      const whatsappResponse = http.post(
        `${BASE_URL}/api/whatsapp/send`,
        JSON.stringify(whatsappData),
        { headers }
      );
      
      check(whatsappResponse, {
        'WhatsApp integration responds': (r) => r.status === 200 || r.status === 202,
        'WhatsApp response time good': (r) => r.timings.duration < 2000,
      });
      
      if (![200, 202].includes(whatsappResponse.status)) {
        errorRate.add(1);
      }
    });
  });
  
  // Simulate Indonesian business user behavior
  // Pause between operations (Indonesian business users typically work at moderate pace)
  sleep(Math.random() * 3 + 1); // 1-4 seconds pause
}

// Setup function (runs once per VU)
export function setup() {
  console.log('🇮🇩 Starting Indonesian Business Management System Load Test');
  console.log(`Target API: ${BASE_URL}`);
  console.log(`Target Frontend: ${FRONTEND_URL}`);
  console.log('Indonesian Business Scenarios: Quotation → Invoice → Materai');
  
  // Verify system is ready
  const healthResponse = http.get(`${BASE_URL}/health`);
  if (healthResponse.status !== 200) {
    throw new Error('System health check failed');
  }
  
  return {
    startTime: Date.now(),
    testConfig: {
      region: 'Indonesia',
      currency: 'IDR',
      timezone: 'Asia/Jakarta',
      business_hours: '08:00-17:00 WIB'
    }
  };
}

// Teardown function (runs once after all VUs finish)
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`🇮🇩 Indonesian Business Load Test completed in ${duration}s`);
  console.log('✅ Quotation-to-Invoice workflow tested');
  console.log('✅ Materai calculation performance validated');
  console.log('✅ Indonesian business scenarios covered');
  console.log('✅ WhatsApp integration performance tested');
}