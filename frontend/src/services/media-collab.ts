import { apiClient } from '../config/api';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  company?: string;
  contactPerson?: string;
  paymentTerms?: string;
  status: string;
  taxNumber?: string;
  bankAccount?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  number: string;
  clientId: string;
  status: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  description?: string;
}

export interface MediaFolder {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  parentId?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  parent?: {
    id: string;
    name: string;
  };
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  children?: MediaFolder[];
  assets?: MediaAsset[];
  _count?: {
    children: number;
    assets: number;
  };
}

export interface FolderPath {
  project: {
    id: string;
    name: string;
  };
  path: Array<{
    id: string;
    name: string;
  }>;
}

export interface CreateFolderDto {
  name: string;
  description?: string;
  projectId: string;
  parentId?: string;
}

export interface UpdateFolderDto {
  name?: string;
  description?: string;
  parentId?: string;
}

export interface MoveAssetsDto {
  assetIds: string[];
  folderId?: string;
}

export interface MediaProject {
  id: string;
  name: string;
  description?: string;
  clientId?: string;
  projectId?: string;
  folderId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Public sharing fields
  isPublic?: boolean;
  publicShareToken?: string;
  publicShareUrl?: string;
  publicViewCount?: number;
  publicSharedAt?: string;
  publicAccessLevel?: 'VIEW_ONLY' | 'DOWNLOAD' | 'COMMENT';
  // Relations
  client?: Client;
  project?: Project;
  parentFolder?: MediaFolder;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  _count?: {
    assets: number;
    collaborators: number;
    collections: number;
  };
}

export interface AssetMetadata {
  assigneeId?: string;
  dueDate?: string;
  platforms?: string[];
  tags?: string[];
  customFields?: Record<string, unknown>;
  cameraModel?: string;
  cameraMake?: string;
  lens?: string;
  iso?: number;
  aperture?: string;
  shutterSpeed?: string;
  focalLength?: number;
  capturedAt?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  copyright?: string;
}

export interface MediaAsset {
  id: string;
  projectId: string;
  folderId?: string;
  filename: string;
  originalName: string;
  description?: string;
  url: string;
  key: string;
  thumbnailUrl?: string;
  mediaType: 'VIDEO' | 'IMAGE' | 'RAW_IMAGE';
  mimeType: string;
  size: string;
  width?: number;
  height?: number;
  duration?: number;
  fps?: number;
  codec?: string;
  bitrate?: number;
  status: 'DRAFT' | 'IN_REVIEW' | 'NEEDS_CHANGES' | 'APPROVED' | 'ARCHIVED';
  starRating?: number;
  uploadedBy: string;
  uploadedAt: string;
  updatedAt: string;
  uploader: {
    id: string;
    name: string;
    email: string;
  };
  folder?: {
    id: string;
    name: string;
    parentId?: string;
  };
  metadata?: AssetMetadata;
  _count?: {
    frames: number;
    versions: number;
  };
}

export interface CreateMediaProjectDto {
  name: string;
  description?: string;
  clientId?: string;
  projectId?: string;
  folderId?: string;
}

export interface InviteGuestDto {
  email: string;
  name: string;
  role: 'VIEWER' | 'COMMENTER' | 'EDITOR';
  expiresInDays?: number;
}

export interface GuestInviteResponse {
  id: string;
  projectId: string;
  guestEmail: string;
  guestName: string;
  role: string;
  status: string;
  inviteToken: string;
  inviteLink: string;
  expiresAt: string;
  createdAt: string;
}

export interface GuestAcceptResponse {
  data: {
    id: string;
    projectId: string;
    guestEmail: string;
    guestName: string;
    role: string;
    status: string;
    project: {
      id: string;
      name: string;
      description?: string;
    };
  };
  message: string;
}

export interface GuestProjectResponse {
  data: {
    project: {
      id: string;
      name: string;
      description?: string;
      clientId?: string;
    };
    role: string;
    guestName: string;
  };
  message: string;
}

class MediaCollabService {
  // ============================================
  // PROJECTS
  // ============================================

  async createProject(data: CreateMediaProjectDto): Promise<MediaProject> {
    const response = await apiClient.post('/media-collab/projects', data);
    return response.data.data;
  }

  async getProjects(): Promise<MediaProject[]> {
    const response = await apiClient.get('/media-collab/projects');
    return response.data.data;
  }

  async getProject(id: string): Promise<MediaProject> {
    const response = await apiClient.get(`/media-collab/projects/${id}`);
    return response.data.data;
  }

  async updateProject(id: string, data: Partial<CreateMediaProjectDto>): Promise<MediaProject> {
    const response = await apiClient.put(`/media-collab/projects/${id}`, data);
    return response.data.data;
  }

  async deleteProject(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/media-collab/projects/${id}`);
    return response.data.data;
  }

  // ============================================
  // ASSETS
  // ============================================

  async checkDuplicates(
    projectId: string,
    filenames: string[],
  ): Promise<Record<string, {
    id: string;
    originalName: string;
    size: string;
    uploadedAt: string;
    uploadedBy: string;
    url: string;
  }>> {
    const response = await apiClient.post(
      `/media-collab/assets/check-duplicates/${projectId}`,
      { filenames },
    );
    return response.data.data;
  }

  async uploadAsset(
    projectId: string,
    file: File,
    description?: string,
    folderId?: string,
    conflictResolution?: 'skip' | 'replace' | 'keep-both',
  ): Promise<MediaAsset> {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }
    if (folderId) {
      formData.append('folderId', folderId);
    }
    if (conflictResolution) {
      formData.append('conflictResolution', conflictResolution);
    }

    const response = await apiClient.post(
      `/media-collab/assets/upload/${projectId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data.data;
  }

  async getAssets(
    projectId: string,
    filters?: MediaAssetFilters,
  ): Promise<MediaAsset[]> {
    const response = await apiClient.get(`/media-collab/assets/project/${projectId}`, {
      params: filters,
    });
    return response.data.data;
  }

  async getAsset(id: string): Promise<MediaAsset> {
    const response = await apiClient.get(`/media-collab/assets/${id}`);
    return response.data.data;
  }

  async updateAssetStatus(id: string, status: string): Promise<MediaAsset> {
    const response = await apiClient.put(`/media-collab/assets/${id}/status`, { status });
    return response.data.data;
  }

  async deleteAsset(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/media-collab/assets/${id}`);
    return response.data.data;
  }

  // ============================================
  // STAR RATING (placeholder - will implement when backend is ready)
  // ============================================

  async updateStarRating(assetId: string, starRating: number): Promise<MediaAsset> {
    const response = await apiClient.put(`/media-collab/metadata/${assetId}/star-rating`, {
      starRating,
    });
    return response.data.data;
  }

  async bulkUpdateStarRating(assetIds: string[], starRating: number): Promise<{ success: boolean; updated: number }> {
    const response = await apiClient.post('/media-collab/metadata/bulk/star-rating', {
      assetIds,
      starRating,
    });
    return response.data.data;
  }

  // ============================================
  // COLLECTIONS (placeholder)
  // ============================================

  async getCollections(projectId: string): Promise<MediaCollection[]> {
    const response = await apiClient.get(`/media-collab/collections/project/${projectId}`);
    return response.data.data;
  }

  async createCollection(projectId: string, data: CreateCollectionDto): Promise<MediaCollection> {
    const response = await apiClient.post(
      `/media-collab/collections/project/${projectId}`,
      data,
    );
    return response.data.data;
  }

  // ============================================
  // COMMENTS
  // ============================================

  async getCommentsByAsset(assetId: string): Promise<FrameComment[]> {
    const response = await apiClient.get(`/media-collab/comments/asset/${assetId}`);
    return response.data.data;
  }

  async getCommentsByFrame(frameId: string): Promise<FrameComment[]> {
    const response = await apiClient.get(`/media-collab/comments/frame/${frameId}`);
    return response.data.data;
  }

  async createComment(data: CreateCommentDto): Promise<FrameComment> {
    const response = await apiClient.post('/media-collab/comments', data);
    return response.data.data;
  }

  async updateComment(commentId: string, content: string): Promise<FrameComment> {
    const response = await apiClient.put(`/media-collab/comments/${commentId}`, {
      content,
    });
    return response.data.data;
  }

  async deleteComment(commentId: string): Promise<void> {
    await apiClient.delete(`/media-collab/comments/${commentId}`);
  }

  async resolveComment(commentId: string): Promise<FrameComment> {
    const response = await apiClient.post(`/media-collab/comments/${commentId}/resolve`);
    return response.data.data;
  }

  // ============================================
  // COLLABORATORS
  // ============================================

  async getProjectCollaborators(projectId: string): Promise<MediaCollaborator[]> {
    const response = await apiClient.get<MediaCollaborator[]>(`/media-collab/collaborators/project/${projectId}`);
    // Ensure we always return an array
    const data = response.data;
    return Array.isArray(data) ? data : [];
  }

  async addCollaborator(projectId: string, data: AddCollaboratorDto): Promise<MediaCollaborator> {
    const response = await apiClient.post(`/media-collab/collaborators/project/${projectId}`, data);
    return response.data;
  }

  async updateCollaboratorRole(
    projectId: string,
    collaboratorId: string,
    role: CollaboratorRole,
  ): Promise<MediaCollaborator> {
    const response = await apiClient.put(
      `/media-collab/collaborators/project/${projectId}/${collaboratorId}`,
      { role },
    );
    return response.data;
  }

  async removeCollaborator(projectId: string, collaboratorId: string): Promise<{ message: string }> {
    const response = await apiClient.delete(
      `/media-collab/collaborators/project/${projectId}/${collaboratorId}`,
    );
    return response.data;
  }

  // ============================================
  // COLLECTIONS (FULL IMPLEMENTATION)
  // ============================================

  async getCollection(collectionId: string): Promise<MediaCollection> {
    const response = await apiClient.get(`/media-collab/collections/${collectionId}`);
    return response.data.data;
  }

  async getCollectionAssets(collectionId: string): Promise<MediaAsset[]> {
    const response = await apiClient.get(`/media-collab/collections/${collectionId}/assets`);
    return response.data.data;
  }

  async updateCollection(
    collectionId: string,
    data: Partial<CreateCollectionDto>,
  ): Promise<MediaCollection> {
    const response = await apiClient.put(`/media-collab/collections/${collectionId}`, data);
    return response.data.data;
  }

  async deleteCollection(collectionId: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/media-collab/collections/${collectionId}`);
    return response.data.data;
  }

  async addAssetsToCollection(collectionId: string, assetIds: string[]): Promise<{ message: string }> {
    const response = await apiClient.post(`/media-collab/collections/${collectionId}/assets`, {
      assetIds,
    });
    return response.data.data;
  }

  async removeAssetsFromCollection(
    collectionId: string,
    assetIds: string[],
  ): Promise<{ message: string }> {
    const response = await apiClient.delete(`/media-collab/collections/${collectionId}/assets`, {
      data: { assetIds },
    });
    return response.data.data;
  }

  async getSmartCollectionByRating(projectId: string, minRating: number): Promise<MediaAsset[]> {
    const response = await apiClient.get(`/media-collab/collections/smart/rating/${projectId}`, {
      params: { minRating },
    });
    return response.data.data;
  }

  async getSmartCollectionByStatus(
    projectId: string,
    status: MediaAsset['status'],
  ): Promise<MediaAsset[]> {
    const response = await apiClient.get(`/media-collab/collections/smart/status/${projectId}`, {
      params: { status },
    });
    return response.data.data;
  }

  async getSmartCollectionUnresolved(projectId: string): Promise<MediaAsset[]> {
    const response = await apiClient.get(`/media-collab/collections/smart/unresolved/${projectId}`);
    return response.data.data;
  }

  // ============================================
  // DRAWINGS & FRAMES
  // ============================================

  async getFramesByAsset(assetId: string): Promise<MediaFrame[]> {
    const response = await apiClient.get(`/media-collab/frames/asset/${assetId}`);
    return response.data.data;
  }

  async createDrawing(data: CreateFrameDrawingDto): Promise<MediaFrameDrawing> {
    const response = await apiClient.post('/media-collab/frames/drawings', data);
    return response.data.data;
  }

  async getDrawingsByAsset(assetId: string): Promise<MediaFrameDrawing[]> {
    const response = await apiClient.get(`/media-collab/frames/drawings/asset/${assetId}`);
    return response.data.data;
  }

  async getDrawingsAtTimecode(assetId: string, timecode: number): Promise<MediaFrameDrawing[]> {
    const response = await apiClient.get(
      `/media-collab/frames/drawings/timecode/${assetId}/${timecode}`,
    );
    return response.data.data;
  }

  async updateDrawing(drawingId: string, data: UpdateFrameDrawingDto): Promise<MediaFrameDrawing> {
    const response = await apiClient.put(`/media-collab/frames/drawings/${drawingId}`, data);
    return response.data.data;
  }

  async deleteDrawing(drawingId: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/media-collab/frames/drawings/${drawingId}`);
    return response.data.data;
  }

  async deleteFrame(frameId: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/media-collab/frames/${frameId}`);
    return response.data.data;
  }

  // ============================================
  // COMPARISON
  // ============================================

  async compareAssets(assetIds: string[]): Promise<ComparisonResult> {
    const response = await apiClient.post('/media-collab/compare/assets', { assetIds });
    return response.data.data;
  }

  async compareVersions(assetId: string, versionNumbers: number[]): Promise<VersionComparisonResult> {
    const response = await apiClient.post('/media-collab/compare/versions', {
      assetId,
      versionNumbers,
    });
    return response.data.data;
  }

  // ============================================
  // METADATA (FULL UPDATE)
  // ============================================

  async updateAssetMetadata(assetId: string, metadata: Partial<AssetMetadata>): Promise<MediaAsset> {
    const response = await apiClient.put(`/media-collab/metadata/${assetId}`, { metadata });
    return response.data.data;
  }

  // ============================================
  // GUEST COLLABORATION
  // ============================================

  async inviteGuest(projectId: string, data: InviteGuestDto): Promise<GuestInviteResponse> {
    const response = await apiClient.post(`/media-collab/collaborators/project/${projectId}/invite-guest`, data);
    return response.data;
  }

  async acceptGuestInvite(token: string): Promise<GuestAcceptResponse> {
    const response = await apiClient.post(`/media-collab/guest/accept?token=${token}`);
    return response.data;
  }

  async revokeGuestAccess(projectId: string, collaboratorId: string): Promise<{ message: string }> {
    const response = await apiClient.post(`/media-collab/collaborators/project/${projectId}/${collaboratorId}/revoke`);
    return response.data;
  }

  async regenerateGuestInvite(projectId: string, collaboratorId: string): Promise<GuestInviteResponse> {
    const response = await apiClient.post(`/media-collab/collaborators/project/${projectId}/${collaboratorId}/regenerate`);
    return response.data;
  }

  async getGuestProject(projectId: string, token: string): Promise<GuestProjectResponse> {
    const response = await apiClient.get(`/media-collab/guest/projects/${projectId}?token=${token}`);
    return response.data;
  }

  async getGuestAssets(projectId: string, token: string): Promise<MediaAsset[]> {
    const response = await apiClient.get(`/media-collab/guest/projects/${projectId}/assets?token=${token}`);
    return response.data.data;
  }

  // ============================================
  // PUBLIC SHARING
  // ============================================

  async enablePublicSharing(projectId: string): Promise<MediaProject> {
    const response = await apiClient.post(`/media-collab/projects/${projectId}/enable-public-sharing`);
    return response.data;
  }

  async disablePublicSharing(projectId: string): Promise<MediaProject> {
    const response = await apiClient.post(`/media-collab/projects/${projectId}/disable-public-sharing`);
    return response.data;
  }

  async regeneratePublicLink(projectId: string): Promise<MediaProject> {
    const response = await apiClient.post(`/media-collab/projects/${projectId}/regenerate-public-link`);
    return response.data;
  }

  async getPublicProject(token: string): Promise<MediaProject> {
    const response = await apiClient.get(`/media-collab/public/${token}`);
    return response.data.data;
  }

  async getPublicAssets(token: string): Promise<MediaAsset[]> {
    const response = await apiClient.get(`/media-collab/public/${token}/assets`);
    return response.data.data;
  }

  async getPublicFolders(token: string): Promise<MediaFolder[]> {
    const response = await apiClient.get(`/media-collab/public/${token}/folders`);
    return response.data.data;
  }

  // Public asset updates (no authentication required)
  async updatePublicAssetStatus(token: string, assetId: string, status: string): Promise<MediaAsset> {
    const response = await apiClient.put(`/media-collab/public/${token}/assets/${assetId}/status`, { status });
    return response.data.data;
  }

  async updatePublicAssetRating(token: string, assetId: string, starRating: number): Promise<MediaAsset> {
    const response = await apiClient.put(`/media-collab/public/${token}/assets/${assetId}/rating`, { starRating });
    return response.data.data;
  }

  // ============================================
  // FOLDERS
  // ============================================

  async createFolder(data: CreateFolderDto): Promise<MediaFolder> {
    const response = await apiClient.post('/media-collab/folders', data);
    return response.data.data;
  }

  async getFolderTree(projectId: string): Promise<MediaFolder[]> {
    const response = await apiClient.get(`/media-collab/folders/project/${projectId}/tree`);
    return response.data.data;
  }

  async getFolderContents(folderId: string): Promise<MediaFolder> {
    const response = await apiClient.get(`/media-collab/folders/${folderId}`);
    return response.data.data;
  }

  async getFolderPath(folderId: string): Promise<FolderPath> {
    const response = await apiClient.get(`/media-collab/folders/${folderId}/path`);
    return response.data.data;
  }

  async updateFolder(folderId: string, data: UpdateFolderDto): Promise<MediaFolder> {
    const response = await apiClient.patch(`/media-collab/folders/${folderId}`, data);
    return response.data.data;
  }

  async deleteFolder(folderId: string): Promise<{ message: string; deletedFolderId: string; deletedChildFolders: number; deletedAssets: number }> {
    const response = await apiClient.delete(`/media-collab/folders/${folderId}`);
    return response.data.data;
  }

  async moveAssets(projectId: string, data: MoveAssetsDto): Promise<{ message: string; movedCount: number; targetFolderId: string | null }> {
    const response = await apiClient.post(`/media-collab/folders/project/${projectId}/move-assets`, data);
    return response.data.data;
  }
}

export interface MediaCollection {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  type: 'MANUAL' | 'SMART';
  isSmartCollection?: boolean;
  criteria?: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    assets: number;
  };
}

export interface CreateCollectionDto {
  name: string;
  type: 'MANUAL' | 'SMART';
  criteria?: Record<string, unknown>;
}

export interface MediaAssetFilters {
  mediaType?: 'VIDEO' | 'IMAGE' | 'RAW_IMAGE';
  status?: 'DRAFT' | 'IN_REVIEW' | 'NEEDS_CHANGES' | 'APPROVED' | 'ARCHIVED';
  starRating?: number;
  dateFrom?: string;
  dateTo?: string;
  uploadedBy?: string;
  search?: string;
  sortBy?: 'uploadedAt' | 'filename' | 'size' | 'starRating';
  sortOrder?: 'asc' | 'desc';
}

export interface FrameComment {
  id: string;
  frameId?: string;
  assetId?: string;
  authorId: string;
  content: string;
  parentId?: string;
  status: 'OPEN' | 'RESOLVED';
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  replies?: FrameComment[];
}

export interface CreateCommentDto {
  frameId?: string;
  assetId?: string;
  content: string;
  parentId?: string;
  x?: number;
  y?: number;
}

export enum CollaboratorRole {
  OWNER = 'OWNER',
  EDITOR = 'EDITOR',
  COMMENTER = 'COMMENTER',
  VIEWER = 'VIEWER',
}

export interface MediaCollaborator {
  id: string;
  projectId: string;
  userId: string;
  role: CollaboratorRole;
  invitedBy: string;
  addedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  inviter: {
    id: string;
    name: string;
    email: string;
  };
}

export interface AddCollaboratorDto {
  userId: string;
  role: CollaboratorRole;
}

export interface MediaFrame {
  id: string;
  assetId: string;
  timestamp: number;
  frameNumber?: number;
  createdAt: string;
}

export interface MediaFrameDrawing {
  id: string;
  frameId: string;
  authorId: string;
  drawingType: 'ARROW' | 'RECTANGLE' | 'CIRCLE' | 'FREEHAND' | 'TEXT';
  coordinates: Record<string, unknown>;
  color?: string;
  strokeWidth?: number;
  text?: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateFrameDrawingDto {
  assetId: string;
  timestamp: number;
  drawingType: 'ARROW' | 'RECTANGLE' | 'CIRCLE' | 'FREEHAND' | 'TEXT';
  coordinates: Record<string, unknown>;
  color?: string;
  strokeWidth?: number;
  text?: string;
}

export interface UpdateFrameDrawingDto {
  coordinates?: Record<string, unknown>;
  color?: string;
  strokeWidth?: number;
  text?: string;
}

export interface ComparisonResult {
  assets: MediaAsset[];
  comparisonType: 'VIDEO' | 'IMAGE' | 'RAW_IMAGE';
  canCompare: boolean;
  sameProject: boolean;
  projectId?: string;
}

export interface VersionComparisonResult {
  asset: {
    id: string;
    filename: string;
    originalName: string;
    mediaType: 'VIDEO' | 'IMAGE' | 'RAW_IMAGE';
  };
  versions: MediaAssetVersion[];
  comparisonType: 'versions';
}

export interface MediaAssetVersion {
  id: string;
  assetId: string;
  versionNumber: number;
  filename: string;
  url: string;
  size: string;
  uploadedById: string;
  uploadedAt: string;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
  isActive: boolean;
}

export const mediaCollabService = new MediaCollabService();
export default mediaCollabService;
