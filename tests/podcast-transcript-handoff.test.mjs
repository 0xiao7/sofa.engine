import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const feed = readFileSync(new URL('podcast.xml', root), 'utf8');
const page = readFileSync(new URL('podcast.html', root), 'utf8');
const renderer = readFileSync(new URL('scripts/render-podcast-release.mjs', root), 'utf8');
const promoter = readFileSync(new URL('scripts/promote-podcast-azure-release.mjs', root), 'utf8');
const showNoteRenderer = readFileSync(new URL('scripts/render-podcast-release.mjs', root), 'utf8');

function rssItem(number) {
  return (feed.match(/<item>[\s\S]*?<\/item>/g) || [])
    .find(item => item.includes(`<itunes:episode>${Number(number)}</itunes:episode>`)) || '';
}

test('every published episode show note includes its complete transcript and both exact website links', () => {
  for (const number of ['001', '002', '003', '004', '005', '006']) {
    const item = rssItem(number);
    assert.match(item, /本集完整逐字稿：/);
    assert.match(
      item,
      new RegExp(`https://sofaengine\\.org/podcast\\.html\\?utm_source=podcast(?:&amp;|&)utm_medium=rss_transcript(?:&amp;|&)utm_campaign=episode_${number}#transcript-${number}`),
    );
    assert.match(item, /開啟官網該集全文與播放器/);
    assert.match(
      item,
      new RegExp(`https://sofaengine\\.org/quiz\\.html\\?[^<]*utm_source=podcast(?:&amp;|&)utm_medium=rss(?:&amp;|&)utm_campaign=episode_${number}`),
    );
    assert.match(item, /練習本集法規/);
  }
});

test('a direct transcript hash opens the matching transcript on initial load and hash changes', () => {
  assert.match(page, /function openTranscriptFromHash\(\)/);
  assert.match(page, /window\.addEventListener\('hashchange', openTranscriptFromHash\)/);
  assert.match(page, /openTranscriptFromHash\(\);/);
  assert.match(page, /window\.addEventListener\('load', \(\) => setTimeout\(openTranscriptFromHash, 80\)/);
  assert.match(page, /\.transcript-details,\.transcript-anchor\{scroll-margin-top:88px\}/);
  for (const number of ['001', '002', '003', '004', '005', '006']) {
    assert.match(page, new RegExp(`id="transcript-${number}"`));
  }
});

test('future release generators preserve the complete transcript and exact website handoff', () => {
  for (const source of [renderer, promoter]) {
    assert.match(source, /rss_transcript/);
    assert.match(source, /#transcript-/);
    assert.match(source, /renderPodcastShowNotes/);
  }
  assert.match(showNoteRenderer, /開啟官網該集全文與播放器/);
  assert.match(showNoteRenderer, /練習本集法規/);
  assert.match(showNoteRenderer, /本集完整逐字稿/);
  assert.match(renderer, /data-transcript-target/);
  assert.match(renderer, /class="transcript-details"/);
});
