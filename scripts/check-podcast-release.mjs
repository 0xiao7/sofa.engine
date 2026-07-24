import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const feed = readFileSync(new URL('podcast.xml', root), 'utf8');
const page = readFileSync(new URL('podcast.html', root), 'utf8');
const release = JSON.parse(readFileSync(new URL('podcast-release.json', root), 'utf8'));

function matchOne(input, regex, label) {
  const match = input.match(regex);
  assert.ok(match, `${label} not found`);
  return match[1];
}

function localPathFromUrl(url) {
  const parsed = new URL(url, 'https://sofaengine.org');
  assert.equal(parsed.origin, 'https://sofaengine.org', `external URL not allowed: ${url}`);
  return parsed.pathname.replace(/^\//, '');
}

function assertTracked(path) {
  execFileSync('git', ['ls-files', '--error-unmatch', path], {
    cwd: root.pathname,
    stdio: 'ignore',
  });
}

function assertAudioFile(path, minBytes) {
  const file = new URL(path, root);
  assert.equal(existsSync(file), true, `${path} does not exist`);
  assert.ok(statSync(file).size >= minBytes, `${path} is too small`);
  assertTracked(path);
}

const enclosureUrl = matchOne(feed, /<enclosure url="([^"]+)"/, 'RSS enclosure');
const enclosureLength = Number(matchOne(feed, /<enclosure url="[^"]+" length="(\d+)"/, 'RSS enclosure length'));
const enclosureType = matchOne(feed, /<enclosure url="[^"]+" length="\d+" type="([^"]+)"/, 'RSS enclosure type');
const guid = matchOne(feed, /<guid isPermaLink="false">([^<]+)<\/guid>/, 'RSS guid');
const pageAudioTag = matchOne(page, /(<audio\b[^>]*id="episode-audio"[^>]*>)/, 'site episode audio tag');
const pageAudio = matchOne(pageAudioTag, /\bsrc="([^"]+)"/, 'site audio src');
const artworkUrl = matchOne(feed, /<itunes:image href="([^"]+)"\/>/, 'RSS artwork');
const transcriptUrl = matchOne(feed, /<podcast:transcript url="([^"]+)" type="text\/vtt" language="zh-TW" rel="captions"\/>/, 'RSS transcript');

const enclosurePath = localPathFromUrl(enclosureUrl);
const pageAudioPath = localPathFromUrl(pageAudio);
const artworkPath = localPathFromUrl(artworkUrl);
const transcriptPath = localPathFromUrl(transcriptUrl);
const episode = release.episodes[0];

assert.equal(release.show.title, 'SoFa 輕聲補一條');
assert.equal(release.rights.aiVoiceDisclosure, true);
assert.equal(release.voicePolicy.version, 'voice-hana-seed-v1');
assert.equal(release.voicePolicy.changeControl, 'Do not change provider, voiceName, mastering target, or script treatment without a new manifest version and Fay listening approval.');
assert.equal(enclosureType, 'audio/mp4');
assert.equal(guid, episode.guid);
assert.equal(enclosurePath, episode.enclosure);
assert.equal(pageAudioPath, episode.siteAudio);
assert.equal(artworkPath, release.show.artwork);
assert.equal(transcriptPath, episode.transcript);
assert.equal(statSync(new URL(enclosurePath, root)).size, enclosureLength);
assert.match(guid, /^sofa-podcast-ep\d{3}-v\d{8}-ac$/);
assert.doesNotMatch(enclosurePath, /sofa-podcast-001\.m4a$/);

assertAudioFile(enclosurePath, 2_000_000);
assertAudioFile(pageAudioPath, 2_500_000);
assertAudioFile(artworkPath, 300_000);
assertAudioFile(transcriptPath, 1_000);
for (const legacyPath of episode.legacyUrlsToKeep) {
  assertAudioFile(legacyPath, 100_000);
}
for (const releasedEpisode of release.episodes.slice(1)) {
  assertAudioFile(releasedEpisode.enclosure, 300_000);
  assertAudioFile(releasedEpisode.siteAudio, 300_000);
  assertAudioFile(releasedEpisode.transcript, 500);
}

assert.deepEqual(release.voicePolicy.primaryVoices, ['Hana']);
for (const voiceKey of release.voicePolicy.primaryVoices) {
  const voice = release.voicePolicy.variants[voiceKey];
  assert.ok(voice.voiceName, `voice ${voiceKey} missing voiceName`);
}

assert.deepEqual(release.contentLanes.map(lane => lane.id), [
  'context',
  'law-memory',
  'question-application',
]);

console.log(`Podcast release OK: ${episode.id} ${episode.version}`);
