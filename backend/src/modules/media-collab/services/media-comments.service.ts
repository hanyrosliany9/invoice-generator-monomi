import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
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
        parentId: null,
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

  /**
   * Load a comment and verify that `userId` is allowed to mutate it.
   * Allowed when: caller is the comment author, OR caller is OWNER/EDITOR
   * on the project that owns the frame/asset.
   */
  private async assertMutationAllowed(
    commentId: string,
    userId: string,
  ): Promise<void> {
    const comment = await this.prisma.frameComment.findUnique({
      where: { id: commentId },
      select: {
        authorId: true,
        frame: {
          select: {
            asset: {
              select: {
                project: {
                  select: {
                    collaborators: {
                      select: { userId: true, role: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException("Comment not found");
    }

    // Comment author can always edit/delete their own comment
    if (comment.authorId === userId) {
      return;
    }

    // OWNER or EDITOR on the project can also mutate any comment
    const collab = comment.frame.asset.project.collaborators.find(
      (c) => c.userId === userId,
    );
    if (collab && (collab.role === "OWNER" || collab.role === "EDITOR")) {
      return;
    }

    throw new ForbiddenException(
      "You can only edit or delete your own comments, or you must be an OWNER/EDITOR of the project",
    );
  }

  async update(commentId: string, text: string, userId: string) {
    await this.assertMutationAllowed(commentId, userId);
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

  async remove(commentId: string, userId: string) {
    await this.assertMutationAllowed(commentId, userId);
    return this.prisma.frameComment.delete({
      where: { id: commentId },
    });
  }
}
