import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'account-storage.js'), 'utf8');

class MemoryStorage {
  constructor(seed = {}) { this.map = new Map(Object.entries(seed)); }
  get length() { return this.map.size; }
  key(index) { return [...this.map.keys()][index] ?? null; }
  getItem(key) { return this.map.has(String(key)) ? this.map.get(String(key)) : null; }
  setItem(key, value) { this.map.set(String(key), String(value)); }
  removeItem(key) { this.map.delete(String(key)); }
  clear() { this.map.clear(); }
}

function boot(seed = {}) {
  const localStorage = new MemoryStorage(seed);
  const window = { localStorage };
  vm.runInNewContext(source, { window, globalThis: window, Date, JSON, Object, encodeURIComponent });
  return { window, localStorage };
}

test('account A and B cannot read or overwrite each other private local state', () => {
  const { localStorage } = boot();
  localStorage.setItem('sofa_uid', 'account-a');
  localStorage.setItem('sofa_notes_v1', '{"a":"A note"}');
  localStorage.setItem('sofa_quiz_stats_v1', '{"correct":3}');
  localStorage.setItem('sofa_uid', 'account-b');
  assert.equal(localStorage.getItem('sofa_notes_v1'), null);
  assert.equal(localStorage.getItem('sofa_quiz_stats_v1'), null);
  localStorage.setItem('sofa_notes_v1', '{"b":"B note"}');
  localStorage.setItem('sofa_uid', 'account-a');
  assert.equal(localStorage.getItem('sofa_notes_v1'), '{"a":"A note"}');
  assert.equal(localStorage.getItem('sofa_quiz_stats_v1'), '{"correct":3}');
});

test('ownerless legacy data is quarantined without attribution upload or deletion', () => {
  const legacy = '{"old":{"text":"legacy note"}}';
  const { window, localStorage } = boot({ sofa_notes_v1: legacy, sofa_notes_tomb_v1: '{"old":"date"}' });
  localStorage.setItem('sofa_uid', 'account-a');
  assert.equal(localStorage.getItem('sofa_notes_v1'), null);
  assert.equal(localStorage.map.get('sofa_notes_v1'), legacy);
  assert.deepEqual(window.SoFaAccountStorage.listLegacyArchives().map(x => x.key), ['sofa_notes_tomb_v1', 'sofa_notes_v1']);
  assert.equal(window.SoFaAccountStorage.recoverLegacy('sofa_notes_v1'), true);
  assert.equal(localStorage.getItem('sofa_notes_v1'), legacy);
  assert.equal(localStorage.map.get('sofa_notes_v1'), legacy);
});

test('guest cannot claim a legacy archive and auth identity stays device-global', () => {
  const { window, localStorage } = boot({ sofa_wrong_bank: '[1]' });
  assert.equal(window.SoFaAccountStorage.recoverLegacy('sofa_wrong_bank'), false);
  localStorage.setItem('sofa_token', 'signed-token');
  localStorage.setItem('sofa_uid', 'account-a');
  assert.equal(localStorage.map.get('sofa_token'), 'signed-token');
  assert.equal(localStorage.map.get('sofa_uid'), 'account-a');
});

test('every root page using localStorage loads the account boundary in head', () => {
  const ignored = /(?:snapshot|backup|backups_)/i;
  for (const name of fs.readdirSync(root).filter(name => name.endsWith('.html') && !ignored.test(name))) {
    const html = fs.readFileSync(path.join(root, name), 'utf8');
    if (!html.includes('localStorage')) continue;
    const tag = html.indexOf('src="account-storage.js');
    assert.ok(tag >= 0, `${name} missing account-storage.js`);
    assert.ok(tag < html.indexOf('</head>'), `${name} loads account storage after head`);
  }
});

test('frontend never sends a spoofable uid identity header', () => {
  for (const name of fs.readdirSync(root).filter(name => /\.(?:html|js)$/.test(name))) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, name), 'utf8'), /X-Sofa-UID/, name);
  }
});
