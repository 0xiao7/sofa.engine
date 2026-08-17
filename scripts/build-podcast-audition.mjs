import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  assembleMaster,
  buildCue,
  buildSilence,
  encodeDerivatives,
  muxYoutube,
  normalizeSegment,
  probeAudio,
} from './podcast-audio-master.mjs';
import { synthesizeSegment } from './edge-tts-client.mjs';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const POLICY_PATH = join(REPO_ROOT, 'data', 'podcast-voice-policy-ep001-v1.json');

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function concatPath(path) {
  return `file '${path.replaceAll("'", "'\\''")}'`;
}

function artifact(path) {
  return { path, sha256: sha256(path), probe: probeAudio(path) };
}

function fileArtifact(path) {
  return { path, sha256: sha256(path) };
}

function vttTime(seconds) {
  const milliseconds = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const wholeSeconds = Math.floor((milliseconds % 60_000) / 1000);
  const remainder = milliseconds % 1000;
  return [hours, minutes, wholeSeconds].map(value => String(value).padStart(2, '0')).join(':') + `.${String(remainder).padStart(3, '0')}`;
}

export async function buildAudition({
  episode,
  outputDir,
  artwork,
  synthesize,
  reportStatus = 'audition_pending_listen_approval',
  provider = 'microsoft-edge-tts',
}) {
  outputDir = resolve(outputDir);
  const policy = JSON.parse(readFileSync(POLICY_PATH, 'utf8'));
  if (episode?.voicePolicyId !== policy.id) {
    throw new Error(`Episode voice policy must be ${policy.id}`);
  }
  if (!Array.isArray(episode.segments) || episode.segments.length === 0) {
    throw new Error('Episode must contain at least one segment');
  }
  if (typeof synthesize !== 'function') throw new Error('The locked Edge TTS synthesizer is required');

  mkdirSync(outputDir, { recursive: true });
  const workDir = join(outputDir, '.segments');
  mkdirSync(workDir, { recursive: true });
  const parts = [];
  const captions = [];
  let timelineSeconds = 0;
  let providerCallCount = 0;

  for (let index = 0; index < episode.segments.length; index += 1) {
    const segment = episode.segments[index];
    const stem = String(index).padStart(3, '0');
    if (segment.silence) {
      const output = join(workDir, `${stem}-silence.wav`);
      buildSilence({ output, seconds: segment.seconds ?? policy.media.thinkingPauseSeconds });
      parts.push(output);
      timelineSeconds += probeAudio(output).duration;
      continue;
    }

    const voice = policy.voices.find((candidate) => candidate.role === segment.role);
    if (!voice) throw new Error(`No locked voice for role ${segment.role}`);
    if (!segment.text?.trim()) throw new Error(`Speech segment ${index} has no text`);
    const providerPath = join(workDir, `${stem}-provider.mp3`);
    const normalizedPath = join(workDir, `${stem}-normalized.wav`);
    const bytes = await synthesize({ text: segment.text, voice });
    providerCallCount += 1;
    if (!bytes?.length) throw new Error(`Edge TTS returned empty audio for segment ${index}`);
    writeFileSync(providerPath, bytes);
    normalizeSegment({ input: providerPath, output: normalizedPath });
    parts.push(normalizedPath);
    const segmentDuration = probeAudio(normalizedPath).duration;
    captions.push({ start: timelineSeconds, end: timelineSeconds + segmentDuration, text: segment.text.trim() });
    timelineSeconds += segmentDuration;
    if (segment.cue) {
      const cuePath = join(workDir, `${stem}-cue.wav`);
      buildCue({ output: cuePath, hz: policy.media.cueHz });
      parts.push(cuePath);
      timelineSeconds += probeAudio(cuePath).duration;
    }
  }

  const concatList = join(workDir, 'concat.txt');
  writeFileSync(concatList, `${parts.map(concatPath).join('\n')}\n`);
  const prefix = episode.episodeId.toLowerCase();
  const master = join(outputDir, `${prefix}-master.wav`);
  const mp3 = join(outputDir, `${prefix}.mp3`);
  const m4a = join(outputDir, `${prefix}.m4a`);
  const youtubeMp4 = join(outputDir, `${prefix}-youtube.mp4`);
  const vtt = join(outputDir, `${prefix}.vtt`);
  assembleMaster({ concatList, output: master });
  encodeDerivatives({ master, mp3, m4a });
  muxYoutube({ m4a, artwork, output: youtubeMp4 });
  writeFileSync(vtt, `WEBVTT\n\n${captions.map((caption, index) => `${index + 1}\n${vttTime(caption.start)} --> ${vttTime(caption.end)}\n${caption.text}\n`).join('\n')}`);

  const report = {
    episodeId: episode.episodeId,
    status: reportStatus,
    provider,
    voicePolicyId: policy.id,
    sourceOriginalTextSha256: episode.sourceOriginalTextSha256,
    providerCallCount,
    artifacts: {
      master: artifact(master),
      mp3: artifact(mp3),
      m4a: artifact(m4a),
      youtubeMp4: artifact(youtubeMp4),
      vtt: fileArtifact(vtt),
    },
  };
  writeFileSync(join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main(args) {
  const episodeId = option(args, '--episode');
  const scriptPath = option(args, '--script');
  const outputDir = option(args, '--output-dir');
  if (!episodeId || !scriptPath || !outputDir) {
    throw new Error('Required: --episode EP002 --script <path> --output-dir <path>');
  }
  const episode = JSON.parse(readFileSync(scriptPath, 'utf8'));
  if (episode.episodeId !== episodeId) throw new Error('Episode ID does not match audition script');
  const report = await buildAudition({
    episode,
    outputDir,
    artwork: join(REPO_ROOT, 'assets', 'podcast-cover-3000.png'),
    synthesize: ({ text, voice }) => synthesizeSegment({ text, voice }),
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
