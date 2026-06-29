import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../quiz.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');

function extractFunction(name) {
  const start = active.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  let depth = 0;
  let seenBrace = false;
  for (let i = start; i < active.length; i += 1) {
    if (active[i] === '{') {
      depth += 1;
      seenBrace = true;
    } else if (active[i] === '}') {
      depth -= 1;
      if (seenBrace && depth === 0) return active.slice(start, i + 1);
    }
  }
  throw new Error(`Could not extract ${name}`);
}

test('stats overlay owns the iOS safe area instead of leaving a white strip', () => {
  assert.match(active, /\.stats-panel\{[\s\S]*padding:calc\(24px \+ env\(safe-area-inset-top, 0px\)\)/);
  assert.match(active, /\.stats-panel\{[\s\S]*background:#040D14/);
  assert.match(active, /\.stats-panel\{[\s\S]*height:100dvh/);
  assert.match(active, /\.stats-panel\{[\s\S]*overscroll-behavior:contain/);
  assert.match(active, /html\.stats-open, html\.stats-open body\{[\s\S]*overflow:hidden/);
  assert.doesNotMatch(active, /\.stats-panel\{[\s\S]*background:rgba\(4,13,20,0\.97\)/);
  assert.match(extractFunction('openStats'), /document\.documentElement\.classList\.add\('stats-open'\)/);
  assert.match(extractFunction('closeStats'), /document\.documentElement\.classList\.remove\('stats-open'\)/);
});

test('stats overlay controls keep app-sized tap targets', () => {
  assert.match(active, /\.stats-close\{[\s\S]*width:44px/);
  assert.match(active, /\.stats-close\{[\s\S]*height:44px/);
  assert.match(active, /\.stats-close\{[\s\S]*display:inline-flex/);
  assert.match(active, /\.stats-tabs button\{[\s\S]*min-height:44px/);
});

test('stats summary uses harmonized SoFa card classes instead of bright inline metric colors', () => {
  const fn = extractFunction('_renderStatsContent');
  assert.match(fn, /quiz-stat-grid/);
  assert.match(fn, /quiz-stat-card/);
  assert.match(fn, /quiz-stat-value/);
  assert.doesNotMatch(fn, /color:var\(--warn\)/);
  assert.doesNotMatch(fn, /#9FB89F/);
});

test('stats average time uses a readable empty state instead of placeholder seconds', () => {
  const fn = extractFunction('_renderStatsContent');
  assert.match(fn, /const avgSec = \(s\.timedQuestions\|\|0\) > 0/);
  assert.match(fn, /: '尚無'/);
  assert.match(fn, /\$\{avgSec\}/);
  assert.doesNotMatch(fn, /\$\{avgSec\}s/);
  assert.doesNotMatch(fn, /: '--'/);
});

test('law distribution progress bars use brand tone classes', () => {
  const fn = extractFunction('_renderStatsContent');
  assert.match(fn, /quiz-law-stat/);
  assert.match(fn, /quiz-law-bar-fill/);
  assert.match(fn, /_statsToneClass\(p\)/);
  assert.doesNotMatch(fn, /background:\$\{p>=80\?'#9FB89F'/);
});

test('empty local quiz calendar says there is no recent record', () => {
  const fn = extractFunction('_buildQuizCalendar');
  assert.match(fn, /const hasActivity = days\.some\(d => d\.count > 0\)/);
  assert.match(fn, /quiz-calendar-empty/);
  assert.match(fn, /尚無近 30 日作答紀錄/);
  assert.match(fn, /答過一題後，這裡會顯示每天的熱度/);
});
