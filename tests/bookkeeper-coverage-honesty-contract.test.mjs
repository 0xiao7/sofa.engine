import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const bookkeeper = readFileSync(new URL('../bookkeeper.html', import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const radar = readFileSync(new URL('../past-exam-radar.html', import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->/g, '');

test('bookkeeper public page states the current support status for every exam subject', () => {
  assert.match(bookkeeper, /考科支援狀態/);

  for (const subject of ['記帳相關法規概要', '稅務相關法規概要', '會計學概要', '國文', '租稅申報實務']) {
    assert.match(bookkeeper, new RegExp(subject), `${subject} should be visible`);
  }

  assert.match(bookkeeper, /正式可練/);
  assert.match(bookkeeper, /官方答案原始整理中/);
  assert.match(bookkeeper, /只收題目/);
  assert.match(bookkeeper, /申論與計算題/);
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
  assert.match(bookkeeper, /計算題、申論與作文仍需另外準備/);
});

test('past-exam radar separates live service count from full-subject support', () => {
  assert.match(radar, /正式可練題數/);
  assert.match(radar, /兩科先行/);
  assert.match(radar, /其他考科不自動判分/);
  assert.match(radar, /國文只收題目/);
  assert.doesNotMatch(radar, /全考科已上線|記帳士全科已上線/);
});
