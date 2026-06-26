import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../fill.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');
const css = readFileSync(new URL('../sofa.css', import.meta.url), 'utf8');

test('native iOS fill owns the status bar safe area', () => {
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" \/>/);
  assert.match(active, /document\.documentElement\.classList\.add\('ios-reader-app'\)/);
  assert.match(css, /html\.ios-reader-app\s+\.topbar\{[\s\S]*padding-top:calc\(16px \+ env\(safe-area-inset-top, 0px\)\)/);
});

test('native iOS fill keeps mobile blanks and actions inside the viewport', () => {
  assert.doesNotMatch(active, /style="min-width:\$\{Math\.max\(b\.length\*1\.1,2\.5\)\}em"/);
  assert.match(active, /style="width:min\(\$\{Math\.max\(b\.length\*1\.1,2\.5\)\}em, 100%\)"/);
  assert.match(html, /\.blank\{[^}]*max-width:100%;[^}]*box-sizing:border-box/s);
  assert.match(html, /html\.ios-reader-app\s+\.stage\{[^}]*padding-bottom:calc\(96px \+ env\(safe-area-inset-bottom, 0px\)\)/s);
});
