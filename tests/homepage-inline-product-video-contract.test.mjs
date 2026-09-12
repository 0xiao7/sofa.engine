import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sourceUrl = 'https://github.com/0xiao7/sofa-media/releases/download/product-walkthrough-20260802/sofa_product_walkthrough_quiz_v5_refined.mp4';
const posterUrl = 'https://github.com/0xiao7/sofa-media/releases/download/product-walkthrough-20260802/sofa_product_walkthrough_quiz_v5_cover.png';

test('walkthrough is placed between practice modes and article content', () => {
  assert.equal((html.match(/id="walkthrough"/g) || []).length, 1);
  assert.ok(html.indexOf('id="modes"') < html.indexOf('id="walkthrough"'));
  assert.ok(html.indexOf('id="walkthrough"') < html.indexOf('id="article"'));
});

test('walkthrough plays the verified real product video inline', () => {
  const section = html.match(/<section class="walkthrough-stage"[\s\S]*?<\/section>/)?.[0] || '';
  assert.match(section, /<video[^>]*\bcontrols\b[^>]*\bplaysinline\b[^>]*preload="metadata"/);
  assert.ok(section.includes(`poster="${posterUrl}"`));
  assert.ok(section.includes(`src="${sourceUrl}"`));
  assert.doesNotMatch(section, /target="_blank"/);
});

test('walkthrough copy stays specific, Taiwanese, and evidence-backed', () => {
  const section = html.match(/<section class="walkthrough-stage"[\s\S]*?<\/section>/)?.[0] || '';
  assert.match(section, /記帳士國考/);
  assert.match(section, /25\.88 秒真實操作/);
  assert.match(section, /實際作答/);
  assert.match(section, /法條解析/);
  assert.doesNotMatch(section, /通過率|視頻|鼠標|登陸/);
});

test('walkthrough CTA preserves the free quiz route and independent campaign', () => {
  assert.match(html, /href="quiz\.html\?free=1&amp;start=1&amp;exam=bookkeeper&amp;utm_source=website&amp;utm_medium=homepage_video&amp;utm_campaign=202609_homepage_walkthrough"/);
  assert.match(html, /data-track-event="free_practice_start"/);
  assert.match(html, /data-track-label="homepage_walkthrough"/);
});

test('walkthrough is responsive and records play and completion once', () => {
  assert.match(html, /\.walkthrough-stage\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(html, /\.walkthrough-video\s*\{[^}]*max-width:\s*100%/s);
  assert.match(html, /homepage_walkthrough_play/);
  assert.match(html, /homepage_walkthrough_complete/);
  assert.match(html, /\{\s*once:\s*true\s*\}/);
});
