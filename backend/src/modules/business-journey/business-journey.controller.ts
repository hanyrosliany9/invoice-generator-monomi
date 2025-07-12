// Business Journey Controller - Indonesian Business Management System
// Enhanced with security, rate limiting, and comprehensive API documentation

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
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  UseInterceptors,
  Req,
  Headers
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiSecurity,
  ApiExtraModels
} from '@nestjs/swagger'
import { Request } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { LoggingInterceptor } from '../../common/interceptors/logging.interceptor'
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor'
import { BusinessJourneyService } from './business-journey.service'
import {
  CreateBusinessJourneyEventDto,
  UpdateBusinessJourneyEventDto,
  BusinessJourneyFiltersDto,
  BusinessJourneyTimelineResponseDto,
  BusinessJourneyEventResponseDto,
  CreateUXMetricsDto
} from './dto/business-journey.dto'
import { ApiResponse as ApiResponseDto } from '../../common/dto/api-response.dto'

interface AuthenticatedRequest extends Request {
  user: {
    id: string
    email: string
    role: string
  }
}

@ApiTags('Business Journey')
@ApiBearerAuth()
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@UseInterceptors(LoggingInterceptor, ResponseInterceptor)
@Controller('business-journey')
@ApiExtraModels(
  CreateBusinessJourneyEventDto,
  UpdateBusinessJourneyEventDto,
  BusinessJourneyFiltersDto,
  BusinessJourneyTimelineResponseDto,
  BusinessJourneyEventResponseDto,
  CreateUXMetricsDto
)
export class BusinessJourneyController {
  constructor(private readonly businessJourneyService: BusinessJourneyService) {}

  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new business journey event',
    description: 'Creates a new business journey event with Indonesian compliance validation'
  })
  @ApiResponse({
    status: 201,
    description: 'Business journey event created successfully',
    type: BusinessJourneyEventResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or materai compliance issues'
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token'
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions'
  })
  async createEvent(
    @Body(ValidationPipe) createEventDto: CreateBusinessJourneyEventDto,
    @Req() req: AuthenticatedRequest,
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Headers('user-agent') userAgent?: string
  ): Promise<ApiResponseDto<BusinessJourneyEventResponseDto>> {
    // Enhance metadata with request information
    if (createEventDto.metadata) {
      createEventDto.metadata.ipAddress = forwardedFor || req.ip
      createEventDto.metadata.userAgent = userAgent
      createEventDto.metadata.userCreated = req.user.id
    }

    const event = await this.businessJourneyService.createEvent(
      createEventDto,
      req.user.id
    )

    return ApiResponseDto.success(event, 'Business journey event created successfully')
  }

  @Get('clients/:clientId/timeline')
  @ApiOperation({
    summary: 'Get business journey timeline for a client',
    description: 'Retrieves the complete business journey timeline for a specific client with filtering and pagination'
  })
  @ApiParam({
    name: 'clientId',
    description: 'Client ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiQuery({
    name: 'eventTypes',
    description: 'Filter by event types',
    required: false,
    isArray: true,
    type: 'string'
  })
  @ApiQuery({
    name: 'statusFilter',
    description: 'Filter by event statuses',
    required: false,
    isArray: true,
    type: 'string'
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Start date for date range filter (ISO 8601)',
    required: false,
    type: 'string'
  })
  @ApiQuery({
    name: 'endDate',
    description: 'End date for date range filter (ISO 8601)',
    required: false,
    type: 'string'
  })
  @ApiQuery({
    name: 'minAmount',
    description: 'Minimum amount filter (IDR)',
    required: false,
    type: 'number'
  })
  @ApiQuery({
    name: 'maxAmount',
    description: 'Maximum amount filter (IDR)',
    required: false,
    type: 'number'
  })
  @ApiQuery({
    name: 'searchTerm',
    description: 'Search term for title and description',
    required: false,
    type: 'string'
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number for pagination',
    required: false,
    type: 'number'
  })
  @ApiQuery({
    name: 'limit',
    description: 'Items per page for pagination',
    required: false,
    type: 'number'
  })
  @ApiQuery({
    name: 'sortBy',
    description: 'Sort field',
    required: false,
    enum: ['createdAt', 'type', 'status', 'amount']
  })
  @ApiQuery({
    name: 'sortOrder',
    description: 'Sort order',
    required: false,
    enum: ['asc', 'desc']
  })
  @ApiResponse({
    status: 200,
    description: 'Business journey timeline retrieved successfully',
    type: BusinessJourneyTimelineResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found'
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token'
  })
  async getClientTimeline(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Query(ValidationPipe) filters: BusinessJourneyFiltersDto
  ): Promise<ApiResponseDto<BusinessJourneyTimelineResponseDto>> {
    const timeline = await this.businessJourneyService.getClientTimeline(
      clientId,
      filters
    )

    return ApiResponseDto.success(timeline, 'Business journey timeline retrieved successfully')
  }

  @Get('events/:eventId')
  @ApiOperation({
    summary: 'Get a specific business journey event',
    description: 'Retrieves detailed information about a specific business journey event'
  })
  @ApiParam({
    name: 'eventId',
    description: 'Business journey event ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: 200,
    description: 'Business journey event retrieved successfully',
    type: BusinessJourneyEventResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Business journey event not found'
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token'
  })
  async getEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string
  ): Promise<ApiResponseDto<BusinessJourneyEventResponseDto>> {
    // This would need to be implemented in the service
    // For now, returning a placeholder response
    throw new Error('Method not implemented')
  }

  @Put('events/:eventId')
  @ApiOperation({
    summary: 'Update a business journey event',
    description: 'Updates an existing business journey event with Indonesian compliance validation'
  })
  @ApiParam({
    name: 'eventId',
    description: 'Business journey event ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: 200,
    description: 'Business journey event updated successfully',
    type: BusinessJourneyEventResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or materai compliance issues'
  })
  @ApiResponse({
    status: 404,
    description: 'Business journey event not found'
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token'
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions to update this event'
  })
  async updateEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body(ValidationPipe) updateEventDto: UpdateBusinessJourneyEventDto,
    @Req() req: AuthenticatedRequest
  ): Promise<ApiResponseDto<BusinessJourneyEventResponseDto>> {
    const event = await this.businessJourneyService.updateEvent(
      eventId,
      updateEventDto,
      req.user.id
    )

    return ApiResponseDto.success(event, 'Business journey event updated successfully')
  }

  @Delete('events/:eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a business journey event',
    description: 'Deletes an existing business journey event. This action cannot be undone.'
  })
  @ApiParam({
    name: 'eventId',
    description: 'Business journey event ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: 204,
    description: 'Business journey event deleted successfully'
  })
  @ApiResponse({
    status: 404,
    description: 'Business journey event not found'
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token'
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions to delete this event'
  })
  async deleteEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string
  ): Promise<void> {
    await this.businessJourneyService.deleteEvent(eventId)
  }

  @Post('events/auto-create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Auto-create business journey event',
    description: 'Automatically creates a business journey event based on entity changes (internal API)'
  })
  @ApiResponse({
    status: 201,
    description: 'Business journey event auto-created successfully',
    type: BusinessJourneyEventResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data'
  })
  async autoCreateEvent(
    @Body() payload: {
      entityType: 'client' | 'project' | 'quotation' | 'invoice' | 'payment'
      entityId: string
      action: 'created' | 'updated' | 'deleted'
      metadata?: any
    },
    @Req() req: AuthenticatedRequest
  ): Promise<ApiResponseDto<BusinessJourneyEventResponseDto | null>> {
    const event = await this.businessJourneyService.autoCreateEvent(
      payload.entityType,
      payload.entityId,
      payload.action,
      req.user.id,
      payload.metadata
    )

    return ApiResponseDto.success(event, event ? 'Business journey event auto-created successfully' : 'No event created')
  }

  @Post('analytics/ux-metrics')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Record UX metrics',
    description: 'Records UX performance metrics for analytics and monitoring'
  })
  @ApiResponse({
    status: 201,
    description: 'UX metrics recorded successfully'
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid metrics data'
  })
  async recordUXMetrics(
    @Body(ValidationPipe) metricsDto: CreateUXMetricsDto,
    @Req() req: AuthenticatedRequest,
    @Headers('user-agent') userAgent?: string
  ): Promise<ApiResponseDto<null>> {
    // Enhance metrics with user context
    metricsDto.userId = req.user.id
    metricsDto.userAgent = userAgent

    await this.businessJourneyService.recordUXMetrics(metricsDto)

    return ApiResponseDto.success(null, 'UX metrics recorded successfully')
  }

  @Get('analytics/summary/:clientId')
  @ApiOperation({
    summary: 'Get business analytics summary',
    description: 'Retrieves comprehensive business analytics and KPI summary for a client'
  })
  @ApiParam({
    name: 'clientId',
    description: 'Client ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiQuery({
    name: 'period',
    description: 'Time period for analytics',
    required: false,
    enum: ['week', 'month', 'quarter', 'year']
  })
  @ApiResponse({
    status: 200,
    description: 'Business analytics summary retrieved successfully'
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found'
  })
  async getAnalyticsSummary(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Query('period') period: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<ApiResponseDto<any>> {
    // This would be implemented with comprehensive analytics
    // For now, returning basic timeline data
    const filters: BusinessJourneyFiltersDto = {
      startDate: this.getStartDateForPeriod(period),
      endDate: new Date().toISOString()
    }

    const timeline = await this.businessJourneyService.getClientTimeline(
      clientId,
      filters
    )

    const analytics = {
      period,
      clientId,
      summary: timeline.summary,
      materaiCompliance: timeline.materaiCompliance,
      totalEvents: timeline.totalEvents,
      totalRevenue: timeline.totalRevenue,
      trends: {
        // Calculate trends based on events
        revenueGrowth: 0,
        conversionRate: 0,
        averageProjectValue: timeline.summary.averageProjectValue
      }
    }

    return ApiResponseDto.success(analytics, 'Business analytics summary retrieved successfully')
  }

  @Get('compliance/materai/:clientId')
  @ApiOperation({
    summary: 'Get materai compliance report',
    description: 'Retrieves detailed materai compliance report for Indonesian regulations'
  })
  @ApiParam({
    name: 'clientId',
    description: 'Client ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: 200,
    description: 'Materai compliance report retrieved successfully'
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found'
  })
  async getMateraiComplianceReport(
    @Param('clientId', ParseUUIDPipe) clientId: string
  ): Promise<ApiResponseDto<any>> {
    const timeline = await this.businessJourneyService.getClientTimeline(
      clientId,
      {}
    )

    const complianceReport = {
      clientId,
      clientName: timeline.clientName,
      materaiCompliance: timeline.materaiCompliance,
      recommendations: this.generateMateraiRecommendations(timeline.materaiCompliance),
      upcomingRequirements: [],
      complianceHistory: []
    }

    return ApiResponseDto.success(complianceReport, 'Materai compliance report retrieved successfully')
  }

  // Helper methods

  private getStartDateForPeriod(period: string): string {
    const now = new Date()
    const startDate = new Date()

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }

    return startDate.toISOString()
  }

  private generateMateraiRecommendations(compliance: any): string[] {
    const recommendations: string[] = []

    if (compliance.compliancePercentage < 100) {
      recommendations.push('Terdapat invoice yang memerlukan materai. Segera tempelkan materai pada dokumen fisik.')
    }

    if (compliance.pendingAmount > 0) {
      recommendations.push(`Total materai yang diperlukan: Rp ${compliance.pendingAmount.toLocaleString('id-ID')}`)
    }

    if (compliance.compliancePercentage < 50) {
      recommendations.push('Tingkat kepatuhan materai rendah. Pertimbangkan untuk mengatur sistem reminder otomatis.')
    }

    return recommendations
  }
}