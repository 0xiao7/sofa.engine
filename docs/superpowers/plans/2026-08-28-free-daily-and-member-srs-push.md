# Free Daily and Member SRS Push Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship and verify separate free daily-practice and member SRS Web Push flows, including an immediate test notification that is visibly accepted on Fay's iPhone.

**Architecture:** Keep the existing member SRS tables and scheduler as the personalized source of truth. Add isolated anonymous subscription and delivery tables protected by a hashed installation token, plus separate free and member test-send routes. The dashboard helper selects the correct mode, while the Service Worker accepts only two same-origin deep links.

**Tech Stack:** Static HTML/JavaScript PWA, Service Worker Web Push, FastAPI, Supabase Postgres, APScheduler, Node test runner, Python unittest, Render, GitHub Pages.

---

## File map

- API `web_push.py`: validation, token hashing, and free/member payload builders.
- API `api.py`: eligibility, free subscription lifecycle, test sends, and free daily dispatcher.
- API `supabase/migrations/20260828153000_create_free_web_push_tables.sql`: anonymous server-only tables and daily uniqueness.
- API `test_web_push.py`, `test_web_push_api_contract.py`, `test_web_push_dispatch.py`, `test_free_web_push_dispatch.py`: validation, route/schema, member and free scheduling behavior.
- Web `web-push.js`: mode selection, install guidance, permission, subscribe, test and unsubscribe behavior.
- Web `dashboard.html`: mode-neutral notification controls and explanatory copy.
- Web `sw.js`: allowlisted free/member notification click routing.
- Web `tests/dashboard-web-push-contract.test.mjs`, `tests/service-worker-web-push.test.mjs`: browser-state and deep-link contracts.

### Task 1: Persist the approved design and baseline

- [x] Write and self-review `docs/superpowers/specs/2026-08-28-free-daily-and-member-srs-push-design.md`.
- [x] Run `node --test tests/*.test.mjs`; expected baseline: 708 pass, 0 fail.
- [x] Run API `.venv/bin/python -m unittest discover -p 'test*.py'`; expected baseline: 349 tests, OK.
- [x] Commit the design document.

### Task 2: Add free-push validation and schema with TDD

- [ ] Add failing tests proving installation tokens must be 32–256 URL-safe characters, are stored only as SHA-256 hashes, and free payloads contain no due count or learning state.
- [ ] Run `.venv/bin/python -m unittest test_web_push.py -v`; expect new assertions to fail because helpers are absent.
- [ ] Implement `validate_installation_token()`, `installation_token_hash()`, `free_daily_payload()` and `test_notification_payload()` in `web_push.py`.
- [ ] Add a failing migration contract requiring `free_web_push_subscriptions`, `free_web_push_deliveries`, RLS/revokes, endpoint uniqueness, hashed-token uniqueness and `(subscription_id, delivery_date)` uniqueness.
- [ ] Create `supabase/migrations/20260828153000_create_free_web_push_tables.sql` with `reminder_hour=20`, provider failure fields, server-only grants, `due_count` omitted, and cascade deletion.
- [ ] Re-run focused Python tests and commit API schema/boundary changes.

### Task 3: Gate member SRS subscriptions and add immediate member test

- [ ] Add failing tests for allowed plans `體驗/月費/季費/到考日/買斷/Admin`, rejected `免費/free`, endpoint ownership, provider acceptance, provider failure, and no secret logging.
- [ ] Run focused tests and confirm failures are caused by missing eligibility/test behavior.
- [ ] Add `_require_web_push_member(request)` and use it for member status, subscribe and test routes; retain authenticated owner-scoped unsubscribe so a downgraded member can remove an endpoint.
- [ ] Add `POST /api/me/web-push-subscriptions/test`, rate limit it, require an endpoint owned by the current uid, compute current due count, send one visible test payload, update last-success/failure state and never create a daily delivery row.
- [ ] Run focused tests, then the full API suite, and commit.

### Task 4: Add anonymous subscription, test and daily scheduler

- [ ] Add failing route tests for anonymous subscribe/status/delete/test using endpoint plus installation token, and 404 on mismatched ownership.
- [ ] Add failing dispatcher tests for before 20:00, send once after 20:00, same-day skip, generic free payload, 404/410 disable, retryable provider error, and no reads from `user_stats` or `user_settings`.
- [ ] Implement `POST/GET/DELETE /api/free/web-push-subscriptions` and `POST /api/free/web-push-subscriptions/test` with strict validation, rate limits and hashed installation ownership.
- [ ] Implement `_dispatch_free_daily_web_push()` and schedule it every 15 minutes with one instance, coalescing and a 15-minute grace window.
- [ ] Run focused and full API tests, apply the migration to the linked Supabase project, verify table constraints/RLS, and commit.

### Task 5: Implement the complete browser flow with TDD

- [ ] Expand `tests/dashboard-web-push-contract.test.mjs` with failing cases for anonymous free mode, authenticated member mode, iOS install-required, permission default/granted/denied, enable, immediate test, retry test and unsubscribe.
- [ ] Expand `tests/service-worker-web-push.test.mjs` with failing cases allowing only `/dashboard.html#review-due` and `/quiz.html?free=1`, while rejecting cross-origin and other same-origin targets.
- [ ] Run both Node files and confirm RED for the new mode/test/deep-link requirements.
- [ ] Refactor `web-push.js` into testable mode/state helpers; generate a 32-byte Web Crypto installation token once, keep it local, and never place auth or tokens in URLs.
- [ ] Update `dashboard.html` labels and controls so free mode says `每天提醒我刷題`, member mode says `依複習曲線提醒`, and enabled mode exposes `傳送測試通知` plus `關閉這台裝置`.
- [ ] Update `sw.js` with an explicit two-route allowlist and different notification tags.
- [ ] Run focused Node tests, full 708+ suite, `git diff --check`, and commit.

### Task 6: Cross-browser and production flow verification

- [ ] Run browser automation for desktop supported/blocked, iPhone non-standalone install guidance, standalone default permission, free/member labels, test button, unsubscribe and deep-link UI states without inspecting browser storage.
- [ ] Push both branches, create PRs, wait for CI, merge, and verify exact merge SHAs.
- [ ] Verify Render deploy is Live at the API merge SHA and GitHub Pages deploy completed at the web merge SHA.
- [ ] Probe `/ping`, public key, manifest, Service Worker, anonymous/member guards, Fay eligibility/status and all static assets without printing tokens or endpoints.
- [ ] Re-run full Python and Node suites fresh after merge.

### Task 7: Physical iPhone acceptance

- [ ] On iPhone Safari, open `https://sofaengine.org`, use Share → Add to Home Screen, and launch the installed SoFa icon.
- [ ] Log in with `SOFA-FAYY-TEST`, open device reminders, tap enable, and accept the iOS notification prompt.
- [ ] Confirm the API reports an active Fay subscription without exposing the endpoint.
- [ ] Confirm the immediate `SoFa｜提醒已開啟` notification is visible on the iPhone Lock Screen or Notification Center.
- [ ] Tap the notification and confirm it opens `dashboard.html#review-due` in the installed app.
- [ ] Record provider acceptance separately from visible-device acceptance; do not mark complete if only the provider accepted.

### Task 8: Documentation, copy and durable records

- [ ] Only after Task 7 passes, write one final SoFa introduction package covering iOS installation, explicit permission, free/member differences, 20:00 schedule, daily cap, no-due behavior, disabling and permission recovery.
- [ ] Save the final content to CONTENT_DB as `草稿`; do not mark published.
- [ ] Update the existing TASK_DB item, add CHANGELOG_DB with `是否公告=false`, update control files and architecture memory, including PRs, SHAs, test counts and physical acceptance evidence.
- [ ] Run final requirement checklist and report only evidence-backed completion.
