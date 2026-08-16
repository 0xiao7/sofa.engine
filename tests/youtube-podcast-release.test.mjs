import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  decideYoutubeAction,
  readYoutubeLedger,
  upsertYoutubeRecord,
} from '../scripts/youtube-podcast-ledger.mjs';

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
