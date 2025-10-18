# Model Updates for Purchase-to-Pay Integration

## Expense Model Updates

Add these fields to the Expense model (around line 951):

```prisma
model Expense {
  // ... existing fields ...

  // ===== NEW: PURCHASE-TO-PAY INTEGRATION =====

  // Purchase Type & Source
  purchaseType        PurchaseType  @default(DIRECT)
  purchaseSource      PurchaseSource @default(MANUAL)

  // Vendor Integration (FK to Vendor master)
  vendorId            String?
  vendor              Vendor? @relation(fields: [vendorId], references: [id])

  // Purchase Workflow Links
  purchaseOrderId     String?
  purchaseOrder       PurchaseOrder? @relation(fields: [purchaseOrderId], references: [id])

  vendorInvoiceId     String?
  vendorInvoice       VendorInvoice? @relation(fields: [vendorInvoiceId], references: [id])

  accountsPayableId   String?  @unique
  accountsPayable     AccountsPayable?

  // Payment Terms
  dueDate             DateTime?  // Actual due date (not calculated)

  // Keep existing vendorName and vendorNPWP for legacy data
  // vendorName       String?  (existing - now optional)
  // vendorNPWP       String?  (existing - now optional)

  // ... rest of existing fields ...

  // Add indexes:
  @@index([vendorId])
  @@index([purchaseOrderId])
  @@index([vendorInvoiceId])
  @@index([purchaseType])
  @@index([purchaseSource])
  @@index([dueDate])
}
```

## Asset Model Updates

Add these fields to the Asset model (around line 706):

```prisma
model Asset {
  // ... existing fields ...

  // ===== NEW: PURCHASE-TO-PAY INTEGRATION =====

  // Vendor Integration
  vendorId            String?
  vendor              Vendor? @relation(fields: [vendorId], references: [id])

  // Purchase Workflow Links
  purchaseOrderId     String?
  purchaseOrder       PurchaseOrder? @relation(fields: [purchaseOrderId], references: [id])

  goodsReceiptId      String?
  goodsReceipt        GoodsReceipt? @relation(fields: [goodsReceiptId], references: [id])

  vendorInvoiceId     String?
  vendorInvoice       VendorInvoice? @relation(fields: [vendorInvoiceId], references: [id])

  // Relations
  poItems             PurchaseOrderItem[]

  // ... rest of existing fields ...

  // Add indexes:
  @@index([vendorId])
  @@index([purchaseOrderId])
  @@index([goodsReceiptId])
  @@index([vendorInvoiceId])
}
```

## Project Model Updates

Add this relation to the Project model (around line 83):

```prisma
model Project {
  // ... existing fields ...

  // ===== NEW: PURCHASE-TO-PAY INTEGRATION =====

  // Purchase Orders (for budget tracking)
  purchaseOrders      PurchaseOrder[]

  // ... rest of existing fields ...
}
```

## ExpenseCategory Model Updates

Add this relation to ExpenseCategory (around line 1104):

```prisma
model ExpenseCategory {
  // ... existing fields ...

  // ===== NEW: PURCHASE-TO-PAY INTEGRATION =====

  // Purchase Order Items
  purchaseOrderItems  PurchaseOrderItem[]

  // ... rest of existing fields ...
}
```

## TransactionType Enum Updates

Update the TransactionType enum (around line 1669) to include new types:

```prisma
enum TransactionType {
  // ... existing types ...

  // ===== NEW: PURCHASE-TO-PAY TYPES =====
  PO_APPROVED           // PO commitment - DR Expense/Asset, CR PO Commitments
  PO_CANCELLED          // Reverse PO commitment
  GOODS_RECEIVED        // GR accrual - DR Inventory/Asset, CR GR Accruals
  VENDOR_INVOICE_APPROVED // Final AP recognition - DR Expense/Asset, CR AP
  VENDOR_PAYMENT_MADE   // Payment to vendor - DR AP, CR Cash
  PURCHASE_RETURN       // Return to vendor - DR AP, CR Expense
}
```

## Chart of Accounts - New Accounts to Seed

Add these accounts via seed script:

```typescript
// 2-1020 | PO Commitments        | LIABILITY | CREDIT
// 2-1030 | GR Accruals           | LIABILITY | CREDIT
// 6-3010 | Purchase Returns      | EXPENSE   | DEBIT (contra)
// 6-3020 | Purchase Discounts    | EXPENSE   | DEBIT (contra)
```
