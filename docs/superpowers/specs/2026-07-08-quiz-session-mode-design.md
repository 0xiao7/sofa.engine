# Quiz Session Mode Design

## Goal

Add a "刷題模式" to `quiz.html`: learners answer a short set first, then see correctness and are prompted to log in or upgrade to preserve records.

## Behavior

- Default quiz behavior remains unchanged: answer immediately shows right/wrong, explanation, article actions, and the existing retention prompt.
- Session mode is entered with `quiz.html?session=1` or `quiz.html?mode=session`.
- Session mode uses 10 questions by default. `count=` may set a bounded count from 1 to 30.
- In session mode, selecting A/B/C/D records the answer but does not reveal correctness, explanation, or article text.
- After each session answer, the next question loads quickly.
- When the session reaches the target count, the page shows a summary card with total answered, correct count, wrong count, accuracy, and actions.
- Free users see "登入保存紀錄" / "查看方案" after the session, not before the first answer.
- Logged-in users still record answers to `/api/me/answer` while answering so saved history and weak-law stats can work.

## Scope

This change only touches the web multiple-choice quiz surface. It does not change LINE push behavior, the backend schema, payment, or dashboard analytics.

## QA

- Contract tests verify the session URL parameters, deferred review behavior, summary copy, and retention CTA.
- Existing post-answer tests verify immediate mode is not removed.
- Rendered QA must include free session URL, normal quiz URL, and past-exam session URL.
