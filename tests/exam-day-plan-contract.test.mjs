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

test('checkout defaults to the exam-day plan and keeps required checkout fields', () => {
  assert.match(checkout, /POST https:\/\/sofa-engine-api\.onrender\.com\/api\/checkout|const API_URL = "https:\/\/sofa-engine-api\.onrender\.com\/api\/checkout"/);
  assert.match(checkout, /class="plan selected" data-plan="到考日" data-amount="1280"/);
  assert.doesNotMatch(checkout, /一次付清,用到 2026\/11\/30\(考後\)/);
  assert.match(checkout, /<script src="exam-targets\.js\?v=20260908-canonical-catalog"><\/script>/);
  assert.match(examTargets, /const TARGETS = \{/);
  assert.match(examTargets, /DEFAULT_EXAM_DAY_REGISTRATION_LEAD_LABEL = '報名截止日前一個月'/);
  assert.doesNotMatch(examTargets, /DEFAULT_EXAM_DAY_SALE_OPEN_DAYS = 180/);
  for (const key of ['bookkeeper', 'landadmin', 'real_estate_broker', 'tax-admin', 'tax-law', 'elem-admin', 'post-acc']) {
    assert.match(examTargets, new RegExp(`${key}:|["']${key}["']:`));
  }
  for (const [key, date] of [
    ['bookkeeper', '2026-11-14T00:00:00+08:00'],
    ['real_estate_broker', '2026-11-14T00:00:00+08:00'],
  ]) {
    const targetBlock = new RegExp(`key:\\s*'${key}'[\\s\\S]*?examDate:\\s*'${date.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`);
    assert.match(examTargets, targetBlock);
    assert.match(examTargets, new RegExp(`key:\\s*'${key}'[\\s\\S]*?capabilityId:\\s*'${key === 'bookkeeper' ? 'n72' : 'n83'}'`));
    assert.match(examTargets, new RegExp(`key:\\s*'${key}'[\\s\\S]*?registrationStart:\\s*'2026-08-04T00:00:00\\+08:00'`));
    assert.match(examTargets, new RegExp(`key:\\s*'${key}'[\\s\\S]*?registrationDisplay:\\s*'2026 / 08 / 04–08 / 13'`));
    assert.match(examTargets, new RegExp(`key:\\s*'${key}'[\\s\\S]*?eventId:\\s*'115180'`));
    assert.match(examTargets, new RegExp(`key:\\s*'${key}'[\\s\\S]*?saleOpenDate:\\s*'2026-07-13T00:00:00\\+08:00'`));
    assert.match(examTargets, new RegExp(`key:\\s*'${key}'[\\s\\S]*?saleCloseDate:\\s*'2026-08-13T23:59:59\\.999\\+08:00'`));
  }
  for (const key of ['landadmin', 'tax-admin', 'tax-law', 'elem-admin', 'post-acc']) {
    if (key === 'elem-admin') assert.match(examTargets, /'elem-admin': Object\.assign\(unverified\('elem-admin'/);
    else assert.match(examTargets, new RegExp(`unverified\\('${key}'`));
  }
  assert.doesNotMatch(examTargets, /examDate:\s*'2026-(01|06|07)-/);
  assert.match(checkout, /NT\$1280 是到考日方案固定價/);
  assert.match(checkout, /報名截止日前一個月起，至報名截止日止/);
  assert.match(checkout, /id="ck-exam-lock-notice"/);
  assert.match(checkout, /付款前請確認：NT\$1280 到考日方案付款後會鎖定所選考科至方案期限，期間不可更換/);
  assert.match(checkout, /id="ck-sum-lock"/);
  assert.match(checkout, /id="ck-compact-lock"/);
  assert.match(checkout, /付款後將鎖定「\$\{capability\?\.name \|\| target\.label[^}]*\}」至方案期限，期間不可更換考科/);
  assert.match(checkout, /examLockNoticeEl\.hidden = !examMode/);
  assert.match(checkout, /sumLock\.hidden = !examMode/);
  assert.match(checkout, /compactLock\.hidden = !examMode/);
  assert.match(checkout, /付款前請確認：付款後將鎖定「\$\{capability\?\.name \|\| target\.label[^}]*\}」至方案期限，期間不可更換/);
  assert.doesNotMatch(checkout, /考前 180 天內/);
  assert.match(checkout, /<script src="exam-data\.js\?v=20260924-exam-day-picker"><\/script>/);
  assert.match(checkout, /id="ck-exam-target-picker"/);
  assert.match(checkout, /id="ck-exam-target-search"/);
  assert.match(checkout, /id="ck-exam-target-results"/);
  assert.match(checkout, /id="ck-selected-exam"/);
  assert.match(checkout, /id="ck-change-exam"/);
  assert.doesNotMatch(checkout, /<select[^>]+id="ck-exam-target"/);
  assert.doesNotMatch(checkout, /function getCheckoutPurchasableTargets\(\)/);
  assert.doesNotMatch(checkout, /請先選你的考試目標<\/option>/);
  assert.match(checkout, /window\.SoFaExamTargets/);
  assert.match(checkout, /function getCheckoutExamKey\(\)/);
  assert.match(checkout, /let checkoutExamKey = ""/);
  assert.match(checkout, /function getExplicitCheckoutExamKey\(\)/);
  assert.match(checkout, /function isCheckoutExamTargetConfigured\(\)/);
  assert.match(checkout, /function updateExamTargetHint\(\)/);
  assert.match(checkout, /checkout_exam_target_unavailable/);
  assert.match(checkout, /exam_key: getCheckoutExamKey\(\)/);
  assert.match(checkout, /id="ck-exam-lock-notice"/);
  assert.match(checkout, /id="ck-sum-lock"/);
  assert.match(checkout, /付款前請確認：NT\$1280 到考日方案付款後會鎖定所選考科至方案期限，期間不可更換/);
  assert.match(checkout, /capability_id: targetIdentity\.capabilityId/);
  assert.match(checkout, /event_id: targetIdentity\.eventId/);
  assert.match(checkout, /track_id: targetIdentity\.trackId/);
  assert.match(checkout, /catalog_revision: targetIdentity\.catalogRevision/);
  assert.match(checkout, /依你選的考試目標計算/);
  assert.match(checkout, /到考日不會預設成記帳士/);
  assert.doesNotMatch(checkout, /const EXAM = new Date\('2026-11-14T00:00:00\+08:00'\)/);
  assert.match(checkout, /"到考日": "到考日方案 · 讀到考試日"/);
  assert.match(checkout, /const examKey = getCheckoutExamKey\(\)/);
  assert.match(checkout, /exam_key: apiExamKey/);
  assert.match(checkout, /line_identity: lineIdentity/);
});

test('checkout uses the 172-capability picker and keeps purchase eligibility separate', () => {
  const sandbox = { window: {}, URLSearchParams };
  sandbox.window.location = { search: '' };
  sandbox.window.localStorage = { getItem: () => '', setItem: () => {} };
  sandbox.localStorage = sandbox.window.localStorage;
  vm.runInNewContext(examTargets, sandbox);
  const api = sandbox.window.SoFaExamTargets;
  const purchasable = Object.keys(api.TARGETS).filter((key) => api.examDayPlanState(api.TARGETS[key], '2026-07-15T00:00:00+08:00').canBuy);

  assert.deepEqual(purchasable, ['bookkeeper', 'real_estate_broker']);
  assert.match(checkout, /Object\.values\(window\.NODES \|\| \{\}\)/);
  assert.match(checkout, /\.slice\(0, 12\)/);
  assert.match(checkout, /function selectCheckoutCapability\(capabilityId\)/);
  assert.match(checkout, /data-capability-id/);
  assert.match(checkout, /這個考科目前不能購買到考日方案/);
  assert.doesNotMatch(checkout, /available\.map\(\(\{ key, target: t, state \}\)/);
});

test('exam-day plan opens one calendar month before registration closes and closes at the deadline', () => {
  const sandbox = { window: {}, URLSearchParams };
  sandbox.window.location = { search: '' };
  sandbox.window.localStorage = { getItem: () => '', setItem: () => {} };
  sandbox.localStorage = sandbox.window.localStorage;
  vm.runInNewContext(examTargets, sandbox);
  const api = sandbox.window.SoFaExamTargets;
  const bookkeeper = api.TARGETS.bookkeeper;

  assert.equal(api.examDayPlanState(bookkeeper, '2026-07-12T23:59:59.999+08:00').canBuy, false);
  assert.equal(api.examDayPlanState(bookkeeper, '2026-07-13T00:00:00+08:00').canBuy, true);
  assert.equal(api.examDayPlanState(bookkeeper, '2026-08-13T23:59:59.999+08:00').canBuy, true);
  const closed = api.examDayPlanState(bookkeeper, '2026-08-14T00:00:00+08:00');
  assert.equal(closed.canBuy, false);
  assert.equal(closed.state, 'registration_closed');
  assert.match(closed.reason, /報名已截止/);
  assert.match(api.examDayPlanState(bookkeeper, '2026-07-13T00:00:00+08:00').reason, /報名截止日前一個月/);
});

test('canonical event queue covers MOEX 115180, 115190 and 115200 by registration deadline', () => {
  assert.deepEqual(examPlanContract.sale_window_policy, {
    anchor: 'registration_end',
    opens_calendar_months_before: 1,
    opens_at: '00:00:00',
    closes_at: '23:59:59.999',
    timezone: 'Asia/Taipei',
  });
  assert.deepEqual(examPlanContract.event_order, ['115180', '115190', '115200']);
  const events = examPlanContract.exam_events;
  assert.deepEqual(
    examPlanContract.event_order.map((id) => events[id].registration_end),
    ['2026-08-13', '2026-09-17', '2026-10-07'],
  );
  assert.equal(events['115180'].sale_open_date, '2026-07-13');
  assert.equal(events['115190'].sale_open_date, '2026-08-17');
  assert.equal(events['115190'].sale_close_date, '2026-09-17');
  assert.equal(events['115200'].sale_open_date, '2026-09-07');
  assert.equal(events['115200'].sale_close_date, '2026-10-07');
  for (const id of examPlanContract.event_order) {
    assert.equal(events[id].authority, '考選部');
    assert.equal(events[id].official_event_id, id);
    assert.match(events[id].official_url, new RegExp(`c=${id}$`));
    assert.equal(events[id].verification_status, 'verified');
  }
});

test('the same registration-deadline rule works for non-MOEX events and calendar month ends', () => {
  const sandbox = { window: {}, URLSearchParams };
  sandbox.window.location = { search: '' };
  sandbox.window.localStorage = { getItem: () => '', setItem: () => {} };
  sandbox.localStorage = sandbox.window.localStorage;
  vm.runInNewContext(examTargets, sandbox);
  const api = sandbox.window.SoFaExamTargets;

  assert.deepEqual(
    JSON.parse(JSON.stringify(api.saleWindowFromRegistrationEnd('2026-09-17'))),
    {
      saleOpenDate: '2026-08-17T00:00:00+08:00',
      saleCloseDate: '2026-09-17T23:59:59.999+08:00',
    },
  );
  assert.equal(api.saleWindowFromRegistrationEnd('2027-03-31').saleOpenDate, '2027-02-28T00:00:00+08:00');
  assert.equal(api.saleWindowFromRegistrationEnd('2028-03-31').saleOpenDate, '2028-02-29T00:00:00+08:00');

  const postalEvent = {
    ...api.TARGETS.bookkeeper,
    key: 'post-office-demo',
    registrationStart: '2027-03-01T00:00:00+08:00',
    registrationEnd: '2027-03-31T17:00:00+08:00',
    saleOpenDate: '2027-02-28T00:00:00+08:00',
    saleCloseDate: '2027-03-31T23:59:59.999+08:00',
    examDate: '2027-05-01T00:00:00+08:00',
    examEndDate: '2027-05-01T23:59:59+08:00',
  };
  assert.equal(api.examDayPlanState(postalEvent, '2027-02-27T23:59:59.999+08:00').canBuy, false);
  assert.equal(api.examDayPlanState(postalEvent, '2027-02-28T00:00:00+08:00').canBuy, true);
  assert.equal(api.examDayPlanState(postalEvent, '2027-04-01T00:00:00+08:00').state, 'registration_closed');
});

test('CXA keeps elem-admin explicitly disabled until LINE bot supports the paid service', () => {
  assert.match(examTargets, /'elem-admin': Object\.assign\(/);
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

  assert.deepEqual(Object.keys(api.TARGETS), examPlanContract.exam_keys.map((key) => examPlanContract.exams[key].canonical_key));
  assert.deepEqual(examPlanContract.plans.map((plan) => plan.name), ['月費', '季費', '到考日', '買斷']);
  assert.deepEqual(examPlanContract.plans.map((plan) => plan.amount_env), [
    'ECPAY_AMT_MONTHLY',
    'ECPAY_AMT_QUARTERLY',
    'ECPAY_AMT_EXAM',
    'ECPAY_AMT_BUYOUT',
  ]);

  for (const key of examPlanContract.exam_keys) {
    const expected = examPlanContract.exams[key];
    const actual = api.TARGETS[expected.canonical_key];
    assert.equal(actual.label, expected.label, `${key} label`);
    if (expected.exam_date) assert.equal(actual.examDate.slice(0, 10), expected.exam_date, `${key} exam_date`);
    if (expected.registration_start) assert.equal(actual.registrationStart.slice(0, 10), expected.registration_start, `${key} registration_start`);
    if (expected.sale_open_date) assert.equal(actual.saleOpenDate.slice(0, 10), expected.sale_open_date, `${key} sale_open_date`);
    if (expected.sale_close_date) assert.equal(actual.saleCloseDate.slice(0, 10), expected.sale_close_date, `${key} sale_close_date`);
    if (expected.event_id) assert.equal(actual.eventId, expected.event_id, `${key} event_id`);
    if (expected.capability_id) assert.equal(actual.capabilityId, expected.capability_id, `${key} capability_id`);
    if (expected.track_id) assert.equal(actual.trackId, expected.track_id, `${key} track_id`);
    assert.equal(actual.lineBotSupported, expected.line_bot_supported, `${key} line_bot_supported`);
    if (expected.purchase_status === 'disabled') assert.equal(actual.purchaseStatus, 'disabled', `${key} disabled`);
  }
});

test('CXB checkout resolves stored capability separately from purchase eligibility', () => {
  assert.match(checkout, /function resolveCheckoutCapabilityId\(value\)/);
  assert.match(checkout, /localStorage\.getItem\("sofa_exam_capability_id"\)/);
  assert.match(checkout, /checkoutCapabilityId = explicit/);
  assert.match(checkout, /examUnavailable = examMode && !isCheckoutExamTargetConfigured\(\)/);
  assert.match(checkout, /const examKey = getCheckoutExamKey\(\)/);
  assert.match(checkout, /exam_key: apiExamKey/);
  assert.match(checkout, /line_identity: lineIdentity/);
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
