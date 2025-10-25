import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user: { id: string };
}
import { PaymentMilestonesService } from '../services/payment-milestones.service';
import { CreatePaymentMilestoneDto } from '../dto/create-payment-milestone.dto';
import { UpdatePaymentMilestoneDto } from '../dto/update-payment-milestone.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

/**
 * PaymentMilestonesController
 *
 * REST API endpoints for managing payment milestones in quotations
 * Supports Indonesian "termin pembayaran" (payment terms) workflow
 */
@Controller('api/quotations/:quotationId/payment-milestones')
@UseGuards(JwtAuthGuard)
export class PaymentMilestonesController {
  constructor(
    private paymentMilestonesService: PaymentMilestonesService,
  ) {}

  /**
   * POST /api/quotations/:quotationId/payment-milestones
   * Create a new payment milestone for a quotation
   */
  @Post()
  async create(
    @Param('quotationId') quotationId: string,
    @Body() dto: CreatePaymentMilestoneDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.paymentMilestonesService.addPaymentMilestone(quotationId, dto);
  }

  /**
   * GET /api/quotations/:quotationId/payment-milestones
   * Get all payment milestones for a quotation
   */
  @Get()
  async findAll(
    @Param('quotationId') quotationId: string,
  ) {
    return this.paymentMilestonesService.getQuotationMilestones(quotationId);
  }

  /**
   * GET /api/quotations/:quotationId/payment-milestones/:id
   * Get a specific payment milestone
   */
  @Get(':id')
  async findOne(
    @Param('quotationId') quotationId: string,
    @Param('id') id: string,
  ) {
    // Get milestone and verify it belongs to the quotation
    const milestones =
      await this.paymentMilestonesService.getQuotationMilestones(quotationId);
    const milestone = milestones.find((m) => m.id === id);

    if (!milestone) {
      throw new BadRequestException(
        'Payment milestone tidak ditemukan dalam quotation ini',
      );
    }

    return milestone;
  }

  /**
   * PATCH /api/quotations/:quotationId/payment-milestones/:id
   * Update a payment milestone
   */
  @Patch(':id')
  async update(
    @Param('quotationId') quotationId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMilestoneDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.paymentMilestonesService.updatePaymentMilestone(id, dto);
  }

  /**
   * DELETE /api/quotations/:quotationId/payment-milestones/:id
   * Delete a payment milestone
   */
  @Delete(':id')
  async remove(
    @Param('quotationId') quotationId: string,
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.paymentMilestonesService.removePaymentMilestone(id);
    return { message: 'Payment milestone berhasil dihapus' };
  }

  /**
   * POST /api/quotations/:quotationId/payment-milestones/:id/generate-invoice
   * Generate invoice for a specific payment milestone
   */
  @Post(':id/generate-invoice')
  async generateInvoice(
    @Param('quotationId') quotationId: string,
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.paymentMilestonesService.generateMilestoneInvoice(
      id,
      req.user.id,
    );
  }

  /**
   * POST /api/quotations/:quotationId/payment-milestones/validate
   * Validate that milestone percentages sum to 100%
   */
  @Post('validate')
  async validate(
    @Param('quotationId') quotationId: string,
  ) {
    const isValid =
      await this.paymentMilestonesService.validateQuotationMilestones(
        quotationId,
      );
    const milestones =
      await this.paymentMilestonesService.getQuotationMilestones(quotationId);
    const totalPercentage = milestones.reduce(
      (sum, m) => sum + Number(m.paymentPercentage),
      0,
    );

    return {
      valid: isValid,
      totalPercentage,
      totalMilestones: milestones.length,
      errors: isValid
        ? []
        : [
            `Total payment percentage harus 100% (saat ini: ${totalPercentage}%)`,
          ],
    };
  }

  /**
   * GET /api/quotations/:quotationId/payment-milestones/progress
   * Get progress of milestone-based quotation (which are invoiced, paid, etc.)
   */
  @Get('progress')
  async getProgress(
    @Param('quotationId') quotationId: string,
  ) {
    return this.paymentMilestonesService.getProgress(quotationId);
  }

  /**
   * PATCH /api/quotations/:quotationId/payment-milestones/:id/link-project-milestone
   * Link payment milestone to a project milestone
   */
  @Patch(':id/link-project-milestone')
  async linkProjectMilestone(
    @Param('quotationId') quotationId: string,
    @Param('id') id: string,
    @Body('projectMilestoneId') projectMilestoneId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!projectMilestoneId) {
      throw new BadRequestException('projectMilestoneId tidak boleh kosong');
    }

    await this.paymentMilestonesService.linkToProjectMilestone(
      id,
      projectMilestoneId,
    );

    return { message: 'Payment milestone berhasil di-link ke project milestone' };
  }
}
