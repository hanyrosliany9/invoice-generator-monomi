import type { ReportStatus } from '../types/report.types';

/**
 * Utility functions for report operations
 */
export class ReportUtils {
  /**
   * Get Ant Design color for report status
   */
  static getStatusColor(status: ReportStatus): string {
    switch (status) {
      case 'DRAFT':
        return 'default';
      case 'COMPLETED':
        return 'success';
      case 'SENT':
        return 'processing';
      default:
        return 'default';
    }
  }

  /**
   * Format period as localized string
   */
  static formatPeriod(month: number, year: number, locale: string = 'id-ID'): string {
    return new Date(year, month - 1).toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });
  }

  /**
   * Check if report can be edited
   */
  static canEdit(status: ReportStatus): boolean {
    return status === 'DRAFT' || status === 'COMPLETED';
  }

  /**
   * Check if report can generate PDF
   */
  static canGeneratePDF(sectionsCount: number): boolean {
    return sectionsCount > 0;
  }
}
