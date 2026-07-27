import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const quiz = read('quiz.html');
const fill = read('fill.html');
const practice = read('practice.html');
const room = read('room.html');

test('mobile past-exam mode keeps both subject and year selectors available', () => {
  const mobile = quiz.match(/@media\s*\(max-width:760px\)\s*\{[\s\S]*?\n\s*\}/)?.[0] || '';
  assert.doesNotMatch(mobile, /#pastExamSubject[^}]*display\s*:\s*none\s*!important/);
  assert.match(quiz, /function _restorePastExamSelection/);
  assert.match(quiz, /history\.replaceState/);
});

test('all-law question requests are resolved to an exam-scoped law first', () => {
  assert.match(quiz, /function _quizScopedLaw/);
  assert.match(quiz, /_quizScopedLaw\(law\)/);
  assert.match(fill, /function _fillScopedLaw/);
  assert.match(fill, /_fillScopedLaw\(law\)/);
  assert.match(practice, /function _practiceScopedLaw/);
  assert.match(practice, /_practiceScopedLaw\(law\)/);
});

test('question surfaces load the shared exam catalog and fail closed to bookkeeper', () => {
  for (const [name, source] of [['quiz', quiz], ['fill', fill], ['practice', practice]]) {
    assert.match(source, /exam-data\.js/, `${name} should load the exam catalog`);
    assert.match(source, /bookkeeper|n72/, `${name} should have a bookkeeper fallback`);
  }
  assert.match(room, /_ROOM_EXAM_LAWS\[_ek\]\s*\|\|\s*_ROOM_EXAM_LAWS\.bookkeeper/);
});

test('bookkeeper scope never includes Mining Act', () => {
  for (const [name, source] of [['quiz', quiz], ['fill', fill], ['practice', practice], ['room', room]]) {
    const scopeRegion = source.match(/(?:_BOOKKEEPER_LAWS|_ROOM_EXAM_LAWS)[\s\S]{0,6000}/)?.[0] || source;
    assert.doesNotMatch(scopeRegion, /['"]礦業法['"]/, `${name} bookkeeper scope must exclude Mining Act`);
  }
});
