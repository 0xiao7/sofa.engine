import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import test from 'node:test';

import { buildAudition } from '../scripts/build-podcast-audition.mjs';

test('audition builds one shared private master without publishing', async () => {
  const root = mkdtempSync(join(tmpdir(), 'sofa-audition-test-'));
  const provider = join(root, 'provider.wav');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=24000:duration=1', '-ac', '1', provider]);
  const providerBytes = readFileSync(provider);
  let calls = 0;
  const report = await buildAudition({
    episode: {
      episodeId: 'EP002',
      voicePolicyId: 'podcast-ep001-master-v1',
      sourceOriginalTextSha256: 'f4a859b184640265621c29489fa05f25b52142fdc045a66428f062e5d874669c',
      segments: [
        { role: 'A', text: '先回答這一題', cue: true },
        { silence: true, seconds: 1 },
        { role: 'C', text: '答案是輕重先，先後次' },
      ],
    },
    outputDir: relative(process.cwd(), join(root, 'output')),
    artwork: join(process.cwd(), 'assets/podcast-cover-3000.png'),
    synthesize: async () => {
      calls += 1;
      return providerBytes;
    },
  });
  assert.equal(calls, 2);
  assert.equal(report.status, 'audition_pending_listen_approval');
  assert.equal(report.providerCallCount, 2);
  assert.equal(report.voicePolicyId, 'podcast-ep001-master-v1');
  assert.equal(report.publicUrl, undefined);
  for (const type of ['master', 'mp3', 'm4a', 'youtubeMp4', 'vtt']) {
    assert.match(report.artifacts[type].sha256, /^[0-9a-f]{64}$/);
  }
  assert.match(readFileSync(report.artifacts.vtt.path, 'utf8'), /^WEBVTT\n\n1\n00:00:00\.000 --> /);
  assert.match(readFileSync(report.artifacts.vtt.path, 'utf8'), /先回答這一題/);
  assert.match(readFileSync(report.artifacts.vtt.path, 'utf8'), /答案是輕重先，先後次/);
  assert.equal(report.artifacts.master.probe.sampleRate, 44100);
  assert.equal(report.artifacts.master.probe.channels, 2);
});
