import { Injectable, Logger } from '@nestjs/common';
import ffmpeg = require('fluent-ffmpeg');
import sharp = require('sharp');
import { promisify } from 'util';

/**
 * MediaProcessingService
 *
 * Handles video and photo processing using FFmpeg and Sharp.
 * Extracts metadata, generates thumbnails, and processes media files.
 */
@Injectable()
export class MediaProcessingService {
  private readonly logger = new Logger(MediaProcessingService.name);

  /**
   * Extract video metadata using FFmpeg
   */
  async extractVideoMetadata(videoUrl: string): Promise<{
    duration?: number;
    fps?: number;
    codec?: string;
    bitrate?: number;
    width?: number;
    height?: number;
  }> {
    this.logger.log(`Extracting video metadata from: ${videoUrl}`);

    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoUrl, (err: any, metadata: any) => {
        if (err) {
          this.logger.error('FFmpeg metadata extraction failed:', err);
          resolve({}); // Return empty object on failure
          return;
        }

        const videoStream = metadata.streams.find(
          (stream: any) => stream.codec_type === 'video',
        );

        if (!videoStream) {
          resolve({});
          return;
        }

        const result = {
          duration: metadata.format.duration,
          fps: this.parseFps(videoStream.r_frame_rate || ''),
          codec: videoStream.codec_name,
          bitrate: metadata.format.bit_rate
            ? Math.round(metadata.format.bit_rate / 1000)
            : undefined,
          width: videoStream.width,
          height: videoStream.height,
        };

        this.logger.log('Video metadata extracted:', result);
        resolve(result);
      });
    });
  }

  /**
   * Parse frame rate string (e.g., "30/1" -> 30)
   */
  private parseFps(fpsString: string): number | undefined {
    if (!fpsString) return undefined;

    const parts = fpsString.split('/');
    if (parts.length !== 2) return undefined;

    const fps = parseInt(parts[0], 10) / parseInt(parts[1], 10);
    return Math.round(fps * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Generate video thumbnail
   */
  async generateVideoThumbnail(
    videoUrl: string,
    timestamp: number = 0,
  ): Promise<Buffer> {
    this.logger.log(
      `Generating thumbnail for video: ${videoUrl} at ${timestamp}s`,
    );

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      ffmpeg(videoUrl)
        .seekInput(timestamp)
        .frames(1)
        .format('image2')
        .size('640x?')
        .on('error', (err: Error) => {
          this.logger.error('Thumbnail generation failed:', err);
          reject(err);
        })
        .on('end', () => {
          const buffer = Buffer.concat(chunks);
          this.logger.log('Thumbnail generated successfully');
          resolve(buffer);
        })
        .pipe()
        .on('data', (chunk: Buffer) => chunks.push(chunk));
    });
  }

  /**
   * Process photo (resize, generate thumbnails)
   */
  async processPhoto(buffer: Buffer): Promise<{
    thumbnail: Buffer;
    preview: Buffer;
    width: number;
    height: number;
  }> {
    this.logger.log('Processing photo with Sharp');

    try {
      // Get original dimensions
      const metadata = await sharp(buffer).metadata();

      // Generate thumbnail (300x300 max, maintain aspect ratio)
      const thumbnail = await sharp(buffer)
        .resize(300, 300, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Generate preview (1920x1920 max, maintain aspect ratio)
      const preview = await sharp(buffer)
        .resize(1920, 1920, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 90 })
        .toBuffer();

      return {
        thumbnail,
        preview,
        width: metadata.width || 0,
        height: metadata.height || 0,
      };
    } catch (error) {
      this.logger.error('Photo processing failed:', error);
      throw error;
    }
  }

  /**
   * Extract image dimensions
   */
  async getImageDimensions(
    buffer: Buffer,
  ): Promise<{ width: number; height: number }> {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
      };
    } catch (error) {
      this.logger.error('Failed to get image dimensions:', error);
      return { width: 0, height: 0 };
    }
  }
}
