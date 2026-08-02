import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../quiz.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`${name} function did not close`);
}

test('mobile set map cards expand with every question instead of clipping after four', () => {
  const mediaStart = active.indexOf('@media (max-width:760px)');
  assert.ok(mediaStart >= 0, 'mobile media query must exist');
  const media = active.slice(mediaStart, mediaStart + 6200);
  assert.match(media, /\.rail-card\{[^}]*flex:none[^}]*width:100%[^}]*min-width:0/);
});

test('set map and previous control can reopen answered questions', () => {
  assert.match(active, /id="btnPrev"/);
  const map = extractFunction(active, 'rebuildSetMap');
  assert.match(map, /data-question-num/);
  assert.match(map, /addEventListener\('click'/);
  assert.match(map, /showSessionQuestion/);
  assert.match(active, /document\.getElementById\('btnPrev'\)\.addEventListener\('click'/);
});

test('loading or reopening a question places its heading below the fixed mobile header', () => {
  assert.match(active, /\.q-head\{[^}]*scroll-margin-top:calc\(var\(--tool-topbar-offset\) \+ 16px\)/);
  const focus = extractFunction(active, 'focusCurrentQuestion');
  assert.match(focus, /scrollIntoView\(\{block:'start', behavior:'auto'\}\)/);
  assert.match(active, /focusCurrentQuestion\(\)/);
});

test('past-exam question stem hides duplicated source year and number', () => {
  const strip = extractFunction(active, 'stripPastExamSourcePrefix');
  const { stripPastExamSourcePrefix } = vm.runInNewContext(`${strip};({stripPastExamSourcePrefix})`);

  assert.equal(
    stripPastExamSourcePrefix('【歷屆試題】 110 年第 22 題 有關稅捐核課期間之敘述'),
    '有關稅捐核課期間之敘述',
  );
  assert.equal(
    stripPastExamSourcePrefix('【歷屆試題】112 年第 43 題\n依加值型及非加值型營業稅法規定'),
    '依加值型及非加值型營業稅法規定',
  );
  assert.equal(stripPastExamSourcePrefix('一般法規題幹'), '一般法規題幹');
});
