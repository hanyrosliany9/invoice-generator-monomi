/**
 * Depreciation Backfill Script (PSAK 16 Compliant)
 *
 * Purpose: Create depreciation schedules and historical entries for existing assets
 *
 * Usage:
 *   npx ts-node src/scripts/backfill-depreciation.ts [--dry-run] [--asset-id=xxx]
 *
 * This script will:
 * 1. Find all assets without depreciation schedules
 * 2. Create schedules based on asset category (Indonesian useful life standards)
 * 3. Calculate and create historical depreciation entries from purchase date
 * 4. Create journal entries for each historical period
 */

import { PrismaClient, DepreciationMethod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// Indonesian tax regulation useful life standards (in years)
const USEFUL_LIFE_BY_CATEGORY: Record<string, number> = {
  // Camera equipment (Group 1: Electronic equipment)
  Camera: 4,
  Lens: 4,
  'Camera Body': 4,

  // Lighting equipment (Group 2: Electronic/Electrical equipment)
  Lighting: 4,
  Light: 4,

  // Audio equipment (Group 1: Electronic equipment)
  Audio: 4,
  Microphone: 4,
  Recorder: 4,

  // Drone (Group 1: Electronic equipment)
  Drone: 4,

  // Computer equipment (Group 1: Electronic equipment)
  Computer: 4,
  Laptop: 4,
  Desktop: 4,
  'Computer Hardware': 4,

  // Default for unlisted categories
  DEFAULT: 4,
};

// Minimum residual value (typically 10% of purchase price)
const RESIDUAL_VALUE_PERCENTAGE = 0.1;

interface BackfillOptions {
  dryRun: boolean;
  assetId?: string;
  startFromToday?: boolean; // If true, only create schedules starting from today (no historical entries)
}

/**
 * Get useful life in years based on asset category
 */
function getUsefulLife(category: string): number {
  return USEFUL_LIFE_BY_CATEGORY[category] || USEFUL_LIFE_BY_CATEGORY['DEFAULT'];
}

/**
 * Calculate depreciation schedule for an asset
 */
function calculateSchedule(
  purchasePrice: Decimal,
  purchaseDate: Date,
  usefulLifeYears: number,
  method: DepreciationMethod = DepreciationMethod.STRAIGHT_LINE
) {
  const purchasePriceNum = Number(purchasePrice);
  const residualValue = purchasePriceNum * RESIDUAL_VALUE_PERCENTAGE;
  const depreciableAmount = purchasePriceNum - residualValue;
  const usefulLifeMonths = usefulLifeYears * 12;

  // Calculate monthly depreciation (straight-line method)
  const depreciationPerMonth = depreciableAmount / usefulLifeMonths;
  const depreciationPerYear = depreciableAmount / usefulLifeYears;

  // Calculate start and end dates
  // Start depreciating from the first day of the month after purchase
  const startDate = new Date(purchaseDate);
  startDate.setDate(1); // Set to first of month
  if (startDate <= purchaseDate) {
    // If purchase was on the 1st, start next month
    startDate.setMonth(startDate.getMonth() + 1);
  }

  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + usefulLifeMonths);

  return {
    method,
    depreciableAmount: new Decimal(depreciableAmount.toFixed(2)),
    residualValue: new Decimal(residualValue.toFixed(2)),
    usefulLifeMonths,
    usefulLifeYears: new Decimal(usefulLifeYears.toFixed(2)),
    depreciationPerMonth: new Decimal(depreciationPerMonth.toFixed(2)),
    depreciationPerYear: new Decimal(depreciationPerYear.toFixed(2)),
    annualRate: new Decimal((1 / usefulLifeYears).toFixed(4)),
    startDate,
    endDate,
  };
}

/**
 * Generate monthly depreciation entries from start date to end date (or current date)
 */
function generateHistoricalEntries(
  schedule: ReturnType<typeof calculateSchedule>,
  upToDate: Date = new Date()
) {
  const entries: Array<{
    periodDate: Date;
    depreciationAmount: Decimal;
    accumulatedDepreciation: Decimal;
    bookValue: Decimal;
  }> = [];

  let accumulated = new Decimal(0);
  const depreciableAmount = Number(schedule.depreciableAmount);
  const residualValue = Number(schedule.residualValue);
  const totalAssetValue = depreciableAmount + residualValue;

  const currentDate = new Date(schedule.startDate);
  const stopDate = upToDate < schedule.endDate ? upToDate : schedule.endDate;

  while (currentDate < stopDate) {
    const depAmount = schedule.depreciationPerMonth;
    accumulated = new Decimal(Number(accumulated) + Number(depAmount));

    // Ensure we don't exceed depreciable amount
    if (Number(accumulated) > depreciableAmount) {
      accumulated = schedule.depreciableAmount;
    }

    const bookValue = new Decimal((totalAssetValue - Number(accumulated)).toFixed(2));

    entries.push({
      periodDate: new Date(currentDate),
      depreciationAmount: depAmount,
      accumulatedDepreciation: accumulated,
      bookValue,
    });

    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return entries;
}

/**
 * Get fiscal period for a date (creates if doesn't exist)
 */
async function getOrCreateFiscalPeriod(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0-indexed
  const code = `${year}-${month.toString().padStart(2, '0')}`;
  const monthName = date.toLocaleString('id-ID', { month: 'long' });
  const name = `${monthName} ${year}`;

  // Check if exists
  let period = await prisma.fiscalPeriod.findUnique({
    where: { code },
  });

  if (!period) {
    // Create period
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month

    period = await prisma.fiscalPeriod.create({
      data: {
        code,
        name,
        periodType: 'MONTHLY',
        startDate,
        endDate,
        status: date < new Date() ? 'CLOSED' : 'OPEN',
        isActive: true,
      },
    });

    console.log(`  ✅ Created fiscal period: ${name} (${code})`);
  }

  return period;
}

/**
 * Create journal entry for depreciation
 */
async function createDepreciationJournalEntry(
  assetId: string,
  assetName: string,
  assetCode: string,
  depreciationAmount: Decimal,
  periodDate: Date,
  fiscalPeriodId: string,
  userId: string
) {
  // Generate entry number
  const year = periodDate.getFullYear();
  const month = (periodDate.getMonth() + 1).toString().padStart(2, '0');
  const count = await prisma.journalEntry.count({
    where: {
      entryNumber: {
        startsWith: `JE-${year}-${month}`,
      },
    },
  });
  const entryNumber = `JE-${year}-${month}-${(count + 1).toString().padStart(4, '0')}`;

  // Create journal entry
  const journalEntry = await prisma.journalEntry.create({
    data: {
      entryNumber,
      entryDate: periodDate,
      postingDate: periodDate,
      description: `Depreciation for ${assetName} (${assetCode})`,
      descriptionId: `Depresiasi untuk ${assetName} (${assetCode})`,
      transactionType: 'DEPRECIATION',
      transactionId: assetId,
      documentNumber: assetCode,
      documentDate: periodDate,
      status: 'POSTED',
      isPosted: true,
      postedAt: new Date(),
      postedBy: userId,
      fiscalPeriodId,
      createdBy: userId,
    },
  });

  // Get accounts
  const depreciationExpenseAccount = await prisma.chartOfAccounts.findUnique({
    where: { code: '6-3010' }, // Depreciation Expense
  });

  const accumulatedDepreciationAccount = await prisma.chartOfAccounts.findUnique({
    where: { code: '1-1510' }, // Accumulated Depreciation
  });

  if (!depreciationExpenseAccount || !accumulatedDepreciationAccount) {
    throw new Error('Depreciation accounts not found in chart of accounts');
  }

  // Create line items
  await prisma.journalLineItem.createMany({
    data: [
      {
        journalEntryId: journalEntry.id,
        lineNumber: 1,
        accountId: depreciationExpenseAccount.id,
        debit: depreciationAmount,
        credit: new Decimal(0),
        description: `Depreciation expense - ${assetName}`,
        descriptionId: `Beban depresiasi - ${assetName}`,
      },
      {
        journalEntryId: journalEntry.id,
        lineNumber: 2,
        accountId: accumulatedDepreciationAccount.id,
        debit: new Decimal(0),
        credit: depreciationAmount,
        description: `Accumulated depreciation - ${assetName}`,
        descriptionId: `Akumulasi depresiasi - ${assetName}`,
      },
    ],
  });

  // Create general ledger entries
  await prisma.generalLedger.createMany({
    data: [
      {
        accountId: depreciationExpenseAccount.id,
        entryDate: periodDate,
        postingDate: periodDate,
        journalEntryId: journalEntry.id,
        journalEntryNumber: entryNumber,
        lineNumber: 1,
        debit: depreciationAmount,
        credit: new Decimal(0),
        balance: depreciationAmount,
        description: `Depreciation expense - ${assetName}`,
        descriptionId: `Beban depresiasi - ${assetName}`,
        transactionType: 'DEPRECIATION',
        transactionId: assetId,
        documentNumber: assetCode,
        fiscalPeriodId,
      },
      {
        accountId: accumulatedDepreciationAccount.id,
        entryDate: periodDate,
        postingDate: periodDate,
        journalEntryId: journalEntry.id,
        journalEntryNumber: entryNumber,
        lineNumber: 2,
        debit: new Decimal(0),
        credit: depreciationAmount,
        balance: depreciationAmount,
        description: `Accumulated depreciation - ${assetName}`,
        descriptionId: `Akumulasi depresiasi - ${assetName}`,
        transactionType: 'DEPRECIATION',
        transactionId: assetId,
        documentNumber: assetCode,
        fiscalPeriodId,
      },
    ],
  });

  return journalEntry;
}

/**
 * Backfill depreciation for a single asset
 */
async function backfillAsset(asset: any, options: BackfillOptions, userId: string) {
  console.log(`\n📦 Processing asset: ${asset.name} (${asset.assetCode})`);
  console.log(`   Category: ${asset.category}`);
  console.log(`   Purchase Date: ${asset.purchaseDate.toISOString().split('T')[0]}`);
  console.log(`   Purchase Price: Rp ${Number(asset.purchasePrice).toLocaleString('id-ID')}`);

  // Calculate schedule
  const usefulLife = getUsefulLife(asset.category);
  const schedule = calculateSchedule(
    asset.purchasePrice,
    asset.purchaseDate,
    usefulLife
  );

  console.log(`   Useful Life: ${usefulLife} years (${schedule.usefulLifeMonths} months)`);
  console.log(
    `   Monthly Depreciation: Rp ${Number(schedule.depreciationPerMonth).toLocaleString('id-ID')}`
  );
  console.log(`   Depreciation Period: ${schedule.startDate.toISOString().split('T')[0]} to ${schedule.endDate.toISOString().split('T')[0]}`);

  if (options.dryRun) {
    console.log('   ⏭️  DRY RUN - Skipping creation');
    return;
  }

  // Create depreciation schedule
  const dbSchedule = await prisma.depreciationSchedule.create({
    data: {
      assetId: asset.id,
      method: schedule.method,
      depreciableAmount: schedule.depreciableAmount,
      residualValue: schedule.residualValue,
      usefulLifeMonths: schedule.usefulLifeMonths,
      usefulLifeYears: schedule.usefulLifeYears,
      depreciationPerMonth: schedule.depreciationPerMonth,
      depreciationPerYear: schedule.depreciationPerYear,
      annualRate: schedule.annualRate,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      isActive: true,
      isFulfilled: false,
      notes: `Auto-generated schedule (backfill script)`,
      notesId: `Jadwal otomatis (script backfill)`,
    },
  });

  console.log(`   ✅ Created depreciation schedule`);

  // Generate historical entries (unless startFromToday is true)
  if (!options.startFromToday) {
    const historicalEntries = generateHistoricalEntries(schedule);
    console.log(`   📅 Creating ${historicalEntries.length} historical depreciation entries...`);

    for (const entry of historicalEntries) {
      // Get or create fiscal period
      const fiscalPeriod = await getOrCreateFiscalPeriod(entry.periodDate);

      // Create journal entry
      const journalEntry = await createDepreciationJournalEntry(
        asset.id,
        asset.name,
        asset.assetCode,
        entry.depreciationAmount,
        entry.periodDate,
        fiscalPeriod.id,
        userId
      );

      // Create depreciation entry
      await prisma.depreciationEntry.create({
        data: {
          assetId: asset.id,
          scheduleId: dbSchedule.id,
          periodDate: entry.periodDate,
          fiscalPeriodId: fiscalPeriod.id,
          depreciationAmount: entry.depreciationAmount,
          accumulatedDepreciation: entry.accumulatedDepreciation,
          bookValue: entry.bookValue,
          journalEntryId: journalEntry.id,
          status: 'POSTED',
          postedAt: new Date(),
          postedBy: userId,
        },
      });

      const monthName = entry.periodDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
      console.log(
        `     ✓ ${monthName}: Rp ${Number(entry.depreciationAmount).toLocaleString('id-ID')} ` +
        `(Accumulated: Rp ${Number(entry.accumulatedDepreciation).toLocaleString('id-ID')})`
      );
    }

    console.log(`   ✅ Created ${historicalEntries.length} depreciation entries`);
  } else {
    console.log(`   ⏭️  Skipping historical entries (startFromToday=true)`);
  }
}

/**
 * Main backfill function
 */
async function main() {
  const args = process.argv.slice(2);
  const options: BackfillOptions = {
    dryRun: args.includes('--dry-run'),
    assetId: args.find((arg) => arg.startsWith('--asset-id='))?.split('=')[1],
    startFromToday: args.includes('--start-from-today'),
  };

  console.log('\n🔧 DEPRECIATION BACKFILL SCRIPT (PSAK 16)');
  console.log('==========================================\n');

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Get default user for journal entries
  const defaultUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!defaultUser) {
    throw new Error('No admin user found. Please create an admin user first.');
  }

  console.log(`👤 Using user: ${defaultUser.name} (${defaultUser.email})`);

  // Find assets to backfill
  const assets = await prisma.asset.findMany({
    where: options.assetId
      ? { id: options.assetId }
      : {
          status: {
            in: ['AVAILABLE', 'RESERVED', 'CHECKED_OUT', 'IN_MAINTENANCE'],
          },
        },
    include: {
      depreciationSchedules: true,
    },
  });

  console.log(`\n📊 Found ${assets.length} asset(s) to process`);

  // Filter out assets that already have schedules
  const assetsWithoutSchedules = assets.filter(
    (asset) => asset.depreciationSchedules && asset.depreciationSchedules.length === 0
  );

  console.log(`   ${assetsWithoutSchedules.length} asset(s) without depreciation schedules`);

  if (assetsWithoutSchedules.length === 0) {
    console.log('\n✅ No assets need backfilling. All done!');
    return;
  }

  // Process each asset
  let successCount = 0;
  let errorCount = 0;

  for (const asset of assetsWithoutSchedules) {
    try {
      await backfillAsset(asset, options, defaultUser.id);
      successCount++;
    } catch (error) {
      console.error(`   ❌ Error processing asset ${asset.assetCode}:`, error);
      errorCount++;
    }
  }

  console.log('\n==========================================');
  console.log('📊 BACKFILL SUMMARY');
  console.log('==========================================');
  console.log(`✅ Successfully processed: ${successCount} asset(s)`);
  console.log(`❌ Errors: ${errorCount} asset(s)`);
  console.log(`📦 Total processed: ${assets.length} asset(s)`);
  console.log('==========================================\n');

  if (options.dryRun) {
    console.log('🔍 This was a DRY RUN - run without --dry-run to apply changes\n');
  } else {
    console.log('✅ Backfill complete!\n');
  }
}

// Run the script
main()
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
