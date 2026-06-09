/**
 * Post-seed step: the seed creates invoice rows directly (no GL), so seeded
 * SENT/PAID invoices have no journal entries — the books looked empty
 * ("3 invoices, 1 journal"). This bootstraps a Nest context to reuse the same,
 * tested backfill the app uses, posting the accrual journals (DR AR / CR
 * Revenue for SENT; + DR Cash / CR AR for PAID) so the seeded data is
 * GL-consistent. Idempotent — safe to run repeatedly.
 *
 * Chained after the seed in the `db:seed` npm script.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { JournalService } from '../src/modules/accounting/services/journal.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);
  const journal = app.get(JournalService);
  const admin = await prisma.user.findFirst({
    where: { email: 'admin@monomi.id' },
    select: { id: true },
  });
  const userId = admin?.id ?? 'system';
  const result = await journal.backfillMissingInvoiceJournals(userId);
  console.log('📒 Seed journal backfill:', result);
  // app.close() runs onModuleDestroy hooks; the Redis throttler's quit can throw
  // noisy errors on shutdown that are irrelevant to the backfill. Ignore them.
  try {
    await app.close();
  } catch {
    /* ignore shutdown-hook noise */
  }
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Seed journal backfill failed:', e);
    process.exit(1);
  });
