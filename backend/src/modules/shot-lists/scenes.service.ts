import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSceneDto } from './dto/create-scene.dto';

@Injectable()
export class ScenesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSceneDto) {
    const maxOrder = await this.prisma.shotListScene.aggregate({
      where: { shotListId: dto.shotListId },
      _max: { order: true },
    });
    return this.prisma.shotListScene.create({
      data: { ...dto, order: dto.order ?? (maxOrder._max.order ?? -1) + 1 },
      include: { shots: true },
    });
  }

  async update(id: string, dto: Partial<CreateSceneDto>) {
    return this.prisma.shotListScene.update({
      where: { id },
      data: dto,
      include: { shots: true },
    });
  }

  async remove(id: string) {
    await this.prisma.shotListScene.delete({ where: { id } });
    return { success: true };
  }

  async findOne(id: string) {
    const scene = await this.prisma.shotListScene.findUnique({
      where: { id },
      include: { shots: { orderBy: { order: 'asc' } } },
    });
    if (!scene) throw new NotFoundException('Scene not found');
    return scene;
  }
}
