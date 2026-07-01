import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const script = readFileSync(new URL('../scripts/visual-entry-qa.cjs', import.meta.url), 'utf8');

test('visual entry QA covers dashboard first-layer entries across mobile and desktop', () => {
  assert.match(script, /dashboardCase/);
  assert.match(script, /width:\s*390,\s*height:\s*667/);
  assert.match(script, /width:\s*1440,\s*height:\s*900/);
  assert.match(script, /#study-cockpit-recap \.study-action-group\.primary a\[href="quiz\.html\?open=weakness"\]/);
  assert.match(script, /#mobile-daily-bar a\[href="quiz\.html\?open=weakness"\]/);
  assert.match(script, /#mobile-daily-bar a\[href="#review-due"\]/);
  assert.match(script, /assertAllNotCoveredBy/);
  assert.match(script, /#study-cockpit-recap \.study-actions \.study-action-link/);
  assert.match(script, /#study-weak-brief \.study-weak-brief-row,\s*#study-weak-brief \.study-weak-empty/);
  assert.match(script, /aside\.side a\[href="quiz\.html\?open=weakness"\]/);
  assert.match(script, /#study-cockpit-weak-state/);
  assert.match(script, /弱點已接入/);
});

test('visual entry QA scrolls dashboard sections and verifies sidebar active visibility', () => {
  assert.match(script, /dashboardSidebarScrollCase/);
  assert.match(script, /study-cockpit-recap/);
  assert.match(script, /study-time-box/);
  assert.match(script, /study-plan-items/);
  assert.match(script, /quiz-recap/);
  assert.match(script, /weak-laws-recap/);
  assert.match(script, /review-due/);
  assert.match(script, /scrollIntoView\(\{ block: 'start' \}\)/);
  assert.match(script, /\.nav-list a\.on/);
  assert.match(script, /data-spy-target="\$\{id\}"/);
  assert.match(script, /dashboard sidebar did not follow/);
  assert.match(script, /sofa-visual-dashboard-sidebar-scroll\.png/);
});

test('visual entry QA catches dashboard responsive overflow and recent-row regressions', () => {
  assert.match(script, /dashboardResponsiveLayoutCase/);
  assert.match(script, /width:\s*390,\s*height:\s*844/);
  assert.match(script, /width:\s*820,\s*height:\s*1180/);
  assert.match(script, /width:\s*1440,\s*height:\s*900/);
  assert.match(script, /assertNoHorizontalOverflow/);
  assert.match(script, /\/api\/me\/history/);
  assert.match(script, /§ 27 \| 使用許可案件審議通過後核發使用許可/);
  assert.match(script, /#recent-list \.rec-row/);
  assert.match(script, /artWritingMode/);
  assert.match(script, /horizontal-tb/);
  assert.match(script, /duplicated article label/);
  assert.match(script, /sofa-visual-dashboard-responsive-\$\{viewport\.name\}\.png/);
});

test('visual entry QA checks quiz post-answer actions and article deep link', () => {
  assert.match(script, /quizCase/);
  assert.match(script, /#view-article-btn/);
  assert.match(script, /#view-weakness-btn/);
  assert.match(script, /#btnNext/);
  assert.match(script, /#btnFlag/);
  assert.match(script, /_articleReaderHref\(_currentLawName, _currentArtNo, _currentPageId\)/);
  assert.match(script, /law-preview\\\.html\\\?law=/);
  assert.match(script, /\[\?&\]art=88/);
  assert.match(script, /from=quiz/);
});

test('visual entry QA opens the law reader deep link and checks native-safe controls', () => {
  assert.match(script, /lawPreviewCase/);
  assert.match(script, /law-preview\.html\?law=/);
  assert.match(script, /art=13%E4%B9%8B1/);
  assert.match(script, /#detailTitle/);
  assert.match(script, /#originalText/);
  assert.match(script, /\.cta-btn/);
  assert.match(script, /assertNotCoveredBy\(page, '#originalText', '\.cta-bar'/);
  assert.match(script, /\.section\.locked\[data-seg="5"\]/);
  assert.match(script, /law preview paid teaser is missing section 5 value cue/);
  assert.match(script, /\.section\.locked\[data-seg="5"\] \.section-locked-preview/);
  assert.match(script, /\.section\.locked\[data-seg="5"\] a\[href="pricing\.html"\]/);
  assert.match(script, /sofa-visual-law-preview-mobile\.png/);
});

test('visual entry QA clicks a real mocked quiz answer and verifies answer ledger payload', () => {
  assert.match(script, /quizBehaviorCase/);
  assert.match(script, /\/api\/quiz/);
  assert.match(script, /\/api\/article\/visual-page-id/);
  assert.match(script, /answerPosts/);
  assert.match(script, /\/api\/me\/answer/);
  assert.match(script, /#optionsBox \.opt/);
  assert.match(script, /nth\(1\)\.click\(\)/);
  assert.match(script, /#explainBox/);
  assert.match(script, /choice !== 1/);
  assert.match(script, /is_correct !== false/);
});

test('visual entry QA round-trips from quiz to reader cross reference and back', () => {
  assert.match(script, /quizReaderRoundTripCase/);
  assert.match(script, /公司法第29條/);
  assert.match(script, /company-law-29/);
  assert.match(script, /a\.crossref/);
  assert.match(script, /\.back-link/);
  assert.match(script, /#quiz-answer-actions\.show/);
  assert.match(script, /#optionsBox \.opt\.wrong/);
  assert.match(script, /sofa-visual-quiz-reader-roundtrip-mobile\.png/);
});

test('visual entry QA checks free retention serial entry on mobile', () => {
  assert.match(script, /freeRetentionCase/);
  assert.match(script, /quiz\.html\?free=1/);
  assert.match(script, /輸入序號保留紀錄/);
  assert.match(script, /dashboard\.html/);
  assert.match(script, /輸入序號保留進度/);
  assert.match(script, /sofa-visual-free-retention-mobile\.png/);
});

test('visual entry QA checks stats overlay source wording', () => {
  assert.match(script, /statsCase/);
  assert.match(script, /#stats-panel/);
  assert.match(script, /#tab-btn-wrong/);
  assert.match(script, /每日一題/);
  assert.match(script, /LINE 作答/);
  assert.match(script, /考古題/);
});

test('visual entry QA checks study tool deep links in the mobile app shell', () => {
  assert.match(script, /studyToolDeepLinkCase/);
  assert.match(script, /#study-plan/);
  assert.match(script, /#study-record/);
  assert.match(script, /#study-playlist/);
  assert.match(script, /study-plan-panel/);
  assert.match(script, /study-record-panel/);
  assert.match(script, /study-playlist-panel/);
  assert.match(script, /設定讀書任務/);
  assert.match(script, /補紀錄只會補進度/);
  assert.match(script, /朗讀全部/);
  assert.match(script, /sofa-visual-study-tool-/);
});

test('visual entry QA exercises study plan save complete and record flow', () => {
  assert.match(script, /studyPlanFlowCase/);
  assert.match(script, /#study-plan-panel \.study-plan-save/);
  assert.match(script, /data-next-study-key/);
  assert.match(script, /#study-record-panel \.study-plan-save/);
  assert.ok(script.includes('待讀 2 \\/ 完成 0'));
  assert.ok(script.includes('待讀 1 \\/ 完成 1'));
  assert.ok(script.includes('待讀 1 \\/ 完成 2'));
  assert.match(script, /#nav-ct-plan/);
  assert.match(script, /sofa-visual-study-plan-flow-mobile\.png/);
});

test('visual entry QA is safe to run without production writes', () => {
  assert.match(script, /page\.route\('https:\/\/sofa-engine-api\.onrender\.com\/\*\*'/);
  assert.match(script, /route\.fulfill/);
  assert.doesNotMatch(script, /route\.continue/);
  assert.match(script, /request\.method\(\) === 'POST'/);
  assert.match(script, /request\.postData\(\)/);
});
