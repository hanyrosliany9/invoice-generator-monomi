# Purchase Order Module Fix Summary

## Schema vs Implementation Mismatches

### Enums That Don't Exist:
- ❌ `POType` - doesn't exist in schema
- ❌ `DeliveryTerms` - doesn't exist in schema
- ❌ `PaymentTermType` - doesn't exist in schema

### PurchaseOrder Fields That Don't Exist:
- ❌ `poType` - doesn't exist
- ❌ `expectedDeliveryDate` - doesn't exist (use `deliveryDate`)
- ❌ `deliveryTerms` - doesn't exist
- ❌ `deliveryContactPerson` - doesn't exist
- ❌ `deliveryContactPhone` - doesn't exist
- ❌ `paymentDueDays` - doesn't exist (use `paymentTerms` string)
- ❌ `termsAndConditions` - doesn't exist (use `termsConditions`)
- ❌ `termsAndConditionsId` - doesn't exist
- ❌ `recordCommitment` - doesn't exist
- ❌ `ppnRate` - exists on PurchaseOrder schema ✓
- ❌ `cancelledBy` - doesn't exist in schema
- ❌ `cancelledAt` - doesn't exist in schema
- ❌ `cancellationReason` - doesn't exist (use `closureReason`)

### PurchaseOrderItem Required Fields Missing:
- ✅ MUST have: `itemType` (enum POItemType: GOODS | SERVICE | ASSET | EXPENSE)
- ✅ MUST have: `unit` (not `uom`)
- ✅ MUST have: `ppnAmount` (Decimal)
- ✅ MUST have: `quantityOutstanding` (Decimal)
- ❌ Remove: `categoryId` (use `expenseCategoryId`)
- ❌ Remove: `assetCategory` (use `assetId` FK)
- ❌ Remove: `expectedDeliveryDate` on item level
- ❌ Remove: `notes` on item level

### POStatus Enum Values:
- ✓ DRAFT
- ✓ PENDING
- ✓ APPROVED
- ✓ SENT
- ✓ PARTIAL (not PARTIALLY_RECEIVED)
- ✓ COMPLETED
- ✓ CANCELLED
- ✓ CLOSED
- ❌ REJECTED doesn't exist - use CANCELLED instead

### Field Name Changes:
- `code` → `vendorCode` (Vendor)
- `category` → `expenseCategory` (PurchaseOrderItem include)
- `purchaseOrderId` → `poId` (GoodsReceipt where clause)
- `invoiceNumber` → `vendorInvoiceNumber` or `internalNumber` (VendorInvoice)
- `totalQuantityReceived` - doesn't exist on GoodsReceipt

### Project Model:
- ❌ `budget` field doesn't exist on Project schema
- Remove budget validation logic

## Fix Plan:

1. Remove POType and DeliveryTerms from DTOs
2. Update PurchaseOrderItem DTO to match schema exactly
3. Remove non-existent fields from PO DTO
4. Fix status checks (PARTIAL not PARTIALLY_RECEIVED, no REJECTED)
5. Fix field names in service includes/selects
6. Remove budget validation
7. Remove recordCommitment logic
8. Fix cancellation field names
