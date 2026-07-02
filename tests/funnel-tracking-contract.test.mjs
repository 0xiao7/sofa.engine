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

test('core funnel pages load the shared analytics bridge', () => {
  for (const html of [index, dashboard, login, quiz, fill, practice, free, pricing, checkout]) {
    assert.match(html, /<script src="sofa-analytics\.js" defer><\/script>/);
  }
});

test('analytics bridge preserves attribution and falls back safely when gtag is unavailable', () => {
  assert.match(analytics, /const ATTR_KEY = 'sofa_attribution_v1'/);
  assert.match(analytics, /const SESSION_KEY = 'sofa_session_v1'/);
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
  assert.match(analytics, /if \(!ATTR_KEYS\.some\(k => !!a\[k\]\)\) return href;/);
});

test('server-side funnel forwarding is limited to revenue and recovery events', () => {
  assert.match(analytics, /const SERVER_EVENT_MAP = new Map/);
  assert.match(analytics, /\['pricing_view', 'pricing_view'\]/);
  assert.match(analytics, /\['pricing_select_plan', 'pricing_select_plan'\]/);
  assert.match(analytics, /\['checkout_start', 'checkout_start'\]/);
  assert.match(analytics, /\['checkout_submit', 'checkout_submit'\]/);
  assert.match(analytics, /\['payment_return_success', 'payment_return_success'\]/);
  assert.match(analytics, /\['expire_feedback_click', 'expiry_feedback_start'\]/);
  assert.match(analytics, /\['expire_share_click', 'share_extension_start'\]/);
  assert.doesNotMatch(analytics, /SERVER_EVENT_MAP[\s\S]*answer_submitted/);
});

test('pricing and checkout expose plan selection, checkout start, and payment return signals', () => {
  assert.match(pricing, /pricing_select_plan/);
  assert.match(pricing, /data-plan="月費"/);
  assert.match(pricing, /data-plan="季費"/);
  assert.match(analytics, /pricing_view/);
  assert.match(analytics, /checkout_start/);
  assert.match(analytics, /payment_return_success/);
  assert.doesNotMatch(analytics, /purchase_completed/);
  assert.match(checkout, /sofaTrack\('checkout_submit', \{ plan: sel\.plan, amount: sel\.amount \}\)/);
  assert.doesNotMatch(checkout, /data-track-event="checkout_submit"/, 'checkout submit should not double-count through generic click tracking');
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

test('expired learner recovery choices are measurable before renewal', () => {
  assert.match(dashboard, /data-track-event="expire_feedback_click"/);
  assert.match(dashboard, /data-track-label="feedback_10_days"/);
  assert.match(dashboard, /data-track-event="expire_share_click"/);
  assert.match(dashboard, /data-track-label="share_10_days"/);
  assert.match(dashboard, /data-track-event="expire_renew_click"/);
  assert.match(dashboard, /data-track-label="renew_pricing"/);
  assert.match(dashboard, /data-track-event="expire_free_switch"/);
});
