import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');

test('dashboard exposes a seed-backed cockpit recap', () => {
  assert.match(active, /id="study-cockpit-recap"/);
  assert.match(active, /id="study-cockpit-subjects"/);
  assert.match(active, /id="study-cockpit-blocks"/);
});

test('dashboard fetches the authenticated study today endpoint', () => {
  assert.match(active, /\/api\/me\/study\/today\?track=bookkeeper/);
});

test('dashboard renders subject containers and seeded blocks', () => {
  assert.match(active, /function renderStudyToday/);
  assert.match(active, /implementation_status/);
  assert.match(active, /deferred_subject_container_only/);
  assert.match(active, /seeded_moex_mcq/);
  assert.match(active, /law_to_subject_mapping/);
});

test('study today empty weak bridge avoids fake zero metrics', () => {
  const start = active.indexOf('function renderStudyToday');
  assert.ok(start >= 0, 'renderStudyToday function must exist');
  const fn = active.slice(start, start + 2600);
  assert.match(fn, /weak_law_bridge/);
  assert.doesNotMatch(fn, /0 條弱點|目前有 0/);
});

test('study today uses exam-facing wording instead of internal cockpit jargon', () => {
  assert.match(active, /TODAY · 今天先做/);
  assert.match(active, /不知道從哪裡開始，先做一題/);
  assert.match(active, /今天先做/);
  assert.doesNotMatch(active, /COCKPIT · 今日備考座艙|今日座艙/);
});

test('study today makes working tools obvious while planner controls are pending', () => {
  assert.match(active, /class="study-actions"/);
  assert.match(active, /下一步/);
  assert.match(active, /class="study-action-link primary" href="quiz\.html"[\s\S]*開始選擇題/);
  assert.match(active, /href="#review-due"[\s\S]*看今日複習/);
  assert.match(active, /href="quiz\.html\?open=weakness"[\s\S]*看弱點分析/);
  assert.match(active, /class="study-pending"[\s\S]*aria-disabled="true"[\s\S]*個人排程稍後開放/);
  assert.doesNotMatch(active, /onclick="saveStudy|onclick="toggleStudyBlock/);
});

test('study today puts next-step actions before lower-priority subject detail', () => {
  const recapStart = active.indexOf('id="study-cockpit-recap"');
  assert.ok(recapStart >= 0, 'study recap must exist');
  const recap = active.slice(recapStart, recapStart + 2600);
  const actionIndex = recap.indexOf('class="study-actions"');
  const subjectsIndex = recap.indexOf('id="study-cockpit-subjects"');
  const blocksIndex = recap.indexOf('id="study-cockpit-blocks"');
  assert.ok(actionIndex > -1, 'next-step actions must exist');
  assert.ok(subjectsIndex > -1, 'subject details must exist');
  assert.ok(blocksIndex > -1, 'block details must exist');
  assert.ok(actionIndex < subjectsIndex, 'actions should appear before subject details');
  assert.ok(actionIndex < blocksIndex, 'actions should appear before block details');
});

test('study today appears before settings and member details in the page flow', () => {
  const studyIndex = active.indexOf('id="study-cockpit-recap"');
  const settingsIndex = active.indexOf('id="srs-settings"');
  const memberIndex = active.indexOf('id="member"');
  assert.ok(studyIndex > -1, 'study recap must exist');
  assert.ok(settingsIndex > -1, 'SRS settings must exist');
  assert.ok(memberIndex > -1, 'member section must exist');
  assert.ok(studyIndex < settingsIndex, 'next-step study card should appear before strategy settings');
  assert.ok(studyIndex < memberIndex, 'next-step study card should appear before member details');
});

test('mobile dashboard prioritizes next-step guidance before the full tool grid', () => {
  assert.match(active, /#study-cockpit-recap\{order:-32;margin-bottom:14px\}/);
  assert.match(active, /#tools\{order:-30;margin-bottom:24px\}/);
});

test('sidebar and mobile quick entry use clear exam-loop labels', () => {
  assert.match(active, /<a href="#study-cockpit-recap"><span class="num">T1<\/span>今天先做/);
  assert.match(active, /<a href="quiz\.html"><span class="num">T2<\/span>選擇題/);
  assert.match(active, /<a href="#review-due"><span class="num">T3<\/span>今日複習/);
  assert.match(active, /<a href="quiz\.html\?open=weakness"><span class="num">T4<\/span>弱點分析/);
  assert.match(active, /<span class="mdb-lbl">今天先做<\/span>/);
});

test('study today remains visible for free users or missing study API data', () => {
  assert.match(active, /if\(!uid \|\| isFree\)\{[\s\S]*renderStudyToday\(null\);[\s\S]*return;[\s\S]*\}/);
  assert.match(active, /renderStudyToday\(studyTodayRes \|\| null\)/);
  const start = active.indexOf('function renderStudyToday');
  assert.ok(start >= 0, 'renderStudyToday function must exist');
  const fn = active.slice(start, start + 3600);
  assert.match(fn, /if\(!data\)\s*data =/);
  assert.match(fn, /先做 1 題開始累積弱點/);
  assert.match(fn, /先從「開始選擇題」做一題/);
});
