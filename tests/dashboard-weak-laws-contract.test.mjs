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
  assert.match(html, /law_name/);
  assert.match(html, /wrong_count/);
  assert.match(html, /top_articles/);
  assert.match(html, /最該補的法規|弱點法規/);
});

test('weak law rendering avoids fake empty metrics', () => {
  const start = html.indexOf('function renderWeakLaws');
  assert.ok(start >= 0, 'renderWeakLaws function must exist');
  const fn = html.slice(start, start + 1600);
  assert.match(fn, /recap\.style\.display='block'/);
  assert.match(fn, /目前還沒有足夠錯題累積/);
  assert.doesNotMatch(fn, /目前有 0|0 條弱點/);
});
