import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Job status enum for bulk download jobs
 */
export enum BulkDownloadJobStatus {
  PENDING = "pending",
  ACTIVE = "active",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

/**
 * Response DTO for bulk download job creation
 */
export class BulkDownloadJobCreatedDto {
  @ApiProperty({
    description: "Unique job identifier",
    example: "job-abc123def456",
  })
  jobId: string;

  @ApiProperty({
    description: "Current job status",
    enum: BulkDownloadJobStatus,
    example: BulkDownloadJobStatus.PENDING,
  })
  status: BulkDownloadJobStatus;

  @ApiProperty({
    description: "Total number of files to download",
    example: 50,
  })
  totalFiles: number;

  @ApiProperty({
    description: "Message for the user",
    example: "Download job created. You will be notified via WebSocket when ready.",
  })
  message: string;
}

/**
 * Response DTO for bulk download job status
 */
export class BulkDownloadJobStatusDto {
  @ApiProperty({
    description: "Unique job identifier",
    example: "job-abc123def456",
  })
  jobId: string;

  @ApiProperty({
    description: "Current job status",
    enum: BulkDownloadJobStatus,
    example: BulkDownloadJobStatus.ACTIVE,
  })
  status: BulkDownloadJobStatus;

  @ApiProperty({
    description: "Number of files processed so far",
    example: 25,
  })
  processedFiles: number;

  @ApiProperty({
    description: "Total number of files to download",
    example: 50,
  })
  totalFiles: number;

  @ApiProperty({
    description: "Progress percentage (0-100)",
    example: 50,
  })
  progress: number;

  @ApiPropertyOptional({
    description: "Presigned URL for downloading the ZIP (only when completed)",
    example: "https://r2.example.com/downloads/job-abc123.zip?signature=...",
  })
  downloadUrl?: string;

  @ApiPropertyOptional({
    description: "URL expiration timestamp (only when completed)",
    example: "2025-01-25T12:00:00.000Z",
  })
  expiresAt?: string;

  @ApiPropertyOptional({
    description: "Error message (only when failed)",
    example: "Failed to fetch file: asset-123",
  })
  error?: string;

  @ApiPropertyOptional({
    description: "Job creation timestamp",
    example: "2025-01-25T10:00:00.000Z",
  })
  createdAt?: string;

  @ApiPropertyOptional({
    description: "Job completion timestamp",
    example: "2025-01-25T10:05:00.000Z",
  })
  completedAt?: string;
}

/**
 * WebSocket event payloads for bulk download progress
 */
export interface BulkDownloadProgressEvent {
  jobId: string;
  current: number;
  total: number;
  percent: number;
  currentFile?: string;
}

export interface BulkDownloadCompleteEvent {
  jobId: string;
  downloadUrl: string;
  expiresAt: string;
  fileCount: number;
  zipSize: number;
}

export interface BulkDownloadFailedEvent {
  jobId: string;
  error: string;
  failedAt: string;
}
