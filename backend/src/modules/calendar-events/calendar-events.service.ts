import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateCalendarEventDto,
  UpdateCalendarEventDto,
  QueryEventsDto,
} from "./dto";

@Injectable()
export class CalendarEventsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateCalendarEventDto, userId: string) {
    const { attendees, reminders, ...eventData } = data;

    return this.prisma.calendarEvent.create({
      data: {
        ...eventData,
        createdById: userId,
        attendees: attendees
          ? {
              create: attendees.map((a) => ({
                userId: a.userId,
                status: a.status as any,
              })),
            }
          : undefined,
        reminders: reminders
          ? {
              create: reminders.map((r) => ({
                minutes: r.minutes,
              })),
            }
          : undefined,
      } as any,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        attendees: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        reminders: true,
      },
    });
  }

  async findAll(query: QueryEventsDto) {
    const where: any = {};
    const limit = query.limit || 100;
    const offset = query.offset || 0;

    if (query.startDate && query.endDate) {
      where.AND = [
        { startTime: { gte: new Date(query.startDate) } },
        { endTime: { lte: new Date(query.endDate) } },
      ];
    } else if (query.startDate) {
      where.startTime = { gte: new Date(query.startDate) };
    } else if (query.endDate) {
      where.endTime = { lte: new Date(query.endDate) };
    }

    if (query.categories && query.categories.length > 0) {
      where.category = { in: query.categories };
    }

    if (query.projectId) {
      where.projectId = query.projectId;
    }

    if (query.assigneeId) {
      where.assigneeId = query.assigneeId;
    }

    return this.prisma.calendarEvent.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        attendees: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        reminders: true,
        project: { select: { id: true, number: true } },
        milestone: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
      orderBy: { startTime: "asc" },
      take: limit,
      skip: offset,
    });
  }

  async findById(id: string) {
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        attendees: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        reminders: true,
        project: { select: { id: true, number: true } },
        milestone: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    });

    if (!event) {
      throw new NotFoundException(`Calendar event with ID ${id} not found`);
    }

    return event;
  }

  async update(id: string, data: UpdateCalendarEventDto) {
    const { attendees, reminders, ...eventData } = data;

    // Check if event exists
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Calendar event with ID ${id} not found`);
    }

    // Delete existing attendees and reminders if updating
    if (attendees !== undefined || reminders !== undefined) {
      await this.prisma.eventAttendee.deleteMany({ where: { eventId: id } });
      await this.prisma.eventReminder.deleteMany({ where: { eventId: id } });
    }

    return this.prisma.calendarEvent.update({
      where: { id },
      data: {
        ...eventData,
        attendees: attendees
          ? {
              create: attendees.map((a) => ({
                userId: a.userId,
                status: a.status as any,
              })),
            }
          : undefined,
        reminders: reminders
          ? {
              create: reminders.map((r) => ({
                minutes: r.minutes,
              })),
            }
          : undefined,
      } as any,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        attendees: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        reminders: true,
      },
    });
  }

  async delete(id: string) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Calendar event with ID ${id} not found`);
    }

    return this.prisma.calendarEvent.delete({ where: { id } });
  }

  async reschedule(id: string, startTime: string, endTime: string) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Calendar event with ID ${id} not found`);
    }

    return this.prisma.calendarEvent.update({
      where: { id },
      data: {
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        attendees: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
  }

  async getUpcomingEvents(userId: string, days: number = 7) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.prisma.calendarEvent.findMany({
      where: {
        AND: [
          { startTime: { gte: now } },
          { startTime: { lte: futureDate } },
          {
            OR: [
              { createdById: userId },
              { assigneeId: userId },
              { attendees: { some: { userId } } },
            ],
          },
        ],
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        attendees: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { startTime: "asc" },
      take: 10,
    });
  }
}
