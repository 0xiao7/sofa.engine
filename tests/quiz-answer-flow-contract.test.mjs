import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../quiz.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');

test('post-answer actions place next question next to view article', () => {
  assert.match(active, /id="quiz-answer-actions"/);
  const start = active.indexOf('id="quiz-answer-actions"');
  const end = active.indexOf('id="explainBox"', start);
  assert.ok(start >= 0 && end > start, 'quiz answer action row must exist before explanation box');
  const actionRow = active.slice(start, end);
  assert.match(actionRow, /id="view-article-btn"/);
  assert.match(actionRow, /id="btnNext"/);
});

test('quiz weakness rail fetches authenticated weak-laws fallback', () => {
  assert.match(active, /\/api\/me\/weak-laws/);
  assert.match(active, /function _renderRemoteWeakLaws/);
  assert.match(active, /不用自己判斷哪裡弱/);
  assert.match(active, /startSession\(5\)/);
});

test('session mode advances quickly after each answer without changing normal mode', () => {
  assert.match(active, /const SESSION_AUTO_NEXT_DELAY_MS = 260/);
  const onAnswerStart = active.indexOf('function onAnswerDone');
  assert.ok(onAnswerStart >= 0, 'onAnswerDone must exist');
  const onAnswerEnd = active.indexOf('function showSessionSummary', onAnswerStart);
  const onAnswer = active.slice(onAnswerStart, onAnswerEnd);
  assert.match(onAnswer, /if \(!_sessionMode\) return/);
  assert.match(onAnswer, /setTimeout\(\(\) => \{ wrongMode \? loadWrongQuiz\(\) : loadQuiz\(\); \}, SESSION_AUTO_NEXT_DELAY_MS\)/);
  assert.doesNotMatch(onAnswer, /1200/);
});
