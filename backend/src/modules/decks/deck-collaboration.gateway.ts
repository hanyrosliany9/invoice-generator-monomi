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
import { Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";

interface CollaboratorInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  deckId: string;
  socketId: string;
}

@Injectable()
@WebSocketGateway({
  cors: {
    // Mirror the app's frontend origin. In dev we reflect any origin so the
    // hybrid frontend (:3000 / the dev tunnel) can connect; in production we do
    // NOT fall back to reflecting all origins — set SOCKET_IO_CORS_ORIGIN /
    // FRONTEND_URL / PUBLIC_URL (same-origin deploys behind nginx need no CORS).
    origin:
      process.env.SOCKET_IO_CORS_ORIGIN ||
      process.env.FRONTEND_URL ||
      process.env.PUBLIC_URL ||
      (process.env.NODE_ENV === "production" ? false : true),
    credentials: true,
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    const deckId = client.handshake.query.deckId as string;

    if (!deckId) {
      this.logger.warn("Connection rejected: missing deckId");
      client.disconnect();
      return;
    }

    // --- Cryptographic JWT verification ---
    // Accept the token from handshake.auth.token first (the preferred location
    // set by the frontend collaborationStore), then fall back to query.token for
    // backward-compatibility with any older clients.
    const rawToken =
      (client.handshake.auth as Record<string, string>)?.token ||
      (client.handshake.query.token as string | undefined);

    if (!rawToken) {
      this.logger.warn(
        `Connection rejected for deck ${deckId}: no JWT token in handshake`,
      );
      client.disconnect();
      return;
    }

    let userId: string;
    try {
      const payload = this.jwtService.verify<{ sub: string }>(rawToken);
      // The verified `sub` claim is the authoritative user identity.
      // The query.userId sent by the client is intentionally ignored/overridden
      // so a tampered query param cannot impersonate another user.
      userId = payload.sub;
    } catch (err) {
      this.logger.warn(
        `Connection rejected for deck ${deckId}: invalid or expired JWT — ${(err as Error).message}`,
      );
      client.disconnect();
      return;
    }

    // --- DB membership check (owner or ACCEPTED collaborator) ---
    try {
      // The deck owner (createdById) is NOT stored as a DeckCollaborator row, so
      // check ownership first — otherwise owners would be rejected from editing
      // their own deck. Fall back to an ACCEPTED collaborator row for guests/
      // invited editors.
      const deck = await this.prisma.deck.findUnique({
        where: { id: deckId },
        select: {
          createdById: true,
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      if (!deck) {
        this.logger.warn(`Connection rejected: deck ${deckId} not found`);
        client.disconnect();
        return;
      }

      const isOwner = deck.createdById === userId;

      const membership = isOwner
        ? null
        : await this.prisma.deckCollaborator.findFirst({
            where: { deckId, userId, status: "ACCEPTED" },
            include: { user: { select: { id: true, name: true, email: true } } },
          });

      if (!isOwner && !membership) {
        this.logger.warn(
          `Connection rejected: userId ${userId} is not the owner or an accepted collaborator of deck ${deckId}`,
        );
        client.disconnect();
        return;
      }

      // Use real name/email from DB instead of fabricated placeholder values.
      const collaboratorInfo: CollaboratorInfo = {
        id: userId,
        name: isOwner
          ? deck.createdBy?.name ?? `User ${userId.slice(0, 4)}`
          : membership!.user?.name ?? membership!.guestName ?? `User ${userId.slice(0, 4)}`,
        email: isOwner
          ? deck.createdBy?.email ?? ""
          : membership!.user?.email ?? membership!.guestEmail ?? "",
        deckId,
        socketId: client.id,
      };

      // Join the deck room
      client.join(`deck:${deckId}`);

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
    } catch (err) {
      this.logger.error(
        `handleConnection error for userId ${userId} / deckId ${deckId}:`,
        err,
      );
      client.disconnect();
    }
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
