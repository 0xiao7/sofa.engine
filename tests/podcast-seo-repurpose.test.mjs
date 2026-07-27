import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('podcast-release.json', root), 'utf8'));
const episode = manifest.episodes.find(({ id }) => id === 'EP001');
const seoPath = 'podcast/ep001-tax-collection-act-article-1-1.html';
const canonical = 'https://sofaengine.org/podcast/ep001-tax-collection-act-article-1-1.html';
const pageUrl = new URL(seoPath, root);
const expectedPracticeUrl =
  '/quiz.html?law=%E7%A8%85%E6%8D%90%E7%A8%BD%E5%BE%B5%E6%B3%95' +
  '&article=01%E4%B9%8B1&start=1&utm_source=podcast-seo&utm_medium=organic' +
  '&utm_campaign=episode_001_tax_collection_act_01_1';

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readPage() {
  assert.equal(existsSync(pageUrl), true, `${seoPath} must exist`);
  return readFileSync(pageUrl, 'utf8');
}

function readJsonLd(page) {
  const scripts = Array.from(
    page.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g),
    (match) => JSON.parse(match[1]),
  );
  return scripts.flatMap((entry) => (Array.isArray(entry) ? entry : [entry]));
}

test('EP001 records one durable independent SEO page', () => {
  assert.equal(
    episode.sourceApi,
    'https://sofa-engine-api.onrender.com/api/article/11bd2bd4-f72e-4fd7-94d2-bc8344bdc66b',
  );
  assert.equal(
    episode.sourceOriginalTextSha256,
    createHash('sha256').update(episode.originalText, 'utf8').digest('hex'),
  );
  assert.equal(
    episode.sourceOriginalTextSha256,
    '62b4088525f335460ec6eb4bda18dc0788d579b4c566c7d05ac88522843299d3',
    'EP001 source hash must match the production API payload reviewed on 2026-07-27',
  );
  assert.equal(episode.seoPage, seoPath);
  assert.equal(episode.seoCanonical, canonical);
  assert.equal(episode.seoRepurposedAt, '2026-07-27');
  assert.equal(
    manifest.episodes.filter(({ seoPage }) => seoPage).length,
    1,
    'the first automation run must repurpose exactly one released episode',
  );
});

test('EP001 page has exact canonical and social metadata', () => {
  const page = readPage();

  assert.match(page, new RegExp(`<title>${escapeRegExp(episode.title)}｜SoFa Engine<\\/title>`));
  assert.match(page, new RegExp(`<h1>${escapeRegExp(episode.title)}<\\/h1>`));
  assert.match(page, new RegExp(`<link rel="canonical" href="${escapeRegExp(canonical)}">`));
  assert.match(page, new RegExp(`<meta property="og:url" content="${escapeRegExp(canonical)}">`));
  assert.match(page, /<meta property="og:type" content="article">/);
  assert.match(page, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(page, new RegExp(escapeRegExp(episode.articleId)));
});

test('EP001 page remains source-locked and labels SoFa explanation honestly', () => {
  const page = readPage();

  assert.match(page, /法條原文（SoFa production article API 快照）/);
  assert.match(page, /SoFa 說明（非官方標準答案）/);
  for (const paragraph of episode.originalText.split('\n')) {
    assert.match(page, new RegExp(escapeRegExp(paragraph.trim())));
  }
  assert.match(page, /本節目使用 AI 合成語音；內容由 SoFa Engine 製作/);
  assert.match(page, /正式考試仍以主管機關與考選部公告為準/);
  assert.doesNotMatch(page, /考選部官方標準答案|保證命中|必考/);
});

test('EP001 page plays the released audio and exposes the corrected VTT', () => {
  const page = readPage();

  assert.match(
    page,
    new RegExp(`<audio[^>]+src="/${escapeRegExp(episode.siteAudio)}"[^>]*>`),
  );
  assert.match(
    page,
    new RegExp(`<track[^>]+src="/${escapeRegExp(episode.transcript)}"[^>]*>`),
  );
  assert.match(
    page,
    new RegExp(`href="/${escapeRegExp(episode.transcript)}"[^>]*>下載 VTT 逐字稿<`),
  );
  assert.match(page, /SoFa 輕聲補一條。/);
  assert.match(page, /利往回，害往後。/);
});

test('EP001 practice CTA uses an independent podcast-seo acquisition UTM', () => {
  const page = readPage();
  const escapedUrl = escapeRegExp(expectedPracticeUrl).replaceAll('&', '&amp;');

  assert.match(
    page,
    new RegExp(`href="${escapedUrl}"[^>]+data-track="podcast_seo_practice"`),
  );
  assert.doesNotMatch(page, /[?&]free=1/);
});

test('EP001 JSON-LD describes the podcast episode, visible FAQ, and breadcrumb', () => {
  const page = readPage();
  const jsonLd = readJsonLd(page);
  const byType = new Map(jsonLd.map((entry) => [entry['@type'], entry]));
  const podcastEpisode = byType.get('PodcastEpisode');
  const faq = byType.get('FAQPage');
  const breadcrumb = byType.get('BreadcrumbList');

  assert.ok(podcastEpisode, 'PodcastEpisode JSON-LD missing');
  assert.equal(podcastEpisode.url, canonical);
  assert.equal(podcastEpisode.identifier, episode.guid);
  assert.equal(podcastEpisode.episodeNumber, 1);
  assert.equal(
    podcastEpisode.associatedMedia.contentUrl,
    `https://sofaengine.org/${episode.siteAudio}`,
  );
  assert.equal(
    podcastEpisode.associatedMedia.caption,
    `https://sofaengine.org/${episode.transcript}`,
  );
  assert.equal(podcastEpisode.associatedMedia.duration, 'PT3M1S');

  assert.ok(faq, 'FAQPage JSON-LD missing');
  assert.equal(faq.mainEntity.length, 2);
  for (const question of faq.mainEntity) {
    assert.match(page, new RegExp(escapeRegExp(question.name)));
    assert.match(page, new RegExp(escapeRegExp(question.acceptedAnswer.text)));
  }

  assert.ok(breadcrumb, 'BreadcrumbList JSON-LD missing');
  assert.deepEqual(
    breadcrumb.itemListElement.map(({ item }) => item),
    ['https://sofaengine.org/', 'https://sofaengine.org/podcast.html', canonical],
  );
});

test('sitemap and public collections link to the EP001 canonical page', () => {
  const sitemap = readFileSync(new URL('sitemap.xml', root), 'utf8');
  const podcastPage = readFileSync(new URL('podcast.html', root), 'utf8');
  const blogIndex = readFileSync(new URL('blog/index.html', root), 'utf8');
  const internalPath = '/podcast/ep001-tax-collection-act-article-1-1.html';

  assert.match(sitemap, new RegExp(`<loc>${escapeRegExp(canonical)}<\\/loc>`));
  assert.match(podcastPage, new RegExp(`href="${escapeRegExp(internalPath)}"`));
  assert.match(blogIndex, new RegExp(`href="${escapeRegExp(internalPath)}"`));
});

test('released EP001 VTT cues stay ordered and cover the complete transcript', () => {
  const transcript = readFileSync(new URL(episode.transcript, root), 'utf8');
  const cues = Array.from(
    transcript.matchAll(
      /(\d{2}):(\d{2}):(\d{2}\.\d{3}) --> (\d{2}):(\d{2}):(\d{2}\.\d{3})\n([\s\S]*?)(?=\n\n|$)/g,
    ),
    (match) => ({
      start: Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]),
      end: Number(match[4]) * 3600 + Number(match[5]) * 60 + Number(match[6]),
      text: match[7],
    }),
  );

  assert.equal(cues.length, 13);
  assert.equal(cues[0].start, 0);
  assert.equal(cues.at(-1).end, 181);
  for (let index = 0; index < cues.length; index += 1) {
    assert.ok(cues[index].start < cues[index].end, `cue ${index + 1} must have duration`);
    if (index > 0) {
      assert.equal(cues[index].start, cues[index - 1].end, `cue ${index + 1} must be contiguous`);
    }
  }
  assert.match(cues.map(({ text }) => text).join('\n'), /回到 SoFa Engine，可以直接練習這條附近的題目。/);
});
