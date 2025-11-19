import React, { useState } from 'react';
import { Modal, Table, Button, Select, Space, Tag, Avatar, Input, App, theme } from 'antd';
import {
  UserAddOutlined,
  CrownOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaCollabService, CollaboratorRole } from '../../services/media-collab';
import { getErrorMessage } from '../../utils/errorHandlers';

interface Collaborator {
  id: string;
  userId: string;
  role: 'OWNER' | 'EDITOR' | 'COMMENTER' | 'VIEWER';
  user: {
    id: string;
    name: string;
    email: string;
  };
  addedAt: string;
}

interface CollaboratorManagementProps {
  projectId: string;
  visible: boolean;
  onClose: () => void;
  currentUserId: string;
}

/**
 * CollaboratorManagement Component
 *
 * Manages project collaborators with RBAC:
 * - OWNER: Full access (add/remove collaborators, delete project)
 * - EDITOR: Upload, edit, delete assets
 * - COMMENTER: Add comments only
 * - VIEWER: Read-only access
 */
export const CollaboratorManagement: React.FC<CollaboratorManagementProps> = ({
  projectId,
  visible,
  onClose,
  currentUserId,
}) => {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<'EDITOR' | 'COMMENTER' | 'VIEWER'>('EDITOR');

  // Fetch collaborators
  const { data: collaborators, isLoading } = useQuery<Collaborator[]>({
    queryKey: ['collaborators', projectId],
    queryFn: () => mediaCollabService.getProjectCollaborators(projectId),
    enabled: visible && !!projectId,
  });

  // Add collaborator mutation
  const addMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      try {
        // Step 1: Look up user by email
        const userResponse = await fetch(
          `/api/users/lookup-by-email?email=${encodeURIComponent(data.email)}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        if (!userResponse.ok) {
          if (userResponse.status === 404) {
            throw new Error('No user found with that email address');
          }
          throw new Error('Failed to lookup user');
        }

        const userDataWrapper = await userResponse.json();
        const userId = userDataWrapper.data.id;

        // Step 2: Add collaborator with userId
        return await mediaCollabService.addCollaborator(projectId, {
          userId,
          role: data.role as CollaboratorRole,
        });
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      message.success('Collaborator added successfully');
      queryClient.invalidateQueries({ queryKey: ['collaborators', projectId] });
      setSearchEmail('');
    },
    onError: (error: unknown) => {
      message.error(getErrorMessage(error, 'Failed to add collaborator'));
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (data: { collaboratorId: string; role: string }) => {
      return mediaCollabService.updateCollaboratorRole(
        projectId,
        data.collaboratorId,
        data.role as CollaboratorRole,
      );
    },
    onSuccess: () => {
      message.success('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['collaborators', projectId] });
    },
    onError: (error: unknown) => {
      message.error(getErrorMessage(error, 'Failed to update role'));
    },
  });

  // Remove collaborator mutation
  const removeMutation = useMutation({
    mutationFn: async (collaboratorId: string) => {
      return mediaCollabService.removeCollaborator(projectId, collaboratorId);
    },
    onSuccess: () => {
      message.success('Collaborator removed');
      queryClient.invalidateQueries({ queryKey: ['collaborators', projectId] });
    },
    onError: (error: unknown) => {
      message.error(getErrorMessage(error, 'Failed to remove collaborator'));
    },
  });

  const handleAddCollaborator = () => {
    if (!searchEmail.trim()) {
      message.warning('Please enter an email address');
      return;
    }

    addMutation.mutate({
      email: searchEmail,
      role: selectedRole,
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <CrownOutlined style={{ color: token.colorWarning }} />;
      case 'EDITOR':
        return <EditOutlined style={{ color: token.colorPrimary }} />;
      case 'COMMENTER':
        return <EditOutlined style={{ color: token.colorSuccess }} />;
      case 'VIEWER':
        return <EyeOutlined style={{ color: token.colorTextSecondary }} />;
      default:
        return null;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'gold';
      case 'EDITOR':
        return 'blue';
      case 'COMMENTER':
        return 'green';
      case 'VIEWER':
        return 'default';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (record: Collaborator) => (
        <Space>
          <Avatar>{record.user.name.charAt(0).toUpperCase()}</Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{record.user.name}</div>
            <div style={{ fontSize: '12px', color: token.colorTextSecondary }}>{record.user.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Role',
      key: 'role',
      render: (record: Collaborator) => {
        const isCurrentUser = record.userId === currentUserId;
        const isOwner = record.role === 'OWNER';

        if (isCurrentUser || isOwner) {
          return (
            <Tag icon={getRoleIcon(record.role)} color={getRoleColor(record.role)}>
              {record.role}
            </Tag>
          );
        }

        return (
          <Select
            value={record.role}
            onChange={(value) =>
              updateRoleMutation.mutate({
                collaboratorId: record.id,
                role: value,
              })
            }
            style={{ width: 140 }}
            options={[
              { label: 'Editor', value: 'EDITOR' },
              { label: 'Commenter', value: 'COMMENTER' },
              { label: 'Viewer', value: 'VIEWER' },
            ]}
          />
        );
      },
    },
    {
      title: 'Permissions',
      key: 'permissions',
      render: (record: Collaborator) => {
        const permissions: string[] = [];

        if (record.role === 'OWNER') {
          permissions.push('Full Access');
        } else if (record.role === 'EDITOR') {
          permissions.push('Upload', 'Edit', 'Comment', 'View');
        } else if (record.role === 'COMMENTER') {
          permissions.push('Comment', 'View');
        } else {
          permissions.push('View Only');
        }

        return (
          <div style={{ fontSize: '12px', color: token.colorTextSecondary }}>
            {permissions.join(' • ')}
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Collaborator) => {
        const isCurrentUser = record.userId === currentUserId;
        const isOwner = record.role === 'OWNER';

        if (isCurrentUser || isOwner) {
          return <span style={{ color: token.colorTextDisabled }}>-</span>;
        }

        return (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => removeMutation.mutate(record.id)}
          >
            Remove
          </Button>
        );
      },
    },
  ];

  return (
    <Modal
      title="Manage Collaborators"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      {/* Add Collaborator */}
      <div style={{ marginBottom: '24px' }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="Enter email address"
            prefix={<UserAddOutlined />}
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            onPressEnter={handleAddCollaborator}
            style={{ flex: 1 }}
          />
          <Select
            value={selectedRole}
            onChange={setSelectedRole}
            style={{ width: 140 }}
            options={[
              { label: 'Editor', value: 'EDITOR' },
              { label: 'Commenter', value: 'COMMENTER' },
              { label: 'Viewer', value: 'VIEWER' },
            ]}
          />
          <Button
            type="primary"
            onClick={handleAddCollaborator}
            loading={addMutation.isPending}
          >
            Add
          </Button>
        </Space.Compact>
      </div>

      {/* Collaborators Table */}
      <Table
        dataSource={collaborators || []}
        columns={columns}
        loading={isLoading}
        rowKey="id"
        pagination={false}
        size="small"
      />

      {/* Role Permissions Info */}
      <div
        style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: token.colorBgLayout,
          borderRadius: token.borderRadius,
        }}
      >
        <h4 style={{ marginTop: 0 }}>Role Permissions:</h4>
        <ul style={{ marginBottom: 0, paddingLeft: '20px', fontSize: '13px' }}>
          <li>
            <strong>Owner:</strong> Full access including collaborator management and project deletion
          </li>
          <li>
            <strong>Editor:</strong> Upload, edit, and delete assets; add comments
          </li>
          <li>
            <strong>Commenter:</strong> Add and resolve comments; view all assets
          </li>
          <li>
            <strong>Viewer:</strong> View-only access to all assets and comments
          </li>
        </ul>
      </div>
    </Modal>
  );
};
