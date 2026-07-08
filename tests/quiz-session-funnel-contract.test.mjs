import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const analytics = readFileSync(new URL('../sofa-analytics.js', import.meta.url), 'utf8');
const quiz = readFileSync(new URL('../quiz.html', import.meta.url), 'utf8');

test('deferred quiz session funnel is forwarded to the server', () => {
  assert.match(analytics, /\['quiz_session_start', 'quiz_session_start'\]/);
  assert.match(analytics, /\['quiz_session_complete', 'quiz_session_complete'\]/);
  assert.match(analytics, /\['quiz_session_save_click', 'quiz_session_save_click'\]/);
  assert.match(analytics, /\['quiz_session_pricing_click', 'quiz_session_pricing_click'\]/);
});

test('quiz session mode tracks start and completion without showing answers early', () => {
  assert.match(quiz, /function trackQuizSessionEvent\(name, data\)/);
  assert.match(quiz, /trackQuizSessionEvent\('quiz_session_start'/);
  assert.match(quiz, /trackQuizSessionEvent\('quiz_session_complete'/);
  assert.match(quiz, /target_count: _sessionTargetCount/);
  assert.match(quiz, /answered: answered_n/);
  assert.match(quiz, /correct: right/);
  assert.match(quiz, /wrong: wrong/);
  assert.match(quiz, /accuracy: acc/);
  assert.match(quiz, /if\(!_sessionMode&&jCorrect\)b\.classList\.add\('right'\)/);
});

test('quiz session summary buttons deep-link to save and upgrade flows', () => {
  assert.match(quiz, /href="login\.html\?utm_source=web_quiz&utm_medium=session_summary&utm_campaign=quiz_session_save"/);
  assert.match(quiz, /data-track-event="quiz_session_save_click"/);
  assert.match(quiz, /data-track-label="quiz_session_save"/);
  assert.match(quiz, /href="pricing\.html\?utm_source=web_quiz&utm_medium=session_summary&utm_campaign=quiz_session_upgrade"/);
  assert.match(quiz, /data-track-event="quiz_session_pricing_click"/);
  assert.match(quiz, /data-track-label="quiz_session_pricing"/);
});
