import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const quiz = readFileSync(new URL('../quiz.html', import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const fill = readFileSync(new URL('../fill.html', import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const practice = readFileSync(new URL('../practice.html', import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->/g, '');

test('fill answers record readable question text into shared answer ledger', () => {
  assert.match(fill, /\/api\/me\/answer/);
  assert.match(fill, /mode:'fill'/);
  assert.match(fill, /const fillQuestion=\(fillData\.masked_text\|\|fillData\.title\|\|'填空練習'\)/);
  assert.match(fill, /question:fillQuestion/);
  assert.match(fill, /options:fillData\.answers\|\|\[\]/);
});

test('practice answers record readable question text into shared answer ledger', () => {
  assert.match(practice, /\/api\/me\/answer/);
  assert.match(practice, /mode:'practice'/);
  assert.match(practice, /let _prQuestionText=''/);
  assert.match(practice, /question:_prQuestionText\|\|'打字練習'/);
  assert.match(practice, /const prLawLabel=lawMeta\|\|d\.law_name\|\|''/);
  assert.match(practice, /_prQuestionText=`打字練習｜\$\{prLawLabel\} \$\{d\.title\|\|''\}`/);
});

test('past-exam answers are not collapsed into generic quiz mode', () => {
  assert.match(quiz, /mode:data\._past_exam\?'past_exam':'quiz'/);
  assert.match(quiz, /question:data\.question\|\|''/);
  assert.match(quiz, /options:_opts/);
});

test('wrong-bank review answers write back into the shared answer ledger', () => {
  const start = quiz.indexOf('async function loadWrongQuiz');
  assert.ok(start > -1, 'loadWrongQuiz must exist');
  const end = quiz.indexOf('// ── Wave 61', start);
  const fn = quiz.slice(start, end > start ? end : start + 9000);

  assert.match(fn, /\/api\/me\/answer/);
  assert.match(fn, /mode:'wrong_review'/);
  assert.match(fn, /question:data\.question\|\|''/);
  assert.match(fn, /options:_opts/);
});
