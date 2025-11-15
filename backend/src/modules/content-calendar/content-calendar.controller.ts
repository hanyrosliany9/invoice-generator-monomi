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
import { UserRole, ContentStatus, ContentPlatform } from "@prisma/client";
import { ContentCalendarService } from "./content-calendar.service";
import { CreateContentDto } from "./dto/create-content.dto";
import { UpdateContentDto } from "./dto/update-content.dto";

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

  constructor(private readonly contentCalendarService: ContentCalendarService) {}

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

    return {
      success: true,
      data: content,
    };
  }

  /**
   * Get all content calendar items with optional filters
   * Available to all authenticated users
   */
  @Get()
  @ApiOperation({ summary: "Get all content calendar items" })
  @ApiQuery({ name: "status", enum: ContentStatus, required: false })
  @ApiQuery({ name: "platform", enum: ContentPlatform, required: false })
  @ApiQuery({ name: "clientId", required: false })
  @ApiQuery({ name: "projectId", required: false })
  @ApiQuery({ name: "createdBy", required: false })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  async findAll(
    @Query("status") status?: ContentStatus,
    @Query("platform") platform?: ContentPlatform,
    @Query("clientId") clientId?: string,
    @Query("projectId") projectId?: string,
    @Query("createdBy") createdBy?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const filters = {
      ...(status && { status }),
      ...(platform && { platform }),
      ...(clientId && { clientId }),
      ...(projectId && { projectId }),
      ...(createdBy && { createdBy }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
    };

    const contents = await this.contentCalendarService.findAll(filters);

    return {
      success: true,
      data: contents,
      count: contents.length,
    };
  }

  /**
   * Get a single content calendar item by ID
   * Available to all authenticated users
   */
  @Get(":id")
  @ApiOperation({ summary: "Get a content calendar item by ID" })
  async findOne(@Param("id") id: string) {
    const content = await this.contentCalendarService.findOne(id);

    return {
      success: true,
      data: content,
    };
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

    return {
      success: true,
      data: content,
    };
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

    return {
      success: true,
      message: "Content deleted successfully",
    };
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

    const content = await this.contentCalendarService.publish(id, userId, userRole);

    return {
      success: true,
      data: content,
      message: "Content published successfully",
    };
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

    const content = await this.contentCalendarService.archive(id, userId, userRole);

    return {
      success: true,
      data: content,
      message: "Content archived successfully",
    };
  }
}
