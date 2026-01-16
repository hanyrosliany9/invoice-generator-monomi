import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { MilestonesService } from "./milestones.service";
import { MilestoneAnalyticsService } from "./milestone-analytics.service";
import { CreateMilestoneDto } from "./dto/create-milestone.dto";
import { UpdateMilestoneDto } from "./dto/update-milestone.dto";
import { MilestoneAnalyticsQueryDto } from "./dto/milestone-analytics-query.dto";
import { MilestoneAnalyticsDto } from "./dto/milestone-analytics.dto";

@ApiTags("Project Milestones")
@ApiBearerAuth()
@Controller("milestones")
@UseGuards(JwtAuthGuard)
export class MilestonesController {
  constructor(
    private readonly milestonesService: MilestonesService,
    private readonly analyticsService: MilestoneAnalyticsService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Create a new project milestone" })
  @ApiResponse({
    status: 201,
    description: "Milestone created successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request - validation failed" })
  @ApiResponse({ status: 404, description: "Project not found" })
  @ApiResponse({
    status: 409,
    description: "Milestone number already exists for project",
  })
  async create(@Body() createMilestoneDto: CreateMilestoneDto) {
    return this.milestonesService.create(createMilestoneDto);
  }

  @Get("project/:projectId")
  @ApiOperation({ summary: "Get all milestones for a project" })
  @ApiResponse({
    status: 200,
    description: "Returns list of project milestones",
  })
  async findByProject(@Param("projectId") projectId: string) {
    return this.milestonesService.findByProject(projectId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get milestone by ID" })
  @ApiResponse({ status: 200, description: "Returns milestone details" })
  @ApiResponse({ status: 404, description: "Milestone not found" })
  async findOne(@Param("id") id: string) {
    return this.milestonesService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update milestone" })
  @ApiResponse({ status: 200, description: "Milestone updated successfully" })
  @ApiResponse({ status: 400, description: "Bad request - validation failed" })
  @ApiResponse({ status: 404, description: "Milestone not found" })
  async update(
    @Param("id") id: string,
    @Body() updateMilestoneDto: UpdateMilestoneDto,
  ) {
    return this.milestonesService.update(id, updateMilestoneDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete milestone" })
  @ApiResponse({ status: 204, description: "Milestone deleted successfully" })
  @ApiResponse({
    status: 400,
    description: "Cannot delete - milestone has dependencies",
  })
  @ApiResponse({ status: 404, description: "Milestone not found" })
  async remove(@Param("id") id: string) {
    await this.milestonesService.remove(id);
  }

  @Patch(":id/progress")
  @ApiOperation({ summary: "Update milestone completion progress" })
  @ApiResponse({
    status: 200,
    description: "Milestone progress updated successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid percentage value (must be 0-100)",
  })
  @ApiResponse({ status: 404, description: "Milestone not found" })
  async updateProgress(
    @Param("id") id: string,
    @Body("percentage") percentage: number,
  ) {
    return this.milestonesService.updateProgress(id, percentage);
  }

  @Post(":id/complete")
  @ApiOperation({ summary: "Mark milestone as completed" })
  @ApiResponse({
    status: 200,
    description: "Milestone marked as completed",
  })
  @ApiResponse({
    status: 400,
    description: "Cannot complete - predecessor not completed",
  })
  @ApiResponse({ status: 404, description: "Milestone not found" })
  async markAsCompleted(@Param("id") id: string) {
    return this.milestonesService.markAsCompleted(id);
  }

  @Get(":id/dependencies")
  @ApiOperation({ summary: "Check if milestone can start (dependency check)" })
  @ApiResponse({
    status: 200,
    description: "Returns dependency status and prerequisites",
  })
  @ApiResponse({ status: 404, description: "Milestone not found" })
  async checkDependencies(@Param("id") id: string) {
    return this.milestonesService.checkDependencies(id);
  }

  @Get("analytics/overview")
  @ApiOperation({
    summary: "Get comprehensive milestone analytics",
    description:
      "Provides analytics including payment cycles, revenue recognition, profitability, and cash flow forecasts",
  })
  @ApiResponse({
    status: 200,
    description: "Returns milestone analytics data",
    type: MilestoneAnalyticsDto,
  })
  async getAnalytics(@Query() query: MilestoneAnalyticsQueryDto) {
    return this.analyticsService.getAnalytics(query);
  }
}
