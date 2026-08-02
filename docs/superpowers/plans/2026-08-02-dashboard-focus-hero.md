# Dashboard Focus Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a responsive SoFa-native focus hero to the dashboard, preserve all existing dashboard features below it, and make the installed web app adapt across phone, tablet, and desktop.

**Architecture:** Keep the single-file dashboard architecture and add one isolated `.focus-hero` component before `.greet`. Its links work without API data; a small initializer enhances the secondary action from existing wrong-question state and sends non-blocking analytics. Update only manifest metadata needed for cross-device installation.

**Tech Stack:** Static HTML/CSS/JavaScript, Web App Manifest, Node contract tests, browser visual QA.

---

### Task 1: Lock the hero, preservation, and PWA contracts

**Files:**
- Create: `tests/dashboard-focus-hero-contract.test.mjs`
- Test: `tests/dashboard-focus-hero-contract.test.mjs`

- [ ] **Step 1: Write the failing contract**

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));

test('focus hero leads into the preserved study desk', () => {
  const hero = html.indexOf('id="dashboard-focus-hero"');
  const desk = html.indexOf('id="dashboard-study-desk"');
  const member = html.indexOf('id="member"');
  assert.ok(hero > -1 && desk > hero && member > desk);
  assert.match(html, /今天，先做一組。/);
  assert.match(html, /quiz\.html\?start=1&session=1&count=5/);
  assert.match(html, /id="study-cockpit-recap"/);
});

test('focus hero has phone tablet desktop and reduced-motion rules', () => {
  assert.match(html, /@media \(max-width:767px\)[\s\S]*\.focus-hero/);
  assert.match(html, /@media \(min-width:768px\) and \(max-width:1099px\)[\s\S]*\.focus-hero/);
  assert.match(html, /@media \(min-width:1100px\)[\s\S]*\.focus-hero/);
  assert.match(html, /@media \(prefers-reduced-motion:reduce\)[\s\S]*\.focus-hero/);
});

test('dashboard remains an installable cross-device web app', () => {
  assert.match(html, /rel="manifest" href="\/manifest\.json"/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.orientation, 'any');
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/dashboard-focus-hero-contract.test.mjs`

Expected: failures for missing hero, study-desk boundary, responsive rules, and portrait-only manifest.

### Task 2: Implement the SoFa-native focus hero

**Files:**
- Modify: `dashboard.html`
- Test: `tests/dashboard-focus-hero-contract.test.mjs`

- [ ] **Step 1: Add isolated hero CSS**

Add `.focus-hero`, `.focus-hero-inner`, `.focus-hero-kicker`, `.focus-hero-title`, `.focus-hero-copy`, `.focus-hero-actions`, `.focus-hero-primary`, `.focus-hero-secondary`, `.focus-hero-lines`, and `.study-desk-intro` rules using only existing CSS variables.

- [ ] **Step 2: Add explicit breakpoints**

Implement:

```css
@media (max-width:767px) { /* phone */ }
@media (min-width:768px) and (max-width:1099px) { /* tablet */ }
@media (min-width:1100px) { /* desktop */ }
@media (prefers-reduced-motion:reduce) { /* remove entrance movement */ }
```

- [ ] **Step 3: Add semantic hero markup before the existing greeting**

```html
<section class="focus-hero" id="dashboard-focus-hero" aria-labelledby="dashboard-focus-title">
  <div class="focus-hero-lines" aria-hidden="true"></div>
  <div class="focus-hero-inner">
    <div class="focus-hero-kicker">TODAY · FOCUS · ONE SET</div>
    <h1 class="focus-hero-title" id="dashboard-focus-title">今天，先做一組。</h1>
    <p class="focus-hero-copy">不用先整理完整計畫。先完成 5 題，系統再依你的作答紀錄安排下一步。</p>
    <div class="focus-hero-actions">
      <a class="focus-hero-primary" id="focus-hero-start" href="quiz.html?start=1&amp;session=1&amp;count=5">開始今天 5 題</a>
      <a class="focus-hero-secondary" id="focus-hero-secondary" href="#dashboard-study-desk">查看學習紀錄</a>
    </div>
    <a class="focus-hero-scroll" href="#dashboard-study-desk">查看完整學習桌 <span aria-hidden="true">↓</span></a>
  </div>
</section>
<div class="study-desk-intro" id="dashboard-study-desk">
  <span>YOUR STUDY DESK</span>
  <h2>你的學習桌</h2>
</div>
```

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/dashboard-focus-hero-contract.test.mjs`

Expected: 3 tests pass.

### Task 3: Enhance action state and analytics without blocking navigation

**Files:**
- Modify: `dashboard.html`
- Test: `tests/dashboard-focus-hero-contract.test.mjs`

- [ ] **Step 1: Extend the contract**

Assert that `initDashboardFocusHero` reads `sofa_wrong_ids`, sets the wrong-review URL when count is positive, and calls `sofaTrack` only behind a function guard.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/dashboard-focus-hero-contract.test.mjs`

Expected: state/analytics contract fails.

- [ ] **Step 3: Add the initializer**

```js
function initDashboardFocusHero(){
  var secondary = document.getElementById('focus-hero-secondary');
  var wrong = [];
  try { wrong = JSON.parse(localStorage.getItem('sofa_wrong_ids') || '[]'); } catch(e) {}
  if(secondary && Array.isArray(wrong) && wrong.length){
    secondary.href = 'quiz.html?open=weakness';
    secondary.textContent = '複習 ' + wrong.length + ' 題錯題';
  }
  document.querySelectorAll('[data-focus-event]').forEach(function(link){
    link.addEventListener('click', function(){
      if(typeof window.sofaTrack === 'function') window.sofaTrack(link.dataset.focusEvent, {surface:'dashboard_focus_hero'});
    });
  });
}
```

Add `data-focus-event` attributes to the primary, secondary, and study-desk links, then invoke the initializer from the existing dashboard boot path.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/dashboard-focus-hero-contract.test.mjs`

Expected: all hero contracts pass.

### Task 4: Make the manifest cross-device and verify regressions

**Files:**
- Modify: `manifest.json`
- Test: `tests/dashboard-focus-hero-contract.test.mjs`

- [ ] **Step 1: Change installed orientation**

Replace `"orientation": "portrait"` with `"orientation": "any"`. Preserve `start_url`, `scope`, `display`, colors, and all icons.

- [ ] **Step 2: Run scoped contracts**

Run:

```bash
node --test tests/dashboard-focus-hero-contract.test.mjs tests/dashboard-layout-contract.test.mjs tests/dashboard-study-today-contract.test.mjs
```

Expected: new hero contracts pass; any pre-existing baseline failure is reported separately and no new failure is introduced.

- [ ] **Step 3: Run browser QA**

Open the local dashboard with mocked identity/API-safe state and capture:

- 375x667 phone
- 390x844 phone
- 820x1180 tablet
- 1440x900 desktop

At each size assert:

- primary CTA is visible and at least 52px tall;
- no horizontal overflow;
- study desk follows the hero;
- existing `#study-cockpit-recap`, `#tools`, `#member`, and `#laws` remain in the DOM;
- primary and secondary links navigate correctly;
- console contains no new errors.

- [ ] **Step 4: Run final checks**

Run: `git diff --check && node --test tests/dashboard-focus-hero-contract.test.mjs`

Expected: clean diff and all hero tests pass.
