import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CoupleStatus, InviteStatus, UserStatus, UnlinkRequester } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CoupleService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  async createInvite(inviterId: string) {
    const inviter = await this.prisma.user.findUnique({ where: { id: inviterId } });
    if (!inviter) throw new NotFoundException();
    if (inviter.coupleId) throw new ConflictException('You are already linked with a partner.');

    const existing = await this.prisma.inviteLink.findFirst({
      where: { inviterId, status: InviteStatus.PENDING, expiresAt: { gt: new Date() } },
    });
    if (existing) return existing;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return this.prisma.inviteLink.create({
      data: { inviterId, expiresAt },
    });
  }

  async getInvitePreview(token: string) {
    const invite = await this.prisma.inviteLink.findUnique({
      where: { token },
      include: { inviter: { select: { id: true, displayName: true, avatarPublicId: true } } },
    });

    if (!invite) throw new NotFoundException('Invite link not found.');
    if (invite.status !== InviteStatus.PENDING || invite.expiresAt < new Date()) {
      throw new BadRequestException('This invite link has expired or already been used.');
    }

    return { inviter: invite.inviter, expiresAt: invite.expiresAt };
  }

  async acceptInvite(token: string, acceptorId: string) {
    const invite = await this.prisma.inviteLink.findUnique({
      where: { token },
      include: { inviter: true },
    });

    if (!invite || invite.status !== InviteStatus.PENDING || invite.expiresAt < new Date()) {
      throw new BadRequestException('This invite link is invalid or has expired.');
    }
    if (invite.inviterId === acceptorId) {
      throw new BadRequestException('You cannot accept your own invite.');
    }

    const acceptor = await this.prisma.user.findUnique({ where: { id: acceptorId } });
    if (!acceptor) throw new NotFoundException();
    if (acceptor.coupleId) throw new ConflictException('You are already linked with a partner.');

    const couple = await this.prisma.$transaction(async (tx) => {
      const newCouple = await tx.couple.create({
        data: {
          relationshipStart: new Date(),
          members: { connect: [{ id: invite.inviterId }, { id: acceptorId }] },
        },
      });

      await tx.theme.create({ data: { coupleId: newCouple.id } });

      await tx.user.updateMany({
        where: { id: { in: [invite.inviterId, acceptorId] } },
        data: { coupleId: newCouple.id, status: UserStatus.ACTIVE },
      });

      await tx.inviteLink.update({
        where: { id: invite.id },
        data: { status: InviteStatus.ACCEPTED, acceptedAt: new Date(), coupleId: newCouple.id },
      });

      return newCouple;
    });

    this.events.emit('couple.linked', { coupleId: couple.id, inviterId: invite.inviterId, acceptorId });
    return { couple, message: "You're now linked! Welcome to your shared space." };
  }

  async getCouple(coupleId: string) {
    return this.prisma.couple.findUnique({
      where: { id: coupleId },
      include: {
        members: {
          select: { id: true, displayName: true, avatarPublicId: true, timezone: true },
        },
        theme: true,
      },
    });
  }

  async updateRelationshipStart(coupleId: string, date: Date) {
    return this.prisma.couple.update({
      where: { id: coupleId },
      data: { relationshipStart: date },
    });
  }

  async requestUnlink(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.coupleId) throw new BadRequestException('You are not linked with a partner.');

    const couple = await this.prisma.couple.findUnique({ where: { id: user.coupleId } });
    if (!couple || couple.status !== CoupleStatus.ACTIVE) {
      throw new BadRequestException('Cannot request unlink at this time.');
    }

    const members = await this.prisma.user.findMany({ where: { coupleId: user.coupleId } });
    const requesterIndex = members[0].id === userId ? UnlinkRequester.USER1 : UnlinkRequester.USER2;

    const updated = await this.prisma.couple.update({
      where: { id: user.coupleId },
      data: {
        status: CoupleStatus.UNLINK_REQUESTED,
        unlinkRequestedBy: requesterIndex,
        unlinkRequestedAt: new Date(),
      },
    });

    this.events.emit('couple.unlink-requested', { coupleId: user.coupleId, requesterId: userId });
    return updated;
  }

  async confirmUnlink(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.coupleId) throw new BadRequestException('You are not linked with a partner.');

    const couple = await this.prisma.couple.findUnique({
      where: { id: user.coupleId },
      include: { members: true },
    });

    if (!couple || couple.status !== CoupleStatus.UNLINK_REQUESTED) {
      throw new BadRequestException('No unlink request is pending.');
    }

    const requester = couple.members.find((m) =>
      couple.unlinkRequestedBy === UnlinkRequester.USER1 ? m.id === couple.members[0].id : m.id === couple.members[1].id,
    );

    if (requester?.id === userId) {
      throw new ForbiddenException('You initiated the unlink request. Waiting for your partner to confirm.');
    }

    await this.prisma.$transaction([
      this.prisma.couple.update({
        where: { id: user.coupleId },
        data: { status: CoupleStatus.DISSOLVED, dissolvedAt: new Date() },
      }),
      this.prisma.user.updateMany({
        where: { coupleId: user.coupleId },
        data: { status: UserStatus.UNLINKED },
      }),
    ]);

    this.events.emit('couple.dissolved', { coupleId: user.coupleId });
    return { message: 'Your shared space has been dissolved. Data will be deleted in 30 days.' };
  }

  async cancelUnlinkRequest(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.coupleId) throw new BadRequestException();

    const couple = await this.prisma.couple.findUnique({ where: { id: user.coupleId } });
    if (couple?.status !== CoupleStatus.UNLINK_REQUESTED) throw new BadRequestException('No pending request to cancel.');

    return this.prisma.couple.update({
      where: { id: user.coupleId },
      data: { status: CoupleStatus.ACTIVE, unlinkRequestedBy: null, unlinkRequestedAt: null },
    });
  }

  async exportData(coupleId: string) {
    const [memories, timeline, planner, bucket, countdowns, messages] = await Promise.all([
      this.prisma.memory.findMany({ where: { coupleId }, include: { media: true } }),
      this.prisma.timelineEvent.findMany({ where: { coupleId } }),
      this.prisma.plannerEvent.findMany({ where: { coupleId } }),
      this.prisma.bucketItem.findMany({ where: { coupleId } }),
      this.prisma.countdown.findMany({ where: { coupleId } }),
      this.prisma.message.findMany({
        where: { coupleId, deletedForAll: false },
        select: { id: true, content: true, senderId: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return { exportedAt: new Date().toISOString(), coupleId, memories, timeline, planner, bucket, countdowns, messages };
  }
}
