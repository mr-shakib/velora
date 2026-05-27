import { Injectable, NotFoundException } from '@nestjs/common';
import { PlannerEventStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CreatePlannerEventDto {
  title: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt?: Date;
  budget?: number;
  reminderAt?: Date;
  checklist?: Array<{ text: string; done: boolean }>;
}

@Injectable()
export class PlannerService {
  constructor(private prisma: PrismaService) {}

  async findAll(coupleId: string, month?: number, year?: number) {
    const where: Record<string, unknown> = { coupleId };
    if (month && year) {
      where.startsAt = {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      };
    }
    return this.prisma.plannerEvent.findMany({
      where,
      include: { creator: { select: { id: true, displayName: true } } },
      orderBy: { startsAt: 'asc' },
    });
  }

  async create(coupleId: string, creatorId: string, dto: CreatePlannerEventDto) {
    return this.prisma.plannerEvent.create({
      data: {
        coupleId,
        creatorId,
        ...dto,
        checklist: (dto.checklist ?? []) as object,
      },
      include: { creator: { select: { id: true, displayName: true } } },
    });
  }

  async update(id: string, coupleId: string, data: Partial<CreatePlannerEventDto> & { status?: PlannerEventStatus }) {
    const event = await this.prisma.plannerEvent.findFirst({ where: { id, coupleId } });
    if (!event) throw new NotFoundException('Event not found.');
    return this.prisma.plannerEvent.update({ where: { id }, data: { ...data, checklist: data.checklist as object } });
  }

  async remove(id: string, coupleId: string) {
    const event = await this.prisma.plannerEvent.findFirst({ where: { id, coupleId } });
    if (!event) throw new NotFoundException();
    await this.prisma.plannerEvent.delete({ where: { id } });
    return { deleted: true };
  }

  async getUpcoming(coupleId: string, days = 7) {
    const until = new Date();
    until.setDate(until.getDate() + days);
    return this.prisma.plannerEvent.findMany({
      where: {
        coupleId,
        status: PlannerEventStatus.UPCOMING,
        startsAt: { gte: new Date(), lte: until },
      },
      orderBy: { startsAt: 'asc' },
    });
  }
}
