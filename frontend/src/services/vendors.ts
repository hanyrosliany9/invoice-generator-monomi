import { apiClient } from '../config/api';
import type {
  Vendor,
  CreateVendorRequest,
  UpdateVendorRequest,
  VendorQueryParams,
  VendorStatistics,
  PaginatedVendorResponse,
} from '../types/vendor';

/**
 * Vendor Service
 *
 * Comprehensive API client for vendor management with Indonesian business compliance.
 *
 * Features:
 * - Complete CRUD operations
 * - Advanced search and filtering
 * - Pagination and sorting
 * - Vendor statistics and analytics
 * - NPWP validation (15-digit format)
 * - PKP status management
 * - Currency and payment terms support
 */
export const vendorService = {
  /**
   * Get all vendors with filtering and pagination
   *
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated vendor list
   */
  getVendors: async (
    params?: VendorQueryParams
  ): Promise<PaginatedVendorResponse> => {
    const queryString = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryString.append(key, String(value));
        }
      });
    }

    const url = `/vendors${queryString.toString() ? `?${queryString.toString()}` : ''}`;
    const response = await apiClient.get(url);

    return (
      response?.data?.data || {
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      }
    );
  },

  /**
   * Get vendor by ID
   *
   * @param id - Vendor ID
   * @returns Vendor with all relations
   */
  getVendor: async (id: string): Promise<Vendor> => {
    const response = await apiClient.get(`/vendors/${id}`);
    if (!response?.data?.data) {
      throw new Error('Vendor not found');
    }
    return response.data.data;
  },

  /**
   * Create new vendor
   *
   * @param data - Vendor creation data
   * @returns Created vendor
   */
  createVendor: async (data: CreateVendorRequest): Promise<Vendor> => {
    const response = await apiClient.post('/vendors', data);
    if (!response?.data?.data) {
      throw new Error('Vendor creation failed');
    }
    return response.data.data;
  },

  /**
   * Update existing vendor
   *
   * @param id - Vendor ID
   * @param data - Partial vendor update data
   * @returns Updated vendor
   */
  updateVendor: async (
    id: string,
    data: UpdateVendorRequest
  ): Promise<Vendor> => {
    const response = await apiClient.patch(`/vendors/${id}`, data);
    if (!response?.data?.data) {
      throw new Error('Vendor update failed');
    }
    return response.data.data;
  },

  /**
   * Delete vendor
   *
   * @param id - Vendor ID
   */
  deleteVendor: async (id: string): Promise<void> => {
    await apiClient.delete(`/vendors/${id}`);
  },

  /**
   * Get vendor statistics
   *
   * @returns Vendor statistics
   */
  getVendorStatistics: async (): Promise<VendorStatistics> => {
    const response = await apiClient.get('/vendors/statistics');
    return response?.data?.data || {
      totalVendors: 0,
      activeVendors: 0,
      vendorsByType: {},
      vendorsByPKPStatus: {},
      vendorsByCity: {},
      vendorsWithPOs: 0,
      vendorsWithInvoices: 0,
      vendorsWithExpenses: 0,
    };
  },

  /**
   * Validate NPWP format (15 digits)
   *
   * @param npwp - Tax identification number
   * @returns Whether NPWP is valid
   */
  validateNPWP: (npwp: string): boolean => {
    const cleaned = npwp.replace(/\D/g, '');
    return cleaned.length === 15;
  },

  /**
   * Format NPWP for display
   *
   * @param npwp - NPWP string
   * @returns Formatted NPWP
   */
  formatNPWP: (npwp: string): string => {
    const cleaned = npwp.replace(/\D/g, '');
    if (cleaned.length !== 15) return npwp;

    return `${cleaned.substring(0, 2)}.${cleaned.substring(2, 5)}.${cleaned.substring(5, 8)}.${cleaned.substring(8, 9)}-${cleaned.substring(9, 12)}.${cleaned.substring(12, 15)}`;
  },

  /**
   * Get vendor type label
   *
   * @param type - Vendor type
   * @returns Indonesian label
   */
  getVendorTypeLabel: (type: string): string => {
    const labels: Record<string, string> = {
      SUPPLIER: 'Supplier',
      SERVICE_PROVIDER: 'Penyedia Layanan',
      CONTRACTOR: 'Kontraktor',
      CONSULTANT: 'Konsultan',
      UTILITY: 'Utilitas',
      GOVERNMENT: 'Pemerintah',
      OTHER: 'Lainnya',
    };
    return labels[type] || type;
  },

  /**
   * Get PKP status label
   *
   * @param status - PKP status
   * @returns Indonesian label
   */
  getPKPStatusLabel: (status: string): string => {
    const labels: Record<string, string> = {
      PKP: 'PKP (Terdaftar)',
      NON_PKP: 'Non-PKP',
      GOVERNMENT: 'Pemerintah',
    };
    return labels[status] || status;
  },

  /**
   * Get vendor status color for UI
   *
   * @param isActive - Whether vendor is active
   * @returns Tailwind CSS color classes
   */
  getStatusColor: (isActive: boolean): string => {
    return isActive ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  },

  /**
   * Check if vendor can be deleted
   *
   * @param vendor - Vendor object
   * @returns Whether vendor can be deleted
   */
  canDelete: (vendor: Vendor): boolean => {
    // Cannot delete if has related transactions
    const count = vendor._count || {};
    return (
      ((count as any).purchaseOrders || 0) === 0 &&
      ((count as any).vendorInvoices || 0) === 0 &&
      ((count as any).expenses || 0) === 0 &&
      ((count as any).assets || 0) === 0
    );
  },
};
