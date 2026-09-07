# Exam Selection Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every LINE daily quiz uses a confirmed exam selection without guessing or silently dropping users who have not completed selection.

**Architecture:** Treat a persisted, read-back `exam_key` as the only completed-selection signal. LINE prompts users with no key and sends that day's quiz immediately after a successful selection; the website recovers only an explicit local selection after login. The API fails closed when profile persistence cannot be confirmed.

**Tech Stack:** Python, Flask/FastAPI, LINE Messaging API, Supabase, vanilla JavaScript.

---

### Task 1: LINE selection completion and daily recovery

**Files:**
- Modify: `/private/tmp/codex-exam-scope-20260907/fay-spectrum-bot/main.py`
- Test: `/private/tmp/codex-exam-scope-20260907/fay-spectrum-bot/test_exam_selection_recovery_contract.py`

- [ ] Add a contract test requiring write/read-back confirmation, a missing-exam selection prompt, and immediate daily-quiz delivery after selection.
- [ ] Make `set_user_exam_key` return success only after persisted read-back matches.
- [ ] Send the exam picker instead of a shared question when the daily job finds no exam.
- [ ] After a successful LINE selection, enqueue that user's current daily quiz immediately.

### Task 2: API persistence confirmation

**Files:**
- Modify: `/private/tmp/codex-exam-scope-20260907/sofa-engine-api/api.py`
- Test: `/private/tmp/codex-exam-scope-20260907/sofa-engine-api/test_profile_exam_persistence_contract.py`

- [ ] Add a contract test requiring profile exam writes to be read back.
- [ ] Return HTTP 503 instead of a false success when the saved exam does not match.

### Task 3: Website explicit-local recovery

**Files:**
- Modify: `/private/tmp/codex-exam-scope-20260907/sofa.engine/dashboard.html`
- Test: `/private/tmp/codex-exam-scope-20260907/sofa.engine/tests/test_exam_selection_recovery_contract.py`

- [ ] Add a contract test requiring local exam recovery through authenticated profile PATCH.
- [ ] When the server profile has no exam, PATCH only a supported, explicitly stored `sofa_exam_key`.
- [ ] Apply the recovered exam only after the API confirms the same key.

