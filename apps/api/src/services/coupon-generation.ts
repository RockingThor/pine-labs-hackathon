/**
 * Coupon generation: fetch behavior from PostHog → Bedrock → persist + email.
 */

import { COUPON_PRIORITY } from '@repo/shared';
import * as sessionsRepo from '../db/repositories/sessions.js';
import * as paymentFailuresRepo from '../db/repositories/payment-failures.js';
import * as couponsRepo from '../db/repositories/coupons.js';
import { getBehaviorSummaryForSession } from './posthog-api.js';
import { generateCouponContent } from './bedrock.js';
import { sendCouponEmail } from './mail.js';

function generateCouponCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export interface GenerateCouponInput {
  sessionId: string;
  paymentFailureId?: string;
  priority: 'payment_failure' | 'session_based';
}

/**
 * Generate coupon for a session: fetch behavior from PostHog, call Bedrock,
 * persist coupon, send email, mark payment_failure processed if applicable.
 */
export async function generateCoupon(input: GenerateCouponInput): Promise<{ couponId: string } | { error: string }> {
  const session = await sessionsRepo.getSessionById(input.sessionId);
  if (!session) {
    return { error: 'Session not found' };
  }

  const userEmail = session.email ?? process.env.FALLBACK_COUPON_EMAIL ?? 'demo@example.com';

  let paymentFailureReason: string | null = null;
  if (input.paymentFailureId) {
    const pf = await paymentFailuresRepo.getPaymentFailureById(input.paymentFailureId);
    if (pf) {
      paymentFailureReason = pf.reason ?? pf.payload ? JSON.stringify(pf.payload) : null;
    }
  }

  const behaviorSummary = await getBehaviorSummaryForSession(input.sessionId);

  let suggestion: { coupon_description: string; personalized_message: string };
  try {
    suggestion = await generateCouponContent(behaviorSummary, paymentFailureReason);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[coupon-generation] Bedrock failed:', message);
    return { error: `Coupon generation failed: ${message}` };
  }

  const code = generateCouponCode();

  const coupon = await couponsRepo.createCoupon({
    sessionId: input.sessionId,
    userEmail,
    code,
    discountType: 'percent',
    discountValue: suggestion.coupon_description,
    personalizedMessage: suggestion.personalized_message,
    priority: input.priority === 'payment_failure' ? COUPON_PRIORITY.PAYMENT_FAILURE : COUPON_PRIORITY.SESSION_BASED,
  });

  await sendCouponEmail(userEmail, code, suggestion.personalized_message, { sessionId: input.sessionId });

  if (input.paymentFailureId) {
    await paymentFailuresRepo.markProcessed(input.paymentFailureId);
  }

  return { couponId: coupon.id };
}
