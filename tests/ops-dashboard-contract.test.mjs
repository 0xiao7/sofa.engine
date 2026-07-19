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
  assert.match(html, /id="businessDiagnosisPanel"/);
  assert.match(html, /id="needSignalsPanel"/);
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
  assert.match(html, /renderBusinessDiagnosis\(snapshot\.businessDiagnosis/);
  assert.match(html, /renderNeedSignals\(snapshot\.needSignals/);
  assert.match(html, /renderAlertTimeline\(snapshot\.alerts/);
  assert.match(html, /資料待接/);
  assert.doesNotMatch(html, /753/);
  assert.doesNotMatch(html, /payment button clicks 0/i);
});

test('ops dashboard documents the usage-vs-conversion diagnosis model', () => {
  const html = readFileSync(pageUrl, 'utf8');

  assert.match(html, /商業診斷/);
  assert.match(html, /沒收入不等於沒人用/);
  assert.match(html, /traffic/);
  assert.match(html, /value_bridge/);
  assert.match(html, /pricing_to_checkout/);
  assert.match(html, /checkout_submit/);
  assert.match(html, /payment_completion/);
  assert.match(html, /怎麼改/);
});

test('ops dashboard documents customer need signals without inventing unavailable behavior', () => {
  const html = readFileSync(pageUrl, 'utf8');

  assert.match(html, /需求訊號/);
  assert.match(html, /不要亂讀/);
  assert.match(html, /保存進度/);
  assert.match(html, /找弱點/);
  assert.match(html, /考前付費意圖/);
  assert.match(html, /不是訪談結論/);
  assert.match(html, /不把未埋點行為算進來/);
});

test('ops dashboard fetches the live safe snapshot without exposing secrets', () => {
  const html = readFileSync(pageUrl, 'utf8');

  assert.match(html, /const OPS_SNAPSHOT_URL/);
  assert.match(html, /https:\/\/fay-spectrum-bot\.onrender\.com\/sofa_ops_snapshot\?days=7/);
  assert.match(html, /function fetchOpsSnapshot/);
  assert.match(html, /fetch\(OPS_SNAPSHOT_URL/);
  assert.match(html, /renderDashboard\(snapshot\)/);
  assert.match(html, /catch/);
  assert.doesNotMatch(html, /SOFA_API_ADMIN_SECRET/);
  assert.doesNotMatch(html, /LINE_CHANNEL_ACCESS_TOKEN/);
  assert.doesNotMatch(html, /user_id|email_hash/i);
  assert.doesNotMatch(html, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
});
