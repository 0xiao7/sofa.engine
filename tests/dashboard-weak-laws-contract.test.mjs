import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');

test('dashboard fetches authenticated weak-laws API for exam-pass recovery', () => {
  assert.match(html, /\/api\/me\/weak-laws/);
  assert.match(html, /id="weak-laws-recap"/);
  assert.match(html, /id="weak-laws-list"/);
});

test('dashboard renders weak law items at law level with real counts', () => {
  assert.match(html, /function renderWeakLaws/);
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

test('weak law recap rows are direct single-practice links', () => {
  const start = html.indexOf('function renderWeakLaws');
  assert.ok(start >= 0, 'renderWeakLaws function must exist');
  const fn = html.slice(start, start + 2400);
  assert.match(fn, /var drillHref = 'quiz\.html\?law=' \+ encodeURIComponent\(law\.law_name \|\| ''\) \+ '&drill=1'/);
  assert.match(fn, /<a class="recap-row weak-law-row is-link" href="'\+drillHref\+'"/);
  assert.match(fn, /aria-label="單刷/);
  assert.match(fn, /錯 '\+esc\(law\.wrong_count\|\|0\)\+' 次 · 單刷/);
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
  assert.match(html, /catch\(function\(\)\{ renderStudyWeakLoadIssue\(\); \}\)/);
});
