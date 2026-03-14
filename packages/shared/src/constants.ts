/** Custom event types emitted by the React app */
export const EVENT_TYPES = {
  PRODUCT_VIEWED: 'product_viewed',
  ADD_TO_CART: 'add_to_cart',
  CHECKOUT_STARTED: 'checkout_started',
  PAYMENT_FAILED: 'payment_failed',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

/** Coupon priority values */
export const COUPON_PRIORITY = {
  PAYMENT_FAILURE: 'payment_failure',
  SESSION_BASED: 'session_based',
} as const;

export type CouponPriorityType = (typeof COUPON_PRIORITY)[keyof typeof COUPON_PRIORITY];

/** Session source */
export const SESSION_SOURCE = {
  WEB: 'web',
} as const;
