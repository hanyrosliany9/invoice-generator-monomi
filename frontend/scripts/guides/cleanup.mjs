/**
 * Removes every demo row created by the capture, found by the "(Demo)" marker
 * (and the demo portal e-mail domain). Safe to run any time, also after a
 * failed capture:  node cleanup.mjs
 *
 * Deletes go straight to Postgres on purpose: the media API would try to
 * delete the (fake) objects from real R2 storage.
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { cfg, DEMO, HERE, api } from './lib.mjs';

export const STATE_FILE = path.join(HERE, '.capture-state.json');
const LIKE = `%${DEMO}%`;

export async function cleanup({ quiet = false } = {}) {
  await restoreInternalClient().catch((e) => console.warn('  could not restore internal client:', e.message));

  const db = new pg.Client({ connectionString: cfg.dbUrl });
  await db.connect();
  const run = async (label, sql, params = [LIKE]) => {
    const r = await db.query(sql, params);
    if (!quiet && r.rowCount) console.log(`  cleanup: ${label} x${r.rowCount}`);
  };
  try {
    await db.query('BEGIN');
    // Business documents first (FK order: ledger -> payables -> expenses ->
    // invoices -> quotations -> vendors/assets), then the content/media rows.
    const DC = `(SELECT id FROM clients WHERE name LIKE $1 AND "isInternal" = false)`;
    const DP = `(SELECT id FROM projects WHERE description LIKE $1 OR "clientId" IN ${DC})`;
    const DI = `(SELECT id FROM invoices WHERE "clientId" IN ${DC} OR "projectId" IN ${DP})`;
    const DPAY = `(SELECT id FROM payments WHERE "invoiceId" IN ${DI})`;
    const DX = `(SELECT id FROM expenses WHERE description LIKE $1 OR "projectId" IN ${DP} OR "clientId" IN ${DC})`;
    const DV = `(SELECT id FROM vendors WHERE name LIKE $1)`;
    const DA = `(SELECT id FROM assets WHERE name LIKE $1)`;
    const DSTAFF = `(SELECT id FROM staff WHERE name LIKE $1)`;
    const DSAL = `(SELECT id FROM salary_payments WHERE "staffId" IN ${DSTAFF})`;
    const ENTRIES = `(SELECT id FROM journal_entries WHERE "transactionId" IN ${DI}
        OR "transactionId" IN ${DPAY} OR "transactionId" IN ${DX} OR "transactionId" IN ${DV}
        OR "transactionId" IN (SELECT "expenseNumber" FROM expenses WHERE id IN ${DX})
        OR "transactionId" IN ${DA} OR "transactionId" IN ${DSAL}
        OR id IN (SELECT "journalEntryId" FROM salary_payments WHERE id IN ${DSAL} AND "journalEntryId" IS NOT NULL)
        OR "documentNumber" IN (SELECT "invoiceNumber" FROM invoices WHERE id IN ${DI})
        OR "documentNumber" IN (SELECT "expenseNumber" FROM expenses WHERE id IN ${DX})
        OR description LIKE $1)`;
    await run('ledger rows', `DELETE FROM general_ledger WHERE "journalEntryId" IN ${ENTRIES}`);
    await run('journal entries', `DELETE FROM journal_entries WHERE id IN ${ENTRIES}`);
    await run('payables', `DELETE FROM accounts_payable WHERE "vendorId" IN ${DV} OR "expenseId" IN ${DX}`);
    await run('vendor documents', `DELETE FROM vendor_invoices WHERE "vendorId" IN ${DV}`);
    await run('vendor payments', `DELETE FROM vendor_payments WHERE "vendorId" IN ${DV}`);
    await run('goods receipts', `DELETE FROM goods_receipts WHERE "vendorId" IN ${DV}`);
    await run('purchase orders', `DELETE FROM purchase_orders WHERE "vendorId" IN ${DV}`);
    await run('journey events', `DELETE FROM business_journey_events WHERE "clientId" IN ${DC} OR "projectId" IN ${DP}
      OR "invoiceId" IN ${DI} OR "paymentId" IN ${DPAY} OR "quotationId" IN (SELECT id FROM quotations WHERE "clientId" IN ${DC} OR "projectId" IN ${DP})`);
    await run('expenses', `DELETE FROM expenses WHERE id IN ${DX}`);
    await run('payments', `DELETE FROM payments WHERE id IN ${DPAY}`);
    await run('invoices', `DELETE FROM invoices WHERE id IN ${DI}`);
    await run('quotations', `DELETE FROM quotations WHERE "clientId" IN ${DC} OR "projectId" IN ${DP}`);
    await run('salary payments', `DELETE FROM salary_payments WHERE id IN ${DSAL}`);
    await run('staff', `DELETE FROM staff WHERE id IN ${DSTAFF}`);
    await run('vendors', `DELETE FROM vendors WHERE id IN ${DV}`);
    await run('assets', `DELETE FROM assets WHERE id IN ${DA}`);
    await run('call sheets', `DELETE FROM call_sheets WHERE "productionName" LIKE $1`);
    await run('media projects', 'DELETE FROM media_projects WHERE name LIKE $1');
    await run('decks', 'DELETE FROM decks WHERE title LIKE $1');
    await run('content items', `DELETE FROM content_calendar_items WHERE caption LIKE $1
      OR "clientId" IN (SELECT id FROM clients WHERE name LIKE $1 AND "isInternal" = false)`);
    await run('reports', 'DELETE FROM social_media_reports WHERE title LIKE $1');
    await run('projects', `DELETE FROM projects WHERE id IN ${DP}`);
    await run('portal login rows', `DELETE FROM client_portal_login_codes WHERE email LIKE 'demo.%@contoh.co.id'`, []);
    await run('portal login failures', `DELETE FROM client_portal_login_failures WHERE email LIKE 'demo.%@contoh.co.id'`, []);
    await run('portal contacts', `DELETE FROM client_portal_contacts WHERE email LIKE 'demo.%@contoh.co.id'`, []);
    await run('project types', 'DELETE FROM project_type_configs WHERE name LIKE $1');
    await run('clients', 'DELETE FROM clients WHERE name LIKE $1 AND "isInternal" = false');
    await run('users', 'DELETE FROM users WHERE name LIKE $1');
    await db.query('COMMIT');
    // Journals changed, so refresh the cached cash/bank balances (best effort, needs the API).
    await api('POST', '/accounting/cash-bank-balances/recalculate-all', {}, undefined, { soft: true }).catch(() => {});
  } catch (e) {
    await db.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    await db.end();
  }
}

/** The Monomi (internal) client is edited by the sub-guide; put it back. */
export async function restoreInternalClient() {
  if (!fs.existsSync(STATE_FILE)) return;
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  if (state.internalClient) {
    const { id, instagramHandle, instagramBio, instagramAvatarUrl, tiktokHandle, tiktokBio, tiktokAvatarUrl } = state.internalClient;
    await api('PATCH', `/clients/${id}`, {
      instagramHandle: instagramHandle ?? '', instagramBio: instagramBio ?? '', instagramAvatarUrl: instagramAvatarUrl ?? '',
      tiktokHandle: tiktokHandle ?? '', tiktokBio: tiktokBio ?? '', tiktokAvatarUrl: tiktokAvatarUrl ?? '',
    }, undefined, { soft: true });
  }
  fs.unlinkSync(STATE_FILE);
}

export async function countRemaining() {
  const db = new pg.Client({ connectionString: cfg.dbUrl });
  await db.connect();
  const q = async (sql) => Number((await db.query(sql, [LIKE])).rows[0].n);
  const out = {
    clients: await q('SELECT count(*) n FROM clients WHERE name LIKE $1'),
    projects: await q('SELECT count(*) n FROM projects WHERE description LIKE $1'),
    reports: await q('SELECT count(*) n FROM social_media_reports WHERE title LIKE $1'),
    content: await q('SELECT count(*) n FROM content_calendar_items WHERE caption LIKE $1'),
    media: await q('SELECT count(*) n FROM media_projects WHERE name LIKE $1'),
    decks: await q('SELECT count(*) n FROM decks WHERE title LIKE $1'),
    contacts: Number((await db.query(`SELECT count(*) n FROM client_portal_contacts WHERE email LIKE 'demo.%@contoh.co.id'`)).rows[0].n),
  };
  await db.end();
  return out;
}

if (process.argv[1] && path.basename(process.argv[1]) === 'cleanup.mjs') {
  await cleanup();
  console.log('remaining demo rows:', await countRemaining());
}
