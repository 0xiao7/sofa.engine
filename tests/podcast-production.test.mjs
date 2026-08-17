import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { buildProduction } from '../scripts/build-podcast-production.mjs';

test('public production candidate uses the paid Azure provider and stays approval-gated', async () => {
  const root = mkdtempSync(join(tmpdir(), 'sofa-production-test-'));
  const provider = join(root, 'provider.wav');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=24000:duration=1', '-ac', '1', provider]);
  const report = await buildProduction({
    episode: {
      episodeId: 'EP003',
      voicePolicyId: 'podcast-ep001-master-v1',
      sourceOriginalTextSha256: '3915aa7a2f9f9b6933095fbc68543f9fe0a5b65f44afb7af0d868c43fae4c8cd',
      segments: [{ role: 'A', text: '商業登記法第十條' }],
    },
    outputDir: join(root, 'output'),
    artwork: join(process.cwd(), 'assets/podcast-cover-3000.png'),
    synthesize: async () => readFileSync(provider),
  });
  assert.equal(report.provider, 'microsoft-azure-speech-paid');
  assert.equal(report.status, 'production_pending_listen_approval');
  assert.equal(report.publicUrl, undefined);
  assert.match(report.artifacts.vtt.sha256, /^[0-9a-f]{64}$/);
});
