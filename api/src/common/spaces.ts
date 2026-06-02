import { Prisma, UserStatus } from '@prisma/client';

/**
 * Creates a "personal space" — a Couple with a single member — and links the
 * user to it. A space with 1 member is solo; a space with 2 members is paired.
 * Giving every user a personal space means coupleId is always set, so all the
 * couple-scoped feature guards pass and a user can use the app with no partner.
 *
 * Accepts either the PrismaService or a transaction client so it can run inside
 * an existing $transaction (e.g. when detaching a partner during unlink).
 */
export async function createPersonalSpace(
  db: Prisma.TransactionClient,
  userId: string,
): Promise<string> {
  const couple = await db.couple.create({
    data: { relationshipStart: new Date() },
  });
  await db.theme.create({ data: { coupleId: couple.id } });
  await db.user.update({
    where: { id: userId },
    data: { coupleId: couple.id, status: UserStatus.ACTIVE },
  });
  return couple.id;
}
