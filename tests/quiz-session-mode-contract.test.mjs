import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../quiz.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Could not extract ${name}`);
}

test('law drill deeplinks are not limited by the bookkeeper past-exam two-subject boundary', () => {
  const applyInitial = extractFunction(active, '_applyInitialLawParam');
  assert.match(applyInitial, /const raw = _lawParamFromUrl\(\)/);
  assert.match(applyInitial, /document\.createElement\('option'\)/);
  assert.match(applyInitial, /o\.value = law/);
  assert.match(applyInitial, /sel\.appendChild\(o\)/);
  assert.match(applyInitial, /sel\._skipPersistOnce = _drillParam/);

  const defaultExam = extractFunction(active, '_defaultExamForQuizStart');
  assert.match(defaultExam, /_lawParamFromUrl\(\)/);
  assert.match(defaultExam, /_drillParam/);
  assert.match(defaultExam, /if \(examKey \|\| !_startQuizParam \|\| _lawParamFromUrl\(\) \|\| _articleParamFromUrl\(\) \|\| _drillParam \|\| _pastExamMode\) return examKey/);

  assert.match(active, /import\('\.\/exam-capabilities\.mjs'\)/);
  assert.match(active, /subjectsForExam\(examKey\)/);
  assert.doesNotMatch(active, /const _PAST_EXAM_SUBJECTS/);
  assert.match(active, /if\(_initialLawApplied\)\{ _autoLoadQuizOnce\(\); return; \}/);
});

test('session mode is enabled by URL and uses a bounded question count', () => {
  assert.match(active, /const _sessionMode = _searchParams\.get\('session'\) === '1' \|\| _searchParams\.get\('mode'\) === 'session'/);
  assert.match(active, /function parseSessionTargetCount\(\)/);
  assert.match(active, /Math\.min\(30, Math\.max\(1, raw\)\)/);
  assert.match(active, /const _sessionTargetCount = parseSessionTargetCount\(\)/);
});

test('session mode has a visible summary card with save actions', () => {
  assert.match(active, /id="session-summary"/);
  assert.match(active, /id="session-summary-title"/);
  assert.match(active, /id="session-summary-stats"/);
  assert.match(active, /保留這輪錯題與弱點/);
  assert.match(active, /已有序號？登入保存/);
  assert.match(active, /href="login\.html\?utm_source=web_quiz&utm_medium=session_summary&utm_campaign=quiz_session_save"/);
  assert.match(active, /data-track-event="quiz_session_save_click"/);
  assert.match(active, /data-track-label="quiz_session_save"/);
  assert.match(active, /href="pricing\.html\?utm_source=web_quiz&utm_medium=session_summary&utm_campaign=quiz_session_upgrade"/);
  assert.match(active, /data-track-event="quiz_session_pricing_click"/);
  assert.match(active, /data-track-label="quiz_session_pricing"/);
});

test('session answers record progress but defer correctness and explanation', () => {
  assert.match(active, /function onAnswerDone\(isCorrect, loader\)/);
  const start = active.indexOf('function onAnswerDone');
  const end = active.indexOf('function showSessionSummary', start);
  assert.ok(start >= 0 && end > start, 'onAnswerDone must be before showSessionSummary');
  const fn = active.slice(start, end);
  assert.match(fn, /if \(!_sessionMode\) return false/);
  assert.match(fn, /sessionHistory\.filter\(q=>q\.correct!==null\)\.length >= _sessionTargetCount/);
  assert.match(fn, /showSessionSummary\(\)/);
  assert.match(fn, /setTimeout\(\(\) => \{ wrongMode \? loadWrongQuiz\(\) : loadQuiz\(\); \}, SESSION_AUTO_NEXT_DELAY_MS\)/);
  assert.match(active, /if\(onAnswerDone\(isCorrect, loadQuiz\)\) return/);
  assert.match(active, /document\.getElementById\('explainBox'\)\.style\.display='block'/);
});

test('session mode copy separates free practice from saved records', () => {
  assert.match(active, /刷題模式/);
  assert.match(active, /先做完這組題目，再一次看結果/);
  assert.match(active, /免費可先刷題；登入後才會保留完整紀錄與弱點統計/);
});

test('session mode tracks start and completion as a measurable funnel', () => {
  assert.match(active, /function trackQuizSessionEvent\(name, data\)/);
  assert.match(active, /trackQuizSessionEvent\('quiz_session_start'/);
  assert.match(active, /trackQuizSessionEvent\('quiz_session_complete'/);
  assert.match(active, /target_count: _sessionTargetCount/);
  assert.match(active, /answered: answered_n/);
  assert.match(active, /correct: right/);
  assert.match(active, /wrong: wrong/);
  assert.match(active, /accuracy: acc/);
});

test('quiz session starts only after the first valid question is loaded', () => {
  const loadQuiz = extractFunction(active, 'loadQuiz');
  const fetchIndex = loadQuiz.indexOf('fetchQuizWithRecentGuard');
  const incrementIndex = loadQuiz.indexOf('total++; currentQuestionNum=total');
  const timerIndex = loadQuiz.indexOf('startSessionTimer()');
  assert.ok(fetchIndex >= 0, 'quiz must fetch a question');
  assert.ok(incrementIndex > fetchIndex, 'question count must increment after a valid response');
  assert.ok(timerIndex > fetchIndex, 'timer must start after a valid response');
  assert.doesNotMatch(
    active.slice(active.indexOf('if(_sessionMode){'), active.indexOf('function _lawParamFromUrl')),
    /trackQuizSessionEvent\('quiz_session_start'/,
  );
  assert.match(loadQuiz, /if\(_sessionMode && total===1\)\s*trackQuizSessionEvent\('quiz_session_start'/);
  assert.match(loadQuiz, /if\(!quizPayloadUsable\(data\)\)/);
  const usable = extractFunction(active, 'quizPayloadUsable');
  assert.match(usable, /options\.length/);
  assert.match(usable, /data\.question/);
  assert.match(usable, /data\.answer/);
  assert.match(usable, /is_correct/);
});

test('all-laws quiz retries other laws inside the selected exam scope', () => {
  assert.match(active, /async function fetchQuizAcrossExamScope\(/);
  const helper = extractFunction(active, 'fetchQuizAcrossExamScope');
  assert.match(helper, /_quizExamLaws/);
  assert.match(helper, /fetchQuizWithRecentGuard/);
  assert.match(helper, /for\(const candidate of candidates\)/);
  assert.match(helper, /if\(!names\.length\)return/);
  assert.doesNotMatch(helper, /_BOOKKEEPER_LAWS/);
  assert.doesNotMatch(helper, /fetchQuizWithRecentGuard\(`\$\{API\}\/api\/quiz`/);

  const loadQuiz = extractFunction(active, 'loadQuiz');
  assert.match(loadQuiz, /data=await fetchQuizAcrossExamScope\(\{headers:_authH\(\)\}\)/);
});

test('finished session errors are buttons that reopen the question with its answer', () => {
  const rebuildErrors = extractFunction(active, 'rebuildErrorList');
  assert.match(rebuildErrors, /class="session-error-review"/);
  assert.match(rebuildErrors, /data-question-num/);
  assert.match(rebuildErrors, /showSessionQuestion\(Number\(button\.dataset\.questionNum\)\)/);

  const showQuestion = extractFunction(active, 'showSessionQuestion');
  assert.match(showQuestion, /if\(sessionFinished\) revealSessionQuestionAnswer\(item\)/);

  const reveal = extractFunction(active, 'revealSessionQuestionAnswer');
  assert.match(reveal, /item\.selectedIndex/);
  assert.match(reveal, /item\.correctIndex/);
  assert.match(reveal, /classList\.add\('right'\)/);
  assert.match(reveal, /classList\.add\('wrong'\)/);
  assert.match(reveal, /\u6b63\u78ba\u7b54\u6848/);

  const loadQuiz = extractFunction(active, 'loadQuiz');
  assert.match(loadQuiz, /cur\.selectedIndex=i/);
  assert.match(loadQuiz, /cur\.correctIndex=correctIdx/);

  const timeout = extractFunction(active, '_startCountdown');
  assert.match(timeout, /cur\.selectedIndex=-1/);
  assert.match(timeout, /cur\.correctIndex=correctIdx/);
  assert.match(reveal, /loadSessionReviewExplanation\(item/);
  const explanation = extractFunction(active, 'loadSessionReviewExplanation');
  assert.match(explanation, /\/api\/article\/\$\{pageId\}/);
  assert.match(explanation, /sections/);
});

test('keyboard next shortcut does not override focused controls', () => {
  assert.match(active, /if\(e\.target\.closest\('button,a,input,select,textarea,\[role="button"\],\[contenteditable="true"\]'\)\)return/);
});

test('completed bounded sessions navigate only among stored questions', () => {
  const next = extractFunction(active, 'showNextQuestion');
  assert.match(next, /if\(_sessionMode&&sessionFinished\)/);
  assert.match(next, /showSessionQuestion\(currentQuestionNum\+1\)/);
  const finishedBranch = next.slice(next.indexOf('if(_sessionMode&&sessionFinished)'));
  assert.match(finishedBranch, /return/);
});

test('paid members see saved-session copy without upgrade or login prompts', () => {
  assert.match(active, /id="session-intro-copy"/);
  assert.match(active, /id="session-summary-copy"/);
  assert.match(active, /id="session-upgrade-action"/);
  assert.match(active, /id="session-login-action"/);
  const update = extractFunction(active, 'updateSessionMemberUI');
  assert.match(update, /if\(isFree\)/);
  assert.match(update, /\u6703\u54e1\u6a21\u5f0f/);
  assert.match(update, /\u672c\u8f2a\u4f5c\u7b54\u3001\u932f\u984c\u8207\u5f31\u9ede\u7d71\u8a08\u5df2\u4fdd\u5b58/);
  assert.match(update, /upgrade\.style\.display='none'/);
  assert.match(update, /login\.style\.display='none'/);
  assert.match(active, /showSessionSummary\(\)[\s\S]*updateSessionMemberUI\(\)/);
});
