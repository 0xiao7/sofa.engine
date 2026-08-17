import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const policy = JSON.parse(readFileSync(new URL('../data/podcast-voice-policy-ep001-v1.json', import.meta.url)));

test('EP001 is the immutable public voice and media reference', () => {
  assert.equal(policy.id, 'podcast-ep001-master-v1');
  assert.equal(policy.referenceAsset, 'assets/audio/sofa-podcast-001.m4a');
  assert.deepEqual(policy.voices.map(row => row.name), [
    'zh-TW-HsiaoChenNeural',
    'zh-TW-YunJheNeural',
  ]);
  assert.equal(policy.provider, 'microsoft-azure-speech-paid');
  assert.equal(policy.privateAuditionProvider, 'microsoft-edge-tts');
  assert.equal(policy.productionRights, 'paid-tier-commercial-output');
  assert.deepEqual(policy.voices.map(row => row.rate), ['-10%', '-10%']);
  assert.deepEqual(policy.voices.map(row => row.pitch), ['-2Hz', '-3Hz']);
  assert.equal(policy.media.sampleRate, 44100);
  assert.equal(policy.media.channels, 2);
  assert.equal(policy.media.thinkingPauseSeconds, 6);
  assert.equal(policy.fallback, 'blocked');
  assert.deepEqual(policy.distribution, ['website', 'rss', 'youtube']);
});
