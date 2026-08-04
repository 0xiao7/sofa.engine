import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { ScratchpadState, scratchpadStorageKey, isScratchpadSubject } = require('../question-scratchpad.js');
const quiz = fs.readFileSync(new URL('../quiz.html', import.meta.url), 'utf8');

function memoryStorage(){
  const values = new Map();
  return {
    getItem(key){ return values.has(key) ? values.get(key) : null; },
    setItem(key,value){ values.set(key,String(value)); },
    removeItem(key){ values.delete(key); },
  };
}

test('calculation sheet is available for all three live bookkeeper subjects', () => {
  assert.equal(isScratchpadSubject('會計學概要'), true);
  assert.equal(isScratchpadSubject('稅務相關法規概要'), true);
  assert.equal(isScratchpadSubject('記帳相關法規概要'), true);
  assert.equal(isScratchpadSubject('租稅申報實務'), false);
});

test('storage key isolates every user and question', () => {
  const a = scratchpadStorageKey({userId:'u1',examKey:'bookkeeper',questionId:'q1'});
  const b = scratchpadStorageKey({userId:'u1',examKey:'bookkeeper',questionId:'q2'});
  const c = scratchpadStorageKey({userId:'u2',examKey:'bookkeeper',questionId:'q1'});
  assert.notEqual(a,b);
  assert.notEqual(a,c);
});

test('pointer coordinates are normalized and remain editable', () => {
  const state = new ScratchpadState({storage:memoryStorage()});
  state.setIdentity({userId:'u1',examKey:'bookkeeper',questionId:'q1'});
  state.beginStroke({x:50,y:25,pressure:0.7,width:100,height:50,tool:'pen',strokeWidth:0.008});
  state.appendPoint({x:100,y:50,pressure:1,width:100,height:50});
  state.endStroke();
  assert.deepEqual(state.document.strokes[0].points, [[0.5,0.5,0.7],[1,1,1]]);
});

test('undo redo erase and clear are deterministic', () => {
  const state = new ScratchpadState({storage:memoryStorage()});
  state.setIdentity({userId:'u1',examKey:'bookkeeper',questionId:'q1'});
  state.beginStroke({x:10,y:10,pressure:1,width:100,height:100,tool:'pen',strokeWidth:0.008});
  state.endStroke();
  state.beginStroke({x:90,y:90,pressure:1,width:100,height:100,tool:'pen',strokeWidth:0.008});
  state.endStroke();
  assert.equal(state.document.strokes.length,2);
  state.undo();
  assert.equal(state.document.strokes.length,1);
  state.redo();
  assert.equal(state.document.strokes.length,2);
  state.eraseAt({x:10,y:10,width:100,height:100,radius:0.05});
  assert.equal(state.document.strokes.length,1);
  state.clear();
  assert.equal(state.document.strokes.length,0);
});

test('submit saves current sheet and next question starts blank', () => {
  const storage = memoryStorage();
  const state = new ScratchpadState({storage});
  state.setIdentity({userId:'u1',examKey:'bookkeeper',questionId:'q1'});
  state.beginStroke({x:20,y:20,pressure:1,width:100,height:100,tool:'pen',strokeWidth:0.008});
  state.endStroke();
  state.saveLocal();
  state.setIdentity({userId:'u1',examKey:'bookkeeper',questionId:'q2'});
  assert.equal(state.document.strokes.length,0);
  state.setIdentity({userId:'u1',examKey:'bookkeeper',questionId:'q1'});
  assert.equal(state.document.strokes.length,1);
});

test('quiz exposes a collapsible and fullscreen pencil canvas', () => {
  assert.match(quiz, /id="question-scratchpad"/);
  assert.match(quiz, /id="scratchpad-canvas"/);
  assert.match(quiz, /計算紙/);
  assert.match(quiz, /scratchpad-fullscreen/);
  assert.match(quiz, /pointerdown/);
  assert.match(quiz, /pointerType/);
  assert.match(quiz, /setPointerCapture/);
});

test('past exam normalization preserves the canonical question id', () => {
  assert.match(quiz, /_past_exam_question_id:\s*raw\.id/);
});

test('answer lifecycle saves this question before any next-question path', () => {
  assert.match(quiz, /flushScratchpadBeforeAnswer/);
  assert.match(quiz, /await\s+flushScratchpadBeforeAnswer/);
  assert.match(quiz, /showScratchpadForQuestion\(data\)/);
  assert.match(quiz, /\/api\/me\/question-scratchpad/);
  assert.match(quiz, /尚未同步/);
});

test('an old question sync cannot overwrite the next question save status', () => {
  assert.match(quiz, /identity\?\.questionId===identity\.questionId\)\{\s*_scratchpadState\.markSynced\(payload\.revision\);_setScratchpadStatus\('已儲存'\)/);
  assert.match(quiz, /catch\(_error\)\{\s*if\(_scratchpadState\.identity\?\.questionId===identity\.questionId\)_setScratchpadStatus\('尚未同步'\)/);
});
