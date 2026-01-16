import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MediaService } from "../../media/media.service";
import { CreateElementDto } from "../dto/create-element.dto";
import { UpdateElementDto } from "../dto/update-element.dto";

@Injectable()
export class DeckElementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  async create(userId: string, dto: CreateElementDto) {
    await this.verifySlideAccess(dto.slideId, userId, ["OWNER", "EDITOR"]);

    // Get max zIndex
    const maxZ = await this.prisma.deckSlideElement.aggregate({
      where: { slideId: dto.slideId },
      _max: { zIndex: true },
    });

    return this.prisma.deckSlideElement.create({
      data: {
        slideId: dto.slideId,
        type: dto.type,
        x: dto.x ?? 10,
        y: dto.y ?? 10,
        width: dto.width ?? 80,
        height: dto.height ?? 20,
        rotation: dto.rotation ?? 0,
        zIndex: dto.zIndex ?? (maxZ._max.zIndex ?? 0) + 1,
        content: dto.content ?? {},
        isLocked: dto.isLocked ?? false,
      },
    });
  }

  async update(elementId: string, userId: string, dto: UpdateElementDto) {
    const element = await this.prisma.deckSlideElement.findUnique({
      where: { id: elementId },
      include: {
        slide: { include: { deck: { include: { collaborators: true } } } },
      },
    });

    if (!element) throw new NotFoundException("Element not found");

    const collaborator = element.slide.deck.collaborators.find(
      (c) => c.userId === userId,
    );
    if (!collaborator || !["OWNER", "EDITOR"].includes(collaborator.role)) {
      throw new ForbiddenException("Edit permission required");
    }

    if (element.isLocked && !dto.isLocked) {
      // Only owner can unlock
      if (collaborator.role !== "OWNER") {
        throw new ForbiddenException("Only owner can unlock elements");
      }
    }

    return this.prisma.deckSlideElement.update({
      where: { id: elementId },
      data: {
        type: dto.type,
        x: dto.x,
        y: dto.y,
        width: dto.width,
        height: dto.height,
        rotation: dto.rotation,
        zIndex: dto.zIndex,
        content: dto.content,
        isLocked: dto.isLocked,
      },
    });
  }

  async remove(elementId: string, userId: string) {
    const element = await this.prisma.deckSlideElement.findUnique({
      where: { id: elementId },
      include: {
        slide: { include: { deck: { include: { collaborators: true } } } },
      },
    });

    if (!element) throw new NotFoundException("Element not found");

    const collaborator = element.slide.deck.collaborators.find(
      (c) => c.userId === userId,
    );
    if (!collaborator || !["OWNER", "EDITOR"].includes(collaborator.role)) {
      throw new ForbiddenException("Edit permission required");
    }

    await this.prisma.deckSlideElement.delete({ where: { id: elementId } });
    return { success: true };
  }

  async bringToFront(elementId: string, userId: string) {
    const element = await this.prisma.deckSlideElement.findUnique({
      where: { id: elementId },
      include: {
        slide: { include: { deck: { include: { collaborators: true } } } },
      },
    });

    if (!element) throw new NotFoundException("Element not found");

    const collaborator = element.slide.deck.collaborators.find(
      (c) => c.userId === userId,
    );
    if (!collaborator || !["OWNER", "EDITOR"].includes(collaborator.role)) {
      throw new ForbiddenException("Edit permission required");
    }

    const maxZ = await this.prisma.deckSlideElement.aggregate({
      where: { slideId: element.slideId },
      _max: { zIndex: true },
    });

    return this.prisma.deckSlideElement.update({
      where: { id: elementId },
      data: { zIndex: (maxZ._max.zIndex ?? 0) + 1 },
    });
  }

  async sendToBack(elementId: string, userId: string) {
    const element = await this.prisma.deckSlideElement.findUnique({
      where: { id: elementId },
      include: {
        slide: { include: { deck: { include: { collaborators: true } } } },
      },
    });

    if (!element) throw new NotFoundException("Element not found");

    const collaborator = element.slide.deck.collaborators.find(
      (c) => c.userId === userId,
    );
    if (!collaborator || !["OWNER", "EDITOR"].includes(collaborator.role)) {
      throw new ForbiddenException("Edit permission required");
    }

    // Shift all elements up
    await this.prisma.deckSlideElement.updateMany({
      where: { slideId: element.slideId },
      data: { zIndex: { increment: 1 } },
    });

    return this.prisma.deckSlideElement.update({
      where: { id: elementId },
      data: { zIndex: 0 },
    });
  }

  private async verifySlideAccess(
    slideId: string,
    userId: string,
    allowedRoles: string[],
  ) {
    const slide = await this.prisma.deckSlide.findUnique({
      where: { id: slideId },
      include: { deck: { include: { collaborators: { where: { userId } } } } },
    });

    if (!slide) throw new NotFoundException("Slide not found");

    const collaborator = slide.deck.collaborators[0];
    if (!collaborator || !allowedRoles.includes(collaborator.role)) {
      throw new ForbiddenException("Permission denied");
    }

    return slide;
  }
}
