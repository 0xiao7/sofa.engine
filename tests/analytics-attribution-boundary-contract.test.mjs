import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const analytics = readFileSync(new URL('../sofa-analytics.js', import.meta.url), 'utf8');
const htmlFiles = ['analysis-preview.html','analysis.html','checkout.html','dashboard.html','fill.html','free.html','index.html','login.html','practice.html','pricing.html','quiz.html'];

test('external campaign attribution is stored but not copied onto study navigation URLs', () => {
  const carry = analytics.match(/const CARRY_PATHS = new Set\(\[([\s\S]*?)\]\);/)?.[1] || '';
  assert.match(carry, /'\/pricing\.html'/);
  assert.match(carry, /'\/checkout\.html'/);
  assert.match(carry, /'\/login\.html'/);
  assert.doesNotMatch(carry, /'\/quiz\.html'/);
  assert.doesNotMatch(carry, /'\/dashboard\.html'/);
  assert.doesNotMatch(carry, /'\/fill\.html'/);
  assert.doesNotMatch(carry, /'\/practice\.html'/);
});

test('pages request the current analytics bundle so the attribution fix is not masked by cache', () => {
  assert.match(analytics, /TRACKING_VERSION = '20260802-attribution-v2'/);
  htmlFiles.forEach(file => {
    const html = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.match(html, /sofa-analytics\.js\?v=20260802-attribution-v2/, file);
  });
});
