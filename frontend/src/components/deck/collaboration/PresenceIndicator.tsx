import React from 'react';
import { Avatar, Tooltip, Badge } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useCollaborationStore } from '../../../stores/collaborationStore';

export const PresenceIndicator: React.FC = () => {
  const { collaborators, isConnected } = useCollaborationStore();

  const collaboratorList = Array.from(collaborators.values());

  return (
    <div className="flex items-center gap-2">
      {/* Connection status */}
      <Tooltip title={isConnected ? 'Connected' : 'Disconnected'}>
        <Badge
          status={isConnected ? 'success' : 'error'}
          dot
        />
      </Tooltip>

      {/* Collaborator avatars */}
      <Avatar.Group
        max={{
          count: 4,
          style: {
            backgroundColor: '#1677ff',
            cursor: 'pointer',
          },
        }}
        size="small"
      >
        {collaboratorList.map((collaborator) => (
          <Tooltip key={collaborator.id} title={collaborator.name}>
            <Avatar
              style={{ backgroundColor: collaborator.color }}
              src={collaborator.avatar}
              icon={!collaborator.avatar && <UserOutlined />}
              size="small"
            >
              {!collaborator.avatar && collaborator.name.charAt(0).toUpperCase()}
            </Avatar>
          </Tooltip>
        ))}
      </Avatar.Group>

      {/* Count indicator */}
      {collaboratorList.length > 0 && (
        <span className="text-xs text-gray-500">
          {collaboratorList.length} online
        </span>
      )}
    </div>
  );
};

export default PresenceIndicator;
