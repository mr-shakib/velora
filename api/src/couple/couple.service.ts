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
import { createPersonalSpace } from '../common/spaces';

@Injectable()
export class CoupleService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  async createInvite(inviterId: string) {
    const inviter = await this.prisma.user.findUnique({ where: { id: inviterId } });
    if (!inviter || !inviter.coupleId) throw new NotFoundException();

    // A space holds at most two people. Solo (1 member) may invite; a full
    // space (2 members) must leave the current partner first.
    const members = await this.prisma.user.count({ where: { coupleId: inviter.coupleId } });
    if (members >= 2) {
      throw new ConflictException('Your space is full — leave your current partner first.');
    }

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
    if (!acceptor || !acceptor.coupleId) throw new NotFoundException();

    const inviterSpaceId = invite.inviter.coupleId;
    if (!inviterSpaceId) throw new BadRequestException('This invite is no longer valid.');

    // The inviter's space must still have room (they could have paired with
    // someone else since creating the invite).
    const inviterMembers = await this.prisma.user.count({ where: { coupleId: inviterSpaceId } });
    if (inviterMembers >= 2) {
      throw new ConflictException('This space is already full.');
    }

    // The acceptor must be solo. If they're already paired, they have to leave
    // their current partner first — which needs that partner's permission.
    const acceptorSpaceId = acceptor.coupleId;
    const acceptorMembers = await this.prisma.user.count({ where: { coupleId: acceptorSpaceId } });
    if (acceptorMembers >= 2) {
      throw new ForbiddenException(
        'Leave your current partner first to join another space (your partner must approve).',
      );
    }

    const couple = await this.prisma.$transaction(async (tx) => {
      // Merge the acceptor's solo data into the inviter's space.
      const reassign = { where: { coupleId: acceptorSpaceId }, data: { coupleId: inviterSpaceId } };
      await tx.memory.updateMany(reassign);
      await tx.album.updateMany(reassign);
      await tx.timelineEvent.updateMany(reassign);
      await tx.message.updateMany(reassign);
      await tx.plannerEvent.updateMany(reassign);
      await tx.bucketItem.updateMany(reassign);
      await tx.countdown.updateMany(reassign);
      await tx.aiOutput.updateMany(reassign);
      await tx.notification.updateMany(reassign);

      // Move the acceptor into the inviter's space; the inviter keeps their theme.
      await tx.user.update({
        where: { id: acceptorId },
        data: { coupleId: inviterSpaceId, status: UserStatus.ACTIVE },
      });
      await tx.user.update({
        where: { id: invite.inviterId },
        data: { status: UserStatus.ACTIVE },
      });

      // Cancel any pending invites the acceptor had for their (now-gone) space.
      await tx.inviteLink.updateMany({
        where: { inviterId: acceptorId, status: InviteStatus.PENDING },
        data: { status: InviteStatus.EXPIRED },
      });

      await tx.inviteLink.update({
        where: { id: invite.id },
        data: { status: InviteStatus.ACCEPTED, acceptedAt: new Date(), coupleId: inviterSpaceId },
      });

      // The acceptor's personal space is now empty — remove it and its theme.
      await tx.theme.deleteMany({ where: { coupleId: acceptorSpaceId } });
      await tx.couple.delete({ where: { id: acceptorSpaceId } });

      return tx.couple.findUniqueOrThrow({ where: { id: inviterSpaceId } });
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

    const members = await this.prisma.user.findMany({
      where: { coupleId: user.coupleId },
      orderBy: { createdAt: 'asc' },
    });
    if (members.length < 2) {
      throw new BadRequestException("You don't have a partner to leave.");
    }
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
      include: { members: { orderBy: { createdAt: 'asc' } } },
    });

    if (!couple || couple.status !== CoupleStatus.UNLINK_REQUESTED) {
      throw new BadRequestException('No unlink request is pending.');
    }

    const requester =
      couple.unlinkRequestedBy === UnlinkRequester.USER1 ? couple.members[0] : couple.members[1];

    if (!requester || requester.id === userId) {
      throw new ForbiddenException('You initiated the request. Waiting for your partner to confirm.');
    }

    // Permission granted: the requester leaves to a fresh empty personal space;
    // the confirmer (this user) stays and keeps the space and all its data.
    const sharedSpaceId = couple.id;
    await this.prisma.$transaction(async (tx) => {
      await createPersonalSpace(tx, requester.id);
      await tx.couple.update({
        where: { id: sharedSpaceId },
        data: {
          status: CoupleStatus.ACTIVE,
          unlinkRequestedBy: null,
          unlinkRequestedAt: null,
        },
      });
    });

    this.events.emit('couple.unlinked', { coupleId: sharedSpaceId, leaverId: requester.id, stayerId: userId });
    return { message: 'Your partner has left the space. Everything here is now yours.' };
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
