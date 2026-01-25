import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { BulkDownloadService } from "../services/bulk-download.service";
import { CreateBulkDownloadJobDto } from "../dto/create-bulk-download-job.dto";
import {
  BulkDownloadJobCreatedDto,
  BulkDownloadJobStatusDto,
} from "../dto/bulk-download-job.dto";

/**
 * BulkDownloadController
 *
 * REST API endpoints for async bulk media downloads.
 *
 * Endpoints:
 * - POST /jobs - Create a new download job
 * - GET /jobs/:jobId - Get job status
 * - DELETE /jobs/:jobId - Cancel a job
 *
 * Progress updates are delivered via WebSocket events:
 * - bulk-download:progress
 * - bulk-download:complete
 * - bulk-download:failed
 */
@ApiTags("Media Collab - Bulk Download")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("media-collab/bulk-download")
export class BulkDownloadController {
  constructor(private readonly bulkDownloadService: BulkDownloadService) {}

  @Post("jobs")
  @ApiOperation({
    summary: "Create bulk download job",
    description:
      "Creates an async job to download multiple assets as a ZIP file. " +
      "Progress is reported via WebSocket events. " +
      "When complete, a presigned URL is provided for download (valid 24 hours).",
  })
  @ApiResponse({
    status: 201,
    description: "Job created successfully",
    type: BulkDownloadJobCreatedDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid request (too many assets, invalid IDs)",
  })
  @ApiResponse({
    status: 403,
    description: "Access denied to project",
  })
  @ApiResponse({
    status: 404,
    description: "No valid assets found",
  })
  async createJob(
    @Body() dto: CreateBulkDownloadJobDto,
    @Request() req: any,
  ): Promise<BulkDownloadJobCreatedDto> {
    const userId = req.user.userId || req.user.sub || req.user.id;
    return this.bulkDownloadService.createJob(dto, userId);
  }

  @Get("jobs/:jobId")
  @ApiOperation({
    summary: "Get job status",
    description:
      "Returns the current status of a bulk download job, including progress percentage. " +
      "If completed, includes the presigned download URL.",
  })
  @ApiParam({
    name: "jobId",
    description: "Unique job identifier",
    example: "download-1706186400000-abc123",
  })
  @ApiResponse({
    status: 200,
    description: "Job status retrieved",
    type: BulkDownloadJobStatusDto,
  })
  @ApiResponse({
    status: 403,
    description: "Access denied to this job",
  })
  @ApiResponse({
    status: 404,
    description: "Job not found",
  })
  async getJobStatus(
    @Param("jobId") jobId: string,
    @Request() req: any,
  ): Promise<BulkDownloadJobStatusDto> {
    const userId = req.user.userId || req.user.sub || req.user.id;
    return this.bulkDownloadService.getJobStatus(jobId, userId);
  }

  @Delete("jobs/:jobId")
  @ApiOperation({
    summary: "Cancel job",
    description:
      "Cancels a pending or active bulk download job. " +
      "Cannot cancel completed or failed jobs.",
  })
  @ApiParam({
    name: "jobId",
    description: "Unique job identifier",
    example: "download-1706186400000-abc123",
  })
  @ApiResponse({
    status: 200,
    description: "Job cancelled successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Job download-123 has been cancelled" },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Cannot cancel completed/failed job",
  })
  @ApiResponse({
    status: 403,
    description: "Access denied to this job",
  })
  @ApiResponse({
    status: 404,
    description: "Job not found",
  })
  async cancelJob(
    @Param("jobId") jobId: string,
    @Request() req: any,
  ): Promise<{ success: boolean; message: string }> {
    const userId = req.user.userId || req.user.sub || req.user.id;
    return this.bulkDownloadService.cancelJob(jobId, userId);
  }
}
