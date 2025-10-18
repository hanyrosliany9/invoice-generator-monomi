import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VendorInvoicesService } from './vendor-invoices.service';
import {
  CreateVendorInvoiceDto,
  UpdateVendorInvoiceDto,
  VendorInvoiceQueryDto,
  MatchVendorInvoiceDto,
  ApproveVendorInvoiceDto,
  RejectVendorInvoiceDto,
  PostVendorInvoiceDto,
  CancelVendorInvoiceDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Vendor Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vendor-invoices')
export class VendorInvoicesController {
  constructor(private readonly vendorInvoicesService: VendorInvoicesService) {}

  @Post()
  @Roles('ADMIN', 'ACCOUNTANT', 'FINANCE_MANAGER')
  @ApiOperation({ summary: 'Create new vendor invoice' })
  @ApiResponse({ status: 201, description: 'VI created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data or business rule violation' })
  @ApiResponse({ status: 404, description: 'Vendor/PO/GR not found' })
  create(@Request() req: any, @Body() createVendorInvoiceDto: CreateVendorInvoiceDto) {
    return this.vendorInvoicesService.create(req.user.userId, createVendorInvoiceDto);
  }

  @Get()
  @Roles('ADMIN', 'ACCOUNTANT', 'FINANCE_MANAGER', 'PROJECT_MANAGER')
  @ApiOperation({ summary: 'Get all vendor invoices with filtering' })
  @ApiResponse({ status: 200, description: 'List of vendor invoices' })
  findAll(@Query() query: VendorInvoiceQueryDto) {
    return this.vendorInvoicesService.findAll(query);
  }

  @Get('statistics')
  @Roles('ADMIN', 'FINANCE_MANAGER')
  @ApiOperation({ summary: 'Get vendor invoice statistics' })
  @ApiResponse({ status: 200, description: 'VI statistics' })
  getStatistics(
    @Query('vendorId') vendorId?: string,
    @Query('poId') poId?: string,
    @Query('grId') grId?: string,
    @Query('status') status?: any,
  ) {
    return this.vendorInvoicesService.getStatistics({ vendorId, poId, grId, status });
  }

  @Get(':id')
  @Roles('ADMIN', 'ACCOUNTANT', 'FINANCE_MANAGER', 'PROJECT_MANAGER')
  @ApiOperation({ summary: 'Get vendor invoice by ID' })
  @ApiResponse({ status: 200, description: 'Vendor invoice details' })
  @ApiResponse({ status: 404, description: 'VI not found' })
  findOne(@Param('id') id: string) {
    return this.vendorInvoicesService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'ACCOUNTANT', 'FINANCE_MANAGER')
  @ApiOperation({ summary: 'Update vendor invoice (DRAFT only)' })
  @ApiResponse({ status: 200, description: 'VI updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update non-DRAFT VI' })
  @ApiResponse({ status: 404, description: 'VI not found' })
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateVendorInvoiceDto: UpdateVendorInvoiceDto,
  ) {
    return this.vendorInvoicesService.update(id, req.user.userId, updateVendorInvoiceDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'FINANCE_MANAGER')
  @ApiOperation({ summary: 'Delete vendor invoice (DRAFT only)' })
  @ApiResponse({ status: 200, description: 'VI deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete non-DRAFT VI' })
  @ApiResponse({ status: 404, description: 'VI not found' })
  remove(@Param('id') id: string) {
    return this.vendorInvoicesService.remove(id);
  }

  @Post(':id/match')
  @Roles('ADMIN', 'ACCOUNTANT', 'FINANCE_MANAGER')
  @ApiOperation({ summary: 'Perform three-way matching (PO-GR-VI)' })
  @ApiResponse({ status: 200, description: 'Matching completed successfully' })
  @ApiResponse({ status: 400, description: 'Cannot match without PO/GR reference' })
  @ApiResponse({ status: 404, description: 'VI not found' })
  match(
    @Request() req: any,
    @Param('id') id: string,
    @Body() matchDto: MatchVendorInvoiceDto,
  ) {
    return this.vendorInvoicesService.match(id, req.user.userId, matchDto);
  }

  @Post(':id/approve')
  @Roles('ADMIN', 'FINANCE_MANAGER')
  @ApiOperation({ summary: 'Approve vendor invoice' })
  @ApiResponse({ status: 200, description: 'VI approved successfully' })
  @ApiResponse({ status: 400, description: 'Cannot approve already approved/posted VI' })
  @ApiResponse({ status: 404, description: 'VI not found' })
  approve(
    @Request() req: any,
    @Param('id') id: string,
    @Body() approveDto: ApproveVendorInvoiceDto,
  ) {
    return this.vendorInvoicesService.approve(id, req.user.userId, approveDto);
  }

  @Post(':id/reject')
  @Roles('ADMIN', 'FINANCE_MANAGER')
  @ApiOperation({ summary: 'Reject vendor invoice' })
  @ApiResponse({ status: 200, description: 'VI rejected successfully' })
  @ApiResponse({ status: 400, description: 'Cannot reject posted/paid VI' })
  @ApiResponse({ status: 404, description: 'VI not found' })
  reject(
    @Request() req: any,
    @Param('id') id: string,
    @Body() rejectDto: RejectVendorInvoiceDto,
  ) {
    return this.vendorInvoicesService.reject(id, req.user.userId, rejectDto);
  }

  @Post(':id/post')
  @Roles('ADMIN', 'FINANCE_MANAGER')
  @ApiOperation({ summary: 'Post vendor invoice (creates AP and journal entry)' })
  @ApiResponse({ status: 200, description: 'VI posted successfully' })
  @ApiResponse({ status: 400, description: 'Only APPROVED VI can be posted' })
  @ApiResponse({ status: 404, description: 'VI not found' })
  post(
    @Request() req: any,
    @Param('id') id: string,
    @Body() postDto: PostVendorInvoiceDto,
  ) {
    return this.vendorInvoicesService.post(id, req.user.userId, postDto);
  }

  @Post(':id/cancel')
  @Roles('ADMIN', 'FINANCE_MANAGER')
  @ApiOperation({ summary: 'Cancel vendor invoice' })
  @ApiResponse({ status: 200, description: 'VI cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel posted/paid VI' })
  @ApiResponse({ status: 404, description: 'VI not found' })
  cancel(
    @Request() req: any,
    @Param('id') id: string,
    @Body() cancelDto: CancelVendorInvoiceDto,
  ) {
    return this.vendorInvoicesService.cancel(id, req.user.userId, cancelDto);
  }
}
