import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiQuery({ name: 'period', required: false, enum: ['monthly', 'quarterly', 'yearly'] })
  @ApiQuery({ name: 'startDate', required: false, type: 'string' })
  @ApiQuery({ name: 'endDate', required: false, type: 'string' })
  async getRevenueAnalytics(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getRevenueAnalytics(period, startDate, endDate);
  }

  @Get('clients')
  @ApiOperation({ summary: 'Get client analytics' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  async getClientAnalytics(@Query('limit') limit?: number) {
    return this.reportsService.getClientAnalytics(limit);
  }

  @Get('projects')
  @ApiOperation({ summary: 'Get project analytics' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  async getProjectAnalytics(@Query('limit') limit?: number) {
    return this.reportsService.getProjectAnalytics(limit);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Get payment analytics' })
  async getPaymentAnalytics() {
    return this.reportsService.getPaymentAnalytics();
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get comprehensive business overview' })
  @ApiQuery({ name: 'period', required: false, enum: ['monthly', 'quarterly', 'yearly'] })
  async getBusinessOverview(@Query('period') period?: string) {
    return this.reportsService.getBusinessOverview(period);
  }

  @Get('financial-summary')
  @ApiOperation({ summary: 'Get financial summary for specific period' })
  @ApiQuery({ name: 'startDate', required: false, type: 'string' })
  @ApiQuery({ name: 'endDate', required: false, type: 'string' })
  async getFinancialSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getFinancialSummary(startDate, endDate);
  }
}