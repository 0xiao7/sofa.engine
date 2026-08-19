import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const feed = readFileSync(new URL('podcast.xml', root), 'utf8');
const release = JSON.parse(readFileSync(new URL('podcast-release.json', root), 'utf8'));

function releaseDateFromVersion(version) {
  const match = version.match(/^v(\d{4})(\d{2})(\d{2})-/);
  assert.ok(match, `release version has no date: ${version}`);
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function feedItemForGuid(guid) {
  const item = (feed.match(/<item>[\s\S]*?<\/item>/g) || [])
    .find(candidate => candidate.includes(`<guid isPermaLink="false">${guid}</guid>`));
  assert.ok(item, `RSS item missing for ${guid}`);
  return item;
}

test('RSS publication dates match the release manifest and never predate the version date', () => {
  for (const episode of release.episodes) {
    const publishedAt = Date.parse(episode.pubDate);
    assert.ok(Number.isFinite(publishedAt), `${episode.id} has invalid pubDate: ${episode.pubDate}`);
    assert.ok(
      publishedAt >= releaseDateFromVersion(episode.version),
      `${episode.id} pubDate ${episode.pubDate} predates ${episode.version}`,
    );

    const item = feedItemForGuid(episode.guid);
    assert.match(item, new RegExp(`<pubDate>${episode.pubDate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</pubDate>`));
  }
});

test('RSS lastBuildDate is not older than its newest episode', () => {
  const match = feed.match(/<lastBuildDate>([^<]+)<\/lastBuildDate>/);
  assert.ok(match, 'RSS lastBuildDate is missing');
  const newestEpisodeAt = Math.max(...release.episodes.map(episode => Date.parse(episode.pubDate)));
  assert.ok(Date.parse(match[1]) >= newestEpisodeAt, `lastBuildDate ${match[1]} is older than the newest episode`);
});
