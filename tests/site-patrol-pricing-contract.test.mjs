import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const scriptPath = new URL('../tools/site_patrol.mjs', import.meta.url);

function writeFixtureRoot(pricingHtml) {
  const root = mkdtempSync(path.join(tmpdir(), 'site-patrol-pricing-'));
  mkdirSync(path.join(root, 'docs'), { recursive: true });
  writeFileSync(
    path.join(root, 'exam-plan-contract.json'),
    JSON.stringify({
      plans: [
        { name: '月費', frontend_amount: 380 },
        { name: '季費', frontend_amount: 990 },
        { name: '到考日', frontend_amount: 1280 },
      ],
      exam_keys: [],
      exams: {},
    }),
  );
  writeFileSync(path.join(root, 'pricing.html'), pricingHtml);
  return root;
}

function runPatrol(root) {
  const result = spawnSync(process.execPath, [scriptPath.pathname], {
    cwd: root,
    env: {
      ...process.env,
      SITE_PATROL_TIMEOUT_MS: '10',
      SOFA_API_BASE: 'http://127.0.0.1:9',
    },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return readFileSync(path.join(root, 'docs/2026-07-16_ex10_site_patrol_report.md'), 'utf8');
}

test('pricing patrol compares visible NT amounts inside each data-plan block', () => {
  const root = writeFixtureRoot(`
    <!doctype html>
    <html>
      <head><title>Pricing</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="overflow-x:hidden">
        <section class="plan-card">
          <div class="plan-price"><span>NT$</span><span>381</span></div>
          <a href="/checkout.html?plan=月費" data-plan="月費">選月訂閱</a>
        </section>
      </body>
    </html>
  `);

  const report = runPatrol(root);

  assert.match(report, /🔴 plan 月費 visible amount 381 does not match contract 380/);
});

test('pricing patrol warns when a page should be compared but has zero comparable plan blocks', () => {
  const root = writeFixtureRoot(`
    <!doctype html>
    <html>
      <head><title>Pricing</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="overflow-x:hidden">
        <a href="/checkout.html?plan=月費" data-plan="月費">選月訂閱</a>
      </body>
    </html>
  `);

  const report = runPatrol(root);

  assert.match(report, /🟡 pricing contract comparison found 0 comparable plan blocks/);
});

test('pricing patrol accepts a plan block when the contract amount appears among other NT amounts', () => {
  const root = writeFixtureRoot(`
    <!doctype html>
    <html>
      <head><title>Pricing</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="overflow-x:hidden">
        <section class="plan-card">
          <div class="plan-price"><span>NT$</span><span>990</span></div>
          <div class="plan-save">省 NT$150，平均 NT$11 / 日</div>
          <a href="/checkout.html?plan=季費" data-plan="季費">選季訂閱</a>
        </section>
      </body>
    </html>
  `);

  const report = runPatrol(root);

  assert.doesNotMatch(report, /plan 季費 visible amount .* does not match contract 990/);
});

test('pricing patrol accepts checkout plan blocks when savings text appears before the price', () => {
  const root = writeFixtureRoot(`
    <!doctype html>
    <html>
      <head><title>Pricing</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="overflow-x:hidden">
        <div class="plan" data-plan="季費" data-amount="990">
          <div class="name-row"><span class="badge save">省 NT$ 150</span></div>
          <div class="price"><span>NT$</span>990</div>
        </div>
      </body>
    </html>
  `);

  const report = runPatrol(root);

  assert.doesNotMatch(report, /plan 季費 visible amount 150 does not match contract 990/);
});
