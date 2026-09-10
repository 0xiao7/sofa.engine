import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { normalizePublicLegalCitation } from '../scripts/render-podcast-release.mjs';

const root = new URL('../', import.meta.url);
const release = JSON.parse(readFileSync(new URL('podcast-release.json', root), 'utf8'));
const queue = JSON.parse(readFileSync(new URL('data/podcast-law-queue.json', root), 'utf8'));
const page = readFileSync(new URL('podcast.html', root), 'utf8');
const feed = readFileSync(new URL('podcast.xml', root), 'utf8');
const ep001SeoPage = readFileSync(
  new URL('podcast/ep001-tax-collection-act-article-1-1.html', root),
  'utf8',
);
const invalidCitation = /(?:第0\d+(?:之\d+)?條|§\s*0\d+)/;

test('public citation formatter separates article and subarticle in Taiwan style', () => {
  assert.equal(normalizePublicLegalCitation('營業稅法第01條'), '營業稅法第1條');
  assert.equal(normalizePublicLegalCitation('營業稅法第01之1條'), '營業稅法第1條之1');
  assert.equal(normalizePublicLegalCitation('所得稅法第03之04條'), '所得稅法第3條之4');
  assert.equal(normalizePublicLegalCitation('稅捐稽徵法 §01之1'), '稅捐稽徵法 §1之1');
  assert.equal(normalizePublicLegalCitation('內部鍵 article=01之1'), '內部鍵 article=01之1');
});

test('released public metadata, website and RSS contain no zero-padded legal citations', () => {
  for (const episode of release.episodes) {
    for (const field of ['title', 'summary', 'transcriptText']) {
      assert.doesNotMatch(episode[field] || '', invalidCitation, `${episode.id} ${field}`);
    }
  }
  assert.doesNotMatch(page, invalidCitation);
  assert.doesNotMatch(feed, invalidCitation);
  assert.doesNotMatch(ep001SeoPage, invalidCitation);
});

test('queue public title and summary cannot reintroduce internal zero-padded keys', () => {
  for (const episode of queue.episodes) {
    assert.doesNotMatch(episode.title || '', invalidCitation, `${episode.id} title`);
    assert.doesNotMatch(episode.summary || '', invalidCitation, `${episode.id} summary`);
  }
});
