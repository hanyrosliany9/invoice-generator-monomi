import React from 'react';
import { Tooltip } from 'antd';
import { CommentOutlined, CheckCircleFilled } from '@ant-design/icons';
import { Comment } from '../../../stores/collaborationStore';

interface CommentMarkerProps {
  comment: Comment;
  isSelected: boolean;
  onClick: () => void;
}

export const CommentMarker: React.FC<CommentMarkerProps> = ({
  comment,
  isSelected,
  onClick,
}) => {
  return (
    <Tooltip title={comment.content} placement="top">
      <div
        className={`absolute cursor-pointer transition-transform hover:scale-110 ${
          isSelected ? 'scale-125 z-20' : 'z-10'
        }`}
        style={{
          left: comment.x,
          top: comment.y,
          transform: 'translate(-50%, -50%)',
        }}
        onClick={onClick}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
            comment.resolved
              ? 'bg-green-500'
              : isSelected
              ? 'bg-blue-600'
              : 'bg-blue-500'
          }`}
        >
          {comment.resolved ? (
            <CheckCircleFilled className="text-white text-sm" />
          ) : (
            <CommentOutlined className="text-white text-sm" />
          )}
        </div>
        {comment.replies.length > 0 && !comment.resolved && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
            {comment.replies.length}
          </span>
        )}
      </div>
    </Tooltip>
  );
};

export default CommentMarker;
