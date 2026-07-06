import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->/g, '');

test('practice filter chips are large enough for mobile touch', () => {
  const html = read('practice.html');
  assert.match(html, /@media \(max-width:760px\)\{[\s\S]*\.pr-chip\{min-height:34px;padding:7px 12px\}/);
});

test('dashboard search and pager buttons keep at least 44px tap height', () => {
  const html = read('dashboard.html');
  assert.match(html, /id="search-btn"[^>]*min-height:44px/);
  assert.match(html, /var btnS = 'min-height:44px;display:inline-flex;align-items:center;justify-content:center/);
  assert.match(html, /var disS = 'min-height:44px;display:inline-flex;align-items:center;justify-content:center/);
  assert.match(html, /var btnStyle = 'min-height:44px;display:inline-flex;align-items:center;justify-content:center/);
  assert.match(html, /var disStyle = 'min-height:44px;display:inline-flex;align-items:center;justify-content:center/);
});

test('compass add-certificate button is not a tiny target on mobile', () => {
  const css = read('compass-widget.css');
  assert.match(css, /\.planner-plus \{[\s\S]*width: 44px;[\s\S]*height: 44px;/);
  assert.match(css, /@media \(max-width: 768px\) \{[\s\S]*\.planner-plus \{ width: 44px; height: 44px; font-size: 16px; \}/);
});
