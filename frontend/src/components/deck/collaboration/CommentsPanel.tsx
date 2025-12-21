import React, { useState } from 'react';
import { Button, Input, Avatar, Empty, Tooltip, Popconfirm } from 'antd';
import {
  CommentOutlined,
  CloseOutlined,
  CheckOutlined,
  DeleteOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useCollaborationStore, Comment } from '../../../stores/collaborationStore';
import { formatDistanceToNow } from 'date-fns';

const { TextArea } = Input;

interface CommentsPanelProps {
  slideId: string;
  onClose: () => void;
}

export const CommentsPanel: React.FC<CommentsPanelProps> = ({ slideId, onClose }) => {
  const { comments, socket, setSelectedComment, selectedCommentId } = useCollaborationStore();

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const slideComments = comments.filter((c) => c.slideId === slideId);
  const unresolvedCount = slideComments.filter((c) => !c.resolved).length;

  const handleResolve = (commentId: string) => {
    if (socket) {
      socket.emit('comment:update', {
        id: commentId,
        updates: { resolved: true },
      });
    }
  };

  const handleDelete = (commentId: string) => {
    if (socket) {
      socket.emit('comment:delete', commentId);
    }
  };

  const handleReply = (commentId: string) => {
    if (!replyText.trim() || !socket) return;

    // In production, get user info from auth context
    const reply = {
      id: `reply-${Date.now()}`,
      userId: 'current-user',
      userName: 'You',
      content: replyText,
      createdAt: new Date().toISOString(),
    };

    const comment = comments.find((c) => c.id === commentId);
    if (comment) {
      socket.emit('comment:update', {
        id: commentId,
        updates: {
          replies: [...comment.replies, reply],
        },
      });
    }

    setReplyText('');
    setReplyingTo(null);
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <CommentOutlined />
          <span className="font-medium">Comments</span>
          {unresolvedCount > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
              {unresolvedCount}
            </span>
          )}
        </div>
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={onClose}
        />
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-auto p-3">
        {slideComments.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No comments yet"
          />
        ) : (
          <div className="space-y-4">
            {slideComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isSelected={selectedCommentId === comment.id}
                onSelect={() => setSelectedComment(comment.id)}
                onResolve={() => handleResolve(comment.id)}
                onDelete={() => handleDelete(comment.id)}
                isReplying={replyingTo === comment.id}
                onStartReply={() => setReplyingTo(comment.id)}
                onCancelReply={() => setReplyingTo(null)}
                replyText={replyText}
                onReplyTextChange={setReplyText}
                onSubmitReply={() => handleReply(comment.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface CommentItemProps {
  comment: Comment;
  isSelected: boolean;
  onSelect: () => void;
  onResolve: () => void;
  onDelete: () => void;
  isReplying: boolean;
  onStartReply: () => void;
  onCancelReply: () => void;
  replyText: string;
  onReplyTextChange: (text: string) => void;
  onSubmitReply: () => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  isSelected,
  onSelect,
  onResolve,
  onDelete,
  isReplying,
  onStartReply,
  onCancelReply,
  replyText,
  onReplyTextChange,
  onSubmitReply,
}) => {
  return (
    <div
      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      } ${comment.resolved ? 'opacity-60' : ''}`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Avatar size="small" src={comment.userAvatar}>
            {comment.userName.charAt(0)}
          </Avatar>
          <span className="font-medium text-sm">{comment.userName}</span>
        </div>
        <span className="text-xs text-gray-400">
          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
        </span>
      </div>

      {/* Content */}
      <p className="text-sm text-gray-700 mb-2">{comment.content}</p>

      {/* Resolved badge */}
      {comment.resolved && (
        <div className="flex items-center gap-1 text-green-600 text-xs mb-2">
          <CheckOutlined />
          <span>Resolved</span>
        </div>
      )}

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="ml-4 border-l-2 border-gray-200 pl-3 space-y-2 mt-2">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="text-sm">
              <div className="flex items-center gap-1">
                <span className="font-medium">{reply.userName}</span>
                <span className="text-gray-400 text-xs">
                  {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-gray-600">{reply.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
        {!comment.resolved && (
          <Tooltip title="Resolve">
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onResolve();
              }}
            />
          </Tooltip>
        )}
        <Button
          type="text"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onStartReply();
          }}
        >
          Reply
        </Button>
        <div className="flex-1" />
        <Popconfirm
          title="Delete this comment?"
          onConfirm={(e) => {
            e?.stopPropagation();
            onDelete();
          }}
        >
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={(e) => e.stopPropagation()}
          />
        </Popconfirm>
      </div>

      {/* Reply input */}
      {isReplying && (
        <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
          <TextArea
            placeholder="Write a reply..."
            autoSize={{ minRows: 1, maxRows: 3 }}
            value={replyText}
            onChange={(e) => onReplyTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmitReply();
              }
              if (e.key === 'Escape') {
                onCancelReply();
              }
            }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={onSubmitReply}
            disabled={!replyText.trim()}
          />
        </div>
      )}
    </div>
  );
};

export default CommentsPanel;
