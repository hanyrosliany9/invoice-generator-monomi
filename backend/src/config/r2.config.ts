import { registerAs } from "@nestjs/config";

/**
 * Cloudflare R2 Configuration
 *
 * R2 is an S3-compatible object storage with zero egress fees.
 * This configuration enables media storage for the content planning calendar.
 *
 * Features:
 * - S3-compatible API (AWS SDK v3)
 * - Zero egress bandwidth fees
 * - Free tier: 10GB storage, unlimited egress
 * - Up to 5GB per file upload
 *
 * Environment Variables Required:
 * - R2_ACCOUNT_ID: Cloudflare account ID
 * - R2_ACCESS_KEY_ID: R2 API access key
 * - R2_SECRET_ACCESS_KEY: R2 API secret key
 * - R2_BUCKET_NAME: Bucket name (default: content-media)
 * - R2_PUBLIC_URL: Public URL for R2 bucket (https://pub-xxx.r2.dev)
 * - R2_ENDPOINT: R2 endpoint URL (https://<account_id>.r2.cloudflarestorage.com)
 * - MAX_FILE_SIZE_MB: Max file size in MB (default: 100)
 */
export default registerAs("r2", () => ({
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucketName: process.env.R2_BUCKET_NAME || "content-media",
  publicUrl: process.env.R2_PUBLIC_URL,
  endpoint: process.env.R2_ENDPOINT,
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || "100", 10),
}));
