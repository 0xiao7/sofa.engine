import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../fill.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name} must exist`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  assert.fail(`${name} must close`);
}

test('fill page starts with a clear start action then switches to next article', () => {
  assert.match(active, /id="btnNext"[^>]*>開始填空<\/button>/);
  assert.match(active, /選擇法規後點「開始填空」開始/);

  const loadNewStart = active.indexOf('async function loadNew');
  assert.ok(loadNewStart >= 0, 'loadNew must exist');
  const loadNewEnd = active.indexOf("document.getElementById('hintFirst')", loadNewStart);
  assert.ok(loadNewEnd > loadNewStart, 'hint handlers should follow loadNew');
  const loadNewBody = active.slice(loadNewStart, loadNewEnd);
  assert.match(loadNewBody, /getElementById\('btnNext'\)\.textContent\s*=\s*'下一篇'/);
});

test('fill session wording uses article counts instead of question counts', () => {
  const modalStart = active.indexOf('id="fillSessionModal"');
  assert.ok(modalStart >= 0, 'fill session modal must exist');
  const modal = active.slice(modalStart, active.indexOf('</body>', modalStart));
  assert.match(modal, />選擇篇數</);
  assert.doesNotMatch(modal, /選擇題數/);
});

test('fill auto advance remains perfect-only so wrong answers stay for correction', () => {
  const checkStart = active.indexOf('function checkAnswers');
  assert.ok(checkStart >= 0, 'checkAnswers must exist');
  const checkEnd = active.indexOf('function loadNew', checkStart);
  assert.ok(checkEnd > checkStart, 'loadNew should follow checkAnswers');
  const checkAnswers = active.slice(checkStart, checkEnd);
  assert.match(checkAnswers, /if\(cor === inputs\.length && inputs\.length > 0\)/);
  assert.match(checkAnswers, /loadNew\(\)/);

  const keyStart = active.indexOf('function _fillKeyHandler');
  assert.ok(keyStart >= 0, '_fillKeyHandler must exist');
  const keyEnd = active.indexOf('document.addEventListener', keyStart);
  const keyHandler = active.slice(keyStart, keyEnd);
  assert.match(keyHandler, /if \(_lastFillPerfect\) document\.getElementById\('btnNext'\)\?\.click\(\)/);
});

test('fill answer sections show loading and fallback instead of blank panel', () => {
  assert.match(active, /function showFillSectionsLoading/);
  assert.match(active, /function renderFillSections/);
  assert.match(active, /條文解析載入中/);
  assert.match(active, /這條暫時沒有解析/);

  const checkStart = active.indexOf('function checkAnswers');
  const checkEnd = active.indexOf('function loadNew', checkStart);
  const checkAnswers = active.slice(checkStart, checkEnd);
  assert.match(checkAnswers, /showFillSectionsLoading\(panel\)/);
  assert.match(checkAnswers, /renderFillSections\(panel,\s*art\.sections\|\|\{\},\s*art\._plan!=='free',\s*art\)/);
  assert.match(checkAnswers, /renderFillSections\(panel,\s*\{\},\s*true\)/);
});

test('fill source links keep article numbers separate from long titles for reader deep links', () => {
  assert.match(active, /function fillArticleReaderHref/);
  assert.match(active, /function fillArticleNo/);

  const checkStart = active.indexOf('function checkAnswers');
  assert.ok(checkStart >= 0, 'checkAnswers must exist');
  const checkEnd = active.indexOf('// 寫入練習紀錄', checkStart);
  assert.ok(checkEnd > checkStart, 'source link should be built before history write');
  const checkAnswers = active.slice(checkStart, checkEnd);

  assert.match(checkAnswers, /fillArticleReaderHref\(fillData\)/);
  assert.doesNotMatch(checkAnswers, /&art=\$\{encodeURIComponent\(fillData\.title\)\}/);
});

test('fill source link helper preserves sub-article numbers in either title order', () => {
  const helpers = vm.runInNewContext([
    extractFunction(active, 'fillArticleNo'),
    extractFunction(active, 'fillArticleReaderHref'),
    '({fillArticleNo, fillArticleReaderHref})',
  ].join('\n'));

  assert.equal(helpers.fillArticleNo({ title: '第43條之3 CFC' }), '43之3');
  assert.equal(helpers.fillArticleNo({ title: '第43之3條 CFC' }), '43之3');
  assert.match(
    helpers.fillArticleReaderHref({ id: 'income-43-3', law_name: '所得稅法', title: '第43條之3 CFC' }),
    /^law-preview\.html\?law=%E6%89%80%E5%BE%97%E7%A8%85%E6%B3%95&id=income-43-3&art=43%E4%B9%8B3&from=fill&back=/,
  );
});

test('fill analysis linkifies cross-law references inside the article reader', () => {
  const start = active.indexOf('function cleanCrossRefLawName');
  const end = active.indexOf('function formatSection', start);
  assert.ok(start >= 0 && end > start, 'law reference helper must be extractable before formatSection');
  const helpers = vm.runInNewContext(`${active.slice(start, end)};({linkifyLawRefs,cleanCrossRefLawName})`);

  const linkedSameLaw = helpers.linkifyLawRefs('同法第13條、本法第15條', '記帳士法');
  assert.match(linkedSameLaw, /law-preview\.html\?law=%E8%A8%98%E5%B8%B3%E5%A3%AB%E6%B3%95&art=13/);
  assert.match(linkedSameLaw, /law-preview\.html\?law=%E8%A8%98%E5%B8%B3%E5%A3%AB%E6%B3%95&art=15/);
  assert.match(linkedSameLaw, /&from=fill&back=fill\.html/);

  const linkedNamedLaw = helpers.linkifyLawRefs('搭配公司法第29條經理人任免規定', '商業會計法');
  assert.match(linkedNamedLaw, />公司法第29條</);
  assert.match(linkedNamedLaw, /law-preview\.html\?law=%E5%85%AC%E5%8F%B8%E6%B3%95&art=29/);
  assert.match(linkedNamedLaw, /&from=fill&back=fill\.html/);
  assert.doesNotMatch(linkedNamedLaw, />搭配公司法第29條</);
  assert.equal(helpers.cleanCrossRefLawName('搭配公司法'), '公司法');
  const linkedReadableLead = helpers.linkifyLawRefs('交叉記憶可看公司法第29條', '商業會計法');
  assert.match(linkedReadableLead, /law-preview\.html\?law=%E5%85%AC%E5%8F%B8%E6%B3%95&art=29/);
  assert.match(linkedReadableLead, />公司法第29條</);
  assert.doesNotMatch(linkedReadableLead, /law=.*%E4%BA%A4%E5%8F%89/);
  assert.equal(helpers.cleanCrossRefLawName('交叉記憶可看公司法'), '公司法');
  const linkedArticleSeries = helpers.linkifyLawRefs('刑法317、318、319條;地政士法26條(地政士守密義務)', '記帳士法');
  assert.match(linkedArticleSeries, /law-preview\.html\?law=%E5%88%91%E6%B3%95&art=317/);
  assert.match(linkedArticleSeries, /law-preview\.html\?law=%E5%88%91%E6%B3%95&art=318/);
  assert.match(linkedArticleSeries, /law-preview\.html\?law=%E5%88%91%E6%B3%95&art=319/);
  assert.match(linkedArticleSeries, /law-preview\.html\?law=%E5%9C%B0%E6%94%BF%E5%A3%AB%E6%B3%95&art=26/);
  assert.doesNotMatch(linkedArticleSeries, /law=.*%E5%9C%B0%E6%94%BF%E5%A3%AB%E5%AE%88%E5%AF%86/);
  assert.doesNotMatch(linkedNamedLaw, /target="_blank"/);
  assert.match(active, /formatSection\(sections\[name\],\s*articleLawName\)/);
});

test('fill analysis cross references look like tappable in-reader chips', () => {
  assert.match(active, /\.sec-text \.crossref\{[\s\S]*display:inline-flex/);
  assert.match(active, /\.sec-text \.crossref\{[\s\S]*background:rgba\(231,187,167,\.[0-9]+\)/);
  assert.match(active, /\.sec-text \.crossref\{[\s\S]*border:1px solid rgba\(213,154,120,\.[0-9]+\)/);
  assert.match(active, /\.sec-text \.crossref\{[\s\S]*white-space:nowrap/);
  assert.match(active, /\.sec-text \.crossref:hover\{[\s\S]*background:rgba\(231,187,167,\.[0-9]+\)/);
});

test('fill analysis nested bullets have visible hierarchy', () => {
  assert.match(active, /\.sec-text \.sec-i\{[^}]*margin:8px 0 8px 26px/);
  assert.match(active, /\.sec-text \.sec-i\{[^}]*padding:8px 12px 8px 34px/);
  assert.match(active, /\.sec-text \.sec-i\{[^}]*border-left:4px solid rgba\(231,187,167,\.[0-9]+\)/);
  assert.match(active, /\.sec-text \.sec-i\{[^}]*background:rgba\(231,187,167,\.[0-9]+\)/);
  assert.match(active, /\.sec-text \.sec-i::before\{[^}]*left:11px/);
  assert.match(active, /@media \(max-width:760px\)\{[\s\S]*\.sec-text \.sec-i\{[^}]*margin:7px 0 7px 12px/);
});

test('fill URL deep links can target one article without replacing the saved default law', () => {
  assert.match(active, /const _fillSearchParams = new URLSearchParams\(location\.search\)/);
  assert.match(active, /function fillUrlLawParam\(\)/);
  assert.match(active, /function fillUrlArticleParam\(\)/);
  assert.match(active, /function fillUrlPageIdParam\(\)/);
  assert.match(active, /let _fillUrlTargetPending = !!\(fillUrlPageIdParam\(\) \|\| \(fillUrlLawParam\(\) && fillUrlArticleParam\(\)\)\)/);
  assert.match(active, /let _fillUrlTargetResolving = false/);
  assert.match(active, /let _skipFillLawPersistOnce = false/);
  assert.match(active, /if\(_skipFillLawPersistOnce\)_skipFillLawPersistOnce = false;\s*else localStorage\.setItem\('sofa_fill_law', this\.value\)/);
  assert.match(active, /const keepUrlArticle = _fillUrlTargetPending && fillUrlLawParam\(\) === this\.value && !!urlArt/);
  assert.match(active, /if\(keepUrlArticle\) inp\.value = normalizeFillArticleNo\(urlArt\)/);

  const initStart = active.indexOf('(async()=>{');
  const initEnd = active.indexOf('// 自製法規下拉', initStart);
  const initBlock = active.slice(initStart, initEnd);
  assert.match(initBlock, /const _urlFillLaw = fillUrlLawParam\(\)/);
  assert.match(initBlock, /_skipFillLawPersistOnce = true/);
  assert.match(initBlock, /artInput\.value=normalizeFillArticleNo\(art\)/);
  assert.match(initBlock, /loadNew\(\);\s*return/);

  const loadStart = active.indexOf('async function loadNew');
  const loadEnd = active.indexOf('let resp=await fetch', loadStart);
  const loadBlock = active.slice(loadStart, loadEnd);
  assert.match(loadBlock, /if\(_fillUrlTargetResolving\) return/);
  assert.match(loadBlock, /if\(_fillUrlTargetPending\)/);
  assert.match(loadBlock, /_fillUrlTargetResolving = true/);
  assert.match(loadBlock, /finally\{\s*_fillUrlTargetPending = false;\s*_fillUrlTargetResolving = false;\s*\}/);
  assert.match(loadBlock, /url=`\$\{API\}\/api\/fill\?page_id=\$\{encodeURIComponent\(targetPid\)\}`/);
  assert.match(loadBlock, /const match=findFillArticleByNo\(_artCache\[targetLaw\],targetArt\)/);
  assert.match(loadBlock, /if\(match\)url=`\$\{API\}\/api\/fill\?page_id=\$\{encodeURIComponent\(match\.id\|\|match\.page_id\)\}`/);
  assert.match(loadBlock, /const match=findFillArticleByNo\(_artCache\[law\],artNum\)/);
  assert.match(active, /if\(_fillUrlTargetPending\) return;\s*var law=document\.getElementById\('lawSelect'\)\.value/);
});
