import React, { useState } from 'react';
import { Card, Switch, Button, Input, Space, Typography, Tag, Modal, App } from 'antd';
import { LinkOutlined, CopyOutlined, SyncOutlined, EyeOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaCollabService, MediaProject } from '../../services/media-collab';

const { Text } = Typography;
const { Compact } = Space;

interface PublicSharingToggleProps {
  project: MediaProject;
}

export const PublicSharingToggle: React.FC<PublicSharingToggleProps> = ({ project }) => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  const enableMutation = useMutation({
    mutationFn: () => mediaCollabService.enablePublicSharing(project.id),
    onSuccess: () => {
      message.success('Public sharing enabled');
      queryClient.invalidateQueries({ queryKey: ['media-project', project.id] });
    },
  });

  const disableMutation = useMutation({
    mutationFn: () => mediaCollabService.disablePublicSharing(project.id),
    onSuccess: () => {
      message.success('Public sharing disabled');
      queryClient.invalidateQueries({ queryKey: ['media-project', project.id] });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: () => mediaCollabService.regeneratePublicLink(project.id),
    onSuccess: () => {
      message.success('New public link generated! Old link is now invalid.');
      queryClient.invalidateQueries({ queryKey: ['media-project', project.id] });
      setShowRegenerateConfirm(false);
    },
  });

  const handleToggle = (checked: boolean) => {
    if (checked) {
      enableMutation.mutate();
    } else {
      disableMutation.mutate();
    }
  };

  const handleCopyLink = async () => {
    if (project.publicShareUrl) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(project.publicShareUrl);
          message.success('Link copied to clipboard!');
        } else {
          // Fallback for older browsers or non-secure contexts
          const textArea = document.createElement('textarea');
          textArea.value = project.publicShareUrl;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          message.success('Link copied to clipboard!');
        }
      } catch (error) {
        message.error('Failed to copy link. Please copy manually.');
        console.error('Copy failed:', error);
      }
    }
  };

  return (
    <Card
      title={
        <Space>
          <LinkOutlined />
          Public Sharing
        </Space>
      }
    >
      <Space direction="vertical" className="w-full" size="middle">
        <div className="flex items-center justify-between">
          <div>
            <Text strong>Allow anyone with the link to view</Text>
            <br />
            <Text type="secondary" className="text-sm">
              No account or sign-in required
            </Text>
          </div>
          <Switch
            checked={project.isPublic}
            onChange={handleToggle}
            loading={enableMutation.isPending || disableMutation.isPending}
          />
        </div>

        {project.isPublic && project.publicShareUrl && (
          <>
            <div className="bg-gray-50 p-3 rounded">
              <Space direction="vertical" className="w-full" size="small">
                <div className="flex items-center gap-2">
                  <Tag icon={<EyeOutlined />} color="blue">
                    {project.publicViewCount || 0} views
                  </Tag>
                  <Text type="secondary" className="text-xs">
                    Shared on {new Date(project.publicSharedAt!).toLocaleDateString()}
                  </Text>
                </div>

                <Compact style={{ width: '100%' }}>
                  <Input
                    value={project.publicShareUrl}
                    readOnly
                    style={{ flex: 1 }}
                  />
                  <Button
                    icon={<CopyOutlined />}
                    onClick={handleCopyLink}
                  >
                    Copy
                  </Button>
                </Compact>
              </Space>
            </div>

            <Space>
              <Button
                icon={<SyncOutlined />}
                onClick={() => setShowRegenerateConfirm(true)}
                danger
              >
                Regenerate Link
              </Button>
              <Text type="secondary" className="text-xs">
                This will invalidate the old link
              </Text>
            </Space>
          </>
        )}
      </Space>

      <Modal
        title="Regenerate Public Link?"
        open={showRegenerateConfirm}
        onOk={() => regenerateMutation.mutate()}
        onCancel={() => setShowRegenerateConfirm(false)}
        okText="Regenerate"
        okButtonProps={{ danger: true, loading: regenerateMutation.isPending }}
      >
        <Text>
          This will create a new public link and invalidate the old one.
          Anyone with the old link will no longer be able to access this project.
        </Text>
      </Modal>
    </Card>
  );
};
