#!/usr/bin/env node
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizePublicLegalCitation, renderPodcastShowNotes } from './render-podcast-release.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function html(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function atomicWrite(path, content) {
  const temp = `${path}.tmp`;
  writeFileSync(temp, content, 'utf8');
  renameSync(temp, path);
}

export function transcriptFromVtt(value) {
  const blocks = String(value)
    .replace(/^\uFEFF?WEBVTT[^\n]*\n+/, '')
    .split(/\r?\n\r?\n+/);
  return blocks
    .map(block => block.split(/\r?\n/).filter(line => (
      line.trim()
      && !/^\d+$/.test(line.trim())
      && !/-->/.test(line)
      && !/^(NOTE|STYLE|REGION)(\s|$)/.test(line.trim())
    )).join(' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

function transcriptUrl(number) {
  return `https://sofaengine.org/podcast.html?utm_source=podcast&utm_medium=rss_transcript&utm_campaign=episode_${number}#transcript-${number}`;
}

function practiceUrl(episode, number) {
  return `https://sofaengine.org/quiz.html?law=${encodeURIComponent(episode.law)}&article=${encodeURIComponent(episode.article)}&start=1&utm_source=podcast&utm_medium=rss&utm_campaign=episode_${number}`;
}

export function syncPodcastPublicTranscripts({ root = ROOT, firstEpisode = 7, lastEpisode = 17 } = {}) {
  const manifestPath = join(root, 'podcast-release.json');
  const pagePath = join(root, 'podcast.html');
  const feedPath = join(root, 'podcast.xml');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  let page = readFileSync(pagePath, 'utf8');
  let feed = readFileSync(feedPath, 'utf8');
  const synced = [];

  for (let episodeNumber = firstEpisode; episodeNumber <= lastEpisode; episodeNumber += 1) {
    const id = `EP${String(episodeNumber).padStart(3, '0')}`;
    const number = String(episodeNumber).padStart(3, '0');
    const episode = manifest.episodes.find(row => row.id === id);
    if (!episode) throw new Error(`${id} release manifest row not found`);
    const transcript = normalizePublicLegalCitation(transcriptFromVtt(
      readFileSync(join(root, episode.transcript), 'utf8'),
    ));
    if (!transcript) throw new Error(`${id} VTT has no spoken transcript`);

    episode.transcriptText = transcript;

    const pagePattern = new RegExp(
      `(<details class="transcript-details" id="transcript-${number}"><summary>閱讀全文逐字稿</summary><p class="transcript-text">)[\\s\\S]*?(<\\/p><\\/details>)`,
    );
    if (!pagePattern.test(page)) throw new Error(`${id} website transcript body not found`);
    page = page.replace(pagePattern, `$1${html(transcript)}$2`);

    const item = (feed.match(/<item>[\s\S]*?<\/item>/g) || [])
      .find(candidate => candidate.includes(`<itunes:episode>${episodeNumber}</itunes:episode>`));
    if (!item) throw new Error(`${id} RSS item not found`);
    const notes = renderPodcastShowNotes({
      summary: episode.summary,
      originalText: episode.originalText || `${episode.law} §${episode.article}`,
      transcriptText: transcript,
      websiteTranscriptUrl: transcriptUrl(number),
      practiceUrl: practiceUrl(episode, number),
    });
    const updatedItem = item
      .replace(/<description>[^<]*<\/description>/, `<description>${notes.description}</description>`)
      .replace(/<content:encoded><!\[CDATA\[[\s\S]*?\]\]><\/content:encoded>/, notes.content);
    if (!updatedItem.includes(`<description>${notes.description}</description>`)) {
      throw new Error(`${id} RSS description replacement failed`);
    }
    if (!updatedItem.includes(notes.content)) {
      throw new Error(`${id} RSS content:encoded replacement failed`);
    }
    feed = feed.replace(item, updatedItem);
    synced.push(id);
  }

  atomicWrite(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  atomicWrite(pagePath, page);
  atomicWrite(feedPath, feed);
  return { synced };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(syncPodcastPublicTranscripts()));
}
