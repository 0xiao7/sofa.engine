import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');

test('dashboard fetches authenticated weak-laws API for exam-pass recovery', () => {
  assert.match(html, /\/api\/me\/weak-laws/);
  assert.match(html, /\/api\/me\/wrong-articles/);
  assert.match(html, /id="weak-laws-recap"/);
  assert.match(html, /id="weak-laws-list"/);
});

test('dashboard renders weak law items at law level with real counts', () => {
  assert.match(html, /function renderWeakLaws/);
  assert.match(html, /function mergeWrongArticlesIntoWeakLaws/);
  assert.match(html, /renderWeakLaws\(mergeWrongArticlesIntoWeakLaws/);
  assert.match(html, /_rememberRemoteWeakArticles\(items\)/);
  assert.match(html, /renderStudyWeakBrief\(laws\)/);
  assert.match(html, /function renderStudyWeakState/);
  assert.match(html, /renderStudyWeakState\(laws\)/);
  assert.match(html, /_latestWeakLawItems\s*=\s*laws/);
  assert.match(html, /law_name/);
  assert.match(html, /wrong_count/);
  assert.match(html, /top_articles/);
  assert.match(html, /最該補的法規|弱點法規/);
});

test('weak law recap is a summary and does not duplicate the today weak list', () => {
  const start = html.indexOf('function renderWeakLaws');
  assert.ok(start >= 0, 'renderWeakLaws function must exist');
  const fn = html.slice(start, start + 2400);
  assert.match(html, /\.weak-law-summary\{/);
  assert.match(html, /\.weak-law-summary-actions a\.primary/);
  assert.match(fn, /var topLaw = laws\[0\] \|\| \{\}/);
  assert.match(fn, /var totalWrong = laws\.reduce/);
  assert.match(fn, /var drillHref = 'quiz\.html\?law=' \+ encodeURIComponent\(topLaw\.law_name \|\| ''\) \+ '&drill=1'/);
  assert.match(fn, /class="weak-law-summary"/);
  assert.match(fn, /先補最弱/);
  assert.match(fn, /quiz\.html\?open=weakness/);
  assert.doesNotMatch(fn, /laws\.slice\(0,4\)\.map/);
  assert.doesNotMatch(fn, /class="recap-row weak-law-row is-link"/);
});

test('study today does not clear weak-laws that loaded first', () => {
  assert.match(html, /var _latestWeakLawItems = \[\]/);
  const start = html.indexOf('function renderStudyToday');
  assert.ok(start >= 0, 'renderStudyToday must exist');
  const fn = html.slice(start, start + 2600);
  assert.match(fn, /var bridgeItems = \(data\.weak_law_bridge && data\.weak_law_bridge\.items\) \|\| \[\]/);
  assert.match(fn, /var weakItems = bridgeItems\.length \? bridgeItems : _latestWeakLawItems/);
  assert.match(fn, /renderStudyWeakBrief\(weakItems\)/);
  assert.match(fn, /renderStudyWeakState\(weakItems\)/);
});

test('weak law rendering avoids fake empty metrics', () => {
  const start = html.indexOf('function renderWeakLaws');
  assert.ok(start >= 0, 'renderWeakLaws function must exist');
  const fn = html.slice(start, start + 1600);
  assert.match(fn, /recap\.style\.display='block'/);
  assert.match(fn, /目前還沒有足夠錯題累積/);
  assert.doesNotMatch(fn, /目前有 0|0 條弱點/);
});

test('weak law API failures are not shown as no accumulated weakness', () => {
  assert.match(html, /function renderStudyWeakLoadIssue/);
  assert.match(html, /弱點暫時讀不到/);
  assert.match(html, /這不是代表你沒有答題紀錄/);
  assert.match(html, /已累積的答題紀錄不會消失/);
  assert.match(html, /__load_error/);
  assert.match(html, /wrongItems\.length/);
  assert.match(html, /renderWeakLaws\(mergeWrongArticlesIntoWeakLaws\(\[\], wrongItems\)\)/);
  assert.match(html, /catch\(function\(\)\{ renderStudyWeakLoadIssue\(\); \}\)/);
});

test('dashboard can build weak-law groups from article-level wrong answers', () => {
  const start = html.indexOf('function wrongArticlesToWeakLawItems');
  assert.ok(start >= 0, 'wrongArticlesToWeakLawItems function must exist');
  const fn = html.slice(start, start + 2600);
  assert.match(fn, /law_name/);
  assert.match(fn, /wrong_articles/);
  assert.match(fn, /top_articles/);
  assert.match(fn, /answer_source/);
  assert.match(fn, /latest_answered_at/);
});
