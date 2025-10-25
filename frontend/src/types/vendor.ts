/**
 * Vendor Types and Interfaces
 *
 * Complete vendor management system with Indonesian business compliance
 */

export type VendorType =
  | 'SUPPLIER'
  | 'SERVICE_PROVIDER'
  | 'CONTRACTOR'
  | 'CONSULTANT'
  | 'UTILITY'
  | 'GOVERNMENT'
  | 'OTHER';

export type PKPStatus = 'PKP' | 'NON_PKP' | 'GOVERNMENT';

export interface Vendor {
  id: string;
  vendorCode: string; // VEN-YYYY-NNNNN format
  name: string;
  nameId?: string; // Indonesian name
  vendorType: VendorType;
  industryType?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country: string; // default: Indonesia
  npwp?: string; // Tax ID (15 digits)
  pkpStatus: PKPStatus;
  isPKP?: boolean;
  taxAddress?: string; // Separate tax invoice address
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  bankBranch?: string;
  swiftCode?: string;
  paymentTerms: string; // default: NET 30
  creditLimit?: string | number;
  currency: string; // default: IDR
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  // Statistics (when fetched with detail view)
  _count?: {
    purchaseOrders: number;
    goodsReceipts: number;
    vendorInvoices: number;
    accountsPayable: number;
    vendorPayments: number;
    expenses: number;
    assets: number;
  };
}

export interface CreateVendorRequest {
  name: string;
  vendorType: VendorType;
  nameId?: string;
  industryType?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  npwp?: string;
  pkpStatus?: PKPStatus;
  taxAddress?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  bankBranch?: string;
  swiftCode?: string;
  paymentTerms?: string;
  creditLimit?: string | number;
  currency?: string;
  isActive?: boolean;
}

export interface UpdateVendorRequest extends Partial<CreateVendorRequest> {}

export interface VendorQueryParams {
  search?: string;
  vendorType?: VendorType;
  pkpStatus?: PKPStatus;
  city?: string;
  province?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface VendorStatistics {
  totalVendors: number;
  activeVendors: number;
  vendorsByType: Record<VendorType, number>;
  vendorsByPKPStatus: Record<PKPStatus, number>;
  vendorsByCity: Record<string, number>;
  vendorsWithPOs: number;
  vendorsWithInvoices: number;
  vendorsWithExpenses: number;
}

export interface PaginatedVendorResponse {
  data: Vendor[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// UI Helper Enums
export const VENDOR_TYPES: { label: string; value: VendorType }[] = [
  { label: 'Supplier', value: 'SUPPLIER' },
  { label: 'Penyedia Layanan', value: 'SERVICE_PROVIDER' },
  { label: 'Kontraktor', value: 'CONTRACTOR' },
  { label: 'Konsultan', value: 'CONSULTANT' },
  { label: 'Utilitas', value: 'UTILITY' },
  { label: 'Pemerintah', value: 'GOVERNMENT' },
  { label: 'Lainnya', value: 'OTHER' },
];

export const PKP_STATUSES: { label: string; value: PKPStatus }[] = [
  { label: 'PKP (Terdaftar)', value: 'PKP' },
  { label: 'Non-PKP', value: 'NON_PKP' },
  { label: 'Pemerintah', value: 'GOVERNMENT' },
];

export const PAYMENT_TERMS: string[] = [
  'NET 30',
  'NET 60',
  'NET 90',
  'COD',
  'PREPAID',
  'CUSTOM',
];

export const CURRENCIES: string[] = ['IDR', 'USD', 'EUR', 'SGD', 'MYR'];
