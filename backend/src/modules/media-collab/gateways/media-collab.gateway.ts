import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger, UseGuards } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

/**
 * MediaCollabGateway
 *
 * WebSocket gateway for real-time collaboration features:
 * - Live cursor tracking
 * - Real-time drawing synchronization
 * - Comment notifications
 * - Presence system (who's viewing what)
 * - Playhead synchronization for video review
 *
 * Uses same port as main HTTP server (5000) - WebSocket upgrades handled by nginx
 * Production: ws.monomiagency.com → nginx:80 → app:5000
 * Development: localhost:5000
 */
@WebSocketGateway({
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? [
            process.env.FRONTEND_URL,
            process.env.PUBLIC_URL,
            process.env.WEBSOCKET_CORS_ORIGIN,
          ].filter(Boolean)
        : ["http://localhost:3001", "http://localhost:3000"],
    credentials: true,
  },
  namespace: "/media-collab",
  transports: ["websocket", "polling"],
})
export class MediaCollabGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MediaCollabGateway.name);
  private userSessions = new Map<
    string,
    { userId: string; userName: string; projectId: string }
  >();

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Handle client connection
   */
  async handleConnection(client: Socket) {
    try {
      // Extract JWT token from handshake
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(" ")[1];

      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected: No token`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub;
      const userName = payload.email || payload.username;

      this.logger.log(`Client connected: ${client.id} (User: ${userName})`);

      // Store session info
      this.userSessions.set(client.id, {
        userId,
        userName,
        projectId: "", // Will be set when joining a project room
      });

      // Join user-specific room for direct notifications (e.g., bulk download progress)
      client.join(`user:${userId}`);
      this.logger.debug(`Client ${client.id} joined user room: user:${userId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Authentication failed for client ${client.id}:`,
        errorMessage,
      );
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    const session = this.userSessions.get(client.id);

    if (session?.projectId) {
      // Notify other users in the project
      client.to(`project:${session.projectId}`).emit("user:left", {
        userId: session.userId,
        userName: session.userName,
      });
    }

    this.userSessions.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Join a project room
   */
  @SubscribeMessage("project:join")
  async handleJoinProject(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.userSessions.get(client.id);
    if (!session) return;

    const roomName = `project:${data.projectId}`;

    // Leave previous project room if any
    if (session.projectId) {
      client.leave(`project:${session.projectId}`);
    }

    // Join new project room
    client.join(roomName);
    session.projectId = data.projectId;

    this.logger.log(
      `User ${session.userName} joined project ${data.projectId}`,
    );

    // Notify others in the room
    client.to(roomName).emit("user:joined", {
      userId: session.userId,
      userName: session.userName,
    });

    // Send current users in room to the new joiner
    const usersInRoom = Array.from(this.userSessions.entries())
      .filter(([_, s]) => s.projectId === data.projectId)
      .map(([_, s]) => ({ userId: s.userId, userName: s.userName }));

    client.emit("project:users", usersInRoom);
  }

  /**
   * Leave a project room
   */
  @SubscribeMessage("project:leave")
  handleLeaveProject(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.userSessions.get(client.id);
    if (!session) return;

    const roomName = `project:${data.projectId}`;
    client.leave(roomName);

    // Notify others
    client.to(roomName).emit("user:left", {
      userId: session.userId,
      userName: session.userName,
    });

    session.projectId = "";
    this.logger.log(`User ${session.userName} left project ${data.projectId}`);
  }

  /**
   * Broadcast cursor position
   */
  @SubscribeMessage("cursor:move")
  handleCursorMove(
    @MessageBody() data: { assetId: string; x: number; y: number },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.userSessions.get(client.id);
    if (!session?.projectId) return;

    client.to(`project:${session.projectId}`).emit("cursor:update", {
      userId: session.userId,
      userName: session.userName,
      assetId: data.assetId,
      x: data.x,
      y: data.y,
    });
  }

  /**
   * Broadcast drawing actions in real-time
   */
  @SubscribeMessage("drawing:add")
  handleDrawingAdd(
    @MessageBody()
    data: { assetId: string; timecode: number; drawingData: any },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.userSessions.get(client.id);
    if (!session?.projectId) return;

    client.to(`project:${session.projectId}`).emit("drawing:added", {
      userId: session.userId,
      userName: session.userName,
      assetId: data.assetId,
      timecode: data.timecode,
      drawingData: data.drawingData,
    });
  }

  /**
   * Broadcast drawing updates
   */
  @SubscribeMessage("drawing:update")
  handleDrawingUpdate(
    @MessageBody() data: { drawingId: string; drawingData: any },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.userSessions.get(client.id);
    if (!session?.projectId) return;

    client.to(`project:${session.projectId}`).emit("drawing:updated", {
      userId: session.userId,
      drawingId: data.drawingId,
      drawingData: data.drawingData,
    });
  }

  /**
   * Broadcast drawing deletion
   */
  @SubscribeMessage("drawing:delete")
  handleDrawingDelete(
    @MessageBody() data: { drawingId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.userSessions.get(client.id);
    if (!session?.projectId) return;

    client.to(`project:${session.projectId}`).emit("drawing:deleted", {
      userId: session.userId,
      drawingId: data.drawingId,
    });
  }

  /**
   * Broadcast new comment
   */
  @SubscribeMessage("comment:add")
  handleCommentAdd(
    @MessageBody()
    data: {
      assetId: string;
      commentId: string;
      content: string;
      timecode?: number;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.userSessions.get(client.id);
    if (!session?.projectId) return;

    client.to(`project:${session.projectId}`).emit("comment:added", {
      userId: session.userId,
      userName: session.userName,
      assetId: data.assetId,
      commentId: data.commentId,
      content: data.content,
      timecode: data.timecode,
    });
  }

  /**
   * Broadcast comment resolution
   */
  @SubscribeMessage("comment:resolve")
  handleCommentResolve(
    @MessageBody() data: { commentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.userSessions.get(client.id);
    if (!session?.projectId) return;

    client.to(`project:${session.projectId}`).emit("comment:resolved", {
      userId: session.userId,
      userName: session.userName,
      commentId: data.commentId,
    });
  }

  /**
   * Synchronize video playhead position
   */
  @SubscribeMessage("playhead:sync")
  handlePlayheadSync(
    @MessageBody()
    data: { assetId: string; timecode: number; isPlaying: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.userSessions.get(client.id);
    if (!session?.projectId) return;

    client.to(`project:${session.projectId}`).emit("playhead:update", {
      userId: session.userId,
      userName: session.userName,
      assetId: data.assetId,
      timecode: data.timecode,
      isPlaying: data.isPlaying,
    });
  }

  /**
   * Broadcast when user starts viewing an asset
   */
  @SubscribeMessage("asset:viewing")
  handleAssetViewing(
    @MessageBody() data: { assetId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.userSessions.get(client.id);
    if (!session?.projectId) return;

    client.to(`project:${session.projectId}`).emit("asset:viewer-joined", {
      userId: session.userId,
      userName: session.userName,
      assetId: data.assetId,
    });
  }

  /**
   * Broadcast when user stops viewing an asset
   */
  @SubscribeMessage("asset:stop-viewing")
  handleAssetStopViewing(
    @MessageBody() data: { assetId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.userSessions.get(client.id);
    if (!session?.projectId) return;

    client.to(`project:${session.projectId}`).emit("asset:viewer-left", {
      userId: session.userId,
      userName: session.userName,
      assetId: data.assetId,
    });
  }

  /**
   * Emit event to a specific user by userId
   * Used for user-specific notifications like bulk download progress
   */
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
    this.logger.debug(`Emitted ${event} to user:${userId}`);
  }

  /**
   * Emit event to all users in a project
   */
  emitToProject(projectId: string, event: string, data: any) {
    this.server.to(`project:${projectId}`).emit(event, data);
    this.logger.debug(`Emitted ${event} to project:${projectId}`);
  }
}
