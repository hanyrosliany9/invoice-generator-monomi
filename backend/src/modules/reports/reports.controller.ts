import { Controller, Get, Post, Query, Body, UseGuards, Res } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiTags,
  ApiQuery,
  ApiBody,
  ApiOperation,
} from "@nestjs/swagger";
import { Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ReportsService } from "./reports.service";
import { ExcelExportService } from "./excel-export.service";

@ApiTags("reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("reports")
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly excelExportService: ExcelExportService,
  ) {}

  @Get("revenue")
  @ApiOperation({ summary: "Get revenue analytics" })
  @ApiQuery({
    name: "period",
    required: false,
    enum: ["monthly", "quarterly", "yearly"],
  })
  @ApiQuery({ name: "startDate", required: false, type: "string" })
  @ApiQuery({ name: "endDate", required: false, type: "string" })
  async getRevenueAnalytics(
    @Query("period") period?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.reportsService.getRevenueAnalytics(period, startDate, endDate);
  }

  @Get("clients")
  @ApiOperation({ summary: "Get client analytics" })
  @ApiQuery({ name: "limit", required: false, type: "number" })
  async getClientAnalytics(@Query("limit") limit?: number) {
    return this.reportsService.getClientAnalytics(limit);
  }

  @Get("projects")
  @ApiOperation({ summary: "Get project analytics" })
  @ApiQuery({ name: "limit", required: false, type: "number" })
  async getProjectAnalytics(@Query("limit") limit?: number) {
    return this.reportsService.getProjectAnalytics(limit);
  }

  @Get("payments")
  @ApiOperation({ summary: "Get payment analytics" })
  async getPaymentAnalytics() {
    return this.reportsService.getPaymentAnalytics();
  }

  @Get("overview")
  @ApiOperation({ summary: "Get comprehensive business overview" })
  @ApiQuery({
    name: "period",
    required: false,
    enum: ["monthly", "quarterly", "yearly"],
  })
  async getBusinessOverview(@Query("period") period?: string) {
    return this.reportsService.getBusinessOverview(period);
  }

  @Get("financial-summary")
  @ApiOperation({ summary: "Get financial summary for specific period" })
  @ApiQuery({ name: "startDate", required: false, type: "string" })
  @ApiQuery({ name: "endDate", required: false, type: "string" })
  async getFinancialSummary(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.reportsService.getFinancialSummary(startDate, endDate);
  }

  @Get("export/sales-receivables")
  @ApiOperation({ summary: "Export sales and receivables report to Excel" })
  @ApiQuery({ name: "startDate", required: false, type: "string" })
  @ApiQuery({ name: "endDate", required: false, type: "string" })
  @ApiQuery({ name: "clientIds", required: false, type: "string", description: "Comma-separated client IDs" })
  async exportSalesAndReceivables(
    @Res() res: Response,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("clientIds") clientIds?: string,
  ) {
    try {
      const filters = {
        startDate,
        endDate,
        clientIds: clientIds ? clientIds.split(",") : undefined,
      };

      const buffer = await this.excelExportService.generateSalesAndReceivablesReport(filters);
      
      const filename = `laporan-penjualan-piutang-${new Date().toISOString().split('T')[0]}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        message: 'Error generating Excel report',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Post("export/excel")
  @ApiOperation({ summary: "Export reports to Excel (generic endpoint for frontend)" })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reportType: { type: 'string', example: 'sales-receivables' },
        startDate: { type: 'string', format: 'date', example: '2025-01-01' },
        endDate: { type: 'string', format: 'date', example: '2025-12-31' },
        clientIds: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  async exportExcel(
    @Res() res: Response,
    @Body() body: { reportType: string; startDate?: string; endDate?: string; clientIds?: string[] },
  ) {
    try {
      // Support multiple report types, all generating sales-receivables for now
      if (body.reportType === 'sales-receivables' || 
          body.reportType === 'monthly' || 
          body.reportType === 'business-overview' || 
          !body.reportType) {
        const filters = {
          startDate: body.startDate,
          endDate: body.endDate,
          clientIds: body.clientIds,
        };

        const buffer = await this.excelExportService.generateSalesAndReceivablesReport(filters);
        
        const filename = `laporan-penjualan-piutang-${new Date().toISOString().split('T')[0]}.xlsx`;
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        
        res.send(buffer);
      } else {
        res.status(400).json({
          message: 'Unsupported report type',
          supportedTypes: ['sales-receivables', 'monthly', 'business-overview'],
        });
      }
    } catch (error) {
      res.status(500).json({
        message: 'Error generating Excel report',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
