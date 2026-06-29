import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const practice = readFileSync(new URL('../practice.html', import.meta.url), 'utf8');
const quiz = readFileSync(new URL('../quiz.html', import.meta.url), 'utf8');
const fill = readFileSync(new URL('../fill.html', import.meta.url), 'utf8');
const preview = readFileSync(new URL('../law-preview.html', import.meta.url), 'utf8');
const tree = readFileSync(new URL('../tree.html', import.meta.url), 'utf8');

test('practice full article action deep-links to the article reader', () => {
  assert.match(practice, /id="prSourceLink"[\s\S]*href="law-preview\.html"/);
  assert.match(practice, /id="prSourceLink"[\s\S]*開完整法條 →/);
  assert.match(practice, /function _practiceArticleHref/);
  assert.match(practice, /new URL\('law-preview\.html', location\.href\)/);
  assert.match(practice, /u\.searchParams\.set\('id', _prArtId\)/);
  assert.match(practice, /searchParams\.set\('law', law\)/);
  assert.match(practice, /searchParams\.set\('art', art\)/);
  assert.match(practice, /btn\.href = _practiceArticleHref\(\)/);
  assert.doesNotMatch(practice, /btn\.addEventListener\('click',\(\)=>\{[\s\S]*prArtInline/);
});

test('inline original text toggles are named differently from full article links', () => {
  assert.match(quiz, /id="sourceLink">展開原文 ↓<\/button>/);
  assert.match(quiz, /btn\.textContent=open\?'收起原文 ↑':'展開原文 ↓'/);
  assert.doesNotMatch(quiz, /sourceLink[\s\S]{0,80}查看完整條文/);
  assert.match(fill, /id="fillSourceLink"[\s\S]*>展開原文 ↓<\/button>/);
  assert.match(fill, /btn\.textContent=open\?'收起原文 ↑':'展開原文 ↓'/);
  assert.doesNotMatch(fill, /fillSourceLink[\s\S]{0,120}查看完整條文/);
  assert.match(practice, /btn\.textContent='開完整法條 →'/);
});

test('law preview accepts common article deep-link aliases', () => {
  assert.match(preview, /const targetId = params\.get\('id'\) \|\| params\.get\('articleId'\)/);
  assert.match(preview, /const targetArticleNo = params\.get\('art'\) \|\| params\.get\('article'\)/);
  assert.match(preview, /function normalizeArticleNo/);
  assert.match(preview, /normalizeArticleNo\(a\.title\) === normalizedTargetArticle/);
  assert.match(preview, /const firstId = targetId && articlesCache\.find\(a => a\.id === targetId\)/);
});

test('law preview has a contextual return path instead of dumping readers at home', () => {
  assert.match(preview, /<a class="back-link" href="dashboard\.html#laws">← 回法規目錄<\/a>/);
  assert.match(preview, /function isSafeBackUrl/);
  assert.match(preview, /url\.origin === location\.origin && !url\.pathname\.endsWith\('\/law-preview\.html'\)/);
  assert.match(preview, /function configureBackLink/);
  assert.match(preview, /backLink\.href = 'dashboard\.html#laws'/);
  assert.match(preview, /backLink\.textContent = '← 回上一頁'/);
  assert.doesNotMatch(preview, /<a class="back-link" href="\/">← 回 SoFa<\/a>/);
});

test('law preview article list exposes click state to keyboard and screen readers', () => {
  assert.match(preview, /role="button" tabindex="0" aria-current="\$\{current\}"/);
  assert.match(preview, /el\.addEventListener\('keydown', ev =>/);
  assert.match(preview, /ev\.key === 'Enter' \|\| ev\.key === ' '/);
  assert.match(preview, /el\.setAttribute\('aria-current', active \? 'true' : 'false'\)/);
});

test('law preview keeps the active article visible in the side list', () => {
  assert.match(preview, /function scrollActiveListItem\(id, block='nearest'\)/);
  assert.match(preview, /listBody\.querySelector\(`\.list-item\[data-id="\$\{CSS\.escape\(id\)\}"\]`\)/);
  assert.match(preview, /active\.scrollIntoView\(\{block, inline:'nearest'\}\)/);
  assert.match(preview, /renderList[\s\S]*scrollActiveListItem\(activeId, 'center'\)/);
  assert.match(preview, /loadArticle[\s\S]*scrollActiveListItem\(id, 'nearest'\)/);
});

test('law preview opens the reading area instead of returning to the page header', () => {
  assert.match(preview, /function scrollReaderIntoView/);
  assert.match(preview, /main\.scrollIntoView\(\{block:'start', inline:'nearest', behavior:'smooth'\}\)/);
  assert.match(preview, /renderDetail[\s\S]*scrollReaderIntoView\(\)/);
  assert.doesNotMatch(preview, /window\.scrollTo\(\{top: 0, behavior: 'smooth'\}\)/);
});

test('law preview CTA keeps readers in the web practice funnel', () => {
  assert.match(preview, /讀完這部，就做 5 題看弱點/);
  assert.match(preview, /href="quiz\.html\?free=1"/);
  assert.doesNotMatch(preview, /lin\.ee\/zUeMwo4/);
});

test('tree read entries use the same law preview reader URL', () => {
  assert.match(tree, /const SOFA_READ_URL = \(lawName\) => `https:\/\/sofaengine\.org\/law-preview\.html\?law=\$\{encodeURIComponent\(lawName\)\}`/);
  assert.match(tree, /window\.open\(SOFA_READ_URL\(lawName\), '_blank', 'noopener'\)/);
  assert.match(tree, /前往閱讀 →/);
  assert.match(tree, /const readHref = SOFA_READ_URL\(lawName\)/);
  assert.match(tree, /href="' \+ readHref \+ '"/);
  assert.doesNotMatch(tree, /\?intent=read&law=/);
});
