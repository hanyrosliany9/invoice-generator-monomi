import { projectService } from '@/services/projects';
import type { CreateExpenseFormData } from '@/types/expense';
import type { ExpenseFormPayload } from './ExpenseForm';

/**
 * Build the CreateExpense API payload from the form payload.
 * Shared by the full-page create flow and the Quick Expense slide-over so the
 * mapping (and the "derive client from project" rule) lives in one place.
 */
export const buildCreateExpensePayload = async (
  payload: ExpenseFormPayload,
): Promise<CreateExpenseFormData> => {
  const { values, category, amounts } = payload;

  // Resolve client from the picked project so the caller needs no client picker.
  let clientId: string | undefined;
  if (values.projectId) {
    try {
      const project = await projectService.getProject(values.projectId);
      clientId = project?.clientId;
    } catch {
      // Non-fatal: the server can still validate; we just won't tag a client.
      clientId = undefined;
    }
  }

  return {
    categoryId:   category.id,
    accountCode:  category.accountCode,
    accountName:  category.accountName,
    expenseClass: category.expenseClass,

    description: values.description.trim(),
    notes:       values.notes?.trim() || undefined,

    vendorName:    values.vendorName.trim(),
    vendorNPWP:    values.vendorNPWP?.trim() || undefined,
    vendorAddress: values.vendorAddress?.trim() || undefined,

    grossAmount:       amounts.grossAmount,
    ppnAmount:         amounts.ppnAmount,
    withholdingAmount: amounts.withholdingAmount,
    netAmount:         amounts.netAmount,
    totalAmount:       amounts.totalAmount,

    ppnRate:        amounts.ppnRate,
    ppnCategory:    values.ppnCategory,
    isLuxuryGoods:  values.includePPN ? values.isLuxuryGoods : false,

    eFakturNSFP:   values.eFakturNSFP?.trim() || undefined,
    eFakturStatus: values.eFakturStatus,

    withholdingTaxType: values.withholdingTaxType,
    withholdingTaxRate: amounts.withholdingTaxRate,

    isBillable: values.isBillable,
    projectId:  values.projectId || undefined,
    clientId,
    paymentSource: values.paymentSource,

    expenseDate: values.expenseDate.toISOString(),
    currency: 'IDR',
    isTaxDeductible: true,
  };
};
