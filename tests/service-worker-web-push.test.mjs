import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('service worker displays safe daily review notifications', () => {
  assert.match(source, /addEventListener\(['"]push['"]/);
  assert.match(source, /registration\.showNotification/);
  assert.match(source, /SoFa｜今日複習/);
  assert.match(source, /sofa-review-/);
  assert.match(source, /\/dashboard\.html#review-due/);
});

test('notification click focuses an existing window or opens the exact review deep link', () => {
  assert.match(source, /addEventListener\(['"]notificationclick['"]/);
  assert.match(source, /clients\.matchAll/);
  assert.match(source, /client\.focus/);
  assert.match(source, /clients\.openWindow/);
  assert.match(source, /notification\.close\(\)/);
});

test('service worker rejects arbitrary cross-origin notification targets', () => {
  assert.match(source, /url\.origin !== self\.location\.origin/);
  assert.match(source, /url\.pathname !== ['"]\/dashboard\.html['"]/);
  assert.match(source, /url\.hash !== ['"]#review-due['"]/);
});

test('service worker allowlists both member review and anonymous free practice', () => {
  assert.match(source, /\/dashboard\.html#review-due/);
  assert.match(source, /\/quiz\.html\?free=1/);
  assert.match(source, /safeNotificationUrl/);
  assert.match(source, /sofa-free-practice-/);
});
