import { useEffect, useState } from 'react';
import { websocketService } from '../services/websocket';

interface User {
  userId: string;
  userName: string;
}

interface CursorPosition {
  userId: string;
  userName: string;
  assetId: string;
  x: number;
  y: number;
}

/**
 * React hook for Media Collaboration WebSocket
 *
 * Handles automatic connection/disconnection and provides
 * real-time collaboration features.
 */
export const useMediaCollabWebSocket = (projectId?: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [usersInProject, setUsersInProject] = useState<User[]>([]);
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());

  useEffect(() => {
    // Get token from localStorage (adjust based on your auth implementation)
    const token = localStorage.getItem('access_token');

    if (!token) {
      console.warn('[useMediaCollabWebSocket] No auth token found');
      return;
    }

    // Connect to WebSocket
    websocketService.connect(token);
    setIsConnected(websocketService.isConnected());

    // Setup event listeners
    const handleUserJoined = (data: User) => {
      setUsersInProject((prev) => [...prev, data]);
    };

    const handleUserLeft = (data: User) => {
      setUsersInProject((prev) => prev.filter((u) => u.userId !== data.userId));
    };

    const handleProjectUsers = (users: User[]) => {
      setUsersInProject(users);
    };

    const handleCursorUpdate = (data: CursorPosition) => {
      setCursors((prev) => {
        const newCursors = new Map(prev);
        newCursors.set(data.userId, data);
        return newCursors;
      });

      // Remove cursor after 2 seconds of inactivity
      setTimeout(() => {
        setCursors((prev) => {
          const newCursors = new Map(prev);
          newCursors.delete(data.userId);
          return newCursors;
        });
      }, 2000);
    };

    websocketService.onUserJoined(handleUserJoined);
    websocketService.onUserLeft(handleUserLeft);
    websocketService.onProjectUsers(handleProjectUsers);
    websocketService.onCursorUpdate(handleCursorUpdate);

    // Cleanup
    return () => {
      websocketService.off('user:joined', handleUserJoined);
      websocketService.off('user:left', handleUserLeft);
      websocketService.off('project:users', handleProjectUsers);
      websocketService.off('cursor:update', handleCursorUpdate);
    };
  }, []);

  // Auto join/leave project
  useEffect(() => {
    if (projectId && isConnected) {
      websocketService.joinProject(projectId);

      return () => {
        websocketService.leaveProject();
      };
    }
  }, [projectId, isConnected]);

  return {
    isConnected,
    usersInProject,
    cursors,
    sendCursorMove: websocketService.sendCursorMove.bind(websocketService),
    sendDrawingAdd: websocketService.sendDrawingAdd.bind(websocketService),
    sendDrawingUpdate: websocketService.sendDrawingUpdate.bind(websocketService),
    sendDrawingDelete: websocketService.sendDrawingDelete.bind(websocketService),
    sendCommentAdd: websocketService.sendCommentAdd.bind(websocketService),
    sendCommentResolve: websocketService.sendCommentResolve.bind(websocketService),
    sendPlayheadSync: websocketService.sendPlayheadSync.bind(websocketService),
    sendAssetViewing: websocketService.sendAssetViewing.bind(websocketService),
    sendAssetStopViewing: websocketService.sendAssetStopViewing.bind(websocketService),
    onDrawingAdded: websocketService.onDrawingAdded.bind(websocketService),
    onDrawingUpdated: websocketService.onDrawingUpdated.bind(websocketService),
    onDrawingDeleted: websocketService.onDrawingDeleted.bind(websocketService),
    onCommentAdded: websocketService.onCommentAdded.bind(websocketService),
    onCommentResolved: websocketService.onCommentResolved.bind(websocketService),
    onPlayheadUpdate: websocketService.onPlayheadUpdate.bind(websocketService),
    onAssetViewerJoined: websocketService.onAssetViewerJoined.bind(websocketService),
    onAssetViewerLeft: websocketService.onAssetViewerLeft.bind(websocketService),
  };
};
