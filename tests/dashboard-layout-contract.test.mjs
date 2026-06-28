import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');

test('dashboard uses one Chinese font stack across serif and sans tokens', () => {
  assert.match(html, /--serif:"Noto Serif TC","Songti TC",serif/);
  assert.match(html, /--sans:var\(--serif\)/);
});

test('today recaps are included in the sidebar navigation and scroll spy', () => {
  assert.match(html, /<nav class="top-mid">[\s\S]*href="#study-cockpit-recap"[\s\S]*今天先做/);
  assert.match(html, /<nav class="top-mid">[\s\S]*href="quiz\.html\?open=weakness"[\s\S]*弱點/);
  assert.match(html, /<nav class="top-mid">[\s\S]*href="#review-due"[\s\S]*複習/);
  assert.match(html, /<div class="nav-helper">右邊滑到哪，左邊會亮哪一段。<\/div>/);
  assert.match(html, /data-spy-target="study-cockpit-recap"[\s\S]*今天先做/);
  assert.match(html, /data-spy-target="study-weak-brief"[\s\S]*今日弱點/);
  assert.match(html, /data-spy-target="study-time-box"[\s\S]*讀書時間/);
  assert.match(html, /data-spy-target="study-plan-items"[\s\S]*讀書計畫/);
  assert.match(html, /data-spy-target="quiz-recap"[\s\S]*最近作答/);
  assert.match(html, /data-spy-target="weak-laws-recap"[\s\S]*弱點法規/);
  assert.match(html, /data-spy-target="srs-settings"[\s\S]*複習策略/);
  assert.match(html, /href="quiz\.html"[\s\S]*選擇題/);
  assert.match(html, /data-spy-target="review-due"[\s\S]*今日複習/);
  assert.match(html, /const navLinks = Array\.from\(document\.querySelectorAll\('\.nav-list a\[data-spy-target\]'\)\)/);
  assert.match(html, /function updateActiveNavFromScroll/);
  assert.match(html, /var nearBottom = window\.innerHeight \+ window\.scrollY >= document\.documentElement\.scrollHeight - 12/);
  assert.match(html, /if\(nearBottom && candidates\.length\)\{[\s\S]*setActive\(candidates\[candidates\.length - 1\]\.id\)/);
  assert.match(html, /setActive\(best\.id\)/);
  assert.match(html, /aria-current/);
});

test('sidebar section numbers match the visible dashboard sections', () => {
  assert.match(html, /href="#search" data-spy-target="search"><span class="num">03<\/span>直接查法條/);
  assert.match(html, /href="#favorites" data-spy-target="favorites"><span class="num">04<\/span>我的收藏/);
  assert.match(html, /href="#memorized" data-spy-target="memorized"><span class="num">05<\/span>已熟記/);
  assert.match(html, /href="#review" data-spy-target="review"><span class="num">06<\/span>待複習/);
  assert.match(html, /href="#tools" data-spy-target="tools"><span class="num">07<\/span>備考工具/);
  assert.match(html, /href="#laws" data-spy-target="laws"><span class="num">08<\/span>法規目錄/);
  assert.match(html, /href="#recent" data-spy-target="recent"><span class="num">09<\/span>最近查詢/);
  assert.match(html, /<section class="block" id="tools">[\s\S]*<span class="idx">07<\/span>[\s\S]*<h2>備考工具<\/h2>/);
  assert.match(html, /<section class="block" id="laws">[\s\S]*<span class="idx">08<\/span>[\s\S]*<h2>法規目錄<\/h2>/);
  assert.match(html, /<section class="block" id="recent">[\s\S]*<span class="idx">09<\/span>[\s\S]*<h2>最近查詢<\/h2>/);
});

test('desktop sidebar stays present while the main dashboard scrolls', () => {
  assert.match(html, /aside\.side\{[\s\S]*position:fixed;top:71px;bottom:0;left:0;width:280px/);
  assert.match(html, /aside\.side\{[\s\S]*height:calc\(100dvh - 71px\)/);
  assert.match(html, /aside\.side\{[\s\S]*overflow-y:auto/);
  assert.match(html, /\.shell::before\{[\s\S]*position:fixed;top:71px;bottom:0;left:0;width:280px/);
  assert.match(html, /\.shell::before\{[\s\S]*background:var\(--navy-2\)/);
  assert.match(html, /\.shell::before\{[\s\S]*pointer-events:none/);
  assert.match(html, /@media \(max-width:980px\)\{[\s\S]*aside\.side\{[\s\S]*position:fixed/);
  assert.match(html, /@media \(max-width:980px\)\{[\s\S]*\.shell::before\{display:none\}/);
});

test('recent query section hands off to compass without a large blank wall', () => {
  assert.match(html, /section\.block\{[\s\S]*margin-bottom:64px/);
  assert.match(html, /section\.block:last-child\{margin-bottom:28px\}/);
  assert.match(html, /\.recent-list\{[\s\S]*min-height:0/);
  assert.match(html, /\.compass-embed\{[\s\S]*background:linear-gradient/);
  assert.match(html, /\.compass-embed\{[\s\S]*margin:0/);
  assert.match(html, /<section class="compass-embed" data-screen-label="Compass">/);
  assert.doesNotMatch(html, /class="compass-embed"[^>]+style=/);
});

test('dashboard mobile sidebar exposes state and closes after choosing a guide link', () => {
  assert.match(html, /<button class="menu-btn" aria-label="開啟導覽" aria-expanded="false" onclick="toggleDashboardSideNav\(\)"/);
  assert.match(html, /function toggleDashboardSideNav/);
  assert.match(html, /button\.setAttribute\('aria-expanded', side\.classList\.contains\('open'\) \? 'true' : 'false'\)/);
  assert.match(html, /function closeDashboardSideNav/);
  assert.match(html, /document\.querySelectorAll\('aside\.side a'\)\.forEach/);
  assert.match(html, /\.menu-btn\[aria-expanded="true"\]/);
});

test('mobile native dashboard owns the iOS safe area', () => {
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" \/>/);
  assert.match(html, /document\.documentElement\.classList\.add\('ios-reader-app'\)/);
  assert.match(html, /html\.ios-reader-app\s+\.topbar\{[\s\S]*padding-top:calc\(16px \+ env\(safe-area-inset-top, 0px\)\)/);
  assert.match(html, /html\.ios-reader-app\s+section\.block,\s*html\.ios-reader-app\s+\.recap\[id\]\{[\s\S]*scroll-margin-top:calc\(132px \+ env\(safe-area-inset-top, 0px\)\)/);
  assert.match(html, /html\.ios-reader-app\s+body::before\{[\s\S]*position:fixed[\s\S]*height:env\(safe-area-inset-top, 0px\)[\s\S]*background:var\(--navy\)[\s\S]*pointer-events:none/);
  assert.match(html, /#mobile-daily-bar\{[\s\S]*height:calc\(64px \+ env\(safe-area-inset-bottom, 0px\)\)/);
});

test('mobile dashboard keeps one dark brand palette instead of competing light and dark cascades', () => {
  assert.doesNotMatch(html, /--navy-2:#FFFFFF/);
  assert.doesNotMatch(html, /background:#EEF3F2/);
  assert.match(html, /@media \(max-width: 760px\)\{[\s\S]*--navy:#1F3848/);
});

test('empty and full-width cards use responsive classes, not inline span columns', () => {
  assert.doesNotMatch(html, /grid-column:span 3/);
  assert.match(html, /\.empty\.full[\s\S]*?grid-column:1\/-1/);
  assert.match(html, /class="empty full"/);
  assert.match(html, /class="li-card warn full"/);
});

test('review due uses compact review cards instead of large library cards', () => {
  const renderStart = html.indexOf('function renderReviewDue(');
  assert.notEqual(renderStart, -1, 'renderReviewDue should exist');
  const renderSource = html.slice(renderStart, html.indexOf('function renderStudyToday(', renderStart));
  assert.match(renderSource, /class="review-card warn"/);
  assert.doesNotMatch(renderSource, /class="li-card warn"/);
  assert.doesNotMatch(renderSource, /box\.style\.display = 'none'/);
  assert.match(renderSource, /目前沒有到期複習/);
  assert.match(html, /\.review-card\s*\{[\s\S]*?padding:14px 18px/);
  assert.match(html, /\.review-card \.art\s*\{[\s\S]*?font-size:20px/);
  assert.match(html, /\.review-card \.art\s*\{[\s\S]*?overflow-wrap:anywhere/);
});

test('article result rows protect long titles from vertical squeeze', () => {
  assert.match(html, /\.res-row\s*\{[\s\S]*?grid-template-columns:auto auto minmax\(0,1fr\) auto auto auto/);
  assert.match(html, /\.res-row \.ttl\s*\{[\s\S]*?min-width:0/);
  assert.match(html, /\.res-row \.ttl\s*\{[\s\S]*?overflow-wrap:anywhere/);
});

test('article drawer shows when the current article is in the wrong-question bank', () => {
  assert.match(html, /const QUIZ_WRONG_KEY = 'sofa_wrong_ids'/);
  assert.match(html, /function _getQuizWrongEntry/);
  assert.match(html, /function _rememberRemoteWeakArticles/);
  assert.match(html, /function _getRemoteWeakArticleEntry/);
  assert.match(html, /function _renderDrawerWrongAlert/);
  assert.match(html, /_renderDrawerWrongAlert\(d\.id/);
  assert.match(html, /_renderDrawerWrongAlert\(_drPageId\)/);
  assert.match(html, /wrong_articles/);
  assert.match(html, /top_articles/);
  assert.match(html, /page_id/);
  assert.match(html, /a\.source \|\| 'server_weak_laws'/);
  assert.match(html, /這條曾答錯/);
  assert.match(html, /quiz\.html\?open=wrong/);
});

test('closed bookmark panel does not sit outside the mobile viewport', () => {
  const panelRule = html.match(/#bk-panel\s*\{[^}]+\}/)?.[0] || '';
  assert.match(panelRule, /right:\s*0/);
  assert.match(panelRule, /max-width:\s*100vw/);
  assert.match(panelRule, /display:\s*none/);
  assert.match(html, /#bk-panel\.open\s*\{[\s\S]*?display:\s*flex/);
  assert.doesNotMatch(panelRule, /right:\s*-\d+px/);
});

test('mobile bookmark toggle is hidden so it cannot cover the study flow', () => {
  assert.match(html, /#bk-toggle\{[\s\S]*position:\s*fixed/);
  assert.match(html, /@media \(max-width: 760px\)\{[\s\S]*#bk-toggle\{[\s\S]*display:none/);
  assert.doesNotMatch(html, /@media \(max-width: 760px\)\{[\s\S]*#bk-toggle\{[\s\S]*bottom:calc\(78px \+ env\(safe-area-inset-bottom, 0px\)\)/);
});

test('local bookmark panel can reopen saved articles even when the row is not rendered', () => {
  assert.match(html, /function jumpToBookmark\(id\)/);
  assert.match(html, /var bk = _bookmarks\[id\]/);
  assert.match(html, /openDrawer\(id, bk\.lawName \|\| '', bk\.articleNo \|\| ''\)/);
  assert.match(html, /searchAndOpen\(bk\.lawName, bk\.articleNo\)/);
  assert.doesNotMatch(html, /加入待復習/);
  assert.doesNotMatch(html, /點 ★ 加入待復習/);
});

test('recent answer recap rows can reopen the answered article when metadata exists', () => {
  assert.match(html, /function recapArticleClickAttrs\(entry\)/);
  assert.match(html, /entry\.page_id \|\| entry\.article_id/);
  assert.match(html, /entry\.law \|\| entry\.law_name/);
  assert.match(html, /entry\.article \|\| entry\.article_no \|\| entry\.title/);
  assert.match(html, /openDrawer\(pid, law, art\)/);
  assert.match(html, /searchAndOpen\(law, art\)/);
  assert.match(html, /window\.recapArticleOpen = recapArticleOpen/);
  assert.match(html, /window\.recapArticleKeyOpen = recapArticleKeyOpen/);
  assert.match(html, /class="recap-row is-link"/);
  assert.match(html, /role="button"/);
  assert.match(html, /onkeydown="recapArticleKeyOpen\(event, this\)"/);
});

test('expire overlay explains feedback and sharing extension rules', () => {
  assert.match(html, /id="expire-overlay"/);
  assert.match(html, /回饋缺點 \+10 天/);
  assert.match(html, /分享標記 \+10 天/);
  assert.match(html, /兩個都可以做，不衝突/);
  assert.match(html, /回饋每個帳號限一次/);
  assert.match(html, /幾個帳號就加幾次/);
  assert.match(html, /你的 SoFa 帳號/);
  assert.match(html, /隔天依信任制自動補登體驗天數/);
});

test('member card surfaces renewal before expiry without hiding payment', () => {
  assert.match(html, /id="mc-renewal-nudge"/);
  assert.match(html, /保留弱點分析、今日複習和會員期限明細/);
  assert.match(html, /href="pricing\.html"[\s\S]*續用方案/);
  assert.match(html, /function renderMembershipRenewalNudge/);
  assert.match(html, /daysLeft <= 10/);
});

test('entitlement panel refreshes if ledger data arrives after the panel opens', () => {
  assert.match(html, /function refreshEntitlementPanelIfOpen/);
  assert.match(html, /backdrop && backdrop\.classList\.contains\('on'\)/);
  assert.match(html, /refreshEntitlementPanelIfOpen\(\);\s*renderStudyToday/);
});

test('expiry copy reassures records continue after renewal', () => {
  assert.match(html, /答題紀錄、弱點分析與今日複習不會消失/);
  assert.match(html, /續用後會直接接回你的進度/);
});

test('mobile daily bar prioritizes the exam-pass loop', () => {
  assert.match(html, /<div id="mobile-daily-bar">[\s\S]*今天先做/);
  assert.match(html, /<div id="mobile-daily-bar">[\s\S]*選擇題/);
  assert.match(html, /<div id="mobile-daily-bar">[\s\S]*今日複習/);
  assert.match(html, /<div id="mobile-daily-bar">[\s\S]*弱點分析/);
  assert.doesNotMatch(html, /<div id="mobile-daily-bar">[\s\S]*今日填空/);
  assert.doesNotMatch(html, /mdb-fill|sofa_fill_daily_/);
});

test('mobile tool cards keep short usage hints visible', () => {
  assert.doesNotMatch(html, /\.tool \.desc\{display:none\}/);
  assert.match(html, /\.tool \.desc\{\s*display:block/);
  assert.match(html, /想練新題從這裡開始/);
  assert.match(html, /挖空關鍵字/);
  assert.match(html, /逐字輸入法條原文/);
  assert.match(html, /看哪部法規最弱/);
});
