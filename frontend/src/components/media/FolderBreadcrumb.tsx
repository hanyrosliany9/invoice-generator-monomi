import React from 'react';
import { Breadcrumb, Spin, theme } from 'antd';
import { HomeOutlined, FolderOutlined } from '@ant-design/icons';
import { FolderPath } from '../../services/media-collab';
import { useDroppable } from '@dnd-kit/core';

interface FolderBreadcrumbProps {
  folderPath: FolderPath | null;
  onNavigate: (folderId: string | null) => void;
  loading?: boolean;
  dragCount?: number; // Number of assets being dragged (for visual feedback)
}

/**
 * DroppableBreadcrumbItem Component
 *
 * Each breadcrumb segment is a drop zone - drag assets onto any breadcrumb to move to that location
 */
interface DroppableBreadcrumbItemProps {
  folderId: string | null; // null = root
  children: React.ReactNode;
  isLast: boolean;
  onClick?: () => void;
  dragCount?: number; // Number of assets being dragged
}

const DroppableBreadcrumbItem: React.FC<DroppableBreadcrumbItemProps> = ({
  folderId,
  children,
  isLast,
  onClick,
  dragCount = 1,
}) => {
  const { token } = theme.useToken();
  const dropId = folderId === null ? 'breadcrumb-root' : `breadcrumb-${folderId}`;
  const { setNodeRef, isOver } = useDroppable({ id: dropId });

  return (
    <span
      ref={setNodeRef}
      onClick={onClick}
      style={{
        cursor: isLast ? 'default' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        borderRadius: '4px',
        transition: 'all 0.2s ease',
        color: isLast ? token.colorText : token.colorPrimary,
        fontWeight: isLast ? 600 : 400,
        backgroundColor: isOver ? token.colorPrimaryBg : 'transparent',
        border: isOver ? `2px dashed ${token.colorPrimary}` : '2px solid transparent',
      }}
    >
      {children}
      {isOver && !isLast && (
        <span style={{
          fontSize: 10,
          color: token.colorPrimary,
          marginLeft: 4,
          fontWeight: 500
        }}>
          (drop {dragCount > 1 ? `${dragCount} files` : ''} here)
        </span>
      )}
    </span>
  );
};

export const FolderBreadcrumb: React.FC<FolderBreadcrumbProps> = ({
  folderPath,
  onNavigate,
  loading = false,
  dragCount = 1,
}) => {
  const { token } = theme.useToken();

  if (loading) {
    return (
      <div style={{ padding: '12px 0' }}>
        <Spin size="small" />
      </div>
    );
  }

  if (!folderPath) {
    return (
      <Breadcrumb
        style={{ padding: '12px 0' }}
        items={[
          {
            title: (
              <DroppableBreadcrumbItem folderId={null} isLast={true} dragCount={dragCount}>
                <HomeOutlined />
                <span>All Files</span>
              </DroppableBreadcrumbItem>
            ),
          },
        ]}
      />
    );
  }

  const breadcrumbItems = [
    {
      title: (
        <DroppableBreadcrumbItem
          folderId={null}
          isLast={false}
          onClick={() => onNavigate(null)}
          dragCount={dragCount}
        >
          <HomeOutlined />
          <span>{folderPath.project.name}</span>
        </DroppableBreadcrumbItem>
      ),
    },
    ...folderPath.path.map((folder, index) => {
      const isLast = index === folderPath.path.length - 1;
      return {
        title: (
          <DroppableBreadcrumbItem
            folderId={folder.id}
            isLast={isLast}
            onClick={() => !isLast && onNavigate(folder.id)}
            dragCount={dragCount}
          >
            <FolderOutlined />
            <span>{folder.name}</span>
          </DroppableBreadcrumbItem>
        ),
      };
    }),
  ];

  return (
    <Breadcrumb
      style={{ padding: '12px 0' }}
      items={breadcrumbItems}
    />
  );
};
