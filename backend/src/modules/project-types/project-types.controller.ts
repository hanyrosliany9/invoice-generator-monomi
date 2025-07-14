import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Put,
} from '@nestjs/common';
import { ProjectTypesService } from './project-types.service';
import { CreateProjectTypeDto } from './dto/create-project-type.dto';
import { UpdateProjectTypeDto } from './dto/update-project-type.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('project-types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('project-types')
export class ProjectTypesController {
  constructor(private readonly projectTypesService: ProjectTypesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project type' })
  @ApiResponse({ status: 201, description: 'Project type created successfully' })
  @ApiResponse({ status: 409, description: 'Project type code already exists' })
  create(@Body() createProjectTypeDto: CreateProjectTypeDto) {
    return this.projectTypesService.create(createProjectTypeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active project types' })
  @ApiResponse({ status: 200, description: 'Project types retrieved successfully' })
  findAll() {
    return this.projectTypesService.findAll();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get project type statistics' })
  @ApiResponse({ status: 200, description: 'Project type statistics retrieved successfully' })
  getStats() {
    return this.projectTypesService.getProjectTypeStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project type by ID' })
  @ApiResponse({ status: 200, description: 'Project type retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Project type not found' })
  findOne(@Param('id') id: string) {
    return this.projectTypesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project type' })
  @ApiResponse({ status: 200, description: 'Project type updated successfully' })
  @ApiResponse({ status: 404, description: 'Project type not found' })
  @ApiResponse({ status: 409, description: 'Project type code already exists' })
  update(@Param('id') id: string, @Body() updateProjectTypeDto: UpdateProjectTypeDto) {
    return this.projectTypesService.update(id, updateProjectTypeDto);
  }

  @Put(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle project type active status' })
  @ApiResponse({ status: 200, description: 'Project type status toggled successfully' })
  @ApiResponse({ status: 404, description: 'Project type not found' })
  toggleActive(@Param('id') id: string) {
    return this.projectTypesService.toggleActive(id);
  }

  @Put('sort-order')
  @ApiOperation({ summary: 'Update project types sort order' })
  @ApiResponse({ status: 200, description: 'Sort order updated successfully' })
  updateSortOrder(@Body() updates: { id: string; sortOrder: number }[]) {
    return this.projectTypesService.updateSortOrder(updates);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project type' })
  @ApiResponse({ status: 200, description: 'Project type deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project type not found' })
  @ApiResponse({ status: 409, description: 'Project type is in use and cannot be deleted' })
  remove(@Param('id') id: string) {
    return this.projectTypesService.remove(id);
  }
}