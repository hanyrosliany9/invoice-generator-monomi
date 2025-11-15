import axios from 'axios';
import {
  SocialMediaReport,
  CreateReportDto,
  AddSectionDto,
  UpdateVisualizationsDto,
  ReportStatus,
} from '../types/report';

const API_BASE = '/api/v1/reports';

export const socialMediaReportsService = {
  // Reports CRUD
  async createReport(data: CreateReportDto): Promise<SocialMediaReport> {
    const response = await axios.post(API_BASE, data);
    return response.data.data;
  },

  async getReports(filters?: {
    projectId?: string;
    year?: number;
    month?: number;
    status?: ReportStatus;
  }): Promise<SocialMediaReport[]> {
    const response = await axios.get(API_BASE, { params: filters });
    return response.data.data;
  },

  async getReport(id: string): Promise<SocialMediaReport> {
    const response = await axios.get(`${API_BASE}/${id}`);
    return response.data.data;
  },

  async deleteReport(id: string): Promise<void> {
    await axios.delete(`${API_BASE}/${id}`);
  },

  async updateStatus(id: string, status: ReportStatus): Promise<SocialMediaReport> {
    const response = await axios.post(`${API_BASE}/${id}/status`, { status });
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

    const response = await axios.post(`${API_BASE}/${reportId}/sections`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  async removeSection(reportId: string, sectionId: string): Promise<void> {
    await axios.delete(`${API_BASE}/${reportId}/sections/${sectionId}`);
  },

  async reorderSections(reportId: string, sectionIds: string[]): Promise<SocialMediaReport> {
    const response = await axios.post(`${API_BASE}/${reportId}/sections/reorder`, {
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
    const response = await axios.patch(
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
    const response = await axios.patch(
      `${API_BASE}/${reportId}/sections/${sectionId}/layout`,
      { layout },
    );
    return response.data.data;
  },

  // PDF Generation
  async generatePDF(reportId: string, options?: { sectionId?: string; snapshot?: any }): Promise<void> {
    const requestBody = options?.sectionId ? {
      sectionId: options.sectionId, // NEW: Server-side rendering approach
    } : options?.snapshot ? {
      renderedHTML: options.snapshot.html, // OLD: Legacy snapshot approach
      styles: options.snapshot.styles,
      dimensions: options.snapshot.dimensions,
    } : {};

    console.log('📤 Sending PDF generation request:', { reportId, requestBody, options });

    const response = await axios.post(
      `${API_BASE}/${reportId}/generate-pdf`,
      requestBody,
      { responseType: 'blob' },
    );

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report-${reportId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async downloadPDF(reportId: string): Promise<void> {
    const response = await axios.get(
      `${API_BASE}/${reportId}/download-pdf`,
      { responseType: 'blob' },
    );

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report-${reportId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
