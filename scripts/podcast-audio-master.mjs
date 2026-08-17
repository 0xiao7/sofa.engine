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

export function buildCue({ output, hz = [740, 988] }) {
  const [first, second] = Array.isArray(hz) ? hz : [hz, hz];
  ffmpeg([
    '-f', 'lavfi',
    '-i', `sine=frequency=${first}:sample_rate=44100:duration=0.13`,
    '-f', 'lavfi',
    '-i', `sine=frequency=${second}:sample_rate=44100:duration=0.10`,
    '-filter_complex', '[0:a]volume=0.055,apad=pad_dur=0.03[a0];[1:a]volume=0.04[a1];[a0][a1]concat=n=2:v=0:a=1,aformat=channel_layouts=stereo[out]',
    '-map', '[out]',
    '-c:a', 'pcm_s16le',
    output,
  ]);
}

export function assembleMaster({ concatList, output }) {
  ffmpeg([
    '-f', 'concat',
    '-safe', '0',
    '-i', concatList,
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
