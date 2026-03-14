import { prisma } from '../prisma.js';

export async function createCoupon(params: {
  sessionId: string;
  userEmail: string;
  code: string;
  discountType: string;
  discountValue: string;
  personalizedMessage?: string;
  priority: string;
}) {
  return prisma.coupon.create({
    data: {
      ...params,
      personalizedMessage: params.personalizedMessage ?? null,
      sentAt: new Date(),
    },
  });
}

export async function getCouponsBySessionId(sessionId: string) {
  return prisma.coupon.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
  });
}
