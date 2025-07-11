import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiResponse as ApiResponseDto } from '../../common/dto/api-response.dto';
import { WorkflowSummaryDto, WorkflowStatsDto, WorkflowCheckResultDto } from './dto';

@ApiTags('workflow')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workflow')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get('active')
  @ApiOperation({ summary: 'Get all active workflows' })
  @ApiResponse({ status: 200, description: 'List of active quotations and invoices' })
  async getActiveWorkflows(): Promise<ApiResponseDto<WorkflowSummaryDto[]>> {
    try {
      const workflows = await this.workflowService.getActiveWorkflows();
      return ApiResponseDto.success(workflows, 'Active workflows retrieved successfully');
    } catch (error) {
      return ApiResponseDto.error('Failed to retrieve active workflows', []);
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get workflow statistics' })
  @ApiResponse({ status: 200, description: 'Workflow statistics and alerts' })
  async getWorkflowStats(): Promise<ApiResponseDto<WorkflowStatsDto>> {
    try {
      const stats = await this.workflowService.getWorkflowStats();
      return ApiResponseDto.success(stats, 'Workflow statistics retrieved successfully');
    } catch (error) {
      return ApiResponseDto.error('Failed to retrieve workflow statistics', null);
    }
  }

  @Post('run-checks')
  @ApiOperation({ summary: 'Manually trigger workflow checks' })
  @ApiResponse({ status: 200, description: 'Workflow checks completed' })
  async runWorkflowChecks(): Promise<ApiResponseDto<WorkflowCheckResultDto>> {
    try {
      const result = await this.workflowService.runWorkflowChecks();
      return ApiResponseDto.success(result, 'Workflow checks completed successfully');
    } catch (error) {
      return ApiResponseDto.error('Failed to run workflow checks', null);
    }
  }
}