import React, { useState } from 'react';
import { Tree, Spin, Empty, Dropdown, Modal, Input, theme } from 'antd';
import type { DataNode } from 'antd/es/tree';
import {
  FolderOutlined,
  FolderOpenOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderAddOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { MediaFolder } from '../../services/media-collab';

interface FolderTreeProps {
  folders: MediaFolder[];
  selectedFolderId?: string;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string) => void;
  loading?: boolean;
}

export const FolderTree: React.FC<FolderTreeProps> = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  loading = false,
}) => {
  const { token } = theme.useToken();
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  // Convert MediaFolder[] to Ant Design Tree DataNode[]
  const buildTreeData = (folders: MediaFolder[]): DataNode[] => {
    return folders.map((folder) => ({
      key: folder.id,
      title: (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <span
            style={{
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {folder.name}
          </span>
          <span style={{ marginLeft: 8, color: token.colorTextSecondary, fontSize: 12 }}>
            {folder._count?.assets || 0}
          </span>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'add',
                  label: 'New Subfolder',
                  icon: <FolderAddOutlined />,
                  onClick: () => onCreateFolder(folder.id),
                },
                {
                  key: 'rename',
                  label: 'Rename',
                  icon: <EditOutlined />,
                  onClick: () => handleRenameClick(folder.id, folder.name),
                },
                {
                  type: 'divider',
                },
                {
                  key: 'delete',
                  label: 'Delete',
                  icon: <DeleteOutlined />,
                  danger: true,
                  onClick: () => handleDeleteClick(folder.id, folder.name),
                },
              ],
            }}
            trigger={['click']}
          >
            <MoreOutlined
              style={{ padding: '0 8px', cursor: 'pointer' }}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        </div>
      ),
      icon: expandedKeys.includes(folder.id) ? <FolderOpenOutlined /> : <FolderOutlined />,
      children: folder.children ? buildTreeData(folder.children) : undefined,
    }));
  };

  const handleRenameClick = (folderId: string, currentName: string) => {
    setRenameFolderId(folderId);
    setNewFolderName(currentName);
    setRenameModalVisible(true);
  };

  const handleRenameSubmit = () => {
    if (renameFolderId && newFolderName.trim()) {
      onRenameFolder(renameFolderId, newFolderName.trim());
      setRenameModalVisible(false);
      setRenameFolderId(null);
      setNewFolderName('');
    }
  };

  const handleDeleteClick = (folderId: string, folderName: string) => {
    Modal.confirm({
      title: 'Delete Folder',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${folderName}"? This will delete all subfolders and assets inside it. This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => onDeleteFolder(folderId),
    });
  };

  const treeData = buildTreeData(folders);

  if (loading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  if (!folders || folders.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No folders yet"
        style={{ padding: '40px 0' }}
      />
    );
  }

  return (
    <>
      <div style={{ padding: '8px 0' }}>
        {/* Root level item */}
        <div
          onClick={() => onSelectFolder(null)}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            borderRadius: 4,
            background: !selectedFolderId ? token.colorPrimaryBg : 'transparent',
            color: !selectedFolderId ? token.colorPrimary : token.colorText,
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <FolderOutlined />
          <span style={{ fontWeight: !selectedFolderId ? 600 : 400 }}>All Files</span>
        </div>

        {/* Folder tree */}
        <Tree
          showIcon
          blockNode
          expandedKeys={expandedKeys}
          selectedKeys={selectedFolderId ? [selectedFolderId] : []}
          onExpand={(keys) => setExpandedKeys(keys)}
          onSelect={(keys) => {
            if (keys.length > 0) {
              onSelectFolder(keys[0] as string);
            }
          }}
          treeData={treeData}
          style={{
            background: 'transparent',
          }}
        />
      </div>

      {/* Rename Modal */}
      <Modal
        title="Rename Folder"
        open={renameModalVisible}
        onOk={handleRenameSubmit}
        onCancel={() => {
          setRenameModalVisible(false);
          setRenameFolderId(null);
          setNewFolderName('');
        }}
        okText="Rename"
        cancelText="Cancel"
      >
        <Input
          placeholder="Folder name"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onPressEnter={handleRenameSubmit}
          maxLength={255}
          autoFocus
        />
      </Modal>
    </>
  );
};
