import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const pricing = readFileSync(new URL('../pricing.html', import.meta.url), 'utf8');
const checkout = readFileSync(new URL('../checkout.html', import.meta.url), 'utf8');
const homepage = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const examTargets = readFileSync(new URL('../exam-targets.js', import.meta.url), 'utf8');
const examPlanContract = JSON.parse(readFileSync(new URL('../exam-plan-contract.json', import.meta.url), 'utf8'));

test('homepage does not advertise one fixed bookkeeper exam-day date', () => {
  assert.doesNotMatch(homepage, /2026\/11\/30|11\/30/);
  assert.match(homepage, /完整答題紀錄、弱點分析、錯題重練一路保留到考後緩衝日/);
  assert.match(homepage, /不用每月續買，也不用考前重整理/);
  assert.equal((homepage.match(/依考試目標用到考後緩衝日/g) || []).length, 0);
  assert.equal((homepage.match(/依你的考試目標用到考後緩衝日/g) || []).length, 0);
  assert.equal((homepage.match(/依考試目標計算期限/g) || []).length, 0);
});

test('checkout defaults generic entries to monthly and preserves explicit exam-day intent', () => {
  assert.match(checkout, /POST https:\/\/sofa-engine-api\.onrender\.com\/api\/checkout|const API_URL = "https:\/\/sofa-engine-api\.onrender\.com\/api\/checkout"/);
  assert.match(checkout, /class="plan selected" data-plan="月費" data-amount="380"/);
  assert.doesNotMatch(checkout, /class="plan selected" data-plan="到考日"/);
  assert.match(checkout, /if \(!rawPlanParam && safeExamKeyParam\)/);
  assert.match(checkout, /examDayTarget\.classList\.add\("selected"\)/);
  assert.doesNotMatch(checkout, /一次付清,用到 2026\/11\/30\(考後\)/);
  assert.match(checkout, /<script src="exam-targets\.js\?v=20260714-registration-window"><\/script>/);
  assert.match(examTargets, /const TARGETS = \{/);
  assert.match(examTargets, /DEFAULT_EXAM_DAY_REGISTRATION_LEAD_LABEL = '報名前一個月'/);
  assert.doesNotMatch(examTargets, /DEFAULT_EXAM_DAY_SALE_OPEN_DAYS = 180/);
  for (const key of ['bookkeeper', 'landadmin', 'realestate', 'tax-admin', 'tax-law', 'elem-admin', 'post-acc']) {
    assert.match(examTargets, new RegExp(`${key}:|["']${key}["']:`));
  }
  for (const [key, date] of [
    ['bookkeeper', '2026-11-14T00:00:00+08:00'],
    ['realestate', '2026-11-14T00:00:00+08:00'],
  ]) {
    const targetBlock = new RegExp(`key:\\s*'${key}'[\\s\\S]*?examDate:\\s*'${date.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`);
    assert.match(examTargets, targetBlock);
    assert.match(examTargets, new RegExp(`key:\\s*'${key}'[\\s\\S]*?registrationStart:\\s*'2026-08-04T00:00:00\\+08:00'`));
    assert.match(examTargets, new RegExp(`key:\\s*'${key}'[\\s\\S]*?registrationDisplay:\\s*'2026 / 08 / 04'`));
    assert.match(examTargets, new RegExp(`key:\\s*'${key}'[\\s\\S]*?saleOpenDate:\\s*'2026-07-04T00:00:00\\+08:00'`));
  }
  for (const key of ['landadmin', 'tax-admin', 'tax-law', 'elem-admin', 'post-acc']) {
    const block = new RegExp(`key:\\s*'${key}'[\\s\\S]*?(?=\\n    [a-z'"]|\\n  \\};)`);
    const match = examTargets.match(block);
    assert.ok(match, `${key} target exists`);
    assert.doesNotMatch(match[0], /examDate:\s*'2026-(01|06|07)-/);
    assert.match(match[0], /examDisplay:\s*'下一期未公告'/);
  }
  assert.match(checkout, /NT\$1280 是到考日方案固定價/);
  assert.match(checkout, /報名前一個月內/);
  assert.doesNotMatch(checkout, /考前 180 天內/);
  assert.match(checkout, /只顯示目前可購買且 LINE 端已支援的考科/);
  assert.match(checkout, /id="ck-exam-target"/);
  assert.match(checkout, /function getCheckoutPurchasableTargets\(\)/);
  assert.match(checkout, /\.filter\(\(\{ state \}\) => state && state\.canBuy\)/);
  assert.doesNotMatch(checkout, /const disabled = state && !state\.canBuy \? ' disabled' : ''/);
  assert.doesNotMatch(checkout, /<option value="\$\{key\}"\$\{disabled\}>/);
  assert.match(checkout, /window\.SoFaExamTargets/);
  assert.match(checkout, /function getCheckoutExamKey\(\)/);
  assert.match(checkout, /if \(examTargetEl\) return examTargetEl\.value \|\| ""/);
  assert.match(checkout, /function getExplicitCheckoutExamKey\(\)/);
  assert.match(checkout, /function isCheckoutExamTargetConfigured\(\)/);
  assert.match(checkout, /function updateExamTargetHint\(\)/);
  assert.match(checkout, /function checkoutExamTargetStateLabel\(state\)/);
  assert.match(checkout, /checkout_exam_target_unavailable/);
  assert.match(checkout, /exam_key: getCheckoutExamKey\(\)/);
  assert.match(checkout, /依你選的考試目標計算/);
  assert.match(checkout, /到考日不會預設成記帳士/);
  assert.doesNotMatch(checkout, /const EXAM = new Date\('2026-11-14T00:00:00\+08:00'\)/);
  assert.match(checkout, /"到考日": "到考日方案 · 讀到考試日"/);
  assert.match(checkout, /const examKey = getCheckoutExamKey\(\)/);
  assert.match(checkout, /body: JSON\.stringify\(\{ plan: sel\.plan, email, exam_key: examKey \}\)/);
});

test('GX-DROPDOWN checkout only renders open and LINE-supported exam targets', () => {
  const sandbox = { window: {}, URLSearchParams };
  sandbox.window.location = { search: '' };
  sandbox.window.localStorage = { getItem: () => '', setItem: () => {} };
  sandbox.localStorage = sandbox.window.localStorage;
  vm.runInNewContext(examTargets, sandbox);
  const api = sandbox.window.SoFaExamTargets;
  const purchasable = Object.keys(api.TARGETS).filter((key) => api.examDayPlanState(api.TARGETS[key], '2026-07-15T00:00:00+08:00').canBuy);

  assert.deepEqual(purchasable, ['bookkeeper', 'realestate']);
  assert.match(checkout, /const available = getCheckoutPurchasableTargets\(\)/);
  assert.match(checkout, /examTargetEl\.innerHTML = `<option value="">請先選你的考試目標<\/option>\$\{options\}`/);
  assert.doesNotMatch(checkout, /暫不販售<\/option>/);
});

test('exam-day plan opens from the registration window, not the exam countdown', () => {
  const sandbox = { window: {}, URLSearchParams };
  sandbox.window.location = { search: '' };
  sandbox.window.localStorage = { getItem: () => '', setItem: () => {} };
  sandbox.localStorage = sandbox.window.localStorage;
  vm.runInNewContext(examTargets, sandbox);
  const api = sandbox.window.SoFaExamTargets;
  const bookkeeper = api.TARGETS.bookkeeper;

  assert.equal(api.examDayPlanState(bookkeeper, '2026-07-03T00:00:00+08:00').canBuy, false);
  assert.equal(api.examDayPlanState(bookkeeper, '2026-07-04T00:00:00+08:00').canBuy, true);
  assert.equal(api.examDayPlanState(bookkeeper, '2026-07-14T00:00:00+08:00').canBuy, true);
  assert.match(api.examDayPlanState(bookkeeper, '2026-07-14T00:00:00+08:00').reason, /報名前一個月/);
});

test('CXA keeps elem-admin explicitly disabled until LINE bot supports the paid service', () => {
  assert.match(examTargets, /'elem-admin': \{/);
  assert.match(examTargets, /purchaseStatus:\s*'disabled'/);
  assert.match(examTargets, /LINE 推播尚未支援完整服務/);
  assert.match(checkout, /if\(state\.state === "purchase_disabled"\) return "暫不販售"/);

  const sandbox = { window: {}, URLSearchParams };
  sandbox.window.location = { search: '' };
  sandbox.window.localStorage = { getItem: () => '', setItem: () => {} };
  sandbox.localStorage = sandbox.window.localStorage;
  vm.runInNewContext(examTargets, sandbox);
  const api = sandbox.window.SoFaExamTargets;
  const elemAdmin = api.TARGETS['elem-admin'];
  const state = api.examDayPlanState(elemAdmin, '2026-07-14T00:00:00+08:00');

  assert.equal(state.state, 'purchase_disabled');
  assert.equal(state.canBuy, false);
  assert.match(state.reason, /LINE 推播尚未支援完整服務/);
});

test('CXB frontend exam and plan contract stays aligned with canonical JSON', () => {
  const sandbox = { window: {}, URLSearchParams };
  sandbox.window.location = { search: '' };
  sandbox.window.localStorage = { getItem: () => '', setItem: () => {} };
  sandbox.localStorage = sandbox.window.localStorage;
  vm.runInNewContext(examTargets, sandbox);
  const api = sandbox.window.SoFaExamTargets;

  assert.deepEqual(Object.keys(api.TARGETS), examPlanContract.exam_keys);
  assert.deepEqual(examPlanContract.plans.map((plan) => plan.name), ['月費', '季費', '到考日', '買斷']);
  assert.deepEqual(examPlanContract.plans.map((plan) => plan.amount_env), [
    'ECPAY_AMT_MONTHLY',
    'ECPAY_AMT_QUARTERLY',
    'ECPAY_AMT_EXAM',
    'ECPAY_AMT_BUYOUT',
  ]);

  for (const key of examPlanContract.exam_keys) {
    const expected = examPlanContract.exams[key];
    const actual = api.TARGETS[key];
    assert.equal(actual.label, expected.label, `${key} label`);
    if (expected.exam_date) assert.equal(actual.examDate.slice(0, 10), expected.exam_date, `${key} exam_date`);
    if (expected.registration_start) assert.equal(actual.registrationStart.slice(0, 10), expected.registration_start, `${key} registration_start`);
    if (expected.sale_open_date) assert.equal(actual.saleOpenDate.slice(0, 10), expected.sale_open_date, `${key} sale_open_date`);
    assert.equal(actual.lineBotSupported, expected.line_bot_supported, `${key} line_bot_supported`);
    if (expected.purchase_status === 'disabled') assert.equal(actual.purchaseStatus, 'disabled', `${key} disabled`);
  }
});

test('CXB checkout sanitizes stored exam_key before sending payment payloads', () => {
  assert.match(checkout, /function sanitizeCheckoutExamKey\(key, options\)/);
  assert.match(checkout, /sanitizeCheckoutExamKey\(fromQuery, \{ allowDisabled: false \}\)/);
  assert.match(checkout, /sanitizeCheckoutExamKey\(stored, \{ allowDisabled: false \}\)/);
  assert.match(checkout, /const examKey = getCheckoutExamKey\(\)/);
  assert.match(checkout, /body: JSON\.stringify\(\{ plan: sel\.plan, email, exam_key: examKey \}\)/);
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
