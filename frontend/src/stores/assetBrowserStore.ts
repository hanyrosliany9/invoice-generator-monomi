import { create } from 'zustand';

export interface MediaAsset {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  createdAt: string;
  folderId?: string;
  folderName?: string;
}

export interface MediaFolder {
  id: string;
  name: string;
  parentId?: string;
  assetCount: number;
}

interface AssetBrowserState {
  // Modal state
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;

  // Loading state
  isLoading: boolean;
  setLoading: (loading: boolean) => void;

  // Assets and folders
  assets: MediaAsset[];
  folders: MediaFolder[];
  setAssets: (assets: MediaAsset[]) => void;
  setFolders: (folders: MediaFolder[]) => void;

  // Navigation
  currentFolderId: string | null;
  setCurrentFolder: (folderId: string | null) => void;
  breadcrumbs: MediaFolder[];
  setBreadcrumbs: (breadcrumbs: MediaFolder[]) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Selection
  selectedAsset: MediaAsset | null;
  setSelectedAsset: (asset: MediaAsset | null) => void;

  // Callback for when asset is selected
  onAssetSelect: ((asset: MediaAsset) => void) | null;
  setOnAssetSelect: (callback: ((asset: MediaAsset) => void) | null) => void;

  // Reset
  reset: () => void;
}

export const useAssetBrowserStore = create<AssetBrowserState>((set) => ({
  // Modal state
  isOpen: false,
  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false, selectedAsset: null }),

  // Loading state
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),

  // Assets and folders
  assets: [],
  folders: [],
  setAssets: (assets) => set({ assets }),
  setFolders: (folders) => set({ folders }),

  // Navigation
  currentFolderId: null,
  setCurrentFolder: (folderId) => set({ currentFolderId: folderId }),
  breadcrumbs: [],
  setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),

  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Selection
  selectedAsset: null,
  setSelectedAsset: (asset) => set({ selectedAsset: asset }),

  // Callback
  onAssetSelect: null,
  setOnAssetSelect: (callback) => set({ onAssetSelect: callback }),

  // Reset
  reset: () => set({
    isOpen: false,
    isLoading: false,
    assets: [],
    folders: [],
    currentFolderId: null,
    breadcrumbs: [],
    searchQuery: '',
    selectedAsset: null,
    onAssetSelect: null,
  }),
}));
