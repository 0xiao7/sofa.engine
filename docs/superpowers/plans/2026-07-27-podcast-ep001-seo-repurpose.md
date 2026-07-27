# Podcast EP001 SEO Repurpose Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish one source-locked, independent SEO acquisition page for released Podcast EP001 without changing any released GUID or enclosure URL.

**Architecture:** A standalone static HTML page reads no runtime data and pins its public content to the released manifest and production API snapshot. `podcast-release.json` records the canonical SEO page, while existing public collections and the sitemap provide discovery. A focused Node test validates the entire static contract.

**Tech Stack:** Static HTML/CSS, JSON-LD, Node.js built-in test runner, existing GitHub Pages deployment.

---

### Task 1: Lock the EP001 SEO contract with a failing test

**Files:**
- Create: `tests/podcast-seo-repurpose.test.mjs`
- Test: `tests/podcast-seo-repurpose.test.mjs`

- [ ] **Step 1: Write the failing static contract**

The test must load `podcast-release.json`, the planned EP001 page,
`podcast.html`, `blog/index.html`, `sitemap.xml`, and the released VTT. It must
assert the exact canonical, metadata, parseable JSON-LD types, exact production
article ID and statutory paragraphs, audio/VTT paths, disclosure, visible FAQ,
independent `podcast-seo` UTM, sitemap/internal links, and VTT cue ordering.

- [ ] **Step 2: Run the test to verify RED**

Run:
`node --test tests/podcast-seo-repurpose.test.mjs`

Expected: FAIL because
`podcast/ep001-tax-collection-act-article-1-1.html` does not exist.

- [ ] **Step 3: Commit the RED test only if repository policy permits**

Stage only `tests/podcast-seo-repurpose.test.mjs`; otherwise retain it
uncommitted until the GREEN implementation commit.

### Task 2: Build the source-locked page and discovery links

**Files:**
- Create: `podcast/ep001-tax-collection-act-article-1-1.html`
- Modify: `podcast-release.json`
- Modify: `podcast.html`
- Modify: `blog/index.html`
- Modify: `sitemap.xml`

- [ ] **Step 1: Add the minimal page implementation**

Create the static page described in the approved design. Use only the exact
EP001 production payload, released manifest, released VTT, and existing SoFa
brand tokens.

- [ ] **Step 2: Add the durable manifest marker**

Set EP001 `seoPage` to
`podcast/ep001-tax-collection-act-article-1-1.html` and
`seoRepurposedAt` to `2026-07-27`.

- [ ] **Step 3: Add exact internal and sitemap links**

Link the canonical page from EP001 in `podcast.html`, add it to
`blog/index.html`, and add the exact `.html` canonical URL to `sitemap.xml`.

- [ ] **Step 4: Run the focused test to verify GREEN**

Run:
`node --test tests/podcast-seo-repurpose.test.mjs`

Expected: PASS.

### Task 3: Repair the stale Hana release test

**Files:**
- Modify: `tests/podcast-multi-episode-release.test.mjs`

- [ ] **Step 1: Replace obsolete Wavenet assertions**

Assert `voice-hana-seed-v1`, provider `Seed Audio`, primary voice `Hana`, and
the current EP001 plus Hana GUID patterns. Keep local asset and immutable
release checks intact.

- [ ] **Step 2: Run the Podcast test group**

Run:
`node --test tests/podcast-contract.test.mjs tests/podcast-release-safety.test.mjs tests/podcast-multi-episode-release.test.mjs tests/podcast-hana-release-candidate.test.mjs tests/podcast-seo-repurpose.test.mjs`

Expected: all tests PASS.

### Task 4: Run release, link, and local HTTP gates

**Files:**
- Verify: `scripts/check-podcast-release.mjs`
- Verify: `scripts/check-live-podcast-release.mjs`

- [ ] **Step 1: Prove immutable release identity**

Compare all `.episodes[].guid` and `.episodes[].enclosure` values against
`origin/main:podcast-release.json`; expected diff is empty.

- [ ] **Step 2: Run Podcast release safety**

Run:
`node scripts/check-podcast-release.mjs`

Expected: exit 0 and `Podcast release OK`.

- [ ] **Step 3: Run canonical and sitemap contracts**

Run:
`node --test tests/sitemap-canonical-contract.test.mjs tests/seo-owned-traffic-contract.test.mjs`

Expected: all tests PASS.

- [ ] **Step 4: Run local HTTP smoke tests**

Serve the worktree over a local HTTP server. Verify status 200 and expected
content types for the EP001 page, MP3, VTT, sitemap, `podcast.html`, and
`blog/`. Fetch every local link introduced by the page and require status 200.

- [ ] **Step 5: Run final diff checks**

Run:
`git diff --check`

Expected: exit 0.

### Task 5: Publish and verify production

**Files:**
- Commit all scoped frontend and test files.

- [ ] **Step 1: Review the exact diff and commit**

Confirm there are no unrelated changes, then commit with:
`feat(podcast): add EP001 SEO acquisition page`

- [ ] **Step 2: Push and open a draft PR**

Push `agent/podcast-seo-20260727` and open a draft PR to `main` describing
source lock, immutable URL proof, and verification evidence.

- [ ] **Step 3: Deploy only after all PR checks pass**

Use the repository's GitHub Pages path. Do not merge or deploy after any
Podcast, SEO, link, or HTTP gate failure.

- [ ] **Step 4: Verify the production surface**

Require HTTP 200 for the canonical page, MP3, and VTT; then verify the exact
canonical, metadata, JSON-LD, independent CTA UTM, audio/VTT links, sitemap,
and internal links from the public Podcast and blog collection pages.

### Task 6: Close out durable records

**Files:**
- Update: coordination `task_plan.md`
- Update: coordination `findings.md`
- Update: coordination `progress.md`
- Update: automation memory
- Update: Notion `CHANGELOG_DB`

- [ ] **Step 1: Record exact PR, commit, tests, deployment, and live evidence**

Append a concise run record to the existing SoFa control docs without
rewriting unrelated history.

- [ ] **Step 2: Write Notion changelog**

Create one `CHANGELOG_DB` entry with icon `📋` and `是否公告=false`. Update an
existing unambiguous TASK_DB row only if one exists for this automation.

- [ ] **Step 3: Update automation memory**

Record EP001 as completed, its canonical URL, source article ID, commit/PR,
deploy evidence, and current run time so the next run selects EP002.
