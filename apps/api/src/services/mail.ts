/**
 * Send coupon email via Resend.
 * Requires: RESEND_API_KEY, optional FROM_EMAIL
 */

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL ?? 'onboarding@resend.dev';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export async function sendCouponEmail(
  to: string,
  couponCode: string,
  personalizedMessage: string,
  options?: { sessionId?: string }
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('[mail] RESEND_API_KEY not set; skipping send');
    return { success: true };
  }

  const negotiateParagraph =
    options?.sessionId ?
      `<p style="color: #666; font-size: 14px;">Not quite right? <a href="${escapeHtml(FRONTEND_URL + '/negotiate?sessionId=' + encodeURIComponent(options.sessionId))}">Negotiate for a better offer</a>.</p>`
    : '';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Your coupon</title></head>
<body style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1>Here's your coupon</h1>
  <p><strong>Code:</strong> <code style="background: #f0f0f0; padding: 4px 8px;">${escapeHtml(couponCode)}</code></p>
  <p>${escapeHtml(personalizedMessage)}</p>
  <p style="color: #666; font-size: 14px;">Thanks for shopping with us.</p>
  ${negotiateParagraph}
</body>
</html>
  `.trim();

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ['rohitnandi01234@gmail.com'],
      subject: 'Your personalized coupon',
      html,
    });
    if (error) {
      console.error('[mail] Resend error:', error);
      return { success: false, error: String(error) };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[mail] Send failed:', message);
    return { success: false, error: message };
  }
}

/**
 * Send the improved coupon email after negotiation (no negotiate link).
 */
export async function sendNegotiatedCouponEmail(
  to: string,
  couponCode: string,
  personalizedMessage: string
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('[mail] RESEND_API_KEY not set; skipping send');
    return { success: true };
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Your new coupon</title></head>
<body style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1>Here's your new coupon</h1>
  <p><strong>Code:</strong> <code style="background: #f0f0f0; padding: 4px 8px;">${escapeHtml(couponCode)}</code></p>
  <p>${escapeHtml(personalizedMessage)}</p>
  <p style="color: #666; font-size: 14px;">Thanks for shopping with us.</p>
</body>
</html>
  `.trim();

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: 'Your improved coupon',
      html,
    });
    if (error) {
      console.error('[mail] Resend error:', error);
      return { success: false, error: String(error) };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[mail] Send failed:', message);
    return { success: false, error: message };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
