import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * MediaCommentsService
 *
 * Handles threaded comments on frame annotations.
 */
@Injectable()
export class MediaCommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.frameComment.create({
      data,
      include: {
        author: {
          select: { id: true, name: true, email: true },
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
