import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

interface SessionContextValue {
  sessionId: string | null;
  ready: boolean;
  createSession: (email?: string) => Promise<string | null>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(() => {
    try {
      const stored = sessionStorage.getItem('demo_session_id');
      return stored || null;
    } catch {
      return null;
    }
  });
  const [ready, setReady] = useState(false);

  const createSession = useCallback(async (email?: string): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(email != null ? { email } : {}),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { session_id: string };
      setSessionId(data.session_id);
      try {
        sessionStorage.setItem('demo_session_id', data.session_id);
      } catch {
        /* ignore */
      }
      return data.session_id;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (sessionId) {
      setReady(true);
      return;
    }
    createSession().finally(() => setReady(true));
  }, [sessionId, createSession]);

  const value: SessionContextValue = {
    sessionId,
    ready,
    createSession,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
