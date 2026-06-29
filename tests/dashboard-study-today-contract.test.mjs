import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');

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

function buildRecommendationHarness() {
  const source = [
    `function _todayInputValue(){ return '2026-06-27'; }`,
    `function _datePlusDays(dateText, days){ const d = new Date(dateText + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0,10); }`,
    extractFunction(active, '_weekdayDateFromToday'),
    extractFunction(active, '_studyTimeToMinutes'),
    extractFunction(active, '_studyItemDurationMinutes'),
    extractFunction(active, '_studySlotIsFree'),
    extractFunction(active, '_studyNextAvailableSlot')
  ].join('\n');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${source}; this._studyNextAvailableSlot = _studyNextAvailableSlot; this._studySlotIsFree = _studySlotIsFree;`, sandbox);
  return sandbox;
}

function createFakeElement(id = '') {
  const classes = new Set();
  const el = {
    id,
    value: '',
    textContent: '',
    innerHTML: '',
    hidden: false,
    attrs: {},
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
      toggle(name, force) {
        const shouldAdd = typeof force === 'boolean' ? force : !classes.has(name);
        if (shouldAdd) classes.add(name);
        else classes.delete(name);
      },
    },
    setAttribute(name, value) { el.attrs[name] = String(value); },
    getAttribute(name) { return el.attrs[name] || ''; },
  };
  return el;
}

function buildStudyPanelHarness() {
  const elements = {};
  const element = (id) => {
    if (!elements[id]) elements[id] = createFakeElement(id);
    return elements[id];
  };
  ['study-plan-panel', 'study-record-panel', 'study-playlist-panel', 'study-mode-status', 'study-plan-state', 'study-plan-start', 'study-record-date'].forEach(element);
  const triggers = ['playlist', 'plan', 'record'].map((mode) => {
    const el = createFakeElement(`trigger-${mode}`);
    el.attrs['data-study-panel-trigger'] = mode;
    return el;
  });
  const calls = { focus: [], loadPlaylist: 0 };
  const sandbox = {
    document: {
      getElementById: element,
      querySelectorAll(selector) {
        if (selector === '[data-study-panel-trigger]') return triggers;
        return [];
      },
    },
    esc(value) { return String(value ?? ''); },
    focusStudyPanelTarget(panelId, navId) { calls.focus.push([panelId, navId]); },
    loadStudyPlaylist() { calls.loadPlaylist += 1; },
  };
  vm.createContext(sandbox);
  vm.runInContext([
    `function _todayInputValue(){ return '2026-06-29'; }`,
    extractFunction(active, 'setStudyPanelMode'),
    extractFunction(active, 'openStudyPlanPanel'),
    extractFunction(active, 'openStudyRecordPanel'),
    extractFunction(active, 'openStudyPlaylistPanel'),
    `this.openStudyPlanPanel = openStudyPlanPanel;`,
    `this.openStudyRecordPanel = openStudyRecordPanel;`,
    `this.openStudyPlaylistPanel = openStudyPlaylistPanel;`,
  ].join('\n'), sandbox);
  return { sandbox, elements, triggers, calls };
}

test('dashboard exposes a seed-backed cockpit recap', () => {
  assert.match(active, /id="study-cockpit-recap"/);
  assert.match(active, /id="study-cockpit-subjects"/);
  assert.match(active, /id="study-cockpit-blocks"/);
});

test('law drawer analysis linkifies sixth-section law references', () => {
  const source = extractFunction(active, '_linkifyLaw');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${source}; this.linkify = _linkifyLaw;`, sandbox);

  const linkedSameLaw = sandbox.linkify('同法第13條、本法第15條', '記帳士法');
  assert.match(linkedSameLaw, /href="law-preview\.html\?law=%E8%A8%98%E5%B8%B3%E5%A3%AB%E6%B3%95&amp;art=13"/);
  assert.match(linkedSameLaw, /href="law-preview\.html\?law=%E8%A8%98%E5%B8%B3%E5%A3%AB%E6%B3%95&amp;art=15"/);
  assert.doesNotMatch(linkedSameLaw, /searchAndOpen/);

  const linkedNamedLaw = sandbox.linkify('記帳士法第13條及第15條', '所得稅法');
  assert.match(linkedNamedLaw, /href="law-preview\.html\?law=%E8%A8%98%E5%B8%B3%E5%A3%AB%E6%B3%95&amp;art=13"/);
  assert.match(linkedNamedLaw, /href="law-preview\.html\?law=%E8%A8%98%E5%B8%B3%E5%A3%AB%E6%B3%95&amp;art=15"/);
  assert.doesNotMatch(linkedNamedLaw, /searchAndOpen/);
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

test('today weak brief appears before the next plan card on mobile first screen', () => {
  const recapStart = active.indexOf('id="study-cockpit-recap"');
  assert.ok(recapStart >= 0, 'study recap must exist');
  const recap = active.slice(recapStart, recapStart + 5200);
  const weakIndex = recap.indexOf('id="study-weak-brief"');
  const nextPlanIndex = recap.indexOf('id="study-next-plan"');
  assert.ok(weakIndex > -1, 'weak brief must exist inside today recap');
  assert.ok(nextPlanIndex > -1, 'next plan card must exist inside today recap');
  assert.ok(weakIndex < nextPlanIndex, 'weak brief should appear before the next plan card');
});

test('small mobile screens compact the weak brief above the fixed quick bar', () => {
  assert.match(active, /@media\(max-width:760px\) and \(max-height:720px\)\{[\s\S]*\.study-weak-brief\{/);
  assert.match(active, /@media\(max-width:760px\) and \(max-height:720px\)\{[\s\S]*\.study-weak-brief-kicker\{\s*display:none/);
  assert.match(active, /@media\(max-width:760px\) and \(max-height:720px\)\{[\s\S]*\.study-weak-brief-row\{[\s\S]*padding:5px 8px/);
  assert.match(active, /@media\s*\(max-height:720px\)\{[\s\S]*\.study-actions\{[\s\S]*gap:8px/);
  assert.match(active, /@media\s*\(max-height:720px\)\{[\s\S]*\.study-action-label\{[\s\S]*display:none/);
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
  assert.match(active, /onclick="openStudyPlaylistPanel\(\)"[\s\S]*重點朗讀/);
  assert.match(active, /onclick="openStudyPlanPanel\(\)"[\s\S]*設定讀書課程/);
  assert.match(active, /onclick="openStudyRecordPanel\(\)"[\s\S]*補紀錄/);
  assert.match(active, /id="study-playlist-panel"/);
  assert.match(active, /id="study-plan-panel"/);
  assert.match(active, /適合函授、補習班課程、模考或自己的週任務/);
  assert.match(active, /function saveStudySeries/);
  assert.match(active, /\/api\/me\/study\/series/);
  assert.match(active, /count:\s*count/);
  assert.doesNotMatch(active, /total_sessions:\s*count/);
});

test('desktop dashboard keeps the left library rail persistent', () => {
  assert.match(active, /\.shell\{[\s\S]*grid-template-columns:280px minmax\(0,1fr\)/);
  assert.match(active, /aside\.side\{[\s\S]*position:fixed;top:71px;bottom:0;left:0;width:280px/);
  assert.match(active, /aside\.side\{[\s\S]*height:calc\(100dvh - 71px\)/);
  assert.match(active, /main\.main\{[\s\S]*grid-column:2/);
  assert.match(active, /@media \(max-width:980px\)\{[\s\S]*\.shell\{grid-template-columns:1fr\}/);
  assert.match(active, /@media \(max-width:980px\)\{[\s\S]*aside\.side\{[\s\S]*position:fixed;top:65px;left:0;width:280px/);
});

test('study plan and record panels have deep links for native app entry', () => {
  assert.match(active, /function openStudyPanelFromHash/);
  assert.match(active, /function retryStudyHashScroll/);
  assert.match(active, /hash === '#member'[\s\S]*retryStudyHashScroll\('member',\s*30,\s*true\)/);
  assert.match(active, /hash === '#study-plan'[\s\S]*openStudyPlanPanel\(true\)/);
  assert.match(active, /hash === '#study-record'[\s\S]*openStudyRecordPanel\(true\)/);
  assert.match(active, /hash === '#study-playlist'[\s\S]*openStudyPlaylistPanel\(true\)/);
  assert.match(active, /retryStudyHashScroll\('member',\s*30,\s*true\)/);
  assert.match(active, /retryStudyHashScroll\('study-plan-panel',\s*18,\s*true\)/);
  assert.match(active, /retryStudyHashScroll\('study-record-panel',\s*18,\s*true\)/);
  assert.match(active, /retryStudyHashScroll\('study-playlist-playall',\s*18,\s*true\)/);
  assert.match(active, /\.study-mode-status\{[\s\S]*scroll-margin-top:calc\(84px \+ env\(safe-area-inset-top, 0px\)\)/);
  assert.match(active, /\.study-plan-panel,\s*\.study-record-panel,\s*\.study-playlist-panel\{[\s\S]*scroll-margin-top:calc\(96px \+ env\(safe-area-inset-top, 0px\)\)/);
  assert.match(active, /\.study-plan-panel,\s*\.study-record-panel,\s*\.study-playlist-panel\{[\s\S]*scroll-margin-bottom:calc\(104px \+ env\(safe-area-inset-bottom, 0px\)\)/);
  assert.match(active, /\.study-mode-status\.is-closed\{display:none\}/);
  assert.doesNotMatch(active, /retryStudyHashScroll\('study-mode-status',\s*18,\s*true\)/);
  assert.match(active, /hashchange', openStudyPanelFromHash/);
  assert.match(active, /keepTrying/);
  assert.match(active, /retryStudyHashScroll\(targetId, attemptsLeft - 1, keepTrying\)/);
  assert.match(active, /getComputedStyle\(el\)\.display === 'none'/);
});

test('study plan and record deep-link panels start with readable headings before fields', () => {
  const planStart = active.indexOf('id="study-plan-panel"');
  const recordStart = active.indexOf('id="study-record-panel"');
  assert.ok(planStart > -1, 'study plan panel exists');
  assert.ok(recordStart > -1, 'study record panel exists');
  const planPanel = active.slice(planStart, planStart + 900);
  const recordPanel = active.slice(recordStart, recordStart + 1400);
  assert.match(planPanel, /class="study-panel-head"[\s\S]*設定讀書課程/);
  assert.match(planPanel, /class="study-panel-head"[\s\S]*函授、補習班、模考或自己的週任務/);
  assert.ok(planPanel.indexOf('設定讀書課程') < planPanel.indexOf('id="study-plan-title"'));
  assert.match(recordPanel, /class="study-panel-head study-record-copy"[\s\S]*補紀錄只會補進度，不會補答題正確率/);
  assert.ok(recordPanel.indexOf('補紀錄只會補進度') < recordPanel.indexOf('id="study-record-date"'));
});

test('expanded study tools update the left guide instead of leaving it on the previous section', () => {
  const focus = extractFunction(active, 'focusStudyGuideTarget');
  const panelFocus = extractFunction(active, 'focusStudyPanelTarget');
  assert.match(focus, /window\.__activeNavPinnedUntil = Date\.now\(\) \+ 900/);
  assert.match(focus, /setActive\(id\)/);
  assert.match(focus, /scrollIntoView\(\{ block:'start', behavior:'smooth' \}\)/);
  assert.match(panelFocus, /window\.__activeNavPinnedUntil = Date\.now\(\) \+ 1200/);
  assert.match(panelFocus, /setActive\(navId \|\| panelId\)/);
  assert.match(panelFocus, /document\.getElementById\(panelId\)/);
  assert.match(panelFocus, /scrollIntoView\(\{ block:'start', behavior:'smooth' \}\)/);
  assert.match(extractFunction(active, 'updateActiveNavFromScroll'), /Date\.now\(\) < window\.__activeNavPinnedUntil/);
  assert.match(extractFunction(active, 'toggleStudyTimeEditor'), /focusStudyGuideTarget\('study-time-box'\)/);
  assert.match(extractFunction(active, 'openStudyPlanPanel'), /focusStudyPanelTarget\('study-plan-panel',\s*'study-plan-items'\)/);
  assert.match(extractFunction(active, 'openStudyRecordPanel'), /focusStudyPanelTarget\('study-record-panel',\s*'study-plan-items'\)/);
  assert.match(extractFunction(active, 'openStudyPlaylistPanel'), /focusStudyPanelTarget\('study-playlist-playall',\s*'study-cockpit-recap'\)/);
  assert.doesNotMatch(extractFunction(active, 'openStudyPlaylistPanel'), /focusStudyGuideTarget\('study-plan-items'\)/);
});

test('study playlist is a generic text fallback and does not ship private schedules', () => {
  assert.match(active, /function openStudyPlaylistPanel/);
  assert.match(active, /function loadStudyPlaylist/);
  assert.match(active, /\/api\/playlist\?track=bookkeeper/);
  assert.match(active, /content_layer=analysis/);
  assert.match(active, /star_min=3/);
  assert.match(active, /重點朗讀，先聽最常考/);
  assert.match(active, /aria-label="通勤重點朗讀清單"/);
  assert.match(active, /aria-label="重點清單科目"/);
  assert.doesNotMatch(active, /播放清單/);
  assert.doesNotMatch(active, />PLAYLIST</);
  assert.doesNotMatch(active, /記帳士 115記帳士台北N1|115\/03\/02|稅務相關法規\(基礎\)1/);
});

test('study playlist items are executable with single-practice and article-reader links', () => {
  const fn = extractFunction(active, 'loadStudyPlaylist');
  assert.match(fn, /class="study-playlist-actions"/);
  assert.match(fn, /quiz\.html\?law=/);
  assert.match(fn, /&drill=1/);
  assert.match(fn, /law-preview\.html\?law=/);
  assert.match(fn, /item\.page_id \|\| item\.id/);
  assert.match(fn, /displayArticleNo = articleNo\.replace\(/);
  assert.match(fn, /displayTitle = String\(item\.title/);
  assert.match(fn, /單刷/);
  assert.match(fn, /看法條/);
});

test('study playlist article-reader links use law preview instead of dashboard search', () => {
  const fn = extractFunction(active, 'loadStudyPlaylist');
  assert.match(fn, /var readerHref = 'law-preview\.html\?law='/);
  assert.match(fn, /\+ \(itemId \? '&id=' \+ encodeURIComponent\(itemId\) : ''\)/);
  assert.match(fn, /\+ \(articleNo \? '&art=' \+ encodeURIComponent\(articleNo\) : ''\)/);
  assert.doesNotMatch(fn, /dashboard\.html\?q=/);
  assert.doesNotMatch(fn, /#search/);
});

test('study playlist falls back to today weakness and topic blocks when playlist API is empty', () => {
  assert.match(active, /function buildStudyPlaylistFallbackItems/);
  const fallback = extractFunction(active, 'buildStudyPlaylistFallbackItems');
  assert.match(fallback, /weak_law_bridge/);
  assert.match(fallback, /_latestWeakLawItems/);
  assert.doesNotMatch(fallback, /window\._latestWeakLawItems/);
  assert.match(fallback, /today\.blocks/);
  assert.match(fallback, /wrongCount/);
  assert.match(fallback, /答錯/);
  assert.match(fallback, /常考/);
  assert.match(fallback, /slice\(0,\s*8\)/);

  const load = extractFunction(active, 'loadStudyPlaylist');
  assert.match(load, /buildStudyPlaylistFallbackItems\(window\.__studyTodayData \|\| \{\},\s*subject\)/);
  assert.match(load, /今天還沒有弱點或題庫重點可朗讀/);
  assert.doesNotMatch(load, /先回選擇題累積弱點/);
});

test('open study playlist refreshes when weak laws arrive after the panel opened', () => {
  assert.match(active, /function refreshOpenStudyPlaylistFromWeakCache/);
  const refresh = extractFunction(active, 'refreshOpenStudyPlaylistFromWeakCache');
  assert.match(refresh, /study-playlist-panel/);
  assert.match(refresh, /classList\.contains\('on'\)/);
  assert.match(refresh, /__studyPlaylistAudioItems/);
  assert.match(refresh, /今天還沒有弱點或題庫重點可朗讀/);
  assert.match(refresh, /loadStudyPlaylist\(\)/);

  const render = extractFunction(active, 'renderWeakLaws');
  assert.match(render, /_latestWeakLawItems = laws/);
  assert.match(render, /refreshOpenStudyPlaylistFromWeakCache\(\)/);
});

test('dashboard law plus article deep links auto-open the target article', () => {
  const fn = extractFunction(active, '_handleUrlLaw');
  assert.match(fn, /params\.get\('law'\)/);
  assert.match(fn, /params\.get\('art'\) \|\| params\.get\('article'\)/);
  assert.match(fn, /if\(law && art\) return _redirectArticleUrlToReader\(law, art\)/);
  assert.doesNotMatch(fn, /if\(law && art\) searchAndOpen/);
});

test('dashboard article number helpers preserve sub-articles in result rows and drawers', () => {
  const helpers = vm.runInNewContext([
    extractFunction(active, '_normalizeArticleNo'),
    extractFunction(active, '_articleNoFromRecord'),
    '({ _articleNoFromRecord })',
  ].join('\n'));

  assert.equal(helpers._articleNoFromRecord({ title: '第43條之3 CFC' }), '43之3');
  assert.equal(helpers._articleNoFromRecord({ title: '第43之3條 CFC' }), '43之3');
  assert.equal(helpers._articleNoFromRecord({ article_no: '第43條之3' }), '43之3');
  assert.equal(helpers._articleNoFromRecord({ title: '第十三條之一' }), '13之1');
  assert.equal(helpers._articleNoFromRecord({ article_no: '第４３條之３' }), '43之3');

  const drawerStart = active.indexOf('function _renderDrawer(d)');
  assert.ok(drawerStart >= 0, '_renderDrawer must exist');
  const drawerFn = active.slice(drawerStart, drawerStart + 2600);
  assert.match(drawerFn, /var artNum = _articleNoFromRecord\(d\) \|\| _drArticle/);
  assert.doesNotMatch(drawerFn, /match\(\s*\/\\\(\\d\+\\\)\//);
});

test('dashboard URL article deep links run even when the law index is slow or unavailable', () => {
  assert.match(active, /function _runLandingUrlHandlers/);
  assert.match(active, /_urlLandingHandlersRun/);

  const lawsStart = active.indexOf('// 頁面載入後抓法規清單');
  assert.ok(lawsStart >= 0, 'law index bootstrap must exist');
  const lawsEnd = active.indexOf('// 細篩選項從當前法規', lawsStart);
  assert.ok(lawsEnd > lawsStart, 'law index bootstrap should be extractable');
  const lawsBlock = active.slice(lawsStart, lawsEnd);

  assert.match(lawsBlock, /_runLandingUrlHandlers\(\);/);
  assert.match(lawsBlock, /\.catch\(function\(\)\{\s*_runLandingUrlHandlers\(\);\s*\}\)/);
  assert.doesNotMatch(lawsBlock, /if\(d && d\.laws\)\{[\s\S]*?_handleUrlQuery\(\);[\s\S]*?\}/);
});

test('study playlist can directly play text through the browser speech engine', () => {
  assert.match(active, /id="study-playlist-playall"/);
  assert.match(active, /class="primary" id="study-playlist-playall"/);
  assert.match(active, /onclick="playStudyPlaylistAll\(this\)"/);
  assert.match(active, /朗讀全部/);
  assert.match(extractFunction(active, 'openStudyPlaylistPanel'), /focusStudyPanelTarget\('study-playlist-playall',\s*'study-cockpit-recap'\)/);
  assert.match(active, /id="study-playlist-status"/);
  assert.match(active, /function playStudyPlaylistItem/);
  assert.match(active, /function playStudyPlaylistAll/);
  assert.match(active, /function _setStudyPlaylistStatus/);
  assert.match(active, /function _setStudyPlaylistSpeakingIndex/);
  assert.match(active, /function _cleanSpeechCueText/);
  assert.match(active, /function _speakStudyPlaylistText/);
  assert.match(active, /SpeechSynthesisUtterance/);
  assert.match(active, /speechSynthesis\.speak/);
  assert.match(active, /utt\.onstart/);
  assert.match(active, /speechSynthesis\.resume/);
  assert.match(active, /window\.__studyPlaylistAudioItems/);
  assert.match(active, /\.study-playlist-item\.is-speaking/);
  assert.match(active, /正在朗讀：/);
  assert.match(active, /朗讀沒有啟動/);
  assert.match(active, /已停止朗讀/);
  assert.match(active, /已準備 ' \+ items\.length \+ ' 則文字重點/);
  assert.match(active, /重音\|停頓/);
  assert.match(active, /replace\(\s*\/\\s\+\/g,\s*' '\s*\)/);
  const fn = extractFunction(active, 'loadStudyPlaylist');
  assert.match(fn, /onclick="playStudyPlaylistItem\(this, ' \+ idx \+ '\)"/);
  assert.match(fn, />朗讀</);
  assert.match(fn, /data-playlist-index/);
  assert.match(active, /不支援朗讀|不支援朗讀，請先看文字清單|這個瀏覽器不支援朗讀/);
});

test('study tool panels expose one active mode and explain where saved work goes', () => {
  assert.match(active, /class="study-mode-status is-closed" id="study-mode-status" aria-live="polite"/);
  assert.match(active, /目前沒有展開工具/);
  assert.match(active, /data-study-panel-trigger="playlist" aria-expanded="false"/);
  assert.match(active, /data-study-panel-trigger="plan" aria-expanded="false"/);
  assert.match(active, /data-study-panel-trigger="record" aria-expanded="false"/);
  assert.match(active, /function setStudyPanelMode/);
  assert.match(active, /btn\.classList\.toggle\('is-active', on\)/);
  assert.match(active, /btn\.setAttribute\('aria-expanded', on \? 'true' : 'false'\)/);
  assert.match(active, /status\.classList\.toggle\('is-closed', active === 'closed'\)/);
  assert.match(active, /正在看重點朗讀/);
  assert.match(active, /正在設定讀書課程/);
  assert.match(active, /正在補讀書紀錄/);
  assert.match(active, /結果會回到下方待讀清單/);
});

test('study tool mode switching opens only one panel and updates active state', () => {
  const { sandbox, elements, triggers, calls } = buildStudyPanelHarness();
  sandbox.openStudyPlanPanel(true);
  assert.equal(elements['study-plan-panel'].classList.contains('on'), true);
  assert.equal(elements['study-record-panel'].classList.contains('on'), false);
  assert.equal(elements['study-playlist-panel'].classList.contains('on'), false);
  assert.equal(elements['study-mode-status'].classList.contains('is-closed'), false);
  assert.match(elements['study-mode-status'].innerHTML, /正在設定讀書課程/);
  assert.equal(triggers.find((el) => el.id === 'trigger-plan').attrs['aria-expanded'], 'true');
  assert.equal(elements['study-plan-start'].value, '2026-06-29');

  sandbox.openStudyRecordPanel(true);
  assert.equal(elements['study-plan-panel'].classList.contains('on'), false);
  assert.equal(elements['study-record-panel'].classList.contains('on'), true);
  assert.match(elements['study-mode-status'].innerHTML, /正在補讀書紀錄/);
  assert.equal(triggers.find((el) => el.id === 'trigger-record').attrs['aria-expanded'], 'true');

  sandbox.openStudyPlaylistPanel(true);
  assert.equal(elements['study-record-panel'].classList.contains('on'), false);
  assert.equal(elements['study-playlist-panel'].classList.contains('on'), true);
  assert.equal(calls.loadPlaylist, 1);
  assert.deepEqual(calls.focus.at(-1), ['study-playlist-playall', 'study-cockpit-recap']);

  sandbox.openStudyPlaylistPanel();
  assert.equal(elements['study-playlist-panel'].classList.contains('on'), false);
  assert.equal(elements['study-mode-status'].classList.contains('is-closed'), true);
  assert.equal(triggers.every((el) => el.attrs['aria-expanded'] === 'false'), true);
});

test('study today action buttons are sized for mobile app shells', () => {
  const studyActionButtonRule = active.match(/\.study-action-button\{[\s\S]*?\n  \}/)?.[0] || '';
  assert.match(active, /class="study-action-group primary"[\s\S]*<span class="study-action-label">先做<\/span>[\s\S]*開始選擇題[\s\S]*看今日複習[\s\S]*看弱點分析/);
  assert.match(active, /class="study-action-group secondary"[\s\S]*<span class="study-action-label">整理<\/span>[\s\S]*重點清單[\s\S]*設定讀書課程[\s\S]*補紀錄/);
  assert.match(active, /\.study-actions\{[\s\S]*display:grid/);
  assert.match(active, /\.study-action-group\.secondary \.study-action-link\{[\s\S]*background:rgba\(255,255,255,\.025\)/);
  assert.match(active, /\.study-action-link,\.study-pending\{[\s\S]*?min-height:44px/);
  assert.match(active, /\.study-action-link,\.study-pending\{[\s\S]*?font-family:var\(--serif\)/);
  assert.match(active, /\.study-action-link,\.study-pending\{[\s\S]*?font-size:15px/);
  assert.match(active, /\.study-action-link,\.study-pending\{[\s\S]*?letter-spacing:0/);
  assert.match(active, /\.study-action-link,\.study-pending\{[\s\S]*?line-height:1\.25/);
  assert.match(active, /\.study-action-link,\.study-pending\{[\s\S]*?box-sizing:border-box/);
  assert.match(active, /\.study-action-link,\.study-pending\{[\s\S]*?text-decoration:none/);
  assert.doesNotMatch(studyActionButtonRule, /font:inherit/);
  assert.match(active, /@media \(max-width:760px\)\{[\s\S]*?\.study-action-link,\.study-pending\{[\s\S]*?min-height:44px/);
  assert.match(active, /\.study-weak-brief-link\{[\s\S]*?min-height:36px/);
  assert.match(active, /\.study-weak-brief-head\{[\s\S]*?flex-wrap:wrap/);
});

test('study today exposes a time-first planning box before schedule details', () => {
  const recapStart = active.indexOf('id="study-cockpit-recap"');
  assert.ok(recapStart >= 0, 'study recap must exist');
  const recap = active.slice(recapStart, recapStart + 11000);
  const flowSteps = recap.indexOf('id="study-flow-steps"');
  const overview = recap.indexOf('id="study-planning-overview"');
  const timeBox = recap.indexOf('id="study-time-box"');
  const recommendPanel = recap.indexOf('id="study-recommend-panel"');
  const planPanel = recap.indexOf('id="study-plan-panel"');
  assert.ok(flowSteps > -1, 'study planning flow steps must exist');
  assert.ok(overview > -1, 'study planning overview must exist');
  assert.ok(timeBox > -1, 'time-first box must exist');
  assert.ok(recommendPanel > -1, 'recommendation panel must exist');
  assert.ok(planPanel > -1, 'private plan panel must exist');
  assert.ok(flowSteps < timeBox, 'flow steps should explain the workflow before controls');
  assert.ok(overview < timeBox, 'overview should explain current state before time controls');
  assert.ok(timeBox < recommendPanel, 'time settings should explain the recommendation before the recommendation appears');
  assert.ok(timeBox < planPanel, 'time guidance should appear before private schedule controls');
  assert.match(recap, /<div class="study-flow-steps" id="study-flow-steps" aria-label="讀書計畫三步驟"/);
  assert.match(recap, /<b>1\. 設時間<\/b>[\s\S]*決定總時數、每週可讀和今天要留多久/);
  assert.match(recap, /<b>2\. 預覽本週<\/b>[\s\S]*系統把弱點和私人課表排進空檔，不會自動寫入/);
  assert.match(recap, /<b>3\. 排入計畫<\/b>[\s\S]*按「排入本週計畫」後才同步帳號/);
  assert.match(recap, /<div class="study-planning-overview" id="study-planning-overview" aria-label="讀書計畫總覽"/);
  assert.match(recap, /id="study-overview-next"[\s\S]*先做一題或設定課程/);
  assert.match(recap, /id="study-overview-save"[\s\S]*只在這台裝置/);
  assert.match(recap, /id="study-overview-status"[\s\S]*待讀 0 \/ 完成 0/);
  assert.match(recap, /<div class="study-time-wrap" id="study-time-box"/);
  assert.match(recap, /id="study-time-summary"[\s\S]*500 小時目標/);
  assert.match(recap, /id="study-time-impact"[\s\S]*約 42 週/);
  assert.match(recap, /id="study-time-outcome"[\s\S]*還沒排課；先預覽本週排法或設定課程/);
  assert.match(recap, /class="study-time-summary-card"[\s\S]*讀書時間[\s\S]*修改時間/);
  assert.match(recap, /id="study-target-hours"[\s\S]*500/);
  assert.match(recap, /id="study-weekly-hours"[\s\S]*每週可讀/);
  assert.match(recap, /建議總時數可以改/);
  assert.match(active, /summary\.textContent = totalHours \+ ' 小時目標/);
  assert.match(active, /impact\.textContent = weeks \? \('約 ' \+ weeks \+ ' 週'\) : '先填時間'/);
  assert.match(active, /時間設定只先存在本機/);
  assert.match(active, /排入本週計畫/);
  assert.match(active, /\.study-flow-steps\{[\s\S]*display:grid/);
  assert.match(active, /\.study-planning-overview\{[\s\S]*display:grid/);
  assert.match(active, /function renderStudyPlanningOverview/);
  assert.match(active, /\.study-flow-step b\{[\s\S]*font-family:var\(--serif\)/);
  assert.match(active, /@media\s*\(max-width:760px\)\{[\s\S]*\.study-flow-steps\{grid-template-columns:1fr\}/);
  assert.match(active, /@media\s*\(max-width:760px\)\{[\s\S]*\.study-planning-overview\{grid-template-columns:1fr\}/);
  assert.doesNotMatch(active, /\/api\/me\/study\/settings/);
});

test('study planning overview explains next item save scope and completion status', () => {
  const fn = extractFunction(active, 'renderStudyPlanningOverview');
  assert.match(fn, /study-overview-next/);
  assert.match(fn, /study-overview-save/);
  assert.match(fn, /study-overview-status/);
  assert.match(fn, /localStorage\.getItem\('sofa_token'\)/);
  assert.match(fn, /localStorage\.getItem\('sofa_uid'\)/);
  assert.match(fn, /已接序號，會同步到帳號/);
  assert.match(fn, /只在這台裝置/);
  assert.match(fn, /按「完成這堂」才算完成/);
  assert.match(fn, /補紀錄不會改答題正確率/);
  assert.match(extractFunction(active, 'renderStudyPlanItems'), /renderStudyPlanningOverview\(items\)/);
  assert.match(extractFunction(active, 'renderStudyCloudState'), /renderStudyPlanningOverview\(window\.__studyPlanItemCache \|\| \[\]\)/);
});

test('study time settings stay collapsed into a readable summary until editing', () => {
  const recapStart = active.indexOf('id="study-cockpit-recap"');
  assert.ok(recapStart >= 0, 'study recap must exist');
  const recap = active.slice(recapStart, recapStart + 8200);
  assert.match(recap, /class="study-time-summary-card"/);
  assert.match(recap, /id="study-time-purpose"[\s\S]*先設定時間，按「預覽本週排法」看建議/);
  assert.match(recap, /id="study-time-edit-panel" hidden/);
  assert.match(recap, /aria-expanded="false"[\s\S]*onclick="toggleStudyTimeEditor\(\)"[\s\S]*修改時間/);
  assert.match(active, /function toggleStudyTimeEditor/);
  assert.match(active, /panel\.hidden = !panel\.hidden/);
  assert.match(active, /button\.setAttribute\('aria-expanded', panel\.hidden \? 'false' : 'true'\)/);
  assert.doesNotMatch(recap, /<details class="study-time-wrap"/);
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
  assert.match(active, /可以直接貼課表文字/);
  assert.match(active, /例如：7\/3 19:00 會計學第 4 堂/);
  assert.doesNotMatch(active, /placeholder="可貼 JSON/);
  assert.doesNotMatch(active, /搜尋法條|自動查法條|對應法條/);
});

test('study planning has one visible map that explains where each result lands', () => {
  const recapStart = active.indexOf('id="study-cockpit-recap"');
  assert.ok(recapStart >= 0, 'study recap must exist');
  const recap = active.slice(recapStart, recapStart + 16000);
  const mapIndex = recap.indexOf('id="study-plan-map"');
  const cloudIndex = recap.indexOf('id="study-cloud-state"');
  const listIndex = recap.indexOf('id="study-plan-items"');
  assert.ok(mapIndex > -1, 'study plan map must exist');
  assert.ok(cloudIndex > -1, 'cloud state must exist');
  assert.ok(listIndex > -1, 'plan item list must exist');
  assert.ok(mapIndex < cloudIndex, 'map should explain state before cloud copy');
  assert.ok(mapIndex < listIndex, 'map should appear before the private plan list');
  assert.match(recap, /aria-label="讀書計畫狀態地圖"/);
  assert.match(recap, /時間設定/);
  assert.match(recap, /本週建議/);
  assert.match(recap, /私人計畫/);
  assert.match(active, /function renderStudyPlanMap/);
  assert.match(active, /預覽不會自動寫入/);
  assert.match(active, /下方就是同一份清單/);
  assert.match(active, /\.study-plan-map\{[\s\S]*display:grid/);
  assert.match(active, /@media\s*\(max-width:760px\)\{[\s\S]*\.study-plan-map\{grid-template-columns:1fr\}/);
});

test('study today renders personal plan items returned by the study API', () => {
  assert.match(active, /personal_plan/);
  assert.match(active, /id="study-cloud-state"/);
  assert.match(active, /id="study-plan-items"/);
  assert.match(active, /renderStudyPlanItems/);
  assert.match(active, /待讀清單/);
  assert.doesNotMatch(active, /<h3>接下來的私人計畫<\/h3>/);
});

test('study today explains cloud save status in learner words', () => {
  assert.match(active, /function renderStudyCloudState/);
  assert.match(active, /雲端計畫已接上/);
  assert.match(active, /雲端同步準備中/);
  assert.match(active, /先存在這台裝置/);
  assert.match(active, /personal_plan[\s\S]*status/);
  assert.doesNotMatch(active, /schema pending|schema_pending[^'"]*$/);
});

test('study cloud state names the connected private schedule source and visible item count', () => {
  const fn = extractFunction(active, 'renderStudyCloudState');
  assert.match(fn, /remotePlan\.items/);
  assert.match(fn, /cloudItems\.length/);
  assert.match(fn, /source_label/);
  assert.match(fn, /已接上' \+ cloudItems\.length \+ ' 筆/);
  assert.match(fn, /來源：/);
});

test('study today shows the next private plan near the first action area', () => {
  const recapStart = active.indexOf('id="study-cockpit-recap"');
  assert.ok(recapStart >= 0, 'study recap must exist');
  const recap = active.slice(recapStart, recapStart + 8000);
  assert.match(recap, /id="study-next-plan"/);
  assert.match(recap, /今天讀什麼/);
  assert.match(active, /function renderStudyNextPlan/);
  assert.match(extractFunction(active, 'renderStudyPlanItems'), /renderStudyNextPlan\(items\)/);
  assert.match(extractFunction(active, 'saveStudyTimeSettings'), /renderStudyNextPlan\(window\.__studyPlanItemCache \|\| \[\]\)/);
  const nextFn = extractFunction(active, 'renderStudyNextPlan');
  assert.match(nextFn, /_actionableStudyItems/);
  assert.match(nextFn, /下一堂/);
  assert.match(nextFn, /今天留/);
  assert.match(nextFn, /讀完直接按「完成這堂」/);
  assert.doesNotMatch(nextFn, /完成後到讀書計畫點完成/);
  assert.match(nextFn, /href="#study-plan-items"/);
});

test('study next plan card can mark the next item complete without hunting the list', () => {
  const nextFn = extractFunction(active, 'renderStudyNextPlan');
  assert.match(nextFn, /_studyItemKey\(next\)/);
  assert.match(nextFn, /data-next-study-key/);
  assert.match(nextFn, /completeStudyItem\(/);
  assert.match(nextFn, /完成這堂/);
  assert.match(nextFn, /aria-label="完成這堂讀書計畫"/);
});

test('study today uses learner-facing subject status wording, not seed jargon', () => {
  assert.match(active, /可單刷/);
  assert.match(active, /題庫準備中/);
  assert.match(active, /科目狀態/);
  assert.doesNotMatch(active, /待 seed/);
});

test('study today links weak laws and topic blocks into single-practice entry points', () => {
  const weakFn = extractFunction(active, 'renderStudyWeakBrief');
  assert.match(weakFn, /quiz\.html\?law=/);
  assert.match(weakFn, /&drill=1/);
  assert.doesNotMatch(weakFn, /quiz\.html\?open=weakness&law=/);
  assert.match(weakFn, /單刷/);

  const renderStart = active.indexOf('function renderStudyToday');
  const render = active.slice(renderStart, renderStart + 5200);
  assert.match(render, /<a class="study-block" href="quiz\.html\?law=/);
  assert.match(render, /可單刷/);
  assert.match(render, /study-subject-summary/);
});

test('study plan items show explicit status text for completion tracking', () => {
  const fn = extractFunction(active, 'renderStudyPlanItems');
  assert.doesNotMatch(fn, /狀態：/);
  assert.match(active, /接下來/);
  assert.match(active, /完成、改期或取消都會保留紀錄/);
  assert.match(active, /已完成/);
  assert.match(active, /改期/);
});

test('study plan items expose learning actions only when item metadata supports them', () => {
  assert.match(active, /function studyPlanItemActionLinks/);
  const helper = extractFunction(active, 'studyPlanItemActionLinks');
  assert.match(helper, /target_url/);
  assert.match(helper, /https\?:/);
  assert.match(helper, /quiz\.html\?law=/);
  assert.match(helper, /law-preview\.html\?law=/);
  assert.match(helper, /law-preview\.html\?id=/);
  assert.doesNotMatch(helper, /dashboard\.html\?q=/);
  assert.doesNotMatch(helper, /dashboard\.html\?open=/);
  assert.match(helper, /開啟資源/);
  assert.match(helper, /單刷/);
  assert.match(helper, /看法條/);
  assert.match(extractFunction(active, 'renderStudyPlanItems'), /studyPlanItemActionLinks\(item\)/);
  assert.match(extractFunction(active, 'renderStudyNextPlan'), /studyPlanItemActionLinks\(next, true\)/);
  assert.doesNotMatch(helper, /搜尋法條/);
});

test('study today puts next-step actions before lower-priority subject detail', () => {
  const recapStart = active.indexOf('id="study-cockpit-recap"');
  assert.ok(recapStart >= 0, 'study recap must exist');
  const recap = active.slice(recapStart, recapStart + 15000);
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

test('study suggestion cards use learner-facing labels instead of internal codes', () => {
  assert.match(active, /function _studySuggestionLabel/);
  assert.match(active, /if\(key === 'WEAK'\) return '弱點'/);
  assert.match(active, /if\(key === 'TIME'\) return '時間'/);
  assert.match(active, /_studySuggestionLabel\(item\.label \|\| 'NEXT'\)/);
  assert.doesNotMatch(active, />PLAN RECOMMEND</);
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
  assert.match(active, /<a href="#study-cockpit-recap" data-spy-target="study-cockpit-recap"><span class="num">T1<\/span>今天先做/);
  assert.match(active, /<a href="#study-weak-brief" data-spy-target="study-weak-brief"><span class="num">T2<\/span>今日弱點/);
  assert.match(active, /<a href="#study-time-box" data-spy-target="study-time-box"><span class="num">T3<\/span>讀書時間/);
  assert.match(active, /<a href="#study-plan-items" data-spy-target="study-plan-items"><span class="num">T4<\/span>讀書計畫/);
  assert.match(active, /<a href="#quiz-recap" data-spy-target="quiz-recap"><span class="num">T5<\/span>最近作答/);
  assert.match(active, /<a href="#weak-laws-recap" data-spy-target="weak-laws-recap"><span class="num">T6<\/span>弱點法規/);
  assert.match(active, /<a href="#review-due" data-spy-target="review-due"><span class="num">T7<\/span>今日複習/);
  assert.match(active, /<a href="#srs-settings" data-spy-target="srs-settings"><span class="num">T8<\/span>複習策略/);
  assert.match(active, /<a href="quiz\.html"><span class="num">練<\/span>選擇題/);
  assert.match(active, /<a href="quiz\.html\?open=weakness"><span class="num">補<\/span>弱點分析/);
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
  assert.match(active, /function renderStudyTimeOutcome/);
  assert.match(active, /已套用到本週建議；還沒寫進帳號/);
  assert.match(active, /預覽不會寫入，排入後才進你的私人讀書計畫/);
  assert.match(active, /預覽本週排法/);
  assert.match(active, /排入本週計畫/);
  assert.match(active, /下一筆：/);
  assert.match(active, /完成紀錄/);
});

test('manual study records are enabled without changing answer accuracy', () => {
  assert.match(active, /id="study-record-date"/);
  assert.match(active, /id="study-record-minutes"/);
  assert.match(active, /onclick="saveStudyRecordLocal\(\)"/);
  assert.match(active, /function saveStudyRecordLocal/);
  assert.match(active, /status: 'done'/);
  assert.match(active, /答題正確率不會被補紀錄改動/);
  assert.match(active, /function _completedStudyItems/);
  assert.match(active, /最近完成 \/ 補紀錄/);
  assert.match(active, /study-plan-item-done/);
  assert.doesNotMatch(active, /disabled>儲存準備中/);
});

test('manual study records sync to hours API before local fallback', () => {
  const fn = extractFunction(active, 'saveStudyRecordLocal');
  assert.match(fn, /await _fetchStudyJSON/);
  assert.match(fn, /sofa_token/);
  assert.match(fn, /sofa_uid/);
  assert.match(fn, /\/api\/me\/study\/hours/);
  assert.match(fn, /body: JSON\.stringify\(\{ track_key:'bookkeeper', log_date:date, minutes:minutes, note:note/);
  assert.match(fn, /已同步到你的讀書時數/);
  assert.match(fn, /已先存在本機/);
  assert.doesNotMatch(fn, /correct_count|wrong_count|answer_source|quiz_sessions/);
});

test('mobile study plan and record forms do not squeeze native inputs', () => {
  assert.match(active, /\.study-plan-field\{[\s\S]*min-width:0/);
  assert.match(active, /\.study-action-link,\s*\.study-pending\{[\s\S]*font-size:13px/);
  assert.match(active, /@media\s*\(max-width:760px\)\{[\s\S]*\.study-action-group\{[\s\S]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(active, /@media\s*\(max-width:760px\)\{[\s\S]*\.study-action-link,\s*\.study-pending\{[\s\S]*width:100%;[\s\S]*min-height:44px/);
  assert.doesNotMatch(active, /@media\s*\(max-height:720px\)\{[\s\S]*\.study-next-plan\{display:none\}/);
  assert.match(active, /@media\s*\(max-height:720px\)\{[\s\S]*\.study-next-plan\{[\s\S]*min-height:44px/);
  assert.match(active, /@media\s*\(max-width:760px\)\{[\s\S]*\.study-plan-grid\{grid-template-columns:1fr\}/);
  assert.match(active, /@media\s*\(max-width:760px\)\{[\s\S]*\.study-plan-field input,\s*\.study-plan-field select\{[\s\S]*min-height:44px/);
  assert.match(active, /@media\s*\(max-width:760px\)\{[\s\S]*\.study-plan-row\{align-items:stretch\}/);
  assert.match(active, /@media\s*\(max-width:760px\)\{[\s\S]*\.study-plan-save\{[\s\S]*width:100%/);
});

test('series planning can generate local weekly items before API sync', () => {
  assert.match(active, /function _studySeriesItems/);
  assert.match(active, /_nextWeekdayOnOrAfter/);
  assert.match(active, /i \* 7/);
  assert.match(active, /if\(!uid && !token\)\{[\s\S]*_addLocalStudyItems\(localItems\)/);
});

test('saved study plans show an immediate readable summary and focus the plan list', () => {
  assert.match(active, /class="study-plan-count"/);
  assert.match(active, /接下來<\/b>：' \+ actionable\.length \+ ' 筆/);
  assert.match(active, /下一筆：<b>/);
  assert.match(active, /function _studyStatusLabel/);
  assert.match(active, /已完成/);
  assert.match(active, /待讀/);
  assert.match(active, /function _studyStatusClass/);
  assert.match(active, /status-planned/);
  assert.match(active, /完成、改期或取消都會保留紀錄/);
  assert.match(active, /function focusStudyPlanItems/);
  assert.match(active, /scrollIntoView\(\{ block:'nearest', behavior:'smooth' \}\)/);
  assert.match(active, /_addLocalStudyItems[\s\S]*focusStudyPlanItems\(\)/);
  assert.match(active, /saveStudyRecordLocal[\s\S]*focusStudyPlanItems\(\)/);
});

test('empty study plans point back to the single setup entry instead of duplicating buttons', () => {
  const fn = extractFunction(active, 'renderStudyPlanItems');
  assert.doesNotMatch(fn, /el\.innerHTML = ''/);
  assert.match(fn, /目前還沒有私人讀書計畫/);
  assert.doesNotMatch(fn, /onclick="openStudyPlanPanel\(\)"/);
  assert.match(fn, /設定讀書課程/);
  assert.match(fn, /回上方「整理」點設定讀書課程/);
});

test('local study plan items can be completed postponed or cancelled from the list', () => {
  assert.match(active, /function _studyItemKey/);
  assert.match(active, /function _findStudyPlanItem/);
  assert.match(active, /async function updateStudyItemStatus/);
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

test('remote study plan actions persist status before falling back locally', () => {
  assert.match(active, /window\.__studyPlanItemCache = items/);
  assert.match(active, /if\(item && item\.id && \(token \|\| uid\)\)/);
  assert.match(active, /\/api\/me\/study\/plan-item\/' \+ encodeURIComponent\(item\.id\) \+ '\/status/);
  assert.match(active, /body: JSON\.stringify\(\{ status:status \}\)/);
  assert.match(active, /\/api\/me\/study\/plan-item\/' \+ encodeURIComponent\(item\.id\) \+ '\/reschedule/);
  assert.match(active, /renderStudyToday\(latest \|\| null\)/);
  assert.match(active, /updateLocalStudyItemStatus\(key, status, shiftDays\)/);
});

test('remote study plan action failures keep the item visible with a clear message', () => {
  assert.match(active, /function setStudyPlanActionMessage/);
  assert.match(active, /同步失敗，這筆雲端計畫還沒改動/);
  assert.match(active, /fallbackItems = latest && latest\.personal_plan \? latest\.personal_plan : \{ items: window\.__studyPlanItemCache \|\| \[\] \}/);
  assert.match(active, /renderStudyPlanItems\(_mergeStudyPlan\(fallbackItems\)\)/);
  assert.match(active, /class="study-plan-count warn"/);
  assert.match(active, /throw new Error\('reschedule failed'\)/);
  assert.match(active, /throw new Error\('status failed'\)/);
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

test('study today can recommend a private weekly plan without shipping personal schedules', () => {
  assert.match(active, /id="study-recommend-panel"/);
  assert.match(active, /本週建議排法/);
  assert.match(active, /預覽本週排法/);
  assert.match(active, /排入本週計畫/);
  assert.match(active, /function buildStudyWeekRecommendation/);
  assert.match(active, /function _studyFallbackTopicBlocks/);
  assert.match(active, /function _studySlotIsFree/);
  assert.match(active, /function _studyNextAvailableSlot/);
  assert.match(active, /所得稅法核心條文整理/);
  assert.match(active, /營業稅法稅額與申報節點/);
  assert.match(active, /商業會計法責任與帳簿/);
  assert.match(active, /function previewStudyWeekRecommendation/);
  assert.match(active, /function saveStudyRecommendedWeek/);
  assert.match(active, /_addLocalStudyItems\(items\)/);
  assert.match(active, /remainingMinutes/);
  assert.match(active, /weak_law_bridge/);
  assert.match(active, /question_signal/);
  assert.match(active, /source_label:'自排建議'/);
  assert.doesNotMatch(active, /記帳士 115記帳士台北N1|115\/03\/02|補習班台北N1/);
});

test('saving recommended week syncs to the study API before local fallback', () => {
  const fn = extractFunction(active, 'saveStudyRecommendedWeek');
  assert.match(fn, /sofa_token/);
  assert.match(fn, /sofa_uid/);
  assert.match(fn, /\/api\/me\/study\/plan-items\/bulk/);
  assert.match(fn, /body: JSON\.stringify\(\{ items:items,[\s\S]*source_label:'自排建議'/);
  assert.match(fn, /Array\.isArray\(res\.items\) \? res\.items : items/);
  assert.match(fn, /_addLocalStudyItems\(Array\.isArray\(res\.items\) \? res\.items : items\)/);
  assert.match(fn, /catch/);
  assert.match(fn, /已先存在本機/);
});

test('study recommendation save messages replace instead of stacking stale sync states', () => {
  assert.match(active, /function setStudyRecommendMessage/);
  const helper = extractFunction(active, 'setStudyRecommendMessage');
  assert.match(helper, /data-study-recommend-message/);
  assert.match(helper, /old\.remove\(\)/);
  const fn = extractFunction(active, 'saveStudyRecommendedWeek');
  assert.match(fn, /setStudyRecommendMessage\('正在同步到你的讀書計畫/);
  assert.match(fn, /setStudyRecommendMessage\('已同步/);
  assert.doesNotMatch(fn, /insertAdjacentHTML\('afterbegin', '<div class="study-plan-count">正在同步/);
});

test('study weekly recommendation avoids already occupied private plan slots', () => {
  const harness = buildRecommendationHarness();
  const existing = [{ scheduled_date:'2026-06-27', scheduled_time:'20:00', minutes:60 }];
  assert.equal(harness._studySlotIsFree('2026-06-27', '20:00', 60, existing), false);
  const slot = harness._studyNextAvailableSlot(0, 60, existing, []);
  assert.ok(slot, 'must find another open slot this week');
  assert.notDeepEqual(slot, { date:'2026-06-27', time:'20:00' });
});

test('study plan next actions ignore completed cancelled and stale items', () => {
  assert.match(active, /function _isStudyItemActionable/);
  assert.match(active, /function _actionableStudyItems/);
  assert.match(active, /status === 'done' \|\| status === 'cancelled' \|\| status === 'skipped'/);
  assert.match(active, /scheduled_date < _todayInputValue\(\)/);
  assert.match(active, /var actionable = _actionableStudyItems\(items\)/);
  assert.match(active, /var next = actionable\[0\] \|\| \{\}/);
  assert.match(active, /var items = _actionableStudyItems\(mergedPlan && Array\.isArray\(mergedPlan\.items\) \? mergedPlan\.items : \[\]\)/);
});

test('study planning reconnects local progress after serial login', () => {
  assert.match(active, /STUDY_AFTER_LOGIN_SYNC_KEY\s*=\s*'sofa\.study\.afterLoginSync\.v1'/);
  assert.match(active, /STUDY_AFTER_LOGIN_SYNC_DONE_KEY\s*=\s*'sofa\.study\.afterLoginSyncDone\.v1'/);
  assert.match(active, /function trySyncLocalStudyAfterLogin/);
  assert.match(active, /本機讀書計畫已接回這個序號/);
  assert.match(active, /排課項目會嘗試同步/);
  assert.match(active, /補紀錄會在下次儲存時同步讀書時數/);
  assert.match(active, /\/api\/me\/study\/plan-items\/bulk/);
  assert.match(active, /after_login_local_handoff/);
  assert.match(active, /_actionableStudyItems\(local\.items \|\| \[\]\)/);
  assert.match(active, /localStorage\.removeItem\(STUDY_AFTER_LOGIN_SYNC_KEY\)/);
  assert.match(active, /renderStudyCloudState[\s\S]*trySyncLocalStudyAfterLogin\(\)/);
});
