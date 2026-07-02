import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);

function encodePathSegment(name) {
  return encodeURIComponent(name).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

test('sitemap exposes generated individual law pages for search discovery', () => {
  const sitemap = readFileSync(new URL('sitemap.xml', root), 'utf8');
  const lawFiles = readdirSync(new URL('law/', root))
    .filter((name) => name.endsWith('.html') && name !== 'index.html')
    .sort((a, b) => a.localeCompare(b, 'zh-Hant'));

  assert.ok(lawFiles.length >= 500, 'expected the public law library to include the full generated corpus');

  const missing = lawFiles.filter((name) => {
    const loc = `https://sofaengine.org/law/${encodePathSegment(name)}`;
    return !sitemap.includes(loc);
  });

  assert.equal(
    missing.length,
    0,
    `sitemap is missing law pages: ${missing.slice(0, 12).join(', ')}`
  );
});
