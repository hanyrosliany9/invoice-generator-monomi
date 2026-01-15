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
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DownloadProgressDto } from './dto/download.dto';

@WebSocketGateway({
  namespace: 'pinterest',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class PinterestGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PinterestGateway.name);
  private connectedClients: Map<string, { socket: Socket; userId: string }> = new Map();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake
      const token = client.handshake.auth?.token || client.handshake.query?.token;

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token as string);
      const userId = payload.sub || payload.userId;

      if (!userId) {
        this.logger.warn(`Client ${client.id} has invalid token payload`);
        client.disconnect();
        return;
      }

      // Store client connection
      this.connectedClients.set(client.id, { socket: client, userId });

      // Join user-specific room
      client.join(`user:${userId}`);

      this.logger.log(`Client ${client.id} connected (user: ${userId})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Client ${client.id} authentication failed: ${errorMessage}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const clientData = this.connectedClients.get(client.id);
    if (clientData) {
      this.logger.log(`Client ${client.id} disconnected (user: ${clientData.userId})`);
      this.connectedClients.delete(client.id);
    }
  }

  /**
   * Subscribe to download progress for a specific job
   */
  @SubscribeMessage('subscribe:job')
  handleSubscribeJob(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { jobId: string },
  ) {
    const clientData = this.connectedClients.get(client.id);
    if (!clientData) return;

    client.join(`job:${data.jobId}`);
    this.logger.log(`Client ${client.id} subscribed to job ${data.jobId}`);
  }

  /**
   * Unsubscribe from download progress
   */
  @SubscribeMessage('unsubscribe:job')
  handleUnsubscribeJob(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { jobId: string },
  ) {
    client.leave(`job:${data.jobId}`);
    this.logger.log(`Client ${client.id} unsubscribed from job ${data.jobId}`);
  }

  /**
   * Emit progress update to a specific user
   */
  emitProgress(userId: string, progress: DownloadProgressDto) {
    this.server.to(`user:${userId}`).emit('download:progress', progress);
    this.server.to(`job:${progress.jobId}`).emit('download:progress', progress);
  }

  /**
   * Emit completion notification to a specific user
   */
  emitCompleted(userId: string, jobId: string, result: {
    status: string;
    totalPins: number;
    downloadedPins: number;
    failedPins: number;
    skippedPins: number;
  }) {
    this.server.to(`user:${userId}`).emit('download:completed', { jobId, ...result });
    this.server.to(`job:${jobId}`).emit('download:completed', { jobId, ...result });
  }

  /**
   * Emit error notification to a specific user
   */
  emitError(userId: string, jobId: string, error: string) {
    this.server.to(`user:${userId}`).emit('download:error', { jobId, error });
    this.server.to(`job:${jobId}`).emit('download:error', { jobId, error });
  }
}
