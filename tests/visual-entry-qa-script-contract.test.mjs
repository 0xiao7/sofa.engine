import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const script = readFileSync(new URL('../scripts/visual-entry-qa.cjs', import.meta.url), 'utf8');

test('visual entry QA covers dashboard first-layer entries across mobile and desktop', () => {
  assert.match(script, /dashboardCase/);
  assert.match(script, /width:\s*390,\s*height:\s*844/);
  assert.match(script, /width:\s*1440,\s*height:\s*900/);
  assert.match(script, /#study-cockpit-recap a\[href="quiz\.html\?open=weakness"\]/);
  assert.match(script, /#mobile-daily-bar a\[href="quiz\.html\?open=weakness"\]/);
  assert.match(script, /#mobile-daily-bar a\[href="#review-due"\]/);
  assert.match(script, /aside\.side a\[href="quiz\.html\?open=weakness"\]/);
  assert.match(script, /#study-cockpit-weak-state/);
  assert.match(script, /弱點已接入/);
});

test('visual entry QA checks quiz post-answer actions and article deep link', () => {
  assert.match(script, /quizCase/);
  assert.match(script, /#view-article-btn/);
  assert.match(script, /#view-weakness-btn/);
  assert.match(script, /#btnNext/);
  assert.match(script, /#btnFlag/);
  assert.match(script, /_openArticleDashboard\(\)/);
  assert.match(script, /dashboard\\\.html\\\?open=visual-page-id&law=/);
});

test('visual entry QA checks free retention serial entry on mobile', () => {
  assert.match(script, /freeRetentionCase/);
  assert.match(script, /quiz\.html\?free=1/);
  assert.match(script, /輸入序號保留紀錄/);
  assert.match(script, /dashboard\.html/);
  assert.match(script, /輸入序號保留進度/);
  assert.match(script, /sofa-visual-free-retention-mobile\.png/);
});

test('visual entry QA checks stats overlay source wording', () => {
  assert.match(script, /statsCase/);
  assert.match(script, /#stats-panel/);
  assert.match(script, /#tab-btn-wrong/);
  assert.match(script, /每日一題/);
  assert.match(script, /LINE 作答/);
  assert.match(script, /考古題/);
});

test('visual entry QA is safe to run without production writes', () => {
  assert.match(script, /page\.route\('https:\/\/sofa-engine-api\.onrender\.com\/\*\*'/);
  assert.match(script, /route\.fulfill/);
  assert.doesNotMatch(script, /route\.continue/);
  assert.doesNotMatch(script, /POST/);
});
