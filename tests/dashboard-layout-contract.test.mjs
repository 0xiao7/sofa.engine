import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const html = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');
const sharedCss = readFileSync(new URL('../sofa.css', import.meta.url), 'utf8');
const loginHtml = readFileSync(new URL('../login.html', import.meta.url), 'utf8');
const lawPreviewHtml = readFileSync(new URL('../law-preview.html', import.meta.url), 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Could not extract ${name}`);
}

function cssRule(source, selector) {
  const pattern = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}');
  const match = source.match(pattern);
  assert.ok(match, `${selector} rule should exist`);
  return match[1];
}

test('dashboard uses one Chinese font stack across serif and sans tokens', () => {
  assert.match(html, /--serif:"Songti TC","Noto Serif TC","PMingLiU",serif/);
  assert.match(html, /--sans:var\(--serif\)/);
  assert.match(html, /\.dr-text\{[\s\S]*font-family:var\(--serif\)/);
  assert.match(html, /#drawer-original\{[\s\S]*font-family:var\(--serif\)/);
});

test('core web pages prefer the Songti brand stack for Chinese UI text', () => {
  assert.match(sharedCss, /--serif:"Songti TC","Noto Serif TC","PMingLiU",serif/);
  assert.match(sharedCss, /--sans:var\(--serif\)/);
  assert.match(loginHtml, /--serif:\s*'Songti TC', 'Noto Serif TC', 'PMingLiU', serif/);
  assert.match(loginHtml, /--sans:\s*var\(--serif\)/);
  assert.match(lawPreviewHtml, /--serif:"Songti TC","Noto Serif TC","PMingLiU",serif/);
  assert.match(lawPreviewHtml, /--sans:var\(--serif\)/);
  assert.match(lawPreviewHtml, /\.original-text\{[\s\S]*font-family:var\(--serif\)/);
});

test('today recaps are included in the sidebar navigation and scroll spy', () => {
  assert.match(html, /<nav class="top-mid">[\s\S]*href="#study-cockpit-recap"[\s\S]*今天先做/);
  assert.match(html, /<nav class="top-mid">[\s\S]*href="#weak-laws-recap"[\s\S]*弱點/);
  assert.match(html, /<nav class="top-mid">[\s\S]*href="#review-due"[\s\S]*複習/);
  assert.match(html, /<div class="nav-helper">右邊滑到哪，左邊會亮哪一段。<\/div>/);
  assert.match(html, /data-spy-target="study-cockpit-recap"[\s\S]*今天先做/);
  assert.match(html, /data-spy-target="study-weak-brief"[\s\S]*今日弱點/);
  assert.match(html, /data-spy-target="study-playlist-block"[\s\S]*聽讀清單/);
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
  assert.match(html, /activeLink\.scrollIntoView\(\{block:'nearest', inline:'nearest'\}\)/);
});

test('desktop sidebar uses an observer-backed section spy for long scrolling', () => {
  assert.match(html, /function setupActiveNavObserver/);
  assert.match(html, /function refreshActiveNavFromVisibleSections/);
  assert.match(html, /typeof IntersectionObserver !== 'function'/);
  assert.match(html, /new IntersectionObserver\(function\(\)/);
  assert.match(html, /scheduleActiveNavRefresh\(\)/);
  assert.match(html, /if\(!refreshActiveNavFromVisibleSections\(\)\) scheduleActiveNavRefresh\(\)/);
  assert.match(html, /rootMargin:'-8% 0px -72% 0px'/);
  assert.match(html, /threshold:\[0,0\.01,0\.25,0\.5,0\.75\]/);
  assert.match(html, /window\.__activeNavObserver\.observe\(el\)/);
  assert.match(html, /function refreshActiveNavFromVisibleSections\(\)\{[\s\S]*updateActiveNavFromScroll\(\);[\s\S]*return true/);
  assert.match(html, /setupActiveNavObserver\(\);\s*updateActiveNavFromScroll\(\);/);
});

test('today sidebar order follows the actual dashboard reading order', () => {
  const navOrder = [
    'study-cockpit-recap',
    'study-weak-brief',
    'study-playlist-block',
    'study-time-box',
    'study-plan-items',
    'quiz-recap',
    'weak-laws-recap',
    'review-due',
    'srs-settings',
  ];
  const pageOrder = [
    'study-cockpit-recap',
    'study-weak-brief',
    'study-playlist-block',
    'study-time-box',
    'study-plan-items',
    'quiz-recap',
    'weak-laws-recap',
    'review-due',
    'srs-settings',
  ];

  navOrder.forEach((id, index) => {
    assert.match(
      html,
      new RegExp(`data-spy-target="${id}"[\\s\\S]*<span class="num">T${index + 1}<\\/span>`),
    );
  });

  const navPositions = navOrder.map((id) => html.indexOf(`data-spy-target="${id}"`));
  const pagePositions = pageOrder.map((id) => html.indexOf(`id="${id}"`));
  assert.deepEqual([...navPositions].sort((a, b) => a - b), navPositions);
  assert.deepEqual([...pagePositions].sort((a, b) => a - b), pagePositions);
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

test('law table of contents separates reading searching and single-practice actions', () => {
  const start = html.indexOf('function _renderLawsToc');
  const end = html.indexOf('function searchLaw', start);
  assert.notEqual(start, -1, '_renderLawsToc should exist');
  assert.notEqual(end, -1, 'searchLaw should follow law TOC rendering');
  const tocSource = html.slice(start, end);
  assert.match(tocSource, /var encodedName = encodeURIComponent\(rawName\)/);
  assert.match(tocSource, /class="toc-main" href="law-preview\.html\?law='\+encodedName\+'"/);
  assert.match(tocSource, /<span class="meta"><span class="ct">'\+ct\+'<\/span><span class="arrow">讀整部<\/span><\/span><\/a>/);
  assert.match(tocSource, /var ct\s*=\s*formatLawArticleCount\(l\.article_count\)/);
  assert.match(html, /function formatLawArticleCount\(value\)/);
  assert.match(html, /Number\.isFinite\(n\) && n > 0 \? String\(n\) \+ ' 條' : ''/);
  assert.doesNotMatch(tocSource, /— 條/);
  assert.match(tocSource, /<span class="toc-actions" aria-label="'\+nm\+' 的動作">/);
  assert.match(tocSource, /onclick="searchLaw\(decodeURIComponent\(this\.dataset\.law\)\)">查條文<\/button>/);
  assert.match(tocSource, /href="quiz\.html\?law='\+encodedName\+'\&drill=1">練習<\/a>/);
  assert.doesNotMatch(html, /class="toc-row" onclick="searchLaw/);
  assert.match(html, /\.toc-main\{/);
  assert.match(html, /\.toc-actions\{/);
  assert.match(html, /\.toc-action\{/);
});

test('dashboard tool count names tools rather than practice modes', () => {
  assert.doesNotMatch(html, /<div class="r"><span class="eb">\d+ 個工具<\/span><\/div>/);
  assert.match(html, /<div class="r"><span class="eb">備考工具<\/span><\/div>/);
  assert.doesNotMatch(html, /8 種模式/);
});

test('desktop sidebar stays present while the main dashboard scrolls', () => {
  assert.match(html, /aside\.side\{[\s\S]*position:fixed;top:var\(--topbar-offset\);bottom:0;left:0;width:280px/);
  assert.match(html, /aside\.side\{[\s\S]*height:calc\(100dvh - var\(--topbar-offset\)\)/);
  assert.match(html, /aside\.side\{[\s\S]*overflow-y:auto/);
  assert.match(cssRule(html, '.nav-list a'), /min-height:44px/);
  assert.match(html, /class="side-guide-controls"[\s\S]*aria-label="導覽顯示狀態"/);
  assert.match(cssRule(html, '.side-guide-controls'), /position:absolute/);
  assert.match(cssRule(html, '.side-guide-controls'), /top:94px/);
  assert.match(cssRule(html, '.side-guide-controls'), /right:18px/);
  assert.match(cssRule(html, '.side-guide-controls'), /width:28px/);
  assert.match(cssRule(html, '.side-guide-controls'), /background:transparent/);
  assert.match(cssRule(html, '.side-guide-controls'), /box-shadow:none/);
  assert.match(cssRule(html, '.side-mode-status'), /position:absolute/);
  assert.match(cssRule(html, '.side-mode-status'), /width:1px/);
  assert.match(html, /id="side-mode-status"[\s\S]*左側導覽/);
  assert.match(html, /id="side-mode-btn"[\s\S]*aria-label="隱藏導覽"[\s\S]*onclick="toggleDashboardSideNav\(\)"[\s\S]*‹/);
  assert.match(html, /class="side-peek-btn"[\s\S]*onclick="setDashboardSideCollapsed\(false\)"[\s\S]*›/);
  assert.doesNotMatch(html, /id="side-mode-btn"[\s\S]*>收起<\/button>/);
  assert.doesNotMatch(html, /id="side-mode-btn"[\s\S]*>打開<\/button>/);
  assert.match(cssRule(html, '.side-peek-btn'), /width:32px/);
  assert.match(cssRule(html, '.side-peek-btn'), /min-width:32px/);
  assert.match(cssRule(html, '.side-peek-btn'), /min-height:32px/);
  assert.match(html, /body\.side-collapsed \.side-peek-btn\{display:inline-flex/);
  assert.match(html, /peek\.setAttribute\('aria-hidden', on \? 'false' : 'true'\)/);
  assert.doesNotMatch(html, /body\.side-collapsed \.topbar \.menu-btn::after/);
  assert.match(html, /button\.setAttribute\('aria-label', on \? '顯示導覽' : '隱藏導覽'\)/);
  assert.match(html, /modeButton\.textContent = '‹'/);
  assert.match(html, /status\.textContent = on \? '左側導覽已隱藏' : '左側導覽已顯示'/);
  assert.match(html, /body\.side-collapsed \.side-guide-controls\{display:none\}/);
  assert.match(html, /\.shell::before\{[\s\S]*position:fixed;top:var\(--topbar-offset\);bottom:0;left:0;width:280px/);
  assert.match(html, /\.shell::before\{[\s\S]*background:var\(--navy-2\)/);
  assert.match(html, /\.shell::before\{[\s\S]*pointer-events:none/);
  assert.match(html, /@media \(max-width:980px\)\{[\s\S]*aside\.side\{[\s\S]*position:fixed/);
  assert.match(html, /@media \(max-width:980px\)\{[\s\S]*\.shell::before\{display:none\}/);
});

test('recent query section hands off to compass without a large blank wall', () => {
  assert.match(html, /section\.block\{[\s\S]*margin-bottom:24px/);
  assert.match(html, /section\.block:last-child\{margin-bottom:16px\}/);
  assert.match(html, /\.recent-list\{[\s\S]*min-height:0/);
  assert.match(html, /function renderDashboardLoadingFallbacks/);
  assert.match(html, /if\(!uid \|\| isFree\)\{[\s\S]*setTimeout\(renderDashboardLoadingFallbacks,\s*4000\)/);
  assert.match(html, /setTimeout\(renderDashboardLoadingFallbacks,\s*4000\)/);
  assert.match(html, /還沒有查詢紀錄；查過的條文會放在這裡/);
  assert.match(html, /\.compass-embed\{[\s\S]*background:linear-gradient/);
  assert.match(html, /\.compass-embed\{[\s\S]*margin:8px 0 0/);
  assert.match(html, /\.compass-embed\{[\s\S]*width:100%/);
  assert.match(html, /\.compass-embed\{[\s\S]*border-radius:4px/);
  assert.doesNotMatch(html, /\.compass-embed\{[\s\S]*margin:0 0 0 280px/);
  assert.doesNotMatch(html, /\.compass-embed\{[\s\S]*width:calc\(100% - 280px\)/);
  assert.doesNotMatch(html, /body\.side-collapsed \.compass-embed\{margin-left:0;width:100%\}/);
  assert.match(html, /<section class="compass-embed" data-screen-label="Compass">/);
  assert.match(html, /<section class="block" id="recent">[\s\S]*<section class="compass-embed" data-screen-label="Compass">[\s\S]*<\/main>/);
  assert.doesNotMatch(html, /class="compass-embed"[^>]+style=/);
});

test('dashboard mobile sidebar exposes state and closes after choosing a guide link', () => {
  assert.match(html, /<button class="menu-btn" aria-label="開啟導覽" aria-expanded="false" onclick="toggleDashboardSideNav\(\)"/);
  assert.match(html, /function toggleDashboardSideNav/);
  assert.match(html, /button\.setAttribute\('aria-expanded', side\.classList\.contains\('open'\) \? 'true' : 'false'\)/);
  assert.match(html, /function closeDashboardSideNav/);
  assert.match(html, /document\.querySelectorAll\('aside\.side a'\)\.forEach/);
  assert.match(html, /\.menu-btn\[aria-expanded="true"\]/);
  const mobileStart = html.indexOf('@media (max-width:980px)');
  const mobileEnd = html.indexOf('@media (max-width:760px)', mobileStart);
  const mobileCss = html.slice(mobileStart, mobileEnd);
  assert.match(mobileCss, /aside\.side\{[\s\S]*pointer-events:none/);
  assert.match(mobileCss, /aside\.side\.open\{[\s\S]*pointer-events:auto/);
});

test('mobile native dashboard owns the iOS safe area', () => {
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" \/>/);
  assert.match(html, /document\.documentElement\.classList\.add\('ios-reader-app'\)/);
  assert.match(html, /html\.ios-reader-app\s+\.topbar\{[\s\S]*padding-top:calc\(16px \+ env\(safe-area-inset-top, 0px\)\)/);
  assert.match(html, /html\.ios-reader-app\s+section\.block,\s*html\.ios-reader-app\s+\.recap\[id\]\{[\s\S]*scroll-margin-top:calc\(132px \+ env\(safe-area-inset-top, 0px\)\)/);
  assert.match(html, /html\.ios-reader-app\s+body::before\{[\s\S]*position:fixed[\s\S]*height:env\(safe-area-inset-top, 0px\)[\s\S]*background:var\(--navy\)[\s\S]*pointer-events:none/);
  assert.match(html, /#mobile-daily-bar\{[\s\S]*height:calc\(64px \+ env\(safe-area-inset-bottom, 0px\)\)/);
});

test('mobile dashboard first actions stay compact above the fixed quick bar', () => {
  assert.match(html, /@media \(max-width:760px\)\{[\s\S]*\.study-action-group\{[\s\S]*display:grid/);
  assert.match(html, /@media \(max-width:760px\)\{[\s\S]*\.study-action-group\{[\s\S]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(html, /@media \(max-width:760px\)\{[\s\S]*\.study-action-label\{display:none\}/);
  assert.match(html, /@media \(max-width:760px\)\{[\s\S]*\.study-next-plan\{[\s\S]*grid-template-columns:1fr/);
  assert.match(html, /@media \(max-width:760px\)\{[\s\S]*\.study-next-plan-copy\{min-width:0\}/);
  assert.match(html, /@media \(max-width:760px\)\{[\s\S]*\.study-next-plan-actions\{[\s\S]*display:grid[\s\S]*grid-template-columns:1fr/);
  assert.doesNotMatch(html, /@media \(max-width:760px\)\{[\s\S]*\.study-next-plan > span > span:not\(\.k\)\{display:none\}/);
  assert.doesNotMatch(html, /@media \(max-height:720px\)\{[\s\S]*\.study-next-plan\{display:none\}/);
  assert.match(html, /@media \(max-height:720px\)\{[\s\S]*\.study-next-plan\{[\s\S]*min-height:44px/);
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
  const row = cssRule(html, '.res-row');
  const law = cssRule(html, '.res-row .law');
  const art = cssRule(html, '.res-row .art');
  const title = cssRule(html, '.res-row .ttl');
  assert.match(html, /\.res-row\s*\{[\s\S]*?grid-template-columns:minmax\(92px,160px\) minmax\(64px,118px\) minmax\(12rem,1fr\) auto auto auto/);
  assert.match(row, /overflow:hidden/);
  assert.match(law, /text-overflow:ellipsis/);
  assert.match(art, /white-space:nowrap/);
  assert.match(art, /word-break:keep-all/);
  assert.match(title, /min-width:0/);
  assert.match(title, /-webkit-line-clamp:2/);
  assert.match(title, /overflow-wrap:break-word/);
  assert.doesNotMatch(title, /overflow-wrap:anywhere/);
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
  assert.match(html, /a\.answer_source \|\| a\.source \|\| 'server_weak_laws'/);
  assert.match(html, /answerSourceLabel\(hit\.source\)/);
  assert.match(html, /這條曾答錯/);
  assert.match(html, /href="#review">重練錯題<\/a>/);
});

test('closed article drawer is hidden from mobile hit testing until opened', () => {
  const drawerRule = html.match(/\.drawer\s*\{[\s\S]*?\n  \}/)?.[0] || '';
  assert.match(drawerRule, /pointer-events:none/);
  assert.match(drawerRule, /visibility:hidden/);
  assert.match(html, /\.drawer\.open\{[^}]*pointer-events:auto[^}]*visibility:visible/);
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
  assert.match(html, /data-reader-href/);
  assert.match(extractFunction(html, 'recapArticleOpen'), /openDashboardArticleTarget\(el, null\)/);
  assert.doesNotMatch(extractFunction(html, 'recapArticleOpen'), /location\.href/);
  assert.match(html, /window\.recapArticleOpen = recapArticleOpen/);
  assert.match(html, /window\.recapArticleKeyOpen = recapArticleKeyOpen/);
  assert.match(html, /class="recap-row is-link"/);
  assert.match(html, /role="button"/);
  assert.match(html, /onkeydown="recapArticleKeyOpen\(event, this\)"/);
});

test('server recent answer recap shows readable source labels', () => {
  assert.match(html, /function answerSourceLabel/);
  assert.match(html, /line_quiz[\s\S]*LINE 作答/);
  assert.match(html, /line_daily[\s\S]*LINE 每日題/);
  assert.match(html, /unknown[\s\S]*未標來源/);
  assert.match(html, /answer-source/);
  assert.match(html, /answerSourceLabel\(e\.source\)/);
});

test('saved and recent law rows are semantic keyboard-operable controls', () => {
  assert.match(html, /function drawerOpenAttrs\(pid, lawName, artNo, label\)/);
  assert.match(html, /function articleReaderHref\(lawName, artNo, pageId\)/);
  assert.match(html, /data-reader-href="/);
  assert.match(html, /function openDashboardArticleTarget/);
  assert.match(html, /onclick="return openDashboardArticleTarget\(this,event\)"/);
  assert.match(html, /role="button" tabindex="0" aria-label="/);
  assert.match(html, /event\.key==='Enter'\|\|event\.key===' '/);
  assert.match(html, /class="li-card"'\s*\+ drawerOpenAttrs\(pid, ln, artSafe, '開啟收藏條文/);
  assert.match(html, /class="li-card"'\s*\+ drawerOpenAttrs\(pid, ln, artSafe, '開啟已熟記條文/);
  assert.match(html, /class="li-card warn full"'\s*\+ drawerOpenAttrs\(pid, ln, artSafe, '開啟待複習條文/);
  assert.match(html, /var openLabel\s*=\s*\['開啟最近查詢'/);
  assert.match(html, /class="rec-row"'\s*\+ drawerOpenAttrs\(pid, ln, artSafe, openLabel\)/);
});

test('saved and recent law rows open the article reader instead of dashboard search fallback', () => {
  assert.doesNotMatch(html, /function chooseArticleOpenAction\(pid, lawName, artNo\)/);
  assert.match(extractFunction(html, 'openDashboardArticleTarget'), /openDrawer\(pid, law, art\)/);
  assert.match(extractFunction(html, 'openDashboardArticleTarget'), /searchAndOpen\(law, art\)/);
  assert.doesNotMatch(extractFunction(html, 'openDashboardArticleTarget'), /location\.href/);
  assert.match(html, /drawerOpenAttrs\(pid, lawName, artNo, label\)[\s\S]*articleReaderHref\(safeLaw, safeArt, safePid\)/);
  assert.match(html, /onkeydown="' \+ keyAction \+ '"/);
});

test('dashboard article labels normalize raw article numbers before wrapping text', () => {
  const source = [
    extractFunction(html, '_normalizeArticleNo'),
    extractFunction(html, 'cleanArticleNoForDisplay'),
    extractFunction(html, 'displayArticleNo'),
    extractFunction(html, 'fallbackArticleTitle'),
    extractFunction(html, 'articleLabelParts'),
    extractFunction(html, 'formatLawArticleCount'),
    extractFunction(html, 'articleReaderHref'),
  ].join('\n');
  const sandbox = { encodeURIComponent };
  vm.createContext(sandbox);
  vm.runInContext(`${source}; this.helpers = { cleanArticleNoForDisplay, displayArticleNo, fallbackArticleTitle, articleLabelParts, formatLawArticleCount, articleReaderHref };`, sandbox);

  assert.equal(sandbox.helpers.cleanArticleNoForDisplay('第13條'), '13');
  assert.equal(sandbox.helpers.cleanArticleNoForDisplay('§ 13'), '13');
  assert.equal(sandbox.helpers.cleanArticleNoForDisplay('第十三條之一'), '13之1');
  assert.equal(sandbox.helpers.cleanArticleNoForDisplay('§ 27 | 使用許可案件審議通過後核發使用許可'), '27');
  assert.equal(sandbox.helpers.cleanArticleNoForDisplay('§ 102-1'), '102-1');
  assert.equal(sandbox.helpers.displayArticleNo('第13條'), '§ 13');
  assert.equal(sandbox.helpers.fallbackArticleTitle('第13條', ''), '第 13 條');
  assert.equal(sandbox.helpers.fallbackArticleTitle('第13條', '文件補正期限'), '文件補正期限');
  assert.deepEqual(
    JSON.parse(JSON.stringify(sandbox.helpers.articleLabelParts('§ 27 | 使用許可案件審議通過後核發使用許可', ''))),
    { article_no: '27', title: '使用許可案件審議通過後核發使用許可' },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(sandbox.helpers.articleLabelParts('§ 102-1 | 違反醫院設置標準之醫院層級加重罰則', ''))),
    { article_no: '102-1', title: '違反醫院設置標準之醫院層級加重罰則' },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(sandbox.helpers.articleLabelParts('第 12 條之1 第 12 條之1 決議書內容與作成期限', ''))),
    { article_no: '12之1', title: '決議書內容與作成期限' },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(sandbox.helpers.articleLabelParts('§ 102-1 | § 102-1 | 違反醫院設置標準之醫院層級加重罰則', ''))),
    { article_no: '102-1', title: '違反醫院設置標準之醫院層級加重罰則' },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(sandbox.helpers.articleLabelParts('§ 72 | 電子會計資料不實罪', '§ 72 | 電子會計資料不實罪'))),
    { article_no: '72', title: '電子會計資料不實罪' },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(sandbox.helpers.articleLabelParts('§ 102-1', '第 102-1 條｜§ 102-1｜違反醫院設置標準之醫院層級加重罰則'))),
    { article_no: '102-1', title: '違反醫院設置標準之醫院層級加重罰則' },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(sandbox.helpers.articleLabelParts('§102-1', '§102-1 | 違反醫院設置標準之醫院層級加重罰則'))),
    { article_no: '102-1', title: '違反醫院設置標準之醫院層級加重罰則' },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(sandbox.helpers.articleLabelParts('§102-1', '第102-1條 | §102-1 | 違反醫院設置標準之醫院層級加重罰則'))),
    { article_no: '102-1', title: '違反醫院設置標準之醫院層級加重罰則' },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(sandbox.helpers.articleLabelParts('§ 27', '§ 27｜第 27 條｜使用許可案件審議通過後核發使用許可'))),
    { article_no: '27', title: '使用許可案件審議通過後核發使用許可' },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(sandbox.helpers.articleLabelParts('', '§ 72 | 電子會計資料不實罪'))),
    { article_no: '72', title: '電子會計資料不實罪' },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(sandbox.helpers.articleLabelParts('', '第 27 條 | 使用許可案件審議通過後核發使用許可'))),
    { article_no: '27', title: '使用許可案件審議通過後核發使用許可' },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(sandbox.helpers.articleLabelParts('§ 08', '第 08 條'))),
    { article_no: '08', title: '' },
  );
  assert.equal(sandbox.helpers.formatLawArticleCount(567), '567 條');
  assert.equal(sandbox.helpers.formatLawArticleCount(''), '');
  assert.equal(sandbox.helpers.formatLawArticleCount('—'), '');
  assert.equal(
    sandbox.helpers.articleReaderHref('記帳士法', '第13條', 'abc123'),
    'law-preview.html?law=%E8%A8%98%E5%B8%B3%E5%A3%AB%E6%B3%95&id=abc123&art=13&from=dashboard&back=dashboard.html',
  );
});

test('dashboard search result article numbers prefer the leading article label over cross references', () => {
  const source = [
    extractFunction(html, '_normalizeArticleNo'),
    extractFunction(html, '_articleNoFromRecord'),
  ].join('\n');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${source}; this.articleNo = _articleNoFromRecord;`, sandbox);

  assert.equal(
    sandbox.articleNo({
      title: '§ 102｜附始期之法律行為於期限屆至時發生效力、附終期之法律行為於期限屆滿時失其效力、並準用第100條期待權保護',
    }),
    '102',
  );

  const renderSource = extractFunction(html, '_renderResRows');
  assert.match(renderSource, /var parts\s*=\s*articleLabelParts\(rawArt,\s*a\.title \|\| ''\)/);
  assert.match(renderSource, /var artNum\s*=\s*parts\.article_no \|\| _articleNoFromRecord\(a\)/);
  assert.match(renderSource, /var artTtl\s*=\s*parts\.title \|\| fallbackArticleTitle\(artNum,\s*''\)/);
});

test('saved article sections use normalized label parts to avoid duplicated titles', () => {
  const favStart = html.indexOf("var el = document.getElementById('favorites-list')");
  const favEnd = html.indexOf('// ── 05 已熟記', favStart);
  assert.ok(favStart >= 0 && favEnd > favStart, 'favorites renderer must be extractable');
  const favBlock = html.slice(favStart, favEnd);
  assert.match(favBlock, /var parts\s*=\s*articleLabelParts\(artRaw,\s*b\.title\)/);
  assert.match(favBlock, /displayArticleNo\(parts\.article_no\)/);
  assert.match(favBlock, /esc\(parts\.title\)/);

  const masterStart = html.indexOf('// ── 05 已熟記');
  const masterEnd = html.indexOf('// ── 今日複習提醒', masterStart);
  assert.ok(masterStart >= 0 && masterEnd > masterStart, 'mastery renderer must be extractable');
  const masterBlock = html.slice(masterStart, masterEnd);
  assert.match(masterBlock, /var parts\s*=\s*articleLabelParts\(artRaw,\s*m\.title\)/);
  assert.match(masterBlock, /displayArticleNo\(parts\.article_no\)/);
  assert.match(masterBlock, /esc\(parts\.title\)/);
});

test('recent query rows keep article numbers separate from titles', () => {
  const recentStart = html.indexOf('// ── 09 最近查詢');
  const recentEnd = html.indexOf('// ── 會員期限明細', recentStart);
  assert.ok(recentStart >= 0 && recentEnd > recentStart, 'recent query renderer must be extractable');
  const recentBlock = html.slice(recentStart, recentEnd);
  assert.match(recentBlock, /var parts\s*=\s*articleLabelParts\(h\.article \|\| h\.article_no \|\| '',\s*h\.title\)/);
  assert.match(recentBlock, /var articleLabel\s*=\s*displayArticleNo\(parts\.article_no\)/);
  assert.match(recentBlock, /var title\s*=\s*parts\.title === articleLabel \? '' : parts\.title/);
  assert.match(recentBlock, /'<span class="art">'\+esc\(articleLabel\)\+'<\/span>'/);
  assert.match(recentBlock, /\(title \? '<span class="ttl">'\+esc\(title\)\+'<\/span>' : ''\)/);
  assert.doesNotMatch(recentBlock, /'<span class="art">'\+esc\(displayArticleNo\(parts\.article_no\)\)\+'<\/span>'/);
});

test('article cards keep article labels horizontal on desktop and mobile', () => {
  assert.match(html, /\.li-card \.art\{[\s\S]*white-space:nowrap/);
  assert.match(html, /\.li-card \.art\{[\s\S]*word-break:keep-all/);
  assert.match(html, /\.rec-row \.art\{[\s\S]*white-space:nowrap/);
  assert.match(html, /\.rec-row \.art\{[\s\S]*word-break:keep-all/);
  assert.match(html, /@media \(max-width: 760px\)\{[\s\S]*\.li-card \.art\{[\s\S]*white-space:nowrap/);
  assert.match(html, /@media \(max-width: 760px\)\{[\s\S]*\.rec-row \.art\{[\s\S]*white-space:nowrap/);
});

test('recent query rows stay horizontal and only stack on narrower screens', () => {
  const recentTitle = cssRule(html, '.rec-row .ttl');
  assert.match(html, /\.recent-list\{[\s\S]*overflow:hidden/);
  assert.match(html, /\.rec-row\{[\s\S]*min-width:0/);
  assert.match(html, /\.rec-row\{[\s\S]*max-width:100%/);
  assert.match(html, /\.rec-row\{[\s\S]*overflow:hidden/);
  assert.match(html, /\.rec-row\{[\s\S]*grid-template-columns:minmax\(86px,150px\) minmax\(74px,132px\) minmax\(0,1fr\) auto/);
  assert.match(html, /\.rec-row\{[\s\S]*grid-template-areas:"law art title time"/);
  assert.match(html, /\.rec-row\{[\s\S]*column-gap:18px/);
  assert.match(html, /\.rec-row \.law\{[\s\S]*grid-area:law/);
  assert.match(html, /\.rec-row \.art\{[\s\S]*grid-area:art/);
  assert.match(html, /\.rec-row \.art\{[\s\S]*max-width:132px/);
  assert.match(html, /\.rec-row \.art\{[\s\S]*overflow:hidden/);
  assert.match(html, /\.rec-row \.art\{[\s\S]*text-overflow:ellipsis/);
  assert.match(html, /\.rec-row \.ttl\{[\s\S]*grid-area:title/);
  assert.match(html, /\.rec-row \.ttl\{[\s\S]*border-left:0/);
  assert.match(recentTitle, /word-break:normal/);
  assert.match(recentTitle, /overflow-wrap:break-word/);
  assert.match(recentTitle, /-webkit-line-clamp:2/);
  assert.doesNotMatch(recentTitle, /overflow-wrap:anywhere/);
  assert.match(html, /\.rec-row \.time\{[\s\S]*grid-area:time/);
  assert.match(html, /@media \(max-width:1180px\)\{[\s\S]*\.rec-row\{[\s\S]*grid-template-columns:minmax\(64px,132px\) minmax\(0,1fr\)/);
  assert.match(html, /@media \(max-width:1180px\)\{[\s\S]*\.rec-row\{[\s\S]*grid-template-areas:"law time" "art title"/);
  assert.match(html, /@media \(max-width: 760px\)\{[\s\S]*\.rec-row\{[\s\S]*grid-template-areas:"law time" "art time" "title title"/);
  assert.match(html, /@media \(max-width: 760px\)\{[\s\S]*\.rec-row \.law\{[\s\S]*grid-area:law/);
  assert.match(html, /@media \(max-width: 760px\)\{[\s\S]*\.rec-row \.art\{[\s\S]*grid-area:art/);
  assert.match(html, /@media \(max-width: 760px\)\{[\s\S]*\.rec-row \.art\{[\s\S]*max-width:100%/);
  assert.match(html, /@media \(max-width: 760px\)\{[\s\S]*\.rec-row \.art\{[\s\S]*text-overflow:ellipsis/);
  assert.match(html, /@media \(max-width: 760px\)\{[\s\S]*\.rec-row \.ttl\{[\s\S]*grid-area:title/);
  assert.match(html, /@media \(max-width: 760px\)\{[\s\S]*\.rec-row \.time\{[\s\S]*grid-area:time/);
});

test('dashboard analysis cross references look like tappable law chips', () => {
  assert.match(html, /\.acc-inner \.crossref\{[\s\S]*display:inline-flex/);
  assert.match(html, /\.acc-inner \.crossref\{[\s\S]*align-items:center/);
  assert.match(html, /\.acc-inner \.crossref\{[\s\S]*border:1px solid rgba\(213,154,120,\.[0-9]+\)/);
  assert.match(html, /\.acc-inner \.crossref\{[\s\S]*white-space:nowrap/);
  assert.match(html, /\.acc-inner \.crossref\{[\s\S]*margin:0 3px 4px 0/);
});

test('review due rows use the same article fallback as saved and recent rows', () => {
  const fn = html.slice(html.indexOf('function renderReviewDue'), html.indexOf('function renderStudyToday'));
  assert.match(fn, /var parts\s*=\s*articleLabelParts\(m\.article \|\| m\.article_no \|\| '',\s*m\.title\)/);
  assert.match(fn, /var disp\s*=\s*displayArticleNo\(parts\.article_no \|\| artNo\)/);
  assert.match(fn, /drawerOpenAttrs\(pid, ln, artNo, '開啟今日複習條文/);
  assert.doesNotMatch(fn, /onclick="openDrawer\('\\'\+pid/);
});

test('searchAndOpen uses normalized article numbers instead of a numeric-title regex', () => {
  const fn = html.slice(html.indexOf('function searchAndOpen'), html.indexOf('var FONT_KEY'));
  assert.match(fn, /var targetArt = _normalizeArticleNo\(artNum\)/);
  assert.match(fn, /_articleNoFromRecord\(a\) === targetArt/);
  assert.doesNotMatch(fn, /title\|\|''\)\.match\(\/第\\\(\\d\+\\\)條/);
});

test('law drawer nested analysis bullets have visible hierarchy', () => {
  assert.match(html, /\.acc-inner \.sec-i\{[^}]*margin:10px 0 10px 56px/);
  assert.match(html, /\.acc-inner \.sec-i\{[^}]*padding:9px 14px 9px 46px/);
  assert.match(html, /\.acc-inner \.sec-i\{[^}]*border-left:5px solid rgba\(231,187,167,\.[0-9]+\)/);
  assert.match(html, /\.acc-inner \.sec-i\{[^}]*background:rgba\(231,187,167,\.[0-9]+\)/);
  assert.match(html, /\.acc-inner \.sec-i::before\{[^}]*left:16px/);
  assert.match(html, /@media \(max-width: 760px\)\{[\s\S]*\.acc-inner \.sec-i\{[^}]*margin:9px 0 9px 24px/);
});

test('law article URL handlers open the target article through the canonical fallback', () => {
  const queryFn = extractFunction(html, '_handleUrlQuery');
  const lawFn = extractFunction(html, '_handleUrlLaw');
  assert.match(queryFn, /if\(q && art\) return _redirectArticleUrlToReader\(q, art\)/);
  assert.match(lawFn, /if\(law && art\) return _redirectArticleUrlToReader\(law, art\)/);
  assert.doesNotMatch(queryFn, /if\(q && art\) searchAndOpen/);
  assert.doesNotMatch(lawFn, /if\(law && art\) searchAndOpen/);
});

test('recent answer recap has an empty state so sidebar T6 has a real target', () => {
  assert.match(html, /function showRecap\(html\)/);
  assert.match(html, /目前還沒有正式答題紀錄/);
  assert.match(html, /先做一題選擇題/);
  assert.match(html, /showRecap\(''\)/);
  assert.match(html, /recap\.style\.display='block'/);
});

test('dashboard article open URLs land on the article reader instead of the search form', () => {
  const start = html.indexOf('function _handleUrlOpen');
  assert.ok(start >= 0, '_handleUrlOpen must exist');
  const fn = html.slice(start, start + 700);
  assert.match(fn, /openDrawer\(decodeURIComponent\(pid\)/);
  assert.match(fn, /focusArticleReaderLanding\(\)/);
  assert.doesNotMatch(fn, /document\.getElementById\('search'\)/);
  assert.doesNotMatch(fn, /scrollIntoView\(\{behavior:'smooth', block:'start'\}\)/);
});

test('expire overlay explains feedback and sharing extension rules', () => {
  assert.match(html, /id="expire-overlay"/);
  assert.match(html, /謝謝你花時間體驗 SoFa/);
  assert.match(html, /給我們一次改進的機會/);
  assert.match(html, /卡、煩、不清楚/);
  assert.match(html, /黎明前最暗的那段/);
  assert.match(html, /回饋缺點 \+10 天/);
  assert.match(html, /分享標記 \+10 天/);
  assert.match(html, /兩個都可以做，不衝突/);
  assert.match(html, /回饋每個帳號限一次/);
  assert.match(html, /幾個帳號就加幾次/);
  assert.match(html, /你的 SoFa 帳號/);
  assert.match(html, /隔天依信任制自動補登體驗天數/);
  assert.match(html, /data-track-event="expire_entitlement_detail_click"/);
  assert.match(html, /查看期限明細/);
  assert.match(html, /function openExpireEntitlementPanel/);
  assert.match(html, /openExpireEntitlementPanel\(\)\{[\s\S]*expire-overlay[\s\S]*style\.display='none'[\s\S]*openEntitlementPanel\(\)/);
});

test('member card surfaces renewal before expiry without hiding payment', () => {
  assert.match(html, /id="mc-renewal-nudge"/);
  assert.match(html, /保留弱點分析、今日複習和會員期限明細/);
  assert.match(html, /href="pricing\.html\?utm_source=dashboard&utm_medium=member_card&utm_campaign=renewal_pricing"[\s\S]*續用方案/);
  assert.match(html, /function renderMembershipRenewalNudge/);
  assert.match(html, /daysLeft <= 10/);
});

test('entitlement panel refreshes if ledger data arrives after the panel opens', () => {
  assert.match(html, /function refreshEntitlementPanelIfOpen/);
  assert.match(html, /backdrop && backdrop\.classList\.contains\('on'\)/);
  assert.match(html, /refreshEntitlementPanelIfOpen\(\);\s*renderStudyToday/);
});

test('expired members can read their membership card from entitlement data when profile is gated', () => {
  assert.match(html, /function profileFromEntitlementData/);
  assert.match(html, /var memberCardProfile = profile \|\| profileFromEntitlementData\(_entitlementState\.data\)/);
  assert.match(html, /if\(memberCardProfile\)\{/);
  assert.match(html, /var entitlementOnly = !!memberCardProfile\.entitlement_only/);
  assert.match(html, /entitlementOnly && serial \? \('後 4 碼 ' \+ serial\) : \(serial \? _maskSerial\(serial\) : '——'\)/);
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

test('desktop top exam-loop entries keep app-sized hit targets', () => {
  assert.match(html, /\.top-mid a\{\s*[\s\S]*min-width:44px/);
  assert.match(html, /\.top-mid a\{\s*[\s\S]*min-height:44px/);
  assert.match(html, /\.top-mid a\{\s*[\s\S]*display:inline-flex/);
  assert.match(html, /\.top-mid a\{\s*[\s\S]*align-items:center/);
  assert.match(html, /\.top-mid a\{\s*[\s\S]*justify-content:center/);
});

test('mobile tool cards keep short usage hints visible', () => {
  assert.doesNotMatch(html, /\.tool \.desc\{display:none\}/);
  assert.match(html, /\.tool \.desc\{\s*display:block/);
  assert.match(html, /\.tool \.desc\{\s*[\s\S]*color:rgba\(245,240,234,\.68\)/);
  assert.match(html, /想練新題從這裡開始/);
  assert.match(html, /挖空關鍵字/);
  assert.match(html, /逐字輸入法條原文/);
  assert.match(html, /看哪部法規最弱/);
});
