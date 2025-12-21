import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShootDayDto } from './dto/create-shoot-day.dto';

@Injectable()
export class ShootDaysService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateShootDayDto) {
    const maxOrder = await this.prisma.shootDay.aggregate({
      where: { scheduleId: dto.scheduleId },
      _max: { order: true },
    });
    return this.prisma.shootDay.create({
      data: { ...dto, order: dto.order ?? (maxOrder._max.order ?? -1) + 1 },
      include: { strips: true },
    });
  }

  async update(id: string, dto: Partial<CreateShootDayDto>) {
    return this.prisma.shootDay.update({
      where: { id },
      data: dto,
      include: { strips: true },
    });
  }

  async remove(id: string) {
    await this.prisma.shootDay.delete({ where: { id } });
    return { success: true };
  }
}
