import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MoodEmoji, MediaType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../upload/cloudinary.service';

interface CreateMemoryDto {
  caption?: string;
  location?: string;
  city?: string;
  country?: string;
  mood?: MoodEmoji;
  tags?: string[];
  memoryDate: Date;
  albumId?: string;
  isPrivate?: boolean;
  media?: Array<{ publicId: string; mediaType: MediaType; url: string; width?: number; height?: number; durationSec?: number; bytes: number; order?: number }>;
}

interface MemoryFilters {
  page?: number;
  limit?: number;
  albumId?: string;
  mood?: MoodEmoji;
  tag?: string;
  year?: number;
  search?: string;
}

@Injectable()
export class MemoriesService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
    private events: EventEmitter2,
  ) {}

  async create(coupleId: string, authorId: string, dto: CreateMemoryDto) {
    const memory = await this.prisma.$transaction(async (tx) => {
      const newMemory = await tx.memory.create({
        data: {
          coupleId,
          authorId,
          caption: dto.caption,
          location: dto.location,
          city: dto.city,
          country: dto.country,
          mood: dto.mood,
          tags: dto.tags ?? [],
          memoryDate: dto.memoryDate,
          albumId: dto.albumId,
          isPrivate: dto.isPrivate ?? false,
          media: dto.media
            ? {
                create: dto.media.map((m, i) => ({
                  publicId: m.publicId,
                  mediaType: m.mediaType,
                  url: m.url,
                  width: m.width,
                  height: m.height,
                  durationSec: m.durationSec,
                  bytes: m.bytes,
                  order: m.order ?? i,
                })),
              }
            : undefined,
        },
        include: { media: true, author: { select: { id: true, displayName: true, avatarPublicId: true } } },
      });

      if (dto.media?.length) {
        const totalBytes = dto.media.reduce((sum, m) => sum + m.bytes, 0);
        await tx.couple.update({
          where: { id: coupleId },
          data: { usedStorageBytes: { increment: totalBytes } },
        });
      }

      return newMemory;
    });

    this.events.emit('memory.created', { memory, coupleId });
    return memory;
  }

  async findAll(coupleId: string, viewerId: string, filters: MemoryFilters = {}) {
    const { page = 1, limit = 20, albumId, mood, tag, year, search } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      coupleId,
      OR: [{ isPrivate: false }, { authorId: viewerId }],
    };

    if (albumId) where.albumId = albumId;
    if (mood) where.mood = mood;
    if (tag) where.tags = { has: tag };
    if (year) {
      where.memoryDate = {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      };
    }
    if (search) where.caption = { contains: search, mode: 'insensitive' };

    const [memories, total] = await this.prisma.$transaction([
      this.prisma.memory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { memoryDate: 'desc' },
        include: {
          media: { orderBy: { order: 'asc' } },
          author: { select: { id: true, displayName: true, avatarPublicId: true } },
        },
      }),
      this.prisma.memory.count({ where }),
    ]);

    return {
      data: memories,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, coupleId: string, viewerId: string) {
    const memory = await this.prisma.memory.findFirst({
      where: { id, coupleId },
      include: {
        media: { orderBy: { order: 'asc' } },
        author: { select: { id: true, displayName: true, avatarPublicId: true } },
        album: { select: { id: true, name: true } },
      },
    });

    if (!memory) throw new NotFoundException('Memory not found.');
    if (memory.isPrivate && memory.authorId !== viewerId) throw new ForbiddenException();

    return memory;
  }

  async update(id: string, coupleId: string, userId: string, data: Record<string, unknown>) {
    const memory = await this.prisma.memory.findFirst({ where: { id, coupleId } });
    if (!memory) throw new NotFoundException();
    if (memory.authorId !== userId) throw new ForbiddenException('Only the author can edit this memory.');

    // Strip relation fields — only update scalar columns
    const { media: _media, ...scalarData } = data as Record<string, unknown> & { media?: unknown };
    return this.prisma.memory.update({ where: { id }, data: scalarData as Parameters<typeof this.prisma.memory.update>[0]['data'] });
  }

  async remove(id: string, coupleId: string, userId: string) {
    const memory = await this.prisma.memory.findFirst({
      where: { id, coupleId },
      include: { media: true },
    });
    if (!memory) throw new NotFoundException();
    if (memory.authorId !== userId) throw new ForbiddenException('Only the author can delete this memory.');

    const totalBytes = memory.media.reduce((sum, m) => sum + m.bytes, 0);

    await this.prisma.$transaction([
      this.prisma.memory.delete({ where: { id } }),
      this.prisma.couple.update({
        where: { id: coupleId },
        data: { usedStorageBytes: { decrement: totalBytes } },
      }),
    ]);

    for (const media of memory.media) {
      await this.cloudinary.deleteAsset(media.publicId).catch(() => null);
    }

    return { deleted: true };
  }

  async getOnThisDay(coupleId: string, viewerId: string) {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    return this.prisma.$queryRaw`
      SELECT m.*, json_agg(mm.*) as media
      FROM "Memory" m
      LEFT JOIN "MemoryMedia" mm ON mm."memoryId" = m.id
      WHERE m."coupleId" = ${coupleId}
        AND (m."isPrivate" = false OR m."authorId" = ${viewerId})
        AND EXTRACT(MONTH FROM m."memoryDate") = ${month}
        AND EXTRACT(DAY FROM m."memoryDate") = ${day}
        AND EXTRACT(YEAR FROM m."memoryDate") < ${today.getFullYear()}
      GROUP BY m.id
      ORDER BY m."memoryDate" DESC
    `;
  }

  async getAlbums(coupleId: string) {
    return this.prisma.album.findMany({
      where: { coupleId },
      include: { _count: { select: { memories: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAlbum(coupleId: string, name: string, description?: string) {
    return this.prisma.album.create({ data: { coupleId, name, description } });
  }
}
