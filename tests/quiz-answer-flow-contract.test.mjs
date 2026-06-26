import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

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

test('post-answer citation formats article labels without duplicated 第 or 條', () => {
  assert.match(active, /function formatArticleCitation/);
  assert.match(active, /formatArticleCitation\(artTitle,\s*lawName\)/);
  assert.doesNotMatch(active, /第 <strong>'\+\(_artNo\|\|'—'\)\+'<\/strong> 條/);
});

test('article citation helper preserves sub-articles in labels and links', () => {
  const start = active.indexOf('function normalizeArticleCore');
  const end = active.indexOf('function renderQuizCitation', start);
  assert.ok(start >= 0 && end > start, 'citation helpers must be extractable');
  const helpers = vm.runInNewContext(`${active.slice(start, end)};({formatArticleCitation,getArticleCitationNo})`);

  assert.equal(helpers.formatArticleCitation('第13條', '記帳士法'), '第 13 條 ｜ 記帳士法');
  assert.equal(helpers.getArticleCitationNo('第13條'), '13');
  assert.equal(helpers.formatArticleCitation('13', '記帳士法'), '第 13 條 ｜ 記帳士法');
  assert.equal(helpers.getArticleCitationNo('13'), '13');
  assert.equal(helpers.formatArticleCitation('第13條之1', '記帳士法'), '第 13 條之1 ｜ 記帳士法');
  assert.equal(helpers.getArticleCitationNo('第13條之1'), '13之1');
  assert.equal(helpers.formatArticleCitation('第十三條之一', '記帳士法'), '第 十三 條之一 ｜ 記帳士法');
  assert.equal(helpers.getArticleCitationNo('第十三條之一'), '十三之一');
  assert.equal(helpers.formatArticleCitation('§ 第13條之1｜附註', '記帳士法'), '第 13 條之1 ｜ 記帳士法');
});

test('native iOS quiz owns the status bar safe area', () => {
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" \/>/);
  assert.match(active, /document\.documentElement\.classList\.add\('ios-reader-app'\)/);
  const css = readFileSync(new URL('../sofa.css', import.meta.url), 'utf8');
  assert.match(css, /html\.ios-reader-app\s+\.topbar\{[\s\S]*padding-top:calc\(16px \+ env\(safe-area-inset-top, 0px\)\)/);
});

test('quiz usage hint is near the question instead of hidden at the page bottom', () => {
  const stemStart = active.indexOf('class="q-stem"');
  const optsStart = active.indexOf('id="optionsBox"', stemStart);
  assert.ok(stemStart > -1 && optsStart > stemStart, 'question stem and options must exist');
  const between = active.slice(stemStart, optsStart);

  assert.match(between, /id="quiz-use-hint"/);
  assert.match(between, /作答提示/);
  assert.match(between, /選答案後，先看原文，再看解析或下一題/);
  assert.match(active, /class="quiz-key-hints"/);
  assert.match(active, /@media \(max-width:760px\)[\s\S]*?\.quiz-key-hints\{display:none\}/);
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
  assert.match(active, /function showInlineArticleText/);
  assert.match(active, /條文原文載入中/);
  assert.match(active, /暫時沒有原文/);
});

test('paid answer explanation renders advanced analysis sections instead of hiding them', () => {
  const buildStart = active.indexOf('function buildSections');
  assert.ok(buildStart > -1, 'buildSections must exist');
  const buildEnd = active.indexOf('// ── 錯題本', buildStart);
  const build = active.slice(buildStart, buildEnd);

  assert.match(build, /if\(isPaid\)/);
  assert.match(build, /_LOCKED_SECS\.forEach/);
  assert.match(build, /d\.className='sec-block'/);
  assert.match(active, /修法與聯覺備註/);
  assert.match(active, /相關法規及注意事項/);
});

test('CPI-adjusted article answers always show a visible adjustment warning', () => {
  assert.match(active, /function buildCpiAdjustmentNote/);
  assert.match(active, /function appendCpiAdjustmentNote/);
  assert.match(active, /className='cpi-note'/);
  assert.match(active, /所得基本稅額條例/);
  assert.match(active, /遺產及贈與稅法/);
  assert.match(active, /消費者物價指數|CPI/);
  assert.match(active, /113 年度起個人基本所得額扣除額已調整為 750 萬元/);
  assert.match(active, /115 年度沿用 750 萬元/);
  assert.match(active, /115 年：遺產稅免稅額 1,333 萬/);
  assert.match(active, /贈與稅免稅額每年 244 萬/);
  assert.match(active, /遺產稅級距 5,621 萬 \/ 1 億 1,242 萬/);
  assert.match(active, /贈與稅級距 2,811 萬 \/ 5,621 萬/);
  assert.match(active, /113 年：免稅額同為 1,333 萬 \/ 244 萬/);
  assert.match(active, /級距仍為遺產 5,000 萬 \/ 1 億、贈與 2,500 萬 \/ 5,000 萬/);
  assert.match(active, /題目仍可考條文基準或比例/);

  const callCount = (active.match(/buildSections\(art\.sections\|\|\{\},art\._plan!=='free',\s*document\.getElementById\('explainBox'\),document\.getElementById\('sourceBox'\),\s*art\)/g) || []).length;
  assert.equal(callCount, 2, 'normal quiz and wrong-review quiz should both pass article metadata into buildSections');
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
