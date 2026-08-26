import { readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function xml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function html(value) {
  return xml(value).replaceAll("'", '&#39;');
}

function atomicWrite(path, content) {
  const temp = `${path}.tmp`;
  writeFileSync(temp, content, 'utf8');
  renameSync(temp, path);
}

function episodeNumber(id) {
  return id.replace('EP', '').padStart(3, '0');
}

function transcriptExcerpt(value) {
  return String(value)
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' ');
}

function transcriptUrl(number) {
  return `https://sofaengine.org/podcast.html?utm_source=podcast&amp;utm_medium=rss_transcript&amp;utm_campaign=episode_${number}#transcript-${number}`;
}

export function sortFeedItemsLatestFirst(feed) {
  const itemPattern = /<item>[\s\S]*?<\/item>/g;
  const items = (feed.match(itemPattern) || []).map(item => {
    const pubDate = item.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1];
    const episode = Number(item.match(/<itunes:episode>(\d+)<\/itunes:episode>/)?.[1]);
    const publishedAt = Date.parse(pubDate);
    if (!pubDate || !Number.isFinite(publishedAt)) {
      throw new Error('RSS item pubDate is missing or invalid');
    }
    if (!Number.isInteger(episode)) {
      throw new Error('RSS item itunes:episode is missing');
    }
    return { episode, item, publishedAt };
  });
  const channelMarker = '  </channel>';
  if (!feed.includes(channelMarker)) throw new Error('RSS channel marker missing');
  const withoutItems = feed.replace(/^[ \t]*<item>[\s\S]*?^[ \t]*<\/item>[ \t]*\r?\n?/gm, '');
  const ordered = items
    .sort((left, right) => right.publishedAt - left.publishedAt || right.episode - left.episode)
    .map(({ item }) => `    ${item}`)
    .join('\n');
  return withoutItems.replace(channelMarker, `${ordered}${ordered ? '\n' : ''}${channelMarker}`);
}

export function renderEpisodeFiles({ root, episode, content }) {
  const number = episodeNumber(episode.id);
  const websiteTranscriptUrl = transcriptUrl(number);
  const showNoteExcerpt = transcriptExcerpt(content.transcriptText);
  const manifestPath = join(root, 'podcast-release.json');
  const feedPath = join(root, 'podcast.xml');
  const pagePath = join(root, 'podcast.html');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.episodes.some(row => row.id === episode.id || row.guid === episode.guid)) {
    throw new Error(`${episode.id} is already released`);
  }
  const practiceUrl = `/quiz.html?law=${encodeURIComponent(episode.law)}&article=${encodeURIComponent(episode.article)}&start=1&utm_source=podcast&utm_medium=site&utm_campaign=episode_${number}`;
  manifest.episodes.push({
    id: episode.id,
    version: episode.guid.replace(`sofa-podcast-ep${number}-`, ''),
    title: episode.title,
    exam: episode.exam,
    law: episode.law,
    article: episode.article,
    articleId: episode.articleId,
    articleSource: 'SoFa articles table via /api/article/{articleId}',
    sourceApi: episode.sourceApi,
    officialLawUrl: episode.officialLawUrl,
    sourceOriginalTextSha256: content.sourceOriginalTextSha256,
    sourceAnalysisSha256: content.sourceAnalysisSha256,
    guid: episode.guid,
    enclosure: episode.assets.m4a,
    siteAudio: episode.assets.mp3,
    transcript: episode.assets.vtt,
    legacyUrlsToKeep: [],
    duration: episode.duration,
    voicePolicyId: episode.voicePolicyId,
    masterSha256: episode.masterSha256,
    voiceMix: ['EP001 A', 'EP001 C'],
    lane: '法條主線',
    plannedDate: episode.scheduledDate,
    pubDate: episode.pubDate,
    practiceUrl,
    summary: episode.summary,
    originalText: content.originalText,
    transcriptText: content.transcriptText,
    ctaPolicy: 'Short ending CTA only; law content is the episode mainline.',
  });

  let feed = readFileSync(feedPath, 'utf8');
  const feedMarker = '  </channel>';
  if (!feed.includes(feedMarker)) throw new Error('RSS channel marker missing');
  const publishedAt = Date.parse(episode.pubDate);
  if (!Number.isFinite(publishedAt)) throw new Error(`${episode.id} has invalid pubDate: ${episode.pubDate}`);
  const buildDateMatch = feed.match(/<lastBuildDate>([^<]+)<\/lastBuildDate>/);
  const currentBuildAt = buildDateMatch ? Date.parse(buildDateMatch[1]) : Number.NEGATIVE_INFINITY;
  const nextBuildDate = new Date(Math.max(currentBuildAt, publishedAt)).toUTCString().replace('GMT', '+0000');
  if (buildDateMatch) {
    feed = feed.replace(/<lastBuildDate>[^<]+<\/lastBuildDate>/, `<lastBuildDate>${nextBuildDate}</lastBuildDate>`);
  } else {
    feed = feed.replace(/<channel>\s*/, `<channel>\n    <lastBuildDate>${nextBuildDate}</lastBuildDate>\n`);
  }
  const item = `    <item>\n      <title>${xml(episode.title)}</title>\n      <link>https://sofaengine.org/podcast.html?utm_source=podcast&amp;utm_medium=rss_episode&amp;utm_campaign=episode_${number}#episode-${number}</link>\n      <guid isPermaLink="false">${xml(episode.guid)}</guid>\n      <pubDate>${xml(episode.pubDate)}</pubDate>\n      <description>${xml(episode.summary)}。本集文字節錄：${xml(showNoteExcerpt)}。完整逐字稿：${websiteTranscriptUrl}。本集使用 AI 合成語音。</description>\n      <content:encoded><![CDATA[\n        <p>${html(episode.summary)}</p>\n        <p><strong>法條原文：</strong>${html(content.originalText)}</p>\n        <p><strong>本集文字節錄：</strong>${html(showNoteExcerpt)}</p>\n        <p><a href="${websiteTranscriptUrl}">閱讀完整逐字稿、法條原文與練習入口</a></p>\n      ]]></content:encoded>\n      <enclosure url="https://sofaengine.org/${xml(episode.assets.m4a)}" length="${statSync(join(root, episode.assets.m4a)).size}" type="audio/mp4"/>\n      <itunes:image href="https://sofaengine.org/${xml(manifest.show.artwork)}"/>\n      <podcast:transcript url="https://sofaengine.org/${xml(episode.assets.vtt)}" type="text/vtt" language="zh-TW" rel="captions"/>\n      <itunes:duration>${xml(episode.duration)}</itunes:duration>\n      <itunes:episode>${Number(number)}</itunes:episode>\n      <itunes:season>1</itunes:season>\n      <itunes:explicit>false</itunes:explicit>\n    </item>\n`;
  feed = feed.replace(feedMarker, `${item}${feedMarker}`);
  feed = sortFeedItemsLatestFirst(feed);

  let page = readFileSync(pagePath, 'utf8');
  const pageMarker = '    </div>\n  </section>\n\n  <section class="listening-stage"';
  if (!page.includes(pageMarker)) throw new Error('Podcast release-grid marker missing');
  const card = `      <article class="release-card" id="episode-${number}">\n        <div class="meta">法條主線 · ${html(episode.exam)} · ${html(episode.law)} · § ${html(episode.article)}</div>\n        <h3>${html(episode.title)}</h3>\n        <p class="summary">${html(episode.summary)}</p>\n        <audio controls preload="metadata" src="/${html(episode.assets.mp3)}" data-track-audio="podcast_native_audio_${number}">\n          <track kind="captions" srclang="zh-TW" src="/${html(episode.assets.vtt)}" label="逐字稿">\n        </audio>\n        <div class="release-actions">\n          <a class="btn primary" href="${html(practiceUrl).replaceAll('&amp;', '&amp;')}" data-track="podcast_episode_practice_${number}">練這一條</a>\n          <a class="btn" href="#transcript-${number}" data-transcript-target data-track="podcast_transcript_${number}">閱讀全文逐字稿</a>\n          <a class="btn" href="/${html(episode.assets.vtt)}" data-track="podcast_transcript_vtt_${number}">下載字幕檔 (VTT)</a>\n        </div>\n        <details><summary>法條原文</summary><p class="law-original">${html(content.originalText)}</p></details>\n        <details class="transcript-details" id="transcript-${number}"><summary>閱讀全文逐字稿</summary><p class="transcript-text">${html(content.transcriptText)}</p></details>\n      </article>\n`;
  page = page.replace(pageMarker, `${card}${pageMarker}`);

  atomicWrite(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  atomicWrite(feedPath, feed);
  atomicWrite(pagePath, page);
  return { episodeId: episode.id, practiceUrl };
}
