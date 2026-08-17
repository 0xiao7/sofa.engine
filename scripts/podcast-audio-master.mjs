import { execFileSync } from 'node:child_process';

function ffmpeg(args) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', ...args]);
}

export function normalizeSegment({ input, output }) {
  ffmpeg(['-i', input, '-ar', '44100', '-ac', '2', '-c:a', 'pcm_s16le', output]);
}

export function probeAudio(path) {
  const raw = execFileSync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'a:0',
    '-show_entries', 'stream=sample_rate,channels,channel_layout:format=duration',
    '-of', 'json',
    path,
  ], { encoding: 'utf8' });
  const parsed = JSON.parse(raw);
  const stream = parsed.streams[0];
  return {
    sampleRate: Number(stream.sample_rate),
    channels: stream.channels,
    channelLayout: stream.channel_layout || (stream.channels === 2 ? 'stereo' : undefined),
    duration: Number(parsed.format.duration),
  };
}

export function buildSilence({ output, seconds = 6 }) {
  ffmpeg([
    '-f', 'lavfi',
    '-i', 'anullsrc=r=44100:cl=stereo',
    '-t', String(seconds),
    '-c:a', 'pcm_s16le',
    output,
  ]);
}

export function buildCue({ output, hz = 880 }) {
  ffmpeg([
    '-f', 'lavfi',
    '-i', `sine=frequency=${hz}:sample_rate=44100:duration=0.18`,
    '-ac', '2',
    '-af', 'volume=0.08',
    '-c:a', 'pcm_s16le',
    output,
  ]);
}

export function assembleMaster({ concatList, output }) {
  ffmpeg([
    '-f', 'concat',
    '-safe', '0',
    '-i', concatList,
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
    '-ar', '44100',
    '-ac', '2',
    '-c:a', 'pcm_s16le',
    output,
  ]);
}

export function encodeDerivatives({ master, mp3, m4a }) {
  ffmpeg(['-i', master, '-ar', '44100', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '128k', mp3]);
  ffmpeg(['-i', master, '-ar', '44100', '-ac', '2', '-c:a', 'aac', '-b:a', '128k', m4a]);
}

export function muxYoutube({ m4a, artwork, output }) {
  ffmpeg([
    '-loop', '1',
    '-i', artwork,
    '-i', m4a,
    '-c:v', 'libx264',
    '-tune', 'stillimage',
    '-c:a', 'copy',
    '-shortest',
    '-pix_fmt', 'yuv420p',
    output,
  ]);
}
