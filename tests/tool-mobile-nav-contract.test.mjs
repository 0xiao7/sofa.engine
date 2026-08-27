import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pages = ['quiz.html', 'fill.html', 'practice.html'];
const sources = Object.fromEntries(pages.map((file) => [
  file,
  readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'),
]));
const css = readFileSync(new URL('../sofa.css', import.meta.url), 'utf8');

test('tool pages mobile hamburger toggles the existing top navigation', () => {
  for (const [file, html] of Object.entries(sources)) {
    assert.match(html, /<nav class="top-mid">[\s\S]*會員中心[\s\S]*打字[\s\S]*填空[\s\S]*選擇題/);
    assert.match(html, /<button class="menu-btn" aria-label="開啟導覽" aria-expanded="false" onclick="[^"]*mobile-nav-open[^"]*aria-expanded/);
  }
});

test('shared mobile nav styles expose the hidden top-mid menu', () => {
  assert.match(css, /body\.mobile-nav-open \.top-mid\{[\s\S]*display:flex/);
  assert.match(css, /body\.mobile-nav-open \.top-mid\{[\s\S]*position:absolute/);
  assert.match(css, /\.menu-btn\[aria-expanded="true"\]/);
});

test('shared topbar reserves the iPad status bar safe area at tablet widths', () => {
  const topbarStart = css.indexOf('.topbar{');
  const firstResponsiveRule = css.indexOf('@media', topbarStart);
  assert.ok(topbarStart >= 0 && firstResponsiveRule > topbarStart, 'base topbar rule must precede responsive overrides');
  const baseTopbar = css.slice(topbarStart, firstResponsiveRule);
  assert.match(baseTopbar, /padding:calc\(18px \+ env\(safe-area-inset-top, 0px\)\) 40px 18px/);
});
