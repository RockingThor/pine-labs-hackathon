/** Session from API/DB */
export interface Session {
  id: string;
  userId?: string | null;
  email?: string | null;
  startedAt: Date;
  endedAt?: Date | null;
  metadata?: Record<string, unknown> | null;
  source?: string | null;
}

/** Session event (server-side or webhook) */
export interface SessionEvent {
  id: string;
  sessionId: string;
  eventType: string;
  payload?: Record<string, unknown> | null;
  createdAt: Date;
}

/** Payment failure from Pinelabs webhook */
export interface PaymentFailure {
  id: string;
  sessionId?: string | null;
  externalId?: string | null;
  amount?: number | null;
  reason?: string | null;
  payload?: Record<string, unknown> | null;
  createdAt: Date;
  processedAt?: Date | null;
}

/** Generated coupon */
export interface Coupon {
  id: string;
  sessionId: string;
  userEmail: string;
  code: string;
  discountType: string;
  discountValue: string;
  personalizedMessage?: string | null;
  priority: CouponPriority;
  sentAt?: Date | null;
  createdAt: Date;
}

export type CouponPriority = 'payment_failure' | 'session_based';

/** API: create session request */
export interface CreateSessionRequest {
  email?: string;
}

/** API: create session response */
export interface CreateSessionResponse {
  session_id: string;
}

/** API: append session events request */
export interface AppendSessionEventsRequest {
  events: Array<{ eventType: string; payload?: Record<string, unknown> }>;
}

/** API: session details response (GET /sessions/:id) */
export interface SessionDetailsResponse {
  id: string;
  email?: string | null;
  startedAt: string;
  endedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  source?: string | null;
  couponSent?: boolean;
  behaviorSummary?: string;
}

/** Pinelabs webhook payload (minimal for payment failure) */
export interface PinelabsWebhookPayload {
  event?: string;
  transaction_id?: string;
  order_id?: string;
  session_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  error_code?: string;
  error_message?: string;
  [key: string]: unknown;
}
