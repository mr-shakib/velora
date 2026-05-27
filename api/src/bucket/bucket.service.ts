import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BucketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CreateBucketItemDto {
  title: string;
  description?: string;
  category?: string;
  deadline?: Date;
  mediaPublicId?: string;
}

@Injectable()
export class BucketService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  async findAll(coupleId: string, status?: BucketStatus) {
    return this.prisma.bucketItem.findMany({
      where: { coupleId, ...(status ? { status } : {}) },
      include: { creator: { select: { id: true, displayName: true } } },
      orderBy: [{ status: 'asc' }, { order: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(coupleId: string, creatorId: string, dto: CreateBucketItemDto) {
    return this.prisma.bucketItem.create({
      data: { coupleId, creatorId, ...dto },
      include: { creator: { select: { id: true, displayName: true } } },
    });
  }

  async update(id: string, coupleId: string, data: Partial<CreateBucketItemDto> & { status?: BucketStatus }) {
    const item = await this.prisma.bucketItem.findFirst({ where: { id, coupleId } });
    if (!item) throw new NotFoundException('Bucket item not found.');

    const updated = await this.prisma.bucketItem.update({
      where: { id },
      data: {
        ...data,
        completedAt:
          data.status === BucketStatus.COMPLETED && item.status !== BucketStatus.COMPLETED
            ? new Date()
            : data.status && data.status !== BucketStatus.COMPLETED
              ? null
              : undefined,
      },
    });

    if (data.status === BucketStatus.COMPLETED && item.status !== BucketStatus.COMPLETED) {
      this.events.emit('bucket.completed', { item: updated, coupleId });
    }

    return updated;
  }

  async remove(id: string, coupleId: string) {
    const item = await this.prisma.bucketItem.findFirst({ where: { id, coupleId } });
    if (!item) throw new NotFoundException();
    await this.prisma.bucketItem.delete({ where: { id } });
    return { deleted: true };
  }

  async reorder(coupleId: string, orderedIds: string[]) {
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.bucketItem.updateMany({ where: { id, coupleId }, data: { order: index } }),
      ),
    );
    return this.findAll(coupleId);
  }

  async getStats(coupleId: string) {
    const [total, completed, inProgress] = await this.prisma.$transaction([
      this.prisma.bucketItem.count({ where: { coupleId } }),
      this.prisma.bucketItem.count({ where: { coupleId, status: BucketStatus.COMPLETED } }),
      this.prisma.bucketItem.count({ where: { coupleId, status: BucketStatus.IN_PROGRESS } }),
    ]);
    return { total, completed, inProgress, pending: total - completed - inProgress };
  }
}
