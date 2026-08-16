import { readFileSync, renameSync, writeFileSync } from 'node:fs';

export function readYoutubeLedger(path) {
  const ledger = JSON.parse(readFileSync(path, 'utf8'));
  if (ledger?.schemaVersion !== 1 || !Array.isArray(ledger.episodes)) {
    throw new Error('unsupported YouTube ledger schemaVersion');
  }
  const ids = new Set();
  for (const row of ledger.episodes) {
    if (!row.episodeId || ids.has(row.episodeId)) throw new Error(`duplicate or missing episodeId: ${row.episodeId}`);
    ids.add(row.episodeId);
  }
  return ledger;
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function decideYoutubeAction({ ledger, episodeId, assetSha256, metadataSha256 }) {
  const record = ledger.episodes.find(row => row.episodeId === episodeId);
  if (!record) return { action: 'upload', record: null };
  if (!sameValue(record.assetSha256, assetSha256) || record.metadataSha256 !== metadataSha256) {
    return { action: 'conflict', record };
  }
  if (record.youtubeVideoId && record.state === 'uploaded') return { action: 'attach_playlist', record };
  return { action: 'reuse', record };
}

export function upsertYoutubeRecord({ path, record }) {
  if (!record?.episodeId) throw new Error('record missing episodeId');
  const ledger = readYoutubeLedger(path);
  const index = ledger.episodes.findIndex(row => row.episodeId === record.episodeId);
  if (index === -1) ledger.episodes.push(record);
  else ledger.episodes[index] = { ...ledger.episodes[index], ...record };
  const temp = `${path}.tmp`;
  writeFileSync(temp, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
  renameSync(temp, path);
  return ledger.episodes.find(row => row.episodeId === record.episodeId);
}
