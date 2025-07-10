import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('workflow')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workflow')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get('active')
  @ApiOperation({ summary: 'Get all active workflows' })
  @ApiResponse({ status: 200, description: 'List of active quotations and invoices' })
  async getActiveWorkflows() {
    const workflows = await this.workflowService.getActiveWorkflows();
    return {
      data: workflows,
      total: workflows.length
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get workflow statistics' })
  @ApiResponse({ status: 200, description: 'Workflow statistics and alerts' })
  async getWorkflowStats() {
    const stats = await this.workflowService.getWorkflowStats();
    return { data: stats };
  }

  @Post('run-checks')
  @ApiOperation({ summary: 'Manually trigger workflow checks' })
  @ApiResponse({ status: 200, description: 'Workflow checks completed' })
  async runWorkflowChecks() {
    await this.workflowService.runWorkflowChecks();
    return { message: 'Workflow checks completed successfully' };
  }
}