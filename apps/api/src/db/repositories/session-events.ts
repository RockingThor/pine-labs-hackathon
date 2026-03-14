import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export async function appendSessionEvents(
  sessionId: string,
  events: Array<{ eventType: string; payload?: Record<string, unknown> }>
) {
  await prisma.sessionEvent.createMany({
    data: events.map((e) => ({
      sessionId,
      eventType: e.eventType,
      payload: (e.payload ?? undefined) as Prisma.InputJsonValue | undefined,
    })),
  });
}
