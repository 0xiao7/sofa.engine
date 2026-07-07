import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const stripComments = (value) => value.replace(/<!--[\s\S]*?-->/g, '');
const page = stripComments(readFileSync(new URL('../blog/bookkeeper-past-exam-law-map.html', import.meta.url), 'utf8'));
const blogIndex = stripComments(readFileSync(new URL('../blog/index.html', import.meta.url), 'utf8'));
const sitemap = stripComments(readFileSync(new URL('../sitemap.xml', import.meta.url), 'utf8'));

test('bookkeeper law map page is discoverable from blog index and sitemap', () => {
  assert.match(page, /<title>記帳士考古題與高頻法條地圖/);
  assert.match(page, /<link rel="canonical" href="https:\/\/sofaengine\.org\/blog\/bookkeeper-past-exam-law-map">/);
  assert.match(blogIndex, /href="\/blog\/bookkeeper-past-exam-law-map"/);
  assert.match(blogIndex, /所有文章 &nbsp;·&nbsp; 4 篇/);
  assert.match(sitemap, /https:\/\/sofaengine\.org\/blog\/bookkeeper-past-exam-law-map/);
});

test('bookkeeper law map keeps proof claims inside verified bookkeeper scope', () => {
  assert.match(page, /109-114 年/);
  assert.match(page, /記帳相關法規概要/);
  assert.match(page, /稅務相關法規概要/);
  assert.match(page, /580 題已重核/);
  assert.match(page, /MOEX 官方答案重核/);
  assert.match(page, /正式可練題數/);
  assert.match(page, /\/api\/past-exam\/meta/);
  assert.match(page, /會計學概要/);
  assert.match(page, /國文只收題目/);
  assert.match(page, /租稅申報實務/);
  assert.match(page, /整理中/);

  for (const riskyClaim of [
    /104-114 年(?:[\s\S]{0,24})?全部已上線/,
    /記帳士全科已上線/,
    /全部科目完整收錄/,
    /會計學概要已可自動判分/,
    /國文(?:[\s\S]{0,12})?答案/,
    /staging loader/,
    /可灌題數/,
    /每年都會考/,
    /必考/,
    /保證/,
    /穩上/,
  ]) {
    assert.doesNotMatch(page, riskyClaim);
  }
});

test('bookkeeper law map uses SoFa conversion CTAs without raw links or study room framing', () => {
  assert.match(page, /href="\/quiz\.html\?mode=past-exam&track=bookkeeper&utm_source=site&utm_medium=law_map&utm_campaign=bookkeeper_past_exam"/);
  assert.match(page, /href="\/dashboard\.html#review"/);
  assert.match(page, /查看待複習/);
  assert.match(page, /href="https:\/\/line\.me\/R\/ti\/p\/@928oakbo"/);
  assert.match(page, /免費讓你知道卡在哪/);
  assert.match(page, /啟用後保留紀錄/);
  assert.match(page, /加入 LINE 接收提醒/);

  assert.doesNotMatch(page, /room\.html|自習室|陪讀室|像素|PR99|命中率/);
  assert.doesNotMatch(page, /加入 LINE 保存弱點/);
  assert.doesNotMatch(page, /打開錯題本/);
  assert.doesNotMatch(page, />https?:\/\/[^<]+</);
});

test('bookkeeper law map keeps the existing navy and peach visual language', () => {
  assert.match(page, /--navy:\s*#1F3848/);
  assert.match(page, /--navy-3:\s*#142836/);
  assert.match(page, /--peach:\s*#E7BBA7/);
  assert.match(page, /--cream:\s*#F5F0EA/);
  assert.doesNotMatch(page, /purple|violet|#8B5CF6|#7C3AED|linear-gradient\([^)]*purple/i);
});
