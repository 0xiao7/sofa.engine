import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const pagePath = new URL('support-serial.html', root);
const page = () => readFileSync(pagePath, 'utf8');

test('support serial page is a noindex read-only admin surface', () => {
  assert.ok(existsSync(pagePath), 'support-serial.html should exist');
  const html = page();
  assert.match(html, /<meta name="robots" content="noindex,nofollow"/);
  assert.match(html, /只讀查詢/);
  assert.match(html, /不會重發/);
  assert.match(html, /active_members/);
  assert.match(html, /pending_serials/);
  assert.match(html, /issue_history/);
});

test('support serial page calls the guarded admin identity endpoint without storing secrets', () => {
  const html = page();
  assert.match(html, /\/api\/admin\/serial-identity/);
  assert.match(html, /X-Admin-Secret/);
  assert.match(html, /X-Sofa-UID/);
  assert.doesNotMatch(html, /localStorage\.(setItem|getItem)/);
  assert.doesNotMatch(html, /sessionStorage\.(setItem|getItem)/);
  assert.doesNotMatch(html, /SCHEDULER_SECRET|SUPABASE_SERVICE|SERVICE_KEY|ADMIN_UID/);
});

test('support serial page is not published in public discovery files', () => {
  const sitemap = readFileSync(new URL('sitemap.xml', root), 'utf8');
  const robots = readFileSync(new URL('robots.txt', root), 'utf8');
  assert.doesNotMatch(sitemap, /support-serial\.html/);
  assert.doesNotMatch(robots, /support-serial\.html/);
});
