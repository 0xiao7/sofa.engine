import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../practice.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');

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
  assert.match(active, /renderPracticeSections\(sp,\s*articleSections,\s*articlePlan!=='free'\)/);
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

test('practice mobile share control avoids the top bar and timer corner', () => {
  assert.match(active, /@media \(max-width:760px\)\{[\s\S]*?#practice-share-btn\{top:auto;right:auto;bottom:58px;left:14px\}/);
});
