## Goal

R2R stops paying for X access. Each writer supplies their own X API bearer token; their agents and Studio use it. Writers who don't want to deal with X's developer portal can pay for R2R to set it up for them.

Note on availability: Lovable has no per-user X connector, so per-writer access means storing each writer's own X API bearer token (created free in X's developer portal, free tier allows recent-post search at low volume). The current workspace-level `X_API_KEY` gateway path stays as an optional house fallback only if you later connect one; nothing breaks if it's absent.

## 1. Store a writer's X token securely

New table `writer_x_credentials`:
- `creator_id` (unique), `token_ciphertext`, `token_last4`, `status` (`active` / `invalid`), `verified_at`, `created_at`, `updated_at`
- Service-role only grants; RLS on with no anon/authenticated access — the browser never reads it back

Encryption at rest with AES-256-GCM using a server-side secret (generated, never revealed). Only server functions decrypt it.

## 2. Writer connects X

In `/agents` → X trends panel:
- "Connect your X account" card with a token field, short inline how-to (create app in X developer portal → copy Bearer Token), and a **Verify & save** button
- Verify calls X once (`/2/users/me`-style lightweight read); saves only if the call succeeds, so bad tokens are rejected up front
- Once saved, shows `••••1234`, status, last verified, and Disconnect
- Never returns the token to the browser

## 3. Route all X calls through the writer's token

`src/lib/x-trends.server.ts` gains a caller-supplied token instead of reading `process.env.X_API_KEY` directly:
- Calls X's API directly with `Authorization: Bearer <writer token>` (no gateway needed for BYO tokens)
- Optional fallback to the workspace connector key only if the house connection exists
- 401/403 from X marks the writer's credential `invalid` and surfaces "Reconnect your X account"
- 429 keeps the existing back-off + `Retry-After` message

Callers updated: `runAgent` (X trends branch), `publishStoryFromTrend`, the Studio "Trending on X" tab, and the home-page X row (home row uses the site-wide/house source or the token of writers who opted into `show_on_home`).

## 4. Clear setup prompt when not configured

- Agent run: logs a `skipped` run with "X not connected — add your X token in Agents → X trends" instead of an error
- Studio X tab and home row: show a setup card linking straight to the connect form, not a generic error

## 5. Paid concierge setup

New table `x_setup_requests`: `user_id`, `contact_email`, `x_handle`, `notes`, `status` (`pending` / `paid` / `in_progress` / `done` / `rejected`), `price_coins`, timestamps. RLS: writer sees own rows, admin/manager sees all.

- Writer flow: "Don't want to do this yourself? Have R2R set it up" → simple form (email, X handle, notes) → charges the configured coin price from the existing App Coins wallet (transaction recorded via the existing coin ledger) → request goes to admin queue
- Admin flow: new tab in the admin dashboard listing requests; admin can paste the token on the writer's behalf (stored encrypted against that writer) and mark done, or reject with an automatic coin refund
- Concierge price is an admin setting alongside the existing site settings

## Technical notes

- Migrations create both tables with explicit GRANTs (service_role only for credentials), RLS enabled, and `updated_at` triggers.
- Token crypto lives in a `.server.ts` helper; `.functions.ts` files import it inside handlers only.
- Verification and every trend fetch are server-side; the token never appears in a response, log, or client bundle.
- No change to story generation, trend dedupe (`agent_trend_sources`), or the AI-assisted badge.
