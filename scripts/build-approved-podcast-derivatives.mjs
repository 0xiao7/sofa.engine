#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { probeAudio } from './podcast-audio-master.mjs';

function timestamp(seconds) {
  const milliseconds = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const wholeSeconds = Math.floor((milliseconds % 60_000) / 1000);
  const remainder = milliseconds % 1000;
  return [hours, minutes, wholeSeconds].map(value => String(value).padStart(2, '0')).join(':')
    + `.${String(remainder).padStart(3, '0')}`;
}

export function buildApproximateVtt(segments, totalDuration) {
  if (!Number.isFinite(totalDuration) || totalDuration <= 0) throw new Error('audio duration is required');
  const spoken = segments.filter(segment => segment.text?.trim());
  if (!spoken.length) throw new Error('production script has no spoken text');
  const knownSilence = segments.filter(segment => segment.silence).reduce((sum, segment) => sum + Number(segment.seconds || 0), 0);
  const availableSpeech = Math.max(0.1, totalDuration - knownSilence);
  const totalWeight = spoken.reduce((sum, segment) => sum + [...segment.text.trim()].length, 0);
  let cursor = 0;
  let cue = 1;
  let spokenSeen = 0;
  const lines = ['WEBVTT', ''];
  for (const segment of segments) {
    if (segment.silence) {
      cursor += Number(segment.seconds || 0);
      continue;
    }
    if (!segment.text?.trim()) continue;
    spokenSeen += 1;
    const start = Math.min(cursor, totalDuration);
    const isLast = spokenSeen === spoken.length;
    const share = availableSpeech * ([...segment.text.trim()].length / totalWeight);
    cursor = isLast ? totalDuration : Math.min(totalDuration, cursor + share);
    lines.push(String(cue++), `${timestamp(start)} --> ${timestamp(cursor)}`, segment.text.trim(), '');
  }
  return `${lines.join('\n').trim()}\n`;
}

export function buildApprovedDerivatives({ inputM4a, productionPath, outputDir }) {
  const production = JSON.parse(readFileSync(productionPath, 'utf8'));
  const id = production.episodeId;
  if (!/^EP\d{3}$/.test(id || '')) throw new Error('production episode ID is invalid');
  outputDir = resolve(outputDir, id);
  mkdirSync(outputDir, { recursive: true });
  const stem = id.toLowerCase();
  const m4a = join(outputDir, `${stem}.m4a`);
  const mp3 = join(outputDir, `${stem}.mp3`);
  const vtt = join(outputDir, `${stem}.vtt`);
  copyFileSync(resolve(inputM4a), m4a);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', m4a, '-ar', '44100', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '128k', mp3]);
  const duration = probeAudio(m4a).duration;
  writeFileSync(vtt, buildApproximateVtt(production.segments, duration));
  return { episodeId: id, input: basename(inputM4a), duration, outputDir };
}

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try {
    const args = process.argv.slice(2);
    process.stdout.write(`${JSON.stringify(buildApprovedDerivatives({
      inputM4a: option(args, '--m4a'),
      productionPath: option(args, '--production'),
      outputDir: option(args, '--output-dir'),
    }))}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
