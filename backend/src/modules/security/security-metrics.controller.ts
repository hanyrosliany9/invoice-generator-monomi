import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SecurityMetricsService } from "./security-metrics.service";
import {
  SecurityMetricsResponseDto,
  SecurityAlertsResponseDto,
} from "./dto/security-metrics.dto";

@ApiTags("Security & Compliance")
@ApiBearerAuth()
@Controller("security")
@UseGuards(JwtAuthGuard)
export class SecurityMetricsController {
  constructor(
    private readonly securityMetricsService: SecurityMetricsService,
  ) {}

  @Get("metrics")
  @ApiOperation({
    summary: "Get comprehensive security metrics",
    description:
      "Returns security scores, compliance metrics, and monitoring status for the system",
  })
  @ApiResponse({
    status: 200,
    description: "Security metrics retrieved successfully",
    type: SecurityMetricsResponseDto,
  })
  async getSecurityMetrics(): Promise<SecurityMetricsResponseDto> {
    return this.securityMetricsService.getSecurityMetrics();
  }

  @Get("alerts")
  @ApiOperation({
    summary: "Get security and compliance alerts",
    description:
      "Returns active security alerts, compliance warnings, and recommendations",
  })
  @ApiResponse({
    status: 200,
    description: "Security alerts retrieved successfully",
    type: SecurityAlertsResponseDto,
  })
  async getSecurityAlerts(): Promise<SecurityAlertsResponseDto> {
    return this.securityMetricsService.getSecurityAlerts();
  }
}
