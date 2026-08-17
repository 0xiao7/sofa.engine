import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { sha256File } from '../scripts/youtube-podcast-readiness.mjs';
import {
  decideYoutubeAction,
  readYoutubeLedger,
  upsertYoutubeRecord,
} from '../scripts/youtube-podcast-ledger.mjs';
import { runYoutubePodcastRelease } from '../scripts/youtube-podcast-release.mjs';

function releaseFixture() {
  const root = join(tmpdir(), `yt-release-${process.pid}-${Date.now()}-${Math.random()}`);
  mkdirSync(join(root, 'assets/audio'), { recursive: true });
  const assets = { mp3: 'assets/audio/e.mp3', m4a: 'assets/audio/e.m4a', vtt: 'assets/audio/e.vtt', youtubeMp4: 'assets/audio/e.mp4' };
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100:duration=1', '-ac', '2', join(root, assets.mp3)]);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100:duration=1', '-ac', '2', join(root, assets.m4a)]);
  writeFileSync(join(root, assets.vtt), 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\n法條\n');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=320x180:r=1:d=1', '-i', join(root, assets.m4a), '-c:v', 'libx264', '-c:a', 'copy', '-shortest', join(root, assets.youtubeMp4)]);
  const episode = {
    id: 'EP007', status: 'approved_for_release', exam: '記帳士', law: '營業稅法', article: '01',
    title: '記帳士｜營業稅法第01條：課稅範圍', summary: '課稅範圍。',
    officialLawUrl: 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0340080&flno=01',
    utmCampaign: 'podcast_episode_007_law', duration: '00:01:10', guid: 'sofa-podcast-ep007-v20260817-ep001', assets,
    voicePolicyId: 'podcast-ep001-master-v1', voiceMix: ['EP001 A', 'EP001 C'],
    listenApproval: { status: 'approved', approvedBy: 'Fay', approvedAt: '2026-08-17T09:00:00+08:00' },
  };
  episode.assetSha256 = Object.fromEntries(Object.entries(assets).map(([type, path]) => [type, sha256File(join(root, path))]));
  episode.masterSha256 = episode.assetSha256.m4a;
  const queuePath = join(root, 'queue.json');
  const ledgerPath = join(root, 'ledger.json');
  writeFileSync(queuePath, JSON.stringify({ episodes: [episode] }));
  writeFileSync(ledgerPath, '{"schemaVersion":1,"episodes":[]}\n');
  return { root, episode, queuePath, ledgerPath };
}

test('ledger validates schema and accepts an empty v1 document', () => {
  const root = join(tmpdir(), `yt-ledger-${process.pid}-${Date.now()}`);
  mkdirSync(root, { recursive: true });
  const path = join(root, 'ledger.json');
  writeFileSync(path, '{"schemaVersion":1,"episodes":[]}\n');
  assert.equal(readYoutubeLedger(path).episodes.length, 0);
  writeFileSync(path, '{"schemaVersion":2,"episodes":[]}\n');
  assert.throws(() => readYoutubeLedger(path), /schemaVersion/);
});

test('ledger chooses upload, reuse, conflict, and playlist resume safely', () => {
  const empty = { schemaVersion: 1, episodes: [] };
  assert.equal(decideYoutubeAction({ ledger: empty, episodeId: 'EP007', assetSha256: 'a', metadataSha256: 'b' }).action, 'upload');
  const uploaded = { schemaVersion: 1, episodes: [{ episodeId: 'EP007', assetSha256: 'a', metadataSha256: 'b', youtubeVideoId: 'video1', state: 'uploaded' }] };
  assert.equal(decideYoutubeAction({ ledger: uploaded, episodeId: 'EP007', assetSha256: 'a', metadataSha256: 'b' }).action, 'attach_playlist');
  uploaded.episodes[0].state = 'private_ready';
  assert.equal(decideYoutubeAction({ ledger: uploaded, episodeId: 'EP007', assetSha256: 'a', metadataSha256: 'b' }).action, 'reuse');
  assert.equal(decideYoutubeAction({ ledger: uploaded, episodeId: 'EP007', assetSha256: 'changed', metadataSha256: 'b' }).action, 'conflict');
});

test('ledger upsert is atomic and unique by episode ID', () => {
  const root = join(tmpdir(), `yt-ledger-write-${process.pid}-${Date.now()}`);
  mkdirSync(root, { recursive: true });
  const path = join(root, 'ledger.json');
  writeFileSync(path, '{"schemaVersion":1,"episodes":[]}\n');
  upsertYoutubeRecord({ path, record: { episodeId: 'EP007', youtubeVideoId: 'v1', state: 'uploaded' } });
  upsertYoutubeRecord({ path, record: { episodeId: 'EP007', youtubeVideoId: 'v1', state: 'private_ready' } });
  const ledger = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(ledger.episodes.length, 1);
  assert.equal(ledger.episodes[0].state, 'private_ready');
});

test('validate performs no provider mutation', async () => {
  const fixture = releaseFixture();
  let providerCalls = 0;
  const result = await runYoutubePodcastRelease({ ...fixture, mode: 'validate', episodeId: 'EP007', clientFactory: () => { providerCalls += 1; } });
  assert.equal(result.action, 'validated');
  assert.equal(providerCalls, 0);
});

test('private upload persists video before playlist and partial retry does not upload twice', async () => {
  const fixture = releaseFixture();
  let uploads = 0;
  let failPlaylist = true;
  const client = {
    uploadPrivate: async () => ({ videoId: `video${++uploads}` }),
    findPodcastPlaylist: async () => 'playlist1',
    addVideoToPlaylist: async () => { if (failPlaylist) throw new Error('playlist failed'); },
  };
  await assert.rejects(() => runYoutubePodcastRelease({ ...fixture, mode: 'upload_private', episodeId: 'EP007', clientFactory: () => client }), /playlist failed/);
  assert.equal(readYoutubeLedger(fixture.ledgerPath).episodes[0].youtubeVideoId, 'video1');
  failPlaylist = false;
  const result = await runYoutubePodcastRelease({ ...fixture, mode: 'upload_private', episodeId: 'EP007', clientFactory: () => client });
  assert.equal(result.action, 'private_ready');
  assert.equal(uploads, 1);
});

test('publish requires a private record and changes only the named episode', async () => {
  const fixture = releaseFixture();
  const client = { publishVideo: async ({ videoId }) => ({ videoId, privacyStatus: 'public', exactUrl: `https://www.youtube.com/watch?v=${videoId}` }) };
  await assert.rejects(() => runYoutubePodcastRelease({ ...fixture, mode: 'publish', episodeId: 'EP007', clientFactory: () => client }), /private provider record/);
  upsertYoutubeRecord({ path: fixture.ledgerPath, record: { episodeId: 'EP007', state: 'private_ready', youtubeVideoId: 'video1', privacyStatus: 'private' } });
  const result = await runYoutubePodcastRelease({ ...fixture, mode: 'publish', episodeId: 'EP007', clientFactory: () => client });
  assert.equal(result.action, 'published');
  assert.equal(readYoutubeLedger(fixture.ledgerPath).episodes[0].privacyStatus, 'public');
});
