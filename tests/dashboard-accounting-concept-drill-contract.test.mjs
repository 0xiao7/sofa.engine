import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');

function functionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const next = source.indexOf('\nfunction ', start + 10);
  return source.slice(start, next === -1 ? source.length : next);
}

test('dashboard links classified accounting weaknesses to exact concept drills', () => {
  const list = { innerHTML: '' };
  const context = {
    document: { getElementById: id => id === 'study-weak-brief-list' ? list : null },
    _latestSubjectWeaknessItems: [],
    esc: value => String(value),
    encodeURIComponent,
    scheduleActiveNavRefresh() {},
  };
  vm.runInNewContext(`${functionSource('renderStudyWeakBrief')}; this.renderStudyWeakBrief = renderStudyWeakBrief;`, context);
  context.renderStudyWeakBrief([], [{
    subject: '會計學概要',
    wrong_count: 5,
    concepts: [
      { concept_key: 'ACC-ASSET-INVENTORY', label: '資產｜存貨', wrong_count: 3 },
      { concept_key: 'unclassified', label: '未分類', wrong_count: 2 },
    ],
  }]);

  assert.match(list.innerHTML, /資產｜存貨/);
  assert.match(list.innerHTML, /concept_key=ACC-ASSET-INVENTORY/);
  assert.match(list.innerHTML, /未分類/);
  const unclassifiedLink = list.innerHTML.match(/<a[^>]+>\s*<b>未分類<\/b>/)?.[0] || '';
  assert.doesNotMatch(unclassifiedLink, /concept_key=/);
});

test('dashboard caps accounting concept rows at three', () => {
  const fn = functionSource('renderStudyWeakBrief');
  assert.match(fn, /concepts/);
  assert.match(fn, /slice\(0,3\)/);
});
