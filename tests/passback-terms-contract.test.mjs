import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pricing = readFileSync(new URL('../pricing.html', import.meta.url), 'utf8');
const terms = readFileSync(new URL('../terms.html', import.meta.url), 'utf8');
const checkout = readFileSync(new URL('../checkout.html', import.meta.url), 'utf8');

test('passback program is framed as post-exam reward, not an exam guarantee', () => {
  for (const [name, html] of [['pricing', pricing], ['terms', terms], ['checkout', checkout]]) {
    assert.doesNotMatch(html, /上榜退款保障|上榜保障|保證上榜|上榜保證|命中率|通過率/, `${name} should avoid exam-result guarantee language`);
  }
  assert.match(terms, /考後回饋活動/);
  assert.match(checkout, /退費、考後回饋與付款安全/);
});

test('passback terms define actual-paid calculation and 30 or 40 percent limits', () => {
  assert.match(terms, /退還實付訂閱費用的 30%/);
  assert.match(terms, /退還實付訂閱費用的 40%/);
  assert.match(terms, /實付訂閱費用指同一序號實際刷卡付款金額/);
  assert.match(terms, /扣除已退費、折扣、折抵、金流或匯款成本後計算/);
  assert.match(terms, /30% 與 40% 不併給/);
});

test('passback terms disclose eligibility, proof, deadlines, and privacy handling', () => {
  assert.match(terms, /限購買並啟用付費序號本人/);
  assert.match(terms, /榜單、錄取通知或考選部公告截圖/);
  assert.match(terms, /榜示日起 60 天內/);
  assert.match(terms, /可遮蔽身分證字號、准考證號、地址、電話/);
  assert.match(terms, /僅用於資格審核、退款處理與必要帳務留存/);
  assert.match(terms, /若要公開引用心得，會另行取得同意/);
});

test('pricing points candidates to the full passback terms without overloading the sales page', () => {
  assert.match(pricing, /考後回饋/);
  assert.match(pricing, /上榜後可依條件申請實付金額 30% 或 40% 回饋/);
  assert.match(pricing, /href="\/terms\.html#passback"/);
});
