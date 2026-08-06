import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const bookkeeper = readFileSync(new URL('../bookkeeper.html', import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const radar = readFileSync(new URL('../past-exam-radar.html', import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->/g, '');

test('bookkeeper public page hides unfinished subject capabilities', () => {
  assert.match(bookkeeper, /考科支援狀態/);

  for (const subject of ['會計學概要', '記帳相關法規概要', '稅務相關法規概要']) {
    assert.match(bookkeeper, new RegExp(subject), `${subject} should be visible`);
  }

  assert.match(bookkeeper, /正式可練/);
  assert.match(bookkeeper, /目前正式可用科目/);
  assert.doesNotMatch(bookkeeper, /國文|租稅申報實務|題目清單|備考清單|尚未上線|資料整理中/);
});

test('bookkeeper public page does not overclaim full replacement or guaranteed outcomes', () => {
  const riskyClaims = [
    /完全替代補習班/,
    /不用報班自己考上/,
    /自己的步調考上去/,
    /考試要的法條全部收錄/,
  ];

  for (const claim of riskyClaims) {
    assert.doesNotMatch(bookkeeper, claim);
  }

  assert.match(bookkeeper, /SoFa Engine 可作為每天的法條練習工具/);
});

test('past-exam radar separates live service count from full-subject support', () => {
  assert.match(radar, /正式可練題數/);
  assert.match(radar, /三科先行/);
  assert.match(radar, /租稅申報實務屬於申論與計算題，不放進選擇題自動判分/);
  assert.match(radar, /國文只收題目/);
  assert.match(radar, /租稅申報實務屬於申論與計算題/);
  assert.match(radar, /法規題維持法條追蹤/);
  assert.doesNotMatch(radar, /全考科已上線|記帳士全科已上線|live drift|不假造排行|全考科都已產品化|article_ids\s+\$\{articleCount\}|article_ids\s+\d/);
});
