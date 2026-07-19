import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const analysisPath = new URL('../analysis.html', import.meta.url);
const analysis = existsSync(analysisPath) ? readFileSync(analysisPath, 'utf8') : '';
const analytics = readFileSync(new URL('../sofa-analytics.js', import.meta.url), 'utf8');

test('analysis page exists as a mobile-first standalone radar page', () => {
  assert.ok(analysis, 'analysis.html should exist');
  assert.match(analysis, /<meta name="viewport" content="[^"]*width=device-width[^"]*initial-scale=1/);
  assert.match(analysis, /進度雷達/);
  assert.match(analysis, /盲區/);
  assert.match(analysis, /熱區/);
  assert.match(analysis, /待複習/);
  assert.match(analysis, /下一步/);
  assert.match(analysis, /到考日/);
});

test('countdown is loaded from exam-plan-contract instead of hard-coded exam dates', () => {
  assert.match(analysis, /fetch\(['"]exam-plan-contract\.json/);
  assert.match(analysis, /exam_date/);
  assert.match(analysis, /access_until/);
  assert.doesNotMatch(analysis, /2026-11-14/);
  assert.doesNotMatch(analysis, /2026\/11\/14/);
  assert.doesNotMatch(analysis, /new Date\(['"]2026-/);
});

test('authenticated analysis uses the aggregate API and magic link lands here', () => {
  assert.match(analysis, /\/api\/me\/analysis/);
  assert.match(analysis, /\/api\/auth\/magic/);
  assert.match(analysis, /URLSearchParams\(location\.search\)/);
  assert.match(analysis, /localStorage\.setItem\(['"]sofa_token/);
  assert.doesNotMatch(analysis, /location\.href\s*=\s*['"]dashboard\.html/);
});

test('free preview reads local 5-question state before login', () => {
  assert.match(analysis, /sofa_quiz_stats_v1/);
  assert.match(analysis, /sofa_wrong_ids/);
  assert.match(analysis, /sofa_exam_history_v1/);
  assert.match(analysis, /localStorage/);
  assert.match(analysis, /5 題/);
  assert.match(analysis, /topLimit\s*=\s*3/);
});

test('free and paid surfaces expose the required conversion split', () => {
  assert.match(analysis, /免費預覽/);
  assert.match(analysis, /完整排程/);
  assert.match(analysis, /弱點優先/);
  assert.match(analysis, /每週診斷/);
  assert.match(analysis, /checkout\.html\?plan=到考日&utm_source=analysis&utm_medium=radar&utm_campaign=ex25_analysis/);
  assert.match(analysis, /data-track-event="analysis_checkout_click"/);
});

test('blind spots use weak laws and wrong articles, with mastery at most auxiliary', () => {
  assert.match(analysis, /weak_laws/);
  assert.match(analysis, /wrong_articles/);
  assert.doesNotMatch(analysis, /\/api\/me\/mastery/);
});

test('analysis tracking is forwarded server-side and page loads the bridge', () => {
  assert.match(analysis, /sofa-analytics\.js\?v=20260704-revenue-v1/);
  assert.match(analysis, /sofaTrack\('analysis_view'/);
  assert.match(analytics, /\['analysis_view', 'analysis_view'\]/);
  assert.match(analytics, /\['analysis_checkout_click', 'analysis_checkout_click'\]/);
  assert.match(analytics, /analysis\.html/);
});

test('analysis page keeps public answer-source boundary honest', () => {
  assert.doesNotMatch(analysis, /保證考上/);
  assert.doesNotMatch(analysis, /AI 解析/);
  assert.match(analysis, /SoFa Engine 參考解析/);
  assert.match(analysis, /非考選部官方標準答案/);
});
