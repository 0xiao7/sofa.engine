#!/usr/bin/env node
import { existsSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { selectDueEpisode, validateQueue } from './podcast-queue-lib.mjs';
import { renderEpisodeFiles } from './render-podcast-release.mjs';

export function assertEpisodeAssets(episode, root = process.cwd()) {
  for (const type of ['mp3', 'm4a', 'vtt']) {
    const relative = episode.assets?.[type];
    if (!relative) throw new Error(`${episode.id} missing ${type} asset path`);
    const absolute = resolve(root, relative);
    if (!existsSync(absolute)) throw new Error(`${episode.id} missing ${type} asset: ${relative}`);
    const minimum = type === 'vtt' ? 20 : 300_000;
    if (statSync(absolute).size < minimum) throw new Error(`${episode.id} ${type} asset too small`);
    if (type === 'vtt' && !readFileSync(absolute, 'utf8').startsWith('WEBVTT')) {
      throw new Error(`${episode.id} transcript must begin with WEBVTT`);
    }
  }
  return true;
}

export function releasePreview(queue, now, root = process.cwd()) {
  validateQueue(queue);
  const episode = selectDueEpisode(queue, now);
  if (!episode) return { action: 'none', reason: 'head episode is not both due and approved' };
  assertEpisodeAssets(episode, root);
  return { action: 'release', episodeId: episode.id, scheduledDate: episode.scheduledDate };
}

function parseArgs(argv) {
  const args = { queue: 'data/podcast-law-queue.json', content: 'data/podcast-law-content.json', now: new Date().toISOString(), dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--queue') args.queue = argv[++index];
    else if (argv[index] === '--content') args.content = argv[++index];
    else if (argv[index] === '--now') args.now = argv[++index];
    else if (argv[index] === '--dry-run') args.dryRun = true;
    else throw new Error(`unknown argument: ${argv[index]}`);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const queue = JSON.parse(readFileSync(args.queue, 'utf8'));
  const result = releasePreview(queue, args.now);
  console.log(JSON.stringify({ ...result, dryRun: args.dryRun }));
  if (result.action === 'release' && !args.dryRun) {
    const episode = queue.episodes.find(row => row.id === result.episodeId);
    const contents = JSON.parse(readFileSync(args.content, 'utf8'));
    const content = contents.contents.find(row => row.id === episode.id);
    if (!content) throw new Error(`${episode.id} missing source-locked content`);
    const releasedAt = new Date(args.now).toISOString();
    episode.pubDate ||= new Date(args.now).toUTCString().replace('GMT', '+0000');
    renderEpisodeFiles({ root: process.cwd(), episode, content });
    episode.status = 'released';
    episode.releasedAt = releasedAt;
    const temp = `${args.queue}.tmp`;
    writeFileSync(temp, `${JSON.stringify(queue, null, 2)}\n`, 'utf8');
    renameSync(temp, args.queue);
    console.log(JSON.stringify({ action: 'released', episodeId: episode.id, releasedAt }));
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
