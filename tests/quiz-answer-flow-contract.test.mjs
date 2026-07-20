import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../quiz.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');

function extractFunction(source, name) {
  let start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const asyncStart = source.lastIndexOf('async ', start);
  if (asyncStart >= 0 && source.slice(asyncStart + 6, start) === '') start = asyncStart;
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`${name} function did not close`);
}

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

test('post-answer retention prompt is compact and only shown for free learners', () => {
  const start = active.indexOf('id="quiz-answer-actions"');
  const end = active.indexOf('id="explainBox"', start);
  assert.ok(start >= 0 && end > start, 'quiz answer action row must exist before explanation box');
  const actionRow = active.slice(start, end);

  assert.match(actionRow, /id="post-answer-retention"/);
  assert.match(actionRow, /想保留這題和弱點/);
  assert.match(actionRow, /data-track-event="post_answer_login_click"/);
  assert.match(actionRow, /data-track-event="post_answer_pricing_click"/);
  assert.match(actionRow, /href="login\.html\?utm_source=web_quiz&utm_medium=post_answer&utm_campaign=quiz_post_answer_login"/);
  assert.match(actionRow, /href="pricing\.html\?utm_source=web_quiz&utm_medium=post_answer&utm_campaign=quiz_post_answer_pricing"/);
  assert.match(active, /function updatePostAnswerRetention\(\)/);
  assert.match(active, /retention\.style\.display = isFree \? 'flex' : 'none'/);
  assert.match(active, /updatePostAnswerRetention\(\)/);
});

test('post-answer action buttons keep mobile tap targets', () => {
  assert.match(active, /#view-article-btn\s*\{[\s\S]*min-height:\s*44px/);
  assert.match(active, /#view-weakness-btn\s*\{[\s\S]*min-height:\s*44px/);
  assert.match(active, /#quiz-answer-actions #btnNext\s*\{[\s\S]*min-height:\s*44px/);
  assert.match(active, /#quiz-answer-actions #btnFlag\s*\{[\s\S]*min-height:\s*44px/);
  assert.match(active, /document\.getElementById\('view-article-btn'\)\.style\.display = 'inline-flex'/);
  assert.match(active, /document\.getElementById\('view-weakness-btn'\)\.style\.display = 'inline-flex'/);
  assert.match(active, /function showQuizAnswerActions\(\)/);
  assert.match(active, /actions\.classList\.add\('show'\)/);
  assert.match(active, /scrollIntoView\(\{block:'center', behavior:'auto'\}\)/);
  assert.match(active, /#post-answer-retention a\s*\{[\s\S]*min-height:\s*44px/);
});

test('normal quiz can auto-advance only after correct answers when the learner opts in', () => {
  assert.match(active, /id="autoNextCorrectToggle"/);
  assert.match(active, /答對自動下一題/);
  assert.match(active, /答錯停留看解析/);
  assert.match(active, /const AUTO_NEXT_CORRECT_KEY = 'sofa_quiz_auto_next_correct_v1'/);
  assert.match(active, /const AUTO_NEXT_CORRECT_DELAY_MS =/);
  assert.match(active, /function setAutoNextCorrect/);
  assert.match(active, /function updateAutoNextCorrectUI/);
  assert.match(active, /function maybeAutoAdvanceCorrectAnswer/);

  const maybe = extractFunction(active, 'maybeAutoAdvanceCorrectAnswer');
  assert.match(maybe, /if\(_sessionMode\) return false/);
  assert.match(maybe, /if\(!isCorrect\) return false/);
  assert.match(maybe, /if\(!isAutoNextCorrectEnabled\(\)\) return false/);
  assert.match(maybe, /setTimeout\(function\(\)\{ wrongMode \? loadWrongQuiz\(\) : loadQuiz\(\); \}, AUTO_NEXT_CORRECT_DELAY_MS\)/);
  assert.doesNotMatch(maybe, /showQuizAnswerActions/);

  const answerStart = active.indexOf('recordQuizAnswer(data,pageId,isCorrect,i,correctIdx)');
  assert.ok(answerStart > -1, 'answer submit flow must record answer');
  const answerFlow = active.slice(answerStart, answerStart + 900);
  assert.match(answerFlow, /if\(onAnswerDone\(isCorrect, loadQuiz\)\) return/);
  assert.match(answerFlow, /if\(maybeAutoAdvanceCorrectAnswer\(isCorrect\)\) return/);
  assert.ok(
    answerFlow.indexOf('onAnswerDone(isCorrect, loadQuiz)') < answerFlow.indexOf('maybeAutoAdvanceCorrectAnswer(isCorrect)'),
    'session mode should keep its existing auto-advance behavior first',
  );
});

test('mobile post-answer actions stay inside the iOS viewport', () => {
  const mediaStart = active.indexOf('@media (max-width:760px)');
  assert.ok(mediaStart >= 0, 'mobile media query must exist');
  const media = active.slice(mediaStart, mediaStart + 5200);
  assert.match(media, /\.stage\{[\s\S]*overflow-x:hidden/);
  assert.match(media, /\.inner\{[\s\S]*max-width:100%/);
  assert.match(media, /#quiz-answer-actions\{[\s\S]*display:grid/);
  assert.match(media, /#quiz-answer-actions\.show\{[\s\S]*display:grid/);
  assert.match(media, /#quiz-answer-actions button\{[\s\S]*width:100%/);
  assert.match(media, /#quiz-answer-actions button\{[\s\S]*min-width:0/);
  assert.match(media, /#quiz-answer-actions #quiz-citation\{[\s\S]*grid-column:1 \/ -1/);
});

test('mobile quiz set map grid cannot overflow its rail card', () => {
  assert.match(active, /\.qgrid\{display:grid;grid-template-columns:repeat\(5,1fr\);gap:6px\}/);
  const mediaStart = active.indexOf('@media (max-width:760px)');
  assert.ok(mediaStart >= 0, 'mobile media query must exist');
  const media = active.slice(mediaStart, mediaStart + 5600);
  assert.match(media, /\.rail-card\{[\s\S]*min-width:0/);
  assert.match(media, /\.qgrid\{[\s\S]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(media, /\.qcell\{[\s\S]*min-width:0/);
});

test('answer toast stays out of the question title area', () => {
  const rule = active.match(/#ans-toast\{[^}]+\}/)?.[0] || '';
  assert.match(rule, /right:24px/);
  assert.match(rule, /left:auto/);
  assert.match(rule, /transform:none/);
  assert.doesNotMatch(rule, /left:50%/);
  assert.match(active, /@media \(max-width:760px\)\{[\s\S]*#ans-toast\{[\s\S]*right:14px/);
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
  assert.match(between, /選完先看原文；再看解析或下一題/);
  assert.doesNotMatch(between, /選答案後，先看原文，再看解析或下一題/);
  assert.match(active, /class="quiz-key-hints"/);
  assert.match(active, /@media \(max-width:760px\)[\s\S]*?\.quiz-key-hints\{display:none\}/);
  assert.match(active, /#kb-hint\{display:none\}/);
});

test('mobile quiz keeps secondary mode controls out of the first screen', () => {
  assert.doesNotMatch(active, /\.free-quiz-notice a\[href="pricing\.html"\]\{display:none!important\}/);
  assert.match(active, /\.free-quiz-notice a\{[\s\S]*min-height:44px/);
  assert.match(active, /輸入序號保留紀錄 →/);
  assert.match(active, /#btnWrong,#btn-clear-wrong,#btnDaily,#daily-badge,#quiz-streak,\s*#sprint-count-select,#btnSprint,#btnExam,#btnPastExam,#pastExamSubject\{\s*display:none!important;/);
  assert.match(active, /#law-status-bar,#artPickWrap\{display:none!important\}/);
  assert.match(active, /#btnNew\{min-height:42px/);
  assert.match(active, /class="seg score-seg">正確/);
  assert.match(active, /class="seg score-seg">錯誤/);
  assert.match(active, /\.pr-meta \.score-seg\{display:none\}/);
  assert.match(active, /\.pr-meta\{width:100%;display:flex;flex-wrap:nowrap;overflow-x:auto/);
  assert.match(active, /#btn-stats,#btn-open-weakness\{min-height:44px;text-align:center;white-space:nowrap;flex:0 0 auto\}/);
  assert.match(active, /\.pr-chips\{flex-wrap:nowrap;overflow-x:auto/);
});

test('free quiz entry bypasses local preview identity so retention CTA can be verified', () => {
  assert.match(active, /const _searchParams = new URLSearchParams\(location\.search\)/);
  assert.match(active, /const freeParam = _searchParams\.get\('free'\) === '1'/);
  assert.match(active, /const uid = localStorage\.getItem\('sofa_uid'\) \|\| \(\(isPreviewHost\(\) && !freeParam\) \? 'PREVIEW' : null\)/);
  assert.match(active, /if \(freeParam && !uid && !tok\) \{[\s\S]*localStorage\.setItem\('sofa_free', 'FREE'\)/);
});

test('law deep links bypass the exam picker banner', () => {
  assert.match(active, /function _shouldShowQzExamBanner\(examKey\)/);
  assert.match(active, /return !examKey && !_pageIdParamFromUrl\(\) && !_lawParamFromUrl\(\) && !_articleParamFromUrl\(\) && !_drillParam && !_pastExamMode && !_startQuizParam/);
  assert.match(active, /if\(_shouldShowQzExamBanner\(examKey\)\) _showQzExamBanner\(\)/);
});

test('app start links go straight to the question area without the exam picker gate', () => {
  assert.match(active, /const _startQuizParam = _searchParams\.get\('start'\) === '1'/);
  assert.match(active, /html\.ios-reader-app \.stage\{padding-top:calc\(34px \+ env\(safe-area-inset-top, 0px\)\)\}/);
  assert.match(active, /function _focusQuizQuestionStart/);
  assert.match(active, /document\.querySelector\('\.stage'\)/);
  assert.match(active, /scrollIntoView\(\{block:'start', behavior:'auto'\}\)/);
  assert.match(active, /if\(_startQuizParam\)\{ _autoLoadQuizOnce\(\); return; \}/);
  assert.match(active, /if\(_startQuizParam\) setTimeout\(_focusQuizQuestionStart, 80\)/);
});

test('free start entry defaults to bookkeeper scope instead of all laws', () => {
  assert.match(active, /function _defaultExamForQuizStart\(examKey\)/);
  assert.match(active, /if \(examKey \|\| !_startQuizParam \|\| _lawParamFromUrl\(\) \|\| _articleParamFromUrl\(\) \|\| _drillParam \|\| _pastExamMode\) return examKey/);
  assert.match(active, /return 'bookkeeper'/);
  assert.match(active, /examKey = _defaultExamForQuizStart\(examKey\)/);
  assert.match(active, /if\(examKey\) localStorage\.setItem\('sofa_exam_key', examKey\)/);
});

test('free start entry chooses a quiz-ready bookkeeper law first', () => {
  assert.match(active, /function _preferredStartLaw\(laws\)/);
  assert.match(active, /'商業會計法','公司法','所得稅法','稅捐稽徵法'/);
  assert.match(active, /const preferred = _preferredStartLaw\(laws\)/);
  assert.match(active, /sel\.value = preferred\.name/);
});

test('question label sits above the stem text instead of overlaying long questions', () => {
  assert.match(active, /\.q-stem\{[\s\S]*padding:56px 36px 32px/);
  assert.match(active, /\.q-stem::before\{[\s\S]*left:36px[\s\S]*right:auto/);
  const labelRule = active.match(/\.q-stem::before\{[^}]+\}/)?.[0] || '';
  assert.doesNotMatch(labelRule, /right:22px/);
  assert.match(active, /@media \(max-width:760px\)\{[\s\S]*\.q-stem\{padding:48px 22px 22px\}/);
  assert.match(active, /@media \(max-width:760px\)\{[\s\S]*\.q-stem::before\{left:22px/);
});

test('quiz placeholder stem does not force mono 13px over the article text stack', () => {
  const questionBox = active.match(/<p id="questionBox"[^>]*>/)?.[0] || '';
  assert.doesNotMatch(questionBox, /font-family:var\(--mono\)/);
  assert.doesNotMatch(questionBox, /font-size:13px/);
  assert.match(questionBox, /class="question-placeholder"/);
  assert.match(active, /\.question-placeholder\{[\s\S]*font-family:var\(--serif\)/);
  assert.match(active, /\.question-placeholder\{[\s\S]*font-size:clamp\(17px, 2\.3vw, 21px\)/);
});

test('answer options expose button semantics and keyboard activation', () => {
  assert.match(active, /btn\.setAttribute\('role','button'\)/);
  assert.match(active, /btn\.setAttribute\('tabindex','0'\)/);
  assert.match(active, /btn\.addEventListener\('keydown',\(ev\)=>\{[\s\S]*ev\.key==='Enter'\|\|ev\.key===' '/);
  const occurrences = (active.match(/btn\.setAttribute\('role','button'\)/g) || []).length;
  assert.ok(occurrences >= 1, 'shared quiz option renderer must be keyboard-accessible');
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
  assert.match(active, /if\(_initialLawApplied\)\{ _autoLoadQuizOnce\(\); return; \}/);
});

test('quiz drill links can target one article number from dashboard playlists', () => {
  assert.match(active, /function _articleParamFromUrl/);
  assert.match(active, /_searchParams\.get\('art'\)/);
  assert.match(active, /Array\.isArray\(r\.articles\) \? r\.articles : \(Array\.isArray\(r\.items\) \? r\.items : \[\]\)/);
  assert.match(active, /function _findArticleByUrlParam/);
  assert.match(active, /const candidates = \[a\.title, a\.article_no, a\.article, a\.no\]/);
  assert.match(active, /candidates\.some\(v => normalizeArticleCore\(v\) === target\)/);
  assert.match(active, /const urlArticle = await _findArticleByUrlParam\(law\)/);
  assert.match(active, /urlArticle && _shouldUseUrlArticleDrill\(\)/);
  assert.match(active, /page_id=\$\{encodeURIComponent\(urlArticle\.id\)\}/);
});

test('quiz analysis deep links can target an exact article id without text matching fallback', () => {
  assert.match(active, /function _pageIdParamFromUrl/);
  assert.match(active, /_searchParams\.get\('page_id'\)/);
  assert.match(active, /_searchParams\.get\('article_id'\)/);
  assert.match(active, /const urlPageId = _pageIdParamFromUrl\(\)/);
  assert.match(active, /else if\(urlPageId\)/);
  assert.match(active, /url=`\$\{API\}\/api\/quiz\?page_id=\$\{encodeURIComponent\(urlPageId\)\}`/);
  assert.match(active, /pickedPageId=urlPageId/);
  assert.match(active, /if \(_startQuizParam && urlPageId\) return examKey/);
  assert.match(active, /!_pageIdParamFromUrl\(\) && !_lawParamFromUrl\(\) && !_articleParamFromUrl\(\)/);
});

test('quiz view-article opens an in-page article dialog with exact article fallback data', () => {
  const readerStart = active.indexOf('function _articleReaderHref');
  assert.ok(readerStart >= 0, '_articleReaderHref must exist');
  const readerEnd = active.indexOf('function renderQuizCitation', readerStart);
  const readerFn = active.slice(readerStart, readerEnd);
  assert.match(active, /id="quiz-article-panel"/);
  assert.match(active, /role="dialog"/);
  assert.match(active, /aria-modal="true"/);
  assert.match(active, /onclick="closeQuizArticlePanel\(\)"/);
  assert.match(active, /\.quiz-article-panel\{/);
  assert.match(active, /@media \(max-width:760px\)\{[\s\S]*\.quiz-article-panel\{inset:0/);
  assert.match(active, /function openQuizArticlePanelByTarget/);
  assert.match(active, /function closeQuizArticlePanel/);
  assert.match(active, /function _currentQuizReturnTarget/);
  assert.match(readerFn, /law-preview\.html\?law=/);
  assert.match(readerFn, /encodeURIComponent\(law\)/);
  assert.match(readerFn, /encodeURIComponent\(id\)/);
  assert.match(readerFn, /encodeURIComponent\(art\)/);
  assert.match(readerFn, /from=quiz/);
  assert.match(readerFn, /back=/);
  assert.match(readerFn, /encodeURIComponent\(_currentQuizReturnTarget\(\)\)/);
  assert.match(active, /onclick="_openArticleReader\(\)">查看法條/);
  const openStart = active.indexOf('function _openArticleReader');
  const openEnd = active.indexOf('let quizData', openStart);
  const openFn = active.slice(openStart, openEnd);
  assert.match(openFn, /openQuizArticlePanelByTarget\(\{law:_currentLawName, art:_currentArtNo, pageId:_currentPageId\}\)/);
  assert.doesNotMatch(openFn, /window\.location\.href/);
  assert.doesNotMatch(openFn, /window\.open/);
  assert.doesNotMatch(active, /url = 'dashboard\.html\?q=' \+ encodeURIComponent\(_currentLawName\);\s*\}/);
});

test('quiz article dialog keeps paid members in authenticated full-content context', () => {
  const dialogFn = extractFunction(active, 'openQuizArticlePanelByTarget');
  assert.match(dialogFn, /resolveQuizArticlePageId\(law, art\)/);
  assert.match(dialogFn, /fetch\(`\$\{API\}\/api\/article\/\$\{encodeURIComponent\(pageId\)\}`,\{headers:_authH\(\)\}\)/);
  assert.match(dialogFn, /payload\.article \|\| payload\.item \|\| payload/);
  assert.match(dialogFn, /formatLawText\(article\.original_text \|\| article\.text \|\| ''\)/);
  assert.match(dialogFn, /buildSections\(article\.sections\|\|\{\}, articleSectionsArePaid\(article\), body, null, article\)/);
  assert.doesNotMatch(dialogFn, /law-preview\.html/);
  assert.doesNotMatch(dialogFn, /window\.location\.href/);
  assert.match(active, /function resolveQuizArticlePageId/);
  assert.match(active, /const list=await _ensureArticleCache\(law\)/);
  assert.match(active, /_articleNoMatches\(a, art\)/);
});

test('quiz restores answered state after returning from article reader', () => {
  assert.match(active, /const QUIZ_RETURN_STATE_KEY = 'sofa_quiz_return_state_v1'/);
  assert.match(active, /function _quizReturnStatePayload/);
  assert.match(active, /questionText: document\.getElementById\('questionBox'\)\?\.textContent/);
  assert.match(active, /optionsHtml: options\?\.innerHTML/);
  assert.match(active, /explainHtml: explain\?\.innerHTML/);
  assert.match(active, /function _saveQuizReturnState/);
  assert.match(active, /sessionStorage\.setItem\(QUIZ_RETURN_STATE_KEY, JSON\.stringify\(_quizReturnStatePayload\(\)\)\)/);
  assert.match(active, /function _restoreQuizReturnState/);
  assert.match(active, /Date\.now\(\) - \(state\.ts \|\| 0\) > 30 \* 60 \* 1000/);
  assert.match(active, /options\.innerHTML = state\.optionsHtml/);
  assert.match(active, /explain\.innerHTML = state\.explainHtml/);
  assert.match(active, /_bindSourceLink\(\)/);
  assert.match(active, /function _handleSourceLinkClick/);
  assert.match(active, /btn\.removeEventListener\('click', _handleSourceLinkClick\)/);
  assert.match(active, /btn\.addEventListener\('click', _handleSourceLinkClick\)/);
  assert.match(active, /updateScore\(\)/);
  assert.match(active, /window\.scrollTo\(\{ top: Number\(state\.scrollY \|\| 0\), behavior:'auto' \}\)/);
  const openStart = active.indexOf('function _openArticleReader');
  const openEnd = active.indexOf('// 本次作答紀錄', openStart);
  const openFn = active.slice(openStart, openEnd);
  assert.doesNotMatch(openFn, /_saveQuizReturnState\(\)/);
  assert.doesNotMatch(openFn, /window\.location\.href/);
  const stateStart = active.indexOf("const QUIZ_RETURN_STATE_KEY = 'sofa_quiz_return_state_v1'");
  const restoreCall = active.indexOf('if(_restoreQuizReturnState()) return');
  assert.ok(stateStart >= 0 && restoreCall > stateStart, 'return-state variables must be initialized before restore runs');
  assert.ok(active.indexOf('let sessionHistory=[]') > stateStart && active.indexOf('let sessionHistory=[]') < restoreCall, 'sessionHistory must exist before restore runs');
  assert.match(active, /function _restoreQuizReturnStateWhenReady/);
  assert.match(active, /if\(!answered\) _restoreQuizReturnState\(\)/);
  assert.match(active, /DOMContentLoaded[\s\S]*setTimeout\(run, 0\)/);
  assert.match(active, /async function loadQuiz\(\)\{\s*if\(_quizLoading\) return;\s*_quizLoading = true;\s*_clearQuizReturnState\(\)/);
  assert.match(active, /async function loadWrongQuiz\(\) \{\s*if\(_quizLoading\) return;\s*_quizLoading = true;\s*_clearQuizReturnState\(\)/);
});

test('quiz loaders reject concurrent loads so options cannot duplicate', () => {
  assert.match(active, /let _quizLoading = false/);
  assert.match(active, /let _quizManualRequested = false/);
  assert.match(active, /function _autoLoadQuizOnce\(\)/);
  const autoStart = active.indexOf('function _autoLoadQuizOnce');
  const autoFn = active.slice(autoStart, autoStart + 260);
  assert.match(autoFn, /if\(_quizManualRequested \|\| _quizLoading \|\| total > 0\) return/);
  assert.match(autoFn, /loadQuiz\(\)/);
  const loadStart = active.indexOf('async function loadQuiz');
  const loadEnd = active.indexOf('function doFlag', loadStart);
  const loadFn = active.slice(loadStart, loadEnd);
  assert.match(loadFn, /if\(_quizLoading\) return/);
  assert.match(loadFn, /_quizLoading = true/);
  assert.match(loadFn, /finally\{\s*_quizLoading = false;\s*\}/);

  assert.match(active, /async function loadWrongQuiz\(\)\{\s*return loadQuiz\(\{wrongReview:true\}\)/);
  assert.match(active, /btnNew'\)\.addEventListener\('click',\(\)=>\{[\s\S]*?_quizManualRequested = true;/);
  assert.doesNotMatch(active, /if\(_initialLawApplied\)\{ loadQuiz\(\); return; \}/);
  assert.doesNotMatch(active, /if\(_startQuizParam\)\{ loadQuiz\(\); return; \}/);
  assert.match(active, /if\(_initialLawApplied\)\{ _autoLoadQuizOnce\(\); return; \}/);
  assert.match(active, /if\(_startQuizParam\)\{ _autoLoadQuizOnce\(\); return; \}/);
});

test('manual quiz starts wait until initial law scope is ready', () => {
  assert.match(active, /let _quizBootReady = false/);
  assert.match(active, /function _setQuizBootReady\(isReady\)/);
  assert.match(active, /btn\.disabled = !_quizBootReady/);
  assert.match(active, /btn\.textContent = _quizBootReady \? '出題' : '載入中'/);
  assert.match(active, /_setQuizBootReady\(false\)/);
  assert.match(active, /_setQuizBootReady\(true\);\s*if\(_restoreQuizReturnState\(\)\) return/);
  assert.match(active, /if\(!_quizBootReady\)\{\s*document\.getElementById\('questionBox'\)\.textContent='法規範圍載入中，馬上可以開始。'/);
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

test('stats recent answers show readable answer source labels', () => {
  assert.match(active, /function _answerSourceLabel/);
  assert.match(active, /line_quiz[\s\S]*LINE 作答/);
  assert.match(active, /line_daily[\s\S]*LINE 每日題/);
  assert.match(active, /line_review[\s\S]*LINE 複習/);
  assert.match(active, /unknown[\s\S]*未標來源/);
  assert.match(active, /來源：\$\{esc\(_answerSourceLabel\(e\.source\)\)\}/);
});

test('wrong review can start from server wrong articles before weak-law fallback', () => {
  assert.match(active, /async function _loadRemoteWrongBankForQuiz/);
  assert.match(active, /\/api\/me\/wrong-articles/);
  assert.match(active, /\/api\/me\/weak-laws/);
  assert.match(active, /wrong_articles/);
  assert.match(active, /top_articles/);
  assert.match(active, /function _wrongArticleToWeakEntry/);

  const wrongStart = active.indexOf('async function loadWrongQuiz');
  assert.ok(wrongStart > -1, 'loadWrongQuiz must exist');
  const wrongEnd = active.indexOf('// ── DOMContentLoaded', wrongStart);
  const wrongFn = active.slice(wrongStart, wrongEnd > wrongStart ? wrongEnd : wrongStart + 7000);
  assert.match(wrongFn, /let bank = await _loadRemoteWrongBankForQuiz\(\)/);
  assert.match(wrongFn, /if \(!bank\.length\) bank = loadWrongBank\(\)/);
  assert.match(wrongFn, /後端弱點也還沒有可重練的題/);
});

test('remote wrong bank prefers latest wrong quiz-session articles over representative top articles', () => {
  const start = active.indexOf('async function _loadRemoteWrongBankForQuiz');
  assert.ok(start > -1, '_loadRemoteWrongBankForQuiz must exist');
  const fn = active.slice(start, start + 2400);
  assert.match(fn, /\/api\/me\/wrong-articles/);
  assert.match(fn, /const mappedWrongItems = wrongItems\.map\(a => _wrongArticleToWeakEntry\(a\)\)\.filter\(e => e\.id\)/);
  assert.match(fn, /if \(mappedWrongItems\.length\) return mappedWrongItems/);
  assert.match(fn, /_wrongArticleToWeakEntry/);
  assert.match(fn, /item\.wrong_articles/);
  assert.match(fn, /item\.top_articles/);
  assert.match(fn, /const articles = \(item\.wrong_articles && item\.wrong_articles\.length\) \? item\.wrong_articles : \(item\.top_articles \|\| \[\]\)/);
  assert.match(fn, /source:a\.answer_source \|\| a\.source \|\| 'server_weak_laws'/);
});

test('remote wrong article mapping preserves source and exact article identity', () => {
  const start = active.indexOf('function _wrongArticleToWeakEntry');
  assert.ok(start > -1, '_wrongArticleToWeakEntry must exist');
  const fn = active.slice(start, start + 1300);
  assert.match(fn, /page_id:a\.page_id \|\| a\.id \|\| ''/);
  assert.match(fn, /law:a\.law \|\| a\.law_name \|\| ''/);
  assert.match(fn, /art:a\.article \|\| \(a\.article_no \? `§\$\{a\.article_no\}` : ''\)/);
  assert.match(fn, /source:a\.answer_source \|\| a\.source \|\| 'wrong_articles'/);
  assert.match(fn, /latest_answered_at:a\.latest_answered_at \|\| ''/);
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

test('weakness article chips carry exact article identity for the in-page reader', () => {
  const start = active.indexOf('function _weakArticleLinks');
  assert.ok(start > -1, '_weakArticleLinks must exist');
  const fn = active.slice(start, start + 1200);
  assert.match(fn, /const pageId = a\.page_id \|\| a\.id \|\| ''/);
  assert.match(fn, /const art = a\.article_no \|\| a\.article \|\| ''/);
  assert.match(fn, /if\(!pageId && !art\) return `<span class="weak-article-link is-muted">/);
  assert.match(fn, /_articleRefAttrs\(law, art \|\| label, pageId\)/);
  assert.match(fn, /class="weak-article-link"/);
  assert.match(fn, /_answerSourceLabel\(a\.answer_source \|\| a\.source\)/);
  assert.doesNotMatch(fn, /target="_blank"/);
  assert.match(active, /function _articleRefAttrs\(law, art, id\)/);
  assert.match(active, /data-law="\$\{_articleRefAttr\(law\|\|''\)\}"/);
  assert.match(active, /data-art="\$\{_articleRefAttr\(art\|\|''\)\}"/);
  assert.match(active, /data-page-id="\$\{_articleRefAttr\(id\)\}"/);
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
  assert.match(active, /const ARTICLE_INLINE_LOADING_FALLBACK_MS = 4500/);
  assert.match(active, /function startInlineArticleLoadingFallback/);
  assert.match(active, /原文還在載入。可以先按上方「查看法條」開完整條文/);
  assert.match(active, /stopInlineFallback\(\)/);
  assert.match(active, /const hasInlineText=showInlineArticleText\(art\.original_text\)/);
  assert.match(active, /hasInlineText\?'條文原文已放在上方':'暫時沒有原文；可按上方查看法條'/);
  assert.match(active, /hasInlineText\?'收起原文 ↑':'收起提示 ↑'/);
  assert.match(active, /暫時沒有原文/);
  assert.match(active, /\.art-inline\{[\s\S]*max-height:none/);
  assert.match(active, /\.art-inline\{[\s\S]*font-size:clamp\(1rem, 3vw, 1\.08rem\)/);
  assert.doesNotMatch(active, /\.art-inline\{[\s\S]*max-height:380px/);
});

test('answer explanation original text card can wrap without clipping mobile content', () => {
  assert.match(active, /\.explain\{[\s\S]*max-width:100%/);
  assert.match(active, /\.explain \.src\{[\s\S]*flex-wrap:wrap/);
  assert.match(active, /\.explain \.src span\{[\s\S]*min-width:0/);
  assert.match(active, /\.explain \.src span\{[\s\S]*overflow-wrap:anywhere/);
  assert.match(active, /\.art-inline\{[\s\S]*overflow-wrap:anywhere/);
  assert.match(active, /@media \(max-width:760px\)\{[\s\S]*\.explain\{[\s\S]*padding:20px 18px/);
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

test('native iOS free quiz explanations still tease locked advanced sections', () => {
  const buildStart = active.indexOf('function buildSections');
  assert.ok(buildStart > -1, 'buildSections must exist');
  const buildEnd = active.indexOf('// ── 錯題本', buildStart);
  const build = active.slice(buildStart, buildEnd);
  assert.match(build, /isIOSReaderApp\(\)/);
  const iosBranchStart = build.indexOf("isIOSReaderApp()");
  const webBranchStart = build.indexOf("\n        : '<div class=\"sec-label\">'+label+'</div>'", iosBranchStart);
  const iosBranch = build.slice(iosBranchStart, webBranchStart);
  assert.match(iosBranch, /<div class="sec-lock-preview">/);
  assert.match(iosBranch, /preview\?formatSection\(preview, articleLawName\):''/);
  assert.match(iosBranch, /進階內容，訂閱者可見/);
  assert.doesNotMatch(iosBranch, /pricing\.html/);
});

test('signed-in learners are not treated as free while entitlement is uncertain', () => {
  assert.match(active, /window\.__sofaPaid = !isFree/);
  assert.match(active, /const isFree = !\(uid \|\| tok\) && \(freeParam \|\| localStorage\.getItem\('sofa_free'\) === 'FREE'\)/);
  assert.match(active, /if \(!\(uid \|\| tok\) && !isFree\)/);
  assert.match(active, /window\.__sofaPaidResolved = !\(uid \|\| tok\)/);
  assert.match(active, /if\(!uid && !tok\)\{ return; \}/);
  assert.match(active, /if\(!d\)\{ _setPaid\(true\); return; \}/);
  assert.match(active, /_setPaid\(true\); \/\/ 未知 plan 字串/);
  assert.match(active, /catch\(\(\) => \{ if\(timer\) clearTimeout\(timer\); _setPaid\(true\); \}/);
  assert.match(active, /function articleSectionsArePaid\(article\)/);
  assert.match(active, /if\(window\.__sofaPaid !== false && !isFree\) return true/);
  assert.match(active, /buildSections\(art\.sections\|\|\{\},articleSectionsArePaid\(art\)/);
});

test('local quiz picks avoid recently shown articles before calling the API', () => {
  assert.match(active, /const RECENT_QUIZ_ARTICLES_KEY = 'sofa_recent_quiz_articles_v1'/);
  assert.match(active, /function rememberRecentQuizArticle/);
  assert.match(active, /function rememberRecentQuizArticles/);
  assert.match(active, /function quizArticleIdentityAliases/);
  assert.match(active, /function pickNonRecentArticle/);
  assert.match(active, /function isRecentQuizArticleId/);
  assert.match(active, /function fetchQuizWithRecentGuard/);
  assert.match(active, /var itemId = item && \(item\.id \|\| item\.page_id\)/);
  assert.match(active, /!recent\.has\(itemId\)/);
  const start = active.indexOf('async function loadQuiz');
  const end = active.indexOf('// Fallback:', start);
  assert.ok(start >= 0 && end > start, 'quiz loader must be extractable before API fallback');
  const loader = active.slice(start, end);
  assert.match(loader, /const cachedArticles = law \? await _ensureArticleCache\(law\) : \[\]/);
  assert.match(active, /pickNonRecentArticle\(_wrongArts\)/);
  assert.match(active, /pickNonRecentArticle\(_hiArts\)/);
  assert.match(active, /pickNonRecentArticle\(_pool\)/);
  assert.match(loader, /data=await fetchQuizWithRecentGuard\(url,\{headers:_authH\(\)\}\)/);
  assert.doesNotMatch(loader, /data=await fetch\(url,\{headers:_authH\(\)\}\)\.then\(r=>r\.json\(\)\)/);
  assert.match(active, /rememberRecentQuizArticle\(pageId\)/);
  assert.match(active, /rememberRecentQuizArticles\(quizArticleIdentityAliases\(data, pickedPageId\)\)/);
  assert.doesNotMatch(loader, /rememberRecentQuizArticle\(pageId\);\s*rememberRecentQuizArticle\(pageId\)/);
});

test('quiz remembers all article id aliases so recent filtering survives API id format changes', () => {
  const source = [
    "const RECENT_QUIZ_ARTICLES_KEY = 'sofa_recent_quiz_articles_v1';",
    extractFunction(active, 'recentQuizArticleIds'),
    extractFunction(active, 'rememberRecentQuizArticles'),
    extractFunction(active, 'rememberRecentQuizArticle'),
    extractFunction(active, 'quizArticleIdentityAliases'),
  ].join('\n');
  const writes = [];
  const sandbox = {
    Set,
    Array,
    String,
    localStorage: {
      getItem(key) {
        assert.equal(key, 'sofa_recent_quiz_articles_v1');
        return JSON.stringify(['old-a', 'notion-a']);
      },
      setItem(key, value) {
        writes.push([key, JSON.parse(value)]);
      },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(`${source}; this.remember = rememberRecentQuizArticles; this.aliases = quizArticleIdentityAliases;`, sandbox);

  sandbox.remember(sandbox.aliases({ page_id: 'notion-a', article_id: 'uuid-a', id: 'legacy-a' }, 'picked-a'));

  assert.deepEqual(writes.at(-1), [
    'sofa_recent_quiz_articles_v1',
    ['notion-a', 'uuid-a', 'legacy-a', 'picked-a', 'old-a'],
  ]);
});

test('random backend quiz fallback retries when it returns recently shown articles', async () => {
  const source = [
    "const RECENT_QUIZ_ARTICLES_KEY = 'sofa_recent_quiz_articles_v1';",
    extractFunction(active, 'recentQuizArticleIds'),
    extractFunction(active, 'isRecentQuizArticleId'),
    extractFunction(active, 'fetchQuizWithRecentGuard'),
  ].join('\n');
  const calls = [];
  const responses = [
    { page_id: 'recent-a' },
    { correct_id: 'recent-b' },
    { page_id: 'fresh-c' },
  ];
  const sandbox = {
    localStorage: {
      getItem(key) {
        assert.equal(key, 'sofa_recent_quiz_articles_v1');
        return JSON.stringify(['recent-a', 'recent-b']);
      },
    },
    fetch: async (url) => {
      calls.push(url);
      const payload = responses.shift();
      return { json: async () => payload };
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(`${source}; this.guard = fetchQuizWithRecentGuard;`, sandbox);

  const data = await sandbox.guard('https://api.example.test/api/quiz?law=民法', {});

  assert.equal(data.page_id, 'fresh-c');
  assert.equal(calls.length, 3);
});

test('page-specific quiz requests do not retry and API errors return immediately', async () => {
  const source = [
    "const RECENT_QUIZ_ARTICLES_KEY = 'sofa_recent_quiz_articles_v1';",
    extractFunction(active, 'recentQuizArticleIds'),
    extractFunction(active, 'isRecentQuizArticleId'),
    extractFunction(active, 'fetchQuizWithRecentGuard'),
  ].join('\n');
  const sandbox = {
    localStorage: { getItem: () => JSON.stringify(['recent-a']) },
    fetch: async () => ({ json: async () => ({ page_id: 'recent-a' }) }),
  };
  vm.createContext(sandbox);
  vm.runInContext(`${source}; this.guard = fetchQuizWithRecentGuard;`, sandbox);
  const direct = await sandbox.guard('https://api.example.test/api/quiz?page_id=recent-a', {});
  assert.equal(direct.page_id, 'recent-a');

  let calls = 0;
  sandbox.fetch = async () => {
    calls++;
    return { json: async () => ({ detail: 'not found' }) };
  };
  const failed = await sandbox.guard('https://api.example.test/api/quiz?law=民法', {});
  assert.equal(failed.detail, 'not found');
  assert.equal(calls, 1);
});

test('article drill deep links consume the exact article only once', () => {
  assert.match(active, /let _articleDrillConsumed = false/);
  assert.match(active, /function _shouldUseUrlArticleDrill\(\)/);
  assert.match(active, /return _drillParam && !_articleDrillConsumed && !!_articleParamFromUrl\(\)/);
  assert.match(active, /function _clearUrlArticleDrillInput\(\)/);
  assert.match(active, /else if\(urlArticle && _shouldUseUrlArticleDrill\(\)\)/);
  assert.match(active, /_articleDrillConsumed = true/);
  assert.match(active, /_clearUrlArticleDrillInput\(\)/);
  assert.match(active, /else if\(artNum && !_articleDrillConsumed && law && cachedArticles\.length\)/);
});

test('wrong review avoids recently shown articles when possible', () => {
  const start = active.indexOf('async function loadWrongQuiz');
  const end = active.indexOf('// 統計面板 open/close', start);
  assert.ok(start >= 0 && end > start, 'wrong quiz loader must be extractable');
  const wrongLoader = active.slice(start, end);
  assert.match(wrongLoader, /const pick = pickNonRecentArticle\(bank\) \|\| bank\[Math\.floor\(Math\.random\(\) \* bank\.length\)\]/);
  assert.match(wrongLoader, /rememberRecentQuizArticles\(quizArticleIdentityAliases\(data, pick\.id\)\)/);
});

test('quiz analysis linkifies sixth-section law references to the in-page article dialog', () => {
  const start = active.indexOf('function cleanCrossRefLawName');
  const end = active.indexOf('function formatSection', start);
  assert.ok(start >= 0 && end > start, 'law reference helper must be extractable before formatSection');
  const helpers = vm.runInNewContext(`${active.slice(start, end)};({linkifyLawRefs,cleanCrossRefLawName})`);

  const linkedSameLaw = helpers.linkifyLawRefs('同法第13條、本法第15條', '記帳士法');
  assert.match(linkedSameLaw, /law-preview\.html\?law=%E8%A8%98%E5%B8%B3%E5%A3%AB%E6%B3%95&art=13/);
  assert.match(linkedSameLaw, /law-preview\.html\?law=%E8%A8%98%E5%B8%B3%E5%A3%AB%E6%B3%95&art=15/);
  assert.match(linkedSameLaw, /&from=quiz&back=quiz\.html/);
  assert.match(linkedSameLaw, /class="crossref"/);
  assert.match(linkedSameLaw, /data-law="記帳士法"/);
  assert.match(linkedSameLaw, /data-art="13"/);
  assert.match(linkedSameLaw, /data-art="15"/);

  const linkedNamedLaw = helpers.linkifyLawRefs('記帳士法第13條及第15條', '所得稅法');
  assert.match(linkedNamedLaw, /law-preview\.html\?law=%E8%A8%98%E5%B8%B3%E5%A3%AB%E6%B3%95&art=13/);
  assert.match(linkedNamedLaw, /law-preview\.html\?law=%E8%A8%98%E5%B8%B3%E5%A3%AB%E6%B3%95&art=15/);
  assert.match(linkedNamedLaw, /data-law="記帳士法"/);
  const linkedPrefixedLaw = helpers.linkifyLawRefs('搭配公司法第29條經理人任免規定', '商業會計法');
  assert.match(linkedPrefixedLaw, />公司法第29條</);
  assert.match(linkedPrefixedLaw, /&from=quiz&back=quiz\.html/);
  assert.match(linkedPrefixedLaw, /data-law="公司法"/);
  assert.match(linkedPrefixedLaw, /data-art="29"/);
  assert.doesNotMatch(linkedPrefixedLaw, />搭配公司法第29條</);
  assert.equal(helpers.cleanCrossRefLawName('搭配公司法'), '公司法');
  const linkedReadableLead = helpers.linkifyLawRefs('交叉記憶可看公司法第29條', '商業會計法');
  assert.match(linkedReadableLead, /law-preview\.html\?law=%E5%85%AC%E5%8F%B8%E6%B3%95&art=29/);
  assert.match(linkedReadableLead, />公司法第29條</);
  assert.match(linkedReadableLead, /data-law="公司法"/);
  assert.doesNotMatch(linkedReadableLead, /law=.*%E4%BA%A4%E5%8F%89/);
  assert.equal(helpers.cleanCrossRefLawName('交叉記憶可看公司法'), '公司法');
  const linkedArticleSeries = helpers.linkifyLawRefs('刑法317、318、319條;地政士法26條(地政士守密義務)', '記帳士法');
  assert.match(linkedArticleSeries, /law-preview\.html\?law=%E5%88%91%E6%B3%95&art=317/);
  assert.match(linkedArticleSeries, /law-preview\.html\?law=%E5%88%91%E6%B3%95&art=318/);
  assert.match(linkedArticleSeries, /law-preview\.html\?law=%E5%88%91%E6%B3%95&art=319/);
  assert.match(linkedArticleSeries, /law-preview\.html\?law=%E5%9C%B0%E6%94%BF%E5%A3%AB%E6%B3%95&art=26/);
  assert.doesNotMatch(linkedArticleSeries, /law=.*%E5%9C%B0%E6%94%BF%E5%A3%AB%E5%AE%88%E5%AF%86/);
  const linkedProfessionalLaw = helpers.linkifyLawRefs('會計師法43條等專業守密規定並列', '記帳士法');
  assert.match(linkedProfessionalLaw, /law-preview\.html\?law=%E6%9C%83%E8%A8%88%E5%B8%AB%E6%B3%95&art=43/);
  assert.doesNotMatch(linkedNamedLaw, /target="_blank"/);
  assert.match(active, /function openCrossRefArticleInline/);
  assert.match(active, /closest\('a\.crossref, a\.weak-article-link'\)/);
  assert.match(active, /開啟法條解析/);
  const openCrossRefFn = extractFunction(active, 'openCrossRefArticleInline');
  assert.match(openCrossRefFn, /ev\.preventDefault\(\)/);
  assert.match(openCrossRefFn, /openQuizArticlePanelByTarget\(_articleTargetFromLink\(link\)\)/);
  assert.doesNotMatch(openCrossRefFn, /window\.location\.href/);
  assert.match(active, /document\.addEventListener\('keydown'/);
  assert.match(active, /if\(ev\.key === 'Escape'\) closeQuizArticlePanel\(\)/);
  assert.match(active, /formatSection\(sections\[name\],\s*articleLawName\)/);
});

test('quiz analysis cross references look like tappable in-reader chips', () => {
  assert.match(active, /\.sec-text \.crossref\{[\s\S]*display:inline-flex/);
  assert.match(active, /\.sec-text \.crossref\{[\s\S]*background:rgba\(231,187,167,\.[0-9]+\)/);
  assert.match(active, /\.sec-text \.crossref\{[\s\S]*border:1px solid rgba\(213,154,120,\.[0-9]+\)/);
  assert.match(active, /\.sec-text \.crossref\{[\s\S]*white-space:nowrap/);
  assert.match(active, /\.sec-text \.crossref:hover\{[\s\S]*background:rgba\(231,187,167,\.[0-9]+\)/);
});

test('quiz analysis nested bullets have visible hierarchy', () => {
  assert.match(active, /\.sec-text \.sec-i\{[^}]*margin:8px 0 8px 26px/);
  assert.match(active, /\.sec-text \.sec-i\{[^}]*padding:8px 12px 8px 34px/);
  assert.match(active, /\.sec-text \.sec-i\{[^}]*border-left:4px solid rgba\(231,187,167,\.[0-9]+\)/);
  assert.match(active, /\.sec-text \.sec-i\{[^}]*background:rgba\(231,187,167,\.[0-9]+\)/);
  assert.match(active, /\.sec-text \.sec-i::before\{[^}]*left:11px/);
  assert.match(active, /@media \(max-width:760px\)\{[\s\S]*\.sec-text \.sec-i\{[^}]*margin:7px 0 7px 12px/);
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
  assert.match(active, /115 \/ 114 現行：遺產稅免稅額 1,333 萬/);
  assert.match(active, /日常器具 100 萬、職業工具 56 萬/);
  assert.match(active, /贈與稅免稅額 244 萬 \/ 年/);
  assert.match(active, /職業工具條文舊基準 40 萬/);
  assert.match(active, /113 年度起已公告為 56 萬/);
  assert.match(active, /重度以上身心障礙 693 萬/);
  assert.match(active, /扶養兄弟姊妹、祖父母每人 56 萬/);
  assert.match(active, /114 \/ 115 已為遺產 5,621 萬 \/ 1 億 1,242 萬/);
  assert.match(active, /贈與稅 2,811 萬 \/ 5,621 萬/);
  assert.match(active, /配偶扣除 553 萬/);
  assert.match(active, /直系血親卑親屬每人 56 萬/);
  assert.match(active, /父母、喪葬費各 138 萬/);
  assert.match(active, /級距 113 年仍為遺產 5,000 萬 \/ 1 億、贈與稅 2,500 萬 \/ 5,000 萬/);
  assert.match(active, /作答時以考試年度與財政部公告額為準/);
  assert.match(active, /題目仍可考條文基準或比例/);

  const callCount = (active.match(/buildSections\(art\.sections\|\|\{\},articleSectionsArePaid\(art\),\s*document\.getElementById\('explainBox'\),document\.getElementById\('sourceBox'\),\s*art\)/g) || []).length;
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

test('weakness drill buttons keep law names in data attributes', () => {
  assert.match(active, /function _weakLawActionButton/);
  assert.match(active, /function _wrongLawChip/);
  assert.match(active, /data-law="\$\{esc\(lawName \|\| ''\)\}"/);
  assert.match(active, /_drillLawAuto\(this\.dataset\.law\)/);
  assert.match(active, /_drillWrongLaw\(this\.dataset\.law\)/);
  assert.doesNotMatch(active, /onclick="_drillLawAuto\(\$\{JSON\.stringify/);
  assert.doesNotMatch(active, /onclick="_drillWrongLaw\(\$\{JSON\.stringify/);
});
