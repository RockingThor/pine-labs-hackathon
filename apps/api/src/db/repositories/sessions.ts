import { prisma } from '../prisma.js';
import type { Session } from '@repo/shared';

export async function createSession(params: {
  id: string;
  email?: string;
  source?: string;
}): Promise<Session> {
  const session = await prisma.session.create({
    data: {
      id: params.id,
      email: params.email ?? null,
      source: params.source ?? 'web',
      startedAt: new Date(),
    },
  });
  return {
    id: session.id,
    userId: session.userId,
    email: session.email,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    metadata: session.metadata as Record<string, unknown> | null,
    source: session.source,
  };
}

export async function getSessionById(id: string) {
  return prisma.session.findUnique({
    where: { id },
    include: {
      coupons: true,
      paymentFailures: true,
    },
  });
}
