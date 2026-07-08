# Quiz Session Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `quiz.html` session mode so learners answer first, then see results and the login/save prompt.

**Architecture:** Reuse the current quiz loader and answer recorder. Add a small session state layer in `quiz.html` that changes post-answer UI behavior only when `session=1` or `mode=session` is present.

**Tech Stack:** Static HTML/CSS/JavaScript, Node test runner contract tests, Playwright for rendered smoke checks.

---

### Task 1: Contract Test

**Files:**
- Create: `tests/quiz-session-mode-contract.test.mjs`

- [x] Add failing tests that require session mode URL parsing, deferred answer reveal, summary card, and save/login CTA copy.
- [x] Run `node --test tests/quiz-session-mode-contract.test.mjs` and confirm the new tests fail because session mode is missing.

### Task 2: Session State and UI

**Files:**
- Modify: `quiz.html`

- [x] Add session parameters: `_sessionMode`, `_sessionTargetCount`, and `SESSION_AUTO_NEXT_DELAY_MS`.
- [x] Add a visible session intro and a hidden `#session-summary` block below the options.
- [x] In answer click handling, record correctness but skip option coloring, explanation, and post-answer actions when `_sessionMode` is true.
- [x] Auto-load the next question until the session target is reached.
- [x] Render summary with correct/wrong/accuracy and login/pricing actions after the final answer.
- [x] Keep immediate mode behavior unchanged.

### Task 3: Verification

**Files:**
- Modify: `quiz.html`
- Modify: `tests/quiz-answer-flow-contract.test.mjs`

- [x] Run `node --test tests/quiz-session-mode-contract.test.mjs`.
- [x] Run `node --test --test-name-pattern "session mode advances" tests/quiz-answer-flow-contract.test.mjs`.
- [x] Run focused RWD/button tests that include `quiz.html`.
- [x] Run `git diff --check`.
- [x] Start a local static server and use Playwright to check mobile `quiz.html?free=1&session=1&start=1` renders without horizontal overflow and without revealing correctness before the summary.
- [x] Use Playwright to check normal immediate-answer mode still shows explanation, action buttons, and answer coloring.
- [x] Use Playwright to check `quiz.html?free=1&session=1&mode=past-exam&count=1&start=1` keeps past-exam mode and defers explanation until the summary.
