import axios from 'axios';
import { apiClient, API_CONFIG } from '../config/api';
import { MediaAsset, MediaFolder } from '../stores/assetBrowserStore';
import { useAuthStore } from '../store/auth';

// Create a separate axios instance for uploads with longer timeout (5 minutes)
const uploadClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 5 * 60 * 1000, // 5 minutes for uploads
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// Add auth token to upload requests
uploadClient.interceptors.request.use(
  config => {
    const tokenData = useAuthStore.getState().tokenData;
    if (tokenData?.accessToken) {
      config.headers.Authorization = `Bearer ${tokenData.accessToken}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

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

  try {
    const queryParams = new URLSearchParams();
    if (folderId) queryParams.append('folderId', folderId);
    if (search) queryParams.append('search', search);
    queryParams.append('page', String(page));
    queryParams.append('limit', String(limit));
    if (mimeType) queryParams.append('mimeType', mimeType);

    const response = await apiClient.get(`/media/assets?${queryParams.toString()}`);
    return response.data.data;
  } catch (error: any) {
    console.warn('Asset browsing endpoint not available. Backend needs /media/assets endpoint.');
    // Return empty results gracefully
    return {
      assets: [],
      total: 0,
      page: 1,
      limit: 20,
      hasMore: false,
    };
  }
};

// Fetch folders for navigation
export const fetchFolders = async (parentId?: string | null): Promise<FetchFoldersResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (parentId) queryParams.append('parentId', parentId);

    const response = await apiClient.get(`/media/folders?${queryParams.toString()}`);
    return response.data.data;
  } catch (error: any) {
    console.warn('Folder browsing endpoint not available. Backend needs /media/folders endpoint.');
    // Return empty results gracefully
    return { folders: [] };
  }
};

// Get folder breadcrumb path
export const fetchFolderPath = async (folderId: string): Promise<MediaFolder[]> => {
  try {
    const response = await apiClient.get(`/media/folders/${folderId}/path`);
    return response.data.data;
  } catch (error: any) {
    console.warn(`Folder path endpoint not available for folder ${folderId}.`);
    // Return empty path gracefully
    return [];
  }
};

// Upload new image to media library
export const uploadAsset = async (file: File, folderId?: string): Promise<MediaAsset> => {
  const formData = new FormData();
  formData.append('file', file);
  if (folderId) formData.append('folderId', folderId);

  try {
    // Use uploadClient with 5-minute timeout for file uploads
    const response = await uploadClient.post('/media/upload', formData);

    // Backend response structure: { data: { success: true, data: { url, key, size, mimeType } } }
    // Extract the actual file metadata from the nested structure
    const responseData = response.data?.data || response.data;
    const uploadedFile = responseData?.data || responseData;

    // Validate we have the required URL
    if (!uploadedFile?.url) {
      console.error('Invalid response structure:', response.data);
      throw new Error('Upload response missing URL field');
    }

    // Map backend response to MediaAsset interface
    return {
      id: uploadedFile.key || uploadedFile.id || file.name,
      filename: file.name,
      url: uploadedFile.url,
      thumbnailUrl: uploadedFile.thumbnailUrl,
      mimeType: file.type,
      size: file.size,
      width: uploadedFile.width,
      height: uploadedFile.height,
      createdAt: new Date().toISOString(),
      folderId: folderId,
    };
  } catch (error: any) {
    console.error('Upload failed:', error.message);
    if (error.code === 'ECONNABORTED') {
      throw new Error('Upload timed out. Please try again with a smaller file or faster connection.');
    }
    throw error;
  }
};
