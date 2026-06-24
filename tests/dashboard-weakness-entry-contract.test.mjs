import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');

test('dashboard 待複習區提供「重練弱點」入口，指向 quiz.html?open=weakness', () => {
  // 入口存在且連到弱點重練頁
  assert.match(html, /id="review-weakness-entry"/);
  assert.match(
    html,
    /<a id="review-weakness-entry" href="quiz\.html\?open=weakness">/,
    '弱點入口必須是直接連到 quiz.html?open=weakness 的連結'
  );

  // 入口位於「待複習」區塊的標題列（#review-head-r）內
  const reviewHead = html.match(/<div class="r" id="review-head-r">[\s\S]*?<\/div>/);
  assert.ok(reviewHead, '待複習標題列 #review-head-r 必須存在');
  assert.match(reviewHead[0], /id="review-weakness-entry"/);
});

test('入口 copy 清楚表達是錯題 / 弱點重練', () => {
  const entry = html.match(/<a id="review-weakness-entry"[\s\S]*?<\/a>/);
  assert.ok(entry, '弱點入口連結必須存在');
  const text = entry[0];
  assert.match(text, /重練/, 'copy 要包含「重練」');
  assert.match(text, /錯題|弱點/, 'copy 要點明錯題或弱點');
});

test('入口不引入新的 DB / API，也不改 quiz 邏輯（純連結導頁）', () => {
  const entry = html.match(/<a id="review-weakness-entry"[\s\S]*?<\/a>/)[0];
  // 只是 <a href>，不含 onclick / fetch / api 呼叫
  assert.doesNotMatch(entry, /onclick|fetch\(|\/api\//);
});

test('手機版入口不會遮擋或溢出（允許換行、限制寬度）', () => {
  // 標題列容器允許 flex 換行並限制最大寬度，避免在窄螢幕溢出
  const cssBlock = html.match(/#review-head-r\{[\s\S]*?\}/);
  assert.ok(cssBlock, '#review-head-r 樣式必須存在');
  assert.match(cssBlock[0], /flex-wrap:\s*wrap/);
  assert.match(cssBlock[0], /max-width:\s*100%/);
});
