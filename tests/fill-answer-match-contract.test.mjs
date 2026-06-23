import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

function extractFunction(html, name) {
  const marker = `function ${name}`;
  const start = html.indexOf(marker);
  assert.notEqual(start, -1, `fill.html should define ${name}`);
  const open = html.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < html.length; i += 1) {
    if (html[i] === '{') depth += 1;
    if (html[i] === '}') depth -= 1;
    if (depth === 0) return html.slice(start, i + 1);
  }
  assert.fail(`${name} function should close`);
}

function loadFillAnswerHelpers() {
  const html = readFileSync(new URL('../fill.html', import.meta.url), 'utf8');
  const source = [
    extractFunction(html, 'normLegalNum'),
    extractFunction(html, 'answerMatch'),
    'this.normLegalNum = normLegalNum;',
    'this.answerMatch = answerMatch;',
  ].join('\n');
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

test('fill answers accept Arabic digits for Chinese legal numerals', () => {
  const { answerMatch } = loadFillAnswerHelpers();

  assert.equal(answerMatch('2年', '二年'), true);
  assert.equal(answerMatch('30日', '三十日'), true);
  assert.equal(answerMatch('120日', '一百二十日'), true);
  assert.equal(answerMatch('1000萬元', '一千萬元'), true);
});

