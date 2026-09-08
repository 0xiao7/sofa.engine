import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const read = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const contract = JSON.parse(read('exam-plan-contract.json'));
const targetsSource = read('exam-targets.js');

test('exam contract uses one canonical broker key and current official evidence', () => {
  assert.equal(contract.timezone, 'Asia/Taipei');
  assert.equal(contract.official_checked_at, '2026-09-08');
  assert.match(contract.official_source_url, /^https:\/\/wwwc\.moex\.gov\.tw\//);
  assert.ok(contract.exam_keys.includes('real_estate_broker'));
  assert.ok(!contract.exam_keys.includes('realestate'));
  assert.equal(contract.aliases.realestate, 'real_estate_broker');
  for (const key of ['bookkeeper', 'real_estate_broker']) {
    assert.equal(contract.exams[key].exam_date, '2026-11-14');
    assert.equal(contract.exams[key].exam_end_date, '2026-11-15');
  }
  assert.equal(contract.event_window.start, '2026-11-14');
  assert.equal(contract.event_window.end, '2026-11-16');
});

test('shared exam targets normalize aliases and remove expired exams from countdown', () => {
  const storage = { getItem: () => '', setItem: () => {} };
  const sandbox = { window: { location: { search: '' }, localStorage: storage }, localStorage: storage, URLSearchParams, Date };
  vm.runInNewContext(targetsSource, sandbox);
  const api = sandbox.window.SoFaExamTargets;
  assert.equal(api.normalizeKey('realestate'), 'real_estate_broker');
  assert.equal(api.TARGETS.real_estate_broker.key, 'real_estate_broker');
  assert.deepEqual(
    [...api.activeTargets('2026-11-16T00:00:00+08:00')].map((item) => item.key),
    []
  );
  assert.match(api.sourceLabel(), /考選部/);
  assert.match(api.sourceLabel(), /2026-09-08/);
});

test('dashboard login index and share consume the shared schedule without date literals', () => {
  for (const page of ['dashboard.html', 'login.html', 'index.html', 'share.html']) {
    const html = read(page);
    assert.match(html, /exam-targets\.js\?v=20260908-canonical-schedule-v1/, page);
    assert.doesNotMatch(html, /2026-11-14T00:00:00\+08:00/, page);
  }
  const dashboard = read('dashboard.html');
  assert.doesNotMatch(dashboard, /const EXAMS = \[/);
  assert.match(dashboard, /SoFaExamTargets\.activeTargets/);
  assert.match(dashboard, /data-exam-source/);
});

test('question and room entry points use the canonical broker key', () => {
  for (const page of ['dashboard.html', 'practice.html', 'quiz.html', 'fill.html', 'room.html']) {
    const source = read(page);
    assert.match(source, /real_estate_broker/, page);
  }
  assert.doesNotMatch(read('dashboard.html'), /data-key="realestate"/);
});

