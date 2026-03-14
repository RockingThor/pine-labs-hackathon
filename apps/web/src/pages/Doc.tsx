const ARCH_DIAGRAM = `[Web Demo] → [Session] → [PostHog Events]
       ↓
[Payment Failure] (webhook or simulate)
       ↓
[PostHog Query] (behavior by session) → [Bedrock] → [Coupon DB]
                                          ↓
                                    [Resend Email]

[Negotiation] User has coupon → types reason → [Bedrock] → improved coupon + reply
             (POST /sessions/:id/negotiate-coupon)`;

export function Doc() {
  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 800,
        margin: "0 auto",
        padding: 24,
      }}
    >
      <h1 style={{ marginBottom: 12, fontSize: "1.75rem" }}>
        What we built (and why)
      </h1>
      <p style={{ color: "#555", marginBottom: 32, lineHeight: 1.5 }}>
        We built a personalized coupon generation system. When a payment fails
        or when the user left the checkout page without completing the purchase,
        we generate a coupon for them based on their session behavior. If
        they’re not happy with it, they can negotiate. They can tell us why, and
        we use AI to suggest a better offer and a reply.
      </p>

      <h2 style={{ marginTop: 32, marginBottom: 12 }}>The pitch</h2>
      <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
        We built a <strong>personalized coupon system</strong>. When a payment
        fails or when we pretend it did (demo life), we take the user's{" "}
        <strong>session behavior</strong> from PostHog, throw it at{" "}
        <strong>AWS Bedrock</strong>, and get back a coupon idea plus a short
        personalized message. Then we store the coupon and email it. So we made
        failing at checkout actually useful.
      </p>
      <ul
        style={{
          marginTop: 16,
          marginBottom: 24,
          paddingLeft: 24,
          lineHeight: 1.6,
        }}
      >
        <li style={{ marginBottom: 8 }}>
          <strong>Demo flow:</strong> Mini e-commerce (products to cart to
          checkout) with a “Simulate payment failure” button to trigger the
          whole thing.
        </li>
        <li style={{ marginBottom: 8 }}>
          <strong>My session:</strong> See your session, whether a coupon was
          sent, and a behavior summary so you know what the AI was looking at.
        </li>
        <li style={{ marginBottom: 8 }}>
          <strong>Negotiate:</strong> Already got a coupon but not happy? Type a
          reason; Bedrock suggests a better coupon and a reply. We're nice like
          that.
        </li>
        <li style={{ marginBottom: 8 }}>
          <strong>Pine Labs gateway integration:</strong> We expose{" "}
          <code
            style={{ background: "#eee", padding: "2px 6px", borderRadius: 4 }}
          >
            POST /webhooks/pinelabs
          </code>{" "}
          so that when a payment fails at the{" "}
          <strong>Pine Labs payment gateway</strong>, we can receive the failure
          event (e.g. status, error_code, amount). If the payload includes a{" "}
          <code
            style={{ background: "#eee", padding: "2px 6px", borderRadius: 4 }}
          >
            session_id
          </code>{" "}
          we generate the coupon and send the email. Demo uses "Simulate payment
          failure"; in production, the gateway would call this webhook.
        </li>
      </ul>

      <h2 style={{ marginTop: 32, marginBottom: 12 }}>Architecture</h2>
      <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
        <strong>Monorepo:</strong>{" "}
        <code
          style={{ background: "#eee", padding: "2px 6px", borderRadius: 4 }}
        >
          api
        </code>{" "}
        (Express, Prisma, Postgres),{" "}
        <code
          style={{ background: "#eee", padding: "2px 6px", borderRadius: 4 }}
        >
          web
        </code>{" "}
        (React, Vite, React Router), and{" "}
        <code
          style={{ background: "#eee", padding: "2px 6px", borderRadius: 4 }}
        >
          shared
        </code>{" "}
        (types and constants so we don't argue about what a session is).
      </p>
      <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
        <strong>High-level flow:</strong> create a <strong>Session</strong>,
        user does stuff and we send <strong>Events</strong> to PostHog, then a{" "}
        <strong>Payment failure</strong> happens (webhook or simulate). We hit
        the <strong>PostHog Query API</strong> to get behavior by session,{" "}
        <strong>Bedrock</strong> returns coupon text and message, we save the{" "}
        <strong>Coupon</strong> and send the email via <strong>Resend</strong>.
      </p>
      <div
        style={{
          marginTop: 24,
          marginBottom: 24,
          padding: 16,
          background: "#f8f9fa",
          borderRadius: 8,
          overflow: "auto",
        }}
      >
        <pre
          style={{
            fontSize: 13,
            margin: 0,
            whiteSpace: "pre-wrap",
            fontFamily: "inherit",
          }}
        >
          {ARCH_DIAGRAM}
        </pre>
      </div>
      <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>
        Sessions and events live in Postgres (Prisma). PostHog does analytics
        and the Query API for “what did this user do?”. Bedrock (Claude) does
        the creative part. Resend sends the email. Payment failures can come
        from our demo (simulate) or from the{" "}
        <strong>Pine Labs payment gateway</strong> via the webhook - same flow
        either way: we get a failure, fetch behavior, generate coupon, send
        email.
      </p>

      <h2 style={{ marginTop: 32, marginBottom: 12 }}>Negotiation feature</h2>
      <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
        If a user already received a coupon but isn’t satisfied (e.g. “I need a
        bigger discount” or “I only wanted free shipping”), they can{" "}
        <strong>negotiate</strong>. On the <strong>Negotiate</strong> page they
        enter their reason; we send it plus the existing coupon to{" "}
        <strong>AWS Bedrock</strong>. The model returns an improved coupon
        suggestion (discount type, value, message) and a short reply to show the
        user. Nothing is auto-applied or emailed yet—it’s a “what if we offered
        this?” flow so support or the system can follow up.
      </p>
      <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
        <strong>API:</strong>{" "}
        <code
          style={{ background: "#eee", padding: "2px 6px", borderRadius: 4 }}
        >
          POST /sessions/:sessionId/negotiate-coupon
        </code>{" "}
        with body{" "}
        <code
          style={{ background: "#eee", padding: "2px 6px", borderRadius: 4 }}
        >
          {'{ "reason": "user\'s reason" }'}
        </code>
        . Response includes the suggested coupon (e.g.{" "}
        <code
          style={{ background: "#eee", padding: "2px 6px", borderRadius: 4 }}
        >
          discountType
        </code>
        ,{" "}
        <code
          style={{ background: "#eee", padding: "2px 6px", borderRadius: 4 }}
        >
          discountValue
        </code>
        ,{" "}
        <code
          style={{ background: "#eee", padding: "2px 6px", borderRadius: 4 }}
        >
          personalizedMessage
        </code>
        ) and a{" "}
        <code
          style={{ background: "#eee", padding: "2px 6px", borderRadius: 4 }}
        >
          reply
        </code>{" "}
        string for the user. Same Bedrock (Claude) stack as initial coupon
        generation; the prompt is tuned for “given this coupon and this reason,
        suggest something better.”
      </p>

      <h2 style={{ marginTop: 32, marginBottom: 12 }}>Tech stack</h2>
      <ul style={{ paddingLeft: 24, lineHeight: 1.6, marginBottom: 24 }}>
        <li style={{ marginBottom: 6 }}>
          <strong>Backend:</strong> Express, Prisma, PostgreSQL (e.g. Neon)
        </li>
        <li style={{ marginBottom: 6 }}>
          <strong>Frontend:</strong> React 18, Vite 6, React Router 7, PostHog
        </li>
        <li style={{ marginBottom: 6 }}>
          <strong>External:</strong> AWS Bedrock (Claude), Resend (email),
          PostHog (analytics + Query API), Pine Labs (payment gateway webhook)
        </li>
        <li style={{ marginBottom: 6 }}>
          <strong>Shared:</strong>{" "}
          <code
            style={{ background: "#eee", padding: "2px 6px", borderRadius: 4 }}
          >
            @repo/shared
          </code>{" "}
          for types and constants
        </li>
      </ul>

      <h2 style={{ marginTop: 32, marginBottom: 12 }}>Future integration</h2>
      <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
        Where we'd take this next (world domination, one coupon at a time):
      </p>
      <ul style={{ paddingLeft: 24, lineHeight: 1.6 }}>
        <li style={{ marginBottom: 8 }}>
          <strong>Pine Labs gateway in production:</strong> The webhook is
          implemented and ready to receive failure events from the Pine Labs
          payment gateway. Next steps: point the gateway at our production URL,
          add optional signature verification, and retries so we don't miss a
          beat.
        </li>
        <li style={{ marginBottom: 8 }}>
          <strong>Richer events:</strong> More event types (scroll depth, time
          on product, etc.) so the AI has more to work with and coupons get even
          more personal.
        </li>
        <li style={{ marginBottom: 8 }}>
          <strong>A/B testing:</strong> Use PostHog to test different coupon
          copy or discount levels and see what actually converts.
        </li>
        <li style={{ marginBottom: 8 }}>
          <strong>Multi-tenant / multi-brand:</strong> Session or config to
          switch Bedrock prompts, email templates, or PostHog project so one
          codebase can serve multiple brands.
        </li>
      </ul>
      <p style={{ marginTop: 24, color: "#555", fontStyle: "italic" }}>
        Thanks for reading. Now go simulate a payment failure and get yourself a
        coupon.
      </p>
    </div>
  );
}
