import { apiClient } from '../config/api';
import {
  SocialMediaReport,
  SendRecipients,
  SendResult,
  UpdateReportDto,
  CreateReportDto,
  AddSectionDto,
  UpdateVisualizationsDto,
  ReportStatus,
  FilePreview,
  ImportedSection,
  ManualSectionDto,
  ReportTemplateInfo,
} from '../types/report';

const API_BASE = '/reports';

export const socialMediaReportsService = {
  // Reports CRUD
  async createReport(data: CreateReportDto): Promise<SocialMediaReport> {
    const response = await apiClient.post(API_BASE, data);
    return response.data.data;
  },

  async getReports(filters?: {
    projectId?: string;
    year?: number;
    month?: number;
    status?: ReportStatus;
  }): Promise<SocialMediaReport[]> {
    const response = await apiClient.get(API_BASE, { params: filters });
    return response.data.data;
  },

  async getReport(id: string): Promise<SocialMediaReport> {
    const response = await apiClient.get(`${API_BASE}/${id}`);
    return response.data.data;
  },

  async deleteReport(id: string): Promise<void> {
    await apiClient.delete(`${API_BASE}/${id}`);
  },

  async updateStatus(id: string, status: ReportStatus): Promise<SocialMediaReport> {
    const response = await apiClient.post(`${API_BASE}/${id}/status`, { status });
    return response.data.data;
  },

  async updateReport(id: string, data: UpdateReportDto): Promise<SocialMediaReport> {
    const response = await apiClient.patch(`${API_BASE}/${id}`, data);
    return response.data.data;
  },

  /** Copy structure (no data) into the next free month as a new DRAFT. */
  async duplicateReport(
    id: string,
    target?: { month: number; year: number },
  ): Promise<SocialMediaReport> {
    const response = await apiClient.post(`${API_BASE}/${id}/duplicate`, target ?? {});
    return response.data.data;
  },

  async getSendRecipients(id: string): Promise<SendRecipients> {
    const response = await apiClient.get(`${API_BASE}/${id}/send-recipients`);
    return response.data.data;
  },

  /** Email the client's active portal contacts and mark the report SENT. */
  async sendToClient(id: string): Promise<SendResult> {
    const response = await apiClient.post(`${API_BASE}/${id}/send`);
    return response.data.data;
  },

  // Sections
  async addSection(
    reportId: string,
    file: File,
    data: AddSectionDto,
  ): Promise<any> {
    const formData = new FormData();
    formData.append('csvFile', file);
    formData.append('title', data.title);
    if (data.description) {
      formData.append('description', data.description);
    }

    const response = await apiClient.post(`${API_BASE}/${reportId}/sections`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  /** Parse a file and show what would be imported, without saving anything. */
  async previewFile(file: File, target?: { reportId: string; sectionId?: string }): Promise<FilePreview> {
    const formData = new FormData();
    // Text fields first: multer has seen them by the time the file stream ends.
    if (target?.reportId) formData.append('reportId', target.reportId);
    if (target?.sectionId) formData.append('sectionId', target.sectionId);
    formData.append('csvFile', file);
    const response = await apiClient.post(`${API_BASE}/parse-preview`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  /** Add a section from the manual grid or the headline-numbers form. */
  async addManualSection(reportId: string, data: ManualSectionDto): Promise<ImportedSection> {
    const response = await apiClient.post(`${API_BASE}/${reportId}/sections/manual`, data);
    return response.data.data;
  },

  /** Replace a section's data from the grid editor (also fixes a wrong cell). */
  async replaceManualData(
    reportId: string,
    sectionId: string,
    data: ManualSectionDto,
  ): Promise<ImportedSection> {
    const response = await apiClient.put(`${API_BASE}/${reportId}/sections/${sectionId}/data`, data);
    return response.data.data;
  },

  /** Rename a section / change its description. */
  async updateSection(
    reportId: string,
    sectionId: string,
    data: { title?: string; description?: string },
  ): Promise<any> {
    const response = await apiClient.patch(`${API_BASE}/${reportId}/sections/${sectionId}`, data);
    return response.data.data;
  },

  async listTemplates(): Promise<ReportTemplateInfo[]> {
    const response = await apiClient.get(`${API_BASE}/templates`);
    return response.data.data;
  },

  /** Download a starter file (headers + example rows) as CSV or XLSX. */
  async downloadTemplate(key: string, format: 'xlsx' | 'csv'): Promise<void> {
    const response = await apiClient.get(`${API_BASE}/templates/${key}`, {
      params: { format },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(response.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `template-${key}.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 15000);
  },

  /** Replace a section's data, keeping its title, description and charts. */
  async replaceSectionData(reportId: string, sectionId: string, file: File): Promise<ImportedSection> {
    const formData = new FormData();
    formData.append('csvFile', file);
    const response = await apiClient.post(
      `${API_BASE}/${reportId}/sections/${sectionId}/data`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.data;
  },

  async removeSection(reportId: string, sectionId: string): Promise<void> {
    await apiClient.delete(`${API_BASE}/${reportId}/sections/${sectionId}`);
  },

  async reorderSections(reportId: string, sectionIds: string[]): Promise<SocialMediaReport> {
    const response = await apiClient.post(`${API_BASE}/${reportId}/sections/reorder`, {
      sectionIds,
    });
    return response.data.data;
  },

  // Visualizations
  async updateVisualizations(
    reportId: string,
    sectionId: string,
    data: UpdateVisualizationsDto,
  ): Promise<any> {
    const response = await apiClient.patch(
      `${API_BASE}/${reportId}/sections/${sectionId}/visualizations`,
      data,
    );
    return response.data.data;
  },

  // Layout (new)
  async updateSectionLayout(
    reportId: string,
    sectionId: string,
    layout: any,
  ): Promise<any> {
    const response = await apiClient.patch(
      `${API_BASE}/${reportId}/sections/${sectionId}/layout`,
      { layout },
    );
    return response.data.data;
  },

  /**
   * PDF download. The PDF is always rendered on demand from the current data
   * (nothing is stored), so this is the one way to get it.
   */
  async generatePDF(reportId: string, options?: { sectionId?: string; targetWindow?: Window | null }): Promise<void> {
    let response;
    try {
      response = await apiClient.post(
        `${API_BASE}/${reportId}/generate-pdf`,
        options?.sectionId ? { sectionId: options.sectionId } : {},
        { responseType: 'blob' },
      );
    } catch (e: any) {
      // responseType 'blob' also wraps JSON error bodies in a Blob; unwrap it
      // so the server's message reaches the user.
      const data = e?.response?.data;
      if (data instanceof Blob) {
        try {
          const parsed = JSON.parse(await data.text());
          if (parsed?.message) e.response.data = parsed;
        } catch { /* keep the original error */ }
      }
      throw e;
    }

    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    if (options?.targetWindow) {
      // Preview: show the PDF in the tab opened by the click instead of downloading it.
      options.targetWindow.location.href = url;
      setTimeout(() => window.URL.revokeObjectURL(url), 120000);
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report-${reportId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 15000);
  },
};
