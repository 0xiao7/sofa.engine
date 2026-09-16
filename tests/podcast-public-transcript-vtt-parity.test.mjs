import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const release = JSON.parse(readFileSync(new URL('podcast-release.json', root), 'utf8'));
const page = readFileSync(new URL('podcast.html', root), 'utf8');
const feed = readFileSync(new URL('podcast.xml', root), 'utf8');

function decodeEntities(value) {
  return String(value)
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

function normalize(value) {
  return decodeEntities(value)
    .replace(/<[^>]+>/g, '')
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[，,。．、；;：:！？!?「」『』【】（）()]/g, '');
}

function spokenTranscript(vtt) {
  return vtt
    .replace(/^\uFEFF?WEBVTT[^\n]*\n/, '')
    .split(/\r?\n\r?\n+/)
    .map(block => block.split(/\r?\n/))
    .filter(lines => lines.some(line => line.includes('-->')))
    .map(lines => lines.filter(line => line && !line.includes('-->') && !/^\d+$/.test(line)).join(' '))
    .filter(Boolean)
    .join('\n\n');
}

function rssTranscript(item) {
  const content = item.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/)?.[1];
  assert.ok(content, 'RSS content:encoded is missing');
  const transcript = content.match(
    /<p><strong>本集完整逐字稿：<\/strong><\/p>\s*([\s\S]*?)(?=\s*<p><a href=)/,
  )?.[1];
  assert.ok(transcript, 'RSS complete transcript section is missing');
  return transcript;
}

test('EP007-EP017 public transcript surfaces exactly equal the spoken VTT transcript', () => {
  const episodes = release.episodes.filter(episode => {
    const number = Number(episode.id.replace('EP', ''));
    return number >= 7 && number <= 17;
  });
  assert.equal(episodes.length, 11);
  for (const episode of episodes) {
    const number = episode.id.replace('EP', '').padStart(3, '0');
    const pageTranscript = page.match(new RegExp(
      `<details class="transcript-details" id="transcript-${number}">[\\s\\S]*?<p class="transcript-text">([\\s\\S]*?)<\\/p><\\/details>`,
    ))?.[1];
    const feedItem = (feed.match(/<item>[\s\S]*?<\/item>/g) || [])
      .find(item => item.includes(`<itunes:episode>${Number(number)}</itunes:episode>`));
    assert.ok(pageTranscript, `${episode.id} website transcript body is missing`);
    assert.ok(feedItem, `${episode.id} RSS item is missing`);
    const surfaces = {
      manifest: normalize(episode.transcriptText),
      website: normalize(pageTranscript),
      rss: normalize(rssTranscript(feedItem)),
    };
    const expected = normalize(spokenTranscript(readFileSync(new URL(episode.transcript, root), 'utf8')));
    assert.ok(expected, `${episode.id} has no spoken VTT transcript`);
    for (const [surface, transcript] of Object.entries(surfaces)) {
      assert.equal(transcript, expected, `${episode.id} ${surface} transcript differs from VTT`);
    }
  }
});
