import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const files = ['index.html', 'dashboard.html', 'login.html', 'checkout.html', 'free.html', 'pricing.html', 'terms.html'];
const source = Object.fromEntries(files.map((file) => [
  file,
  readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->/g, ''),
]));

test('public law counts use the current rounded live total', () => {
  for (const [file, html] of Object.entries(source)) {
    assert.doesNotMatch(html, /566\s*(?:部|<\/|<span|STATUTES|部法規|部法典)/, `${file} still shows stale 566 law count`);
  }
  assert.match(source['dashboard.html'], /36,000\+ 條 · 567 部/);
  assert.match(source['dashboard.html'], /共 <b>567<\/b> 部 · <b>36,000\+<\/b> 條/);
  assert.match(source['login.html'], /36,000\+ 條法規、567 部法典/);
  assert.match(source['checkout.html'], /567 部法規 · 36,000\+ 條文/);
  assert.match(source['free.html'], /567 部法規、36,000\+ 條文/);
  assert.match(source['terms.html'], /567 部法規、共 36,000\+ 條文/);
});

test('public growth funnel leads with web practice and saved learning value', () => {
  assert.match(source['index.html'], /做 5 題看弱點/);
  assert.match(source['index.html'], /href="quiz\.html\?free=1"/);
  assert.match(source['pricing.html'], /保留答題紀錄/);
  assert.match(source['pricing.html'], /弱點分析/);
  assert.match(source['pricing.html'], /錯題重練/);
  assert.match(source['free.html'], /弱點分析與錯題重練/);
  for (const file of ['index.html', 'pricing.html', 'free.html', 'checkout.html']) {
    assert.doesNotMatch(source[file], /lin\.ee|每日 LINE|加入 LINE|LINE Bot 法條推播/, `${file} still promotes LINE as a primary funnel`);
  }
});
