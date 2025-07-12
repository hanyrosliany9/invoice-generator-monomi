import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { PaymentsService } from './payments.service'
import { CreatePaymentDto, UpdatePaymentDto, PaymentResponseDto } from './dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ApiResponse } from '../../common/dto/api-response.dto'
import { getErrorMessage } from '../../common/utils/error-handling.util'

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPaymentDto: CreatePaymentDto): Promise<ApiResponse<PaymentResponseDto>> {
    try {
      const payment = await this.paymentsService.create(createPaymentDto)
      return {
        data: payment,
        message: 'Payment created successfully',
        status: 'success'
      }
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error) || 'Failed to create payment',
        status: 'error'
      }
    }
  }

  @Get()
  async findAll(@Query('invoiceId') invoiceId?: string): Promise<ApiResponse<PaymentResponseDto[]>> {
    try {
      const payments = await this.paymentsService.findAll(invoiceId)
      return {
        data: payments,
        message: 'Payments retrieved successfully',
        status: 'success'
      }
    } catch (error) {
      return {
        data: [],
        message: getErrorMessage(error) || 'Failed to retrieve payments',
        status: 'error'
      }
    }
  }

  @Get('stats')
  async getStats(@Query('invoiceId') invoiceId?: string): Promise<ApiResponse<any>> {
    try {
      const stats = await this.paymentsService.getPaymentStats(invoiceId)
      return {
        data: stats,
        message: 'Payment statistics retrieved successfully',
        status: 'success'
      }
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error) || 'Failed to retrieve payment statistics',
        status: 'error'
      }
    }
  }

  @Get('invoice/:invoiceId')
  async getByInvoice(@Param('invoiceId') invoiceId: string): Promise<ApiResponse<PaymentResponseDto[]>> {
    try {
      const payments = await this.paymentsService.getPaymentsByInvoice(invoiceId)
      return {
        data: payments,
        message: 'Invoice payments retrieved successfully',
        status: 'success'
      }
    } catch (error) {
      return {
        data: [],
        message: getErrorMessage(error) || 'Failed to retrieve invoice payments',
        status: 'error'
      }
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ApiResponse<PaymentResponseDto>> {
    try {
      const payment = await this.paymentsService.findOne(id)
      return {
        data: payment,
        message: 'Payment retrieved successfully',
        status: 'success'
      }
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error) || 'Failed to retrieve payment',
        status: 'error'
      }
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto): Promise<ApiResponse<PaymentResponseDto>> {
    try {
      const payment = await this.paymentsService.update(id, updatePaymentDto)
      return {
        data: payment,
        message: 'Payment updated successfully',
        status: 'success'
      }
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error) || 'Failed to update payment',
        status: 'error'
      }
    }
  }

  @Patch(':id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmPayment(@Param('id') id: string): Promise<ApiResponse<PaymentResponseDto>> {
    try {
      const payment = await this.paymentsService.update(id, { 
        status: 'CONFIRMED' as any,
        confirmedAt: new Date().toISOString()
      })
      return {
        data: payment,
        message: 'Payment confirmed successfully',
        status: 'success'
      }
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error) || 'Failed to confirm payment',
        status: 'error'
      }
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<ApiResponse<null>> {
    try {
      await this.paymentsService.remove(id)
      return {
        data: null,
        message: 'Payment deleted successfully',
        status: 'success'
      }
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error) || 'Failed to delete payment',
        status: 'error'
      }
    }
  }
}