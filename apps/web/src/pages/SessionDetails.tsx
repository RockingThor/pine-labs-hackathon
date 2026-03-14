import { useEffect, useState } from 'react';
import { useSession } from '../SessionContext';
import type { SessionDetailsResponse } from '@repo/shared';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export function SessionDetails() {
  const { sessionId, ready } = useSession();
  const [session, setSession] = useState<SessionDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !sessionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/sessions/${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((data: SessionDetailsResponse) => {
        setSession(data);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load session');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [sessionId, ready]);

  if (!ready) {
    return <p>Loading session…</p>;
  }

  if (!sessionId) {
    return <p>No session. Start the demo flow to create one.</p>;
  }

  if (loading) {
    return <p>Loading session details…</p>;
  }

  if (error || !session) {
    return <p>Error: {error ?? 'Session not found'}</p>;
  }

  return (
    <div>
      <h1>My session</h1>
      <dl style={{ marginTop: 16 }}>
        <dt>Session ID</dt>
        <dd><code style={{ fontSize: 12 }}>{session.id}</code></dd>
        <dt>Email</dt>
        <dd>{session.email ?? '—'}</dd>
        <dt>Started</dt>
        <dd>{session.startedAt}</dd>
        <dt>Source</dt>
        <dd>{session.source ?? '—'}</dd>
        <dt>Coupon sent</dt>
        <dd>{session.couponSent ? 'Yes' : 'No'}</dd>
      </dl>
      {session.behaviorSummary && (
        <>
          <h2>Behavior summary</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{session.behaviorSummary}</p>
        </>
      )}
    </div>
  );
}
