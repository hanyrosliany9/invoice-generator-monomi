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

  /**
   * Insert a meal break banner after a specific strip
   * Automatically reorders subsequent strips
   */
  async insertMealBreak(afterStripId: string, data: {
    mealType: string;
    mealTime: string;
    mealDuration?: number;
    mealLocation?: string;
  }) {
    const afterStrip = await this.prisma.scheduleStrip.findUnique({
      where: { id: afterStripId },
    });
    if (!afterStrip) throw new NotFoundException('Strip not found');

    // Increment order of all strips after this one
    await this.prisma.scheduleStrip.updateMany({
      where: {
        shootDayId: afterStrip.shootDayId,
        order: { gt: afterStrip.order },
      },
      data: { order: { increment: 1 } },
    });

    // Insert the meal break
    return this.prisma.scheduleStrip.create({
      data: {
        shootDayId: afterStrip.shootDayId,
        order: afterStrip.order + 1,
        stripType: 'BANNER',
        bannerType: 'MEAL_BREAK',
        bannerText: `${data.mealType} - ${data.mealTime}`,
        bannerColor: '#4CAF50', // Green for meals
        mealType: data.mealType,
        mealTime: data.mealTime,
        mealDuration: data.mealDuration || 30,
        mealLocation: data.mealLocation,
      },
    });
  }

  /**
   * Insert a company move banner after a specific strip
   * Automatically reorders subsequent strips
   */
  async insertCompanyMove(afterStripId: string, data: {
    moveTime: string;
    moveFromLocation: string;
    moveToLocation: string;
    moveTravelTime?: number;
    moveNotes?: string;
  }) {
    const afterStrip = await this.prisma.scheduleStrip.findUnique({
      where: { id: afterStripId },
    });
    if (!afterStrip) throw new NotFoundException('Strip not found');

    // Increment order of all strips after this one
    await this.prisma.scheduleStrip.updateMany({
      where: {
        shootDayId: afterStrip.shootDayId,
        order: { gt: afterStrip.order },
      },
      data: { order: { increment: 1 } },
    });

    // Insert the company move
    return this.prisma.scheduleStrip.create({
      data: {
        shootDayId: afterStrip.shootDayId,
        order: afterStrip.order + 1,
        stripType: 'BANNER',
        bannerType: 'COMPANY_MOVE',
        bannerText: `Move: ${data.moveFromLocation} → ${data.moveToLocation}`,
        bannerColor: '#2196F3', // Blue for moves
        moveTime: data.moveTime,
        moveFromLocation: data.moveFromLocation,
        moveToLocation: data.moveToLocation,
        moveTravelTime: data.moveTravelTime,
        moveNotes: data.moveNotes,
      },
    });
  }
}
