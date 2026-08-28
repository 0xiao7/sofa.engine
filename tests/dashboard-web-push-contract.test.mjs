import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const require = createRequire(import.meta.url);
const html = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');

function element(){
  return {
    hidden:true, disabled:false, textContent:'', listeners:{},
    addEventListener(name, fn){ this.listeners[name] = fn; },
  };
}

function controllerFixture({mode='free', permission='default', standalone=true, fetchImpl} = {}){
  const elements = Object.fromEntries([
    'web-push-state','web-push-title','web-push-enable','web-push-disable','web-push-test',
  ].map(id => [id, element()]));
  const storageData = mode === 'member'
    ? {sofa_token:'signed-token',sofa_uid:'member-1'}
    : mode === 'free' ? {sofa_free:'FREE'} : {};
  const storage = {
    getItem:key => storageData[key] || '',
    setItem:(key,value) => { storageData[key] = value; },
  };
  let subscription = null;
  const createdSubscription = {
    endpoint:'https://push.example.test/subscription/device-one',
    toJSON(){ return {endpoint:this.endpoint,keys:{p256dh:'p'.repeat(43),auth:'a'.repeat(22)}}; },
    async unsubscribe(){ subscription = null; return true; },
  };
  const registration = {pushManager:{
    async getSubscription(){ return subscription; },
    async subscribe(){ subscription = createdSubscription; return subscription; },
  }};
  const window = {
    isSecureContext:true,
    PushManager:function(){},
    Notification:{permission, async requestPermission(){ this.permission='granted'; return 'granted'; }},
    matchMedia:() => ({matches:standalone}),
    crypto:{getRandomValues(bytes){ bytes.fill(7); return bytes; }},
  };
  const navigator = {
    userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
    standalone,
    serviceWorker:{async register(){ return registration; }, ready:Promise.resolve(registration)},
  };
  const calls = [];
  const fetch = fetchImpl || (async (url, options={}) => {
    calls.push({url,options});
    return {ok:true,status:200,async json(){ return {public_key:'B'.repeat(87)}; }};
  });
  const controller = require('../web-push.js').controller({
    window,navigator,document:{getElementById:id => elements[id]},storage,fetch,
    apiBase:'https://api.example.test',crypto:window.crypto,
  });
  return {controller,elements,calls,window,createdSubscription};
}

test('dashboard exposes a separate device reminder control without changing LINE semantics', () => {
  assert.match(active, /id="web-push-settings"/);
  assert.match(active, /裝置複習提醒/);
  assert.match(active, /id="web-push-enable"/);
  assert.match(active, /id="web-push-disable"/);
  assert.match(active, /id="web-push-test"/);
  assert.match(active, /id="srs-push-enabled"[^>]*>[\s\S]*LINE 每日推播/);
  assert.match(active, /src="web-push\.js\?v=20260828-free-member-test-v1"/);
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

test('push mode separates anonymous free practice from member SRS history', () => {
  const push = require('../web-push.js');
  const member = { getItem: key => ({sofa_token:'signed-token',sofa_uid:'member-1'})[key] || '' };
  const free = { getItem: key => key === 'sofa_free' ? 'FREE' : '' };
  const guest = { getItem: () => '' };
  assert.equal(push.pushMode(member), 'member_srs');
  assert.equal(push.pushMode(free), 'free_daily');
  assert.equal(push.pushMode(guest), 'signed_out');
});

test('anonymous installation token uses Web Crypto and is never sent in a URL', () => {
  const source = readFileSync(new URL('../web-push.js', import.meta.url), 'utf8');
  assert.match(source, /crypto\.getRandomValues/);
  assert.match(source, /sofa_push_installation/);
  assert.match(source, /X-Sofa-Installation/);
  assert.doesNotMatch(source, /[?&](installation_token|endpoint)=/);
});

test('free and member subscriptions use separate endpoints and immediate visible tests', () => {
  const source = readFileSync(new URL('../web-push.js', import.meta.url), 'utf8');
  assert.match(source, /\/api\/free\/web-push-subscriptions/);
  assert.match(source, /\/api\/me\/web-push-subscriptions/);
  assert.match(source, /async function sendTestNotification/);
  assert.match(source, /getElementById\(['"]web-push-test['"]\)/);
  assert.match(source, /每天提醒我刷題/);
  assert.match(source, /依複習曲線提醒/);
});

test('blocked notification copy tells iPhone users where to recover permission', () => {
  const source = readFileSync(new URL('../web-push.js', import.meta.url), 'utf8');
  assert.match(source, /設定.*通知.*SoFa/);
});

test('iPhone browser stops at add-to-home-screen guidance before permission', async () => {
  const fixture = controllerFixture({mode:'free',standalone:false});
  await fixture.controller.init();
  assert.match(fixture.elements['web-push-state'].textContent, /加入主畫面/);
  assert.equal(fixture.calls.length, 0);
});

test('free enable saves anonymous subscription then sends immediate test', async () => {
  const fixture = controllerFixture({mode:'free',standalone:true});
  await fixture.controller.enableDeviceReminder();
  const urls = fixture.calls.map(call => call.url);
  assert.deepEqual(urls, [
    'https://api.example.test/api/web-push/public-key',
    'https://api.example.test/api/free/web-push-subscriptions',
    'https://api.example.test/api/free/web-push-subscriptions/test',
  ]);
  const subscribe = JSON.parse(fixture.calls[1].options.body);
  assert.ok(subscribe.installation_token);
  assert.equal(subscribe.subscription.endpoint, fixture.createdSubscription.endpoint);
  assert.match(fixture.elements['web-push-state'].textContent, /測試通知已送出/);
});

test('member init checks eligibility before showing the SRS control', async () => {
  const fixture = controllerFixture({mode:'member',standalone:true});
  await fixture.controller.init();
  assert.equal(fixture.calls[0].url, 'https://api.example.test/api/me/web-push-subscriptions/status');
  assert.equal(fixture.elements['web-push-enable'].textContent, '依複習曲線提醒');
});

test('denied permission exposes recovery instructions and no enable button', async () => {
  const fixture = controllerFixture({mode:'free',permission:'denied',standalone:true});
  await fixture.controller.init();
  assert.match(fixture.elements['web-push-state'].textContent, /設定 → 通知 → SoFa Engine/);
  assert.equal(fixture.elements['web-push-enable'].hidden, true);
});

test('manifest has a stable PWA identity for device notification settings', () => {
  const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.id, '/');
  assert.equal(manifest.display, 'standalone');
});
