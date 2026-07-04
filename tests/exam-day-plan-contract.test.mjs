import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pricing = readFileSync(new URL('../pricing.html', import.meta.url), 'utf8');
const checkout = readFileSync(new URL('../checkout.html', import.meta.url), 'utf8');
const homepage = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('homepage does not advertise one fixed bookkeeper exam-day date', () => {
  assert.doesNotMatch(homepage, /2026\/11\/30|11\/30/);
  assert.match(homepage, /依考試目標用到考後緩衝日/);
  assert.match(homepage, /依你的考試目標用到考後緩衝日/);
  assert.match(homepage, /依考試目標計算期限/);
});

test('checkout defaults to the exam-day plan and keeps required checkout fields', () => {
  assert.match(checkout, /POST https:\/\/sofa-engine-api\.onrender\.com\/api\/checkout|const API_URL = "https:\/\/sofa-engine-api\.onrender\.com\/api\/checkout"/);
  assert.match(checkout, /class="plan selected" data-plan="到考日" data-amount="1280"/);
  assert.doesNotMatch(checkout, /一次付清,用到 2026\/11\/30\(考後\)/);
  assert.match(checkout, /EXAM_TARGETS/);
  for (const key of ['bookkeeper', 'landadmin', 'realestate', 'tax-admin', 'tax-law', 'elem-admin', 'post-acc']) {
    assert.match(checkout, new RegExp(`${key}:|["']${key}["']:`));
    assert.match(checkout, new RegExp(`<option value="${key}"`));
  }
  assert.match(checkout, /id="ck-exam-target"/);
  assert.match(checkout, /function selectedExamKey\(\)/);
  assert.match(checkout, /function currentExamKey\(\)/);
  assert.match(checkout, /exam_key: currentExamKey\(\)/);
  assert.match(checkout, /依你選的考試目標計算/);
  assert.match(checkout, /到考日方案會依這裡的考試目標計算，不共用記帳士日期/);
  assert.match(checkout, /"到考日": examDayPlanText/);
  assert.match(checkout, /const checkoutPayload = \{/);
  assert.match(checkout, /plan: sel\.plan/);
  assert.match(checkout, /email,/);
  assert.match(checkout, /body: JSON\.stringify\(checkoutPayload\)/);
});

test('pricing presents exam-day as the featured plan and keeps monthly as the low-cost entry', () => {
  assert.match(pricing, /data-plan="到考日"/);
  assert.match(pricing, /href="\/checkout\.html\?plan=到考日&utm_source=pricing&utm_medium=plan_card&utm_campaign=pricing_exam_day"/);
  assert.match(pricing, /NT\$\s*1280/);
  assert.doesNotMatch(pricing, /一次付清,用到 2026\/11\/30\(考後\)/);
  assert.match(pricing, /依你設定的考試目標用到考後緩衝日/);
  assert.match(pricing, /class="plan-card featured"[\s\S]*到考日/);
  assert.match(pricing, /href="\/checkout\.html\?plan=月費&utm_source=pricing&utm_medium=plan_card&utm_campaign=pricing_monthly"/);
  assert.match(pricing, /data-plan="月費"/);
});
