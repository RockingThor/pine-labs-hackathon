import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import posthog from 'posthog-js';
import { PostHogProvider } from '@posthog/react';
import { App } from './App';
import { SessionProvider, useSession } from './SessionContext';

const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

function PostHogBootstrap({ children }: { children: React.ReactNode }) {
  const { sessionId, ready } = useSession();
  const [posthogInitialized, setPosthogInitialized] = useState(false);

  React.useEffect(() => {
    if (!ready || !sessionId) return;
    if (!posthogKey) {
      setPosthogInitialized(true);
      return;
    }
    if ((posthog as { __loaded?: boolean }).__loaded) {
      setPosthogInitialized(true);
      return;
    }
    posthog.init(posthogKey, {
      api_host: posthogHost || 'https://us.i.posthog.com',
      bootstrap: { sessionID: sessionId },
      person_profiles: 'identified_only',
      session_recording: { recordCrossOriginIframes: true },
    });
    setPosthogInitialized(true);
  }, [sessionId, ready]);

  const showApp = !posthogKey || posthogInitialized;
  return showApp ? <>{children}</> : <p>Loading…</p>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <PostHogBootstrap>
          {posthogKey ? (
            <PostHogProvider client={posthog}>
              <App />
            </PostHogProvider>
          ) : (
            <App />
          )}
        </PostHogBootstrap>
      </SessionProvider>
    </BrowserRouter>
  </React.StrictMode>
);
