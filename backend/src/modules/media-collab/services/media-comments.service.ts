import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * MediaCommentsService
 *
 * Handles threaded comments on frame annotations.
 *
 * Architecture:
 *  - FrameComment belongs to MediaFrame (required relation)
 *  - MediaFrame holds the timecode (timestamp) + assetId
 *  - When a comment is created, we find-or-create the MediaFrame for
 *    that asset + timecode, then attach the comment to it.
 */
@Injectable()
export class MediaCommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    assetId: string;
    timestamp?: number;
    content: string;
    parentId?: string;
    x?: number;
    y?: number;
    authorId: string;
  }) {
    const ts = data.timestamp ?? 0;

    // Find or create the MediaFrame for this asset at this timecode.
    // Multiple comments at the same timestamp share one frame record.
    let frame = await this.prisma.mediaFrame.findFirst({
      where: { assetId: data.assetId, timestamp: ts },
    });

    if (!frame) {
      frame = await this.prisma.mediaFrame.create({
        data: {
          assetId: data.assetId,
          timestamp: ts,
          createdBy: data.authorId,
        },
      });
    }

    return this.prisma.frameComment.create({
      data: {
        frameId: frame.id,
        text: data.content,
        x: data.x,
        y: data.y,
        parentId: data.parentId,
        authorId: data.authorId,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        frame: {
          select: { timestamp: true, assetId: true },
        },
      },
    });
  }

  async findByFrame(frameId: string) {
    return this.prisma.frameComment.findMany({
      where: { frameId },
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
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async findByAsset(assetId: string) {
    return this.prisma.frameComment.findMany({
      where: {
        frame: {
          assetId,
        },
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        frame: {
          select: { timestamp: true },
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async update(commentId: string, text: string) {
    return this.prisma.frameComment.update({
      where: { id: commentId },
      data: { text },
    });
  }

  async resolve(commentId: string, userId: string) {
    return this.prisma.frameComment.update({
      where: { id: commentId },
      data: {
        resolved: true,
        resolvedBy: userId,
        resolvedAt: new Date(),
      },
    });
  }

  async remove(commentId: string) {
    return this.prisma.frameComment.delete({
      where: { id: commentId },
    });
  }
}
