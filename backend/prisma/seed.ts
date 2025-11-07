import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Cleanup: Delete data in reverse order of foreign key dependencies
  console.log('🧹 Cleaning up existing seed data...');
  try {
    // Delete in specific order to avoid FK constraints
    await prisma.auditLog.deleteMany({});
    await prisma.expenseApprovalHistory.deleteMany({});
    await prisma.expenseComment.deleteMany({});
    await prisma.expense.deleteMany({});
    await prisma.expenseBudget.deleteMany({});
    await prisma.assetReservation.deleteMany({});
    await prisma.projectEquipmentUsage.deleteMany({});
    await prisma.projectCostAllocation.deleteMany({});
    await prisma.workInProgress.deleteMany({});
    await prisma.projectMilestone.deleteMany({});
    await prisma.projectTeamMember.deleteMany({});
    await prisma.laborEntry.deleteMany({});
    await prisma.purchaseOrder.deleteMany({});
    await prisma.journalEntry.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.quotation.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.asset.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.chartOfAccounts.deleteMany({});
    await prisma.expenseCategory.deleteMany({});
    await prisma.fiscalPeriod.deleteMany({});
    await prisma.businessJourneyEvent.deleteMany({});
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.warn('⚠️  Cleanup encountered issues (may be first run):', (error as any).message);
  }

  // Hash passwords for test users
  const hashedPasswordLegacy = await bcrypt.hash('password123', 10);
  const hashedPasswordNew = await bcrypt.hash('Test1234', 10);

  // Create legacy admin user (backward compatibility)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@monomi.id' },
    update: {},
    create: {
      email: 'admin@monomi.id',
      password: hashedPasswordLegacy,
      name: 'Admin Sistem (Legacy)',
      role: 'ADMIN',
      isActive: true,
    },
  });

  // Create legacy regular user (backward compatibility)
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@bisnis.co.id' },
    update: {},
    create: {
      email: 'user@bisnis.co.id',
      password: hashedPasswordLegacy,
      name: 'User Bisnis (Legacy)',
      role: 'USER',
      isActive: true,
    },
  });

  console.log('👤 Legacy users created:', {
    admin: adminUser.email,
    user: regularUser.email
  });

  // Create production role users (NEW RBAC SYSTEM)
  console.log('🔐 Creating RBAC test users...');

  const superAdminUser = await prisma.user.upsert({
    where: { email: 'super.admin@monomi.id' },
    update: {},
    create: {
      email: 'super.admin@monomi.id',
      password: hashedPasswordNew,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  const financeManagerUser = await prisma.user.upsert({
    where: { email: 'finance.manager@monomi.id' },
    update: {},
    create: {
      email: 'finance.manager@monomi.id',
      password: hashedPasswordNew,
      name: 'Finance Manager',
      role: 'FINANCE_MANAGER',
      isActive: true,
    },
  });

  const accountantUser = await prisma.user.upsert({
    where: { email: 'accountant@monomi.id' },
    update: {},
    create: {
      email: 'accountant@monomi.id',
      password: hashedPasswordNew,
      name: 'Accountant',
      role: 'ACCOUNTANT',
      isActive: true,
    },
  });

  const projectManagerUser = await prisma.user.upsert({
    where: { email: 'project.manager@monomi.id' },
    update: {},
    create: {
      email: 'project.manager@monomi.id',
      password: hashedPasswordNew,
      name: 'Project Manager',
      role: 'PROJECT_MANAGER',
      isActive: true,
    },
  });

  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@monomi.id' },
    update: {},
    create: {
      email: 'staff@monomi.id',
      password: hashedPasswordNew,
      name: 'Staff User',
      role: 'STAFF',
      isActive: true,
    },
  });

  const viewerUser = await prisma.user.upsert({
    where: { email: 'viewer@monomi.id' },
    update: {},
    create: {
      email: 'viewer@monomi.id',
      password: hashedPasswordNew,
      name: 'Viewer',
      role: 'VIEWER',
      isActive: true,
    },
  });

  console.log('🔐 RBAC users created:', {
    superAdmin: superAdminUser.email,
    financeManager: financeManagerUser.email,
    accountant: accountantUser.email,
    projectManager: projectManagerUser.email,
    staff: staffUser.email,
    viewer: viewerUser.email,
  });

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

  // Create Indonesian PSAK-compliant expense categories
  console.log('💰 Creating Indonesian expense categories...');

  // Beban Penjualan (Selling Expenses) - 6-1xxx
  const expenseCategorySelling = await prisma.expenseCategory.upsert({
    where: { code: 'SELLING_SALARIES' },
    update: {},
    create: {
      code: 'SELLING_SALARIES',
      accountCode: '6-1010',
      expenseClass: 'SELLING',
      name: 'Sales Salaries',
      nameId: 'Gaji Penjualan',
      description: 'Salaries and allowances for sales staff',
      descriptionId: 'Gaji dan tunjangan karyawan penjualan',
      icon: 'user',
      color: '#1890ff',
      defaultPPNRate: 0.00,
      isLuxuryGoods: false,
      withholdingTaxType: 'NONE',
      requiresEFaktur: false,
      sortOrder: 1,
    },
  });

  const expenseCategoryAdvertising = await prisma.expenseCategory.upsert({
    where: { code: 'ADVERTISING' },
    update: {},
    create: {
      code: 'ADVERTISING',
      accountCode: '6-1030',
      expenseClass: 'SELLING',
      name: 'Advertising & Promotion',
      nameId: 'Iklan dan Promosi',
      description: 'Advertising, promotion, and marketing costs',
      descriptionId: 'Biaya iklan, promosi, dan marketing',
      icon: 'sound',
      color: '#fa8c16',
      isBillable: true,
      sortOrder: 3,
    },
  });

  const expenseCategoryDigitalMarketing = await prisma.expenseCategory.upsert({
    where: { code: 'DIGITAL_MARKETING' },
    update: {},
    create: {
      code: 'DIGITAL_MARKETING',
      accountCode: '6-1070',
      expenseClass: 'SELLING',
      name: 'Digital Marketing',
      nameId: 'Marketing Digital',
      description: 'Online marketing costs (Google Ads, Facebook Ads, etc.)',
      descriptionId: 'Biaya marketing online (Google Ads, Facebook Ads, dll)',
      icon: 'global',
      color: '#eb2f96',
      isBillable: true,
      sortOrder: 7,
    },
  });

  // Beban Administrasi & Umum (General & Admin) - 6-2xxx
  const expenseCategoryOfficeRent = await prisma.expenseCategory.upsert({
    where: { code: 'OFFICE_RENT' },
    update: {},
    create: {
      code: 'OFFICE_RENT',
      accountCode: '6-2020',
      expenseClass: 'GENERAL_ADMIN',
      name: 'Office Rent',
      nameId: 'Sewa Kantor',
      description: 'Office building or space rental costs',
      descriptionId: 'Biaya sewa gedung/ruang kantor',
      icon: 'home',
      color: '#52c41a',
      withholdingTaxType: 'PPH4_2',
      withholdingTaxRate: 0.10,
      sortOrder: 20,
    },
  });

  const expenseCategoryUtilities = await prisma.expenseCategory.upsert({
    where: { code: 'UTILITIES' },
    update: {},
    create: {
      code: 'UTILITIES',
      accountCode: '6-2030',
      expenseClass: 'GENERAL_ADMIN',
      name: 'Electricity & Water',
      nameId: 'Listrik dan Air',
      description: 'Electricity, water, and office utilities',
      descriptionId: 'Biaya listrik, air, dan utilitas kantor',
      icon: 'bulb',
      color: '#faad14',
      sortOrder: 30,
    },
  });

  const expenseCategoryOfficeSupplies = await prisma.expenseCategory.upsert({
    where: { code: 'OFFICE_SUPPLIES' },
    update: {},
    create: {
      code: 'OFFICE_SUPPLIES',
      accountCode: '6-2050',
      expenseClass: 'GENERAL_ADMIN',
      name: 'Office Supplies',
      nameId: 'Perlengkapan Kantor',
      description: 'Stationery and office supplies',
      descriptionId: 'Biaya alat tulis dan perlengkapan kantor',
      icon: 'file',
      color: '#2f54eb',
      sortOrder: 50,
    },
  });

  const expenseCategoryProfessionalServices = await prisma.expenseCategory.upsert({
    where: { code: 'PROFESSIONAL_SERVICES' },
    update: {},
    create: {
      code: 'PROFESSIONAL_SERVICES',
      accountCode: '6-2070',
      expenseClass: 'GENERAL_ADMIN',
      name: 'Professional Services',
      nameId: 'Jasa Profesional',
      description: 'Professional services (accountants, auditors, etc.)',
      descriptionId: 'Biaya jasa profesional (akuntan, auditor, dll)',
      icon: 'solution',
      color: '#eb2f96',
      withholdingTaxType: 'PPH23',
      withholdingTaxRate: 0.02,
      isBillable: true,
      sortOrder: 70,
    },
  });

  const expenseCategorySoftware = await prisma.expenseCategory.upsert({
    where: { code: 'SOFTWARE' },
    update: {},
    create: {
      code: 'SOFTWARE',
      accountCode: '6-2130',
      expenseClass: 'GENERAL_ADMIN',
      name: 'Software & Licenses',
      nameId: 'Software dan Lisensi',
      description: 'Software, SaaS, and license costs',
      descriptionId: 'Biaya software, SaaS, dan lisensi',
      icon: 'cloud',
      color: '#2f54eb',
      sortOrder: 130,
    },
  });

  const expenseCategoryBankCharges = await prisma.expenseCategory.upsert({
    where: { code: 'BANK_CHARGES' },
    update: {},
    create: {
      code: 'BANK_CHARGES',
      accountCode: '6-2160',
      expenseClass: 'GENERAL_ADMIN',
      name: 'Bank Charges',
      nameId: 'Biaya Bank',
      description: 'Bank administration and service fees',
      descriptionId: 'Biaya administrasi dan layanan bank',
      icon: 'transaction',
      color: '#faad14',
      defaultPPNRate: 0.00,
      withholdingTaxType: 'NONE',
      requiresEFaktur: false,
      sortOrder: 160,
    },
  });

  // Labor Costs (for Team & Resources Management)
  const expenseCategoryLaborCosts = await prisma.expenseCategory.upsert({
    where: { code: 'LABOR' },
    update: {},
    create: {
      code: 'LABOR',
      accountCode: '6-2010',
      expenseClass: 'LABOR_COST',
      name: 'Labor Costs',
      nameId: 'Biaya Tenaga Kerja',
      description: 'Labor and personnel costs generated from time tracking',
      descriptionId: 'Biaya tenaga kerja dan personel dari pelacakan waktu',
      icon: 'team',
      color: '#722ed1',
      defaultPPNRate: 0.00, // Labor costs are not subject to VAT
      withholdingTaxType: 'NONE',
      requiresEFaktur: false,
      sortOrder: 10,
    },
  });

  // Beban Lain-Lain (Other Expenses) - 8-xxxx
  const expenseCategoryMiscellaneous = await prisma.expenseCategory.upsert({
    where: { code: 'MISCELLANEOUS' },
    update: {},
    create: {
      code: 'MISCELLANEOUS',
      accountCode: '6-2190',
      expenseClass: 'GENERAL_ADMIN',
      name: 'Miscellaneous',
      nameId: 'Lain-Lain',
      description: 'Miscellaneous expenses',
      descriptionId: 'Biaya lain-lain',
      icon: 'more',
      color: '#8c8c8c',
      sortOrder: 190,
    },
  });

  console.log('💰 Expense categories created:', {
    selling: expenseCategorySelling.code,
    advertising: expenseCategoryAdvertising.code,
    digitalMarketing: expenseCategoryDigitalMarketing.code,
    officeRent: expenseCategoryOfficeRent.code,
    utilities: expenseCategoryUtilities.code,
    officeSupplies: expenseCategoryOfficeSupplies.code,
    professionalServices: expenseCategoryProfessionalServices.code,
    software: expenseCategorySoftware.code,
    bankCharges: expenseCategoryBankCharges.code,
    laborCosts: expenseCategoryLaborCosts.code,
    miscellaneous: expenseCategoryMiscellaneous.code,
  });

  // Create Chart of Accounts (Indonesian PSAK Standard)
  console.log('📊 Creating Chart of Accounts (Indonesian PSAK)...');

  // ASSETS (1-xxxx)
  // Cash & Bank (1-1xxx)
  const accountCash = await prisma.chartOfAccounts.upsert({
    where: { code: '1-1010' },
    update: {},
    create: {
      code: '1-1010',
      name: 'Cash',
      nameId: 'Kas',
      accountType: 'ASSET',
      accountSubType: 'CURRENT_ASSET',
      normalBalance: 'DEBIT',
      isControlAccount: true,
      isSystemAccount: true,
      currency: 'IDR',
      isCurrencyAccount: true,
      description: 'Cash on hand',
      descriptionId: 'Kas ditangan',
    },
  });

  const accountBank = await prisma.chartOfAccounts.upsert({
    where: { code: '1-1020' },
    update: {},
    create: {
      code: '1-1020',
      name: 'Bank Account',
      nameId: 'Rekening Bank',
      accountType: 'ASSET',
      accountSubType: 'CURRENT_ASSET',
      normalBalance: 'DEBIT',
      isControlAccount: true,
      isSystemAccount: true,
      currency: 'IDR',
      isCurrencyAccount: true,
      description: 'Bank accounts (BCA, Mandiri, BNI)',
      descriptionId: 'Rekening bank (BCA, Mandiri, BNI)',
    },
  });

  // USD Bank Account (Multi-Currency 2025)
  const accountBankUSD = await prisma.chartOfAccounts.upsert({
    where: { code: '1-1021' },
    update: {},
    create: {
      code: '1-1021',
      name: 'USD Bank Account',
      nameId: 'Rekening Bank USD',
      accountType: 'ASSET',
      accountSubType: 'CURRENT_ASSET',
      normalBalance: 'DEBIT',
      isControlAccount: false,
      isSystemAccount: false,
      currency: 'USD',
      isCurrencyAccount: true,
      description: 'USD denominated bank accounts',
      descriptionId: 'Rekening bank dalam mata uang USD',
    },
  });

  // USDT Crypto Wallet (Multi-Currency 2025)
  const accountCryptoUSDT = await prisma.chartOfAccounts.upsert({
    where: { code: '1-1022' },
    update: {},
    create: {
      code: '1-1022',
      name: 'USDT Crypto Wallet',
      nameId: 'Dompet Kripto USDT',
      accountType: 'ASSET',
      accountSubType: 'CURRENT_ASSET',
      normalBalance: 'DEBIT',
      isControlAccount: false,
      isSystemAccount: false,
      currency: 'USDT',
      isCurrencyAccount: true,
      description: 'USDT (Tether) cryptocurrency wallet - FASB ASU 2023-08 compliant',
      descriptionId: 'Dompet cryptocurrency USDT (Tether) - Sesuai FASB ASU 2023-08',
    },
  });

  // Accounts Receivable (1-2xxx)
  const accountReceivable = await prisma.chartOfAccounts.upsert({
    where: { code: '1-2010' },
    update: {},
    create: {
      code: '1-2010',
      name: 'Accounts Receivable',
      nameId: 'Piutang Usaha',
      accountType: 'ASSET',
      accountSubType: 'CURRENT_ASSET',
      normalBalance: 'DEBIT',
      isControlAccount: true,
      isSystemAccount: true,
      description: 'Accounts receivable from customers',
      descriptionId: 'Piutang dari pelanggan',
    },
  });

  // Prepaid Expenses (1-3xxx)
  const accountPrepaidExpenses = await prisma.chartOfAccounts.upsert({
    where: { code: '1-3010' },
    update: {},
    create: {
      code: '1-3010',
      name: 'Prepaid Expenses',
      nameId: 'Biaya Dibayar Dimuka',
      accountType: 'ASSET',
      accountSubType: 'CURRENT_ASSET',
      normalBalance: 'DEBIT',
      description: 'Prepaid rent, insurance, etc.',
      descriptionId: 'Sewa, asuransi, dll yang dibayar dimuka',
    },
  });

  // Fixed Assets (1-4xxx)
  const accountEquipment = await prisma.chartOfAccounts.upsert({
    where: { code: '1-4010' },
    update: {},
    create: {
      code: '1-4010',
      name: 'Equipment',
      nameId: 'Peralatan',
      accountType: 'ASSET',
      accountSubType: 'FIXED_ASSET',
      normalBalance: 'DEBIT',
      description: 'Computer equipment, furniture, etc.',
      descriptionId: 'Komputer, mebel, dll',
    },
  });

  const accountAccumulatedDepreciation = await prisma.chartOfAccounts.upsert({
    where: { code: '1-4020' },
    update: {},
    create: {
      code: '1-4020',
      name: 'Accumulated Depreciation',
      nameId: 'Akumulasi Penyusutan',
      accountType: 'ASSET',
      accountSubType: 'FIXED_ASSET',
      normalBalance: 'CREDIT',
      isSystemAccount: true,
      description: 'Accumulated depreciation on equipment (PSAK 16)',
      descriptionId: 'Akumulasi penyusutan peralatan (PSAK 16)',
    },
  });

  // Allowance for Doubtful Accounts (PSAK 71 - ECL)
  const accountAllowanceDoubtful = await prisma.chartOfAccounts.upsert({
    where: { code: '1-2015' },
    update: {},
    create: {
      code: '1-2015',
      name: 'Allowance for Doubtful Accounts',
      nameId: 'Penyisihan Piutang Tak Tertagih',
      accountType: 'ASSET',
      accountSubType: 'CURRENT_ASSET',
      normalBalance: 'CREDIT',
      isSystemAccount: true,
      description: 'Expected credit loss provision for accounts receivable (PSAK 71)',
      descriptionId: 'Penyisihan kerugian kredit ekspektasian untuk piutang usaha (PSAK 71)',
    },
  });

  // LIABILITIES (2-xxxx)
  // Accounts Payable (2-1xxx)
  const accountPayable = await prisma.chartOfAccounts.upsert({
    where: { code: '2-1010' },
    update: {},
    create: {
      code: '2-1010',
      name: 'Accounts Payable',
      nameId: 'Hutang Usaha',
      accountType: 'LIABILITY',
      accountSubType: 'CURRENT_LIABILITY',
      normalBalance: 'CREDIT',
      isControlAccount: true,
      isSystemAccount: true,
      description: 'Accounts payable to vendors',
      descriptionId: 'Hutang kepada vendor',
    },
  });

  // Tax Payable (2-2xxx)
  const accountPPNPayable = await prisma.chartOfAccounts.upsert({
    where: { code: '2-2010' },
    update: {},
    create: {
      code: '2-2010',
      name: 'PPN Payable',
      nameId: 'Hutang PPN',
      accountType: 'LIABILITY',
      accountSubType: 'CURRENT_LIABILITY',
      normalBalance: 'CREDIT',
      isTaxAccount: true,
      taxType: 'PPN_OUT',
      isSystemAccount: true,
      description: 'VAT payable to tax authority',
      descriptionId: 'PPN yang harus dibayar ke DJP',
    },
  });

  const accountPPhPayable = await prisma.chartOfAccounts.upsert({
    where: { code: '2-2020' },
    update: {},
    create: {
      code: '2-2020',
      name: 'PPh Payable',
      nameId: 'Hutang PPh',
      accountType: 'LIABILITY',
      accountSubType: 'CURRENT_LIABILITY',
      normalBalance: 'CREDIT',
      isTaxAccount: true,
      taxType: 'PPH23',
      isSystemAccount: true,
      description: 'Withholding tax payable',
      descriptionId: 'PPh yang harus dibayar',
    },
  });

  // EQUITY (3-xxxx)
  const accountCapital = await prisma.chartOfAccounts.upsert({
    where: { code: '3-1010' },
    update: {},
    create: {
      code: '3-1010',
      name: 'Owner Capital',
      nameId: 'Modal Pemilik',
      accountType: 'EQUITY',
      accountSubType: 'CAPITAL',
      normalBalance: 'CREDIT',
      isSystemAccount: true,
      description: 'Owner\'s capital investment',
      descriptionId: 'Modal yang disetorkan pemilik',
    },
  });

  const accountRetainedEarnings = await prisma.chartOfAccounts.upsert({
    where: { code: '3-2010' },
    update: {},
    create: {
      code: '3-2010',
      name: 'Retained Earnings',
      nameId: 'Laba Ditahan',
      accountType: 'EQUITY',
      accountSubType: 'RETAINED_EARNINGS',
      normalBalance: 'CREDIT',
      isSystemAccount: true,
      description: 'Accumulated retained earnings',
      descriptionId: 'Akumulasi laba yang ditahan',
    },
  });

  const accountCurrentYearProfit = await prisma.chartOfAccounts.upsert({
    where: { code: '3-3010' },
    update: {},
    create: {
      code: '3-3010',
      name: 'Current Year Profit/Loss',
      nameId: 'Laba/Rugi Tahun Berjalan',
      accountType: 'EQUITY',
      accountSubType: 'CURRENT_EARNINGS',
      normalBalance: 'CREDIT',
      isSystemAccount: true,
      description: 'Current year profit or loss',
      descriptionId: 'Laba/rugi tahun berjalan',
    },
  });

  const accountOwnerDrawing = await prisma.chartOfAccounts.upsert({
    where: { code: '3-4010' },
    update: {},
    create: {
      code: '3-4010',
      name: 'Owner\'s Drawing',
      nameId: 'Prive Pemilik',
      accountType: 'EQUITY',
      accountSubType: 'DRAWING',
      normalBalance: 'DEBIT',
      isSystemAccount: true,
      description: 'Owner withdrawals',
      descriptionId: 'Pengambilan pemilik',
    },
  });

  // REVENUE (4-xxxx)
  const accountServiceRevenue = await prisma.chartOfAccounts.upsert({
    where: { code: '4-1010' },
    update: {},
    create: {
      code: '4-1010',
      name: 'Service Revenue',
      nameId: 'Pendapatan Jasa',
      accountType: 'REVENUE',
      accountSubType: 'OPERATING_REVENUE',
      normalBalance: 'CREDIT',
      isSystemAccount: true,
      description: 'Revenue from services rendered',
      descriptionId: 'Pendapatan dari jasa yang diberikan',
    },
  });

  const accountSalesRevenue = await prisma.chartOfAccounts.upsert({
    where: { code: '4-2010' },
    update: {},
    create: {
      code: '4-2010',
      name: 'Sales Revenue',
      nameId: 'Pendapatan Penjualan',
      accountType: 'REVENUE',
      accountSubType: 'OPERATING_REVENUE',
      normalBalance: 'CREDIT',
      description: 'Revenue from sales',
      descriptionId: 'Pendapatan dari penjualan',
    },
  });

  const accountOtherIncome = await prisma.chartOfAccounts.upsert({
    where: { code: '4-9010' },
    update: {},
    create: {
      code: '4-9010',
      name: 'Other Income',
      nameId: 'Pendapatan Lain-Lain',
      accountType: 'REVENUE',
      accountSubType: 'OTHER_INCOME',
      normalBalance: 'CREDIT',
      isSystemAccount: true,
      description: 'Other income from non-operating activities',
      descriptionId: 'Pendapatan lain-lain dari aktivitas non-operasional',
    },
  });

  // EXPENSES (6-xxxx) - Link to existing expense categories
  // Selling Expenses (6-1xxx)
  const accountSellingExpenses = await prisma.chartOfAccounts.upsert({
    where: { code: '6-1010' },
    update: {},
    create: {
      code: '6-1010',
      name: 'Sales Salaries',
      nameId: 'Gaji Penjualan',
      accountType: 'EXPENSE',
      accountSubType: 'SELLING_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Salaries and allowances for sales staff',
      descriptionId: 'Gaji dan tunjangan karyawan penjualan',
    },
  });

  const accountAdvertising = await prisma.chartOfAccounts.upsert({
    where: { code: '6-1030' },
    update: {},
    create: {
      code: '6-1030',
      name: 'Advertising & Promotion',
      nameId: 'Iklan dan Promosi',
      accountType: 'EXPENSE',
      accountSubType: 'SELLING_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Advertising, promotion, and marketing costs',
      descriptionId: 'Biaya iklan, promosi, dan marketing',
    },
  });

  const accountDigitalMarketing = await prisma.chartOfAccounts.upsert({
    where: { code: '6-1070' },
    update: {},
    create: {
      code: '6-1070',
      name: 'Digital Marketing',
      nameId: 'Marketing Digital',
      accountType: 'EXPENSE',
      accountSubType: 'SELLING_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Online marketing costs',
      descriptionId: 'Biaya marketing online',
    },
  });

  // General & Admin Expenses (6-2xxx)
  const accountOfficeRent = await prisma.chartOfAccounts.upsert({
    where: { code: '6-2020' },
    update: {},
    create: {
      code: '6-2020',
      name: 'Office Rent',
      nameId: 'Sewa Kantor',
      accountType: 'EXPENSE',
      accountSubType: 'ADMIN_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Office rental costs',
      descriptionId: 'Biaya sewa kantor',
    },
  });

  const accountUtilities = await prisma.chartOfAccounts.upsert({
    where: { code: '6-2030' },
    update: {},
    create: {
      code: '6-2030',
      name: 'Electricity & Water',
      nameId: 'Listrik dan Air',
      accountType: 'EXPENSE',
      accountSubType: 'ADMIN_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Electricity and water costs',
      descriptionId: 'Biaya listrik dan air',
    },
  });

  const accountOfficeSupplies = await prisma.chartOfAccounts.upsert({
    where: { code: '6-2050' },
    update: {},
    create: {
      code: '6-2050',
      name: 'Office Supplies',
      nameId: 'Perlengkapan Kantor',
      accountType: 'EXPENSE',
      accountSubType: 'ADMIN_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Stationery and office supplies',
      descriptionId: 'Alat tulis dan perlengkapan kantor',
    },
  });

  const accountProfessionalServices = await prisma.chartOfAccounts.upsert({
    where: { code: '6-2070' },
    update: {},
    create: {
      code: '6-2070',
      name: 'Professional Services',
      nameId: 'Jasa Profesional',
      accountType: 'EXPENSE',
      accountSubType: 'ADMIN_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Professional service fees',
      descriptionId: 'Biaya jasa profesional',
    },
  });

  const accountSoftware = await prisma.chartOfAccounts.upsert({
    where: { code: '6-2130' },
    update: {},
    create: {
      code: '6-2130',
      name: 'Software & Licenses',
      nameId: 'Software dan Lisensi',
      accountType: 'EXPENSE',
      accountSubType: 'ADMIN_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Software and license costs',
      descriptionId: 'Biaya software dan lisensi',
    },
  });

  const accountBankCharges = await prisma.chartOfAccounts.upsert({
    where: { code: '6-2160' },
    update: {},
    create: {
      code: '6-2160',
      name: 'Bank Charges',
      nameId: 'Biaya Bank',
      accountType: 'EXPENSE',
      accountSubType: 'ADMIN_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Bank fees and charges',
      descriptionId: 'Biaya administrasi bank',
    },
  });

  const accountMiscellaneous = await prisma.chartOfAccounts.upsert({
    where: { code: '6-2190' },
    update: {},
    create: {
      code: '6-2190',
      name: 'Miscellaneous Expenses',
      nameId: 'Biaya Lain-Lain',
      accountType: 'EXPENSE',
      accountSubType: 'ADMIN_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Miscellaneous expenses',
      descriptionId: 'Biaya lain-lain',
    },
  });

  // Depreciation Expense (PSAK 16)
  const accountDepreciationExpense = await prisma.chartOfAccounts.upsert({
    where: { code: '6-3010' },
    update: {},
    create: {
      code: '6-3010',
      name: 'Depreciation Expense',
      nameId: 'Beban Penyusutan',
      accountType: 'EXPENSE',
      accountSubType: 'ADMIN_EXPENSE',
      normalBalance: 'DEBIT',
      isSystemAccount: true,
      description: 'Depreciation expense on fixed assets (PSAK 16)',
      descriptionId: 'Beban penyusutan aset tetap (PSAK 16)',
    },
  });

  // Other Expenses (8-xxxx)
  const accountBadDebtExpense = await prisma.chartOfAccounts.upsert({
    where: { code: '8-1010' },
    update: {},
    create: {
      code: '8-1010',
      name: 'Bad Debt Expense',
      nameId: 'Beban Piutang Tak Tertagih',
      accountType: 'EXPENSE',
      accountSubType: 'OTHER_EXPENSE',
      normalBalance: 'DEBIT',
      isSystemAccount: true,
      description: 'Bad debt expense and ECL provision (PSAK 71)',
      descriptionId: 'Beban piutang tak tertagih dan penyisihan kerugian kredit (PSAK 71)',
    },
  });

  const accountOtherExpenses = await prisma.chartOfAccounts.upsert({
    where: { code: '8-2010' },
    update: {},
    create: {
      code: '8-2010',
      name: 'Other Expenses',
      nameId: 'Beban Lain-Lain',
      accountType: 'EXPENSE',
      accountSubType: 'OTHER_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Other non-operating expenses',
      descriptionId: 'Beban lain-lain diluar operasional',
    },
  });

  // ============================================================
  // ADDITIONAL PSAK-COMPLIANT ACCOUNTS (Comprehensive Coverage)
  // ============================================================

  // ASSETS - Inventory (1-15xx)
  await prisma.chartOfAccounts.upsert({
    where: { code: '1-1510' },
    update: {},
    create: {
      code: '1-1510',
      name: 'Inventory - Raw Materials',
      nameId: 'Persediaan Bahan Baku',
      accountType: 'ASSET',
      accountSubType: 'CURRENT_ASSET',
      normalBalance: 'DEBIT',
      isControlAccount: true,
      description: 'Raw materials inventory',
      descriptionId: 'Persediaan bahan baku untuk produksi',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '1-1520' },
    update: {},
    create: {
      code: '1-1520',
      name: 'Inventory - Work in Progress',
      nameId: 'Persediaan Barang Dalam Proses',
      accountType: 'ASSET',
      accountSubType: 'CURRENT_ASSET',
      normalBalance: 'DEBIT',
      description: 'Work in progress inventory',
      descriptionId: 'Persediaan barang yang masih dalam proses produksi',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '1-1530' },
    update: {},
    create: {
      code: '1-1530',
      name: 'Inventory - Finished Goods',
      nameId: 'Persediaan Barang Jadi',
      accountType: 'ASSET',
      accountSubType: 'CURRENT_ASSET',
      normalBalance: 'DEBIT',
      isControlAccount: true,
      description: 'Finished goods inventory',
      descriptionId: 'Persediaan barang jadi siap dijual',
    },
  });

  // ASSETS - Prepaid Taxes (1-25xx)
  await prisma.chartOfAccounts.upsert({
    where: { code: '1-2510' },
    update: {},
    create: {
      code: '1-2510',
      name: 'Prepaid PPh 23',
      nameId: 'PPh Pasal 23 Dibayar Dimuka',
      accountType: 'ASSET',
      accountSubType: 'CURRENT_ASSET',
      normalBalance: 'DEBIT',
      isTaxAccount: true,
      taxType: 'PPh_23',
      description: 'Prepaid income tax article 23',
      descriptionId: 'Pajak penghasilan pasal 23 yang dibayar dimuka',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '1-2520' },
    update: {},
    create: {
      code: '1-2520',
      name: 'Prepaid PPh 25',
      nameId: 'PPh Pasal 25 Dibayar Dimuka',
      accountType: 'ASSET',
      accountSubType: 'CURRENT_ASSET',
      normalBalance: 'DEBIT',
      isTaxAccount: true,
      taxType: 'PPh_25',
      description: 'Prepaid income tax article 25 (monthly installment)',
      descriptionId: 'Pajak penghasilan pasal 25 (angsuran bulanan)',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '1-2530' },
    update: {},
    create: {
      code: '1-2530',
      name: 'Prepaid PPN',
      nameId: 'PPN Masukan',
      accountType: 'ASSET',
      accountSubType: 'CURRENT_ASSET',
      normalBalance: 'DEBIT',
      isTaxAccount: true,
      taxType: 'VAT_IN',
      description: 'Prepaid VAT (input VAT)',
      descriptionId: 'PPN yang dibayar saat pembelian (PPN Masukan)',
    },
  });

  // ASSETS - Fixed Assets (1-41xx - 1-49xx)
  await prisma.chartOfAccounts.upsert({
    where: { code: '1-4110' },
    update: {},
    create: {
      code: '1-4110',
      name: 'Land',
      nameId: 'Tanah',
      accountType: 'ASSET',
      accountSubType: 'FIXED_ASSET',
      normalBalance: 'DEBIT',
      description: 'Land (not depreciated)',
      descriptionId: 'Tanah (tidak disusutkan)',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '1-4210' },
    update: {},
    create: {
      code: '1-4210',
      name: 'Buildings',
      nameId: 'Bangunan',
      accountType: 'ASSET',
      accountSubType: 'FIXED_ASSET',
      normalBalance: 'DEBIT',
      description: 'Buildings and structures',
      descriptionId: 'Bangunan dan gedung',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '1-4220' },
    update: {},
    create: {
      code: '1-4220',
      name: 'Accumulated Depreciation - Buildings',
      nameId: 'Akumulasi Penyusutan Bangunan',
      accountType: 'ASSET',
      accountSubType: 'FIXED_ASSET',
      normalBalance: 'CREDIT',
      description: 'Accumulated depreciation for buildings',
      descriptionId: 'Akumulasi penyusutan bangunan',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '1-4310' },
    update: {},
    create: {
      code: '1-4310',
      name: 'Vehicles',
      nameId: 'Kendaraan',
      accountType: 'ASSET',
      accountSubType: 'FIXED_ASSET',
      normalBalance: 'DEBIT',
      description: 'Vehicles and transportation equipment',
      descriptionId: 'Kendaraan dan alat transportasi',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '1-4320' },
    update: {},
    create: {
      code: '1-4320',
      name: 'Accumulated Depreciation - Vehicles',
      nameId: 'Akumulasi Penyusutan Kendaraan',
      accountType: 'ASSET',
      accountSubType: 'FIXED_ASSET',
      normalBalance: 'CREDIT',
      description: 'Accumulated depreciation for vehicles',
      descriptionId: 'Akumulasi penyusutan kendaraan',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '1-4410' },
    update: {},
    create: {
      code: '1-4410',
      name: 'Furniture & Fixtures',
      nameId: 'Perabotan Kantor',
      accountType: 'ASSET',
      accountSubType: 'FIXED_ASSET',
      normalBalance: 'DEBIT',
      description: 'Office furniture and fixtures',
      descriptionId: 'Perabotan dan perlengkapan kantor',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '1-4420' },
    update: {},
    create: {
      code: '1-4420',
      name: 'Accumulated Depreciation - Furniture',
      nameId: 'Akumulasi Penyusutan Perabotan',
      accountType: 'ASSET',
      accountSubType: 'FIXED_ASSET',
      normalBalance: 'CREDIT',
      description: 'Accumulated depreciation for furniture',
      descriptionId: 'Akumulasi penyusutan perabotan',
    },
  });

  // ASSETS - Intangible Assets (1-5xxx)
  await prisma.chartOfAccounts.upsert({
    where: { code: '1-5010' },
    update: {},
    create: {
      code: '1-5010',
      name: 'Goodwill',
      nameId: 'Goodwill',
      accountType: 'ASSET',
      accountSubType: 'INTANGIBLE_ASSET',
      normalBalance: 'DEBIT',
      description: 'Goodwill and brand value',
      descriptionId: 'Goodwill dan nilai merek',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '1-5020' },
    update: {},
    create: {
      code: '1-5020',
      name: 'Patents & Trademarks',
      nameId: 'Hak Paten dan Merek Dagang',
      accountType: 'ASSET',
      accountSubType: 'INTANGIBLE_ASSET',
      normalBalance: 'DEBIT',
      description: 'Patents, trademarks, and intellectual property',
      descriptionId: 'Hak paten, merek dagang, dan kekayaan intelektual',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '1-5030' },
    update: {},
    create: {
      code: '1-5030',
      name: 'Software Licenses',
      nameId: 'Lisensi Perangkat Lunak',
      accountType: 'ASSET',
      accountSubType: 'INTANGIBLE_ASSET',
      normalBalance: 'DEBIT',
      description: 'Long-term software licenses',
      descriptionId: 'Lisensi perangkat lunak jangka panjang',
    },
  });

  // LIABILITIES - Current Liabilities (2-11xx - 2-19xx)
  await prisma.chartOfAccounts.upsert({
    where: { code: '2-1110' },
    update: {},
    create: {
      code: '2-1110',
      name: 'Wages Payable',
      nameId: 'Hutang Gaji',
      accountType: 'LIABILITY',
      accountSubType: 'CURRENT_LIABILITY',
      normalBalance: 'CREDIT',
      isControlAccount: true,
      description: 'Accrued wages and salaries payable',
      descriptionId: 'Hutang gaji dan upah karyawan',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '2-1120' },
    update: {},
    create: {
      code: '2-1120',
      name: 'Accrued Expenses',
      nameId: 'Biaya Yang Masih Harus Dibayar',
      accountType: 'LIABILITY',
      accountSubType: 'CURRENT_LIABILITY',
      normalBalance: 'CREDIT',
      description: 'Accrued expenses not yet paid',
      descriptionId: 'Biaya yang sudah terjadi tetapi belum dibayar',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '2-1130' },
    update: {},
    create: {
      code: '2-1130',
      name: 'Customer Deposits',
      nameId: 'Uang Muka Pelanggan',
      accountType: 'LIABILITY',
      accountSubType: 'CURRENT_LIABILITY',
      normalBalance: 'CREDIT',
      description: 'Advance payments from customers',
      descriptionId: 'Uang muka yang diterima dari pelanggan',
    },
  });

  // LIABILITIES - Tax Payables (2-21xx - 2-29xx)
  await prisma.chartOfAccounts.upsert({
    where: { code: '2-2110' },
    update: {},
    create: {
      code: '2-2110',
      name: 'PPh 21 Payable',
      nameId: 'Hutang PPh Pasal 21',
      accountType: 'LIABILITY',
      accountSubType: 'CURRENT_LIABILITY',
      normalBalance: 'CREDIT',
      isTaxAccount: true,
      taxType: 'PPh_21',
      description: 'Income tax article 21 (employee withholding) payable',
      descriptionId: 'Hutang pajak penghasilan pasal 21 (pemotongan gaji karyawan)',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '2-2120' },
    update: {},
    create: {
      code: '2-2120',
      name: 'PPh 23 Payable',
      nameId: 'Hutang PPh Pasal 23',
      accountType: 'LIABILITY',
      accountSubType: 'CURRENT_LIABILITY',
      normalBalance: 'CREDIT',
      isTaxAccount: true,
      taxType: 'PPh_23',
      description: 'Income tax article 23 (service withholding) payable',
      descriptionId: 'Hutang pajak penghasilan pasal 23 (pemotongan jasa)',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '2-2130' },
    update: {},
    create: {
      code: '2-2130',
      name: 'PPh 25 Payable',
      nameId: 'Hutang PPh Pasal 25',
      accountType: 'LIABILITY',
      accountSubType: 'CURRENT_LIABILITY',
      normalBalance: 'CREDIT',
      isTaxAccount: true,
      taxType: 'PPh_25',
      description: 'Income tax article 25 (monthly corporate tax) payable',
      descriptionId: 'Hutang pajak penghasilan pasal 25 (angsuran pajak badan)',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '2-2140' },
    update: {},
    create: {
      code: '2-2140',
      name: 'PPh 29 Payable',
      nameId: 'Hutang PPh Pasal 29',
      accountType: 'LIABILITY',
      accountSubType: 'CURRENT_LIABILITY',
      normalBalance: 'CREDIT',
      isTaxAccount: true,
      taxType: 'PPh_29',
      description: 'Income tax article 29 (final annual tax) payable',
      descriptionId: 'Hutang pajak penghasilan pasal 29 (kurang bayar tahunan)',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '2-2150' },
    update: {},
    create: {
      code: '2-2150',
      name: 'PPN Output',
      nameId: 'PPN Keluaran',
      accountType: 'LIABILITY',
      accountSubType: 'CURRENT_LIABILITY',
      normalBalance: 'CREDIT',
      isTaxAccount: true,
      taxType: 'VAT_OUT',
      description: 'VAT collected from sales (output VAT)',
      descriptionId: 'PPN yang dipungut dari penjualan (PPN Keluaran)',
    },
  });

  // LIABILITIES - Long-term (2-3xxx)
  await prisma.chartOfAccounts.upsert({
    where: { code: '2-3010' },
    update: {},
    create: {
      code: '2-3010',
      name: 'Bank Loans',
      nameId: 'Pinjaman Bank',
      accountType: 'LIABILITY',
      accountSubType: 'LONG_TERM_LIABILITY',
      normalBalance: 'CREDIT',
      description: 'Long-term bank loans',
      descriptionId: 'Pinjaman bank jangka panjang',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '2-3020' },
    update: {},
    create: {
      code: '2-3020',
      name: 'Bonds Payable',
      nameId: 'Hutang Obligasi',
      accountType: 'LIABILITY',
      accountSubType: 'LONG_TERM_LIABILITY',
      normalBalance: 'CREDIT',
      description: 'Bonds and debentures payable',
      descriptionId: 'Hutang obligasi dan surat utang',
    },
  });

  // REVENUE - Sales Revenue (4-1xxx)
  await prisma.chartOfAccounts.upsert({
    where: { code: '4-1020' },
    update: {},
    create: {
      code: '4-1020',
      name: 'Product Sales',
      nameId: 'Penjualan Produk',
      accountType: 'REVENUE',
      accountSubType: 'OPERATING_REVENUE',
      normalBalance: 'CREDIT',
      description: 'Revenue from product sales',
      descriptionId: 'Pendapatan dari penjualan produk',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '4-1030' },
    update: {},
    create: {
      code: '4-1030',
      name: 'Consulting Revenue',
      nameId: 'Pendapatan Konsultasi',
      accountType: 'REVENUE',
      accountSubType: 'OPERATING_REVENUE',
      normalBalance: 'CREDIT',
      description: 'Revenue from consulting services',
      descriptionId: 'Pendapatan dari jasa konsultasi',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '4-1040' },
    update: {},
    create: {
      code: '4-1040',
      name: 'Training Revenue',
      nameId: 'Pendapatan Pelatihan',
      accountType: 'REVENUE',
      accountSubType: 'OPERATING_REVENUE',
      normalBalance: 'CREDIT',
      description: 'Revenue from training services',
      descriptionId: 'Pendapatan dari jasa pelatihan',
    },
  });

  // REVENUE - Other Revenue (4-8xxx)
  await prisma.chartOfAccounts.upsert({
    where: { code: '4-8010' },
    update: {},
    create: {
      code: '4-8010',
      name: 'Interest Income',
      nameId: 'Pendapatan Bunga',
      accountType: 'REVENUE',
      accountSubType: 'OTHER_INCOME',
      normalBalance: 'CREDIT',
      description: 'Interest income from deposits',
      descriptionId: 'Pendapatan bunga dari deposito',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '4-8020' },
    update: {},
    create: {
      code: '4-8020',
      name: 'Foreign Exchange Gain',
      nameId: 'Keuntungan Selisih Kurs',
      accountType: 'REVENUE',
      accountSubType: 'OTHER_INCOME',
      normalBalance: 'CREDIT',
      description: 'Realized foreign exchange gains',
      descriptionId: 'Keuntungan selisih kurs yang terealisasi',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '4-8030' },
    update: {},
    create: {
      code: '4-8030',
      name: 'Gain on Asset Sales',
      nameId: 'Keuntungan Penjualan Aset',
      accountType: 'REVENUE',
      accountSubType: 'OTHER_INCOME',
      normalBalance: 'CREDIT',
      description: 'Gains from sale of fixed assets',
      descriptionId: 'Keuntungan dari penjualan aset tetap',
    },
  });

  // EXPENSES - Cost of Goods Sold (5-xxxx)
  await prisma.chartOfAccounts.upsert({
    where: { code: '5-1010' },
    update: {},
    create: {
      code: '5-1010',
      name: 'Cost of Goods Sold',
      nameId: 'Harga Pokok Penjualan',
      accountType: 'EXPENSE',
      accountSubType: 'COGS',
      normalBalance: 'DEBIT',
      isControlAccount: true,
      description: 'Cost of goods sold',
      descriptionId: 'Harga pokok barang yang terjual',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '5-1020' },
    update: {},
    create: {
      code: '5-1020',
      name: 'Direct Labor',
      nameId: 'Biaya Tenaga Kerja Langsung',
      accountType: 'EXPENSE',
      accountSubType: 'COGS',
      normalBalance: 'DEBIT',
      description: 'Direct labor costs for production',
      descriptionId: 'Biaya tenaga kerja langsung untuk produksi',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '5-1030' },
    update: {},
    create: {
      code: '5-1030',
      name: 'Manufacturing Overhead',
      nameId: 'Biaya Overhead Pabrik',
      accountType: 'EXPENSE',
      accountSubType: 'COGS',
      normalBalance: 'DEBIT',
      description: 'Manufacturing overhead costs',
      descriptionId: 'Biaya overhead produksi',
    },
  });

  // EXPENSES - Payroll (6-5xxx)
  await prisma.chartOfAccounts.upsert({
    where: { code: '6-5010' },
    update: {},
    create: {
      code: '6-5010',
      name: 'Salaries - Management',
      nameId: 'Gaji Manajemen',
      accountType: 'EXPENSE',
      accountSubType: 'ADMIN_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Management salaries and compensation',
      descriptionId: 'Gaji dan kompensasi manajemen',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '6-5020' },
    update: {},
    create: {
      code: '6-5020',
      name: 'Salaries - Administrative',
      nameId: 'Gaji Administrasi',
      accountType: 'EXPENSE',
      accountSubType: 'ADMIN_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Administrative staff salaries',
      descriptionId: 'Gaji karyawan administrasi',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '6-5030' },
    update: {},
    create: {
      code: '6-5030',
      name: 'Employee Benefits',
      nameId: 'Tunjangan Karyawan',
      accountType: 'EXPENSE',
      accountSubType: 'ADMIN_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Employee benefits (BPJS, insurance, allowances)',
      descriptionId: 'Tunjangan karyawan (BPJS, asuransi, tunjangan)',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '6-5040' },
    update: {},
    create: {
      code: '6-5040',
      name: 'Severance Pay',
      nameId: 'Pesangon',
      accountType: 'EXPENSE',
      accountSubType: 'ADMIN_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Employee severance and termination benefits',
      descriptionId: 'Pesangon dan uang pisah karyawan',
    },
  });

  // EXPENSES - Tax Expenses (6-4xxx)
  await prisma.chartOfAccounts.upsert({
    where: { code: '6-4010' },
    update: {},
    create: {
      code: '6-4010',
      name: 'Income Tax Expense',
      nameId: 'Beban Pajak Penghasilan',
      accountType: 'EXPENSE',
      accountSubType: 'TAX_EXPENSE',
      normalBalance: 'DEBIT',
      isTaxAccount: true,
      description: 'Corporate income tax expense',
      descriptionId: 'Beban pajak penghasilan badan',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '6-4020' },
    update: {},
    create: {
      code: '6-4020',
      name: 'Property Tax',
      nameId: 'Pajak Bumi dan Bangunan (PBB)',
      accountType: 'EXPENSE',
      accountSubType: 'TAX_EXPENSE',
      normalBalance: 'DEBIT',
      isTaxAccount: true,
      description: 'Property tax (PBB)',
      descriptionId: 'Pajak bumi dan bangunan',
    },
  });

  // EXPENSES - Other Expenses (8-xxxx)
  await prisma.chartOfAccounts.upsert({
    where: { code: '8-3010' },
    update: {},
    create: {
      code: '8-3010',
      name: 'Interest Expense',
      nameId: 'Beban Bunga',
      accountType: 'EXPENSE',
      accountSubType: 'OTHER_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Interest expense on loans',
      descriptionId: 'Beban bunga pinjaman',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '8-3020' },
    update: {},
    create: {
      code: '8-3020',
      name: 'Foreign Exchange Loss',
      nameId: 'Rugi Selisih Kurs',
      accountType: 'EXPENSE',
      accountSubType: 'OTHER_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Realized foreign exchange losses',
      descriptionId: 'Kerugian selisih kurs yang terealisasi',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '8-3030' },
    update: {},
    create: {
      code: '8-3030',
      name: 'Loss on Asset Sales',
      nameId: 'Kerugian Penjualan Aset',
      accountType: 'EXPENSE',
      accountSubType: 'OTHER_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Losses from sale of fixed assets',
      descriptionId: 'Kerugian dari penjualan aset tetap',
    },
  });

  // ============================================================
  // DIGITAL CREATIVE AGENCY SPECIFIC ACCOUNTS
  // ============================================================

  // REVENUE - Creative Agency Services (4-2xxx)
  await prisma.chartOfAccounts.upsert({
    where: { code: '4-2010' },
    update: {},
    create: {
      code: '4-2010',
      name: 'Video Production Revenue',
      nameId: 'Pendapatan Produksi Video',
      accountType: 'REVENUE',
      accountSubType: 'OPERATING_REVENUE',
      normalBalance: 'CREDIT',
      description: 'Revenue from video production services',
      descriptionId: 'Pendapatan dari jasa produksi video',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '4-2020' },
    update: {},
    create: {
      code: '4-2020',
      name: 'Photography Revenue',
      nameId: 'Pendapatan Fotografi',
      accountType: 'REVENUE',
      accountSubType: 'OPERATING_REVENUE',
      normalBalance: 'CREDIT',
      description: 'Revenue from photography services',
      descriptionId: 'Pendapatan dari jasa fotografi',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '4-2030' },
    update: {},
    create: {
      code: '4-2030',
      name: 'Graphic Design Revenue',
      nameId: 'Pendapatan Desain Grafis',
      accountType: 'REVENUE',
      accountSubType: 'OPERATING_REVENUE',
      normalBalance: 'CREDIT',
      description: 'Revenue from graphic design services',
      descriptionId: 'Pendapatan dari jasa desain grafis',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '4-2040' },
    update: {},
    create: {
      code: '4-2040',
      name: 'Web Development Revenue',
      nameId: 'Pendapatan Pengembangan Website',
      accountType: 'REVENUE',
      accountSubType: 'OPERATING_REVENUE',
      normalBalance: 'CREDIT',
      description: 'Revenue from web development services',
      descriptionId: 'Pendapatan dari jasa pembuatan website',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '4-2050' },
    update: {},
    create: {
      code: '4-2050',
      name: 'Social Media Management Revenue',
      nameId: 'Pendapatan Manajemen Media Sosial',
      accountType: 'REVENUE',
      accountSubType: 'OPERATING_REVENUE',
      normalBalance: 'CREDIT',
      description: 'Revenue from social media management services',
      descriptionId: 'Pendapatan dari jasa manajemen media sosial',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '4-2060' },
    update: {},
    create: {
      code: '4-2060',
      name: 'Content Creation Revenue',
      nameId: 'Pendapatan Pembuatan Konten',
      accountType: 'REVENUE',
      accountSubType: 'OPERATING_REVENUE',
      normalBalance: 'CREDIT',
      description: 'Revenue from content creation services',
      descriptionId: 'Pendapatan dari jasa pembuatan konten',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '4-2070' },
    update: {},
    create: {
      code: '4-2070',
      name: 'Video Editing Revenue',
      nameId: 'Pendapatan Editing Video',
      accountType: 'REVENUE',
      accountSubType: 'OPERATING_REVENUE',
      normalBalance: 'CREDIT',
      description: 'Revenue from video editing services',
      descriptionId: 'Pendapatan dari jasa editing video',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '4-2080' },
    update: {},
    create: {
      code: '4-2080',
      name: 'Animation Revenue',
      nameId: 'Pendapatan Animasi',
      accountType: 'REVENUE',
      accountSubType: 'OPERATING_REVENUE',
      normalBalance: 'CREDIT',
      description: 'Revenue from animation services',
      descriptionId: 'Pendapatan dari jasa animasi',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '4-2090' },
    update: {},
    create: {
      code: '4-2090',
      name: 'Branding & Identity Revenue',
      nameId: 'Pendapatan Branding & Identitas',
      accountType: 'REVENUE',
      accountSubType: 'OPERATING_REVENUE',
      normalBalance: 'CREDIT',
      description: 'Revenue from branding and corporate identity services',
      descriptionId: 'Pendapatan dari jasa branding dan identitas korporat',
    },
  });

  // EXPENSES - Creative Production Costs (5-2xxx)
  await prisma.chartOfAccounts.upsert({
    where: { code: '5-2010' },
    update: {},
    create: {
      code: '5-2010',
      name: 'Freelancer - Videographer',
      nameId: 'Freelancer Videografer',
      accountType: 'EXPENSE',
      accountSubType: 'COGS',
      normalBalance: 'DEBIT',
      description: 'Freelance videographer costs',
      descriptionId: 'Biaya videografer freelance',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '5-2020' },
    update: {},
    create: {
      code: '5-2020',
      name: 'Freelancer - Photographer',
      nameId: 'Freelancer Fotografer',
      accountType: 'EXPENSE',
      accountSubType: 'COGS',
      normalBalance: 'DEBIT',
      description: 'Freelance photographer costs',
      descriptionId: 'Biaya fotografer freelance',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '5-2030' },
    update: {},
    create: {
      code: '5-2030',
      name: 'Freelancer - Graphic Designer',
      nameId: 'Freelancer Desainer Grafis',
      accountType: 'EXPENSE',
      accountSubType: 'COGS',
      normalBalance: 'DEBIT',
      description: 'Freelance graphic designer costs',
      descriptionId: 'Biaya desainer grafis freelance',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '5-2040' },
    update: {},
    create: {
      code: '5-2040',
      name: 'Freelancer - Web Developer',
      nameId: 'Freelancer Developer Website',
      accountType: 'EXPENSE',
      accountSubType: 'COGS',
      normalBalance: 'DEBIT',
      description: 'Freelance web developer costs',
      descriptionId: 'Biaya developer website freelance',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '5-2050' },
    update: {},
    create: {
      code: '5-2050',
      name: 'Freelancer - Video Editor',
      nameId: 'Freelancer Editor Video',
      accountType: 'EXPENSE',
      accountSubType: 'COGS',
      normalBalance: 'DEBIT',
      description: 'Freelance video editor costs',
      descriptionId: 'Biaya editor video freelance',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '5-2060' },
    update: {},
    create: {
      code: '5-2060',
      name: 'Freelancer - Content Writer',
      nameId: 'Freelancer Penulis Konten',
      accountType: 'EXPENSE',
      accountSubType: 'COGS',
      normalBalance: 'DEBIT',
      description: 'Freelance content writer costs',
      descriptionId: 'Biaya penulis konten freelance',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '5-3010' },
    update: {},
    create: {
      code: '5-3010',
      name: 'Stock Footage & Music',
      nameId: 'Footage & Musik Stok',
      accountType: 'EXPENSE',
      accountSubType: 'COGS',
      normalBalance: 'DEBIT',
      description: 'Stock footage, music, and media assets',
      descriptionId: 'Biaya footage, musik, dan aset media stok',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '5-3020' },
    update: {},
    create: {
      code: '5-3020',
      name: 'Props & Equipment Rental',
      nameId: 'Sewa Properti & Peralatan',
      accountType: 'EXPENSE',
      accountSubType: 'COGS',
      normalBalance: 'DEBIT',
      description: 'Props and equipment rental for productions',
      descriptionId: 'Biaya sewa properti dan peralatan untuk produksi',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '5-3030' },
    update: {},
    create: {
      code: '5-3030',
      name: 'Location Rental',
      nameId: 'Sewa Lokasi',
      accountType: 'EXPENSE',
      accountSubType: 'COGS',
      normalBalance: 'DEBIT',
      description: 'Location rental for shoots',
      descriptionId: 'Biaya sewa lokasi untuk pengambilan gambar',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '5-3040' },
    update: {},
    create: {
      code: '5-3040',
      name: 'Talent & Models',
      nameId: 'Talent & Model',
      accountType: 'EXPENSE',
      accountSubType: 'COGS',
      normalBalance: 'DEBIT',
      description: 'Talent and model fees',
      descriptionId: 'Biaya talent dan model',
    },
  });

  // EXPENSES - Creative Agency Operations (6-3xxx)
  await prisma.chartOfAccounts.upsert({
    where: { code: '6-3010' },
    update: {},
    create: {
      code: '6-3010',
      name: 'Adobe Creative Cloud Subscription',
      nameId: 'Langganan Adobe Creative Cloud',
      accountType: 'EXPENSE',
      accountSubType: 'ADMIN_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Adobe CC subscription for design software',
      descriptionId: 'Langganan Adobe CC untuk software desain',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '6-3020' },
    update: {},
    create: {
      code: '6-3020',
      name: 'Cloud Storage (Dropbox/Google)',
      nameId: 'Penyimpanan Cloud',
      accountType: 'EXPENSE',
      accountSubType: 'ADMIN_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Cloud storage subscription for project files',
      descriptionId: 'Langganan penyimpanan cloud untuk file proyek',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '6-3030' },
    update: {},
    create: {
      code: '6-3030',
      name: 'Project Management Software',
      nameId: 'Software Manajemen Proyek',
      accountType: 'EXPENSE',
      accountSubType: 'ADMIN_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Project management tools (Asana, Trello, Monday)',
      descriptionId: 'Tools manajemen proyek (Asana, Trello, Monday)',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '6-3040' },
    update: {},
    create: {
      code: '6-3040',
      name: 'Stock Photo Subscriptions',
      nameId: 'Langganan Foto Stok',
      accountType: 'EXPENSE',
      accountSubType: 'ADMIN_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Stock photo subscriptions (Shutterstock, Unsplash Pro)',
      descriptionId: 'Langganan foto stok (Shutterstock, Unsplash Pro)',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '6-3050' },
    update: {},
    create: {
      code: '6-3050',
      name: 'Video Hosting & Streaming',
      nameId: 'Hosting & Streaming Video',
      accountType: 'EXPENSE',
      accountSubType: 'ADMIN_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Video hosting services (Vimeo Pro, YouTube Premium)',
      descriptionId: 'Layanan hosting video (Vimeo Pro, YouTube Premium)',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '6-3060' },
    update: {},
    create: {
      code: '6-3060',
      name: 'Equipment Maintenance & Repair',
      nameId: 'Pemeliharaan & Perbaikan Peralatan',
      accountType: 'EXPENSE',
      accountSubType: 'ADMIN_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Camera, lens, and equipment maintenance',
      descriptionId: 'Pemeliharaan kamera, lensa, dan peralatan',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '6-3070' },
    update: {},
    create: {
      code: '6-3070',
      name: 'Internet & Bandwidth',
      nameId: 'Internet & Bandwidth',
      accountType: 'EXPENSE',
      accountSubType: 'ADMIN_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'High-speed internet for uploads and downloads',
      descriptionId: 'Internet berkecepatan tinggi untuk upload dan download',
    },
  });

  await prisma.chartOfAccounts.upsert({
    where: { code: '6-3080' },
    update: {},
    create: {
      code: '6-3080',
      name: 'Portfolio Website Hosting',
      nameId: 'Hosting Website Portfolio',
      accountType: 'EXPENSE',
      accountSubType: 'ADMIN_EXPENSE',
      normalBalance: 'DEBIT',
      description: 'Portfolio website hosting and domain',
      descriptionId: 'Hosting dan domain website portfolio',
    },
  });

  console.log('📊 Chart of Accounts created: 100+ accounts (Comprehensive PSAK-compliant)');
  console.log('  🎨 DIGITAL CREATIVE AGENCY EDITION');
  console.log('  ');
  console.log('  - ASET (Assets): 25 accounts');
  console.log('    • Kas & Bank (Cash & Bank): 4 accounts');
  console.log('    • Piutang (Receivables): 2 accounts');
  console.log('    • Persediaan (Inventory): 3 accounts');
  console.log('    • Biaya Dibayar Dimuka & Pajak (Prepaid & Tax): 4 accounts');
  console.log('    • Aset Tetap (Fixed Assets): 9 accounts (incl. cameras, equipment)');
  console.log('    • Aset Tidak Berwujud (Intangible): 3 accounts');
  console.log('  ');
  console.log('  - LIABILITAS (Liabilities): 13 accounts');
  console.log('    • Hutang Jangka Pendek (Current): 6 accounts');
  console.log('    • Hutang Pajak (Tax Payables): 5 accounts (PPh 21/23/25/29, PPN)');
  console.log('    • Hutang Jangka Panjang (Long-term): 2 accounts');
  console.log('  ');
  console.log('  - EKUITAS (Equity): 4 accounts');
  console.log('  ');
  console.log('  - PENDAPATAN (Revenue): 18 accounts');
  console.log('    • Core Services: 9 creative services (Video, Photo, Design, Web, etc.)');
  console.log('    • General Revenue: 6 accounts');
  console.log('    • Other Income: 3 accounts');
  console.log('  ');
  console.log('  - BEBAN (Expenses): 43 accounts');
  console.log('    • Harga Pokok Produksi (Production COGS): 13 accounts');
  console.log('      - Freelancers: 6 types (Videographer, Photographer, Designer, etc.)');
  console.log('      - Production Costs: 4 types (Stock, Rental, Location, Talent)');
  console.log('    • Beban Operasional Kreatif: 8 accounts (Adobe, Cloud Storage, etc.)');
  console.log('    • Beban Penjualan (Selling): 3 accounts');
  console.log('    • Beban Administrasi (Admin): 13 accounts');
  console.log('    • Beban Gaji (Payroll): 4 accounts');
  console.log('    • Beban Pajak (Tax): 2 accounts');

  // Create initial fiscal period for 2025
  console.log('📅 Creating fiscal periods for 2025...');

  const periods = [];
  for (let month = 1; month <= 12; month++) {
    const monthStr = month.toString().padStart(2, '0');
    const period = await prisma.fiscalPeriod.upsert({
      where: { code: `2025-${monthStr}` },
      update: {},
      create: {
        name: `${new Date(2025, month - 1).toLocaleString('en-US', { month: 'long' })} 2025`,
        code: `2025-${monthStr}`,
        periodType: 'MONTHLY',
        startDate: new Date(2025, month - 1, 1),
        endDate: new Date(2025, month, 0, 23, 59, 59),
        status: month <= 10 ? 'OPEN' : 'OPEN', // All open for now
      },
    });
    periods.push(period);
  }

  console.log('📅 Fiscal periods created: 12 monthly periods for 2025');

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

  // Create sample assets for production/creative company
  console.log('📷 Creating sample assets...');

  const asset1 = await prisma.asset.upsert({
    where: { assetCode: 'CAM-202501-001' },
    update: {},
    create: {
      assetCode: 'CAM-202501-001',
      name: 'Sony A7S III',
      category: 'Camera',
      subcategory: 'Mirrorless',
      manufacturer: 'Sony',
      model: 'A7S III',
      serialNumber: 'SN-A7S3-12345',
      purchaseDate: new Date('2024-03-15'),
      purchasePrice: 55000000,
      supplier: 'PT Kamera Pro Indonesia',
      status: 'AVAILABLE',
      condition: 'EXCELLENT',
      location: 'Equipment Room A',
      notes: 'Kamera utama untuk produksi video 4K',
      createdById: adminUser.id,
    },
  });

  const asset2 = await prisma.asset.upsert({
    where: { assetCode: 'CAM-202501-002' },
    update: {},
    create: {
      assetCode: 'CAM-202501-002',
      name: 'Canon EOS R5',
      category: 'Camera',
      subcategory: 'Mirrorless',
      manufacturer: 'Canon',
      model: 'EOS R5',
      serialNumber: 'SN-R5-67890',
      purchaseDate: new Date('2024-05-10'),
      purchasePrice: 65000000,
      supplier: 'PT Kamera Pro Indonesia',
      status: 'CHECKED_OUT',
      condition: 'EXCELLENT',
      location: 'Out - Project SM-001',
      notes: 'Sedang digunakan untuk project social media',
      createdById: adminUser.id,
    },
  });

  const asset3 = await prisma.asset.upsert({
    where: { assetCode: 'LEN-202501-001' },
    update: {},
    create: {
      assetCode: 'LEN-202501-001',
      name: 'Sony FE 24-70mm f/2.8 GM II',
      category: 'Lens',
      subcategory: 'Zoom Lens',
      manufacturer: 'Sony',
      model: 'SEL2470GM2',
      serialNumber: 'SN-LENS-11111',
      purchaseDate: new Date('2024-03-15'),
      purchasePrice: 32000000,
      supplier: 'PT Kamera Pro Indonesia',
      status: 'AVAILABLE',
      condition: 'EXCELLENT',
      location: 'Equipment Room A',
      notes: 'Lensa zoom serbaguna untuk Sony A7S III',
      createdById: adminUser.id,
    },
  });

  const asset4 = await prisma.asset.upsert({
    where: { assetCode: 'LEN-202501-002' },
    update: {},
    create: {
      assetCode: 'LEN-202501-002',
      name: 'Canon RF 70-200mm f/2.8L',
      category: 'Lens',
      subcategory: 'Telephoto Lens',
      manufacturer: 'Canon',
      model: 'RF70200F28L',
      serialNumber: 'SN-LENS-22222',
      purchaseDate: new Date('2024-05-10'),
      purchasePrice: 42000000,
      supplier: 'PT Kamera Pro Indonesia',
      status: 'AVAILABLE',
      condition: 'GOOD',
      location: 'Equipment Room A',
      notes: 'Lensa telephoto untuk Canon R5',
      createdById: adminUser.id,
    },
  });

  const asset5 = await prisma.asset.upsert({
    where: { assetCode: 'LIG-202501-001' },
    update: {},
    create: {
      assetCode: 'LIG-202501-001',
      name: 'Godox SL-60W LED Light',
      category: 'Lighting',
      subcategory: 'LED Panel',
      manufacturer: 'Godox',
      model: 'SL-60W',
      serialNumber: 'SN-LIGHT-33333',
      purchaseDate: new Date('2024-06-20'),
      purchasePrice: 3500000,
      supplier: 'Toko Lighting Jakarta',
      status: 'AVAILABLE',
      condition: 'EXCELLENT',
      location: 'Studio B',
      notes: 'Lampu LED untuk studio photography',
      createdById: adminUser.id,
    },
  });

  const asset6 = await prisma.asset.upsert({
    where: { assetCode: 'LIG-202501-002' },
    update: {},
    create: {
      assetCode: 'LIG-202501-002',
      name: 'Aputure 300D Mark II',
      category: 'Lighting',
      subcategory: 'LED Light',
      manufacturer: 'Aputure',
      model: '300D Mark II',
      serialNumber: 'SN-APU-44444',
      purchaseDate: new Date('2024-07-15'),
      purchasePrice: 12000000,
      supplier: 'Toko Lighting Jakarta',
      status: 'IN_MAINTENANCE',
      condition: 'FAIR',
      location: 'Maintenance Workshop',
      notes: 'Dalam perbaikan - mounting bracket rusak',
      createdById: adminUser.id,
    },
  });

  const asset7 = await prisma.asset.upsert({
    where: { assetCode: 'AUD-202501-001' },
    update: {},
    create: {
      assetCode: 'AUD-202501-001',
      name: 'Rode VideoMic Pro Plus',
      category: 'Audio',
      subcategory: 'Microphone',
      manufacturer: 'Rode',
      model: 'VideoMic Pro+',
      serialNumber: 'SN-RODE-55555',
      purchaseDate: new Date('2024-04-10'),
      purchasePrice: 4500000,
      supplier: 'Audio Equipment Store',
      status: 'AVAILABLE',
      condition: 'EXCELLENT',
      location: 'Equipment Room A',
      notes: 'Microphone shotgun untuk video production',
      createdById: adminUser.id,
    },
  });

  const asset8 = await prisma.asset.upsert({
    where: { assetCode: 'COM-202501-001' },
    update: {},
    create: {
      assetCode: 'COM-202501-001',
      name: 'MacBook Pro 16" M2 Max',
      category: 'Computer',
      subcategory: 'Laptop',
      manufacturer: 'Apple',
      model: 'MacBook Pro 16 M2 Max',
      serialNumber: 'SN-MAC-66666',
      purchaseDate: new Date('2024-02-01'),
      purchasePrice: 48000000,
      supplier: 'iStore Jakarta',
      status: 'RESERVED',
      condition: 'EXCELLENT',
      location: 'Editor Desk 1',
      notes: 'Reserved untuk video editing project besar',
      createdById: adminUser.id,
    },
  });

  const asset9 = await prisma.asset.upsert({
    where: { assetCode: 'ACC-202501-001' },
    update: {},
    create: {
      assetCode: 'ACC-202501-001',
      name: 'DJI Ronin RSC 2',
      category: 'Accessories',
      subcategory: 'Gimbal',
      manufacturer: 'DJI',
      model: 'Ronin RSC 2',
      serialNumber: 'SN-DJI-77777',
      purchaseDate: new Date('2024-08-05'),
      purchasePrice: 8500000,
      supplier: 'DJI Store Jakarta',
      status: 'AVAILABLE',
      condition: 'GOOD',
      location: 'Equipment Room B',
      notes: 'Gimbal 3-axis untuk camera mirrorless',
      createdById: adminUser.id,
    },
  });

  const asset10 = await prisma.asset.upsert({
    where: { assetCode: 'ACC-202501-002' },
    update: {},
    create: {
      assetCode: 'ACC-202501-002',
      name: 'Manfrotto MT055XPRO3 Tripod',
      category: 'Accessories',
      subcategory: 'Tripod',
      manufacturer: 'Manfrotto',
      model: 'MT055XPRO3',
      serialNumber: 'SN-MAN-88888',
      purchaseDate: new Date('2024-01-20'),
      purchasePrice: 6500000,
      supplier: 'Photography Equipment Store',
      status: 'AVAILABLE',
      condition: 'EXCELLENT',
      location: 'Equipment Room A',
      notes: 'Tripod aluminum professional untuk camera berat',
      createdById: adminUser.id,
    },
  });

  console.log('📷 Assets created:', {
    camera1: asset1.assetCode,
    camera2: asset2.assetCode,
    lens1: asset3.assetCode,
    lens2: asset4.assetCode,
    light1: asset5.assetCode,
    light2: asset6.assetCode,
    audio: asset7.assetCode,
    computer: asset8.assetCode,
    gimbal: asset9.assetCode,
    tripod: asset10.assetCode,
  });

  // ====== EXPANDED SEED DATA FOR COMPREHENSIVE TESTING ======
  // NOTE: Disabled to prevent duplicate constraint violations
  // Core seed data is sufficient for testing

  console.log('✅ Database seeding completed successfully!');
  console.log('\n📊 Summary of seeded data:');
  console.log(`- ${1} admin user`);
  console.log(`- ${6} RBAC test users`);
  console.log(`- ${3} clients`);
  console.log(`- ${5} project types`);
  console.log(`- ${3} projects`);
  console.log(`- ${3} quotations`);
  console.log(`- ${3} invoices`);
  console.log(`- ${1} payment`);
  console.log(`- ${10} assets`);

  /* DISABLED - Extended seeding
  // Create more clients for testing (total: 12 clients)
  console.log('🏢 Creating additional clients...');

  const client4 = await prisma.client.create({
    data: {
      name: 'PT Media Digital Nusantara',
      email: 'contact@mediadigital.co.id',
      phone: '021-8888999',
      address: 'Jl. HR Rasuna Said No. 100, Jakarta Selatan 12950',
      company: 'PT Media Digital Nusantara',
      contactPerson: 'Rina Susanti',
      paymentTerms: 'NET 45',
    },
  });

  const client5 = await prisma.client.create({
    data: {
      name: 'CV Cahaya Berkah',
      email: 'info@cahayaberkah.com',
      phone: '021-7777888',
      address: 'Jl. Kebon Jeruk No. 25, Jakarta Barat 11530',
      company: 'CV Cahaya Berkah',
      contactPerson: 'Bambang Prasetyo',
      paymentTerms: 'NET 30',
    },
  });

  const client6 = await prisma.client.create({
    data: {
      name: 'Toko Online Sukses Jaya',
      email: 'admin@suksesjaya.shop',
      phone: '021-6666777',
      address: 'Jl. Mangga Besar No. 45, Jakarta Pusat 10730',
      company: 'Toko Online Sukses Jaya',
      contactPerson: 'Lisa Anggraini',
      paymentTerms: 'NET 14',
    },
  });

  const client7 = await prisma.client.create({
    data: {
      name: 'PT Inovasi Teknologi',
      email: 'hello@inovasitekno.id',
      phone: '021-5555444',
      address: 'Jl. TB Simatupang No. 88, Jakarta Selatan 12430',
      company: 'PT Inovasi Teknologi',
      contactPerson: 'Hendra Wijaya',
      paymentTerms: 'NET 60',
    },
  });

  const client8 = await prisma.client.create({
    data: {
      name: 'CV Kreatif Studio',
      email: 'studio@kreatifstudio.com',
      phone: '021-4444333',
      address: 'Jl. Senopati No. 12, Jakarta Selatan 12190',
      company: 'CV Kreatif Studio',
      contactPerson: 'Maya Putri',
      paymentTerms: 'NET 21',
    },
  });

  const client9 = await prisma.client.create({
    data: {
      name: 'PT Solusi Bisnis Indonesia',
      email: 'info@solusibisnis.co.id',
      phone: '021-3333222',
      address: 'Jl. Kuningan Raya No. 50, Jakarta Selatan 12940',
      company: 'PT Solusi Bisnis Indonesia',
      contactPerson: 'Rudi Hartono',
      paymentTerms: 'NET 30',
    },
  });

  const client10 = await prisma.client.create({
    data: {
      name: 'Warung Kopi Modern',
      email: 'owner@warkopimodern.id',
      phone: '021-2222111',
      address: 'Jl. Kemang Raya No. 78, Jakarta Selatan 12730',
      company: 'Warung Kopi Modern',
      contactPerson: 'Andi Setiawan',
      paymentTerms: 'NET 7',
    },
  });

  console.log('🏢 Additional clients created:', {
    client4: client4.name,
    client5: client5.name,
    client6: client6.name,
    client7: client7.name,
    client8: client8.name,
    client9: client9.name,
    client10: client10.name,
  });

  // Create more projects (total: 15 projects)
  console.log('📋 Creating additional projects...');

  const project4 = await prisma.project.create({
    data: {
      number: 'PRJ-SM-202502-001',
      description: 'Social Media Campaign - Brand Awareness',
      output: 'Kampanye media sosial 3 platform selama 2 bulan dengan 60 post + video ads',
      projectTypeId: projectTypeSocialMedia.id,
      clientId: client4.id,
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-03-15'),
      estimatedBudget: 25000000,
      basePrice: 25000000,
      status: 'IN_PROGRESS',
    },
  });

  const project5 = await prisma.project.create({
    data: {
      number: 'PRJ-CS-202502-001',
      description: 'IT Consultation - Digital Transformation',
      output: 'Konsultasi transformasi digital dan roadmap implementasi teknologi',
      projectTypeId: projectTypeConsultation.id,
      clientId: client7.id,
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-04-30'),
      estimatedBudget: 50000000,
      basePrice: 50000000,
      status: 'PLANNING',
    },
  });

  const project6 = await prisma.project.create({
    data: {
      number: 'PRJ-PH-202502-001',
      description: 'Mobile App - Food Delivery',
      output: 'Aplikasi mobile iOS dan Android untuk delivery makanan dengan GPS tracking',
      projectTypeId: projectTypeProduction.id,
      clientId: client10.id,
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-06-30'),
      estimatedBudget: 150000000,
      basePrice: 150000000,
      status: 'PLANNING',
    },
  });

  const project7 = await prisma.project.create({
    data: {
      number: 'PRJ-MT-202502-001',
      description: 'Website Maintenance - 6 Months',
      output: 'Maintenance website, bug fixes, dan update konten selama 6 bulan',
      projectTypeId: projectTypeMaintenance.id,
      clientId: client1.id,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-06-30'),
      estimatedBudget: 18000000,
      basePrice: 18000000,
      status: 'IN_PROGRESS',
    },
  });

  const project8 = await prisma.project.create({
    data: {
      number: 'PRJ-PH-202502-002',
      description: 'Company Profile Website',
      output: 'Website company profile responsive dengan CMS untuk update berita',
      projectTypeId: projectTypeProduction.id,
      clientId: client9.id,
      startDate: new Date('2025-02-15'),
      endDate: new Date('2025-04-15'),
      estimatedBudget: 35000000,
      basePrice: 35000000,
      status: 'IN_PROGRESS',
    },
  });

  const project9 = await prisma.project.create({
    data: {
      number: 'PRJ-SM-202502-002',
      description: 'Instagram Content Creation',
      output: 'Produksi konten Instagram 30 post per bulan selama 3 bulan',
      projectTypeId: projectTypeSocialMedia.id,
      clientId: client8.id,
      startDate: new Date('2025-01-10'),
      endDate: new Date('2025-04-10'),
      estimatedBudget: 22000000,
      basePrice: 22000000,
      status: 'IN_PROGRESS',
    },
  });

  const project10 = await prisma.project.create({
    data: {
      number: 'PRJ-PH-202502-003',
      description: 'E-learning Platform Development',
      output: 'Platform e-learning dengan video streaming, quiz, dan progress tracking',
      projectTypeId: projectTypeProduction.id,
      clientId: client5.id,
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-08-31'),
      estimatedBudget: 200000000,
      basePrice: 200000000,
      status: 'PLANNING',
    },
  });

  const project11 = await prisma.project.create({
    data: {
      number: 'PRJ-OT-202502-001',
      description: 'Photography Services - Product Catalog',
      output: '100 foto produk professional dengan editing untuk katalog online',
      projectTypeId: projectTypeOther.id,
      clientId: client6.id,
      startDate: new Date('2025-01-20'),
      endDate: new Date('2025-02-10'),
      estimatedBudget: 12000000,
      basePrice: 12000000,
      status: 'COMPLETED',
    },
  });

  const project12 = await prisma.project.create({
    data: {
      number: 'PRJ-CS-202502-002',
      description: 'SEO Consultation & Strategy',
      output: 'Audit SEO dan strategi optimasi untuk meningkatkan ranking di Google',
      projectTypeId: projectTypeConsultation.id,
      clientId: client3.id,
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-03-01'),
      estimatedBudget: 15000000,
      basePrice: 15000000,
      status: 'IN_PROGRESS',
    },
  });

  console.log('📋 Additional projects created (total 12 projects)');

  // Create more quotations (total: 20 quotations)
  console.log('💼 Creating additional quotations...');

  const quotation4 = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-202501-004',
      date: new Date('2025-01-08'),
      validUntil: new Date('2025-01-23'),
      clientId: client4.id,
      projectId: project4.id,
      amountPerProject: 25000000,
      totalAmount: 25000000,
      terms: 'Pembayaran di awal setiap bulan.\nRevisi unlimited.',
      status: 'APPROVED',
      createdBy: projectManagerUser.id,
    },
  });

  const quotation5 = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-202501-005',
      date: new Date('2025-01-09'),
      validUntil: new Date('2025-01-24'),
      clientId: client7.id,
      projectId: project5.id,
      amountPerProject: 50000000,
      totalAmount: 50000000,
      terms: 'Pembayaran 50% di awal, 50% setelah delivery final report.',
      status: 'SENT',
      createdBy: projectManagerUser.id,
    },
  });

  const quotation6 = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-202501-006',
      date: new Date('2025-01-10'),
      validUntil: new Date('2025-01-25'),
      clientId: client10.id,
      projectId: project6.id,
      amountPerProject: 150000000,
      totalAmount: 150000000,
      terms: 'Pembayaran 4 termin: 40%, 30%, 20%, 10%.',
      status: 'DRAFT',
      createdBy: projectManagerUser.id,
    },
  });

  const quotation7 = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-202501-007',
      date: new Date('2025-01-11'),
      validUntil: new Date('2025-01-26'),
      clientId: client1.id,
      projectId: project7.id,
      amountPerProject: 18000000,
      totalAmount: 18000000,
      terms: 'Pembayaran bulanan Rp 3.000.000 selama 6 bulan.',
      status: 'APPROVED',
      createdBy: adminUser.id,
    },
  });

  const quotation8 = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-202501-008',
      date: new Date('2025-01-12'),
      validUntil: new Date('2025-01-27'),
      clientId: client9.id,
      projectId: project8.id,
      amountPerProject: 35000000,
      totalAmount: 35000000,
      terms: 'Pembayaran 3 termin: 40%, 40%, 20%.',
      status: 'APPROVED',
      createdBy: projectManagerUser.id,
    },
  });

  const quotation9 = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-202501-009',
      date: new Date('2025-01-13'),
      validUntil: new Date('2025-01-28'),
      clientId: client8.id,
      projectId: project9.id,
      amountPerProject: 22000000,
      totalAmount: 22000000,
      terms: 'Pembayaran bulanan di awal bulan.',
      status: 'APPROVED',
      createdBy: projectManagerUser.id,
    },
  });

  const quotation10 = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-202501-010',
      date: new Date('2025-01-14'),
      validUntil: new Date('2025-01-29'),
      clientId: client5.id,
      projectId: project10.id,
      amountPerProject: 200000000,
      totalAmount: 200000000,
      terms: 'Pembayaran 5 termin sesuai milestone development.',
      status: 'SENT',
      createdBy: projectManagerUser.id,
    },
  });

  const quotation11 = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-202501-011',
      date: new Date('2025-01-15'),
      validUntil: new Date('2025-01-30'),
      clientId: client6.id,
      projectId: project11.id,
      amountPerProject: 12000000,
      totalAmount: 12000000,
      terms: 'Pembayaran lunas setelah selesai shooting.',
      status: 'APPROVED',
      createdBy: staffUser.id,
    },
  });

  const quotation12 = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-202501-012',
      date: new Date('2025-01-16'),
      validUntil: new Date('2025-01-31'),
      clientId: client3.id,
      projectId: project12.id,
      amountPerProject: 15000000,
      totalAmount: 15000000,
      terms: 'Pembayaran 50% di awal, 50% setelah delivery.',
      status: 'APPROVED',
      createdBy: projectManagerUser.id,
    },
  });

  console.log('💼 Additional quotations created (total 12 quotations)');

  // Phase 1 Enhancement: Create sample milestone-based quotation
  console.log('🎯 Creating sample milestone-based quotation (Phase 1 Enhancement)...');

  const quotationWithMilestones = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-202501-MILESTONE-001',
      date: new Date('2025-01-15'),
      validUntil: new Date('2025-02-15'),
      clientId: client5.id,
      projectId: project8.id,
      amountPerProject: 50000000,
      totalAmount: 50000000,
      paymentType: 'MILESTONE_BASED',
      paymentTermsText: 'Pembayaran bersadarkan 3 tahap milestone',
      scopeOfWork: 'Pengembangan Sistem Manajemen Inventori dengan 3 fase pengiriman',
      priceBreakdown: {
        items: [
          { name: 'Fase 1: Design & Setup', amount: 15000000 },
          { name: 'Fase 2: Development', amount: 20000000 },
          { name: 'Fase 3: Testing & Deployment', amount: 15000000 }
        ]
      },
      status: 'DRAFT',
      createdBy: projectManagerUser.id,
      paymentMilestones: {
        create: [
          {
            milestoneNumber: 1,
            name: 'Down Payment',
            nameId: 'Uang Muka (DP)',
            description: 'Pembayaran awal untuk mulai proyek',
            descriptionId: 'Initial payment untuk memulai pekerjaan',
            paymentPercentage: 30,
            paymentAmount: 15000000,
            dueDate: new Date('2025-02-01'),
            deliverables: ['Signed contract', 'Project kickoff meeting', 'Design mockups'],
          },
          {
            milestoneNumber: 2,
            name: 'Termin 1',
            nameId: 'Penyelesaian Tahap 1',
            description: 'Pembayaran setelah penyelesaian fase pengembangan',
            descriptionId: 'Payment after development phase completion',
            paymentPercentage: 40,
            paymentAmount: 20000000,
            dueDaysFromPrev: 45,
            deliverables: ['Working prototype', 'Technical documentation', 'User manual draft'],
          },
          {
            milestoneNumber: 3,
            name: 'Pelunasan',
            nameId: 'Pembayaran Akhir',
            description: 'Pembayaran final setelah proyek selesai',
            descriptionId: 'Final payment upon project completion and acceptance',
            paymentPercentage: 30,
            paymentAmount: 15000000,
            dueDaysFromPrev: 30,
            deliverables: ['Final product', 'Complete documentation', 'Training sessions', 'Warranty period'],
          }
        ]
      }
    },
    include: { paymentMilestones: true }
  });

  console.log('✅ Milestone-based quotation created:', {
    id: quotationWithMilestones.id,
    number: quotationWithMilestones.quotationNumber,
    totalAmount: quotationWithMilestones.totalAmount,
    milestones: quotationWithMilestones.paymentMilestones.length
  });

  // Create more invoices (total: 20 invoices)
  console.log('🧾 Creating additional invoices...');

  const invoice4 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-202501-004',
      creationDate: new Date('2025-01-13'),
      dueDate: new Date('2025-02-12'),
      quotationId: quotation4.id,
      clientId: client4.id,
      projectId: project4.id,
      amountPerProject: 25000000,
      totalAmount: 25000000,
      paymentInfo: 'Bank BCA: 1234567890 a.n. Sistem Manajemen Bisnis',
      materaiRequired: true,
      materaiApplied: true,
      terms: 'Pembayaran di awal setiap bulan.',
      status: 'PAID',
      createdBy: projectManagerUser.id,
    },
  });

  const invoice5 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-202501-005',
      creationDate: new Date('2025-01-14'),
      dueDate: new Date('2025-02-13'),
      quotationId: quotation7.id,
      clientId: client1.id,
      projectId: project7.id,
      amountPerProject: 3000000,
      totalAmount: 3000000,
      paymentInfo: 'Bank Mandiri: 0987654321 a.n. Sistem Manajemen Bisnis',
      materaiRequired: false,
      materaiApplied: false,
      terms: 'Invoice bulanan untuk maintenance bulan Januari.',
      status: 'PAID',
      createdBy: adminUser.id,
    },
  });

  const invoice6 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-202501-006',
      creationDate: new Date('2025-01-15'),
      dueDate: new Date('2025-02-14'),
      quotationId: quotation8.id,
      clientId: client9.id,
      projectId: project8.id,
      amountPerProject: 14000000,
      totalAmount: 14000000,
      paymentInfo: 'Bank BCA: 1234567890 a.n. Sistem Manajemen Bisnis',
      materaiRequired: true,
      materaiApplied: true,
      terms: 'Invoice termin 1 (40%).',
      status: 'SENT',
      createdBy: projectManagerUser.id,
    },
  });

  const invoice7 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-202501-007',
      creationDate: new Date('2025-01-16'),
      dueDate: new Date('2025-02-15'),
      quotationId: quotation9.id,
      clientId: client8.id,
      projectId: project9.id,
      amountPerProject: 7333333,
      totalAmount: 7333333,
      paymentInfo: 'Bank BNI: 1122334455 a.n. Sistem Manajemen Bisnis',
      materaiRequired: true,
      materaiApplied: false,
      terms: 'Invoice bulan Januari (1/3).',
      status: 'OVERDUE',
      createdBy: projectManagerUser.id,
    },
  });

  const invoice8 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-202501-008',
      creationDate: new Date('2025-01-17'),
      dueDate: new Date('2025-02-16'),
      quotationId: quotation11.id,
      clientId: client6.id,
      projectId: project11.id,
      amountPerProject: 12000000,
      totalAmount: 12000000,
      paymentInfo: 'Bank BCA: 1234567890 a.n. Sistem Manajemen Bisnis',
      materaiRequired: true,
      materaiApplied: true,
      terms: 'Pembayaran lunas untuk photography services.',
      status: 'PAID',
      createdBy: staffUser.id,
    },
  });

  const invoice9 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-202501-009',
      creationDate: new Date('2025-01-18'),
      dueDate: new Date('2025-02-17'),
      quotationId: quotation12.id,
      clientId: client3.id,
      projectId: project12.id,
      amountPerProject: 7500000,
      totalAmount: 7500000,
      paymentInfo: 'Bank Mandiri: 0987654321 a.n. Sistem Manajemen Bisnis',
      materaiRequired: true,
      materaiApplied: true,
      terms: 'Invoice termin 1 (50%).',
      status: 'SENT',
      createdBy: projectManagerUser.id,
    },
  });

  const invoice10 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-202501-010',
      creationDate: new Date('2025-01-19'),
      dueDate: new Date('2025-02-18'),
      clientId: client2.id,
      projectId: project2.id,
      amountPerProject: 5000000,
      totalAmount: 5000000,
      paymentInfo: 'Bank BCA: 1234567890 a.n. Sistem Manajemen Bisnis',
      materaiRequired: false,
      materaiApplied: false,
      terms: 'Invoice bulan Februari.',
      status: 'DRAFT',
      createdBy: staffUser.id,
    },
  });

  console.log('🧾 Additional invoices created (total 10 invoices)');

  // Create more payments (total: 15 payments)
  console.log('💳 Creating additional payments...');

  const payment2 = await prisma.payment.create({
    data: {
      invoiceId: invoice4.id,
      amount: 25000000,
      paymentDate: new Date('2025-01-16'),
      paymentMethod: 'BANK_TRANSFER',
      transactionRef: 'TRX-20250116-001',
      bankDetails: 'Transfer dari Bank Mandiri rekening 5555444433 a.n. PT Media Digital Nusantara',
      status: 'CONFIRMED',
      confirmedAt: new Date('2025-01-16'),
    },
  });

  const payment3 = await prisma.payment.create({
    data: {
      invoiceId: invoice5.id,
      amount: 3000000,
      paymentDate: new Date('2025-01-17'),
      paymentMethod: 'BANK_TRANSFER',
      transactionRef: 'TRX-20250117-001',
      bankDetails: 'Transfer dari Bank BCA rekening 3333222211 a.n. PT Teknologi Maju',
      status: 'CONFIRMED',
      confirmedAt: new Date('2025-01-17'),
    },
  });

  const payment4 = await prisma.payment.create({
    data: {
      invoiceId: invoice8.id,
      amount: 12000000,
      paymentDate: new Date('2025-01-18'),
      paymentMethod: 'CASH',
      transactionRef: 'CASH-20250118-001',
      bankDetails: 'Pembayaran tunai',
      status: 'CONFIRMED',
      confirmedAt: new Date('2025-01-18'),
    },
  });

  const payment5 = await prisma.payment.create({
    data: {
      invoiceId: invoice1.id,
      amount: 22500000,
      paymentDate: new Date('2025-01-20'),
      paymentMethod: 'BANK_TRANSFER',
      transactionRef: 'TRX-20250120-001',
      bankDetails: 'Transfer dari Bank BNI (termin 1 - 30%)',
      status: 'CONFIRMED',
      confirmedAt: new Date('2025-01-20'),
    },
  });

  const payment6 = await prisma.payment.create({
    data: {
      invoiceId: invoice7.id,
      amount: 7333333,
      paymentDate: new Date('2025-01-22'),
      paymentMethod: 'OTHER',
      transactionRef: 'VA-20250122-001',
      bankDetails: 'Virtual Account BCA',
      status: 'PENDING',
    },
  });

  console.log('💳 Additional payments created (total 6 payments)');

  // Create journal entries for accounting
  console.log('📒 Creating journal entries...');

  // Journal Entry 1: Invoice INV-202501-001 sent (Revenue Recognition)
  const journal1 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-202501-001',
      entryDate: new Date('2025-01-10'),
      postingDate: new Date('2025-01-10'),
      description: 'Revenue recognition - Invoice INV-202501-001',
      descriptionId: 'Pengakuan pendapatan - Invoice INV-202501-001',
      transactionType: 'INVOICE_SENT',
      transactionId: invoice1.id,
      documentNumber: invoice1.invoiceNumber,
      documentDate: invoice1.creationDate,
      status: 'POSTED',
      isPosted: true,
      postedAt: new Date('2025-01-10'),
      fiscalPeriodId: periods[0].id,
      createdBy: adminUser.id,
      lineItems: {
        create: [
          {
            lineNumber: 1,
            accountId: accountReceivable.id,
            debit: 75000000,
            credit: 0,
            description: 'Accounts Receivable - PT Teknologi Maju',
            projectId: project1.id,
            clientId: client1.id,
          },
          {
            lineNumber: 2,
            accountId: accountServiceRevenue.id,
            debit: 0,
            credit: 75000000,
            description: 'Service Revenue - Website E-commerce',
            projectId: project1.id,
            clientId: client1.id,
          },
        ],
      },
    },
  });

  // Journal Entry 2: Payment received for Invoice INV-202501-002
  const journal2 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-202501-002',
      entryDate: new Date('2025-01-15'),
      postingDate: new Date('2025-01-15'),
      description: 'Payment received - Invoice INV-202501-002',
      descriptionId: 'Penerimaan pembayaran - Invoice INV-202501-002',
      transactionType: 'PAYMENT_RECEIVED',
      transactionId: payment1.id,
      documentNumber: payment1.transactionRef,
      documentDate: payment1.paymentDate,
      status: 'POSTED',
      isPosted: true,
      postedAt: new Date('2025-01-15'),
      fiscalPeriodId: periods[0].id,
      createdBy: adminUser.id,
      lineItems: {
        create: [
          {
            lineNumber: 1,
            accountId: accountBank.id,
            debit: 15000000,
            credit: 0,
            description: 'Cash received - Bank BCA',
            projectId: project2.id,
            clientId: client2.id,
          },
          {
            lineNumber: 2,
            accountId: accountReceivable.id,
            debit: 0,
            credit: 15000000,
            description: 'AR reduction - CV Kreatif Digital',
            projectId: project2.id,
            clientId: client2.id,
          },
        ],
      },
    },
  });

  // Journal Entry 3: Payment received for Invoice INV-202501-004
  const journal3 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-202501-003',
      entryDate: new Date('2025-01-16'),
      postingDate: new Date('2025-01-16'),
      description: 'Payment received - Invoice INV-202501-004',
      descriptionId: 'Penerimaan pembayaran - Invoice INV-202501-004',
      transactionType: 'PAYMENT_RECEIVED',
      transactionId: payment2.id,
      documentNumber: payment2.transactionRef,
      documentDate: payment2.paymentDate,
      status: 'POSTED',
      isPosted: true,
      postedAt: new Date('2025-01-16'),
      fiscalPeriodId: periods[0].id,
      createdBy: accountantUser.id,
      lineItems: {
        create: [
          {
            lineNumber: 1,
            accountId: accountBank.id,
            debit: 25000000,
            credit: 0,
            description: 'Cash received - Bank Mandiri',
            projectId: project4.id,
            clientId: client4.id,
          },
          {
            lineNumber: 2,
            accountId: accountReceivable.id,
            debit: 0,
            credit: 25000000,
            description: 'AR reduction - PT Media Digital Nusantara',
            projectId: project4.id,
            clientId: client4.id,
          },
        ],
      },
    },
  });

  // Journal Entry 4: Payment received for Invoice INV-202501-008 (Cash)
  const journal4 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-202501-004',
      entryDate: new Date('2025-01-18'),
      postingDate: new Date('2025-01-18'),
      description: 'Cash payment received - Invoice INV-202501-008',
      descriptionId: 'Penerimaan pembayaran tunai - Invoice INV-202501-008',
      transactionType: 'PAYMENT_RECEIVED',
      transactionId: payment4.id,
      documentNumber: payment4.transactionRef,
      documentDate: payment4.paymentDate,
      status: 'POSTED',
      isPosted: true,
      postedAt: new Date('2025-01-18'),
      fiscalPeriodId: periods[0].id,
      createdBy: accountantUser.id,
      lineItems: {
        create: [
          {
            lineNumber: 1,
            accountId: accountCash.id,
            debit: 12000000,
            credit: 0,
            description: 'Cash received',
            projectId: project11.id,
            clientId: client6.id,
          },
          {
            lineNumber: 2,
            accountId: accountReceivable.id,
            debit: 0,
            credit: 12000000,
            description: 'AR reduction - Toko Online Sukses Jaya',
            projectId: project11.id,
            clientId: client6.id,
          },
        ],
      },
    },
  });

  // Journal Entry 5: Depreciation for January 2025
  const journal5 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-202501-005',
      entryDate: new Date('2025-01-31'),
      description: 'Depreciation expense for January 2025',
      descriptionId: 'Beban penyusutan bulan Januari 2025',
      transactionType: 'DEPRECIATION',
      transactionId: 'DEPRECIATION-202501',
      status: 'POSTED',
      isPosted: true,
      postedAt: new Date('2025-01-31'),
      fiscalPeriodId: periods[0].id,
      createdBy: accountantUser.id,
      lineItems: {
        create: [
          {
            lineNumber: 1,
            accountId: accountDepreciationExpense.id,
            debit: 5000000,
            credit: 0,
            description: 'Monthly depreciation for equipment',
            descriptionId: 'Penyusutan bulanan peralatan',
          },
          {
            lineNumber: 2,
            accountId: accountAccumulatedDepreciation.id,
            debit: 0,
            credit: 5000000,
            description: 'Accumulated depreciation',
            descriptionId: 'Akumulasi penyusutan',
          },
        ],
      },
    },
  });

  // Journal Entry 6: Manual adjustment
  const journal6 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-202501-006',
      entryDate: new Date('2025-01-20'),
      description: 'Adjustment for prepaid expenses',
      descriptionId: 'Penyesuaian untuk biaya dibayar dimuka',
      transactionType: 'ADJUSTMENT',
      transactionId: 'ADJ-202501-001',
      status: 'POSTED',
      isPosted: true,
      postedAt: new Date('2025-01-20'),
      fiscalPeriodId: periods[0].id,
      createdBy: accountantUser.id,
      lineItems: {
        create: [
          {
            lineNumber: 1,
            accountId: accountOfficeRent.id,
            debit: 3000000,
            credit: 0,
            description: 'Rent expense for January',
          },
          {
            lineNumber: 2,
            accountId: accountPrepaidExpenses.id,
            debit: 0,
            credit: 3000000,
            description: 'Prepaid rent adjustment',
          },
        ],
      },
    },
  });

  // Journal Entry 7: Invoice INV-202501-002 sent
  const journal7 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-202501-007',
      entryDate: new Date('2025-01-11'),
      postingDate: new Date('2025-01-11'),
      description: 'Revenue recognition - Invoice INV-202501-002',
      descriptionId: 'Pengakuan pendapatan - Invoice INV-202501-002',
      transactionType: 'INVOICE_SENT',
      transactionId: invoice2.id,
      documentNumber: invoice2.invoiceNumber,
      documentDate: invoice2.creationDate,
      status: 'POSTED',
      isPosted: true,
      postedAt: new Date('2025-01-11'),
      fiscalPeriodId: periods[0].id,
      createdBy: adminUser.id,
      lineItems: {
        create: [
          {
            lineNumber: 1,
            accountId: accountReceivable.id,
            debit: 15000000,
            credit: 0,
            description: 'Accounts Receivable - CV Kreatif Digital',
            projectId: project2.id,
            clientId: client2.id,
          },
          {
            lineNumber: 2,
            accountId: accountServiceRevenue.id,
            debit: 0,
            credit: 15000000,
            description: 'Service Revenue - Social Media',
            projectId: project2.id,
            clientId: client2.id,
          },
        ],
      },
    },
  });

  // Journal Entry 8: Invoice INV-202501-004 sent
  const journal8 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-202501-008',
      entryDate: new Date('2025-01-13'),
      postingDate: new Date('2025-01-13'),
      description: 'Revenue recognition - Invoice INV-202501-004',
      descriptionId: 'Pengakuan pendapatan - Invoice INV-202501-004',
      transactionType: 'INVOICE_SENT',
      transactionId: invoice4.id,
      documentNumber: invoice4.invoiceNumber,
      documentDate: invoice4.creationDate,
      status: 'POSTED',
      isPosted: true,
      postedAt: new Date('2025-01-13'),
      fiscalPeriodId: periods[0].id,
      createdBy: projectManagerUser.id,
      lineItems: {
        create: [
          {
            lineNumber: 1,
            accountId: accountReceivable.id,
            debit: 25000000,
            credit: 0,
            description: 'Accounts Receivable - PT Media Digital Nusantara',
            projectId: project4.id,
            clientId: client4.id,
          },
          {
            lineNumber: 2,
            accountId: accountServiceRevenue.id,
            debit: 0,
            credit: 25000000,
            description: 'Service Revenue - Social Media Campaign',
            projectId: project4.id,
            clientId: client4.id,
          },
        ],
      },
    },
  });

  // Journal Entry 9: Invoice INV-202501-008 sent
  const journal9 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-202501-009',
      entryDate: new Date('2025-01-17'),
      postingDate: new Date('2025-01-17'),
      description: 'Revenue recognition - Invoice INV-202501-008',
      descriptionId: 'Pengakuan pendapatan - Invoice INV-202501-008',
      transactionType: 'INVOICE_SENT',
      transactionId: invoice8.id,
      documentNumber: invoice8.invoiceNumber,
      documentDate: invoice8.creationDate,
      status: 'POSTED',
      isPosted: true,
      postedAt: new Date('2025-01-17'),
      fiscalPeriodId: periods[0].id,
      createdBy: staffUser.id,
      lineItems: {
        create: [
          {
            lineNumber: 1,
            accountId: accountReceivable.id,
            debit: 12000000,
            credit: 0,
            description: 'Accounts Receivable - Toko Online Sukses Jaya',
            projectId: project11.id,
            clientId: client6.id,
          },
          {
            lineNumber: 2,
            accountId: accountServiceRevenue.id,
            debit: 0,
            credit: 12000000,
            description: 'Service Revenue - Photography Services',
            projectId: project11.id,
            clientId: client6.id,
          },
        ],
      },
    },
  });

  console.log('📒 Journal entries created: 9 entries (invoices + payments + adjustments)');

  // Create simplified expense records
  console.log('💰 Creating expense records...');

  const expense1 = await prisma.expense.create({
    data: {
      expenseNumber: 'EXP-202501-001',
      buktiPengeluaranNumber: 'BKK-202501-001',
      accountCode: expenseCategoryOfficeRent.accountCode,
      accountName: expenseCategoryOfficeRent.nameId,
      accountNameEn: expenseCategoryOfficeRent.name,
      expenseClass: 'GENERAL_ADMIN',
      description: 'Sewa kantor bulan Januari 2025',
      descriptionId: 'Sewa kantor bulan Januari 2025',
      descriptionEn: 'Office rent for January 2025',
      ppnRate: 0.12,
      ppnAmount: 1800000,
      ppnCategory: 'CREDITABLE',
      vendorName: 'PT Property Management Jakarta',
      vendorNPWP: '01.234.567.8-901.000',
      vendorAddress: 'Jl. Sudirman No. 456, Jakarta',
      grossAmount: 15000000,
      netAmount: 16800000,
      totalAmount: 16800000,
      expenseDate: new Date('2025-01-05'),
      categoryId: expenseCategoryOfficeRent.id,
      userId: accountantUser.id,
      status: 'PAID',
      paymentMethod: 'BANK_TRANSFER',
      isTaxDeductible: true,
      approvedBy: financeManagerUser.id,
      approvedAt: new Date('2025-01-05'),
    },
  });

  const expense2 = await prisma.expense.create({
    data: {
      expenseNumber: 'EXP-202501-002',
      buktiPengeluaranNumber: 'BKK-202501-002',
      accountCode: expenseCategoryUtilities.accountCode,
      accountName: expenseCategoryUtilities.nameId,
      accountNameEn: expenseCategoryUtilities.name,
      expenseClass: 'GENERAL_ADMIN',
      description: 'Tagihan listrik dan air bulan Desember 2024',
      descriptionId: 'Tagihan listrik dan air bulan Desember 2024',
      descriptionEn: 'Electricity and water bill for December 2024',
      ppnRate: 0.12,
      ppnAmount: 300000,
      ppnCategory: 'CREDITABLE',
      vendorName: 'PLN & PDAM',
      grossAmount: 2500000,
      netAmount: 2800000,
      totalAmount: 2800000,
      expenseDate: new Date('2025-01-07'),
      categoryId: expenseCategoryUtilities.id,
      userId: staffUser.id,
      status: 'PAID',
      paymentMethod: 'BANK_TRANSFER',
      isTaxDeductible: true,
      approvedBy: accountantUser.id,
      approvedAt: new Date('2025-01-07'),
    },
  });

  const expense3 = await prisma.expense.create({
    data: {
      expenseNumber: 'EXP-202501-003',
      buktiPengeluaranNumber: 'BKK-202501-003',
      accountCode: expenseCategoryAdvertising.accountCode,
      accountName: expenseCategoryAdvertising.nameId,
      accountNameEn: expenseCategoryAdvertising.name,
      expenseClass: 'SELLING',
      description: 'Iklan Google Ads bulan Januari',
      descriptionId: 'Iklan Google Ads bulan Januari',
      descriptionEn: 'Google Ads for January',
      ppnRate: 0.12,
      ppnAmount: 960000,
      ppnCategory: 'CREDITABLE',
      vendorName: 'Google Indonesia',
      grossAmount: 8000000,
      netAmount: 8960000,
      totalAmount: 8960000,
      expenseDate: new Date('2025-01-10'),
      categoryId: expenseCategoryAdvertising.id,
      userId: financeManagerUser.id,
      status: 'PAID',
      isTaxDeductible: true,
      approvedBy: financeManagerUser.id,
      approvedAt: new Date('2025-01-10'),
    },
  });

  const expense4 = await prisma.expense.create({
    data: {
      expenseNumber: 'EXP-202501-004',
      buktiPengeluaranNumber: 'BKK-202501-004',
      accountCode: expenseCategorySoftware.accountCode,
      accountName: expenseCategorySoftware.nameId,
      accountNameEn: expenseCategorySoftware.name,
      expenseClass: 'GENERAL_ADMIN',
      description: 'Subscription Adobe Creative Cloud (annual)',
      descriptionId: 'Langganan Adobe Creative Cloud (tahunan)',
      descriptionEn: 'Adobe Creative Cloud subscription (annual)',
      ppnRate: 0.12,
      ppnAmount: 420000,
      ppnCategory: 'CREDITABLE',
      vendorName: 'Adobe Systems',
      grossAmount: 3500000,
      netAmount: 3920000,
      totalAmount: 3920000,
      expenseDate: new Date('2025-01-12'),
      categoryId: expenseCategorySoftware.id,
      userId: accountantUser.id,
      status: 'PAID',
      isTaxDeductible: true,
      approvedBy: financeManagerUser.id,
      approvedAt: new Date('2025-01-12'),
    },
  });

  const expense5 = await prisma.expense.create({
    data: {
      expenseNumber: 'EXP-202501-005',
      buktiPengeluaranNumber: 'BKK-202501-005',
      accountCode: expenseCategoryOfficeSupplies.accountCode,
      accountName: expenseCategoryOfficeSupplies.nameId,
      accountNameEn: expenseCategoryOfficeSupplies.name,
      expenseClass: 'GENERAL_ADMIN',
      description: 'Pembelian alat tulis dan supplies kantor',
      descriptionId: 'Pembelian alat tulis dan supplies kantor',
      descriptionEn: 'Purchase of stationery and office supplies',
      ppnRate: 0.12,
      ppnAmount: 144000,
      ppnCategory: 'CREDITABLE',
      vendorName: 'Toko ATK Sentral',
      grossAmount: 1200000,
      netAmount: 1344000,
      totalAmount: 1344000,
      expenseDate: new Date('2025-01-13'),
      categoryId: expenseCategoryOfficeSupplies.id,
      userId: staffUser.id,
      status: 'PAID',
      paymentMethod: 'CASH',
      isTaxDeductible: true,
      approvedBy: accountantUser.id,
      approvedAt: new Date('2025-01-13'),
    },
  });

  const expense6 = await prisma.expense.create({
    data: {
      expenseNumber: 'EXP-202501-006',
      buktiPengeluaranNumber: 'BKK-202501-006',
      accountCode: expenseCategoryDigitalMarketing.accountCode,
      accountName: expenseCategoryDigitalMarketing.nameId,
      accountNameEn: expenseCategoryDigitalMarketing.name,
      expenseClass: 'SELLING',
      description: 'Facebook & Instagram Ads campaign',
      descriptionId: 'Kampanye iklan Facebook & Instagram',
      descriptionEn: 'Facebook & Instagram Ads campaign',
      ppnRate: 0.12,
      ppnAmount: 600000,
      ppnCategory: 'CREDITABLE',
      vendorName: 'Meta Platforms',
      grossAmount: 5000000,
      netAmount: 5600000,
      totalAmount: 5600000,
      expenseDate: new Date('2025-01-15'),
      categoryId: expenseCategoryDigitalMarketing.id,
      userId: financeManagerUser.id,
      status: 'PAID',
      isTaxDeductible: true,
      approvedBy: financeManagerUser.id,
      approvedAt: new Date('2025-01-15'),
    },
  });

  const expense7 = await prisma.expense.create({
    data: {
      expenseNumber: 'EXP-202501-007',
      buktiPengeluaranNumber: 'BKK-202501-007',
      accountCode: expenseCategoryProfessionalServices.accountCode,
      accountName: expenseCategoryProfessionalServices.nameId,
      accountNameEn: expenseCategoryProfessionalServices.name,
      expenseClass: 'GENERAL_ADMIN',
      description: 'Jasa konsultan pajak untuk laporan tahunan',
      descriptionId: 'Jasa konsultan pajak untuk laporan tahunan',
      descriptionEn: 'Tax consultant services for annual report',
      ppnRate: 0.12,
      ppnAmount: 900000,
      ppnCategory: 'CREDITABLE',
      withholdingTaxType: 'PPH23',
      withholdingTaxRate: 0.02,
      withholdingTaxAmount: 150000,
      vendorName: 'KAP Rekan & Partners',
      vendorNPWP: '02.345.678.9-012.000',
      grossAmount: 7500000,
      netAmount: 8250000,
      totalAmount: 8400000,
      expenseDate: new Date('2025-01-18'),
      categoryId: expenseCategoryProfessionalServices.id,
      userId: accountantUser.id,
      status: 'APPROVED',
      isTaxDeductible: true,
      approvedBy: financeManagerUser.id,
      approvedAt: new Date('2025-01-19'),
    },
  });

  const expense8 = await prisma.expense.create({
    data: {
      expenseNumber: 'EXP-202501-008',
      buktiPengeluaranNumber: 'BKK-202501-008',
      accountCode: expenseCategoryBankCharges.accountCode,
      accountName: expenseCategoryBankCharges.nameId,
      accountNameEn: expenseCategoryBankCharges.name,
      expenseClass: 'GENERAL_ADMIN',
      description: 'Biaya administrasi bank bulan Januari',
      descriptionId: 'Biaya administrasi bank bulan Januari',
      descriptionEn: 'Bank administration fees for January',
      ppnRate: 0.00,
      ppnAmount: 0,
      ppnCategory: 'NON_CREDITABLE',
      vendorName: 'Bank BCA',
      grossAmount: 150000,
      netAmount: 150000,
      totalAmount: 150000,
      expenseDate: new Date('2025-01-20'),
      categoryId: expenseCategoryBankCharges.id,
      userId: accountantUser.id,
      status: 'PAID',
      isTaxDeductible: true,
      approvedBy: accountantUser.id,
      approvedAt: new Date('2025-01-20'),
    },
  });

  console.log('💰 Expense records created: 8 expenses');

  // Create journal entries for expenses
  console.log('📒 Creating expense journal entries...');

  // Expense 1: Office Rent
  const journalExp1 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-202501-010',
      entryDate: new Date('2025-01-05'),
      postingDate: new Date('2025-01-05'),
      description: 'Office rent expense',
      descriptionId: 'Beban sewa kantor',
      transactionType: 'EXPENSE_PAID',
      transactionId: expense1.id,
      documentNumber: expense1.expenseNumber,
      documentDate: expense1.expenseDate,
      status: 'POSTED',
      isPosted: true,
      postedAt: new Date('2025-01-05'),
      fiscalPeriodId: periods[0].id,
      createdBy: accountantUser.id,
      lineItems: {
        create: [
          {
            lineNumber: 1,
            accountId: accountOfficeRent.id,
            debit: 15000000,
            credit: 0,
            description: 'Office rent January 2025',
          },
          {
            lineNumber: 2,
            accountId: accountPPNPayable.id,
            debit: 1800000,
            credit: 0,
            description: 'PPN creditable 12%',
          },
          {
            lineNumber: 3,
            accountId: accountBank.id,
            debit: 0,
            credit: 16800000,
            description: 'Payment via bank transfer',
          },
        ],
      },
    },
  });

  // Expense 2: Utilities
  const journalExp2 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-202501-011',
      entryDate: new Date('2025-01-07'),
      postingDate: new Date('2025-01-07'),
      description: 'Utilities expense',
      descriptionId: 'Beban listrik dan air',
      transactionType: 'EXPENSE_PAID',
      transactionId: expense2.id,
      documentNumber: expense2.expenseNumber,
      documentDate: expense2.expenseDate,
      status: 'POSTED',
      isPosted: true,
      postedAt: new Date('2025-01-07'),
      fiscalPeriodId: periods[0].id,
      createdBy: accountantUser.id,
      lineItems: {
        create: [
          {
            lineNumber: 1,
            accountId: accountUtilities.id,
            debit: 2500000,
            credit: 0,
            description: 'Electricity and water',
          },
          {
            lineNumber: 2,
            accountId: accountPPNPayable.id,
            debit: 300000,
            credit: 0,
            description: 'PPN creditable 12%',
          },
          {
            lineNumber: 3,
            accountId: accountBank.id,
            debit: 0,
            credit: 2800000,
            description: 'Payment via bank transfer',
          },
        ],
      },
    },
  });

  // Expense 3: Google Ads
  const journalExp3 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-202501-012',
      entryDate: new Date('2025-01-10'),
      postingDate: new Date('2025-01-10'),
      description: 'Advertising expense - Google Ads',
      descriptionId: 'Beban iklan - Google Ads',
      transactionType: 'EXPENSE_PAID',
      transactionId: expense3.id,
      documentNumber: expense3.expenseNumber,
      documentDate: expense3.expenseDate,
      status: 'POSTED',
      isPosted: true,
      postedAt: new Date('2025-01-10'),
      fiscalPeriodId: periods[0].id,
      createdBy: financeManagerUser.id,
      lineItems: {
        create: [
          {
            lineNumber: 1,
            accountId: accountAdvertising.id,
            debit: 8000000,
            credit: 0,
            description: 'Google Ads campaign',
          },
          {
            lineNumber: 2,
            accountId: accountPPNPayable.id,
            debit: 960000,
            credit: 0,
            description: 'PPN creditable 12%',
          },
          {
            lineNumber: 3,
            accountId: accountBank.id,
            debit: 0,
            credit: 8960000,
            description: 'Payment via credit card',
          },
        ],
      },
    },
  });

  // Expense 4: Software
  const journalExp4 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-202501-013',
      entryDate: new Date('2025-01-12'),
      postingDate: new Date('2025-01-12'),
      description: 'Software subscription - Adobe',
      descriptionId: 'Langganan software - Adobe',
      transactionType: 'EXPENSE_PAID',
      transactionId: expense4.id,
      documentNumber: expense4.expenseNumber,
      documentDate: expense4.expenseDate,
      status: 'POSTED',
      isPosted: true,
      postedAt: new Date('2025-01-12'),
      fiscalPeriodId: periods[0].id,
      createdBy: accountantUser.id,
      lineItems: {
        create: [
          {
            lineNumber: 1,
            accountId: accountSoftware.id,
            debit: 3500000,
            credit: 0,
            description: 'Adobe Creative Cloud annual',
          },
          {
            lineNumber: 2,
            accountId: accountPPNPayable.id,
            debit: 420000,
            credit: 0,
            description: 'PPN creditable 12%',
          },
          {
            lineNumber: 3,
            accountId: accountBank.id,
            debit: 0,
            credit: 3920000,
            description: 'Payment via credit card',
          },
        ],
      },
    },
  });

  // Expense 5: Office Supplies
  const journalExp5 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-202501-014',
      entryDate: new Date('2025-01-13'),
      postingDate: new Date('2025-01-13'),
      description: 'Office supplies expense',
      descriptionId: 'Beban perlengkapan kantor',
      transactionType: 'EXPENSE_PAID',
      transactionId: expense5.id,
      documentNumber: expense5.expenseNumber,
      documentDate: expense5.expenseDate,
      status: 'POSTED',
      isPosted: true,
      postedAt: new Date('2025-01-13'),
      fiscalPeriodId: periods[0].id,
      createdBy: accountantUser.id,
      lineItems: {
        create: [
          {
            lineNumber: 1,
            accountId: accountOfficeSupplies.id,
            debit: 1200000,
            credit: 0,
            description: 'Stationery and supplies',
          },
          {
            lineNumber: 2,
            accountId: accountPPNPayable.id,
            debit: 144000,
            credit: 0,
            description: 'PPN creditable 12%',
          },
          {
            lineNumber: 3,
            accountId: accountCash.id,
            debit: 0,
            credit: 1344000,
            description: 'Payment in cash',
          },
        ],
      },
    },
  });

  // Expense 6: Digital Marketing
  const journalExp6 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-202501-015',
      entryDate: new Date('2025-01-15'),
      postingDate: new Date('2025-01-15'),
      description: 'Digital marketing - Facebook & Instagram',
      descriptionId: 'Marketing digital - Facebook & Instagram',
      transactionType: 'EXPENSE_PAID',
      transactionId: expense6.id,
      documentNumber: expense6.expenseNumber,
      documentDate: expense6.expenseDate,
      status: 'POSTED',
      isPosted: true,
      postedAt: new Date('2025-01-15'),
      fiscalPeriodId: periods[0].id,
      createdBy: financeManagerUser.id,
      lineItems: {
        create: [
          {
            lineNumber: 1,
            accountId: accountDigitalMarketing.id,
            debit: 5000000,
            credit: 0,
            description: 'Facebook & Instagram ads',
          },
          {
            lineNumber: 2,
            accountId: accountPPNPayable.id,
            debit: 600000,
            credit: 0,
            description: 'PPN creditable 12%',
          },
          {
            lineNumber: 3,
            accountId: accountBank.id,
            debit: 0,
            credit: 5600000,
            description: 'Payment via credit card',
          },
        ],
      },
    },
  });

  // Expense 7: Professional Services (with PPh23 withholding)
  const journalExp7 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-202501-016',
      entryDate: new Date('2025-01-18'),
      postingDate: new Date('2025-01-18'),
      description: 'Professional services - Tax consultant',
      descriptionId: 'Jasa profesional - Konsultan pajak',
      transactionType: 'EXPENSE_SUBMITTED',
      transactionId: expense7.id,
      documentNumber: expense7.expenseNumber,
      documentDate: expense7.expenseDate,
      status: 'POSTED',
      isPosted: true,
      postedAt: new Date('2025-01-18'),
      fiscalPeriodId: periods[0].id,
      createdBy: accountantUser.id,
      lineItems: {
        create: [
          {
            lineNumber: 1,
            accountId: accountProfessionalServices.id,
            debit: 7500000,
            credit: 0,
            description: 'Tax consultant annual report',
          },
          {
            lineNumber: 2,
            accountId: accountPPNPayable.id,
            debit: 900000,
            credit: 0,
            description: 'PPN creditable 12%',
          },
          {
            lineNumber: 3,
            accountId: accountPayable.id,
            debit: 0,
            credit: 8250000,
            description: 'AP - KAP Rekan & Partners',
          },
          {
            lineNumber: 4,
            accountId: accountPPhPayable.id,
            debit: 0,
            credit: 150000,
            description: 'PPh23 withholding 2%',
          },
        ],
      },
    },
  });

  // Expense 8: Bank Charges
  const journalExp8 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-202501-017',
      entryDate: new Date('2025-01-20'),
      postingDate: new Date('2025-01-20'),
      description: 'Bank charges',
      descriptionId: 'Biaya administrasi bank',
      transactionType: 'EXPENSE_PAID',
      transactionId: expense8.id,
      documentNumber: expense8.expenseNumber,
      documentDate: expense8.expenseDate,
      status: 'POSTED',
      isPosted: true,
      postedAt: new Date('2025-01-20'),
      fiscalPeriodId: periods[0].id,
      createdBy: accountantUser.id,
      lineItems: {
        create: [
          {
            lineNumber: 1,
            accountId: accountBankCharges.id,
            debit: 150000,
            credit: 0,
            description: 'Monthly bank fees',
          },
          {
            lineNumber: 2,
            accountId: accountBank.id,
            debit: 0,
            credit: 150000,
            description: 'Auto deduction by bank',
          },
        ],
      },
    },
  });

  console.log('📒 Expense journal entries created: 8 entries');

  // Create more assets (total: 20 assets)
  console.log('📷 Creating additional assets...');

  const asset11 = await prisma.asset.create({
    data: {
      assetCode: 'COM-202501-002',
      name: 'Dell Precision 7560 Workstation',
      category: 'Computer',
      subcategory: 'Laptop',
      manufacturer: 'Dell',
      model: 'Precision 7560',
      serialNumber: 'SN-DELL-99999',
      purchaseDate: new Date('2024-06-15'),
      purchasePrice: 35000000,
      supplier: 'Dell Indonesia',
      status: 'AVAILABLE',
      condition: 'EXCELLENT',
      location: 'Office Floor 2',
      notes: 'Laptop untuk 3D rendering dan heavy computing',
      createdById: adminUser.id,
    },
  });

  const asset12 = await prisma.asset.create({
    data: {
      assetCode: 'AUD-202501-002',
      name: 'Zoom H6 Audio Recorder',
      category: 'Audio',
      subcategory: 'Recorder',
      manufacturer: 'Zoom',
      model: 'H6',
      serialNumber: 'SN-ZOOM-12121',
      purchaseDate: new Date('2024-07-20'),
      purchasePrice: 5500000,
      supplier: 'Audio Pro Store',
      status: 'AVAILABLE',
      condition: 'GOOD',
      location: 'Equipment Room A',
      notes: '6-track portable audio recorder',
      createdById: adminUser.id,
    },
  });

  const asset13 = await prisma.asset.create({
    data: {
      assetCode: 'LIG-202501-003',
      name: 'Neewer LED Panel 660 Pro',
      category: 'Lighting',
      subcategory: 'LED Panel',
      manufacturer: 'Neewer',
      model: '660 Pro',
      serialNumber: 'SN-NEW-34343',
      purchaseDate: new Date('2024-08-10'),
      purchasePrice: 4200000,
      supplier: 'Lighting Store Jakarta',
      status: 'AVAILABLE',
      condition: 'EXCELLENT',
      location: 'Studio B',
      notes: 'LED panel dengan bi-color temperature control',
      createdById: adminUser.id,
    },
  });

  const asset14 = await prisma.asset.create({
    data: {
      assetCode: 'ACC-202501-003',
      name: 'Blackmagic Video Assist 7" Monitor',
      category: 'Accessories',
      subcategory: 'Monitor',
      manufacturer: 'Blackmagic Design',
      model: 'Video Assist 7"',
      serialNumber: 'SN-BM-56565',
      purchaseDate: new Date('2024-09-05'),
      purchasePrice: 9500000,
      supplier: 'Blackmagic Dealer Jakarta',
      status: 'AVAILABLE',
      condition: 'EXCELLENT',
      location: 'Equipment Room A',
      notes: 'Monitor dan recorder untuk monitoring video',
      createdById: adminUser.id,
    },
  });

  const asset15 = await prisma.asset.create({
    data: {
      assetCode: 'CAM-202501-003',
      name: 'Fujifilm X-T4',
      category: 'Camera',
      subcategory: 'Mirrorless',
      manufacturer: 'Fujifilm',
      model: 'X-T4',
      serialNumber: 'SN-FUJI-78787',
      purchaseDate: new Date('2024-10-15'),
      purchasePrice: 28000000,
      supplier: 'Fujifilm Store Jakarta',
      status: 'AVAILABLE',
      condition: 'EXCELLENT',
      location: 'Equipment Room B',
      notes: 'Backup camera untuk photo dan video',
      createdById: adminUser.id,
    },
  });

  const asset16 = await prisma.asset.create({
    data: {
      assetCode: 'LEN-202501-003',
      name: 'Sigma 18-35mm f/1.8 Art',
      category: 'Lens',
      subcategory: 'Zoom Lens',
      manufacturer: 'Sigma',
      model: '18-35mm f/1.8 Art',
      serialNumber: 'SN-SIG-90909',
      purchaseDate: new Date('2024-10-15'),
      purchasePrice: 11000000,
      supplier: 'Sigma Store Jakarta',
      status: 'AVAILABLE',
      condition: 'GOOD',
      location: 'Equipment Room B',
      notes: 'Wide angle zoom lens',
      createdById: adminUser.id,
    },
  });

  const asset17 = await prisma.asset.create({
    data: {
      assetCode: 'ACC-202501-004',
      name: 'Slider Konova K5 100cm',
      category: 'Accessories',
      subcategory: 'Slider',
      manufacturer: 'Konova',
      model: 'K5 100cm',
      serialNumber: 'SN-KON-23232',
      purchaseDate: new Date('2024-11-01'),
      purchasePrice: 7800000,
      supplier: 'Video Gear Store',
      status: 'AVAILABLE',
      condition: 'EXCELLENT',
      location: 'Equipment Room B',
      notes: 'Camera slider untuk smooth movement shots',
      createdById: adminUser.id,
    },
  });

  const asset18 = await prisma.asset.create({
    data: {
      assetCode: 'COM-202501-003',
      name: 'iMac 27" 2020',
      category: 'Computer',
      subcategory: 'Desktop',
      manufacturer: 'Apple',
      model: 'iMac 27" 2020',
      serialNumber: 'SN-IMAC-45454',
      purchaseDate: new Date('2024-03-10'),
      purchasePrice: 42000000,
      supplier: 'iStore Jakarta',
      status: 'CHECKED_OUT',
      condition: 'EXCELLENT',
      location: 'Design Desk 2',
      notes: 'Digunakan untuk design dan video editing',
      createdById: adminUser.id,
    },
  });

  const asset19 = await prisma.asset.create({
    data: {
      assetCode: 'AUD-202501-003',
      name: 'Audio Technica AT4053B Microphone',
      category: 'Audio',
      subcategory: 'Microphone',
      manufacturer: 'Audio Technica',
      model: 'AT4053B',
      serialNumber: 'SN-AT-67676',
      purchaseDate: new Date('2024-12-05'),
      purchasePrice: 8500000,
      supplier: 'Audio Pro Store',
      status: 'AVAILABLE',
      condition: 'EXCELLENT',
      location: 'Equipment Room A',
      notes: 'Shotgun microphone professional untuk interview',
      createdById: adminUser.id,
    },
  });

  const asset20 = await prisma.asset.create({
    data: {
      assetCode: 'ACC-202501-005',
      name: 'DJI Mavic 3 Pro Drone',
      category: 'Accessories',
      subcategory: 'Drone',
      manufacturer: 'DJI',
      model: 'Mavic 3 Pro',
      serialNumber: 'SN-DJI-89898',
      purchaseDate: new Date('2024-09-20'),
      purchasePrice: 38000000,
      supplier: 'DJI Store Jakarta',
      status: 'RESERVED',
      condition: 'EXCELLENT',
      location: 'Secure Storage',
      notes: 'Drone untuk aerial videography - reserved untuk project besar',
      createdById: adminUser.id,
    },
  });

  console.log('📷 Additional assets created (total 20 assets)');

  // Create asset capitalization journal entry
  console.log('📒 Creating asset capitalization journal entry...');

  const totalAssetValue = 277000000; // Sum of all 20 asset purchase prices

  const journalAsset1 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-202501-018',
      entryDate: new Date('2025-01-01'),
      postingDate: new Date('2025-01-01'),
      description: 'Initial asset capitalization',
      descriptionId: 'Kapitalisasi aset awal',
      transactionType: 'ADJUSTMENT',
      transactionId: 'ASSET-INIT-2025',
      status: 'POSTED',
      isPosted: true,
      postedAt: new Date('2025-01-01'),
      fiscalPeriodId: periods[0].id,
      createdBy: adminUser.id,
      lineItems: {
        create: [
          {
            lineNumber: 1,
            accountId: accountEquipment.id,
            debit: totalAssetValue,
            credit: 0,
            description: 'Equipment capitalization (20 assets)',
            descriptionId: 'Kapitalisasi peralatan (20 aset)',
          },
          {
            lineNumber: 2,
            accountId: accountCapital.id,
            debit: 0,
            credit: totalAssetValue,
            description: 'Owner capital contribution',
            descriptionId: 'Setoran modal pemilik',
          },
        ],
      },
    },
  });

  console.log('📒 Asset capitalization entry created');

  // Post all journal entries to General Ledger
  console.log('📚 Posting journal entries to General Ledger...');

  const allJournals = [
    journal1, journal2, journal3, journal4, journal5, journal6,
    journal7, journal8, journal9,
    journalExp1, journalExp2, journalExp3, journalExp4, journalExp5,
    journalExp6, journalExp7, journalExp8,
    journalAsset1
  ];

  for (const journal of allJournals) {
    const lineItems = await prisma.journalLineItem.findMany({
      where: { journalEntryId: journal.id },
      include: { account: true },
    });

    for (const lineItem of lineItems) {
      await prisma.generalLedger.create({
        data: {
          journalEntryId: journal.id,
          journalEntryNumber: journal.entryNumber,
          lineNumber: lineItem.lineNumber,
          accountId: lineItem.accountId,
          entryDate: journal.entryDate,
          postingDate: journal.postingDate || journal.entryDate,
          transactionType: journal.transactionType,
          transactionId: journal.transactionId,
          documentNumber: journal.documentNumber || journal.entryNumber,
          description: lineItem.description || journal.description,
          descriptionId: journal.descriptionId,
          debit: lineItem.debit,
          credit: lineItem.credit,
          balance: 0, // Will be calculated by triggers or batch process
          fiscalPeriodId: journal.fiscalPeriodId,
          projectId: lineItem.projectId,
          clientId: lineItem.clientId,
        },
      });
    }
  }

  console.log('📚 General Ledger updated: All journal entries posted');

  // Generate Financial Statements
  console.log('📊 Generating financial statements...');

  // Calculate Income Statement for January 2025
  const revenueAccounts = await prisma.generalLedger.findMany({
    where: {
      account: {
        accountType: 'REVENUE',
      },
      fiscalPeriodId: periods[0].id,
    },
    include: {
      account: true,
    },
  });

  const expenseAccounts = await prisma.generalLedger.findMany({
    where: {
      account: {
        accountType: 'EXPENSE',
      },
      fiscalPeriodId: periods[0].id,
    },
    include: {
      account: true,
    },
  });

  // Aggregate revenue
  const totalRevenue = revenueAccounts.reduce((sum, entry) => {
    return sum + Number(entry.credit) - Number(entry.debit);
  }, 0);

  // Aggregate expenses by category
  const sellingExpenses = expenseAccounts
    .filter(e => e.account.accountSubType === 'SELLING_EXPENSE')
    .reduce((sum, entry) => sum + Number(entry.debit) - Number(entry.credit), 0);

  const adminExpenses = expenseAccounts
    .filter(e => e.account.accountSubType === 'ADMIN_EXPENSE')
    .reduce((sum, entry) => sum + Number(entry.debit) - Number(entry.credit), 0);

  const otherExpenses = expenseAccounts
    .filter(e => e.account.accountSubType === 'OTHER_EXPENSE')
    .reduce((sum, entry) => sum + Number(entry.debit) - Number(entry.credit), 0);

  const totalExpenses = sellingExpenses + adminExpenses + otherExpenses;
  const netIncome = totalRevenue - totalExpenses;

  // Create Income Statement
  const incomeStatement = await prisma.financialStatement.create({
    data: {
      statementType: 'INCOME_STATEMENT',
      fiscalPeriodId: periods[0].id,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-31'),
      generatedBy: accountantUser.id,
      data: {
        period: 'January 2025',
        periodId: periods[0].id,
        currency: 'IDR',

        // Revenue Section
        revenue: {
          serviceRevenue: 127000000, // 75M + 15M + 25M + 12M
          salesRevenue: 0,
          otherRevenue: 0,
          totalRevenue: totalRevenue,
        },

        // Operating Expenses
        operatingExpenses: {
          // Selling Expenses (Beban Penjualan)
          sellingExpenses: {
            advertising: 8000000,
            digitalMarketing: 5000000,
            salesSalaries: 0,
            total: sellingExpenses,
          },

          // General & Administrative Expenses (Beban Umum & Administrasi)
          generalAdminExpenses: {
            officeRent: 15000000,
            utilities: 2500000,
            officeSupplies: 1200000,
            software: 3500000,
            professionalServices: 7500000,
            bankCharges: 150000,
            depreciation: 5000000,
            total: adminExpenses,
          },

          totalOperatingExpenses: sellingExpenses + adminExpenses,
        },

        // Other Income/Expenses
        otherIncomeExpenses: {
          otherIncome: 0,
          otherExpenses: otherExpenses,
          total: -otherExpenses,
        },

        // Summary
        summary: {
          totalRevenue: totalRevenue,
          totalOperatingExpenses: sellingExpenses + adminExpenses,
          operatingIncome: totalRevenue - (sellingExpenses + adminExpenses),
          otherIncomeExpenses: -otherExpenses,
          netIncomeBeforeTax: netIncome,
          incomeTax: 0, // Will be calculated separately
          netIncome: netIncome,
        },

        // Metadata
        generatedAt: new Date().toISOString(),
        generatedBy: 'System Seed',
        notes: 'Automatically generated for January 2025',
      },
    },
  });

  // Create Balance Sheet
  const balanceSheet = await prisma.financialStatement.create({
    data: {
      statementType: 'BALANCE_SHEET',
      fiscalPeriodId: periods[0].id,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-31'),
      generatedBy: accountantUser.id,
      data: {
        period: 'January 31, 2025',
        currency: 'IDR',

        // Assets
        assets: {
          currentAssets: {
            cash: 1344000, // From cash payment
            bank: 15000000 + 25000000 + 12000000 - 16800000 - 2800000 - 8960000 - 3920000 - 5600000 - 150000, // Payments received - payments made
            accountsReceivable: 75000000 + 15000000 + 25000000 + 12000000 - 15000000 - 25000000 - 12000000, // Invoices - payments
            prepaidExpenses: 0,
            total: 75344000, // Approximation
          },

          fixedAssets: {
            equipment: 277000000,
            accumulatedDepreciation: -5000000,
            total: 272000000,
          },

          totalAssets: 347344000,
        },

        // Liabilities
        liabilities: {
          currentLiabilities: {
            accountsPayable: 8250000, // Professional services
            ppnPayable: 1800000 + 300000 + 960000 + 420000 + 144000 + 600000 + 900000, // PPN from expenses
            pphPayable: 150000, // PPh23 withholding
            total: 13674000,
          },

          longTermLiabilities: {
            total: 0,
          },

          totalLiabilities: 13674000,
        },

        // Equity
        equity: {
          capital: 277000000, // Initial capital from assets
          retainedEarnings: 0,
          currentYearProfit: netIncome,
          total: 277000000 + netIncome,
        },

        // Validation
        totalLiabilitiesAndEquity: 13674000 + 277000000 + netIncome,

        // Metadata
        generatedAt: new Date().toISOString(),
        generatedBy: 'System Seed',
        notes: 'Balance Sheet as of January 31, 2025',
      },
    },
  });

  console.log('📊 Financial statements generated:', {
    incomeStatement: 'January 2025',
    balanceSheet: 'As of January 31, 2025',
    netIncome: `Rp ${netIncome.toLocaleString('id-ID')}`,
  });

  console.log('✅ Database seeding completed successfully!');
  console.log('\n🔑 Test Credentials (Legacy - Backward Compatibility):');
  console.log('  Admin: admin@monomi.id / password123');
  console.log('  User: user@bisnis.co.id / password123');

  console.log('\n🔐 RBAC Test Users (Password: Test1234):');
  console.log('  Super Admin: super.admin@monomi.id');
  console.log('  Finance Manager: finance.manager@monomi.id');
  console.log('  Accountant: accountant@monomi.id');
  console.log('  Project Manager: project.manager@monomi.id');
  console.log('  Staff: staff@monomi.id');
  console.log('  Viewer: viewer@monomi.id');

  console.log('\n📊 Test Data Summary (COMPREHENSIVE & INTEGRATED):');
  console.log(`- ${8} users created (2 legacy + 6 RBAC roles)`);
  console.log(`- ${10} clients created (expanded for testing)`);
  console.log(`- ${5} project types created`);
  console.log(`- ${10} expense categories created (Indonesian PSAK-compliant)`);
  console.log(`- ${28} chart of accounts created (PSAK 16 & 71 compliant)`);
  console.log(`- ${12} projects created (various statuses: IN_PROGRESS, PLANNING, COMPLETED)`);
  console.log(`- ${12} quotations created (APPROVED, SENT, DRAFT statuses)`);
  console.log(`- ${10} invoices created (PAID, SENT, DRAFT, OVERDUE statuses)`);
  console.log(`- ${6} payments recorded (CONFIRMED, PENDING)`);
  console.log(`- ${18} journal entries created:`);
  console.log(`    • 4 invoice revenue entries (linked to invoices)`);
  console.log(`    • 4 payment receipt entries (linked to payments)`);
  console.log(`    • 8 expense entries (linked to expenses with PPN & PPh)`);
  console.log(`    • 1 asset capitalization entry (Rp 277M)`);
  console.log(`    • 1 depreciation entry (monthly)`);
  console.log(`    • 1 prepaid expense adjustment`);
  console.log(`- ${8} expense records created (PAID, APPROVED statuses with Indonesian tax compliance)`);
  console.log(`- ${20} assets created (Rp 277M total value, capitalized in books)`);
  console.log(`- General Ledger fully posted with all transactions`);
  console.log(`- ${2} financial statements generated:`);
  console.log(`    • Income Statement (Laporan Laba Rugi) - January 2025`);
  console.log(`    • Balance Sheet (Neraca) - As of January 31, 2025`);
  console.log(`- ${4} audit log entries created`);
  console.log('\n💡 All accounting entries are FULLY INTEGRATED!');
  console.log('   ✅ Invoices → Journal Entries → General Ledger → Financial Statements');
  console.log('   ✅ Payments → Journal Entries → General Ledger → Financial Statements');
  console.log('   ✅ Expenses → Journal Entries → General Ledger (with PPN & PPh) → Financial Statements');
  console.log('   ✅ Assets → Journal Entries → General Ledger → Financial Statements (capitalized)');
  */
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