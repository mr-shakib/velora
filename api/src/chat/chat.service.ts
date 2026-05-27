import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';

interface SendMessageDto {
  content?: string;
  replyToId?: string;
  pinnedMemoryId?: string;
  attachments?: Array<{ publicId: string; mediaType: 'IMAGE' | 'VIDEO'; url: string; bytes: number }>;
}

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  async sendMessage(coupleId: string, senderId: string, dto: SendMessageDto) {
    if (!dto.content && !dto.attachments?.length) {
      throw new Error('Message must have content or attachments.');
    }

    const message = await this.prisma.message.create({
      data: {
        coupleId,
        senderId,
        content: dto.content,
        replyToId: dto.replyToId,
        pinnedMemoryId: dto.pinnedMemoryId,
        attachments: dto.attachments
          ? { create: dto.attachments.map((a) => ({ publicId: a.publicId, mediaType: a.mediaType, url: a.url, bytes: a.bytes })) }
          : undefined,
      },
      include: {
        sender: { select: { id: true, displayName: true, avatarPublicId: true } },
        replyTo: { select: { id: true, content: true, sender: { select: { id: true, displayName: true } } } },
        attachments: true,
        reactions: true,
        pinnedMemory: { select: { id: true, caption: true, media: { take: 1 } } },
      },
    });

    this.events.emit('chat.message', { message, coupleId });
    return message;
  }

  async getHistory(coupleId: string, cursor?: string, limit = 50) {
    const messages = await this.prisma.message.findMany({
      where: { coupleId, deletedForAll: false },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, displayName: true, avatarPublicId: true } },
        replyTo: { select: { id: true, content: true, sender: { select: { id: true, displayName: true } } } },
        attachments: true,
        reactions: true,
        pinnedMemory: { select: { id: true, caption: true, media: { take: 1 } } },
      },
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;

    return {
      data: items.reverse(),
      meta: { hasMore, nextCursor: hasMore ? items[0].id : null },
    };
  }

  async addReaction(messageId: string, userId: string, emoji: string) {
    return this.prisma.messageReaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
      create: { messageId, userId, emoji },
      update: {},
    });
  }

  async removeReaction(messageId: string, userId: string, emoji: string) {
    await this.prisma.messageReaction.deleteMany({
      where: { messageId, userId, emoji },
    });
    return { removed: true };
  }

  async markRead(coupleId: string, userId: string, upToMessageId: string) {
    const message = await this.prisma.message.findFirst({ where: { id: upToMessageId, coupleId } });
    if (!message) throw new NotFoundException();

    await this.prisma.message.updateMany({
      where: {
        coupleId,
        senderId: { not: userId },
        readAt: null,
        createdAt: { lte: message.createdAt },
      },
      data: { readAt: new Date() },
    });

    return { ok: true };
  }

  async deleteMessage(messageId: string, coupleId: string, userId: string) {
    const message = await this.prisma.message.findFirst({ where: { id: messageId, coupleId } });
    if (!message || message.senderId !== userId) throw new NotFoundException();

    return this.prisma.message.update({
      where: { id: messageId },
      data: { deletedForAll: true, content: null },
    });
  }

  async getUnreadCount(coupleId: string, userId: string) {
    return this.prisma.message.count({
      where: { coupleId, senderId: { not: userId }, readAt: null, deletedForAll: false },
    });
  }
}
