import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { buildBatchReview } from '../scripts/build-podcast-batch-review.mjs';

const artifactTypes = {
  master: episode => `${episode.toLowerCase()}-master.wav`,
  mp3: episode => `${episode.toLowerCase()}.mp3`,
  m4a: episode => `${episode.toLowerCase()}.m4a`,
  youtubeMp4: episode => `${episode.toLowerCase()}-youtube.mp4`,
  vtt: episode => `${episode.toLowerCase()}.vtt`,
};

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function writeEpisode(root, episodeId) {
  const directory = join(root, episodeId);
  mkdirSync(directory, { recursive: true });
  const artifacts = {};
  for (const [type, nameFor] of Object.entries(artifactTypes)) {
    const name = nameFor(episodeId);
    const content = type === 'vtt' ? `WEBVTT\n\n${episodeId}\n` : Buffer.from(`${episodeId}-${type}`);
    writeFileSync(join(directory, name), content);
    artifacts[type] = {
      path: `/home/runner/work/SoFa.Engine/build/podcast-production-${episodeId}/${name}`,
      sha256: sha256(content),
    };
  }
  writeFileSync(join(directory, 'report.json'), `${JSON.stringify({
    episodeId,
    status: 'production_pending_listen_approval',
    provider: 'microsoft-azure-speech-paid',
    voicePolicyId: 'podcast-ep001-master-v1',
    sourceOriginalTextSha256: sha256(`${episodeId}-source`),
    artifacts,
  }, null, 2)}\n`);
}

test('batch review verifies the exact three paid Azure candidates', () => {
  const root = mkdtempSync(join(tmpdir(), 'sofa-podcast-batch-review-'));
  for (const episodeId of ['EP007', 'EP008', 'EP009']) writeEpisode(root, episodeId);

  const manifest = buildBatchReview({ root, episodeIds: ['EP007', 'EP008', 'EP009'] });
  assert.equal(manifest.status, 'pending_listen_approval');
  assert.deepEqual(manifest.episodes.map(row => row.episodeId), ['EP007', 'EP008', 'EP009']);
  assert.ok(manifest.episodes.every(row => row.provider === 'microsoft-azure-speech-paid'));
  assert.ok(manifest.episodes.every(row => row.voicePolicyId === 'podcast-ep001-master-v1'));
  assert.throws(
    () => buildBatchReview({ root, episodeIds: ['EP007', 'EP008'] }),
    /exactly EP007, EP008, EP009/,
  );

  writeFileSync(join(root, 'EP009', 'ep009.mp3'), 'tampered');
  assert.throws(
    () => buildBatchReview({ root, episodeIds: ['EP007', 'EP008', 'EP009'] }),
    /EP009 mp3 artifact hash mismatch/,
  );
});
