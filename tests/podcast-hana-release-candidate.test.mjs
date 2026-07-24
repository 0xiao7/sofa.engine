import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('podcast-release.json', root), 'utf8'));
const page = readFileSync(new URL('podcast.html', root), 'utf8');
const feed = readFileSync(new URL('podcast.xml', root), 'utf8');

const candidateEpisodes = manifest.episodes.filter(({ id }) =>
  ['EP002', 'EP003', 'EP004', 'EP005', 'EP006'].includes(id),
);

test('Hana is the approved Seed Audio voice policy for the release candidate', () => {
  assert.equal(manifest.voicePolicy.version, 'voice-hana-seed-v1');
  assert.equal(manifest.voicePolicy.provider, 'Seed Audio');
  assert.deepEqual(manifest.voicePolicy.primaryVoices, ['Hana']);
  assert.equal(manifest.voicePolicy.variants.Hana.voiceName, 'Hana');
  assert.equal(manifest.voicePolicy.approval.status, 'approved-for-release-candidate');
  assert.equal(manifest.voicePolicy.approval.approvedBy, 'Fay');
  assert.equal(manifest.voicePolicy.approval.approvedDate, '2026-07-24');
});

test('EP002 through EP006 consistently reference the Hana candidate and preserve old URLs', () => {
  assert.equal(candidateEpisodes.length, 5);

  for (const episode of candidateEpisodes) {
    const number = episode.id.slice(-3).toLowerCase();
    const stem = `sofa-podcast-ep${number}-v20260724-hana`;
    const oldStem = `assets/audio/sofa-podcast-ep${number}-v20260723-ac`;

    assert.equal(episode.version, 'v20260724-hana');
    assert.equal(episode.guid, stem);
    assert.equal(episode.enclosure, `assets/audio/${stem}.m4a`);
    assert.equal(episode.siteAudio, `assets/audio/${stem}.mp3`);
    assert.equal(episode.transcript, `assets/audio/${stem}.vtt`);
    assert.deepEqual(episode.voiceMix, ['Hana']);
    assert.deepEqual(episode.legacyUrlsToKeep, [
      `${oldStem}.m4a`,
      `${oldStem}.mp3`,
      `${oldStem}.vtt`,
    ]);

    assert.match(page, new RegExp(`/assets/audio/${stem}\\.mp3`));
    assert.match(page, new RegExp(`/assets/audio/${stem}\\.vtt`));
    assert.match(feed, new RegExp(`>${stem}<\\/guid>`));
    assert.match(feed, new RegExp(`https://sofaengine\\.org/assets/audio/${stem}\\.m4a`));
    assert.match(feed, new RegExp(`https://sofaengine\\.org/assets/audio/${stem}\\.vtt`));
  }
});
