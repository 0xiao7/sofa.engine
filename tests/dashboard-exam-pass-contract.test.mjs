import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');

// Active markup with HTML comments stripped, so commented-out entries do not
// count as live UI / navigation for this exam-pass task.
const active = html.replace(/<!--[\s\S]*?-->/g, '');

test('dashboard wires the exam-pass review-due endpoint', () => {
  assert.match(active, /\/api\/me\/review-due/);
});

test('dashboard wires the SRS settings endpoint', () => {
  assert.match(active, /\/api\/me\/srs-settings/);
});

test('dashboard exposes freeze_mode UI', () => {
  assert.match(active, /id="srs-freeze-mode"/);
  assert.match(active, /freeze_mode/);
});

test('dashboard exposes daily_review_limit UI', () => {
  assert.match(active, /id="srs-daily-limit"/);
  assert.match(active, /daily_review_limit/);
});

test('dashboard offers a quiz.html?open=weakness entry point', () => {
  assert.match(active, /quiz\.html\?open=weakness/);
});

test('room.html is not the active entry point for the exam-pass task', () => {
  assert.doesNotMatch(active, /href="room\.html"/);
});
