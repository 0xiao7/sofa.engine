import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->/g, '');

test('practice tool filter chips are large enough for mobile touch', () => {
  for (const file of ['practice.html', 'quiz.html', 'fill.html']) {
    const html = read(file);
    assert.match(html, /\.pr-bar :is\(a,button,select,input\)\{min-height:44px\}/);
    assert.match(html, /\.pr-chip\{min-height:44px;display:inline-flex;align-items:center;justify-content:center;padding:0 14px/);
    assert.match(html, /@media \(max-width:760px\)\{[\s\S]*\.pr-chip\{min-height:44px;padding:0 14px/);
  }
});

test('shared tool nav controls keep 44px touch targets', () => {
  const css = read('sofa.css');
  assert.match(css, /\.top-mid a\{[^}]*min-height:44px[^}]*display:inline-flex[^}]*align-items:center/);
  assert.match(css, /\.btn-out\{[^}]*min-height:44px[^}]*display:inline-flex[^}]*align-items:center/);
  assert.match(css, /\.menu-btn\{display:none;width:44px;height:44px/);
  assert.match(css, /\.chip\{[^}]*min-height:44px[^}]*display:inline-flex[^}]*align-items:center/);
});

test('pricing and public entry CTA buttons are touch sized', () => {
  const pricing = read('pricing.html');
  assert.match(pricing, /\.topbar-cta\{[^}]*min-height:44px[^}]*display:inline-flex[^}]*align-items:center/);
  assert.match(pricing, /\.btn-main\{[^}]*min-height:44px[^}]*display:inline-flex[^}]*align-items:center/);
  assert.match(pricing, /\.btn-ghost\{[^}]*min-height:44px[^}]*display:inline-flex[^}]*align-items:center/);

  const free = read('free.html');
  assert.match(free, /\.nav-cta \{[^}]*min-height:44px[^}]*display:inline-flex[^}]*align-items:center/);
  assert.match(free, /\.btn-primary \{[^}]*min-height:44px[^}]*display:inline-flex[^}]*align-items:center/);
  assert.match(free, /\.btn-ghost \{[^}]*min-height:44px[^}]*display:inline-flex[^}]*align-items:center/);

  const blogMap = read('blog/bookkeeper-past-exam-law-map.html');
  assert.match(blogMap, /\.topbar-logo\{[^}]*min-height:44px[^}]*display:inline-flex[^}]*align-items:center/);
  assert.match(blogMap, /\.topbar-cta\{[^}]*min-height:44px[^}]*display:inline-flex[^}]*align-items:center/);
});

test('law preview list controls and sticky CTA are touch sized', () => {
  const html = read('law-preview.html');
  assert.match(html, /\.back-link\{[^}]*min-height:44px[^}]*display:inline-flex[^}]*align-items:center/);
  assert.match(html, /\.sort-btn\{[^}]*min-height:44px[^}]*display:inline-flex[^}]*align-items:center/);
  assert.match(html, /\.list-item\{[^}]*min-height:44px[^}]*display:flex/);
  assert.match(html, /\.cta-btn\{[^}]*min-height:44px[^}]*display:inline-flex[^}]*align-items:center/);
});

test('dashboard high-frequency action buttons are touch sized', () => {
  const html = read('dashboard.html');
  assert.match(html, /\.menu-btn\{[^}]*width:44px;height:44px/);
  assert.match(html, /#bk-toggle \{[\s\S]*min-width:44px;min-height:44px/);
  assert.match(html, /\.free-retention-btn\{[\s\S]*min-height:44px/);
  assert.match(html, /body\.free-retention-on \.shell\{[\s\S]*margin-top:calc\(var\(--topbar-offset\) \+ var\(--free-retention-offset\)\)/);
  assert.match(html, /\.side-mode-btn\{[^}]*min-height:28px/);
  assert.match(html, /\.study-plan-actions a,[\s\S]*?\.study-plan-actions button\{[\s\S]*?min-height:44px/);
  assert.match(html, /\.toc-action\{[^}]*min-height:44px[^}]*display:inline-flex[^}]*align-items:center/);
  assert.match(html, /@media \(max-width:760px\)\{[\s\S]*\.toc-action\{font-size:12px;min-height:44px;padding:0 12px\}/);
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
