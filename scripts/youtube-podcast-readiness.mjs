import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ASSET_TYPES = ['mp3', 'm4a', 'vtt', 'youtubeMp4'];

export function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function buildYoutubeMetadata(episode) {
  const article = String(episode.article).padStart(2, '0');
  const practiceUrl = new URL('https://sofaengine.org/quiz.html');
  practiceUrl.searchParams.set('law', episode.law);
  practiceUrl.searchParams.set('article', episode.article);
  practiceUrl.searchParams.set('start', '1');
  practiceUrl.searchParams.set('utm_source', 'youtube');
  practiceUrl.searchParams.set('utm_medium', 'podcast');
  practiceUrl.searchParams.set('utm_campaign', episode.utmCampaign);
  const description = [
    episode.summary,
    '',
    `正式法源：${episode.officialLawUrl}`,
    `聽完練這一條：${practiceUrl.toString()}`,
    '',
    'SoFa Engine 參考解析',
    '非考選部官方標準答案',
  ].join('\n');
  return {
    snippet: {
      title: episode.title,
      description,
      categoryId: '27',
      tags: [episode.exam, episode.law, `第${article}條`, '國考', 'SoFa Engine'],
      defaultLanguage: 'zh-TW',
    },
    status: { privacyStatus: 'private', selfDeclaredMadeForKids: false },
  };
}

export function validateYoutubeEpisode({ episode, root = process.cwd() }) {
  if (episode?.status !== 'approved_for_release') {
    throw new Error(`${episode?.id || 'episode'} is not approved_for_release`);
  }
  const approval = episode.listenApproval;
  if (approval?.status !== 'approved' || !approval.approvedBy || !approval.approvedAt) {
    throw new Error(`${episode.id} missing listen approval`);
  }
  if (!/^00:\d{2}:\d{2}$/.test(episode.duration || '')) throw new Error(`${episode.id} missing duration`);
  if (!episode.guid || episode.guid.endsWith('-pending')) throw new Error(`${episode.id} has provisional GUID`);
  for (const type of ASSET_TYPES) {
    const relative = episode.assets?.[type];
    if (!relative) throw new Error(`${episode.id} missing ${type} asset`);
    const absolute = resolve(root, relative);
    if (!existsSync(absolute)) throw new Error(`${episode.id} missing ${type} file`);
    const expected = episode.assetSha256?.[type];
    if (!/^[0-9a-f]{64}$/.test(expected || '')) throw new Error(`${episode.id} missing ${type} SHA-256`);
    if (sha256File(absolute) !== expected) throw new Error(`${episode.id} ${type} SHA-256 mismatch`);
  }
  const metadata = buildYoutubeMetadata(episode);
  return {
    episodeId: episode.id,
    assetSha256: episode.assetSha256,
    metadata,
    metadataSha256: createHash('sha256').update(JSON.stringify(metadata)).digest('hex'),
  };
}
