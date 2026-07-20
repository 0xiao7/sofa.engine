import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const analysisPath = new URL('../analysis.html', import.meta.url);
const analysis = existsSync(analysisPath) ? readFileSync(analysisPath, 'utf8') : '';
const analytics = readFileSync(new URL('../sofa-analytics.js', import.meta.url), 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const signatureClose = source.indexOf('){', start);
  const brace = signatureClose >= 0 ? signatureClose + 1 : source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        quote = '';
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`${name} function did not close`);
}

test('analysis page exists as a mobile-first standalone radar page', () => {
  assert.ok(analysis, 'analysis.html should exist');
  assert.match(analysis, /<meta name="viewport" content="[^"]*width=device-width[^"]*initial-scale=1/);
  assert.match(analysis, /進度雷達/);
  assert.match(analysis, /今天先補/);
  assert.match(analysis, /先補這裡/);
  assert.match(analysis, /待複習/);
  assert.match(analysis, /考了、但你還沒碰的/);
  assert.match(analysis, /到考日/);
});

test('analysis page uses the approved v5 brand hero with v4 minimal body', () => {
  assert.match(analysis, /fonts\.googleapis\.com\/css2\?family=Noto\+Serif\+TC:wght@400;500;600;700;900&family=Noto\+Sans\+TC:wght@300;400;500;600;700&family=JetBrains\+Mono:wght@400;500;600&display=swap/);
  assert.match(analysis, /--navy:#1F3848/);
  assert.match(analysis, /--navy-2:#19303E/);
  assert.match(analysis, /--peach:#E7BBA7/);
  assert.match(analysis, /--peach-3:#C89580/);
  assert.match(analysis, /--clay:#C9A485/);
  assert.match(analysis, /--line-on-navy:/);
  assert.match(analysis, /--alert:#B5654F/);
  assert.match(analysis, /--cream:#F6F1EA/);
  assert.match(analysis, /--serif:"Noto Serif TC", "Songti TC", serif/);
  assert.match(analysis, /--mono:"JetBrains Mono", ui-monospace, monospace/);
  assert.match(analysis, /\.wrap\{[\s\S]*max-width:460px/);
  assert.match(analysis, /\.hero\{[\s\S]*background:[\s\S]*radial-gradient[\s\S]*var\(--navy\)/);
  assert.match(analysis, /\.hero \.grid\{/);
  assert.match(analysis, /\.hero \.radar\{/);
  assert.match(analysis, /<svg class="radar" viewBox="0 0 200 200" fill="none" aria-hidden="true">/);
  assert.match(analysis, /\.hero h1\{[\s\S]*font-size:42px/);
  assert.match(analysis, /\.status\{display:flex;background:var\(--navy-2\);color:var\(--cream\)/);
  assert.match(analysis, /\.rowline \.rt\.a\{color:var\(--alert\)/);
  assert.match(analysis, /\.chip\{[\s\S]*background:var\(--cream-2\)/);
  assert.doesNotMatch(analysis, /\.badge/);
  assert.doesNotMatch(analysis, /brand-mark/);
  assert.doesNotMatch(analysis, /sage/);
  assert.doesNotMatch(analysis, /amber/);
});

test('hero conclusion is derived from top blind spot with a plain-language why', () => {
  assert.match(analysis, /function topBlindSpot\(data\)/);
  assert.match(analysis, /function topWrongArticle\(spot\)/);
  assert.match(analysis, /今天先補/);
  assert.match(analysis, /\$\('leadSubject'\)\.textContent = top\.subject/);
  assert.match(analysis, /\$\('leadWhy'\)\.textContent = buildLeadWhy\(top\)/);
  assert.match(analysis, /錯最多/);
  assert.match(analysis, /錯了/);
});

test('countdown is loaded from exam-plan-contract instead of hard-coded exam dates', () => {
  assert.match(analysis, /fetch\(['"]exam-plan-contract\.json/);
  assert.match(analysis, /exam_date/);
  assert.match(analysis, /access_until/);
  assert.doesNotMatch(analysis, /2026-11-14/);
  assert.doesNotMatch(analysis, /2026\/11\/14/);
  assert.doesNotMatch(analysis, /new Date\(['"]2026-/);
});

test('public preview demo derives countdown from the active exam date', () => {
  assert.match(analysis, /const daysLeft = daysUntil\(examDate\)/);
  assert.match(analysis, /days_until_exam:\s*Number\.isFinite\(daysLeft\) \? daysLeft : null/);
  assert.doesNotMatch(analysis, /days_until_exam:\s*118/);
});

test('authenticated analysis uses the aggregate API and magic link lands here', () => {
  assert.match(analysis, /\/api\/me\/analysis/);
  assert.match(analysis, /\/api\/auth\/magic/);
  assert.match(analysis, /URLSearchParams\(location\.search\)/);
  assert.match(analysis, /localStorage\.setItem\(['"]sofa_token/);
  assert.doesNotMatch(analysis, /location\.href\s*=\s*['"]dashboard\.html/);
});

test('free preview reads local 5-question state before login', () => {
  assert.match(analysis, /sofa_quiz_stats_v1/);
  assert.match(analysis, /sofa_wrong_ids/);
  assert.match(analysis, /sofa_exam_history_v1/);
  assert.match(analysis, /localStorage/);
  assert.match(analysis, /5 題/);
  assert.match(analysis, /topLimit\s*=\s*3/);
});

test('free and paid surfaces expose the required conversion split', () => {
  assert.match(analysis, /免費預覽/);
  assert.match(analysis, /完整排程/);
  assert.match(analysis, /弱點優先/);
  assert.match(analysis, /每週診斷/);
  assert.match(analysis, /checkout\.html\?plan=到考日&utm_source=analysis&utm_medium=upgrade&utm_campaign=ex25_analysis/);
  assert.match(analysis, /data-track-event="analysis_checkout_click"/);
});

test('blind spots use weak laws and wrong articles, with mastery at most auxiliary', () => {
  assert.match(analysis, /weak_laws/);
  assert.match(analysis, /wrong_articles/);
  assert.doesNotMatch(analysis, /\/api\/me\/mastery/);
});

test('analysis tracking is forwarded server-side and page loads the bridge', () => {
  assert.match(analysis, /sofa-analytics\.js\?v=20260704-revenue-v1/);
  assert.match(analysis, /sofaTrack\('analysis_view'/);
  assert.match(analytics, /\['analysis_view', 'analysis_view'\]/);
  assert.match(analytics, /\['analysis_checkout_click', 'analysis_checkout_click'\]/);
  assert.match(analytics, /analysis\.html/);
});

test('analysis page keeps public answer-source boundary honest', () => {
  assert.doesNotMatch(analysis, /保證考上/);
  assert.doesNotMatch(analysis, /AI 解析/);
  assert.match(analysis, /SoFa Engine 參考解析/);
  assert.match(analysis, /非官方答案/);
});

test('analysis diagnosis cards link directly into practice', () => {
  assert.match(analysis, /function practiceHref\(\{ law, article, pageId, medium, drill = false \}\)/);
  assert.match(analysis, /qs\.set\('utm_medium', medium\)/);
  assert.match(analysis, /qs\.set\('law', lawName\)/);
  assert.match(analysis, /qs\.set\('article', articleName\)/);
  assert.match(analysis, /qs\.set\('page_id', stablePageId\)/);
  assert.match(analysis, /if\(drill\) qs\.set\('drill', '1'\)/);
  assert.match(analysis, /qs\.set\('free', '1'\)/);
  assert.match(analysis, /qs\.set\('start', '1'\)/);
  assert.match(analysis, /practiceHref\(\{ law: lawName, article, pageId, medium: 'hero', drill: true \}\)/);
  assert.match(analysis, /practiceHref\(\{ law: lawName, article, pageId, medium: 'weak', drill: true \}\)/);
  assert.match(analysis, /practiceHref\(\{ law: lawName, medium: 'strong' \}\)/);
  assert.match(analysis, /practiceHref\(\{ law: item\.law \|\| '', medium: 'blindspot' \}\)/);
  assert.match(analysis, /practiceHref\(\{ law: lawName, article, pageId, medium: 'review', drill: true \}\)/);
  assert.match(analysis, /\.rowline:hover/);
  assert.match(analysis, /\.rowline:focus-visible/);
  assert.match(analysis, /\.chip:hover/);
  assert.match(analysis, /\.chip:focus-visible/);
});

test('analysis article practice links preserve stable article ids instead of relying on display text', () => {
  assert.match(analysis, /function stableArticleId\(item\)/);
  const source = [
    extractFunction(analysis, 'stableArticleId'),
    extractFunction(analysis, 'practiceHref'),
    'globalThis.stableArticleId = stableArticleId;',
    'globalThis.practiceHref = practiceHref;'
  ].join('\n');
  const sandbox = { URLSearchParams };
  vm.runInNewContext(source, sandbox);

  assert.equal(
    sandbox.stableArticleId({ top_articles: [{ article: '占有喪失逾二年質權消滅', page_id: '民法-908' }] }),
    '民法-908'
  );
  assert.equal(
    sandbox.stableArticleId({ article: '第36條', article_id: '消債-36' }),
    '消債-36'
  );
  const href = sandbox.practiceHref({
    law: '民法',
    article: '占有喪失逾二年質權消滅',
    pageId: '民法-908',
    medium: 'weak',
    drill: true
  });
  const parsed = new URL(href, 'https://sofaengine.org/');
  assert.equal(parsed.searchParams.get('page_id'), '民法-908');
  assert.equal(parsed.searchParams.get('article'), '占有喪失逾二年質權消滅');
  assert.equal(parsed.searchParams.get('drill'), '1');
});
