# iPad Law Modal and Safe Area Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every supported law reference in quiz explanations open the existing in-page article dialog and keep the iPad top navigation below the system status bar.

**Architecture:** Extend the existing pure reference-link formatter instead of adding another reader implementation. Move the safe-area responsibility into the shared base topbar rule so it applies at tablet widths, while retaining existing mobile and native overrides.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js built-in test runner, GitHub Pages.

---

### Task 1: Add regression contracts

**Files:**
- Modify: `tests/quiz-answer-flow-contract.test.mjs`
- Modify: `tests/tool-mobile-nav-contract.test.mjs`

- [x] Add a test that executes `linkifyLawRefs()` with `所得稅法第34條、第51條` and requires two anchors with `data-law="所得稅法"` and article values `34` and `51`.
- [x] Add a test requiring the base `.topbar` rule, before responsive media queries, to include `env(safe-area-inset-top, 0px)`.
- [x] Run `node --test tests/quiz-answer-flow-contract.test.mjs tests/tool-mobile-nav-contract.test.mjs` and confirm the new assertions fail for the missing behavior.

### Task 2: Implement the minimal fixes

**Files:**
- Modify: `quiz.html`
- Modify: `sofa.css`

- [x] Update `linkifyLawRefs()` so subsequent `、第 N 條` references inherit the most recently matched law name without changing unrelated plain text.
- [x] Update the base `.topbar` padding to include the top safe-area inset at tablet and desktop viewport widths.
- [x] Update the quiz article panel top inset to include the same safe-area inset.
- [x] Ensure backdrop click and Escape retain the existing close behavior without navigation.
- [x] Run the two focused test files and confirm they pass.

### Task 3: Verify and deliver

**Files:**
- Modify: `docs/superpowers/specs/2026-08-27-ipad-law-modal-safe-area-design.md` only if verification reveals a real design discrepancy.

- [x] Run `node --test tests/*.mjs` and require zero failures.
- [x] Serve the worktree locally and inspect the quiz page at 1280×960 and 768×1024 with Playwright, checking topbar geometry and article dialog open/close behavior.
- [x] Review `git diff --check` and the scoped diff.
- [ ] Commit only the isolated worktree changes, push the branch, merge through the repository workflow, and wait for the GitHub Pages deployment of the exact merge SHA.
- [ ] Read back live `quiz.html` and `sofa.css`, then repeat the relevant browser checks against `https://sofaengine.org/quiz.html`.
