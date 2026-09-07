import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const quiz = readFileSync(new URL('../quiz.html', import.meta.url), 'utf8');

test('quiz boot waits for the account exam before building the law list', () => {
  const boot = quiz.match(/\(async\(\)=>\{[\s\S]*?_setQuizBootReady\(false\);[\s\S]*?\n\}\)\(\);/)?.[0] || '';
  assert.match(boot, /await _pastExamCapabilityReady/);
  assert.match(boot, /let examKey\s*=\s*_resolvedQuestionExamKey\(\)/);
  assert.doesNotMatch(boot, /let examKey\s*=\s*localStorage\.getItem/);
});

test('every normal quiz API request carries the resolved exam key', () => {
  assert.match(quiz, /function _quizScopedApiUrl/);
  assert.match(quiz, /searchParams\.set\(['"]exam_key['"],\s*examKey\)/);
  const guarded = quiz.match(/async function fetchQuizWithRecentGuard[\s\S]*?\n\}/)?.[0] || '';
  assert.match(guarded, /_quizScopedApiUrl\(url\)/);
  assert.match(guarded, /if\(!url\)return \{detail:/);
});

test('unknown exam scope never falls back to bookkeeper questions', () => {
  const filter = quiz.match(/function _filterLawsForExam[\s\S]*?\n\}/)?.[0] || '';
  const scoped = quiz.match(/function _quizScopedLaw[\s\S]*?\n\}/)?.[0] || '';
  assert.match(filter, /if\(!scope\)return \[\]/);
  assert.doesNotMatch(filter, /return _filterLawsForExam\(laws,'bookkeeper'\)/);
  assert.doesNotMatch(scoped, /_BOOKKEEPER_LAWS/);
});
