import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');

test('dashboard restores the focus reading list entry without media playback wording', () => {
  assert.match(html, /data-study-panel-trigger="playlist"[\s\S]*重點朗讀/);
  assert.match(html, /id="study-playlist-panel"/);
  assert.match(html, /aria-label="通勤重點朗讀清單"/);
  assert.match(html, /id="study-playlist-playall"[\s\S]*朗讀全部/);
  assert.match(html, /id="study-playlist-status"/);
  assert.match(html, /重點清單，能朗讀也能單刷/);
  assert.doesNotMatch(html, />PLAYLIST</);
  assert.doesNotMatch(html, /播放清單/);
});

test('dashboard focus list keeps executable actions and API loading', () => {
  assert.match(html, /function openStudyPlaylistPanel/);
  assert.match(html, /function loadStudyPlaylist/);
  assert.match(html, /\/api\/playlist\?track=bookkeeper/);
  assert.match(html, /function playStudyPlaylistAll/);
  assert.match(html, /function playStudyPlaylistItem/);
  assert.match(html, /function _speakStudyPlaylistText/);
  assert.match(html, /href="\s*'\s*\+ _studyDrillHref\(item\)/);
  assert.match(html, /href="\s*'\s*\+ _studyReaderHref\(item\)/);
  assert.match(html, /朗讀沒有啟動/);
  assert.match(html, /#study-playlist/);
});

