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
  assert.match(active, /list="srs-push-law-options"/);
  assert.match(active, /id="srs-push-law-options"/);
  assert.match(active, /id="srs-push-order"/);
  assert.match(active, /商業會計法/);
  assert.match(active, /指定法規優先/);
  assert.match(active, /到期複習優先/);
  assert.match(active, /高重要度優先/);
});

test('dashboard uses existing exam target and a five-item default for push settings', () => {
  assert.match(active, /SRS_DEFAULT_DAILY_LIMIT\s*=\s*5/);
  assert.match(active, /value="5" aria-label="每日複習上限"/);
  assert.match(active, /function getCurrentExamKeyForSettings/);
  assert.match(active, /_entitlementState\.profile/);
  assert.match(active, /localStorage\.getItem\('sofa_exam_key'\)/);
  assert.doesNotMatch(active, /<option value="">尚未設定<\/option>/);
});

test('dashboard builds push-law options from the selected exam instead of a tiny fixed list', () => {
  assert.match(active, /function updateSrsPushLawOptions/);
  assert.match(active, /_examLawSet\(examKey\)/);
  assert.match(active, /_allKnownSrsLawNames/);
  assert.doesNotMatch(active, /<select class="srs-select" id="srs-push-law"/);
  assert.doesNotMatch(active, /<option value="加值型及非加值型營業稅法">加值型及非加值型營業稅法<\/option>\s*<\/select>/);
});

test('dashboard saves push preferences through the authenticated settings API', () => {
  assert.match(active, /push_enabled:\s*!!/);
  assert.match(active, /exam_key:\s*examKey/);
  assert.match(active, /push_law_name:\s*pushLaw/);
  assert.match(active, /push_order:\s*pushOrder/);
  assert.match(active, /API\+'\/api\/me\/srs-settings'/);
});
