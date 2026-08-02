# SoFa Dashboard Focus Hero Design

## Goal

Give returning learners one immediate, calm next action while preserving every existing dashboard feature below the fold. The redesign must remain visibly SoFa: navy surfaces, cream and peach hierarchy, Songti-first Chinese typography, mono metadata, thin structural linework, and restrained motion.

## Approved direction

- Add a medium-height immersive hero above the current dashboard content.
- Keep the existing dashboard content, APIs, anchors, tools, records, and account surfaces.
- Move the existing greeting, statistics strip, and study cockpit below the new hero under a visible “你的學習桌” transition.
- Do not introduce a new palette, font system, illustration style, card language, or generic SaaS gradient.
- Use the provided SoFa mock as the visual target and the Luna reference only for hierarchy and pacing.

## Hero content

- Eyebrow: `TODAY · FOCUS · ONE SET`
- Heading: `今天，先做一組。`
- Supporting copy: `不用先整理完整計畫。先完成 5 題，系統再依你的作答紀錄安排下一步。`
- Primary action: `開始今天 5 題`, linking directly to `quiz.html?start=1&session=1&count=5`.
- Secondary action defaults to `查看學習紀錄` and links to the study desk. When local wrong-question data exists, it becomes `複習 N 題錯題` and links to the weakness drill.
- A “查看完整學習桌” anchor reveals the preserved dashboard below.

## Responsive behavior

- Desktop (>= 1100px): hero uses the available width beside the persistent sidebar, headline stays compact, CTAs sit inline, subtle linework extends across the hero.
- Tablet (768–1099px): no sidebar overlap, hero content remains centered in a readable column, CTAs stay inline when space permits.
- Mobile (< 768px): hero owns the iOS safe area below the fixed header, headline remains at most two lines, CTAs stack below 376px, and the next section remains visibly peeking below the fold.
- Minimum target height is 52px for hero actions. Text zoom to 200% must not clip or create horizontal overflow.

## Web app declaration

The existing manifest and Apple standalone metadata are authoritative and must remain. Update the manifest orientation from portrait-only to `any` so installed layouts work on phones, tablets, and desktop windows. Add desktop-oriented icon purpose metadata without removing existing icon fallbacks.

## Motion

- Use only opacity and small vertical translation on initial load.
- Respect `prefers-reduced-motion: reduce`.
- No parallax, auto-playing decoration, floating UI cards, or motion that blocks the primary action.

## State and error behavior

- Hero actions are usable before dashboard API requests finish.
- Missing identity or progress data must not hide the primary action.
- Wrong-question count is derived from existing local state first and enhanced by existing dashboard data when available.
- API failure falls back to `查看學習紀錄`; it never creates a dead primary CTA.

## Analytics

Track hero view, primary start, wrong-review/resume secondary action, and study-desk reveal using the existing `sofaTrack` bridge. Tracking failure must never block navigation.

## Non-goals

- No deletion of existing dashboard sections.
- No backend or database changes.
- No new design system or visual asset family.
- No redesign of quiz, pricing, account, or legal pages.
- No production deployment before responsive visual QA passes.

## Acceptance criteria

- Every current dashboard anchor and major feature remains in the active HTML.
- The primary CTA is visible and tappable at 375x667, 390x844, tablet 820x1180, and desktop 1440x900.
- The dashboard declares manifest, theme color, Apple standalone support, and a non-portrait-only installed orientation.
- No horizontal overflow at phone, tablet, or desktop sizes.
- Hero uses only existing SoFa tokens and font stacks.
- Reduced-motion users receive no entrance animation.
- Existing baseline failures are documented; all new hero/PWA contracts and affected passing dashboard contracts remain green.
