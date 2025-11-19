import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Result, Button, Spin, Card } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { mediaCollabService } from '../services/media-collab';

export const GuestAcceptInvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const { data, isLoading, error } = useQuery({
    queryKey: ['guest-accept', token],
    queryFn: () => mediaCollabService.acceptGuestInvite(token!),
    enabled: !!token,
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <Result
            status="error"
            title="Missing Token"
            subTitle="No invite token was provided in the URL."
          />
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spin size="large" tip="Accepting invite..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <Result
            icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            status="error"
            title="Invalid or Expired Invite"
            subTitle="This invite link is invalid, has expired, or has been revoked."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <Result
          icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
          status="success"
          title="Welcome!"
          subTitle={
            <div className="space-y-2">
              <p>You've been invited to collaborate on:</p>
              <p className="font-semibold text-lg">{data?.data.project.name}</p>
              <p className="text-sm text-gray-600">
                Role: <span className="font-medium">{data?.data.role}</span>
              </p>
            </div>
          }
          extra={
            <Button
              type="primary"
              size="large"
              onClick={() => navigate(`/guest/project/${data?.data.projectId}?token=${token}`)}
            >
              View Project
            </Button>
          }
        />
      </Card>
    </div>
  );
};

export default GuestAcceptInvitePage;
