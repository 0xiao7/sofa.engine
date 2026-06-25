import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../quiz.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');

test('weakness entry opens a clearly titled weakness analysis panel', () => {
  assert.match(active, /id="stats-panel-title"/);
  assert.match(active, /弱點與錯題/);
  assert.match(active, /function _statsPanelTitle/);
  assert.match(active, /弱點分析/);
  assert.match(active, /_openParam === 'wrong'[\s\S]*_openWeakness\(\)/);
  assert.doesNotMatch(active, /_openParam === 'wrong'[\s\S]*btnWrong[\s\S]*click\(\)/);
});

test('weakness list uses harmonized card classes and explicit next actions', () => {
  assert.match(active, /\.weak-panel-guide/);
  assert.match(active, /\.weak-card/);
  assert.match(active, /\.weak-action-primary/);
  assert.match(active, /這裡先看最常錯的法規/);
  assert.match(active, /看結果/);
  assert.match(active, /開始重練/);
});

test('empty weakness state tells the learner what to do without self-judging', () => {
  assert.match(active, /不用自己判斷哪裡弱/);
  assert.match(active, /先做 5 題/);
  assert.match(active, /weak-action-primary[\s\S]*startSession\(5\)/);
  assert.match(active, /系統會用你的答題紀錄整理/);
});

test('weakness panel avoids showing a zero wrong-bank card above law weaknesses', () => {
  const fnStart = active.indexOf('function _renderWrongList');
  const fnEnd = active.indexOf('function _drillAllWrong', fnStart);
  assert.ok(fnStart >= 0 && fnEnd > fnStart, '_renderWrongList must exist');
  const fn = active.slice(fnStart, fnEnd);
  const gate = fn.indexOf('if(bank.length)');
  const card = fn.indexOf('考古題錯題', gate);
  assert.ok(gate >= 0 && card > gate, 'wrong-bank card should be gated by bank.length');
});
