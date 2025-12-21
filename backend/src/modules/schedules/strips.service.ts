import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStripDto } from './dto/create-strip.dto';
import { UpdateStripDto } from './dto/update-strip.dto';
import { ReorderStripsDto } from './dto/reorder-strips.dto';

@Injectable()
export class StripsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStripDto) {
    const maxOrder = await this.prisma.scheduleStrip.aggregate({
      where: { shootDayId: dto.shootDayId },
      _max: { order: true },
    });
    return this.prisma.scheduleStrip.create({
      data: { ...dto, order: dto.order ?? (maxOrder._max.order ?? -1) + 1 } as any,
    });
  }

  async update(id: string, dto: UpdateStripDto) {
    return this.prisma.scheduleStrip.update({ where: { id }, data: dto as any });
  }

  async remove(id: string) {
    await this.prisma.scheduleStrip.delete({ where: { id } });
    return { success: true };
  }

  async reorder(dto: ReorderStripsDto) {
    const updates = dto.strips.map(s =>
      this.prisma.scheduleStrip.update({
        where: { id: s.stripId },
        data: { shootDayId: s.shootDayId, order: s.order },
      })
    );
    await this.prisma.$transaction(updates);
    return { success: true };
  }
}
