import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../../notifications/notifications.service";
import { InviteCollaboratorDto } from "../dto/invite-collaborator.dto";
import { generateInviteToken } from "../utils/deck-share.util";

@Injectable()
export class DeckCollaboratorsService {
  private readonly logger = new Logger(DeckCollaboratorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  async invite(userId: string, dto: InviteCollaboratorDto) {
    // Verify deck and permission
    const deck = await this.prisma.deck.findUnique({
      where: { id: dto.deckId },
      include: { collaborators: { where: { userId } } },
    });

    if (!deck) throw new NotFoundException("Deck not found");

    const inviter = deck.collaborators[0];
    if (!inviter || !["OWNER", "EDITOR"].includes(inviter.role)) {
      throw new ForbiddenException("Invite permission required");
    }

    // Cannot invite as higher role than self
    const roleHierarchy = ["VIEWER", "COMMENTER", "EDITOR", "OWNER"];
    if (roleHierarchy.indexOf(dto.role) > roleHierarchy.indexOf(inviter.role)) {
      throw new ForbiddenException("Cannot assign role higher than your own");
    }

    // Either userId or guestEmail required
    if (!dto.userId && !dto.guestEmail) {
      throw new BadRequestException("Either userId or guestEmail required");
    }

    // Check existing
    const existing = await this.prisma.deckCollaborator.findFirst({
      where: {
        deckId: dto.deckId,
        OR: [{ userId: dto.userId }, { guestEmail: dto.guestEmail }].filter(
          Boolean,
        ),
      },
    });

    if (existing) {
      throw new BadRequestException("User already has access");
    }

    const inviteToken = dto.guestEmail ? generateInviteToken() : undefined;
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : undefined;

    const collaborator = await this.prisma.deckCollaborator.create({
      data: {
        deckId: dto.deckId,
        userId: dto.userId,
        guestEmail: dto.guestEmail,
        guestName: dto.guestName,
        role: dto.role,
        inviteToken,
        invitedBy: userId,
        status: dto.userId ? "ACCEPTED" : "PENDING",
        acceptedAt: dto.userId ? new Date() : undefined,
        expiresAt,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        inviter: { select: { id: true, name: true } },
      },
    });

    // FIX4: Send invite email to guest email (never throw on failure)
    if (dto.guestEmail && inviteToken) {
      try {
        const frontendUrl =
          this.configService.get<string>("FRONTEND_URL") ||
          "http://localhost:3000";
        const inviteLink = `${frontendUrl}/deck/invite/${inviteToken}`;
        await this.notificationsService.sendDeckInvite(
          collaborator.id,
          inviteLink,
        );
      } catch (err) {
        this.logger.error(
          `Failed to send deck invite email for collaborator ${collaborator.id}:`,
          err,
        );
      }
    }

    return collaborator;
  }

  async acceptInvite(
    token: string,
    guestInfo: { name: string; email: string },
  ) {
    const invite = await this.prisma.deckCollaborator.findUnique({
      where: { inviteToken: token },
      include: { deck: true },
    });

    if (!invite) throw new NotFoundException("Invite not found");

    if (invite.status !== "PENDING") {
      throw new BadRequestException("Invite already processed");
    }

    if (invite.expiresAt && new Date() > invite.expiresAt) {
      await this.prisma.deckCollaborator.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
      throw new BadRequestException("Invite expired");
    }

    return this.prisma.deckCollaborator.update({
      where: { id: invite.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        guestName: guestInfo.name || invite.guestName,
      },
      // Include the public-share fields so the accept-invite page can route a
      // guest to the public viewer (it needs the share token, not the invite one).
      include: {
        deck: {
          select: {
            id: true,
            title: true,
            isPublic: true,
            publicShareToken: true,
          },
        },
      },
    });
  }

  async updateRole(collaboratorId: string, userId: string, newRole: string) {
    const collab = await this.prisma.deckCollaborator.findUnique({
      where: { id: collaboratorId },
      include: { deck: { include: { collaborators: { where: { userId } } } } },
    });

    if (!collab) throw new NotFoundException("Collaborator not found");

    const currentUser = collab.deck.collaborators[0];
    if (!currentUser || currentUser.role !== "OWNER") {
      throw new ForbiddenException("Only owner can change roles");
    }

    // Cannot change owner role
    if (collab.role === "OWNER") {
      throw new ForbiddenException("Cannot change owner role");
    }

    return this.prisma.deckCollaborator.update({
      where: { id: collaboratorId },
      data: { role: newRole as any },
    });
  }

  async remove(collaboratorId: string, userId: string) {
    const collab = await this.prisma.deckCollaborator.findUnique({
      where: { id: collaboratorId },
      include: { deck: { include: { collaborators: { where: { userId } } } } },
    });

    if (!collab) throw new NotFoundException("Collaborator not found");

    const currentUser = collab.deck.collaborators[0];

    // Owner can remove anyone except themselves
    // Others can only remove themselves
    const isOwner = currentUser?.role === "OWNER";
    const isSelf = collab.userId === userId;

    if (!isOwner && !isSelf) {
      throw new ForbiddenException("Permission denied");
    }

    if (collab.role === "OWNER") {
      throw new ForbiddenException("Cannot remove owner");
    }

    await this.prisma.deckCollaborator.delete({
      where: { id: collaboratorId },
    });
    return { success: true };
  }

  async findByDeck(deckId: string, userId: string) {
    // Verify access
    const hasAccess = await this.prisma.deckCollaborator.findFirst({
      where: { deckId, userId, status: "ACCEPTED" },
    });

    if (!hasAccess) throw new ForbiddenException("Access denied");

    return this.prisma.deckCollaborator.findMany({
      where: { deckId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        inviter: { select: { id: true, name: true } },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });
  }
}
