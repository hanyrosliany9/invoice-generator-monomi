// Mobile Table Adapters - Indonesian Business Management System
// Adapters to convert entity types to BusinessEntity for MobileTableView

import { BusinessEntity } from '../components/tables/SmartTable'
import { Invoice } from '../services/invoices'
import { Quotation } from '../services/quotations'
import { Project } from '../services/projects'
import { Client } from '../services/clients'
import { Expense, ExpenseCategory as ExpenseCategoryType } from '../types/expense'
import { Vendor } from '../types/vendor'
import { User } from '../types/user'
import { Asset } from '../services/assets'
import { JournalEntry as ServiceJournalEntry } from '../services/accounting'
import { ContentCalendarItem } from '../services/content-calendar'
import { now } from '../utils/date'

/**
 * Convert Invoice to BusinessEntity for MobileTableView
 */
export function invoiceToBusinessEntity(invoice: Invoice): BusinessEntity {
  return {
    id: invoice.id,
    number: invoice.invoiceNumber || invoice.number || '',
    title: invoice.project?.description || `Invoice for ${invoice.client?.name || invoice.clientName || 'Client'}`,
    amount: typeof invoice.totalAmount === 'string'
      ? parseFloat(invoice.totalAmount)
      : invoice.totalAmount,
    status: mapInvoiceStatus(invoice.status),
    client: {
      name: invoice.client?.name || invoice.clientName || 'Unknown Client',
      company: invoice.client?.company || '',
      phone: invoice.client?.phone || '',
      email: invoice.client?.email || '',
    },
    createdAt: new Date(invoice.createdAt),
    updatedAt: new Date(invoice.updatedAt),
    dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
    materaiRequired: invoice.materaiRequired,
    materaiAmount: invoice.materaiRequired ? 10000 : undefined, // Standard materai
    ppnRate: 11, // Standard PPN rate in Indonesia
    priority: calculateInvoicePriority(invoice),
  }
}

/**
 * Convert Quotation to BusinessEntity for MobileTableView
 */
export function quotationToBusinessEntity(quotation: Quotation): BusinessEntity {
  return {
    id: quotation.id,
    number: quotation.quotationNumber,
    title: quotation.project?.description || `Quotation for ${quotation.client?.name || 'Client'}`,
    amount: typeof quotation.totalAmount === 'string'
      ? parseFloat(quotation.totalAmount)
      : quotation.totalAmount,
    status: mapQuotationStatus(quotation.status),
    client: {
      name: quotation.client?.name || 'Unknown Client',
      company: quotation.client?.company || '',
      phone: quotation.client?.phone || '',
      email: quotation.client?.email || '',
    },
    createdAt: new Date(quotation.createdAt),
    updatedAt: new Date(quotation.updatedAt),
    dueDate: quotation.validUntil ? new Date(quotation.validUntil) : undefined,
    materaiRequired: quotation.totalAmount >= 5000000,
    materaiAmount: quotation.totalAmount >= 5000000 ? 10000 : undefined,
    ppnRate: 11,
    priority: calculateQuotationPriority(quotation),
  }
}

/**
 * Convert Project to BusinessEntity for MobileTableView
 */
export function projectToBusinessEntity(project: Project): BusinessEntity {
  const basePrice = typeof project.basePrice === 'string'
    ? parseFloat(project.basePrice)
    : (project.basePrice || 0)

  const estimatedBudget = typeof project.estimatedBudget === 'string'
    ? parseFloat(project.estimatedBudget)
    : (project.estimatedBudget || 0)

  return {
    id: project.id,
    number: project.number,
    title: project.description || `Project ${project.number}`,
    amount: basePrice || estimatedBudget,
    status: mapProjectStatus(project.status),
    client: {
      name: project.client?.name || 'Unknown Client',
      company: project.client?.company || '',
      phone: project.client?.phone || '',
      email: project.client?.email || '',
    },
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt),
    dueDate: project.endDate ? new Date(project.endDate) : undefined,
    materaiRequired: false, // Projects don't have materai
    priority: mapProjectPriority(project.status),
  }
}

/**
 * Convert Client to BusinessEntity for MobileTableView (for client list mobile view)
 */
export function clientToBusinessEntity(client: Client): BusinessEntity {
  return {
    id: client.id,
    number: client.id.slice(-8).toUpperCase(), // Generate display number from ID
    title: client.company || client.name,
    amount: client.totalRevenue || 0, // Use total revenue as amount
    status: 'draft' as const, // Default status for clients
    client: {
      name: client.name,
      company: client.company || '',
      phone: client.phone || '',
      email: client.email || '',
    },
    createdAt: new Date(client.createdAt),
    updatedAt: new Date(client.updatedAt),
    materaiRequired: false,
    priority: calculateClientPriority(client),
  }
}

// Helper functions

/**
 * Calculate priority for invoices based on status and due date
 */
function calculateInvoicePriority(invoice: Invoice): 'low' | 'medium' | 'high' {
  if (invoice.status === 'OVERDUE') return 'high'
  if (invoice.businessStatus?.isOverdue) return 'high'
  if (invoice.businessStatus?.daysToDue && invoice.businessStatus.daysToDue < 7) return 'high'
  if (invoice.status === 'SENT') return 'medium'
  return 'low'
}

/**
 * Calculate priority for quotations based on status
 */
function calculateQuotationPriority(quotation: Quotation): 'low' | 'medium' | 'high' {
  if (quotation.status === 'SENT') return 'high' // Awaiting client response
  if (quotation.status === 'DECLINED') return 'low'
  if (quotation.status === 'APPROVED') return 'medium' // Ready to invoice
  return 'medium'
}

/**
 * Calculate priority for clients based on activity
 */
function calculateClientPriority(client: Client): 'low' | 'medium' | 'high' {
  if (client.overdueInvoices && client.overdueInvoices > 0) return 'high'
  if (client.pendingInvoices && client.pendingInvoices > 0) return 'medium'
  if (client.activeProjects && client.activeProjects > 0) return 'medium'
  return 'low'
}

/**
 * Map invoice status to BusinessEntity status
 */
function mapInvoiceStatus(status: Invoice['status']): BusinessEntity['status'] {
  const statusMap: Record<Invoice['status'], BusinessEntity['status']> = {
    DRAFT: 'draft',
    SENT: 'sent',
    PAID: 'paid',
    OVERDUE: 'overdue',
    CANCELLED: 'declined',
  }
  return statusMap[status] || 'draft'
}

/**
 * Map quotation status to BusinessEntity status
 */
function mapQuotationStatus(status: Quotation['status']): BusinessEntity['status'] {
  const statusMap: Record<Quotation['status'], BusinessEntity['status']> = {
    DRAFT: 'draft',
    SENT: 'sent',
    APPROVED: 'approved',
    DECLINED: 'declined',
    REVISED: 'draft', // Treat revised as draft
  }
  return statusMap[status] || 'draft'
}

/**
 * Map project status to BusinessEntity status
 */
function mapProjectStatus(status: Project['status']): BusinessEntity['status'] {
  const statusMap: Record<Project['status'], BusinessEntity['status']> = {
    PLANNING: 'draft',
    IN_PROGRESS: 'sent',
    COMPLETED: 'paid',
    CANCELLED: 'declined',
    ON_HOLD: 'draft',
  }
  return statusMap[status] || 'draft'
}

/**
 * Map project status to priority level
 */
function mapProjectPriority(status: Project['status']): 'low' | 'medium' | 'high' {
  if (status === 'IN_PROGRESS') return 'high'
  if (status === 'PLANNING') return 'medium'
  return 'low'
}

/**
 * Convert Expense to BusinessEntity for MobileTableView
 */
export function expenseToBusinessEntity(expense: Expense): BusinessEntity {
  if (!expense || !expense.id) {
    throw new Error('Invalid expense data')
  }

  const amount = typeof expense.totalAmount === 'string'
    ? parseFloat(expense.totalAmount)
    : (expense.totalAmount ? Number(expense.totalAmount) : 0)

  return {
    id: expense.id,
    number: expense.expenseNumber || '',
    title: expense.description || expense.category?.nameId || 'Expense',
    amount: amount,
    status: mapExpenseStatus(expense.status),
    client: {
      name: expense.vendorName || 'Unknown Vendor',
      company: expense.vendorName || '',
      phone: '',
      email: '',
    },
    createdAt: new Date(expense.createdAt),
    updatedAt: new Date(expense.updatedAt),
    dueDate: expense.expenseDate ? new Date(expense.expenseDate) : undefined,
    materaiRequired: false, // Expenses don't require materai
    priority: calculateExpensePriority(expense),
  }
}

/**
 * Convert Vendor to BusinessEntity for MobileTableView
 */
export function vendorToBusinessEntity(vendor: Vendor): BusinessEntity {
  if (!vendor || !vendor.id) {
    throw new Error('Invalid vendor data')
  }

  const creditLimit = typeof vendor.creditLimit === 'string'
    ? parseFloat(vendor.creditLimit)
    : (vendor.creditLimit ? Number(vendor.creditLimit) : 0)

  return {
    id: vendor.id,
    number: vendor.vendorCode || '',
    title: vendor.name || 'Unknown Vendor',
    amount: creditLimit, // Use credit limit as amount
    status: vendor.isActive ? 'approved' : 'declined' as const,
    client: {
      name: vendor.name || '',
      company: vendor.name || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
    },
    createdAt: new Date(vendor.createdAt),
    updatedAt: new Date(vendor.updatedAt),
    materaiRequired: false,
    priority: vendor.pkpStatus === 'PKP' ? 'high' : 'medium', // PKP vendors are higher priority
  }
}

/**
 * Convert User to BusinessEntity for MobileTableView
 */
export function userToBusinessEntity(user: User): BusinessEntity {
  if (!user || !user.id) {
    throw new Error('Invalid user data')
  }

  return {
    id: user.id,
    number: user.id.slice(-8).toUpperCase(), // Generate display number
    title: user.name || 'Unknown User',
    amount: 0, // Users don't have amounts
    status: user.isActive ? 'approved' : 'declined' as const,
    client: {
      name: user.name || '',
      company: user.role || '',
      phone: '',
      email: user.email || '',
    },
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
    materaiRequired: false,
    priority: mapUserPriority(user.role),
  }
}

/**
 * Convert Asset to BusinessEntity for MobileTableView
 */
export function assetToBusinessEntity(asset: Asset): BusinessEntity {
  if (!asset || !asset.id) {
    throw new Error('Invalid asset data')
  }

  const purchasePrice = typeof asset.purchasePrice === 'string'
    ? parseFloat(asset.purchasePrice)
    : (asset.purchasePrice ? Number(asset.purchasePrice) : 0)

  return {
    id: asset.id,
    number: asset.assetCode || '',
    title: asset.name || 'Unknown Asset',
    amount: purchasePrice,
    status: mapAssetStatus(asset.status),
    client: {
      name: asset.supplier || 'Unknown Supplier',
      company: asset.category || '',
      phone: '',
      email: '',
    },
    createdAt: new Date(asset.createdAt),
    updatedAt: new Date(asset.updatedAt),
    materaiRequired: false,
    priority: mapAssetPriority(asset.condition),
  }
}

// Additional Helper Functions

/**
 * Calculate priority for expenses based on status and approval
 */
function calculateExpensePriority(expense: Expense): 'low' | 'medium' | 'high' {
  if (expense.status === 'SUBMITTED') return 'high' // Needs approval
  if (expense.status === 'APPROVED' && expense.paymentStatus === 'UNPAID') return 'high'
  if (expense.paymentStatus === 'PARTIALLY_PAID') return 'medium'
  return 'low'
}

/**
 * Map expense status to BusinessEntity status
 */
function mapExpenseStatus(status: Expense['status']): BusinessEntity['status'] {
  const statusMap: Record<Expense['status'], BusinessEntity['status']> = {
    DRAFT: 'draft',
    SUBMITTED: 'sent',
    APPROVED: 'approved',
    REJECTED: 'declined',
    CANCELLED: 'declined',
  }
  return statusMap[status] || 'draft'
}

/**
 * Map user role to priority level
 */
function mapUserPriority(role: User['role']): 'low' | 'medium' | 'high' {
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return 'high'
  if (role === 'FINANCE_MANAGER' || role === 'ACCOUNTANT') return 'high'
  if (role === 'PROJECT_MANAGER') return 'medium'
  return 'low'
}

/**
 * Map asset status to BusinessEntity status
 */
function mapAssetStatus(status: Asset['status']): BusinessEntity['status'] {
  const statusMap: Record<Asset['status'], BusinessEntity['status']> = {
    AVAILABLE: 'approved',
    RESERVED: 'sent',
    CHECKED_OUT: 'sent',
    IN_MAINTENANCE: 'draft',
    BROKEN: 'declined',
    RETIRED: 'declined',
  }
  return statusMap[status] || 'draft'
}

/**
 * Map asset condition to priority level
 */
function mapAssetPriority(condition: Asset['condition']): 'low' | 'medium' | 'high' {
  if (condition === 'BROKEN' || condition === 'POOR') return 'high'
  if (condition === 'FAIR') return 'medium'
  return 'low'
}

// ============================
// ACCOUNTING & EXPENSE CATEGORY ADAPTERS
// ============================

/**
 * Chart of Account Interface
 */
interface ChartOfAccount {
  id: string
  code: string
  name: string
  nameId: string
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
  accountSubType: string
  normalBalance: 'DEBIT' | 'CREDIT'
  isActive: boolean
  isControlAccount: boolean
  isTaxAccount: boolean
  currentBalance?: number
  createdAt: string
  updatedAt: string
}


/**
 * Convert ExpenseCategory to BusinessEntity for MobileTableView
 */
export function expenseCategoryToBusinessEntity(category: ExpenseCategoryType): BusinessEntity {
  if (!category || !category.id) {
    throw new Error('Invalid expense category data')
  }

  return {
    id: category.id,
    number: category.code || '',
    title: category.nameId || category.name,
    amount: 0, // Categories don't have amounts
    status: category.isActive ? 'approved' : 'declined' as const,
    client: {
      name: category.name || '',
      company: category.expenseClass || '',
      phone: category.withholdingTaxType || '',
      email: category.accountCode || '',
    },
    createdAt: new Date(category.createdAt),
    updatedAt: new Date(category.updatedAt),
    materaiRequired: false,
    priority: category.isBillable ? 'high' : 'medium',
  }
}

/**
 * Convert ChartOfAccount to BusinessEntity for MobileTableView
 */
export function chartOfAccountToBusinessEntity(account: ChartOfAccount): BusinessEntity {
  if (!account || !account.id) {
    throw new Error('Invalid chart of account data')
  }

  return {
    id: account.id,
    number: account.code || '',
    title: account.nameId || account.name,
    amount: account.currentBalance || 0,
    status: account.isActive ? 'approved' : 'declined' as const,
    client: {
      name: account.name || '',
      company: account.accountType || '',
      phone: account.accountSubType || '',
      email: account.normalBalance || '',
    },
    createdAt: new Date(account.createdAt),
    updatedAt: new Date(account.updatedAt),
    materaiRequired: false,
    priority: account.isControlAccount || account.isTaxAccount ? 'high' : 'medium',
  }
}

/**
 * Convert JournalEntry to BusinessEntity for MobileTableView
 */
export function journalEntryToBusinessEntity(entry: ServiceJournalEntry): BusinessEntity {
  if (!entry || !entry.id) {
    throw new Error('Invalid journal entry data')
  }

  return {
    id: entry.id,
    number: entry.entryNumber || '',
    title: entry.descriptionId || entry.description,
    amount: 0, // Journal entries don't have a single total amount
    status: mapJournalEntryStatus(entry.status),
    client: {
      name: entry.transactionType || '',
      company: entry.isPosted ? 'Posted' : 'Draft',
      phone: '',
      email: '',
    },
    createdAt: new Date(entry.createdAt || new Date()),
    updatedAt: new Date(entry.updatedAt || new Date()),
    dueDate: entry.entryDate ? new Date(entry.entryDate) : undefined,
    materaiRequired: false,
    priority: mapJournalEntryPriority(entry),
  }
}

/**
 * Map journal entry status to BusinessEntity status
 */
function mapJournalEntryStatus(status: ServiceJournalEntry['status']): BusinessEntity['status'] {
  const statusMap: Record<ServiceJournalEntry['status'], BusinessEntity['status']> = {
    DRAFT: 'draft',
    POSTED: 'approved',
  }
  return statusMap[status] || 'draft'
}

/**
 * Map journal entry to priority level
 */
function mapJournalEntryPriority(entry: ServiceJournalEntry): 'low' | 'medium' | 'high' {
  if (entry.status === 'DRAFT') return 'medium'
  if (entry.isPosted) return 'low'
  return 'medium'
}

// ============================
// ADDITIONAL ACCOUNTING ADAPTERS
// ============================

/**
 * General Ledger Entry Interface
 */
interface GeneralLedgerEntry {
  id: string
  accountCode: string
  accountName: string
  entryDate: string
  description: string
  debitAmount: number
  creditAmount: number
  balance: number
  referenceType?: string
  referenceNumber?: string
  createdAt: string
  updatedAt: string
}

/**
 * Accounts Receivable Entry Interface
 */
interface AccountsReceivableEntry {
  id: string
  invoiceNumber: string
  clientName: string
  invoiceDate: string
  dueDate: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  status: string
  daysPastDue?: number
  createdAt: string
  updatedAt: string
}

/**
 * Accounts Payable Entry Interface
 */
interface AccountsPayableEntry {
  id: string
  referenceNumber: string
  vendorName: string
  billDate: string
  dueDate: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  status: string
  daysPastDue?: number
  createdAt: string
  updatedAt: string
}

/**
 * Bank Reconciliation Interface
 */
interface BankReconciliation {
  id: string
  reconciliationNumber: string
  bankAccountName: string
  statementDate: string
  statementBalance: number
  bookBalance: number
  status: string
  isReconciled: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Cash Receipt Interface
 */
interface CashReceipt {
  id: string
  receiptNumber: string
  receiptDate: string
  clientName: string
  amount: number
  paymentMethod: string
  status: string
  description?: string
  createdAt: string
  updatedAt: string
}

/**
 * Cash Disbursement Interface
 */
interface CashDisbursement {
  id: string
  disbursementNumber: string
  disbursementDate: string
  payeeName: string
  amount: number
  paymentMethod: string
  status: string
  description?: string
  createdAt: string
  updatedAt: string
}

/**
 * Bank Transfer Interface
 */
interface BankTransfer {
  id: string
  transferNumber: string
  transferDate: string
  fromAccount: string
  toAccount: string
  amount: number
  status: string
  description?: string
  createdAt: string
  updatedAt: string
}

/**
 * Convert GeneralLedgerEntry to BusinessEntity
 */
export function generalLedgerEntryToBusinessEntity(entry: GeneralLedgerEntry): BusinessEntity {
  if (!entry || !entry.id) {
    throw new Error('Invalid general ledger entry data')
  }

  return {
    id: entry.id,
    number: entry.accountCode || '',
    title: entry.accountName || entry.description || '',
    amount: Math.abs(entry.debitAmount || entry.creditAmount || 0),
    status: entry.balance >= 0 ? 'approved' : 'declined' as const,
    client: {
      name: entry.referenceNumber || '',
      company: entry.referenceType || '',
      phone: '',
      email: '',
    },
    createdAt: new Date(entry.createdAt),
    updatedAt: new Date(entry.updatedAt),
    dueDate: entry.entryDate ? new Date(entry.entryDate) : undefined,
    materaiRequired: false,
    priority: 'medium',
  }
}

/**
 * Convert AccountsReceivableEntry to BusinessEntity
 */
export function accountsReceivableToBusinessEntity(entry: AccountsReceivableEntry): BusinessEntity {
  if (!entry || !entry.id) {
    throw new Error('Invalid accounts receivable entry data')
  }

  return {
    id: entry.id,
    number: entry.invoiceNumber || '',
    title: `AR - ${entry.clientName}`,
    amount: entry.remainingAmount || entry.totalAmount,
    status: mapARStatus(entry.status),
    client: {
      name: entry.clientName || '',
      company: '',
      phone: '',
      email: '',
    },
    createdAt: new Date(entry.createdAt),
    updatedAt: new Date(entry.updatedAt),
    dueDate: entry.dueDate ? new Date(entry.dueDate) : undefined,
    materaiRequired: entry.totalAmount >= 5000000,
    priority: entry.daysPastDue && entry.daysPastDue > 0 ? 'high' : 'medium',
  }
}

/**
 * Convert AccountsPayableEntry to BusinessEntity
 */
export function accountsPayableToBusinessEntity(entry: AccountsPayableEntry): BusinessEntity {
  if (!entry || !entry.id) {
    throw new Error('Invalid accounts payable entry data')
  }

  return {
    id: entry.id,
    number: entry.referenceNumber || '',
    title: `AP - ${entry.vendorName}`,
    amount: entry.remainingAmount || entry.totalAmount,
    status: mapAPStatus(entry.status),
    client: {
      name: entry.vendorName || '',
      company: '',
      phone: '',
      email: '',
    },
    createdAt: new Date(entry.createdAt),
    updatedAt: new Date(entry.updatedAt),
    dueDate: entry.dueDate ? new Date(entry.dueDate) : undefined,
    materaiRequired: false,
    priority: entry.daysPastDue && entry.daysPastDue > 0 ? 'high' : 'medium',
  }
}

/**
 * Convert BankReconciliation to BusinessEntity
 */
export function bankReconciliationToBusinessEntity(reconciliation: BankReconciliation): BusinessEntity {
  if (!reconciliation || !reconciliation.id) {
    throw new Error('Invalid bank reconciliation data')
  }

  return {
    id: reconciliation.id,
    number: reconciliation.reconciliationNumber || '',
    title: reconciliation.bankAccountName || '',
    amount: Math.abs(reconciliation.statementBalance - reconciliation.bookBalance),
    status: reconciliation.isReconciled ? 'approved' : 'draft' as const,
    client: {
      name: reconciliation.bankAccountName || '',
      company: reconciliation.status || '',
      phone: '',
      email: '',
    },
    createdAt: new Date(reconciliation.createdAt),
    updatedAt: new Date(reconciliation.updatedAt),
    dueDate: reconciliation.statementDate ? new Date(reconciliation.statementDate) : undefined,
    materaiRequired: false,
    priority: reconciliation.isReconciled ? 'low' : 'high',
  }
}

/**
 * Convert CashReceipt to BusinessEntity
 */
export function cashReceiptToBusinessEntity(receipt: CashReceipt | any): BusinessEntity {
  if (!receipt || !receipt.id) {
    throw new Error('Invalid cash receipt data')
  }

  // Handle CashTransaction type (from accounting service)
  if ('transactionNumber' in receipt && 'transactionType' in receipt) {
    return {
      id: receipt.id,
      number: receipt.transactionNumber || '',
      title: receipt.descriptionId || receipt.description || 'Cash Receipt',
      amount: receipt.amount,
      status: mapCashTransactionStatus(receipt.status),
      client: {
        name: receipt.cashAccount?.nameId || receipt.cashAccount?.name || '',
        company: receipt.category || '',
        phone: '',
        email: '',
      },
      createdAt: new Date(receipt.createdAt),
      updatedAt: new Date(receipt.updatedAt),
      dueDate: receipt.transactionDate ? new Date(receipt.transactionDate) : undefined,
      materaiRequired: false,
      priority: receipt.status === 'SUBMITTED' ? 'high' : 'medium',
    }
  }

  // Handle legacy CashReceipt type
  return {
    id: receipt.id,
    number: receipt.receiptNumber || '',
    title: `${receipt.clientName} - ${receipt.paymentMethod}`,
    amount: receipt.amount,
    status: mapCashStatus(receipt.status),
    client: {
      name: receipt.clientName || '',
      company: receipt.paymentMethod || '',
      phone: '',
      email: '',
    },
    createdAt: new Date(receipt.createdAt),
    updatedAt: new Date(receipt.updatedAt),
    dueDate: receipt.receiptDate ? new Date(receipt.receiptDate) : undefined,
    materaiRequired: false,
    priority: 'medium',
  }
}

/**
 * Convert CashDisbursement to BusinessEntity
 */
export function cashDisbursementToBusinessEntity(disbursement: CashDisbursement | any): BusinessEntity {
  if (!disbursement || !disbursement.id) {
    throw new Error('Invalid cash disbursement data')
  }

  // Handle CashTransaction type (from accounting service)
  if ('transactionNumber' in disbursement && 'transactionType' in disbursement) {
    return {
      id: disbursement.id,
      number: disbursement.transactionNumber || '',
      title: disbursement.descriptionId || disbursement.description || 'Cash Disbursement',
      amount: disbursement.amount,
      status: mapCashTransactionStatus(disbursement.status),
      client: {
        name: disbursement.offsetAccount?.nameId || disbursement.offsetAccount?.name || '',
        company: disbursement.category || '',
        phone: '',
        email: '',
      },
      createdAt: new Date(disbursement.createdAt),
      updatedAt: new Date(disbursement.updatedAt),
      dueDate: disbursement.transactionDate ? new Date(disbursement.transactionDate) : undefined,
      materaiRequired: false,
      priority: disbursement.status === 'SUBMITTED' ? 'high' : 'medium',
    }
  }

  // Handle legacy CashDisbursement type
  return {
    id: disbursement.id,
    number: disbursement.disbursementNumber || '',
    title: `${disbursement.payeeName} - ${disbursement.paymentMethod}`,
    amount: disbursement.amount,
    status: mapCashStatus(disbursement.status),
    client: {
      name: disbursement.payeeName || '',
      company: disbursement.paymentMethod || '',
      phone: '',
      email: '',
    },
    createdAt: new Date(disbursement.createdAt),
    updatedAt: new Date(disbursement.updatedAt),
    dueDate: disbursement.disbursementDate ? new Date(disbursement.disbursementDate) : undefined,
    materaiRequired: false,
    priority: 'medium',
  }
}

/**
 * Convert BankTransfer to BusinessEntity
 */
export function bankTransferToBusinessEntity(transfer: BankTransfer): BusinessEntity {
  if (!transfer || !transfer.id) {
    throw new Error('Invalid bank transfer data')
  }

  return {
    id: transfer.id,
    number: transfer.transferNumber || '',
    title: `${transfer.fromAccount} → ${transfer.toAccount}`,
    amount: transfer.amount,
    status: mapCashStatus(transfer.status),
    client: {
      name: transfer.fromAccount || '',
      company: transfer.toAccount || '',
      phone: '',
      email: '',
    },
    createdAt: new Date(transfer.createdAt),
    updatedAt: new Date(transfer.updatedAt),
    dueDate: transfer.transferDate ? new Date(transfer.transferDate) : undefined,
    materaiRequired: false,
    priority: 'medium',
  }
}

// Helper mapping functions

function mapARStatus(status: string): BusinessEntity['status'] {
  const statusMap: Record<string, BusinessEntity['status']> = {
    PAID: 'paid',
    UNPAID: 'sent',
    PARTIALLY_PAID: 'sent',
    OVERDUE: 'overdue',
    CANCELLED: 'declined',
  }
  return statusMap[status] || 'sent'
}

function mapAPStatus(status: string): BusinessEntity['status'] {
  const statusMap: Record<string, BusinessEntity['status']> = {
    PAID: 'paid',
    UNPAID: 'sent',
    PARTIALLY_PAID: 'sent',
    OVERDUE: 'overdue',
    CANCELLED: 'declined',
  }
  return statusMap[status] || 'sent'
}

function mapCashStatus(status: string): BusinessEntity['status'] {
  const statusMap: Record<string, BusinessEntity['status']> = {
    COMPLETED: 'approved',
    PENDING: 'draft',
    CANCELLED: 'declined',
    POSTED: 'approved',
    DRAFT: 'draft',
  }
  return statusMap[status] || 'draft'
}

/**
 * Map CashTransaction status to BusinessEntity status
 */
function mapCashTransactionStatus(status: string): BusinessEntity['status'] {
  const statusMap: Record<string, BusinessEntity['status']> = {
    DRAFT: 'draft',
    SUBMITTED: 'approved', // Changed to 'approved' to match MobileTableView visible logic
    APPROVED: 'approved',
    REJECTED: 'declined',
    POSTED: 'declined', // Changed to 'declined' to match MobileTableView visible logic for void
    VOID: 'declined',
  }
  return statusMap[status] || 'draft'
}

/**
 * Convert AR Aging Entry to BusinessEntity
 */
export function arAgingToBusinessEntity(entry: any): BusinessEntity {
  if (!entry) {
    throw new Error('Invalid AR aging entry data')
  }

  // Map aging bucket to priority
  const getPriority = (bucket: string): BusinessEntity['priority'] => {
    if (bucket === 'Over 90 days') return 'high'
    if (bucket === '61-90 days') return 'high'
    if (bucket === '31-60 days') return 'medium'
    return 'low'
  }

  // Map aging bucket to status
  const getStatus = (bucket: string, daysOverdue: number): BusinessEntity['status'] => {
    if (daysOverdue > 0) return 'overdue'
    return 'sent'
  }

  return {
    id: entry.invoiceNumber || Math.random().toString(),
    number: entry.invoiceNumber || '',
    title: `AR - ${entry.clientName}`,
    amount: entry.amount,
    status: getStatus(entry.agingBucket, entry.daysOverdue),
    client: {
      name: entry.clientName || '',
      company: entry.agingBucket || '',
      phone: '',
      email: '',
    },
    createdAt: new Date(entry.invoiceDate),
    updatedAt: now(),
    dueDate: entry.dueDate ? new Date(entry.dueDate) : undefined,
    materaiRequired: entry.amount >= 5000000,
    priority: getPriority(entry.agingBucket),
  }
}

/**
 * Convert AP Aging Entry to BusinessEntity
 */
export function apAgingToBusinessEntity(entry: any): BusinessEntity {
  if (!entry) {
    throw new Error('Invalid AP aging entry data')
  }

  // Map aging bucket to priority
  const getPriority = (bucket: string): BusinessEntity['priority'] => {
    if (bucket === 'Over 90 days') return 'high'
    if (bucket === '61-90 days') return 'high'
    if (bucket === '31-60 days') return 'medium'
    return 'low'
  }

  // Map aging bucket to status
  const getStatus = (bucket: string, daysOverdue: number): BusinessEntity['status'] => {
    if (daysOverdue > 0) return 'overdue'
    return 'sent'
  }

  return {
    id: entry.expenseNumber || entry.referenceNumber || Math.random().toString(),
    number: entry.expenseNumber || entry.referenceNumber || '',
    title: `AP - ${entry.vendorName || entry.payeeName}`,
    amount: entry.amount,
    status: getStatus(entry.agingBucket, entry.daysOverdue),
    client: {
      name: entry.vendorName || entry.payeeName || '',
      company: entry.agingBucket || '',
      phone: '',
      email: '',
    },
    createdAt: new Date(entry.expenseDate || entry.createdAt),
    updatedAt: now(),
    dueDate: entry.dueDate ? new Date(entry.dueDate) : undefined,
    materaiRequired: false,
    priority: getPriority(entry.agingBucket),
  }
}

/**
 * Convert Trial Balance Entry to BusinessEntity
 */
export function trialBalanceToBusinessEntity(entry: any): BusinessEntity {
  if (!entry) {
    throw new Error('Invalid trial balance entry data')
  }

  // Determine the amount (use whichever balance is non-zero)
  const amount = entry.debitBalance > 0 ? entry.debitBalance : entry.creditBalance

  // Map account type to status
  const getStatus = (isAbnormal: boolean): BusinessEntity['status'] => {
    return isAbnormal ? 'declined' : 'approved'
  }

  return {
    id: entry.accountCode || Math.random().toString(),
    number: entry.accountCode || '',
    title: entry.accountNameId || entry.accountName,
    amount: amount,
    status: getStatus(entry.isAbnormal),
    client: {
      name: entry.accountType?.replace(/_/g, ' ') || '',
      company: entry.accountSubType?.replace(/_/g, ' ') || '',
      phone: '',
      email: '',
    },
    createdAt: now(),
    updatedAt: now(),
    materaiRequired: false,
    priority: entry.isAbnormal ? 'high' : 'medium',
  }
}

/**
 * Convert Cash/Bank Balance Entry to BusinessEntity
 */
export function cashBankBalanceToBusinessEntity(entry: any): BusinessEntity {
  if (!entry) {
    throw new Error('Invalid cash/bank balance entry data')
  }

  // Determine status based on net change (positive = approved, negative = declined)
  const getStatus = (netChange: number): BusinessEntity['status'] => {
    return netChange >= 0 ? 'approved' : 'declined'
  }

  return {
    id: entry.id || Math.random().toString(),
    number: entry.period || '',
    title: `Saldo Kas & Bank - ${entry.period}`,
    amount: entry.closingBalance,
    status: getStatus(entry.netChange),
    client: {
      name: `Arus Masuk: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(entry.totalInflow)}`,
      company: `Arus Keluar: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(entry.totalOutflow)}`,
      phone: '',
      email: '',
    },
    createdAt: new Date(entry.createdAt || entry.periodDate),
    updatedAt: new Date(entry.createdAt || entry.periodDate),
    materaiRequired: false,
    priority: entry.netChange < 0 ? 'high' : 'medium',
  }
}

/**
 * Convert Balance Sheet Account to BusinessEntity
 */
export function balanceSheetAccountToBusinessEntity(account: any, accountType: 'asset' | 'liability' | 'equity'): BusinessEntity {
  if (!account) {
    throw new Error('Invalid balance sheet account data')
  }

  // Map account type to status for visual distinction
  const getStatus = (type: string): BusinessEntity['status'] => {
    if (type === 'asset') return 'approved' // Green for assets
    if (type === 'liability') return 'declined' // Red for liabilities
    return 'sent' // Blue for equity
  }

  return {
    id: account.accountCode || Math.random().toString(),
    number: account.accountCode || '',
    title: account.accountNameId || account.accountName,
    amount: Math.abs(account.balance || 0),
    status: getStatus(accountType),
    client: {
      name: account.accountName || '',
      company: accountType === 'asset' ? 'Aset' : accountType === 'liability' ? 'Kewajiban' : 'Ekuitas',
      phone: '',
      email: '',
    },
    createdAt: now(),
    updatedAt: now(),
    materaiRequired: false,
    priority: 'medium',
  }
}

/**
 * Convert ContentCalendarItem to BusinessEntity for MobileTableView
 */
export function contentToBusinessEntity(content: ContentCalendarItem): BusinessEntity {
  // Map content status to BusinessEntity status
  const mapContentStatus = (status: string): 'draft' | 'sent' | 'paid' | 'overdue' | 'pending' => {
    switch (status) {
      case 'DRAFT': return 'draft'
      case 'SCHEDULED': return 'pending'
      case 'PUBLISHED': return 'paid'
      case 'FAILED': return 'overdue'
      case 'ARCHIVED': return 'sent'
      default: return 'draft'
    }
  }

  // Get caption preview (first 60 chars)
  const captionPreview = content.caption.length > 60
    ? content.caption.substring(0, 60) + '...'
    : content.caption

  // Count media files
  const mediaCount = content.media?.length || 0
  const hasVideo = content.media?.some(m => m.type === 'VIDEO') || false

  return {
    id: content.id,
    number: content.scheduledAt
      ? new Date(content.scheduledAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
      : 'No date',
    title: captionPreview,
    subtitle: content.platforms.join(', '),
    description: mediaCount + ' file' + (mediaCount !== 1 ? 's' : '') + ' • ' + (content.project?.number || 'No project'),
    status: mapContentStatus(content.status),
    client: {
      name: content.client?.name || 'No client',
      company: content.project?.description || '',
      phone: '',
      email: content.client?.email || '',
    },
    createdAt: new Date(content.createdAt),
    updatedAt: new Date(content.updatedAt),
    dueDate: content.scheduledAt ? new Date(content.scheduledAt) : undefined,
    materaiRequired: false,
    priority: content.status === 'SCHEDULED' ? 'high' : content.status === 'DRAFT' ? 'medium' : 'low',
    metadata: [
      { label: 'Platforms', value: content.platforms.join(', ') },
      { label: 'Media', value: mediaCount + ' ' + (hasVideo ? '(Video)' : '(Image)') },
      { label: 'Status', value: content.status },
    ],
    rawData: content, // Store original data for access in actions
  }
}
