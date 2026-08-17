import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const checkout = readFileSync(new URL('../checkout.html', import.meta.url), 'utf8');

test('checkout forwards signed LINE identity token from URL to payment API', () => {
  assert.match(checkout, /const lineIdentity = \(new URLSearchParams\(location\.search\)\.get\("line_identity"\) \|\| ""\)\.trim\(\)/);
  assert.match(checkout, /JSON\.stringify\(\{ plan: sel\.plan, email, exam_key: examKey, line_identity: lineIdentity \}\)/);
});
