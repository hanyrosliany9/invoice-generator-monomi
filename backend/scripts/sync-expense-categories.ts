/**
 * One-time migration script to sync existing EXPENSE accounts
 * with ExpenseCategory table
 *
 * This creates missing ExpenseCategory entries for any EXPENSE type
 * accounts that were created before CASCADE sync was implemented.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Derive expense class from account code prefix
 */
function deriveExpenseClass(accountCode: string): 'SELLING' | 'GENERAL_ADMIN' | 'OTHER' {
  if (!accountCode) return 'GENERAL_ADMIN';
  const prefix = accountCode.substring(0, 3);

  if (prefix === '6-1') return 'SELLING';
  else if (prefix === '6-2') return 'GENERAL_ADMIN';
  else if (prefix.startsWith('8-')) return 'OTHER';

  return 'GENERAL_ADMIN';
}

async function syncExpenseCategories() {
  console.log('==========================================');
  console.log('EXPENSE CATEGORY SYNCHRONIZATION');
  console.log('==========================================\n');

  try {
    // 1. Find all EXPENSE type accounts
    console.log('📊 Fetching all EXPENSE accounts from Chart of Accounts...');
    const expenseAccounts = await prisma.chartOfAccounts.findMany({
      where: {
        accountType: 'EXPENSE',
      },
    });

    console.log(`✅ Found ${expenseAccounts.length} EXPENSE accounts\n`);

    // 2. Check each account for existing category
    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const account of expenseAccounts) {
      try {
        // Check if category already exists
        const existingCategory = await prisma.expenseCategory.findFirst({
          where: { accountCode: account.code },
        });

        if (existingCategory) {
          console.log(`⏭️  SKIP: ${account.code} - Category already exists`);
          skippedCount++;
          continue;
        }

        // Create missing category with CASCADE sync logic
        const expenseClass = deriveExpenseClass(account.code);
        const categoryCode = account.code.replace('-', '_').toUpperCase().substring(0, 50);

        await prisma.expenseCategory.create({
          data: {
            code: categoryCode,
            accountCode: account.code,
            expenseClass,
            name: account.name,
            nameId: account.nameId || account.name,
            description: account.description,
            descriptionId: account.descriptionId,
            defaultPPNRate: 0.1200, // Default PPN 12%
            withholdingTaxType: 'NONE',
            withholdingTaxRate: null,
            isBillable: false,
            isActive: account.isActive,
          },
        });

        console.log(`✅ CREATED: ${account.code} - ${account.name}`);
        console.log(`   └─ Class: ${expenseClass}, PPN: 12%, Active: ${account.isActive}`);
        syncedCount++;

      } catch (error) {
        console.error(`❌ ERROR: ${account.code} - ${error instanceof Error ? error.message : String(error)}`);
        errorCount++;
      }
    }

    console.log('\n==========================================');
    console.log('SYNCHRONIZATION COMPLETE');
    console.log('==========================================');
    console.log(`Total EXPENSE accounts: ${expenseAccounts.length}`);
    console.log(`✅ Categories created: ${syncedCount}`);
    console.log(`⏭️  Already existed: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('==========================================\n');

    if (syncedCount > 0) {
      console.log('🎉 SUCCESS! All EXPENSE accounts now have expense categories!');
    } else if (skippedCount === expenseAccounts.length) {
      console.log('✅ All EXPENSE accounts already had categories - no sync needed.');
    }

  } catch (error) {
    console.error('❌ Fatal error during synchronization:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync
syncExpenseCategories()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
