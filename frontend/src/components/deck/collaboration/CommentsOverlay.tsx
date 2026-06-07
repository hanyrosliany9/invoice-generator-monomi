import React, { useCallback } from 'react';
import { useCollaborationStore } from '../../../stores/collaborationStore';
import { CommentMarker } from './CommentMarker';

interface CommentsOverlayProps {
  slideId: string;
  /**
   * Persist a new comment placed at the given canvas-relative position.
   * The parent (DeckEditorPage) wires this to commentsApi.create + the store.
   */
  onCreate: (input: { content: string; x: number; y: number }) => void;
}

export const CommentsOverlay: React.FC<CommentsOverlayProps> = ({ slideId, onCreate }) => {
  const {
    comments,
    isAddingComment,
    setAddingComment,
    selectedCommentId,
    setSelectedComment,
  } = useCollaborationStore();

  const slideComments = comments.filter((c) => c.slideId === slideId);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isAddingComment) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const content = window.prompt('Enter your comment:');
      if (content && content.trim()) {
        onCreate({ content: content.trim(), x, y });
      }

      setAddingComment(false);
    },
    [isAddingComment, onCreate, setAddingComment],
  );

  return (
    <div
      className={`absolute inset-0 ${isAddingComment ? 'cursor-crosshair' : 'pointer-events-none'}`}
      onClick={handleCanvasClick}
    >
      {slideComments.map((comment) => (
        <div key={comment.id} className="pointer-events-auto">
          <CommentMarker
            comment={comment}
            isSelected={selectedCommentId === comment.id}
            onClick={() =>
              setSelectedComment(selectedCommentId === comment.id ? null : comment.id)
            }
          />
        </div>
      ))}
    </div>
  );
};

export default CommentsOverlay;
