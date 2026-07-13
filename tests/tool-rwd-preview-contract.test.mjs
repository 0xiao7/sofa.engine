import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

const practicePages = ['quiz.html', 'fill.html', 'practice.html'];

test('practice tools allow local preview from localhost, 127.0.0.1, ::1, and file URLs', () => {
  for (const file of practicePages) {
    const html = read(file);
    assert.match(html, /function\s+isPreviewHost\s*\(\)\s*\{/);
    assert.match(html, /location\.hostname\s*===\s*'localhost'/);
    assert.match(html, /location\.hostname\s*===\s*'127\.0\.0\.1'/);
    assert.match(html, /location\.hostname\s*===\s*'::1'/);
    assert.match(html, /location\.protocol\s*===\s*'file:'/);
    if (file === 'quiz.html') {
      assert.match(html, /\(isPreviewHost\(\)\s*&&\s*!freeParam\)\s*\?\s*'PREVIEW'\s*:\s*null/);
    } else {
      assert.match(html, /isPreviewHost\(\)\s*\?\s*'PREVIEW'\s*:\s*null/);
    }
  }
});

test('practice tools pin the global topbar while the drill body scrolls', () => {
  for (const file of practicePages) {
    const html = read(file);
    assert.match(html, /\.topbar\{[\s\S]*position:fixed;top:0;left:0;right:0;z-index:80/);
    assert.match(html, /body\{[\s\S]*padding-top:var\(--tool-topbar-offset\)/);
  }
});

test('checkout mobile brand strip stays visible instead of scrolling away', () => {
  const html = read('checkout.html');
  assert.match(html, /\.ck-mb-brand\{[\s\S]*position:fixed;top:0;left:0;right:0;z-index:80/);
  assert.match(html, /@media \(max-width:780px\)\{[\s\S]*\.ck\{[\s\S]*padding-top:64px/);
});

test('checkout mobile shows email and payment before the long plan list', () => {
  const html = read('checkout.html');
  assert.match(html, /@media \(max-width:780px\)\{[\s\S]*\.checkout-action-column\{[\s\S]*order:1/);
  assert.match(html, /@media \(max-width:780px\)\{[\s\S]*\.checkout-options-column\{[\s\S]*order:2/);
  assert.match(html, /@media \(max-width:780px\)\{[\s\S]*\.sticky-pay\{[\s\S]*position:fixed;left:0;right:0;bottom:0/);
  assert.match(html, /<div class="checkout-action-column">[\s\S]*id="ck-exam-target-section"[\s\S]*class="email-card"[\s\S]*id="ck-email-input"[\s\S]*class="sticky-pay"[\s\S]*id="ck-submit"/);
  assert.ok(html.indexOf('id="ck-exam-target-section"') < html.indexOf('id="ck-email-input"'));
  assert.ok(html.indexOf('id="ck-email-input"') < html.indexOf('id="ck-submit"'));
});
