import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');

test('dashboard exposes LINE push preferences in the website settings panel', () => {
  assert.match(active, /id="srs-push-enabled"/);
  assert.match(active, /LINE 每日推播/);
  assert.match(active, /id="srs-exam-key"/);
  assert.match(active, /id="srs-push-law"/);
  assert.match(active, /id="srs-push-order"/);
  assert.match(active, /商業會計法/);
  assert.match(active, /指定法規優先/);
  assert.match(active, /到期複習優先/);
  assert.match(active, /高重要度優先/);
});

test('dashboard saves push preferences through the authenticated settings API', () => {
  assert.match(active, /push_enabled:\s*!!/);
  assert.match(active, /exam_key:\s*examKey/);
  assert.match(active, /push_law_name:\s*pushLaw/);
  assert.match(active, /push_order:\s*pushOrder/);
  assert.match(active, /API\+'\/api\/me\/srs-settings'/);
});
