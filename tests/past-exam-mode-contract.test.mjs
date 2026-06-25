import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const quiz = readFileSync(new URL('../quiz.html', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');
const activeQuiz = quiz.replace(/<!--[\s\S]*?-->/g, '');
const activeDashboard = dashboard.replace(/<!--[\s\S]*?-->/g, '');

test('dashboard past-exam card opens the real past-exam mode', () => {
  const cardStart = activeDashboard.indexOf('考古題練習');
  assert.ok(cardStart > -1, 'dashboard must keep a past-exam practice card');
  const card = activeDashboard.slice(Math.max(0, cardStart - 260), cardStart + 360);

  assert.match(card, /href="quiz\.html\?mode=past-exam"/);
  assert.match(card, /歷屆試題/);
  assert.doesNotMatch(card, /進同一出題頁/);
});

test('dashboard keeps normal quiz and past-exam entries separate', () => {
  const quizStart = activeDashboard.indexOf('一般選擇題');
  assert.ok(quizStart > -1, 'dashboard must keep a normal quiz card');
  const quizCard = activeDashboard.slice(Math.max(0, quizStart - 260), quizStart + 260);

  assert.match(quizCard, /href="quiz\.html"/);
  assert.doesNotMatch(quizCard, /mode=past-exam/);
});

test('quiz has a real past-exam mode backed by the past-exam API', () => {
  assert.match(activeQuiz, /mode'\)\s*===\s*'past-exam'/);
  assert.match(activeQuiz, /id="pastExamSubject"/);
  assert.match(activeQuiz, /function _normalizePastExamQuestion/);
  assert.match(activeQuiz, /\/api\/past-exam\?subject=/);
  assert.match(activeQuiz, /\.find\(o=>o\.key===raw\.answer\)/);
});

test('loadQuiz routes to past-exam questions before generated law questions', () => {
  const start = activeQuiz.indexOf('async function loadQuiz');
  assert.ok(start > -1, 'loadQuiz must exist');
  const end = activeQuiz.indexOf('async function loadWrongQuiz', start);
  const fn = activeQuiz.slice(start, end > start ? end : start + 6000);

  assert.match(fn, /if\(_pastExamMode\)\{/);
  assert.match(fn, /data=await _fetchPastExamQuestion\(\)/);
  assert.match(fn, /\/api\/quiz/);
});
