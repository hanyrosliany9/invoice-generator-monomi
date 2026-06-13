import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import {
  UserRole,
  ContentStatus,
  ContentPlatform,
  ContentFormat,
} from "@prisma/client";
import { ContentCalendarService } from "./content-calendar.service";
import { CreateContentDto } from "./dto/create-content.dto";
import { UpdateContentDto } from "./dto/update-content.dto";
import { CreateHighlightDto } from "./dto/create-highlight.dto";

/**
 * ContentCalendarController - REST API for Content Planning
 *
 * Endpoints:
 * - GET /content-calendar - List all content items (with filters)
 * - GET /content-calendar/:id - Get single content item
 * - POST /content-calendar - Create new content item
 * - PUT /content-calendar/:id - Update content item
 * - DELETE /content-calendar/:id - Delete content item
 * - POST /content-calendar/:id/publish - Publish content
 * - POST /content-calendar/:id/archive - Archive content
 *
 * Security:
 * - JWT authentication required
 * - Role-based access control
 */
@ApiTags("Content Calendar")
@ApiBearerAuth()
@Controller("content-calendar")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContentCalendarController {
  private readonly logger = new Logger(ContentCalendarController.name);

  constructor(
    private readonly contentCalendarService: ContentCalendarService,
  ) {}

  /**
   * Create a new content calendar item
   * Available to all authenticated users
   */
  @Post()
  @ApiOperation({ summary: "Create a new content calendar item" })
  @ApiResponse({ status: 201, description: "Content created successfully" })
  async create(@Body() createDto: CreateContentDto, @Request() req: any) {
    const userId = req.user.id;
    this.logger.debug(`Creating content for user: ${userId}`);

    const content = await this.contentCalendarService.create(createDto, userId);

    return content;
  }

  /**
   * Persist the Instagram grid drag-to-rearrange order.
   * Available to all authenticated users.
   */
  @Put("reorder")
  @ApiOperation({ summary: "Reorder content items in the Instagram grid" })
  @ApiResponse({ status: 200, description: "Grid order updated" })
  async reorder(
    @Body() body: { items: { id: string; gridOrder: number }[] },
  ) {
    return this.contentCalendarService.reorder(body?.items ?? []);
  }

  /**
   * Get all content calendar items with optional filters
   * Available to all authenticated users
   */
  @Get()
  @ApiOperation({ summary: "Get all content calendar items" })
  @ApiQuery({ name: "status", enum: ContentStatus, required: false })
  @ApiQuery({ name: "platform", enum: ContentPlatform, required: false })
  @ApiQuery({ name: "format", enum: ContentFormat, required: false })
  @ApiQuery({ name: "clientId", required: false })
  @ApiQuery({ name: "projectId", required: false })
  @ApiQuery({ name: "createdBy", required: false })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  async findAll(
    @Query("status") status?: ContentStatus,
    @Query("platform") platform?: ContentPlatform,
    @Query("format") format?: ContentFormat,
    @Query("clientId") clientId?: string,
    @Query("projectId") projectId?: string,
    @Query("createdBy") createdBy?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const filters = {
      ...(status && { status }),
      ...(platform && { platform }),
      ...(format && { format }),
      ...(clientId && { clientId }),
      ...(projectId && { projectId }),
      ...(createdBy && { createdBy }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
    };

    const contents = await this.contentCalendarService.findAll(filters);

    return contents;
  }

  /**
   * Get the agency Instagram profile for the grid preview header.
   * Non-sensitive fields only; available to all authenticated users.
   */
  @Get("ig-profile")
  @ApiOperation({ summary: "Get a client's Instagram profile for the grid preview" })
  @ApiQuery({ name: "clientId", required: true })
  async getIgProfile(@Query("clientId") clientId: string) {
    return this.contentCalendarService.getSocialProfile(
      clientId,
      ContentPlatform.INSTAGRAM,
    );
  }

  @Get("social-profile")
  @ApiOperation({ summary: "Get a client's social profile (per platform) for the grid preview" })
  @ApiQuery({ name: "clientId", required: true })
  @ApiQuery({ name: "platform", enum: ContentPlatform, required: false })
  async getSocialProfile(
    @Query("clientId") clientId: string,
    @Query("platform") platform?: ContentPlatform,
  ) {
    return this.contentCalendarService.getSocialProfile(
      clientId,
      platform || ContentPlatform.INSTAGRAM,
    );
  }

  // ----- per-client public share management (admin) -----

  @Get("share/:clientId")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: "Get the public share status for a client's content planner" })
  async getShareStatus(@Param("clientId") clientId: string) {
    return this.contentCalendarService.getShareStatus(clientId);
  }

  @Post("share/:clientId")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: "Enable the public share link for a client's content planner" })
  async enableShare(@Param("clientId") clientId: string) {
    return this.contentCalendarService.enableShare(clientId);
  }

  @Delete("share/:clientId")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: "Disable the public share link for a client's content planner" })
  async disableShare(@Param("clientId") clientId: string) {
    return this.contentCalendarService.disableShare(clientId);
  }

  // ----- story highlights (per client) -----

  @Get("highlights/:clientId")
  @ApiOperation({ summary: "List a client's Instagram story highlights" })
  async listHighlights(@Param("clientId") clientId: string) {
    return this.contentCalendarService.listHighlights(clientId);
  }

  @Post("highlights/:clientId")
  @ApiOperation({ summary: "Create an Instagram story highlight for a client" })
  async createHighlight(
    @Param("clientId") clientId: string,
    @Body() dto: CreateHighlightDto,
  ) {
    return this.contentCalendarService.createHighlight(clientId, dto);
  }

  @Put("highlight/:highlightId")
  @ApiOperation({ summary: "Update an Instagram story highlight (title and/or media)" })
  async updateHighlight(
    @Param("highlightId") highlightId: string,
    @Body() dto: Partial<CreateHighlightDto>,
  ) {
    return this.contentCalendarService.updateHighlight(highlightId, dto);
  }

  @Delete("highlight/:highlightId")
  @ApiOperation({ summary: "Delete an Instagram story highlight" })
  async deleteHighlight(@Param("highlightId") highlightId: string) {
    return this.contentCalendarService.deleteHighlight(highlightId);
  }

  /**
   * Get a single content calendar item by ID
   * Available to all authenticated users
   */
  @Get(":id")
  @ApiOperation({ summary: "Get a content calendar item by ID" })
  async findOne(@Param("id") id: string) {
    const content = await this.contentCalendarService.findOne(id);

    return content;
  }

  /**
   * Update a content calendar item
   * Available to all authenticated users (service handles permissions)
   */
  @Put(":id")
  @ApiOperation({ summary: "Update a content calendar item" })
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateContentDto,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    const userRole = req.user.role;

    const content = await this.contentCalendarService.update(
      id,
      updateDto,
      userId,
      userRole,
    );

    return content;
  }

  /**
   * Delete a content calendar item
   * Available to all authenticated users (service handles permissions)
   */
  @Delete(":id")
  @ApiOperation({ summary: "Delete a content calendar item" })
  async remove(@Param("id") id: string, @Request() req: any) {
    const userId = req.user.id;
    const userRole = req.user.role;

    await this.contentCalendarService.remove(id, userId, userRole);

    return { message: "Content deleted successfully" };
  }

  /**
   * Publish a content calendar item
   * Available to all authenticated users (service handles permissions)
   */
  @Post(":id/publish")
  @ApiOperation({ summary: "Publish a content calendar item" })
  async publish(@Param("id") id: string, @Request() req: any) {
    const userId = req.user.id;
    const userRole = req.user.role;

    const content = await this.contentCalendarService.publish(
      id,
      userId,
      userRole,
    );

    return content;
  }

  /**
   * Archive a content calendar item
   * Available to all authenticated users (service handles permissions)
   */
  @Post(":id/archive")
  @ApiOperation({ summary: "Archive a content calendar item" })
  async archive(@Param("id") id: string, @Request() req: any) {
    const userId = req.user.id;
    const userRole = req.user.role;

    const content = await this.contentCalendarService.archive(
      id,
      userId,
      userRole,
    );

    return content;
  }
}
