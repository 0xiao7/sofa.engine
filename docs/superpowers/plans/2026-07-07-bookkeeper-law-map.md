# Bookkeeper Law Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a SoFa-style evidence page for bookkeeper past-exam law mapping, with honest data boundaries and direct practice CTAs.

**Architecture:** Keep the MVP static and low-risk inside `sofa.engine`: one new blog/tool page, one blog index entry, one sitemap URL, and one contract test. The page progressively reads public API metadata when available, but it must remain useful if the API is unavailable.

**Tech Stack:** Static HTML/CSS/JS, Node.js built-in test runner, existing SoFa navy/peach/cream design tokens.

---

### Task 1: Contract Test

**Files:**
- Create: `tests/bookkeeper-map-contract.test.mjs`

- [x] **Step 1: Write the failing test**

Create a Node contract test that asserts the new page, blog entry, and sitemap entry exist; that the page uses honest bookkeeper status language; that CTAs go to `quiz.html?mode=past-exam` and saved-record surfaces; and that the page does not mention self-study room or competitor-style claims.

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/bookkeeper-map-contract.test.mjs`

Expected: FAIL because `blog/bookkeeper-past-exam-law-map.html` does not exist yet.

### Task 2: Page And Entries

**Files:**
- Create: `blog/bookkeeper-past-exam-law-map.html`
- Modify: `blog/index.html`
- Modify: `sitemap.xml`

- [x] **Step 1: Implement the page**

Use existing blog visual language: deep navy, peach accent, cream text, serif headline, mono labels. Copy must say `109-114 年`, `記帳相關法規概要`, `稅務相關法規概要`, `580 題可灌`, `MOEX 官方答案重核`, `整理中`, and `國文只收題目`.

- [x] **Step 2: Add discovery**

Add the page to `blog/index.html` as item 04 and `sitemap.xml` under the blog section with lastmod `2026-07-07`.

- [x] **Step 3: Run test to verify it passes**

Run: `node --test tests/bookkeeper-map-contract.test.mjs`

Expected: PASS.

### Task 3: Focused Verification

**Files:**
- Test existing adjacent contracts without fixing unrelated dashboard baseline failures.

- [x] **Step 1: Run new and adjacent safe tests**

Run: `node --test tests/bookkeeper-map-contract.test.mjs tests/bookkeeper-coverage-honesty-contract.test.mjs tests/public-counts-contract.test.mjs`

Expected: PASS.

- [x] **Step 2: Browser smoke check**

Serve the worktree with a local static server and open `/blog/bookkeeper-past-exam-law-map.html` on desktop and mobile widths. Confirm the page is readable, CTA buttons are visible, and no text overlaps.
