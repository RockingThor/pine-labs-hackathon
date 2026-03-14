/**
 * Negotiate coupon: user reason + session + previous coupon → LLM → new coupon + email.
 */

import { COUPON_PRIORITY } from '@repo/shared';
import * as sessionsRepo from '../db/repositories/sessions.js';
import * as couponsRepo from '../db/repositories/coupons.js';
import { getBehaviorSummaryForSession } from './posthog-api.js';
import { generateNegotiatedCouponContent } from './bedrock.js';
import { sendNegotiatedCouponEmail } from './mail.js';

function generateCouponCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export interface NegotiateCouponResult {
  reply: string;
  newCouponCode: string;
}

export async function negotiateCoupon(
  sessionId: string,
  reason: string
): Promise<NegotiateCouponResult | { error: string }> {
  const session = await sessionsRepo.getSessionById(sessionId);
  if (!session) {
    return { error: 'Session not found' };
  }

  // const userEmail = session.email ?? process.env.FALLBACK_COUPON_EMAIL ?? 'demo@example.com';
  const userEmail = 'rohitnandi01234@gmail.com';

  const coupons = await couponsRepo.getCouponsBySessionId(sessionId);
  const previousCoupon = coupons[0];
  if (!previousCoupon) {
    return { error: 'No coupon to negotiate' };
  }

  const behaviorSummary = await getBehaviorSummaryForSession(sessionId);

  let suggestion: { coupon_description: string; personalized_message: string; reply_message: string };
  try {
    suggestion = await generateNegotiatedCouponContent(
      behaviorSummary,
      {
        code: previousCoupon.code,
        discountValue: previousCoupon.discountValue,
        personalizedMessage: previousCoupon.personalizedMessage ?? null,
      },
      reason
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[negotiate-coupon] Bedrock failed:', message);
    return { error: `Negotiation failed: ${message}` };
  }

  const code = generateCouponCode();

  await couponsRepo.createCoupon({
    sessionId,
    userEmail,
    code,
    discountType: 'percent',
    discountValue: suggestion.coupon_description,
    personalizedMessage: suggestion.personalized_message,
    priority: COUPON_PRIORITY.SESSION_BASED,
  });

  await sendNegotiatedCouponEmail(userEmail, code, suggestion.personalized_message);

  return {
    reply: suggestion.reply_message,
    newCouponCode: code,
  };
}
