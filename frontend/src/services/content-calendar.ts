import { apiClient } from '../config/api';

export interface ContentMedia {
  id: string;
  url: string;
  key: string;
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  originalName?: string;
  thumbnailUrl?: string;
  thumbnailKey?: string;
  order?: number; // Carousel order (0 = first, 1 = second, etc.)
  uploadedAt: string;
}

export interface ContentCalendarItem {
  id: string;
  caption: string; // Social media caption (replaced title & description)
  scheduledAt?: string;
  publishedAt?: string;
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED' | 'ARCHIVED';
  platforms: ('INSTAGRAM' | 'TIKTOK' | 'FACEBOOK' | 'TWITTER' | 'LINKEDIN' | 'YOUTUBE')[];
  clientId?: string;
  projectId?: string;
  // DELETED: campaignId - 2025-11-09
  media: ContentMedia[];
  client?: { id: string; name: string; email?: string };
  project?: { id: string; number: string; description: string };
  // DELETED: campaign - 2025-11-09
  creator?: { id: string; name: string; email: string; role: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateContentDto {
  caption: string; // Social media caption
  scheduledAt?: string;
  status?: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED' | 'ARCHIVED';
  platforms?: ('INSTAGRAM' | 'TIKTOK' | 'FACEBOOK' | 'TWITTER' | 'LINKEDIN' | 'YOUTUBE')[];
  clientId?: string;
  projectId?: string;
  // DELETED: campaignId - 2025-11-09
  media?: {
    url: string;
    key: string;
    mimeType: string;
    size: number;
    width?: number;
    height?: number;
    duration?: number;
    originalName?: string;
    thumbnailUrl?: string;
    thumbnailKey?: string;
    order?: number; // Carousel order
  }[];
}

export interface UpdateContentDto extends Partial<CreateContentDto> {}

export interface ContentCalendarFilters {
  status?: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED' | 'ARCHIVED';
  platform?: 'INSTAGRAM' | 'TIKTOK' | 'FACEBOOK' | 'TWITTER' | 'LINKEDIN' | 'YOUTUBE';
  clientId?: string;
  projectId?: string;
  // DELETED: campaignId - 2025-11-09
  createdBy?: string;
  startDate?: string;
  endDate?: string;
}

export interface MediaUploadResponse {
  success: boolean;
  data: {
    url: string;
    key: string;
    size: number;
    mimeType: string;
    thumbnailUrl?: string;
    thumbnailKey?: string;
  };
}

class ContentCalendarService {
  async getContents(filters?: ContentCalendarFilters): Promise<{ success: boolean; data: ContentCalendarItem[]; count: number }> {
    const params = new URLSearchParams();

    if (filters?.status) params.append('status', filters.status);
    if (filters?.platform) params.append('platform', filters.platform);
    if (filters?.clientId) params.append('clientId', filters.clientId);
    if (filters?.projectId) params.append('projectId', filters.projectId);
    // DELETED: campaignId - 2025-11-09
    if (filters?.createdBy) params.append('createdBy', filters.createdBy);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const url = `/content-calendar${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get(url);
    return response.data;
  }

  async getContent(id: string): Promise<{ success: boolean; data: ContentCalendarItem }> {
    const response = await apiClient.get(`/content-calendar/${id}`);
    return response.data;
  }

  async createContent(data: CreateContentDto): Promise<{ success: boolean; data: ContentCalendarItem }> {
    const response = await apiClient.post(`/content-calendar`, data);
    return response.data;
  }

  async updateContent(id: string, data: UpdateContentDto): Promise<{ success: boolean; data: ContentCalendarItem }> {
    const response = await apiClient.put(`/content-calendar/${id}`, data);
    return response.data;
  }

  async deleteContent(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/content-calendar/${id}`);
    return response.data;
  }

  async publishContent(id: string): Promise<{ success: boolean; data: ContentCalendarItem; message: string }> {
    const response = await apiClient.post(`/content-calendar/${id}/publish`, {});
    return response.data;
  }

  async archiveContent(id: string): Promise<{ success: boolean; data: ContentCalendarItem; message: string }> {
    const response = await apiClient.post(`/content-calendar/${id}/archive`, {});
    return response.data;
  }

  async uploadMedia(file: File, thumbnail?: string): Promise<MediaUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    // Add thumbnail as base64 string if provided
    if (thumbnail) {
      formData.append('thumbnail', thumbnail);
    }

    const response = await apiClient.post(`/media/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minutes for large video uploads
    });

    return response.data;
  }

  async uploadMultipleMedia(files: File[]): Promise<{ success: boolean; data: MediaUploadResponse['data'][] }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await apiClient.post(`/media/upload-multiple`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minutes for large video uploads
    });

    return response.data;
  }

  async deleteMedia(key: string): Promise<{ success: boolean; message: string }> {
    const encodedKey = encodeURIComponent(key);
    const response = await apiClient.delete(`/media/${encodedKey}`);
    return response.data;
  }
}

export default new ContentCalendarService();
