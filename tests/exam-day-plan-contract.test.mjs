import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pricing = readFileSync(new URL('../pricing.html', import.meta.url), 'utf8');
const checkout = readFileSync(new URL('../checkout.html', import.meta.url), 'utf8');
const homepage = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const examTargets = readFileSync(new URL('../exam-targets.js', import.meta.url), 'utf8');

test('homepage does not advertise one fixed bookkeeper exam-day date', () => {
  assert.doesNotMatch(homepage, /2026\/11\/30|11\/30/);
  assert.match(homepage, /完整答題紀錄、弱點分析、錯題重練一路保留到考後緩衝日/);
  assert.match(homepage, /不用每月續買，也不用考前重整理/);
  assert.equal((homepage.match(/依考試目標用到考後緩衝日/g) || []).length, 0);
  assert.equal((homepage.match(/依你的考試目標用到考後緩衝日/g) || []).length, 0);
  assert.equal((homepage.match(/依考試目標計算期限/g) || []).length, 0);
});

test('checkout defaults to the exam-day plan and keeps required checkout fields', () => {
  assert.match(checkout, /POST https:\/\/sofa-engine-api\.onrender\.com\/api\/checkout|const API_URL = "https:\/\/sofa-engine-api\.onrender\.com\/api\/checkout"/);
  assert.match(checkout, /class="plan selected" data-plan="到考日" data-amount="1280"/);
  assert.doesNotMatch(checkout, /一次付清,用到 2026\/11\/30\(考後\)/);
  assert.match(checkout, /<script src="exam-targets\.js\?v=20260713-exam-dates"><\/script>/);
  assert.match(examTargets, /const TARGETS = \{/);
  assert.match(examTargets, /DEFAULT_EXAM_DAY_SALE_OPEN_DAYS = 180/);
  for (const key of ['bookkeeper', 'landadmin', 'realestate', 'tax-admin', 'tax-law', 'elem-admin', 'post-acc']) {
    assert.match(examTargets, new RegExp(`${key}:|["']${key}["']:`));
  }
  for (const [key, date] of [
    ['bookkeeper', '2026-11-14T00:00:00+08:00'],
    ['landadmin', '2026-06-06T00:00:00+08:00'],
    ['realestate', '2026-11-14T00:00:00+08:00'],
    ['tax-admin', '2026-07-03T00:00:00+08:00'],
    ['tax-law', '2026-07-05T00:00:00+08:00'],
    ['elem-admin', '2026-01-10T00:00:00+08:00'],
    ['post-acc', '2026-07-19T00:00:00+08:00'],
  ]) {
    const targetBlock = new RegExp(`key:\\s*'${key}'[\\s\\S]*?examDate:\\s*'${date.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`);
    assert.match(examTargets, targetBlock);
  }
  assert.match(checkout, /NT\$1280 是到考日方案固定價/);
  assert.match(checkout, /考前 180 天內/);
  assert.match(checkout, /id="ck-exam-target"/);
  assert.match(checkout, /Object\.keys\(targets\)\.map\(\(key\) => \{/);
  assert.match(checkout, /<option value="\$\{key\}">/);
  assert.match(checkout, /window\.SoFaExamTargets/);
  assert.match(checkout, /function getCheckoutExamKey\(\)/);
  assert.match(checkout, /function getExplicitCheckoutExamKey\(\)/);
  assert.match(checkout, /function isCheckoutExamTargetConfigured\(\)/);
  assert.match(checkout, /function updateExamTargetHint\(\)/);
  assert.match(checkout, /checkout_exam_target_unavailable/);
  assert.match(checkout, /exam_key: getCheckoutExamKey\(\)/);
  assert.match(checkout, /依你選的考試目標計算/);
  assert.match(checkout, /到考日不會預設成記帳士/);
  assert.doesNotMatch(checkout, /const EXAM = new Date\('2026-11-14T00:00:00\+08:00'\)/);
  assert.match(checkout, /"到考日": "到考日方案 · 讀到考試日"/);
  assert.match(checkout, /body: JSON\.stringify\(\{ plan: sel\.plan, email, exam_key: getCheckoutExamKey\(\) \}\)/);
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
