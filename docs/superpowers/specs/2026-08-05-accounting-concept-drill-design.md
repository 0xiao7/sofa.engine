# Accounting Concept Drill Design

Date: 2026-08-05
Status: approved design, pending written-spec review

## Goal

Turn each classified `會計學概要` weakness into a reliable practice entry. A learner who taps `資產｜存貨` on Dashboard must receive only high-confidence inventory questions across ROC years 104–114. The flow must preserve per-question scratchpads and must never silently substitute another concept.

## Product behavior

Dashboard renders the accounting concepts returned by `subject_weakness.items[].concepts` as separate rows, sorted by wrong count. Each classified concept links to:

`quiz.html?mode=past-exam&exam=bookkeeper&subject=會計學概要&concept_key=<key>`

`unclassified` remains visible as weakness evidence but links to whole-subject practice without a concept filter. The initial release shows at most three accounting concept rows so law weaknesses remain visible in the same compact panel.

Quiz reads `concept_key` only in bookkeeper past-exam mode for `會計學概要`. When active, the page shows a visible `章節專練｜<label>` state. Subject and year controls remain available; the default is all years. Changing the subject away from accounting removes the concept filter from the URL and subsequent requests.

Submitting an answer keeps the existing lifecycle: canonical grading, subject-attempt write, scratchpad save for the current question, then a blank scratchpad for the next question. Concept drill state persists between accounting questions; scratchpad content does not.

## API contract

`GET /api/past-exam` and `GET /api/past-exam/set` gain an optional `concept_key` query parameter.

The API will:

1. Validate `exam_key`, subject, and the requested concept.
2. Accept concept filtering only for `bookkeeper` plus `會計學概要`.
3. Classify candidate rows with the same `_classify_accounting_concept` function used when recording accounting attempts.
4. Keep only rows whose computed key exactly matches the requested key.
5. Return `404 找不到此章可追蹤的考古題` when no row matches. It must not fall back to another concept or the whole subject.
6. Include `concept_key` and `concept_label` in serialized accounting questions. Unclassified questions return empty values.

Unknown keys and a concept filter applied to another subject return `400 章節專練參數無效`. The API continues to filter canonical trackable rows before concept filtering, so an official-answer or verification failure cannot re-enter through this feature.

## Components and ownership

- `sofa-engine-api/api.py`: owns the concept registry, classifier, parameter validation, exact filtering, and response metadata.
- `sofa.engine/dashboard.html`: owns weakness-row rendering and deep links.
- `sofa.engine/quiz.html`: owns URL state, visible drill context, API parameter forwarding, and subject-change cleanup.
- Existing `subject_attempts` and `question_scratchpads`: unchanged. No migration or backfill is required.

The API remains the classification authority. The frontend never duplicates keyword rules.

## Error and empty states

- Unknown or cross-subject concept request: HTTP 400 with a stable user-readable detail.
- Known concept with zero current questions: HTTP 404 and an inline Quiz message naming the selected chapter.
- Temporary API failure: preserve the current retry/unavailable behavior; do not erase the URL selection.
- `unclassified`: whole-subject practice, visibly labelled as not chapter-filtered.
- Old bookmarks without `concept_key`: unchanged whole-subject behavior.

## Accessibility and responsive behavior

Concept rows remain full-row links with the existing minimum touch target. The visible drill label is text, not color-only state. At 390×844 and iPad portrait widths, the label may wrap but must not create horizontal overflow. Keyboard focus and current subject/year controls remain usable.

## Testing

API contract tests cover:

- exact classified single-question filtering;
- set filtering with no cross-concept rows;
- unknown and cross-subject parameter rejection;
- known-empty concept 404 without fallback;
- serialized concept metadata;
- unchanged behavior without a concept filter.

Web contract tests cover:

- Dashboard emits one deep link per classified weakness concept;
- `unclassified` links to whole-subject practice;
- Quiz restores and forwards `concept_key`;
- subject change removes the filter;
- visible chapter label and empty state;
- existing scratchpad reset/save contracts remain intact.

Release acceptance requires full API and focused web suites, `git diff --check`, a live controlled inventory request with no cross-topic result, Dashboard-to-Quiz deep-link verification at mobile and iPad widths, and removal of any controlled test attempt.

## Out of scope

- Creating accounting explanations or worked solutions.
- Changing official answers, verification status, or exam-question content.
- Persisting concept keys on `exam_questions`.
- Adding CONCEPT_DB tables or importing the draft concept seed.
- Concept drills for law subjects, essay subjects, or `unclassified` questions.
