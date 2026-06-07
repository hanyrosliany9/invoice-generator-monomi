import React from 'react';
import { useCollaborationStore, Collaborator } from '../../../stores/collaborationStore';

interface CollaboratorCursorsProps {
  currentSlideId: string;
}

export const CollaboratorCursors: React.FC<CollaboratorCursorsProps> = ({ currentSlideId }) => {
  const { collaborators } = useCollaborationStore();

  const visibleCollaborators = Array.from(collaborators.values()).filter(
    (c) => c.cursor && c.slideId === currentSlideId
  );

  return (
    <>
      {visibleCollaborators.map((collaborator) => (
        <CollaboratorCursor key={collaborator.id} collaborator={collaborator} />
      ))}
    </>
  );
};

interface CollaboratorCursorProps {
  collaborator: Collaborator;
}

const CollaboratorCursor: React.FC<CollaboratorCursorProps> = ({ collaborator }) => {
  if (!collaborator.cursor) return null;

  return (
    <div
      className="pointer-events-none absolute z-50 transition-transform duration-75"
      style={{
        left: collaborator.cursor.x,
        top: collaborator.cursor.y,
        transform: 'translate(-2px, -2px)',
      }}
    >
      {/* Cursor arrow */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="drop-shadow-lg"
      >
        <path
          d="M5.5 3.21V20.8a1.3 1.3 0 002.1 1L11 18.5l3.4 7.2a1.3 1.3 0 002.4-.6l5-18a1.3 1.3 0 00-1.6-1.6l-18 5a1.3 1.3 0 00.3 2.5z"
          fill={collaborator.color}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>

      {/* Name label */}
      <div
        className="absolute left-4 top-4 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap shadow-lg"
        style={{ backgroundColor: collaborator.color }}
      >
        {collaborator.name}
      </div>
    </div>
  );
};

export default CollaboratorCursors;
