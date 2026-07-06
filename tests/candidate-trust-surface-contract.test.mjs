import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const files = ['index.html', 'free.html', 'pricing.html', 'checkout.html'];
const source = Object.fromEntries(files.map((file) => [
  file,
  readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->/g, ''),
]));

test('candidate entry surfaces lead with continuity instead of unstable scale claims', () => {
  for (const file of files) {
    assert.doesNotMatch(source[file], /14,000\+ 條法規、145 部法典|567 部法規、36,000\+ 條文/, `${file} still leads with unstable scale copy`);
    assert.doesNotMatch(source[file], /33 部法規 · 2,000\+ 條文|14,000<em>\+<\/em>|<div class="v">145<\/div>|完整資料庫，修法後 7 天內同步更新/, `${file} still uses brittle checkout scale proof`);
    assert.doesNotMatch(source[file], /加入 LINE Bot|每日 LINE Bot 法條推播|每天 08:00 推播一條|lin\.ee\/zUeMwo4/, `${file} still uses LINE as a primary public funnel`);
  }

  assert.match(source['index.html'], /免登入可練習；啟用後保留紀錄/);
  assert.match(source['index.html'], /href="quiz\.html\?free=1&start=1&utm_source=site&utm_medium=web&utm_campaign=free_quiz_entry"/);
  assert.match(source['free.html'], /免登入可練習/);
  assert.match(source['free.html'], /完整答題紀錄、弱點分析與錯題重練/);
});

test('pricing and checkout agree that exam-day is the default purchase path', () => {
  assert.match(source['pricing.html'], /class="plan-card featured"[\s\S]*到考日/);
  assert.match(source['checkout.html'], /class="plan selected" data-plan="到考日" data-amount="1280"/);
  assert.match(source['checkout.html'], /id="ck-sum-plan">到考日方案 · 讀到考試日/);
  assert.match(source['checkout.html'], /id="ck-sum-amount">1280/);
  assert.doesNotMatch(source['checkout.html'], /class="plan selected" data-plan="季費"/);
});

test('checkout payment page sells saved study continuity, not law inventory scale', () => {
  assert.match(source['checkout.html'], /把今天錯的地方/);
  assert.match(source['checkout.html'], /保存答題紀錄/);
  assert.match(source['checkout.html'], /累積弱點分析/);
  assert.match(source['checkout.html'], /跨裝置接續/);
  assert.match(source['checkout.html'], /用這個信箱保存答題紀錄與弱點/);
  assert.match(source['checkout.html'], /登入後可接回錯題、弱點與今日複習/);
  assert.match(source['checkout.html'], /class="ck-proof-list"/);
  assert.doesNotMatch(source['checkout.html'], /class="incl"/);
});
