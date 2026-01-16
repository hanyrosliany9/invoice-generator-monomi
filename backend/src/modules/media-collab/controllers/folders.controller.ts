import {
  Controller,
  Get,
  Post,
  Patch,
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
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { MediaFoldersService } from "../services/folders.service";
import { CreateFolderDto } from "../dto/create-folder.dto";
import { UpdateFolderDto } from "../dto/update-folder.dto";
import { MoveAssetsDto } from "../dto/move-assets.dto";
import { AuthenticatedRequest } from "../interfaces/authenticated-request.interface";

@ApiTags("Media Collaboration - Folders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("media-collab/folders")
export class MediaFoldersController {
  constructor(private readonly foldersService: MediaFoldersService) {}

  @Post()
  @ApiOperation({ summary: "Create a new folder" })
  @ApiResponse({ status: 201, description: "Folder created successfully" })
  @ApiResponse({
    status: 400,
    description: "Bad request (duplicate name or invalid parent)",
  })
  @ApiResponse({
    status: 404,
    description: "Project or parent folder not found",
  })
  async createFolder(
    @Request() req: AuthenticatedRequest,
    @Body() createFolderDto: CreateFolderDto,
  ) {
    return this.foldersService.createFolder(req.user.id, createFolderDto);
  }

  @Get("project/:projectId/tree")
  @ApiOperation({ summary: "Get folder tree for a project" })
  @ApiParam({ name: "projectId", description: "Project UUID" })
  @ApiResponse({
    status: 200,
    description: "Folder tree retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Project not found" })
  async getFolderTree(
    @Request() req: AuthenticatedRequest,
    @Param("projectId") projectId: string,
  ) {
    return this.foldersService.getFolderTree(req.user.id, projectId);
  }

  @Get(":folderId")
  @ApiOperation({ summary: "Get folder contents (subfolders and assets)" })
  @ApiParam({ name: "folderId", description: "Folder UUID" })
  @ApiResponse({
    status: 200,
    description: "Folder contents retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Folder not found" })
  async getFolderContents(
    @Request() req: AuthenticatedRequest,
    @Param("folderId") folderId: string,
  ) {
    return this.foldersService.getFolderContents(req.user.id, folderId);
  }

  @Get(":folderId/path")
  @ApiOperation({ summary: "Get folder breadcrumb path" })
  @ApiParam({ name: "folderId", description: "Folder UUID" })
  @ApiResponse({
    status: 200,
    description: "Folder path retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Folder not found" })
  async getFolderPath(
    @Request() req: AuthenticatedRequest,
    @Param("folderId") folderId: string,
  ) {
    return this.foldersService.getFolderPath(req.user.id, folderId);
  }

  @Patch(":folderId")
  @ApiOperation({ summary: "Update folder (rename or move)" })
  @ApiParam({ name: "folderId", description: "Folder UUID" })
  @ApiResponse({ status: 200, description: "Folder updated successfully" })
  @ApiResponse({
    status: 400,
    description: "Bad request (duplicate name or circular reference)",
  })
  @ApiResponse({ status: 404, description: "Folder not found" })
  async updateFolder(
    @Request() req: AuthenticatedRequest,
    @Param("folderId") folderId: string,
    @Body() updateFolderDto: UpdateFolderDto,
  ) {
    return this.foldersService.updateFolder(
      req.user.id,
      folderId,
      updateFolderDto,
    );
  }

  @Delete(":folderId")
  @ApiOperation({
    summary:
      "Delete folder (cascade deletes subfolders, assets from DB, and R2 storage files)",
    description:
      "Permanently deletes folder and all contents: nested folders, asset database records, and actual files from R2 storage",
  })
  @ApiParam({ name: "folderId", description: "Folder UUID" })
  @ApiResponse({
    status: 200,
    description: "Folder deleted successfully",
    schema: {
      type: "object",
      properties: {
        message: { type: "string", example: "Folder deleted successfully" },
        deletedFolderId: { type: "string", example: "cm3abcd1234567890" },
        deletedChildFolders: { type: "number", example: 3 },
        deletedAssets: { type: "number", example: 15 },
        deletedR2Files: { type: "number", example: 30 },
      },
    },
  })
  @ApiResponse({ status: 404, description: "Folder not found" })
  @ApiResponse({
    status: 403,
    description: "Access denied (requires OWNER or EDITOR role)",
  })
  async deleteFolder(
    @Request() req: AuthenticatedRequest,
    @Param("folderId") folderId: string,
  ) {
    return this.foldersService.deleteFolder(req.user.id, folderId);
  }

  @Post("project/:projectId/move-assets")
  @ApiOperation({ summary: "Move assets to a folder" })
  @ApiParam({ name: "projectId", description: "Project UUID" })
  @ApiResponse({ status: 200, description: "Assets moved successfully" })
  @ApiResponse({ status: 400, description: "Bad request (invalid assets)" })
  @ApiResponse({ status: 404, description: "Project or folder not found" })
  async moveAssets(
    @Request() req: AuthenticatedRequest,
    @Param("projectId") projectId: string,
    @Body() moveAssetsDto: MoveAssetsDto,
  ) {
    return this.foldersService.moveAssets(
      req.user.id,
      projectId,
      moveAssetsDto,
    );
  }
}
