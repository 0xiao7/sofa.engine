import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../notes.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');

test('notes article links preserve sub-article numbers for dashboard deep links', () => {
  const start = active.indexOf('function artNum');
  const end = active.indexOf('function render', start);
  assert.ok(start >= 0 && end > start, 'notes helpers should be extractable');
  const helpers = vm.runInNewContext(`${active.slice(start, end)};({artNum})`);

  assert.equal(helpers.artNum('第13條之1'), '13之1');
  assert.equal(helpers.artNum('第十三條之一'), '十三之一');
  assert.equal(helpers.artNum('43之3'), '43之3');
});

test('notes page sends both law and article to dashboard instead of only opening a generic search', () => {
  assert.match(active, /dashboard\.html\?open=/);
  assert.match(active, /&law=/);
  assert.match(active, /&art=/);
  assert.match(active, /encodeURIComponent\(num\)/);
});
