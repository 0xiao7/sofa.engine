import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const baseUrl = (process.env.PODCAST_BASE_URL || 'https://sofaengine.org').replace(/\/$/, '');
const canonicalOrigin = 'https://sofaengine.org';
const release = JSON.parse(readFileSync(new URL('../podcast-release.json', import.meta.url), 'utf8'));
const expectedEpisodes = release.episodes.map(episode => episode.id);

async function fetchText(path) {
  const response = await fetch(`${baseUrl}${path}`);
  assert.equal(response.ok, true, `${path} returned ${response.status}`);
  return response.text();
}

async function assertHead(path, minBytes, label) {
  const response = await fetch(`${baseUrl}${path}`, { method: 'HEAD' });
  assert.equal(response.ok, true, `${label} HEAD returned ${response.status}: ${path}`);
  const rawLength = response.headers.get('content-length');
  if (rawLength) {
    const length = Number(rawLength);
    assert.ok(Number.isFinite(length), `${label} content-length invalid: ${rawLength}`);
    assert.ok(length >= minBytes, `${label} too small: ${length} < ${minBytes}`);
  }
}

async function assertText(path, minBytes, label) {
  const response = await fetch(`${baseUrl}${path}`);
  assert.equal(response.ok, true, `${label} GET returned ${response.status}: ${path}`);
  const text = await response.text();
  const byteLength = Buffer.byteLength(text, 'utf8');
  assert.ok(byteLength >= minBytes, `${label} too small: ${byteLength} < ${minBytes}`);
  assert.match(text, /^WEBVTT/, `${label} is not a VTT file`);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const [feed, page] = await Promise.all([
  fetchText('/podcast.xml'),
  fetchText('/podcast.html'),
]);

assert.match(feed, /<title>SoFa 輕聲補一條<\/title>/);
assert.match(page, /<h1>輕聲補一條<\/h1>/);
assert.equal((feed.match(/<item>/g) || []).length, expectedEpisodes.length);
assert.doesNotMatch(feed, /[?&]amp;free=1|[?&]free=1/);
assert.doesNotMatch(page, /[?&]free=1/);

for (const episode of release.episodes) {
  const number = episode.id.replace('EP', '').padStart(3, '0');
  const enclosurePath = `/${episode.enclosure}`;
  const audioPath = `/${episode.siteAudio}`;
  const transcriptPath = `/${episode.transcript}`;
  const campaign = `episode_${number}`;

  assert.match(feed, new RegExp(`<guid isPermaLink="false">${escapeRegExp(episode.guid)}</guid>`));
  assert.match(feed, new RegExp(`utm_campaign=${campaign}`));
  assert.match(feed, new RegExp(`<podcast:transcript url="${escapeRegExp(`${canonicalOrigin}${transcriptPath}`)}" type="text/vtt"`));

  if (episode.id !== 'EP001') {
    assert.match(page, new RegExp(`id="episode-${number}"`));
    assert.match(page, new RegExp(escapeRegExp(episode.practiceUrl).replaceAll('&', '&amp;')));
  }

  await assertHead(enclosurePath, episode.id === 'EP001' ? 2_000_000 : 300_000, `${episode.id} enclosure`);
  await assertHead(audioPath, episode.id === 'EP001' ? 2_500_000 : 300_000, `${episode.id} site audio`);
  await assertText(transcriptPath, episode.id === 'EP001' ? 1_000 : 500, `${episode.id} transcript`);
}

console.log(`Live podcast release OK: ${baseUrl} ${expectedEpisodes.join(', ')}`);
