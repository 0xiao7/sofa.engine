import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');

test('dashboard gives the playlist its own block without media playback wording', () => {
  assert.match(html, /id="study-playlist-block"/);
  assert.match(html, /PLAYLIST/);
  assert.match(html, /法條聽讀清單/);
  assert.match(html, /data-study-panel-trigger="playlist"[\s\S]*開啟聽讀清單/);
  assert.match(html, /id="study-playlist-panel"/);
  assert.match(html, /aria-label="法條聽讀清單"/);
  assert.match(html, /id="study-playlist-playall"[\s\S]*播放問答/);
  assert.match(html, /id="study-playlist-status"/);
  assert.match(html, /聽法條、聽問答，也能直接練習/);
  const actionsStart = html.indexOf('<div class="study-action-group secondary"');
  const actionsEnd = html.indexOf('</div>', actionsStart);
  const secondaryActions = html.slice(actionsStart, actionsEnd);
  assert.doesNotMatch(secondaryActions, /playlist|重點朗讀|播放清單|聽讀清單/);
});

test('dashboard focus list keeps executable actions and API loading', () => {
  assert.match(html, /function openStudyPlaylistPanel/);
  assert.match(html, /function loadStudyPlaylist/);
  assert.match(html, /\/api\/playlist\?track=bookkeeper/);
  assert.match(html, /function playStudyPlaylistAll/);
  assert.match(html, /function playStudyPlaylistItem/);
  assert.match(html, /function _speakStudyPlaylistText/);
  assert.match(html, /var practiceHref = 'quiz\.html\?law=' \+ encodeURIComponent\(law\)/);
  assert.match(html, /function openStudyPlaylistArticle/);
  assert.match(html, /data-page-id="' \+ escAttr\(itemId\) \+ '"/);
  assert.match(html, /href="' \+ esc\(practiceHref\) \+ '">只練這部法規/);
  assert.match(html, /onclick="openStudyPlaylistArticle\(this\)">看法條/);
  assert.match(html, /朗讀沒有啟動/);
  assert.match(html, /#study-playlist/);
});
