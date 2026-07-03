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

test('room v2 library has seated study companion and study-time flower layers', () => {
  assert.match(html, /id="seated-reader"/);
  assert.match(html, /class="seated-reader"/);
  assert.match(html, /assets\/room-v2-seated-reader-girl\.png/);
  assert.doesNotMatch(html, /id="soft-avatar"/);
  assert.doesNotMatch(html, /avatar-soft-walk|avatar-walk-bob/);
  assert.doesNotMatch(html, /\.avatar-head|\.avatar-body|\.avatar-leg|\.avatar-arm/);
  assert.match(html, /id="study-flower"/);
  assert.match(html, /data-stage="0"/);
  assert.match(html, /function\s+updateStudyFlower/);
  assert.match(html, /quietMinutes/);
  assert.match(html, /USERS\[0\]\?\.min/);
  assert.doesNotMatch(html, /weekPts|rank|leaderboard|score/i);
});

test('room v2 separates library reading from island walking', () => {
  assert.match(html, /data-scene="library"/);
  assert.match(html, /id="btn-scene"/);
  assert.match(html, /function\s+setSceneMode/);
  assert.match(html, /room-v2-target-island-empty\.png/);
  assert.match(html, /id="island-walker"/);
  assert.match(html, /assets\/room-v2-companion-back\.png/);
  assert.match(html, /body\[data-scene="library"\][\s\S]*#island-walker\{display:none/);
  assert.match(html, /body\[data-scene="island"\][\s\S]*#seated-reader\{display:none/);
});
