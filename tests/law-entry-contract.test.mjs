import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

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

test('practice URL deep links can target one article without replacing the saved default law', () => {
  assert.match(practice, /const _practiceSearchParams = new URLSearchParams\(location\.search\)/);
  assert.match(practice, /function practiceUrlLawParam\(\)/);
  assert.match(practice, /function practiceUrlArticleParam\(\)/);
  assert.match(practice, /function practiceUrlPageIdParam\(\)/);
  assert.match(practice, /let _practiceUrlTargetPending = !!\(practiceUrlPageIdParam\(\) \|\| \(practiceUrlLawParam\(\) && practiceUrlArticleParam\(\)\)\)/);
  assert.match(practice, /let _practiceUrlTargetResolving = false/);
  assert.match(practice, /let _skipPracticeLawPersistOnce = false/);
  assert.match(practice, /if\(_skipPracticeLawPersistOnce\)_skipPracticeLawPersistOnce = false;\s*else localStorage\.setItem\('sofa_practice_law', this\.value\)/);
  assert.match(practice, /const keepUrlArticle = _practiceUrlTargetPending && practiceUrlLawParam\(\) === this\.value && !!urlArt/);
  assert.match(practice, /if\(keepUrlArticle\) inp\.value = normalizePracticeArticleNo\(urlArt\)/);

  const initStart = practice.indexOf('(async()=>{');
  const initEnd = practice.indexOf('// ── 條號選單', initStart);
  const initBlock = practice.slice(initStart, initEnd);
  assert.match(initBlock, /const _urlPracticeLaw = practiceUrlLawParam\(\)/);
  assert.match(initBlock, /_skipPracticeLawPersistOnce = true/);
  assert.match(initBlock, /artInput\.value = normalizePracticeArticleNo\(art\)/);
  assert.match(initBlock, /loadNew\(\);\s*return/);

  const loadStart = practice.indexOf('async function loadNew');
  const loadEnd = practice.indexOf('articleSections=d.sections', loadStart);
  const loadBlock = practice.slice(loadStart, loadEnd);
  assert.match(loadBlock, /if\(_practiceUrlTargetResolving\) return/);
  assert.match(loadBlock, /if\(_practiceUrlTargetPending\)/);
  assert.match(loadBlock, /_practiceUrlTargetResolving = true/);
  assert.match(loadBlock, /finally\{\s*_practiceUrlTargetPending = false;\s*_practiceUrlTargetResolving = false;\s*\}/);
  assert.match(loadBlock, /fetch\(`\$\{API\}\/api\/article\/\$\{encodeURIComponent\(targetPid\)\}`/);
  assert.match(loadBlock, /const match=findPracticeArticleByNo\(_artCache\[targetLaw\],targetArt\)/);
  assert.match(loadBlock, /fetch\(`\$\{API\}\/api\/article\/\$\{encodeURIComponent\(match\.id\|\|match\.page_id\)\}`/);
  assert.match(loadBlock, /const match=findPracticeArticleByNo\(_artCache\[law\],artNum\)/);
  assert.match(practice, /if\(!_practiceUrlTargetPending\) loadNew\(\)/);
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
  assert.match(preview, /let targetId = params\.get\('id'\) \|\| params\.get\('articleId'\)/);
  assert.match(preview, /let targetArticleNo = params\.get\('art'\) \|\| params\.get\('article'\)/);
  assert.match(preview, /function normalizeArticleNo/);
  assert.match(preview, /articleMatchesTarget\(a, normalizedTargetArticle\)/);
  assert.match(preview, /const firstId = targetId && articlesCache\.find\(a => a\.id === targetId\)/);
});

test('law preview can resolve an id-only deep link before loading the law list', () => {
  assert.match(preview, /const hasExplicitLawParam = params\.has\('law'\)/);
  assert.match(preview, /async function resolveArticleIdBeforeLawList/);
  assert.match(preview, /if\(targetId && !hasExplicitLawParam\)/);
  assert.match(preview, /fetchJSON\(`\$\{API\}\/api\/article\/\$\{encodeURIComponent\(targetId\)\}`\)/);
  assert.match(preview, /lawName = article\.law_name \|\| article\.law \|\| lawName/);
  assert.match(preview, /if\(articleMatchesTarget\(article, targetArticleNo\) \|\| article\.id === targetId\)/);
  assert.match(preview, /renderDetail\(article\)/);
});

test('law preview is native-safe inside the iOS shell', () => {
  assert.match(preview, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/);
  assert.match(preview, /body\{[\s\S]*padding-bottom:calc\(96px \+ env\(safe-area-inset-bottom, 0px\)\)/);
  assert.match(preview, /\.topbar\{[\s\S]*padding-top:calc\(14px \+ env\(safe-area-inset-top, 0px\)\)/);
  assert.match(preview, /\.cta-bar\{[\s\S]*padding-bottom:calc\(18px \+ env\(safe-area-inset-bottom, 0px\)\)/);
  assert.match(preview, /@media \(max-width:768px\)\{[\s\S]*\.topbar\{[\s\S]*padding-top:calc\(12px \+ env\(safe-area-inset-top, 0px\)\)/);
  assert.match(preview, /@media \(max-width:768px\)\{[\s\S]*\.cta-bar\{[\s\S]*padding-bottom:calc\(14px \+ env\(safe-area-inset-bottom, 0px\)\)/);
});

test('law preview normalizes sub-articles before matching deep links', () => {
  const source = [
    extractFunction(preview, 'normalizeArticleNo'),
    extractFunction(preview, 'articleMatchesTarget')
  ].join('\n');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${source}; this.normalizeArticleNo = normalizeArticleNo; this.articleMatchesTarget = articleMatchesTarget;`, sandbox);

  assert.equal(sandbox.normalizeArticleNo('第43條之3 CFC'), '43之3');
  assert.equal(sandbox.normalizeArticleNo('第 43 條之 3'), '43之3');
  assert.equal(sandbox.normalizeArticleNo('§ 06-1｜民法親屬編施行法第6條之1'), '6之1');
  assert.equal(sandbox.normalizeArticleNo('第十三條之一'), '13之1');
  assert.equal(sandbox.normalizeArticleNo('§ １１４Ｑ４６｜題庫'), '114Q46');
  assert.ok(sandbox.articleMatchesTarget({ title: '§ 06-1｜民法親屬編施行法第6條之1' }, '6之1'));
  assert.ok(sandbox.articleMatchesTarget({ title: '第43條之3 CFC' }, '43之3'));
  assert.ok(sandbox.articleMatchesTarget({ article_no: '第十三條之一' }, '13之1'));
});

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Could not extract ${name}`);
}

test('law preview analysis links cross-referenced law articles to the reader', () => {
  const source = [
    extractFunction(preview, 'escapeHtml'),
    extractFunction(preview, 'cleanCrossRefLawName'),
    extractFunction(preview, 'linkifyLawRefs')
  ].join('\n');
  const sandbox = { encodeURIComponent };
  vm.createContext(sandbox);
  vm.runInContext(`${source}; this.linkify = linkifyLawRefs;`, sandbox);

  const linkedSameLaw = sandbox.linkify('同法第13條、本法第15條', '記帳士法');
  assert.match(linkedSameLaw, /href="law-preview\.html\?law=%E8%A8%98%E5%B8%B3%E5%A3%AB%E6%B3%95&amp;art=13"/);
  assert.match(linkedSameLaw, /href="law-preview\.html\?law=%E8%A8%98%E5%B8%B3%E5%A3%AB%E6%B3%95&amp;art=15"/);
  assert.doesNotMatch(linkedSameLaw, /dashboard\.html\?q|searchAndOpen/);

  const linkedNamedLaw = sandbox.linkify('記帳士法第13條及第15條', '所得稅法');
  assert.match(linkedNamedLaw, /href="law-preview\.html\?law=%E8%A8%98%E5%B8%B3%E5%A3%AB%E6%B3%95&amp;art=13"/);
  assert.match(linkedNamedLaw, /href="law-preview\.html\?law=%E8%A8%98%E5%B8%B3%E5%A3%AB%E6%B3%95&amp;art=15"/);
  assert.doesNotMatch(linkedNamedLaw, /dashboard\.html\?q|searchAndOpen/);

  const linkedPrefixedLaw = sandbox.linkify('搭配公司法第29條經理人任免規定', '商業會計法');
  assert.match(linkedPrefixedLaw, />公司法第29條</);
  assert.doesNotMatch(linkedPrefixedLaw, />搭配公司法第29條</);

  const linkedReadableLead = sandbox.linkify('交叉記憶可看公司法第29條', '商業會計法');
  assert.match(linkedReadableLead, /law=%E5%85%AC%E5%8F%B8%E6%B3%95&amp;art=29/);
  assert.match(linkedReadableLead, />公司法第29條</);
  assert.doesNotMatch(linkedReadableLead, /law=.*%E4%BA%A4%E5%8F%89/);

  const linkedConjunctionLaw = sandbox.linkify('與刑法第214條一起看', '商業會計法');
  assert.match(linkedConjunctionLaw, /law=%E5%88%91%E6%B3%95&amp;art=214/);
  assert.doesNotMatch(linkedConjunctionLaw, /law=%E8%88%87%E5%88%91%E6%B3%95/);

  const linkedArticleSeries = sandbox.linkify('刑法317、318、319條;地政士法26條(地政士守密義務)', '記帳士法');
  assert.match(linkedArticleSeries, /law=%E5%88%91%E6%B3%95&amp;art=317/);
  assert.match(linkedArticleSeries, /law=%E5%88%91%E6%B3%95&amp;art=318/);
  assert.match(linkedArticleSeries, /law=%E5%88%91%E6%B3%95&amp;art=319/);
  assert.match(linkedArticleSeries, /law=%E5%9C%B0%E6%94%BF%E5%A3%AB%E6%B3%95&amp;art=26/);
  assert.doesNotMatch(linkedArticleSeries, /law=.*%E5%9C%B0%E6%94%BF%E5%A3%AB%E5%AE%88%E5%AF%86/);
  assert.doesNotMatch(linkedArticleSeries, /target="_blank"/);

  const linkedProfessionalLaw = sandbox.linkify('會計師法43條等專業守密規定並列', '記帳士法');
  assert.match(linkedProfessionalLaw, /law=%E6%9C%83%E8%A8%88%E5%B8%AB%E6%B3%95&amp;art=43/);
});

test('law preview analysis makes cross references and nested bullets visually scannable', () => {
  assert.match(preview, /\.crossref\{\s*color:var\(--peach\);[\s\S]*text-decoration-thickness:1\.5px/);
  assert.match(preview, /\.crossref\{[\s\S]*background:rgba\(231,187,167,\.08\)/);
  assert.match(preview, /\.section-body \.preview-head,[\s\S]*padding-left:1\.35em;[\s\S]*text-indent:-1\.35em/);
  assert.match(preview, /\.section-body \.preview-sub,[\s\S]*margin-left:1\.45em;[\s\S]*padding-left:2em;[\s\S]*border-left:2px solid rgba\(231,187,167,\.42\)/);
});

test('law preview keeps quiz return context when readers follow cross references', () => {
  assert.match(preview, /const backTarget = params\.get\('back'\) \|\| ''/);
  assert.match(preview, /function readerHrefFor\(lawName, articleNo\)/);
  assert.match(preview, /url\.searchParams\.set\('from', returnFrom\)/);
  assert.match(preview, /url\.searchParams\.set\('back', backTarget\)/);
  assert.match(preview, /linkifyLawRefs\(escapeHtml\(visibleText\), currentLawName\)/);
});

test('law preview names the return path for tree readers', () => {
  assert.match(preview, /returnFrom === 'tree'/);
  assert.match(preview, /backLink\.href = isSafeBackUrl\(backTarget\) \? backTarget : 'tree\.html'/);
  assert.match(preview, /backLink\.textContent = '← 回考試地圖'/);
});

test('law preview opens cross references inside the reader instead of full page jumping', () => {
  assert.match(preview, /let lawName = params\.get\('law'\) \|\| '記帳士法'/);
  assert.match(preview, /async function loadLawReader\(nextLaw, opts\)/);
  assert.match(preview, /detail\.addEventListener\('click', ev => \{/);
  assert.match(preview, /closest\('a\.crossref'\)/);
  assert.match(preview, /ev\.preventDefault\(\)/);
  assert.match(preview, /loadLawReader\(url\.searchParams\.get\('law'\) \|\| lawName/);
  assert.match(preview, /history\.pushState\(null, '', u\.toString\(\)\)/);
});

test('law preview has a contextual return path instead of dumping readers at home', () => {
  assert.match(preview, /<a class="back-link" href="dashboard\.html#laws">← 回法規目錄<\/a>/);
  assert.match(preview, /function isSafeBackUrl/);
  assert.match(preview, /url\.origin === location\.origin && !url\.pathname\.endsWith\('\/law-preview\.html'\)/);
  assert.match(preview, /function configureBackLink/);
  assert.match(preview, /backLink\.href = 'dashboard\.html#laws'/);
  assert.match(preview, /backLink\.textContent = '← 回上一頁'/);
  assert.match(preview, /const returnFrom = params\.get\('from'\) \|\| ''/);
  assert.match(preview, /const backTarget = params\.get\('back'\) \|\| ''/);
  assert.match(preview, /isSafeBackUrl\(backTarget\) \? backTarget : 'quiz\.html'/);
  assert.match(preview, /returnFrom === 'quiz'/);
  assert.match(preview, /backLink\.textContent = '← 回到題目'/);
  assert.match(preview, /else if\(isSafeBackUrl\(backTarget\)\)/);
  const configureStart = preview.indexOf('function configureBackLink');
  const configureEnd = preview.indexOf('configureBackLink();', configureStart);
  assert.ok(configureStart >= 0 && configureEnd > configureStart, 'configureBackLink must be extractable');
  const configureSource = preview.slice(configureStart, configureEnd);
  assert.doesNotMatch(configureSource, /history\.back\(\)/);
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
  assert.match(preview, /讀完前四段，就做 5 題看弱點/);
  assert.match(preview, /href="quiz\.html\?free=1&amp;start=1"/);
  assert.doesNotMatch(preview, /lin\.ee\/zUeMwo4/);
});

test('law preview teases paid fifth and sixth sections instead of hiding the value', () => {
  assert.match(preview, /const PREVIEW_SECTION_NAMES = \[/);
  assert.match(preview, /'修法與聯覺備註'/);
  assert.match(preview, /'相關法規及注意事項'/);
  assert.match(preview, /const PREVIEW_LOCK_LEADS = \{/);
  assert.match(preview, /function renderPreviewSections\(sections,currentLawName\)/);
  assert.match(preview, /if\(shouldLockAdvancedSections\(\) && seg >= 5\)/);
  assert.match(preview, /class="section locked"/);
  assert.match(preview, /class="section-locked-head"/);
  assert.match(preview, /class="section-lock-badge" aria-label="付費解鎖">LOCKED<\/span>/);
  assert.match(preview, /class="section-locked-preview"/);
  assert.match(preview, /第 \$\{seg\} 段留給完整會員閱讀/);
  assert.match(preview, /href="pricing\.html">查看方案 →/);
  assert.match(preview, /\.section\.locked/);
  assert.match(preview, /\.section-lock-badge::before/);
  assert.match(preview, /\.section-lock-badge::after/);
  assert.match(preview, /\.section-locked-preview::after/);
});

test('law preview only locks advanced sections for explicitly free readers', () => {
  assert.match(preview, /const uid = localStorage\.getItem\('sofa_uid'\) \|\| ''/);
  assert.match(preview, /const tok = localStorage\.getItem\('sofa_token'\) \|\| ''/);
  assert.match(preview, /let readerPaid = !!\(uid \|\| tok\)/);
  assert.match(preview, /function readerModeLabel/);
  assert.match(preview, /readerPaid \? '法本閱讀' : '法本試讀'/);
  assert.match(preview, /document\.title = `\$\{lawName\} · SoFa \$\{readerModeLabel\(\)\}`/);
  assert.match(preview, /document\.querySelector\('\.brand'\)\.textContent = `SoFa Engine · \$\{readerModeLabel\(\)\}`/);
  assert.match(preview, /function shouldLockAdvancedSections/);
  assert.match(preview, /return !readerPaid/);
  assert.match(preview, /function resolveReaderEntitlement/);
  assert.match(preview, /\/api\/me\/profile/);
  assert.doesNotMatch(preview, /plan === '免費' \|\| plan === 'free' \|\| plan === ''/);
  assert.match(preview, /fetch\(url, \{ headers:_authH\(\) \}\)/);
  assert.match(preview, /renderPreviewSections\(sections, d\.law_name \|\| lawName\)/);
  assert.match(preview, /if\(shouldLockAdvancedSections\(\) && seg >= 5\)/);
  assert.match(preview, /const unlocked = seg >= 5 \? ' data-unlocked="true"' : ''/);
});

test('tree read entries use the same law preview reader URL', () => {
  assert.match(tree, /function SOFA_READ_URL\(lawName\) \{/);
  assert.match(tree, /law-preview\.html\?law=\$\{encodeURIComponent\(lawName\)\}&from=tree&back=tree\.html/);
  assert.match(tree, /const url = SOFA_READ_URL\(lawName\)/);
  assert.match(tree, /<a class="law-link" href="\$\{url\}">\$\{l\}<\/a>/);
  assert.match(tree, /location\.href = SOFA_READ_URL\(lawName\)/);
  assert.match(tree, /前往閱讀 →/);
  assert.match(tree, /const readHref = SOFA_READ_URL\(lawName\)/);
  assert.match(tree, /href="' \+ readHref \+ '"/);
  assert.doesNotMatch(tree, /window\.open\(SOFA_READ_URL\(lawName\)/);
  assert.doesNotMatch(tree, /LawSearchResult\.aspx/);
  assert.doesNotMatch(tree, /\?intent=read&law=/);
});
