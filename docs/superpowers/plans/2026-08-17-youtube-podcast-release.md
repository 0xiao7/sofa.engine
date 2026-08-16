# YouTube Podcast Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fail-closed, idempotent YouTube Podcast pipeline that validates approved episodes, uploads them privately, adds them to one Podcast playlist, and publishes only through an explicit episode-scoped command.

**Architecture:** Keep content readiness, YouTube HTTP transport, provider ledger, and CLI orchestration in separate Node ESM modules. Scheduled GitHub Actions run validation only; `upload_private` and `publish` are manual episode-scoped mutations. Provider operations use YouTube Data API REST through injected `fetch`, which keeps tests deterministic and avoids a new runtime dependency.

**Tech Stack:** Node.js 24 ESM, `node:test`, built-in `fetch`, YouTube Data API v3, GitHub Actions YAML, JSON ledger.

---

## File map

- Create `scripts/youtube-podcast-readiness.mjs`: validate one approved episode, assets, SHA-256, metadata and ledger-safe inputs.
- Create `scripts/youtube-podcast-client.mjs`: OAuth refresh, resumable upload, video status update, playlist lookup/create/add.
- Create `scripts/youtube-podcast-ledger.mjs`: atomic JSON ledger reads/writes and idempotency decisions.
- Create `scripts/youtube-podcast-release.mjs`: CLI for `validate`, `upload_private`, and `publish`.
- Create `tests/youtube-podcast-readiness.test.mjs`: readiness and metadata contracts.
- Create `tests/youtube-podcast-client.test.mjs`: request and error-classification contracts with injected fetch.
- Create `tests/youtube-podcast-release.test.mjs`: idempotency and orchestration contracts.
- Create `.github/workflows/youtube-podcast-release.yml`: scheduled validation and explicit manual mutation modes.
- Create `data/youtube-podcast-ledger.json`: schema v1 empty provider ledger.
- Modify `data/podcast-law-queue.json`: only asset/provider fields supported by the new validator; do not approve listening automatically.

### Task 1: Episode readiness and metadata contract

**Files:**
- Create: `scripts/youtube-podcast-readiness.mjs`
- Create: `tests/youtube-podcast-readiness.test.mjs`

- [ ] **Step 1: Write failing readiness tests**

Cover these exact behaviors with fixture files in a temporary directory: pending listen approval fails; missing MP3/M4A/VTT fails; SHA mismatch fails; `approved_for_release` with matching hashes succeeds; metadata contains exam/law/article, official source, one episode-specific UTM, `madeForKids=false`, and both required disclaimers; default privacy is `private`.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/youtube-podcast-readiness.test.mjs`

Expected: FAIL because `scripts/youtube-podcast-readiness.mjs` does not exist.

- [ ] **Step 3: Implement the minimal readiness module**

Export:

```js
export function validateYoutubeEpisode({ episode, root })
export function buildYoutubeMetadata(episode)
export function sha256File(path)
```

`validateYoutubeEpisode` must require `approved_for_release`, approved listen metadata, all three assets, `episode.assetSha256.{mp3,m4a,vtt}`, matching files, duration and final GUID. `buildYoutubeMetadata` must return `{ snippet, status }` with `privacyStatus: 'private'`, `selfDeclaredMadeForKids: false`, official source, tracked CTA and the exact disclaimers `SoFa Engine 參考解析` / `非考選部官方標準答案`.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/youtube-podcast-readiness.test.mjs`

Expected: all readiness tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/youtube-podcast-readiness.mjs tests/youtube-podcast-readiness.test.mjs
git commit -m "feat(podcast): validate YouTube episode readiness"
```

### Task 2: Atomic provider ledger and idempotency

**Files:**
- Create: `scripts/youtube-podcast-ledger.mjs`
- Create: `tests/youtube-podcast-release.test.mjs`
- Create: `data/youtube-podcast-ledger.json`

- [ ] **Step 1: Write failing ledger tests**

Test schema rejection, empty schema v1 acceptance, new upload decision, same asset/metadata SHA returning `reuse`, different SHA returning `conflict`, partial `uploaded` state resuming playlist attachment without a second upload, and atomic episode upsert.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/youtube-podcast-release.test.mjs`

Expected: FAIL because ledger exports do not exist.

- [ ] **Step 3: Implement the minimal ledger module**

Export:

```js
export function readYoutubeLedger(path)
export function decideYoutubeAction({ ledger, episodeId, assetSha256, metadataSha256 })
export function upsertYoutubeRecord({ path, record })
```

Ledger records use episode ID as the unique key and preserve video ID after partial provider success. Atomic writes use `path.tmp` followed by rename.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/youtube-podcast-release.test.mjs`

Expected: ledger tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/youtube-podcast-ledger.mjs tests/youtube-podcast-release.test.mjs data/youtube-podcast-ledger.json
git commit -m "feat(podcast): add YouTube provider ledger"
```

### Task 3: YouTube REST client

**Files:**
- Create: `scripts/youtube-podcast-client.mjs`
- Create: `tests/youtube-podcast-client.test.mjs`

- [ ] **Step 1: Write failing client tests**

Use injected `fetchImpl` to assert: refresh-token exchange never places secrets in URLs or errors; upload initializes a resumable session then sends bytes; playlist lookup reuses exact configured title; missing playlist creates one with `podcastStatus=enabled`; add-to-playlist uses the video ID; publish updates only `status.privacyStatus`; 401, 403 scope, 403 quota, and partial playlist failures map to stable safe error codes.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/youtube-podcast-client.test.mjs`

Expected: FAIL because the client module does not exist.

- [ ] **Step 3: Implement the minimal client**

Export:

```js
export class YoutubeProviderError extends Error {}
export function createYoutubeClient({ fetchImpl, clientId, clientSecret, refreshToken })
```

The client exposes `uploadPrivate`, `findOrCreatePodcastPlaylist`, `addVideoToPlaylist`, and `publishVideo`. It must sanitize response bodies before throwing and never log credentials.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/youtube-podcast-client.test.mjs`

Expected: client tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/youtube-podcast-client.mjs tests/youtube-podcast-client.test.mjs
git commit -m "feat(podcast): add YouTube provider client"
```

### Task 4: Episode-scoped CLI orchestration

**Files:**
- Create: `scripts/youtube-podcast-release.mjs`
- Modify: `tests/youtube-podcast-release.test.mjs`

- [ ] **Step 1: Write failing orchestration tests**

Test `validate` performs no provider calls; `upload_private` rejects a missing episode ID and unapproved episode; same-SHA record reuses the video; new upload persists video before playlist mutation; partial playlist retry does not upload again; `publish` requires an existing private record and changes only the named episode.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/youtube-podcast-release.test.mjs`

Expected: new orchestration tests FAIL because `runYoutubePodcastRelease` does not exist.

- [ ] **Step 3: Implement the minimal orchestrator and CLI**

Export `runYoutubePodcastRelease(options)` and parse:

```text
--mode validate|upload_private|publish
--episode EP007
--queue data/podcast-law-queue.json
--ledger data/youtube-podcast-ledger.json
```

Credentials come only from `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, and `YOUTUBE_REFRESH_TOKEN`. Playlist identity comes from `YOUTUBE_PODCAST_PLAYLIST_ID` when present, otherwise the exact configured title `SoFa Engine 國考 Podcast`.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/youtube-podcast-release.test.mjs`

Expected: all ledger and orchestration tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/youtube-podcast-release.mjs tests/youtube-podcast-release.test.mjs
git commit -m "feat(podcast): orchestrate private upload and publish"
```

### Task 5: GitHub Actions safety contract

**Files:**
- Create: `.github/workflows/youtube-podcast-release.yml`
- Create: `tests/youtube-podcast-workflow.test.mjs`

- [ ] **Step 1: Write failing workflow tests**

Assert schedule invokes only `--mode validate`; workflow dispatch requires mode and episode; mutation steps receive the three YouTube secrets; schedule cannot select `upload_private` or `publish`; permissions remain `contents: write` only for ledger commit; logs do not echo secrets.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/youtube-podcast-workflow.test.mjs`

Expected: FAIL because the workflow file does not exist.

- [ ] **Step 3: Add the minimal workflow**

Use Node 24, one concurrency lane, explicit validate/upload/publish steps, and commit only `data/youtube-podcast-ledger.json` when it changed. Mutation modes require a non-empty episode input.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/youtube-podcast-workflow.test.mjs`

Expected: workflow tests PASS.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/youtube-podcast-release.yml tests/youtube-podcast-workflow.test.mjs
git commit -m "ci(podcast): add fail-closed YouTube workflow"
```

### Task 6: Baseline and integrated verification

**Files:**
- Modify only if a verified contract gap is found.

- [ ] **Step 1: Run focused suites**

```bash
node --test tests/youtube-podcast-*.test.mjs
node --test tests/podcast-daily-queue.test.mjs tests/podcast-daily-workflow.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 2: Run repository Podcast contracts**

```bash
node --test tests/podcast-*.test.mjs
node scripts/check-podcast-release.mjs
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 3: Run credential-free validation**

```bash
node scripts/youtube-podcast-release.mjs --mode validate --episode EP007
```

Expected while EP007 is not approved: fail closed with a readiness error and zero provider mutation.

- [ ] **Step 4: Record external gate truth**

Confirm whether the three GitHub secrets and a usable YouTube account/playlist identity exist without printing secret values. If absent, report `credential_missing`; do not fabricate a private upload.

- [ ] **Step 5: Commit any verification-only contract correction**

Only when Step 1–4 exposed a real contract defect, commit that narrow correction with its regression test.

