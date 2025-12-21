import { useEffect, useCallback } from 'react';
import { Modal, Input, Button, Breadcrumb, Upload, message } from 'antd';
import {
  SearchOutlined,
  HomeOutlined,
  UploadOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAssetBrowserStore, MediaAsset, MediaFolder } from '../../stores/assetBrowserStore';
import { fetchAssets, fetchFolders, fetchFolderPath, uploadAsset } from '../../services/assetBrowserApi';
import AssetGrid from './AssetGrid';

interface AssetBrowserModalProps {
  projectId?: string; // Optional filter by project
}

export default function AssetBrowserModal({ projectId }: AssetBrowserModalProps) {
  const queryClient = useQueryClient();

  const {
    isOpen,
    closeModal,
    currentFolderId,
    setCurrentFolder,
    breadcrumbs,
    setBreadcrumbs,
    searchQuery,
    setSearchQuery,
    selectedAsset,
    setSelectedAsset,
    onAssetSelect,
  } = useAssetBrowserStore();

  // Fetch assets query
  const {
    data: assetsData,
    isLoading: isLoadingAssets,
  } = useQuery({
    queryKey: ['deck-assets', currentFolderId, searchQuery],
    queryFn: () => fetchAssets({
      folderId: currentFolderId,
      search: searchQuery,
      mimeType: 'image/*', // Only images for deck
    }),
    enabled: isOpen,
  });

  // Fetch folders query
  const {
    data: foldersData,
    isLoading: isLoadingFolders,
  } = useQuery({
    queryKey: ['deck-folders', currentFolderId],
    queryFn: () => fetchFolders(currentFolderId),
    enabled: isOpen,
  });

  // Fetch breadcrumb path when folder changes
  useEffect(() => {
    if (currentFolderId && isOpen) {
      fetchFolderPath(currentFolderId)
        .then(setBreadcrumbs)
        .catch(() => setBreadcrumbs([]));
    } else {
      setBreadcrumbs([]);
    }
  }, [currentFolderId, isOpen, setBreadcrumbs]);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAsset(file, currentFolderId || undefined),
    onSuccess: () => {
      message.success('Image uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['deck-assets'] });
    },
    onError: () => {
      message.error('Failed to upload image');
    },
  });

  // Handle folder navigation
  const handleFolderClick = useCallback((folder: MediaFolder) => {
    setCurrentFolder(folder.id);
    setSelectedAsset(null);
  }, [setCurrentFolder, setSelectedAsset]);

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = useCallback((folderId: string | null) => {
    setCurrentFolder(folderId);
    setSelectedAsset(null);
  }, [setCurrentFolder, setSelectedAsset]);

  // Handle asset selection
  const handleAssetClick = useCallback((asset: MediaAsset) => {
    setSelectedAsset(asset);
  }, [setSelectedAsset]);

  // Handle asset double-click (immediate insert)
  const handleAssetDoubleClick = useCallback((asset: MediaAsset) => {
    if (onAssetSelect) {
      onAssetSelect(asset);
      closeModal();
    }
  }, [onAssetSelect, closeModal]);

  // Handle insert button
  const handleInsert = useCallback(() => {
    if (selectedAsset && onAssetSelect) {
      onAssetSelect(selectedAsset);
      closeModal();
    }
  }, [selectedAsset, onAssetSelect, closeModal]);

  // Handle modal close
  const handleClose = useCallback(() => {
    closeModal();
    setSelectedAsset(null);
    setSearchQuery('');
    setCurrentFolder(null);
  }, [closeModal, setSelectedAsset, setSearchQuery, setCurrentFolder]);

  // Handle file upload
  const handleUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('Only image files are allowed');
      return false;
    }
    uploadMutation.mutate(file);
    return false; // Prevent default upload behavior
  }, [uploadMutation]);

  const isLoading = isLoadingAssets || isLoadingFolders;

  return (
    <Modal
      title="Insert Image"
      open={isOpen}
      onCancel={handleClose}
      width={900}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          Cancel
        </Button>,
        <Button
          key="insert"
          type="primary"
          disabled={!selectedAsset}
          onClick={handleInsert}
        >
          Insert Image
        </Button>,
      ]}
      className="asset-browser-modal"
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: 500 }}>
        {/* Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: 16,
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          {/* Search */}
          <Input
            placeholder="Search images..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, maxWidth: 320 }}
            allowClear
          />

          {/* Upload */}
          <Upload
            beforeUpload={handleUpload}
            showUploadList={false}
            accept="image/*"
          >
            <Button
              icon={<UploadOutlined />}
              loading={uploadMutation.isPending}
            >
              Upload
            </Button>
          </Upload>
        </div>

        {/* Breadcrumbs */}
        <div style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 8, paddingBottom: 8, backgroundColor: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
          <Breadcrumb
            items={[
              {
                title: (
                  <a onClick={() => handleBreadcrumbClick(null)}>
                    <HomeOutlined /> All Files
                  </a>
                ),
              },
              ...breadcrumbs.map((folder) => ({
                title: (
                  <a onClick={() => handleBreadcrumbClick(folder.id)}>
                    <FolderOutlined /> {folder.name}
                  </a>
                ),
              })),
            ]}
          />
        </div>

        {/* Asset Grid */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <AssetGrid
            assets={assetsData?.assets || []}
            folders={foldersData?.folders || []}
            isLoading={isLoading}
            selectedAsset={selectedAsset}
            onAssetClick={handleAssetClick}
            onAssetDoubleClick={handleAssetDoubleClick}
            onFolderClick={handleFolderClick}
          />
        </div>
      </div>
    </Modal>
  );
}
