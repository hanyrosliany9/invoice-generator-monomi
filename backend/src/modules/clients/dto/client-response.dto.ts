export class ClientResponseDto {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  company?: string;
  contactPerson?: string;
  paymentTerms?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;

  // Financial statistics
  totalPaid?: string;
  totalPending?: string;
  totalRevenue?: string;

  // Relations - summary counts only
  _count?: {
    quotations: number;
    invoices: number;
    projects: number;
  };

  // Recent activity summary
  recentActivity?: {
    lastQuotation?: string;
    lastInvoice?: string;
    lastProject?: string;
  };
}
