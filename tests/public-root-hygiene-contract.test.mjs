import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const internalOrLegacyPages = [
  'index-v2-redesign.html',
  'index-v3-micro.html',
  'index-v3-redesign.html',
  'index-v4-depurple.html',
  'index-v5-clean.html',
  'index-v6-navy.html',
  'dashboard-v2-redesign.html',
  'dashboard-v3-micro.html',
  'dashboard-v3-redesign.html',
  'dashboard-v4-depurple.html',
  'dashboard-v5-clean.html',
  'login-v2-redesign.html',
  'login-v3-micro.html',
  'login-v3-redesign.html',
  'login-v4-depurple.html',
  'login-v5-clean.html',
  'share.html',
  'share-v2-favicon.html',
  'law-monitor.html',
  'ig-cards.html',
  'ig-carousel.html',
  'richmenu-preview.html',
  'richmenu-render.html',
  'compass-planner.html',
];

test('legacy, render, and internal root pages are not indexable candidate surfaces', () => {
  for (const page of internalOrLegacyPages) {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8');
    assert.match(
      html,
      /<meta\s+name="robots"\s+content="noindex,nofollow"\s*\/?>/i,
      `${page} should be noindex,nofollow`,
    );
  }
});

