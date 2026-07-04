import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../quiz.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');

test('weakness entry opens a clearly titled weakness analysis panel', () => {
  assert.match(active, /id="stats-panel-title"/);
  assert.match(active, /弱點分析/);
  assert.match(active, /function _statsPanelTitle/);
  assert.match(active, /弱點分析/);
  assert.match(active, /_openParam === 'weakness'[\s\S]*_openWeakness\('weakness'\)/);
  assert.match(active, /_openParam === 'wrong'[\s\S]*_openWeakness\('wrong'\)/);
  assert.doesNotMatch(active, /_openParam === 'wrong'[\s\S]*btnWrong[\s\S]*click\(\)/);
});

test('wrong-book entry labels the shared panel as a wrong-question list', () => {
  assert.match(active, /let _statsPanelMode = 'weakness'/);
  assert.match(active, /function _setStatsPanelMode/);
  assert.match(active, /_statsPanelMode === 'wrong'/);
  assert.match(active, /錯題清單/);
  assert.match(active, /看錯題/);
  assert.match(active, /目前沒有錯題可重練/);
});

test('weakness list uses harmonized card classes and explicit next actions', () => {
  assert.match(active, /\.weak-panel-guide/);
  assert.match(active, /\.weak-card/);
  assert.match(active, /\.weak-action-primary/);
  assert.match(active, /\.weak-article-link/);
  assert.match(active, /\.weak-article-link\{[\s\S]*min-height:44px/);
  assert.match(active, /\.weak-action-primary,\.weak-action-soft\{[\s\S]*min-height:44px/);
  assert.match(active, /\.weak-source-note/);
  assert.match(active, /先看最常錯的法規/);
  assert.match(active, /下一步先練/);
  assert.match(active, /練這部/);
  assert.match(active, /看結果/);
  assert.match(active, /開始重練/);
});

test('weakness overlay uses the SoFa panel system instead of a separate black modal style', () => {
  const cssStart = active.indexOf('.stats-panel{');
  const cssEnd = active.indexOf('.weak-panel-guide{', cssStart);
  assert.ok(cssStart >= 0 && cssEnd > cssStart, 'stats/weakness panel css must be present');
  const css = active.slice(cssStart, cssEnd);
  assert.match(css, /background:[^;]*radial-gradient/);
  assert.match(css, /var\(--navy\)/);
  assert.match(css, /\.stats-panel-shell\{[\s\S]*background:rgba\(26,46,61/);
  assert.match(css, /\.stats-tabs button\{[\s\S]*border:1px solid rgba\(245,240,234/);
  assert.match(css, /\.stats-tabs button\.on\{[\s\S]*background:var\(--peach\)/);
  assert.doesNotMatch(css, /background:#040D14/);
  assert.doesNotMatch(css, /rgba\(0,0,0/);
});

test('weakness panel names what to look at and where to act in one visible strip', () => {
  assert.match(active, /先看最常錯/);
  assert.match(active, /點「練這部」單刷/);
  assert.match(active, /看完整條文/);
  assert.match(active, /下一步先練/);
  assert.match(active, /資料來源/);
});

test('weakness wrong article labels are clickable article links', () => {
  assert.match(active, /function _weakArticleLinks/);
  assert.match(active, /_articleReaderHref/);
  assert.match(active, /weak-article-link/);
  assert.match(active, /_answerSourceLabel\(a\.answer_source \|\| a\.source\)/);
  assert.match(active, /_weakArticleLinks\(law, item\.top_articles \|\| \[\], 2\)/);
  assert.match(active, /_weakArticleLinks\(law, sourceArticles, 2\)/);
});

test('session summary gives a direct weakness analysis next step', () => {
  const start = active.indexOf('id="summaryOverlay"');
  const end = active.indexOf('id="sprint-results"', start);
  assert.ok(start >= 0 && end > start, 'session summary overlay must exist');
  const summary = active.slice(start, end);
  assert.match(summary, /id="sumOpenWeakness"/);
  assert.match(summary, /看弱點分析/);
  assert.match(summary, /_openWeakness\(\)/);
  assert.match(active, /showSessionSummary[\s\S]*sumOpenWeakness[\s\S]*style\.display/);
});

test('weakness analysis names all formal answer sources as merged', () => {
  assert.match(active, /function _weakSourceLine/);
  assert.match(active, /每日一題/);
  assert.match(active, /LINE 作答/);
  assert.match(active, /網頁選擇題/);
  assert.match(active, /填空/);
  assert.match(active, /打字練習/);
  assert.match(active, /考古題/);
  assert.match(active, /錯題重練/);
});

test('signed-in weakness analysis waits for remote truth before using local fallback', () => {
  assert.match(active, /function _signedInWeaknessUsesRemoteTruth/);
  assert.match(active, /function _renderSignedInWeaknessLoading/);
  assert.match(active, /function _renderSignedInWeaknessLoadIssue/);
  assert.match(active, /正在讀取帳號答題紀錄/);
  assert.match(active, /暫不使用本機暫存判斷/);
  const start = active.indexOf('function _renderWrongList');
  const end = active.indexOf('function _drillAllWrong', start);
  assert.ok(start >= 0 && end > start, '_renderWrongList must exist');
  const fn = active.slice(start, end);
  assert.match(fn, /if \(_signedInWeaknessUsesRemoteTruth\(\) && !_remoteWeakLawsLoaded\)/);
  assert.match(fn, /_renderSignedInWeaknessLoading\(\)/);
  assert.match(fn, /_loadRemoteWeakLaws\(\{force:true, target:'panel'\}\)/);
  assert.match(fn, /return;/);
});

test('remote weakness panel has explicit empty and failure states for signed-in users', () => {
  const remoteStart = active.indexOf('function _renderWrongListFromRemote');
  assert.ok(remoteStart > -1, '_renderWrongListFromRemote must exist');
  const remoteFn = active.slice(remoteStart, remoteStart + 1400);
  assert.match(remoteFn, /if \(!list\.length\)/);
  assert.match(remoteFn, /panel\.innerHTML =/);
  assert.match(remoteFn, /目前沒有足夠的帳號答題紀錄/);

  const loadStart = active.indexOf('function _loadRemoteWeakLaws');
  assert.ok(loadStart > -1, '_loadRemoteWeakLaws must exist');
  const loadFn = active.slice(loadStart, loadStart + 3200);
  assert.match(loadFn, /\/api\/me\/wrong-articles/);
  assert.match(loadFn, /_mergeWrongArticlesIntoWeakLaws/);
  assert.match(loadFn, /opts\.target === 'panel'[\s\S]*_renderSignedInWeaknessLoadIssue\(\)/);
});

test('weakness panel merges article-level wrong answers into law weaknesses', () => {
  const mergeStart = active.indexOf('function _mergeWrongArticlesIntoWeakLaws');
  assert.ok(mergeStart > -1, '_mergeWrongArticlesIntoWeakLaws must exist');
  const mergeFn = active.slice(mergeStart, mergeStart + 2600);
  assert.match(mergeFn, /_wrongArticlesToWeakLawItems/);
  assert.match(mergeFn, /wrong_articles/);
  assert.match(mergeFn, /top_articles/);
  assert.match(mergeFn, /law_name/);
  assert.match(mergeFn, /wrong_count/);
});

test('empty weakness state tells the learner what to do without self-judging', () => {
  assert.match(active, /不用自己判斷哪裡弱/);
  assert.match(active, /開始練習/);
  assert.match(active, /weak-action-primary[\s\S]*startSession\(5\)/);
  assert.match(active, /系統會用你的答題紀錄整理/);
});

test('weakness panel avoids showing a zero wrong-bank card above law weaknesses', () => {
  const fnStart = active.indexOf('function _renderWrongList');
  const fnEnd = active.indexOf('function _drillAllWrong', fnStart);
  assert.ok(fnStart >= 0 && fnEnd > fnStart, '_renderWrongList must exist');
  const fn = active.slice(fnStart, fnEnd);
  const gate = fn.indexOf('if(bank.length)');
  const card = fn.indexOf('本機錯題清單', gate);
  assert.ok(gate >= 0 && card > gate, 'wrong-bank card should be gated by bank.length');
});
