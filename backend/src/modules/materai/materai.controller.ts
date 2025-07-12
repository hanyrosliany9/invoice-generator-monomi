import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MateraiService } from './materai.service';
import { ApplyMateraiDto, BulkApplyMateraiDto, UpdateMateraiConfigDto } from './dto';
import { getErrorMessage } from '../../common/utils/error-handling.util';

@ApiTags('materai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('materai')
export class MateraiController {
  constructor(private readonly materaiService: MateraiService) {}

  @Get('check/:invoiceId')
  @ApiOperation({ summary: 'Check if invoice requires materai' })
  @ApiResponse({
    status: 200,
    description: 'Materai requirement check result',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            required: { type: 'boolean' },
            amount: { type: 'number' },
            threshold: { type: 'number' },
            message: { type: 'string' },
            compliance: {
              type: 'object',
              properties: {
                lawReference: { type: 'string' },
                effectiveDate: { type: 'string' },
                penalty: { type: 'string' }
              }
            }
          }
        },
        message: { type: 'string' },
        status: { type: 'string', enum: ['success', 'error'] }
      }
    }
  })
  async checkMateraiRequirement(@Param('invoiceId') invoiceId: string) {
    try {
      const result = await this.materaiService.checkMateraiRequirement(invoiceId);
      return {
        data: result,
        message: 'Materai requirement checked successfully',
        status: 'success'
      };
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error),
        status: 'error'
      };
    }
  }

  @Post('apply/:invoiceId')
  @ApiOperation({ summary: 'Apply materai to invoice' })
  @ApiResponse({
    status: 201,
    description: 'Materai applied successfully',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'null' },
        message: { type: 'string' },
        status: { type: 'string', enum: ['success', 'error'] }
      }
    }
  })
  async applyMaterai(
    @Param('invoiceId') invoiceId: string,
    @Body() applyMateraiDto: ApplyMateraiDto,
    @Request() req: any
  ) {
    try {
      await this.materaiService.applyMaterai(invoiceId, req.user.id);
      return {
        data: null,
        message: 'Materai applied successfully',
        status: 'success'
      };
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error),
        status: 'error'
      };
    }
  }

  @Delete('remove/:invoiceId')
  @ApiOperation({ summary: 'Remove materai from invoice' })
  @ApiResponse({
    status: 200,
    description: 'Materai removed successfully',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'null' },
        message: { type: 'string' },
        status: { type: 'string', enum: ['success', 'error'] }
      }
    }
  })
  async removeMaterai(
    @Param('invoiceId') invoiceId: string,
    @Request() req: any
  ) {
    try {
      await this.materaiService.removeMaterai(invoiceId, req.user.id);
      return {
        data: null,
        message: 'Materai removed successfully',
        status: 'success'
      };
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error),
        status: 'error'
      };
    }
  }

  @Post('bulk-apply')
  @ApiOperation({ summary: 'Apply materai to multiple invoices' })
  @ApiResponse({
    status: 201,
    description: 'Bulk materai application result',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            success: { type: 'array', items: { type: 'string' } },
            failed: { type: 'array', items: { type: 'string' } }
          }
        },
        message: { type: 'string' },
        status: { type: 'string', enum: ['success', 'error'] }
      }
    }
  })
  async bulkApplyMaterai(
    @Body() bulkApplyMateraiDto: BulkApplyMateraiDto,
    @Request() req: any
  ) {
    try {
      const result = await this.materaiService.bulkApplyMaterai(
        bulkApplyMateraiDto.invoiceIds,
        req.user.id
      );
      return {
        data: result,
        message: `Materai applied to ${result.success.length} invoices, ${result.failed.length} failed`,
        status: 'success'
      };
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error),
        status: 'error'
      };
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get materai statistics' })
  @ApiResponse({
    status: 200,
    description: 'Materai statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            totalInvoicesRequiringMaterai: { type: 'number' },
            totalInvoicesWithMaterai: { type: 'number' },
            totalInvoicesWithoutMaterai: { type: 'number' },
            complianceRate: { type: 'number' },
            totalStampDutyAmount: { type: 'number' },
            recentMateraiApplications: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  invoiceId: { type: 'string' },
                  invoiceNumber: { type: 'string' },
                  amount: { type: 'string' },
                  appliedAt: { type: 'string' },
                  clientName: { type: 'string' }
                }
              }
            }
          }
        },
        message: { type: 'string' },
        status: { type: 'string', enum: ['success', 'error'] }
      }
    }
  })
  async getMateraiStats() {
    try {
      const stats = await this.materaiService.getMateraiStats();
      return {
        data: stats,
        message: 'Materai statistics retrieved successfully',
        status: 'success'
      };
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error),
        status: 'error'
      };
    }
  }

  @Get('reminders')
  @ApiOperation({ summary: 'Get invoices requiring materai reminders' })
  @ApiResponse({
    status: 200,
    description: 'Invoices requiring materai reminders retrieved successfully'
  })
  async getInvoicesRequiringMateraiReminders() {
    try {
      const invoices = await this.materaiService.getInvoicesRequiringMateraiReminders();
      return {
        data: invoices,
        message: 'Invoices requiring materai reminders retrieved successfully',
        status: 'success'
      };
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error),
        status: 'error'
      };
    }
  }

  @Get('config')
  @ApiOperation({ summary: 'Get materai configuration' })
  @ApiResponse({
    status: 200,
    description: 'Materai configuration retrieved successfully'
  })
  async getMateraiConfig() {
    try {
      const config = this.materaiService.getMateraiConfig();
      return {
        data: config,
        message: 'Materai configuration retrieved successfully',
        status: 'success'
      };
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error),
        status: 'error'
      };
    }
  }

  @Patch('config')
  @ApiOperation({ summary: 'Update materai configuration' })
  @ApiResponse({
    status: 200,
    description: 'Materai configuration updated successfully'
  })
  async updateMateraiConfig(@Body() updateMateraiConfigDto: UpdateMateraiConfigDto) {
    try {
      const config = await this.materaiService.updateMateraiConfig(updateMateraiConfigDto);
      return {
        data: config,
        message: 'Materai configuration updated successfully',
        status: 'success'
      };
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error),
        status: 'error'
      };
    }
  }

  @Get('validate/:invoiceId')
  @ApiOperation({ summary: 'Validate materai compliance for invoice' })
  @ApiResponse({
    status: 200,
    description: 'Materai compliance validation result'
  })
  async validateMateraiCompliance(@Param('invoiceId') invoiceId: string) {
    try {
      const result = await this.materaiService.validateMateraiCompliance(invoiceId);
      return {
        data: result,
        message: 'Materai compliance validated successfully',
        status: 'success'
      };
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error),
        status: 'error'
      };
    }
  }
}
