import assert from 'node:assert/strict';
import test from 'node:test';

import { buildEdgeTtsArgs } from '../scripts/edge-tts-client.mjs';

test('Edge TTS command pins the exact EP001 voice, rate, and pitch', () => {
  assert.deepEqual(buildEdgeTtsArgs({
    text: '土地徵收條例',
    voice: { name: 'zh-TW-HsiaoChenNeural', rate: '-10%', pitch: '-2Hz' },
    output: '/tmp/segment.mp3',
  }), [
    '-m', 'edge_tts',
    '--voice', 'zh-TW-HsiaoChenNeural',
    '--rate=-10%',
    '--pitch=-2Hz',
    '--text', '土地徵收條例',
    '--write-media', '/tmp/segment.mp3',
  ]);
});
