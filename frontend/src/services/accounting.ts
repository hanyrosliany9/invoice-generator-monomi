import { apiClient } from '../config/api';

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  nameId: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  accountSubType: string;
  normalBalance: 'DEBIT' | 'CREDIT';
  parentId?: string;
  isControlAccount: boolean;
  isTaxAccount: boolean;
  taxType?: string;
  isActive: boolean;
  isSystemAccount: boolean;
  description?: string;
  descriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalLineItem {
  id?: string;
  lineNumber?: number;
  accountCode: string;
  description?: string;
  descriptionId?: string;
  debitAmount: number;
  creditAmount: number;
  referenceType?: string;
  referenceId?: string;
  contactType?: string;
  contactId?: string;
  taxType?: string;
  taxRate?: number;
  taxAmount?: number;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  postingDate?: string;
  description: string;
  descriptionId?: string;
  descriptionEn?: string;
  transactionType: string;
  transactionId: string;
  documentNumber?: string;
  documentDate?: string;
  status: 'DRAFT' | 'POSTED';
  isPosted: boolean;
  postedAt?: string;
  postedBy?: string;
  fiscalPeriodId?: string;
  fiscalPeriod?: FiscalPeriod;
  isReversing: boolean;
  reversedEntryId?: string;
  createdBy: string;
  updatedBy?: string;
  lineItems: JournalLineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface FiscalPeriod {
  id: string;
  name: string;
  code: string;
  periodType: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'CLOSED';
  closedAt?: string;
  closedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrialBalance {
  asOfDate: string;
  fiscalPeriodId?: string;
  balances: Array<{
    accountCode: string;
    accountName: string;
    accountNameId: string;
    accountType: string;
    accountSubType: string;
    normalBalance: string;
    balance: number;
    debitBalance: number;
    creditBalance: number;
    isAbnormal: boolean;
  }>;
  balancesByType: Record<string, any[]>;
  summary: {
    totalDebit: number;
    totalCredit: number;
    difference: number;
    isBalanced: boolean;
    accountCount: number;
  };
}

export interface IncomeStatement {
  period: {
    startDate: string;
    endDate: string;
  };
  revenue: {
    accounts: any[];
    total: number;
  };
  expenses: {
    accounts: any[];
    byType: Record<string, any[]>;
    total: number;
  };
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    profitMargin: number;
  };
}

export interface BalanceSheet {
  asOfDate: string;
  assets: {
    accounts: any[];
    byType: Record<string, any[]>;
    total: number;
  };
  liabilities: {
    accounts: any[];
    byType: Record<string, any[]>;
    total: number;
  };
  equity: {
    accounts: any[];
    total: number;
  };
  summary: {
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    liabilitiesAndEquity: number;
    isBalanced: boolean;
    difference: number;
  };
}

export interface CashFlowStatement {
  period: {
    startDate: string;
    endDate: string;
  };
  operatingActivities: {
    transactions: any[];
    netCashFlow: number;
  };
  investingActivities: {
    transactions: any[];
    netCashFlow: number;
  };
  financingActivities: {
    transactions: any[];
    netCashFlow: number;
  };
  summary: {
    openingBalance: number;
    operatingCashFlow: number;
    investingCashFlow: number;
    financingCashFlow: number;
    netCashFlow: number;
    closingBalance: number;
  };
}

// Chart of Accounts
export const getChartOfAccounts = async (params?: {
  includeInactive?: boolean;
}): Promise<ChartOfAccount[]> => {
  const response = await apiClient.get('/accounting/chart-of-accounts', { params });
  return response.data.data;
};

export const getAccountByCode = async (code: string): Promise<ChartOfAccount> => {
  const response = await apiClient.get(`/accounting/chart-of-accounts/${code}`);
  return response.data.data;
};

export const createChartOfAccount = async (data: Partial<ChartOfAccount>): Promise<ChartOfAccount> => {
  const response = await apiClient.post('/accounting/chart-of-accounts', data);
  return response.data.data;
};

export const updateChartOfAccount = async (
  code: string,
  data: Partial<ChartOfAccount>
): Promise<ChartOfAccount> => {
  const response = await apiClient.patch(`/accounting/chart-of-accounts/${code}`, data);
  return response.data.data;
};

export const deleteChartOfAccount = async (code: string): Promise<void> => {
  await apiClient.delete(`/accounting/chart-of-accounts/${code}`);
};

export const toggleAccountStatus = async (code: string): Promise<ChartOfAccount> => {
  const response = await apiClient.patch(`/accounting/chart-of-accounts/${code}/toggle-status`);
  return response.data.data;
};

// Journal Entries
export const createJournalEntry = async (data: Partial<JournalEntry>): Promise<JournalEntry> => {
  const response = await apiClient.post('/accounting/journal-entries', data);
  return response.data.data;
};

export const getJournalEntries = async (params?: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  transactionType?: string;
  status?: string;
  isPosted?: boolean;
  fiscalPeriodId?: string;
  accountCode?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  data: JournalEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  const response = await apiClient.get('/accounting/journal-entries', { params });
  return response.data;
};

export const getJournalEntry = async (id: string): Promise<JournalEntry> => {
  const response = await apiClient.get(`/accounting/journal-entries/${id}`);
  return response.data.data;
};

export const updateJournalEntry = async (
  id: string,
  data: Partial<JournalEntry>
): Promise<JournalEntry> => {
  const response = await apiClient.patch(`/accounting/journal-entries/${id}`, data);
  return response.data.data;
};

export const postJournalEntry = async (id: string): Promise<JournalEntry> => {
  const response = await apiClient.post(`/accounting/journal-entries/${id}/post`);
  return response.data.data;
};

export const reverseJournalEntry = async (id: string): Promise<JournalEntry> => {
  const response = await apiClient.post(`/accounting/journal-entries/${id}/reverse`);
  return response.data.data;
};

export const deleteJournalEntry = async (id: string): Promise<void> => {
  await apiClient.delete(`/accounting/journal-entries/${id}`);
};

// General Ledger
export const getGeneralLedger = async (params?: {
  accountCode?: string;
  accountType?: string;
  startDate?: string;
  endDate?: string;
  fiscalPeriodId?: string;
  includeInactive?: boolean;
}): Promise<any> => {
  const response = await apiClient.get('/accounting/ledger', { params });
  return response.data.data;
};

export const getAccountLedger = async (
  accountCode: string,
  params?: {
    startDate?: string;
    endDate?: string;
    fiscalPeriodId?: string;
  }
): Promise<any> => {
  const response = await apiClient.get(`/accounting/ledger/account/${accountCode}`, { params });
  return response.data.data;
};

export const getTrialBalance = async (params: {
  asOfDate: string;
  fiscalPeriodId?: string;
  includeInactive?: boolean;
  includeZeroBalances?: boolean;
}): Promise<TrialBalance> => {
  const response = await apiClient.get('/accounting/ledger/trial-balance', { params });
  return response.data.data;
};

// Financial Statements
export const getIncomeStatement = async (params: {
  startDate: string;
  endDate: string;
  fiscalPeriodId?: string;
  includeInactive?: boolean;
}): Promise<IncomeStatement> => {
  const response = await apiClient.get('/accounting/financial-statements/income-statement', {
    params,
  });
  return response.data.data;
};

export const getBalanceSheet = async (params: {
  endDate: string;
  fiscalPeriodId?: string;
  includeInactive?: boolean;
}): Promise<BalanceSheet> => {
  const response = await apiClient.get('/accounting/financial-statements/balance-sheet', {
    params,
  });
  return response.data.data;
};

export const getCashFlowStatement = async (params: {
  startDate: string;
  endDate: string;
  fiscalPeriodId?: string;
}): Promise<CashFlowStatement> => {
  const response = await apiClient.get('/accounting/financial-statements/cash-flow', { params });
  return response.data.data;
};

export const getAccountsReceivableReport = async (params: {
  endDate: string;
}): Promise<any> => {
  const response = await apiClient.get('/accounting/financial-statements/accounts-receivable', {
    params,
  });
  return response.data.data;
};

export const getAccountsPayableReport = async (params: { startDate?: string; endDate: string }): Promise<any> => {
  const response = await apiClient.get('/accounting/financial-statements/accounts-payable', {
    params,
  });
  return response.data.data;
};

// AR/AP Aging Reports
export const getAccountsReceivableAging = async (params?: { asOfDate?: string }): Promise<any> => {
  const response = await apiClient.get('/accounting/ledger/ar-aging', { params });
  return response.data.data;
};

export const getAccountsPayableAging = async (params?: { asOfDate?: string }): Promise<any> => {
  const response = await apiClient.get('/accounting/ledger/ap-aging', { params });
  return response.data.data;
};

// Fiscal Periods
export const getFiscalPeriods = async (): Promise<FiscalPeriod[]> => {
  const response = await apiClient.get('/accounting/fiscal-periods');
  return response.data.data;
};

export const getCurrentFiscalPeriod = async (): Promise<FiscalPeriod> => {
  const response = await apiClient.get('/accounting/fiscal-periods/current');
  return response.data.data;
};

export const closeFiscalPeriod = async (id: string): Promise<FiscalPeriod> => {
  const response = await apiClient.post(`/accounting/fiscal-periods/${id}/close`);
  return response.data.data;
};

// ============ DEPRECIATION (PSAK 16) ============
export interface DepreciationSchedule {
  id: string;
  fixedAssetId: string;
  depreciationMethod: 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'UNITS_OF_PRODUCTION';
  usefulLifeYears?: number;
  usefulLifeUnits?: number;
  salvageValue: number;
  depreciationRate?: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DepreciationEntry {
  id: string;
  scheduleId: string;
  periodDate: string;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  journalEntryId?: string;
  isPosted: boolean;
  fiscalPeriodId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DepreciationSummary {
  period: {
    startDate: string;
    endDate: string;
  };
  totalDepreciation: number;
  assetCount: number;
  byAsset: Array<{
    assetId: string;
    assetName: string;
    assetCode: string;
    depreciationAmount: number;
    accumulatedDepreciation: number;
    netBookValue: number;
    entryCount: number;
  }>;
  byMethod: Record<string, {
    totalDepreciation: number;
    assetCount: number;
  }>;
}

export const calculatePeriodDepreciation = async (data: {
  scheduleId: string;
  periodDate: string;
  unitsProduced?: number;
  fiscalPeriodId?: string;
}): Promise<DepreciationEntry> => {
  const response = await apiClient.post('/accounting/depreciation/calculate', data);
  return response.data.data;
};

export const postDepreciationEntry = async (entryId: string): Promise<DepreciationEntry> => {
  const response = await apiClient.post('/accounting/depreciation/post', { entryId });
  return response.data.data;
};

export const processMonthlyDepreciation = async (data: {
  periodDate: string;
  fiscalPeriodId?: string;
  autoPost?: boolean;
}): Promise<{
  processed: number;
  posted: number;
  entries: DepreciationEntry[];
}> => {
  const response = await apiClient.post('/accounting/depreciation/process-monthly', data);
  return response.data.data;
};

export const createDepreciationSchedule = async (data: {
  fixedAssetId: string;
  depreciationMethod: 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'UNITS_OF_PRODUCTION';
  usefulLifeYears?: number;
  usefulLifeUnits?: number;
  salvageValue: number;
  depreciationRate?: number;
  startDate: string;
}): Promise<DepreciationSchedule> => {
  const response = await apiClient.post('/accounting/depreciation/schedule', data);
  return response.data.data;
};

export const deactivateDepreciationSchedule = async (scheduleId: string): Promise<void> => {
  await apiClient.delete(`/accounting/depreciation/schedule/${scheduleId}`);
};

export const getAssetDepreciationSchedule = async (assetId: string): Promise<DepreciationSchedule[]> => {
  const response = await apiClient.get(`/accounting/depreciation/schedule/${assetId}`);
  return response.data.data;
};

export const getAssetDepreciationEntries = async (assetId: string): Promise<DepreciationEntry[]> => {
  const response = await apiClient.get(`/accounting/depreciation/entries/${assetId}`);
  return response.data.data;
};

export const getDepreciationSummary = async (params: {
  startDate: string;
  endDate: string;
  assetId?: string;
}): Promise<DepreciationSummary> => {
  const response = await apiClient.get('/accounting/depreciation/summary', { params });
  return response.data.data;
};

// ============ ECL PROVISIONS (PSAK 71) ============
export interface ECLProvision {
  id: string;
  invoiceId: string;
  calculationDate: string;
  agingBucket: string;
  daysPastDue: number;
  outstandingAmount: number;
  eclRate: number;
  eclAmount: number;
  eclModel: '12_MONTH' | 'LIFETIME';
  journalEntryId?: string;
  isPosted: boolean;
  fiscalPeriodId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ECLWriteOff {
  id: string;
  provisionId: string;
  writeOffAmount: number;
  writeOffDate: string;
  writeOffReason: string;
  journalEntryId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ECLRecovery {
  id: string;
  provisionId: string;
  recoveredAmount: number;
  recoveryDate: string;
  journalEntryId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ECLSummary {
  summary: {
    totalProvisions: number;
    totalOutstanding: number;
    totalECL: number;
    coverageRatio: number;
    totalWrittenOff: number;
    totalRecovered: number;
    netBadDebt: number;
  };
  byAgingBucket: Record<string, {
    count: number;
    totalOutstanding: number;
    totalECL: number;
    averageECLRate: number;
  }>;
  provisions: Array<{
    id: string;
    invoiceNumber: string;
    clientName: string;
    agingBucket: string;
    daysPastDue: number;
    outstandingAmount: number;
    eclRate: number;
    eclAmount: number;
    status: string;
    calculationDate: string;
  }>;
}

export const calculateInvoiceECL = async (data: {
  invoiceId: string;
  calculationDate: string;
  fiscalPeriodId?: string;
  customECLRates?: Record<string, number>;
  eclModel?: '12_MONTH' | 'LIFETIME';
}): Promise<ECLProvision> => {
  const response = await apiClient.post('/accounting/ecl/calculate', data);
  return response.data.data;
};

export const postECLProvision = async (provisionId: string): Promise<ECLProvision> => {
  const response = await apiClient.post('/accounting/ecl/post', { provisionId });
  return response.data.data;
};

export const processMonthlyECL = async (data: {
  calculationDate: string;
  fiscalPeriodId?: string;
  autoPost?: boolean;
  customECLRates?: Record<string, number>;
}): Promise<{
  processed: number;
  posted: number;
  totalECLAmount: number;
  provisions: ECLProvision[];
}> => {
  const response = await apiClient.post('/accounting/ecl/process-monthly', data);
  return response.data.data;
};

export const writeOffBadDebt = async (data: {
  provisionId: string;
  writeOffAmount: number;
  writeOffReason: string;
}): Promise<ECLWriteOff> => {
  const response = await apiClient.post('/accounting/ecl/write-off', data);
  return response.data.data;
};

export const recordBadDebtRecovery = async (data: {
  provisionId: string;
  recoveredAmount: number;
}): Promise<ECLRecovery> => {
  const response = await apiClient.post('/accounting/ecl/recovery', data);
  return response.data.data;
};

export const getECLSummary = async (params: {
  startDate: string;
  endDate: string;
  includeWrittenOff?: boolean;
}): Promise<ECLSummary> => {
  const response = await apiClient.get('/accounting/ecl/summary', { params });
  return response.data.data;
};

export const getInvoiceECLProvisions = async (invoiceId: string): Promise<ECLProvision[]> => {
  const response = await apiClient.get(`/accounting/ecl/invoice/${invoiceId}`);
  return response.data.data;
};

// ============ EXPORT FUNCTIONS ============
// Helper function to trigger file download from blob
const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const exportTrialBalancePDF = async (params: {
  asOfDate: string;
  fiscalPeriodId?: string;
  includeInactive?: boolean;
  includeZeroBalances?: boolean;
}): Promise<void> => {
  const response = await apiClient.get('/accounting/export/trial-balance/pdf', {
    params,
    responseType: 'blob',
  });
  downloadBlob(response.data, `neraca-saldo-${params.asOfDate}.pdf`);
};

export const exportIncomeStatementPDF = async (params: {
  startDate: string;
  endDate: string;
  fiscalPeriodId?: string;
  includeInactive?: boolean;
}): Promise<void> => {
  const response = await apiClient.get('/accounting/export/income-statement/pdf', {
    params,
    responseType: 'blob',
  });
  downloadBlob(response.data, `laporan-laba-rugi-${params.startDate}-${params.endDate}.pdf`);
};

export const exportBalanceSheetPDF = async (params: {
  endDate: string;
  fiscalPeriodId?: string;
  includeInactive?: boolean;
}): Promise<void> => {
  const response = await apiClient.get('/accounting/export/balance-sheet/pdf', {
    params,
    responseType: 'blob',
  });
  downloadBlob(response.data, `neraca-${params.endDate}.pdf`);
};

export const exportCashFlowStatementPDF = async (params: {
  startDate: string;
  endDate: string;
  fiscalPeriodId?: string;
}): Promise<void> => {
  const response = await apiClient.get('/accounting/export/cash-flow/pdf', {
    params,
    responseType: 'blob',
  });
  downloadBlob(response.data, `laporan-arus-kas-${params.startDate}-${params.endDate}.pdf`);
};

export const exportARAgingPDF = async (params: { asOfDate?: string }): Promise<void> => {
  const response = await apiClient.get('/accounting/export/ar-aging/pdf', {
    params,
    responseType: 'blob',
  });
  downloadBlob(response.data, `aging-piutang-${params.asOfDate || 'current'}.pdf`);
};

export const exportAPAgingPDF = async (params: { asOfDate?: string }): Promise<void> => {
  const response = await apiClient.get('/accounting/export/ap-aging/pdf', {
    params,
    responseType: 'blob',
  });
  downloadBlob(response.data, `aging-hutang-${params.asOfDate || 'current'}.pdf`);
};

export const exportAccountsReceivablePDF = async (params: { endDate: string }): Promise<void> => {
  const response = await apiClient.get('/accounting/export/accounts-receivable/pdf', {
    params,
    responseType: 'blob',
  });
  downloadBlob(response.data, `laporan-piutang-${params.endDate}.pdf`);
};

export const exportAccountsPayablePDF = async (params: { startDate?: string; endDate: string }): Promise<void> => {
  const response = await apiClient.get('/accounting/export/accounts-payable/pdf', {
    params,
    responseType: 'blob',
  });
  downloadBlob(response.data, `laporan-hutang-${params.endDate}.pdf`);
};

export const exportGeneralLedgerPDF = async (params: {
  accountCode?: string;
  accountType?: string;
  startDate?: string;
  endDate?: string;
  fiscalPeriodId?: string;
  includeInactive?: boolean;
}): Promise<void> => {
  const response = await apiClient.get('/accounting/export/general-ledger/pdf', {
    params,
    responseType: 'blob',
  });
  downloadBlob(response.data, `buku-besar-${params.startDate || 'all'}-${params.endDate || 'all'}.pdf`);
};

// ============ EXCEL EXPORT FUNCTIONS (NEW) ============
export const exportTrialBalanceExcel = async (params: {
  asOfDate: string;
  fiscalPeriodId?: string;
  includeInactive?: boolean;
  includeZeroBalances?: boolean;
}): Promise<void> => {
  const response = await apiClient.get('/accounting/export/trial-balance/excel', {
    params,
    responseType: 'blob',
  });
  downloadBlob(response.data, `neraca-saldo-${params.asOfDate}.xlsx`);
};

export const exportIncomeStatementExcel = async (params: {
  startDate: string;
  endDate: string;
  fiscalPeriodId?: string;
}): Promise<void> => {
  const response = await apiClient.get('/accounting/export/income-statement/excel', {
    params,
    responseType: 'blob',
  });
  downloadBlob(response.data, `laporan-laba-rugi-${params.startDate}-${params.endDate}.xlsx`);
};

export const exportBalanceSheetExcel = async (params: {
  endDate: string;
  fiscalPeriodId?: string;
}): Promise<void> => {
  const response = await apiClient.get('/accounting/export/balance-sheet/excel', {
    params,
    responseType: 'blob',
  });
  downloadBlob(response.data, `neraca-${params.endDate}.xlsx`);
};

export const exportCashFlowStatementExcel = async (params: {
  startDate: string;
  endDate: string;
  fiscalPeriodId?: string;
}): Promise<void> => {
  const response = await apiClient.get('/accounting/export/cash-flow/excel', {
    params,
    responseType: 'blob',
  });
  downloadBlob(response.data, `laporan-arus-kas-${params.startDate}-${params.endDate}.xlsx`);
};

export const exportARAgingExcel = async (params: { asOfDate?: string }): Promise<void> => {
  const response = await apiClient.get('/accounting/export/ar-aging/excel', {
    params,
    responseType: 'blob',
  });
  downloadBlob(response.data, `aging-piutang-${params.asOfDate || 'current'}.xlsx`);
};

export const exportAPAgingExcel = async (params: { asOfDate?: string }): Promise<void> => {
  const response = await apiClient.get('/accounting/export/ap-aging/excel', {
    params,
    responseType: 'blob',
  });
  downloadBlob(response.data, `aging-hutang-${params.asOfDate || 'current'}.xlsx`);
};

export const exportAccountsReceivableExcel = async (params: { endDate: string }): Promise<void> => {
  const response = await apiClient.get('/accounting/export/accounts-receivable/excel', {
    params,
    responseType: 'blob',
  });
  downloadBlob(response.data, `laporan-piutang-${params.endDate}.xlsx`);
};

export const exportAccountsPayableExcel = async (params: { startDate?: string; endDate: string }): Promise<void> => {
  const response = await apiClient.get('/accounting/export/accounts-payable/excel', {
    params,
    responseType: 'blob',
  });
  downloadBlob(response.data, `laporan-hutang-${params.endDate}.xlsx`);
};

export const exportGeneralLedgerExcel = async (params: {
  accountCode?: string;
  accountType?: string;
  startDate?: string;
  endDate?: string;
  fiscalPeriodId?: string;
  includeInactive?: boolean;
}): Promise<void> => {
  const response = await apiClient.get('/accounting/export/general-ledger/excel', {
    params,
    responseType: 'blob',
  });
  downloadBlob(response.data, `buku-besar-${params.startDate || 'all'}-${params.endDate || 'all'}.xlsx`);
};

// ============ CASH TRANSACTIONS ============
export interface CashTransaction {
  id: string;
  transactionNumber: string;
  transactionType: 'RECEIPT' | 'DISBURSEMENT';
  category: 'OPERATING' | 'INVESTING' | 'FINANCING';
  transactionDate: string;
  amount: number;
  cashAccountId: string;
  cashAccount: {
    code: string;
    name: string;
    nameId: string;
  };
  offsetAccountId: string;
  offsetAccount: {
    code: string;
    name: string;
    nameId: string;
  };
  description: string;
  descriptionId?: string;
  descriptionEn?: string;
  reference?: string;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CHEQUE' | 'E_WALLET' | 'OTHER';
  checkNumber?: string;
  bankReference?: string;
  projectId?: string;
  clientId?: string;
  journalEntryId?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'POSTED' | 'VOID';
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  notes?: string;
  notesId?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const createCashTransaction = async (data: {
  transactionType: 'RECEIPT' | 'DISBURSEMENT';
  category: 'OPERATING' | 'INVESTING' | 'FINANCING';
  transactionDate: string;
  amount: number;
  cashAccountId: string;
  offsetAccountId: string;
  description: string;
  descriptionId?: string;
  descriptionEn?: string;
  reference?: string;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CHEQUE' | 'E_WALLET' | 'OTHER';
  checkNumber?: string;
  bankReference?: string;
  projectId?: string;
  clientId?: string;
  status?: 'DRAFT' | 'SUBMITTED';
  notes?: string;
  notesId?: string;
}): Promise<CashTransaction> => {
  const response = await apiClient.post('/accounting/cash-transactions', data);
  return response.data.data;
};

export const getCashTransactions = async (params?: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  transactionType?: 'RECEIPT' | 'DISBURSEMENT';
  category?: 'OPERATING' | 'INVESTING' | 'FINANCING';
  status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'POSTED' | 'VOID';
  cashAccountId?: string;
  offsetAccountId?: string;
  projectId?: string;
  clientId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  data: CashTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  const response = await apiClient.get('/accounting/cash-transactions', { params });
  return response.data.data;
};

export const getCashTransaction = async (id: string): Promise<CashTransaction> => {
  const response = await apiClient.get(`/accounting/cash-transactions/${id}`);
  return response.data.data;
};

export const updateCashTransaction = async (
  id: string,
  data: Partial<CashTransaction>
): Promise<CashTransaction> => {
  const response = await apiClient.patch(`/accounting/cash-transactions/${id}`, data);
  return response.data.data;
};

export const submitCashTransaction = async (id: string): Promise<CashTransaction> => {
  const response = await apiClient.post(`/accounting/cash-transactions/${id}/submit`);
  return response.data.data;
};

export const approveCashTransaction = async (id: string): Promise<CashTransaction> => {
  const response = await apiClient.post(`/accounting/cash-transactions/${id}/approve`);
  return response.data.data;
};

export const rejectCashTransaction = async (
  id: string,
  reason: string
): Promise<CashTransaction> => {
  const response = await apiClient.post(`/accounting/cash-transactions/${id}/reject`, { reason });
  return response.data.data;
};

export const voidCashTransaction = async (id: string): Promise<CashTransaction> => {
  const response = await apiClient.post(`/accounting/cash-transactions/${id}/void`);
  return response.data.data;
};

export const deleteCashTransaction = async (id: string): Promise<void> => {
  await apiClient.delete(`/accounting/cash-transactions/${id}`);
};

// ============ BANK TRANSFERS ============
export interface BankTransfer {
  id: string;
  transferNumber: string;
  transferDate: string;
  amount: number;
  fromAccountId: string;
  fromAccount: {
    code: string;
    name: string;
    nameId: string;
  };
  toAccountId: string;
  toAccount: {
    code: string;
    name: string;
    nameId: string;
  };
  description: string;
  descriptionId?: string;
  descriptionEn?: string;
  reference?: string;
  transferFee?: number;
  feeAccountId?: string;
  feePaymentMethod?: 'FROM_SOURCE' | 'SEPARATE';
  transferMethod: 'INTERNAL' | 'INTERBANK' | 'RTGS' | 'CLEARING' | 'SKN' | 'BIFAST' | 'OTHER';
  bankReference?: string;
  confirmationCode?: string;
  projectId?: string;
  clientId?: string;
  status: 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'REJECTED' | 'CANCELLED';
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  completedAt?: string;
  completedBy?: string;
  journalEntryId?: string;
  notes?: string;
  notesId?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const createBankTransfer = async (data: {
  transferDate: string;
  amount: number;
  fromAccountId: string;
  toAccountId: string;
  description: string;
  descriptionId?: string;
  descriptionEn?: string;
  reference?: string;
  transferFee?: number;
  feeAccountId?: string;
  feePaymentMethod?: 'FROM_SOURCE' | 'SEPARATE';
  transferMethod?: 'INTERNAL' | 'INTERBANK' | 'RTGS' | 'CLEARING' | 'SKN' | 'BIFAST' | 'OTHER';
  bankReference?: string;
  confirmationCode?: string;
  projectId?: string;
  clientId?: string;
  status?: 'PENDING';
  notes?: string;
  notesId?: string;
}): Promise<BankTransfer> => {
  const response = await apiClient.post('/accounting/bank-transfers', data);
  return response.data.data;
};

export const getBankTransfers = async (params?: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  status?: 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'REJECTED' | 'CANCELLED';
  transferMethod?: 'INTERNAL' | 'INTERBANK' | 'RTGS' | 'CLEARING' | 'SKN' | 'BIFAST' | 'OTHER';
  fromAccountId?: string;
  toAccountId?: string;
  projectId?: string;
  clientId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  data: BankTransfer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  const response = await apiClient.get('/accounting/bank-transfers', { params });
  return response.data.data;
};

export const getBankTransfer = async (id: string): Promise<BankTransfer> => {
  const response = await apiClient.get(`/accounting/bank-transfers/${id}`);
  return response.data.data;
};

export const updateBankTransfer = async (
  id: string,
  data: Partial<BankTransfer>
): Promise<BankTransfer> => {
  const response = await apiClient.patch(`/accounting/bank-transfers/${id}`, data);
  return response.data.data;
};

export const approveBankTransfer = async (id: string): Promise<BankTransfer> => {
  const response = await apiClient.post(`/accounting/bank-transfers/${id}/approve`);
  return response.data.data;
};

export const rejectBankTransfer = async (
  id: string,
  reason: string
): Promise<BankTransfer> => {
  const response = await apiClient.post(`/accounting/bank-transfers/${id}/reject`, { reason });
  return response.data.data;
};

export const cancelBankTransfer = async (id: string): Promise<BankTransfer> => {
  const response = await apiClient.post(`/accounting/bank-transfers/${id}/cancel`);
  return response.data.data;
};

export const deleteBankTransfer = async (id: string): Promise<void> => {
  await apiClient.delete(`/accounting/bank-transfers/${id}`);
};

// ============ BANK RECONCILIATIONS ============
export interface BankReconciliationItem {
  id: string;
  reconciliationId: string;
  itemDate: string;
  itemType: 'DEPOSIT_IN_TRANSIT' | 'OUTSTANDING_CHECK' | 'BANK_CHARGE' | 'BANK_INTEREST' | 'NSF_CHECK' | 'AUTOMATIC_PAYMENT' | 'DIRECT_DEPOSIT' | 'BANK_ERROR' | 'BOOK_ERROR' | 'OTHER_ADJUSTMENT';
  description: string;
  descriptionId?: string;
  amount: number;
  isMatched: boolean;
  status: 'PENDING' | 'MATCHED' | 'ADJUSTED' | 'CLEARED' | 'UNRESOLVED';
  matchedTransactionId?: string;
  reference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankReconciliation {
  id: string;
  reconciliationNumber: string;
  bankAccountId: string;
  bankAccount: {
    code: string;
    name: string;
    nameId: string;
  };
  statementDate: string;
  periodStartDate: string;
  periodEndDate: string;
  statementReference?: string;
  bookBalanceStart: number;
  bookBalanceEnd: number;
  statementBalance: number;
  depositsInTransit: number;
  outstandingChecks: number;
  bankCharges: number;
  bankInterest: number;
  otherAdjustments: number;
  adjustedBookBalance: number;
  adjustedBankBalance: number;
  difference: number;
  isBalanced: boolean;
  status: 'DRAFT' | 'IN_PROGRESS' | 'REVIEWED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  reconciliationItems: BankReconciliationItem[];
  notes?: string;
  notesId?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const createBankReconciliation = async (data: {
  bankAccountId: string;
  statementDate: string;
  periodStartDate: string;
  periodEndDate: string;
  statementReference?: string;
  bookBalanceStart: number;
  bookBalanceEnd: number;
  statementBalance: number;
  depositsInTransit?: number;
  outstandingChecks?: number;
  bankCharges?: number;
  bankInterest?: number;
  otherAdjustments?: number;
  adjustedBookBalance: number;
  adjustedBankBalance: number;
  reconciliationItems?: Array<{
    itemDate: string;
    itemType: 'DEPOSIT_IN_TRANSIT' | 'OUTSTANDING_CHECK' | 'BANK_CHARGE' | 'BANK_INTEREST' | 'NSF_CHECK' | 'AUTOMATIC_PAYMENT' | 'DIRECT_DEPOSIT' | 'BANK_ERROR' | 'BOOK_ERROR' | 'OTHER_ADJUSTMENT';
    description: string;
    descriptionId?: string;
    amount: number;
    isMatched?: boolean;
    matchedTransactionId?: string;
    reference?: string;
    notes?: string;
  }>;
  notes?: string;
  notesId?: string;
}): Promise<BankReconciliation> => {
  const response = await apiClient.post('/accounting/bank-reconciliations', data);
  return response.data.data;
};

export const getBankReconciliations = async (params?: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  status?: 'DRAFT' | 'IN_PROGRESS' | 'REVIEWED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  bankAccountId?: string;
  isBalanced?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  data: BankReconciliation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  const response = await apiClient.get('/accounting/bank-reconciliations', { params });
  return response.data.data;
};

export const getBankReconciliation = async (id: string): Promise<BankReconciliation> => {
  const response = await apiClient.get(`/accounting/bank-reconciliations/${id}`);
  return response.data.data;
};

export const updateBankReconciliation = async (
  id: string,
  data: Partial<BankReconciliation>
): Promise<BankReconciliation> => {
  const response = await apiClient.patch(`/accounting/bank-reconciliations/${id}`, data);
  return response.data.data;
};

export const addBankReconciliationItem = async (
  reconciliationId: string,
  item: {
    itemDate: string;
    itemType: string;
    description: string;
    descriptionId?: string;
    amount: number;
    isMatched?: boolean;
    matchedTransactionId?: string;
    reference?: string;
    notes?: string;
  }
): Promise<BankReconciliation> => {
  const response = await apiClient.post(`/accounting/bank-reconciliations/${reconciliationId}/items`, item);
  return response.data.data;
};

export const matchBankReconciliationItem = async (
  itemId: string,
  transactionId: string
): Promise<BankReconciliation> => {
  const response = await apiClient.post(`/accounting/bank-reconciliations/items/${itemId}/match`, {
    transactionId,
  });
  return response.data.data;
};

export const reviewBankReconciliation = async (id: string): Promise<BankReconciliation> => {
  const response = await apiClient.post(`/accounting/bank-reconciliations/${id}/review`);
  return response.data.data;
};

export const approveBankReconciliation = async (id: string): Promise<BankReconciliation> => {
  const response = await apiClient.post(`/accounting/bank-reconciliations/${id}/approve`);
  return response.data.data;
};

export const rejectBankReconciliation = async (
  id: string,
  reason: string
): Promise<BankReconciliation> => {
  const response = await apiClient.post(`/accounting/bank-reconciliations/${id}/reject`, { reason });
  return response.data.data;
};

export const deleteBankReconciliation = async (id: string): Promise<void> => {
  await apiClient.delete(`/accounting/bank-reconciliations/${id}`);
};
