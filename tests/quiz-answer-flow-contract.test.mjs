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

test('quiz usage hint is near the question instead of hidden at the page bottom', () => {
  const stemStart = active.indexOf('class="q-stem"');
  const optsStart = active.indexOf('id="optionsBox"', stemStart);
  assert.ok(stemStart > -1 && optsStart > stemStart, 'question stem and options must exist');
  const between = active.slice(stemStart, optsStart);

  assert.match(between, /id="quiz-use-hint"/);
  assert.match(between, /怎麼作答/);
  assert.match(between, /點一個答案，答完看法條或下一題/);
  assert.match(active, /#kb-hint\{display:none\}/);
});

test('quiz weakness rail fetches authenticated weak-laws fallback', () => {
  assert.match(active, /\/api\/me\/weak-laws/);
  assert.match(active, /function _renderRemoteWeakLaws/);
  assert.match(active, /不用自己判斷哪裡弱/);
  assert.match(active, /startSession\(5\)/);
});

test('stats modal merges server quiz sessions and weak laws before relying on localStorage', () => {
  assert.match(active, /function _loadRemoteQuizStats/);
  assert.match(active, /\/api\/me\/quiz-stats/);
  assert.match(active, /每日一題、LINE 作答與網頁練習/);
  assert.match(active, /todayCorrect:\s*d && d\.today_correct/);
  assert.match(active, /serverMerged:\s*true/);
  assert.match(active, /s\.serverMerged \? '' : _buildQuizCalendar\(s\)/);
  assert.match(active, /function _renderWrongListFromRemote/);
  assert.match(active, /_loadRemoteWeakLaws\(\{force:true, target:'panel'\}\)/);
});

test('wrong review can start from server weak laws when local wrong bank is empty', () => {
  assert.match(active, /async function _loadRemoteWrongBankForQuiz/);
  assert.match(active, /\/api\/me\/weak-laws/);
  assert.match(active, /top_articles/);
  assert.match(active, /page_id:a\.page_id/);

  const wrongStart = active.indexOf('async function loadWrongQuiz');
  assert.ok(wrongStart > -1, 'loadWrongQuiz must exist');
  const wrongEnd = active.indexOf('// ── DOMContentLoaded', wrongStart);
  const wrongFn = active.slice(wrongStart, wrongEnd > wrongStart ? wrongEnd : wrongStart + 7000);
  assert.match(wrongFn, /let bank = loadWrongBank\(\)/);
  assert.match(wrongFn, /bank = await _loadRemoteWrongBankForQuiz\(\)/);
  assert.match(wrongFn, /後端弱點也還沒有可重練的題/);
});

test('short multiple-choice options can use compact two-column layout on desktop only', () => {
  assert.match(active, /\.opts\.compact/);
  assert.match(active, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(active, /@media \(max-width:760px\)[\s\S]*?\.opts\.compact\{display:flex;flex-direction:column\}/);
  assert.match(active, /function _applyOptionLayout/);
  assert.match(active, /texts\.length === 4 && texts\.every\(t => t\.length > 0 && t\.length <= 14\)/);
  assert.match(active, /document\.getElementById\('optionsBox'\)\.classList\.remove\('compact'\)/);
  assert.match(active, /const optionTexts = \(data\.options\|\|\[\]\)\.map\(opt => isNewFmt \? opt : \(opt\.snippet\|\|''\)\)/);
  const wrongStart = active.indexOf('async function loadWrongQuiz');
  assert.ok(wrongStart > -1, 'loadWrongQuiz must exist');
  const wrongEnd = active.indexOf('// ── DOMContentLoaded', wrongStart);
  const wrongFn = active.slice(wrongStart, wrongEnd > wrongStart ? wrongEnd : wrongStart + 6000);
  assert.match(wrongFn, /classList\.remove\('compact'\)/);
  assert.match(wrongFn, /_applyOptionLayout\(optionTexts\)/);
});

test('answer explanation shows article text before analysis sections', () => {
  const explainStart = active.indexOf('id="explainBox"');
  assert.ok(explainStart > -1, 'explanation box must exist');
  const explain = active.slice(explainStart, explainStart + 420);
  assert.ok(explain.indexOf('id="artInline"') < explain.indexOf('id="sourceBox"'), 'article text should appear before the source action row');
  assert.doesNotMatch(active, /查看該條完整原文/);
  assert.match(active, /條文原文已放在上方/);
  assert.match(active, /style\.display='block'/);
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
