/**
 * Migration Script: Fix Invoice Payment Information
 *
 * Purpose: Update existing invoices that contain placeholder payment text
 * with actual company bank account information.
 *
 * This script:
 * 1. Finds all invoices with placeholder payment info text
 * 2. Fetches current company settings
 * 3. Generates proper payment information from company settings
 * 4. Updates invoice records with the correct payment info
 * 5. Logs all updates for audit purposes
 *
 * Run with: npm run migrate:fix-payment-info
 * Or with tsx: npx tsx backend/scripts/fix-invoice-payment-info.ts
 */

import { PrismaClient } from '@prisma/client';

async function fixInvoicePaymentInfo() {
  const prisma = new PrismaClient();

  console.log('🚀 Starting invoice payment info migration...\n');

  try {
    // Import settings service
    const { SettingsService } = await import('../src/modules/settings/settings.service');
    const { PrismaService } = await import('../src/modules/prisma/prisma.service');

    // Create service instances
    const prismaService = new PrismaService();
    const settingsService = new SettingsService(prismaService);

    // Get current company settings
    console.log('📊 Fetching company settings...');
    const companySettings = await settingsService.getCompanySettings();
    console.log(`✓ Company: ${companySettings.companyName}\n`);

    // Generate proper payment info
    const bankAccounts: string[] = [];
    if (companySettings.bankBCA) {
      bankAccounts.push(`BCA: ${companySettings.bankBCA}`);
    }
    if (companySettings.bankMandiri) {
      bankAccounts.push(`Mandiri: ${companySettings.bankMandiri}`);
    }
    if (companySettings.bankBNI) {
      bankAccounts.push(`BNI: ${companySettings.bankBNI}`);
    }

    let properPaymentInfo: string;
    if (bankAccounts.length > 0) {
      const companyName = companySettings.companyName || 'Company';
      properPaymentInfo = `Bank Transfer\nRekening atas nama: ${companyName}\n${bankAccounts.join(' | ')}`;
    } else {
      properPaymentInfo = 'Bank Transfer - Silakan hubungi kami untuk detail rekening pembayaran';
    }

    console.log('✓ Generated payment info:');
    console.log(properPaymentInfo.split('\n').map(line => `  ${line}`).join('\n'));
    console.log('');

    // Define placeholder texts to search for
    const placeholderTexts = [
      'Bank Transfer - Lihat detail di company settings',
      'Bank Transfer - Silakan hubungi kami untuk detail rekening pembayaran'
    ];

    // Statistics
    let totalFound = 0;
    let totalUpdated = 0;
    let totalFailed = 0;

    // Process each placeholder text
    for (const placeholder of placeholderTexts) {
      console.log(`🔍 Searching for invoices with: "${placeholder}"...`);

      const invoicesWithPlaceholder = await prisma.invoice.findMany({
        where: {
          paymentInfo: {
            contains: placeholder
          }
        },
        select: {
          id: true,
          invoiceNumber: true,
          paymentInfo: true,
          status: true
        }
      });

      console.log(`  Found: ${invoicesWithPlaceholder.length} invoice(s)\n`);
      totalFound += invoicesWithPlaceholder.length;

      // Update each invoice
      for (const invoice of invoicesWithPlaceholder) {
        try {
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              paymentInfo: properPaymentInfo
            }
          });

          console.log(`  ✓ Updated: ${invoice.invoiceNumber} (${invoice.status})`);
          totalUpdated++;
        } catch (error) {
          console.error(`  ✗ Failed: ${invoice.invoiceNumber}`, error.message);
          totalFailed++;
        }
      }

      if (invoicesWithPlaceholder.length > 0) {
        console.log('');
      }
    }

    // Also find invoices with NULL or empty payment info
    console.log('🔍 Searching for invoices with NULL or empty payment info...');
    const invoicesWithoutPaymentInfo = await prisma.invoice.findMany({
      where: {
        OR: [
          { paymentInfo: null },
          { paymentInfo: '' }
        ]
      },
      select: {
        id: true,
        invoiceNumber: true,
        status: true
      }
    });

    console.log(`  Found: ${invoicesWithoutPaymentInfo.length} invoice(s)\n`);
    totalFound += invoicesWithoutPaymentInfo.length;

    for (const invoice of invoicesWithoutPaymentInfo) {
      try {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            paymentInfo: properPaymentInfo
          }
        });

        console.log(`  ✓ Updated: ${invoice.invoiceNumber} (${invoice.status})`);
        totalUpdated++;
      } catch (error) {
        console.error(`  ✗ Failed: ${invoice.invoiceNumber}`, error.message);
        totalFailed++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`Total invoices found:    ${totalFound}`);
    console.log(`Successfully updated:    ${totalUpdated}`);
    console.log(`Failed:                  ${totalFailed}`);
    console.log('='.repeat(60));

    if (totalUpdated > 0) {
      console.log('\n✅ Migration completed successfully!');
    } else if (totalFound === 0) {
      console.log('\n✨ No invoices needed updating - all good!');
    } else {
      console.log('\n⚠️  Migration completed with some failures.');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
fixInvoicePaymentInfo()
  .then(() => {
    console.log('\n👋 Migration script finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
