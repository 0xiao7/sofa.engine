import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../SOURCE_OF_TRUTH.md', import.meta.url), 'utf8');

test('source of truth names the live frontend boundary', () => {
  assert.match(source, /sofa\.engine/);
  assert.match(source, /GitHub Pages/);
  assert.match(source, /sofaengine\.org/);
  assert.match(source, /不處理金流/);
  assert.match(source, /sofa-engine-api/);
  assert.match(source, /fay-spectrum-bot/);
});
