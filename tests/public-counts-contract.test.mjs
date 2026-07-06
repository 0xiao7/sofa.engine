import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const files = ['index.html', 'dashboard.html', 'login.html', 'checkout.html', 'free.html', 'pricing.html', 'terms.html', 'quiz.html', 'law-preview.html', 'fill.html', 'practice.html'];
const source = Object.fromEntries(files.map((file) => [
  file,
  readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->/g, ''),
]));
const compassWidget = readFileSync(new URL('../compass-widget.js', import.meta.url), 'utf8');

test('public candidate funnel avoids unstable inventory counts as proof', () => {
  const publicFunnelFiles = ['index.html', 'login.html', 'checkout.html', 'free.html', 'pricing.html', 'terms.html'];
  for (const file of publicFunnelFiles) {
    assert.doesNotMatch(source[file], /566\s*(?:部|<\/|<span|STATUTES|部法規|部法典)/, `${file} still shows stale 566 law count`);
    assert.doesNotMatch(source[file], /14,000\+ 條(?:文|法規)|145 部(?:法規|法典)|567 部(?:法規|法典)|36,000\+ 條文?/, `${file} still sells unstable law inventory scale`);
    assert.doesNotMatch(source[file], /33 部(?:法規|法典)|2,000\+ 條(?:文|法規)?|172 個國考職能|172 職能/, `${file} still sells stale candidate inventory scale`);
  }
});

test('public growth funnel leads with web practice and saved learning value', () => {
  assert.match(source['index.html'], /開始練習/);
  assert.match(source['index.html'], /href="quiz\.html\?free=1&start=1&utm_source=site&utm_medium=web&utm_campaign=free_quiz_entry"/);
  assert.match(source['pricing.html'], /保留答題紀錄/);
  assert.match(source['pricing.html'], /弱點分析/);
  assert.match(source['pricing.html'], /錯題重練/);
  assert.match(source['quiz.html'], /輸入序號保留紀錄/);
  assert.match(source['free.html'], /弱點分析與錯題重練/);
  assert.match(source['checkout.html'], /綠界付款/);
  assert.match(source['checkout.html'], /不用重填資料/);
  assert.doesNotMatch(source['checkout.html'], /3 種練習 \+ 弱點分析/);
  for (const file of ['index.html', 'pricing.html', 'free.html', 'checkout.html']) {
    assert.doesNotMatch(source[file], /lin\.ee|每日 LINE|加入 LINE|LINE Bot 法條推播/, `${file} still promotes LINE as a primary funnel`);
    assert.doesNotMatch(source[file], /LEARNING LOOP|mode-code">WEAK|4 種練習模式[\s\S]{0,60}弱點分析/, `${file} uses off-brand or inaccurate funnel labels`);
  }
});

test('public free mode copy distinguishes practice from saved records', () => {
  for (const file of ['index.html', 'pricing.html', 'quiz.html', 'login.html', 'law-preview.html', 'fill.html', 'practice.html']) {
    assert.doesNotMatch(source[file], /免費做 5 題|先刷 5 題|先做 5 題看弱點|先練 5 題|免費刷題看弱點|免費做題，看弱點|先免費做題|開始免費做題/, `${file} implies a five-question free limit or ad-style promise`);
  }
  assert.match(source['index.html'], /免登入可練習；啟用後保留紀錄/);
  assert.match(source['pricing.html'], /§1 免登入練習/);
  assert.match(source['pricing.html'], /§2 完整答題紀錄/);
  assert.match(source['pricing.html'], /升級後跨裝置保存/);
  assert.match(source['pricing.html'], /免費模式是免登入練習；完整答題紀錄、累積弱點分析、錯題重練與跨裝置複習，啟用後才保留/);
  assert.match(
    source['pricing.html'],
    /免費方案[\s\S]{0,520}<span class="ck-yes">✓<\/span>[\s\S]{0,220}<span class="ck-no">—<\/span>[\s\S]{0,220}<span class="ck-no">—<\/span>[\s\S]{0,220}<span class="ck-no">—<\/span>/,
    'free pricing column should allow practice but not claim saved records, accumulated weakness analysis, or wrong-question recovery',
  );
  assert.match(source['pricing.html'], /data-feature="免登入練習"[\s\S]{0,80}<span class="ck-yes">✓<\/span>/);
  assert.match(source['pricing.html'], /data-feature="完整答題紀錄"[\s\S]{0,80}<span class="ck-no">—<\/span>/);
  assert.match(source['quiz.html'], /免費版 · 免登入可練習，答題紀錄不會儲存/);
  assert.match(source['fill.html'], /免費版 · 免登入可練習，練習紀錄不會儲存/);
  assert.match(source['practice.html'], /免費版 · 免登入可練習，練習紀錄不會儲存/);
  assert.match(source['login.html'], /免登入練習/);
  assert.doesNotMatch(source['quiz.html'], /選擇題範圍有限/);
  assert.doesNotMatch(source['fill.html'], /填空範圍有限/);
  assert.doesNotMatch(source['practice.html'], /法條內容有限制/);
});

test('homepage keeps SoFa broader than one exam category', () => {
  assert.match(source['index.html'], /國考與專技備考系統｜法規、題目、錯題與弱點整理/);
  assert.match(source['index.html'], /免登入可練習；啟用後保留紀錄/);
  assert.match(source['index.html'], /國考與專技備考 · 法規、題目、弱點整理/);
  assert.match(source['index.html'], /法規備考，/);
  assert.match(source['index.html'], /把條文、題目、錯題/);
  assert.match(source['index.html'], /整理成<em>下一步<\/em>/);
  assert.match(source['index.html'], /免登入也可以直接練習/);
  assert.match(source['index.html'], /完整答題紀錄、錯題重練與跨裝置複習/);
  assert.match(source['index.html'], /記帳士、地政士等專技考科只是其中幾條主線/);
  assert.doesNotMatch(source['index.html'], /172 個國考職能|172 職能/);
  assert.match(source['index.html'], /記帳士、地政士等專技考科只是其中幾條主線/);
  assert.match(source['index.html'], /開始練習/);
  assert.doesNotMatch(source['index.html'].slice(0, source['index.html'].indexOf('<section class="hero"')), /記帳士備考系統|記帳士考古題刷題/);
  assert.doesNotMatch(source['index.html'], /免費做 5 題|先刷 5 題|免費刷題看弱點/);
  assert.ok(
    source['index.html'].indexOf('class="cta-row"') < source['index.html'].indexOf('class="hero-meta"'),
    'primary CTA should appear before broad database stats in the hero markup',
  );
});

test('homepage target personalization does not reintroduce law-count proof', () => {
  assert.doesNotMatch(source['index.html'], /p\.articles\s*\+[\s\S]{0,80}(條|部法規)/);
  assert.doesNotMatch(source['index.html'], /p\.laws\s*\+[\s\S]{0,80}(部|整套法規)/);
});

test('homepage compass widget does not expose law-count proof in public copy', () => {
  assert.doesNotMatch(compassWidget, /要準備[\s\S]{0,80}部法規/);
  assert.doesNotMatch(compassWidget, /部法規重複|已會[\s\S]{0,60}部,還缺[\s\S]{0,60}部/);
});
