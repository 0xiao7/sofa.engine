# Canonical Law Citation Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display every recognized law reference in the database-aligned `《法規》第4條之1` format without rewriting or losing original article, paragraph, item, or subitem content.

**Architecture:** Keep `law-crossref.js` as the only parser used by quiz and dashboard. Add one canonical citation formatter and a higher-priority formal sub-article matcher; adapters remain responsible only for page-specific anchor attributes and modal behavior. All work is frontend-only and read-only with respect to law databases.

**Tech Stack:** Static JavaScript, HTML adapters, Node.js built-in test runner, Playwright, GitHub Pages.

---

### Task 1: Lock canonical display and hierarchy safety with failing tests

**Files:**
- Modify: `tests/quiz-answer-flow-contract.test.mjs`
- Modify: `tests/dashboard-study-today-contract.test.mjs`

- [x] **Step 1: Add quiz assertions for canonical labels**

Extend the existing `quiz analysis linkifies...` test with these inputs and requirements:

```js
const canonicalHyphen = helpers.linkifyLawRefs('《所得稅法》第4-1條', '所得稅法');
assert.match(canonicalHyphen, />《所得稅法》第4條之1<\/a>/);
assert.match(canonicalHyphen, /data-art="4之1"/);

const canonicalFormal = helpers.linkifyLawRefs('《所得稅法》第4條之1', '所得稅法');
assert.match(canonicalFormal, />《所得稅法》第4條之1<\/a>/);
assert.match(canonicalFormal, /data-art="4之1"/);

const canonicalSeries = helpers.linkifyLawRefs('《所得稅法》第3條、第4-1條、第8條', '所得稅法');
assert.equal(stripTags(canonicalSeries), '《所得稅法》第3條、第4條之1、第8條');
assert.equal((canonicalSeries.match(/class="crossref"/g) || []).length, 3);
```

- [x] **Step 2: Add hierarchy and data-loss assertions**

Add a local `stripTags()` helper and verify:

```js
const subArticle = helpers.linkifyLawRefs('《某法》第4條之九', '某法');
assert.match(subArticle, /data-art="4之九"/);
assert.equal(stripTags(subArticle), '《某法》第4條之九');

const itemText = helpers.linkifyLawRefs('《某法》第4條之九款', '某法');
assert.doesNotMatch(itemText, /data-art="4之九"/);
assert.match(itemText, /data-art="4"/);
assert.equal(stripTags(itemText), '《某法》第4條之九款');

const paragraphItem = helpers.linkifyLawRefs('《某法》第4條第2項第9款', '某法');
assert.match(paragraphItem, /data-art="4"/);
assert.equal(stripTags(paragraphItem), '《某法》第4條第2項第9款');
```

- [x] **Step 3: Add dashboard parity assertions**

Run the same canonical and hierarchy inputs through `sandbox.linkify()` and require identical visible text and `data-cross-art` values.

- [x] **Step 4: Add a read-only source contract**

Assert that `law-crossref.js` contains no `fetch`, `XMLHttpRequest`, `POST`, `PATCH`, `PUT`, or `DELETE` calls.

- [x] **Step 5: Run focused tests and verify RED**

Run:

```bash
node --test tests/quiz-answer-flow-contract.test.mjs tests/dashboard-study-today-contract.test.mjs
```

Expected: failures showing `第4-1條` is still displayed and `第4條之九` is not yet recognized as article `4之九`.

### Task 2: Implement the minimal shared formatter

**Files:**
- Modify: `law-crossref.js`

- [x] **Step 1: Add canonical article label formatting**

Add a pure helper equivalent to:

```js
function formatArticleLabel(raw){
  var article = normalizeArticle(raw);
  var parts = article.split('之');
  return '第' + parts[0] + '條' + (parts.length > 1 ? '之' + parts.slice(1).join('之') : '');
}

function formatLawCitation(law, rawArticle, includeLaw){
  return (includeLaw ? '《' + law + '》' : '') + formatArticleLabel(rawArticle);
}
```

- [x] **Step 2: Recognize formal sub-articles without consuming item levels**

Before the general article matcher, recognize `第4條之九` only when the suffix is not followed by `項`, `款`, or `目`. Route the match through the same placeholder and anchor callback with canonical article `4之九`.

- [x] **Step 3: Canonicalize all generated link labels**

Use `formatLawCitation()` for bracketed, plain-law, same-law, and compact-series references. Explicit law references include `《法規》`; subsequent bare references in the same sequence display only their canonical article label.

- [x] **Step 4: Keep structure text outside the anchor**

For `第4條之九款` and `第4條第2項第9款`, link only the reliably identified article portion and leave `之九款` or `第2項第9款` untouched after the anchor.

- [x] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
node --test tests/quiz-answer-flow-contract.test.mjs tests/dashboard-study-today-contract.test.mjs
```

Expected: all focused tests pass with no failures.

- [x] **Step 6: Commit the implementation**

```bash
git add law-crossref.js tests/quiz-answer-flow-contract.test.mjs tests/dashboard-study-today-contract.test.mjs
git commit -m "fix: canonicalize law citation display safely"
```

### Task 3: Verify, publish, and record

**Files:**
- Modify: `docs/superpowers/plans/2026-08-27-canonical-law-citation-display.md`

- [x] **Step 1: Run JavaScript syntax and diff safety checks**

```bash
node --check law-crossref.js
git diff --check
```

Expected: both commands exit successfully with no output.

- [x] **Step 2: Run the full contract suite**

```bash
node --test tests/*.mjs
```

Expected: zero failed tests.

- [x] **Step 3: Run local browser verification at both iPad sizes**

At 1280×960 and 768×1024, inject the approved citations, require canonical visible labels and exact `data-art`, open one article modal, close with × and backdrop, and verify the URL and source text remain unchanged.

- [x] **Step 4: Review and commit plan completion state**

Mark completed checkboxes, run `git diff --check`, and commit only plan-state changes.

- [ ] **Step 5: Push, merge through a PR, and wait for the exact Pages deployment**

Push `fix/canonical-law-citation-display`, create a PR against `main`, merge after verification, and wait for the Pages workflow whose `headSha` equals the merge commit.

- [ ] **Step 6: Read back and test the formal site**

Fetch `law-crossref.js`, `quiz.html`, and `dashboard.html` with a cache-busting merge identifier; require the live shared script hash to match the merged file and repeat the iPad browser checks against `https://sofaengine.org/quiz.html`.

- [ ] **Step 7: Record the completed task**

Update the existing TASK_DB task and add a CHANGELOG_DB row with `是否公告 = false`, noting the read-only display boundary, hierarchy tests, PR, merge SHA, full test count, and live verification.
