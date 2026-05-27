import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MoodEmoji } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  async updateProfile(userId: string, data: { displayName?: string; bio?: string; birthday?: Date; timezone?: string; avatarPublicId?: string }) {
    return this.prisma.user.update({ where: { id: userId }, data });
  }

  async setMood(userId: string, mood: MoodEmoji, note?: string) {
    return this.prisma.mood.create({
      data: { userId, mood, note },
    });
  }

  async getCurrentMood(userId: string) {
    return this.prisma.mood.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPartner(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.coupleId) return null;

    return this.prisma.user.findFirst({
      where: { coupleId: user.coupleId, id: { not: userId } },
      select: {
        id: true,
        displayName: true,
        avatarPublicId: true,
        bio: true,
        birthday: true,
        timezone: true,
        createdAt: true,
        moods: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async giveAiConsent(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { aiConsentGiven: true, aiConsentAt: new Date() },
    });
  }

  async revokeAiConsent(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { aiConsentGiven: false },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    if (!user.passwordHash) throw new BadRequestException('Cannot change password for this account.');
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect.');
    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    return { message: 'Password changed successfully.' };
  }
}
