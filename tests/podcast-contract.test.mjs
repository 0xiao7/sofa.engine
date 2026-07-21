import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const page = readFileSync(new URL('podcast.html', root), 'utf8');
const feed = readFileSync(new URL('podcast.xml', root), 'utf8');
const sitemap = readFileSync(new URL('sitemap.xml', root), 'utf8');
const index = readFileSync(new URL('index.html', root), 'utf8');

function pngDimensions(fileUrl) {
  const buffer = readFileSync(fileUrl);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

test('podcast page exposes RSS, interactive playback, captions, cue sound, and native audio', () => {
  assert.match(page, /rel="alternate" type="application\/rss\+xml"/);
  assert.match(page, /data-action="play-interactive"/);
  assert.match(page, /id="cue-toggle"/);
  assert.match(page, /id="caption-toggle"/);
  assert.match(page, /pause:6000/);
  assert.match(page, /assets\/audio\/sofa-podcast-001\.m4a/);
});

test('podcast practice CTA goes to the exact article with podcast attribution', () => {
  assert.match(page, /quiz\.html\?law=%E7%A8%85%E6%8D%90%E7%A8%BD%E5%BE%B5%E6%B3%95&article=01%E4%B9%8B1&free=1&start=1&utm_source=podcast&utm_medium=episode&utm_campaign=episode_001/);
  assert.match(feed, /utm_source=podcast&amp;utm_medium=rss&amp;utm_campaign=episode_001/);
});

test('podcast feed is platform-safe and points to the generated audio file', () => {
  assert.match(feed, /<rss version="2\.0"/);
  assert.match(page, /https:\/\/sofaengine\.org\/assets\/podcast-cover-3000\.png/);
  assert.match(feed, /<itunes:image href="https:\/\/sofaengine\.org\/assets\/podcast-cover-3000\.png"\/>/);
  assert.match(feed, /<enclosure url="https:\/\/sofaengine\.org\/assets\/audio\/sofa-podcast-001\.m4a" length="\d+" type="audio\/mp4"\/>/);
  assert.match(feed, /<copyright>&#xA9; 2026 SoFa Engine<\/copyright>/);
  assert.match(feed, /<pubDate>Tue, 21 Jul 2026 11:37:00 \+0000<\/pubDate>/);
  assert.doesNotMatch(feed, /lin\.ee|LINE Bot|每日 LINE/);

  const audio = statSync(new URL('assets/audio/sofa-podcast-001.m4a', root));
  assert.ok(audio.size > 500000, `audio file too small: ${audio.size}`);

  const artwork = statSync(new URL('assets/podcast-cover-3000.png', root));
  assert.ok(artwork.size > 300000, `artwork file too small: ${artwork.size}`);
  assert.deepEqual(pngDimensions(new URL('assets/podcast-cover-3000.png', root)), {
    width: 3000,
    height: 3000,
  });
});

test('site navigation and sitemap include podcast entry', () => {
  assert.match(index, /href="podcast\.html">通勤音訊<\/a>/);
  assert.match(sitemap, /<loc>https:\/\/sofaengine\.org\/podcast\.html<\/loc>/);
});
