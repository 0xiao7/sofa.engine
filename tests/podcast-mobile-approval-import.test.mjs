import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createHash } from 'node:crypto';

import { importMobileApprovedPodcast } from '../scripts/import-mobile-approved-podcast.mjs';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'sofa-mobile-approval-'));
  const sourceRoot = join(root, 'source');
  mkdirSync(join(root, 'data', 'podcast-productions'), { recursive: true });
  mkdirSync(join(sourceRoot, 'EP008'), { recursive: true });
  const m4a = Buffer.alloc(400_000, 1);
  const mp3 = Buffer.alloc(400_000, 2);
  const vtt = Buffer.from('WEBVTT\n\n00:00:00.000 --> 00:00:01.000\n會計逐字稿\n');
  writeFileSync(join(sourceRoot, 'EP008', 'ep008.m4a'), m4a);
  writeFileSync(join(sourceRoot, 'EP008', 'ep008.mp3'), mp3);
  writeFileSync(join(sourceRoot, 'EP008', 'ep008.vtt'), vtt);
  writeFileSync(join(root, 'data', 'podcast-productions', 'ep008.json'), JSON.stringify({
    episodeId: 'EP008',
    voicePolicyId: 'podcast-ep001-master-v1',
    segments: [{ role: 'A', text: '會計逐字稿' }],
  }));
  const queuePath = join(root, 'queue.json');
  writeFileSync(queuePath, JSON.stringify({ episodes: [{
    id: 'EP008',
    status: 'content_verified_audio_pending',
    title: 'EP008', exam: '記帳士', law: '稅法', article: '2',
    assets: { mp3: null, m4a: null, vtt: null },
    assetSha256: null,
    listenApproval: { status: 'pending', approvedBy: null, approvedAt: null },
  }] }));
  const approvedAt = '2026-09-08T02:32:59.530453+00:00';
  const approvalPath = join(root, 'approval.json');
  writeFileSync(approvalPath, JSON.stringify({
    schemaVersion: 2,
    source: 'fay-bot-mobile-review',
    approvals: [{
      episodeId: 'EP008', status: 'approved', approvedBy: 'Fay', approvedAt,
      reviewId: `podcast-EP008-${sha256(m4a).slice(0, 12)}`,
      approvedAssetSha256: sha256(m4a),
    }],
  }));
  return { root, sourceRoot, queuePath, approvalPath, m4a, approvedAt };
}

test('imports one exact hash-bound mobile approval without requiring a YouTube asset', () => {
  const item = fixture();
  const result = importMobileApprovedPodcast({
    root: item.root,
    sourceRoot: item.sourceRoot,
    queuePath: item.queuePath,
    approvalPath: item.approvalPath,
    durations: { EP008: 61.2 },
  });
  assert.deepEqual(result.imported, ['EP008']);
  const row = JSON.parse(readFileSync(item.queuePath)).episodes[0];
  assert.equal(row.status, 'approved_for_release');
  assert.equal(row.duration, '00:01:01');
  assert.equal(row.listenApproval.reviewId, `podcast-EP008-${sha256(item.m4a).slice(0, 12)}`);
  assert.equal(row.listenApproval.approvedAssetSha256, sha256(item.m4a));
  assert.deepEqual(row.pronunciationReview, {
    status: 'approved',
    reviewedBy: 'Fay',
    reviewedAt: item.approvedAt,
    source: 'fay-bot-mobile-review',
    reviewId: `podcast-EP008-${sha256(item.m4a).slice(0, 12)}`,
    terms: { '會計': 'ㄎㄨㄞˋ ㄐㄧˋ' },
  });
  assert.equal(row.assets.youtubeMp4, undefined);
});

test('fails closed when the approved M4A hash does not match', () => {
  const item = fixture();
  const approval = JSON.parse(readFileSync(item.approvalPath));
  approval.approvals[0].approvedAssetSha256 = '0'.repeat(64);
  writeFileSync(item.approvalPath, JSON.stringify(approval));
  assert.throws(() => importMobileApprovedPodcast({
    root: item.root,
    sourceRoot: item.sourceRoot,
    queuePath: item.queuePath,
    approvalPath: item.approvalPath,
    durations: { EP008: 61.2 },
  }), /approved audio SHA-256 mismatch/);
  assert.equal(JSON.parse(readFileSync(item.queuePath)).episodes[0].status, 'content_verified_audio_pending');
});
