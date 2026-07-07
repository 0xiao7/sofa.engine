import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pricing = readFileSync(new URL('../pricing.html', import.meta.url), 'utf8');
const free = readFileSync(new URL('../free.html', import.meta.url), 'utf8');
const login = readFileSync(new URL('../login.html', import.meta.url), 'utf8');
const quiz = readFileSync(new URL('../quiz.html', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');

test('homepage and free entry send candidates directly into practice', () => {
  assert.match(index, /href="quiz\.html\?free=1&start=1&utm_source=home&utm_medium=plan_card&utm_campaign=home_free_quiz_entry"/);
  assert.doesNotMatch(index, /href="dashboard\.html" class="btn btn-primary plan-cta alt"/);
  assert.match(free, /href="\/practice\.html\?free=1&utm_source=free&utm_medium=hero&utm_campaign=free_practice_entry"/);
  assert.match(free, /href="\/pricing\.html\?utm_source=free&utm_medium=hero&utm_campaign=free_to_pricing"/);
  assert.doesNotMatch(free, /了解更多功能/);
});

test('pricing and login labels describe the exact action', () => {
  assert.match(pricing, />升級到考日<\/a>/);
  assert.match(pricing, /依你的考試目標設定期限/);
  assert.match(pricing, /依你設定的考試目標用到考後緩衝日/);
  assert.match(pricing, /依保存紀錄整理常錯法規、答對率與回頭補的順序/);
  assert.match(pricing, /把答錯、標記與需要複習的題目收回同一個入口/);
  assert.doesNotMatch(pricing, /近年修法重點直接對應到條文/);
  assert.doesNotMatch(pricing, /一條法規引用哪些其他條文/);
  assert.match(login, /用序號登入/);
  assert.doesNotMatch(login, />\s*開始備考\s*<span class="arrow">/);
});

test('quiz surfaces learner-safe service errors instead of backend internals', () => {
  assert.match(quiz, /function formatQuizLoadErrorMessage/);
  assert.match(quiz, /Resource temporarily unavailable/);
  assert.match(quiz, /考古題服務暫時不可用，請稍後再試/);
  assert.doesNotMatch(quiz, /questionBox'\)\.textContent=data\.error\|\|data\.detail/);
  assert.doesNotMatch(quiz, /questionBox"\)\.textContent=data\.error\|\|data\.detail/);
});

test('weakness and wrong-book buttons do not point to unhandled quiz open params', () => {
  assert.match(index, /href="dashboard\.html#weak-laws-recap"/);
  assert.match(quiz, /href="dashboard\.html#weak-laws-recap"/);
  assert.match(dashboard, /href="#weak-laws-recap"/);
  assert.match(dashboard, /href="#review"/);
  assert.doesNotMatch(index + dashboard, /quiz\.html\?open=(weakness|wrong)/);
});
