import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const share = readFileSync(new URL('../share.html', import.meta.url), 'utf8');
const sitemap = readFileSync(new URL('../sitemap.xml', import.meta.url), 'utf8');

test('share.html remains a local demo surface, not a formal answer ledger source', () => {
  assert.doesNotMatch(share, /\/api\/me\/answer/);
  assert.doesNotMatch(share, /sofa_wrong_ids/);
  assert.doesNotMatch(share, /quiz_sessions/);
  assert.doesNotMatch(share, /user_stats/);
  assert.doesNotMatch(share, /\/api\/me\/weak-laws/);
  assert.doesNotMatch(share, /\/api\/me\/quiz-stats/);
  assert.match(share, /fs_wpm/);
  assert.match(share, /fs_today/);
  assert.match(share, /data-formal-answer-surface="false"/);
});

test('share.html tells users its sample questions are local-only', () => {
  assert.match(share, /展示練習/);
  assert.match(share, /不併入正式答題統計/);
  assert.match(share, /正式弱點分析請使用選擇題、填空或打字練習/);
});

test('share.html is not advertised as a public canonical app surface', () => {
  assert.match(share, /<meta name="robots" content="noindex,nofollow">/);
  assert.doesNotMatch(sitemap, /https:\/\/sofaengine\.org\/share\.html/);
});
