import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);

function pagePathFromLoc(loc) {
  const url = new URL(loc);
  const pathname = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  return pathname || 'index.html';
}

test('sitemap html pages declare canonical targets or explicit noindex', () => {
  const sitemap = readFileSync(new URL('sitemap.xml', root), 'utf8');
  const locs = Array.from(sitemap.matchAll(/<loc>(.*?)<\/loc>/g), (match) => match[1]);
  const missing = [];

  for (const loc of locs) {
    const relPath = pagePathFromLoc(loc);
    if (!relPath.endsWith('.html')) continue;

    const pageUrl = new URL(relPath, root);
    if (!existsSync(pageUrl)) continue;

    const html = readFileSync(pageUrl, 'utf8');
    const hasCanonical = /<link\b[^>]*\brel=["']canonical["'][^>]*>/i.test(html);
    const hasNoindex = /<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["'][^"']*noindex/i.test(html);
    if (!hasCanonical && !hasNoindex) missing.push(relPath);
  }

  assert.deepEqual(missing, [], `missing canonical/noindex: ${missing.join(', ')}`);
});

test('law preview declares canonical URL for dynamic article pages', () => {
  const html = readFileSync(new URL('law-preview.html', root), 'utf8');

  assert.match(html, /<link\b[^>]*\brel=["']canonical["'][^>]*>/i);
  assert.match(html, /function\s+updateCanonicalUrl\(/);
  assert.match(html, /canonical\.searchParams\.set\('law',\s*lawName\)/);
  assert.match(html, /canonical\.searchParams\.set\('art',\s*artNo\)/);
  assert.match(html, /canonical\.searchParams\.set\('id',\s*articleId\)/);
});

test('sitemap law pages use the same encoded URL in canonical metadata', () => {
  const sitemap = readFileSync(new URL('sitemap.xml', root), 'utf8');
  const locs = Array.from(sitemap.matchAll(/<loc>(https:\/\/sofaengine\.org\/law\/[^<]+\.html)<\/loc>/g), (match) => match[1])
    .filter((loc) => !loc.endsWith('/law/index.html'));
  const mismatched = [];

  for (const loc of locs) {
    const relPath = pagePathFromLoc(loc);
    const pageUrl = new URL(relPath, root);
    if (!existsSync(pageUrl)) continue;

    const html = readFileSync(pageUrl, 'utf8');
    const canonical = html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i)?.[1];
    const jsonLdUrl = html.match(/"url"\s*:\s*"([^"]+)"/)?.[1];

    if (canonical !== loc || jsonLdUrl !== loc) {
      mismatched.push(`${relPath}: canonical=${canonical || '(missing)'}, jsonLd=${jsonLdUrl || '(missing)'}, sitemap=${loc}`);
    }
  }

  assert.equal(
    mismatched.length,
    0,
    `law canonical URLs must match sitemap URLs exactly: ${mismatched.slice(0, 8).join('; ')}`
  );
});
