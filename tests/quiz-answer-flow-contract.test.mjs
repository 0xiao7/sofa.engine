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
  assert.match(actionRow, /id="view-weakness-btn"/);
  assert.match(actionRow, />看弱點分析</);
  assert.match(actionRow, /id="btnFlag"/);
  assert.match(actionRow, /id="btnNext"/);
  assert.ok(actionRow.indexOf('id="btnFlag"') < actionRow.indexOf('id="btnNext"'), 'flag action should sit next to next question');
  const footStart = active.indexOf('class="q-foot"', end);
  const footEnd = active.indexOf('class="rail"', footStart);
  assert.ok(footStart >= 0 && footEnd > footStart, 'quiz footer must exist');
  assert.doesNotMatch(active.slice(footStart, footEnd), /id="btnFlag"/, 'do not leave a second flag button below the fold');
});

test('quiz top entry names weakness analysis as a first-level tool', () => {
  assert.match(active, /id="btn-open-weakness"/);
  assert.match(active, /title="看弱點分析"/);
  assert.match(active, />弱點分析 <span id="nav-wrong-cnt"/);
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

test('drill law deep links do not overwrite the learner default law', () => {
  assert.match(active, /const _drillParam = _searchParams\.get\('drill'\) === '1'/);
  assert.match(active, /if\(!_drillParam\) localStorage\.setItem\('sofa_last_law', opt\.value\)/);
  assert.match(active, /sel\._skipPersistOnce = _drillParam/);
  assert.match(active, /if\(this\._skipPersistOnce\) this\._skipPersistOnce = false/);
  assert.match(active, /else if\(!_drillParam\) localStorage\.setItem\('sofa_last_law', this\.value\)/);
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

test('question label sits above the stem text instead of overlaying long questions', () => {
  assert.match(active, /\.q-stem\{[\s\S]*padding:56px 36px 32px/);
  assert.match(active, /\.q-stem::before\{[\s\S]*left:36px[\s\S]*right:auto/);
  const labelRule = active.match(/\.q-stem::before\{[^}]+\}/)?.[0] || '';
  assert.doesNotMatch(labelRule, /right:22px/);
  assert.match(active, /@media \(max-width:760px\)\{[\s\S]*\.q-stem\{padding:48px 22px 22px\}/);
  assert.match(active, /@media \(max-width:760px\)\{[\s\S]*\.q-stem::before\{left:22px/);
});

test('answer options expose button semantics and keyboard activation', () => {
  assert.match(active, /btn\.setAttribute\('role','button'\)/);
  assert.match(active, /btn\.setAttribute\('tabindex','0'\)/);
  assert.match(active, /btn\.addEventListener\('keydown',\(ev\)=>\{[\s\S]*ev\.key==='Enter'\|\|ev\.key===' '/);
  const occurrences = (active.match(/btn\.setAttribute\('role','button'\)/g) || []).length;
  assert.ok(occurrences >= 2, 'normal quiz and wrong-review quiz options should both be keyboard-accessible');
});

test('quiz weakness rail fetches authenticated weak-laws fallback', () => {
  assert.match(active, /\/api\/me\/weak-laws/);
  assert.match(active, /function _renderRemoteWeakLaws/);
  assert.match(active, /不用自己判斷哪裡弱/);
  assert.match(active, /startSession\(5\)/);
});

test('quiz accepts law query params from dashboard single-practice links', () => {
  assert.match(active, /function _lawParamFromUrl/);
  assert.match(active, /_searchParams\.get\('law'\)/);
  assert.match(active, /_searchParams\.get\('q'\)/);
  assert.match(active, /function _applyInitialLawParam/);
  assert.match(active, /decodeURIComponent/);
  assert.match(active, /document\.createElement\('option'\)/);
  assert.match(active, /o\.value = law/);
  assert.match(active, /sel\.appendChild\(o\)/);
  assert.match(active, /_applyInitialLawParam\(sel\)/);
  assert.match(active, /if\(_initialLawApplied\)\{ loadQuiz\(\); return; \}/);
});

test('quiz drill links can target one article number from dashboard playlists', () => {
  assert.match(active, /function _articleParamFromUrl/);
  assert.match(active, /_searchParams\.get\('art'\)/);
  assert.match(active, /function _findArticleByUrlParam/);
  assert.match(active, /normalizeArticleCore\(a\.title\) === target/);
  assert.match(active, /const urlArticle = await _findArticleByUrlParam\(law\)/);
  assert.match(active, /urlArticle && _drillParam/);
  assert.match(active, /page_id=\$\{encodeURIComponent\(urlArticle\.id\)\}/);
});

test('quiz view-article fallback opens the exact article when only law and article number are known', () => {
  const start = active.indexOf('function _dashboardArticleHref');
  assert.ok(start >= 0, '_dashboardArticleHref must exist');
  const end = active.indexOf('function renderQuizCitation', start);
  const fn = active.slice(start, end);

  assert.match(fn, /_dashboardArticleHref/);
  assert.match(fn, /encodeURIComponent\(law\)/);
  assert.match(fn, /encodeURIComponent\(art\)/);
  assert.match(fn, /#search/);
  assert.match(active, /window\.open\(_dashboardArticleHref\(_currentPageId, _currentLawName, _currentArtNo\), '_blank'\)/);
  assert.doesNotMatch(active, /url = 'dashboard\.html\?q=' \+ encodeURIComponent\(_currentLawName\);\s*\}/);
});

test('stats modal merges server quiz sessions and weak laws before relying on localStorage', () => {
  assert.match(active, /function _loadRemoteQuizStats/);
  assert.match(active, /\/api\/me\/quiz-stats/);
  assert.match(active, /每日一題、LINE 作答、網頁選擇題、填空、打字練習、考古題、錯題重練/);
  assert.match(active, /todayCorrect:\s*d && d\.today_correct/);
  assert.match(active, /serverMerged:\s*true/);
  assert.match(active, /s\.serverMerged \? '' : _buildQuizCalendar\(s\)/);
  assert.match(active, /function _renderWrongListFromRemote/);
  assert.match(active, /_loadRemoteWeakLaws\(\{force:true, target:'panel'\}\)/);
});

test('wrong review can start from server weak laws when local wrong bank is empty', () => {
  assert.match(active, /async function _loadRemoteWrongBankForQuiz/);
  assert.match(active, /\/api\/me\/weak-laws/);
  assert.match(active, /wrong_articles/);
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

test('remote wrong bank prefers latest wrong quiz-session articles over representative top articles', () => {
  const start = active.indexOf('async function _loadRemoteWrongBankForQuiz');
  assert.ok(start > -1, '_loadRemoteWrongBankForQuiz must exist');
  const fn = active.slice(start, start + 1800);
  assert.match(fn, /item\.wrong_articles/);
  assert.match(fn, /item\.top_articles/);
  assert.match(fn, /const articles = \(item\.wrong_articles && item\.wrong_articles\.length\) \? item\.wrong_articles : \(item\.top_articles \|\| \[\]\)/);
  assert.match(fn, /source:a\.source \|\| 'server_weak_laws'/);
});

test('weakness panel shows actual wrong articles when the server provides them', () => {
  const start = active.indexOf('function _renderWrongListFromRemote');
  assert.ok(start > -1, '_renderWrongListFromRemote must exist');
  const fn = active.slice(start, start + 2600);
  assert.match(fn, /item\.wrong_articles/);
  assert.match(fn, /item\.top_articles/);
  assert.match(fn, /實際錯題/);
  assert.match(fn, /_weakArticleLinks\(law, sourceArticles, 2\)/);
});

test('weakness article chips link back to the exact dashboard article', () => {
  const start = active.indexOf('function _weakArticleLinks');
  assert.ok(start > -1, '_weakArticleLinks must exist');
  const fn = active.slice(start, start + 900);
  assert.match(fn, /a\.page_id \|\| a\.id \|\| ''/);
  assert.match(fn, /_dashboardArticleHref\(a\.page_id \|\| a\.id \|\| '', law, art\)/);
  assert.match(fn, /class="weak-article-link"/);
  assert.match(fn, /target="_blank"/);
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

test('quiz analysis linkifies sixth-section law references to dashboard', () => {
  const start = active.indexOf('function linkifyLawRefs');
  const end = active.indexOf('function formatSection', start);
  assert.ok(start >= 0 && end > start, 'law reference helper must be extractable before formatSection');
  const helpers = vm.runInNewContext(`${active.slice(start, end)};({linkifyLawRefs})`);

  const linkedSameLaw = helpers.linkifyLawRefs('同法第13條、本法第15條', '記帳士法');
  assert.match(linkedSameLaw, /dashboard\.html\?q=記帳士法&art=13#search/);
  assert.match(linkedSameLaw, /dashboard\.html\?q=記帳士法&art=15#search/);

  const linkedNamedLaw = helpers.linkifyLawRefs('記帳士法第13條及第15條', '所得稅法');
  assert.match(linkedNamedLaw, /dashboard\.html\?q=記帳士法&art=13#search/);
  assert.match(linkedNamedLaw, /dashboard\.html\?q=記帳士法&art=15#search/);
  assert.match(active, /formatSection\(sections\[name\],\s*articleLawName\)/);
});

test('CPI-adjusted article answers always show a visible adjustment warning', () => {
  assert.match(active, /function buildCpiAdjustmentNote/);
  assert.match(active, /function appendCpiAdjustmentNote/);
  assert.match(active, /className='cpi-note'/);
  assert.match(active, /\.cpi-note\{[^}]*white-space:pre-line/);
  assert.match(active, /所得基本稅額條例/);
  assert.match(active, /遺產及贈與稅法/);
  assert.match(active, /消費者物價指數|CPI/);
  assert.match(active, /113 年度起個人基本所得額扣除額已調整為 750 萬元/);
  assert.match(active, /115 年度沿用 750 萬元/);
  assert.match(active, /estateGiftAmountArticle/);
  assert.match(active, /\(13\|17\|18\|19\|20\|22\)/);
  assert.match(active, /estateGiftAmountText/);
  assert.match(active, /條文原文、舊題數字和當年度公告額要分開看/);
  assert.match(active, /115 \/ 114：遺產稅免稅額 1,333 萬/);
  assert.match(active, /贈與稅免稅額 244 萬 \/ 年/);
  assert.match(active, /115 \/ 114 級距：遺產稅 5,621 萬 \/ 1 億 1,242 萬/);
  assert.match(active, /贈與稅 2,811 萬 \/ 5,621 萬/);
  assert.match(active, /配偶扣除 553 萬/);
  assert.match(active, /直系血親卑親屬每人 56 萬/);
  assert.match(active, /父母、喪葬費各 138 萬/);
  assert.match(active, /113 對照：級距仍為遺產 5,000 萬 \/ 1 億、贈與 2,500 萬 \/ 5,000 萬/);
  assert.match(active, /考前以財政部公告額為準/);
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
