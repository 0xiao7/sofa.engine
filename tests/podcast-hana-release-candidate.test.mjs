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

test('paid Azure EP001 voices are the approved public voice policy', () => {
  assert.equal(manifest.voicePolicy.version, 'voice-azure-ep001-v1');
  assert.equal(manifest.voicePolicy.provider, 'Microsoft Azure Speech paid tier');
  assert.deepEqual(manifest.voicePolicy.primaryVoices, ['EP001 A', 'EP001 C']);
  assert.equal(manifest.voicePolicy.variants['EP001 A'].voiceName, 'zh-TW-HsiaoChenNeural');
  assert.equal(manifest.voicePolicy.variants['EP001 C'].voiceName, 'zh-TW-YunJheNeural');
  assert.equal(manifest.voicePolicy.approval.status, 'approved-for-public-release');
  assert.equal(manifest.voicePolicy.approval.approvedBy, 'Fay');
  assert.equal(manifest.voicePolicy.approval.approvedDate, '2026-08-18');
});

test('EP002 through EP006 consistently reference the paid Azure release and preserve old URLs', () => {
  assert.equal(candidateEpisodes.length, 5);

  for (const episode of candidateEpisodes) {
    const number = episode.id.slice(-3).toLowerCase();
    const stem = `sofa-podcast-ep${number}-v20260818-azure`;
    const hanaStem = `assets/audio/sofa-podcast-ep${number}-v20260724-hana`;
    const oldStem = `assets/audio/sofa-podcast-ep${number}-v20260723-ac`;

    assert.equal(episode.version, 'v20260818-azure');
    assert.equal(episode.guid, stem);
    assert.equal(episode.enclosure, `assets/audio/${stem}.m4a`);
    assert.equal(episode.siteAudio, `assets/audio/${stem}.mp3`);
    assert.equal(episode.transcript, `assets/audio/${stem}.vtt`);
    assert.deepEqual(episode.voiceMix, ['EP001 A', 'EP001 C']);
    assert.equal(episode.productionProvider, 'microsoft-azure-speech-paid');
    assert.equal(episode.productionReportStatus, 'production_pending_listen_approval');
    assert.equal(episode.approval.status, 'approved');
    assert.deepEqual(episode.legacyUrlsToKeep, [
      `${hanaStem}.m4a`,
      `${hanaStem}.mp3`,
      `${hanaStem}.vtt`,
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
