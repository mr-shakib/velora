import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FcmService } from './fcm.service';

interface SendNotificationPayload {
  coupleId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private fcm: FcmService,
    private events: EventEmitter2,
  ) {}

  async send(payload: SendNotificationPayload) {
    const notification = await this.prisma.notification.create({
      data: {
        coupleId: payload.coupleId,
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: (payload.data ?? {}) as object,
      },
    });

    this.events.emit('notification.send', { userId: payload.userId, notification });

    const tokens = await this.prisma.fcmToken.findMany({
      where: { userId: payload.userId },
      select: { token: true, id: true },
    });

    if (tokens.length) {
      const failedTokens = await this.fcm.sendToTokens(
        tokens.map((t) => t.token),
        { title: payload.title, body: payload.body, data: { type: payload.type, ...Object.fromEntries(Object.entries(payload.data ?? {}).map(([k, v]) => [k, String(v)])) } },
      );

      if (failedTokens.length) {
        await this.prisma.fcmToken.deleteMany({ where: { token: { in: failedTokens } } });
      }
    }

    return notification;
  }

  async registerToken(userId: string, token: string, platform: 'WEB' | 'ANDROID' | 'IOS', deviceInfo?: string) {
    return this.prisma.fcmToken.upsert({
      where: { token },
      create: { userId, token, platform, deviceInfo },
      update: { lastUsedAt: new Date(), userId },
    });
  }

  async removeToken(token: string) {
    await this.prisma.fcmToken.deleteMany({ where: { token } });
    return { removed: true };
  }

  async getAll(userId: string, page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { data: notifications, meta: { total, page, limit } };
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  @OnEvent('memory.created')
  async onMemoryCreated(payload: { memory: { authorId: string; coupleId: string }; coupleId: string }) {
    const partner = await this.prisma.user.findFirst({
      where: { coupleId: payload.coupleId, id: { not: payload.memory.authorId } },
    });
    if (!partner) return;

    const author = await this.prisma.user.findUnique({ where: { id: payload.memory.authorId } });
    await this.send({
      coupleId: payload.coupleId,
      userId: partner.id,
      type: NotificationType.NEW_MEMORY,
      title: '📸 New memory added',
      body: `${author?.displayName} added a new memory`,
      data: { memoryId: payload.memory.authorId },
    });
  }

  @OnEvent('bucket.completed')
  async onBucketCompleted(payload: { item: { coupleId: string; title: string; creatorId: string }; coupleId: string }) {
    const members = await this.prisma.user.findMany({ where: { coupleId: payload.coupleId } });
    for (const member of members) {
      await this.send({
        coupleId: payload.coupleId,
        userId: member.id,
        type: NotificationType.BUCKET_COMPLETED,
        title: '🎉 Bucket list item completed!',
        body: `"${payload.item.title}" has been checked off your list`,
      });
    }
  }
}
