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
  assert.match(html, /data-spy-target="study-cockpit-recap"[\s\S]*今天先做/);
  assert.match(html, /data-spy-target="study-weak-brief"[\s\S]*今日弱點/);
  assert.match(html, /data-spy-target="study-time-box"[\s\S]*讀書時間/);
  assert.match(html, /data-spy-target="study-plan-items"[\s\S]*讀書計畫/);
  assert.match(html, /href="quiz\.html"[\s\S]*選擇題/);
  assert.match(html, /data-spy-target="review-due"[\s\S]*今日複習/);
  assert.match(html, /const navLinks = Array\.from\(document\.querySelectorAll\('\.nav-list a\[data-spy-target\]'\)\)/);
  assert.match(html, /function updateActiveNavFromScroll/);
  assert.match(html, /setActive\(best\.id\)/);
  assert.match(html, /aria-current/);
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
