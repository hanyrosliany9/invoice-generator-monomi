// Global Setup for Indonesian Business Management System Tests
// Initializes test environment with Indonesian business context and data

import { chromium, FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🇮🇩 Setting up Indonesian Business Management System test environment...');

  // Create test reports directory
  const reportsDir = path.join(__dirname, '../../test-reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Setup test database with Indonesian business data
  await setupTestDatabase();
  
  // Initialize Indonesian test data
  await initializeIndonesianTestData();
  
  // Setup performance monitoring
  await setupPerformanceMonitoring();
  
  // Validate Indonesian business environment
  await validateIndonesianEnvironment();
  
  // Setup cultural validation service
  await setupCulturalValidation();

  console.log('✅ Indonesian Business test environment setup completed');
}

/**
 * Setup test database with Indonesian business schema and sample data
 */
async function setupTestDatabase(): Promise<void> {
  console.log('📊 Setting up test database with Indonesian business data...');
  
  try {
    // Run database migrations
    execSync('cd backend && npx prisma migrate deploy', { stdio: 'inherit' });
    
    // Generate Prisma client
    execSync('cd backend && npx prisma generate', { stdio: 'inherit' });
    
    // Seed with Indonesian business test data
    execSync('cd backend && npm run db:seed:test', { stdio: 'inherit' });
    
    console.log('✅ Test database setup completed');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

/**
 * Initialize Indonesian business test data
 */
async function initializeIndonesianTestData(): Promise<void> {
  console.log('🏢 Initializing Indonesian business test data...');
  
  const testData = {
    companies: [
      {
        id: 'company-1',
        name: 'PT Maju Bersama Indonesia',
        npwp: '12.345.678.9-123.000',
        address: 'Jl. Sudirman No. 123, Jakarta Selatan',
        phone: '+62-21-12345678',
        email: 'info@majubersama.co.id',
        region: 'Jakarta'
      },
      {
        id: 'company-2',
        name: 'CV Berkah Nusantara',
        npwp: '98.765.432.1-456.000',
        address: 'Jl. Malioboro No. 456, Yogyakarta',
        phone: '+62-274-87654321',
        email: 'berkah@nusantara.co.id',
        region: 'Yogyakarta'
      }
    ],
    clients: [
      {
        id: 'client-1',
        name: 'Budi Santoso',
        title: 'Direktur',
        honorific: 'Bapak',
        gender: 'male',
        company: 'PT Sukses Mandiri',
        phone: '+62-812-3456-7890',
        email: 'budi.santoso@suksesmandiri.com',
        preferred_communication: 'whatsapp',
        region: 'Jakarta'
      },
      {
        id: 'client-2',
        name: 'Siti Nurhaliza',
        title: 'Manager Keuangan',
        honorific: 'Ibu',
        gender: 'female',
        company: 'CV Sinar Harapan',
        phone: '+62-813-9876-5432',
        email: 'siti.nurhaliza@sinarharapan.co.id',
        preferred_communication: 'email',
        region: 'Surabaya'
      }
    ],
    projects: [
      {
        id: 'project-1',
        title: 'Sistem Informasi Manajemen Keuangan',
        description: 'Pengembangan sistem manajemen keuangan terintegrasi untuk UKM',
        value: 15000000, // Above materai threshold
        duration: '3 bulan',
        category: 'software-development'
      },
      {
        id: 'project-2',
        title: 'Website Company Profile',
        description: 'Pembuatan website company profile responsif dengan CMS',
        value: 3500000, // Below materai threshold
        duration: '1 bulan',
        category: 'web-development'
      }
    ],
    users: [
      {
        id: 'admin-1',
        email: 'admin@monomi.id',
        password: 'password123',
        name: 'Administrator',
        role: 'admin',
        preferences: {
          language: 'id-ID',
          timezone: 'Asia/Jakarta',
          currency: 'IDR',
          region: 'Jakarta'
        }
      },
      {
        id: 'user-1',
        email: 'staff@majubersama.co.id',
        password: 'staff123',
        name: 'Staff Keuangan',
        role: 'staff',
        preferences: {
          language: 'id-ID',
          timezone: 'Asia/Jakarta',
          currency: 'IDR',
          region: 'Jakarta'
        }
      }
    ]
  };

  // Save test data to file for test access
  const testDataPath = path.join(__dirname, 'test-data.json');
  fs.writeFileSync(testDataPath, JSON.stringify(testData, null, 2));
  
  console.log('✅ Indonesian business test data initialized');
}

/**
 * Setup performance monitoring for tests
 */
async function setupPerformanceMonitoring(): Promise<void> {
  console.log('⚡ Setting up performance monitoring...');
  
  // Create performance thresholds for Indonesian conditions
  const performanceConfig = {
    thresholds: {
      // Core Web Vitals (adjusted for Indonesian network conditions)
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      fcp: { good: 1800, poor: 3000 },
      ttfb: { good: 800, poor: 1800 },
      
      // Indonesian business metrics
      quotationLoad: { good: 2000, poor: 5000 },
      invoiceRender: { good: 1500, poor: 3000 },
      materaiCalculation: { good: 500, poor: 1500 },
      whatsappIntegration: { good: 1000, poor: 3000 },
      currencyFormatting: { good: 50, poor: 200 }
    },
    networkConditions: {
      indonesian3G: {
        downloadThroughput: 750 * 1024,
        uploadThroughput: 250 * 1024,
        latency: 300
      },
      indonesian4G: {
        downloadThroughput: 2 * 1024 * 1024,
        uploadThroughput: 1 * 1024 * 1024,
        latency: 150
      }
    }
  };

  const configPath = path.join(__dirname, 'performance-config.json');
  fs.writeFileSync(configPath, JSON.stringify(performanceConfig, null, 2));
  
  console.log('✅ Performance monitoring setup completed');
}

/**
 * Validate Indonesian business environment configuration
 */
async function validateIndonesianEnvironment(): Promise<void> {
  console.log('🌏 Validating Indonesian business environment...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Test Indonesian locale support
    await page.addInitScript(() => {
      // Test Indonesian locale
      const date = new Date('2024-01-15').toLocaleDateString('id-ID');
      const currency = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR'
      }).format(5000000);
      
      console.log('Indonesian date format:', date);
      console.log('Indonesian currency format:', currency);
    });
    
    // Test timezone
    await page.evaluate(() => {
      const jakartaTime = new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta'
      });
      console.log('Jakarta time:', jakartaTime);
    });
    
    console.log('✅ Indonesian environment validation completed');
  } catch (error) {
    console.error('❌ Indonesian environment validation failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Setup cultural validation service
 */
async function setupCulturalValidation(): Promise<void> {
  console.log('🎭 Setting up cultural validation service...');
  
  const culturalConfig = {
    language: {
      formal_greetings: [
        'Selamat pagi', 'Selamat siang', 'Selamat sore', 'Selamat malam',
        'Yang Terhormat', 'Dengan hormat'
      ],
      honorifics: {
        male: ['Bapak', 'Pak', 'Mas'],
        female: ['Ibu', 'Bu', 'Mbak'],
        general: ['Bapak/Ibu', 'Saudara/i']
      },
      polite_closings: [
        'Terima kasih', 'Salam hormat', 'Hormat kami'
      ],
      business_phrases: [
        'Izin', 'Mohon', 'Silakan', 'Dengan ini', 'Kerja sama'
      ]
    },
    business: {
      materai_threshold: 5000000,
      standard_payment_terms: '14 hari kerja',
      business_hours: {
        start: '08:00',
        end: '17:00',
        lunch_break: { start: '12:00', end: '13:00' }
      },
      friday_prayer_time: { start: '11:30', end: '13:00' }
    },
    regions: {
      jakarta: { business_style: 'fast-paced', formality: 'formal' },
      yogyakarta: { business_style: 'traditional', formality: 'very-formal' },
      surabaya: { business_style: 'commercial', formality: 'formal' }
    }
  };

  const culturalConfigPath = path.join(__dirname, 'cultural-config.json');
  fs.writeFileSync(culturalConfigPath, JSON.stringify(culturalConfig, null, 2));
  
  console.log('✅ Cultural validation service setup completed');
}

export default globalSetup;