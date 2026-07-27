import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pages = [
  'index.html',
  'free.html',
  'login.html',
  'pricing.html',
  'blog/index.html',
  'blog/how-to-read-bookkeeper-laws.html',
  'blog/bookkeeper-exam-high-frequency-laws.html',
  'blog/bookkeeper-exam-tools-comparison.html',
];

test('public free quiz entries lead to a bounded five-question result session', () => {
  let checked = 0;
  for (const file of pages) {
    const html = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    const hrefs = [...html.matchAll(/href="([^"]*quiz\.html\?[^"]*)"/g)]
      .map((match) => match[1].replaceAll('&amp;', '&'))
      .filter((href) => href.includes('free_quiz_entry') || href.includes('read_laws_') || href.includes('high_frequency_') || href.includes('tools_comparison_') || href.includes('blog_index_'));

    assert.ok(hrefs.length > 0, `${file} must expose a tracked free quiz entry`);
    for (const href of hrefs) {
      checked += 1;
      const url = new URL(href, 'https://sofaengine.org/');
      assert.equal(url.searchParams.get('session'), '1', `${file}: ${href}`);
      assert.equal(url.searchParams.get('count'), '5', `${file}: ${href}`);
    }
  }
  assert.ok(checked >= 12, `expected at least 12 public free entries, got ${checked}`);
});
