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

export interface CommentReply {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
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

    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5000';
    // Note: Socket.io namespaces are specified in the URL path, not as a config option
    const socket = io(`${wsUrl}/decks`, {
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

export default useCollaborationStore;
