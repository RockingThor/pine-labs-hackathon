import type { Router } from 'express';
import { Router as createRouter } from 'express';
import type { PinelabsWebhookPayload } from '@repo/shared';
import * as paymentFailuresRepo from '../db/repositories/payment-failures.js';
import { generateCoupon } from '../services/coupon-generation.js';

export const webhooksRouter: Router = createRouter();

/**
 * POST /webhooks/pinelabs
 * On payment failure: insert into payment_failures, link session_id if present,
 * trigger coupon generation (highest priority).
 */
webhooksRouter.post<object, object, PinelabsWebhookPayload>('/pinelabs', async (req, res) => {
  try {
    const payload = (req.body ?? {}) as PinelabsWebhookPayload;

    // MVP: treat as payment failure if status indicates failure or we have error_code/error_message
    const isFailure =
      payload.status === 'failed' ||
      payload.status === 'failure' ||
      (payload.error_code != null) ||
      (payload.error_message != null);

    if (!isFailure) {
      res.status(200).json({ received: true });
      return;
    }

    const sessionId =
      typeof payload.session_id === 'string' && payload.session_id.trim() ? payload.session_id.trim() : undefined;
    const amount = typeof payload.amount === 'number' ? payload.amount : undefined;
    const reason = [payload.error_code, payload.error_message].filter(Boolean).join(' ') || undefined;

    const pf = await paymentFailuresRepo.createPaymentFailure({
      sessionId,
      externalId: payload.transaction_id ?? payload.order_id,
      amount,
      reason: reason || undefined,
      payload: payload as Record<string, unknown>,
    });

    if (sessionId) {
      const result = await generateCoupon({
        sessionId,
        paymentFailureId: pf.id,
        priority: 'payment_failure',
      });
      if ('error' in result) {
        console.error('[webhooks/pinelabs] coupon generation failed:', result.error);
      }
    }

    res.status(200).json({ received: true, payment_failure_id: pf.id });
  } catch (err) {
    console.error('[webhooks/pinelabs] failed:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});
