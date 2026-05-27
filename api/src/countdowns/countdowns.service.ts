import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateCountdownDto {
  label: string;
  targetAt: string;
  emoji?: string;
}

@Injectable()
export class CountdownsService {
  constructor(private prisma: PrismaService) {}

  async findAll(coupleId: string) {
    return this.prisma.countdown.findMany({
      where: { coupleId },
      orderBy: { targetAt: 'asc' },
    });
  }

  async create(coupleId: string, dto: CreateCountdownDto) {
    return this.prisma.countdown.create({
      data: {
        coupleId,
        label: dto.label,
        targetAt: new Date(dto.targetAt),
        emoji: dto.emoji,
      },
    });
  }

  async update(id: string, coupleId: string, dto: Partial<CreateCountdownDto>) {
    await this.assertOwnership(id, coupleId);
    return this.prisma.countdown.update({
      where: { id },
      data: {
        ...(dto.label && { label: dto.label }),
        ...(dto.targetAt && { targetAt: new Date(dto.targetAt) }),
        ...(dto.emoji !== undefined && { emoji: dto.emoji }),
      },
    });
  }

  async remove(id: string, coupleId: string) {
    await this.assertOwnership(id, coupleId);
    await this.prisma.countdown.delete({ where: { id } });
  }

  private async assertOwnership(id: string, coupleId: string) {
    const item = await this.prisma.countdown.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Countdown not found');
    if (item.coupleId !== coupleId) throw new ForbiddenException();
  }
}
