#!/usr/bin/env node
const fs = require('fs');
const http = require('http');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = process.env.SOFA_VISUAL_QA_OUT || '/tmp';
const PORT = Number(process.env.SOFA_VISUAL_QA_PORT || 0);

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'content-type': type });
  res.end(body);
}

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.jpg') || file.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

function startServer() {
  const server = http.createServer((req, res) => {
    const rawPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const rel = rawPath === '/' ? '/dashboard.html' : rawPath;
    const file = path.resolve(ROOT, '.' + rel);
    if (!file.startsWith(ROOT + path.sep)) return send(res, 403, 'forbidden');
    fs.readFile(file, (err, data) => {
      if (err) return send(res, 404, 'not found');
      send(res, 200, data, contentType(file));
    });
  });
  return new Promise(resolve => {
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

function findChrome() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROME,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ].filter(Boolean);
  return candidates.find(p => fs.existsSync(p));
}

function maybePlaywright() {
  try {
    return require('playwright');
  } catch (err) {
    console.log('[visual-entry-qa] skipped: playwright package is not available in this runtime');
    process.exit(0);
  }
}

function apiPayload(url) {
  const u = new URL(url);
  if (u.pathname === '/api/me/study/today') {
    return {
      display_name: '記帳士',
      scope_rules: { law_to_subject_mapping: 'many_to_many' },
      personal_plan: { status: 'ready', source: 'visual_qa', items: [] },
      weak_law_bridge: {
        items: [{ law_name: '所得稅法', wrong_count: 2, top_articles: [{ article: '扣繳所得範圍' }] }]
      },
      subjects: [
        { subject_key: 'bookkeeping_laws', display_name: '記帳相關法規概要', implementation_status: 'seeded_moex_mcq' },
        { subject_key: 'tax_laws', display_name: '租稅相關法規概要', implementation_status: 'seeded_moex_mcq' }
      ],
      today: {
        blocks: [{ display_name: '扣繳所得範圍', subject: '租稅相關法規', phase_key: 'core', question_signal: 2, law_names: ['所得稅法'] }]
      }
    };
  }
  if (u.pathname === '/api/me/quiz-stats') {
    return {
      total: 8,
      correct: 5,
      today: 2,
      today_correct: 1,
      streak: 3,
      wrong_count: 2,
      recent: [{ date: '2026-06-27', law: '所得稅法', is_correct: false, question: '扣繳所得範圍' }]
    };
  }
  if (u.pathname === '/api/me/weak-laws') {
    return {
      items: [{
        law_name: '所得稅法',
        wrong_count: 2,
        attempt_count: 5,
        correct_count: 3,
        accuracy: 60,
        top_articles: [{ page_id: 'visual-page-id', article_no: '88', article: '扣繳所得範圍', wrong_count: 2 }]
      }]
    };
  }
  if (u.pathname === '/api/me/review-due') {
    return { as_of: '2026-06-27', items: [{ page_id: 'visual-page-id', law_name: '所得稅法', article: '扣繳所得範圍', article_no: '88', overdue_days: 2, importance: 5, attempt_count: 5, correct_count: 3, wrong_count: 2 }] };
  }
  if (u.pathname === '/api/me/profile') return { ok: true, name: '視覺驗收' };
  if (u.pathname === '/api/me/progress') return { items: [] };
  if (u.pathname === '/api/me/bookmarks') return { items: [] };
  if (u.pathname === '/api/me/history') return { items: [] };
  return {};
}

async function installApiMocks(page) {
  await page.route('https://sofa-engine-api.onrender.com/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(apiPayload(route.request().url()))
    });
  });
  await page.addInitScript(() => {
    localStorage.setItem('sofa_uid', 'VISUAL_QA');
    localStorage.setItem('sofa_token', 'VISUAL_QA_TOKEN');
    localStorage.setItem('sofa_nickname', '視覺驗收');
  });
}

async function assertClickable(page, selector, label) {
  const loc = page.locator(selector).first();
  const count = await loc.count();
  if (!count) throw new Error(`${label}: selector not found: ${selector}`);
  await loc.waitFor({ state: 'visible', timeout: 7000 });
  const box = await loc.boundingBox();
  if (!box || box.width < 20 || box.height < 20) {
    throw new Error(`${label}: not large enough to tap (${JSON.stringify(box)})`);
  }
  const viewport = page.viewportSize();
  if (!viewport) throw new Error(`${label}: missing viewport`);
  if (box.x < -1 || box.y < -1 || box.x + box.width > viewport.width + 1 || box.y + box.height > viewport.height + 1) {
    throw new Error(`${label}: outside viewport (${JSON.stringify({ box, viewport })})`);
  }
  const hit = await loc.evaluate(el => {
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(r.left + r.width / 2, 1), window.innerWidth - 1);
    const y = Math.min(Math.max(r.top + r.height / 2, 1), window.innerHeight - 1);
    const top = document.elementFromPoint(x, y);
    return top === el || !!(top && el.contains(top));
  });
  if (!hit) throw new Error(`${label}: center point is covered by another element`);
  return box;
}

async function dashboardCase(browser, baseUrl, name, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: viewport.width <= 480 ? 2 : 1, isMobile: viewport.width <= 480 });
  await installApiMocks(page);
  await page.goto(`${baseUrl}/dashboard.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#study-cockpit-recap', { state: 'visible', timeout: 7000 });
  const checks = [];
  checks.push(['#study-cockpit-recap a[href="quiz.html?open=weakness"]', 'today weakness CTA']);
  if (viewport.width <= 768) {
    checks.push(['#mobile-daily-bar a[href="quiz.html?open=weakness"]', 'mobile weakness quick entry']);
    checks.push(['#mobile-daily-bar a[href="#review-due"]', 'mobile review quick entry']);
  } else {
    checks.push(['aside.side a[href="quiz.html?open=weakness"]', 'desktop sidebar weakness entry']);
  }
  const boxes = {};
  for (const [selector, label] of checks) boxes[label] = await assertClickable(page, selector, label);
  const weakState = await page.locator('#study-cockpit-weak-state').innerText();
  if (!/弱點已接入/.test(weakState)) {
    throw new Error(`${name}: weak state did not reflect mocked weak-laws data: ${weakState}`);
  }
  const screenshot = path.join(OUT_DIR, `sofa-visual-${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  await page.close();
  return { name, screenshot, boxes };
}

async function quizCase(browser, baseUrl) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  await page.goto(`${baseUrl}/quiz.html?free=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#quiz-answer-actions', { state: 'attached', timeout: 7000 });
  await page.evaluate(() => {
    _currentLawName = '所得稅法';
    _currentPageId = 'visual-page-id';
    _currentArtNo = '88';
    document.getElementById('quiz-citation').textContent = '第 88 條 ｜ 所得稅法';
    document.getElementById('quiz-citation').style.display = 'block';
    document.getElementById('view-article-btn').style.display = 'inline-block';
    document.getElementById('view-weakness-btn').style.display = 'inline-block';
    document.getElementById('btnFlag').style.display = 'inline-flex';
    document.getElementById('btnNext').style.display = 'inline-flex';
    document.getElementById('questionBox').textContent = '視覺驗收題目';
    document.getElementById('quiz-answer-actions').scrollIntoView({ block: 'center' });
  });
  const boxes = {
    article: await assertClickable(page, '#view-article-btn', 'post-answer article CTA'),
    weakness: await assertClickable(page, '#view-weakness-btn', 'post-answer weakness CTA'),
    next: await assertClickable(page, '#btnNext', 'post-answer next CTA'),
    flag: await assertClickable(page, '#btnFlag', 'post-answer flag CTA')
  };
  const targetUrl = await page.evaluate(() => {
    const oldOpen = window.open;
    let opened = '';
    window.open = url => { opened = String(url); };
    _openArticleDashboard();
    window.open = oldOpen;
    return opened;
  });
  if (!/dashboard\.html\?open=visual-page-id&law=/.test(targetUrl)) {
    throw new Error(`article CTA deep link is not carrying open/law/art params: ${targetUrl}`);
  }
  const screenshot = path.join(OUT_DIR, 'sofa-visual-quiz-actions-mobile.png');
  await page.screenshot({ path: screenshot, fullPage: false });
  await page.close();
  return { name: 'quiz-actions-mobile', screenshot, boxes, targetUrl };
}

async function statsCase(browser, baseUrl) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  await installApiMocks(page);
  await page.goto(`${baseUrl}/quiz.html?free=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#stats-panel', { state: 'attached', timeout: 7000 });
  await page.evaluate(() => {
    const sample = { total: 8, correct: 5, todayTotal: 2, todayCorrect: 1, bestStreak: 3, timedQuestions: 0, totalTimeSec: 0, byLaw: { '所得稅法': { total: 5, correct: 3 } }, serverMerged: true };
    _renderStatsContent(sample, '已合併後端紀錄');
    openStats();
  });
  const boxes = {
    close: await assertClickable(page, '.stats-close', 'stats close button'),
    weaknessTab: await assertClickable(page, '#tab-btn-wrong', 'stats weakness tab')
  };
  const sourceText = await page.locator('.weak-panel-guide').first().innerText();
  if (!/每日一題/.test(sourceText) || !/LINE 作答/.test(sourceText) || !/考古題/.test(sourceText)) {
    throw new Error(`stats source guide is incomplete: ${sourceText}`);
  }
  const screenshot = path.join(OUT_DIR, 'sofa-visual-stats-mobile.png');
  await page.screenshot({ path: screenshot, fullPage: false });
  await page.close();
  return { name: 'stats-mobile', screenshot, boxes };
}

(async () => {
  const { chromium } = maybePlaywright();
  const chrome = findChrome();
  if (!chrome) {
    console.log('[visual-entry-qa] skipped: no Chrome executable found. Set PLAYWRIGHT_CHROME=/path/to/chrome.');
    process.exit(0);
  }
  const server = await startServer();
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  try {
    const results = [];
    results.push(await dashboardCase(browser, baseUrl, 'dashboard-mobile', { width: 390, height: 844 }));
    results.push(await dashboardCase(browser, baseUrl, 'dashboard-desktop', { width: 1440, height: 900 }));
    results.push(await quizCase(browser, baseUrl));
    results.push(await statsCase(browser, baseUrl));
    console.log(JSON.stringify({ ok: true, root: ROOT, results }, null, 2));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(err => {
  console.error('[visual-entry-qa] failed:', err && err.stack || err);
  process.exit(1);
});
