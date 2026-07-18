# EX14 Site Patrol Report

Generated: 2026-07-17T09:54:30.511Z
Scope: 28 root HTML pages (28 formal, 0 design drafts).
API base: https://sofa-engine-api.onrender.com

## Summary

- Root HTML count: 28 / expected 28
- Formal page count: 28 / expected 28
- Design draft count: 0 / expected 0
- Issues: 🔴 0, 🟡 0, ⚪ 0
- Existing baseline note: `node --test tests/*.test.mjs` fails on current `origin/main`; EX10 uses this patrol script as the scoped verification artifact.

## Applied Red Fixes

- Fixed ig-cards.html broken local image references by pointing the five phone preview images to committed asset assets/素材/preview.png.
- Removed 17 unlinked legacy design draft pages after EX10 patrol confirmed zero root HTML links.
- Cleaned EX14 yellow facade items on formal pages: UTM tracking, visible bare domains, sub-10px font declarations, viewport metadata, and mobile overflow guards.

## Design Draft Inventory

- none; EX14 removed the 17 legacy design draft pages.

## API Dependency Probe

- PASS /api/admin/serial-identity: 403
- PASS /api/article/: 404
- PASS /api/article/{param}: dynamic
- PASS /api/articles?law=: 404
- PASS /api/articles?law={param}: dynamic
- PASS /api/auth/magic: 405
- PASS /api/checkout: 405
- PASS /api/chip_options?chip=: 400
- PASS /api/cross_chip_search?chip=: 400
- PASS /api/fill: 200
- PASS /api/fill?law=: 200
- PASS /api/fill?law={param}: dynamic
- PASS /api/fill?page_id={param}: dynamic
- PASS /api/funnel-event: 405
- PASS /api/laws: 200
- PASS /api/me/answer: 405
- PASS /api/me/bookmarks: 401
- PASS /api/me/entitlements: 401
- PASS /api/me/history: 401
- PASS /api/me/mastery: 401
- PASS /api/me/profile: 401
- PASS /api/me/progress: 401
- PASS /api/me/quiz-stats: 401
- PASS /api/me/review-due: 401
- PASS /api/me/srs-settings: 405
- PASS /api/me/streak: 401
- PASS /api/me/study-note: 401
- PASS /api/me/study-note?date={param}: dynamic
- PASS /api/me/study/hours: 405
- PASS /api/me/study/plan-item/: 404
- PASS /api/me/study/plan-items/bulk: 405
- PASS /api/me/study/series: 405
- PASS /api/me/study/today?track=bookkeeper: 401
- PASS /api/me/weak-laws: 401
- PASS /api/me/wrong-articles: 401
- PASS /api/past-exam/meta: 200
- PASS /api/past-exam/set?subject={param}&year={param}&limit=40: dynamic
- PASS /api/past-exam?subject={param}: dynamic
- PASS /api/past-exam?subject={param}{param}: dynamic
- PASS /api/playlist?track=bookkeeper&subject=: 200
- PASS /api/quiz: 200
- PASS /api/quiz?law={param}: dynamic
- PASS /api/quiz?page_id={param}: dynamic
- PASS /api/random: 200
- PASS /api/random?law={param}: dynamic
- PASS /api/request-trial-email: 405
- PASS /api/starred: 200
- PASS /api/starred?min_stars=5: 200
- PASS /api/verify-serial: 405

## Page Results

### bookkeeper.html — PASS

Title: 記帳士備考法條免費資源 — SoFa Engine

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls

Issues: none found by scripted checks.

### checkout.html — PASS

Title: SoFa Engine — 結帳

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls
- compared pricing/checkout data-plan blocks, visible NT$ amounts, data-amount values, and visible exam options against exam-plan-contract.json
- listed 2 API endpoint pattern(s)

Issues: none found by scripted checks.

API endpoints: /api/checkout, /api/funnel-event

### compass-planner.html — PASS

Title: examver1｜台灣國考職涯法規路徑樹（含官方法規連結）

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls

Issues: none found by scripted checks.

### dashboard.html — PASS

Title: SoFa Engine — 會員中心

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls
- listed 25 API endpoint pattern(s)

Issues: none found by scripted checks.

API endpoints: /api/article/, /api/articles?law=, /api/auth/magic, /api/chip_options?chip=, /api/cross_chip_search?chip=, /api/fill?law=, /api/laws, /api/me/bookmarks, /api/me/entitlements, /api/me/history, /api/me/mastery, /api/me/profile, /api/me/progress, /api/me/quiz-stats, /api/me/review-due, /api/me/srs-settings, /api/me/study/hours, /api/me/study/plan-item/, /api/me/study/plan-items/bulk, /api/me/study/series, /api/me/study/today?track=bookkeeper, /api/me/weak-laws, /api/me/wrong-articles, /api/playlist?track=bookkeeper&subject=, /api/starred

### exam.html — PASS

Title: SoFa Engine — 考古題

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls
- listed 3 API endpoint pattern(s)

Issues: none found by scripted checks.

API endpoints: /api/me/answer, /api/past-exam/meta, /api/past-exam/set?subject={param}&year={param}&limit=40

### fill.html — PASS

Title: SoFa Engine — 填空練習

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls
- listed 11 API endpoint pattern(s)

Issues: none found by scripted checks.

API endpoints: /api/article/{param}, /api/articles?law={param}, /api/fill, /api/fill?law={param}, /api/fill?page_id={param}, /api/laws, /api/me/answer, /api/me/bookmarks, /api/me/history, /api/me/mastery, /api/starred?min_stars=5

### free.html — PASS

Title: 國考法條免費查詢與互動練習 — SoFa Engine

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls

Issues: none found by scripted checks.

### ig-cards.html — PASS

Title: SoFa Engine — IG 圖卡

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls

Issues: none found by scripted checks.

### ig-carousel.html — PASS

Title: SoFa Engine — IG Carousel Preview

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls

Issues: none found by scripted checks.

### index.html — PASS

Title: SoFa Engine — 國考與專技備考系統｜法規、題目、錯題與弱點整理

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls

Issues: none found by scripted checks.

### land-agent.html — PASS

Title: 地政士備考法條免費查詢與練習 — SoFa Engine

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls

Issues: none found by scripted checks.

### law-preview.html — PASS

Title: 法本試讀 · SoFa Engine

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls
- listed 3 API endpoint pattern(s)

Issues: none found by scripted checks.

API endpoints: /api/article/{param}, /api/articles?law={param}, /api/me/profile

### law-updates.html — PASS

Title: 法規更新紀錄

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls

Issues: none found by scripted checks.

### login.html — PASS

Title: 登入 — SoFa Engine

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls
- listed 2 API endpoint pattern(s)

Issues: none found by scripted checks.

API endpoints: /api/auth/magic, /api/verify-serial

### notes.html — PASS

Title: SoFa Engine — 私人筆記庫

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls
- listed 1 API endpoint pattern(s)

Issues: none found by scripted checks.

API endpoints: /api/me/profile

### past-exam-radar.html — PASS

Title: 記帳士考古題雷達｜SoFa Engine

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls
- listed 2 API endpoint pattern(s)
- flagged past-exam-radar for live /api/past-exam/meta subject comparison

Issues: none found by scripted checks.

API endpoints: /api/past-exam/meta, /api/past-exam?subject={param}

### practice.html — PASS

Title: SoFa Engine — 打字練習

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls
- listed 10 API endpoint pattern(s)

Issues: none found by scripted checks.

API endpoints: /api/article/{param}, /api/articles?law={param}, /api/laws, /api/me/answer, /api/me/bookmarks, /api/me/mastery, /api/me/streak, /api/random, /api/random?law={param}, /api/starred?min_stars=5

### pricing.html — PASS

Title: 方案與定價 — SoFa Engine 國考與專技備考平台

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls
- compared pricing/checkout data-plan blocks, visible NT$ amounts, data-amount values, and visible exam options against exam-plan-contract.json

Issues: none found by scripted checks.

### quiz.html — PASS

Title: SoFa Engine — 選擇題

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls
- listed 16 API endpoint pattern(s)

Issues: none found by scripted checks.

API endpoints: /api/article/{param}, /api/articles?law={param}, /api/laws, /api/me/answer, /api/me/bookmarks, /api/me/history, /api/me/mastery, /api/me/profile, /api/me/quiz-stats, /api/me/weak-laws, /api/me/wrong-articles, /api/past-exam?subject={param}{param}, /api/quiz, /api/quiz?law={param}, /api/quiz?page_id={param}, /api/starred?min_stars=5

### real-estate.html — PASS

Title: 不動產經紀人備考法條免費查詢與練習 — SoFa Engine

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls

Issues: none found by scripted checks.

### richmenu-preview.html — PASS

Title: SoFa Engine — Rich Menu Preview

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls

Issues: none found by scripted checks.

### richmenu-render.html — PASS

Title: (untitled)

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls

Issues: none found by scripted checks.

### room.html — PASS

Title: SoFa 自習室 — 一起讀書

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls
- listed 6 API endpoint pattern(s)

Issues: none found by scripted checks.

API endpoints: /api/me/profile, /api/me/study-note, /api/me/study-note?date={param}, /api/random, /api/request-trial-email, /api/verify-serial

### share.html — PASS

Title: SoFa Engine — 2026 記帳士備考

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls

Issues: none found by scripted checks.

### support-serial.html — PASS

Title: SoFa Engine — 序號身份查詢

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls
- listed 1 API endpoint pattern(s)
- checked low-traffic support/legal page for dates, amounts, and contact surfaces

Issues: none found by scripted checks.

API endpoints: /api/admin/serial-identity

### tax-admin.html — PASS

Title: 財稅行政備考法條免費查詢與練習 — SoFa Engine

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls

Issues: none found by scripted checks.

### terms.html — PASS

Title: 服務聲明 — SoFa Engine

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls
- checked low-traffic support/legal page for dates, amounts, and contact surfaces

Issues: none found by scripted checks.

### tree.html — PASS

Title: 完整考試地圖 · SoFa Engine

Checked:
- parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls

Issues: none found by scripted checks.

