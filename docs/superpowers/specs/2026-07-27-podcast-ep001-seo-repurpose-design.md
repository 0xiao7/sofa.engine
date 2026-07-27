# Podcast EP001 SEO Repurpose Design

## Goal

Create the first independent, indexable Podcast acquisition page for the
oldest released episode that does not already have one: EP001, 稅捐稽徵法
§01之1. The page must remain source-locked to the released manifest, production
article API payload, released audio, and released VTT transcript.

## Selected episode and source boundary

- Episode: `EP001｜稅捐稽徵法 §01之1：有利往回，不利往後`
- Article ID: `11bd2bd4-f72e-4fd7-94d2-bc8344bdc66b`
- Production source:
  `https://sofa-engine-api.onrender.com/api/article/11bd2bd4-f72e-4fd7-94d2-bc8344bdc66b`
- Released site audio:
  `/assets/audio/sofa-podcast-ep001-v20260721-ac.mp3`
- Immutable RSS enclosure:
  `/assets/audio/sofa-podcast-ep001-v20260721-ac.m4a`
- Immutable GUID: `sofa-podcast-ep001-v20260721-ac`
- Corrected released VTT:
  `/assets/audio/sofa-podcast-ep001-v20260721-ac.vtt`

The page will reproduce the production API `original_text` as a clearly
source-labeled snapshot. Explanatory copy and FAQ answers will only restate
the API's existing reviewed sections and will be labeled as SoFa explanation,
not an official answer.

## URL and discoverability

- File:
  `podcast/ep001-tax-collection-act-article-1-1.html`
- Canonical:
  `https://sofaengine.org/podcast/ep001-tax-collection-act-article-1-1`
- Add the exact canonical URL to `sitemap.xml`.
- Add internal links from the EP001 block in `podcast.html` and the public
  article collection in `blog/index.html`.
- Record the page in `podcast-release.json` as EP001's `seoPage`, allowing the
  next automation run to select EP002 without guessing from filenames.

## Page content

The page uses the existing SoFa navy, peach, and cream visual language and
contains:

1. Exact released episode title, law, article, release date, and source ID.
2. Released MP3 player with the released VTT `<track>` and direct VTT link.
3. Podcast disclosure stating that the voice is AI-generated and the content
   is produced by SoFa Engine.
4. Production API original text, separated by statutory paragraphs.
5. A short SoFa explanation covering only:
   - favorable interpretations and not-yet-final tax assessment cases;
   - unfavorable changes taking effect from publication or a specified future
     date;
   - the corresponding favorable rule for penalty-reference-table changes.
6. Two visible FAQs whose answers are direct restatements of the same reviewed
   source.
7. A practice CTA with an independent acquisition UTM:
   `utm_source=podcast-seo`,
   `utm_medium=organic`,
   `utm_campaign=episode_001_tax_collection_act_01_1`.

## Metadata and structured data

The document will include:

- unique title, description, canonical, Open Graph, and Twitter metadata;
- `PodcastEpisode` JSON-LD with the immutable GUID as identifier, episode
  number, publication date, audio URL, duration, transcript URL, series, and
  publisher;
- `FAQPage` JSON-LD matching the visible FAQs exactly;
- `BreadcrumbList` JSON-LD matching the visible navigation.

## Failure and safety behavior

- Do not edit `podcast.xml`, the GUID, or the enclosure URL.
- Do not create legal examples, numeric thresholds, dates, or official-answer
  claims not present in the reviewed production payload.
- Do not publish if the source API, released audio/VTT, canonical, sitemap,
  internal links, structured data, Podcast release checks, link checks, or
  local HTTP smoke checks fail.
- A known unrelated all-site test baseline may remain red only if every
  Podcast/SEO test named in the implementation plan is freshly green and the
  PR does not touch the unrelated failing surfaces.

## Verification

- Test-first static contract for manifest marker, canonical/meta/JSON-LD,
  source text, audio/VTT, disclosure, FAQ, independent UTM, sitemap, and
  internal links.
- Existing Podcast safety and release tests, including repair of the stale
  pre-Hana assertions in `podcast-multi-episode-release.test.mjs`.
- `scripts/check-podcast-release.mjs`.
- Local HTTP server with GET/HEAD checks for the page, MP3, VTT, sitemap, and
  internal-link targets.
- `git diff --check` and an explicit before/after snapshot proving every
  released GUID and enclosure remains unchanged.

