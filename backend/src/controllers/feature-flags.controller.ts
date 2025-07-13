// Feature Flags Controller for Indonesian Business Management System
// API endpoints for safe deployment, rollout management, and rollback capabilities

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
  HttpException,
} from "@nestjs/common";
import { getErrorMessage } from "../common/utils/error-handling.util";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { FeatureFlagsService } from "../services/feature-flags.service";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../decorators/roles.decorator";
import { User } from "../decorators/user.decorator";
import {
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  RolloutConfigDto,
  FeatureFlagQueryDto,
  FeatureFlagStatsDto,
} from "../dtos/feature-flags.dto";

@ApiTags("Feature Flags")
@Controller("api/feature-flags")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  /**
   * Get feature flags for current user (Indonesian business context)
   */
  @Get("user-flags")
  @ApiOperation({
    summary:
      "Get feature flags for current user with Indonesian business context",
  })
  @ApiResponse({
    status: 200,
    description: "User feature flags retrieved successfully",
  })
  async getUserFeatureFlags(
    @User() user: any,
    @Query() query: FeatureFlagQueryDto,
  ) {
    try {
      const userContext = await this.featureFlagsService.buildUserContext(user);
      const flags = await this.featureFlagsService.getUserFeatureFlags(
        userContext,
        query.flagIds,
      );

      return {
        success: true,
        data: {
          flags,
          user: {
            id: userContext.id,
            region: userContext.region,
            businessSize: userContext.businessSize,
          },
          context: "Indonesian Business Management System",
        },
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve user feature flags: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all feature flags (admin only)
   */
  @Get()
  @Roles("admin")
  @ApiOperation({ summary: "Get all feature flags configuration" })
  @ApiResponse({
    status: 200,
    description: "Feature flags retrieved successfully",
  })
  async getAllFeatureFlags(@Query() query: any) {
    try {
      const flags = await this.featureFlagsService.getAllFeatureFlags(query);

      return {
        success: true,
        data: flags,
        meta: {
          total: flags.length,
          environment: process.env.NODE_ENV,
          indonesianBusinessContext: true,
        },
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve feature flags: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get specific feature flag details
   */
  @Get(":flagId")
  @Roles("admin", "manager")
  @ApiOperation({ summary: "Get specific feature flag details" })
  @ApiResponse({ status: 200, description: "Feature flag details retrieved" })
  async getFeatureFlag(@Param("flagId") flagId: string) {
    try {
      const flag = await this.featureFlagsService.getFeatureFlag(flagId);

      if (!flag) {
        throw new HttpException("Feature flag not found", HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: flag,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to retrieve feature flag: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create new feature flag
   */
  @Post()
  @Roles("admin")
  @ApiOperation({
    summary: "Create new feature flag for Indonesian business context",
  })
  @ApiResponse({
    status: 201,
    description: "Feature flag created successfully",
  })
  async createFeatureFlag(
    @Body() createDto: CreateFeatureFlagDto,
    @User() user: any,
  ) {
    try {
      // Validate Indonesian business context
      const contextValidation =
        await this.featureFlagsService.validateIndonesianBusinessContext(
          createDto,
        );

      if (!contextValidation.valid) {
        throw new HttpException(
          `Indonesian business context validation failed: ${contextValidation.reason}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const flag = await this.featureFlagsService.createFeatureFlag(
        createDto,
        user.id,
      );

      return {
        success: true,
        data: flag,
        message:
          "Feature flag created for Indonesian Business Management System",
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to create feature flag: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update feature flag configuration
   */
  @Put(":flagId")
  @Roles("admin")
  @ApiOperation({ summary: "Update feature flag configuration" })
  @ApiResponse({
    status: 200,
    description: "Feature flag updated successfully",
  })
  async updateFeatureFlag(
    @Param("flagId") flagId: string,
    @Body() updateDto: UpdateFeatureFlagDto,
    @User() user: any,
  ) {
    try {
      const flag = await this.featureFlagsService.updateFeatureFlag(
        flagId,
        updateDto,
        user.id,
      );

      return {
        success: true,
        data: flag,
        message: "Feature flag updated successfully",
      };
    } catch (error) {
      throw new HttpException(
        `Failed to update feature flag: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Enable feature flag with rollout strategy
   */
  @Post(":flagId/enable")
  @Roles("admin", "manager")
  @ApiOperation({
    summary: "Enable feature flag with Indonesian business safety checks",
  })
  @ApiResponse({
    status: 200,
    description: "Feature flag enabled successfully",
  })
  async enableFeatureFlag(
    @Param("flagId") flagId: string,
    @Body() rolloutConfig: RolloutConfigDto,
    @User() user: any,
  ) {
    try {
      // Validate safety checks for Indonesian business context
      const safetyCheck =
        await this.featureFlagsService.performSafetyChecks(flagId);

      if (!safetyCheck.safe) {
        throw new HttpException(
          `Safety checks failed: ${safetyCheck.warnings.join(", ")}`,
          HttpStatus.PRECONDITION_FAILED,
        );
      }

      const result = await this.featureFlagsService.enableFeatureFlag(
        flagId,
        rolloutConfig,
        user.id,
      );

      return {
        success: true,
        data: result,
        message: `Feature '${flagId}' enabled with ${rolloutConfig.strategy} strategy`,
        safetyChecks: safetyCheck,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to enable feature flag: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Disable feature flag (immediate rollback)
   */
  @Post(":flagId/disable")
  @Roles("admin", "manager")
  @ApiOperation({ summary: "Disable feature flag with immediate rollback" })
  @ApiResponse({
    status: 200,
    description: "Feature flag disabled successfully",
  })
  async disableFeatureFlag(
    @Param("flagId") flagId: string,
    @Body() body: { reason?: string },
    @User() user: any,
  ) {
    try {
      const result = await this.featureFlagsService.disableFeatureFlag(
        flagId,
        body.reason || "Manual disable",
        user.id,
      );

      return {
        success: true,
        data: result,
        message: `Feature '${flagId}' disabled and rolled back`,
        rollbackReason: body.reason || "Manual disable",
      };
    } catch (error) {
      throw new HttpException(
        `Failed to disable feature flag: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update feature flag rollout percentage
   */
  @Put(":flagId/rollout")
  @Roles("admin", "manager")
  @ApiOperation({ summary: "Update feature flag rollout percentage" })
  @ApiResponse({
    status: 200,
    description: "Rollout percentage updated successfully",
  })
  async updateRolloutPercentage(
    @Param("flagId") flagId: string,
    @Body() body: { percentage: number },
    @User() user: any,
  ) {
    try {
      if (body.percentage < 0 || body.percentage > 100) {
        throw new HttpException(
          "Rollout percentage must be between 0 and 100",
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.featureFlagsService.updateRolloutPercentage(
        flagId,
        body.percentage,
        user.id,
      );

      return {
        success: true,
        data: result,
        message: `Rollout percentage updated to ${body.percentage}%`,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to update rollout percentage: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get feature flag statistics and metrics
   */
  @Get(":flagId/stats")
  @Roles("admin", "manager")
  @ApiOperation({
    summary: "Get feature flag statistics for Indonesian business analytics",
  })
  @ApiResponse({
    status: 200,
    description: "Feature flag statistics retrieved",
  })
  async getFeatureStats(
    @Param("flagId") flagId: string,
  ): Promise<FeatureFlagStatsDto> {
    try {
      const stats = await this.featureFlagsService.getFeatureStatistics(flagId);

      return {
        success: true,
        data: {
          ...stats,
          indonesianBusinessMetrics: {
            regionBreakdown: stats.regionBreakdown,
            businessSizeDistribution: stats.businessSizeBreakdown,
            culturalValidationScore: stats.culturalValidationScore,
            materaiComplianceRate: stats.materaiComplianceRate,
            whatsappIntegrationUsage: stats.whatsappIntegrationUsage,
          },
        },
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve feature statistics: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get rollout health metrics
   */
  @Get(":flagId/health")
  @Roles("admin", "manager")
  @ApiOperation({ summary: "Get feature flag rollout health metrics" })
  @ApiResponse({ status: 200, description: "Health metrics retrieved" })
  async getRolloutHealth(@Param("flagId") flagId: string) {
    try {
      const health = await this.featureFlagsService.getRolloutHealth(flagId);

      return {
        success: true,
        data: health,
        recommendations:
          await this.featureFlagsService.generateHealthRecommendations(flagId),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve rollout health: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Perform emergency rollback
   */
  @Post(":flagId/emergency-rollback")
  @Roles("admin")
  @ApiOperation({ summary: "Perform emergency rollback for critical issues" })
  @ApiResponse({ status: 200, description: "Emergency rollback completed" })
  async emergencyRollback(
    @Param("flagId") flagId: string,
    @Body()
    body: { reason: string; severity: "low" | "medium" | "high" | "critical" },
    @User() user: any,
  ) {
    try {
      const result = await this.featureFlagsService.performEmergencyRollback(
        flagId,
        body.reason,
        body.severity,
        user.id,
      );

      // Send alerts for emergency rollback
      await this.featureFlagsService.sendEmergencyAlert(
        flagId,
        body.reason,
        body.severity,
      );

      return {
        success: true,
        data: result,
        message: `Emergency rollback completed for '${flagId}'`,
        severity: body.severity,
        reason: body.reason,
      };
    } catch (error) {
      throw new HttpException(
        `Emergency rollback failed: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get Indonesian business context validation
   */
  @Get(":flagId/indonesian-validation")
  @Roles("admin", "manager")
  @ApiOperation({
    summary: "Get Indonesian business context validation results",
  })
  @ApiResponse({
    status: 200,
    description: "Indonesian validation results retrieved",
  })
  async getIndonesianValidation(@Param("flagId") flagId: string) {
    try {
      const validation =
        await this.featureFlagsService.getIndonesianBusinessValidation(flagId);

      return {
        success: true,
        data: validation,
        context: {
          culturalCompliance: validation.culturalScore >= 70,
          materaiCompliance: validation.materaiCompliant,
          businessHoursRespected: validation.businessHoursCheck,
          prayerTimeConsidered: validation.prayerTimeCheck,
        },
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve Indonesian validation: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get feature flag audit log
   */
  @Get(":flagId/audit-log")
  @Roles("admin")
  @ApiOperation({ summary: "Get feature flag audit log for compliance" })
  @ApiResponse({ status: 200, description: "Audit log retrieved" })
  async getAuditLog(
    @Param("flagId") flagId: string,
    @Query()
    query: {
      limit?: number;
      offset?: number;
      startDate?: string;
      endDate?: string;
    },
  ) {
    try {
      const auditLog = await this.featureFlagsService.getAuditLog(flagId, {
        limit: query.limit || 50,
        offset: query.offset || 0,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      });

      return {
        success: true,
        data: auditLog,
        meta: {
          total: auditLog.total,
          limit: query.limit || 50,
          offset: query.offset || 0,
        },
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve audit log: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Test feature flag configuration
   */
  @Post(":flagId/test")
  @Roles("admin", "manager")
  @ApiOperation({
    summary: "Test feature flag configuration before deployment",
  })
  @ApiResponse({ status: 200, description: "Feature flag test completed" })
  async testFeatureFlag(
    @Param("flagId") flagId: string,
    @Body()
    testConfig: {
      testUsers?: string[];
      testRegions?: string[];
      dryRun?: boolean;
    },
  ) {
    try {
      const testResult = await this.featureFlagsService.testFeatureFlag(
        flagId,
        testConfig,
      );

      return {
        success: true,
        data: testResult,
        message: "Feature flag test completed",
        recommendations: testResult.recommendations,
      };
    } catch (error) {
      throw new HttpException(
        `Feature flag test failed: ${getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

export default FeatureFlagsController;
