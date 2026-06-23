import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);

function read(name) {
  return readFileSync(new URL(name, root), 'utf8');
}

function loadData() {
  const source = read('law-updates-data.js');
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: 'law-updates-data.js' });
  return sandbox.window.SOFA_LAW_UPDATES;
}

test('public law updates data exists and exposes required top-level shape', () => {
  const data = loadData();
  assert.equal(typeof data.lastChecked, 'string');
  assert.match(data.lastChecked, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Array.isArray(data.records));
  assert.ok(data.records.length >= 3);
});

test('each public law update record has the curated fields only', () => {
  const allowedImpact = new Set(['high', 'medium', 'low', 'watch']);
  const allowedStatus = new Set(['synced', 'analysis_updated', 'exam_review', 'watching', 'not_relevant']);
  const forbiddenKeys = new Set(['task_id', 'run_id', 'monitor_task_id', 'monitor_run_id', 'notion_page_id', 'supabase_id', 'admin_note']);
  const data = loadData();

  for (const record of data.records) {
    for (const key of ['id', 'law', 'examCategories', 'governmentDate', 'detectedDate', 'impact', 'status', 'summary', 'studyAction', 'sourceLabel']) {
      assert.ok(record[key], `${record.id || '<missing id>'} missing ${key}`);
    }
    assert.ok(Array.isArray(record.examCategories), `${record.id} examCategories must be an array`);
    assert.ok(record.examCategories.length > 0, `${record.id} needs at least one exam category`);
    assert.ok(allowedImpact.has(record.impact), `${record.id} invalid impact ${record.impact}`);
    assert.ok(allowedStatus.has(record.status), `${record.id} invalid status ${record.status}`);
    for (const forbidden of forbiddenKeys) {
      assert.equal(Object.hasOwn(record, forbidden), false, `${record.id} leaks ${forbidden}`);
    }
  }
});

test('public page does not call internal monitor endpoints or use monitor key', () => {
  const page = read('law-updates.html');
  assert.doesNotMatch(page, /\/api\/monitor/);
  assert.doesNotMatch(page, /X-Monitor-Key/);
  assert.doesNotMatch(page, /MONITOR_SECRET/);
  assert.match(page, /law-updates-data\.js/);
});

test('sitemap exposes law updates but not internal law monitor', () => {
  const sitemap = read('sitemap.xml');
  assert.match(sitemap, /law-updates\.html/);
  assert.doesNotMatch(sitemap, /law-monitor\.html/);
});
