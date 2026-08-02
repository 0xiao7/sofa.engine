# Dashboard Focus Hero Design QA

**Source visual truth**

- User reference: `/var/folders/wq/ht2dc1p51_1_f5302g6yrrb00000gn/T/codex-clipboard-a438c439-cf6e-46f9-b182-bc2de57056e6.png`
- Source pixels: 1242 × 1644 (mobile browser capture, density not provided)
- Direction used: hierarchy, pacing, two-action composition, and first-screen focus only. SoFa brand tokens remain authoritative.

**Rendered implementation**

- Production URL: `https://sofaengine.org/dashboard.html`
- Screenshot: `/Users/0xiao7/.codex/visualizations/2026/08/02/019fc182-4014-7f62-ac20-c8a03bac8efc/dashboard-focus-desktop-final.png`
- Comparison board: `/Users/0xiao7/.codex/visualizations/2026/08/02/019fc182-4014-7f62-ac20-c8a03bac8efc/dashboard-focus-comparison-final.png`
- Browser-reported viewport and screenshot pixels: 1280 × 720, density 1
- State: production free-mode dashboard, hero entrance animation completed, page at top

**Full-view comparison evidence**

- The implementation preserves the source's centered eyebrow, large single-purpose headline, short supporting copy, paired CTAs, and a visible continuation cue.
- The implementation intentionally keeps the existing SoFa navigation, persistent study rail, navy/cream/peach palette, Songti-first typography, mono metadata, and fine linework. It does not import Luna's typography, colors, cards, or brand assets.
- Existing dashboard content remains in the DOM and follows the new `你的學習桌` boundary.

**Focused-region evidence**

- The hero region was legible at the available desktop viewport, so the full-view comparison clearly exposed the relevant typography, spacing, token, copy, and CTA details. No additional crop was needed.
- Primary CTA measured 60 px high at the available rendered viewport. No horizontal overflow was detected.

**Required fidelity surfaces**

- Fonts and typography: Songti/Noto Serif TC and JetBrains Mono remain aligned with existing SoFa tokens. Display hierarchy matches the reference direction without adopting a new font system.
- Spacing and layout rhythm: centered hero, bounded copy, paired actions, and lower continuation cue match the intended hierarchy. Existing header and study rail intentionally consume desktop space.
- Colors and visual tokens: only existing SoFa navy, cream, peach, and line-opacity tokens are used.
- Image quality and assets: no raster or vector assets were required or substituted; linework is the existing SoFa grid language.
- Copy and content: `今天，先做一組。`, a direct five-question action, and a records action are present. Existing homepage content is preserved below.

**Interaction checks**

- `開始今天 5 題` navigated to `/quiz.html?start=1&session=1&count=5` (analytics attribution appended without changing the contract).
- `查看學習紀錄` scrolled to `#dashboard-study-desk`, with the target aligned 110 px below the fixed header.
- Production browser console: no error or warning entries during the checked state.

**Findings**

- [P2] Phone and tablet rendered captures are unavailable.
  - Location: 375 × 667, 390 × 844, and 820 × 1180 responsive states.
  - Evidence: the browser viewport capability accepted each requested size but continued reporting and capturing 1280 × 720.
  - Impact: responsive CSS contracts pass, but actual phone/tablet wrapping and first-screen proportions were not visually observed in this run.
  - Fix: repeat browser capture when viewport override is functional or inspect on physical phone/tablet before declaring visual parity.

**Comparison history**

- Initial desktop capture occurred during the 700 ms entrance animation and showed reduced opacity. The implementation was not changed; capture was repeated after the animation completed. The final screenshot shows full cream/peach contrast and is the evidence cited above.
- No P0 or P1 mismatch remains in the available desktop state.

**Implementation checklist**

- [x] Production hero hierarchy and SoFa token fidelity
- [x] Existing dashboard content preserved
- [x] Primary and secondary interactions
- [x] No horizontal overflow at available viewport
- [x] No production console errors in checked state
- [ ] Phone and tablet rendered screenshots at requested dimensions

final result: blocked
