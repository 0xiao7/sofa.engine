# Podcast EP007–EP009 Production Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce one source-locked, paid-Azure, three-episode private listening package for EP007–EP009, ready for one explicit user approval before any public release.

**Architecture:** Add a bounded official-source evidence document and three EP001-voice production scripts, then guard them with static content tests. Reuse the existing single-episode Azure workflow three times, download its private artifacts, and assemble a local batch review manifest that verifies every downloaded artifact hash. Public RSS, YouTube publication, and social promotion remain a separate post-approval phase.

**Tech Stack:** Node.js ESM, `node:test`, JSON contracts, Microsoft Azure Speech through GitHub Actions, FFmpeg/ffprobe, GitHub CLI

---

## File map

- `data/podcast-law-queue.json`: correct EP007–EP009 official permalinks without changing release state.
- `data/podcast-law-source-overrides.json`: bind the EP008 truncation override to the corrected official permalink.
- `data/podcast-content-qc-ep007-009.json`: durable official text, hash, delivery mode, and review evidence for this batch.
- `data/podcast-productions/ep007.json`: Article 1 A/C active-recall production script.
- `data/podcast-productions/ep008.json`: Article 1-1 A/C active-recall production script.
- `data/podcast-productions/ep009.json`: Article 2 A/C active-recall production script.
- `tests/podcast-ep007-009-content-contract.test.mjs`: static source identity, verbatim law, structure, voice, and wording guard.
- `scripts/build-podcast-batch-review.mjs`: verify downloaded private artifacts and create one review manifest.
- `tests/podcast-batch-review.test.mjs`: batch membership, provider/policy, and artifact-hash tests.

### Task 1: Correct official source identities

**Files:**
- Modify: `data/podcast-law-queue.json`
- Modify: `data/podcast-law-source-overrides.json`
- Create: `data/podcast-content-qc-ep007-009.json`
- Create: `tests/podcast-ep007-009-content-contract.test.mjs`

- [ ] **Step 1: Write the failing source-contract test**

Create `tests/podcast-ep007-009-content-contract.test.mjs` with these source assertions first:

```js
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const queue = JSON.parse(readFileSync(new URL('data/podcast-law-queue.json', root), 'utf8'));
const overrides = JSON.parse(readFileSync(new URL('data/podcast-law-source-overrides.json', root), 'utf8'));
const qc = JSON.parse(readFileSync(new URL('data/podcast-content-qc-ep007-009.json', root), 'utf8'));

const expected = {
  EP007: { article: '01', url: 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0340080&flno=1' },
  EP008: { article: '01之1', url: 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0340080&flno=1-1' },
  EP009: { article: '02', url: 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0340080&flno=2' },
};

function digest(text) {
  return createHash('sha256').update(text).digest('hex');
}

test('EP007-EP009 use corrected official permalinks and remain unreleased', () => {
  for (const [id, contract] of Object.entries(expected)) {
    const row = queue.episodes.find(episode => episode.id === id);
    assert.equal(row.exam, '記帳士');
    assert.equal(row.law, '加值型及非加值型營業稅法');
    assert.equal(row.article, contract.article);
    assert.equal(row.officialLawUrl, contract.url);
    assert.equal(row.status, 'content_verified_audio_pending');
    assert.equal(row.listenApproval.status, 'pending');
  }
  assert.equal(overrides.overrides.EP008.officialLawUrl, expected.EP008.url);
});

test('EP007-EP009 official text evidence is complete and self-hashing', () => {
  assert.deepEqual(qc.episodes.map(row => row.episodeId), ['EP007', 'EP008', 'EP009']);
  for (const row of qc.episodes) {
    assert.equal(row.officialLawUrl, expected[row.episodeId].url);
    assert.equal(row.deliveryMode, 'verbatim');
    assert.match(row.substantiveReview, /^approved(?:_after_correction)?$/);
    assert.equal(digest(row.officialOriginalText), row.officialOriginalTextSha256);
    assert.doesNotMatch(row.officialOriginalText, /買受 人|不符 免稅/);
  }
  assert.equal(
    qc.episodes.find(row => row.episodeId === 'EP008').officialOriginalText,
    '本法所稱加值型之營業稅，係指依第四章第一節計算稅額者；所稱非加值型之營業稅，係指依第四章第二節計算稅額者。',
  );
});
```

- [ ] **Step 2: Run the source test and verify RED**

Run: `node --test tests/podcast-ep007-009-content-contract.test.mjs`

Expected: FAIL because `data/podcast-content-qc-ep007-009.json` does not exist and queue URLs are still invalid.

- [ ] **Step 3: Correct queue and override URLs**

Change only these values:

```json
EP007.officialLawUrl = "https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0340080&flno=1"
EP008.officialLawUrl = "https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0340080&flno=1-1"
EP009.officialLawUrl = "https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0340080&flno=2"
overrides.EP008.officialLawUrl = "https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0340080&flno=1-1"
```

Do not change `status`, `guid`, assets, or listen approval.

- [ ] **Step 4: Add the official evidence document**

Create `data/podcast-content-qc-ep007-009.json` with `schemaVersion: 1`, `batchId: "ep007-009"`, `verifiedAt: "2026-08-19T15:00:00+08:00"`, and three rows. Use these exact text/hash pairs:

```text
EP007 1b38fe5ecccff6ac28d8ef95d77a7185ec584a825acc4d9748c0248545278691
在中華民國境內銷售貨物或勞務及進口貨物，均應依本法規定課徵加值型或非加值型之營業稅。

EP008 124dc5a27f4b18d9003664bbeb05b0cb637243fed98319373c83f3c12488fc50
本法所稱加值型之營業稅，係指依第四章第一節計算稅額者；所稱非加值型之營業稅，係指依第四章第二節計算稅額者。

EP009 e9750100cd41c71544d4ab6a5bedba7d631abb3aa631a27a83a3f208e9a84d4c
營業稅之納稅義務人如下：
一、銷售貨物或勞務之營業人。
二、進口貨物之收貨人或持有人。
三、外國之事業、機關、團體、組織，在中華民國境內無固定營業場所者，其所銷售勞務之買受人。但外國國際運輸事業，在中華民國境內無固定營業場所而有代理人者，為其代理人。
四、第八條第一項第二十七款、第二十八款規定之農業用油、漁業用油有轉讓或移作他用而不符免稅規定者，為轉讓或移作他用之人。但轉讓或移作他用之人不明者，為貨物持有人。
```

Each row also records `exam: "記帳士"`, the law name, queue article form, corrected `officialLawUrl`, `deliveryMode: "verbatim"`, and `substantiveReview: "approved_after_correction"`.

- [ ] **Step 5: Run source tests and verify GREEN**

Run: `node --test tests/podcast-ep007-009-content-contract.test.mjs tests/podcast-daily-queue.test.mjs`

Expected: source tests pass and the existing queue remains valid/pending.

- [ ] **Step 6: Commit source corrections**

```bash
git add data/podcast-law-queue.json data/podcast-law-source-overrides.json data/podcast-content-qc-ep007-009.json tests/podcast-ep007-009-content-contract.test.mjs
git commit -m "fix(podcast): lock EP007-EP009 official sources"
```

### Task 2: Add the three production scripts

**Files:**
- Create: `data/podcast-productions/ep007.json`
- Create: `data/podcast-productions/ep008.json`
- Create: `data/podcast-productions/ep009.json`
- Modify: `tests/podcast-ep007-009-content-contract.test.mjs`

- [ ] **Step 1: Add failing production-script assertions**

Append this test:

```js
test('EP007-EP009 production scripts preserve official text and the EP001 recall structure', () => {
  for (const row of qc.episodes) {
    const production = JSON.parse(readFileSync(new URL(`data/podcast-productions/${row.episodeId.toLowerCase()}.json`, root), 'utf8'));
    assert.equal(production.episodeId, row.episodeId);
    assert.equal(production.voicePolicyId, 'podcast-ep001-master-v1');
    assert.equal(production.exam, '記帳士');
    assert.equal(production.sourceOriginalTextSha256, row.officialOriginalTextSha256);
    assert.deepEqual(production.segments.map(segment => segment.silence ? 'pause' : segment.role), ['A', 'C', 'A', 'pause', 'C', 'A', 'C']);
    assert.equal(production.segments[1].text, row.officialOriginalText);
    assert.deepEqual(production.segments[3], { silence: true, seconds: 6 });
    assert.equal(production.segments[2].cue, true);
    const spoken = production.segments.map(segment => segment.text).filter(Boolean);
    assert.doesNotMatch(spoken.join('\n'), /Hana|Meijia|產品功能介紹|訂閱方案|限時優惠|立即購買|官方標準答案/);
    assert.match(spoken.at(-1), /SoFa 官網練這一條/);
  }
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/podcast-ep007-009-content-contract.test.mjs`

Expected: FAIL because the three production script files do not exist.

- [ ] **Step 3: Create `ep007.json`**

Use `voicePolicyId: "podcast-ep001-master-v1"`, the EP007 hash from Task 1, and these seven segments:

```json
[
  { "role": "A", "text": "SoFa 輕聲補一條。今天補加值型及非加值型營業稅法第一條。先聽條文原文。" },
  { "role": "C", "text": "在中華民國境內銷售貨物或勞務及進口貨物，均應依本法規定課徵加值型或非加值型之營業稅。" },
  { "role": "A", "text": "現在請先回答：本條列出哪三類課稅客體？", "cue": true },
  { "silence": true, "seconds": 6 },
  { "role": "C", "text": "答案是，境內銷售貨物、境內銷售勞務，以及進口貨物。" },
  { "role": "A", "text": "記成：境內貨、境內勞、進口貨。容易錯在看到境外就直接下結論；本條先定課稅範圍，後續仍要再看零稅率或免稅規定。" },
  { "role": "C", "text": "聽完回 SoFa 官網練這一條。" }
]
```

- [ ] **Step 4: Create `ep008.json`**

Use the EP008 official text/hash and these segments:

```json
[
  { "role": "A", "text": "SoFa 輕聲補一條。今天補加值型及非加值型營業稅法第一之一條。先聽條文原文。" },
  { "role": "C", "text": "本法所稱加值型之營業稅，係指依第四章第一節計算稅額者；所稱非加值型之營業稅，係指依第四章第二節計算稅額者。" },
  { "role": "A", "text": "現在請先回答：加值型與非加值型，各依第四章哪一節計算？", "cue": true },
  { "silence": true, "seconds": 6 },
  { "role": "C", "text": "答案是，加值型依第一節，非加值型依第二節。" },
  { "role": "A", "text": "記成：加值一、非加二。容易錯在把後續稅額計算方式，當成本條原文；這一條是直接用第四章的節次界定兩種類型。" },
  { "role": "C", "text": "聽完回 SoFa 官網練這一條。" }
]
```

- [ ] **Step 5: Create `ep009.json`**

Use the EP009 official text/hash and these segments:

```json
[
  { "role": "A", "text": "SoFa 輕聲補一條。今天補加值型及非加值型營業稅法第二條。先聽條文原文。" },
  { "role": "C", "text": "營業稅之納稅義務人如下：\n一、銷售貨物或勞務之營業人。\n二、進口貨物之收貨人或持有人。\n三、外國之事業、機關、團體、組織，在中華民國境內無固定營業場所者，其所銷售勞務之買受人。但外國國際運輸事業，在中華民國境內無固定營業場所而有代理人者，為其代理人。\n四、第八條第一項第二十七款、第二十八款規定之農業用油、漁業用油有轉讓或移作他用而不符免稅規定者，為轉讓或移作他用之人。但轉讓或移作他用之人不明者，為貨物持有人。" },
  { "role": "A", "text": "現在請先回答：本條列出哪四類納稅義務人？", "cue": true },
  { "silence": true, "seconds": 6 },
  { "role": "C", "text": "答案是，銷售貨物或勞務的營業人、進口貨物的收貨人或持有人、特定外國事業勞務的買受人或代理人，以及不符免稅規定的農漁業用油轉讓人、移作他用人或持有人。" },
  { "role": "A", "text": "記成：銷、進、外、油。第三款要分清，一般外國事業無固定營業場所時看勞務買受人；外國國際運輸事業在境內有代理人時，則由代理人負責。" },
  { "role": "C", "text": "聽完回 SoFa 官網練這一條。" }
]
```

- [ ] **Step 6: Run content and voice-policy tests**

Run:

```bash
node --test tests/podcast-ep007-009-content-contract.test.mjs tests/podcast-production.test.mjs tests/podcast-voice-policy.test.mjs tests/podcast-audio-master.test.mjs
```

Expected: all tests pass; scripts use only the approved Azure production contract.

- [ ] **Step 7: Commit production scripts**

```bash
git add data/podcast-productions/ep007.json data/podcast-productions/ep008.json data/podcast-productions/ep009.json tests/podcast-ep007-009-content-contract.test.mjs
git commit -m "feat(podcast): add EP007-EP009 Azure scripts"
```

### Task 3: Build a hash-verified batch review manifest

**Files:**
- Create: `scripts/build-podcast-batch-review.mjs`
- Create: `tests/podcast-batch-review.test.mjs`

- [ ] **Step 1: Write the failing manifest test**

The test creates temporary `EP007`, `EP008`, and `EP009` directories, writes five fake artifact files plus a matching `report.json` in each directory, then asserts:

```js
const manifest = buildBatchReview({ root, episodeIds: ['EP007', 'EP008', 'EP009'] });
assert.equal(manifest.status, 'pending_listen_approval');
assert.deepEqual(manifest.episodes.map(row => row.episodeId), ['EP007', 'EP008', 'EP009']);
assert.ok(manifest.episodes.every(row => row.provider === 'microsoft-azure-speech-paid'));
assert.ok(manifest.episodes.every(row => row.voicePolicyId === 'podcast-ep001-master-v1'));
assert.throws(() => buildBatchReview({ root, episodeIds: ['EP007', 'EP008'] }), /exactly EP007, EP008, EP009/);
```

Mutate one downloaded artifact after its report hash is recorded and assert `/artifact hash mismatch/`.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/podcast-batch-review.test.mjs`

Expected: FAIL because `scripts/build-podcast-batch-review.mjs` does not exist.

- [ ] **Step 3: Implement the manifest builder**

Export `buildBatchReview({ root, episodeIds })`. Require the exact ordered ID list, read `<root>/<EPID>/report.json`, require status `production_pending_listen_approval`, provider `microsoft-azure-speech-paid`, and voice policy `podcast-ep001-master-v1`. For `master`, `mp3`, `m4a`, `youtubeMp4`, and `vtt`, resolve the downloaded file by `basename(report.artifacts[type].path)`, calculate SHA-256, compare it with the report, and store a root-relative path plus the verified hash.

Return:

```js
{
  schemaVersion: 1,
  batchId: 'ep007-009',
  status: 'pending_listen_approval',
  createdAt: new Date().toISOString(),
  episodes,
}
```

The CLI requires `--input-root <dir> --output <file>` and writes formatted JSON atomically through `<output>.tmp` plus `renameSync`.

- [ ] **Step 4: Run manifest tests and verify GREEN**

Run: `node --test tests/podcast-batch-review.test.mjs`

Expected: all manifest tests pass, including tamper rejection.

- [ ] **Step 5: Commit the manifest builder**

```bash
git add scripts/build-podcast-batch-review.mjs tests/podcast-batch-review.test.mjs
git commit -m "feat(podcast): verify batch listening package"
```

### Task 4: Verify and merge the production-input PR

**Files:**
- Verify all committed source, scripts, tests, and docs.

- [ ] **Step 1: Run focused and full verification**

```bash
node scripts/build-podcast-law-content.mjs data/podcast-law-queue.json /tmp/podcast-law-content-ep007-009.json
node --test tests/podcast-*.test.mjs tests/azure-speech-tts-client.test.mjs
node --test tests/*.test.mjs
git diff origin/main --check
git status --short
```

Expected: the source builder completes all 30 rows using the corrected EP008 override; all focused and full tests pass; only planned files plus local planning files differ.

- [ ] **Step 2: Push and open a PR**

Push `codex/podcast-ep007-009-release-20260819`, create a PR against `main`, and include official-source URLs, exact source hashes, RED/GREEN evidence, and the explicit statement that no episode is approved or public yet.

- [ ] **Step 3: Merge after checks pass**

Wait for every required check, merge the PR, and verify the merge commit is on `origin/main` before dispatching paid production.

### Task 5: Produce and verify the private three-episode package

**Files:**
- Generated outside git under a validated temporary directory.
- No queue status, RSS, YouTube ledger, or public platform mutation.

- [ ] **Step 1: Dispatch three paid Azure production runs**

From merged `main`:

```bash
gh workflow run podcast-production.yml --ref main -f episode=EP007
gh workflow run podcast-production.yml --ref main -f episode=EP008
gh workflow run podcast-production.yml --ref main -f episode=EP009
```

Capture the newest workflow run ID immediately after each dispatch, verify its artifact name contains the expected episode ID, and then wait for all three runs to succeed. A missing secret, mismatched artifact name, or production failure stops the batch.

- [ ] **Step 2: Download the three private artifacts**

Create a new `mktemp -d` directory, store its path in `review_root`, and download each exact artifact name into its episode directory:

```bash
review_root="$(mktemp -d)"
gh run download "$ep007_run" -n podcast-production-EP007 -D "$review_root/EP007"
gh run download "$ep008_run" -n podcast-production-EP008 -D "$review_root/EP008"
gh run download "$ep009_run" -n podcast-production-EP009 -D "$review_root/EP009"
```

- [ ] **Step 3: Build the review manifest and run media QA**

```bash
node scripts/build-podcast-batch-review.mjs --input-root "$review_root" --output "$review_root/review-manifest.json"
find "$review_root" -type f \( -name '*.mp3' -o -name '*.m4a' -o -name '*-master.wav' -o -name '*-youtube.mp4' \) -print | sort > "$review_root/media-files.txt"
while IFS= read -r media_file; do
  ffprobe -v error -show_entries stream=codec_name,sample_rate,channels -show_entries format=duration -of json "$media_file"
done < "$review_root/media-files.txt"
```

Expected: manifest verifies all hashes; every audio-bearing artifact is 44,100 Hz stereo; MP3, M4A, VTT, WAV, and MP4 exist for all three episodes.

- [ ] **Step 4: Inspect the captions and listening files**

Verify all VTT files begin with `WEBVTT`, cues are time-ordered, official text appears exactly, no internal cue labels are spoken, and the final CTA is present. Provide the three M4A file links, three VTT links, review manifest, and production run URLs to the user as one review package.

- [ ] **Step 5: Stop at the approval gate**

Do not edit queue approval fields, publish RSS, upload YouTube, or schedule social posts. Record `production_pending_listen_approval` in Notion TASK_DB and CHANGELOG_DB (`是否公告=false`) with exact artifact/run evidence. The next plan begins only after the user explicitly approves EP007, EP008, and EP009 from this package.
