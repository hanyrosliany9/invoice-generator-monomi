import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShotDto } from './dto/create-shot.dto';
import { UpdateShotDto } from './dto/update-shot.dto';
import { ReorderShotsDto } from './dto/reorder-shots.dto';

@Injectable()
export class ShotsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateShotDto) {
    const maxOrder = await this.prisma.shot.aggregate({
      where: { sceneId: dto.sceneId },
      _max: { order: true },
    });
    return this.prisma.shot.create({
      data: { ...dto, order: dto.order ?? (maxOrder._max.order ?? -1) + 1 },
    });
  }

  async update(id: string, dto: UpdateShotDto) {
    return this.prisma.shot.update({ where: { id }, data: dto as any });
  }

  async remove(id: string) {
    await this.prisma.shot.delete({ where: { id } });
    return { success: true };
  }

  async reorder(sceneId: string, dto: ReorderShotsDto) {
    const updates = dto.shotIds.map((id, index) =>
      this.prisma.shot.update({ where: { id }, data: { order: index } })
    );
    await this.prisma.$transaction(updates);
    return this.prisma.shot.findMany({
      where: { sceneId },
      orderBy: { order: 'asc' },
    });
  }

  async duplicate(id: string) {
    const shot = await this.prisma.shot.findUnique({ where: { id } });
    if (!shot) throw new NotFoundException('Shot not found');

    const { id: _, createdAt, updatedAt, ...data } = shot;
    return this.prisma.shot.create({
      data: { ...data, shotNumber: `${shot.shotNumber}-copy`, order: shot.order + 1 },
    });
  }
}
