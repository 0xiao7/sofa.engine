import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const essay = readFileSync(new URL('../essay.html', import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const dashboard = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->/g, '');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`${name} function did not close`);
}

test('dashboard exposes essay analyses as a separate non-official reference path', () => {
  const start = dashboard.indexOf('申論參考解析');
  assert.ok(start > -1, 'dashboard must expose essay analyses');
  const card = dashboard.slice(Math.max(0, start - 260), start + 360);

  assert.match(card, /href="essay\.html"/);
  assert.match(card, /ESSAY/);
  assert.match(card, /只看人工發布解析/);
  assert.match(card, /非官方標準答案/);
  assert.doesNotMatch(card, /quiz\.html\?mode=past-exam/);
});

test('essay page only renders published SoFa reference analyses', () => {
  assert.match(essay, /申論參考解析/);
  assert.match(essay, /SoFa Engine 參考解析/);
  assert.match(essay, /非考選部官方標準答案/);
  assert.match(essay, /整理完成的 SoFa Engine 參考解析/);
  assert.match(essay, /未完成的內容不會放到公開頁面/);
  assert.doesNotMatch(essay, /manual_review_required|Fay \/ 人工 review|published 解析|草稿/);
  assert.match(essay, /\/api\/essay-analyses/);
  assert.match(essay, /item\.review_status === 'published'/);
  assert.doesNotMatch(essay, /\/api\/admin/);
  assert.doesNotMatch(essay, /<b>考選部官方標準答案<\/b>|PUBLIC_LABEL = '考選部官方標準答案'/);
});

test('essay page keeps the long controls collapsible', () => {
  assert.match(essay, /<details class="control-panel" id="essay-control-panel">/);
  assert.match(essay, /<summary>篩選與說明<\/summary>/);
  assert.doesNotMatch(essay, /<details class="control-panel" id="essay-control-panel" open>/);
});

test('essay page preserves legal basis and answer outline without claiming official answers', () => {
  const render = extractFunction(essay, 'renderEssayAnalyses');
  const rows = extractFunction(essay, 'analysisRows');

  assert.match(render, /PUBLIC_LABEL/);
  assert.match(render, /item\.disclaimer \|\| PUBLIC_DISCLAIMER/);
  assert.match(render, /current_law_articles/);
  assert.match(rows, /issue_summary/);
  assert.match(rows, /applicable_law/);
  assert.match(rows, /answer_outline/);
  assert.match(rows, /scoring_notes/);
  assert.doesNotMatch(render, /official_answer|standard_answer/);
});
