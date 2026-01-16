import {
  Controller,
  UseGuards,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { MediaCollaboratorsService } from "../services/media-collaborators.service";
import { CreateCollaboratorDto } from "../dto/create-collaborator.dto";
import { UpdateCollaboratorDto } from "../dto/update-collaborator.dto";
import { InviteGuestDto } from "../dto/invite-guest.dto";
import { AuthenticatedRequest } from "../types/authenticated-request.interface";

@ApiTags("Media Collaboration - Collaborators")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("media-collab/collaborators")
export class MediaCollaboratorsController {
  constructor(
    private readonly collaboratorsService: MediaCollaboratorsService,
  ) {}

  @Get("project/:projectId")
  @ApiOperation({ summary: "Get all collaborators for a project" })
  @ApiResponse({
    status: 200,
    description: "Collaborators retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Project not found" })
  async getProjectCollaborators(@Param("projectId") projectId: string) {
    return this.collaboratorsService.getProjectCollaborators(projectId);
  }

  @Post("project/:projectId")
  @ApiOperation({ summary: "Add a collaborator to a project" })
  @ApiResponse({ status: 201, description: "Collaborator added successfully" })
  @ApiResponse({ status: 400, description: "User is already a collaborator" })
  @ApiResponse({ status: 403, description: "Permission denied" })
  @ApiResponse({ status: 404, description: "Project or user not found" })
  async addCollaborator(
    @Param("projectId") projectId: string,
    @Body() dto: CreateCollaboratorDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.collaboratorsService.addCollaborator(
      projectId,
      dto,
      req.user.id,
    );
  }

  @Put("project/:projectId/:collaboratorId")
  @ApiOperation({ summary: "Update collaborator role" })
  @ApiResponse({
    status: 200,
    description: "Collaborator updated successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Cannot change project creator role",
  })
  @ApiResponse({ status: 403, description: "Permission denied" })
  @ApiResponse({
    status: 404,
    description: "Project or collaborator not found",
  })
  async updateCollaborator(
    @Param("projectId") projectId: string,
    @Param("collaboratorId") collaboratorId: string,
    @Body() dto: UpdateCollaboratorDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.collaboratorsService.updateCollaborator(
      projectId,
      collaboratorId,
      dto,
      req.user.id,
    );
  }

  @Delete("project/:projectId/:collaboratorId")
  @ApiOperation({ summary: "Remove a collaborator from a project" })
  @ApiResponse({
    status: 200,
    description: "Collaborator removed successfully",
  })
  @ApiResponse({ status: 400, description: "Cannot remove project creator" })
  @ApiResponse({ status: 403, description: "Permission denied" })
  @ApiResponse({
    status: 404,
    description: "Project or collaborator not found",
  })
  async removeCollaborator(
    @Param("projectId") projectId: string,
    @Param("collaboratorId") collaboratorId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.collaboratorsService.removeCollaborator(
      projectId,
      collaboratorId,
      req.user.id,
    );
  }

  // ========================================
  // GUEST COLLABORATION ENDPOINTS
  // ========================================

  @Post("project/:projectId/invite-guest")
  @ApiOperation({ summary: "Invite a guest collaborator (external user)" })
  @ApiResponse({
    status: 201,
    description: "Guest invited successfully, invite link returned",
  })
  @ApiResponse({
    status: 400,
    description: "Guest already invited to this project",
  })
  @ApiResponse({
    status: 403,
    description: "Permission denied (must be OWNER or EDITOR)",
  })
  @ApiResponse({ status: 404, description: "Project not found" })
  async inviteGuest(
    @Param("projectId") projectId: string,
    @Body() dto: InviteGuestDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.collaboratorsService.inviteGuest(projectId, req.user.id, dto);
  }

  @Post("project/:projectId/:collaboratorId/revoke")
  @ApiOperation({ summary: "Revoke guest access" })
  @ApiResponse({
    status: 200,
    description: "Guest access revoked successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Cannot revoke internal user access",
  })
  @ApiResponse({
    status: 403,
    description: "Permission denied (must be OWNER)",
  })
  @ApiResponse({
    status: 404,
    description: "Project or collaborator not found",
  })
  async revokeGuest(
    @Param("projectId") projectId: string,
    @Param("collaboratorId") collaboratorId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.collaboratorsService.revokeGuestAccess(
      projectId,
      collaboratorId,
      req.user.id,
    );
  }

  @Post("project/:projectId/:collaboratorId/regenerate")
  @ApiOperation({ summary: "Regenerate guest invite link" })
  @ApiResponse({
    status: 200,
    description: "Invite link regenerated successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Cannot regenerate link for internal users",
  })
  @ApiResponse({
    status: 403,
    description: "Permission denied (must be OWNER)",
  })
  @ApiResponse({
    status: 404,
    description: "Project or collaborator not found",
  })
  async regenerateInvite(
    @Param("projectId") projectId: string,
    @Param("collaboratorId") collaboratorId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.collaboratorsService.regenerateGuestInvite(
      projectId,
      collaboratorId,
      req.user.id,
    );
  }
}
