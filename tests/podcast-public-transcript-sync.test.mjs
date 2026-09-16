import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { syncPodcastPublicTranscripts } from '../scripts/sync-podcast-public-transcripts.mjs';

const root = new URL('../', import.meta.url);

function digest(rootPath) {
  const hash = createHash('sha256');
  for (const path of ['podcast-release.json', 'podcast.html', 'podcast.xml']) {
    hash.update(readFileSync(join(rootPath, path)));
  }
  return hash.digest('hex');
}

test('public transcript synchronization is idempotent', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'sofa-podcast-transcript-sync-'));
  try {
    for (const path of ['podcast-release.json', 'podcast.html', 'podcast.xml']) {
      cpSync(new URL(path, root), join(fixture, path));
    }
    mkdirSync(join(fixture, 'assets', 'audio'), { recursive: true });
    for (let number = 7; number <= 17; number += 1) {
      const id = `EP${String(number).padStart(3, '0')}`;
      const release = JSON.parse(readFileSync(join(fixture, 'podcast-release.json'), 'utf8'));
      const episode = release.episodes.find(row => row.id === id);
      cpSync(new URL(episode.transcript, root), join(fixture, episode.transcript));
    }

    assert.deepEqual(syncPodcastPublicTranscripts({ root: fixture }).synced, [
      'EP007', 'EP008', 'EP009', 'EP010', 'EP011', 'EP012',
      'EP013', 'EP014', 'EP015', 'EP016', 'EP017',
    ]);
    const first = digest(fixture);
    syncPodcastPublicTranscripts({ root: fixture });
    assert.equal(digest(fixture), first);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
