import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateTimelineEventDto {
  title: string;
  story?: string;
  eventDate: Date;
  location?: string;
  mediaPublicId?: string;
  order?: number;
}

@Injectable()
export class TimelineService {
  constructor(private prisma: PrismaService) {}

  async findAll(coupleId: string) {
    return this.prisma.timelineEvent.findMany({
      where: { coupleId },
      include: { author: { select: { id: true, displayName: true } } },
      orderBy: { eventDate: 'asc' },
    });
  }

  async create(coupleId: string, authorId: string, dto: CreateTimelineEventDto) {
    return this.prisma.timelineEvent.create({
      data: { coupleId, authorId, ...dto },
      include: { author: { select: { id: true, displayName: true } } },
    });
  }

  async update(id: string, coupleId: string, data: Record<string, unknown>) {
    const event = await this.prisma.timelineEvent.findFirst({ where: { id, coupleId } });
    if (!event) throw new NotFoundException('Timeline event not found.');
    return this.prisma.timelineEvent.update({ where: { id }, data: data as Parameters<typeof this.prisma.timelineEvent.update>[0]['data'] });
  }

  async remove(id: string, coupleId: string, userId: string) {
    const event = await this.prisma.timelineEvent.findFirst({ where: { id, coupleId } });
    if (!event) throw new NotFoundException();
    if (event.authorId !== userId) throw new ForbiddenException('Only the creator can delete this event.');
    await this.prisma.timelineEvent.delete({ where: { id } });
    return { deleted: true };
  }

  async reorder(coupleId: string, orderedIds: string[]) {
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.timelineEvent.updateMany({ where: { id, coupleId }, data: { order: index } }),
      ),
    );
    return this.findAll(coupleId);
  }
}
