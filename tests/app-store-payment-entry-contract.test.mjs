import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const dashboard = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');
const room = readFileSync(new URL('../room.html', import.meta.url), 'utf8');
const pricing = readFileSync(new URL('../pricing.html', import.meta.url), 'utf8');
const checkout = readFileSync(new URL('../checkout.html', import.meta.url), 'utf8');

test('pricing and checkout hide external payment UI inside native iOS reader app', () => {
  for (const html of [pricing, checkout]) {
    assert.match(html, /window\.Capacitor/);
    assert.match(html, /ios-reader-app/);
    assert.match(html, /html\.ios-reader-app body>\*\{display:none!important\}/);
    assert.match(html, /進階內容，訂閱者可見/);
  }
});

test('dashboard renewal CTA is neutralized for native iOS reader app', () => {
  assert.match(dashboard, /function applyIOSReaderAppReviewGuards/);
  assert.match(dashboard, /document\.documentElement\.classList\.contains\('ios-reader-app'\)/);
  assert.match(dashboard, /querySelectorAll\('\.mc-renewal-cta'\)/);
  assert.match(dashboard, /cta\.removeAttribute\('href'\)/);
  assert.match(dashboard, /已購買序號會接回進度/);
});

test('study room retain modal keeps web checkout but sends native iOS users to login', () => {
  assert.match(room, /onclick="goSerialFromRetain\(\)"/);
  assert.match(room, /window\.Capacitor/);
  assert.match(room, /Capacitor\.getPlatform\(\) === 'ios'[\s\S]*window\.location\.href = 'login\.html'/);
  assert.match(room, /window\.location\.href = 'checkout\.html'/);
});
