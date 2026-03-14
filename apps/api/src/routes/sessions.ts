import type { Router } from 'express';
import { Router as createRouter } from 'express';
import { uuidv7 } from 'uuidv7';
import type { CreateSessionRequest, CreateSessionResponse, AppendSessionEventsRequest, SessionDetailsResponse } from '@repo/shared';
import { SESSION_SOURCE } from '@repo/shared';
import * as sessionsRepo from '../db/repositories/sessions.js';
import * as sessionEventsRepo from '../db/repositories/session-events.js';
import * as couponsRepo from '../db/repositories/coupons.js';
import * as paymentFailuresRepo from '../db/repositories/payment-failures.js';
import { getBehaviorSummaryForSession } from '../services/posthog-api.js';
import { generateCoupon } from '../services/coupon-generation.js';

export const sessionsRouter: Router = createRouter();

/** POST /sessions – create session, return UUID v7 session_id */
sessionsRouter.post<object, CreateSessionResponse | { error: string }, CreateSessionRequest>('/', async (req, res) => {
  try {
    const body = req.body ?? {};
    const sessionId = uuidv7();
    const session = await sessionsRepo.createSession({
      id: sessionId,
      email: typeof body.email === 'string' ? body.email : undefined,
      source: SESSION_SOURCE.WEB,
    });
    res.status(201).json({ session_id: session.id });
  } catch (err) {
    console.error('[sessions] create failed:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/** GET /sessions/:id – session details + coupon sent + optional behavior summary */
sessionsRouter.get<{ id: string }, SessionDetailsResponse | { error: string }>('/:id', async (req, res) => {
  try {
    const session = await sessionsRepo.getSessionById(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    const coupons = await couponsRepo.getCouponsBySessionId(session.id);
    const behaviorSummary = await getBehaviorSummaryForSession(session.id);
    const response: SessionDetailsResponse = {
      id: session.id,
      email: session.email,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString(),
      metadata: session.metadata as Record<string, unknown> | null,
      source: session.source,
      couponSent: coupons.length > 0,
      behaviorSummary: behaviorSummary || undefined,
    };
    res.json(response);
  } catch (err) {
    console.error('[sessions] get failed:', err);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

/** POST /sessions/:id/events – append server-side events */
sessionsRouter.post<{ id: string }, object, AppendSessionEventsRequest>('/:id/events', async (req, res) => {
  try {
    const session = await sessionsRepo.getSessionById(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    const body = req.body ?? {};
    const events = Array.isArray(body.events) ? body.events : [];
    if (events.length > 0) {
      await sessionEventsRepo.appendSessionEvents(req.params.id, events);
    }
    res.status(204).send();
  } catch (err) {
    console.error('[sessions] events failed:', err);
    res.status(500).json({ error: 'Failed to append events' });
  }
});

/** POST /sessions/:id/simulate-payment-failure – demo: create payment failure and trigger coupon */
sessionsRouter.post<{ id: string }>('/:id/simulate-payment-failure', async (req, res) => {
  try {
    const session = await sessionsRepo.getSessionById(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    const pf = await paymentFailuresRepo.createPaymentFailure({
      sessionId: req.params.id,
      reason: 'SIMULATED_DEMO',
      payload: { simulated: true },
    });
    const result = await generateCoupon({
      sessionId: req.params.id,
      paymentFailureId: pf.id,
      priority: 'payment_failure',
    });
    if ('error' in result) {
      res.status(502).json({ error: result.error });
      return;
    }
    res.status(200).json({ couponId: result.couponId });
  } catch (err) {
    console.error('[sessions] simulate-payment-failure failed:', err);
    res.status(500).json({ error: 'Simulate payment failure failed' });
  }
});
