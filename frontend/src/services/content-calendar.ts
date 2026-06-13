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

export type ContentFormat = 'FEED' | 'REEL' | 'STORY';

export interface ContentCalendarItem {
  id: string;
  caption: string; // Social media caption (replaced title & description)
  scheduledAt?: string;
  publishedAt?: string;
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED' | 'ARCHIVED';
  format: ContentFormat; // Feed post, Reel, or Story (drives Instagram preview)
  gridOrder?: number | null; // Manual position in the Instagram grid preview
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
  format?: ContentFormat;
  gridOrder?: number | null;
  platforms?: ('INSTAGRAM' | 'TIKTOK' | 'FACEBOOK' | 'TWITTER' | 'LINKEDIN' | 'YOUTUBE')[];
  clientId: string; // content is client-scoped — required
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

export interface IgProfile {
  handle: string;
  avatarUrl: string | null;
  bio: string | null;
  companyName: string;
  postCount: number;
}

export interface ShareStatus {
  enabled: boolean;
  token: string | null;
  path: string | null;
  views: number;
}

export interface HighlightMedia {
  id: string;
  url: string;
  key: string;
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  mimeType: string;
  thumbnailUrl?: string | null;
  order?: number;
}

export interface StoryHighlight {
  id: string;
  clientId: string;
  title: string;
  coverUrl?: string | null;
  coverKey?: string | null;
  order: number;
  media: HighlightMedia[];
}

export interface CreateHighlightData {
  title: string;
  cover?: { url: string; key: string; mimeType: string; size: number };
  media: { url: string; key: string; mimeType: string; size: number; width?: number; height?: number; thumbnailUrl?: string; thumbnailKey?: string }[];
}

export interface PublicContent {
  client: { name: string };
  instagram: IgProfile;
  tiktok: IgProfile;
  items: ContentCalendarItem[];
  highlights: StoryHighlight[];
}

export interface ContentCalendarFilters {
  status?: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED' | 'ARCHIVED';
  platform?: 'INSTAGRAM' | 'TIKTOK' | 'FACEBOOK' | 'TWITTER' | 'LINKEDIN' | 'YOUTUBE';
  format?: ContentFormat;
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
  async getContents(filters?: ContentCalendarFilters): Promise<ContentCalendarItem[]> {
    const params = new URLSearchParams();

    if (filters?.status) params.append('status', filters.status);
    if (filters?.platform) params.append('platform', filters.platform);
    if (filters?.format) params.append('format', filters.format);
    if (filters?.clientId) params.append('clientId', filters.clientId);
    if (filters?.projectId) params.append('projectId', filters.projectId);
    // DELETED: campaignId - 2025-11-09
    if (filters?.createdBy) params.append('createdBy', filters.createdBy);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const url = `/content-calendar${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get(url);
    return response.data.data;
  }

  async getContent(id: string): Promise<ContentCalendarItem> {
    const response = await apiClient.get(`/content-calendar/${id}`);
    return response.data.data;
  }

  /** A client's Instagram profile for the grid preview header. */
  async getIgProfile(clientId: string): Promise<IgProfile> {
    const response = await apiClient.get(`/content-calendar/ig-profile`, {
      params: { clientId },
    });
    return response.data.data;
  }

  /** A client's social profile (per platform) for the grid preview header. */
  async getSocialProfile(clientId: string, platform: 'INSTAGRAM' | 'TIKTOK'): Promise<IgProfile> {
    const response = await apiClient.get(`/content-calendar/social-profile`, {
      params: { clientId, platform },
    });
    return response.data.data;
  }

  // ----- per-client public sharing -----
  async getShareStatus(clientId: string): Promise<ShareStatus> {
    const res = await apiClient.get(`/content-calendar/share/${clientId}`);
    return res.data.data;
  }

  async enableShare(clientId: string): Promise<ShareStatus> {
    const res = await apiClient.post(`/content-calendar/share/${clientId}`, {});
    return res.data.data;
  }

  async disableShare(clientId: string): Promise<{ enabled: boolean }> {
    const res = await apiClient.delete(`/content-calendar/share/${clientId}`);
    return res.data.data;
  }

  /** Public, no-auth: a shared client's content planner payload. */
  async getPublicContent(token: string): Promise<PublicContent> {
    const res = await apiClient.get(`/content-calendar/public/${token}`);
    return res.data.data;
  }

  // ----- story highlights -----
  async listHighlights(clientId: string): Promise<StoryHighlight[]> {
    const res = await apiClient.get(`/content-calendar/highlights/${clientId}`);
    return res.data.data;
  }

  async createHighlight(clientId: string, data: CreateHighlightData): Promise<StoryHighlight> {
    const res = await apiClient.post(`/content-calendar/highlights/${clientId}`, data);
    return res.data.data;
  }

  async updateHighlight(highlightId: string, data: Partial<CreateHighlightData>): Promise<StoryHighlight> {
    const res = await apiClient.put(`/content-calendar/highlight/${highlightId}`, data);
    return res.data.data;
  }

  async deleteHighlight(highlightId: string): Promise<{ deleted: boolean }> {
    const res = await apiClient.delete(`/content-calendar/highlight/${highlightId}`);
    return res.data.data;
  }

  /** Persist the Instagram grid drag-to-rearrange order. */
  async reorder(items: { id: string; gridOrder: number }[]): Promise<{ updated: number }> {
    const response = await apiClient.put(`/content-calendar/reorder`, { items });
    return response.data.data;
  }

  async createContent(data: CreateContentDto): Promise<ContentCalendarItem> {
    const response = await apiClient.post(`/content-calendar`, data);
    return response.data.data;
  }

  async updateContent(id: string, data: UpdateContentDto): Promise<ContentCalendarItem> {
    const response = await apiClient.put(`/content-calendar/${id}`, data);
    return response.data.data;
  }

  async deleteContent(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/content-calendar/${id}`);
    return response.data.data;
  }

  async publishContent(id: string): Promise<ContentCalendarItem> {
    const response = await apiClient.post(`/content-calendar/${id}/publish`, {});
    return response.data.data;
  }

  async archiveContent(id: string): Promise<ContentCalendarItem> {
    const response = await apiClient.post(`/content-calendar/${id}/archive`, {});
    return response.data.data;
  }

  // Responses are wrapped in a { data: { success, data }, message } envelope —
  // unwrap to the actual media object(s).
  async uploadMedia(file: File, thumbnail?: string): Promise<MediaUploadResponse['data']> {
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

    return response.data?.data?.data;
  }

  async uploadMultipleMedia(files: File[]): Promise<MediaUploadResponse['data'][]> {
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

    return response.data?.data?.data ?? [];
  }

  async deleteMedia(key: string): Promise<{ success: boolean; message: string }> {
    const encodedKey = encodeURIComponent(key);
    const response = await apiClient.delete(`/media/${encodedKey}`);
    return response.data;
  }
}

export default new ContentCalendarService();
