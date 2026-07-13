import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const exportScript = readFileSync(new URL('../cards/export-cards.py', import.meta.url), 'utf8');

test('push settings LINE card has the same generated hero asset family as account status', () => {
  assert.ok(existsSync(new URL('../cards/push-settings.png', import.meta.url)));
  assert.match(exportScript, /"push-settings\.png"/);
  assert.match(exportScript, /"SOFA ENGINE \/ PUSH"/);
  assert.match(exportScript, /"推播設定"/);
});
