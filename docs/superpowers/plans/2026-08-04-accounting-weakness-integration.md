# Accounting Weakness Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** First ship a saved per-question iPad calculation sheet for all three bookkeeper MCQ subjects, then make accounting the third weakness-tracked subject while preserving article-level analysis only for law subjects.

**Architecture:** Add a row-owned `subject_attempts` ledger for non-law MCQ attempts, expose subject-level weakness separately from the existing law bridge, and make the dashboard count an explicit API capability. Accounting practice writes canonical exam-question evidence; law practice continues using `user_stats` and `quiz_sessions`.

**Tech Stack:** PostgreSQL/Supabase RLS, FastAPI/Python, static HTML/JavaScript, Python `unittest`, Node `node:test`.

---

## File Map

- `SoFa.Engine/migration/14_subject_attempts.sql`: subject-attempt schema, constraints, indexes, RLS, and ownership policies.
- `SoFa.Engine/supabase/migrations/<generated>_question_scratchpads.sql`: private per-question vector scratchpad schema.
- `sofa-engine-api/api.py`: non-law answer endpoint, subject weakness aggregation, and study capability payload.
- `sofa-engine-api/test_question_scratchpad_contract.py`: scratchpad validation, ownership, and bounded-payload contracts.
- `sofa-engine-api/test_subject_attempts_contract.py`: schema and endpoint contract tests.
- `sofa-engine-api/test_me_study_today_contract.py`: three-subject capability and split weakness payload tests.
- `sofa.engine/quiz.html`: send accounting attempts and render accounting weakness without law links.
- `sofa.engine/question-scratchpad.js`: pointer drawing state, normalized vectors, undo/redo/eraser, local drafts, and API synchronization.
- `sofa.engine/tests/question-scratchpad-contract.test.mjs`: drawing-state and per-question lifecycle contracts.
- `sofa.engine/dashboard.html`: count explicit weakness capabilities and render accounting practice links.
- `sofa.engine/tests/past-exam-mode-contract.test.mjs`: accounting answer-write contract.
- `sofa.engine/tests/dashboard-study-today-contract.test.mjs`: three-subject and unavailable-state rendering contracts.

### Task 0: Ship the saved per-question calculation sheet first

**Files:**
- Create: `SoFa.Engine/tests/test_question_scratchpads_schema.py`
- Create: `SoFa.Engine/supabase/migrations/<generated>_question_scratchpads.sql`
- Create: `sofa-engine-api/test_question_scratchpad_contract.py`
- Modify: `sofa-engine-api/api.py`
- Create: `sofa.engine/question-scratchpad.js`
- Create: `sofa.engine/tests/question-scratchpad-contract.test.mjs`
- Modify: `sofa.engine/quiz.html`
- Modify: `sofa.engine/tests/past-exam-mode-contract.test.mjs`

- [ ] **Step 1: Red-test the private scratchpad schema**

Require one row per `user_id, exam_key, exam_question_id`, an `exam_questions` foreign key, JSONB vector document, revision, byte count, timestamps, RLS enabled, and no direct anon/authenticated grants. The service-role API is the sole database writer.

- [ ] **Step 2: Generate and implement the migration**

Use `supabase migration new question_scratchpads`; do not invent the timestamp. The core table is:

```sql
create table if not exists public.question_scratchpads (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  exam_key text not null,
  subject text not null,
  exam_question_id uuid not null references public.exam_questions(id) on delete cascade,
  roc_year integer not null,
  question_no integer not null,
  document jsonb not null default '{"version":1,"strokes":[]}'::jsonb,
  revision integer not null default 1,
  payload_bytes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, exam_key, exam_question_id)
);
alter table public.question_scratchpads enable row level security;
revoke all on public.question_scratchpads from anon, authenticated;
```

- [ ] **Step 3: Red-test GET/PUT/DELETE scratchpad API contracts**

Require authentication; resolve the canonical `exam_questions` row and exam capability server-side; accept only version 1 vector documents; reject more than 400 strokes, 2,000 points per stroke, 20,000 total points, 512 KiB serialized JSON, non-finite coordinates, coordinates outside `0..1`, invalid tools, or widths outside `0.001..0.1`. GET returns empty version 1 document when no row exists. PUT upserts only the authenticated `user_id`. DELETE clears one question only.

- [ ] **Step 4: Implement the bounded API**

Add:

```text
GET    /api/me/question-scratchpad?exam_key=bookkeeper&question_id=<uuid>
PUT    /api/me/question-scratchpad
DELETE /api/me/question-scratchpad?exam_key=bookkeeper&question_id=<uuid>
```

The PUT body contains only `exam_key`, `question_id`, `document`, and `revision`; subject/year/question number come from the verified question row. A stale revision returns HTTP 409 with the server document rather than overwriting newer work.

- [ ] **Step 5: Red-test the browser drawing state**

Test normalized pointer coordinates, pen strokes, eraser deletion, undo, redo, explicit clear, localStorage key isolation by exam/question/user identity, and the lifecycle rule: save current question before advance, reset visible state, then load only the next question's document.

- [ ] **Step 6: Implement `question-scratchpad.js`**

Expose a small controller with `setQuestion(identity)`, `pointerDown/Move/Up`, `undo`, `redo`, `clear`, `save`, `flushBeforeAdvance`, and `destroy`. Use Pointer Events and `setPointerCapture`; accept `pointerType === "pen"` for drawing and allow an explicit touch-draw toggle, while default touch gestures do not create ink. Persist a debounced local draft during drawing and sync after idle, on collapse, before answer submission, and on `pagehide`.

- [ ] **Step 7: Add the collapsible quiz drawer**

Render the drawer for `會計學概要`, `稅務相關法規概要`, and `記帳相關法規概要` in past-exam mode. Include pen, eraser, width, undo, redo, clear confirmation, full-screen, and status (`已儲存`, `儲存中`, `尚未同步`). Collapsing hides without clearing. On answer submission, await local save before advancing; cloud sync may continue from the retained local draft. The next question starts blank unless that exact question already has a saved sheet.

- [ ] **Step 8: Run focused tests and commit each repository slice**

Schema: `python -m unittest tests.test_question_scratchpads_schema -v`

API: `python -m unittest test_question_scratchpad_contract.py -v`

Web: `node --test tests/question-scratchpad-contract.test.mjs tests/past-exam-mode-contract.test.mjs`

Expected: all pass; `git diff --check` passes in all three repositories.

### Task 1: Add the subject-attempt ledger

**Files:**
- Create: `SoFa.Engine/migration/14_subject_attempts.sql`
- Create: `SoFa.Engine/tests/test_subject_attempts_schema.py`

- [ ] **Step 1: Write the failing schema contract**

```python
from pathlib import Path

SQL = Path("migration/14_subject_attempts.sql").read_text() if Path("migration/14_subject_attempts.sql").exists() else ""

def test_subject_attempts_is_owned_and_idempotent():
    required = [
        "create table if not exists public.subject_attempts",
        "exam_question_id uuid not null references public.exam_questions(id)",
        "user_id text not null",
        "exam_key text not null",
        "subject text not null",
        "roc_year integer not null",
        "question_no integer not null",
        "selected_answer text not null",
        "is_correct boolean not null",
        "idempotency_key text not null",
        "unique (user_id, idempotency_key)",
        "enable row level security",
    ]
    for marker in required:
        assert marker in SQL.lower()
```

- [ ] **Step 2: Run the test and verify RED**

Run: `python -m unittest tests.test_subject_attempts_schema -v`

Expected: FAIL because `migration/14_subject_attempts.sql` does not exist.

- [ ] **Step 3: Write the minimal migration**

```sql
create table if not exists public.subject_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  exam_key text not null,
  subject text not null,
  exam_question_id uuid not null references public.exam_questions(id),
  roc_year integer not null,
  question_no integer not null,
  selected_answer text not null check (selected_answer in ('A','B','C','D')),
  is_correct boolean not null,
  concept_key text,
  idempotency_key text not null,
  answered_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index if not exists idx_subject_attempts_user_subject_time
  on public.subject_attempts (user_id, exam_key, subject, answered_at desc);

alter table public.subject_attempts enable row level security;
revoke all on public.subject_attempts from anon, authenticated;
```

The service-role API remains the only writer. Do not add a browser-writable RLS policy.

- [ ] **Step 4: Run the focused schema test**

Run: `python -m unittest tests.test_subject_attempts_schema -v`

Expected: PASS.

- [ ] **Step 5: Commit only the schema slice**

```bash
git add migration/14_subject_attempts.sql tests/test_subject_attempts_schema.py
git commit -m "feat: add subject attempt ledger"
```

### Task 2: Accept and aggregate accounting attempts

**Files:**
- Modify: `sofa-engine-api/api.py`
- Create: `sofa-engine-api/test_subject_attempts_contract.py`

- [ ] **Step 1: Write failing endpoint and aggregation tests**

Add AST/runtime contracts proving:

```python
def test_subject_answer_requires_canonical_accounting_question(self):
    fn = self._function_source("me_subject_answer")
    self.assertIn('.table("exam_questions")', fn)
    self.assertIn('exam_key != "bookkeeper"', fn)
    self.assertIn('subject != "會計學概要"', fn)
    self.assertIn('.table("subject_attempts").upsert(', fn)
    self.assertNotIn('.table("articles")', fn)

def test_subject_weakness_keeps_unclassified_accounting(self):
    result = self.ns["_aggregate_subject_weakness"]([
        {"subject": "會計學概要", "is_correct": False, "concept_key": None},
    ])
    self.assertEqual(result[0]["subject"], "會計學概要")
    self.assertEqual(result[0]["concepts"][0]["concept_key"], "unclassified")
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `python -m unittest test_subject_attempts_contract.py -v`

Expected: FAIL because `me_subject_answer` and `_aggregate_subject_weakness` do not exist.

- [ ] **Step 3: Add the authenticated answer route**

Implement `POST /api/me/subject-answer` with this validated input contract:

```python
exam_key = str(body.get("exam_key") or "").strip()
subject = str(body.get("subject") or "").strip()
question_id = str(body.get("exam_question_id") or "").strip()
selected = str(body.get("selected_answer") or "").strip().upper()
idempotency_key = str(body.get("idempotency_key") or "").strip()
if exam_key != "bookkeeper" or subject != "會計學概要":
    raise HTTPException(status_code=400, detail="目前僅接受記帳士會計學作答")
if selected not in {"A", "B", "C", "D"} or not question_id or not idempotency_key:
    raise HTTPException(status_code=400, detail="作答資料不完整")
```

Load `exam_questions` by ID, require its canonical subject/year/question number and a verified A-D answer, calculate correctness server-side, then `upsert(..., on_conflict="user_id,idempotency_key")`. Never trust client-supplied correctness, year, or question number.

- [ ] **Step 4: Add subject weakness aggregation**

Implement `_build_subject_weakness(uid, exam_key)` by reading `subject_attempts`, grouping by canonical subject and `concept_key or "unclassified"`, and returning:

```python
{
  "source": "subject_attempts",
  "status": "ready",
  "items": [{
    "subject": "會計學概要",
    "attempt_count": 4,
    "correct_count": 1,
    "wrong_count": 3,
    "accuracy": 25,
    "concepts": [{"concept_key": "unclassified", "label": "未分類", "wrong_count": 3}],
  }],
}
```

Empty data returns `status: "empty"`; query failure returns an explicit unavailable payload and makes the parent study response `partial`.

- [ ] **Step 5: Run focused and neighboring API tests**

Run: `python -m unittest test_subject_attempts_contract.py test_me_answer_contract.py test_me_weak_laws_contract.py -v`

Expected: PASS with law-answer contracts unchanged.

- [ ] **Step 6: Commit the API ledger slice**

```bash
git add api.py test_subject_attempts_contract.py
git commit -m "feat: record accounting weakness attempts"
```

### Task 3: Expose three weakness-capable subjects in Study Today

**Files:**
- Modify: `sofa-engine-api/api.py`
- Modify: `sofa-engine-api/test_me_study_today_contract.py`

- [ ] **Step 1: Replace the old two-subject expectation with a failing capability contract**

```python
def test_three_mcq_subjects_are_weakness_trackable(self):
    seed = self._runtime_namespace()["_bookkeeper_track_seed"]()
    capable = [s["display_name"] for s in seed["subjects"] if s["weakness_trackable"]]
    self.assertEqual(capable, ["會計學概要", "記帳相關法規概要", "稅務相關法規概要"])
    accounting = next(s for s in seed["subjects"] if s["subject_key"] == "accounting")
    self.assertEqual(accounting["implementation_status"], "seeded_moex_mcq")
    self.assertGreater(accounting["loadable_questions"], 0)
    self.assertEqual(accounting["analysis_level"], "subject_concept")
```

- [ ] **Step 2: Run the study contract and verify RED**

Run: `python -m unittest test_me_study_today_contract.py -v`

Expected: FAIL because accounting is deferred and `weakness_trackable` is absent.

- [ ] **Step 3: Update the seed and response contract**

Set accounting to `seeded_moex_mcq`, add `weakness_trackable: true` and `analysis_level: "subject_concept"`; set the two law subjects to `analysis_level: "law_article"`. Keep essay subjects false. Derive accounting `loadable_questions` from the same authoritative exam capability registry used by `/api/past-exam/meta`; do not copy `708` into the accounting row.

Add `weakness_capability` and `subject_weakness` to `me_study_today`:

```python
"weakness_capability": {
    "status": "ready",
    "subject_count": len([s for s in subjects if s["weakness_trackable"]]),
    "subjects": [s["display_name"] for s in subjects if s["weakness_trackable"]],
},
"subject_weakness": subject_weakness,
```

- [ ] **Step 4: Run study and past-exam API contracts**

Run: `python -m unittest test_me_study_today_contract.py test_past_exam_api_contract.py test_subject_attempts_contract.py -v`

Expected: PASS and subject count equals 3.

- [ ] **Step 5: Commit the Study Today slice**

```bash
git add api.py test_me_study_today_contract.py
git commit -m "feat: expose three weakness subjects"
```

### Task 4: Record accounting answers from web practice

**Files:**
- Modify: `sofa.engine/quiz.html`
- Modify: `sofa.engine/tests/past-exam-mode-contract.test.mjs`

- [ ] **Step 1: Write a failing web contract**

Assert the past-exam answer flow branches on question mode: law MCQs continue calling `/api/me/answer` with a real article ID; accounting calls `/api/me/subject-answer` with `exam_key`, canonical subject, question ID, selected A-D key, and a stable idempotency key.

```javascript
assert.match(active, /\/api\/me\/subject-answer/);
assert.match(active, /exam_question_id/);
assert.match(active, /idempotency_key/);
assert.match(active, /subject:\s*currentPastExamQuestion\.subject/);
```

- [ ] **Step 2: Run the contract and verify RED**

Run: `node --test tests/past-exam-mode-contract.test.mjs`

Expected: FAIL because the accounting write route is absent.

- [ ] **Step 3: Implement the minimal accounting write branch**

Use the server-returned past-exam question ID and selected option key. Generate a stable retry key from user-visible attempt identity, for example `bookkeeper:<question-id>:<attempt-start-uuid>`. Preserve the key until the request succeeds or the user advances. A failed write shows `作答已判分，但弱點紀錄尚未同步` and must not claim synchronization.

- [ ] **Step 4: Run focused web contracts**

Run: `node --test tests/past-exam-mode-contract.test.mjs tests/quiz-answer-flow-contract.test.mjs tests/question-source-record-contract.test.mjs`

Expected: PASS with law answer recording unchanged.

- [ ] **Step 5: Commit the web answer slice**

```bash
git add quiz.html tests/past-exam-mode-contract.test.mjs
git commit -m "feat: sync accounting weakness answers"
```

### Task 5: Render three-subject status and accounting weakness

**Files:**
- Modify: `sofa.engine/dashboard.html`
- Modify: `sofa.engine/tests/dashboard-study-today-contract.test.mjs`

- [ ] **Step 1: Write failing dashboard contracts**

```javascript
test('dashboard counts explicit weakness capability', () => {
  const fn = extractFunction(active, 'renderStudyToday');
  assert.match(fn, /weakness_capability/);
  assert.match(fn, /subject_count/);
  assert.doesNotMatch(fn, /implementation_status\s*===\s*['"]seeded_moex_mcq/);
});

test('accounting weakness routes to scoped practice without a law link', () => {
  assert.match(active, /exam=bookkeeper/);
  assert.match(active, /subject=.*會計學概要/);
  assert.match(active, /subject_weakness/);
});
```

- [ ] **Step 2: Run the dashboard contract and verify RED**

Run: `node --test tests/dashboard-study-today-contract.test.mjs`

Expected: FAIL because the current count infers seeded subjects.

- [ ] **Step 3: Render capability and split weakness levels**

Read `data.weakness_capability.subject_count`; render `弱點判讀已接 3 科` and `已接 3 科` only when capability status is ready. On unavailable scope render `科目狀態暫時無法確認`. Render accounting concept rows from `subject_weakness`; use `未分類` when returned, and link to `quiz.html?mode=past-exam&exam=bookkeeper&subject=會計學概要`. Keep law rows and law-reader links sourced only from `weak_law_bridge`.

- [ ] **Step 4: Run focused dashboard tests**

Run: `node --test tests/dashboard-study-today-contract.test.mjs tests/dashboard-weak-laws-contract.test.mjs tests/dashboard-layout-contract.test.mjs`

Expected: PASS with no fake count and no accounting law link.

- [ ] **Step 5: Commit the dashboard slice**

```bash
git add dashboard.html tests/dashboard-study-today-contract.test.mjs
git commit -m "feat: show accounting weakness in dashboard"
```

### Task 6: Verify, apply, deploy, and record

**Files:**
- Modify: `SoFa.Engine/task_plan.md`
- Modify: `SoFa.Engine/progress.md`
- Modify: `SoFa.Engine/findings.md` only if a durable new constraint is discovered.

- [ ] **Step 1: Run full local verification**

API: `python -m unittest discover -p 'test_*.py'`

Web: `node --test tests/*.test.mjs`

All repos: `git diff --check`

Expected: zero failures and clean diff checks.

- [ ] **Step 2: Apply the migration through the established Supabase gate**

Run the repository's read-only schema probe first. Apply only `migration/14_subject_attempts.sql` after confirming the target project and a clean backup gate. Verify table columns, unique constraint, RLS enabled, and no anon/authenticated grants. Do not use a broad linked push.

- [ ] **Step 3: Publish API before web**

Deploy the API commits, then verify `/ping`, authenticated `/api/me/study/today`, and a controlled accounting answer write. The response must report three weakness-capable subjects, and the resulting subject weakness row must have no law/article identifier.

- [ ] **Step 4: Publish and verify web**

Deploy web commits only after API acceptance. Use a fresh cache-busted dashboard URL and an authenticated browser session. Verify `已接 3 科`, an accounting answer syncing into weakness, accounting practice routing, and unchanged law drill behavior on desktop and mobile.

- [ ] **Step 5: Record evidence**

Update local control files and the existing SoFa Notion task/changelog rows with commit SHAs, deployment runs, migration verification, focused/full test counts, and live acceptance. Set changelog `是否公告 = false`. Mark complete only after live evidence exists; otherwise record the exact blocker as `未確認`.
