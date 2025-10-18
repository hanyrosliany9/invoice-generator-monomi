/**
 * Migration Script: Create Retroactive Journal Entries
 *
 * Purpose: Create journal entries for existing invoices that were created
 * before the accounting integration was implemented.
 *
 * This script:
 * 1. Finds all SENT/PAID invoices without journal entries
 * 2. Creates appropriate journal entries for each invoice
 * 3. Posts the journal entries to the general ledger
 * 4. Updates the invoice records with the journal entry IDs
 *
 * Run with: npm run migrate:journal-entries
 */

import { PrismaClient, InvoiceStatus } from '@prisma/client';

async function createRetroactiveJournalEntries() {
  const prisma = new PrismaClient();

  console.log('🚀 Starting retroactive journal entry creation...\n');

  try {
    // Import services dynamically to avoid circular dependencies
    const { JournalService } = await import('../src/modules/accounting/services/journal.service');
    const { PrismaService } = await import('../src/modules/prisma/prisma.service');

    // Create PrismaService instance
    const prismaService = new PrismaService();
    const journalService = new JournalService(prismaService);

    // Statistics
    let sentProcessed = 0;
    let sentFailed = 0;
    let paidProcessed = 0;
    let paidFailed = 0;

    // ============ PROCESS SENT INVOICES ============
    console.log('📝 Processing SENT invoices...\n');

    const sentInvoices = await prisma.invoice.findMany({
      where: {
        status: InvoiceStatus.SENT,
        journalEntryId: null,
      },
      include: {
        client: true,
      },
    });

    console.log(`Found ${sentInvoices.length} SENT invoices without journal entries\n`);

    for (const invoice of sentInvoices) {
      try {
        console.log(`Processing ${invoice.invoiceNumber}...`);

        // Create journal entry for SENT invoice (Debit AR, Credit Revenue)
        const journalEntry = await journalService.createInvoiceJournalEntry(
          invoice.id,
          invoice.invoiceNumber,
          invoice.clientId,
          Number(invoice.totalAmount),
          'SENT',
          'migration-script',
        );

        // Post journal entry to general ledger
        await journalService.postJournalEntry(journalEntry.id, 'migration-script');

        // Update invoice with journal entry ID
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { journalEntryId: journalEntry.id },
        });

        console.log(`✅ Created journal entry ${journalEntry.entryNumber} for ${invoice.invoiceNumber}`);
        console.log(`   Client: ${invoice.client.name}`);
        console.log(`   Amount: Rp ${Number(invoice.totalAmount).toLocaleString('id-ID')}`);
        console.log(`   AR Debit: 1-2010, Revenue Credit: 4-1010\n`);

        sentProcessed++;
      } catch (error: any) {
        console.error(`❌ Failed to process ${invoice.invoiceNumber}:`, error.message);
        sentFailed++;
      }
    }

    // ============ PROCESS PAID INVOICES ============
    console.log('\n💰 Processing PAID invoices...\n');

    const paidInvoices = await prisma.invoice.findMany({
      where: {
        status: InvoiceStatus.PAID,
        paymentJournalId: null,
      },
      include: {
        client: true,
      },
    });

    console.log(`Found ${paidInvoices.length} PAID invoices without payment journal entries\n`);

    for (const invoice of paidInvoices) {
      try {
        console.log(`Processing ${invoice.invoiceNumber}...`);

        // If invoice doesn't have a SENT journal entry, create it first
        if (!invoice.journalEntryId) {
          console.log(`  Creating SENT journal entry first...`);
          const sentEntry = await journalService.createInvoiceJournalEntry(
            invoice.id,
            invoice.invoiceNumber,
            invoice.clientId,
            Number(invoice.totalAmount),
            'SENT',
            'migration-script',
          );

          await journalService.postJournalEntry(sentEntry.id, 'migration-script');

          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { journalEntryId: sentEntry.id },
          });

          console.log(`  ✅ Created SENT entry ${sentEntry.entryNumber}`);
        }

        // Create journal entry for PAID invoice (Debit Cash, Credit AR)
        const paymentEntry = await journalService.createInvoiceJournalEntry(
          invoice.id,
          invoice.invoiceNumber,
          invoice.clientId,
          Number(invoice.totalAmount),
          'PAID',
          'migration-script',
        );

        // Post payment journal entry to general ledger
        await journalService.postJournalEntry(paymentEntry.id, 'migration-script');

        // Update invoice with payment journal entry ID
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { paymentJournalId: paymentEntry.id },
        });

        console.log(`✅ Created payment journal entry ${paymentEntry.entryNumber} for ${invoice.invoiceNumber}`);
        console.log(`   Client: ${invoice.client.name}`);
        console.log(`   Amount: Rp ${Number(invoice.totalAmount).toLocaleString('id-ID')}`);
        console.log(`   Bank Debit: 1-1020, AR Credit: 1-2010\n`);

        paidProcessed++;
      } catch (error: any) {
        console.error(`❌ Failed to process ${invoice.invoiceNumber}:`, error.message);
        paidFailed++;
      }
    }

    // ============ SUMMARY ============
    console.log('\n📊 MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════\n');
    console.log(`SENT Invoices:`);
    console.log(`  ✅ Processed: ${sentProcessed}`);
    console.log(`  ❌ Failed: ${sentFailed}`);
    console.log(`\nPAID Invoices:`);
    console.log(`  ✅ Processed: ${paidProcessed}`);
    console.log(`  ❌ Failed: ${paidFailed}`);
    console.log(`\nTotal Journal Entries Created: ${sentProcessed + paidProcessed}`);
    console.log(`Total Failures: ${sentFailed + paidFailed}\n`);

    // ============ VERIFICATION ============
    console.log('🔍 VERIFICATION\n');

    const totalJournalEntries = await prisma.journalEntry.count();
    const totalLedgerEntries = await prisma.generalLedger.count();
    const postedJournalEntries = await prisma.journalEntry.count({
      where: { isPosted: true },
    });

    console.log(`Total journal entries in database: ${totalJournalEntries}`);
    console.log(`Total general ledger entries: ${totalLedgerEntries}`);
    console.log(`Posted journal entries: ${postedJournalEntries}`);

    // Check for invoices still missing journal entries
    const stillMissingSent = await prisma.invoice.count({
      where: {
        status: InvoiceStatus.SENT,
        journalEntryId: null,
      },
    });

    const stillMissingPaid = await prisma.invoice.count({
      where: {
        status: InvoiceStatus.PAID,
        paymentJournalId: null,
      },
    });

    console.log(`\nInvoices still missing journal entries:`);
    console.log(`  SENT without journal entry: ${stillMissingSent}`);
    console.log(`  PAID without payment journal: ${stillMissingPaid}`);

    if (stillMissingSent === 0 && stillMissingPaid === 0) {
      console.log(`\n🎉 SUCCESS! All invoices now have journal entries.\n`);
    } else {
      console.log(`\n⚠️  WARNING: Some invoices still missing journal entries.\n`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
createRetroactiveJournalEntries()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
