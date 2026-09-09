#!/usr/bin/env node
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderPodcastShowNotes } from './render-podcast-release.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function transcriptFromVtt(value) {
  const blocks = String(value).replace(/^\uFEFF?WEBVTT[^\n]*\n+/, '').split(/\n{2,}/);
  return blocks
    .map(block => block.split('\n').filter(line => (
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

export function backfillPodcastShowNotes({ root = ROOT } = {}) {
  const manifest = JSON.parse(readFileSync(join(root, 'podcast-release.json'), 'utf8'));
  const feedPath = join(root, 'podcast.xml');
  let feed = readFileSync(feedPath, 'utf8');
  for (const episode of manifest.episodes) {
    const number = episode.id.replace('EP', '').padStart(3, '0');
    const transcript = transcriptFromVtt(readFileSync(join(root, episode.transcript), 'utf8'));
    const notes = renderPodcastShowNotes({
      summary: episode.summary,
      originalText: episode.originalText || `${episode.law} §${episode.article}`,
      transcriptText: transcript,
      websiteTranscriptUrl: transcriptUrl(number),
      practiceUrl: practiceUrl(episode, number),
      originalLabel: episode.id === 'EP001' ? 'SoFa 法規資料庫整理版原文：' : '法條原文：',
      extraNotes: episode.id === 'EP001'
        ? ['付費會員的完整播放清單會留在官網會員區，不需要為 Podcast 另外付費。']
        : [],
    });
    const item = (feed.match(/<item>[\s\S]*?<\/item>/g) || [])
      .find(candidate => candidate.includes(`<itunes:episode>${Number(number)}</itunes:episode>`));
    if (!item) throw new Error(`${episode.id} RSS item not found`);
    const updated = item
      .replace(/<description>[^<]*<\/description>/, `<description>${notes.description}</description>`)
      .replace(/<content:encoded><!\[CDATA\[[\s\S]*?\]\]><\/content:encoded>/, notes.content);
    feed = feed.replace(item, updated);
  }
  const temp = `${feedPath}.tmp`;
  writeFileSync(temp, feed, 'utf8');
  renameSync(temp, feedPath);
  return { episodes: manifest.episodes.map(episode => episode.id) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(backfillPodcastShowNotes()));
}
