import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'past-exam', 'bookkeeper');
const SITE_ORIGIN = 'https://sofaengine.org';
const BOOKKEEPER_SUBJECTS = new Set(['記帳相關法規概要', '稅務相關法規概要']);
const SUBJECT_SLUGS = new Map([
  ['記帳相關法規概要', 'bookkeeping-laws'],
  ['稅務相關法規概要', 'tax-laws'],
]);

function parseEnvFile(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const [key, ...rest] = line.split('=');
    out[key.trim()] = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
  return out;
}

async function loadSupabaseEnv() {
  const envPath = process.env.SUPABASE_ENV_FILE || '';
  const fileEnv = envPath ? parseEnvFile(await readFile(envPath, 'utf8')) : {};
  const url = process.env.SUPABASE_URL || fileEnv.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY, or SUPABASE_ENV_FILE pointing to a local env file.');
  }
  return { url: url.replace(/\/$/, ''), key };
}

function htmlEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function attrEscape(value) {
  return htmlEscape(value).replace(/`/g, '&#96;');
}

function textSnippet(value, max = 150) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function optionText(row, key) {
  const value = row[`option_${key.toLowerCase()}`] || '';
  return String(value).replace(/^[\s\uE000-\uF8FF]+/, '').trim();
}

async function fetchRest({ url, key }, table, select, params = {}) {
  const search = new URLSearchParams({ select, ...params });
  const endpoint = `${url}/rest/v1/${table}?${search.toString()}`;
  const rows = [];
  const pageSize = 1000;
  let start = 0;
  while (true) {
    const response = await fetch(endpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Range-Unit': 'items',
        Range: `${start}-${start + pageSize - 1}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Supabase REST ${table} failed: ${response.status} ${await response.text()}`);
    }
    const batch = await response.json();
    rows.push(...batch);
    if (batch.length < pageSize) return rows;
    start += pageSize;
  }
}

function pageRelPath(row) {
  const subjectSlug = SUBJECT_SLUGS.get(row.subject);
  const q = String(row.question_no).padStart(2, '0');
  return `past-exam/bookkeeper/${row.roc_year}/${subjectSlug}/q${q}.html`;
}

function canonicalForRel(relPath) {
  return `${SITE_ORIGIN}/${relPath}`;
}

function effectiveAnswer(row) {
  return row.answer || row.verified_answer || row.official_answer || '';
}

function renderParagraphs(text) {
  return String(text || '')
    .split(/\n{2,}|\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${htmlEscape(part)}</p>`)
    .join('\n          ');
}

function articleHref(article) {
  const params = new URLSearchParams();
  if (article.id) params.set('id', article.id);
  if (article.law_name) params.set('law', article.law_name);
  if (article.article_no) params.set('art', article.article_no);
  params.set('utm_source', 'seo');
  params.set('utm_medium', 'static_page');
  params.set('utm_campaign', 'past_exam_law_link');
  return `/law-preview.html?${params.toString()}`;
}

function renderLawLinks(row, articleMap) {
  const links = (Array.isArray(row.article_ids) ? row.article_ids : [])
    .map((id) => articleMap.get(id))
    .filter(Boolean);

  if (!links.length) {
    return `
        <p class="muted">本題法條對應仍在整理中；你可以先到公開法規索引查相關條文。</p>
        <a class="law-link" href="/law/index.html">查看公開法規索引</a>`;
  }

  return links.map((article) => {
    const lawName = article.law_name || '相關法規';
    const articleNo = article.article_no ? `第 ${article.article_no} 條` : '相關條文';
    return `<a class="law-link" href="${attrEscape(articleHref(article))}">${htmlEscape(lawName)} ${htmlEscape(articleNo)}</a>`;
  }).join('\n        ');
}

function renderQuestionPage(row, articleMap) {
  const relPath = pageRelPath(row);
  const canonical = canonicalForRel(relPath);
  const officialAnswer = row.official_answer;
  const sofaAnswer = effectiveAnswer(row);
  const title = `${row.roc_year} 年記帳士${row.subject}第 ${row.question_no} 題｜官方答案 ${officialAnswer}｜SoFa Engine`;
  const description = `${row.roc_year} 年記帳士${row.subject}第 ${row.question_no} 題考古題，含題目、選項、考選部官方答案與 SoFa Engine 參考解析。${textSnippet(row.stem, 72)}`;
  const options = ['a', 'b', 'c', 'd'].map((key) => {
    const upper = key.toUpperCase();
    return `
          <li class="${officialAnswer === upper ? 'official-option' : ''}">
            <span class="option-key">${upper}</span>
            <span>${htmlEscape(optionText(row, key))}</span>
          </li>`;
  }).join('');
  const conflict = row.answer_conflict
    ? `<p class="notice">本題有修法或判讀差異標記：考選部官方答案為 ${htmlEscape(officialAnswer)}，SoFa 現行法參考答案為 ${htmlEscape(sofaAnswer)}。</p>`
    : '';
  const lawChange = row.law_change_note ? `<p class="notice">${htmlEscape(row.law_change_note)}</p>` : '';
  const explanation = renderParagraphs(row.explanation) || '<p>本題解析尚待補強；目前僅保留官方答案與題目資料。</p>';

  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${htmlEscape(title)}</title>
  <meta name="description" content="${attrEscape(description)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${attrEscape(title)}">
  <meta property="og:description" content="${attrEscape(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="SoFa Engine">
  <link rel="stylesheet" href="/sofa.css">
  <style>
    :root{--navy:#0e2433;--paper:#fffaf4;--ink:#17212b;--muted:#65717b;--line:#e7ded4;--peach:#c9856c;--green:#2c6b58}
    body{margin:0;background:var(--paper);color:var(--ink);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Noto Sans TC",sans-serif;letter-spacing:0}
    main{max-width:860px;margin:0 auto;padding:28px 18px 56px}
    .brand{display:inline-flex;align-items:center;gap:8px;color:var(--muted);font-size:13px;text-decoration:none;margin-bottom:28px}
    .dot{width:8px;height:8px;background:var(--peach);border-radius:50%}
    h1{font-size:clamp(28px,5vw,46px);line-height:1.18;margin:0 0 14px;letter-spacing:0}
    .meta{color:var(--muted);font-size:14px;line-height:1.8;margin-bottom:22px}
    section{border-top:1px solid var(--line);padding:22px 0}
    h2{font-size:20px;margin:0 0 14px;letter-spacing:0}
    .question-stem{font-size:19px;line-height:1.8}
    .options{list-style:none;margin:18px 0 0;padding:0;display:grid;gap:10px}
    .options li{display:grid;grid-template-columns:38px 1fr;gap:10px;align-items:start;border:1px solid var(--line);border-radius:6px;padding:12px;background:#fff}
    .option-key{display:inline-flex;width:28px;height:28px;align-items:center;justify-content:center;border-radius:50%;background:#f0e5da;color:var(--navy);font-weight:700}
    .official-option{border-color:rgba(44,107,88,.55)!important}
    .answer{display:grid;gap:8px;background:#fff;border:1px solid var(--line);border-radius:6px;padding:14px}
    .answer b{color:var(--green)}
    .notice{background:#f8efe6;border-left:4px solid var(--peach);padding:10px 12px;margin:10px 0;color:#51382e}
    .analysis p{line-height:1.9;margin:0 0 12px}
    .muted{color:var(--muted);line-height:1.8}
    .law-links{display:flex;flex-wrap:wrap;gap:8px}
    .law-link,.cta{display:inline-flex;min-height:42px;align-items:center;justify-content:center;border-radius:5px;text-decoration:none}
    .law-link{border:1px solid var(--line);padding:0 12px;background:#fff;color:var(--navy)}
    .cta{background:var(--navy);color:#fff;padding:0 16px;font-weight:700}
    footer{color:var(--muted);font-size:13px;line-height:1.7}
  </style>
</head>
<body>
<main>
  <a class="brand" href="/"><span class="dot"></span>SOFA ENGINE</a>
  <article>
    <header>
      <h1>${htmlEscape(row.roc_year)} 年記帳士${htmlEscape(row.subject)}第 ${htmlEscape(row.question_no)} 題</h1>
      <div class="meta">歷屆考古題靜態頁｜科目：${htmlEscape(row.subject)}｜題號：${htmlEscape(row.question_no)}</div>
    </header>

    <section class="question-stem" aria-labelledby="question-title">
      <h2 id="question-title">題目</h2>
      <p>${htmlEscape(row.stem)}</p>
      <ol class="options">
${options}
      </ol>
    </section>

    <section aria-labelledby="answer-title">
      <h2 id="answer-title">答案</h2>
      <div class="answer">
        <div><b>考選部官方答案：</b>${htmlEscape(officialAnswer)}</div>
        <div><b>SoFa Engine 參考答案：</b>${htmlEscape(sofaAnswer)}</div>
        <div class="muted">SoFa Engine 參考解析，非考選部官方標準答案。</div>
      </div>
      ${conflict}
      ${lawChange}
    </section>

    <section class="analysis" aria-labelledby="analysis-title">
      <h2 id="analysis-title">SoFa Engine 參考解析</h2>
      ${explanation}
    </section>

    <section aria-labelledby="law-title">
      <h2 id="law-title">相關法條</h2>
      <div class="law-links">
        ${renderLawLinks(row, articleMap)}
      </div>
    </section>

    <section aria-labelledby="practice-title">
      <h2 id="practice-title">免費練習</h2>
      <p class="muted">做完這題後，可以進入免費考古題練習；登入後再保留答題紀錄、弱點與複習排程。</p>
      <a class="cta" href="/quiz.html?mode=past-exam&track=bookkeeper&utm_source=seo&utm_medium=static_page&utm_campaign=past_exam_question">開始免費考古題練習</a>
    </section>
  </article>
  <footer>
    <p>資料來源為 SoFa Engine 已匯入的歷屆考古題資料；官方答案以資料庫欄位 <code>official_answer</code> 呈現，解析為 SoFa Engine 參考解析。</p>
  </footer>
</main>
</body>
</html>
`;
}

function renderIndex(rows, manifest) {
  const grouped = new Map();
  for (const row of rows) {
    const key = `${row.roc_year} ${row.subject}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  const groups = Array.from(grouped.entries()).map(([label, items]) => `
      <section>
        <h2>${htmlEscape(label)}</h2>
        <div class="links">
          ${items.map((row) => `<a href="/${pageRelPath(row)}">第 ${htmlEscape(row.question_no)} 題</a>`).join('\n          ')}
        </div>
      </section>`).join('\n');

  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>記帳士考古題靜態索引｜SoFa Engine</title>
  <meta name="description" content="記帳士歷屆考古題靜態索引，含官方答案、SoFa Engine 參考解析與免費練習入口。">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${SITE_ORIGIN}/past-exam/bookkeeper/index.html">
  <meta property="og:url" content="${SITE_ORIGIN}/past-exam/bookkeeper/index.html">
  <meta property="og:title" content="記帳士考古題靜態索引｜SoFa Engine">
  <meta property="og:description" content="記帳士歷屆考古題靜態索引，含官方答案、SoFa Engine 參考解析與免費練習入口。">
  <style>
    body{margin:0;background:#fffaf4;color:#17212b;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Noto Sans TC",sans-serif;letter-spacing:0}
    main{max-width:980px;margin:0 auto;padding:32px 18px 60px}
    h1{font-size:clamp(30px,5vw,52px);line-height:1.1;margin:0 0 12px;letter-spacing:0}
    .summary{color:#65717b;line-height:1.8;margin-bottom:22px}
    section{border-top:1px solid #e7ded4;padding:18px 0}
    h2{font-size:18px;margin:0 0 12px}
    .links{display:flex;flex-wrap:wrap;gap:8px}
    a{display:inline-flex;min-height:38px;align-items:center;border:1px solid #e7ded4;border-radius:5px;padding:0 10px;color:#0e2433;text-decoration:none;background:#fff}
  </style>
</head>
<body>
<main>
  <h1>記帳士考古題靜態索引</h1>
  <p class="summary">本索引目前收錄 ${manifest.indexed_count} 題含官方答案的記帳士歷屆考古題。缺官方答案或非單一官方答案者不列為一般 SEO 題頁，避免誤導考生。</p>
  ${groups}
</main>
</body>
</html>
`;
}

async function writeQuestionPages(rows, articleMap, manifest) {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });
  const relPaths = ['past-exam/bookkeeper/index.html'];

  for (const row of rows) {
    const relPath = pageRelPath(row);
    const absPath = path.join(ROOT, relPath);
    await mkdir(path.dirname(absPath), { recursive: true });
    await writeFile(absPath, renderQuestionPage(row, articleMap), 'utf8');
    relPaths.push(relPath);
  }

  await writeFile(path.join(OUT_DIR, 'index.html'), renderIndex(rows, manifest), 'utf8');
  await writeFile(path.join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return relPaths;
}

async function updateSitemap(relPaths) {
  const sitemapPath = path.join(ROOT, 'sitemap.xml');
  const start = '<!-- EX21_PAST_EXAM_SEO_START -->';
  const end = '<!-- EX21_PAST_EXAM_SEO_END -->';
  const urls = relPaths.map((relPath) => `  <url>\n    <loc>${canonicalForRel(relPath)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${relPath.endsWith('/index.html') ? '0.80' : '0.64'}</priority>\n  </url>`).join('\n');
  const block = `${start}\n${urls}\n  ${end}`;

  let sitemap = existsSync(sitemapPath) ? await readFile(sitemapPath, 'utf8') : '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n';
  const blockPattern = new RegExp(`\\n?\\s*${start}[\\s\\S]*?${end}\\n?`, 'm');
  sitemap = sitemap.replace(blockPattern, '\n');
  sitemap = sitemap.replace(/\s*<\/urlset>\s*$/, `\n  ${block}\n</urlset>\n`);
  await writeFile(sitemapPath, sitemap, 'utf8');
}

async function buildArticleMap(supabase, rows) {
  const ids = Array.from(new Set(rows.flatMap((row) => Array.isArray(row.article_ids) ? row.article_ids : []).filter(Boolean)));
  const map = new Map();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const params = { id: `in.(${chunk.join(',')})` };
    const articles = await fetchRest(
      supabase,
      'articles',
      'id,notion_page_id,article_no,title,statute_id,statutes(name)',
      params,
    );
    for (const article of articles) {
      map.set(article.id, {
        ...article,
        law_name: article.statutes?.name || '',
      });
    }
  }
  return map;
}

function sortQuestions(a, b) {
  return Number(b.roc_year) - Number(a.roc_year)
    || String(a.subject).localeCompare(String(b.subject), 'zh-Hant')
    || Number(a.question_no) - Number(b.question_no);
}

async function main() {
  const supabase = await loadSupabaseEnv();
  const rows = await fetchRest(
    supabase,
    'exam_questions',
    'id,roc_year,subject,question_no,stem,option_a,option_b,option_c,option_d,answer,official_answer,verified_answer,answer_conflict,law_change_note,explanation,article_ids,verify_status',
    { order: 'roc_year.desc,subject.asc,question_no.asc' },
  );
  const bookkeeperRaw = rows
    .filter((row) => BOOKKEEPER_SUBJECTS.has(row.subject))
    .sort(sortQuestions);
  const indexed = bookkeeperRaw.filter((row) => String(row.official_answer || '').trim());
  const excludedMissingOfficial = bookkeeperRaw
    .filter((row) => !String(row.official_answer || '').trim())
    .map((row) => ({
      id: row.id,
      roc_year: row.roc_year,
      subject: row.subject,
      question_no: row.question_no,
      verify_status: row.verify_status || '',
      article_ids_count: Array.isArray(row.article_ids) ? row.article_ids.filter(Boolean).length : 0,
    }));
  const articleMap = await buildArticleMap(supabase, indexed);
  const manifest = {
    scope: 'bookkeeper',
    source_table: 'exam_questions',
    generated_at: new Date().toISOString(),
    raw_bookkeeper_count: bookkeeperRaw.length,
    indexed_count: indexed.length,
    rows_with_article_links: indexed.filter((row) => Array.isArray(row.article_ids) && row.article_ids.some(Boolean)).length,
    expected_issue_count_note: 'Issue #60 requested 583. Current production has 588 bookkeeper raw rows and 580 rows with official_answer; rows without official_answer are excluded from normal SEO pages.',
    excluded_missing_official_answer: excludedMissingOfficial,
  };
  const relPaths = await writeQuestionPages(indexed, articleMap, manifest);
  await updateSitemap(relPaths);
  console.log(JSON.stringify({
    ok: true,
    indexed_count: manifest.indexed_count,
    raw_bookkeeper_count: manifest.raw_bookkeeper_count,
    rows_with_article_links: manifest.rows_with_article_links,
    excluded_missing_official_answer: manifest.excluded_missing_official_answer.length,
  }));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
