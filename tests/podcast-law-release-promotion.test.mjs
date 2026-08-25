import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { promotePodcastLawRelease } from '../scripts/promote-podcast-law-release.mjs';

const IDS = ['EP007', 'EP008', 'EP009'];
const TYPES = ['mp3', 'm4a', 'vtt', 'youtubeMp4'];

function sha(value) {
  return createHash('sha256').update(value).digest('hex');
}

function fixture() {
  const root = join(tmpdir(), `podcast-law-promote-${process.pid}-${Date.now()}-${Math.random()}`);
  const sourceRoot = join(root, 'source');
  const queuePath = join(root, 'data', 'podcast-law-queue.json');
  const reviewManifestPath = join(sourceRoot, 'review-manifest.json');
  const approvalPath = join(sourceRoot, 'listen-approval.json');
  mkdirSync(join(root, 'data', 'podcast-productions'), { recursive: true });
  const episodes = [];
  const reviews = [];
  for (const [index, id] of IDS.entries()) {
    const lower = id.toLowerCase();
    const sourceDir = join(sourceRoot, id, `podcast-production-${id}`);
    mkdirSync(sourceDir, { recursive: true });
    const artifacts = {};
    for (const type of TYPES) {
      const suffix = type === 'youtubeMp4' ? '-youtube.mp4' : `.${type}`;
      const value = Buffer.from(`${id}-${type}`);
      writeFileSync(join(sourceDir, `${lower}${suffix}`), value);
      artifacts[type] = { sha256: sha(value), ...(type === 'm4a' ? { probe: { duration: 54.668005 } } : {}) };
    }
    writeFileSync(join(sourceDir, `${lower}-master.wav`), `${id}-master`);
    artifacts.master = { sha256: sha(Buffer.from(`${id}-master`)) };
    const sourceOriginalTextSha256 = sha(Buffer.from(`${id}-source`));
    writeFileSync(join(sourceDir, 'report.json'), JSON.stringify({
      episodeId: id,
      provider: 'microsoft-azure-speech-paid',
      voicePolicyId: 'podcast-ep001-master-v1',
      status: 'production_pending_listen_approval',
      sourceOriginalTextSha256,
      artifacts,
    }));
    writeFileSync(join(root, 'data', 'podcast-productions', `${lower}.json`), JSON.stringify({
      episodeId: id,
      voicePolicyId: 'podcast-ep001-master-v1',
      sourceOriginalTextSha256,
      segments: [{ role: 'A', text: `${id} 逐字稿第一段。` }, { silence: true, seconds: 6 }, { role: 'C', text: `${id} 逐字稿第二段。` }],
    }));
    episodes.push({
      id,
      scheduledDate: `2026-08-${String(8 + index).padStart(2, '0')}`,
      status: 'content_verified_audio_pending',
      exam: '記帳士',
      law: '加值型及非加值型營業稅法',
      article: String(index + 1).padStart(2, '0'),
      title: `記帳士｜測試 ${id}`,
      summary: `${id} 摘要`,
      officialLawUrl: `https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0340080&flno=${index + 1}`,
      utmCampaign: `podcast_episode_${id.slice(2)}_law`,
      guid: `sofa-podcast-${lower}-pending`,
      assets: { mp3: null, m4a: null, vtt: null },
      listenApproval: { status: 'pending', approvedBy: null, approvedAt: null },
    });
    reviews.push({ episodeId: id, provider: 'microsoft-azure-speech-paid', voicePolicyId: 'podcast-ep001-master-v1', sourceOriginalTextSha256, artifacts });
  }
  writeFileSync(queuePath, JSON.stringify({ schemaVersion: 1, timezone: 'Asia/Taipei', releaseTime: '21:00', minimumReadyBuffer: 10, episodes }));
  writeFileSync(reviewManifestPath, JSON.stringify({ schemaVersion: 1, batchId: 'ep007-009', status: 'pending_listen_approval', episodes: reviews }));
  return { root, sourceRoot, queuePath, reviewManifestPath, approvalPath };
}

test('promotion fails closed before a real three-episode listen approval and writes nothing', () => {
  const f = fixture();
  const before = readFileSync(f.queuePath, 'utf8');
  assert.throws(() => promotePodcastLawRelease(f), /listen approval file|approved/);
  assert.equal(readFileSync(f.queuePath, 'utf8'), before);
  assert.equal(existsSync(join(f.root, 'assets', 'audio')), false);
});

test('validate-only proves private artifacts without inventing approval or writing release state', () => {
  const f = fixture();
  const before = readFileSync(f.queuePath, 'utf8');
  const result = promotePodcastLawRelease({ ...f, validateOnly: true });
  assert.deepEqual(result, { validated: IDS, status: 'pending_listen_approval', mutated: false });
  assert.equal(readFileSync(f.queuePath, 'utf8'), before);
  assert.equal(existsSync(join(f.root, 'assets', 'audio')), false);
});

test('validate-only rejects a corrupted private master before any release write', () => {
  const f = fixture();
  writeFileSync(join(f.sourceRoot, 'EP008', 'podcast-production-EP008', 'ep008-master.wav'), 'corrupted-master');
  const before = readFileSync(f.queuePath, 'utf8');
  assert.throws(() => promotePodcastLawRelease({ ...f, validateOnly: true }), /EP008 master SHA-256 mismatch/);
  assert.equal(readFileSync(f.queuePath, 'utf8'), before);
  assert.equal(existsSync(join(f.root, 'assets', 'audio')), false);
});

test('approved promotion stages exact assets and queue metadata without publishing surfaces', () => {
  const f = fixture();
  writeFileSync(f.approvalPath, JSON.stringify({
    schemaVersion: 1,
    batchId: 'ep007-009',
    status: 'approved',
    approvedBy: 'Fay',
    approvedAt: '2026-08-26T20:00:00+08:00',
    episodes: IDS,
  }));

  const result = promotePodcastLawRelease(f);
  assert.deepEqual(result.promoted, IDS);
  const queue = JSON.parse(readFileSync(f.queuePath, 'utf8'));
  for (const row of queue.episodes) {
    assert.equal(row.status, 'approved_for_release');
    assert.deepEqual(row.listenApproval, { status: 'approved', approvedBy: 'Fay', approvedAt: '2026-08-26T20:00:00+08:00' });
    assert.equal(row.voicePolicyId, 'podcast-ep001-master-v1');
    assert.deepEqual(row.voiceMix, ['EP001 A', 'EP001 C']);
    assert.equal(row.duration, '00:00:55');
    assert.match(row.transcriptExcerpt, /逐字稿第一段/);
    assert.doesNotMatch(row.guid, /pending$/);
    for (const type of TYPES) {
      assert.ok(row.assets[type]);
      assert.ok(existsSync(join(f.root, row.assets[type])));
      assert.match(row.assetSha256[type], /^[0-9a-f]{64}$/);
    }
    assert.equal(row.masterSha256, row.assetSha256.m4a);
  }
  assert.equal(existsSync(join(f.root, 'podcast.html')), false);
  assert.equal(existsSync(join(f.root, 'podcast.xml')), false);
  assert.equal(existsSync(join(f.root, 'data', 'youtube-podcast-ledger.json')), false);
});
