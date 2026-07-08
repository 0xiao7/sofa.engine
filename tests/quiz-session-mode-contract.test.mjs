import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../quiz.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');

test('session mode is enabled by URL and uses a bounded question count', () => {
  assert.match(active, /const _sessionMode = _searchParams\.get\('session'\) === '1' \|\| _searchParams\.get\('mode'\) === 'session'/);
  assert.match(active, /function parseSessionTargetCount\(\)/);
  assert.match(active, /Math\.min\(30, Math\.max\(1, raw\)\)/);
  assert.match(active, /const _sessionTargetCount = parseSessionTargetCount\(\)/);
});

test('session mode has a visible summary card with save actions', () => {
  assert.match(active, /id="session-summary"/);
  assert.match(active, /id="session-summary-title"/);
  assert.match(active, /id="session-summary-stats"/);
  assert.match(active, /先登入保存這輪紀錄/);
  assert.match(active, /href="login\.html\?utm_source=web_quiz&utm_medium=session_summary&utm_campaign=quiz_session_save"/);
  assert.match(active, /href="pricing\.html\?utm_source=web_quiz&utm_medium=session_summary&utm_campaign=quiz_session_upgrade"/);
});

test('session answers record progress but defer correctness and explanation', () => {
  assert.match(active, /function onAnswerDone\(isCorrect, loader\)/);
  const start = active.indexOf('function onAnswerDone');
  const end = active.indexOf('function showSessionSummary', start);
  assert.ok(start >= 0 && end > start, 'onAnswerDone must be before showSessionSummary');
  const fn = active.slice(start, end);
  assert.match(fn, /if \(!_sessionMode\) return false/);
  assert.match(fn, /sessionHistory\.filter\(q=>q\.correct!==null\)\.length >= _sessionTargetCount/);
  assert.match(fn, /showSessionSummary\(\)/);
  assert.match(fn, /setTimeout\(\(\) => \{ wrongMode \? loadWrongQuiz\(\) : loadQuiz\(\); \}, SESSION_AUTO_NEXT_DELAY_MS\)/);
  assert.match(active, /if\(onAnswerDone\(isCorrect, loadQuiz\)\) return/);
  assert.match(active, /document\.getElementById\('explainBox'\)\.style\.display='block'/);
});

test('session mode copy separates free practice from saved records', () => {
  assert.match(active, /刷題模式/);
  assert.match(active, /先做完這組題目，再一次看結果/);
  assert.match(active, /免費可先刷題；登入後才會保留完整紀錄與弱點統計/);
});
