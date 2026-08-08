import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import test from 'node:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { selectDueEpisode, selectDueEpisodes, validateQueue } from '../scripts/podcast-queue-lib.mjs';
import { buildContentFromSource } from '../scripts/build-podcast-law-content.mjs';
import { assertEpisodeAssets, releasePreview } from '../scripts/release-due-podcast.mjs';
import { renderEpisodeFiles } from '../scripts/render-podcast-release.mjs';

const queue = JSON.parse(readFileSync(new URL('../data/podcast-law-queue.json', import.meta.url), 'utf8'));

test('queue contains 30 source-locked nonduplicate law episodes', () => {
  const result = validateQueue(queue);
  assert.equal(result.episodes, 30);
  assert.deepEqual(queue.episodes.map(row => row.id),
    Array.from({ length: 30 }, (_, index) => `EP${String(index + 7).padStart(3, '0')}`));
});

test('queue rejects duplicate source angles', () => {
  const broken = structuredClone(queue);
  broken.episodes[1].sourceAngle = broken.episodes[0].sourceAngle;
  assert.throws(() => validateQueue(broken), /duplicate sourceAngle/);
});

test('queue rejects non-official legal sources', () => {
  const broken = structuredClone(queue);
  broken.episodes[0].officialLawUrl = 'https://example.com/law';
  assert.throws(() => validateQueue(broken), /officialLawUrl/);
});

test('queue rejects product-led episodes and PRC wording', () => {
  const product = structuredClone(queue);
  product.episodes[0].title = '產品功能介紹｜一鍵刷題';
  assert.throws(() => validateQueue(product), /exam label|product-led/);

  const prc = structuredClone(queue);
  prc.episodes[0].summary = '透過視頻與信息快速理解法規。';
  assert.throws(() => validateQueue(prc), /PRC wording/);
});

test('release selection stops at a non-approved head episode', () => {
  assert.equal(selectDueEpisode(queue, '2026-08-31T13:00:00Z'), null);
});

test('release selection returns at most three consecutive due approved episodes', () => {
  const candidate = structuredClone(queue);
  for (const [index, row] of candidate.episodes.slice(0, 4).entries()) {
    row.status = 'approved_for_release';
    row.scheduledDate = '2026-08-09';
    row.guid = `sofa-podcast-ep${String(index + 7).padStart(3, '0')}-v20260809-meijia`;
    row.duration = '00:01:10';
    row.assets = { mp3: `assets/audio/ep${index + 7}.mp3`, m4a: `assets/audio/ep${index + 7}.m4a`, vtt: `assets/audio/ep${index + 7}.vtt` };
    row.listenApproval = { status: 'approved', approvedBy: 'Fay', approvedAt: '2026-08-09T20:00:00+08:00' };
  }
  assert.deepEqual(
    selectDueEpisodes(candidate, '2026-08-09T13:00:00Z').map(row => row.id),
    ['EP007', 'EP008', 'EP009'],
  );
});

test('release selection stops before an unapproved second episode and never skips it', () => {
  const candidate = structuredClone(queue);
  for (const [index, row] of candidate.episodes.slice(0, 3).entries()) {
    row.status = 'approved_for_release';
    row.scheduledDate = '2026-08-09';
    row.guid = `sofa-podcast-ep${String(index + 7).padStart(3, '0')}-v20260809-meijia`;
    row.duration = '00:01:10';
    row.assets = { mp3: `assets/audio/ep${index + 7}.mp3`, m4a: `assets/audio/ep${index + 7}.m4a`, vtt: `assets/audio/ep${index + 7}.vtt` };
    row.listenApproval = { status: 'approved', approvedBy: 'Fay', approvedAt: '2026-08-09T20:00:00+08:00' };
  }
  candidate.episodes[1].status = 'content_verified_audio_pending';
  assert.deepEqual(selectDueEpisodes(candidate, '2026-08-09T13:00:00Z').map(row => row.id), ['EP007']);
});

test('a ready accounting episode requires an explicit Taiwan pronunciation review', () => {
  const candidate = structuredClone(queue);
  const row = candidate.episodes[0];
  row.law = '商業會計法';
  row.title = '記帳士｜商業會計法第01條：會計範圍';
  row.status = 'approved_for_release';
  row.guid = 'sofa-podcast-ep007-v20260808-hana';
  row.duration = '00:01:10';
  row.assets = { mp3: 'assets/audio/ep007.mp3', m4a: 'assets/audio/ep007.m4a', vtt: 'assets/audio/ep007.vtt' };
  row.listenApproval = { status: 'approved', approvedBy: 'Fay', approvedAt: '2026-08-08T22:40:00+08:00' };

  assert.throws(() => validateQueue(candidate), /會計 pronunciation review/);

  row.pronunciationReview = {
    status: 'approved',
    reviewedBy: 'Fay',
    reviewedAt: '2026-08-08T22:40:00+08:00',
    terms: { '會計': 'ㄎㄨㄞˋ ㄐㄧˋ' },
  };
  assert.doesNotThrow(() => validateQueue(candidate));
});

test('content builder keeps law text and stored analysis as the only body source', () => {
  const row = queue.episodes[0];
  const source = {
    title: '§ 01｜課稅範圍',
    original_text: '在中華民國境內銷售貨物或勞務及進口貨物，均依本法規定課徵加值型或非加值型之營業稅。',
    sections: {
      規範意旨與條文解析: '• 條文邏輯：境內銷售或進口，進入營業稅課稅範圍。',
      執業要點與考情提示: '• 出題焦點：先判斷交易是否落在課稅範圍。',
      核心摘要與記憶策略: '• 專業口訣：境內銷售、進口貨物。',
    },
  };
  const content = buildContentFromSource(row, source);
  assert.match(content.transcriptText, /在中華民國境內銷售貨物或勞務/);
  assert.match(content.transcriptText, /境內銷售、進口貨物/);
  assert.doesNotMatch(content.transcriptText, /產品|訂閱|優惠/);
  assert.match(content.vtt, /^WEBVTT/);
});

test('approved release assets must all exist and VTT must be valid', () => {
  const root = join(tmpdir(), `sofa-podcast-assets-${process.pid}-${Date.now()}`);
  mkdirSync(join(root, 'assets/audio'), { recursive: true });
  const row = structuredClone(queue.episodes[0]);
  row.status = 'approved_for_release';
  row.assets = {
    mp3: 'assets/audio/ep007.mp3',
    m4a: 'assets/audio/ep007.m4a',
    vtt: 'assets/audio/ep007.vtt',
  };
  row.listenApproval = { status: 'approved', approvedBy: 'Fay', approvedAt: '2026-08-07T12:00:00+08:00' };
  writeFileSync(join(root, row.assets.mp3), Buffer.alloc(301_000));
  writeFileSync(join(root, row.assets.m4a), Buffer.alloc(301_000));
  writeFileSync(join(root, row.assets.vtt), 'this file is long enough but does not contain a valid caption header');
  assert.throws(() => assertEpisodeAssets(row, root), /WEBVTT/);
  writeFileSync(join(root, row.assets.vtt), `WEBVTT\n\n00:00:00.000 --> 00:00:01.000\n法條\n`);
  assert.doesNotThrow(() => assertEpisodeAssets(row, root));
});

test('approved release scans the actual VTT for 會計 pronunciation review', () => {
  const root = join(tmpdir(), `sofa-podcast-pronunciation-${process.pid}-${Date.now()}`);
  mkdirSync(join(root, 'assets/audio'), { recursive: true });
  const row = structuredClone(queue.episodes[0]);
  row.status = 'approved_for_release';
  row.guid = 'sofa-podcast-ep007-v20260808-hana';
  row.assets = {
    mp3: 'assets/audio/ep007.mp3',
    m4a: 'assets/audio/ep007.m4a',
    vtt: 'assets/audio/ep007.vtt',
  };
  row.listenApproval = { status: 'approved', approvedBy: 'Fay', approvedAt: '2026-08-08T22:40:00+08:00' };
  writeFileSync(join(root, row.assets.mp3), Buffer.alloc(301_000));
  writeFileSync(join(root, row.assets.m4a), Buffer.alloc(301_000));
  writeFileSync(join(root, row.assets.vtt), 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\n本集說明會計處理。\n');

  assert.throws(() => assertEpisodeAssets(row, root), /會計 pronunciation review/);

  row.pronunciationReview = {
    status: 'approved',
    reviewedBy: 'Fay',
    reviewedAt: '2026-08-08T22:40:00+08:00',
    terms: { '會計': 'ㄎㄨㄞˋ ㄐㄧˋ' },
  };
  assert.doesNotThrow(() => assertEpisodeAssets(row, root));
});

test('release preview reports all selected episode IDs for a three-episode batch', () => {
  const root = join(tmpdir(), `sofa-podcast-three-release-${process.pid}-${Date.now()}`);
  mkdirSync(join(root, 'assets/audio'), { recursive: true });
  const candidate = structuredClone(queue);
  for (const [index, row] of candidate.episodes.slice(0, 3).entries()) {
    const number = String(index + 7).padStart(3, '0');
    row.status = 'approved_for_release';
    row.scheduledDate = '2026-08-09';
    row.guid = `sofa-podcast-ep${number}-v20260809-meijia`;
    row.duration = '00:01:10';
    row.assets = { mp3: `assets/audio/ep${number}.mp3`, m4a: `assets/audio/ep${number}.m4a`, vtt: `assets/audio/ep${number}.vtt` };
    row.listenApproval = { status: 'approved', approvedBy: 'Fay', approvedAt: '2026-08-09T20:00:00+08:00' };
    writeFileSync(join(root, row.assets.mp3), Buffer.alloc(301_000));
    writeFileSync(join(root, row.assets.m4a), Buffer.alloc(301_000));
    writeFileSync(join(root, row.assets.vtt), 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\n法條內容\n');
  }
  const result = releasePreview(candidate, '2026-08-09T13:00:00Z', root);
  assert.deepEqual(result.episodeIds, ['EP007', 'EP008', 'EP009']);
});

test('renderer appends one law episode to manifest, RSS and website', () => {
  const root = join(tmpdir(), `sofa-podcast-render-${process.pid}-${Date.now()}`);
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, 'podcast-release.json'), JSON.stringify({ show: { artwork: 'assets/cover.jpg' }, episodes: [] }));
  writeFileSync(join(root, 'podcast.xml'), '<rss><channel>\n  </channel></rss>');
  writeFileSync(join(root, 'podcast.html'), '<div class="release-grid">\n    </div>\n  </section>\n\n  <section class="listening-stage">');
  mkdirSync(join(root, 'assets/audio'), { recursive: true });
  writeFileSync(join(root, 'assets/audio/ep007.m4a'), Buffer.alloc(301_000));
  const row = { ...structuredClone(queue.episodes[0]), status: 'approved_for_release', duration: '00:01:10', pubDate: 'Sat, 08 Aug 2026 13:00:00 +0000', guid: 'sofa-podcast-ep007-v20260808-hana', assets: { mp3: 'assets/audio/ep007.mp3', m4a: 'assets/audio/ep007.m4a', vtt: 'assets/audio/ep007.vtt' } };
  const content = { transcriptText: '法條逐字稿', originalText: '正式法條原文', sourceOriginalTextSha256: 'a'.repeat(64), sourceAnalysisSha256: 'b'.repeat(64) };
  renderEpisodeFiles({ root, episode: row, content });
  assert.match(readFileSync(join(root, 'podcast-release.json'), 'utf8'), /EP007/);
  assert.match(readFileSync(join(root, 'podcast.xml'), 'utf8'), /sofa-podcast-ep007-v20260808-hana/);
  assert.match(readFileSync(join(root, 'podcast.html'), 'utf8'), /id="episode-007"/);
});
