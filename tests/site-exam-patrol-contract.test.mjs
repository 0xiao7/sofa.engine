import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const scriptUrl = new URL('../scripts/site_exam_patrol.mjs', import.meta.url);
const workflowUrl = new URL('../.github/workflows/site-exam-patrol.yml', import.meta.url);

test('patrol implementation and workflow exist', () => {
  assert.equal(existsSync(scriptUrl), true);
  assert.equal(existsSync(workflowUrl), true);
});

test('patrol covers required pages and desktop plus mobile viewports', () => {
  const source = readFileSync(scriptUrl, 'utf8');
  for (const page of [
    'index.html',
    'dashboard.html',
    'quiz.html?mode=past-exam&exam=bookkeeper',
    'exam.html?exam=bookkeeper',
    'past-exam-radar.html',
    'bookkeeper.html',
    'pricing.html',
    'checkout.html',
  ]) {
    assert.match(source, new RegExp(page.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(source, /1440[\s\S]*900/);
  assert.match(source, /390[\s\S]*844/);
});

test('patrol checks console overflow CTA exam isolation and API counts', () => {
  const source = readFileSync(scriptUrl, 'utf8');
  assert.match(source, /console/i);
  assert.match(source, /scrollWidth/);
  assert.match(source, /primaryCta/);
  assert.match(source, /exam_scope_mismatch/);
  assert.match(source, /\/api\/past-exam\/meta\?exam_key=/);
  assert.match(source, /unfinished_copy/);
});

test('patrol accepts the verified live bookkeeper accounting scope', () => {
  const source = readFileSync(scriptUrl, 'utf8');
  assert.match(source, /total:\s*708/);
  assert.match(source, /會計學概要/);
  assert.match(source, /記帳相關法規概要/);
  assert.match(source, /稅務相關法規概要/);
  assert.match(source, /years:\s*\[104,\s*105,\s*106,\s*107,\s*108,\s*109,\s*110,\s*111,\s*112,\s*113,\s*114\]/);
  assert.match(source, /exam_scope_mismatch/);
});

test('patrol report has stable incidents and never mutates production', () => {
  const source = readFileSync(scriptUrl, 'utf8');
  assert.match(source, /incidentKey/);
  assert.match(source, /expected/);
  assert.match(source, /actual/);
  assert.match(source, /severity/);
  assert.match(source, /read_only/);
  assert.match(source, /context\.route/);
  assert.match(source, /request\(\)\.method\(\)/);
  assert.match(source, /route\.abort\(\)/);
  assert.match(source, /blocked_non_get/);
  assert.doesNotMatch(source, /method:\s*['"`](POST|PUT|PATCH|DELETE)/);
});

test('scheduled workflow is read only and archives the bounded JSON report', () => {
  const workflow = readFileSync(workflowUrl, 'utf8');
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
  assert.match(workflow, /site-exam-patrol\.json/);
  assert.match(workflow, /upload-artifact/);
  assert.doesNotMatch(workflow, /git push|gh issue close|curl.+-X\s+(POST|PUT|PATCH|DELETE)/i);
});

test('patrol caps noisy page evidence as well as top-level findings', () => {
  const source = readFileSync(scriptUrl, 'utf8');
  assert.match(source, /MAX_PAGE_ERRORS/);
  assert.match(source, /MAX_SUBJECTS/);
  assert.match(source, /MAX_SUBJECT_LENGTH/);
  assert.match(source, /MAX_REPORT_BYTES/);
  assert.match(source, /consoleErrors\.length\s*<\s*MAX_PAGE_ERRORS/);
  assert.match(source, /pageErrors\.length\s*<\s*MAX_PAGE_ERRORS/);
  assert.match(source, /blockedRequests\.length\s*<\s*MAX_PAGE_ERRORS/);
  assert.match(source, /findings:\s*findings\.slice\(0,\s*200\)/);
  assert.match(source, /Buffer\.byteLength\(serialized/);
});
