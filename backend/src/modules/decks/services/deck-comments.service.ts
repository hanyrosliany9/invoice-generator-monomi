import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommentDto } from '../dto/create-comment.dto';

@Injectable()
export class DeckCommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCommentDto, guestInfo?: { name: string; email: string }) {
    await this.verifySlideAccess(dto.slideId, userId, guestInfo);

    return this.prisma.deckSlideComment.create({
      data: {
        slideId: dto.slideId,
        userId: guestInfo ? undefined : userId,
        guestName: guestInfo?.name,
        guestEmail: guestInfo?.email,
        content: dto.content,
        parentId: dto.parentId,
        positionX: dto.positionX,
        positionY: dto.positionY,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        replies: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async findBySlide(slideId: string, userId: string) {
    return this.prisma.deckSlideComment.findMany({
      where: { slideId, parentId: null },
      include: {
        user: { select: { id: true, name: true, email: true } },
        replies: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolve(commentId: string, userId: string) {
    const comment = await this.prisma.deckSlideComment.findUnique({
      where: { id: commentId },
      include: { slide: { include: { deck: { include: { collaborators: true } } } } },
    });

    if (!comment) throw new NotFoundException('Comment not found');

    const collaborator = comment.slide.deck.collaborators.find(c => c.userId === userId);
    if (!collaborator || !['OWNER', 'EDITOR'].includes(collaborator.role)) {
      throw new ForbiddenException('Edit permission required');
    }

    return this.prisma.deckSlideComment.update({
      where: { id: commentId },
      data: { isResolved: true },
    });
  }

  async remove(commentId: string, userId: string) {
    const comment = await this.prisma.deckSlideComment.findUnique({
      where: { id: commentId },
      include: { slide: { include: { deck: { include: { collaborators: true } } } } },
    });

    if (!comment) throw new NotFoundException('Comment not found');

    // Author or owner can delete
    const isAuthor = comment.userId === userId;
    const collaborator = comment.slide.deck.collaborators.find(c => c.userId === userId);
    const isOwner = collaborator?.role === 'OWNER';

    if (!isAuthor && !isOwner) {
      throw new ForbiddenException('Cannot delete this comment');
    }

    await this.prisma.deckSlideComment.delete({ where: { id: commentId } });
    return { success: true };
  }

  private async verifySlideAccess(slideId: string, userId: string, guestInfo?: any) {
    const slide = await this.prisma.deckSlide.findUnique({
      where: { id: slideId },
      include: { deck: { include: { collaborators: true } } },
    });

    if (!slide) throw new NotFoundException('Slide not found');

    // Check user access
    if (userId) {
      const collaborator = slide.deck.collaborators.find(c => c.userId === userId);
      if (!collaborator || collaborator.role === 'VIEWER') {
        throw new ForbiddenException('Comment permission required');
      }
    }

    // Check guest access
    if (guestInfo) {
      const guestCollab = slide.deck.collaborators.find(
        c => c.guestEmail === guestInfo.email && c.status === 'ACCEPTED'
      );
      if (!guestCollab || guestCollab.role === 'VIEWER') {
        throw new ForbiddenException('Comment permission required');
      }
    }

    return slide;
  }
}
