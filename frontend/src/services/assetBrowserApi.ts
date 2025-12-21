import { apiClient } from '../config/api';
import { MediaAsset, MediaFolder } from '../stores/assetBrowserStore';

export interface FetchAssetsParams {
  folderId?: string | null;
  search?: string;
  page?: number;
  limit?: number;
  mimeType?: string; // Filter by type: 'image/*', 'video/*'
}

export interface FetchAssetsResponse {
  assets: MediaAsset[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface FetchFoldersResponse {
  folders: MediaFolder[];
}

// Fetch assets from media library (using existing media endpoints)
export const fetchAssets = async (params: FetchAssetsParams): Promise<FetchAssetsResponse> => {
  const { folderId, search, page = 1, limit = 20, mimeType } = params;

  const queryParams = new URLSearchParams();
  if (folderId) queryParams.append('folderId', folderId);
  if (search) queryParams.append('search', search);
  queryParams.append('page', String(page));
  queryParams.append('limit', String(limit));
  if (mimeType) queryParams.append('mimeType', mimeType);

  const response = await apiClient.get(`/media/assets?${queryParams.toString()}`);
  return response.data.data;
};

// Fetch folders for navigation
export const fetchFolders = async (parentId?: string | null): Promise<FetchFoldersResponse> => {
  const queryParams = new URLSearchParams();
  if (parentId) queryParams.append('parentId', parentId);

  const response = await apiClient.get(`/media/folders?${queryParams.toString()}`);
  return response.data.data;
};

// Get folder breadcrumb path
export const fetchFolderPath = async (folderId: string): Promise<MediaFolder[]> => {
  const response = await apiClient.get(`/media/folders/${folderId}/path`);
  return response.data.data;
};

// Upload new image to media library
export const uploadAsset = async (file: File, folderId?: string): Promise<MediaAsset> => {
  const formData = new FormData();
  formData.append('file', file);
  if (folderId) formData.append('folderId', folderId);

  const response = await apiClient.post('/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data.data;
};
