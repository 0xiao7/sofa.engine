import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {chromium, request as playwrightRequest} from 'playwright';

const BASE_URL = (process.env.SOFA_SITE_BASE || 'https://sofaengine.org').replace(/\/+$/, '');
const API_URL = (process.env.SOFA_API_BASE || 'https://sofa-engine-api.onrender.com').replace(/\/+$/, '');
const REPORT_PATH = process.env.SITE_EXAM_PATROL_REPORT || 'artifacts/site-exam-patrol.json';
const TIMEOUT_MS = Number(process.env.SITE_EXAM_PATROL_TIMEOUT_MS || 20000);
const MAX_PAGE_ERRORS = 20;
const MAX_SUBJECTS = 100;
const MAX_SUBJECT_LENGTH = 120;
const MAX_EVIDENCE_LENGTH = 2000;
const MAX_REPORT_BYTES = 1024 * 1024;

const PAGES = [
  {path: 'index.html', primaryCta: true},
  {path: 'dashboard.html', primaryCta: false},
  {path: 'quiz.html?mode=past-exam&exam=bookkeeper', primaryCta: false},
  {path: 'exam.html?exam=bookkeeper', primaryCta: true},
  {path: 'past-exam-radar.html', primaryCta: true},
  {path: 'bookkeeper.html', primaryCta: true},
  {path: 'pricing.html', primaryCta: true},
  {path: 'checkout.html', primaryCta: true},
];

const VIEWPORTS = [
  {name: 'desktop', width: 1440, height: 900},
  {name: 'mobile', width: 390, height: 844},
];

const EXAM_SCOPES = {
  bookkeeper: {
    total: 708,
    subjects: new Set(['會計學概要', '稅務相關法規概要', '記帳相關法規概要']),
    years: [104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114],
  },
  real_estate_broker: {total: 0, subjects: new Set(), years: []},
  land_agent: {total: 0, subjects: new Set(), years: []},
};

const UNFINISHED_COPY_RE = /(TODO|FIXME|尚未實作|coming soon|lorem ipsum)/i;

function incidentKey(code, target, viewport = 'none') {
  return `${code}:${target}:${viewport}`.replace(/[^a-zA-Z0-9:_?=&.-]+/g, '_');
}

function finding({severity, code, target, viewport, expected, actual, evidenceUrl}) {
  const boundedEvidence = value => {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return String(text ?? '').slice(0, MAX_EVIDENCE_LENGTH);
  };
  return {
    incidentKey: incidentKey(code, target, viewport),
    severity,
    code,
    target,
    viewport: viewport || null,
    expected: boundedEvidence(expected),
    actual: boundedEvidence(actual),
    evidenceUrl,
  };
}

async function auditPage(browser, spec, viewport) {
  const url = `${BASE_URL}/${spec.path}`;
  const context = await browser.newContext({viewport});
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const blockedRequests = [];
  await context.route('**/*', async route => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.continue();
      return;
    }
    if (blockedRequests.length < MAX_PAGE_ERRORS) {
      blockedRequests.push({
        method,
        url: route.request().url().slice(0, 500),
      });
    }
    await route.abort();
  });
  page.on('console', message => {
    if (message.type() === 'error' && consoleErrors.length < MAX_PAGE_ERRORS) {
      consoleErrors.push(message.text().slice(0, 300));
    }
  });
  page.on('pageerror', error => {
    if (pageErrors.length < MAX_PAGE_ERRORS) {
      pageErrors.push(String(error.message || error).slice(0, 300));
    }
  });

  const findings = [];
  let response = null;
  try {
    response = await page.goto(url, {waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS});
    await page.waitForTimeout(800);
  } catch (error) {
    findings.push(finding({
      severity: 'P0',
      code: 'navigation_failed',
      target: spec.path,
      viewport: viewport.name,
      expected: 'page loads without navigation failure',
      actual: String(error.message || error).slice(0, 300),
      evidenceUrl: url,
    }));
    await context.close();
    return {url, status: response?.status() || 0, findings};
  }

  const status = response?.status() || 0;
  if (status >= 400) {
    findings.push(finding({
      severity: 'P0',
      code: 'http_status',
      target: spec.path,
      viewport: viewport.name,
      expected: 'HTTP status below 400',
      actual: status,
      evidenceUrl: url,
    }));
  }

  const metrics = await page.evaluate(() => {
    const body = document.body;
    const root = document.documentElement;
    const visible = element => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const cta = [...document.querySelectorAll('a,button')]
      .find(element => visible(element) && /開始|練習|付款|方案|登入|下一步|立即/.test(element.textContent || ''));
    return {
      title: document.title.slice(0, 200),
      scrollWidth: Math.max(body?.scrollWidth || 0, root?.scrollWidth || 0),
      clientWidth: root?.clientWidth || innerWidth,
      primaryCta: cta ? (cta.textContent || '').trim().slice(0, 120) : '',
      unfinished_copy: (body?.innerText || '').slice(0, 120000),
    };
  });

  if (metrics.scrollWidth > metrics.clientWidth + 2) {
    findings.push(finding({
      severity: 'P1',
      code: 'horizontal_overflow',
      target: spec.path,
      viewport: viewport.name,
      expected: `scrollWidth <= ${metrics.clientWidth + 2}`,
      actual: metrics.scrollWidth,
      evidenceUrl: url,
    }));
  }
  if (spec.primaryCta && !metrics.primaryCta) {
    findings.push(finding({
      severity: 'P1',
      code: 'primary_cta_missing',
      target: spec.path,
      viewport: viewport.name,
      expected: 'one visible primaryCta',
      actual: 'none',
      evidenceUrl: url,
    }));
  }
  if (UNFINISHED_COPY_RE.test(metrics.unfinished_copy)) {
    findings.push(finding({
      severity: 'P1',
      code: 'unfinished_copy',
      target: spec.path,
      viewport: viewport.name,
      expected: 'no unfinished production wording',
      actual: metrics.unfinished_copy.match(UNFINISHED_COPY_RE)?.[0] || 'matched',
      evidenceUrl: url,
    }));
  }
  const visibleRuntimeErrors = [...consoleErrors, ...pageErrors].filter(
    message => !(blockedRequests.length && message === 'Failed to load resource: net::ERR_FAILED'),
  );
  for (const message of visibleRuntimeErrors) {
    findings.push(finding({
      severity: 'P1',
      code: 'console_error',
      target: spec.path,
      viewport: viewport.name,
      expected: 'no console or page errors',
      actual: message,
      evidenceUrl: url,
    }));
  }
  const expectedTrackingWrite = blocked => {
    try {
      const parsed = new URL(blocked.url);
      return (
        ['www.google-analytics.com', 'www.google.com'].includes(parsed.hostname)
        && parsed.pathname === '/g/collect'
      ) || (
        parsed.origin === API_URL
        && parsed.pathname === '/api/funnel-event'
      );
    } catch {
      return false;
    }
  };
  const unexpectedBlocked = blockedRequests.filter(blocked => !expectedTrackingWrite(blocked));
  if (blockedRequests.length) {
    findings.push(finding({
      severity: unexpectedBlocked.length ? 'P0' : 'P1',
      code: unexpectedBlocked.length ? 'blocked_non_get' : 'blocked_tracking_write',
      target: spec.path,
      viewport: viewport.name,
      expected: 'GET-only browser traffic',
      actual: unexpectedBlocked.length
        ? unexpectedBlocked
        : `${blockedRequests.length} analytics writes blocked`,
      evidenceUrl: url,
    }));
  }

  await context.close();
  return {
    url,
    status,
    title: metrics.title,
    viewport: viewport.name,
    dimensions: {width: viewport.width, height: viewport.height},
    scrollWidth: metrics.scrollWidth,
    clientWidth: metrics.clientWidth,
    primaryCta: metrics.primaryCta,
    consoleErrors,
    pageErrors,
    blockedRequests,
    findings,
  };
}

async function auditExamApis(request) {
  const results = [];
  const findings = [];
  for (const [examKey, expected] of Object.entries(EXAM_SCOPES)) {
    const url = `${API_URL}/api/past-exam/meta?exam_key=${encodeURIComponent(examKey)}`;
    try {
      const response = await request.get(url, {timeout: TIMEOUT_MS});
      const body = await response.json().catch(() => ({}));
      const subjects = Array.isArray(body.subjects)
        ? body.subjects
          .slice(0, MAX_SUBJECTS)
          .map(subject => String(subject).slice(0, MAX_SUBJECT_LENGTH))
        : [];
      const years = Array.isArray(body.years)
        ? body.years.map(Number).filter(Number.isFinite).sort((a, b) => a - b)
        : [];
      const parsedTotal = Number(body.total);
      const actualTotal = Number.isFinite(parsedTotal) ? parsedTotal : null;
      const actualSubjects = [...subjects].sort();
      const expectedSubjects = [...expected.subjects].sort();
      const scopeMatches = (
        actualTotal === expected.total
        && JSON.stringify(actualSubjects) === JSON.stringify(expectedSubjects)
        && JSON.stringify(years) === JSON.stringify(expected.years)
      );
      results.push({
        examKey,
        status: response.status(),
        total: actualTotal,
        subjects,
        years,
      });
      if (response.status() >= 400 || !scopeMatches) {
        findings.push(finding({
          severity: 'P0',
          code: response.status() >= 400 ? 'exam_meta_http' : 'exam_scope_mismatch',
          target: examKey,
          expected: response.status() >= 400
            ? 'HTTP status below 400'
            : {total: expected.total, subjects: expectedSubjects, years: expected.years},
          actual: response.status() >= 400
            ? response.status()
            : {total: actualTotal, subjects: actualSubjects, years},
          evidenceUrl: url,
        }));
      }
    } catch (error) {
      findings.push(finding({
        severity: 'P0',
        code: 'exam_meta_unavailable',
        target: examKey,
        expected: 'read-only exam metadata response',
        actual: String(error.message || error).slice(0, 300),
        evidenceUrl: url,
      }));
    }
  }
  return {results, findings};
}

async function main() {
  const browser = await chromium.launch({headless: true});
  const request = await playwrightRequest.newContext();
  const pageResults = [];
  try {
    for (const spec of PAGES) {
      for (const viewport of VIEWPORTS) {
        pageResults.push(await auditPage(browser, spec, viewport));
      }
    }
    const api = await auditExamApis(request);
    const findings = [...pageResults.flatMap(result => result.findings), ...api.findings];
    const report = {
      schemaVersion: 'sofa-site-exam-patrol-v1',
      read_only: true,
      generatedAt: new Date().toISOString(),
      siteBase: BASE_URL,
      apiBase: API_URL,
      summary: {
        pages: pageResults.length,
        apiScopes: api.results.length,
        P0: findings.filter(item => item.severity === 'P0').length,
        P1: findings.filter(item => item.severity === 'P1').length,
      },
      pages: pageResults.map(({findings: _findings, ...result}) => result),
      examApi: api.results,
      findings: findings.slice(0, 200),
    };
    await fs.mkdir(path.dirname(REPORT_PATH), {recursive: true});
    let serialized = `${JSON.stringify(report, null, 2)}\n`;
    if (Buffer.byteLength(serialized, 'utf8') > MAX_REPORT_BYTES) {
      serialized = `${JSON.stringify({
        schemaVersion: report.schemaVersion,
        read_only: true,
        generatedAt: report.generatedAt,
        summary: report.summary,
        truncated: true,
        findings: report.findings.slice(0, 20),
      }, null, 2)}\n`;
    }
    await fs.writeFile(REPORT_PATH, serialized, 'utf8');
    process.stdout.write(`${JSON.stringify(report.summary)}\n`);
    process.exitCode = report.summary.P0 > 0 ? 2 : 0;
  } finally {
    await request.dispose();
    await browser.close();
  }
}

await main();
