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
  assert.match(extractFunction('openStats'), /document\.documentElement\.classList\.add\('stats-open'\)/);
  assert.match(extractFunction('closeStats'), /document\.documentElement\.classList\.remove\('stats-open'\)/);
});

test('stats summary uses harmonized SoFa card classes instead of bright inline metric colors', () => {
  const fn = extractFunction('openStats');
  assert.match(fn, /quiz-stat-grid/);
  assert.match(fn, /quiz-stat-card/);
  assert.match(fn, /quiz-stat-value/);
  assert.doesNotMatch(fn, /color:var\(--warn\)/);
  assert.doesNotMatch(fn, /#9FB89F/);
});

test('law distribution progress bars use brand tone classes', () => {
  const fn = extractFunction('openStats');
  assert.match(fn, /quiz-law-stat/);
  assert.match(fn, /quiz-law-bar-fill/);
  assert.match(fn, /_statsToneClass\(p\)/);
  assert.doesNotMatch(fn, /background:\$\{p>=80\?'#9FB89F'/);
});
