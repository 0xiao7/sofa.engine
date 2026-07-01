#!/usr/bin/env node
const fs = require('fs');
const http = require('http');
const path = require('path');

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

function futureIsoDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function visualStudySeriesItems(firstStatus = 'planned') {
  return [
    {
      id: 'visual-study-series-1',
      track_key: 'bookkeeper',
      subject: '租稅申報實務',
      title: '視覺驗收任務 1',
      sequence_no: 1,
      scheduled_date: futureIsoDate(1),
      scheduled_time: '19:00',
      source_label: '自排',
      status: firstStatus,
      notes: 'visual qa'
    },
    {
      id: 'visual-study-series-2',
      track_key: 'bookkeeper',
      subject: '租稅申報實務',
      title: '視覺驗收任務 2',
      sequence_no: 2,
      scheduled_date: futureIsoDate(8),
      scheduled_time: '19:00',
      source_label: '自排',
      status: 'planned',
      notes: 'visual qa'
    }
  ];
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

async function closeWithTimeout(label, closeFn) {
  let timer;
  try {
    await Promise.race([
      closeFn(),
      new Promise(resolve => {
        timer = setTimeout(() => {
          console.warn(`[visual-entry-qa] cleanup timeout: ${label}`);
          resolve();
        }, 3000);
      })
    ]);
  } catch (err) {
    console.warn(`[visual-entry-qa] cleanup failed: ${label}: ${err && err.message || err}`);
  } finally {
    clearTimeout(timer);
  }
}

function apiPayload(url) {
  const u = new URL(url);
  if (u.pathname === '/api/quiz') {
    return {
      page_id: 'visual-page-id',
      law_name: '所得稅法',
      title: '第 88 條 | 扣繳義務',
      question: '下列何者不是扣繳義務人的作業重點？',
      options: ['百分之三', '百分之十五', '百分之一', '百分之二十'],
      answer: '百分之三',
      explanation: '視覺驗收解析：答題後必須顯示原文、解析與下一步操作。'
    };
  }
  if (u.pathname === '/api/article/visual-page-id') {
    return {
      page_id: 'visual-page-id',
      law_name: '所得稅法',
      article_no: '88',
      title: '第 88 條 | 扣繳義務',
      original_text: '視覺驗收條文原文：扣繳義務人應依規定辦理扣繳。',
      _plan: 'paid',
      sections: {
        '章節標題與戰略權重': '扣繳題型先看原文，再看解析。',
        '規範意旨與條文解析': '注意百分比與主詞；交叉記憶可看公司法第29條。',
        '執業要點與考情提示': '視覺驗收第三段：從題目進來時要能回到原題。',
        '核心摘要與記憶策略': '視覺驗收第四段：讀完條文後保留作答狀態。'
      }
    };
  }
  if (u.pathname === '/api/articles' && u.searchParams.get('law') === '所得稅法') {
    return {
      law_name: '所得稅法',
      count: 1,
      articles: [
        { id: 'visual-page-id', law_name: '所得稅法', article_no: '88', title: '§ 88｜扣繳義務', importance: '★★★' }
      ]
    };
  }
  if (u.pathname === '/api/articles' && u.searchParams.get('law') === '公司法') {
    return {
      law_name: '公司法',
      count: 1,
      articles: [
        { id: 'company-law-29', law_name: '公司法', article_no: '29', title: '§ 29｜經理人任免', importance: '★★★' }
      ]
    };
  }
  if (u.pathname === '/api/article/company-law-29') {
    return {
      page_id: 'company-law-29',
      id: 'company-law-29',
      law_name: '公司法',
      article_no: '29',
      title: '第 29 條｜經理人任免',
      original_text: '視覺驗收公司法第29條原文：公司得依章程置經理人。',
      importance: '★★★',
      _plan: 'paid',
      sections: {
        short_explanation: '公司法第29條用來對照主辦會計人員與經理人的任免程序。',
        exam_tip: '從題目看法條進來後，交叉法條必須在同一閱讀器內開啟。'
      }
    };
  }
  if (u.pathname === '/api/articles' && u.searchParams.get('law') === '記帳士法') {
    return {
      law_name: '記帳士法',
      count: 2,
      articles: [
        { id: 'law-preview-13', law_name: '記帳士法', article_no: '13', title: '§ 13｜登錄事項', importance: '★★' },
        { id: 'law-preview-13-1', law_name: '記帳士法', article_no: '13之1', title: '§ 13之1｜視覺驗收副條', importance: '★★★' }
      ]
    };
  }
  if (u.pathname === '/api/article/law-preview-13-1') {
    return {
      page_id: 'law-preview-13-1',
      id: 'law-preview-13-1',
      law_name: '記帳士法',
      article_no: '13之1',
      title: '第 13 條之 1｜視覺驗收副條',
      original_text: '視覺驗收條文原文：讀法條深連結必須直接落到第十三條之一，並保留可讀的原文區塊。',
      importance: '★★★',
      _plan: 'paid',
      sections: {
        '章節標題與戰略權重': '視覺驗收第一段：確認讀者知道這條的重要性。',
        '規範意旨與條文解析': '視覺驗收第二段：先看條文原文，再看解析。',
        '執業要點與考情提示': '視覺驗收第三段：從題目點看法條時，必須直接看到該條，不要只回到搜尋或法規首頁。',
        '核心摘要與記憶策略': '視覺驗收第四段：前四段是免費試讀的主體。',
        '修法與聯覺備註': '• 2026修法狀況：現行條文\n  ◦ 視覺驗收第五段：修法、舊題數字、考點變動會在完整會員版中展開。\n• 實務聯覺：公司法第29條可對照任免程序',
        '相關法規及注意事項': '• 關聯條文：刑法317、318、319條;地政士法26條(地政士守密義務)\n  ◦ 視覺驗收第六段：同法第13條、同法第15條等關聯條文會在完整會員版中串起來。\n• 法規對比：會計師法43條等專業守密規定並列'
      }
    };
  }
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
  if (u.pathname === '/api/me/study/series') {
    return {
      ok: true,
      series_id: 'visual-study-series',
      items: visualStudySeriesItems()
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
  if (u.pathname === '/api/me/history') {
    return {
      history: [
        {
          page_id: 'recent-long-27',
          law_name: '國土計畫法',
          article: '§ 27 | 使用許可案件審議通過後核發使用許可;公開展覽不少於三十日;許可使用計畫之使用地類別配置項目強度為管制依據',
          title: '',
          timestamp: '2026-07-01T06:49:00Z'
        },
        {
          page_id: 'recent-sub-102-1',
          law_name: '醫療法',
          article: '§ 102-1 | 違反醫院設置標準之醫院層級加重罰則',
          title: '',
          timestamp: '2026-07-01T06:48:00Z'
        },
        {
          page_id: 'title-only-72',
          law_name: '商業會計法',
          article: '',
          title: '§ 72 | 電子會計資料不實罪',
          timestamp: '2026-07-01T06:47:00Z'
        }
      ]
    };
  }
  return {};
}

async function installApiMocks(page, options = {}) {
  let studySeriesSaved = false;
  let studyFirstDone = false;
  await page.route('https://sofa-engine-api.onrender.com/**', route => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    if (request.url().includes('/api/me/answer') && request.method() === 'POST') {
      if (options.answerPosts) {
        try { options.answerPosts.push(JSON.parse(request.postData() || '{}')); }
        catch (err) { options.answerPosts.push({ parse_error: true }); }
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({ ok: true, source: 'visual_entry_qa' })
      });
    }
    if (requestUrl.pathname === '/api/me/study/series' && request.method() === 'POST') {
      studySeriesSaved = true;
      return route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({ ok: true, series_id: 'visual-study-series', items: visualStudySeriesItems() })
      });
    }
    if (/^\/api\/me\/study\/plan-item\/[^/]+\/status$/.test(requestUrl.pathname) && request.method() === 'POST') {
      studyFirstDone = true;
      return route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({ ok: true, item: visualStudySeriesItems('done')[0] })
      });
    }
    if (requestUrl.pathname === '/api/me/study/hours' && request.method() === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({ ok: true, hours_log: { id: 'visual-hours-log' } })
      });
    }
    if (requestUrl.pathname === '/api/me/study/today' && (studySeriesSaved || studyFirstDone)) {
      const payload = apiPayload(request.url());
      payload.personal_plan = {
        status: 'ready',
        source: 'visual_qa',
        items: studyFirstDone ? visualStudySeriesItems('done') : visualStudySeriesItems()
      };
      return route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(payload)
      });
    }
    route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(apiPayload(request.url()))
    });
  });
  await page.addInitScript(() => {
    localStorage.removeItem('sofa.study.localPlan.v1');
    localStorage.removeItem('sofa.study.saveNudgeDismissed.v1');
  });
  if (options.auth !== false) {
    await page.addInitScript(() => {
      localStorage.setItem('sofa_uid', 'VISUAL_QA');
      localStorage.setItem('sofa_token', 'VISUAL_QA_TOKEN');
      localStorage.setItem('sofa_nickname', '視覺驗收');
    });
  } else {
    await page.addInitScript(() => {
      localStorage.removeItem('sofa_uid');
      localStorage.removeItem('sofa_token');
      localStorage.removeItem('sofa_nickname');
      localStorage.removeItem('sofa_free');
    });
  }
}

async function assertClickable(page, selector, label) {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: 'attached', timeout: 7000 });
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

async function assertTapTarget(page, selector, label) {
  const box = await assertClickable(page, selector, label);
  if (box.width < 44 || box.height < 44) {
    throw new Error(`${label}: touch target is below 44px (${JSON.stringify(box)})`);
  }
  return box;
}

async function assertNotCoveredBy(page, selector, coverSelector, label) {
  const loc = page.locator(selector).first();
  const cover = page.locator(coverSelector).first();
  await loc.waitFor({ state: 'visible', timeout: 7000 });
  await cover.waitFor({ state: 'visible', timeout: 7000 });
  const result = await page.evaluate(({ selector, coverSelector }) => {
    const el = document.querySelector(selector);
    const cover = document.querySelector(coverSelector);
    if (!el || !cover) return { ok: false, reason: 'missing element' };
    const a = el.getBoundingClientRect();
    const b = cover.getBoundingClientRect();
    const intersects = a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
    const centerX = a.left + a.width / 2;
    const centerY = a.top + a.height / 2;
    const centerCovered = centerX >= b.left && centerX <= b.right && centerY >= b.top && centerY <= b.bottom;
    return {
      ok: !intersects && !centerCovered,
      intersects,
      centerCovered,
      element: { top: a.top, bottom: a.bottom, left: a.left, right: a.right, width: a.width, height: a.height },
      cover: { top: b.top, bottom: b.bottom, left: b.left, right: b.right, width: b.width, height: b.height }
    };
  }, { selector, coverSelector });
  if (!result.ok) throw new Error(`${label}: covered by ${coverSelector} (${JSON.stringify(result)})`);
  return result;
}

async function assertAllNotCoveredBy(page, selector, coverSelector, label) {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 7000 });
  await page.locator(coverSelector).first().waitFor({ state: 'visible', timeout: 7000 });
  const result = await page.evaluate(({ selector, coverSelector }) => {
    const cover = document.querySelector(coverSelector);
    if (!cover) return { ok: false, reason: 'missing cover' };
    const b = cover.getBoundingClientRect();
    const failures = Array.from(document.querySelectorAll(selector))
      .filter(el => {
        const style = getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      })
      .map((el, index) => {
        const a = el.getBoundingClientRect();
        const centerX = a.left + a.width / 2;
        const centerY = a.top + a.height / 2;
        const intersects = a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
        const centerCovered = centerX >= b.left && centerX <= b.right && centerY >= b.top && centerY <= b.bottom;
        return {
          index,
          text: (el.textContent || '').trim(),
          intersects,
          centerCovered,
          element: { top: a.top, bottom: a.bottom, left: a.left, right: a.right, width: a.width, height: a.height }
        };
      })
      .filter(item => item.intersects || item.centerCovered);
    return {
      ok: failures.length === 0,
      failures,
      cover: { top: b.top, bottom: b.bottom, left: b.left, right: b.right, width: b.width, height: b.height }
    };
  }, { selector, coverSelector });
  if (!result.ok) throw new Error(`${label}: covered by ${coverSelector} (${JSON.stringify(result)})`);
  return result;
}

async function assertWithinContainer(page, childSelector, containerSelector, label) {
  const result = await page.evaluate(({ childSelector, containerSelector }) => {
    const child = document.querySelector(childSelector);
    const container = document.querySelector(containerSelector);
    if (!child || !container) return { ok: false, reason: 'missing element' };
    const childBox = child.getBoundingClientRect();
    const containerBox = container.getBoundingClientRect();
    return {
      ok: childBox.left >= containerBox.left - 1 && childBox.right <= containerBox.right + 1,
      child: { left: childBox.left, right: childBox.right, width: childBox.width },
      container: { left: containerBox.left, right: containerBox.right, width: containerBox.width }
    };
  }, { childSelector, containerSelector });
  if (!result.ok) throw new Error(`${label}: overflows container (${JSON.stringify(result)})`);
  return result;
}

async function assertNoHorizontalOverflow(page, label) {
  const result = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    innerWidth: window.innerWidth
  }));
  if (result.scrollWidth > result.clientWidth + 1 || result.bodyScrollWidth > result.innerWidth + 1) {
    throw new Error(`${label}: horizontal overflow (${JSON.stringify(result)})`);
  }
  return result;
}

async function dashboardResponsiveLayoutCase(browser, baseUrl) {
  const viewports = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'tablet', width: 820, height: 1180 },
    { name: 'desktop', width: 1440, height: 900 }
  ];
  const checks = [];
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: viewport.width <= 480 ? 2 : 1, isMobile: viewport.width <= 480 });
    await installApiMocks(page);
    await page.goto(`${baseUrl}/dashboard.html#recent`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#recent-list .rec-row', { state: 'visible', timeout: 9000 });
    await page.locator('#recent').scrollIntoViewIfNeeded();
    await page.waitForTimeout(220);
    const overflow = await assertNoHorizontalOverflow(page, `dashboard responsive ${viewport.name}`);
    const rows = await page.locator('#recent-list .rec-row').evaluateAll(nodes => nodes.map(node => {
      const art = node.querySelector('.art');
      const title = node.querySelector('.ttl');
      const rowBox = node.getBoundingClientRect();
      const artBox = art && art.getBoundingClientRect();
      return {
        text: node.innerText.replace(/\s+/g, ' ').trim(),
        row: { left: rowBox.left, right: rowBox.right, width: rowBox.width },
        artText: art ? art.textContent.replace(/\s+/g, ' ').trim() : '',
        art: artBox && { left: artBox.left, right: artBox.right, width: artBox.width, height: artBox.height },
        artWritingMode: art ? getComputedStyle(art).writingMode : '',
        artWhiteSpace: art ? getComputedStyle(art).whiteSpace : '',
        titleWhiteSpace: title ? getComputedStyle(title).whiteSpace : ''
      };
    }));
    if (!rows.length) throw new Error(`dashboard responsive ${viewport.name}: mocked recent rows did not render`);
    if (!rows.some(row => /§ 27/.test(row.text) && !/§ 27\s*\|\s*§ 27/.test(row.text))) {
      throw new Error(`dashboard responsive ${viewport.name}: recent row duplicated article label (${JSON.stringify(rows)})`);
    }
    for (const row of rows) {
      if (row.artWritingMode && row.artWritingMode !== 'horizontal-tb') {
        throw new Error(`dashboard responsive ${viewport.name}: article label is not horizontal (${JSON.stringify(row)})`);
      }
      if (row.art && row.art.height > 48) {
        throw new Error(`dashboard responsive ${viewport.name}: article label appears vertically squeezed (${JSON.stringify(row)})`);
      }
      if (row.artText && (/[|｜]/.test(row.artText) || /電子會計資料不實罪|使用許可案件|違反醫院設置標準/.test(row.artText))) {
        throw new Error(`dashboard responsive ${viewport.name}: article label still contains title text (${JSON.stringify(row)})`);
      }
    }
    const screenshot = path.join(OUT_DIR, `sofa-visual-dashboard-responsive-${viewport.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
    checks.push({ viewport: viewport.name, screenshot, overflow, rows: rows.map(row => row.text) });
    await page.close();
  }
  return { name: 'dashboard-responsive-layout', checks };
}

async function dashboardCase(browser, baseUrl, name, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: viewport.width <= 480 ? 2 : 1, isMobile: viewport.width <= 480 });
  await installApiMocks(page);
  await page.goto(`${baseUrl}/dashboard.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#study-cockpit-recap', { state: 'visible', timeout: 7000 });
  const checks = [];
  checks.push(['#study-cockpit-recap .study-action-group.primary a[href="quiz.html?open=weakness"]', 'today weakness CTA']);
  if (viewport.width <= 768) {
    checks.push(['#mobile-daily-bar a[href="quiz.html?open=weakness"]', 'mobile weakness quick entry']);
    checks.push(['#mobile-daily-bar a[href="#review-due"]', 'mobile review quick entry']);
  } else {
    checks.push(['.top-mid a[href="quiz.html?open=weakness"]', 'desktop top weakness entry']);
    checks.push(['.top-mid a[href="#review-due"]', 'desktop top review entry']);
    checks.push(['aside.side a[href="quiz.html?open=weakness"]', 'desktop sidebar weakness entry']);
  }
  const boxes = {};
  boxes.brand = await assertTapTarget(page, '.topbar .brand', `${name} brand`);
  for (const [selector, label] of checks) {
    const needsTouchTarget = viewport.width <= 768 || label.startsWith('desktop top');
    boxes[label] = needsTouchTarget
      ? await assertTapTarget(page, selector, label)
      : await assertClickable(page, selector, label);
  }
  if (viewport.width <= 768) {
    await assertNotCoveredBy(page, '#study-next-plan', '#mobile-daily-bar', `${name} next study card`);
    await assertAllNotCoveredBy(page, '#study-cockpit-recap .study-actions .study-action-link', '#mobile-daily-bar', `${name} study action buttons`);
    await assertNotCoveredBy(page, '#study-cockpit-recap .study-action-group.primary a[href="quiz.html?open=weakness"]', '#mobile-daily-bar', `${name} weakness CTA`);
    await page.locator('#study-weak-brief').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 96));
    await assertNotCoveredBy(page, '#study-weak-brief .study-weak-brief-row, #study-weak-brief .study-weak-empty', '#mobile-daily-bar', `${name} first weakness row`);
  }
  const weakState = await page.locator('#study-cockpit-weak-state').innerText();
  if (!/弱點已接入/.test(weakState)) {
    throw new Error(`${name}: weak state did not reflect mocked weak-laws data: ${weakState}`);
  }
  if (viewport.width > 768) {
    await page.waitForTimeout(150);
    const activeSideTarget = await page.locator('aside.side a.on').first().evaluate(el => el.dataset.spyTarget || '');
    if (activeSideTarget !== 'study-cockpit-recap') {
      throw new Error(`${name}: first-screen sidebar highlighted ${activeSideTarget || 'nothing'} instead of study-cockpit-recap`);
    }
  }
  const screenshot = path.join(OUT_DIR, `sofa-visual-${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  await page.close();
  return { name, screenshot, boxes };
}

async function dashboardSidebarScrollCase(browser, baseUrl) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  await installApiMocks(page);
  await page.goto(`${baseUrl}/dashboard.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#study-cockpit-recap', { state: 'visible', timeout: 7000 });
  const targets = [
    'study-cockpit-recap',
    'study-time-box',
    'study-plan-items',
    'quiz-recap',
    'weak-laws-recap',
    'review-due'
  ];
  const checks = [];
  for (const id of targets) {
    await page.evaluate(targetId => {
      document.getElementById(targetId)?.scrollIntoView({ block: 'start' });
    }, id);
    await page.waitForTimeout(220);
    const active = await page.locator('.nav-list a.on').evaluateAll(nodes => nodes.map(node => node.dataset.spyTarget || ''));
    const sideBox = await page.locator('aside.side').boundingBox();
    const activeBox = active.includes(id)
      ? await page.locator(`.nav-list a.on[data-spy-target="${id}"]`).boundingBox()
      : null;
    const visible = !!(activeBox && sideBox && activeBox.y >= sideBox.y && activeBox.y + activeBox.height <= sideBox.y + sideBox.height + 1);
    checks.push({ id, active, visible });
    if (!active.includes(id) || !visible) {
      throw new Error(`dashboard sidebar did not follow ${id}: ${JSON.stringify({ active, visible, activeBox, sideBox })}`);
    }
  }
  const screenshot = path.join(OUT_DIR, 'sofa-visual-dashboard-sidebar-scroll.png');
  await page.screenshot({ path: screenshot, fullPage: false });
  await page.close();
  return { name: 'dashboard-sidebar-scroll', screenshot, checks };
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
    article: await assertTapTarget(page, '#view-article-btn', 'post-answer article CTA'),
    weakness: await assertTapTarget(page, '#view-weakness-btn', 'post-answer weakness CTA'),
    next: await assertTapTarget(page, '#btnNext', 'post-answer next CTA'),
    flag: await assertTapTarget(page, '#btnFlag', 'post-answer flag CTA')
  };
  const targetUrl = await page.evaluate(() => _articleReaderHref(_currentLawName, _currentArtNo, _currentPageId));
  if (!/law-preview\.html\?law=/.test(targetUrl) || !/[?&]art=88/.test(targetUrl) || !/[?&]from=quiz/.test(targetUrl)) {
    throw new Error(`article CTA deep link is not carrying reader law/art params: ${targetUrl}`);
  }
  const screenshot = path.join(OUT_DIR, 'sofa-visual-quiz-actions-mobile.png');
  await page.screenshot({ path: screenshot, fullPage: false });
  await page.close();
  return { name: 'quiz-actions-mobile', screenshot, boxes, targetUrl };
}

async function lawPreviewCase(browser, baseUrl) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  await installApiMocks(page);
  await page.goto(`${baseUrl}/law-preview.html?law=${encodeURIComponent('記帳士法')}&art=13%E4%B9%8B1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#detailTitle', { state: 'visible', timeout: 9000 });
  await page.waitForFunction(() => /第\s*13\s*條之\s*1|第十三條之一|13之1/.test(document.querySelector('#detailTitle')?.innerText || ''), { timeout: 9000 });
  const title = await page.locator('#detailTitle').innerText();
  const original = await page.locator('#originalText').innerText();
  if (!/13\s*條之\s*1|13之1/.test(title)) {
    throw new Error(`law preview did not land on the requested sub-article: ${title}`);
  }
  if (!/第十三條之一|深連結/.test(original)) {
    throw new Error(`law preview original text did not render the requested article: ${original}`);
  }
  const boxes = {
    title: await assertClickable(page, '#detailTitle', 'law preview requested article title'),
    original: await assertClickable(page, '#originalText', 'law preview original text'),
    cta: await assertTapTarget(page, '.cta-btn', 'law preview bottom CTA')
  };
  await assertNotCoveredBy(page, '#originalText', '.cta-bar', 'law preview original text');
  await page.waitForFunction(() => document.querySelectorAll('.section.locked').length === 0 && document.querySelectorAll('.section[data-unlocked="true"]').length >= 2, { timeout: 9000 });
  await page.locator('.section[data-unlocked="true"][data-seg="5"]').scrollIntoViewIfNeeded();
  boxes.unlockedSection = await assertClickable(page, '.section[data-unlocked="true"][data-seg="5"] .section-body', 'law preview paid unlocked section');
  const paidScreenshot = path.join(OUT_DIR, 'sofa-visual-law-preview-paid-mobile.png');
  await page.screenshot({ path: paidScreenshot, fullPage: false });
  await page.close();

  const freePage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  await installApiMocks(freePage, { auth: false });
  await freePage.goto(`${baseUrl}/law-preview.html?law=${encodeURIComponent('記帳士法')}&art=13%E4%B9%8B1`, { waitUntil: 'domcontentloaded' });
  await freePage.waitForSelector('#detailTitle', { state: 'visible', timeout: 9000 });
  await freePage.locator('.section.locked[data-seg="5"]').scrollIntoViewIfNeeded();
  const lockedText = await freePage.locator('.section.locked[data-seg="5"]').innerText();
  if (!/第 5 段|付費解鎖|查看方案/.test(lockedText)) {
    throw new Error(`law preview paid teaser is missing section 5 value cue: ${lockedText}`);
  }
  boxes.lockedSection = await assertClickable(freePage, '.section.locked[data-seg="5"] .section-locked-preview', 'law preview free locked section');
  boxes.pricing = await assertTapTarget(freePage, '.section.locked[data-seg="5"] a[href="pricing.html"]', 'law preview pricing CTA');
  const screenshot = path.join(OUT_DIR, 'sofa-visual-law-preview-mobile.png');
  await freePage.screenshot({ path: screenshot, fullPage: false });
  await freePage.close();
  return { name: 'law-preview-mobile', screenshot, paidScreenshot, boxes, title };
}

async function quizBehaviorCase(browser, baseUrl) {
  const answerPosts = [];
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  await installApiMocks(page, { answerPosts });
  await page.addInitScript(() => {
    localStorage.removeItem('sofa_exam_key');
    localStorage.removeItem('sofa_last_law');
  });
  await page.goto(`${baseUrl}/quiz.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    loadQuiz();
  });
  await page.waitForSelector('#optionsBox .opt', { state: 'visible', timeout: 7000 });
  const opts = page.locator('#optionsBox .opt');
  const optionCount = await opts.count();
  if (optionCount !== 4) throw new Error(`mocked quiz should render 4 options, got ${optionCount}`);
  await opts.nth(1).click();
  await page.waitForSelector('#explainBox', { state: 'visible', timeout: 7000 });
  await page.waitForFunction(() => {
    const box = document.querySelector('#explainBox');
    return box && getComputedStyle(box).display !== 'none' && /答錯|正確答案/.test(box.innerText);
  });
  const selectedWrong = await opts.nth(1).evaluate(el => el.classList.contains('wrong'));
  const firstRight = await opts.nth(0).evaluate(el => el.classList.contains('right'));
  if (!selectedWrong || !firstRight) throw new Error('answer click did not mark selected wrong option and correct option');
  await assertClickable(page, '#view-article-btn', 'behavior article CTA');
  await assertClickable(page, '#btnNext', 'behavior next CTA');
  await page.waitForFunction(() => document.querySelector('#sourceBox')?.innerText.includes('條文原文'), null, { timeout: 7000 });
  const post = answerPosts[0] || {};
  if (post.choice !== 1) throw new Error(`answer payload choice !== 1: ${JSON.stringify(post)}`);
  if (post.is_correct !== false) throw new Error(`answer payload is_correct !== false: ${JSON.stringify(post)}`);
  if (post.article_id !== 'visual-page-id') throw new Error(`answer payload article_id mismatch: ${JSON.stringify(post)}`);
  const screenshot = path.join(OUT_DIR, 'sofa-visual-quiz-behavior-mobile.png');
  await page.screenshot({ path: screenshot, fullPage: false });
  await page.close();
  return { name: 'quiz-behavior-mobile', screenshot, answerPost: { choice: post.choice, is_correct: post.is_correct, article_id: post.article_id } };
}

async function quizReaderRoundTripCase(browser, baseUrl) {
  const answerPosts = [];
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  await installApiMocks(page, { answerPosts });
  await page.addInitScript(() => {
    localStorage.removeItem('sofa_exam_key');
    localStorage.removeItem('sofa_last_law');
    if (!sessionStorage.getItem('sofa_quiz_return_state_v1')) sessionStorage.clear();
  });
  await page.goto(`${baseUrl}/quiz.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    loadQuiz();
  });
  await page.waitForSelector('#optionsBox .opt', { state: 'visible', timeout: 7000 });
  const opts = page.locator('#optionsBox .opt');
  await opts.nth(1).click();
  await page.waitForSelector('#quiz-answer-actions.show', { state: 'visible', timeout: 7000 });
  await page.locator('#view-article-btn').click();
  await page.waitForURL(/law-preview\.html/, { timeout: 7000 });
  await page.waitForSelector('#detailTitle', { state: 'visible', timeout: 7000 });
  await page.waitForFunction(() => document.querySelector('#originalText')?.innerText.includes('扣繳義務人'), null, { timeout: 7000 });

  const crossref = page.locator('a.crossref', { hasText: /公司法第29條|公司法.*29/ }).first();
  await crossref.scrollIntoViewIfNeeded();
  await crossref.click();
  await page.waitForFunction(() => {
    const title = document.querySelector('#detailTitle')?.innerText || '';
    const original = document.querySelector('#originalText')?.innerText || '';
    return /29/.test(title) && /公司法第29條原文/.test(original);
  }, null, { timeout: 7000 });
  const crossTitle = await page.locator('#detailTitle').innerText();
  await page.locator('.back-link').click();
  await page.waitForURL(/quiz\.html/, { timeout: 7000 });
  await page.waitForSelector('#quiz-answer-actions.show', { state: 'visible', timeout: 7000 });
  await page.waitForSelector('#optionsBox .opt.wrong', { state: 'visible', timeout: 7000 });
  await page.waitForSelector('#optionsBox .opt.right', { state: 'visible', timeout: 7000 });
  const restoredQuestion = await page.locator('#questionBox').innerText();
  if (!/扣繳義務人/.test(restoredQuestion)) throw new Error(`quiz question did not restore after reader round trip: ${restoredQuestion}`);
  const screenshot = path.join(OUT_DIR, 'sofa-visual-quiz-reader-roundtrip-mobile.png');
  await page.screenshot({ path: screenshot, fullPage: false });
  await page.close();
  return { name: 'quiz-reader-roundtrip-mobile', screenshot, crossTitle, answerPosts: answerPosts.length };
}

async function freeRetentionCase(browser, baseUrl) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  await page.goto(`${baseUrl}/quiz.html?free=1`, { waitUntil: 'domcontentloaded' });
  const quizText = await page.locator('body').innerText();
  if (!/輸入序號保留紀錄/.test(quizText)) {
    throw new Error('free quiz retention CTA text is missing');
  }
  const quizBox = await assertTapTarget(page, 'a[href="login.html"]', 'free quiz serial retention CTA');

  await page.goto(`${baseUrl}/dashboard.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('sofa_free', 'FREE');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#free-retention-strip.on', { state: 'visible', timeout: 7000 });
  const stripText = await page.locator('#free-retention-strip').innerText();
  if (!/輸入序號保留進度/.test(stripText) || !/免費版可以先試做/.test(stripText)) {
    throw new Error(`free dashboard retention CTA text is missing: ${stripText}`);
  }
  const dashboardBox = await assertTapTarget(page, '#free-retention-strip a[href="login.html"]', 'free dashboard serial retention CTA');
  const screenshot = path.join(OUT_DIR, 'sofa-visual-free-retention-mobile.png');
  await page.screenshot({ path: screenshot, fullPage: false });
  await page.close();
  return {
    name: 'free-retention-mobile',
    screenshot,
    boxes: {
      quizRetention: quizBox,
      dashboardRetention: dashboardBox
    }
  };
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
    close: await assertTapTarget(page, '.stats-close', 'stats close button'),
    weaknessTab: await assertTapTarget(page, '#tab-btn-wrong', 'stats weakness tab')
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

async function studyToolDeepLinkCase(browser, baseUrl) {
  const cases = [
    {
      hash: '#study-plan',
      panel: '#study-plan-panel',
      action: '#study-plan-title',
      name: 'study-tool-plan',
      requiredText: /設定讀書任務/,
      label: 'study plan first input'
    },
    {
      hash: '#study-record',
      panel: '#study-record-panel',
      action: '#study-record-date',
      name: 'study-tool-record',
      requiredText: /補紀錄只會補進度/,
      label: 'study record first input'
    },
    {
      hash: '#study-playlist',
      panel: '#study-playlist-panel',
      action: '#study-playlist-playall',
      name: 'study-tool-playlist',
      requiredText: /朗讀全部/,
      label: 'study playlist play all'
    }
  ];
  const results = [];
  for (const item of cases) {
    const page = await browser.newPage({ viewport: { width: 390, height: 667 }, deviceScaleFactor: 2, isMobile: true });
    await installApiMocks(page);
    await page.goto(`${baseUrl}/dashboard.html${item.hash}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(`${item.panel}.on`, { state: 'visible', timeout: 9000 });
    await page.waitForFunction(selector => {
      const el = document.querySelector(selector);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const x = Math.min(Math.max(r.left + r.width / 2, 1), window.innerWidth - 1);
      const y = Math.min(Math.max(r.top + r.height / 2, 1), window.innerHeight - 1);
      const top = document.elementFromPoint(x, y);
      return !!(top === el || (top && el.contains(top)));
    }, item.action, { timeout: 9000 });
    const panelText = await page.locator(item.panel).innerText();
    if (!item.requiredText.test(panelText)) {
      throw new Error(`${item.name}: did not land on a readable panel (${panelText.slice(0, 160)})`);
    }
    const actionBox = await assertTapTarget(page, item.action, item.label);
    await assertNotCoveredBy(page, item.action, '#mobile-daily-bar', `${item.name} first action`);
    let containment = null;
    if (item.name === 'study-tool-record') {
      containment = {};
      for (const selector of ['#study-record-date', '#study-record-subject', '#study-record-minutes', '#study-record-note']) {
        containment[selector] = await assertWithinContainer(page, selector, '#study-record-panel', `${item.name} ${selector}`);
      }
    }
    const screenshot = path.join(OUT_DIR, `sofa-visual-study-tool-${item.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
    results.push({ name: item.name, screenshot, actionBox, containment });
    await page.close();
  }
  return { name: 'study-tool-deep-links-mobile', results };
}

async function studyPlanFlowCase(browser, baseUrl) {
  const page = await browser.newPage({ viewport: { width: 390, height: 667 }, deviceScaleFactor: 2, isMobile: true });
  await installApiMocks(page);
  await page.goto(`${baseUrl}/dashboard.html#study-plan`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#study-plan-panel.on', { state: 'visible', timeout: 9000 });
  await page.fill('#study-plan-title', '視覺驗收任務');
  await page.fill('#study-plan-subject', '租稅申報實務');
  await page.fill('#study-plan-count', '2');
  await page.fill('#study-plan-start', new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  await page.click('#study-plan-panel .study-plan-save');
  await page.waitForFunction(() => /已先排入本機|已排入/.test(document.querySelector('#study-plan-items')?.innerText || ''), null, { timeout: 9000 });
  let overview = await page.locator('#study-overview-status').innerText();
  let nav = await page.locator('#nav-ct-plan').innerText();
  if (!/待讀 2 \/ 完成 0/.test(overview) || !/待2 完0/.test(nav)) {
    throw new Error(`study plan save did not update visible counts: ${JSON.stringify({ overview, nav })}`);
  }
  const nextStudyButton = '.study-next-plan [data-next-study-key]';
  await page.locator(nextStudyButton).first().scrollIntoViewIfNeeded();
  await assertTapTarget(page, nextStudyButton, 'next study completion');
  await page.click(nextStudyButton);
  await page.waitForFunction(() => /待讀 1 \/ 完成 1/.test(document.querySelector('#study-overview-status')?.innerText || ''), null, { timeout: 9000 });
  overview = await page.locator('#study-overview-status').innerText();
  nav = await page.locator('#nav-ct-plan').innerText();
  if (!/待讀 1 \/ 完成 1/.test(overview) || !/待1 完1/.test(nav)) {
    throw new Error(`study plan completion did not update visible counts: ${JSON.stringify({ overview, nav })}`);
  }
  await page.evaluate(() => location.hash = '#study-record');
  await page.waitForSelector('#study-record-panel.on', { state: 'visible', timeout: 9000 });
  await page.fill('#study-record-note', '視覺驗收補紀錄');
  await page.click('#study-record-panel .study-plan-save');
  await page.waitForFunction(() => /待讀 1 \/ 完成 2/.test(document.querySelector('#study-overview-status')?.innerText || ''), null, { timeout: 9000 });
  overview = await page.locator('#study-overview-status').innerText();
  nav = await page.locator('#nav-ct-plan').innerText();
  const message = await page.locator('#study-plan-items .study-plan-count').first().innerText();
  if (!/補紀錄|已先保存|已同步/.test(message)) {
    throw new Error(`study record save result is not visible outside the closed panel: ${message}`);
  }
  await assertNotCoveredBy(page, '#study-overview-status', '#mobile-daily-bar', 'study overview status');
  const screenshot = path.join(OUT_DIR, 'sofa-visual-study-plan-flow-mobile.png');
  await page.screenshot({ path: screenshot, fullPage: false });
  await page.close();
  return { name: 'study-plan-flow-mobile', screenshot, overview, nav, message };
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
    results.push(await dashboardCase(browser, baseUrl, 'dashboard-mobile', { width: 390, height: 667 }));
    results.push(await dashboardCase(browser, baseUrl, 'dashboard-desktop', { width: 1440, height: 900 }));
    results.push(await dashboardResponsiveLayoutCase(browser, baseUrl));
    results.push(await dashboardSidebarScrollCase(browser, baseUrl));
    results.push(await quizCase(browser, baseUrl));
    results.push(await lawPreviewCase(browser, baseUrl));
    results.push(await quizBehaviorCase(browser, baseUrl));
    results.push(await quizReaderRoundTripCase(browser, baseUrl));
    results.push(await freeRetentionCase(browser, baseUrl));
    results.push(await statsCase(browser, baseUrl));
    results.push(await studyToolDeepLinkCase(browser, baseUrl));
    results.push(await studyPlanFlowCase(browser, baseUrl));
    console.log(JSON.stringify({ ok: true, root: ROOT, results }, null, 2));
  } finally {
    await closeWithTimeout('browser', () => browser.close());
    await closeWithTimeout('server', () => new Promise(resolve => server.close(resolve)));
  }
  process.exit(0);
})().catch(err => {
  console.error('[visual-entry-qa] failed:', err && err.stack || err);
  process.exit(1);
});
