import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../practice.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name} must exist`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  assert.fail(`${name} must close`);
}

test('practice session summary uses SoFa brand classes instead of bright inline styling', () => {
  const start = active.indexOf('id="session-summary"');
  const end = active.indexOf('id="practice-share-btn"', start);
  assert.ok(start >= 0 && end > start, 'session summary overlay must exist');
  const summary = active.slice(start, end);

  assert.match(summary, /class="ss-eyebrow"/);
  assert.match(summary, /class="ss-time-label"/);
  assert.match(summary, /class="ss-grid"/);
  assert.match(summary, /class="ss-metric"/);
  assert.match(summary, /class="ss-primary"/);
  assert.match(summary, /class="ss-secondary"/);
  assert.doesNotMatch(summary, /#5BAFD6/);
  assert.doesNotMatch(summary, /📊|📤|⏱/);
});

test('practice sections render empty fallback instead of a blank analysis card', () => {
  assert.match(active, /function renderPracticeSections/);
  assert.match(active, /這條暫時沒有解析/);
  assert.match(active, /renderPracticeSections\(sp,\s*articleSections,\s*articlePlan!=='free',\s*articleRecord\)/);
  assert.doesNotMatch(active, /sp\.innerHTML='<div class="sec-hd">條文解析<\/div>';\s*sp\.style\.display='block';\s*buildSections\(articleSections,articlePlan!=='free',sp\)/);
});

test('practice page avoids legacy cyan and emoji-first stats controls', () => {
  assert.doesNotMatch(active, /#5BAFD6|91,175,214|#2a4a7f/);
  assert.doesNotMatch(active, /📊|📤|⏱|🔁/);
});

test('practice session summary overlays floating practice tools', () => {
  assert.match(active, /#session-summary\{[\s\S]*?z-index:300/);
  assert.match(active, /\.practice-float-btn\{[\s\S]*?z-index:200/);
});

test('practice session summary counters are wired to rendered metric ids', () => {
  const summaryStart = active.indexOf('id="session-summary"');
  const summaryEnd = active.indexOf('id="practice-share-btn"', summaryStart);
  const summary = active.slice(summaryStart, summaryEnd);
  assert.match(summary, /id="ss-complete"/);
  assert.match(summary, /id="ss-attempt"/);

  const fnStart = active.indexOf('function showSessionSummary');
  const fnEnd = active.indexOf('function ensureSessionTimer', fnStart);
  const fn = active.slice(fnStart, fnEnd);
  assert.match(fn, /getElementById\('ss-complete'\)\.textContent\s*=\s*_articlesCompleted/);
  assert.match(fn, /getElementById\('ss-attempt'\)\.textContent\s*=\s*_articlesAttempted/);
  assert.doesNotMatch(active, /ss-completed/);
});

test('practice mobile share control avoids the top bar and timer corner', () => {
  assert.match(active, /@media \(max-width:760px\)\{[\s\S]*?#practice-share-btn\{top:auto;right:auto;bottom:58px;left:14px\}/);
  assert.match(active, /@media \(max-width:760px\)\{[\s\S]*?#session-timer,#practice-stats-btn\{display:none\}/);
});

test('practice analysis linkifies cross-law references inside the article reader', () => {
  const start = active.indexOf('function cleanCrossRefLawName');
  const end = active.indexOf('function formatSection', start);
  assert.ok(start >= 0 && end > start, 'law reference helper must be extractable before formatSection');
  const helpers = vm.runInNewContext(`${active.slice(start, end)};({linkifyLawRefs,cleanCrossRefLawName})`);

  const linkedSameLaw = helpers.linkifyLawRefs('同法第13條、本法第15條', '記帳士法');
  assert.match(linkedSameLaw, /law-preview\.html\?law=%E8%A8%98%E5%B8%B3%E5%A3%AB%E6%B3%95&art=13/);
  assert.match(linkedSameLaw, /law-preview\.html\?law=%E8%A8%98%E5%B8%B3%E5%A3%AB%E6%B3%95&art=15/);
  assert.match(linkedSameLaw, /&from=practice&back=practice\.html/);

  const linkedNamedLaw = helpers.linkifyLawRefs('搭配公司法第29條經理人任免規定', '商業會計法');
  assert.match(linkedNamedLaw, />公司法第29條</);
  assert.match(linkedNamedLaw, /law-preview\.html\?law=%E5%85%AC%E5%8F%B8%E6%B3%95&art=29/);
  assert.match(linkedNamedLaw, /&from=practice&back=practice\.html/);
  assert.doesNotMatch(linkedNamedLaw, />搭配公司法第29條</);
  assert.equal(helpers.cleanCrossRefLawName('搭配公司法'), '公司法');
  const linkedReadableLead = helpers.linkifyLawRefs('交叉記憶可看公司法第29條', '商業會計法');
  assert.match(linkedReadableLead, /law-preview\.html\?law=%E5%85%AC%E5%8F%B8%E6%B3%95&art=29/);
  assert.match(linkedReadableLead, />公司法第29條</);
  assert.doesNotMatch(linkedReadableLead, /law=.*%E4%BA%A4%E5%8F%89/);
  assert.equal(helpers.cleanCrossRefLawName('交叉記憶可看公司法'), '公司法');
  assert.doesNotMatch(linkedNamedLaw, /target="_blank"/);
  assert.match(active, /formatSection\(sections\[name\],\s*articleLawName\)/);
});
