#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { probeAudio } from './podcast-audio-master.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const RELEASE_TYPES = ['mp3', 'm4a', 'vtt'];

const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function hhmmss(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('approved M4A has no valid duration');
  const total = Math.round(seconds);
  return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60]
    .map(value => String(value).padStart(2, '0')).join(':');
}

export function importMobileApprovedPodcast({
  root = ROOT,
  sourceRoot,
  queuePath = join(root, 'data', 'podcast-law-queue.json'),
  approvalPath,
  durations = {},
}) {
  if (!sourceRoot || !approvalPath) throw new Error('source root and approval file are required');
  const approval = json(approvalPath);
  const approvals = approval.approvals || [];
  if (
    approval.schemaVersion !== 2
    || approval.source !== 'fay-bot-mobile-review'
    || approvals.length < 1
    || new Set(approvals.map(row => row.episodeId)).size !== approvals.length
  ) throw new Error('invalid mobile approval evidence');

  const queue = json(queuePath);
  const candidates = [];
  for (const item of approvals) {
    const id = item.episodeId;
    if (
      item.status !== 'approved'
      || item.approvedBy !== 'Fay'
      || !/^\d{4}-\d{2}-\d{2}T/.test(item.approvedAt || '')
      || !/^[0-9a-f]{64}$/.test(item.approvedAssetSha256 || '')
    ) throw new Error(`${id} is not an exact Fay approval`);
    const row = queue.episodes?.find(candidate => candidate.id === id);
    if (!row || row.status !== 'content_verified_audio_pending' || row.listenApproval?.status !== 'pending') {
      throw new Error(`${id} is not in the expected pending state`);
    }
    const production = json(join(root, 'data', 'podcast-productions', `${id.toLowerCase()}.json`));
    if (production.episodeId !== id || production.voicePolicyId !== 'podcast-ep001-master-v1') {
      throw new Error(`${id} production identity or voice policy mismatch`);
    }
    const sourceDir = resolve(sourceRoot, id);
    const sources = Object.fromEntries(RELEASE_TYPES.map(type => [type, join(sourceDir, `${id.toLowerCase()}.${type}`)]));
    for (const type of RELEASE_TYPES) {
      if (!existsSync(sources[type])) throw new Error(`${id} missing ${type} release artifact`);
      const minimum = type === 'vtt' ? 20 : 300_000;
      if (statSync(sources[type]).size < minimum) throw new Error(`${id} ${type} release artifact too small`);
    }
    const m4aSha = sha256(sources.m4a);
    if (m4aSha !== item.approvedAssetSha256) throw new Error(`${id} approved audio SHA-256 mismatch`);
    if (item.reviewId !== `podcast-${id}-${m4aSha.slice(0, 12)}`) throw new Error(`${id} mobile review ID mismatch`);
    const transcript = readFileSync(sources.vtt, 'utf8');
    if (!transcript.startsWith('WEBVTT')) throw new Error(`${id} transcript must begin with WEBVTT`);
    for (const segment of production.segments.filter(segment => segment.text)) {
      if (!transcript.includes(segment.text.trim())) throw new Error(`${id} VTT is missing approved-script text`);
    }
    const version = `v${item.approvedAt.slice(0, 10).replaceAll('-', '')}-azure`;
    const stem = `sofa-podcast-${id.toLowerCase()}-${version}`;
    const assets = {
      mp3: `assets/audio/${stem}.mp3`,
      m4a: `assets/audio/${stem}.m4a`,
      vtt: `assets/audio/${stem}.vtt`,
    };
    const seconds = durations[id] ?? probeAudio(sources.m4a).duration;
    candidates.push({ id, item, row, production, sources, assets, duration: hhmmss(seconds), version });
  }

  mkdirSync(join(root, 'assets', 'audio'), { recursive: true });
  for (const candidate of candidates) {
    for (const type of RELEASE_TYPES) copyFileSync(candidate.sources[type], join(root, candidate.assets[type]));
    Object.assign(candidate.row, {
      status: 'approved_for_release',
      guid: `sofa-podcast-${candidate.id.toLowerCase()}-${candidate.version}`,
      duration: candidate.duration,
      voicePolicyId: 'podcast-ep001-master-v1',
      voiceMix: ['EP001 A', 'EP001 C'],
      transcriptExcerpt: candidate.production.segments.filter(segment => segment.text).slice(0, 3).map(segment => segment.text).join('\n'),
      assets: candidate.assets,
      assetSha256: Object.fromEntries(RELEASE_TYPES.map(type => [type, sha256(candidate.sources[type])])),
      masterSha256: candidate.item.approvedAssetSha256,
      listenApproval: {
        status: 'approved',
        approvedBy: candidate.item.approvedBy,
        approvedAt: candidate.item.approvedAt,
        source: approval.source,
        reviewId: candidate.item.reviewId,
        approvedAssetSha256: candidate.item.approvedAssetSha256,
      },
    });
    if (candidate.production.segments.some(segment => segment.text?.includes('會計'))) {
      candidate.row.pronunciationReview = {
        status: 'approved',
        reviewedBy: candidate.item.approvedBy,
        reviewedAt: candidate.item.approvedAt,
        source: approval.source,
        reviewId: candidate.item.reviewId,
        terms: { '會計': 'ㄎㄨㄞˋ ㄐㄧˋ' },
      };
    }
  }
  const temporaryQueue = `${queuePath}.tmp-${process.pid}`;
  writeFileSync(temporaryQueue, `${JSON.stringify(queue, null, 2)}\n`);
  renameSync(temporaryQueue, queuePath);
  return { imported: candidates.map(candidate => candidate.id) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const args = process.argv.slice(2);
    process.stdout.write(`${JSON.stringify(importMobileApprovedPodcast({
      sourceRoot: option(args, '--source-root'),
      approvalPath: option(args, '--approval-file'),
    }))}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
