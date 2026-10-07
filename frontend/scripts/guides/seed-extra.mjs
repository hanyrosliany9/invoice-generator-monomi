/**
 * Extra "(Demo)" data for the reports / milestones / advanced accounting guides (the base seed has no payment terms,
 * purchases, bank transfers and so on). Everything goes through the staff API, so it behaves like real data, and carries the
 * marker in a name / description that cleanup.mjs searches (clients and projects are the base seed's own "(Demo)" ones).
 */
import { api } from './lib.mjs';

export const isoDay = (offsetDays, hour = 0) => {
  const d = new Date();
  d.setUTCHours(hour, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString();
};

/**
 * A quotation with payment terms (DP 30% / Pelunasan 70%), approved, with the first milestone invoiced, sent and paid, so the
 * milestone analytics (/milestones) have one finished and one pending milestone. Returns the ids.
 */
export async function seedMilestones(ids) {
  const items = [{ name: 'Paket Konten Kampanye Ramadan', description: 'Konsep, produksi, dan 12 konten', price: 14000000, quantity: 1 }];
  const subtotal = 14000000;
  const q = await api('POST', '/quotations', {
    clientId: ids.client, projectId: ids.project2, amountPerProject: subtotal, totalAmount: subtotal, subtotalAmount: subtotal,
    includeTax: false, taxRate: 0, taxAmount: 0, validUntil: isoDay(30), scopeOfWork: 'Kampanye Ramadan (Demo)',
    terms: 'DP 30% saat setuju, pelunasan 70% setelah konten diserahkan.',
    paymentType: 'MILESTONE_BASED',
    paymentMilestones: [
      { milestoneNumber: 1, name: 'DP 30%', nameId: 'DP 30%', paymentPercentage: 30 },
      { milestoneNumber: 2, name: 'Pelunasan 70%', nameId: 'Pelunasan 70%', paymentPercentage: 70 },
    ],
    priceBreakdown: { products: items.map((i) => ({ ...i, subtotal: i.price * i.quantity })), total: subtotal, calculatedAt: new Date().toISOString() },
  });
  await api('PATCH', `/quotations/${q.id}/status`, { status: 'SENT' });
  await api('PATCH', `/quotations/${q.id}/status`, { status: 'APPROVED' });
  // First milestone (DP 30%): invoiced, sent and paid, so one milestone is finished and the other is still pending.
  const dp = await api('POST', `/quotations/${q.id}/generate-next-milestone-invoice`, {});
  await api('PATCH', `/invoices/${dp.id}/status`, { status: 'SENT' });
  const pay = await api('POST', '/payments', { invoiceId: dp.id, amount: 4200000, paymentDate: isoDay(-1), paymentMethod: 'BANK_TRANSFER', transactionRef: 'TRF-DEMO-0101' });
  await api('PATCH', `/payments/${pay.id}/confirm`, {});
  return { quotation: q.id, invoice: dp.id };
}

/**
 * Opening capital in the bank plus three purchases (two on credit, one paid from the bank), so the ledger, trial balance, cash
 * flow, AP aging and purchase report have rows. Descriptions and vendors carry the "(Demo)" marker, which cleanup.mjs searches.
 */
export async function seedAccounting(ids) {
  const out = {};
  const vendors = ids.biz.vendors;

  // Opening capital in the bank on the 1st of this month (the reports default to the current month), posted. The base seed pays
  // its expenses and the camera (an asset purchase) from the bank only, so without this every bank balance would be negative.
  const first = new Date(); first.setUTCDate(1); first.setUTCHours(0, 0, 0, 0);
  const capital = await api('POST', '/accounting/journal-entries', {
    entryDate: first.toISOString(), description: 'Setoran modal awal (Demo)', transactionType: 'OPENING', transactionId: `OPENING-DEMO-${Date.now()}`,
    documentNumber: 'MODAL-DEMO-01',
    lineItems: [
      { accountCode: '1-1020', description: 'Setoran modal ke rekening bank', debit: 120000000, credit: 0 },
      { accountCode: '3-1010', description: 'Modal pemilik', debit: 0, credit: 120000000 },
    ],
  });
  await api('POST', `/accounting/journal-entries/${capital.id}/post`, {});

  // Purchases: two on credit (Hutang Usaha, one of them older so the AP aging shows two buckets) and one paid from the bank.
  const mkPurchase = (vendorId, daysAgo, reference, description, accountCode, unitPrice, paymentMethod) => api('POST', '/accounting/purchases', {
    vendorId, date: isoDay(-daysAgo), reference: `${reference} (Demo)`, paymentMethod,
    lineItems: [{ description: `${description} (Demo)`, accountCode, quantity: 1, unitPrice }],
  });
  out.purchases = [
    await mkPurchase(vendors[0], 18, 'PO-DEMO-01', 'Sewa kamera cinema 2 hari', '5-3020', 3500000, 'HUTANG'),
    await mkPurchase(vendors[1], 46, 'PO-DEMO-02', 'Sewa studio rekaman', '5-3020', 1800000, 'HUTANG'),
    await mkPurchase(vendors[2], 4, 'PO-DEMO-03', 'Lampu LED panel 2 unit', '5-3020', 2200000, 'BANK'),
  ].map((p) => p.id);

  return out;
}
