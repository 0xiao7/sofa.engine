import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../fill.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');

test('fill page starts with a clear start action then switches to next article', () => {
  assert.match(active, /id="btnNext"[^>]*>開始填空<\/button>/);
  assert.match(active, /選擇法規後點「開始填空」開始/);

  const loadNewStart = active.indexOf('async function loadNew');
  assert.ok(loadNewStart >= 0, 'loadNew must exist');
  const loadNewEnd = active.indexOf("document.getElementById('hintFirst')", loadNewStart);
  assert.ok(loadNewEnd > loadNewStart, 'hint handlers should follow loadNew');
  const loadNewBody = active.slice(loadNewStart, loadNewEnd);
  assert.match(loadNewBody, /getElementById\('btnNext'\)\.textContent\s*=\s*'下一篇'/);
});

test('fill session wording uses article counts instead of question counts', () => {
  const modalStart = active.indexOf('id="fillSessionModal"');
  assert.ok(modalStart >= 0, 'fill session modal must exist');
  const modal = active.slice(modalStart, active.indexOf('</body>', modalStart));
  assert.match(modal, />選擇篇數</);
  assert.doesNotMatch(modal, /選擇題數/);
});

test('fill auto advance remains perfect-only so wrong answers stay for correction', () => {
  const checkStart = active.indexOf('function checkAnswers');
  assert.ok(checkStart >= 0, 'checkAnswers must exist');
  const checkEnd = active.indexOf('function loadNew', checkStart);
  assert.ok(checkEnd > checkStart, 'loadNew should follow checkAnswers');
  const checkAnswers = active.slice(checkStart, checkEnd);
  assert.match(checkAnswers, /if\(cor === inputs\.length && inputs\.length > 0\)/);
  assert.match(checkAnswers, /loadNew\(\)/);

  const keyStart = active.indexOf('function _fillKeyHandler');
  assert.ok(keyStart >= 0, '_fillKeyHandler must exist');
  const keyEnd = active.indexOf('document.addEventListener', keyStart);
  const keyHandler = active.slice(keyStart, keyEnd);
  assert.match(keyHandler, /if \(_lastFillPerfect\) document\.getElementById\('btnNext'\)\?\.click\(\)/);
});

test('fill answer sections show loading and fallback instead of blank panel', () => {
  assert.match(active, /function showFillSectionsLoading/);
  assert.match(active, /function renderFillSections/);
  assert.match(active, /條文解析載入中/);
  assert.match(active, /這條暫時沒有解析/);

  const checkStart = active.indexOf('function checkAnswers');
  const checkEnd = active.indexOf('function loadNew', checkStart);
  const checkAnswers = active.slice(checkStart, checkEnd);
  assert.match(checkAnswers, /showFillSectionsLoading\(panel\)/);
  assert.match(checkAnswers, /renderFillSections\(panel,\s*art\.sections\|\|\{\},\s*art\._plan!=='free'\)/);
  assert.match(checkAnswers, /renderFillSections\(panel,\s*\{\},\s*true\)/);
});
