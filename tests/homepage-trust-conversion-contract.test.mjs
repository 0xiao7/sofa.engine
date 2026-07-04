import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('homepage hero balances trust, urgency, and a clear plan path', () => {
  const hero = index.slice(index.indexOf('<section class="hero"'), index.indexOf('<!-- ============ COMPASS WIDGET', index.indexOf('<section class="hero"')));

  assert.match(hero, /穩住節奏,並且趕上 11\/14/);
  assert.match(hero, /href="pricing\.html\?utm_source=homepage&utm_medium=hero&utm_campaign=homepage_pricing"/);
  assert.match(hero, /看方案/);
  assert.match(hero, /36,000\+ 條/);
  assert.match(hero, /567 部/);
  assert.match(hero, /172 個國考職能/);
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
