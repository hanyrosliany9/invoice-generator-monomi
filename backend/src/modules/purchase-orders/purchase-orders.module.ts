import { Module } from "@nestjs/common";
import { PurchaseOrdersService } from "./purchase-orders.service";
import { PurchaseOrdersController } from "./purchase-orders.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AccountingModule } from "../accounting/accounting.module";

/**
 * Purchase Orders Module
 *
 * Purchase-to-pay purchase order management system.
 *
 * Features:
 * - Complete PO CRUD with multi-line items
 * - Approval workflows (approve, reject, cancel, close)
 * - Budget validation against projects
 * - PO commitment accounting (optional)
 * - Indonesian tax calculations (PPN, PPh)
 * - Status management (DRAFT → APPROVED → RECEIVED → CLOSED)
 * - Integration with Goods Receipts and Vendor Invoices
 * - Bilingual support (Indonesian/English)
 * - Role-based access control
 * - PO statistics and analytics
 *
 * Services:
 * - PurchaseOrdersService: Core business logic, budget validation, number generation
 *
 * Dependencies:
 * - PrismaModule: Database access
 * - AccountingModule: Journal entry automation
 * - AuthModule: JWT authentication (imported by guards)
 */
@Module({
  imports: [PrismaModule, AccountingModule],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
