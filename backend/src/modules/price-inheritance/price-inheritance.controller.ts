// Price Inheritance Controller - Indonesian Business Management System
// RESTful API endpoints for price inheritance with Indonesian business compliance

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  ValidationPipe,
  Request,
  Logger
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { Role } from '../auth/enums/role.enum'

import { PriceInheritanceService } from './price-inheritance.service'
import {
  CreatePriceInheritanceDto,
  UpdatePriceInheritanceDto,
  GetPriceSourcesQueryDto,
  ValidatePriceInheritanceDto,
  PriceInheritanceResponseDto,
  PriceSourceDto,
  PriceValidationResponseDto,
  PriceInheritanceAnalyticsDto,
  PriceInheritanceErrorDto,
  EntityType
} from './dto/price-inheritance.dto'

@ApiTags('Price Inheritance')
@Controller('price-inheritance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PriceInheritanceController {
  private readonly logger = new Logger(PriceInheritanceController.name)

  constructor(
    private readonly priceInheritanceService: PriceInheritanceService
  ) {}

  @Get('sources')
  @ApiOperation({ 
    summary: 'Get available price sources',
    description: 'Retrieve available price sources for a given entity, supporting Indonesian business workflow from project → quotation → invoice'
  })
  @ApiQuery({ 
    name: 'entityType', 
    enum: EntityType,
    description: 'Type of entity (quotation or invoice)'
  })
  @ApiQuery({ 
    name: 'entityId', 
    description: 'UUID of the entity'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Available price sources retrieved successfully',
    type: [PriceSourceDto]
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Entity not found or no sources available',
    type: PriceInheritanceErrorDto
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to access entity',
    type: PriceInheritanceErrorDto
  })
  @Roles(Role.USER, Role.ADMIN)
  async getAvailableSources(
    @Query(ValidationPipe) query: GetPriceSourcesQueryDto,
    @Request() req: any
  ): Promise<PriceSourceDto[]> {
    this.logger.log(`Getting price sources for ${query.entityType}:${query.entityId} by user ${req.user.sub}`)

    try {
      const sources = await this.priceInheritanceService.getAvailableSources(
        query.entityType,
        query.entityId,
        req.user.sub
      )

      this.logger.log(`Found ${sources.length} price sources for ${query.entityType}:${query.entityId}`)
      return sources

    } catch (error) {
      this.logger.error(`Failed to get price sources: ${error.message}`, error.stack)
      throw error
    }
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Validate price inheritance configuration',
    description: 'Validate price inheritance with Indonesian business rules including materai compliance, tax requirements, and business etiquette'
  })
  @ApiBody({ 
    type: ValidatePriceInheritanceDto,
    description: 'Price inheritance configuration to validate'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Price inheritance validation completed',
    type: PriceValidationResponseDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid price inheritance configuration',
    type: PriceInheritanceErrorDto
  })
  @Roles(Role.USER, Role.ADMIN)
  async validatePriceInheritance(
    @Body(ValidationPipe) dto: ValidatePriceInheritanceDto,
    @Request() req: any
  ): Promise<PriceValidationResponseDto> {
    this.logger.log(`Validating price inheritance: ${dto.amount} IDR in ${dto.mode} mode by user ${req.user.sub}`)

    try {
      const validation = await this.priceInheritanceService.validatePriceInheritance(
        dto.amount,
        dto.mode,
        dto.sourceId,
        dto.inheritedAmount
      )

      this.logger.log(`Price validation completed: valid=${validation.isValid}, errors=${validation.errors.length}, warnings=${validation.warnings.length}`)
      return validation

    } catch (error) {
      this.logger.error(`Price validation failed: ${error.message}`, error.stack)
      throw error
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create price inheritance configuration',
    description: 'Create a new price inheritance configuration with Indonesian compliance validation and user interaction tracking'
  })
  @ApiBody({ 
    type: CreatePriceInheritanceDto,
    description: 'Price inheritance configuration to create'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Price inheritance configuration created successfully',
    type: PriceInheritanceResponseDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid price inheritance configuration',
    type: PriceInheritanceErrorDto
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to create configuration',
    type: PriceInheritanceErrorDto
  })
  @Roles(Role.USER, Role.ADMIN)
  async createPriceInheritance(
    @Body(ValidationPipe) dto: CreatePriceInheritanceDto,
    @Request() req: any
  ): Promise<PriceInheritanceResponseDto> {
    this.logger.log(`Creating price inheritance for ${dto.entityType}:${dto.entityId} by user ${req.user.sub}`)

    try {
      const result = await this.priceInheritanceService.createPriceInheritance(
        dto,
        req.user.sub
      )

      this.logger.log(`Price inheritance created successfully for ${dto.entityType}:${dto.entityId}`)
      return result

    } catch (error) {
      this.logger.error(`Failed to create price inheritance: ${error.message}`, error.stack)
      throw error
    }
  }

  @Put(':id')
  @ApiOperation({ 
    summary: 'Update price inheritance configuration',
    description: 'Update an existing price inheritance configuration with re-validation of Indonesian business rules'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'UUID of the price inheritance configuration'
  })
  @ApiBody({ 
    type: UpdatePriceInheritanceDto,
    description: 'Updated price inheritance configuration'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Price inheritance configuration updated successfully',
    type: PriceInheritanceResponseDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Price inheritance configuration not found',
    type: PriceInheritanceErrorDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid price inheritance configuration',
    type: PriceInheritanceErrorDto
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to update configuration',
    type: PriceInheritanceErrorDto
  })
  @Roles(Role.USER, Role.ADMIN)
  async updatePriceInheritance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: UpdatePriceInheritanceDto,
    @Request() req: any
  ): Promise<PriceInheritanceResponseDto> {
    this.logger.log(`Updating price inheritance ${id} for ${dto.entityType}:${dto.entityId} by user ${req.user.sub}`)

    try {
      const result = await this.priceInheritanceService.updatePriceInheritance(
        id,
        dto,
        req.user.sub
      )

      this.logger.log(`Price inheritance ${id} updated successfully`)
      return result

    } catch (error) {
      this.logger.error(`Failed to update price inheritance ${id}: ${error.message}`, error.stack)
      throw error
    }
  }

  @Get('analytics')
  @ApiOperation({ 
    summary: 'Get price inheritance analytics',
    description: 'Retrieve analytics data for price inheritance usage, compliance rates, and user behavior patterns'
  })
  @ApiQuery({ 
    name: 'dateFrom', 
    type: Date, 
    required: false,
    description: 'Start date for analytics (ISO 8601 format)'
  })
  @ApiQuery({ 
    name: 'dateTo', 
    type: Date, 
    required: false,
    description: 'End date for analytics (ISO 8601 format)'
  })
  @ApiQuery({ 
    name: 'userId', 
    required: false,
    description: 'Filter analytics by specific user (admin only)'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Price inheritance analytics retrieved successfully',
    type: PriceInheritanceAnalyticsDto
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to access analytics',
    type: PriceInheritanceErrorDto
  })
  @Roles(Role.ADMIN)
  async getPriceInheritanceAnalytics(
    @Request() req: any,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('userId') userId?: string
  ): Promise<PriceInheritanceAnalyticsDto> {
    this.logger.log(`Getting price inheritance analytics by user ${req.user.sub}`)

    try {
      // Default to last 30 days if no dates provided
      const defaultDateFrom = new Date()
      defaultDateFrom.setDate(defaultDateFrom.getDate() - 30)
      const defaultDateTo = new Date()

      const analytics = await this.priceInheritanceService.getPriceInheritanceAnalytics(
        dateFrom ? new Date(dateFrom) : defaultDateFrom,
        dateTo ? new Date(dateTo) : defaultDateTo,
        userId
      )

      this.logger.log(`Retrieved price inheritance analytics for date range`)
      return analytics

    } catch (error) {
      this.logger.error(`Failed to get price inheritance analytics: ${error.message}`, error.stack)
      throw error
    }
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Health check for price inheritance service',
    description: 'Check the health and availability of the price inheritance service'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', format: 'date-time' },
        version: { type: 'string', example: '1.0.0' },
        features: {
          type: 'object',
          properties: {
            indonesianCompliance: { type: 'boolean', example: true },
            materaiValidation: { type: 'boolean', example: true },
            businessEtiquette: { type: 'boolean', example: true },
            userTracking: { type: 'boolean', example: true }
          }
        }
      }
    }
  })
  async getHealthCheck() {
    this.logger.log('Price inheritance health check requested')

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      features: {
        indonesianCompliance: true,
        materaiValidation: true,
        businessEtiquette: true,
        userTracking: true
      }
    }
  }

  // Indonesian-specific endpoints

  @Post('materai/calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Calculate required materai amount',
    description: 'Calculate the required materai (stamp duty) amount based on Indonesian regulations (UU No. 13 Tahun 1985)'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          minimum: 0,
          maximum: 999999999999,
          description: 'Transaction amount in IDR'
        }
      },
      required: ['amount']
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Materai calculation completed',
    schema: {
      type: 'object',
      properties: {
        required: { type: 'boolean', description: 'Whether materai is required' },
        amount: { type: 'number', description: 'Required materai amount in IDR' },
        regulation: { type: 'string', description: 'Reference to Indonesian regulation' },
        guidance: { type: 'string', description: 'Guidance for materai application' }
      }
    }
  })
  @Roles(Role.USER, Role.ADMIN)
  async calculateMaterai(
    @Body('amount') amount: number,
    @Request() req: any
  ) {
    this.logger.log(`Calculating materai for amount ${amount} IDR by user ${req.user.sub}`)

    const required = amount >= 5000000
    const materaiAmount = required ? (amount >= 1000000000 ? 20000 : 10000) : 0

    return {
      required,
      amount: materaiAmount,
      regulation: 'UU No. 13 Tahun 1985 tentang Bea Materai',
      guidance: required 
        ? `Tempel materai ${materaiAmount.toLocaleString('id-ID')} IDR pada dokumen asli`
        : 'Materai tidak diperlukan untuk transaksi di bawah 5 juta IDR'
    }
  }

  @Get('business-etiquette/:amount')
  @ApiOperation({ 
    summary: 'Get Indonesian business etiquette guidance',
    description: 'Get business etiquette recommendations based on transaction amount and Indonesian business culture'
  })
  @ApiParam({ 
    name: 'amount', 
    type: 'number',
    description: 'Transaction amount in IDR'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Business etiquette guidance retrieved',
    schema: {
      type: 'object',
      properties: {
        communicationStyle: { 
          type: 'string', 
          enum: ['formal', 'semi-formal', 'casual'],
          description: 'Recommended communication style'
        },
        suggestedTiming: { 
          type: 'string', 
          description: 'Best time for business communication'
        },
        culturalNotes: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Indonesian cultural considerations'
        },
        recommendedChannels: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Preferred communication channels'
        }
      }
    }
  })
  @Roles(Role.USER, Role.ADMIN)
  async getBusinessEtiquette(
    @Param('amount') amount: number,
    @Request() req: any
  ) {
    this.logger.log(`Getting business etiquette guidance for ${amount} IDR by user ${req.user.sub}`)

    const communicationStyle = amount >= 100000000 ? 'formal' : 'semi-formal'
    const hour = new Date().getHours()
    
    let suggestedTiming = 'Hari kerja 09:00-17:00 WIB'
    if (hour >= 9 && hour <= 12) {
      suggestedTiming = 'Pagi ini (09:00-12:00 WIB) - Waktu ideal untuk diskusi bisnis'
    } else if (hour >= 13 && hour <= 16) {
      suggestedTiming = 'Siang ini (13:00-16:00 WIB) - Waktu baik untuk negosiasi'
    }

    return {
      communicationStyle,
      suggestedTiming,
      culturalNotes: [
        'Dalam budaya Indonesia, sopan santun dan respek sangat penting',
        'Berikan waktu yang cukup untuk klien mempertimbangkan proposal',
        'Gunakan bahasa yang formal namun tetap ramah dan personal',
        'Sertakan salam pembuka dan penutup yang sesuai'
      ],
      recommendedChannels: amount >= 100000000 
        ? ['email', 'meeting', 'phone', 'whatsapp']
        : ['email', 'whatsapp', 'phone']
    }
  }
}