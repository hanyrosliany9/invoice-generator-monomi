import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { InviteCollaboratorDto } from "../dto/invite-collaborator.dto";
import { generateInviteToken } from "../utils/deck-share.util";

@Injectable()
export class DeckCollaboratorsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.deckCollaborator.create({
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
      include: { deck: { select: { id: true, title: true } } },
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
