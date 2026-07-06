import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');

test('dashboard first screen gives candidates a concrete next action before member details', () => {
  const cockpitIndex = active.indexOf('id="candidate-study-cockpit"');
  const memberIndex = active.indexOf('id="member"');
  assert.ok(cockpitIndex > -1, 'candidate first-screen cockpit must exist');
  assert.ok(memberIndex > -1, 'member section must exist');
  assert.ok(cockpitIndex < memberIndex, 'candidate next-step panel should appear before member details');

  assert.match(active, /<a href="#candidate-study-cockpit" class="on"><span class="num">T1<\/span>今天先做/);
  assert.match(active, /TODAY · 今天先做/);
  assert.match(active, /先做一題，看出弱點，再決定要補哪裡。/);
});

test('dashboard candidate cockpit routes to real study actions without pretending progress is answer accuracy', () => {
  const start = active.indexOf('id="candidate-study-cockpit"');
  const end = active.indexOf('<!-- ============ 01 MEMBER ============ -->', start);
  const block = active.slice(start, end);

  assert.match(block, /href="quiz\.html"[\s\S]*開始選擇題/);
  assert.match(block, /href="quiz\.html\?open=weakness"[\s\S]*看弱點分析/);
  assert.match(block, /href="#review"[\s\S]*今日複習/);
  assert.match(block, /href="quiz\.html\?mode=past-exam"[\s\S]*歷屆試題/);
  assert.match(block, /重點朗讀/);
  assert.match(block, /排課 \/ 補紀錄/);
  assert.match(block, /答題後留下錯題、弱點和複習入口/);
  assert.match(block, /答對率只來自真的作答/);
  assert.doesNotMatch(block, /今日座艙|COCKPIT · 今日備考座艙|有空再排課/);
});

test('dashboard candidate cockpit stays mobile tappable and avoids layout squeezing', () => {
  assert.match(active, /\.candidate-study-action\{[\s\S]*min-height:44px/);
  assert.match(active, /\.candidate-study-actions\{[\s\S]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(active, /@media \(max-width: 760px\)\{[\s\S]*\.candidate-study-actions\{grid-template-columns:1fr\}/);
});
