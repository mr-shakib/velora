import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  @Cron('0 8 * * *')
  async checkAnniversaries() {
    const today = new Date();
    const couples = await this.prisma.couple.findMany({
      where: { status: 'ACTIVE' },
      include: { members: true },
    });

    for (const couple of couples) {
      const start = couple.relationshipStart;
      if (start.getMonth() === today.getMonth() && start.getDate() === today.getDate()) {
        const years = today.getFullYear() - start.getFullYear();
        for (const member of couple.members) {
          await this.notifications.send({
            coupleId: couple.id,
            userId: member.id,
            type: NotificationType.ANNIVERSARY,
            title: years > 0 ? `🎉 Happy ${years}-year Anniversary!` : '🎉 Happy Anniversary!',
            body: years > 0
              ? `${years} wonderful year${years !== 1 ? 's' : ''} together`
              : 'Today marks 1 year of your beautiful journey',
          });
        }
      }
    }
  }

  @Cron('0 8 * * *')
  async checkBirthdays() {
    const today = new Date();
    const users = await this.prisma.user.findMany({
      where: { birthday: { not: null }, coupleId: { not: null }, status: 'ACTIVE' },
    });

    for (const user of users) {
      if (!user.birthday || !user.coupleId) continue;
      if (user.birthday.getMonth() === today.getMonth() && user.birthday.getDate() === today.getDate()) {
        const partner = await this.prisma.user.findFirst({
          where: { coupleId: user.coupleId, id: { not: user.id } },
        });
        if (!partner) continue;

        await this.notifications.send({
          coupleId: user.coupleId,
          userId: partner.id,
          type: NotificationType.BIRTHDAY,
          title: `🎂 Today is ${user.displayName}'s birthday!`,
          body: 'Make it a special day',
          data: { userId: user.id },
        });
      }
    }
  }

  @Cron('0 9 * * *')
  async checkUpcomingPlans() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const plans = await this.prisma.plannerEvent.findMany({
      where: {
        status: 'UPCOMING',
        startsAt: { gte: tomorrow, lte: tomorrowEnd },
      },
      include: { couple: { include: { members: true } } },
    });

    for (const plan of plans) {
      for (const member of plan.couple.members) {
        await this.notifications.send({
          coupleId: plan.coupleId,
          userId: member.id,
          type: NotificationType.UPCOMING_DATE,
          title: `📅 "${plan.title}" is tomorrow`,
          body: plan.location ? `📍 ${plan.location}` : 'Get ready for your date!',
          data: { planId: plan.id },
        });
      }
    }
  }

  @Cron('0 0 * * 0')
  async cleanupExpiredOtps() {
    const result = await this.prisma.otp.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    this.logger.log(`Cleaned up ${result.count} expired OTPs`);
  }

  @Cron('0 0 * * 0')
  async cleanupRevokedTokens() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.refreshToken.deleteMany({
      where: { OR: [{ revokedAt: { lt: thirtyDaysAgo } }, { expiresAt: { lt: new Date() } }] },
    });
    this.logger.log(`Cleaned up ${result.count} expired refresh tokens`);
  }
}
