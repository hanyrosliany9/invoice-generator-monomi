import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Hash password for test users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@monomi.id' },
    update: {},
    create: {
      email: 'admin@monomi.id',
      password: hashedPassword,
      name: 'Admin Sistem',
      role: 'ADMIN',
    },
  });

  // Create regular user
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@bisnis.co.id' },
    update: {},
    create: {
      email: 'user@bisnis.co.id',
      password: hashedPassword,
      name: 'User Bisnis',
      role: 'USER',
    },
  });

  console.log('👤 Users created:', { adminUser: adminUser.email, regularUser: regularUser.email });

  // Create test clients
  const client1 = await prisma.client.upsert({
    where: { id: 'client-1' },
    update: {},
    create: {
      id: 'client-1',
      name: 'PT Teknologi Maju',
      email: 'info@teknologimaju.co.id',
      phone: '021-1234567',
      address: 'Jl. Sudirman No. 123, Jakarta Pusat 10270',
      company: 'PT Teknologi Maju',
      contactPerson: 'Budi Santoso',
      paymentTerms: 'NET 30',
    },
  });

  const client2 = await prisma.client.upsert({
    where: { id: 'client-2' },
    update: {},
    create: {
      id: 'client-2',
      name: 'CV Kreatif Digital',
      email: 'hello@kreatifdigital.com',
      phone: '021-9876543',
      address: 'Jl. Gatot Subroto No. 456, Jakarta Selatan 12930',
      company: 'CV Kreatif Digital',
      contactPerson: 'Sari Dewi',
      paymentTerms: 'NET 14',
    },
  });

  const client3 = await prisma.client.upsert({
    where: { id: 'client-3' },
    update: {},
    create: {
      id: 'client-3',
      name: 'Toko Mandiri Sejahtera',
      email: 'owner@mandirisejahtera.com',
      phone: '021-5555678',
      address: 'Jl. Thamrin No. 789, Jakarta Pusat 10340',
      company: 'Toko Mandiri Sejahtera',
      contactPerson: 'Ahmad Wijaya',
      paymentTerms: 'NET 21',
    },
  });

  console.log('🏢 Clients created:', { 
    client1: client1.name, 
    client2: client2.name, 
    client3: client3.name 
  });

  // Create project type configurations
  const projectTypeProduction = await prisma.projectTypeConfig.upsert({
    where: { code: 'PRODUCTION' },
    update: {},
    create: {
      code: 'PRODUCTION',
      name: 'Production Work',
      description: 'Website development, software development, and other production tasks',
      prefix: 'PH',
      color: '#52c41a',
      isDefault: true,
      sortOrder: 1,
    },
  });

  const projectTypeSocialMedia = await prisma.projectTypeConfig.upsert({
    where: { code: 'SOCIAL_MEDIA' },
    update: {},
    create: {
      code: 'SOCIAL_MEDIA',
      name: 'Social Media Management',
      description: 'Content creation, social media management, and digital marketing',
      prefix: 'SM',
      color: '#1890ff',
      isDefault: false,
      sortOrder: 2,
    },
  });

  const projectTypeConsultation = await prisma.projectTypeConfig.upsert({
    where: { code: 'CONSULTATION' },
    update: {},
    create: {
      code: 'CONSULTATION',
      name: 'Consultation Services',
      description: 'Business consultation, technical consultation, and advisory services',
      prefix: 'CS',
      color: '#722ed1',
      isDefault: false,
      sortOrder: 3,
    },
  });

  const projectTypeMaintenance = await prisma.projectTypeConfig.upsert({
    where: { code: 'MAINTENANCE' },
    update: {},
    create: {
      code: 'MAINTENANCE',
      name: 'Maintenance & Support',
      description: 'System maintenance, bug fixes, and technical support',
      prefix: 'MT',
      color: '#fa8c16',
      isDefault: false,
      sortOrder: 4,
    },
  });

  const projectTypeOther = await prisma.projectTypeConfig.upsert({
    where: { code: 'OTHER' },
    update: {},
    create: {
      code: 'OTHER',
      name: 'Other Services',
      description: 'Miscellaneous services and custom projects',
      prefix: 'OT',
      color: '#595959',
      isDefault: false,
      sortOrder: 5,
    },
  });

  console.log('📝 Project types created:', {
    production: projectTypeProduction.code,
    socialMedia: projectTypeSocialMedia.code,
    consultation: projectTypeConsultation.code,
    maintenance: projectTypeMaintenance.code,
    other: projectTypeOther.code,
  });

  // Create test projects
  const project1 = await prisma.project.upsert({
    where: { id: 'project-1' },
    update: {},
    create: {
      id: 'project-1',
      number: 'PRJ-PH-202501-001',
      description: 'Pembuatan Website E-commerce',
      output: 'Website e-commerce lengkap dengan dashboard admin, sistem pembayaran, dan mobile responsive',
      projectTypeId: projectTypeProduction.id,
      clientId: client1.id,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-03-31'),
      estimatedBudget: 75000000,
      basePrice: 75000000,
      priceBreakdown: {
        design: 15000000,
        development: 45000000,
        testing: 10000000,
        deployment: 5000000
      },
      status: 'IN_PROGRESS',
    },
  });

  const project2 = await prisma.project.upsert({
    where: { id: 'project-2' },
    update: {},
    create: {
      id: 'project-2',
      number: 'PRJ-SM-202501-001',
      description: 'Konten Media Sosial Januari-Maret',
      output: 'Konten Instagram, Facebook, dan TikTok untuk 3 bulan (90 post + 30 stories)',
      projectTypeId: projectTypeSocialMedia.id,
      clientId: client2.id,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-03-31'),
      estimatedBudget: 15000000,
      basePrice: 15000000,
      priceBreakdown: {
        contentCreation: 10000000,
        scheduling: 3000000,
        reporting: 2000000
      },
      status: 'IN_PROGRESS',
    },
  });

  const project3 = await prisma.project.upsert({
    where: { id: 'project-3' },
    update: {},
    create: {
      id: 'project-3',
      number: 'PRJ-PH-202501-002',
      description: 'Sistem Inventory Management',
      output: 'Aplikasi desktop untuk manajemen stok, laporan penjualan, dan integrasi barcode',
      projectTypeId: projectTypeProduction.id,
      clientId: client3.id,
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-05-31'),
      estimatedBudget: 120000000,
      basePrice: 120000000,
      priceBreakdown: {
        analysis: 20000000,
        development: 80000000,
        testing: 15000000,
        training: 5000000
      },
      status: 'PLANNING',
    },
  });

  console.log('📋 Projects created:', { 
    project1: project1.number, 
    project2: project2.number, 
    project3: project3.number 
  });

  // Create test quotations
  const quotation1 = await prisma.quotation.upsert({
    where: { id: 'quotation-1' },
    update: {},
    create: {
      id: 'quotation-1',
      quotationNumber: 'QT-202501-001',
      date: new Date('2025-01-05'),
      validUntil: new Date('2025-01-20'),
      clientId: client1.id,
      projectId: project1.id,
      amountPerProject: 75000000,
      totalAmount: 75000000,
      terms: 'Pembayaran dapat dilakukan dalam 3 termin:\n- 30% setelah kontrak ditandatangani\n- 40% setelah development selesai\n- 30% setelah testing dan deployment',
      status: 'APPROVED',
      createdBy: adminUser.id,
    },
  });

  const quotation2 = await prisma.quotation.upsert({
    where: { id: 'quotation-2' },
    update: {},
    create: {
      id: 'quotation-2',
      quotationNumber: 'QT-202501-002',
      date: new Date('2025-01-06'),
      validUntil: new Date('2025-01-21'),
      clientId: client2.id,
      projectId: project2.id,
      amountPerProject: 15000000,
      totalAmount: 15000000,
      terms: 'Pembayaran bulanan di awal bulan.\nRevisi unlimited selama periode kontrak.',
      status: 'APPROVED',
      createdBy: adminUser.id,
    },
  });

  const quotation3 = await prisma.quotation.upsert({
    where: { id: 'quotation-3' },
    update: {},
    create: {
      id: 'quotation-3',
      quotationNumber: 'QT-202501-003',
      date: new Date('2025-01-07'),
      validUntil: new Date('2025-01-22'),
      clientId: client3.id,
      projectId: project3.id,
      amountPerProject: 120000000,
      totalAmount: 120000000,
      terms: 'Pembayaran bertahap:\n- 40% setelah kontrak\n- 30% setelah analisis dan design\n- 20% setelah development\n- 10% setelah testing dan training',
      status: 'SENT',
      createdBy: adminUser.id,
    },
  });

  console.log('💼 Quotations created:', { 
    quotation1: quotation1.quotationNumber, 
    quotation2: quotation2.quotationNumber, 
    quotation3: quotation3.quotationNumber 
  });

  // Create test invoices from approved quotations
  const invoice1 = await prisma.invoice.upsert({
    where: { id: 'invoice-1' },
    update: {},
    create: {
      id: 'invoice-1',
      invoiceNumber: 'INV-202501-001',
      creationDate: new Date('2025-01-10'),
      dueDate: new Date('2025-02-09'),
      quotationId: quotation1.id,
      clientId: client1.id,
      projectId: project1.id,
      amountPerProject: 75000000,
      totalAmount: 75000000,
      paymentInfo: 'Bank BCA: 1234567890 a.n. Sistem Manajemen Bisnis\nBank Mandiri: 0987654321 a.n. Sistem Manajemen Bisnis\nBank BNI: 1122334455 a.n. Sistem Manajemen Bisnis',
      materaiRequired: true,
      materaiApplied: true,
      terms: 'Pembayaran dapat dilakukan dalam 3 termin:\n- 30% setelah kontrak ditandatangani\n- 40% setelah development selesai\n- 30% setelah testing dan deployment',
      status: 'SENT',
      createdBy: adminUser.id,
    },
  });

  const invoice2 = await prisma.invoice.upsert({
    where: { id: 'invoice-2' },
    update: {},
    create: {
      id: 'invoice-2',
      invoiceNumber: 'INV-202501-002',
      creationDate: new Date('2025-01-11'),
      dueDate: new Date('2025-02-10'),
      quotationId: quotation2.id,
      clientId: client2.id,
      projectId: project2.id,
      amountPerProject: 15000000,
      totalAmount: 15000000,
      paymentInfo: 'Bank BCA: 1234567890 a.n. Sistem Manajemen Bisnis\nBank Mandiri: 0987654321 a.n. Sistem Manajemen Bisnis\nBank BNI: 1122334455 a.n. Sistem Manajemen Bisnis',
      materaiRequired: true,
      materaiApplied: false,
      terms: 'Pembayaran bulanan di awal bulan.\nRevisi unlimited selama periode kontrak.',
      status: 'PAID',
      createdBy: adminUser.id,
    },
  });

  // Create standalone invoice (without quotation)
  const invoice3 = await prisma.invoice.upsert({
    where: { id: 'invoice-3' },
    update: {},
    create: {
      id: 'invoice-3',
      invoiceNumber: 'INV-202501-003',
      creationDate: new Date('2025-01-12'),
      dueDate: new Date('2025-02-11'),
      clientId: client1.id,
      projectId: project1.id,
      amountPerProject: 2500000,
      totalAmount: 2500000,
      paymentInfo: 'Bank BCA: 1234567890 a.n. Sistem Manajemen Bisnis\nBank Mandiri: 0987654321 a.n. Sistem Manajemen Bisnis',
      materaiRequired: false,
      materaiApplied: false,
      terms: 'Pembayaran tambahan untuk fitur ekstra yang diminta klien.',
      status: 'DRAFT',
      createdBy: regularUser.id,
    },
  });

  console.log('🧾 Invoices created:', { 
    invoice1: invoice1.invoiceNumber, 
    invoice2: invoice2.invoiceNumber, 
    invoice3: invoice3.invoiceNumber 
  });

  // Create test payments
  const payment1 = await prisma.payment.upsert({
    where: { id: 'payment-1' },
    update: {},
    create: {
      id: 'payment-1',
      invoiceId: invoice2.id,
      amount: 15000000,
      paymentDate: new Date('2025-01-15'),
      paymentMethod: 'BANK_TRANSFER',
      transactionRef: 'TRX-20250115-001',
      bankDetails: 'Transfer dari Bank BCA rekening 9876543210 a.n. CV Kreatif Digital',
      status: 'CONFIRMED',
      confirmedAt: new Date('2025-01-15'),
    },
  });

  console.log('💳 Payments created:', { 
    payment1: payment1.transactionRef 
  });

  // Create audit logs
  await prisma.auditLog.createMany({
    data: [
      {
        action: 'CREATE',
        entityType: 'quotation',
        entityId: quotation1.id,
        oldValues: undefined,
        newValues: {
          quotationNumber: quotation1.quotationNumber,
          status: 'DRAFT',
          totalAmount: quotation1.totalAmount,
        },
        userId: adminUser.id,
        ipAddress: '127.0.0.1',
        userAgent: 'Seed Script',
      },
      {
        action: 'UPDATE',
        entityType: 'quotation',
        entityId: quotation1.id,
        oldValues: { status: 'DRAFT' },
        newValues: { status: 'APPROVED' },
        userId: adminUser.id,
        ipAddress: '127.0.0.1',
        userAgent: 'Seed Script',
      },
      {
        action: 'CREATE',
        entityType: 'invoice',
        entityId: invoice1.id,
        oldValues: undefined,
        newValues: {
          invoiceNumber: invoice1.invoiceNumber,
          status: 'DRAFT',
          totalAmount: invoice1.totalAmount,
        },
        userId: adminUser.id,
        ipAddress: '127.0.0.1',
        userAgent: 'Seed Script',
      },
      {
        action: 'UPDATE',
        entityType: 'invoice',
        entityId: invoice2.id,
        oldValues: { status: 'SENT' },
        newValues: { status: 'PAID' },
        userId: adminUser.id,
        ipAddress: '127.0.0.1',
        userAgent: 'Seed Script',
      },
    ],
  });

  console.log('📋 Audit logs created');

  console.log('✅ Database seeding completed successfully!');
  console.log('\n🔑 Test Credentials:');
  console.log('Admin: admin@monomi.id / password123');
  console.log('User: user@bisnis.co.id / password123');
  
  console.log('\n📊 Test Data Summary:');
  console.log(`- ${3} clients created`);
  console.log(`- ${3} projects created`);
  console.log(`- ${3} quotations created (2 approved, 1 sent)`);
  console.log(`- ${3} invoices created (1 draft, 1 sent, 1 paid)`);
  console.log(`- ${1} payment recorded`);
  console.log(`- ${4} audit log entries created`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error during seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });