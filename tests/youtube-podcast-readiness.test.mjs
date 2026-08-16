import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  buildYoutubeMetadata,
  sha256File,
  validateYoutubeEpisode,
} from '../scripts/youtube-podcast-readiness.mjs';

function fixture() {
  const root = join(tmpdir(), `youtube-podcast-ready-${process.pid}-${Date.now()}-${Math.random()}`);
  mkdirSync(join(root, 'assets/audio'), { recursive: true });
  const paths = {
    mp3: 'assets/audio/ep007.mp3',
    m4a: 'assets/audio/ep007.m4a',
    vtt: 'assets/audio/ep007.vtt',
    youtubeMp4: 'assets/audio/ep007-youtube.mp4',
  };
  writeFileSync(join(root, paths.mp3), Buffer.alloc(301_000, 1));
  writeFileSync(join(root, paths.m4a), Buffer.alloc(301_000, 2));
  writeFileSync(join(root, paths.vtt), 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\n正式法條內容\n');
  writeFileSync(join(root, paths.youtubeMp4), Buffer.alloc(301_000, 3));
  const episode = {
    id: 'EP007', status: 'approved_for_release', exam: '記帳士',
    law: '加值型及非加值型營業稅法', article: '01',
    title: '記帳士｜加值型及非加值型營業稅法第01條：課稅範圍',
    summary: '先判斷交易是否落在課稅範圍。',
    officialLawUrl: 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0340080&flno=01',
    utmCampaign: 'podcast_episode_007_law', duration: '00:01:10',
    guid: 'sofa-podcast-ep007-v20260817-hana', assets: paths,
    listenApproval: { status: 'approved', approvedBy: 'Fay', approvedAt: '2026-08-17T09:00:00+08:00' },
  };
  episode.assetSha256 = Object.fromEntries(Object.entries(paths).map(([type, path]) => [type, sha256File(join(root, path))]));
  return { root, episode };
}

test('approved episode with matching assets passes readiness', () => {
  const { root, episode } = fixture();
  assert.equal(validateYoutubeEpisode({ episode, root }).episodeId, 'EP007');
});

test('readiness fails closed on approval, asset and hash gaps', () => {
  const { root, episode } = fixture();
  const pending = structuredClone(episode);
  pending.listenApproval.status = 'pending';
  assert.throws(() => validateYoutubeEpisode({ episode: pending, root }), /listen approval/);

  const missing = structuredClone(episode);
  missing.assets.mp3 = null;
  assert.throws(() => validateYoutubeEpisode({ episode: missing, root }), /missing mp3/);

  const noVideo = structuredClone(episode);
  noVideo.assets.youtubeMp4 = null;
  assert.throws(() => validateYoutubeEpisode({ episode: noVideo, root }), /missing youtubeMp4/);

  const mismatch = structuredClone(episode);
  mismatch.assetSha256.m4a = '0'.repeat(64);
  assert.throws(() => validateYoutubeEpisode({ episode: mismatch, root }), /m4a SHA-256 mismatch/);
});

test('YouTube metadata is private, non-child, source-backed and attributable', () => {
  const { episode } = fixture();
  const metadata = buildYoutubeMetadata(episode);
  assert.equal(metadata.status.privacyStatus, 'private');
  assert.equal(metadata.status.selfDeclaredMadeForKids, false);
  assert.match(metadata.snippet.title, /記帳士.*第01條/);
  assert.match(metadata.snippet.description, /law\.moj\.gov\.tw/);
  assert.match(metadata.snippet.description, /utm_campaign=podcast_episode_007_law/);
  assert.match(metadata.snippet.description, /SoFa Engine 參考解析/);
  assert.match(metadata.snippet.description, /非考選部官方標準答案/);
});
