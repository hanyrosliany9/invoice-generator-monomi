import { api } from '../config/api';

export interface ExportJobStatus {
  id: string;
  deckId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalSlides: number;
  currentSlide: number;
  error?: string;
}

export type ExportQuality = 'draft' | 'standard' | 'high';

export const startPdfExport = async (
  deckId: string,
  quality: ExportQuality = 'standard',
): Promise<{ jobId: string }> => {
  const response = await api.post(`/decks/${deckId}/export/pdf`, null, {
    params: { quality },
  });
  return response.data;
};

export const getExportStatus = async (
  deckId: string,
  jobId: string,
): Promise<ExportJobStatus> => {
  const response = await api.get(`/decks/${deckId}/export/pdf/status/${jobId}`);
  return response.data;
};

export const downloadPdf = async (
  deckId: string,
  jobId: string,
): Promise<void> => {
  // Create a download link
  const url = `/api/decks/${deckId}/export/pdf/download/${jobId}`;
  const link = document.createElement('a');
  link.href = url;
  link.download = 'presentation.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportSlideAsPng = async (
  deckId: string,
  slideIndex: number,
  scale: number = 2,
): Promise<Blob> => {
  const response = await api.post(
    `/decks/${deckId}/export/png`,
    null,
    {
      params: { slideIndex, scale },
      responseType: 'blob',
    },
  );
  return response.data;
};
