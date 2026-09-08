import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';

const storageUrl = new URL('../account-storage.js', import.meta.url);
const storagePath = fileURLToPath(storageUrl);
const source = existsSync(storagePath) ? readFileSync(storageUrl, 'utf8') : '';

class FakeStorage {
  constructor(seed = {}) { this.data = new Map(Object.entries(seed)); }
  getItem(key) { return this.data.has(String(key)) ? this.data.get(String(key)) : null; }
  setItem(key, value) { this.data.set(String(key), String(value)); }
  removeItem(key) { this.data.delete(String(key)); }
  key(index) { return [...this.data.keys()][index] || null; }
  get length() { return this.data.size; }
}

function token(uid, exp = Math.floor(Date.now() / 1000) + 3600) {
  return Buffer.from(JSON.stringify({ uid, exp })).toString('base64url') + '.test-signature';
}

function boot(seed = {}) {
  assert.ok(source, 'account-storage.js must exist');
  const localStorage = new FakeStorage(seed);
  const sessionStorage = new FakeStorage();
  const sandbox = {
    window: {}, localStorage, sessionStorage, Storage: FakeStorage,
    Date, JSON, Math, TextEncoder, Uint8Array,
    atob: (value) => Buffer.from(value, 'base64url').toString('binary'),
  };
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox);
  return sandbox;
}

function login(ctx, uid) {
  ctx.localStorage.setItem('sofa_uid', uid);
  ctx.localStorage.setItem('sofa_token', token(uid));
}

test('account storage module exists and owns every private state family', () => {
  assert.ok(source, 'account-storage.js must exist');
  const ctx = boot();
  const privateKeys = [
    'sofa_notes_v1', 'sofa_notes_tomb_v1', 'sofa_wrong_ids', 'sofa_wrong_bank',
    'sofa_recent_quiz_articles_v1', 'sofa_recent_past_exam_questions_v1',
    'sofa_quiz_stats_v1', 'sofa_quiz_daily_2026-09-07', 'sofa_daily_2026-09-07',
    'sofa_exam_history_v1', 'sofa_last_law', 'sofa_last_tool',
    'sofa_practice_law', 'sofa_fill_law', 'sofa_past_exam_subject',
    'sofa.study.localPlan.v1', 'sofa_room_note_2026-09-07',
    'sofa_study_time_2026-09-07', 'sofa_chalk_v1', 'sofa_achievements',
    'fs_wpm', 'fs_daily', 'fs_sched', 'sofa_nickname',
  ];
  privateKeys.forEach((key) => assert.equal(ctx.SoFaAccountStorage.isPrivateKey(key), true, key));
  ['sofa_uid', 'sofa_token', 'sofa_free', 'sofa_exam_key', 'sofa_exam_target', 'sofa.target']
    .forEach((key) => assert.equal(ctx.SoFaAccountStorage.isPrivateKey(key), false, key));
});

test('A and B private state is isolated and A is restored on return', () => {
  const ctx = boot();
  login(ctx, 'USER-A');
  ctx.localStorage.setItem('sofa_notes_v1', JSON.stringify({ a: { text: 'A note' } }));
  ctx.localStorage.setItem('sofa_notes_tomb_v1', JSON.stringify({ deletedA: '2026-09-07T00:00:00Z' }));
  ctx.localStorage.setItem('sofa_wrong_bank', JSON.stringify(['A wrong']));

  login(ctx, 'USER-B');
  assert.equal(ctx.localStorage.getItem('sofa_notes_v1'), null);
  assert.equal(ctx.localStorage.getItem('sofa_notes_tomb_v1'), null);
  assert.equal(ctx.localStorage.getItem('sofa_wrong_bank'), null);
  ctx.localStorage.setItem('sofa_notes_v1', JSON.stringify({ b: { text: 'B note' } }));

  login(ctx, 'USER-A');
  assert.match(ctx.localStorage.getItem('sofa_notes_v1'), /A note/);
  assert.doesNotMatch(ctx.localStorage.getItem('sofa_notes_v1'), /B note/);
  assert.match(ctx.localStorage.getItem('sofa_notes_tomb_v1'), /deletedA/);
});

test('logout and free guest never reveal the previous account private state', () => {
  const ctx = boot();
  login(ctx, 'USER-A');
  ctx.localStorage.setItem('sofa_quiz_stats_v1', JSON.stringify({ total: 9 }));
  ctx.localStorage.removeItem('sofa_uid');
  ctx.localStorage.removeItem('sofa_token');
  assert.equal(ctx.localStorage.getItem('sofa_quiz_stats_v1'), null);

  ctx.localStorage.setItem('sofa_free', 'FREE');
  ctx.localStorage.setItem('sofa_quiz_stats_v1', JSON.stringify({ total: 1 }));
  assert.deepEqual(JSON.parse(ctx.localStorage.getItem('sofa_quiz_stats_v1')), { total: 1 });
  assert.doesNotMatch(ctx.localStorage.getItem('sofa_quiz_stats_v1'), /9/);
});

test('ownerless legacy data is archived without attribution, upload, or deletion', () => {
  const legacy = JSON.stringify({ old: { text: 'ownerless legacy note' } });
  const ctx = boot({ sofa_notes_v1: legacy });
  login(ctx, 'USER-A');
  assert.equal(ctx.localStorage.getItem('sofa_notes_v1'), null);
  const archive = ctx.SoFaAccountStorage.getLegacyArchive();
  assert.equal(archive.entries.sofa_notes_v1.value, legacy);
  assert.equal(archive.entries.sofa_notes_v1.owner, null);
  assert.equal(ctx.SoFaAccountStorage.rawGet('sofa_notes_v1'), legacy);
  assert.equal(ctx.SoFaAccountStorage.rawGet(ctx.SoFaAccountStorage.scopedKey('sofa_notes_v1')), null);
});

test('all private-state pages load account storage before page code', () => {
  const pages = [
    'dashboard.html', 'login.html', 'notes.html', 'practice.html', 'quiz.html',
    'fill.html', 'room.html', 'share.html', 'analysis.html', 'analysis-preview.html',
  ];
  for (const page of pages) {
    const html = readFileSync(new URL('../' + page, import.meta.url), 'utf8');
    const include = html.indexOf('account-storage.js?v=20260907-account-scope-v1');
    const firstPrivateRead = html.search(/localStorage\.(?:getItem|setItem)\((?:STUDY_LOCAL_KEY|STATS_KEY|RECENT_|['"](?:sofa_notes|sofa_wrong|sofa_recent|sofa_daily|sofa_quiz|sofa_study|sofa\.study|sofa_room|sofa_chalk|sofa_achievements|fs_))/);
    assert.ok(include >= 0, page + ' loads account storage');
    assert.ok(firstPrivateRead < 0 || include < firstPrivateRead, page + ' loads account storage first');
  }
});

