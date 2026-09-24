# Exam-Day Game Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the approved NT$1,280 exam-day purchase flow so checkout receives one canonical exam choice instead of presenting a misleading two-item purchase dropdown.

**Architecture:** Keep `exam-targets.js` as the sale-window and event projection, but make `checkout.html` consume one explicit URL or stored target. The checkout target step renders a selected-target summary plus a separate searchable 172-capability picker backed by `exam-data.js`; purchase remains fail-closed unless the selected capability maps to one verified, currently open exam event. The final summary repeats the selected exam and the non-changeable lock disclosure.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js built-in test runner, Playwright live rendering.

---

### Task 1: Lock the intended checkout behavior with failing contracts

**Files:**
- Modify: `tests/exam-day-plan-contract.test.mjs`
- Test: `tests/exam-day-plan-contract.test.mjs`

- [ ] Add assertions that checkout contains no exam `<select>`, no `getCheckoutPurchasableTargets()`, and no generated two-option list.
- [ ] Add assertions for a dedicated target picker, searchable canonical list, explicit selected-target summary, change-target control, and both lock disclosures.
- [ ] Add boundary assertions that the sale closes at the official registration deadline.
- [ ] Run `node --test tests/exam-day-plan-contract.test.mjs` and confirm the new assertions fail against current main.

### Task 2: Restore event identity and sale-window authority

**Files:**
- Modify: `exam-targets.js`
- Modify: `exam-plan-contract.json`
- Test: `tests/exam-day-plan-contract.test.mjs`

- [ ] Restore `capabilityId`, `eventId`, `trackId`, `catalogRevision`, `saleOpenDate`, and `saleCloseDate` for verified mapped targets.
- [ ] Make `examDayPlanState()` fail closed after `saleCloseDate` and distinguish `registration_closed` from an expired exam.
- [ ] Run the focused test and confirm the date-boundary assertions pass.

### Task 3: Replace the dropdown with the approved exam-first flow

**Files:**
- Modify: `checkout.html`
- Test: `tests/exam-day-plan-contract.test.mjs`

- [ ] Load the canonical 172 exam data and render an independent searchable picker outside the payment summary.
- [ ] Resolve exactly one URL/stored target, show its exam/event/date details, and never silently default to bookkeeper.
- [ ] When no target is selected, keep the payment CTA disabled and show `先選考科`.
- [ ] When the target lacks a verified open event, keep the payment CTA disabled and show the exact unavailable reason.
- [ ] When valid, include `exam_key`, `capability_id`, `event_id`, `track_id`, and `catalog_revision` in the checkout payload.
- [ ] Repeat the exam name and lock disclosure in the final payment summary.

### Task 4: Verify, commit, push, and read back production

**Files:**
- Verify: `checkout.html`, `exam-targets.js`, `exam-plan-contract.json`, focused and full web tests

- [ ] Run focused checkout, pricing, funnel, and exam-scope tests.
- [ ] Run `node --test tests/*.test.mjs` and `git diff --check`.
- [ ] Render desktop 1280x780 and mobile 390x844 with Playwright; verify picker, blocked state, selected state, lock disclosure, and no horizontal overflow.
- [ ] Commit and push the isolated branch, merge to main through the repository's normal path, then wait for GitHub Pages deployment.
- [ ] Read back live HTML/JS SHA and use Playwright on `https://sofaengine.org/checkout.html?plan=到考日` to confirm the dropdown is absent and the new exam-first flow is present.
