import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const checkout = readFileSync(new URL('../checkout.html', import.meta.url), 'utf8');

test('checkout records pre-payment visibility and selection micro-funnel events', () => {
  assert.match(checkout, /function trackCheckoutOnce\(eventName, extra\)/);
  assert.match(checkout, /const checkoutOnceEvents = new Set\(\)/);
  assert.match(checkout, /observeCheckoutSignal\(document\.querySelector\("form\.form"\), "checkout_form_visible"\)/);
  assert.match(checkout, /observeCheckoutSignal\(submitBtn, "checkout_cta_viewed"\)/);
  assert.match(checkout, /trackCheckout\("checkout_plan_changed", \{ from_plan: prevPlan, to_plan: c\.dataset\.plan \}\)/);
  assert.match(checkout, /trackCheckout\("checkout_exam_target_changed", \{ exam_key: getCheckoutExamKey\(\) \}\)/);
});

test('checkout visibility events happen before checkout start is counted as a page-load baseline', () => {
  assert.ok(
    checkout.indexOf('observeCheckoutSignal(document.querySelector("form.form"), "checkout_form_visible")') <
      checkout.indexOf('trackCheckout("checkout_start")'),
    'form visibility should be registered before the page-load checkout_start baseline'
  );
  assert.ok(
    checkout.indexOf('observeCheckoutSignal(submitBtn, "checkout_cta_viewed")') <
      checkout.indexOf('trackCheckout("checkout_start")'),
    'CTA visibility should be registered before the page-load checkout_start baseline'
  );
});
