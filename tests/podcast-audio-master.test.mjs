import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  assembleMaster,
  buildCue,
  buildSilence,
  encodeDerivatives,
  normalizeSegment,
  probeAudio,
} from '../scripts/podcast-audio-master.mjs';

function temporaryRoot() {
  return mkdtempSync(join(tmpdir(), 'sofa-audio-'));
}

function assertEp001Media(path) {
  const probe = probeAudio(path);
  assert.equal(probe.sampleRate, 44100);
  assert.equal(probe.channels, 2);
  assert.equal(probe.channelLayout, 'stereo');
}

test('24 kHz mono provider audio is normalized to EP001 44.1 kHz stereo', () => {
  const root = temporaryRoot();
  const input = join(root, 'provider.wav');
  const output = join(root, 'normalized.wav');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=24000:duration=1', '-ac', '1', input]);
  normalizeSegment({ input, output });
  assertEp001Media(output);
});

test('cue, silence, master, and distribution derivatives retain EP001 media properties', () => {
  const root = temporaryRoot();
  const speech = join(root, 'speech.wav');
  const cue = join(root, 'cue.wav');
  const silence = join(root, 'silence.wav');
  const list = join(root, 'parts.txt');
  const master = join(root, 'master.wav');
  const mp3 = join(root, 'episode.mp3');
  const m4a = join(root, 'episode.m4a');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100:duration=1', '-ac', '2', speech]);
  buildCue({ output: cue });
  buildSilence({ output: silence, seconds: 1 });
  writeFileSync(list, [speech, cue, silence].map(path => `file '${path}'`).join('\n'));
  assembleMaster({ concatList: list, output: master });
  encodeDerivatives({ master, mp3, m4a });
  for (const path of [cue, silence, master, mp3, m4a]) assertEp001Media(path);
  assert.ok(Math.abs(probeAudio(mp3).duration - probeAudio(m4a).duration) <= 0.1);
});
