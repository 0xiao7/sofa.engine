import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');

test('dashboard gives the playlist its own block without media playback wording', () => {
  assert.match(html, /id="study-playlist-block"/);
  assert.match(html, /PLAYLIST/);
  assert.match(html, /播放清單/);
  assert.match(html, /data-study-panel-trigger="playlist"[\s\S]*開啟播放清單/);
  assert.match(html, /id="study-playlist-panel"/);
  assert.match(html, /aria-label="播放清單"/);
  assert.match(html, /id="study-playlist-playall"[\s\S]*播放問答/);
  assert.match(html, /id="study-playlist-status"/);
  assert.match(html, /沉浸練習：閉眼想，再聽法規答案/);
  const actionsStart = html.indexOf('<div class="study-action-group secondary"');
  const actionsEnd = html.indexOf('</div>', actionsStart);
  const secondaryActions = html.slice(actionsStart, actionsEnd);
  assert.match(secondaryActions, /data-study-panel-trigger="playlist"[\s\S]*播放清單/);
  assert.doesNotMatch(secondaryActions, /重點朗讀|聽讀清單/);
});

test('dashboard focus list keeps executable actions and API loading', () => {
  assert.match(html, /function openStudyPlaylistPanel/);
  assert.match(html, /function loadStudyPlaylist/);
  assert.match(html, /\/api\/playlist\?/);
  assert.match(html, /params\.set\('track', track \|\| 'all'\)/);
  assert.doesNotMatch(html, /params\.set\('track', 'bookkeeper'\)/);
  assert.match(html, /function playStudyPlaylistAll/);
  assert.match(html, /function playStudyPlaylistItem/);
  assert.match(html, /function _speakStudyPlaylistText/);
  assert.match(html, /var practiceHref = 'quiz\.html\?' \+ practiceParams\.join\('&'\)/);
  assert.match(html, /practiceParams\.push\('page_id=' \+ encodeURIComponent\(itemId\)\)/);
  assert.match(html, /function openStudyPlaylistArticle/);
  assert.match(html, /data-page-id="' \+ escAttr\(itemId\) \+ '"/);
  assert.match(html, /href="' \+ esc\(practiceHref\) \+ '">練習/);
  assert.match(html, /onclick="openStudyPlaylistArticle\(this\)">看法條/);
  assert.match(html, /朗讀沒有啟動/);
  assert.match(html, /#study-playlist/);
});
