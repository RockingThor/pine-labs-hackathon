import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

interface PreviousCoupon {
  code: string;
  discountValue: string;
  personalizedMessage: string | null;
}

interface NegotiateOfferResponse {
  sessionId: string;
  previousCoupon: PreviousCoupon;
}

export function NegotiateCoupon() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [offer, setOffer] = useState<NegotiateOfferResponse | null>(null);
  const [loading, setLoading] = useState(!!sessionId);
  const [offerError, setOfferError] = useState<string | null>(null);

  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ reply: string; newCouponCode: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setOfferError(null);
    fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/negotiate`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Session or coupon not found' : res.statusText);
        return res.json();
      })
      .then((data: NegotiateOfferResponse) => {
        setOffer(data);
      })
      .catch((e) => {
        setOfferError(e instanceof Error ? e.message : 'Failed to load');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [sessionId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !reason.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/negotiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason.trim() }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data.reply != null) {
          setResult({ reply: data.reply, newCouponCode: data.newCouponCode ?? '' });
        } else {
          setSubmitError(data?.error ?? 'Request failed');
        }
      })
      .catch(() => setSubmitError('Request failed'))
      .finally(() => setSubmitting(false));
  };

  if (sessionId == null || sessionId === '') {
    return (
      <div>
        <h1>Negotiate your coupon</h1>
        <p>Invalid or missing session. Please use the link from your email.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <h1>Negotiate your coupon</h1>
        <p>Loading…</p>
      </div>
    );
  }

  if (offerError || !offer) {
    return (
      <div>
        <h1>Negotiate your coupon</h1>
        <p>Session or coupon not found.</p>
      </div>
    );
  }

  if (result) {
    return (
      <div>
        <h1>Thank you</h1>
        <p>{result.reply}</p>
        <p>We've sent a better coupon to your email.</p>
      </div>
    );
  }

  const { previousCoupon } = offer;

  return (
    <div>
      <h1>Negotiate your coupon</h1>
      <p>
        Your current offer: <strong>{previousCoupon.code}</strong> — {previousCoupon.discountValue}
      </p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="reason" style={{ display: 'block', marginTop: 16, marginBottom: 8 }}>
          Why would you like a better offer?
        </label>
        <textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          style={{ width: '100%', maxWidth: 400, padding: 8 }}
          required
        />
        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={submitting || !reason.trim()}>
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </form>
      {submitError && <p style={{ color: 'crimson', marginTop: 8 }}>{submitError}</p>}
    </div>
  );
}
