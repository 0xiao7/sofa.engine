import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const pageUrl = new URL('ops-dashboard.html', root);

test('ops dashboard is an internal noindex page with trend sections', () => {
  assert.ok(existsSync(pageUrl), 'ops-dashboard.html should exist');
  const html = readFileSync(pageUrl, 'utf8');

  assert.match(html, /<meta\s+name="robots"\s+content="noindex,nofollow"\s*\/?>/i);
  assert.match(html, /<title>SoFa Ops Dashboard<\/title>/);
  assert.match(html, /id="opsStatus"/);
  assert.match(html, /id="lineQuotaChart"/);
  assert.match(html, /id="revenueFunnelChart"/);
  assert.match(html, /id="alertTimeline"/);
  assert.match(html, /id="opsActionList"/);
});

test('ops dashboard exposes anchors used by the internal LINE test lab rich menu', () => {
  const html = readFileSync(pageUrl, 'utf8');

  assert.match(html, /id="overview"/);
  assert.match(html, /id="revenue"/);
  assert.match(html, /id="alerts"/);
});

test('ops dashboard documents alert-only LINE policy and avoids public sitemap indexing', () => {
  const html = readFileSync(pageUrl, 'utf8');
  const sitemap = readFileSync(new URL('sitemap.xml', root), 'utf8');

  assert.match(html, /LINE 只在警告時推播/);
  assert.match(html, /綠燈不推/);
  assert.match(html, /橘燈連續異常才推/);
  assert.match(html, /紅燈立即推/);
  assert.doesNotMatch(sitemap, /ops-dashboard\.html/);
});

test('ops dashboard renders from a bounded snapshot instead of hard-coded fake metrics', () => {
  const html = readFileSync(pageUrl, 'utf8');

  assert.match(html, /const OPS_SNAPSHOT/);
  assert.match(html, /renderQuotaChart\(snapshot\.lineQuota/);
  assert.match(html, /renderFunnelChart\(snapshot\.revenueFunnel/);
  assert.match(html, /renderAlertTimeline\(snapshot\.alerts/);
  assert.match(html, /資料待接/);
  assert.doesNotMatch(html, /753/);
  assert.doesNotMatch(html, /payment button clicks 0/i);
});
