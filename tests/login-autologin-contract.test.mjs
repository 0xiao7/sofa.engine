import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../login.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');

test('login preserves review strategy hash after automatic magic or serial login', () => {
  assert.match(active, /function dashboardTargetAfterLogin\(\)/);
  assert.match(active, /return location\.hash === '#srs-settings'\s*\?\s*'dashboard\.html#srs-settings'\s*:\s*'dashboard\.html'/);

  const redirects = active.match(/window\.location\.href = dashboardTargetAfterLogin\(\)/g) || [];
  assert.ok(redirects.length >= 2, 'magic and serial login should both use the hash-preserving dashboard target');
});
