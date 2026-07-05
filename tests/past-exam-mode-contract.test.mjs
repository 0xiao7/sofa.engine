import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const quiz = readFileSync(new URL('../quiz.html', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');
const radar = readFileSync(new URL('../past-exam-radar.html', import.meta.url), 'utf8');
const activeQuiz = quiz.replace(/<!--[\s\S]*?-->/g, '');
const activeDashboard = dashboard.replace(/<!--[\s\S]*?-->/g, '');
const activeRadar = radar.replace(/<!--[\s\S]*?-->/g, '');

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

test('past-exam mode remembers recent questions and retries duplicates', () => {
  const start = activeQuiz.indexOf('async function _fetchPastExamQuestion');
  assert.ok(start > -1, 'past-exam fetcher must exist');
  const fn = activeQuiz.slice(start, activeQuiz.indexOf('function _renderStatsContent', start));

  assert.match(activeQuiz, /const RECENT_PAST_EXAM_QUESTIONS_KEY = 'sofa_recent_past_exam_questions_v1'/);
  assert.match(activeQuiz, /function recentPastExamQuestionKeys/);
  assert.match(activeQuiz, /function rememberRecentPastExamQuestion/);
  assert.match(activeQuiz, /function isRecentPastExamQuestion/);
  assert.match(activeQuiz, /function _pastExamQuestionKey/);
  assert.match(activeQuiz, /_past_exam_key:/);
  assert.match(fn, /for\(let attempt=0;attempt<5;attempt\+\+\)/);
  assert.match(fn, /if\(!isRecentPastExamQuestion\(data\) \|\| attempt===4\)/);
  assert.match(fn, /rememberRecentPastExamQuestion\(data\)/);
});

test('dashboard exposes a separate past-exam radar entry', () => {
  const radarStart = activeDashboard.indexOf('考古題雷達');
  assert.ok(radarStart > -1, 'dashboard must expose the past-exam radar entry');
  const card = activeDashboard.slice(Math.max(0, radarStart - 260), radarStart + 360);

  assert.match(card, /href="past-exam-radar\.html"/);
  assert.match(card, /看範圍/);
  assert.doesNotMatch(card, /mode=past-exam/);
});

test('past-exam radar states bookkeeper-only scope and trackable-question boundary', () => {
  assert.match(activeRadar, /記帳士考古題雷達/);
  assert.match(activeRadar, /目前先看記帳士兩科官方選擇題/);
  assert.match(activeRadar, /只顯示能追蹤到法條的題/);
  assert.match(activeRadar, /不代表全考科都已產品化/);
  assert.match(activeRadar, /稅務相關法規概要/);
  assert.match(activeRadar, /記帳相關法規概要/);
  assert.doesNotMatch(activeRadar, /不動產經紀人已上線|地政士已上線|全考科已上線/);
});

test('past-exam radar uses current APIs without creating imports or migrations', () => {
  assert.match(activeRadar, /\/api\/past-exam\/meta/);
  assert.match(activeRadar, /\/api\/past-exam\?subject=/);
  assert.match(activeRadar, /quiz\.html\?mode=past-exam/);
  assert.match(activeRadar, /renderRadarMeta/);
  assert.match(activeRadar, /renderSubjectPreview/);
  assert.doesNotMatch(activeRadar, /INSERT INTO|ALTER TABLE|CREATE TABLE|\/api\/admin/);
});
