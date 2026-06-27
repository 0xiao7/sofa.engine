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

test('study today surfaces weakness before lower dashboard sections', () => {
  const recapStart = active.indexOf('id="study-cockpit-recap"');
  assert.ok(recapStart >= 0, 'study recap must exist');
  const recap = active.slice(recapStart, recapStart + 8600);
  assert.match(recap, /id="study-weak-brief"/);
  assert.match(recap, /今日弱點/);
  assert.match(recap, /錯最多的法規先排前面，不用自己判斷哪裡弱/);
  assert.match(recap, /補這些弱點/);
  assert.match(recap, /id="study-weak-brief-list"/);
  assert.match(active, /function renderStudyWeakBrief/);
  assert.match(active, /答題後，這裡會直接列出最該補的法規/);
  assert.doesNotMatch(active, /目前有 0 條弱點|0 條弱點/);
});

test('study today uses exam-facing wording instead of internal cockpit jargon', () => {
  assert.match(active, /TODAY · 今天先做/);
  assert.match(active, /不知道從哪裡開始，先做一題/);
  assert.match(active, /今天先做/);
  assert.doesNotMatch(active, /COCKPIT · 今日備考座艙|今日座艙/);
});

test('study today makes working tools and personal planning obvious', () => {
  assert.match(active, /class="study-actions"/);
  assert.match(active, /下一步/);
  assert.match(active, /class="study-action-link primary" href="quiz\.html"[\s\S]*開始選擇題/);
  assert.match(active, /href="#review-due"[\s\S]*看今日複習/);
  assert.match(active, /href="quiz\.html\?open=weakness"[\s\S]*看弱點分析/);
  assert.match(active, /onclick="openStudyPlanPanel\(\)"[\s\S]*設定讀書課程/);
  assert.match(active, /onclick="openStudyRecordPanel\(\)"[\s\S]*補紀錄/);
  assert.match(active, /id="study-plan-panel"/);
  assert.match(active, /適合函授、補習班課程、模考或自己的週任務/);
  assert.match(active, /function saveStudySeries/);
  assert.match(active, /\/api\/me\/study\/series/);
  assert.match(active, /count:\s*count/);
  assert.doesNotMatch(active, /total_sessions:\s*count/);
});

test('study today action buttons are sized for mobile app shells', () => {
  assert.match(active, /\.study-action-link,\.study-pending\{[\s\S]*?min-height:40px/);
  assert.match(active, /@media \(max-width:760px\)\{[\s\S]*?\.study-action-link,\.study-pending\{[\s\S]*?min-height:44px/);
  assert.match(active, /\.study-weak-brief-link\{[\s\S]*?min-height:36px/);
  assert.match(active, /\.study-weak-brief-head\{[\s\S]*?flex-wrap:wrap/);
});

test('study today exposes a time-first planning box before schedule details', () => {
  const recapStart = active.indexOf('id="study-cockpit-recap"');
  assert.ok(recapStart >= 0, 'study recap must exist');
  const recap = active.slice(recapStart, recapStart + 7600);
  const timeBox = recap.indexOf('id="study-time-box"');
  const planPanel = recap.indexOf('id="study-plan-panel"');
  assert.ok(timeBox > -1, 'time-first box must exist');
  assert.ok(planPanel > -1, 'private plan panel must exist');
  assert.ok(timeBox < planPanel, 'time guidance should appear before private schedule controls');
  assert.match(recap, /id="study-target-hours"[\s\S]*500/);
  assert.match(recap, /id="study-weekly-hours"[\s\S]*每週可讀/);
  assert.match(recap, /建議總時數可以改/);
});

test('study today separates manual records from answer accuracy', () => {
  assert.match(active, /id="study-record-panel"/);
  assert.match(active, /function openStudyRecordPanel/);
  assert.match(active, /補紀錄只會補進度，不會補答題正確率/);
  assert.match(active, /讀書時數/);
  assert.match(active, /課程完成/);
  assert.match(active, /熟悉度/);
  assert.doesNotMatch(active, /補答對率|補正確率|修正錯題數/);
});

test('study today supports private pasted schedule imports without law search copy', () => {
  assert.match(active, /id="study-plan-import"/);
  assert.match(active, /貼上課表/);
  assert.match(active, /function previewStudyPlanImport/);
  assert.match(active, /function saveStudyPlanImport/);
  assert.match(active, /\/api\/me\/study\/plan-items\/bulk/);
  assert.match(active, /只會變成你的私人讀書計畫/);
  assert.doesNotMatch(active, /搜尋法條|自動查法條|對應法條/);
});

test('study today renders personal plan items returned by the study API', () => {
  assert.match(active, /personal_plan/);
  assert.match(active, /id="study-cloud-state"/);
  assert.match(active, /id="study-plan-items"/);
  assert.match(active, /renderStudyPlanItems/);
  assert.match(active, /接下來的私人計畫/);
});

test('study today explains cloud save status in learner words', () => {
  assert.match(active, /function renderStudyCloudState/);
  assert.match(active, /雲端計畫已接上/);
  assert.match(active, /雲端同步準備中/);
  assert.match(active, /先存在這台裝置/);
  assert.match(active, /personal_plan[\s\S]*status/);
  assert.doesNotMatch(active, /schema pending|schema_pending[^'"]*$/);
});

test('study today uses learner-facing subject status wording, not seed jargon', () => {
  assert.match(active, /已可練習/);
  assert.match(active, /題庫準備中/);
  assert.doesNotMatch(active, /待 seed/);
});

test('study today puts next-step actions before lower-priority subject detail', () => {
  const recapStart = active.indexOf('id="study-cockpit-recap"');
  assert.ok(recapStart >= 0, 'study recap must exist');
  const recap = active.slice(recapStart, recapStart + 9800);
  const actionIndex = recap.indexOf('class="study-actions"');
  const weakIndex = recap.indexOf('id="study-weak-brief"');
  const subjectsIndex = recap.indexOf('id="study-cockpit-subjects"');
  const blocksIndex = recap.indexOf('id="study-cockpit-blocks"');
  assert.ok(actionIndex > -1, 'next-step actions must exist');
  assert.ok(weakIndex > -1, 'weakness brief must exist');
  assert.ok(subjectsIndex > -1, 'subject details must exist');
  assert.ok(blocksIndex > -1, 'block details must exist');
  assert.ok(actionIndex < subjectsIndex, 'actions should appear before subject details');
  assert.ok(actionIndex < blocksIndex, 'actions should appear before block details');
  assert.ok(weakIndex < subjectsIndex, 'weakness should appear before subject details');
  assert.ok(weakIndex < blocksIndex, 'weakness should appear before block details');
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
  assert.match(active, /<nav class="top-mid">[\s\S]*href="quiz\.html\?open=weakness"[\s\S]*弱點/);
  assert.match(active, /<nav class="top-mid">[\s\S]*href="#review-due"[\s\S]*複習/);
  assert.match(active, /<a href="#study-cockpit-recap"><span class="num">T1<\/span>今天先做/);
  assert.match(active, /<a href="quiz\.html"><span class="num">T2<\/span>選擇題/);
  assert.match(active, /<a href="#review-due"><span class="num">T3<\/span>今日複習/);
  assert.match(active, /<a href="quiz\.html\?open=weakness"><span class="num">T4<\/span>弱點分析/);
  assert.match(active, /<span class="mdb-lbl">今天先做<\/span>/);
});

test('study today remains visible for free users or missing study API data', () => {
  assert.match(active, /let isFree = !uid && localStorage\.getItem\('sofa_free'\) === 'FREE'/);
  assert.match(active, /if\(!uid && !isFree\)\s*\{[\s\S]*localStorage\.setItem\('sofa_free', 'FREE'\);[\s\S]*isFree = true;[\s\S]*\}/);
  assert.doesNotMatch(active, /if\(!uid && !isFree\)\s*\{\s*window\.location\.href = 'login\.html'/);
  assert.match(active, /if\(!uid \|\| isFree\)\{[\s\S]*renderStudyToday\(null\);[\s\S]*return;[\s\S]*\}/);
  assert.match(active, /renderStudyToday\(studyTodayRes \|\| null\)/);
  const start = active.indexOf('function renderStudyToday');
  assert.ok(start >= 0, 'renderStudyToday function must exist');
  const fn = active.slice(start, start + 3600);
  assert.match(fn, /if\(!data\)\s*data =/);
  assert.match(fn, /先做 1 題開始累積弱點/);
  assert.match(fn, /先從「開始選擇題」做一題/);
});

test('free dashboard retention entry is promoted before the main dashboard', () => {
  assert.match(active, /id="free-retention-strip"/);
  const stripIndex = active.indexOf('id="free-retention-strip"');
  const shellIndex = active.indexOf('<div class="shell">');
  assert.ok(stripIndex > 0, 'free retention strip must exist');
  assert.ok(shellIndex > stripIndex, 'free retention strip must sit above the main shell');
  assert.match(active, /免費版可以先試做/);
  assert.match(active, /輸入序號保留進度/);
  assert.match(active, /id="free-retention-login" href="login\.html"/);
  assert.match(active, /if\(isIOSReaderApp\(\)\)\{[\s\S]*freeRetentionPricing[\s\S]*style\.display = 'none'/);
  assert.match(active, /if\(freeRetentionStrip\)\{[\s\S]*freeRetentionStrip\.classList\.add\('on'\)/);
});

test('signed-in auth failures are not rendered as empty weakness data', () => {
  assert.match(active, /window\._sofaAuthIssue = false/);
  assert.match(active, /if\(r\.status === 401\) window\._sofaAuthIssue = true/);
  assert.match(active, /function renderStudyAuthIssue/);
  assert.match(active, /登入狀態異常/);
  assert.match(active, /請重新登入/);
  assert.match(active, /你的序號已驗過，但會員資料暫時讀不到/);
  assert.match(active, /if\(window\._sofaAuthIssue && !profile\)\{[\s\S]*renderStudyAuthIssue\(\);[\s\S]*return;/);
});

test('study planning saves translate schema-pending responses into a readable preparing state', () => {
  assert.match(active, /function _fetchStudyJSON/);
  assert.match(active, /__http_status/);
  assert.match(active, /schema_pending/);
  assert.match(active, /function _studySaveMessage/);
  assert.match(active, /功能準備中/);
  assert.match(active, /saveStudySeries[\s\S]*_fetchStudyJSON\(API \+ '\/api\/me\/study\/series'/);
  assert.match(active, /saveStudyPlanImport[\s\S]*_fetchStudyJSON\(API \+ '\/api\/me\/study\/plan-items\/bulk'/);
  assert.doesNotMatch(active, /schema_pending[\s\S]{0,200}暫時存不進帳號；先不要重複按/);
});

test('study planning has a local-first fallback when schema is not ready', () => {
  assert.match(active, /STUDY_LOCAL_KEY/);
  assert.match(active, /STUDY_SAVE_NUDGE_DISMISS_KEY/);
  assert.match(active, /function _studyLocal/);
  assert.match(active, /function _saveStudyLocal/);
  assert.match(active, /function _mergeStudyPlan/);
  assert.match(active, /function _addLocalStudyItems/);
  assert.match(active, /已先存在本機/);
  assert.match(active, /var savedLocal = fallback && fallback\.indexOf\('已先存在本機'\) >= 0;/);
  assert.match(active, /if\(savedLocal\) return fallback;/);
  assert.match(active, /renderStudyPlanItems\(_mergeStudyPlan/);
});

test('study planning nudges local users to preserve progress after real action', () => {
  assert.match(active, /id="study-save-nudge"/);
  assert.match(active, /保留這些進度/);
  assert.match(active, /輸入序號 \/ 領體驗/);
  assert.match(active, /function updateStudySaveNudge/);
  assert.match(active, /function showStudySaveNudge/);
  assert.match(active, /function dismissStudySaveNudge/);
  assert.match(active, /!signedIn && !dismissed && _studyHasLocalProgress\(\)/);
  assert.match(active, /saveStudyTimeSettings[\s\S]*showStudySaveNudge\(\)/);
  assert.match(active, /saveStudyRecordLocal[\s\S]*showStudySaveNudge\(\)/);
  assert.match(active, /_addLocalStudyItems[\s\S]*showStudySaveNudge\(\)/);
  assert.doesNotMatch(active, /beforeunload/);
});

test('free dashboard surfaces serial login before paid upgrade for retention', () => {
  assert.match(active, /免費版 · 完整會員資訊/);
  assert.match(active, /login\.html[\s\S]*輸入序號保留進度/);
  assert.match(active, /免費版不儲存學習紀錄/);
  assert.match(active, /login\.html[\s\S]*已有序號就登入保存/);
  assert.match(active, /pricing\.html[\s\S]*查看方案/);
});

test('study time planning is editable and persisted locally', () => {
  assert.match(active, /id="study-total-hours-input"/);
  assert.match(active, /id="study-weekly-hours-input"/);
  assert.match(active, /id="study-today-minutes-input"/);
  assert.match(active, /function saveStudyTimeSettings/);
  assert.match(active, /local\.settings =/);
  assert.match(active, /照這個速度約/);
});

test('manual study records are enabled without changing answer accuracy', () => {
  assert.match(active, /id="study-record-date"/);
  assert.match(active, /id="study-record-minutes"/);
  assert.match(active, /onclick="saveStudyRecordLocal\(\)"/);
  assert.match(active, /function saveStudyRecordLocal/);
  assert.match(active, /status: 'done'/);
  assert.match(active, /答題正確率不會被補紀錄改動/);
  assert.doesNotMatch(active, /disabled>儲存準備中/);
});

test('series planning can generate local weekly items before API sync', () => {
  assert.match(active, /function _studySeriesItems/);
  assert.match(active, /_nextWeekdayOnOrAfter/);
  assert.match(active, /i \* 7/);
  assert.match(active, /if\(!uid && !token\)\{[\s\S]*_addLocalStudyItems\(localItems\)/);
});

test('saved study plans show an immediate readable summary and focus the plan list', () => {
  assert.match(active, /class="study-plan-count"/);
  assert.match(active, /接下來 ' \+ items\.length \+ ' 筆私人計畫/);
  assert.match(active, /下一筆：<b>/);
  assert.match(active, /function _studyStatusLabel/);
  assert.match(active, /已完成/);
  assert.match(active, /待讀/);
  assert.match(active, /function focusStudyPlanItems/);
  assert.match(active, /scrollIntoView\(\{ block:'nearest', behavior:'smooth' \}\)/);
  assert.match(active, /_addLocalStudyItems[\s\S]*focusStudyPlanItems\(\)/);
  assert.match(active, /saveStudyRecordLocal[\s\S]*focusStudyPlanItems\(\)/);
});

test('local study plan items can be completed postponed or cancelled from the list', () => {
  assert.match(active, /function _studyItemKey/);
  assert.match(active, /function updateLocalStudyItemStatus/);
  assert.match(active, /function completeStudyItem/);
  assert.match(active, /function postponeStudyItem/);
  assert.match(active, /function cancelStudyItem/);
  assert.match(active, /class="study-plan-actions"/);
  assert.match(active, /完成/);
  assert.match(active, /改下週/);
  assert.match(active, /取消/);
  assert.match(active, /local\.items = \(local\.items \|\| \[\]\)\.map/);
  assert.match(active, /renderStudyPlanItems\(_mergeStudyPlan\(null\)\)/);
  assert.doesNotMatch(active, /updateLocalStudyItemStatus[\s\S]{0,500}correct_count/);
});

test('study today builds concrete local suggestions from time weakness and plan data', () => {
  assert.match(active, /id="study-suggestions"/);
  assert.match(active, /function buildStudySuggestions/);
  assert.match(active, /today_minutes/);
  assert.match(active, /weak_law_bridge/);
  assert.match(active, /_mergeStudyPlan\(data\.personal_plan \|\| null\)/);
  assert.match(active, /renderStudySuggestions\(buildStudySuggestions\(data, mergedPlan\)\)/);
  assert.match(active, /先做一題弱點/);
  assert.match(active, /下一堂課/);
  assert.match(active, /今天預留/);
});
