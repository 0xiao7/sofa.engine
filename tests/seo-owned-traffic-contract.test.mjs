import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const sitemap = readFileSync(new URL('sitemap.xml', root), 'utf8');
const robots = readFileSync(new URL('robots.txt', root), 'utf8');

test('private and payment pages stay out of the public sitemap', () => {
  for (const page of ['dashboard.html', 'login.html', 'checkout.html', 'notes.html', 'law-monitor.html']) {
    assert.doesNotMatch(sitemap, new RegExp(`https://sofaengine\\.org/${page}`), `${page} should not be in sitemap`);
  }
});

test('private and payment pages declare noindex', () => {
  for (const page of ['dashboard.html', 'login.html', 'checkout.html', 'notes.html', 'law-monitor.html']) {
    const html = readFileSync(new URL(page, root), 'utf8');
    assert.match(html, /<meta\s+name=["']robots["']\s+content=["']noindex,\s*nofollow["']\s*\/?>/i, `${page} should be noindex,nofollow`);
  }
});

test('robots and llms expose search retrieval without opening training crawlers', () => {
  assert.match(robots, /User-agent:\s*OAI-SearchBot[\s\S]*?Allow:\s*\//);
  for (const bot of ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot']) {
    assert.match(robots, new RegExp(`User-agent:\\s*${bot}[\\s\\S]*?Disallow:\\s*/`), `${bot} should remain blocked`);
  }
  assert.match(robots, /Sitemap:\s*https:\/\/sofaengine\.org\/sitemap\.xml/);

  assert.ok(existsSync(new URL('llms.txt', root)), 'llms.txt should exist');
  const llms = readFileSync(new URL('llms.txt', root), 'utf8');
  assert.match(llms, /Canonical public pages:/);
  assert.match(llms, /https:\/\/sofaengine\.org\/pricing\.html/);
  assert.match(llms, /\/checkout\.html is a payment handoff page/);
  assert.match(llms, /Training crawlers remain blocked by robots\.txt/);
});
