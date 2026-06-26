import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../room.html', import.meta.url), 'utf8');

test('scene rendering is capped at top 19 companions plus self', () => {
  assert.match(html, /SCENE_USER_LIMIT\s*=\s*20/);
  assert.match(html, /SCENE_OTHER_LIMIT\s*=\s*19/);
  assert.match(html, /function\s+_selectSceneUsers/);
  assert.match(html, /_studyMsForUser/);
  assert.match(html, /_sceneUsers\s*=/);
  assert.doesNotMatch(html, /sort\(\(a,b\) => \(b\.weekPts\|\|0\)-\(a\.weekPts\|\|0\)\)\.slice\(0,30\)/);
});

test('all users remain available in the online list while the room stays light', () => {
  assert.match(html, /其餘同學都在名單/);
  assert.match(html, /最久 19 名/);
  assert.match(html, /_onlineOverflowCount/);
  assert.match(html, /online-overflow-note/);
});

test('study flowers grow from quiet study duration, not ranking points', () => {
  assert.match(html, /function\s+_flowerStageForMinutes/);
  assert.match(html, /小花陪你長大/);
  assert.doesNotMatch(html, /Math\.floor\(pts \/ 15\)/);
  assert.doesNotMatch(html, /top studier/);
});

test('pressure and game lobby language is removed from visible room copy', () => {
  const banned = [
    '週排名',
    '讀書榜',
    '搶第一',
    '上榜',
    '對手也在讀書',
    '本小時挑戰',
    '點我去作答',
    'Lv.',
    '鬼魂用功中',
  ];
  for (const phrase of banned) {
    assert.equal(html.includes(phrase), false, `${phrase} should not be visible copy`);
  }
});

test('subject wall is calm and does not deep-link to quiz/practice/fill', () => {
  assert.match(html, /考科牆面/);
  assert.match(html, /內容整理中/);
  assert.doesNotMatch(html, /isChallenge[\s\S]{0,240}window\.open\('quiz\.html'/);
});

test('web load budget markers keep the browser version practical', () => {
  assert.match(html, /LOW_POWER_SCENE/);
  assert.match(html, /ENDLESS_WALK_SEGMENTS/);
  assert.match(html, /id="room-canvas"/);
  assert.match(html, /id="mob-bar"/);
});

test('airy visual direction replaces the old dark game lobby first impression', () => {
  assert.match(html, /SOFA_AIRY_ROOM\s*=\s*true/);
  assert.match(html, /SOFA_ROOM_SINGLE_SCENE\s*=\s*false/);
  assert.match(html, /data-scene-mode="library"/);
  assert.match(html, /data-scene-mode="island"/);
  assert.match(html, /function\s+_startAiryRoom/);
  assert.match(html, /function\s+_airyDrawRoom/);
  assert.match(html, /function\s+_airyDrawIslandRoom/);
  assert.match(html, /function\s+_airyDrawChibi/);
  assert.doesNotMatch(html, /body\.airy-room \.scene-mode-toggle\{display:none;\}/);
  assert.match(html, /body\.airy-room/);
  assert.match(html, /quiet library walk/);
  assert.match(html, /Quiet Study Island/);
  assert.match(html, /#F8F5EC/);
});

test('airy room scenes are procedural instead of pasted generated mockups', () => {
  assert.doesNotMatch(html, /preview-library\.png/);
  assert.doesNotMatch(html, /preview-island\.png/);
  assert.match(html, /function\s+_airyDrawSoftWindow/);
  assert.match(html, /function\s+_airyDrawShelf/);
  assert.match(html, /function\s+_airyDrawDesk/);
  assert.match(html, /function\s+_airyDrawCloud/);
  assert.match(html, /function\s+_airyDrawLibraryPainterlyBackdrop/);
  assert.match(html, /function\s+_airyDrawLibraryStudyBay/);
  assert.match(html, /function\s+_airyDrawIslandPainterlyDepth/);
  assert.match(html, /function\s+_airyDrawIslandStudyCluster/);
  assert.match(html, /_airyDrawSeatedReader/);
});

test('airy room keeps lightweight Three.js available but uses painterly canvas first', () => {
  assert.match(html, /SOFA_AIRY_THREE_ROOM\s*=\s*true/);
  assert.match(html, /SOFA_AIRY_PAINTERLY_PRIMARY\s*=\s*true/);
  assert.match(html, /function\s+_canStartAiryThree/);
  assert.match(html, /function\s+_startAiryThreeRoom/);
  assert.match(html, /function\s+_initAiryThreeScene/);
  assert.match(html, /function\s+_rebuildAiryThreeScene/);
  assert.match(html, /function\s+_buildAiryLibraryCorridor/);
  assert.match(html, /function\s+_buildAiryIslandScene/);
  assert.match(html, /SOFA_AIRY_THREE_ROOM\s*&&\s*!SOFA_AIRY_PAINTERLY_PRIMARY\s*&&\s*_canStartAiryThree\(canvas\)/);
  assert.match(html, /else\s*\{\s*_startAiryRoom\(canvas\)/);
  assert.match(html, /typeof\s+THREE\s*===\s*['"]undefined['"]/);
  assert.doesNotMatch(html, /if\s*\(!THREE\)/);
});
