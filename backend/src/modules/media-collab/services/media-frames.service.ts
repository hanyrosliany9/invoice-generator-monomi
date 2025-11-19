import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFrameDrawingDto } from '../dto/create-frame-drawing.dto';
import { UpdateFrameDrawingDto } from '../dto/update-frame-drawing.dto';

/**
 * MediaFramesService
 *
 * Handles frame annotations, drawings, and markers for videos and photos.
 * Supports real-time drawing collaboration via WebSocket.
 */
@Injectable()
export class MediaFramesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create or get existing frame at specific timecode
   */
  async getOrCreateFrame(assetId: string, timestamp: number, userId: string) {
    // Check if frame exists at this timecode
    let frame = await this.prisma.mediaFrame.findFirst({
      where: {
        assetId,
        timestamp,
      },
    });

    if (!frame) {
      // Create new frame
      frame = await this.prisma.mediaFrame.create({
        data: {
          assetId,
          timestamp,
          createdBy: userId,
        },
      });
    }

    return frame;
  }

  /**
   * Get all frames for an asset
   */
  async findByAsset(assetId: string) {
    return this.prisma.mediaFrame.findMany({
      where: { assetId },
      include: {
        comments: {
          include: {
            author: {
              select: { id: true, name: true, email: true },
            },
            replies: {
              include: {
                author: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        drawings: {
          include: {
            creator: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });
  }

  /**
   * Add drawing to a frame
   */
  async createDrawing(userId: string, createDto: CreateFrameDrawingDto) {
    // Verify asset exists
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: createDto.assetId },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    // Get or create frame at timecode
    const frame = await this.getOrCreateFrame(createDto.assetId, createDto.timecode, userId);

    // Create drawing
    return this.prisma.frameDrawing.create({
      data: {
        frameId: frame.id,
        type: 'FREEHAND', // Default type, can be overridden
        data: createDto.drawingData,
        createdBy: userId,
      },
    });
  }

  /**
   * Update existing drawing
   */
  async updateDrawing(drawingId: string, userId: string, updateDto: UpdateFrameDrawingDto) {
    // Verify drawing exists and user owns it
    const drawing = await this.prisma.frameDrawing.findUnique({
      where: { id: drawingId },
    });

    if (!drawing) {
      throw new NotFoundException('Drawing not found');
    }

    if (drawing.createdBy !== userId) {
      throw new BadRequestException('You can only edit your own drawings');
    }

    // Update drawing
    return this.prisma.frameDrawing.update({
      where: { id: drawingId },
      data: {
        data: updateDto.drawingData,
      },
    });
  }

  /**
   * Delete drawing
   */
  async deleteDrawing(drawingId: string, userId: string) {
    // Verify drawing exists and user owns it
    const drawing = await this.prisma.frameDrawing.findUnique({
      where: { id: drawingId },
    });

    if (!drawing) {
      throw new NotFoundException('Drawing not found');
    }

    if (drawing.createdBy !== userId) {
      throw new BadRequestException('You can only delete your own drawings');
    }

    await this.prisma.frameDrawing.delete({
      where: { id: drawingId },
    });

    return { success: true };
  }

  /**
   * Get all drawings for an asset
   */
  async getDrawingsByAsset(assetId: string) {
    return this.prisma.frameDrawing.findMany({
      where: {
        frame: {
          assetId,
        },
      },
      include: {
        frame: {
          select: { timestamp: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get drawings at specific timecode
   */
  async getDrawingsAtTimecode(assetId: string, timecode: number) {
    const frame = await this.prisma.mediaFrame.findFirst({
      where: {
        assetId,
        timestamp: timecode,
      },
    });

    if (!frame) {
      return [];
    }

    return this.prisma.frameDrawing.findMany({
      where: {
        frameId: frame.id,
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Remove frame and all associated drawings/comments
   */
  async removeFrame(frameId: string) {
    return this.prisma.mediaFrame.delete({
      where: { id: frameId },
    });
  }
}
