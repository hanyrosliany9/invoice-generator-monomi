import React, { useState } from 'react';
import { Card, List, Avatar, Input, Button, Space, Typography, Popconfirm, Badge, theme } from 'antd';
import {
  SendOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';

const { TextArea } = Input;
const { Text } = Typography;

interface Comment {
  id: string;
  text: string;
  authorId: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  resolved: boolean;
  replies?: Comment[];
}

interface CommentPanelProps {
  comments: Comment[];
  currentUserId: string;
  onAddComment: (text: string, parentId?: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onResolveComment: (commentId: string) => Promise<void>;
  loading?: boolean;
}

/**
 * CommentPanel Component
 *
 * Threaded comment system with:
 * - Add/delete comments
 * - Reply to comments (threading)
 * - Resolve comments
 * - Real-time updates
 */
export const CommentPanel: React.FC<CommentPanelProps> = ({
  comments,
  currentUserId,
  onAddComment,
  onDeleteComment,
  onResolveComment,
  loading = false,
}) => {
  const { token } = theme.useToken();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await onAddComment(newComment);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddReply = async (parentId: string) => {
    if (!replyText.trim()) return;

    setSubmitting(true);
    try {
      await onAddComment(replyText, parentId);
      setReplyText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to add reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => (
    <List.Item
      key={comment.id}
      style={{
        paddingLeft: isReply ? 48 : 0,
        opacity: comment.resolved ? 0.6 : 1,
      }}
    >
      <List.Item.Meta
        avatar={
          <Avatar style={{ background: token.colorPrimary }}>
            {comment.author.name.charAt(0).toUpperCase()}
          </Avatar>
        }
        title={
          <Space>
            <Text strong>{comment.author.name}</Text>
            {comment.resolved && (
              <Badge
                count="Resolved"
                style={{ background: token.colorSuccess, fontSize: 10 }}
              />
            )}
          </Space>
        }
        description={
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Text>{comment.text}</Text>
            <Space size="large">
              <Text type="secondary" style={{ fontSize: 12 }}>
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </Text>
              {!isReply && !comment.resolved && (
                <Button
                  type="link"
                  size="small"
                  icon={<MessageOutlined />}
                  onClick={() => setReplyingTo(comment.id)}
                  style={{ padding: 0 }}
                >
                  Reply
                </Button>
              )}
              {!comment.resolved && (
                <Button
                  type="link"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => onResolveComment(comment.id)}
                  style={{ padding: 0 }}
                >
                  Resolve
                </Button>
              )}
              {comment.authorId === currentUserId && (
                <Popconfirm
                  title="Delete this comment?"
                  onConfirm={() => onDeleteComment(comment.id)}
                  okText="Delete"
                  cancelText="Cancel"
                >
                  <Button
                    type="link"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    style={{ padding: 0 }}
                  >
                    Delete
                  </Button>
                </Popconfirm>
              )}
            </Space>

            {/* Reply Input */}
            {replyingTo === comment.id && (
              <div style={{ marginTop: 12 }}>
                <TextArea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  style={{ marginBottom: 8 }}
                />
                <Space>
                  <Button
                    type="primary"
                    size="small"
                    icon={<SendOutlined />}
                    onClick={() => handleAddReply(comment.id)}
                    loading={submitting}
                  >
                    Reply
                  </Button>
                  <Button size="small" onClick={() => setReplyingTo(null)}>
                    Cancel
                  </Button>
                </Space>
              </div>
            )}
          </Space>
        }
      />

      {/* Render Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {comment.replies.map((reply) => renderComment(reply, true))}
        </div>
      )}
    </List.Item>
  );

  return (
    <Card
      title={
        <Space>
          <MessageOutlined />
          <span>Comments</span>
          <Badge count={comments.length} showZero />
        </Space>
      }
      style={{ height: '100%' }}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* New Comment Input */}
        <div>
          <TextArea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            autoSize={{ minRows: 3, maxRows: 6 }}
            style={{ marginBottom: 8 }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleAddComment}
            loading={submitting}
            disabled={!newComment.trim()}
          >
            Add Comment
          </Button>
        </div>

        {/* Comments List */}
        <List
          dataSource={comments.filter((c) => !c.resolved)}
          loading={loading}
          renderItem={(comment) => renderComment(comment)}
          locale={{ emptyText: 'No comments yet. Be the first to comment!' }}
        />

        {/* Resolved Comments */}
        {comments.filter((c) => c.resolved).length > 0 && (
          <>
            <Text type="secondary" style={{ marginTop: 16 }}>
              Resolved Comments ({comments.filter((c) => c.resolved).length})
            </Text>
            <List
              dataSource={comments.filter((c) => c.resolved)}
              renderItem={(comment) => renderComment(comment)}
            />
          </>
        )}
      </Space>
    </Card>
  );
};

export default CommentPanel;
