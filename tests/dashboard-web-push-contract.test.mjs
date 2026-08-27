import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const require = createRequire(import.meta.url);
const html = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');

test('dashboard exposes a separate device reminder control without changing LINE semantics', () => {
  assert.match(active, /id="web-push-settings"/);
  assert.match(active, /裝置複習提醒/);
  assert.match(active, /id="web-push-enable"/);
  assert.match(active, /id="web-push-disable"/);
  assert.match(active, /id="srs-push-enabled"[^>]*>[\s\S]*LINE 每日推播/);
  assert.match(active, /src="web-push\.js"/);
});

test('web push helper requests permission only inside explicit enable action', () => {
  const source = readFileSync(new URL('../web-push.js', import.meta.url), 'utf8');
  assert.match(source, /async function enableDeviceReminder/);
  const enableStart = source.indexOf('async function enableDeviceReminder');
  const disableStart = source.indexOf('async function disableDeviceReminder');
  const enableSource = source.slice(enableStart, disableStart);
  assert.match(enableSource, /Notification\.requestPermission\(\)/);
  assert.equal((source.match(/Notification\.requestPermission\(\)/g) || []).length, 1);
  assert.doesNotMatch(source.slice(source.indexOf('async function init'), enableStart), /requestPermission/);
});

test('capability state guides iPhone browser users to install before asking permission', () => {
  const push = require('../web-push.js');
  const state = push.capabilityState({
    window: { PushManager: function(){}, Notification: { permission: 'default' }, matchMedia: () => ({matches:false}) },
    navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', serviceWorker: {} },
    secureContext: true,
  });
  assert.equal(state, 'install_required');
});

test('authenticated headers prefer signed token and never put identity in the URL', () => {
  const push = require('../web-push.js');
  const storage = { getItem: key => ({sofa_token:'signed-token',sofa_uid:'member-1'})[key] || '' };
  assert.deepEqual(push.authHeaders(storage), {Authorization:'Bearer signed-token'});
  const source = readFileSync(new URL('../web-push.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /[?&](uid|token)=/);
});

test('manifest has a stable PWA identity for device notification settings', () => {
  const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.id, '/');
  assert.equal(manifest.display, 'standalone');
});
