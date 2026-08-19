# Podcast RSS Latest-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the existing SoFa Podcast RSS items newest-first without changing episode identity or media URLs, and make future releases preserve that order.

**Architecture:** Add one deterministic RSS item sorter to the existing renderer. The sorter reads each item’s `pubDate` and `itunes:episode`, rejects incomplete metadata, sorts by date descending and episode number descending, and rewrites only item order. Static feed order and renderer behavior are guarded separately by regression tests.

**Tech Stack:** Node.js ESM, `node:test`, static RSS XML, GitHub Pages

---

## File map

- `scripts/render-podcast-release.mjs`: own RSS item parsing, validation, and latest-first ordering for every future rendered episode.
- `tests/podcast-feed-date-consistency.test.mjs`: guard the committed public feed’s latest-first ordering and existing date/version invariants.
- `tests/podcast-daily-queue.test.mjs`: exercise renderer ordering and malformed-item failure paths with temporary fixtures.
- `podcast.xml`: commit the current six episodes in latest-first order and refresh `lastBuildDate`.

### Task 1: Guard committed feed ordering

**Files:**
- Modify: `tests/podcast-feed-date-consistency.test.mjs`

- [ ] **Step 1: Write the failing committed-feed test**

Add an item parser and this test:

```js
function feedItems() {
  return (feed.match(/<item>[\s\S]*?<\/item>/g) || []).map(item => {
    const pubDate = item.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1];
    const episode = Number(item.match(/<itunes:episode>(\d+)<\/itunes:episode>/)?.[1]);
    assert.ok(pubDate, 'RSS item pubDate is missing');
    assert.ok(Number.isInteger(episode), 'RSS item itunes:episode is missing');
    return { episode, publishedAt: Date.parse(pubDate) };
  });
}

test('RSS items are ordered newest-first with episode number as the stable tie-breaker', () => {
  const items = feedItems();
  assert.deepEqual(items.map(item => item.episode), [6, 5, 4, 3, 2, 1]);
  for (let index = 1; index < items.length; index += 1) {
    assert.ok(items[index - 1].publishedAt >= items[index].publishedAt);
  }
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/podcast-feed-date-consistency.test.mjs`

Expected: FAIL because the committed feed is `[1, 2, 3, 4, 5, 6]`.

- [ ] **Step 3: Commit the failing test**

```bash
git add tests/podcast-feed-date-consistency.test.mjs
git commit -m "test(podcast): require latest-first RSS items"
```

### Task 2: Sort and validate renderer output

**Files:**
- Modify: `tests/podcast-daily-queue.test.mjs`
- Modify: `scripts/render-podcast-release.mjs`

- [ ] **Step 1: Extend the renderer test fixture and add failure tests**

Import `sortFeedItemsLatestFirst`. Seed the temporary RSS with an older EP001 item, then assert the new EP007 item appears before it:

```js
assert.ok(
  feed.indexOf('sofa-podcast-ep007-v20260808-hana') < feed.indexOf('sofa-podcast-ep001-v20260721-ac'),
  'newer episode must precede older episode',
);
```

Add malformed-item assertions:

```js
assert.throws(
  () => sortFeedItemsLatestFirst('<rss><channel><item><itunes:episode>1</itunes:episode></item></channel></rss>'),
  /RSS item pubDate is missing/,
);
assert.throws(
  () => sortFeedItemsLatestFirst('<rss><channel><item><pubDate>Tue, 18 Aug 2026 04:00:00 +0000</pubDate></item></channel></rss>'),
  /RSS item itunes:episode is missing/,
);
```

- [ ] **Step 2: Run renderer tests and verify RED**

Run: `node --test --test-name-pattern='renderer|RSS sorter' tests/podcast-daily-queue.test.mjs`

Expected: FAIL because the sorter is not exported and the renderer still appends items.

- [ ] **Step 3: Implement the minimal sorter**

Add this exported function to `scripts/render-podcast-release.mjs`:

```js
export function sortFeedItemsLatestFirst(feed) {
  const pattern = /<item>[\s\S]*?<\/item>/g;
  const items = (feed.match(pattern) || []).map(item => {
    const pubDate = item.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1];
    const episode = Number(item.match(/<itunes:episode>(\d+)<\/itunes:episode>/)?.[1]);
    if (!pubDate || !Number.isFinite(Date.parse(pubDate))) throw new Error('RSS item pubDate is missing or invalid');
    if (!Number.isInteger(episode)) throw new Error('RSS item itunes:episode is missing');
    return { episode, item, publishedAt: Date.parse(pubDate) };
  });
  const channelMarker = '  </channel>';
  if (!feed.includes(channelMarker)) throw new Error('RSS channel marker missing');
  const withoutItems = feed.replace(/\s*<item>[\s\S]*?<\/item>\s*/g, '\n');
  const ordered = items
    .sort((left, right) => right.publishedAt - left.publishedAt || right.episode - left.episode)
    .map(({ item }) => `    ${item}`)
    .join('\n');
  return withoutItems.replace(channelMarker, `${ordered}\n${channelMarker}`);
}
```

After the renderer appends the new item, call:

```js
feed = feed.replace(feedMarker, `${item}${feedMarker}`);
feed = sortFeedItemsLatestFirst(feed);
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the renderer-focused suite:

```bash
node --test tests/podcast-daily-queue.test.mjs
```

Expected: renderer ordering and validation tests pass. The separate committed-feed test remains red until Task 3.

- [ ] **Step 5: Commit renderer behavior**

```bash
git add scripts/render-podcast-release.mjs tests/podcast-daily-queue.test.mjs
git commit -m "fix(podcast): sort rendered RSS newest-first"
```

### Task 3: Reorder the current public feed

**Files:**
- Modify: `podcast.xml`

- [ ] **Step 1: Reorder existing item blocks mechanically**

Run the exported sorter against `podcast.xml`, preserving every item byte except surrounding whitespace and item order. Set `lastBuildDate` to the current UTC deployment timestamp using RFC 2822 format.

- [ ] **Step 2: Verify static feed tests turn GREEN**

Run: `node --test tests/podcast-feed-date-consistency.test.mjs`

Expected: 3 tests pass, including exact `[6, 5, 4, 3, 2, 1]` order.

- [ ] **Step 3: Verify identity and media invariants**

Run:

```bash
node scripts/check-podcast-release.mjs
node --input-type=module -e "import{execFileSync}from'node:child_process';import{readFileSync}from'node:fs';const base=execFileSync('git',['show','33b7e10:podcast.xml'],{encoding:'utf8'});const current=readFileSync('podcast.xml','utf8');const values=s=>[...s.matchAll(/<(guid|enclosure|podcast:transcript)\\b[^>]*(?:>[^<]*<\\/guid>)?/g)].map(m=>m[0]).sort();if(JSON.stringify(values(base))!==JSON.stringify(values(current)))throw new Error('Podcast identity or media metadata changed');console.log('Podcast identity/media invariants preserved');"
```

Expected: checker passes and the invariant command prints `Podcast identity/media invariants preserved`.

- [ ] **Step 4: Commit the static feed**

```bash
git add podcast.xml
git commit -m "fix(podcast): publish RSS items newest-first"
```

### Task 4: Full verification and deployment

**Files:**
- Verify only: all changed source, test, plan, and RSS files

- [ ] **Step 1: Run full local verification**

```bash
node --test tests/*.test.mjs
node scripts/check-podcast-release.mjs
git diff origin/main --check
git status --short
```

Expected: all tests pass, release checker passes, no whitespace errors, and only planned files differ.

- [ ] **Step 2: Push and open a PR**

Push `codex/podcast-rss-latest-first`, open a PR against `main`, and include RED/GREEN evidence plus the GUID/enclosure invariant result.

- [ ] **Step 3: Merge only after checks pass**

Wait for all GitHub checks, merge the PR, and wait for the Pages deployment tied to the merge commit to complete successfully.

- [ ] **Step 4: Verify production RSS**

Fetch `https://sofaengine.org/podcast.xml` with a cache-busting query and assert:

```text
order = EP006, EP005, EP004, EP003, EP002, EP001
EP002–EP006 pubDate = 2026-08-18
GUIDs = unchanged v20260818-azure values
M4A URLs = unchanged and HTTP 200
```

- [ ] **Step 5: Read Apple public state honestly**

Check Apple show ID `6793109453`. Report 8/18 only if the public catalog actually changed; otherwise state `Apple 尚未重抓` and retain the source-side evidence.

- [ ] **Step 6: Update Notion evidence**

Update task `3bf6e707-a543-810a-8a57-f457ae0de07c` and changelog `3bf6e707-a543-8101-aa0d-dd2538514f55` with PR, test count, Pages run, public RSS order, and Apple readback. Keep `是否公告=false`.
