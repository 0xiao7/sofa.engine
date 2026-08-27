# SoFa SRS Web Push Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver one restart-safe daily Web Push per subscribed device when that member has SM-2 review items due.

**Architecture:** The static PWA registers a Service Worker and creates an authenticated PushSubscription after an explicit settings-button click. The FastAPI service stores subscriptions in locked-down Supabase tables, reuses existing `user_stats.next_review_date`, and dispatches at/after 20:00 Taipei with a durable per-device/day delivery key.

**Tech Stack:** Static HTML/JavaScript, Service Worker Push/Notifications APIs, FastAPI, Supabase/Postgres, APScheduler, `pywebpush==2.4.0`, Node test runner, Python unittest.

---

## File map

### `sofa.engine`

- Create `web-push.js`: browser capability, standalone detection, permission, subscribe/unsubscribe, and settings UI controller.
- Create `sw.js`: background push display and notification-click deep-link handling.
- Modify `dashboard.html`: load the controller and add the separate device-reminder settings surface.
- Modify `manifest.json`: add stable PWA `id`.
- Create `tests/dashboard-web-push-contract.test.mjs`: UI and direct-user-action contract.
- Create `tests/service-worker-web-push.test.mjs`: Service Worker payload and click behavior contract.

### `sofa-engine-api`

- Create `supabase/migrations/<generated>_create_web_push_tables.sql`: subscriptions, delivery ledger, indexes, constraints, RLS, and grants.
- Create `web_push.py`: subscription validation, notification payload, VAPID configuration, provider send wrapper, and safe error classification.
- Modify `api.py`: authenticated routes, Supabase persistence, due aggregation, durable dispatcher, and scheduler registration.
- Modify `requirements.txt`: pin `pywebpush==2.4.0`.
- Create `test_web_push.py`: pure validation/payload/sender tests.
- Create `test_web_push_api_contract.py`: route, auth, scheduler, ownership, dedup, and migration contracts.

### Task 1: Lock the database and API behavior with failing tests

- [ ] Create the migration name with `supabase migration new create_web_push_tables` in the API worktree.
- [ ] Add `test_web_push.py` tests that import missing `validate_subscription`, `notification_payload`, and `provider_status_code` functions.
- [ ] Add `test_web_push_api_contract.py` assertions for the four API routes/helpers, authenticated ownership, scheduler interval, delivery uniqueness, RLS, and revoked client grants.
- [ ] Run `python3 -m unittest test_web_push.py test_web_push_api_contract.py -v` and confirm RED failures are caused by missing Web Push implementation.

Expected validation examples:

```python
subscription = validate_subscription({
    "endpoint": "https://push.example.test/sub/1",
    "keys": {"p256dh": "p" * 43, "auth": "a" * 22},
})
self.assertEqual(subscription["endpoint"], "https://push.example.test/sub/1")
self.assertEqual(notification_payload(3, "2026-08-27")["url"], "/dashboard.html#review-due")
```

### Task 2: Implement the migration and pure Web Push module

- [ ] Write the generated migration with two tables, `endpoint` uniqueness, `(subscription_id, delivery_date)` uniqueness, user/date indexes, status checks, RLS enabled, and `revoke all ... from anon, authenticated`.
- [ ] Implement `web_push.py` with strict HTTPS/size/key validation and no secret logging.
- [ ] Build the exact calm payload and wrap `pywebpush.webpush` with `ttl=21600` and VAPID subject/private key.
- [ ] Pin `pywebpush==2.4.0`.
- [ ] Run `python3 -m unittest test_web_push.py -v` until GREEN, then run `python3 -m py_compile web_push.py`.
- [ ] Commit API pure module and migration.

### Task 3: Implement authenticated API persistence

- [ ] Add `GET /api/web-push/public-key`; return `503` if public/private configuration is incomplete.
- [ ] Add authenticated status, subscribe, and delete routes. Every mutation derives `user_line_id` from `_require_auth(request)` and filters by both owner and endpoint.
- [ ] Upsert the endpoint with enabled state, reset failure count on a fresh subscription, and never return encryption keys.
- [ ] Run focused API contract tests until GREEN.
- [ ] Commit authenticated subscription endpoints.

Required route shape:

```python
@app.post("/api/me/web-push-subscriptions")
async def me_web_push_subscribe(request: Request):
    uid = _require_auth(request)
    subscription = validate_subscription(await request.json())
    # server-side service-role upsert bound to uid
```

### Task 4: Implement restart-safe due dispatch

- [ ] Add a pure due-count loader that uses `user_stats.next_review_date <= today`, applies `freeze_mode`, and caps at `daily_review_limit` without changing existing SRS rows.
- [ ] Add `_dispatch_due_web_push(now=None, sender=send_web_push)` that exits before 20:00, skips completed/terminal deliveries, creates/updates the ledger, sends only when due count is positive, and disables 404/410 subscriptions.
- [ ] Register the dispatcher every 15 minutes in the existing Taipei APScheduler with a single job id and coalescing.
- [ ] Add a fake sender integration test proving subscribe-row input -> due aggregation -> one successful delivery row -> same-day repeat skip.
- [ ] Run the focused tests RED then GREEN and commit dispatcher changes.

### Task 5: Lock frontend behavior with failing tests

- [ ] Add Node contracts that require a separate `裝置複習提醒` control, an explicit enable button, signed-in API headers, standalone iOS guidance, and no load-time `Notification.requestPermission()` call.
- [ ] Add Service Worker contracts for `push`, `notificationclick`, `showNotification`, stable daily tag, `clients.matchAll`, and `clients.openWindow`.
- [ ] Run `node --test tests/dashboard-web-push-contract.test.mjs tests/service-worker-web-push.test.mjs` and confirm RED for missing files/UI.

### Task 6: Implement frontend subscription and Service Worker

- [ ] Add stable manifest `id: "/"`.
- [ ] Implement `web-push.js` with capability detection, iOS standalone detection, explicit-click permission, VAPID base64 conversion, authenticated subscribe/delete, and status rendering.
- [ ] Add the Twilight Study settings UI to `dashboard.html` without changing the existing LINE toggle semantics.
- [ ] Implement `/sw.js` with safe JSON fallback, exact review deep link, stable tag, focus-existing-window behavior, and `openWindow` fallback.
- [ ] Run focused Node tests until GREEN, then the complete `node --test tests/*.test.mjs` suite.
- [ ] Commit frontend and Service Worker changes.

### Task 7: Apply and verify Supabase migration

- [ ] Discover CLI commands with `supabase db --help` and resolve the linked production project without printing secrets.
- [ ] Apply the reviewed migration through the available production-safe path.
- [ ] Query `information_schema`, `pg_indexes`, `pg_policies`, and grants to verify both tables, unique indexes, RLS enabled, and no `anon`/`authenticated` privileges.
- [ ] Run Supabase database advisors or the closest available read-only advisor and record any Web Push-related finding.

### Task 8: Configure production VAPID safely

- [ ] Generate one P-256 VAPID keypair outside the repository.
- [ ] Add public/private key and `mailto:privacy@sofaengine.org` subject to the Render API service environment without displaying private material.
- [ ] Confirm the private key does not appear in git diff, logs, static assets, or API responses.

### Task 9: Full verification and integration

- [ ] Run API focused tests, complete Python unittest suite, `py_compile`, and `git diff --check`.
- [ ] Run frontend focused tests, complete Node suite, a local HTTP smoke test, and `git diff --check`.
- [ ] Review diffs against every design acceptance criterion.
- [ ] Push both feature branches, open PRs, confirm CI, merge to `main`, and wait for GitHub Pages/Render deployments.

### Task 10: Production readback and records

- [ ] Verify `https://sofaengine.org/sw.js` returns HTTP 200 JavaScript and the manifest has a stable id.
- [ ] Verify public-key endpoint is configured, subscription status is auth-protected, `/ping` is healthy, and no anonymous subscription mutation is possible.
- [ ] Verify the migration tables and delivery scheduler health without creating a fake member subscription or sending a production notification.
- [ ] Mark physical iPhone lock-screen delivery `未確認` until the user explicitly taps enable on an installed Home Screen PWA.
- [ ] Update SoFa TASK_DB and CHANGELOG_DB with the correct icons and `是否公告=false`, then append coordinator progress/findings.
