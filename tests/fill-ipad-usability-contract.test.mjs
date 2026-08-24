import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../fill.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');

test('fill explicitly permits iPad pinch zoom', () => {
  assert.match(
    active,
    /<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" \/>/,
  );
  assert.match(active, /html,body\{[^}]*touch-action:pan-x pan-y pinch-zoom/);
});

test('fill result content cannot widen the grid or push the right rail off screen', () => {
  assert.match(active, /\.inner\{[^}]*grid-template-columns:minmax\(0,1fr\) 300px/);
  assert.match(active, /\.fill-main\{[^}]*min-width:0/);
  assert.match(active, /\.fill-card\{[^}]*word-break:normal[^}]*overflow-wrap:anywhere/s);
  assert.match(active, /className='answer-correction'/);
  assert.match(active, /\.answer-correction\{[^}]*overflow-wrap:anywhere/);
});

test('fill shows an in-context next question action after submit and clears it on reset', () => {
  assert.match(active, /id="btnNextInline"[^>]*>\u4e0b\u4e00\u984c<\/button>/);
  const checkStart = active.indexOf('function checkAnswers');
  const checkEnd = active.indexOf('function loadNew', checkStart);
  const checkAnswers = active.slice(checkStart, checkEnd);
  assert.match(checkAnswers, /getElementById\('btnNextInline'\)\.style\.display='inline-flex'/);
  assert.match(active, /getElementById\('btnNextInline'\)\.addEventListener\('click',loadNew\)/);
  assert.match(active, /getElementById\('btnNextInline'\)\.style\.display='none'/);
});

test('right rail remains visible as a usable stacked region on iPad widths', () => {
  assert.match(active, /@media \(max-width:1180px\)\{[\s\S]*?\.inner\{grid-template-columns:1fr\}/);
  assert.match(active, /@media \(max-width:1180px\)\{[\s\S]*?\.rail\{[^}]*position:static[^}]*display:grid[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
