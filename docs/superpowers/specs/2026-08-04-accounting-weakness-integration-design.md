# Accounting Weakness Integration Design

## Goal

Include `會計學概要` in the bookkeeper weakness system so the dashboard reports three trackable subjects and accounting answers accumulate useful weakness evidence without inventing law or article relationships.

The first delivery slice is a saved calculation sheet for all three bookkeeper MCQ subjects because the user needs handwritten iPad working immediately.

## Saved Calculation Sheet

`會計學概要`, `稅務相關法規概要`, and `記帳相關法規概要` each expose a collapsible calculation-sheet drawer below the question. The drawer is collapsed by default, can expand inline, and can enter full-screen mode on iPad.

Each question owns a separate sheet keyed by authenticated user, exam key, canonical subject, exam-question ID, year, and question number. Submitting an answer saves the current sheet before advancing. The next question always opens with a blank sheet. Revisiting a previous question reloads only that question's saved strokes. Collapsing the drawer never deletes strokes; clearing requires an explicit user action.

The drawing surface supports Apple Pencil through Pointer Events, with pen, eraser, stroke width, undo, redo, clear, and save state. Strokes are stored as editable normalized vector points, not only as a flattened image. A local draft is written during drawing so a failed network request or page lifecycle event does not erase work. The UI clears the visible sheet only after local persistence succeeds; cloud failure leaves the local copy and shows `尚未同步`.

The first version does not perform handwriting recognition, formula conversion, AI grading, or interpretation of calculation-sheet content. The sheet is private working evidence and is never treated as the submitted answer, a concept label, or a law/article relationship.

## Current Problem

The production past-exam capability contains three subjects: `會計學概要`, `稅務相關法規概要`, and `記帳相關法規概要`. The study cockpit seed still marks accounting as `deferred_subject_container_only`, while the dashboard counts only subjects with `implementation_status === "seeded_moex_mcq"`. This makes the UI report only two connected subjects.

The existing weakness bridge is law-oriented. Reusing it unchanged for accounting would either discard accounting attempts or require false article identifiers. Both outcomes are unacceptable.

## Product Contract

1. Every trackable multiple-choice subject may accumulate subject-level weakness evidence.
2. Accounting attempts contribute to `會計學概要` weakness totals using the canonical past-exam subject, year, question number, selected answer, and correctness written to a subject-level answer ledger. The existing article ledger cannot be reused because it requires a real `article_id`.
3. Law subjects retain their existing law- and article-level weakness analysis.
4. Accounting does not receive fabricated law names or article identifiers.
5. When an accounting question has a verified concept classification, the weakness response may group it by that concept.
6. When no verified concept classification exists, the attempt remains visible under an explicit `未分類` accounting bucket; missing taxonomy must never make the attempt disappear.
7. Essay-only or not-yet-trackable subjects remain excluded from the connected count.

## API Design

The bookkeeper track seed will mark accounting as a trackable MCQ subject and use the live capability count rather than the historical zero-question placeholder. The study response will expose an explicit capability field for weakness participation instead of requiring the web client to infer support solely from `implementation_status`.

A dedicated `subject_attempts` table will store non-law MCQ attempts with `user_id`, `exam_key`, canonical `subject`, `exam_question_id`, `roc_year`, `question_no`, selected answer, correctness, optional verified concept key, and timestamps. The table will enforce row-level ownership and a foreign key to `exam_questions`. Law attempts continue through the existing article-based `user_stats` and `quiz_sessions` path.

A separate `question_scratchpads` table stores one current vector document per user and exam question. The service API validates the question against the selected exam capability, bounds payload bytes, stroke count, point count, and coordinate values, and upserts only the authenticated user's row. The browser never receives a service-role key. Delete and clear operations target one resolved question only.

The weakness payload will separate two levels:

- `subject_weakness`: all supported MCQ subjects, including accounting.
- `weak_law_bridge`: the existing law/article detail for law subjects only.

Accounting aggregation will use answer-ledger records identified by the canonical subject. Concept grouping is optional enrichment. Records without a verified concept fall back to `會計學概要／未分類`.

If either aggregation is unavailable, the API returns an explicit partial or unavailable state. It must not silently replace live capability counts with a hard-coded value.

## Web Design

The dashboard count will use the API's explicit weakness capability field. With current production capability it will render `弱點判讀已接 3 科` and `已接 3 科`.

The weakness area will distinguish accounting subject/concept weakness from law/article weakness. Existing law drill links remain unchanged. Accounting weakness links open accounting past-exam practice with the correct `exam=bookkeeper` and `subject=會計學概要` state; they do not route to a law reader.

When the study scope request fails, the dashboard renders `科目狀態暫時無法確認`. It never falls back to `已接 2 科` or another seeded constant.

## Data Integrity and Error Handling

- Canonical subject matching is required; unknown aliases are not silently assigned to accounting.
- Incorrect and correct attempts remain distinguishable so weakness ranking is based on evidence rather than attempt volume alone.
- Missing concept metadata is a supported state, not an error.
- Missing article metadata is valid for accounting MCQs and invalid only where a law-level record claims an article relationship.
- Repeated attempts are retained as separate evidence rows; the API accepts an optional idempotency key so network retries do not create duplicate rows.

## Tests and Acceptance

Automated tests must first fail against the current two-subject behavior, then prove:

1. The API seed and study response mark all three production MCQ subjects as weakness-trackable.
2. Accounting attempts appear in subject weakness without article identifiers.
3. Unclassified accounting attempts appear in the explicit fallback bucket.
4. Law attempts still appear in the existing law/article bridge.
5. The dashboard renders `已接 3 科` from API capability data.
6. API failure renders the unavailable state and never a hard-coded count.
7. Accounting weakness practice URLs retain `exam=bookkeeper` and `subject=會計學概要`.
8. Existing API and web regression suites pass.
9. Pointer input creates normalized editable strokes and eraser/undo/redo behave deterministically.
10. Submitting saves the current question, then the next question displays a blank sheet.
11. Revisiting a question reloads only that question's sheet.
12. Failed cloud sync retains the local draft and renders `尚未同步`.
13. The API rejects oversized, malformed, cross-exam, or non-owned scratchpad requests.

Live acceptance requires a fresh authenticated study response and a production dashboard check after deployment. The live API subject inventory must still report the three bookkeeper MCQ subjects, and an accounting answer must be observable in the user's subject weakness output without a fabricated law or article value.

## Scope Boundary

This change does not invent accounting concept labels, add essay grading, or claim that `國文（作文）` or `租稅申報實務` is weakness-trackable. A broader accounting concept taxonomy is a separate content-governance task.
