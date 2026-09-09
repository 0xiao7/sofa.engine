# Threads Podcast Priority and Full Show Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Podcast show notes contain the full episode transcript and make the active daily automation add one Podcast-first Threads promotion while YouTube promotion is temporarily paused for lack of fresh public inventory.

**Architecture:** The product repository renders full source-locked show notes from the same transcript body used by the episode page. The SoFa control repository enforces the temporary channel policy through the heartbeat verifier and the active automation prompt; historical distribution records remain immutable.

**Tech Stack:** Node.js ESM, RSS 2.0 with `content:encoded` and `podcast:transcript`, Python unittest, Codex heartbeat automation.

---

### Task 1: Lock complete Podcast show notes with a failing test

**Files:**
- Modify: `tests/podcast-daily-queue.test.mjs`
- Modify: `tests/podcast-transcript-handoff.test.mjs`

- [x] Add a renderer fixture transcript containing multiple paragraphs and XML-sensitive text.
- [x] Assert `<content:encoded>` contains every transcript paragraph under `本集完整逐字稿`.
- [x] Assert the item contains the exact official transcript/player URL and exact practice URL.
- [x] Run `node --test tests/podcast-daily-queue.test.mjs tests/podcast-transcript-handoff.test.mjs` and confirm the new assertion fails because the renderer currently emits only an excerpt.

### Task 2: Render complete transcript and two links

**Files:**
- Modify: `scripts/render-podcast-release.mjs`
- Modify: `scripts/promote-podcast-azure-release.mjs`

- [x] Add a small escaped paragraph renderer that preserves non-empty transcript paragraphs.
- [x] Replace `本集文字節錄` inside `<content:encoded>` with the complete transcript.
- [x] Keep the concise `<description>`, then emit the official transcript/player link and exact practice link separately.
- [x] Run the two focused tests and the complete Podcast suite.

### Task 3: Enforce the temporary Threads routing policy

**Files:**
- Modify: `/Users/0xiao7/Library/Mobile Documents/com~apple~CloudDocs/#80_Assets/SoFa.Engine/tests/test_verify_sofa_heartbeat.py`
- Modify: `/Users/0xiao7/Library/Mobile Documents/com~apple~CloudDocs/#80_Assets/SoFa.Engine/tools/verify_sofa_heartbeat.py`
- Update: active automation `sofa`

- [x] Add failing tests for the required tokens `每天額外一篇 Podcast Threads 推廣文`, `官網該集全文／播放器`, `該條法規練習入口`, `暫停 Threads 導向 YouTube`, and the explicit resume condition.
- [x] Add those tokens to the verifier contract and run the focused test green.
- [x] Update the existing heartbeat prompt without changing its schedule, status, target thread, or notification policy.
- [ ] Run all three SoFa control verifiers.

### Task 4: Verify and record without claiming publication

**Files:**
- Modify: `/Users/0xiao7/Library/Mobile Documents/com~apple~CloudDocs/#80_Assets/SoFa.Engine/task_plan.md`
- Modify: `/Users/0xiao7/Library/Mobile Documents/com~apple~CloudDocs/#80_Assets/SoFa.Engine/progress.md`
- Modify: `/Users/0xiao7/Library/Mobile Documents/com~apple~CloudDocs/#80_Assets/SoFa.Engine/findings.md`

- [x] Run focused and full regression suites plus `git diff --check`.
- [ ] Record the routing/show-note contract as complete, while keeping actual future Threads posts and Podcast publication pending their own provider/public evidence.
- [ ] Update TASK_DB progress and write CHANGELOG_DB with `是否公告=false` only after local verifiers pass.
