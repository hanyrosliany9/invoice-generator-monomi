#!/usr/bin/env node

/**
 * Data Migration Script from Old Backup to New Production Schema
 *
 * This script reads the backup SQL file and transforms the data to match
 * the current production schema, handling any schema differences.
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');
const { createGunzip } = require('zlib');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://invoiceuser:invoicepass@localhost:5432/invoicedb'
    }
  }
});

// Configure for production database
const PROD_DATABASE_URL = 'postgresql://invoiceuser:invoicepass@invoice-db-prod:5432/invoicedb';
const BACKUP_FILE = './backup/prod_backup_20251108_092728.sql.gz';

async function extractDataFromBackup(tableName) {
  return new Promise((resolve, reject) => {
    const gunzip = createGunzip();
    const readStream = fs.createReadStream(BACKUP_FILE);
    const rl = readline.createInterface({
      input: readStream.pipe(gunzip),
      crlfDelay: Infinity
    });

    let inDataSection = false;
    let currentTable = null;
    const data = [];
    let columns = [];

    rl.on('line', (line) => {
      // Detect COPY statement for the table
      const copyMatch = line.match(/^COPY public\.(\w+) \((.*)\) FROM stdin;/);
      if (copyMatch) {
        currentTable = copyMatch[1];
        if (currentTable === tableName) {
          inDataSection = true;
          columns = copyMatch[2].split(', ').map(col => col.replace(/"/g, ''));
        }
        return;
      }

      // End of data section
      if (line === '\\.') {
        if (inDataSection) {
          resolve({ columns, data });
        }
        inDataSection = false;
        currentTable = null;
        return;
      }

      // Collect data rows
      if (inDataSection && currentTable === tableName) {
        data.push(line);
      }
    });

    rl.on('close', () => {
      if (data.length === 0) {
        resolve({ columns: [], data: [] });
      }
    });

    rl.on('error', reject);
  });
}

function parseTSVRow(row, columns) {
  const values = row.split('\t');
  const obj = {};

  columns.forEach((col, index) => {
    let value = values[index];

    // Handle NULL values
    if (value === '\\N') {
      obj[col] = null;
      return;
    }

    // Try to parse as JSON for complex fields
    if (value && (value.startsWith('{') || value.startsWith('['))) {
      try {
        obj[col] = JSON.parse(value);
      } catch (e) {
        obj[col] = value;
      }
    } else if (value === 't') {
      obj[col] = true;
    } else if (value === 'f') {
      obj[col] = false;
    } else {
      obj[col] = value;
    }
  });

  return obj;
}

async function migrateUsers() {
  console.log('\n📊 Migrating Users...');
  const { columns, data } = await extractDataFromBackup('users');

  let migrated = 0;
  for (const row of data) {
    const user = parseTSVRow(row, columns);

    try {
      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          password: user.password,
          name: user.name,
          role: user.role,
          isActive: user.isActive === true || user.isActive === 't',
        },
        create: {
          id: user.id,
          email: user.email,
          password: user.password,
          name: user.name,
          role: user.role,
          isActive: user.isActive === true || user.isActive === 't',
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
        },
      });
      migrated++;
      console.log(`  ✅ ${user.email}`);
    } catch (error) {
      console.error(`  ❌ Failed to migrate user ${user.email}:`, error.message);
    }
  }

  console.log(`✅ Migrated ${migrated}/${data.length} users`);
}

async function migrateClients() {
  console.log('\n📊 Migrating Clients...');
  const { columns, data } = await extractDataFromBackup('clients');

  let migrated = 0;
  for (const row of data) {
    const client = parseTSVRow(row, columns);

    try {
      await prisma.client.upsert({
        where: { id: client.id },
        update: {
          name: client.name,
          email: client.email || null,
          phone: client.phone || null,
          address: client.address || null,
          company: client.company || null,
          contactPerson: client.contactPerson || null,
          paymentTerms: client.paymentTerms || null,
          status: client.status || 'active',
        },
        create: {
          id: client.id,
          name: client.name,
          email: client.email || null,
          phone: client.phone || null,
          address: client.address || null,
          company: client.company || null,
          contactPerson: client.contactPerson || null,
          paymentTerms: client.paymentTerms || null,
          status: client.status || 'active',
          createdAt: new Date(client.createdAt),
          updatedAt: new Date(client.updatedAt),
        },
      });
      migrated++;
      console.log(`  ✅ ${client.name}`);
    } catch (error) {
      console.error(`  ❌ Failed to migrate client ${client.name}:`, error.message);
    }
  }

  console.log(`✅ Migrated ${migrated}/${data.length} clients`);
}

async function migrateProjects() {
  console.log('\n📊 Migrating Projects...');
  const { columns, data } = await extractDataFromBackup('projects');

  let migrated = 0;
  for (const row of data) {
    const project = parseTSVRow(row, columns);

    try {
      // Check if projectTypeId exists, if not skip or use default
      let projectTypeId = project.projectTypeId;

      await prisma.project.upsert({
        where: { id: project.id },
        update: {
          number: project.number,
          description: project.description || '',
          scopeOfWork: project.scopeOfWork || null,
          output: project.output || null,
          clientId: project.clientId,
          startDate: project.startDate ? new Date(project.startDate) : null,
          endDate: project.endDate ? new Date(project.endDate) : null,
          estimatedBudget: project.estimatedBudget ? parseFloat(project.estimatedBudget) : null,
          status: project.status || 'PLANNING',
        },
        create: {
          id: project.id,
          number: project.number,
          description: project.description || '',
          scopeOfWork: project.scopeOfWork || null,
          output: project.output || null,
          projectTypeId: projectTypeId,
          clientId: project.clientId,
          startDate: project.startDate ? new Date(project.startDate) : null,
          endDate: project.endDate ? new Date(project.endDate) : null,
          estimatedBudget: project.estimatedBudget ? parseFloat(project.estimatedBudget) : null,
          basePrice: project.basePrice ? parseFloat(project.basePrice) : null,
          priceBreakdown: project.priceBreakdown || null,
          status: project.status || 'PLANNING',
          createdAt: new Date(project.createdAt),
          updatedAt: new Date(project.updatedAt),
        },
      });
      migrated++;
      console.log(`  ✅ ${project.number} - ${project.description}`);
    } catch (error) {
      console.error(`  ❌ Failed to migrate project ${project.number}:`, error.message);
    }
  }

  console.log(`✅ Migrated ${migrated}/${data.length} projects`);
}

async function migrateQuotations() {
  console.log('\n📊 Migrating Quotations...');
  const { columns, data } = await extractDataFromBackup('quotations');

  let migrated = 0;
  for (const row of data) {
    const quotation = parseTSVRow(row, columns);

    try {
      await prisma.quotation.upsert({
        where: { id: quotation.id },
        update: {
          quotationNumber: quotation.quotationNumber,
          date: new Date(quotation.date),
          validUntil: new Date(quotation.validUntil),
          clientId: quotation.clientId,
          projectId: quotation.projectId,
          amountPerProject: parseFloat(quotation.amountPerProject),
          totalAmount: parseFloat(quotation.totalAmount),
          scopeOfWork: quotation.scopeOfWork || null,
          priceBreakdown: quotation.priceBreakdown || null,
          terms: quotation.terms || null,
          paymentType: quotation.paymentType || 'FULL_PAYMENT',
          status: quotation.status || 'DRAFT',
          createdBy: quotation.createdBy,
        },
        create: {
          id: quotation.id,
          quotationNumber: quotation.quotationNumber,
          date: new Date(quotation.date),
          validUntil: new Date(quotation.validUntil),
          clientId: quotation.clientId,
          projectId: quotation.projectId,
          amountPerProject: parseFloat(quotation.amountPerProject),
          totalAmount: parseFloat(quotation.totalAmount),
          scopeOfWork: quotation.scopeOfWork || null,
          priceBreakdown: quotation.priceBreakdown || null,
          terms: quotation.terms || null,
          paymentType: quotation.paymentType || 'FULL_PAYMENT',
          status: quotation.status || 'DRAFT',
          createdBy: quotation.createdBy,
          createdAt: new Date(quotation.createdAt),
          updatedAt: new Date(quotation.updatedAt),
        },
      });
      migrated++;
      console.log(`  ✅ ${quotation.quotationNumber}`);
    } catch (error) {
      console.error(`  ❌ Failed to migrate quotation ${quotation.quotationNumber}:`, error.message);
    }
  }

  console.log(`✅ Migrated ${migrated}/${data.length} quotations`);
}

async function migrateInvoices() {
  console.log('\n📊 Migrating Invoices...');
  const { columns, data } = await extractDataFromBackup('invoices');

  let migrated = 0;
  for (const row of data) {
    const invoice = parseTSVRow(row, columns);

    try {
      await prisma.invoice.upsert({
        where: { id: invoice.id },
        update: {
          invoiceNumber: invoice.invoiceNumber,
          creationDate: new Date(invoice.creationDate),
          dueDate: new Date(invoice.dueDate),
          quotationId: invoice.quotationId || null,
          clientId: invoice.clientId,
          projectId: invoice.projectId,
          amountPerProject: parseFloat(invoice.amountPerProject),
          totalAmount: parseFloat(invoice.totalAmount),
          scopeOfWork: invoice.scopeOfWork || null,
          priceBreakdown: invoice.priceBreakdown || null,
          paymentInfo: invoice.paymentInfo || null,
          materaiRequired: invoice.materaiRequired === true || invoice.materaiRequired === 't',
          terms: invoice.terms || null,
          status: invoice.status || 'DRAFT',
          createdBy: invoice.createdBy,
        },
        create: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          creationDate: new Date(invoice.creationDate),
          dueDate: new Date(invoice.dueDate),
          quotationId: invoice.quotationId || null,
          clientId: invoice.clientId,
          projectId: invoice.projectId,
          amountPerProject: parseFloat(invoice.amountPerProject),
          totalAmount: parseFloat(invoice.totalAmount),
          scopeOfWork: invoice.scopeOfWork || null,
          priceBreakdown: invoice.priceBreakdown || null,
          paymentInfo: invoice.paymentInfo || null,
          materaiRequired: invoice.materaiRequired === true || invoice.materaiRequired === 't',
          terms: invoice.terms || null,
          status: invoice.status || 'DRAFT',
          createdBy: invoice.createdBy,
          createdAt: new Date(invoice.createdAt),
          updatedAt: new Date(invoice.updatedAt),
        },
      });
      migrated++;
      console.log(`  ✅ ${invoice.invoiceNumber}`);
    } catch (error) {
      console.error(`  ❌ Failed to migrate invoice ${invoice.invoiceNumber}:`, error.message);
    }
  }

  console.log(`✅ Migrated ${migrated}/${data.length} invoices`);
}

async function migrateCompanySettings() {
  console.log('\n📊 Migrating Company Settings...');
  const { columns, data } = await extractDataFromBackup('company_settings');

  if (data.length === 0) {
    console.log('  ⚠️  No company settings found in backup');
    return;
  }

  const settings = parseTSVRow(data[0], columns);

  try {
    await prisma.companySettings.upsert({
      where: { id: 'default' },
      update: {
        companyName: settings.companyName || '',
        address: settings.address || null,
        phone: settings.phone || null,
        email: settings.email || null,
        website: settings.website || null,
        taxNumber: settings.taxNumber || null,
        currency: settings.currency || 'IDR',
        bankBCA: settings.bankBCA || null,
        bankMandiri: settings.bankMandiri || null,
        bankBNI: settings.bankBNI || null,
      },
      create: {
        id: 'default',
        companyName: settings.companyName || '',
        address: settings.address || null,
        phone: settings.phone || null,
        email: settings.email || null,
        website: settings.website || null,
        taxNumber: settings.taxNumber || null,
        currency: settings.currency || 'IDR',
        bankBCA: settings.bankBCA || null,
        bankMandiri: settings.bankMandiri || null,
        bankBNI: settings.bankBNI || null,
        createdAt: new Date(settings.createdAt),
        updatedAt: new Date(settings.updatedAt),
      },
    });
    console.log(`  ✅ Company: ${settings.companyName}`);
  } catch (error) {
    console.error('  ❌ Failed to migrate company settings:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting Data Migration from Backup...\n');
  console.log(`📁 Backup file: ${BACKUP_FILE}`);
  console.log(`🗄️  Target database: Production\n`);

  try {
    // Migration order matters due to foreign key constraints
    await migrateUsers();
    await migrateClients();
    await migrateCompanySettings();
    await migrateProjects();
    await migrateQuotations();
    await migrateInvoices();

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - Users migrated');
    console.log('  - Clients migrated');
    console.log('  - Projects migrated');
    console.log('  - Quotations migrated');
    console.log('  - Invoices migrated');
    console.log('  - Company settings migrated');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
