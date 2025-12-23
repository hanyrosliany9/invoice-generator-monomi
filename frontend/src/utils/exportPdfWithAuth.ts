import { apiClient } from '../config/api';
import { message } from 'antd';

/**
 * Export PDF with authentication
 * Uses apiClient to include JWT token in the request
 */
export async function exportPdfWithAuth(
  endpoint: string,
  filename: string
): Promise<void> {
  const hideMessage = message.loading('Generating PDF...', 0);

  try {
    const response = await apiClient.get(endpoint, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    hideMessage();
    message.success('PDF exported successfully');
  } catch (error) {
    hideMessage();
    message.error('Failed to export PDF');
    throw error;
  }
}
