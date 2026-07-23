import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const page = readFileSync(new URL('podcast.html', root), 'utf8');
const feed = readFileSync(new URL('podcast.xml', root), 'utf8');
const release = JSON.parse(readFileSync(new URL('podcast-release.json', root), 'utf8'));

const expectedEpisodes = ['EP001', 'EP002', 'EP003', 'EP004', 'EP005', 'EP006'];

function assertLocalFile(path, minBytes) {
  const file = new URL(path, root);
  assert.equal(existsSync(file), true, `${path} missing`);
  assert.ok(statSync(file).size > minBytes, `${path} too small`);
}

test('podcast release publishes EP001 through EP006 with local audio and transcripts', () => {
  assert.deepEqual(release.episodes.map(episode => episode.id), expectedEpisodes);
  assert.equal(release.voicePolicy.variants.A.voiceName, 'cmn-TW-Wavenet-A');
  assert.equal(release.voicePolicy.variants.C.voiceName, 'cmn-TW-Wavenet-C');

  for (const episode of release.episodes) {
    assert.match(episode.guid, /^sofa-podcast-ep\d{3}-v20260723-ac$|^sofa-podcast-ep001-v20260721-ac$/);
    assertLocalFile(episode.enclosure, 300_000);
    assertLocalFile(episode.siteAudio, 300_000);
    assertLocalFile(episode.transcript, 500);
    assert.doesNotMatch(episode.practiceUrl, /[?&]free=1/);
  }
});

test('podcast RSS includes every released episode with transcript, enclosure, and website CTA', () => {
  for (const episode of release.episodes) {
    const number = episode.id.replace('EP', '').padStart(3, '0');
    assert.match(feed, new RegExp(`<guid isPermaLink="false">${episode.guid}</guid>`));
    assert.match(feed, new RegExp(`<enclosure url="https://sofaengine\\.org/${episode.enclosure}" length="\\d+" type="audio/mp4"/>`));
    assert.match(feed, new RegExp(`<podcast:transcript url="https://sofaengine\\.org/${episode.transcript}" type="text/vtt" language="zh-TW" rel="captions"/>`));
    assert.match(feed, new RegExp(`utm_campaign=episode_${number}`));
  }
  assert.equal((feed.match(/<item>/g) || []).length, expectedEpisodes.length);
});

test('podcast page exposes official-site playback for EP002 through EP006', () => {
  for (const episode of release.episodes.slice(1)) {
    const anchor = `episode-${episode.id.replace('EP', '').padStart(3, '0')}`;
    assert.match(page, new RegExp(`id="${anchor}"`));
    assert.match(page, new RegExp(episode.siteAudio.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(page, new RegExp(episode.transcript.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(page, new RegExp(episode.practiceUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replaceAll('&', '&amp;')));
  }
});
