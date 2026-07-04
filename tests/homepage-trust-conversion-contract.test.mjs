import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('homepage hero balances brand trust and a clear practice path', () => {
  const hero = index.slice(index.indexOf('<section class="hero"'), index.indexOf('<!-- ============ COMPASS WIDGET', index.indexOf('<section class="hero"')));

  assert.match(hero, /國考與專技備考 · 法規、題目、弱點整理/);
  assert.match(hero, /免登入可練習；啟用後保留紀錄/);
  assert.match(hero, /法規備考，/);
  assert.match(hero, /把條文、題目、錯題/);
  assert.match(hero, /整理成<em>下一步<\/em>/);
  assert.match(hero, /沒有啟用時，答題紀錄只留在當下，不做跨裝置保存/);
  assert.match(hero, /開始練習/);
  assert.match(hero, /href="pricing\.html\?utm_source=homepage&utm_medium=hero&utm_campaign=homepage_pricing"/);
  assert.match(hero, /保留紀錄與錯題/);
  assert.match(hero, /36,000\+ 條/);
  assert.match(hero, /567 部/);
  assert.match(hero, /172 個國考職能/);
  assert.match(hero, /記帳士、地政士等專技考科只是其中幾條主線/);
  assert.doesNotMatch(hero, /免費做 5 題|先刷 5 題|免費刷題看弱點/);
});

test('homepage exposes honest social proof and a future testimonial structure', () => {
  assert.match(index, /class="proof-strip"/);
  assert.match(index, /題庫與條文規模/);
  assert.match(index, /學員見證/);
  assert.match(index, /等待第一批真實上榜回饋/);
  assert.doesNotMatch(index, /通過率|上榜率|命中率/);
});

test('homepage footer has visible trust, payment, invoice, and refund information', () => {
  const footer = index.slice(index.indexOf('<!-- ============ FOOTER ============ -->'));

  assert.match(footer, /營業資訊/);
  assert.match(footer, /電子發票/);
  assert.match(footer, /綠界科技 ECPay/);
  assert.match(footer, /7 天內且序號未啟用，可申請全額退費/);
  assert.match(footer, /統一編號以電子發票資訊為準/);
  assert.match(footer, /hi@sofaengine\.org/);
});
