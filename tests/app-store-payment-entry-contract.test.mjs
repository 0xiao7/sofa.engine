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

test('study room retain modal hides external LINE and trial-email paths in native iOS reader app', () => {
  assert.match(room, /function applyIOSReaderRoomGuards/);
  assert.match(room, /document\.documentElement\.classList\.add\('ios-reader-app'\)/);
  assert.match(room, /data-ios-reader-hide[\s\S]*加入 LINE 官方帳號/);
  assert.match(room, /data-ios-reader-hide[\s\S]*id="trial-email"/);
  assert.match(room, /data-ios-reader-hide[\s\S]*id="btn-send-trial"/);

  const retainStart = room.indexOf('<div id="retain-modal">');
  assert.notEqual(retainStart, -1, 'retain modal should exist');
  const retainModal = room.slice(retainStart, room.indexOf('<!-- ── 離席偵測 overlay', retainStart));
  assert.match(room, /html\.ios-reader-app \[data-ios-reader-hide\]\{display:none!important\}/);
  assert.match(retainModal, /btn-serial/);
});

test('study room trial email reuse explains existing identity instead of implying another free serial', () => {
  assert.match(room, /const reuseCopy = d\.message \|\| '這個信箱已經有 SoFa 帳號，請沿用既有序號登入。'/);
  assert.match(room, /d\.reuse \? '沿用既有序號' : '你的序號'/);
  assert.match(room, /btn\.textContent = d\.reuse \? '沿用既有序號' : '已寄出'/);
  assert.doesNotMatch(room, /已有序號/);
});
