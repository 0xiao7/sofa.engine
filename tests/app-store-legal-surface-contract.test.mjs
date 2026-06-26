import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const terms = readFileSync(new URL('../terms.html', import.meta.url), 'utf8');
const login = readFileSync(new URL('../login.html', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');

test('terms page provides public privacy and account deletion instructions', () => {
  assert.match(terms, /id="privacy"/);
  assert.match(terms, /隱私與資料使用/);
  assert.match(terms, /id="data-deletion"/);
  assert.match(terms, /帳號與資料刪除/);
  assert.match(terms, /購買信箱/);
  assert.match(terms, /序號後 4 碼/);
  assert.match(terms, /答題紀錄、收藏、筆記或會員紀錄/);
  assert.match(terms, /7 個工作天內回覆/);
  assert.match(terms, /依法令或金流、稅務留存/);
  assert.match(terms, /mailto:hi@sofaengine\.org\?subject=SoFa%20帳號與資料刪除/);
});

test('terms table of contents and FAQ link to data deletion', () => {
  assert.match(terms, /href="#privacy"[\s\S]*04 · 隱私與資料/);
  assert.match(terms, /href="#data-deletion"[\s\S]*05 · 帳號與資料刪除/);
  assert.match(terms, /我可以刪除帳號或學習資料嗎？/);
  assert.match(terms, /href="#data-deletion"[\s\S]*帳號與資料刪除/);
});

test('login exposes data deletion and privacy links even in native iOS reader mode', () => {
  assert.match(login, /href="terms\.html#privacy"[\s\S]*隱私與資料/);
  assert.match(login, /href="terms\.html#data-deletion"[\s\S]*資料刪除/);
  const bottomStart = login.indexOf('<div class="bottom">');
  assert.notEqual(bottomStart, -1, 'login footer should exist');
  const bottom = login.slice(bottomStart, login.indexOf('</main>', bottomStart));
  assert.match(bottom, /terms\.html#data-deletion/);
  assert.doesNotMatch(bottom, /data-ios-reader-hide/);
});

test('dashboard footer links to public privacy and deletion instructions', () => {
  assert.match(dashboard, /href="terms\.html#privacy"[\s\S]*隱私與資料/);
  assert.match(dashboard, /href="terms\.html#data-deletion"[\s\S]*資料刪除/);
  assert.match(dashboard, /mailto:hi@sofaengine\.org/);
});
