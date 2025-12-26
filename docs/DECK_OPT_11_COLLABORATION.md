# Phase 11: Real-Time Collaboration

> **Executor**: Claude Code Haiku 4.5
> **Prerequisite**: Complete `DECK_OPT_10_EXPORT.md` first
> **Estimated Complexity**: High

## Overview

Add real-time collaboration features including live cursors, presence indicators, and a comments panel. Uses Socket.io which is already installed.

---

## Step 1: Create Collaboration Store

**File**: `frontend/src/features/deck-editor/stores/collaborationStore.ts`

```typescript
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  cursor?: { x: number; y: number };
  slideId?: string;
  lastActive: Date;
}

export interface Comment {
  id: string;
  slideId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  x: number;
  y: number;
  resolved: boolean;
  replies: CommentReply[];
  createdAt: string;
  updatedAt: string;
}

export interface CommentReply {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
}

interface CollaborationState {
  // Socket connection
  socket: Socket | null;
  isConnected: boolean;
  connect: (deckId: string, userId: string) => void;
  disconnect: () => void;

  // Collaborators
  collaborators: Map<string, Collaborator>;
  addCollaborator: (collaborator: Collaborator) => void;
  removeCollaborator: (id: string) => void;
  updateCollaboratorCursor: (id: string, x: number, y: number, slideId: string) => void;

  // Cursor broadcasting
  broadcastCursor: (x: number, y: number, slideId: string) => void;

  // Comments
  comments: Comment[];
  setComments: (comments: Comment[]) => void;
  addComment: (comment: Comment) => void;
  updateComment: (id: string, updates: Partial<Comment>) => void;
  removeComment: (id: string) => void;

  // Comment creation mode
  isAddingComment: boolean;
  setAddingComment: (adding: boolean) => void;
  selectedCommentId: string | null;
  setSelectedComment: (id: string | null) => void;

  // Canvas sync
  broadcastCanvasChange: (slideId: string, data: any) => void;

  // Current deck info
  deckId: string | null;
  currentSlideId: string | null;
  setCurrentSlide: (slideId: string) => void;
}

// Generate a random color for user
const generateUserColor = (): string => {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
    '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  // Socket connection
  socket: null,
  isConnected: false,

  connect: (deckId: string, userId: string) => {
    const existingSocket = get().socket;
    if (existingSocket) {
      existingSocket.disconnect();
    }

    const socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:5000', {
      query: { deckId, userId },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      set({ isConnected: true, deckId });
      console.log('Connected to collaboration server');
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
      console.log('Disconnected from collaboration server');
    });

    // Handle collaborator events
    socket.on('collaborator:join', (collaborator: Collaborator) => {
      get().addCollaborator({
        ...collaborator,
        color: generateUserColor(),
        lastActive: new Date(),
      });
    });

    socket.on('collaborator:leave', (userId: string) => {
      get().removeCollaborator(userId);
    });

    socket.on('collaborator:cursor', (data: { userId: string; x: number; y: number; slideId: string }) => {
      get().updateCollaboratorCursor(data.userId, data.x, data.y, data.slideId);
    });

    // Handle comment events
    socket.on('comment:add', (comment: Comment) => {
      get().addComment(comment);
    });

    socket.on('comment:update', (data: { id: string; updates: Partial<Comment> }) => {
      get().updateComment(data.id, data.updates);
    });

    socket.on('comment:delete', (commentId: string) => {
      get().removeComment(commentId);
    });

    // Handle canvas sync
    socket.on('canvas:update', (data: { slideId: string; canvasData: any }) => {
      // Emit a custom event for the canvas to handle
      window.dispatchEvent(new CustomEvent('remote-canvas-update', {
        detail: data,
      }));
    });

    set({ socket });
  },

  disconnect: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
    }
    set({
      socket: null,
      isConnected: false,
      collaborators: new Map(),
      deckId: null,
    });
  },

  // Collaborators
  collaborators: new Map(),

  addCollaborator: (collaborator) => {
    set((state) => {
      const newMap = new Map(state.collaborators);
      newMap.set(collaborator.id, collaborator);
      return { collaborators: newMap };
    });
  },

  removeCollaborator: (id) => {
    set((state) => {
      const newMap = new Map(state.collaborators);
      newMap.delete(id);
      return { collaborators: newMap };
    });
  },

  updateCollaboratorCursor: (id, x, y, slideId) => {
    set((state) => {
      const newMap = new Map(state.collaborators);
      const collaborator = newMap.get(id);
      if (collaborator) {
        newMap.set(id, {
          ...collaborator,
          cursor: { x, y },
          slideId,
          lastActive: new Date(),
        });
      }
      return { collaborators: newMap };
    });
  },

  // Cursor broadcasting
  broadcastCursor: (x, y, slideId) => {
    const socket = get().socket;
    if (socket && get().isConnected) {
      socket.emit('cursor:move', { x, y, slideId });
    }
  },

  // Comments
  comments: [],

  setComments: (comments) => set({ comments }),

  addComment: (comment) => {
    set((state) => ({
      comments: [...state.comments, comment],
    }));
  },

  updateComment: (id, updates) => {
    set((state) => ({
      comments: state.comments.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  },

  removeComment: (id) => {
    set((state) => ({
      comments: state.comments.filter((c) => c.id !== id),
    }));
  },

  // Comment creation mode
  isAddingComment: false,
  setAddingComment: (adding) => set({ isAddingComment: adding }),

  selectedCommentId: null,
  setSelectedComment: (id) => set({ selectedCommentId: id }),

  // Canvas sync
  broadcastCanvasChange: (slideId, data) => {
    const socket = get().socket;
    if (socket && get().isConnected) {
      socket.emit('canvas:change', { slideId, canvasData: data });
    }
  },

  // Current deck
  deckId: null,
  currentSlideId: null,
  setCurrentSlide: (slideId) => set({ currentSlideId: slideId }),
}));
```

---

## Step 2: Create Backend Socket Gateway

**File**: `backend/src/modules/decks/deck-collaboration.gateway.ts`

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

interface CollaboratorInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  deckId: string;
  socketId: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/decks',
})
export class DeckCollaborationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('DeckCollaborationGateway');
  private collaborators = new Map<string, CollaboratorInfo>();
  private deckRooms = new Map<string, Set<string>>(); // deckId -> Set<socketId>

  async handleConnection(client: Socket) {
    const deckId = client.handshake.query.deckId as string;
    const userId = client.handshake.query.userId as string;

    if (!deckId || !userId) {
      this.logger.warn('Connection rejected: missing deckId or userId');
      client.disconnect();
      return;
    }

    // Join the deck room
    client.join(`deck:${deckId}`);

    // Track collaborator
    // In production, fetch user details from database
    const collaboratorInfo: CollaboratorInfo = {
      id: userId,
      name: `User ${userId.slice(0, 4)}`, // Replace with real name
      email: `user-${userId.slice(0, 4)}@example.com`,
      deckId,
      socketId: client.id,
    };

    this.collaborators.set(client.id, collaboratorInfo);

    // Add to deck room tracking
    if (!this.deckRooms.has(deckId)) {
      this.deckRooms.set(deckId, new Set());
    }
    this.deckRooms.get(deckId)!.add(client.id);

    // Notify others in the room
    client.to(`deck:${deckId}`).emit('collaborator:join', {
      id: userId,
      name: collaboratorInfo.name,
      email: collaboratorInfo.email,
    });

    // Send current collaborators to the new client
    const roomMembers = this.deckRooms.get(deckId);
    if (roomMembers) {
      const currentCollaborators = Array.from(roomMembers)
        .filter((socketId) => socketId !== client.id)
        .map((socketId) => this.collaborators.get(socketId))
        .filter((c) => c);

      client.emit('collaborators:list', currentCollaborators);
    }

    this.logger.log(`User ${userId} joined deck ${deckId}`);
  }

  async handleDisconnect(client: Socket) {
    const collaborator = this.collaborators.get(client.id);

    if (collaborator) {
      // Notify others
      client.to(`deck:${collaborator.deckId}`).emit('collaborator:leave', collaborator.id);

      // Remove from tracking
      const roomMembers = this.deckRooms.get(collaborator.deckId);
      if (roomMembers) {
        roomMembers.delete(client.id);
        if (roomMembers.size === 0) {
          this.deckRooms.delete(collaborator.deckId);
        }
      }

      this.collaborators.delete(client.id);
      this.logger.log(`User ${collaborator.id} left deck ${collaborator.deckId}`);
    }
  }

  @SubscribeMessage('cursor:move')
  handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { x: number; y: number; slideId: string },
  ) {
    const collaborator = this.collaborators.get(client.id);
    if (!collaborator) return;

    client.to(`deck:${collaborator.deckId}`).emit('collaborator:cursor', {
      userId: collaborator.id,
      x: data.x,
      y: data.y,
      slideId: data.slideId,
    });
  }

  @SubscribeMessage('canvas:change')
  handleCanvasChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { slideId: string; canvasData: any },
  ) {
    const collaborator = this.collaborators.get(client.id);
    if (!collaborator) return;

    // Broadcast to others in the room
    client.to(`deck:${collaborator.deckId}`).emit('canvas:update', {
      slideId: data.slideId,
      canvasData: data.canvasData,
      userId: collaborator.id,
    });
  }

  @SubscribeMessage('comment:add')
  handleCommentAdd(
    @ConnectedSocket() client: Socket,
    @MessageBody() comment: any,
  ) {
    const collaborator = this.collaborators.get(client.id);
    if (!collaborator) return;

    // Broadcast to all in room (including sender for confirmation)
    this.server.to(`deck:${collaborator.deckId}`).emit('comment:add', comment);
  }

  @SubscribeMessage('comment:update')
  handleCommentUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { id: string; updates: any },
  ) {
    const collaborator = this.collaborators.get(client.id);
    if (!collaborator) return;

    this.server.to(`deck:${collaborator.deckId}`).emit('comment:update', data);
  }

  @SubscribeMessage('comment:delete')
  handleCommentDelete(
    @ConnectedSocket() client: Socket,
    @MessageBody() commentId: string,
  ) {
    const collaborator = this.collaborators.get(client.id);
    if (!collaborator) return;

    this.server.to(`deck:${collaborator.deckId}`).emit('comment:delete', commentId);
  }
}
```

---

## Step 3: Register Gateway in Module

**Edit**: `backend/src/modules/decks/decks.module.ts`

```typescript
import { DeckCollaborationGateway } from './deck-collaboration.gateway';

@Module({
  // ...
  providers: [
    // ... other providers
    DeckCollaborationGateway,
  ],
})
export class DecksModule {}
```

---

## Step 4: Create Collaborator Cursors Component

**File**: `frontend/src/features/deck-editor/components/collaboration/CollaboratorCursors.tsx`

```tsx
import React from 'react';
import { useCollaborationStore, Collaborator } from '../../stores/collaborationStore';

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
```

---

## Step 5: Create Presence Indicator

**File**: `frontend/src/features/deck-editor/components/collaboration/PresenceIndicator.tsx`

```tsx
import React from 'react';
import { Avatar, Tooltip, Badge } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useCollaborationStore } from '../../stores/collaborationStore';

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
        maxCount={4}
        size="small"
        maxStyle={{
          backgroundColor: '#1677ff',
          cursor: 'pointer',
        }}
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
```

---

## Step 6: Create Comments Panel

**File**: `frontend/src/features/deck-editor/components/collaboration/CommentsPanel.tsx`

```tsx
import React, { useState } from 'react';
import { Button, Input, Avatar, Empty, Tooltip, Popconfirm } from 'antd';
import {
  CommentOutlined,
  CloseOutlined,
  CheckOutlined,
  DeleteOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useCollaborationStore, Comment } from '../../stores/collaborationStore';
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
```

---

## Step 7: Create Comment Marker Component

**File**: `frontend/src/features/deck-editor/components/collaboration/CommentMarker.tsx`

```tsx
import React from 'react';
import { Tooltip } from 'antd';
import { CommentOutlined, CheckCircleFilled } from '@ant-design/icons';
import { Comment } from '../../stores/collaborationStore';

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
```

---

## Step 8: Create Comments Overlay

**File**: `frontend/src/features/deck-editor/components/collaboration/CommentsOverlay.tsx`

```tsx
import React, { useCallback } from 'react';
import { useCollaborationStore } from '../../stores/collaborationStore';
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
```

---

## Step 9: Create Add Comment Button

**File**: `frontend/src/features/deck-editor/components/collaboration/AddCommentButton.tsx`

```tsx
import React from 'react';
import { Button, Tooltip } from 'antd';
import { CommentOutlined } from '@ant-design/icons';
import { useCollaborationStore } from '../../stores/collaborationStore';

export const AddCommentButton: React.FC = () => {
  const { isAddingComment, setAddingComment } = useCollaborationStore();

  return (
    <Tooltip title="Add comment (click on slide)">
      <Button
        icon={<CommentOutlined />}
        type={isAddingComment ? 'primary' : 'default'}
        onClick={() => setAddingComment(!isAddingComment)}
      >
        Comment
      </Button>
    </Tooltip>
  );
};

export default AddCommentButton;
```

---

## Step 10: Create Collaboration Hook

**File**: `frontend/src/features/deck-editor/hooks/useCollaboration.ts`

```typescript
import { useEffect, useCallback, useRef } from 'react';
import { useCollaborationStore } from '../stores/collaborationStore';
import { useDeckCanvasStore } from '../stores/deckCanvasStore';

export const useCollaboration = (deckId: string, userId: string) => {
  const {
    connect,
    disconnect,
    broadcastCursor,
    broadcastCanvasChange,
    currentSlideId,
  } = useCollaborationStore();

  const { canvas } = useDeckCanvasStore();
  const lastCursorRef = useRef({ x: 0, y: 0 });
  const throttleRef = useRef<NodeJS.Timeout | null>(null);

  // Connect on mount
  useEffect(() => {
    connect(deckId, userId);

    return () => {
      disconnect();
    };
  }, [deckId, userId, connect, disconnect]);

  // Broadcast cursor position
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!currentSlideId) return;

    // Throttle cursor updates
    if (throttleRef.current) return;

    throttleRef.current = setTimeout(() => {
      throttleRef.current = null;
    }, 50);

    // Get position relative to canvas
    const canvasEl = document.querySelector('.deck-canvas-container');
    if (!canvasEl) return;

    const rect = canvasEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Only broadcast if moved significantly
    if (
      Math.abs(x - lastCursorRef.current.x) > 5 ||
      Math.abs(y - lastCursorRef.current.y) > 5
    ) {
      lastCursorRef.current = { x, y };
      broadcastCursor(x, y, currentSlideId);
    }
  }, [currentSlideId, broadcastCursor]);

  // Listen for mouse movement
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // Listen for canvas changes
  useEffect(() => {
    if (!canvas || !currentSlideId) return;

    const handleModified = () => {
      const json = canvas.toJSON();
      broadcastCanvasChange(currentSlideId, json);
    };

    canvas.on('object:modified', handleModified);
    canvas.on('object:added', handleModified);
    canvas.on('object:removed', handleModified);

    return () => {
      canvas.off('object:modified', handleModified);
      canvas.off('object:added', handleModified);
      canvas.off('object:removed', handleModified);
    };
  }, [canvas, currentSlideId, broadcastCanvasChange]);

  // Listen for remote canvas updates
  useEffect(() => {
    const handleRemoteUpdate = (e: CustomEvent) => {
      if (!canvas || e.detail.slideId !== currentSlideId) return;

      canvas.loadFromJSON(e.detail.canvasData, () => {
        canvas.renderAll();
      });
    };

    window.addEventListener(
      'remote-canvas-update',
      handleRemoteUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        'remote-canvas-update',
        handleRemoteUpdate as EventListener
      );
    };
  }, [canvas, currentSlideId]);
};

export default useCollaboration;
```

---

## Step 11: Export from Feature Index

**Edit**: `frontend/src/features/deck-editor/index.ts`

Add exports:

```typescript
export * from './stores/collaborationStore';
export * from './hooks/useCollaboration';
export * from './components/collaboration/CollaboratorCursors';
export * from './components/collaboration/PresenceIndicator';
export * from './components/collaboration/CommentsPanel';
export * from './components/collaboration/CommentMarker';
export * from './components/collaboration/CommentsOverlay';
export * from './components/collaboration/AddCommentButton';
```

---

## Verification Checklist

After completing all steps:

1. [ ] Backend builds without errors
2. [ ] Frontend builds without errors
3. [ ] Socket.io gateway connects successfully
4. [ ] Multiple users can join the same deck
5. [ ] Cursors appear and move in real-time
6. [ ] User names appear next to cursors
7. [ ] Presence indicator shows online users
8. [ ] Add comment button enables comment mode
9. [ ] Clicking on canvas creates a comment
10. [ ] Comments appear as markers on slide
11. [ ] Comments panel shows all slide comments
12. [ ] Replies can be added to comments
13. [ ] Comments can be resolved
14. [ ] Comments can be deleted
15. [ ] Canvas changes sync between users

---

## Common Issues

1. **Socket not connecting**: Check CORS and WebSocket URL configuration
2. **Cursors not syncing**: Verify event names match between client/server
3. **Canvas conflicts**: Implement operational transform or last-write-wins
4. **Comments not persisting**: Add database persistence for comments
5. **Performance issues**: Throttle cursor updates and canvas broadcasts
