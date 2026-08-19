# Playlist Audio Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dashboard study playlist use durable, versioned Azure A/C MP3 files with truthful loading/duration UI and device speech only as an explicit fallback.

**Architecture:** The API computes a content/version hash, synthesizes one Azure SSML document with A asking the question and C answering after six seconds, stores generated MP3 plus metadata in a public Supabase Storage bucket, and returns stable audio state fields while preserving the lazy endpoint. The static dashboard consumes ready or lazy URLs through a small player state contract and never presents device speech as a seekable zero-duration audio track.

**Tech Stack:** FastAPI/Python, Microsoft Azure Speech REST API, Supabase Storage REST API, vanilla JavaScript, Python `unittest`, Node test runner, GitHub Pages, Render.

---

## File map

- API modify: `/Users/0xiao7/.config/superpowers/worktrees/sofa-engine-api/playlist-audio-cache-20260819/api.py` — version keys, durable storage, metadata, request locking and API contract.
- API test: `/Users/0xiao7/.config/superpowers/worktrees/sofa-engine-api/playlist-audio-cache-20260819/test_playlist_contract.py` — cache, version, provider and error contracts.
- Web modify: `/Users/0xiao7/sofa.engine/.worktrees/playlist-audio-cache-20260819/dashboard.html` — truthful player state and stable audio selection.
- Web test: `/Users/0xiao7/sofa.engine/.worktrees/playlist-audio-cache-20260819/tests/dashboard-study-today-contract.test.mjs` — frontend contract regressions.
- Durable docs: both repositories' `CLAUDE.md` only if implementation discovers a new long-lived deployment invariant.

### Task 1: Lock the official playlist voice and version contract

- [ ] Add failing API tests asserting A=`zh-TW-HsiaoChenNeural` (`-10%`, `-2Hz`) and C=`zh-TW-YunJheNeural` (`-10%`, `-3Hz`), stable version hashes for identical content, and different hashes when text, pause, voice or prosody changes.
- [ ] Run `python3 -m unittest -q test_playlist_contract.PlaylistContractTests` and confirm the new assertions fail because version helpers and fields do not exist.
- [ ] Add `_playlist_audio_version_payload`, `_playlist_audio_version`, and response fields `audio_status`, `audio_version`, `audio_duration_seconds` with the approved Azure A/C map.
- [ ] Re-run the playlist test class and confirm green.
- [ ] Commit API changes as `feat: version playlist audio artifacts`.

### Task 2: Add durable Supabase Storage cache

- [ ] Add failing tests for durable cache hit before TTS, upload after valid generation, invalid/empty output rejection, and storage failure returning fallback without a false ready state.
- [ ] Run the focused tests and confirm red for missing durable storage helpers.
- [ ] Implement Storage REST helpers using existing `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`, bucket env `PLAYLIST_AUDIO_BUCKET` defaulting to `playlist-audio`, deterministic object names `<version>.mp3`, and public object URLs.
- [ ] Protect same-version generation with an in-process per-version lock; check storage again after acquiring the lock before calling Azure Speech.
- [ ] Validate MP3 bytes as non-empty MPEG data, derive duration from MP3 frame data or a bounded parser helper, upload atomically, and return `ready` only after successful readback metadata.
- [ ] Preserve the current in-memory cache only as a short process-local accelerator; durable storage is authoritative.
- [ ] Re-run focused and full API tests: `python3 -m unittest -q test_playlist_contract.py` and `python3 -m unittest -q`.
- [ ] Commit API changes as `feat: persist playlist audio cache`.

### Task 3: Make playlist and lazy endpoints truthful

- [ ] Add failing endpoint contract tests: ready items expose stable `audio_url`; deferred items expose `preparing` plus `lazy_audio_url`; lazy success includes ETag/cache headers; generation failure returns 503 without HTML/audio confusion.
- [ ] Run focused tests and confirm red.
- [ ] Update `_playlist_item_from_article`, `_playlist_apply_google_tts`, `playlist_audio`, and `playlist_lazy_audio` to use durable version metadata and response headers.
- [ ] Ensure `audio_provider=microsoft-azure-speech-paid` and the approved A/C voice map appear only when a real provider MP3 is ready; device fallback uses `fallback_only` and no provider voice map.
- [ ] Re-run the API playlist and full suites, then `python3 -m py_compile api.py` and `git diff --check`.
- [ ] Commit API changes as `fix: expose truthful playlist audio state`.

### Task 4: Fix dashboard loading and duration states

- [ ] Add failing Node contract tests for `--:--` idle duration, `音檔準備中`, `audio_url` preference, `lazy_audio_url` fallback, metadata-driven duration, and explicit device-speech fallback status.
- [ ] Run `node --test tests/dashboard-study-today-contract.test.mjs` and confirm red.
- [ ] Add a small playlist player state setter in `dashboard.html`; initialize duration as `--:--`, set loading before `audio.play()`, set ready on `loadedmetadata`, and clear seekability in device fallback.
- [ ] Map API `audio_status`, `audio_version`, and `audio_duration_seconds` into playlist items without breaking older API responses.
- [ ] Cancel stale audio/listeners when refreshing or changing item; keep lyric progress tied only to the active audio element.
- [ ] Re-run the focused Node test, all relevant dashboard/player tests, and `git diff --check`.
- [ ] Commit web changes as `fix: show truthful playlist audio state`.

### Task 5: Cross-repository integration verification

- [ ] Start the API locally with Google/Supabase calls replaced only by test fixtures and run a real HTTP contract smoke test for playlist JSON and MP3 headers.
- [ ] Serve the web worktree locally and run WebKit mobile viewport checks for initial state, first play, metadata duration, pause, next and fallback.
- [ ] Run API full tests with `python3 -m unittest -q` and web full tests with `node --test tests/*.test.mjs`; record exact pass/fail counts.
- [ ] Confirm diffs contain no Podcast, pricing, checkout or scheduling changes.
- [ ] Update durable `CLAUDE.md` gotchas only if a new deployment invariant was introduced, then commit documentation separately.

### Task 6: Publish API and web safely

- [ ] Push the API branch, open a PR, verify CI, merge only with clean checks, and verify the Render deployment is running the merged SHA.
- [ ] Set or verify `PLAYLIST_AUDIO_BUCKET=playlist-audio`, public-read bucket policy, `AZURE_SPEECH_KEY`, and `AZURE_SPEECH_REGION` using existing deployment credentials; do not expose service keys.
- [ ] Probe production playlist JSON and five lazy/ready URLs; verify HTTP 200 audio/mpeg, non-zero bytes, positive duration, approved Azure A/C voices, stable version/ETag and second-request cache hit.
- [ ] Push the web branch, open a PR, verify CI, merge, and verify GitHub Pages production with a cache-busting query.
- [ ] Verify production iPhone-equivalent WebKit behavior and capture the exact commercial-accounting-law §2 result that replaces unexplained `0:00 / 0:00`.
- [ ] If provider or deployment evidence is unavailable, stop at `未確認`; do not call the feature complete.

### Task 7: Closeout records

- [ ] Update `SoFa.Engine/task_plan.md`, `progress.md`, and `findings.md` with exact commits, PRs, deployment runs and live probes.
- [ ] Update TASK_DB progress/completion and create one CHANGELOG_DB row with `是否公告=false` using the SoFa integration token.
- [ ] Re-read the spec completion definition and verify each item with current evidence.
- [ ] Run final `git status`, `git diff --check`, focused/full tests and production probes before reporting completion.
