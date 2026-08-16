#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createYoutubeClient } from './youtube-podcast-client.mjs';
import { decideYoutubeAction, readYoutubeLedger, upsertYoutubeRecord } from './youtube-podcast-ledger.mjs';
import { validateYoutubeEpisode } from './youtube-podcast-readiness.mjs';

function defaultClientFactory() {
  return createYoutubeClient({
    clientId: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN,
  });
}

export async function runYoutubePodcastRelease({
  mode,
  episodeId,
  queuePath = 'data/podcast-law-queue.json',
  ledgerPath = 'data/youtube-podcast-ledger.json',
  root = process.cwd(),
  clientFactory = defaultClientFactory,
  playlistId = process.env.YOUTUBE_PODCAST_PLAYLIST_ID,
  playlistTitle = 'SoFa Engine 國考 Podcast',
}) {
  if (!['validate', 'upload_private', 'publish'].includes(mode)) throw new Error(`invalid mode: ${mode}`);
  if (!/^EP\d{3}$/.test(episodeId || '')) throw new Error('an exact episode ID is required');
  const queue = JSON.parse(readFileSync(queuePath, 'utf8'));
  const episode = queue.episodes?.find(row => row.id === episodeId);
  if (!episode) throw new Error(`unknown episode: ${episodeId}`);

  if (mode === 'publish') {
    const record = readYoutubeLedger(ledgerPath).episodes.find(row => row.episodeId === episodeId);
    if (!record?.youtubeVideoId || record.state !== 'private_ready' || record.privacyStatus !== 'private') {
      throw new Error(`${episodeId} missing private provider record`);
    }
    const published = await clientFactory().publishVideo({ videoId: record.youtubeVideoId });
    const publishedAt = new Date().toISOString();
    upsertYoutubeRecord({ path: ledgerPath, record: { episodeId, ...published, state: 'published', publishedAt } });
    return { action: 'published', episodeId, ...published, publishedAt };
  }

  const readiness = validateYoutubeEpisode({ episode, root });
  if (mode === 'validate') return { action: 'validated', ...readiness };

  const ledger = readYoutubeLedger(ledgerPath);
  const decision = decideYoutubeAction({
    ledger, episodeId,
    assetSha256: readiness.assetSha256,
    metadataSha256: readiness.metadataSha256,
  });
  if (decision.action === 'conflict') throw new Error(`${episodeId} provider asset or metadata conflict`);
  if (decision.action === 'reuse') return { action: 'private_ready', episodeId, ...decision.record, reused: true };

  const client = clientFactory();
  let videoId = decision.record?.youtubeVideoId;
  if (decision.action === 'upload') {
    ({ videoId } = await client.uploadPrivate({
      path: resolve(root, episode.assets.youtubeMp4), metadata: readiness.metadata,
    }));
    upsertYoutubeRecord({
      path: ledgerPath,
      record: {
        episodeId, youtubeVideoId: videoId, state: 'uploaded', privacyStatus: 'private',
        assetSha256: readiness.assetSha256, metadataSha256: readiness.metadataSha256,
        uploadedAt: new Date().toISOString(),
      },
    });
  }
  const resolvedPlaylistId = playlistId || await client.findOrCreatePodcastPlaylist({ title: playlistTitle });
  await client.addVideoToPlaylist({ playlistId: resolvedPlaylistId, videoId });
  const exactUrl = `https://www.youtube.com/watch?v=${videoId}`;
  upsertYoutubeRecord({
    path: ledgerPath,
    record: { episodeId, youtubeVideoId: videoId, youtubePlaylistId: resolvedPlaylistId, state: 'private_ready', privacyStatus: 'private', exactUrl },
  });
  return { action: 'private_ready', episodeId, youtubeVideoId: videoId, youtubePlaylistId: resolvedPlaylistId, exactUrl };
}

function parseArgs(argv) {
  const args = { queuePath: 'data/podcast-law-queue.json', ledgerPath: 'data/youtube-podcast-ledger.json' };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--mode') args.mode = argv[++index];
    else if (argv[index] === '--episode') args.episodeId = argv[++index];
    else if (argv[index] === '--queue') args.queuePath = argv[++index];
    else if (argv[index] === '--ledger') args.ledgerPath = argv[++index];
    else throw new Error(`unknown argument: ${argv[index]}`);
  }
  return args;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  runYoutubePodcastRelease(parseArgs(process.argv.slice(2)))
    .then(result => console.log(JSON.stringify(result)))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
