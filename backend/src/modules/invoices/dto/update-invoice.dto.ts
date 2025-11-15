import { OmitType, PartialType } from "@nestjs/swagger";
import { CreateInvoiceDto } from "./create-invoice.dto";

/**
 * ✅ FIX: Exclude 'status' from UpdateInvoiceDto
 *
 * Invoice status should NEVER be changed through the generic update endpoint.
 * Status changes must go through dedicated business logic endpoints:
 * - PATCH /invoices/:id/mark-paid - for marking as paid (creates payment journal)
 * - PATCH /invoices/:id/status - for other status changes
 *
 * This prevents bypassing accounting logic (payment journal entries, AR updates, etc.)
 */
export class UpdateInvoiceDto extends PartialType(
  OmitType(CreateInvoiceDto, ['status', 'createdBy'] as const)
) {}
