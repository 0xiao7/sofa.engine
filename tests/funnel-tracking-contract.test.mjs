import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const analytics = readFileSync(new URL('../sofa-analytics.js', import.meta.url), 'utf8');
const quiz = readFileSync(new URL('../quiz.html', import.meta.url), 'utf8');
const free = readFileSync(new URL('../free.html', import.meta.url), 'utf8');
const pricing = readFileSync(new URL('../pricing.html', import.meta.url), 'utf8');
const checkout = readFileSync(new URL('../checkout.html', import.meta.url), 'utf8');
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');
const login = readFileSync(new URL('../login.html', import.meta.url), 'utf8');
const fill = readFileSync(new URL('../fill.html', import.meta.url), 'utf8');
const practice = readFileSync(new URL('../practice.html', import.meta.url), 'utf8');
const lawPreview = readFileSync(new URL('../law-preview.html', import.meta.url), 'utf8');
const notes = readFileSync(new URL('../notes.html', import.meta.url), 'utf8');
const room = readFileSync(new URL('../room.html', import.meta.url), 'utf8');

test('core funnel pages load the shared analytics bridge', () => {
  for (const html of [index, dashboard, login, quiz, fill, practice, free, pricing, checkout]) {
    assert.match(html, /<script src="sofa-analytics\.js\?v=20260704-revenue-v1" defer><\/script>/);
  }
});

test('analytics bridge preserves attribution and falls back safely when gtag is unavailable', () => {
  assert.match(analytics, /const ATTR_KEY = 'sofa_attribution_v1'/);
  assert.match(analytics, /const SESSION_KEY = 'sofa_session_v1'/);
  assert.match(analytics, /const TRACKING_VERSION = '20260704-revenue-v1'/);
  assert.match(analytics, /tracking_version: TRACKING_VERSION/);
  assert.match(analytics, /const FUNNEL_ENDPOINT = 'https:\/\/sofa-engine-api\.onrender\.com\/api\/funnel-event'/);
  assert.match(analytics, /utm_source/);
  assert.match(analytics, /utm_campaign/);
  assert.match(analytics, /window\.sofaTrack = track/);
  assert.match(analytics, /typeof window\.gtag === 'function'/);
  assert.match(analytics, /window\.dataLayer\.push/);
  assert.match(analytics, /sendBeacon/);
  assert.match(analytics, /keepalive: true/);
  assert.match(analytics, /decorateLinks/);
  assert.match(analytics, /CARRY_PATHS/);
  assert.match(analytics, /MONETIZATION_PATHS/);
  assert.match(analytics, /fallbackCampaign/);
  assert.match(analytics, /fallbackContent/);
  assert.match(analytics, /window\.sofaDecorateHref = decorateHref/);
});

test('server-side funnel forwarding is limited to revenue, recovery, and entry events', () => {
  assert.match(analytics, /const SERVER_EVENT_MAP = new Map/);
  assert.match(analytics, /\['quiz_start', 'quiz_start'\]/);
  assert.match(analytics, /\['pricing_view', 'pricing_view'\]/);
  assert.match(analytics, /\['pricing_select_plan', 'pricing_select_plan'\]/);
  assert.match(analytics, /\['post_answer_pricing_click', 'post_answer_pricing_click'\]/);
  assert.match(analytics, /\['post_answer_login_click', 'post_answer_login_click'\]/);
  assert.match(analytics, /\['locked_content_pricing_click', 'locked_content_pricing_click'\]/);
  assert.match(analytics, /\['existing_serial_login_click', 'existing_serial_login_click'\]/);
  assert.match(analytics, /\['checkout_start', 'checkout_start'\]/);
  assert.match(analytics, /\['checkout_attempt', 'checkout_attempt'\]/);
  assert.match(analytics, /\['checkout_submit', 'checkout_submit'\]/);
  assert.match(analytics, /\['checkout_api_error', 'checkout_api_error'\]/);
  assert.match(analytics, /\['payment_return_success', 'payment_return_success'\]/);
  assert.match(analytics, /\['expire_feedback_click', 'expiry_feedback_start'\]/);
  assert.match(analytics, /\['expire_share_click', 'share_extension_start'\]/);
  assert.doesNotMatch(analytics, /SERVER_EVENT_MAP[\s\S]*answer_submitted/);
});

test('post-answer retention clicks are measurable without storing answer content', () => {
  assert.match(analytics, /\['post_answer_pricing_click', 'post_answer_pricing_click'\]/);
  assert.match(analytics, /\['post_answer_login_click', 'post_answer_login_click'\]/);
  assert.match(quiz, /data-track-event="post_answer_pricing_click"/);
  assert.match(quiz, /data-track-label="quiz_post_answer_pricing"/);
  assert.match(quiz, /href="pricing\.html\?utm_source=web_quiz&utm_medium=post_answer&utm_campaign=quiz_post_answer_pricing"/);
  assert.match(quiz, /data-track-event="post_answer_login_click"/);
  assert.match(quiz, /data-track-label="quiz_post_answer_login"/);
  assert.match(quiz, /href="login\.html\?utm_source=web_quiz&utm_medium=post_answer&utm_campaign=quiz_post_answer_login"/);
});

test('locked quiz upgrade and existing-serial login CTAs are measurable', () => {
  assert.match(quiz, /data-track-event="locked_content_pricing_click"/);
  assert.match(quiz, /data-track-label="quiz_free_bar_pricing"/);
  assert.match(quiz, /data-track-label="quiz_locked_section_pricing"/);
  assert.match(quiz, /data-track-label="quiz_weakness_locked_pricing"/);
  assert.match(pricing, /data-track-event="existing_serial_login_click"/);
  assert.match(checkout, /data-track-event="existing_serial_login_click"/);
});

test('successful serial and magic login emit a server-visible verification event', () => {
  assert.match(login, /sofaTrack\('serial_verify_success'/);
  assert.match(login, /method: 'serial'/);
  assert.match(login, /method: 'magic'/);
});

test('pricing and checkout expose plan selection, checkout start, and payment return signals', () => {
  assert.match(pricing, /pricing_select_plan/);
  assert.match(pricing, /data-plan="月費"/);
  assert.match(pricing, /data-plan="季費"/);
  assert.match(pricing, /href="\/checkout\.html\?plan=到考日&utm_source=pricing&utm_medium=topbar&utm_campaign=pricing_exam_day"/);
  assert.match(pricing, /href="\/checkout\.html\?plan=月費&utm_source=pricing&utm_medium=plan_card&utm_campaign=pricing_monthly"/);
  assert.match(pricing, /href="\/checkout\.html\?plan=到考日&utm_source=pricing&utm_medium=plan_card&utm_campaign=pricing_exam_day"/);
  assert.match(pricing, /href="\/checkout\.html\?plan=季費&utm_source=pricing&utm_medium=plan_card&utm_campaign=pricing_quarterly"/);
  assert.match(pricing, /href="\/checkout\.html\?plan=到考日&utm_source=pricing&utm_medium=footer&utm_campaign=pricing_exam_day"/);
  assert.match(analytics, /pricing_view/);
  assert.match(analytics, /checkout_start/);
  assert.match(analytics, /track\('checkout_start', \{ plan: queryPlan\(\) \|\| '到考日' \}\)/);
  assert.match(analytics, /payment_return_success/);
  assert.doesNotMatch(analytics, /purchase_completed/);
  assert.match(checkout, /sofaTrack\('checkout_attempt', \{ plan: sel\.plan, amount: sel\.amount \}\)/);
  assert.match(checkout, /sofaTrack\('checkout_submit', \{ plan: sel\.plan, amount: sel\.amount \}\)/);
  assert.match(checkout, /sofaTrack\('checkout_api_error'/);
  assert.ok(
    checkout.indexOf("sofaTrack('checkout_attempt'") < checkout.indexOf('const res = await fetch'),
    'checkout attempt should measure valid payment intent before the API call'
  );
  assert.ok(
    checkout.indexOf("if (!res.ok)") < checkout.indexOf("sofaTrack('checkout_submit'"),
    'checkout submit should only be tracked after the checkout API accepts the order'
  );
  assert.ok(
    checkout.indexOf("sofaTrack('checkout_submit'") < checkout.indexOf('document.open()'),
    'checkout submit should be recorded immediately before the ECPay handoff'
  );
  assert.match(checkout, /const checkoutPayload = \{/);
  assert.match(checkout, /attribution: window\.sofaGetAttribution\?\.\(\) \|\| \{\}/);
  assert.match(checkout, /session_id: window\.sofaGetSessionId\?\.\(\) \|\| ''/);
  assert.match(checkout, /page_path: location\.pathname \+ location\.search/);
  assert.match(checkout, /body: JSON\.stringify\(checkoutPayload\)/);
  assert.doesNotMatch(checkout, /data-track-event="checkout_submit"/, 'checkout submit should not double-count through generic click tracking');
});

test('internal monetization links carry CTA-level attribution instead of becoming unknown source', () => {
  const expectedLinks = [
    [index, /pricing\.html\?utm_source=homepage&utm_medium=hero&utm_campaign=homepage_pricing/],
    [index, /pricing\.html\?utm_source=homepage&utm_medium=plan_card&utm_campaign=homepage_monthly_pricing/],
    [index, /checkout\.html\?plan=到考日&utm_source=homepage&utm_medium=plan_card&utm_campaign=homepage_exam_day/],
    [index, /pricing\.html\?utm_source=homepage&utm_medium=plan_card&utm_campaign=homepage_quarterly_pricing/],
    [dashboard, /pricing\.html\?utm_source=dashboard&utm_medium=free_retention&utm_campaign=dashboard_pricing/],
    [dashboard, /pricing\.html\?utm_source=dashboard&utm_medium=member_card&utm_campaign=renewal_pricing/],
    [dashboard, /pricing\.html\?utm_source=dashboard&utm_medium=locked_analysis&utm_campaign=dashboard_pricing/],
    [dashboard, /pricing\.html\?utm_source=dashboard&utm_medium=member_card_free&utm_campaign=dashboard_pricing/],
    [dashboard, /pricing\.html\?utm_source=dashboard&utm_medium=free_nudge&utm_campaign=dashboard_pricing/],
    [dashboard, /\/pricing\.html\?utm_source=dashboard&utm_medium=expired_modal&utm_campaign=renew_pricing/],
    [fill, /pricing\.html\?utm_source=fill&utm_medium=free_bar&utm_campaign=fill_pricing/],
    [fill, /pricing\.html\?utm_source=fill&utm_medium=locked_section&utm_campaign=fill_pricing/],
    [practice, /pricing\.html\?utm_source=practice&utm_medium=free_bar&utm_campaign=practice_pricing/],
    [practice, /pricing\.html\?utm_source=practice&utm_medium=locked_section&utm_campaign=practice_pricing/],
    [lawPreview, /pricing\.html\?utm_source=law_preview&utm_medium=locked_section&utm_campaign=law_preview_pricing/],
    [notes, /pricing\.html\?utm_source=notes&utm_medium=empty_state&utm_campaign=notes_pricing/],
    [room, /checkout\.html\?plan=到考日&utm_source=room&utm_medium=retain_modal&utm_campaign=room_checkout/],
  ];
  for (const [html, pattern] of expectedLinks) {
    assert.match(html, pattern);
  }
  assert.match(room, /window\.sofaDecorateHref \? window\.sofaDecorateHref\(checkoutHref\) : checkoutHref/);
});

test('analytics decorator supplies a safe internal fallback for naked payment links', () => {
  assert.match(analytics, /if \(!url\.searchParams\.has\('utm_source'\)\) url\.searchParams\.set\('utm_source', 'site'\)/);
  assert.match(analytics, /if \(!url\.searchParams\.has\('utm_medium'\)\) url\.searchParams\.set\('utm_medium', 'internal'\)/);
  assert.match(analytics, /if \(!url\.searchParams\.has\('utm_campaign'\)\) url\.searchParams\.set\('utm_campaign', fallbackCampaign\(url\.pathname\)\)/);
  assert.match(analytics, /if \(!url\.searchParams\.has\('utm_content'\)\) url\.searchParams\.set\('utm_content', fallbackContent\(\)\)/);
});

test('checkout copy explains the payment handoff without burying the primary action', () => {
  assert.match(checkout, /回來繼續做題/);
  assert.match(checkout, /付款後流程/);
  assert.match(checkout, /前往綠界付款/);
  assert.match(checkout, /序號通常 5 分鐘內寄到信箱/);
  assert.match(checkout, /class="ck-quote"/);
  assert.match(checkout, /class="ck-proof-strip"/);
  assert.match(checkout, /不用重填資料/);
  assert.doesNotMatch(checkout, /class="incl"/, 'checkout should not repeat landing-page feature inventory after users decided to pay');
  assert.ok(
    checkout.indexOf('id="ck-submit"') < checkout.indexOf('id="plans"'),
    'primary payment button should appear before secondary plan switching'
  );
  assert.doesNotMatch(checkout, /class=”ck-quote”/);
  assert.match(checkout, /<details class="legal">/);
  assert.match(checkout, /<summary>退費、上榜保障與付款安全<\/summary>/);
  assert.match(pricing, /pricing_footer_login"[^>]*>已有序號？登入<\/a>/);
  assert.doesNotMatch(pricing, /pricing_footer_login"[^>]*>先免費試用<\/a>/);
});

test('quiz tracks question starts and submitted answers across normal and wrong-review modes', () => {
  assert.match(quiz, /sofaTrack\('quiz_start'/);
  assert.match(quiz, /mode: 'wrong_review'/);
  assert.match(quiz, /sofaTrack\('answer_submitted'/);
  assert.match(quiz, /elapsed_sec: Math\.round\(_elapsed \|\| 0\)/);
  assert.match(quiz, /mode: data\._past_exam \? 'past_exam' : \(_drillParam \? 'article_drill' : 'quiz'\)/);
});

test('all formal answer tools emit the shared answer_submitted event', () => {
  assert.match(quiz, /sofaTrack\('answer_submitted'/);
  assert.match(fill, /sofaTrack\('answer_submitted'/);
  assert.match(fill, /mode: 'fill'/);
  assert.match(practice, /sofaTrack\('answer_submitted'/);
  assert.match(practice, /mode: currentMode === 3 \? 'practice_fill' : 'practice'/);
});

test('free entry CTAs are measurable before users reach the practice tools', () => {
  assert.match(free, /data-track-event="free_practice_start"/);
  assert.match(free, /data-track-event="free_mode_select"/);
  assert.match(free, /data-track-label="quiz"/);
  assert.match(free, /data-track-label="fill"/);
  assert.match(free, /data-track-label="practice"/);
});

test('public free-quiz entry links carry a measurable campaign path', () => {
  const publicPages = new Map([
    ['index.html', index],
    ['pricing.html', pricing],
    ['login.html', login],
  ]);
  for (const [file, html] of publicPages) {
    assert.match(
      html,
      /quiz\.html\?free=1&start=1&utm_source=site&utm_medium=web&utm_campaign=free_quiz_entry/,
      `${file} should send free-quiz CTA through the measured web entry path`,
    );
    assert.doesNotMatch(
      html,
      /href=["'](?:\/)?quiz\.html\?free=1["']/,
      `${file} still has an unmeasured naked free quiz link`,
    );
  }
});

test('expired learner recovery choices are measurable before renewal', () => {
  assert.match(dashboard, /data-track-event="expire_feedback_click"/);
  assert.match(dashboard, /data-track-label="feedback_10_days"/);
  assert.match(dashboard, /data-track-event="expire_share_click"/);
  assert.match(dashboard, /data-track-label="share_10_days"/);
  assert.match(dashboard, /data-track-event="expire_renew_click"/);
  assert.match(dashboard, /data-track-label="renew_pricing"/);
  assert.match(dashboard, /data-track-event="expire_free_switch"/);
});
