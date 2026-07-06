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
