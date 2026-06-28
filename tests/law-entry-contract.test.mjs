import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const practice = readFileSync(new URL('../practice.html', import.meta.url), 'utf8');
const preview = readFileSync(new URL('../law-preview.html', import.meta.url), 'utf8');

test('practice full article action deep-links to the dashboard article drawer', () => {
  assert.match(practice, /id="prSourceLink"[\s\S]*href="dashboard\.html#search"/);
  assert.match(practice, /function _practiceArticleHref/);
  assert.match(practice, /u\.searchParams\.set\('open', _prArtId\)/);
  assert.match(practice, /searchParams\.set\('law', law\)/);
  assert.match(practice, /searchParams\.set\('art', art\)/);
  assert.match(practice, /searchParams\.set\('q', law\)/);
  assert.match(practice, /btn\.href = _practiceArticleHref\(\)/);
  assert.doesNotMatch(practice, /btn\.addEventListener\('click',\(\)=>\{[\s\S]*prArtInline/);
});

test('law preview accepts common article deep-link aliases', () => {
  assert.match(preview, /const targetId = params\.get\('id'\) \|\| params\.get\('articleId'\)/);
  assert.match(preview, /const targetArticleNo = params\.get\('art'\) \|\| params\.get\('article'\)/);
  assert.match(preview, /function normalizeArticleNo/);
  assert.match(preview, /normalizeArticleNo\(a\.title\) === normalizedTargetArticle/);
  assert.match(preview, /const firstId = targetId && articlesCache\.find\(a => a\.id === targetId\)/);
});
