import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');

test('dashboard first screen gives candidates a concrete next action before member details', () => {
  const cockpitIndex = active.indexOf('id="study-cockpit-recap"');
  const memberIndex = active.indexOf('id="member"');
  assert.ok(cockpitIndex > -1, 'study first-screen cockpit must exist');
  assert.ok(memberIndex > -1, 'member section must exist');
  assert.ok(cockpitIndex < memberIndex, 'candidate next-step panel should appear before member details');

  assert.match(active, /data-spy-target="study-cockpit-recap"><span class="num">T1<\/span>今天先做/);
  assert.match(active, /TODAY · 今天先做/);
  assert.match(active, /先做一題或接著讀。/);
});

test('dashboard candidate cockpit routes to real study actions without pretending progress is answer accuracy', () => {
  const start = active.indexOf('id="study-cockpit-recap"');
  const end = active.indexOf('<!-- ============ 01 MEMBER ============ -->', start);
  const block = active.slice(start, end);

  assert.match(block, /href="quiz\.html"[\s\S]*開始選擇題/);
  assert.match(block, /href="quiz\.html\?open=weakness"[\s\S]*弱點分析/);
  assert.match(block, /href="#review-due"[\s\S]*今日複習/);
  assert.match(block, /重點朗讀/);
  assert.match(block, /排課/);
  assert.match(block, /補紀錄/);
  assert.match(block, /補紀錄只補時間與進度，不會改答題正確率/);
  assert.match(block, /本週建議/);
  assert.match(block, /排入本週計畫/);
  assert.doesNotMatch(block, /今日座艙|COCKPIT · 今日備考座艙|有空再排課/);
});

test('dashboard candidate cockpit stays mobile tappable and avoids layout squeezing', () => {
  assert.match(active, /\.study-action-link,\.study-pending\{[\s\S]*min-height:44px/);
  assert.match(active, /\.study-actions\{[\s\S]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(active, /@media \(max-width:760px\)\{[\s\S]*\.study-actions\{[\s\S]*grid-template-columns:1fr/);
});
