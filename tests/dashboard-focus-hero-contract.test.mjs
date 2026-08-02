import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));

test('focus hero leads into the preserved study desk', () => {
  const hero = html.indexOf('id="dashboard-focus-hero"');
  const desk = html.indexOf('id="dashboard-study-desk"');
  const member = html.indexOf('id="member"');
  assert.ok(hero > -1 && desk > hero && member > desk);
  assert.match(html, /今天，先做一組。/);
  assert.match(html, /quiz\.html\?start=1&amp;session=1&amp;count=5/);
  assert.match(html, /id="study-cockpit-recap"/);
});

test('focus hero has phone tablet desktop and reduced-motion rules', () => {
  assert.match(html, /@media \(max-width:767px\)[\s\S]*\.focus-hero/);
  assert.match(html, /@media \(min-width:768px\) and \(max-width:1099px\)[\s\S]*\.focus-hero/);
  assert.match(html, /@media \(min-width:1100px\)[\s\S]*\.focus-hero/);
  assert.match(html, /@media \(prefers-reduced-motion:reduce\)[\s\S]*\.focus-hero/);
});

test('dashboard remains an installable cross-device web app', () => {
  assert.match(html, /rel="manifest" href="\/manifest\.json"/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.orientation, 'any');
});

test('focus hero upgrades the record link to in-page wrong-question records and tracks safely', () => {
  assert.match(html, /function initDashboardFocusHero\(\)/);
  assert.match(html, /localStorage\.getItem\('sofa_wrong_ids'\)/);
  assert.match(html, /secondary\.href = '#weak-laws-recap'/);
  assert.match(html, /'查看 ' \+ wrong\.length \+ ' 題錯題紀錄'/);
  assert.match(html, /typeof window\.sofaTrack === 'function'/);
  assert.match(html, /surface:'dashboard_focus_hero'/);
});
