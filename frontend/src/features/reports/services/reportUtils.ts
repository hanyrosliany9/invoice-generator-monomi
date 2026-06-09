import i18n from 'i18next';
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
   * Format period as a localized string.
   *
   * When no explicit locale is passed, follow the user's active UI language
   * (i18next) so month names match the EN/ID toggle — previously this always
   * defaulted to 'id-ID', leaking Indonesian month names ("Juli 2025") into
   * the English UI.
   */
  static formatPeriod(month: number, year: number, locale?: string): string {
    const resolved = locale
      ?? ((i18n.language || '').startsWith('id') ? 'id-ID' : 'en-US');
    return new Date(year, month - 1).toLocaleDateString(resolved, {
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
