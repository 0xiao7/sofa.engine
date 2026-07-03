import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../room-v2-library.html', import.meta.url), 'utf8');

test('room v2 target plate is a moving layered scene, not a dead pasted mockup', () => {
  assert.match(html, /class="painterly-plate-mode"/);
  assert.match(html, /id="painterly-scene"/);
  assert.match(html, /room-v2-target-library-empty\.png/);
  assert.match(html, /function\s+updatePainterlyMotion/);
  assert.match(html, /--plate-x/);
  assert.match(html, /--plate-y/);
  assert.match(html, /--light-y/);
  assert.match(html, /--floor-y/);
  assert.match(html, /updatePainterlyMotion\(t\)/);
});
