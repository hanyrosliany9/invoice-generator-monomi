import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCollectionDto } from "../dto/create-collection.dto";
import { UpdateCollectionDto } from "../dto/update-collection.dto";

/**
 * CollectionsService
 *
 * Handles smart collections (dynamic folders) for media assets.
 * Collections can be either manual (explicit asset selection) or
 * smart (dynamic filtering by star rating, status, etc.).
 */
@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new collection
   */
  async create(
    projectId: string,
    createDto: CreateCollectionDto,
    userId: string,
  ) {
    // Verify project exists and user has access
    const project = await this.prisma.mediaProject.findFirst({
      where: {
        id: projectId,
        collaborators: {
          some: {
            userId,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException("Project not found or access denied");
    }

    // Create collection
    const collection = await this.prisma.collection.create({
      data: {
        name: createDto.name,
        description: createDto.description,
        projectId,
        createdBy: userId,
      },
    });

    // Add initial assets if provided
    if (createDto.assetIds && createDto.assetIds.length > 0) {
      await this.addAssetsToCollection(
        collection.id,
        createDto.assetIds,
        userId,
      );
    }

    return collection;
  }

  /**
   * Get all collections for a project
   */
  async findByProject(projectId: string) {
    return this.prisma.collection.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { items: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  /**
   * Get a single collection with details
   */
  async findOne(collectionId: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        _count: {
          select: { items: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!collection) {
      throw new NotFoundException("Collection not found");
    }

    return collection;
  }

  /**
   * Update collection
   */
  async update(
    collectionId: string,
    updateDto: UpdateCollectionDto,
    userId: string,
  ) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new NotFoundException("Collection not found");
    }

    if (collection.createdBy !== userId) {
      throw new ForbiddenException(
        "Only the creator can update this collection",
      );
    }

    return this.prisma.collection.update({
      where: { id: collectionId },
      data: {
        name: updateDto.name,
        description: updateDto.description,
      },
    });
  }

  /**
   * Delete collection
   */
  async delete(collectionId: string, userId: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new NotFoundException("Collection not found");
    }

    if (collection.createdBy !== userId) {
      throw new ForbiddenException(
        "Only the creator can delete this collection",
      );
    }

    await this.prisma.collection.delete({
      where: { id: collectionId },
    });

    return { success: true };
  }

  /**
   * Get assets in a collection
   */
  async getAssetsForCollection(collectionId: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        items: {
          include: {
            asset: {
              include: {
                metadata: true,
                _count: {
                  select: { frames: true },
                },
              },
            },
          },
          orderBy: {
            addedAt: "desc",
          },
        },
      },
    });

    if (!collection) {
      throw new NotFoundException("Collection not found");
    }

    return collection.items.map((item) => item.asset);
  }

  /**
   * Add assets to collection
   */
  async addAssetsToCollection(
    collectionId: string,
    assetIds: string[],
    userId: string,
  ) {
    // Verify collection exists
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new NotFoundException("Collection not found");
    }

    // Create collection items
    const items = assetIds.map((assetId) => ({
      collectionId,
      assetId,
      addedBy: userId,
    }));

    await this.prisma.collectionItem.createMany({
      data: items,
      skipDuplicates: true, // Avoid duplicate entries
    });

    // Update collection timestamp
    await this.prisma.collection.update({
      where: { id: collectionId },
      data: { updatedAt: new Date() },
    });

    return { success: true, added: assetIds.length };
  }

  /**
   * Remove assets from collection
   */
  async removeAssetsFromCollection(
    collectionId: string,
    assetIds: string[],
    userId: string,
  ) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new NotFoundException("Collection not found");
    }

    await this.prisma.collectionItem.deleteMany({
      where: {
        collectionId,
        assetId: { in: assetIds },
      },
    });

    // Update collection timestamp
    await this.prisma.collection.update({
      where: { id: collectionId },
      data: { updatedAt: new Date() },
    });

    return { success: true, removed: assetIds.length };
  }

  /**
   * Smart collection: Get assets by star rating
   */
  async getAssetsByStarRating(projectId: string, minRating: number) {
    return this.prisma.mediaAsset.findMany({
      where: {
        projectId,
        starRating: {
          gte: minRating,
        },
      },
      include: {
        metadata: true,
        _count: {
          select: { frames: true },
        },
      },
      orderBy: {
        starRating: "desc",
      },
    });
  }

  /**
   * Smart collection: Get assets by status
   */
  async getAssetsByStatus(projectId: string, status: string) {
    return this.prisma.mediaAsset.findMany({
      where: {
        projectId,
        status: status as any,
      },
      include: {
        metadata: true,
        _count: {
          select: { frames: true },
        },
      },
      orderBy: {
        uploadedAt: "desc",
      },
    });
  }

  /**
   * Smart collection: Get assets with unresolved comments
   */
  async getAssetsWithUnresolvedComments(projectId: string) {
    return this.prisma.mediaAsset.findMany({
      where: {
        projectId,
        frames: {
          some: {
            comments: {
              some: {
                resolvedAt: null,
              },
            },
          },
        },
      },
      include: {
        metadata: true,
        _count: {
          select: { frames: true },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }
}
