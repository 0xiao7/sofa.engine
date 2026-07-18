import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const internalOrLegacyPages = [
  'share.html',
  'ig-cards.html',
  'ig-carousel.html',
  'richmenu-preview.html',
  'richmenu-render.html',
  'compass-planner.html',
];

test('render and internal root pages are not indexable candidate surfaces', () => {
  for (const page of internalOrLegacyPages) {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8');
    assert.match(
      html,
      /<meta\s+name="robots"\s+content="noindex,nofollow"\s*\/?>/i,
      `${page} should be noindex,nofollow`,
    );
  }
});
