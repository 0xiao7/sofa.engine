import { existsSync, readFileSync } from 'node:fs';
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

function publicTextValues(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(publicTextValues);
  if (value && typeof value === 'object') return Object.values(value).flatMap(publicTextValues);
  return [];
}

function loadInlinePageScript(records = []) {
  const page = read('law-updates.html');
  const [, inlineScript] = page.match(/<script>\n([\s\S]*)\n<\/script>\n<\/body>/) || [];
  assert.ok(inlineScript, 'inline page script must be present');

  const elements = new Map();
  const element = () => ({
    textContent: '',
    innerHTML: '',
    className: '',
    type: '',
    setAttribute() {},
    addEventListener() {},
    replaceChildren() {},
  });
  const sandbox = {
    window: {},
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, element());
        return elements.get(id);
      },
      createElement: element,
      addEventListener() {},
    },
  };
  sandbox.window.SOFA_LAW_UPDATES = { lastChecked: '2026-06-23', method: [], records };
  vm.runInNewContext(inlineScript, sandbox, { filename: 'law-updates.html' });
  return sandbox;
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

test('high impact public records include click-through detail copy', () => {
  const data = loadData();
  const highImpactRecords = data.records.filter((record) => record.impact === 'high');
  assert.ok(highImpactRecords.length > 0, 'needs high impact records to explain');

  for (const record of highImpactRecords) {
    for (const key of ['officialExcerpt', 'changeBefore', 'changeAfter', 'whyItMatters', 'sofaAction']) {
      assert.equal(typeof record[key], 'string', `${record.id} missing ${key}`);
      assert.ok(record[key].length >= 8, `${record.id} ${key} is too terse`);
    }
  }
});

test('public page offers a clickable detail view for law update differences', () => {
  const page = read('law-updates.html');
  assert.match(page, /id="detailDialog"/);
  assert.match(page, /function openDetail/);
  assert.match(page, /data-detail-id/);
  assert.match(page, /查看差異/);
  assert.match(page, /改了什麼/);
});

test('public page keeps user navigation and avoids implying a complete exam list', () => {
  const page = read('law-updates.html');
  assert.match(page, /href="dashboard\.html"/);
  assert.match(page, /儀表板/);
  assert.match(page, /涉及範圍/);
  assert.doesNotMatch(page, /涉及考科/);
});

test('homepage visibly signals law update care and links to public records', () => {
  const homepage = read('index.html');
  assert.match(homepage, /law-updates\.html/);
  assert.match(homepage, /法規更新紀錄/);
  assert.match(homepage, /修法|法規更新|近期異動/);
});

test('public law update surfaces include caveats for new-law uncertainty', () => {
  const page = read('law-updates.html');
  const homepage = read('index.html');
  for (const source of [page, homepage]) {
    assert.match(source, /官方原文為準/);
    assert.match(source, /非法律意見/);
    assert.match(source, /函釋|過渡規定|實務見解|命題口徑/);
  }
});

test('public law update copy avoids internal implementation labels', () => {
  const data = loadData();
  const publicText = publicTextValues(data).join('\n');
  assert.doesNotMatch(publicText, /\banswer_conflict\b/i);
  assert.doesNotMatch(publicText, /\bmonitor_(task|run|secret)\b/i);
  assert.doesNotMatch(publicText, /\b(notion|supabase)[_-]?(page|row|id)?\b/i);
});

test('default ordering prioritizes exam impact before watch-only recency', () => {
  const sandbox = loadInlinePageScript([
    {
      id: 'new-watch',
      law: '觀察法',
      examCategories: ['其他追蹤中'],
      governmentDate: '2026-06-23',
      detectedDate: '2026-06-23',
      impact: 'watch',
      status: 'watching',
      summary: 'watch',
      studyAction: 'watch',
      sourceLabel: 'source',
    },
    {
      id: 'old-high-review',
      law: '高影響法',
      examCategories: ['記帳士'],
      governmentDate: '2024-01-01',
      detectedDate: '2026-06-22',
      impact: 'high',
      status: 'exam_review',
      summary: 'high',
      studyAction: 'high',
      sourceLabel: 'source',
    },
  ]);

  const ordered = sandbox.sortRecords(sandbox.window.SOFA_LAW_UPDATES.records);
  assert.equal(ordered[0].id, 'old-high-review');
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

test('internal law monitor is not published from the public site root', () => {
  assert.equal(existsSync(new URL('law-monitor.html', root)), false);
});
