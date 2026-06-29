import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../notes.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');

test('notes article links preserve sub-article numbers for article-reader links', () => {
  const start = active.indexOf('function artNum');
  const end = active.indexOf('function render', start);
  assert.ok(start >= 0 && end > start, 'notes helpers should be extractable');
  const helpers = vm.runInNewContext(`${active.slice(start, end)};({artNum})`);

  assert.equal(helpers.artNum('第13條之1'), '13之1');
  assert.equal(helpers.artNum('第十三條之一'), '十三之一');
  assert.equal(helpers.artNum('43之3'), '43之3');
});

test('notes page sends saved notes to the exact article reader instead of dashboard search', () => {
  assert.match(active, /law-preview\.html\?law=/);
  assert.match(active, /&id=/);
  assert.match(active, /&art=/);
  assert.match(active, /from=notes/);
  assert.match(active, /back=/);
  assert.doesNotMatch(active, /dashboard\.html\?open=/);
  assert.doesNotMatch(active, /\+ '#search'/);
  assert.match(active, /encodeURIComponent\(num\)/);
});
