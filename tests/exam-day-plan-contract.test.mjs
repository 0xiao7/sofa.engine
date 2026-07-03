import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pricing = readFileSync(new URL('../pricing.html', import.meta.url), 'utf8');
const checkout = readFileSync(new URL('../checkout.html', import.meta.url), 'utf8');

test('checkout defaults to the exam-day plan with the backend contract unchanged', () => {
  assert.match(checkout, /POST https:\/\/sofa-engine-api\.onrender\.com\/api\/checkout|const API_URL = "https:\/\/sofa-engine-api\.onrender\.com\/api\/checkout"/);
  assert.match(checkout, /class="plan selected" data-plan="到考日" data-amount="1280"/);
  assert.match(checkout, /一次付清,用到 2026\/11\/30\(考後\)/);
  assert.match(checkout, /"到考日": "到考日 · 用到考上"/);
  assert.match(checkout, /body: JSON\.stringify\(\{ plan: sel\.plan, email \}\)/);
});

test('pricing presents exam-day as the featured plan and keeps monthly as the low-cost entry', () => {
  assert.match(pricing, /data-plan="到考日"/);
  assert.match(pricing, /href="\/checkout\.html\?plan=到考日"/);
  assert.match(pricing, /NT\$\s*1280/);
  assert.match(pricing, /一次付清,用到 2026\/11\/30\(考後\)/);
  assert.match(pricing, /class="plan-card featured"[\s\S]*到考日/);
  assert.match(pricing, /href="\/checkout\.html\?plan=月費"/);
  assert.match(pricing, /data-plan="月費"/);
});
