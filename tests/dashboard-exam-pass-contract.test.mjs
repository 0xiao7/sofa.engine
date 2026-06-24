import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');

test('dashboard exposes exam-pass SRS controls instead of hiding freeze settings', () => {
  assert.match(html, /id="srs-settings"/);
  assert.match(html, /id="srs-freeze-mode"/);
  assert.match(html, /id="srs-daily-limit"/);
  assert.match(html, /saveSrsSettings/);
  assert.match(html, /\/api\/me\/srs-settings/);
});

test('dashboard reads review-due settings metadata and renders high-value review reasons', () => {
  assert.match(html, /renderSrsSettings/);
  assert.match(html, /dueRes\.settings/);
  assert.match(html, /importance/);
  assert.match(html, /attempt_count/);
  assert.match(html, /correct_count/);
  assert.match(html, /高價值|弱點|逾期/);
});
