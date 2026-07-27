import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pricing = readFileSync(new URL('../pricing.html', import.meta.url), 'utf8');

test('pricing carries the learner exam context into every checkout link', () => {
  assert.match(pricing, /function carryExamContextToCheckoutLinks\(\)/);
  assert.match(pricing, /localStorage\.getItem\("sofa_exam_target"\)/);
  assert.match(pricing, /localStorage\.getItem\("sofa\.target"\)/);
  assert.match(pricing, /url\.searchParams\.set\("exam_key", examKey\)/);
  assert.match(pricing, /querySelectorAll\('a\[href\*="checkout\.html"\]'\)/);
});
