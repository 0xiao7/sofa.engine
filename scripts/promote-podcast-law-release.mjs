#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const IDS = ['EP007', 'EP008', 'EP009'];
const TYPES = ['mp3', 'm4a', 'vtt', 'youtubeMp4'];
const REVIEW_TYPES = ['master', ...TYPES];

function json(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function exactIds(value, label) {
  if (JSON.stringify(value) !== JSON.stringify(IDS)) throw new Error(`${label} must contain exactly EP007, EP008, EP009 in order`);
}

function duration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('release candidate missing M4A duration');
  const total = Math.round(seconds);
  return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60]
    .map(value => String(value).padStart(2, '0')).join(':');
}

function sourceFilename(id, type) {
  const lower = id.toLowerCase();
  if (type === 'master') return `${lower}-master.wav`;
  return type === 'youtubeMp4' ? `${lower}-youtube.mp4` : `${lower}.${type}`;
}

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

export function promotePodcastLawRelease({
  root = ROOT,
  sourceRoot,
  queuePath = join(root, 'data', 'podcast-law-queue.json'),
  reviewManifestPath = sourceRoot ? join(sourceRoot, 'review-manifest.json') : undefined,
  approvalPath,
  validateOnly = false,
}) {
  if (!sourceRoot) throw new Error('source root is required');
  let approval = null;
  if (!validateOnly) {
    if (!approvalPath || !existsSync(approvalPath)) throw new Error('listen approval file is required');
    approval = json(approvalPath);
    if (
      approval.schemaVersion !== 1
      || approval.batchId !== 'ep007-009'
      || approval.status !== 'approved'
      || approval.approvedBy !== 'Fay'
      || !/^\d{4}-\d{2}-\d{2}T/.test(approval.approvedAt || '')
    ) throw new Error('batch is not approved by Fay with an exact timestamp');
    exactIds(approval.episodes, 'listen approval');
  }

  const review = json(reviewManifestPath);
  if (review.schemaVersion !== 1 || review.batchId !== 'ep007-009' || review.status !== 'pending_listen_approval') {
    throw new Error('review manifest batch or status mismatch');
  }
  exactIds(review.episodes?.map(row => row.episodeId), 'review manifest');
  const queue = json(queuePath);
  const version = approval ? `v${approval.approvedAt.slice(0, 10).replaceAll('-', '')}-azure` : 'validation-only';
  const candidates = [];

  for (const id of IDS) {
    const row = queue.episodes?.find(episode => episode.id === id);
    const evidence = review.episodes.find(episode => episode.episodeId === id);
    if (!row || !evidence) throw new Error(`${id} missing queue or review evidence`);
    if (row.status !== 'content_verified_audio_pending' || row.listenApproval?.status !== 'pending') {
      throw new Error(`${id} is not in the expected pending state`);
    }
    const production = json(join(root, 'data', 'podcast-productions', `${id.toLowerCase()}.json`));
    const sourceDir = join(resolve(sourceRoot), id, `podcast-production-${id}`);
    const report = json(join(sourceDir, 'report.json'));
    if (
      report.episodeId !== id
      || report.provider !== 'microsoft-azure-speech-paid'
      || report.voicePolicyId !== 'podcast-ep001-master-v1'
      || report.status !== 'production_pending_listen_approval'
    ) {
      throw new Error(`${id} is not a paid Azure listen-pending candidate`);
    }
    if (
      production.voicePolicyId !== 'podcast-ep001-master-v1'
      || evidence.voicePolicyId !== production.voicePolicyId
      || evidence.sourceOriginalTextSha256 !== production.sourceOriginalTextSha256
      || report.sourceOriginalTextSha256 !== production.sourceOriginalTextSha256
    ) throw new Error(`${id} source or voice policy evidence mismatch`);

    const paths = {};
    const hashes = {};
    for (const type of REVIEW_TYPES) {
      const source = join(sourceDir, sourceFilename(id, type));
      const expected = evidence.artifacts?.[type]?.sha256;
      if (!existsSync(source) || !/^[0-9a-f]{64}$/.test(expected || '')) throw new Error(`${id} missing ${type} review artifact`);
      if (report.artifacts?.[type]?.sha256 !== expected || sha256(source) !== expected) throw new Error(`${id} ${type} SHA-256 mismatch`);
      if (type === 'master') continue;
      const stem = `sofa-podcast-${id.toLowerCase()}-${version}`;
      paths[type] = type === 'youtubeMp4' ? `assets/youtube/${stem}-youtube.mp4` : `assets/audio/${stem}.${type}`;
      hashes[type] = expected;
    }
    candidates.push({ id, row, production, report, sourceDir, paths, hashes });
  }

  if (validateOnly) return { validated: IDS, status: 'pending_listen_approval', mutated: false };

  mkdirSync(join(root, 'assets', 'audio'), { recursive: true });
  mkdirSync(join(root, 'assets', 'youtube'), { recursive: true });
  for (const candidate of candidates) {
    for (const type of TYPES) copyFileSync(join(candidate.sourceDir, sourceFilename(candidate.id, type)), join(root, candidate.paths[type]));
    Object.assign(candidate.row, {
      status: 'approved_for_release',
      guid: `sofa-podcast-${candidate.id.toLowerCase()}-${version}`,
      duration: duration(candidate.report.artifacts.m4a.probe?.duration),
      voicePolicyId: 'podcast-ep001-master-v1',
      voiceMix: ['EP001 A', 'EP001 C'],
      transcriptExcerpt: candidate.production.segments.filter(segment => segment.text).slice(0, 3).map(segment => segment.text).join('\n'),
      assets: candidate.paths,
      assetSha256: candidate.hashes,
      masterSha256: candidate.hashes.m4a,
      listenApproval: { status: 'approved', approvedBy: approval.approvedBy, approvedAt: approval.approvedAt },
    });
  }

  const temporaryQueue = `${queuePath}.tmp-${process.pid}`;
  writeFileSync(temporaryQueue, `${JSON.stringify(queue, null, 2)}\n`);
  renameSync(temporaryQueue, queuePath);
  return { promoted: IDS, version };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const args = process.argv.slice(2);
    const result = promotePodcastLawRelease({
      sourceRoot: option(args, '--source-root'),
      approvalPath: option(args, '--approval-file'),
      reviewManifestPath: option(args, '--review-manifest'),
      validateOnly: args.includes('--validate-only'),
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
