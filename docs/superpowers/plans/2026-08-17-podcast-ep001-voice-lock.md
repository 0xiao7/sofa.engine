# Podcast EP001 Voice Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the SoFa Podcast audio pipeline so every new episode reproduces the approved EP001 production contract and one approved master is reused by the website, RSS, and YouTube.

**Architecture:** Add a versioned EP001 voice-policy manifest, a Google TTS client, and a deterministic FFmpeg assembly module. Provider segments are normalized to 44.1 kHz stereo PCM before concatenation; the resulting master is encoded once and then muxed into the YouTube MP4 without resynthesis. Readiness validation probes real media and blocks every release until hashes, shared-master identity, and Fay listening approval are present.

**Tech Stack:** Node.js 24 built-ins, Google Cloud Text-to-Speech REST API, FFmpeg/FFprobe, Node test runner, GitHub Actions.

---

## File Map

- Create `data/podcast-voice-policy-ep001-v1.json`: immutable synthesis and media contract derived from EP001.
- Create `scripts/google-tts-client.mjs`: service-account OAuth and one-segment synthesis only.
- Create `scripts/podcast-audio-master.mjs`: normalize, concatenate, loudness-normalize, encode, probe, and mux without network access.
- Create `scripts/build-podcast-audition.mjs`: CLI that builds one local/private audition and report.
- Create `data/podcast-auditions/ep002-audition.json`: source-locked 30-60 second EP002 audition input.
- Create `tests/podcast-voice-policy.test.mjs`: voice-policy contract tests.
- Create `tests/google-tts-client.test.mjs`: payload and no-fallback client tests.
- Create `tests/podcast-audio-master.test.mjs`: real FFmpeg regression tests for 24 kHz mono input.
- Modify `scripts/youtube-podcast-readiness.mjs`: enforce media and shared-master gates.
- Modify `tests/youtube-podcast-readiness.test.mjs`: cover the new fail-closed gates.
- Create `.github/workflows/podcast-audio-audition.yml`: manual, artifact-only private audition workflow.
- Create `tests/podcast-audio-audition-workflow.test.mjs`: workflow safety contract.

### Task 1: Lock the EP001 policy as data

**Files:**
- Create: `data/podcast-voice-policy-ep001-v1.json`
- Create: `tests/podcast-voice-policy.test.mjs`

- [ ] **Step 1: Write the failing policy test**

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const policy = JSON.parse(readFileSync(new URL('../data/podcast-voice-policy-ep001-v1.json', import.meta.url)));

test('EP001 is the immutable public voice and media reference', () => {
  assert.equal(policy.id, 'podcast-ep001-master-v1');
  assert.equal(policy.referenceAsset, 'assets/audio/sofa-podcast-001.m4a');
  assert.deepEqual(policy.voices.map(row => row.name), [
    'cmn-TW-Chirp3-HD-HsiaoChen',
    'cmn-TW-Chirp3-HD-YunJhe',
  ]);
  assert.equal(policy.media.sampleRate, 44100);
  assert.equal(policy.media.channels, 2);
  assert.equal(policy.media.thinkingPauseSeconds, 6);
  assert.equal(policy.fallback, 'blocked');
  assert.deepEqual(policy.distribution, ['website', 'rss', 'youtube']);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/podcast-voice-policy.test.mjs`

Expected: FAIL with `ENOENT` for `data/podcast-voice-policy-ep001-v1.json`.

- [ ] **Step 3: Add the minimal policy manifest**

```json
{
  "id": "podcast-ep001-master-v1",
  "referenceAsset": "assets/audio/sofa-podcast-001.m4a",
  "provider": "google-cloud-text-to-speech",
  "voices": [
    { "role": "A", "name": "cmn-TW-Chirp3-HD-HsiaoChen", "languageCode": "cmn-TW", "speakingRate": 0.9, "pitch": -10 },
    { "role": "C", "name": "cmn-TW-Chirp3-HD-YunJhe", "languageCode": "cmn-TW", "speakingRate": 0.9, "pitch": -10 }
  ],
  "media": { "sampleRate": 44100, "channels": 2, "thinkingPauseSeconds": 6, "cueHz": 880, "targetLufs": -16 },
  "fallback": "blocked",
  "distribution": ["website", "rss", "youtube"]
}
```

- [ ] **Step 4: Run the policy test and existing Podcast contracts**

Run: `node --test tests/podcast-voice-policy.test.mjs tests/podcast-contract.test.mjs tests/podcast-release-safety.test.mjs`

Expected: PASS, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add data/podcast-voice-policy-ep001-v1.json tests/podcast-voice-policy.test.mjs
git commit -m "test: lock podcast production to EP001 master"
```

### Task 2: Normalize every provider segment before assembly

**Files:**
- Create: `scripts/podcast-audio-master.mjs`
- Create: `tests/podcast-audio-master.test.mjs`

- [ ] **Step 1: Write a failing real-media regression test**

```js
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { normalizeSegment, probeAudio } from '../scripts/podcast-audio-master.mjs';

test('24 kHz mono provider audio is normalized to EP001 44.1 kHz stereo', () => {
  const root = mkdtempSync(join(tmpdir(), 'sofa-audio-'));
  const input = join(root, 'provider.wav');
  const output = join(root, 'normalized.wav');
  execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=24000:duration=1', '-ac', '1', input]);
  normalizeSegment({ input, output });
  assert.deepEqual(probeAudio(output), { sampleRate: 44100, channels: 2, channelLayout: 'stereo' });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/podcast-audio-master.test.mjs`

Expected: FAIL because `scripts/podcast-audio-master.mjs` does not exist.

- [ ] **Step 3: Implement normalization and probing**

```js
import { execFileSync } from 'node:child_process';

export function normalizeSegment({ input, output }) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', input, '-ar', '44100', '-ac', '2', '-c:a', 'pcm_s16le', output]);
}

export function probeAudio(path) {
  const raw = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate,channels,channel_layout', '-of', 'json', path], { encoding: 'utf8' });
  const stream = JSON.parse(raw).streams[0];
  return { sampleRate: Number(stream.sample_rate), channels: stream.channels, channelLayout: stream.channel_layout };
}
```

- [ ] **Step 4: Add failing tests for cue, silence, master, and derivatives**

Extend the test file so it calls `buildCue`, `buildSilence`, `assembleMaster`, and `encodeDerivatives`; assert every intermediate WAV is 44.1 kHz stereo, MP3/M4A are 44.1 kHz stereo, and derivative durations differ by at most 0.10 seconds.

Run: `node --test tests/podcast-audio-master.test.mjs`

Expected: FAIL with missing exported functions.

- [ ] **Step 5: Implement deterministic assembly**

Add these public functions:

```js
export function buildSilence({ output, seconds = 6 }) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', String(seconds), '-c:a', 'pcm_s16le', output]);
}

export function buildCue({ output, hz = 880 }) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `sine=frequency=${hz}:sample_rate=44100:duration=0.18`, '-ac', '2', '-af', 'volume=0.08', '-c:a', 'pcm_s16le', output]);
}

export function assembleMaster({ concatList, output }) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', concatList, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', '-ac', '2', '-c:a', 'pcm_s16le', output]);
}

export function encodeDerivatives({ master, mp3, m4a }) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', master, '-ar', '44100', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '128k', mp3]);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', master, '-ar', '44100', '-ac', '2', '-c:a', 'aac', '-b:a', '128k', m4a]);
}

export function muxYoutube({ m4a, artwork, output }) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-loop', '1', '-i', artwork, '-i', m4a, '-c:v', 'libx264', '-tune', 'stillimage', '-c:a', 'copy', '-shortest', '-pix_fmt', 'yuv420p', output]);
}
```

- [ ] **Step 6: Run tests and commit**

Run: `node --test tests/podcast-audio-master.test.mjs`

Expected: PASS, 0 failures.

```bash
git add scripts/podcast-audio-master.mjs tests/podcast-audio-master.test.mjs
git commit -m "fix: normalize podcast audio to EP001 media contract"
```

### Task 3: Add a Google client with no fallback

**Files:**
- Create: `scripts/google-tts-client.mjs`
- Create: `tests/google-tts-client.test.mjs`

- [ ] **Step 1: Write failing payload and provider-error tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSynthesisPayload, synthesizeSegment } from '../scripts/google-tts-client.mjs';

test('payload pins the approved Taiwan voice', () => {
  assert.deepEqual(buildSynthesisPayload({ text: '土地徵收條例', voice: { name: 'cmn-TW-Chirp3-HD-HsiaoChen', languageCode: 'cmn-TW', speakingRate: 0.9, pitch: -10 } }), {
    input: { text: '土地徵收條例' },
    voice: { name: 'cmn-TW-Chirp3-HD-HsiaoChen', languageCode: 'cmn-TW' },
    audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000, speakingRate: 0.9, pitch: -10 },
  });
});

test('provider failure blocks instead of selecting another voice', async () => {
  await assert.rejects(() => synthesizeSegment({ text: '測試', voice: {}, accessToken: 'x', fetchImpl: async () => new Response('denied', { status: 403 }) }), /Google TTS 403/);
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test tests/google-tts-client.test.mjs`

Expected: FAIL because the client module does not exist.

- [ ] **Step 3: Implement the payload and REST call**

```js
export function buildSynthesisPayload({ text, voice }) {
  return {
    input: { text },
    voice: { name: voice.name, languageCode: voice.languageCode },
    audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000, speakingRate: voice.speakingRate, pitch: voice.pitch },
  };
}

export async function synthesizeSegment({ text, voice, accessToken, fetchImpl = fetch }) {
  const response = await fetchImpl('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify(buildSynthesisPayload({ text, voice })),
  });
  if (!response.ok) throw new Error(`Google TTS ${response.status}: ${await response.text()}`);
  const body = await response.json();
  if (!body.audioContent) throw new Error('Google TTS response missing audioContent');
  return Buffer.from(body.audioContent, 'base64');
}
```

- [ ] **Step 4: Add service-account JWT access-token support without logging credentials**

Add `getGoogleAccessToken({ credentials, fetchImpl })` using `node:crypto` `createSign('RSA-SHA256')`, the Cloud Platform scope, and `https://oauth2.googleapis.com/token`. Tests pass an in-memory fixture and assert errors never include `private_key`.

Run: `node --test tests/google-tts-client.test.mjs`

Expected: PASS, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add scripts/google-tts-client.mjs tests/google-tts-client.test.mjs
git commit -m "feat: add fail-closed Google podcast voice client"
```

### Task 4: Build one private audition and report

**Files:**
- Create: `scripts/build-podcast-audition.mjs`
- Create: `tests/podcast-audition.test.mjs`
- Create: `data/podcast-auditions/ep002-audition.json`

- [ ] **Step 1: Write a failing orchestration test**

The test passes a two-segment EP002 fixture, injected synthesizer, and temporary output directory. It asserts exactly two provider calls, one normalized master, MP3/M4A/MP4 outputs, SHA-256 values, `status: 'audition_pending_listen_approval'`, and no publish URL.

Run: `node --test tests/podcast-audition.test.mjs`

Expected: FAIL because the audition module does not exist.

- [ ] **Step 2: Implement the audition API and CLI**

Export `buildAudition({ episode, credentials, outputDir, synthesize })`. Read the EP001 policy, synthesize only the requested segments, normalize each provider file, assemble the master, encode derivatives, mux the MP4, probe every output, and write `report.json` containing policy ID, source hash, artifact hashes, probes, provider call count, and pending approval state.

The CLI must require all of:

```text
--episode EP002
--script data/podcast-auditions/ep002-audition.json
--output-dir build/podcast-audition-ep002
```

It reads `GOOGLE_TTS_SERVICE_ACCOUNT_JSON`; if missing or invalid it exits nonzero before creating audio.

- [ ] **Step 3: Add the source-locked EP002 audition input**

Create a JSON fixture whose text is copied from the already released EP002 source record and whose hash is verified against that record before synthesis:

```json
{
  "episodeId": "EP002",
  "voicePolicyId": "podcast-ep001-master-v1",
  "law": "土地徵收條例",
  "article": "16",
  "sourceOriginalTextSha256": "f4a859b184640265621c29489fa05f25b52142fdc045a66428f062e5d874669c",
  "segments": [
    { "role": "A", "text": "現在請先回答：題目考這一條時，先判斷哪一個關鍵？", "cue": true },
    { "silence": true, "seconds": 6 },
    { "role": "C", "text": "答案是，先看興辦事業性質的輕重。性質相同，才看申請先後。把口訣記成：輕重先，先後次。" }
  ]
}
```

Before committing, compare the configured hash with the current source-locked EP002 manifest. If it differs, stop with `source hash mismatch`; do not alter the hash merely to make the build pass.

- [ ] **Step 4: Run the audition unit test and all new audio tests**

Run: `node --test tests/podcast-voice-policy.test.mjs tests/google-tts-client.test.mjs tests/podcast-audio-master.test.mjs tests/podcast-audition.test.mjs`

Expected: PASS, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-podcast-audition.mjs tests/podcast-audition.test.mjs data/podcast-auditions/ep002-audition.json
git commit -m "feat: build approval-gated podcast auditions"
```

### Task 5: Add artifact-only GitHub execution

**Files:**
- Create: `.github/workflows/podcast-audio-audition.yml`
- Create: `tests/podcast-audio-audition-workflow.test.mjs`

- [ ] **Step 1: Write the failing workflow contract test**

Assert the workflow has only `workflow_dispatch`, requires an exact episode and script, passes `GOOGLE_TTS_SERVICE_ACCOUNT_JSON` from secrets, runs the audio contract suite, builds the audition, uploads only `build/podcast-audition-*`, has `contents: read`, and contains no git push, release, YouTube upload, or public deployment step.

Run: `node --test tests/podcast-audio-audition-workflow.test.mjs`

Expected: FAIL because the workflow does not exist.

- [ ] **Step 2: Add the manual workflow**

Use `actions/checkout@v7`, `actions/setup-node@v7` with Node 24, install FFmpeg, run the four new test files, run `node scripts/build-podcast-audition.mjs`, and upload the output using `actions/upload-artifact@v4`. Set artifact retention to seven days.

- [ ] **Step 3: Run workflow and Podcast contracts**

Run: `node --test tests/podcast-audio-audition-workflow.test.mjs tests/podcast-*.test.mjs tests/youtube-podcast-*.test.mjs`

Expected: PASS, 0 failures.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/podcast-audio-audition.yml tests/podcast-audio-audition-workflow.test.mjs
git commit -m "ci: add private podcast audition workflow"
```

### Task 6: Enforce the master contract at release time

**Files:**
- Modify: `scripts/youtube-podcast-readiness.mjs`
- Modify: `tests/youtube-podcast-readiness.test.mjs`
- Modify: `scripts/render-podcast-release.mjs`
- Modify: `tests/podcast-release-safety.test.mjs`

- [ ] **Step 1: Add failing readiness tests**

Extend the fixture with `voicePolicyId`, `masterSha256`, and real short FFmpeg assets. Assert readiness rejects 24 kHz mono MP3/M4A, mismatched master IDs, `Hana`, missing listening approval, and an MP4 whose audio duration differs from the M4A by more than 0.10 seconds.

Run: `node --test tests/youtube-podcast-readiness.test.mjs`

Expected: FAIL because readiness currently validates only existence and hashes.

- [ ] **Step 2: Add media probing and shared-master validation**

Import `probeAudio` from `podcast-audio-master.mjs`. Require `voicePolicyId === 'podcast-ep001-master-v1'`, 44.1 kHz stereo MP3/M4A, matching master identity, approved listening state, and MP4/M4A duration agreement. Error messages must include the episode ID and failed field, never a credential.

- [ ] **Step 3: Replace the hard-coded Hana release metadata**

In `render-podcast-release.mjs`, replace `voiceMix: ['Hana']` with:

```js
voicePolicyId: episode.voicePolicyId,
masterSha256: episode.masterSha256,
voiceMix: ['EP001 A', 'EP001 C'],
```

Add a release-safety assertion that `podcast-release.json` can no longer write Hana for a newly released episode.

- [ ] **Step 4: Run all Podcast and YouTube tests**

Run: `node --test tests/podcast-*.test.mjs tests/youtube-podcast-*.test.mjs`

Expected: PASS, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add scripts/youtube-podcast-readiness.mjs tests/youtube-podcast-readiness.test.mjs scripts/render-podcast-release.mjs tests/podcast-release-safety.test.mjs
git commit -m "fix: block podcast releases outside EP001 master contract"
```

### Task 7: Provision credentials and generate the EP002 audition

**Files:**
- No committed credential files.
- Generate locally or as a GitHub artifact: `build/podcast-audition-ep002/`

- [ ] **Step 1: Create a least-privilege Google service identity**

In Google Cloud project `sofa-engine`, create service account `sofa-podcast-tts` and grant `roles/serviceusage.serviceUsageConsumer`, which supplies `serviceusage.services.use` for the enabled Text-to-Speech API. Do not grant Owner, Editor, Viewer, Service Usage Admin, or service-agent roles. Export one JSON credential exactly once for secret upload; do not store it in the repository, iCloud, Notion, shell history, or task logs.

- [ ] **Step 2: Store the credential as a GitHub Actions secret**

Run with the JSON supplied over standard input:

```bash
gh secret set GOOGLE_TTS_SERVICE_ACCOUNT_JSON --repo 0xiao7/sofa.engine
```

Expected: command succeeds without echoing the secret. Delete the temporary downloaded JSON after `gh secret list --repo 0xiao7/sofa.engine` confirms the secret name exists.

- [ ] **Step 3: Dispatch the audition-only workflow**

Run:

```bash
gh workflow run podcast-audio-audition.yml --repo 0xiao7/sofa.engine -f episode=EP002 -f script=data/podcast-auditions/ep002-audition.json
```

Expected: workflow succeeds and creates one private artifact; no website, RSS, YouTube, ledger, or public URL changes.

- [ ] **Step 4: Download and verify the artifact**

Download the exact workflow artifact, run FFprobe on MP3/M4A/MP4, verify recorded SHA-256 values, and confirm all media gates. Open only the 30-60 second M4A for Fay listening approval.

- [ ] **Step 5: Stop at the listening gate**

Record `audition_pending_listen_approval`. Do not build full EP002, commit audio, upload to YouTube, change RSS/website, or restore Buffer marketing until Fay explicitly approves the audition.

---

## Final Verification Before Handoff

- [ ] Run `git diff --check` and expect no output.
- [ ] Run `node --test tests/podcast-*.test.mjs tests/youtube-podcast-*.test.mjs` and expect 0 failures.
- [ ] Confirm `git status --short` contains only intended plan implementation files.
- [ ] Confirm `gh secret list` shows the secret name but no credential value appears in logs or files.
- [ ] Confirm the audition report says `audition_pending_listen_approval` and contains no public URL.
- [ ] Confirm Buffer still contains no Podcast promotional schedule and all rejected YouTube EP002-EP006 videos remain private.
