import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../quiz.html', import.meta.url), 'utf8');

function functionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  const asyncStart = source.indexOf(`async function ${name}(`);
  const realStart = start === -1 ? asyncStart : (asyncStart === -1 ? start : Math.min(start, asyncStart));
  assert.notEqual(realStart, -1, `${name} must exist`);
  const nextFunction = source.indexOf('\nfunction ', realStart + 10);
  const nextAsync = source.indexOf('\nasync function ', realStart + 10);
  const ends = [nextFunction, nextAsync].filter(index => index !== -1);
  return source.slice(realStart, ends.length ? Math.min(...ends) : source.length);
}

test('quiz restores and forwards accounting concept key', () => {
  assert.match(source, /let _pastExamConceptKey = _searchParams\.get\('concept_key'\) \|\| ''/);
  const fetchFn = functionSource('_fetchPastExamQuestion');
  assert.match(fetchFn, /concept_key=/);
  assert.match(fetchFn, /encodeURIComponent\(_pastExamConceptKey\)/);
});

test('quiz shows a visible server-supplied concept label', () => {
  assert.match(source, /id="pastExamConceptState"/);
  assert.match(source, /章節專練｜/);
  const normalizeFn = functionSource('_normalizePastExamQuestion');
  assert.match(normalizeFn, /_past_exam_concept_label/);
});

test('changing away from accounting removes the concept filter', () => {
  const persistFn = functionSource('_persistPastExamSelection');
  assert.match(persistFn, /subject !== '會計學概要'/);
  assert.match(persistFn, /_pastExamConceptKey = ''/);
  assert.match(persistFn, /searchParams\.delete\('concept_key'\)/);
});

test('known empty concept keeps the exact honest error', () => {
  assert.match(source, /找不到此章可追蹤的考古題/);
});
