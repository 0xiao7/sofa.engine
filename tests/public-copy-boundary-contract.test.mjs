import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const publicFiles = [
  'analysis.html',
  'analysis-preview.html',
  'dashboard.html',
  'essay.html',
  'fill.html',
  'law-updates-data.js',
  'previews/地政士法_六段預覽.html',
  'previews/地政士法_六段預覽_v2.html',
  'previews/地政士法_六段預覽_v3.html',
];

function readPublic(file) {
  return readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
}

test('public pages do not expose internal review or decision language', () => {
  const banned = /Fay|manual_review_required|manual review|SCORE DRAFT|人工 review|人工複核|等正式擴充|草稿|決策/;
  for (const file of publicFiles) {
    assert.doesNotMatch(readPublic(file), banned, file);
  }
});

test('public preview and spoken-memory copy do not expose speech markup cues', () => {
  const banned = /\[重音\]|\[停頓\]/;
  for (const file of publicFiles) {
    assert.doesNotMatch(readPublic(file), banned, file);
  }
});

test('dashboard countdown does not ship stale demo day counts', () => {
  const dashboard = readPublic('dashboard.html');
  assert.match(dashboard, /<div class="cd-num">--<\/div>/);
  assert.doesNotMatch(dashboard, /<div class="cd-num">187<\/div>/);
  assert.doesNotMatch(dashboard, /備考工具<span class="ct">8<\/span>/);
});
