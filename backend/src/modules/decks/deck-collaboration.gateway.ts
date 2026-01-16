import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";

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
    origin: process.env.SOCKET_IO_CORS_ORIGIN || "http://localhost:3001",
  },
  namespace: "/decks",
})
export class DeckCollaborationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger("DeckCollaborationGateway");
  private collaborators = new Map<string, CollaboratorInfo>();
  private deckRooms = new Map<string, Set<string>>(); // deckId -> Set<socketId>

  async handleConnection(client: Socket) {
    const deckId = client.handshake.query.deckId as string;
    const userId = client.handshake.query.userId as string;

    if (!deckId || !userId) {
      this.logger.warn("Connection rejected: missing deckId or userId");
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
    client.to(`deck:${deckId}`).emit("collaborator:join", {
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

      client.emit("collaborators:list", currentCollaborators);
    }

    this.logger.log(`User ${userId} joined deck ${deckId}`);
  }

  async handleDisconnect(client: Socket) {
    const collaborator = this.collaborators.get(client.id);

    if (collaborator) {
      // Notify others
      client
        .to(`deck:${collaborator.deckId}`)
        .emit("collaborator:leave", collaborator.id);

      // Remove from tracking
      const roomMembers = this.deckRooms.get(collaborator.deckId);
      if (roomMembers) {
        roomMembers.delete(client.id);
        if (roomMembers.size === 0) {
          this.deckRooms.delete(collaborator.deckId);
        }
      }

      this.collaborators.delete(client.id);
      this.logger.log(
        `User ${collaborator.id} left deck ${collaborator.deckId}`,
      );
    }
  }

  @SubscribeMessage("cursor:move")
  handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { x: number; y: number; slideId: string },
  ) {
    const collaborator = this.collaborators.get(client.id);
    if (!collaborator) return;

    client.to(`deck:${collaborator.deckId}`).emit("collaborator:cursor", {
      userId: collaborator.id,
      x: data.x,
      y: data.y,
      slideId: data.slideId,
    });
  }

  @SubscribeMessage("canvas:change")
  handleCanvasChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { slideId: string; canvasData: any },
  ) {
    const collaborator = this.collaborators.get(client.id);
    if (!collaborator) return;

    // Broadcast to others in the room
    client.to(`deck:${collaborator.deckId}`).emit("canvas:update", {
      slideId: data.slideId,
      canvasData: data.canvasData,
      userId: collaborator.id,
    });
  }

  @SubscribeMessage("comment:add")
  handleCommentAdd(
    @ConnectedSocket() client: Socket,
    @MessageBody() comment: any,
  ) {
    const collaborator = this.collaborators.get(client.id);
    if (!collaborator) return;

    // Broadcast to all in room (including sender for confirmation)
    this.server.to(`deck:${collaborator.deckId}`).emit("comment:add", comment);
  }

  @SubscribeMessage("comment:update")
  handleCommentUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { id: string; updates: any },
  ) {
    const collaborator = this.collaborators.get(client.id);
    if (!collaborator) return;

    this.server.to(`deck:${collaborator.deckId}`).emit("comment:update", data);
  }

  @SubscribeMessage("comment:delete")
  handleCommentDelete(
    @ConnectedSocket() client: Socket,
    @MessageBody() commentId: string,
  ) {
    const collaborator = this.collaborators.get(client.id);
    if (!collaborator) return;

    this.server
      .to(`deck:${collaborator.deckId}`)
      .emit("comment:delete", commentId);
  }
}
