import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export function buildEdgeTtsArgs({ text, voice, output }) {
  return [
    '-m', 'edge_tts',
    '--voice', voice.name,
    `--rate=${voice.rate}`,
    `--pitch=${voice.pitch}`,
    '--text', text,
    '--write-media', output,
  ];
}

export async function synthesizeSegment({ text, voice, execImpl = execFileAsync }) {
  const workDir = mkdtempSync(join(tmpdir(), 'sofa-edge-tts-'));
  const output = join(workDir, 'segment.mp3');
  try {
    await execImpl('python3', buildEdgeTtsArgs({ text, voice, output }));
    return readFileSync(output);
  } catch (error) {
    throw new Error(`Edge TTS failed for locked voice ${voice.name}: ${error.message}`);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}
