import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const page = readFileSync(new URL('podcast.html', root), 'utf8');
const feed = readFileSync(new URL('podcast.xml', root), 'utf8');
const sitemap = readFileSync(new URL('sitemap.xml', root), 'utf8');
const index = readFileSync(new URL('index.html', root), 'utf8');

function jpegDimensions(fileUrl) {
  const buffer = readFileSync(fileUrl);
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  throw new Error('JPEG dimensions not found');
}

test('podcast page exposes RSS, interactive playback, captions, cue sound, and native audio', () => {
  assert.match(page, /<h1>輕聲補一條<\/h1>/);
  assert.match(page, /給國考生的法規通勤練習/);
  assert.match(page, /SoFa 輕聲補一條/);
  assert.match(page, /SoFa Engine 是給國考生用的法條練習工具/);
  assert.match(page, /本節目使用 AI 合成語音/);
  assert.match(page, /sofaengine\.org/);
  assert.doesNotMatch(page, /通勤補一條/);
  assert.match(page, /rel="alternate" type="application\/rss\+xml"/);
  assert.match(page, /data-action="play-interactive"/);
  assert.match(page, /id="cue-toggle"/);
  assert.match(page, /id="caption-toggle"/);
  assert.match(page, /pause:6000/);
  assert.match(page, /assets\/audio\/sofa-podcast-ep001-v20260721-ac\.mp3/);
  assert.match(page, /停六秒，請回答三件事/);
});

test('podcast page behaves like a music player with large artwork and synced transcript', () => {
  assert.match(page, /class="listening-stage"/);
  assert.match(page, /class="cover-shell"/);
  assert.match(page, /class="player-shell"/);
  assert.match(page, /class="player-art-large"/);
  assert.match(page, /class="mini-player"/);
  assert.match(page, /id="episode-audio"/);
  assert.match(page, /id="lyric-panel"/);
  assert.match(page, /data-start="0"/);
  assert.match(page, /function syncLyrics/);
  assert.match(page, /addEventListener\('timeupdate', syncLyrics\)/);
  assert.match(page, /cueTimes = \[85, 174\]/);
  assert.match(page, /Apple Podcast 可能需要一段時間同步封面與逐字稿/);
});

test('podcast page tracks traffic and routes listeners back to the website', () => {
  assert.match(page, /data-track="podcast_site_intro"/);
  assert.match(page, /data-track="podcast_episode_practice"/);
  assert.match(page, /data-track="podcast_playlist_open"/);
  assert.match(page, /data-track-audio="podcast_native_audio"/);
  assert.match(page, /function trackPodcast/);
  assert.match(page, /eventName \+ '_play'/);
  assert.match(page, /eventName \+ '_ended'/);
  assert.match(page, /utm_source=podcast&utm_medium=site_intro&utm_campaign=episode_001/);
  assert.match(page, /utm_source=podcast&utm_medium=episode_card&utm_campaign=episode_001/);
});

test('podcast practice CTA goes to the exact article with podcast attribution', () => {
  assert.match(page, /quiz\.html\?law=%E7%A8%85%E6%8D%90%E7%A8%BD%E5%BE%B5%E6%B3%95&article=01%E4%B9%8B1&start=1&utm_source=podcast&utm_medium=episode&utm_campaign=episode_001/);
  assert.match(feed, /utm_source=podcast&amp;utm_medium=rss&amp;utm_campaign=episode_001/);
  assert.match(feed, /utm_source=podcast&amp;utm_medium=rss_episode&amp;utm_campaign=episode_001/);
  assert.match(feed, /到 SoFa 官網聽互動版/);
  assert.doesNotMatch(page, /[?&]free=1/);
  assert.doesNotMatch(feed, /[?&]amp;free=1|[?&]free=1/);
});

test('podcast feed is platform-safe and points to the generated audio file', () => {
  assert.match(feed, /<rss version="2\.0"/);
  assert.match(feed, /<title>SoFa 輕聲補一條<\/title>/);
  assert.match(feed, /記帳士、地政士考科法規，一次一條/);
  assert.match(feed, /本節目使用 AI 合成語音/);
  assert.match(feed, /sofaengine\.org 可以看字幕/);
  assert.doesNotMatch(feed, /SoFa Engine 通勤補一條|通勤補一條/);
  assert.match(page, /https:\/\/sofaengine\.org\/assets\/podcast-cover-3000-v20260721-close\.jpg/);
  assert.match(feed, /<itunes:image href="https:\/\/sofaengine\.org\/assets\/podcast-cover-3000-v20260721-close\.jpg"\/>/);
  assert.match(feed, /<enclosure url="https:\/\/sofaengine\.org\/assets\/audio\/sofa-podcast-ep001-v20260721-ac\.m4a" length="\d+" type="audio\/mp4"\/>/);
  assert.match(feed, /xmlns:podcast="https:\/\/podcastindex\.org\/namespace\/1\.0"/);
  assert.match(feed, /<podcast:transcript url="https:\/\/sofaengine\.org\/assets\/audio\/sofa-podcast-ep001-v20260721-ac\.vtt" type="text\/vtt" language="zh-TW" rel="captions"\/>/);
  assert.match(feed, /付費會員的完整播放清單會留在官網會員區/);
  assert.match(feed, /<copyright>&#xA9; 2026 SoFa Engine<\/copyright>/);
  assert.match(feed, /<pubDate>Tue, 21 Jul 2026 14:42:00 \+0000<\/pubDate>/);
  assert.doesNotMatch(feed, /lin\.ee|LINE Bot|每日 LINE/);

  const audio = statSync(new URL('assets/audio/sofa-podcast-ep001-v20260721-ac.mp3', root));
  assert.ok(audio.size > 2500000, `audio file too small: ${audio.size}`);
  const appleCompatAudio = statSync(new URL('assets/audio/sofa-podcast-ep001-v20260721-ac.m4a', root));
  assert.ok(appleCompatAudio.size > 2000000, `apple-compatible audio file too small: ${appleCompatAudio.size}`);

  const artwork = statSync(new URL('assets/podcast-cover-3000-v20260721-close.jpg', root));
  assert.ok(artwork.size > 300000, `artwork file too small: ${artwork.size}`);
  assert.match(readFileSync(new URL('assets/podcast-cover-3000-v20260721-close.jpg', root)).subarray(0, 2).toString('hex'), /^ffd8/);
  assert.deepEqual(jpegDimensions(new URL('assets/podcast-cover-3000-v20260721-close.jpg', root)), {
    width: 3000,
    height: 3000,
  });
});

test('podcast transcript is available in Apple-compatible VTT and on the website', () => {
  assert.match(page, /id="transcript"/);
  assert.match(page, /逐字稿/);
  assert.match(page, /有利可以往回，不利通常往後/);
  assert.match(page, /\.note\.law-text\{grid-column:1\/-1\}/);
  assert.match(page, /<h3>法條原文<\/h3>/);
  assert.match(page, /SoFa 法規資料庫整理版：§ 01之1｜解釋函令之效力與變更/);
  assert.match(page, /2 財政部發布解釋函令/);
  assert.match(feed, /SoFa 法規資料庫整理版原文/);
  assert.doesNotMatch(page, /來源：全國法規資料庫/);

  const transcript = readFileSync(new URL('assets/audio/sofa-podcast-ep001-v20260721-ac.vtt', root), 'utf8');
  assert.match(transcript, /^WEBVTT/);
  assert.match(transcript, /00:00:00\.000 --> 00:00:08\.000/);
  assert.match(transcript, /SoFa 輕聲補一條。/);
  assert.match(transcript, /回到 SoFa Engine，可以直接練習這條附近的題目。/);
});

test('podcast page separates the three audio lanes without loading the short episode with long ads', () => {
  assert.match(page, /情境脈絡/);
  assert.match(page, /毒法條 \/ 記憶入口/);
  assert.match(page, /題目帶法規/);
  assert.match(page, /短音檔不塞長廣告/);
});

test('site navigation and sitemap include podcast entry', () => {
  assert.match(index, /href="podcast\.html">通勤音訊<\/a>/);
  assert.match(sitemap, /<loc>https:\/\/sofaengine\.org\/podcast\.html<\/loc>/);
});
