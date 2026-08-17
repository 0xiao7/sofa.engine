#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const EPISODE_IDS = ['EP002', 'EP003', 'EP004', 'EP005', 'EP006'];
const VERSION = 'v20260818-azure';

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function xml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function html(value) {
  return xml(value).replaceAll("'", '&#39;');
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function duration(seconds) {
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  return [hours, minutes, remainder].map(value => String(value).padStart(2, '0')).join(':');
}

function transcriptText(production) {
  return production.segments
    .map(segment => segment.silence ? '' : segment.text.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

function replaceEpisodeArticle(page, episode, production, qc) {
  const number = episode.id.slice(2);
  const articleRegex = new RegExp(`<article class="release-card" id="episode-${number}">[\\s\\S]*?</article>`);
  const match = page.match(articleRegex);
  if (!match) throw new Error(`${episode.id} website card not found`);
  let card = match[0]
    .replace(/<div class="meta">[\s\S]*?<\/div>/, `<div class="meta">法條主線 · ${html(qc.exam)} · ${html(qc.law)} · § ${html(qc.article)}</div>`)
    .replace(/<p class="law-original">[\s\S]*?<\/p>/, `<p class="law-original">${html(qc.officialOriginalText)}</p>`)
    .replace(
      /<summary>本集逐字稿<\/summary>\s*<p class="transcript-text">[\s\S]*?<\/p>/,
      `<summary>本集逐字稿</summary>\n          <p class="transcript-text">${html(transcriptText(production))}</p>`,
    );
  for (const legacy of episode.legacyUrlsToKeep) {
    const filename = legacy.split('/').at(-1);
    const extension = filename.split('.').at(-1);
    if (extension === 'mp3') card = card.replace(new RegExp(escapeRegex(filename), 'g'), episode.siteAudio.split('/').at(-1));
    if (extension === 'vtt') card = card.replace(new RegExp(escapeRegex(filename), 'g'), episode.transcript.split('/').at(-1));
  }
  card = card.replace(/sofa-podcast-ep\d{3}-v\d{8}-hana\.(mp3|vtt)/g, (_, extension) => (
    extension === 'mp3' ? episode.siteAudio.split('/').at(-1) : episode.transcript.split('/').at(-1)
  ));
  return page.replace(articleRegex, card);
}

function replaceFeedItem(feed, episode, production, qc) {
  const number = Number(episode.id.slice(2));
  const match = (feed.match(/<item>[\s\S]*?<\/item>/g) || [])
    .find(item => item.includes(`<itunes:episode>${number}</itunes:episode>`));
  if (!match) throw new Error(`${episode.id} RSS item not found`);
  const practice = `https://sofaengine.org/quiz.html?law=${encodeURIComponent(episode.law)}&amp;article=${encodeURIComponent(episode.article)}&amp;start=1&amp;utm_source=podcast&amp;utm_medium=rss&amp;utm_campaign=episode_${String(number).padStart(3, '0')}`;
  const excerpt = production.segments.filter(segment => segment.text).slice(0, 3).map(segment => `<p>${html(segment.text)}</p>`).join('\n        ');
  const content = `<content:encoded><![CDATA[\n        <p>${html(episode.summary)}。SoFa 固定 Azure 雙聲線版本。</p>\n        <p><strong>現行法規核對原文：</strong>${html(qc.officialOriginalText)}</p>\n        <p><strong>本集文字節錄：</strong></p>\n        ${excerpt}\n        <p>本集使用 AI 合成語音；內容由 SoFa Engine 依現行法規核對，正式考試仍以主管機關與考選部公告為準。</p>\n        <p><a href="https://sofaengine.org/podcast.html?utm_source=podcast&amp;utm_medium=rss&amp;utm_campaign=episode_${String(number).padStart(3, '0')}#episode-${String(number).padStart(3, '0')}">到 SoFa 官網聽互動版</a></p>\n        <p><a href="${practice}">回 SoFa 練這一條</a></p>\n      ]]></content:encoded>`;
  let item = match
    .replace(/<guid isPermaLink="false">[^<]+<\/guid>/, `<guid isPermaLink="false">${episode.guid}</guid>`)
    .replace(/<content:encoded><!\[CDATA\[[\s\S]*?\]\]><\/content:encoded>/, content)
    .replace(/<enclosure url="[^"]+" length="\d+" type="audio\/mp4"\/>/, `<enclosure url="https://sofaengine.org/${episode.enclosure}" length="${statSync(join(ROOT, episode.enclosure)).size}" type="audio/mp4"/>`)
    .replace(/<podcast:transcript url="[^"]+" type="text\/vtt" language="zh-TW" rel="captions"\/>/, `<podcast:transcript url="https://sofaengine.org/${episode.transcript}" type="text/vtt" language="zh-TW" rel="captions"/>`)
    .replace(/<itunes:duration>[^<]+<\/itunes:duration>/, `<itunes:duration>${episode.duration}</itunes:duration>`);
  return feed.replace(match, item);
}

export function promote({ sourceRoot, root = ROOT }) {
  if (!sourceRoot) throw new Error('--source-root is required');
  const manifestPath = join(root, 'podcast-release.json');
  const pagePath = join(root, 'podcast.html');
  const feedPath = join(root, 'podcast.xml');
  const qc = JSON.parse(readFileSync(join(root, 'data', 'podcast-content-qc-ep002-006.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  let page = readFileSync(pagePath, 'utf8');
  let feed = readFileSync(feedPath, 'utf8');
  const queue = { schemaVersion: 1, releaseSet: 'ep002-006-azure', episodes: [] };
  mkdirSync(join(root, 'assets', 'youtube'), { recursive: true });

  manifest.voicePolicy = {
    version: 'voice-azure-ep001-v1',
    changeControl: 'Keep the paid Azure provider, the EP001 A/C voices, mastering target, and script treatment unless Fay approves a new version.',
    primaryVoices: ['EP001 A', 'EP001 C'],
    provider: 'Microsoft Azure Speech paid tier',
    variants: {
      'EP001 A': { voiceName: 'zh-TW-HsiaoChenNeural', rate: '-10%', pitch: '-2Hz' },
      'EP001 C': { voiceName: 'zh-TW-YunJheNeural', rate: '-10%', pitch: '-3Hz' },
    },
    approval: {
      status: 'approved-for-public-release',
      approvedBy: 'Fay',
      approvedDate: '2026-08-18',
      scope: 'Paid Azure EP001 A/C voice identity and EP002-EP006 public release after official-law QC.',
    },
    pauseRule: 'Use the locked six-second thinking pause and cue; never speak bracketed production directions.',
  };

  for (const id of EPISODE_IDS) {
    const lower = id.toLowerCase();
    const sourceDir = join(resolve(sourceRoot), id, `podcast-production-${id}`);
    const report = JSON.parse(readFileSync(join(sourceDir, 'report.json'), 'utf8'));
    const production = JSON.parse(readFileSync(join(root, 'data', 'podcast-productions', `${lower}.json`), 'utf8'));
    const quality = qc.episodes.find(row => row.episodeId === id);
    const episode = manifest.episodes.find(row => row.id === id);
    if (!quality || !episode) throw new Error(`${id} missing QC or release manifest row`);
    if (report.provider !== 'microsoft-azure-speech-paid' || report.status !== 'production_pending_listen_approval') {
      throw new Error(`${id} is not a paid Azure production candidate`);
    }
    if (report.sourceOriginalTextSha256 !== production.sourceOriginalTextSha256) {
      throw new Error(`${id} source hash differs between production and report`);
    }
    const stem = `sofa-podcast-${lower}-${VERSION}`;
    const assets = {
      mp3: `assets/audio/${stem}.mp3`,
      m4a: `assets/audio/${stem}.m4a`,
      vtt: `assets/audio/${stem}.vtt`,
      youtubeMp4: `assets/youtube/${stem}-youtube.mp4`,
    };
    const sources = { mp3: `${lower}.mp3`, m4a: `${lower}.m4a`, vtt: `${lower}.vtt`, youtubeMp4: `${lower}-youtube.mp4` };
    for (const [type, path] of Object.entries(assets)) {
      copyFileSync(join(sourceDir, sources[type]), join(root, path));
      if (sha256(join(root, path)) !== report.artifacts[type].sha256) throw new Error(`${id} ${type} SHA-256 mismatch after copy`);
    }
    const previous = [episode.enclosure, episode.siteAudio, episode.transcript, ...(episode.legacyUrlsToKeep || [])]
      .filter(path => path && !Object.values(assets).includes(path));
    episode.version = VERSION;
    episode.guid = stem;
    episode.enclosure = assets.m4a;
    episode.siteAudio = assets.mp3;
    episode.transcript = assets.vtt;
    episode.youtubeMp4 = assets.youtubeMp4;
    episode.legacyUrlsToKeep = [...new Set(previous)];
    episode.duration = duration(report.artifacts.m4a.probe.duration);
    episode.exam = quality.exam;
    episode.voicePolicyId = production.voicePolicyId;
    episode.voiceMix = ['EP001 A', 'EP001 C'];
    episode.sourceOriginalTextSha256 = production.sourceOriginalTextSha256;
    episode.officialLawUrl = quality.officialLawUrl;
    episode.officialOriginalTextSha256 = quality.officialOriginalTextSha256;
    episode.originalText = quality.officialOriginalText;
    episode.transcriptText = transcriptText(production);
    episode.productionProvider = report.provider;
    episode.productionReportStatus = report.status;
    episode.assetSha256 = Object.fromEntries(Object.entries(report.artifacts).filter(([key]) => key !== 'master').map(([key, value]) => [key, value.sha256]));
    episode.masterWavSha256 = report.artifacts.master.sha256;
    episode.approval = { status: 'approved', approvedBy: 'Fay', approvedAt: '2026-08-18T04:18:25+08:00', basis: 'Public release authorized after rigorous content QC.' };
    page = replaceEpisodeArticle(page, episode, production, quality);
    feed = replaceFeedItem(feed, episode, production, quality);
    queue.episodes.push({
      id,
      status: 'approved_for_release',
      exam: quality.exam,
      law: quality.law,
      article: quality.article,
      title: episode.title,
      summary: episode.summary,
      transcriptExcerpt: production.segments.filter(segment => segment.text).slice(0, 3).map(segment => segment.text).join('\n'),
      officialLawUrl: quality.officialLawUrl,
      utmCampaign: `podcast_episode_${id.slice(2)}_law`,
      guid: stem,
      duration: episode.duration,
      voicePolicyId: production.voicePolicyId,
      voiceMix: ['EP001 A', 'EP001 C'],
      assets,
      assetSha256: episode.assetSha256,
      masterSha256: report.artifacts.m4a.sha256,
      listenApproval: episode.approval,
    });
  }

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(pagePath, page);
  writeFileSync(feedPath, feed);
  writeFileSync(join(root, 'data', 'podcast-replacements-ep002-006.json'), `${JSON.stringify(queue, null, 2)}\n`);
  return queue;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const queue = promote({ sourceRoot: option(process.argv.slice(2), '--source-root') });
    process.stdout.write(`${JSON.stringify({ promoted: queue.episodes.map(row => row.id), version: VERSION })}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
