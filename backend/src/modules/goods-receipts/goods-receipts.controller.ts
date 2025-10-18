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
import { GoodsReceiptsService } from './goods-receipts.service';
import {
  CreateGoodsReceiptDto,
  UpdateGoodsReceiptDto,
  GoodsReceiptQueryDto,
  InspectGoodsReceiptDto,
  PostGoodsReceiptDto,
  CancelGoodsReceiptDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Goods Receipts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('goods-receipts')
export class GoodsReceiptsController {
  constructor(private readonly goodsReceiptsService: GoodsReceiptsService) {}

  @Post()
  @Roles('ADMIN', 'PROJECT_MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Create new goods receipt from PO' })
  @ApiResponse({ status: 201, description: 'GR created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data or business rule violation' })
  @ApiResponse({ status: 404, description: 'PO not found' })
  create(@Request() req: any, @Body() createGoodsReceiptDto: CreateGoodsReceiptDto) {
    return this.goodsReceiptsService.create(req.user.userId, createGoodsReceiptDto);
  }

  @Get()
  @Roles('ADMIN', 'PROJECT_MANAGER', 'STAFF', 'ACCOUNTANT', 'FINANCE_MANAGER')
  @ApiOperation({ summary: 'Get all goods receipts with filtering' })
  @ApiResponse({ status: 200, description: 'List of goods receipts' })
  findAll(@Query() query: GoodsReceiptQueryDto) {
    return this.goodsReceiptsService.findAll(query);
  }

  @Get('statistics')
  @Roles('ADMIN', 'PROJECT_MANAGER', 'FINANCE_MANAGER')
  @ApiOperation({ summary: 'Get goods receipt statistics' })
  @ApiResponse({ status: 200, description: 'GR statistics' })
  getStatistics(
    @Query('poId') poId?: string,
    @Query('vendorId') vendorId?: string,
    @Query('status') status?: any,
  ) {
    return this.goodsReceiptsService.getStatistics({ poId, vendorId, status });
  }

  @Get(':id')
  @Roles('ADMIN', 'PROJECT_MANAGER', 'STAFF', 'ACCOUNTANT', 'FINANCE_MANAGER')
  @ApiOperation({ summary: 'Get goods receipt by ID' })
  @ApiResponse({ status: 200, description: 'Goods receipt details' })
  @ApiResponse({ status: 404, description: 'GR not found' })
  findOne(@Param('id') id: string) {
    return this.goodsReceiptsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'PROJECT_MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Update goods receipt (DRAFT only)' })
  @ApiResponse({ status: 200, description: 'GR updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update non-DRAFT GR' })
  @ApiResponse({ status: 404, description: 'GR not found' })
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateGoodsReceiptDto: UpdateGoodsReceiptDto,
  ) {
    return this.goodsReceiptsService.update(id, req.user.userId, updateGoodsReceiptDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'PROJECT_MANAGER')
  @ApiOperation({ summary: 'Delete goods receipt (DRAFT only)' })
  @ApiResponse({ status: 200, description: 'GR deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete non-DRAFT GR' })
  @ApiResponse({ status: 404, description: 'GR not found' })
  remove(@Param('id') id: string) {
    return this.goodsReceiptsService.remove(id);
  }

  @Post(':id/inspect')
  @Roles('ADMIN', 'PROJECT_MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Record inspection results' })
  @ApiResponse({ status: 200, description: 'Inspection recorded successfully' })
  @ApiResponse({ status: 400, description: 'Cannot inspect POSTED/CANCELLED GR' })
  @ApiResponse({ status: 404, description: 'GR not found' })
  inspect(
    @Request() req: any,
    @Param('id') id: string,
    @Body() inspectDto: InspectGoodsReceiptDto,
  ) {
    return this.goodsReceiptsService.inspect(id, req.user.userId, inspectDto);
  }

  @Post(':id/post')
  @Roles('ADMIN', 'PROJECT_MANAGER', 'FINANCE_MANAGER')
  @ApiOperation({ summary: 'Post goods receipt (updates PO, creates journal entry)' })
  @ApiResponse({ status: 200, description: 'GR posted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot post already posted/cancelled GR' })
  @ApiResponse({ status: 404, description: 'GR not found' })
  post(
    @Request() req: any,
    @Param('id') id: string,
    @Body() postDto: PostGoodsReceiptDto,
  ) {
    return this.goodsReceiptsService.post(id, req.user.userId, postDto);
  }

  @Post(':id/cancel')
  @Roles('ADMIN', 'PROJECT_MANAGER')
  @ApiOperation({ summary: 'Cancel goods receipt' })
  @ApiResponse({ status: 200, description: 'GR cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel posted GR' })
  @ApiResponse({ status: 404, description: 'GR not found' })
  cancel(
    @Request() req: any,
    @Param('id') id: string,
    @Body() cancelDto: CancelGoodsReceiptDto,
  ) {
    return this.goodsReceiptsService.cancel(id, req.user.userId, cancelDto);
  }
}
