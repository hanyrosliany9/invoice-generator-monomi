import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { MediaProjectsService } from "../services/media-projects.service";
import { CreateMediaProjectDto } from "../dto/create-media-project.dto";
import { UpdateMediaProjectDto } from "../dto/update-media-project.dto";
import { AuthenticatedRequest } from "../interfaces/authenticated-request.interface";

@ApiTags("Media Collaboration - Projects")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("media-collab/projects")
export class MediaProjectsController {
  constructor(private readonly mediaProjectsService: MediaProjectsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new media project" })
  @ApiResponse({ status: 201, description: "Project created successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 404, description: "Client/Project/Folder not found" })
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createDto: CreateMediaProjectDto,
  ) {
    return this.mediaProjectsService.create(req.user.id, createDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all media projects accessible by user" })
  @ApiResponse({ status: 200, description: "List of projects" })
  findAll(@Request() req: AuthenticatedRequest) {
    return this.mediaProjectsService.findAll(req.user.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single media project by ID" })
  @ApiResponse({ status: 200, description: "Project details" })
  @ApiResponse({ status: 403, description: "Access denied" })
  @ApiResponse({ status: 404, description: "Project not found" })
  findOne(@Request() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.mediaProjectsService.findOne(id, req.user.id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a media project" })
  @ApiResponse({ status: 200, description: "Project updated successfully" })
  @ApiResponse({ status: 403, description: "Access denied" })
  @ApiResponse({ status: 404, description: "Project not found" })
  update(
    @Request() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() updateDto: UpdateMediaProjectDto,
  ) {
    return this.mediaProjectsService.update(id, req.user.id, updateDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a media project (OWNER only)" })
  @ApiResponse({ status: 200, description: "Project deleted successfully" })
  @ApiResponse({ status: 403, description: "Access denied" })
  @ApiResponse({ status: 404, description: "Project not found" })
  remove(@Request() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.mediaProjectsService.remove(id, req.user.id);
  }

  // PUBLIC SHARING ENDPOINTS
  @Post(":id/enable-public-sharing")
  @ApiOperation({ summary: "Enable public sharing for project" })
  @ApiResponse({ status: 200, description: "Public sharing enabled" })
  @ApiResponse({
    status: 403,
    description: "Only owner can enable public sharing",
  })
  @ApiResponse({ status: 404, description: "Project not found" })
  async enablePublicSharing(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.mediaProjectsService.enablePublicSharing(id, req.user.id);
  }

  @Post(":id/disable-public-sharing")
  @ApiOperation({ summary: "Disable public sharing for project" })
  @ApiResponse({ status: 200, description: "Public sharing disabled" })
  @ApiResponse({
    status: 403,
    description: "Only owner can disable public sharing",
  })
  @ApiResponse({ status: 404, description: "Project not found" })
  async disablePublicSharing(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.mediaProjectsService.disablePublicSharing(id, req.user.id);
  }

  @Post(":id/regenerate-public-link")
  @ApiOperation({ summary: "Regenerate public share link" })
  @ApiResponse({ status: 200, description: "Link regenerated successfully" })
  @ApiResponse({ status: 403, description: "Only owner can regenerate link" })
  @ApiResponse({ status: 404, description: "Project not found" })
  async regeneratePublicLink(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.mediaProjectsService.regeneratePublicShareLink(id, req.user.id);
  }
}
