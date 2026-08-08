# Podcast Three Law Episodes Daily Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Safely release up to three consecutive, independently approved source-locked law episodes per Taipei calendar day.

**Architecture:** Keep the existing queue as the sole ordering authority. Replace the single-head selector with a bounded batch selector that begins at the first unreleased row, includes at most three rows whose scheduled date has arrived and whose release assets are fully approved, and stops at the first unavailable row. The release runner renders every selected row atomically in sequence; no row may be skipped, and a failure before commit leaves public files unchanged.

**Tech Stack:** Node.js 24, native `node:test`, JSON queue, GitHub Actions, existing Podcast renderer and contract checker.

---

### Task 1: Specify the bounded, contiguous batch contract

**Files:**
- Modify: `tests/podcast-daily-queue.test.mjs`
- Modify: `scripts/podcast-queue-lib.mjs`

- [ ] **Step 1: Write the failing tests**

```js
test('release selection returns at most three consecutive due approved episodes', () => {
  const candidate = structuredClone(queue);
  for (const row of candidate.episodes.slice(0, 4)) {
    row.status = 'approved_for_release';
    row.scheduledDate = '2026-08-09';
  }
  assert.deepEqual(
    selectDueEpisodes(candidate, '2026-08-09T13:00:00Z').map(row => row.id),
    ['EP007', 'EP008', 'EP009'],
  );
});

test('release selection stops before an unapproved second episode and never skips it', () => {
  const candidate = structuredClone(queue);
  candidate.episodes[0].status = 'approved_for_release';
  candidate.episodes[1].status = 'content_verified_audio_pending';
  candidate.episodes[2].status = 'approved_for_release';
  for (const row of candidate.episodes.slice(0, 3)) row.scheduledDate = '2026-08-09';
  assert.deepEqual(selectDueEpisodes(candidate, '2026-08-09T13:00:00Z').map(row => row.id), ['EP007']);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/podcast-daily-queue.test.mjs`

Expected: failure because `selectDueEpisodes` is not exported.

- [ ] **Step 3: Implement the minimal selector**

```js
export const DAILY_RELEASE_LIMIT = 3;

export function selectDueEpisodes(queue, isoInstant = new Date().toISOString()) {
  validateQueue(queue);
  const released = new Set(queue.episodes.filter(row => row.status === 'released').map(row => row.id));
  const candidates = queue.episodes.filter(row => !released.has(row.id));
  const due = [];
  for (const row of candidates) {
    if (due.length >= DAILY_RELEASE_LIMIT || row.scheduledDate > taipeiDate(isoInstant) || row.status !== READY) break;
    due.push(row);
  }
  return due;
}
```

Keep `selectDueEpisode` as a backwards-compatible wrapper returning the first selected row or `null`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/podcast-daily-queue.test.mjs`

Expected: all queue tests pass.

### Task 2: Render and mark a release batch without a partial public state

**Files:**
- Modify: `tests/podcast-daily-queue.test.mjs`
- Modify: `scripts/release-due-podcast.mjs`

- [ ] **Step 1: Write a failing release-preview test**

```js
test('release preview reports all selected episode IDs for a three-episode batch', () => {
  // Fully approved temporary assets for EP007–EP009 are prepared under a temp root.
  assert.deepEqual(result.episodeIds, ['EP007', 'EP008', 'EP009']);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/podcast-daily-queue.test.mjs`

Expected: failure because the preview only reports one `episodeId`.

- [ ] **Step 3: Implement the minimal batch release**

1. Validate every selected episode asset before rendering any episode.
2. Build content for every selected episode before writing queue state.
3. Render in queue order, then mark only the rendered rows `released` with the same release instant.
4. Emit `episodeIds`; keep singular `episodeId` only when a one-row result is needed by existing callers.
5. Preserve `action: none` when no first eligible row exists.

- [ ] **Step 4: Run focused contracts and verify GREEN**

Run: `node --test tests/podcast-daily-queue.test.mjs tests/podcast-release-safety.test.mjs tests/podcast-multi-episode-release.test.mjs`

Expected: all tests pass; no partially selected batch is rendered.

### Task 3: Make the cloud workflow and operational contract explicit

**Files:**
- Modify: `.github/workflows/podcast-daily-release.yml`
- Modify: `tests/podcast-daily-workflow.test.mjs`
- Modify: `docs/2026-08-07-podcast-daily-law-release.md`

- [ ] **Step 1: Write the failing workflow/documentation assertions**

```js
assert.match(workflow, /Release up to three consecutive due approved episodes/);
assert.match(workflow, /DAILY_RELEASE_LIMIT/);
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/podcast-daily-workflow.test.mjs`

Expected: failure because the workflow still states one release.

- [ ] **Step 3: Implement wording-only workflow contract changes**

Rename the release step to “Release up to three consecutive due approved episodes”; do not add secrets, external providers, retries, or a second concurrency lane. Update the operational doc to state the 3/day maximum and the contiguous-stop rule.

- [ ] **Step 4: Run all release contracts**

Run: `node --test tests/podcast-daily-queue.test.mjs tests/podcast-daily-workflow.test.mjs tests/podcast-contract.test.mjs tests/podcast-release-safety.test.mjs tests/podcast-multi-episode-release.test.mjs && node scripts/check-podcast-release.mjs && git diff --check`

Expected: all pass; queue has no asset or approval changes and no public files are rendered.

### Task 4: Reset the planned cadence only after capacity is real

**Files:**
- Modify: `data/podcast-law-queue.json`
- Test: `tests/podcast-daily-queue.test.mjs`

- [ ] **Step 1: Write a failing fixture assertion**

```js
assert.deepEqual(queue.episodes.slice(0, 3).map(row => row.scheduledDate), ['2026-08-10', '2026-08-10', '2026-08-10']);
```

- [ ] **Step 2: Do not modify the production queue until EP007–EP009 each contain approved Meijia MP3/M4A/VTT and a full-episode listen approval**

Reason: assigning three rows to a date before assets and approval exist would make an empty schedule look like an operating release plan.

- [ ] **Step 3: When the assets are approved, group subsequent rows by three per Taipei date**

Use dates `2026-08-10`, `2026-08-11`, … in contiguous triads. Preserve unique GUIDs, UTM campaigns, law angles and every source hash.

- [ ] **Step 4: Verify and commit independently**

Run: `node --test tests/podcast-daily-queue.test.mjs && git diff --check`

Expected: zero queue contract failures. Commit only the code contract and queue schedule separately, then open a PR; do not merge or publish without checks and real assets.

## Self-review

- Capacity is capped at three rather than an unbounded catch-up burst.
- A non-approved or future second/third row blocks later rows; no law episode is skipped.
- The plan preserves individual MP3/M4A/VTT, source lock, pronunciation review, full-episode listening approval, exact public URL, CTA/UTM and post-publication metric windows.
- No provider account, price, secret, automatic speech service, or public state is changed by this plan.
