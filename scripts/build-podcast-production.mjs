import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { synthesizeAzureSegment } from './azure-speech-tts-client.mjs';
import { buildAudition } from './build-podcast-audition.mjs';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

export function buildProduction({ episode, outputDir, artwork, synthesize }) {
  return buildAudition({
    episode,
    outputDir,
    artwork,
    synthesize,
    reportStatus: 'production_pending_listen_approval',
    provider: 'microsoft-azure-speech-paid',
  });
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
  if (episode.episodeId !== episodeId) throw new Error('Episode ID does not match production script');
  const report = await buildProduction({
    episode,
    outputDir,
    artwork: join(REPO_ROOT, 'assets', 'podcast-cover-3000.png'),
    synthesize: ({ text, voice }) => synthesizeAzureSegment({
      text,
      voice,
      region: process.env.SPEECH_REGION,
      subscriptionKey: process.env.SPEECH_KEY,
    }),
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
