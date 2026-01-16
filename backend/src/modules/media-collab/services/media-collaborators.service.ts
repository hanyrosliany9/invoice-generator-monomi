import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCollaboratorDto } from "../dto/create-collaborator.dto";
import { UpdateCollaboratorDto } from "../dto/update-collaborator.dto";
import { InviteGuestDto } from "../dto/invite-guest.dto";
import { CollaboratorRole } from "@prisma/client";
import {
  generateSecureToken,
  generateGuestInviteLink,
} from "../utils/token.util";
import { addDays } from "date-fns";

/**
 * MediaCollaboratorsService
 *
 * Handles collaborator management for media projects.
 */
@Injectable()
export class MediaCollaboratorsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all collaborators for a project
   */
  async getProjectCollaborators(projectId: string) {
    const project = await this.prisma.mediaProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    return this.prisma.mediaCollaborator.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { addedAt: "desc" },
    });
  }

  /**
   * Add a collaborator to a project
   */
  async addCollaborator(
    projectId: string,
    dto: CreateCollaboratorDto,
    invitedBy: string,
  ) {
    // Check if project exists
    const project = await this.prisma.mediaProject.findUnique({
      where: { id: projectId },
      include: {
        collaborators: {
          where: { userId: invitedBy },
        },
      },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    // Check if inviter has permission (must be OWNER or EDITOR)
    const inviterCollaborator = project.collaborators[0];
    const allowedRoles: CollaboratorRole[] = [
      CollaboratorRole.OWNER,
      CollaboratorRole.EDITOR,
    ];
    if (
      project.createdBy !== invitedBy &&
      (!inviterCollaborator || !allowedRoles.includes(inviterCollaborator.role))
    ) {
      throw new ForbiddenException(
        "You do not have permission to add collaborators",
      );
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if user is already a collaborator
    const existingCollaborator = await this.prisma.mediaCollaborator.findUnique(
      {
        where: {
          projectId_userId: {
            projectId,
            userId: dto.userId,
          },
        },
      },
    );

    if (existingCollaborator) {
      throw new BadRequestException("User is already a collaborator");
    }

    return this.prisma.mediaCollaborator.create({
      data: {
        projectId,
        userId: dto.userId,
        role: dto.role,
        invitedBy,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Update collaborator role
   */
  async updateCollaborator(
    projectId: string,
    collaboratorId: string,
    dto: UpdateCollaboratorDto,
    userId: string,
  ) {
    // Check if project exists and user has permission
    const project = await this.prisma.mediaProject.findUnique({
      where: { id: projectId },
      include: {
        collaborators: {
          where: { userId },
        },
      },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    // Check if user has permission (must be OWNER or project creator)
    const userCollaborator = project.collaborators[0];
    if (
      project.createdBy !== userId &&
      (!userCollaborator || userCollaborator.role !== CollaboratorRole.OWNER)
    ) {
      throw new ForbiddenException(
        "You do not have permission to update collaborator roles",
      );
    }

    // Find the collaborator to update
    const collaborator = await this.prisma.mediaCollaborator.findUnique({
      where: { id: collaboratorId },
    });

    if (!collaborator || collaborator.projectId !== projectId) {
      throw new NotFoundException("Collaborator not found");
    }

    // Prevent changing the project creator's role
    if (collaborator.userId === project.createdBy) {
      throw new BadRequestException("Cannot change the project creator's role");
    }

    return this.prisma.mediaCollaborator.update({
      where: { id: collaboratorId },
      data: { role: dto.role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Remove a collaborator from a project
   */
  async removeCollaborator(
    projectId: string,
    collaboratorId: string,
    userId: string,
  ) {
    // Check if project exists and user has permission
    const project = await this.prisma.mediaProject.findUnique({
      where: { id: projectId },
      include: {
        collaborators: {
          where: { userId },
        },
      },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    // Find the collaborator to remove
    const collaborator = await this.prisma.mediaCollaborator.findUnique({
      where: { id: collaboratorId },
    });

    if (!collaborator || collaborator.projectId !== projectId) {
      throw new NotFoundException("Collaborator not found");
    }

    // Prevent removing the project creator
    if (collaborator.userId === project.createdBy) {
      throw new BadRequestException("Cannot remove the project creator");
    }

    // Check if user has permission (must be OWNER, project creator, or removing themselves)
    const userCollaborator = project.collaborators[0];
    if (
      project.createdBy !== userId &&
      collaborator.userId !== userId &&
      (!userCollaborator || userCollaborator.role !== CollaboratorRole.OWNER)
    ) {
      throw new ForbiddenException(
        "You do not have permission to remove collaborators",
      );
    }

    await this.prisma.mediaCollaborator.delete({
      where: { id: collaboratorId },
    });

    return { message: "Collaborator removed successfully" };
  }

  /**
   * Invite a guest collaborator (external user without system account)
   */
  async inviteGuest(projectId: string, userId: string, dto: InviteGuestDto) {
    // Verify user has OWNER or EDITOR role on project
    await this.verifyProjectAccess(projectId, userId, [
      CollaboratorRole.OWNER,
      CollaboratorRole.EDITOR,
    ]);

    // Check if guest already invited
    const existing = await this.prisma.mediaCollaborator.findFirst({
      where: {
        projectId,
        guestEmail: dto.email,
      },
    });

    if (existing) {
      throw new BadRequestException("Guest already invited to this project");
    }

    // Generate secure invite token
    const inviteToken = generateSecureToken();
    const expiresAt = addDays(new Date(), dto.expiresInDays || 30);

    // Create guest collaborator
    const collaborator = await this.prisma.mediaCollaborator.create({
      data: {
        projectId,
        guestEmail: dto.email,
        guestName: dto.name,
        role: dto.role,
        inviteToken,
        status: "PENDING",
        expiresAt,
        invitedBy: userId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // TODO: Send email with invite link (Phase 4)
    // await this.emailService.sendGuestInvite({
    //   to: dto.email,
    //   projectName: collaborator.project.name,
    //   inviteLink: generateGuestInviteLink(inviteToken),
    // });

    return {
      ...collaborator,
      inviteLink: generateGuestInviteLink(inviteToken), // Return link for now (until email is implemented)
    };
  }

  /**
   * Accept guest invite
   */
  async acceptGuestInvite(token: string) {
    const collaborator = await this.prisma.mediaCollaborator.findUnique({
      where: { inviteToken: token },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!collaborator) {
      throw new NotFoundException("Invalid invite token");
    }

    if (collaborator.expiresAt && collaborator.expiresAt < new Date()) {
      throw new BadRequestException("Invite has expired");
    }

    if (collaborator.status === "REVOKED") {
      throw new ForbiddenException("Invite has been revoked");
    }

    // Mark as accepted
    const updated = await this.prisma.mediaCollaborator.update({
      where: { id: collaborator.id },
      data: {
        status: "ACCEPTED",
        lastAccessAt: new Date(),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Revoke guest access
   */
  async revokeGuestAccess(
    projectId: string,
    collaboratorId: string,
    userId: string,
  ) {
    await this.verifyProjectAccess(projectId, userId, [CollaboratorRole.OWNER]);

    const collaborator = await this.prisma.mediaCollaborator.findUnique({
      where: { id: collaboratorId },
    });

    if (!collaborator || collaborator.projectId !== projectId) {
      throw new NotFoundException("Collaborator not found");
    }

    if (collaborator.userId) {
      throw new BadRequestException(
        "Cannot revoke internal user access through this endpoint",
      );
    }

    await this.prisma.mediaCollaborator.update({
      where: { id: collaboratorId },
      data: { status: "REVOKED" },
    });

    return { message: "Guest access revoked" };
  }

  /**
   * Regenerate guest invite link
   */
  async regenerateGuestInvite(
    projectId: string,
    collaboratorId: string,
    userId: string,
  ) {
    await this.verifyProjectAccess(projectId, userId, [CollaboratorRole.OWNER]);

    const collaborator = await this.prisma.mediaCollaborator.findUnique({
      where: { id: collaboratorId },
    });

    if (!collaborator || collaborator.projectId !== projectId) {
      throw new NotFoundException("Collaborator not found");
    }

    if (collaborator.userId) {
      throw new BadRequestException(
        "Cannot regenerate link for internal users",
      );
    }

    const newToken = generateSecureToken();
    const expiresAt = addDays(new Date(), 30);

    const updated = await this.prisma.mediaCollaborator.update({
      where: { id: collaboratorId },
      data: {
        inviteToken: newToken,
        status: "PENDING",
        expiresAt,
      },
    });

    return {
      ...updated,
      inviteLink: generateGuestInviteLink(newToken),
    };
  }

  /**
   * Helper method to verify project access with specific roles
   */
  private async verifyProjectAccess(
    projectId: string,
    userId: string,
    allowedRoles: CollaboratorRole[],
  ) {
    const project = await this.prisma.mediaProject.findUnique({
      where: { id: projectId },
      include: {
        collaborators: {
          where: { userId },
        },
      },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const userCollaborator = project.collaborators[0];
    if (
      project.createdBy !== userId &&
      (!userCollaborator || !allowedRoles.includes(userCollaborator.role))
    ) {
      throw new ForbiddenException(
        "You do not have permission to perform this action",
      );
    }

    return project;
  }
}
