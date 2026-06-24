import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

// 從 dashboard.html 取出 reviewReasonChips 函式，於沙箱中驗證邏輯
function loadReviewReasonChips() {
  const html = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');
  const marker = 'function reviewReasonChips(';
  const start = html.indexOf(marker);
  assert.notEqual(start, -1, 'dashboard.html should define reviewReasonChips');
  const open = html.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < html.length; i += 1) {
    if (html[i] === '{') depth += 1;
    if (html[i] === '}') depth -= 1;
    if (depth === 0) { end = i + 1; break; }
  }
  assert.notEqual(end, -1, 'reviewReasonChips function should close');
  const source = html.slice(start, end);
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${source}; this.reviewReasonChips = reviewReasonChips;`, context);
  return context.reviewReasonChips;
}

// chips 來自 vm realm，用 JSON 字串比較避免跨 realm 的參考不等
const labels = (chips) => JSON.stringify(chips.map((c) => c.label));
const types = (chips) => JSON.stringify(chips.map((c) => c.type));
const json = (v) => JSON.stringify(v);

test('importance >= 3 顯示高價值 chip', () => {
  const chips = loadReviewReasonChips();
  assert.equal(types(chips({ importance: 3 })), json(['value']));
  assert.equal(labels(chips({ importance: 5 })), json(['高價值']));
  // importance < 3 不顯示
  assert.equal(json(chips({ importance: 2 })), json([]));
});

test('overdue_days > 0 顯示逾期 N 天 chip', () => {
  const chips = loadReviewReasonChips();
  assert.equal(labels(chips({ overdue_days: 5 })), json(['逾期 5 天']));
  assert.equal(types(chips({ overdue_days: 1 })), json(['overdue']));
  // 0 或缺值不顯示
  assert.equal(json(chips({ overdue_days: 0 })), json([]));
});

test('wrong_count > 0 顯示錯 N 次 chip', () => {
  const chips = loadReviewReasonChips();
  assert.equal(labels(chips({ wrong_count: 3 })), json(['錯 3 次']));
  assert.equal(types(chips({ wrong_count: 1 })), json(['weak']));
  assert.equal(json(chips({ wrong_count: 0 })), json([]));
});

test('沒有 wrong_count 時由 attempt_count - correct_count 推導', () => {
  const chips = loadReviewReasonChips();
  assert.equal(labels(chips({ attempt_count: 5, correct_count: 2 })), json(['錯 3 次']));
  // 全對不顯示弱點
  assert.equal(json(chips({ attempt_count: 4, correct_count: 4 })), json([]));
});

test('沒資料時回傳空陣列，不 fake 數字', () => {
  const chips = loadReviewReasonChips();
  assert.equal(json(chips({})), json([]));
  assert.equal(json(chips(undefined)), json([]));
  assert.equal(json(chips({ importance: 0, overdue_days: 0, wrong_count: 0 })), json([]));
});

test('三類 chip 可同時出現且順序為 高價值 → 逾期 → 弱點', () => {
  const chips = loadReviewReasonChips();
  const all = chips({ importance: 4, overdue_days: 2, wrong_count: 3 });
  assert.equal(types(all), json(['value', 'overdue', 'weak']));
  assert.equal(labels(all), json(['高價值', '逾期 2 天', '錯 3 次']));
});
