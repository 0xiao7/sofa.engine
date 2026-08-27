# SoFa SRS Web Push Design

**Date:** 2026-08-27  
**Status:** Approved for implementation by the user's `好go` instruction  
**Scope:** Add standards-based Web Push to the existing SoFa SM-2 review flow. Do not replace or alter LINE delivery, payment, law content, or SM-2 scheduling.

## Outcome

An authenticated learner can enable browser/iPhone reminders from the existing `#srs-settings` panel. At 20:00 Asia/Taipei, each active subscribed device with due review items receives at most one calm, aggregated notification. Tapping it opens `https://sofaengine.org/dashboard.html#review-due`.

## Current foundation

- `sofa.engine` is already an installable standalone PWA with a web manifest and iOS metadata.
- `sofa-engine-api` already stores SM-2 state in `user_stats.next_review_date` and exposes `/api/me/review-due`.
- `user_settings` already controls freeze mode, daily limit, exam target, LINE push law, and ordering.
- LINE push remains a separate channel. Its existing `push_enabled` field keeps its current meaning.

## Considered approaches

1. **API-owned Web Push using the existing Supabase and Render runtime — selected.** The API owns authenticated subscriptions, reuses the same due-review source, sends with VAPID, and runs a restart-safe 15-minute dispatcher that only becomes eligible after 20:00. This adds the fewest operational systems and keeps review truth in one place.
2. **Supabase Edge Function plus database cron.** This offers a separate scheduler but introduces a second runtime, duplicated authentication logic, and a new deployment surface for a small audience. It is unnecessary for the first production version.
3. **Send Web Push from `fay-spectrum-bot`.** This would reuse notification scheduling but would mix website device credentials into the LINE/payment-completion service. It violates the current repository ownership boundary.

## User experience

The existing `#srs-settings` card gains a separate `裝置複習提醒` control. LINE wording and behavior remain unchanged.

- Unsupported browser: show `此瀏覽器不支援裝置提醒`.
- iPhone/iPad browser tab without standalone installation: show `先將 SoFa 加入主畫面，再從主畫面開啟提醒`.
- Supported and unsubscribed: show an explicit `開啟裝置提醒` button. Permission is requested only from this click.
- Enabled: show `這台裝置已開啟` and a `關閉` action.
- Denied: show `通知已被系統封鎖，請到裝置設定調整` without repeatedly prompting.
- Signed-out users cannot subscribe because subscriptions must be attached to an authenticated SoFa member.

Notification copy follows SoFa product language:

- Title: `SoFa｜今日複習`
- Body: `3 條剛好到期。今天先看一條也可以。`
- One item: `1 條剛好到期。今天先看一條就好。`
- Click target: `/dashboard.html#review-due`
- Tag: `sofa-review-YYYY-MM-DD` so the operating system replaces duplicates.

## Components and data flow

1. `dashboard.html` registers `/sw.js`, fetches the public VAPID key, and subscribes through `PushManager` after a direct user click.
2. The authenticated frontend sends `subscription.toJSON()` to `POST /api/me/web-push-subscriptions`.
3. The API validates HTTPS endpoint length and the `p256dh`/`auth` keys, then upserts the endpoint for the authenticated `user_line_id`.
4. A Render `BackgroundScheduler` job wakes every 15 minutes. Before 20:00 it exits without database work beyond configuration checks. After 20:00 it loads active subscriptions that do not have a successful or terminal delivery row for today.
5. For each eligible member, the dispatcher reuses `user_stats.next_review_date`, `user_settings.freeze_mode`, and `daily_review_limit`. No due items means no push and no synthetic delivery success.
6. `pywebpush` sends a small JSON payload. HTTP 404/410 disables the stale subscription. Other failures increment a bounded failure count and remain retryable during the same day.
7. A durable unique key on `(subscription_id, delivery_date)` prevents successful redelivery after scheduler duplication or process restart.
8. `/sw.js` displays the notification and focuses an existing SoFa window or opens the exact review deep link.

## Database design

`public.web_push_subscriptions` stores one row per push endpoint:

- UUID primary key.
- `user_line_id text not null` indexed for membership lookup.
- `endpoint text not null unique`, `p256dh text not null`, `auth text not null`.
- `enabled boolean not null default true`.
- `user_agent`, timestamps, last success, and bounded failure count.

`public.web_push_deliveries` stores delivery state:

- UUID primary key and foreign key to the subscription with cascade delete.
- `user_line_id`, Taipei `delivery_date`, due count, status, attempts, timestamps, and sanitized error code.
- Unique `(subscription_id, delivery_date)`.
- Check constraints limit status values and prevent negative counters.

Both public-schema tables enable RLS and revoke `anon` and `authenticated` privileges. There are no client policies: only the server-side service role accesses them through authenticated API endpoints. No VAPID private key or Supabase service key reaches the browser.

## API contract

- `GET /api/web-push/public-key`: returns the public VAPID key or `503` when Web Push is not configured.
- `GET /api/me/web-push-subscriptions/status`: authenticated; returns whether the current member has an enabled subscription and the configured delivery hour.
- `POST /api/me/web-push-subscriptions`: authenticated; validates and upserts the current device subscription.
- `DELETE /api/me/web-push-subscriptions`: authenticated; disables only the supplied endpoint owned by the current member.

The dispatcher is an internal function invoked by the existing process scheduler. It is not exposed as a public send endpoint.

## Configuration

Render receives three secrets/settings:

- `WEB_PUSH_VAPID_PRIVATE_KEY`
- `WEB_PUSH_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_SUBJECT=mailto:privacy@sofaengine.org`

The private key is generated once, stored only in Render, and never committed. `pywebpush==2.4.0` is pinned.

## Error handling and privacy

- Subscription payloads are size-limited and reject non-HTTPS endpoints.
- Endpoint values and encryption keys are never logged.
- Push payloads contain only a due count and deep link, not law names, answers, account names, or payment information.
- 404/410 provider responses disable subscriptions. Other provider failures store only a coarse code.
- Missing VAPID configuration makes status explicit and the dispatcher a safe no-op.
- Notification permission denial is handled locally and never retried without another user action.

## Acceptance criteria

- Existing LINE and SRS tests remain green.
- Frontend contract tests prove direct-click permission, standalone iOS guidance, authenticated subscribe/unsubscribe, and no automatic permission request.
- Service Worker tests prove push display, duplicate tag, exact deep link, focus/open behavior, and safe payload fallback.
- API tests prove authentication, input validation, ownership, RLS migration, due aggregation, one-success-per-device/day, no-due no-send, VAPID missing no-op, and 404/410 cleanup.
- A local fake-sender integration test completes subscription -> dispatch -> delivery ledger without contacting a real push provider.
- Production readback proves manifest 200, `/sw.js` 200 JavaScript, public key configured, status endpoint protected, and deployed code health. Actual lock-screen delivery remains `未確認` until a user taps enable on a physical iPhone Home Screen installation.
