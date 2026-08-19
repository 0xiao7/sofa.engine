import { createHash } from 'node:crypto';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_EPISODES = ['EP007', 'EP008', 'EP009'];
const REQUIRED_ARTIFACTS = ['master', 'mp3', 'm4a', 'youtubeMp4', 'vtt'];
const REQUIRED_STATUS = 'production_pending_listen_approval';
const REQUIRED_PROVIDER = 'microsoft-azure-speech-paid';
const REQUIRED_POLICY = 'podcast-ep001-master-v1';

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function requireExactEpisodes(episodeIds) {
  if (JSON.stringify(episodeIds) !== JSON.stringify(REQUIRED_EPISODES)) {
    throw new Error('Batch review requires exactly EP007, EP008, EP009 in order');
  }
}

export function buildBatchReview({ root, episodeIds }) {
  requireExactEpisodes(episodeIds);
  const absoluteRoot = resolve(root);
  const episodes = episodeIds.map((episodeId) => {
    const directory = join(absoluteRoot, episodeId);
    const report = JSON.parse(readFileSync(join(directory, 'report.json'), 'utf8'));
    if (report.episodeId !== episodeId) throw new Error(`${episodeId} report episode ID mismatch`);
    if (report.status !== REQUIRED_STATUS) throw new Error(`${episodeId} report status must be ${REQUIRED_STATUS}`);
    if (report.provider !== REQUIRED_PROVIDER) throw new Error(`${episodeId} provider must be ${REQUIRED_PROVIDER}`);
    if (report.voicePolicyId !== REQUIRED_POLICY) throw new Error(`${episodeId} voice policy must be ${REQUIRED_POLICY}`);

    const artifacts = {};
    for (const type of REQUIRED_ARTIFACTS) {
      const recorded = report.artifacts?.[type];
      if (!recorded?.path || !recorded?.sha256) throw new Error(`${episodeId} ${type} artifact record is missing`);
      const path = join(directory, basename(recorded.path));
      const actualHash = sha256(path);
      if (actualHash !== recorded.sha256) throw new Error(`${episodeId} ${type} artifact hash mismatch`);
      artifacts[type] = {
        path: relative(absoluteRoot, path),
        sha256: actualHash,
        ...(recorded.probe ? { probe: recorded.probe } : {}),
      };
    }

    return {
      episodeId,
      provider: report.provider,
      voicePolicyId: report.voicePolicyId,
      sourceOriginalTextSha256: report.sourceOriginalTextSha256,
      providerCallCount: report.providerCallCount,
      artifacts,
    };
  });

  return {
    schemaVersion: 1,
    batchId: 'ep007-009',
    status: 'pending_listen_approval',
    createdAt: new Date().toISOString(),
    episodes,
  };
}

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function main(args) {
  const inputRoot = option(args, '--input-root');
  const output = option(args, '--output');
  if (!inputRoot || !output) throw new Error('Required: --input-root <dir> --output <file>');
  const manifest = buildBatchReview({ root: inputRoot, episodeIds: REQUIRED_EPISODES });
  const temporaryOutput = `${output}.tmp`;
  writeFileSync(temporaryOutput, `${JSON.stringify(manifest, null, 2)}\n`);
  renameSync(temporaryOutput, output);
  process.stdout.write(`${output}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
