import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const analytics = readFileSync(new URL('../sofa-analytics.js', import.meta.url), 'utf8');

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
