# Personalized Coupon Disbursement System – MVP

Monorepo: **shared** (types/constants), **api** (Express + Prisma + PostHog/Bedrock/Mail), **web** (React + Vite + PostHog).

## Prerequisites

- Node.js >= 20
- pnpm
- Neon PostgreSQL (or any Postgres)
- (Optional) AWS Bedrock, Resend, PostHog for full flow

## Setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` in the repo root (or in `apps/api` for the API). Set at least:

   - `DATABASE_URL` – Neon (or Postgres) connection string (pooled recommended).

   Optional for full MVP:

   - `AWS_REGION`, `BEDROCK_MODEL_ID` – Bedrock coupon generation
   - `RESEND_API_KEY`, `FROM_EMAIL` – coupon email
   - `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`, `POSTHOG_HOST` – behavior fetch for coupons
   - For the web app: `VITE_PUBLIC_POSTHOG_KEY`, `VITE_PUBLIC_POSTHOG_HOST` (and `VITE_API_URL` if not using proxy)

3. **Database**

   From repo root:

   ```bash
   cd apps/api && pnpm db:push
   ```

   Or use migrations:

   ```bash
   cd apps/api && pnpm db:migrate
   ```

   Generate Prisma client if needed:

   ```bash
   cd apps/api && pnpm db:generate
   ```

4. **Build**

   ```bash
   pnpm build
   ```

## Run

- **API** (from repo root): `pnpm dev:api` — serves on `http://localhost:3000`
- **Web** (from repo root): `pnpm dev:web` — Vite dev server (proxies `/api` to the API)
- **Both**: `pnpm dev`

## Flow

1. **Web**: On load, the app creates a session via `POST /sessions` and gets a UUID v7 `session_id`. PostHog is initialised with `bootstrap: { sessionID: sessionIdFromBackend }` so all events share that session.
2. **Demo**: User goes through product list → product detail → add to cart → checkout. Custom events: `product_viewed`, `add_to_cart`, `checkout_started`. “Simulate payment failure” calls `POST /sessions/:id/simulate-payment-failure` to trigger coupon generation.
3. **API**: On payment failure (webhook or simulate), the API writes to `payment_failures`, fetches behavior from PostHog (Query API, HogQL by `$session_id`), calls Bedrock for `coupon_description` and `personalized_message`, persists the coupon and sends email (Resend), then marks the payment failure as processed.
4. **Session details**: “My session” calls `GET /sessions/:id` and shows metadata, whether a coupon was sent, and an optional behavior summary from PostHog.
5. **Negotiation**: If the user already has a coupon but isn’t satisfied, they can go to “Negotiate”, enter a reason (e.g. “I need a bigger discount”), and submit. The app calls `POST /sessions/:sessionId/negotiate-coupon` with `{ "reason": "..." }`. The API sends the existing coupon and reason to Bedrock; the model returns an improved coupon suggestion (discount type, value, message) and a short reply. The UI shows the suggested offer and reply (nothing is auto-applied or emailed).

## Project layout

- `packages/shared` – Types and constants used by api and web
- `apps/api` – Express, Prisma (Neon), routes: sessions (including negotiate-coupon), webhooks/pinelabs; services: PostHog API, Bedrock, mail, coupon generation, negotiate-coupon
- `apps/web` – React, Vite, session-first PostHog, demo flow and session details pages

## Pinelabs webhook

`POST /webhooks/pinelabs` accepts payment-failure payloads (e.g. `status: failed` or `error_code` / `error_message`). If `session_id` is present, a coupon is generated and email sent; the payment failure row is marked processed.
