import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export async function createPaymentFailure(params: {
  sessionId?: string;
  externalId?: string;
  amount?: number;
  reason?: string;
  payload?: Record<string, unknown>;
}) {
  return prisma.paymentFailure.create({
    data: {
      sessionId: params.sessionId ?? null,
      externalId: params.externalId ?? null,
      amount: params.amount != null ? params.amount : null,
      reason: params.reason ?? null,
      payload: (params.payload ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function getUnprocessedPaymentFailures() {
  return prisma.paymentFailure.findMany({
    where: { processedAt: null },
    orderBy: { createdAt: 'asc' },
    include: { session: true },
  });
}

export async function markProcessed(id: string) {
  return prisma.paymentFailure.update({
    where: { id },
    data: { processedAt: new Date() },
  });
}

export async function getPaymentFailureById(id: string) {
  return prisma.paymentFailure.findUnique({
    where: { id },
    include: { session: true },
  });
}
