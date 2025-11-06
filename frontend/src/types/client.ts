export enum ClientStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  company?: string;
  contactPerson?: string;
  status?: ClientStatus;

  // Computed statistics
  totalPaid?: string | number;
  totalPending?: string | number;
  totalRevenue?: string | number;

  // Relations
  quotations?: Array<{
    id: string;
    quotationNumber: string;
    status: string;
    totalAmount: string | number;
  }>;
  invoices?: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: string | number;
  }>;
  projects?: Array<{
    id: string;
    projectNumber: string;
    name: string;
    status: string;
  }>;

  // Audit fields
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Form values for creating/editing clients
 */
export interface ClientFormValues {
  name: string;
  email?: string;
  phone: string;
  address?: string;
  company?: string;
  contactPerson?: string;
  status?: ClientStatus;
}
