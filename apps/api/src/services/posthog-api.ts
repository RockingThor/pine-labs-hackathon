/**
 * PostHog Query API client: fetch events by session_id and build behavior summary.
 * Requires: POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID, POSTHOG_HOST
 */

const POSTHOG_HOST = process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com';
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const POSTHOG_PERSONAL_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;

interface PostHogEventRow {
  event: string;
  timestamp: string;
  current_url?: string;
  pathname?: string;
  prev_pageview_duration?: number;
  prev_pageview_pathname?: string;
  product_id?: string;
  product_name?: string;
}

export async function fetchSessionEvents(sessionId: string): Promise<PostHogEventRow[]> {
  if (!POSTHOG_PROJECT_ID || !POSTHOG_PERSONAL_API_KEY) {
    return [];
  }

  // HogQL: session_id in PostHog is often in properties.$session_id
  const query = `
    SELECT
      event,
      timestamp,
      properties.$current_url AS current_url,
      properties.$pathname AS pathname,
      properties.$prev_pageview_duration AS prev_pageview_duration,
      properties.$prev_pageview_pathname AS prev_pageview_pathname,
      properties.product_id AS product_id,
      properties.product_name AS product_name
    FROM events
    WHERE properties.$session_id = '${sessionId.replace(/'/g, "''")}'
      AND timestamp >= now() - INTERVAL 1 DAY
    ORDER BY timestamp
    LIMIT 500
  `.trim();

  const url = `${POSTHOG_HOST.replace(/\/$/, '')}/api/projects/${POSTHOG_PROJECT_ID}/query/`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${POSTHOG_PERSONAL_API_KEY}`,
    },
    body: JSON.stringify({
      query: {
        kind: 'HogQLQuery',
        query,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[posthog-api] Query failed:', res.status, text);
    return [];
  }

  const data = (await res.json()) as {
    results?: unknown[][];
    columns?: string[];
  };

  if (!data.results || !data.columns || data.results.length === 0) {
    return [];
  }

  const columns = data.columns as string[];
  const col = (name: string) => {
    const i = columns.indexOf(name);
    return i >= 0 ? i : -1;
  };

  return data.results.map((row) => {
    const get = (key: string) => {
      const i = col(key);
      return i >= 0 ? row[i] : undefined;
    };
    return {
      event: get('event') as string,
      timestamp: get('timestamp') as string,
      current_url: get('current_url') as string | undefined,
      pathname: get('pathname') as string | undefined,
      prev_pageview_duration: get('prev_pageview_duration') as number | undefined,
      prev_pageview_pathname: get('prev_pageview_pathname') as string | undefined,
      product_id: get('product_id') as string | undefined,
      product_name: get('product_name') as string | undefined,
    };
  });
}

/**
 * Build a short behavior summary string for Bedrock from PostHog events.
 */
export function buildBehaviorSummary(events: PostHogEventRow[]): string {
  if (events.length === 0) {
    return 'No tracked behavior for this session.';
  }

  const parts: string[] = [];
  let lastPath: string | undefined;

  for (const row of events) {
    if (row.prev_pageview_duration != null && lastPath) {
      const sec = Math.round(Number(row.prev_pageview_duration) / 1000);
      parts.push(`Viewed ${lastPath} (${sec}s)`);
    }
    lastPath = row.pathname ?? row.prev_pageview_pathname;

    if (row.event === 'product_viewed' && (row.product_name || row.product_id)) {
      parts.push(`Viewed product: ${row.product_name ?? row.product_id}`);
    } else if (row.event === 'add_to_cart' && (row.product_name || row.product_id)) {
      parts.push(`Added to cart: ${row.product_name ?? row.product_id}`);
    } else if (row.event === 'checkout_started') {
      parts.push('Started checkout');
    } else if (row.event === 'payment_failed') {
      parts.push('Payment failed');
    } else if (row.event === '$pageview' && row.pathname) {
      parts.push(`Page: ${row.pathname}`);
    }
  }

  if (parts.length === 0) {
    return `Session had ${events.length} event(s) (e.g. ${events.map((e) => e.event).slice(0, 5).join(', ')}).`;
  }

  return parts.join('. ');
}

export async function getBehaviorSummaryForSession(sessionId: string): Promise<string> {
  const events = await fetchSessionEvents(sessionId);
  return buildBehaviorSummary(events);
}
