import React, { useCallback } from 'react';
import { useCollaborationStore } from '../../../stores/collaborationStore';
import { CommentMarker } from './CommentMarker';

interface CommentsOverlayProps {
  slideId: string;
}

export const CommentsOverlay: React.FC<CommentsOverlayProps> = ({ slideId }) => {
  const {
    comments,
    isAddingComment,
    setAddingComment,
    selectedCommentId,
    setSelectedComment,
    socket,
  } = useCollaborationStore();

  const slideComments = comments.filter((c) => c.slideId === slideId);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddingComment) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Create new comment
    const newComment = {
      id: `comment-${Date.now()}`,
      slideId,
      userId: 'current-user', // Get from auth context
      userName: 'You',
      content: '', // Will open modal to enter content
      x,
      y,
      resolved: false,
      replies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Prompt for comment text
    const content = window.prompt('Enter your comment:');
    if (content && content.trim()) {
      newComment.content = content.trim();

      if (socket) {
        socket.emit('comment:add', newComment);
      }
    }

    setAddingComment(false);
  }, [isAddingComment, slideId, socket, setAddingComment]);

  return (
    <div
      className={`absolute inset-0 ${isAddingComment ? 'cursor-crosshair' : ''}`}
      onClick={handleCanvasClick}
    >
      {slideComments.map((comment) => (
        <CommentMarker
          key={comment.id}
          comment={comment}
          isSelected={selectedCommentId === comment.id}
          onClick={() => setSelectedComment(
            selectedCommentId === comment.id ? null : comment.id
          )}
        />
      ))}
    </div>
  );
};

export default CommentsOverlay;
