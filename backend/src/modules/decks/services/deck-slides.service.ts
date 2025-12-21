import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../../media/media.service';
import { CreateSlideDto } from '../dto/create-slide.dto';
import { UpdateSlideDto } from '../dto/update-slide.dto';
import { ReorderSlidesDto } from '../dto/reorder-slides.dto';

@Injectable()
export class DeckSlidesService {
  private readonly logger = new Logger(DeckSlidesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  /**
   * Create a new slide
   */
  async create(userId: string, dto: CreateSlideDto) {
    // Verify deck access
    const deck = await this.verifyDeckAccess(dto.deckId, userId, ['OWNER', 'EDITOR']);

    // Get max order
    const maxOrder = await this.prisma.deckSlide.aggregate({
      where: { deckId: dto.deckId },
      _max: { order: true },
    });
    const order = dto.order ?? (maxOrder._max.order ?? -1) + 1;

    // Shift existing slides if inserting
    if (dto.order !== undefined) {
      await this.prisma.deckSlide.updateMany({
        where: { deckId: dto.deckId, order: { gte: order } },
        data: { order: { increment: 1 } },
      });
    }

    return this.prisma.deckSlide.create({
      data: {
        deckId: dto.deckId,
        order,
        template: dto.template || 'BLANK',
        title: dto.title,
        subtitle: dto.subtitle,
        content: dto.content || {},
        backgroundColor: dto.backgroundColor,
        notes: dto.notes,
      },
      include: {
        elements: true,
        _count: { select: { comments: true } },
      },
    });
  }

  /**
   * Update a slide
   */
  async update(slideId: string, userId: string, dto: UpdateSlideDto) {
    const slide = await this.prisma.deckSlide.findUnique({
      where: { id: slideId },
      include: { deck: { include: { collaborators: true } } },
    });

    if (!slide) throw new NotFoundException('Slide not found');

    // Verify edit permission
    const collaborator = slide.deck.collaborators.find(c => c.userId === userId);
    if (!collaborator || !['OWNER', 'EDITOR'].includes(collaborator.role)) {
      throw new ForbiddenException('Edit permission required');
    }

    return this.prisma.deckSlide.update({
      where: { id: slideId },
      data: {
        template: dto.template,
        title: dto.title,
        subtitle: dto.subtitle,
        content: dto.content,
        backgroundColor: dto.backgroundColor,
        notes: dto.notes,
      },
      include: {
        elements: true,
        _count: { select: { comments: true } },
      },
    });
  }

  /**
   * Delete a slide
   */
  async remove(slideId: string, userId: string) {
    const slide = await this.prisma.deckSlide.findUnique({
      where: { id: slideId },
      include: { deck: { include: { collaborators: true } } },
    });

    if (!slide) throw new NotFoundException('Slide not found');

    const collaborator = slide.deck.collaborators.find(c => c.userId === userId);
    if (!collaborator || !['OWNER', 'EDITOR'].includes(collaborator.role)) {
      throw new ForbiddenException('Edit permission required');
    }

    await this.prisma.deckSlide.delete({ where: { id: slideId } });

    // Reorder remaining slides
    await this.prisma.$executeRaw`
      UPDATE deck_slides
      SET "order" = "order" - 1
      WHERE "deckId" = ${slide.deckId} AND "order" > ${slide.order}
    `;

    return { success: true };
  }

  /**
   * Reorder slides
   */
  async reorder(deckId: string, userId: string, dto: ReorderSlidesDto) {
    await this.verifyDeckAccess(deckId, userId, ['OWNER', 'EDITOR']);

    // Update each slide's order
    const updates = dto.slideIds.map((slideId, index) =>
      this.prisma.deckSlide.update({
        where: { id: slideId },
        data: { order: index },
      })
    );

    await this.prisma.$transaction(updates);

    return this.prisma.deckSlide.findMany({
      where: { deckId },
      orderBy: { order: 'asc' },
      include: { elements: true },
    });
  }

  /**
   * Duplicate a slide
   */
  async duplicate(slideId: string, userId: string) {
    const original = await this.prisma.deckSlide.findUnique({
      where: { id: slideId },
      include: { elements: true, deck: { include: { collaborators: true } } },
    });

    if (!original) throw new NotFoundException('Slide not found');

    const collaborator = original.deck.collaborators.find(c => c.userId === userId);
    if (!collaborator || !['OWNER', 'EDITOR'].includes(collaborator.role)) {
      throw new ForbiddenException('Edit permission required');
    }

    // Shift slides after original
    await this.prisma.deckSlide.updateMany({
      where: { deckId: original.deckId, order: { gt: original.order } },
      data: { order: { increment: 1 } },
    });

    // Create duplicate
    return this.prisma.deckSlide.create({
      data: {
        deckId: original.deckId,
        order: original.order + 1,
        template: original.template,
        title: original.title,
        subtitle: original.subtitle,
        content: original.content as any,
        backgroundColor: original.backgroundColor,
        backgroundImage: original.backgroundImage,
        backgroundImageKey: original.backgroundImageKey,
        notes: original.notes,
        transition: original.transition,
        transitionDuration: original.transitionDuration,
        elements: {
          create: original.elements.map(el => ({
            type: el.type,
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            rotation: el.rotation,
            zIndex: el.zIndex,
            content: el.content as any,
            isLocked: el.isLocked,
          })),
        },
      },
      include: { elements: true },
    });
  }

  /**
   * Set slide background image
   */
  async setBackgroundImage(slideId: string, userId: string, url: string, key: string) {
    const slide = await this.prisma.deckSlide.findUnique({
      where: { id: slideId },
      include: { deck: { include: { collaborators: true } } },
    });

    if (!slide) throw new NotFoundException('Slide not found');

    const collaborator = slide.deck.collaborators.find(c => c.userId === userId);
    if (!collaborator || !['OWNER', 'EDITOR'].includes(collaborator.role)) {
      throw new ForbiddenException('Edit permission required');
    }

    return this.prisma.deckSlide.update({
      where: { id: slideId },
      data: { backgroundImage: url, backgroundImageKey: key },
    });
  }

  private async verifyDeckAccess(deckId: string, userId: string, allowedRoles: string[]) {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: { collaborators: { where: { userId } } },
    });

    if (!deck) throw new NotFoundException('Deck not found');

    const collaborator = deck.collaborators[0];
    if (!collaborator || !allowedRoles.includes(collaborator.role)) {
      throw new ForbiddenException('Permission denied');
    }

    return deck;
  }
}
