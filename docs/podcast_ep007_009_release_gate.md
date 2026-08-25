# Podcast EP007–EP009 release gate

This runbook converts the already-produced private Azure review bundle into release-ready queue rows **only after** an explicit three-episode listen approval. It does not publish RSS, the website, or YouTube by itself.

## Current private evidence

- Episodes: `EP007`, `EP008`, `EP009`, in that order.
- Provider: paid Microsoft Azure Speech.
- Voice policy: `podcast-ep001-master-v1` (`EP001 A` + `EP001 C`).
- Required artifacts per episode: MP3, M4A, VTT, 16:9 YouTube MP4, master WAV, and `report.json`.
- Until a listener has approved all three exact M4A files, queue status stays `content_verified_audio_pending`, `listenApproval.status` stays `pending`, and no provider mutation is allowed.

## 1. Validate the private bundle without changing release state

```bash
node scripts/promote-podcast-law-release.mjs \
  --source-root /absolute/path/to/private-review-bundle \
  --review-manifest /absolute/path/to/private-review-bundle/review-manifest.json \
  --validate-only
```

Expected output:

```json
{"validated":["EP007","EP008","EP009"],"status":"pending_listen_approval","mutated":false}
```

The command verifies episode order, paid provider, EP001 voice policy, source-text identity, every artifact SHA-256, and the queue's still-pending state. It creates no release assets and edits no queue, RSS, HTML, or provider ledger.

## 2. Record explicit listen approval

Only after the three exact M4A files have been listened to in full, create a separate approval file:

```json
{
  "schemaVersion": 1,
  "batchId": "ep007-009",
  "status": "approved",
  "approvedBy": "Fay",
  "approvedAt": "2026-08-26T20:00:00+08:00",
  "episodes": ["EP007", "EP008", "EP009"]
}
```

Do not infer this file from technical QA, a workflow success, an artifact manifest, or an elapsed date.

## 3. Promote assets after approval

```bash
node scripts/promote-podcast-law-release.mjs \
  --source-root /absolute/path/to/private-review-bundle \
  --review-manifest /absolute/path/to/private-review-bundle/review-manifest.json \
  --approval-file /absolute/path/to/listen-approval.json
```

The promotion copies the exact approved MP3/M4A/VTT/YouTube MP4 files into deterministic release paths and atomically updates only EP007–EP009 queue rows with hashes, duration, transcript excerpt, voice identity, non-provisional GUID, and listen-approval evidence. The change must be reviewed and merged before either cloud release lane can use it.

## 4. Verify and release in separate gates

1. Run `node --test tests/podcast-*.test.mjs tests/youtube-podcast-*.test.mjs` and `git diff --check`.
2. Merge the reviewed asset-and-queue change.
3. Let `Podcast daily law release` publish only due, consecutive, approved rows; verify exact episode URL, inline player, VTT, RSS enclosure, CTA, and UTM after deployment.
4. For YouTube, run the episode-scoped `upload_private` action first and read back the private provider ledger. A later explicit `publish` action changes only that exact video's privacy status.
5. Publication is confirmed only by provider public state plus the exact live URL. Start 24-hour and 72-hour metrics from that confirmed instant.

Never treat this runbook, private artifact recovery, validation output, approval-file shape, a merged queue, or a private YouTube upload as public publication.
