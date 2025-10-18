import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAssetDto } from "./dto/create-asset.dto";
import { UpdateAssetDto } from "./dto/update-asset.dto";
import { AssetStatus, AssetCondition } from "@prisma/client";
import * as QRCode from "qrcode";

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  async create(createAssetDto: CreateAssetDto) {
    const assetCode = await this.generateAssetCode(createAssetDto.category);
    const qrCode = await this.generateQRCode(assetCode);

    return this.prisma.asset.create({
      data: {
        ...createAssetDto,
        assetCode,
        qrCode,
      },
      include: {
        createdBy: true,
      },
    });
  }

  async findAll(page = 1, limit = 10, status?: AssetStatus, category?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const [assets, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        skip,
        take: limit,
        include: {
          createdBy: true,
          _count: {
            select: {
              reservations: true,
              maintenanceRecords: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      this.prisma.asset.count({ where }),
    ]);

    return {
      data: assets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        createdBy: true,
        reservations: {
          include: {
            user: true,
            project: true,
          },
          orderBy: { createdAt: "desc" },
        },
        maintenanceRecords: {
          orderBy: { performedDate: "desc" },
        },
        maintenanceSchedules: {
          where: { isActive: true },
        },
        _count: {
          select: {
            reservations: true,
            maintenanceRecords: true,
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException("Asset tidak ditemukan");
    }

    return asset;
  }

  async update(id: string, updateAssetDto: UpdateAssetDto) {
    await this.findOne(id);
    return this.prisma.asset.update({
      where: { id },
      data: updateAssetDto,
      include: {
        createdBy: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const activeReservations = await this.prisma.assetReservation.count({
      where: {
        assetId: id,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });

    if (activeReservations > 0) {
      throw new Error("Tidak dapat menghapus asset dengan reservasi aktif");
    }

    return this.prisma.asset.delete({
      where: { id },
    });
  }

  async generateAssetCode(category: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const categoryPrefix = category.substring(0, 3).toUpperCase();

    const existingAssets = await this.prisma.asset.count({
      where: {
        assetCode: {
          startsWith: `${categoryPrefix}-${year}${month}-`,
        },
      },
    });

    const sequence = (existingAssets + 1).toString().padStart(3, "0");
    return `${categoryPrefix}-${year}${month}-${sequence}`;
  }

  async generateQRCode(code: string): Promise<string> {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(code, {
        width: 300,
        margin: 2,
      });
      return qrCodeDataURL;
    } catch (error) {
      console.error("QR Code generation failed:", error);
      return "";
    }
  }

  async reserve(assetId: string, reserveDto: any) {
    const asset = await this.findOne(assetId);
    if (asset.status !== "AVAILABLE") {
      throw new Error("Asset tidak tersedia");
    }

    const conflicts = await this.prisma.assetReservation.findMany({
      where: {
        assetId,
        status: { in: ["PENDING", "CONFIRMED"] },
        OR: [
          {
            startDate: { lte: new Date(reserveDto.endDate) },
            endDate: { gte: new Date(reserveDto.startDate) },
          },
        ],
      },
    });

    if (conflicts.length > 0) {
      throw new Error("Asset sudah direservasi untuk periode ini");
    }

    return this.prisma.assetReservation.create({
      data: {
        ...reserveDto,
        assetId,
      },
      include: {
        asset: true,
        user: true,
      },
    });
  }

  async checkOut(assetId: string, userId: string, projectId?: string) {
    await this.findOne(assetId);

    return this.prisma.$transaction([
      this.prisma.asset.update({
        where: { id: assetId },
        data: { status: "CHECKED_OUT" },
      }),
      this.prisma.projectEquipmentUsage.create({
        data: {
          assetId,
          projectId: projectId ?? null,
          startDate: new Date(),
        },
      }),
    ]);
  }

  async checkIn(assetId: string, condition?: string, notes?: string) {
    const asset = await this.findOne(assetId);

    const activeUsage = await this.prisma.projectEquipmentUsage.findFirst({
      where: {
        assetId,
        returnDate: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!activeUsage) {
      throw new Error("Tidak ada catatan check-out aktif untuk asset ini");
    }

    return this.prisma.$transaction([
      this.prisma.asset.update({
        where: { id: assetId },
        data: {
          status: "AVAILABLE",
          condition: (condition as AssetCondition) || asset.condition,
        },
      }),
      this.prisma.projectEquipmentUsage.update({
        where: { id: activeUsage.id },
        data: {
          returnDate: new Date(),
          condition,
          notes,
        },
      }),
    ]);
  }

  async getAssetStats() {
    const [total, byStatus, byCategory, totalValue] = await Promise.all([
      this.prisma.asset.count(),
      this.prisma.asset.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      this.prisma.asset.groupBy({
        by: ["category"],
        _count: { category: true },
      }),
      this.prisma.asset.aggregate({
        _sum: { purchasePrice: true },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        },
        {} as Record<string, number>,
      ),
      byCategory: byCategory.reduce(
        (acc, item) => {
          acc[item.category] = item._count.category;
          return acc;
        },
        {} as Record<string, number>,
      ),
      totalValue: totalValue._sum.purchasePrice || 0,
    };
  }
}
