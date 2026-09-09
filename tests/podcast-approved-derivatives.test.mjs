import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApproximateVtt } from '../scripts/build-approved-podcast-derivatives.mjs';

test('builds complete ordered segment captions across the approved audio duration', () => {
  const vtt = buildApproximateVtt([
    { role: 'A', text: '第一段。' },
    { silence: true, seconds: 2 },
    { role: 'C', text: '第二段比較長。' },
  ], 12);
  assert.match(vtt, /^WEBVTT/);
  assert.match(vtt, /第一段。/);
  assert.match(vtt, /第二段比較長。/);
  assert.match(vtt, /00:00:12\.000/);
  assert.ok(vtt.indexOf('第一段。') < vtt.indexOf('第二段比較長。'));
});
