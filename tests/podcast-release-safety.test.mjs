import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const feed = readFileSync(new URL('podcast.xml', root), 'utf8');
const page = readFileSync(new URL('podcast.html', root), 'utf8');

test('podcast episode identity and enclosure are immutable for platform caches', () => {
  assert.match(feed, /<guid isPermaLink="false">sofa-podcast-ep001-v\d{8}-ac<\/guid>/);
  assert.match(feed, /<enclosure url="https:\/\/sofaengine\.org\/assets\/audio\/sofa-podcast-ep001-v\d{8}-ac\.m4a" length="\d+" type="audio\/mp4"\/>/);
  assert.doesNotMatch(feed, /<enclosure url="https:\/\/sofaengine\.org\/assets\/audio\/sofa-podcast-001\.m4a"/);
  assert.match(page, /assets\/audio\/sofa-podcast-ep001-v\d{8}-ac\.mp3/);
});

test('legacy podcast audio remains available for Apple and device caches', () => {
  const legacyM4a = new URL('assets/audio/sofa-podcast-001.m4a', root);
  const legacyMp3 = new URL('assets/audio/sofa-podcast-001-ac.mp3', root);
  assert.equal(existsSync(legacyM4a), true);
  assert.equal(existsSync(legacyMp3), true);
  assert.ok(statSync(legacyM4a).size > 2000000);
  assert.ok(statSync(legacyMp3).size > 2500000);
});

test('podcast release notes record rights, voices, and the three content lanes', () => {
  const notes = JSON.parse(readFileSync(new URL('podcast-release.json', root), 'utf8'));
  assert.equal(notes.show.title, 'SoFa 輕聲補一條');
  assert.equal(notes.rights.aiVoiceDisclosure, true);
  assert.deepEqual(notes.voicePolicy.primaryVoices, ['A', 'C']);
  assert.deepEqual(notes.contentLanes.map(lane => lane.id), [
    'context',
    'law-memory',
    'question-application',
  ]);
  assert.match(notes.episodes[0].enclosure, /sofa-podcast-ep001-v\d{8}-ac\.m4a$/);
});
