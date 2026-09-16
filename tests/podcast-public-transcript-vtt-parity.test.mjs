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

function spokenCues(vtt) {
  return vtt
    .replace(/^\uFEFF?WEBVTT[^\n]*\n/, '')
    .split(/\r?\n\r?\n+/)
    .map(block => block.split(/\r?\n/))
    .filter(lines => lines.some(line => line.includes('-->')))
    .map(lines => lines.filter(line => line && !line.includes('-->') && !/^\d+$/.test(line)).join(' '))
    .filter(Boolean);
}

test('EP007-EP017 website transcripts contain every spoken VTT cue', () => {
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
      rss: normalize(feedItem),
    };
    const cues = spokenCues(readFileSync(new URL(episode.transcript, root), 'utf8'));
    assert.ok(cues.length > 0, `${episode.id} has no spoken VTT cues`);
    for (const [index, cue] of cues.entries()) {
      for (const [surface, transcript] of Object.entries(surfaces)) {
        assert.ok(
          transcript.includes(normalize(cue)),
          `${episode.id} ${surface} transcript is missing VTT cue ${index + 1}: ${cue}`,
        );
      }
    }
  }
});
