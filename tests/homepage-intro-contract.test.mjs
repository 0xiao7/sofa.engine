import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('homepage adds one dismissible intro without replacing the existing hero', () => {
  assert.match(html, /class="entry-intro"/);
  assert.match(html, /今天，先做<[^>]*>一題。/);
  assert.match(html, /Strategic · Organized · Focused · Academy/);
  assert.match(html, /class="hero-inner"/);
  assert.match(html, /id="faq"/);
});

test('intro routes to the current free quiz and pricing paths', () => {
  assert.match(html, /quiz\.html\?free=1&amp;start=1&amp;session=1&amp;count=5/);
  assert.match(html, /pricing\.html\?utm_source=homepage&amp;utm_medium=hero/);
});

test('intro supports scroll keyboard touch and reduced motion dismissal', () => {
  assert.match(html, /prefers-reduced-motion:\s*reduce/);
  assert.match(html, /addEventListener\('wheel'/);
  assert.match(html, /addEventListener\('touchstart'/);
  assert.match(html, /ArrowDown/);
  assert.match(html, /dismissEntryIntro/);
});
