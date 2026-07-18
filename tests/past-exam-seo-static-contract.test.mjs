import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const seoRoot = new URL('past-exam/bookkeeper/', root);
const manifestUrl = new URL('manifest.json', seoRoot);

function read(url) {
  return readFileSync(url, 'utf8');
}

function collectHtml(dirUrl) {
  if (!existsSync(dirUrl)) return [];
  const found = [];
  for (const entry of readdirSync(dirUrl)) {
    const child = new URL(entry, dirUrl);
    const stat = statSync(child);
    if (stat.isDirectory()) {
      found.push(...collectHtml(new URL(`${entry}/`, dirUrl)));
    } else if (entry.endsWith('.html')) {
      found.push(child);
    }
  }
  return found;
}

function relativePath(url) {
  return decodeURIComponent(url.pathname.replace(root.pathname, ''));
}

test('past-exam SEO generator and manifest are committed', () => {
  assert.ok(existsSync(new URL('tools/build_past_exam_seo.mjs', root)), 'generator script must exist');
  assert.ok(existsSync(manifestUrl), 'generated manifest must exist');

  const manifest = JSON.parse(read(manifestUrl));
  assert.equal(manifest.scope, 'bookkeeper');
  assert.ok(manifest.generated_at, 'manifest should record generation time');
  assert.ok(manifest.indexed_count >= 480, 'should cover the current bookkeeper SEO supply');
  assert.equal(manifest.indexed_count, collectHtml(seoRoot).filter((url) => !url.pathname.endsWith('/index.html')).length);
  assert.ok(Array.isArray(manifest.excluded_missing_official_answer));
});

test('sample question pages are source-visible SEO pages, not JS-only shells', () => {
  const htmlFiles = collectHtml(seoRoot).filter((url) => !url.pathname.endsWith('/index.html'));
  assert.ok(htmlFiles.length >= 480, 'expected generated question pages');

  const samples = [
    htmlFiles.find((url) => relativePath(url).includes('/113/tax-laws/q01.html')),
    htmlFiles.find((url) => relativePath(url).includes('/109/bookkeeping-laws/q01.html')),
  ].filter(Boolean);

  assert.equal(samples.length, 2, 'expected stable bookkeeper sample pages');

  for (const pageUrl of samples) {
    const html = read(pageUrl);
    const rel = relativePath(pageUrl);
    const canonical = `https://sofaengine.org/${rel}`;

    assert.match(html, /<title>[^<]*(記帳士|稅務相關法規概要|記帳相關法規概要)[^<]*<\/title>/);
    assert.match(html, new RegExp(`<link rel="canonical" href="${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">`));
    assert.match(html, new RegExp(`<meta property="og:url" content="${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">`));
    assert.match(html, /<meta name="description" content="[^"]*考古題[^"]*官方答案[^"]*SoFa Engine 參考解析/);

    assert.match(html, /<h1>[^<]*第\s*\d+\s*題/);
    assert.match(html, /<section class="question-stem"/);
    for (const key of ['A', 'B', 'C', 'D']) {
      assert.match(html, new RegExp(`<span class="option-key">${key}</span>`), `missing option ${key} in ${rel}`);
    }
    assert.match(html, /考選部官方答案/);
    assert.match(html, /SoFa Engine 參考解析/);
    assert.match(html, /非考選部官方標準答案/);
    assert.match(html, /href="\/law-preview\.html\?/);
    assert.match(html, /href="\/quiz\.html\?mode=past-exam&track=bookkeeper&utm_source=seo&utm_medium=static_page&utm_campaign=past_exam_question"/);
    assert.doesNotMatch(html, /<script\b/i, 'static SEO question pages should not require client-side rendering');
  }
});

test('past-exam question URLs are discoverable by robots and sitemap', () => {
  const sitemap = read(new URL('sitemap.xml', root));
  const robots = read(new URL('robots.txt', root));
  const manifest = JSON.parse(read(manifestUrl));

  assert.match(robots, /Allow:\s*\/past-exam\//);
  assert.match(sitemap, /EX21_PAST_EXAM_SEO_START/);
  assert.match(sitemap, /https:\/\/sofaengine\.org\/past-exam\/bookkeeper\/114\/tax-laws\/q01\.html/);
  assert.match(sitemap, /https:\/\/sofaengine\.org\/past-exam\/bookkeeper\/109\/bookkeeping-laws\/q01\.html/);

  const locs = Array.from(sitemap.matchAll(/<loc>(https:\/\/sofaengine\.org\/past-exam\/bookkeeper\/[^<]+\.html)<\/loc>/g));
  assert.equal(locs.length, manifest.indexed_count + 1, 'sitemap should include question pages plus the bookkeeper index');
});
