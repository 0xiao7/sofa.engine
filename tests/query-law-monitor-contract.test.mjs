import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

function html(name) {
  return readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
}

test('dashboard, fill, and quiz all honor ?law= landing funnels', () => {
  const dashboard = html('dashboard.html');
  const fill = html('fill.html');
  const quiz = html('quiz.html');

  assert.match(dashboard, /function\s+_handleUrlLaw\(/);
  assert.match(fill, /function\s+_handleUrlLaw\(/);
  assert.match(quiz, /function\s+_handleUrlLaw\(/);

  assert.match(fill, /new URLSearchParams\(window\.location\.search\)/);
  assert.match(fill, /decodeURIComponent\(law\)/);
  assert.match(fill, /loadNew\(\)/);
  assert.match(fill, /if\(new URLSearchParams\(window\.location\.search\)\.get\('law'\)\)return;/);

  assert.match(quiz, /new URLSearchParams\(window\.location\.search\)/);
  assert.match(quiz, /decodeURIComponent\(law\)/);
  assert.match(quiz, /loadQuiz\(\)/);
});

test('law monitor shows an actionable state instead of leaving the task list loading on 403', () => {
  const monitor = html('law-monitor.html');

  assert.match(monitor, /function\s+renderTaskListError\(/);
  assert.match(monitor, /MONITOR_SECRET 未設定|管理金鑰|暫時無法載入查核任務/);
  assert.match(monitor, /loadTasks\(\)[\s\S]*renderTaskListError\(e\)/);
});
