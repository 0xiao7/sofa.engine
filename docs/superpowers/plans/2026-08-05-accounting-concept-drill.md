# Accounting Concept Drill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let learners open a classified accounting weakness from Dashboard and practice only that high-confidence concept across ROC years 104–114.

**Architecture:** The API remains the sole classification authority. Both past-exam endpoints validate an optional `concept_key`, classify already-trackable accounting rows with the existing classifier, and filter exactly; Dashboard emits concept deep links while Quiz forwards and visibly represents the filter. Existing attempt and scratchpad persistence remain unchanged.

**Tech Stack:** FastAPI, Supabase Python client, vanilla HTML/CSS/JavaScript, Python unittest/pytest, Node test runner, Playwright.

---

## File map

- `sofa-engine-api/api.py`: concept validation, filtering, serialization, endpoint query parameters.
- `sofa-engine-api/test_accounting_concept_drill.py`: API unit and endpoint contract tests.
- `sofa.engine/dashboard.html`: separate weakness rows and deep links.
- `sofa.engine/quiz.html`: URL state, request forwarding, visible chapter state, subject-change cleanup.
- `sofa.engine/tests/dashboard-accounting-concept-drill-contract.test.mjs`: Dashboard link contracts.
- `sofa.engine/tests/quiz-accounting-concept-drill-contract.test.mjs`: Quiz state and request contracts.

### Task 1: API concept filter primitive

**Files:**
- Create: `/Users/0xiao7/.config/superpowers/worktrees/sofa-engine-api/accounting-concept-drill-20260805/test_accounting_concept_drill.py`
- Modify: `/Users/0xiao7/.config/superpowers/worktrees/sofa-engine-api/accounting-concept-drill-20260805/api.py`

- [ ] **Step 1: Write failing primitive tests**

```python
def test_filter_keeps_only_exact_concept():
    rows = [inventory_row(), cash_row(), ambiguous_row()]
    result = api._filter_accounting_concept_rows(
        rows, "bookkeeper", "會計學概要", "ACC-ASSET-INVENTORY"
    )
    assert [row["id"] for row in result] == ["inventory"]

def test_filter_rejects_unknown_or_cross_subject_key():
    with pytest.raises(HTTPException) as exc:
        api._filter_accounting_concept_rows([], "bookkeeper", "稅務相關法規概要", "ACC-ASSET-INVENTORY")
    assert exc.value.status_code == 400
```

- [ ] **Step 2: Run the tests and verify red**

Run:

```bash
uv run --with-requirements requirements.txt --with pytest pytest -q test_accounting_concept_drill.py
```

Expected: failure because `_filter_accounting_concept_rows` does not exist.

- [ ] **Step 3: Implement exact validation and filtering**

Add beside `_classify_accounting_concept`:

```python
def _filter_accounting_concept_rows(rows, exam_key, subject, concept_key):
    concept_key = str(concept_key or "").strip()
    if not concept_key:
        return rows
    if (
        exam_key != "bookkeeper"
        or subject != "會計學概要"
        or concept_key not in _ACCOUNTING_CONCEPT_LABELS
    ):
        raise HTTPException(status_code=400, detail="章節專練參數無效")
    return [row for row in rows if _classify_accounting_concept(row) == concept_key]
```

- [ ] **Step 4: Run focused tests and verify green**

Expected: all tests in `test_accounting_concept_drill.py` pass.

- [ ] **Step 5: Commit API primitive**

```bash
git add api.py test_accounting_concept_drill.py
git commit -m "feat: filter accounting questions by concept"
```

### Task 2: Past-exam endpoint contract

**Files:**
- Modify: `/Users/0xiao7/.config/superpowers/worktrees/sofa-engine-api/accounting-concept-drill-20260805/api.py`
- Modify: `/Users/0xiao7/.config/superpowers/worktrees/sofa-engine-api/accounting-concept-drill-20260805/test_accounting_concept_drill.py`

- [ ] **Step 1: Add failing serialization and endpoint tests**

```python
def test_serialized_accounting_question_exposes_concept_metadata():
    payload = api._serialize_past_exam(inventory_row())
    assert payload["concept_key"] == "ACC-ASSET-INVENTORY"
    assert payload["concept_label"] == "資產｜存貨"

def test_known_empty_concept_does_not_fall_back():
    with patch.object(api, "_fetch_past_exam_rows", return_value=[cash_row()]):
        with pytest.raises(HTTPException) as exc:
            api.get_past_exam("bookkeeper", 0, "會計學概要", "ACC-ASSET-INVENTORY")
    assert exc.value.status_code == 404
    assert exc.value.detail == "找不到此章可追蹤的考古題"
```

Also cover `/api/past-exam/set` returning only exact matches and calls without `concept_key` retaining current behavior.

- [ ] **Step 2: Run focused tests and verify red**

Expected: missing endpoint parameter and response fields.

- [ ] **Step 3: Add response metadata**

In `_serialize_past_exam` compute the key once and append:

```python
concept_key = _classify_accounting_concept(r) if r.get("subject") == "會計學概要" else None
"concept_key": concept_key or "",
"concept_label": _ACCOUNTING_CONCEPT_LABELS.get(concept_key, ""),
```

- [ ] **Step 4: Add endpoint parameters and exact empty state**

Both endpoint signatures gain:

```python
concept_key: str = Query(default="", description="會計學概要章節代碼"),
```

After `_filter_past_exam_trackable`, call `_filter_accounting_concept_rows`. When a non-empty valid key leaves zero rows, raise:

```python
raise HTTPException(status_code=404, detail="找不到此章可追蹤的考古題")
```

- [ ] **Step 5: Run focused and full API suites**

Run:

```bash
uv run --with-requirements requirements.txt --with pytest pytest -q test_accounting_concept_drill.py test_accounting_concept_classification.py test_subject_attempts_contract.py
uv run --with-requirements requirements.txt --with pytest pytest -q
git diff --check
```

Expected: focused tests pass; full suite has zero failures.

- [ ] **Step 6: Commit endpoint support**

```bash
git add api.py test_accounting_concept_drill.py
git commit -m "feat: expose accounting concept drills"
```

### Task 3: Dashboard concept links

**Files:**
- Modify: `/Users/0xiao7/sofa.engine/.worktrees/accounting-concept-drill-spec-20260805/dashboard.html`
- Create: `/Users/0xiao7/sofa.engine/.worktrees/accounting-concept-drill-spec-20260805/tests/dashboard-accounting-concept-drill-contract.test.mjs`

- [ ] **Step 1: Write failing Dashboard contract tests**

The test extracts `renderStudyWeakBrief` and asserts these source contracts:

```javascript
assert.match(fn, /subjectWeakness\.concepts/);
assert.match(fn, /concept_key/);
assert.match(fn, /encodeURIComponent\(concept\.concept_key\)/);
assert.match(fn, /slice\(0,3\)/);
assert.match(fn, /concept\.concept_key === 'unclassified'/);
```

It also executes the function with inventory and unclassified rows and checks that only inventory receives `&concept_key=ACC-ASSET-INVENTORY`.

- [ ] **Step 2: Run the test and verify red**

Run:

```bash
node --test tests/dashboard-accounting-concept-drill-contract.test.mjs
```

Expected: current whole-subject-only rendering fails.

- [ ] **Step 3: Render up to three accounting concept rows**

Replace the single subject row with concept rows. Each classified row uses:

```javascript
var conceptPart = concept.concept_key === 'unclassified'
  ? ''
  : '&concept_key=' + encodeURIComponent(concept.concept_key);
```

The visible label is `concept.label || '未分類'`; wrong count is concept-specific. Preserve law rows and the existing full-row link class.

- [ ] **Step 4: Run Dashboard tests and commit**

Run focused test plus existing `tests/dashboard-study-today-contract.test.mjs` and `tests/dashboard-weak-laws-contract.test.mjs`.

```bash
git add dashboard.html tests/dashboard-accounting-concept-drill-contract.test.mjs
git commit -m "feat: link accounting weaknesses to concept drills"
```

### Task 4: Quiz concept state and forwarding

**Files:**
- Modify: `/Users/0xiao7/sofa.engine/.worktrees/accounting-concept-drill-spec-20260805/quiz.html`
- Create: `/Users/0xiao7/sofa.engine/.worktrees/accounting-concept-drill-spec-20260805/tests/quiz-accounting-concept-drill-contract.test.mjs`

- [ ] **Step 1: Write failing Quiz contracts**

Assert that Quiz:

```javascript
const conceptKey = new URLSearchParams(location.search).get('concept_key') || '';
```

forwards `concept_key` to `/api/past-exam`, renders a visible `章節專練｜` label from API `concept_label`, and removes the parameter when the selected subject is not `會計學概要`.

- [ ] **Step 2: Run the test and verify red**

Run:

```bash
node --test tests/quiz-accounting-concept-drill-contract.test.mjs
```

Expected: no concept state or forwarding exists.

- [ ] **Step 3: Add URL state and request forwarding**

Add `_pastExamConceptKey` from `_searchParams`. In `_fetchPastExamQuestion`, append:

```javascript
const conceptPart = subject === '會計學概要' && _pastExamConceptKey
  ? `&concept_key=${encodeURIComponent(_pastExamConceptKey)}`
  : '';
```

Use the same parameter in set/session fetches. Subject change clears `_pastExamConceptKey`, removes `concept_key` with `history.replaceState`, and refreshes the visible state.

- [ ] **Step 4: Add visible state and exact empty copy**

Add a compact status element near past-exam selectors. Update it from response `concept_label`. For a 404 detail equal to `找不到此章可追蹤的考古題`, display that exact detail and retain the selected chapter in the URL.

- [ ] **Step 5: Run focused web suites**

Run:

```bash
node --test tests/quiz-accounting-concept-drill-contract.test.mjs tests/dashboard-accounting-concept-drill-contract.test.mjs tests/question-scratchpad-contract.test.mjs tests/quiz-answer-flow-contract.test.mjs
git diff --check
```

Expected: zero failures and existing scratchpad contracts unchanged.

- [ ] **Step 6: Commit Quiz support**

```bash
git add quiz.html tests/quiz-accounting-concept-drill-contract.test.mjs
git commit -m "feat: preserve accounting concept drill state"
```

### Task 5: Release and production acceptance

**Files:**
- Modify: `/Users/0xiao7/Library/Mobile Documents/com~apple~CloudDocs/#80_Assets/SoFa.Engine/docs/2026-08-05_accounting_concept_drill_closeout.md`

- [ ] **Step 1: Re-run final verification**

Run full API suite, focused web suite, repository `git diff --check`, and confirm both worktrees contain only intended changes.

- [ ] **Step 2: Push and merge API PR**

Create a focused API PR, merge only after tests pass, and wait until the live endpoint returns concept metadata and exact inventory-only filtering.

- [ ] **Step 3: Push and merge Web PR**

Create the web PR after API live acceptance. Wait for GitHub Pages success before browser verification.

- [ ] **Step 4: Verify live API without user-data mutation**

Call the public endpoint with `subject=會計學概要&concept_key=ACC-ASSET-INVENTORY` repeatedly. Every response must contain the requested key and label; an invalid key must return 400. No member or attempt row is required for this check.

- [ ] **Step 5: Verify Dashboard deep link and responsive Quiz**

Use a controlled temporary member only if Dashboard weakness rendering cannot be exercised with local fixtures. Verify 390×844 and iPad portrait widths, no horizontal overflow, the visible inventory drill label, correct API request parameter, and blank scratchpad after next question. Delete any controlled attempt/member and confirm zero remaining rows.

- [ ] **Step 6: Record completion**

Create TASK_DB and CHANGELOG_DB completed rows, write the local closeout with PRs, commits, test counts, live evidence, cleanup evidence, and official outline source. Do not claim accounting explanations were added.
