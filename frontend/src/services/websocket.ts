import { io, Socket } from 'socket.io-client';

/**
 * WebSocket Service for Media Collaboration
 *
 * Handles real-time collaboration features via Socket.IO:
 * - Live cursor tracking
 * - Real-time drawing synchronization
 * - Comment notifications
 * - Presence system
 * - Playhead synchronization
 */
class WebSocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private currentProjectId: string | null = null;

  /**
   * Initialize WebSocket connection
   */
  connect(token: string): void {
    if (this.socket?.connected) {
      return; // Already connected
    }

    this.token = token;

    // Determine WebSocket URL based on environment
    const wsUrl = import.meta.env.PROD
      ? 'https://ws.monomiagency.com/media-collab'  // Production: Dedicated WebSocket subdomain via Cloudflare Tunnel #2
      : 'http://localhost:5000/media-collab';        // Development: Same port as main app

    // Connect to WebSocket - Socket.IO will upgrade HTTP/HTTPS to WebSocket
    this.socket = io(wsUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected to media collaboration server');
    });

    this.socket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected from media collaboration server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentProjectId = null;
    }
  }

  /**
   * Join a project room
   */
  joinProject(projectId: string): void {
    if (!this.socket) {
      console.warn('[WebSocket] Cannot join project: Not connected');
      return;
    }

    this.currentProjectId = projectId;
    this.socket.emit('project:join', { projectId });
  }

  /**
   * Leave current project room
   */
  leaveProject(): void {
    if (!this.socket || !this.currentProjectId) {
      return;
    }

    this.socket.emit('project:leave', { projectId: this.currentProjectId });
    this.currentProjectId = null;
  }

  /**
   * Send cursor position
   */
  sendCursorMove(assetId: string, x: number, y: number): void {
    if (!this.socket) return;

    this.socket.emit('cursor:move', { assetId, x, y });
  }

  /**
   * Send drawing add event
   */
  sendDrawingAdd(assetId: string, timecode: number, drawingData: any): void {
    if (!this.socket) return;

    this.socket.emit('drawing:add', { assetId, timecode, drawingData });
  }

  /**
   * Send drawing update event
   */
  sendDrawingUpdate(drawingId: string, drawingData: any): void {
    if (!this.socket) return;

    this.socket.emit('drawing:update', { drawingId, drawingData });
  }

  /**
   * Send drawing delete event
   */
  sendDrawingDelete(drawingId: string): void {
    if (!this.socket) return;

    this.socket.emit('drawing:delete', { drawingId });
  }

  /**
   * Send new comment event
   */
  sendCommentAdd(
    assetId: string,
    commentId: string,
    content: string,
    timecode?: number,
  ): void {
    if (!this.socket) return;

    this.socket.emit('comment:add', { assetId, commentId, content, timecode });
  }

  /**
   * Send comment resolve event
   */
  sendCommentResolve(commentId: string): void {
    if (!this.socket) return;

    this.socket.emit('comment:resolve', { commentId });
  }

  /**
   * Sync playhead position
   */
  sendPlayheadSync(assetId: string, timecode: number, isPlaying: boolean): void {
    if (!this.socket) return;

    this.socket.emit('playhead:sync', { assetId, timecode, isPlaying });
  }

  /**
   * Notify that user is viewing an asset
   */
  sendAssetViewing(assetId: string): void {
    if (!this.socket) return;

    this.socket.emit('asset:viewing', { assetId });
  }

  /**
   * Notify that user stopped viewing an asset
   */
  sendAssetStopViewing(assetId: string): void {
    if (!this.socket) return;

    this.socket.emit('asset:stop-viewing', { assetId });
  }

  /**
   * Subscribe to user joined event
   */
  onUserJoined(callback: (data: { userId: string; userName: string }) => void): void {
    this.socket?.on('user:joined', callback);
  }

  /**
   * Subscribe to user left event
   */
  onUserLeft(callback: (data: { userId: string; userName: string }) => void): void {
    this.socket?.on('user:left', callback);
  }

  /**
   * Subscribe to project users list
   */
  onProjectUsers(callback: (users: { userId: string; userName: string }[]) => void): void {
    this.socket?.on('project:users', callback);
  }

  /**
   * Subscribe to cursor updates
   */
  onCursorUpdate(
    callback: (data: {
      userId: string;
      userName: string;
      assetId: string;
      x: number;
      y: number;
    }) => void,
  ): void {
    this.socket?.on('cursor:update', callback);
  }

  /**
   * Subscribe to drawing added events
   */
  onDrawingAdded(
    callback: (data: {
      userId: string;
      userName: string;
      assetId: string;
      timecode: number;
      drawingData: any;
    }) => void,
  ): void {
    this.socket?.on('drawing:added', callback);
  }

  /**
   * Subscribe to drawing updated events
   */
  onDrawingUpdated(
    callback: (data: { userId: string; drawingId: string; drawingData: any }) => void,
  ): void {
    this.socket?.on('drawing:updated', callback);
  }

  /**
   * Subscribe to drawing deleted events
   */
  onDrawingDeleted(callback: (data: { userId: string; drawingId: string }) => void): void {
    this.socket?.on('drawing:deleted', callback);
  }

  /**
   * Subscribe to comment added events
   */
  onCommentAdded(
    callback: (data: {
      userId: string;
      userName: string;
      assetId: string;
      commentId: string;
      content: string;
      timecode?: number;
    }) => void,
  ): void {
    this.socket?.on('comment:added', callback);
  }

  /**
   * Subscribe to comment resolved events
   */
  onCommentResolved(
    callback: (data: { userId: string; userName: string; commentId: string }) => void,
  ): void {
    this.socket?.on('comment:resolved', callback);
  }

  /**
   * Subscribe to playhead updates
   */
  onPlayheadUpdate(
    callback: (data: {
      userId: string;
      userName: string;
      assetId: string;
      timecode: number;
      isPlaying: boolean;
    }) => void,
  ): void {
    this.socket?.on('playhead:update', callback);
  }

  /**
   * Subscribe to asset viewer joined events
   */
  onAssetViewerJoined(
    callback: (data: { userId: string; userName: string; assetId: string }) => void,
  ): void {
    this.socket?.on('asset:viewer-joined', callback);
  }

  /**
   * Subscribe to asset viewer left events
   */
  onAssetViewerLeft(
    callback: (data: { userId: string; userName: string; assetId: string }) => void,
  ): void {
    this.socket?.on('asset:viewer-left', callback);
  }

  /**
   * Subscribe to bulk download progress events
   */
  onBulkDownloadProgress(
    callback: (data: {
      jobId: string;
      current: number;
      total: number;
      percent: number;
      currentFile?: string;
    }) => void,
  ): void {
    this.socket?.on('bulk-download:progress', callback);
  }

  /**
   * Subscribe to bulk download complete events
   */
  onBulkDownloadComplete(
    callback: (data: {
      jobId: string;
      downloadUrl: string;
      expiresAt: string;
      fileCount: number;
      zipSize: number;
    }) => void,
  ): void {
    this.socket?.on('bulk-download:complete', callback);
  }

  /**
   * Subscribe to bulk download failed events
   */
  onBulkDownloadFailed(
    callback: (data: {
      jobId: string;
      error: string;
      failedAt: string;
    }) => void,
  ): void {
    this.socket?.on('bulk-download:failed', callback);
  }

  /**
   * Generic on method for custom events
   * Use this when you need to subscribe to events that don't have a dedicated method
   */
  on(event: string, callback: (...args: any[]) => void): void {
    this.socket?.on(event, callback);
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.socket?.removeAllListeners();
  }

  /**
   * Remove specific event listener
   */
  off(event: string, callback?: (...args: any[]) => void): void {
    this.socket?.off(event, callback);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get the socket instance (for advanced use cases)
   * Note: Prefer using the dedicated methods instead
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

export const websocketService = new WebSocketService();
