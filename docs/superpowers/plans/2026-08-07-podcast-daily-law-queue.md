# Podcast Daily Law Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 30-episode source-locked law queue and a GitHub-hosted daily release workflow that continues while the Mac is off.

**Architecture:** A static JSON queue contains pre-produced, human-approved episode assets and immutable source metadata. A deterministic Node release script selects exactly one due episode, validates every asset, updates the release manifest/feed/page through existing render helpers, and commits only after all podcast contracts pass.

**Tech Stack:** Node.js 20, GitHub Actions, JSON, RSS XML, native `node:test`.

---

### Task 1: Queue contract

**Files:**
- Create: `tests/podcast-daily-queue.test.mjs`
- Create: `scripts/podcast-queue-lib.mjs`
- Create: `data/podcast-law-queue.json`

- [x] **Step 1: Write failing tests** for exactly 30 unique episodes, sequential EP007–EP036 ids, unique GUID/campaign/source angle, allowed exam labels, official law URL, SoFa source API, CTA limit, and fail-closed status.
- [x] **Step 2: Run** `node --test tests/podcast-daily-queue.test.mjs` and confirm it fails because the queue/library do not exist.
- [x] **Step 3: Implement** schema validation and a 30-row queue whose rows initially remain `content_verified_audio_pending` unless complete approved assets exist.
- [x] **Step 4: Re-run** the focused test and confirm all assertions pass.
- [x] **Step 5: Commit** queue contract and data.

### Task 2: Deterministic release selection

**Files:**
- Modify: `tests/podcast-daily-queue.test.mjs`
- Modify: `scripts/podcast-queue-lib.mjs`
- Create: `scripts/release-due-podcast.mjs`

- [x] **Step 1: Add failing tests** proving only one approved due episode is selected in Asia/Taipei; missing assets, blocked head row, duplicates, and future dates stop publication.
- [x] **Step 2: Run** the focused test and confirm expected selection failures.
- [x] **Step 3: Implement** `selectDueEpisode`, asset checks, dry-run output, and atomic queue state updates.
- [x] **Step 4: Re-run** focused tests and existing Podcast contract tests.
- [x] **Step 5: Commit** deterministic release selection.

### Task 3: Release rendering

**Files:**
- Modify: `tests/podcast-daily-queue.test.mjs`
- Modify: `scripts/release-due-podcast.mjs`
- Create: `scripts/render-podcast-release.mjs`

- [x] **Step 1: Add failing fixture tests** for appending one episode to `podcast-release.json`, RSS, and the website without changing released GUIDs or legacy assets.
- [x] **Step 2: Run** focused tests and confirm renderer absence causes failure.
- [x] **Step 3: Implement** deterministic JSON/RSS/page rendering with temp files and rename-on-success.
- [x] **Step 4: Run** queue tests, `podcast-contract.test.mjs`, `podcast-release-safety.test.mjs`, and `scripts/check-podcast-release.mjs`.
- [x] **Step 5: Commit** release renderer.

### Task 4: Cloud schedule and safety gates

**Files:**
- Create: `.github/workflows/podcast-daily-release.yml`
- Create: `tests/podcast-daily-workflow.test.mjs`
- Modify: `docs/2026-08-07-podcast-daily-law-release.md`

- [x] **Step 1: Write failing workflow test** for UTC 13:00 schedule, `workflow_dispatch` dry-run, concurrency lock, minimal write permission, no secret echo, focused tests, release checker, commit guard, and no local runner.
- [x] **Step 2: Run** the workflow test and confirm it fails because the workflow is absent.
- [x] **Step 3: Implement** GitHub-hosted scheduled workflow and operational evidence document.
- [x] **Step 4: Run** all Podcast tests, queue dry-run, JSON parse, XML parse, `git diff --check`, and source-link HTTP checks.
- [x] **Step 5: Commit**, push the branch, create a PR, and observe checks. Do not merge or claim public automation until checks and release authorization are verified.
