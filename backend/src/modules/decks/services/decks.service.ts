import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../../media/media.service';
import { CreateDeckDto } from '../dto/create-deck.dto';
import { UpdateDeckDto } from '../dto/update-deck.dto';
import { generateDeckShareToken, generateDeckShareUrl } from '../utils/deck-share.util';

@Injectable()
export class DecksService {
  private readonly logger = new Logger(DecksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  /**
   * Create a new deck
   */
  async create(userId: string, dto: CreateDeckDto) {
    // Verify linked entities exist
    if (dto.clientId) {
      const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
      if (!client) throw new NotFoundException('Client not found');
    }

    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
      if (!project) throw new NotFoundException('Project not found');
    }

    if (dto.mediaProjectId) {
      const mediaProject = await this.prisma.mediaProject.findUnique({ where: { id: dto.mediaProjectId } });
      if (!mediaProject) throw new NotFoundException('Media project not found');
    }

    // Create deck with creator as OWNER collaborator
    const deck = await this.prisma.deck.create({
      data: {
        title: dto.title,
        description: dto.description,
        clientId: dto.clientId,
        projectId: dto.projectId,
        mediaProjectId: dto.mediaProjectId,
        theme: dto.theme || {},
        slideWidth: dto.slideWidth || 1920,
        slideHeight: dto.slideHeight || 1080,
        createdById: userId,
        collaborators: {
          create: {
            userId: userId,
            role: 'OWNER',
            invitedBy: userId,
            status: 'ACCEPTED',
            acceptedAt: new Date(),
          },
        },
        // Create initial title slide
        slides: {
          create: {
            order: 0,
            template: 'TITLE',
            title: dto.title,
            subtitle: dto.description || '',
            content: {},
          },
        },
      },
      include: {
        client: true,
        project: true,
        mediaProject: true,
        createdBy: { select: { id: true, name: true, email: true } },
        slides: { orderBy: { order: 'asc' } },
        _count: { select: { slides: true, collaborators: true } },
      },
    });

    return deck;
  }

  /**
   * Get all decks for a user (owned + collaborated)
   */
  async findAll(userId: string, filters?: { status?: string; clientId?: string; projectId?: string }) {
    const where: any = {
      collaborators: { some: { userId, status: 'ACCEPTED' } },
    };

    if (filters?.status) where.status = filters.status;
    if (filters?.clientId) where.clientId = filters.clientId;
    if (filters?.projectId) where.projectId = filters.projectId;

    return this.prisma.deck.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, number: true } },
        createdBy: { select: { id: true, name: true } },
        slides: { take: 1, orderBy: { order: 'asc' } },
        _count: { select: { slides: true, collaborators: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Get a single deck by ID
   */
  async findOne(deckId: string, userId: string) {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: {
        collaborators: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    if (!deck) throw new NotFoundException('Deck not found');

    // Check access
    const hasAccess = deck.collaborators.some(c => c.userId === userId && c.status === 'ACCEPTED');
    if (!hasAccess) throw new ForbiddenException('Access denied');

    // Now fetch the full deck with all relations
    return (await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: {
        client: true,
        project: true,
        mediaProject: true,
        createdBy: { select: { id: true, name: true, email: true } },
        slides: {
          orderBy: { order: 'asc' },
          include: {
            elements: { orderBy: { zIndex: 'asc' } },
            _count: { select: { comments: true } },
          },
        },
        collaborators: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    }))!;
  }

  /**
   * Update a deck
   */
  async update(deckId: string, userId: string, dto: UpdateDeckDto) {
    const deck = await this.findOne(deckId, userId);

    // Check edit permission
    const collaborator = deck.collaborators.find(c => c.userId === userId);
    if (!collaborator || !['OWNER', 'EDITOR'].includes(collaborator.role)) {
      throw new ForbiddenException('Edit permission required');
    }

    return this.prisma.deck.update({
      where: { id: deckId },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status as any,
        theme: dto.theme,
        slideWidth: dto.slideWidth,
        slideHeight: dto.slideHeight,
        clientId: dto.clientId,
        projectId: dto.projectId,
        mediaProjectId: dto.mediaProjectId,
      },
      include: {
        client: true,
        project: true,
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { slides: true, collaborators: true } },
      },
    });
  }

  /**
   * Delete a deck
   */
  async remove(deckId: string, userId: string) {
    const deck = await this.findOne(deckId, userId);

    // Only OWNER can delete
    const collaborator = deck?.collaborators.find(c => c.userId === userId);
    if (!collaborator || collaborator.role !== 'OWNER') {
      throw new ForbiddenException('Only owner can delete deck');
    }

    await this.prisma.deck.delete({ where: { id: deckId } });
    return { success: true };
  }

  /**
   * Duplicate a deck
   */
  async duplicate(deckId: string, userId: string, newTitle?: string) {
    const original = await this.findOne(deckId, userId);

    if (!original) {
      throw new NotFoundException('Original deck not found');
    }

    // Create new deck with all slides
    const newDeck = await this.prisma.deck.create({
      data: {
        title: newTitle || `${original.title} (Copy)`,
        description: original.description || '',
        theme: original.theme as any,
        slideWidth: original.slideWidth,
        slideHeight: original.slideHeight,
        clientId: original.clientId,
        projectId: original.projectId,
        mediaProjectId: original.mediaProjectId,
        createdById: userId,
        collaborators: {
          create: {
            userId: userId,
            role: 'OWNER',
            invitedBy: userId,
            status: 'ACCEPTED',
            acceptedAt: new Date(),
          },
        },
        slides: {
          create: original.slides.map(slide => ({
            order: slide.order,
            template: slide.template,
            title: slide.title || '',
            subtitle: slide.subtitle || '',
            content: slide.content as any,
            backgroundColor: slide.backgroundColor,
            backgroundImage: slide.backgroundImage,
            backgroundImageKey: slide.backgroundImageKey,
            notes: slide.notes,
            elements: {
              create: slide.elements.map(el => ({
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
          })),
        },
      },
      include: {
        slides: { include: { elements: true } },
        _count: { select: { slides: true } },
      },
    });

    return newDeck;
  }

  /**
   * Enable public sharing
   */
  async enablePublicSharing(deckId: string, userId: string, accessLevel?: string) {
    const deck = await this.findOne(deckId, userId);

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    const collaborator = deck.collaborators.find(c => c.userId === userId);
    if (!collaborator || !['OWNER', 'EDITOR'].includes(collaborator.role)) {
      throw new ForbiddenException('Edit permission required');
    }

    const token = generateDeckShareToken();
    const url = generateDeckShareUrl(token);

    return this.prisma.deck.update({
      where: { id: deckId },
      data: {
        isPublic: true,
        publicShareToken: token,
        publicShareUrl: url,
        publicSharedAt: new Date(),
        publicAccessLevel: (accessLevel as any) || 'VIEW_ONLY',
      },
    });
  }

  /**
   * Disable public sharing
   */
  async disablePublicSharing(deckId: string, userId: string) {
    const deck = await this.findOne(deckId, userId);

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    const collaborator = deck.collaborators.find(c => c.userId === userId);
    if (!collaborator || !['OWNER', 'EDITOR'].includes(collaborator.role)) {
      throw new ForbiddenException('Edit permission required');
    }

    return this.prisma.deck.update({
      where: { id: deckId },
      data: {
        isPublic: false,
        publicShareToken: null,
        publicShareUrl: null,
      },
    });
  }

  /**
   * Get public deck by token
   */
  async findByPublicToken(token: string) {
    const deck = await this.prisma.deck.findUnique({
      where: { publicShareToken: token },
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, number: true } },
        createdBy: { select: { id: true, name: true } },
        slides: {
          orderBy: { order: 'asc' },
          include: { elements: { orderBy: { zIndex: 'asc' } } },
        },
      },
    });

    if (!deck || !deck.isPublic) {
      throw new NotFoundException('Deck not found or not publicly shared');
    }

    // Increment view count
    await this.prisma.deck.update({
      where: { id: deck.id },
      data: { publicViewCount: { increment: 1 } },
    });

    return deck;
  }
}
