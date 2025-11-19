import { AssetStatus, MediaType } from '@prisma/client';

/**
 * Asset Filter Interface
 *
 * Query parameters for filtering media assets.
 */
export interface AssetFilters {
  mediaType?: MediaType;
  status?: AssetStatus;
  starRating?: number;
  search?: string;
  sortBy?: 'uploadedAt' | 'filename' | 'size' | 'starRating';
  sortOrder?: 'asc' | 'desc';
}
